"""Seizure Detection Agent — detects seizure-like repetitive motion patterns."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from .agent_base import BaseAgent
from .models import AgentState, AgentStateName, Event, PoseFeatures
from .event_store import event_store


class SeizureAgent(BaseAgent):
    """Rule-based seizure detection agent using repetitive motion analysis.

    States
    ------
    NORMAL → SUSPICIOUS_EVENT → MONITORING_RECOVERY → RECOVERED | CRITICAL_ALERT

    Detection Logic
    ---------------
    - Uses RepetitionScore from autocorrelation of joint vertical displacement
    - Requires sustained high repetition score (>0.65) for 2+ seconds
    - Monitors for recovery (score drops below 0.30)
    """

    def __init__(
        self,
        recovery_window: float = 10.0,
        confidence_threshold: float = 0.65,
        recovery_threshold: float = 0.30,
        history_window: int = 60
    ) -> None:
        """Initialize SeizureAgent with seizure-specific parameters.
        
        Args:
            recovery_window: Seconds to wait for recovery before critical alert
            confidence_threshold: RepetitionScore threshold to trigger suspicious event
            recovery_threshold: RepetitionScore threshold for recovery detection
            history_window: Number of frames for repetition analysis (60 = ~2.5s at 24 FPS)
        """
        super().__init__(recovery_window, confidence_threshold)
        
        self._recovery_threshold = recovery_threshold
        self._history_window = history_window
        
        # Seizure-specific state tracking
        self._frames_since_suspicious = 0
        self._frames_above_threshold = 0  # Track consecutive frames with high RepetitionScore

    def get_agent_name(self) -> str:
        """Return the agent's display name."""
        return "Seizure"

    def update(self, features: PoseFeatures, pose_detected: bool) -> AgentState:
        """Process one frame's features and return updated agent state."""
        now = time.time()

        if not pose_detected:
            return self._build_state(now)

        repetition_score = features.repetition_score

        # ---- State transitions ----------------------------------------

        if self._state == AgentStateName.NORMAL:
            if repetition_score > self._confidence_threshold:
                self._frames_above_threshold += 1
                # Need 48 frames (2 seconds at 24 FPS) of high repetition score
                if self._frames_above_threshold >= 48:
                    self._transition(AgentStateName.SUSPICIOUS_EVENT, repetition_score, now)
                    self._frames_since_suspicious = 0
            else:
                self._frames_above_threshold = 0

        elif self._state == AgentStateName.SUSPICIOUS_EVENT:
            self._frames_since_suspicious += 1
            self._confidence = max(self._confidence, repetition_score)
            
            if repetition_score > self._confidence_threshold:
                # Sustained high repetition - confirm after 3+ frames
                if self._frames_since_suspicious >= 3:
                    self._transition(AgentStateName.MONITORING_RECOVERY, self._confidence, now)
                    self._timer_start = now
                    self._log_event("seizure_suspected", "monitoring_recovery",
                                    "Seizure-like repetitive motion detected. Monitoring for recovery.")
            else:
                # RepetitionScore dropped below threshold - false alarm
                if repetition_score < self._recovery_threshold:
                    self._transition(AgentStateName.NORMAL, 0.0, now)
                    self._frames_above_threshold = 0

        elif self._state == AgentStateName.MONITORING_RECOVERY:
            elapsed = now - (self._timer_start or now)
            
            if repetition_score < self._recovery_threshold:
                # Recovery detected
                self._transition(AgentStateName.RECOVERED, repetition_score, now)
                self._log_event("seizure_recovered", "recovered",
                                f"Repetitive motion subsided after {elapsed:.1f}s.")
            elif elapsed >= self._recovery_window:
                # Recovery window expired - critical alert
                self._transition(AgentStateName.CRITICAL_ALERT, self._confidence, now)
                self._log_event(
                    "seizure_no_recovery", "critical_alert",
                    f"Seizure-like motion persists after {self._recovery_window:.0f}s. "
                    "Subject may need immediate medical attention.",
                    recommended_action="Call emergency services (911). Do not restrain the subject. Clear the area of hazards.",
                    elapsed=elapsed,
                )

        elif self._state == AgentStateName.RECOVERED:
            # Stay in recovered state briefly then return to normal
            if now - self._last_change > 3.0:
                self._transition(AgentStateName.NORMAL, 0.0, now)
                self._frames_above_threshold = 0

        elif self._state == AgentStateName.CRITICAL_ALERT:
            # Stay in alert until manually acknowledged or late recovery
            if repetition_score < self._recovery_threshold:
                self._transition(AgentStateName.RECOVERED, repetition_score, now)
                self._log_event("seizure_late_recovery", "recovered",
                                "Repetitive motion subsided after critical alert was raised.")

        return self._build_state(now)

    def reset(self) -> None:
        """Reset agent to NORMAL state."""
        self._state = AgentStateName.NORMAL
        self._confidence = 0.0
        self._timer_start = None
        self._last_change = time.time()
        self._frames_since_suspicious = 0
        self._frames_above_threshold = 0

    def _transition(self, new_state: AgentStateName, confidence: float, now: float) -> None:
        """Transition to new state and update internal tracking."""
        self._state = new_state
        self._confidence = confidence
        self._last_change = now

    def _build_state(self, now: float) -> AgentState:
        """Build AgentState object for current state."""
        timer_active = self._state == AgentStateName.MONITORING_RECOVERY
        timer_remaining = 0.0
        if timer_active and self._timer_start is not None:
            elapsed = now - self._timer_start
            timer_remaining = max(0.0, self._recovery_window - elapsed)

        summaries = {
            AgentStateName.NORMAL: "Monitoring for seizure-like repetitive motion. No events detected.",
            AgentStateName.SUSPICIOUS_EVENT: "Repetitive motion pattern detected. Evaluating...",
            AgentStateName.MONITORING_RECOVERY: f"Possible seizure detected. Monitoring recovery ({timer_remaining:.1f}s remaining).",
            AgentStateName.RECOVERED: "Repetitive motion subsided. Returning to normal monitoring.",
            AgentStateName.CRITICAL_ALERT: "CRITICAL: Persistent seizure-like motion. Immediate medical attention required.",
        }

        return AgentState(
            agent_name=self.get_agent_name(),
            state=self._state,
            confidence=round(self._confidence, 3),
            event_type="seizure_suspected" if self._state != AgentStateName.NORMAL else "none",
            timer_active=timer_active,
            timer_remaining=round(timer_remaining, 1),
            timer_total=self._recovery_window,
            last_change=datetime.fromtimestamp(self._last_change, tz=timezone.utc).isoformat(),
            summary=summaries.get(self._state, ""),
        )

    def _log_event(
        self,
        event_type: str,
        status: str,
        summary: str,
        recommended_action: str = "",
        elapsed: float = 0.0,
    ) -> Event:
        """Log event to EventStore."""
        evt = Event(
            agent=self.get_agent_name(),
            event_type=event_type,
            status=status,
            confidence=round(self._confidence, 3),
            location="Living Room",  # TODO: Make configurable
            recovery_window_seconds=self._recovery_window,
            elapsed_seconds=round(elapsed, 1),
            summary=summary,
            recommended_action=recommended_action,
        )
        event_store.add_event(evt)
        return evt
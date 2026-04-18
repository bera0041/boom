"""Stroke Detection Agent — detects stroke-like asymmetric motion patterns."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from .agent_base import BaseAgent
from .models import AgentState, AgentStateName, Event, PoseFeatures
from .event_store import event_store


class StrokeAgent(BaseAgent):
    """Rule-based stroke detection agent using asymmetric motion analysis.

    States
    ------
    NORMAL → SUSPICIOUS_EVENT → MONITORING_RECOVERY → RECOVERED | CRITICAL_ALERT

    Detection Logic
    ---------------
    - Uses AsymmetryScore from bilateral landmark Y-coordinate differences
    - Requires high asymmetry (>0.15) AND low motion energy (<0.01) for 3+ frames
    - Monitors for recovery (asymmetry drops below 0.10 AND motion increases above 0.02)
    """

    def __init__(
        self,
        recovery_window: float = 15.0,
        asymmetry_threshold: float = 0.15,
        motion_threshold: float = 0.01,
        recovery_asymmetry_threshold: float = 0.10,
        recovery_motion_threshold: float = 0.02
    ) -> None:
        """Initialize StrokeAgent with stroke-specific parameters.
        
        Args:
            recovery_window: Seconds to wait for recovery before critical alert
            asymmetry_threshold: AsymmetryScore threshold to trigger suspicious event
            motion_threshold: Maximum motion_energy for stroke detection (low motion)
            recovery_asymmetry_threshold: AsymmetryScore threshold for recovery detection
            recovery_motion_threshold: Minimum motion_energy for recovery detection
        """
        super().__init__(recovery_window, asymmetry_threshold)
        
        self._motion_threshold = motion_threshold
        self._recovery_asymmetry_threshold = recovery_asymmetry_threshold
        self._recovery_motion_threshold = recovery_motion_threshold
        
        # Stroke-specific state tracking
        self._frames_since_suspicious = 0
        self._frames_meeting_criteria = 0  # Track consecutive frames meeting stroke criteria

    def get_agent_name(self) -> str:
        """Return the agent's display name."""
        return "Stroke"

    def update(self, features: PoseFeatures, pose_detected: bool) -> AgentState:
        """Process one frame's features and return updated agent state."""
        now = time.time()

        if not pose_detected:
            return self._build_state(now)

        asymmetry_score = features.asymmetry_score
        motion_energy = features.motion_energy

        # ---- State transitions ----------------------------------------

        if self._state == AgentStateName.NORMAL:
            # Check for stroke criteria: high asymmetry AND low motion
            if asymmetry_score > self._confidence_threshold and motion_energy < self._motion_threshold:
                self._frames_meeting_criteria += 1
                # Need 3 consecutive frames meeting criteria
                if self._frames_meeting_criteria >= 3:
                    self._transition(AgentStateName.SUSPICIOUS_EVENT, asymmetry_score, now)
                    self._frames_since_suspicious = 0
            else:
                self._frames_meeting_criteria = 0

        elif self._state == AgentStateName.SUSPICIOUS_EVENT:
            self._frames_since_suspicious += 1
            self._confidence = max(self._confidence, asymmetry_score)
            
            # Check if criteria still met
            if asymmetry_score > self._confidence_threshold and motion_energy < self._motion_threshold:
                # Sustained stroke indicators - confirm after 5+ frames
                if self._frames_since_suspicious >= 5:
                    self._transition(AgentStateName.MONITORING_RECOVERY, self._confidence, now)
                    self._timer_start = now
                    self._log_event("stroke_suspected", "monitoring_recovery",
                                    "Stroke-like asymmetric motion detected. Monitoring for recovery.")
            else:
                # Criteria no longer met - check for recovery
                if asymmetry_score < self._recovery_asymmetry_threshold and motion_energy > self._recovery_motion_threshold:
                    self._transition(AgentStateName.NORMAL, 0.0, now)
                    self._frames_meeting_criteria = 0

        elif self._state == AgentStateName.MONITORING_RECOVERY:
            elapsed = now - (self._timer_start or now)
            
            # Check for recovery: low asymmetry AND normal motion
            if asymmetry_score < self._recovery_asymmetry_threshold and motion_energy > self._recovery_motion_threshold:
                # Recovery detected
                self._transition(AgentStateName.RECOVERED, asymmetry_score, now)
                self._log_event("stroke_recovered", "recovered",
                                f"Asymmetric motion normalized after {elapsed:.1f}s.")
            elif elapsed >= self._recovery_window:
                # Recovery window expired - critical alert
                self._transition(AgentStateName.CRITICAL_ALERT, self._confidence, now)
                self._log_event(
                    "stroke_no_recovery", "critical_alert",
                    f"Stroke-like asymmetric motion persists after {self._recovery_window:.0f}s. "
                    "Subject may be experiencing a stroke.",
                    recommended_action="Call emergency services (911). Note the time symptoms began. Do not give food or water.",
                    elapsed=elapsed,
                )

        elif self._state == AgentStateName.RECOVERED:
            # Stay in recovered state briefly then return to normal
            if now - self._last_change > 3.0:
                self._transition(AgentStateName.NORMAL, 0.0, now)
                self._frames_meeting_criteria = 0

        elif self._state == AgentStateName.CRITICAL_ALERT:
            # Stay in alert until manually acknowledged or late recovery
            if asymmetry_score < self._recovery_asymmetry_threshold and motion_energy > self._recovery_motion_threshold:
                self._transition(AgentStateName.RECOVERED, asymmetry_score, now)
                self._log_event("stroke_late_recovery", "recovered",
                                "Asymmetric motion normalized after critical alert was raised.")

        return self._build_state(now)

    def reset(self) -> None:
        """Reset agent to NORMAL state."""
        self._state = AgentStateName.NORMAL
        self._confidence = 0.0
        self._timer_start = None
        self._last_change = time.time()
        self._frames_since_suspicious = 0
        self._frames_meeting_criteria = 0

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
            AgentStateName.NORMAL: "Monitoring for stroke-like asymmetric motion. No events detected.",
            AgentStateName.SUSPICIOUS_EVENT: "Asymmetric motion pattern detected. Evaluating...",
            AgentStateName.MONITORING_RECOVERY: f"Possible stroke detected. Monitoring recovery ({timer_remaining:.1f}s remaining).",
            AgentStateName.RECOVERED: "Asymmetric motion normalized. Returning to normal monitoring.",
            AgentStateName.CRITICAL_ALERT: "CRITICAL: Persistent asymmetric motion. Possible stroke - immediate medical attention required.",
        }

        return AgentState(
            agent_name=self.get_agent_name(),
            state=self._state,
            confidence=round(self._confidence, 3),
            event_type="stroke_suspected" if self._state != AgentStateName.NORMAL else "none",
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
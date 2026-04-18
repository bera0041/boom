"""Wandering Detection Agent — detects wandering behavior through boundary exits and pacing patterns."""

from __future__ import annotations

import time
from collections import deque
from datetime import datetime, timezone
from typing import Optional

from .agent_base import BaseAgent
from .models import AgentState, AgentStateName, Event, PoseFeatures
from .event_store import event_store


class WanderingAgent(BaseAgent):
    """Rule-based wandering detection agent using boundary zones and pacing patterns.

    States
    ------
    NORMAL → SUSPICIOUS_EVENT → MONITORING_RECOVERY → RECOVERED | CRITICAL_ALERT

    Detection Logic
    ---------------
    - Boundary mode: Tracks body centroid relative to defined boundary zone
    - Pacing mode: Detects repetitive crossing of frame midpoint
    - Supports both modes simultaneously or pacing-only when boundary_zone is None
    """

    def __init__(
        self,
        recovery_window: float = 20.0,
        boundary_zone: Optional[dict] = None,
        exit_threshold: float = 5.0,
        pacing_threshold: int = 8,
        pacing_window: float = 30.0
    ) -> None:
        """Initialize WanderingAgent with wandering-specific parameters.
        
        Args:
            recovery_window: Seconds to wait for recovery before critical alert
            boundary_zone: Optional dict with 'x_min', 'x_max', 'y_min', 'y_max' (normalized 0-1)
            exit_threshold: Seconds outside boundary to trigger suspicious event
            pacing_threshold: Number of midpoint crossings to trigger pacing detection
            pacing_window: Time window in seconds for pacing detection
        """
        super().__init__(recovery_window, 0.0)  # No confidence threshold for wandering
        
        self._boundary_zone = boundary_zone
        self._exit_threshold = exit_threshold
        self._pacing_threshold = pacing_threshold
        self._pacing_window = pacing_window
        
        # Boundary tracking
        self._outside_boundary_start: Optional[float] = None
        self._inside_boundary = True
        
        # Pacing tracking
        self._centroid_history: deque[tuple[float, float]] = deque(maxlen=int(pacing_window * 24))  # ~24 FPS
        self._midpoint_crossings: deque[float] = deque()  # Timestamps of crossings
        self._last_side: Optional[str] = None  # "left" or "right"
        
        # State tracking
        self._detection_reason = ""  # "boundary_exit" or "pacing" or "both"

    def get_agent_name(self) -> str:
        """Return the agent's display name."""
        return "Wandering"

    def update(self, features: PoseFeatures, pose_detected: bool) -> AgentState:
        """Process one frame's features and return updated agent state."""
        now = time.time()

        if not pose_detected:
            return self._build_state(now)

        body_centroid_x = features.body_centroid_x
        body_centroid_y = features.body_centroid_y
        
        # Update tracking data
        self._centroid_history.append((body_centroid_x, now))
        self._update_pacing_detection(body_centroid_x, now)
        
        # Check boundary status if boundary zone is defined
        boundary_violation = False
        if self._boundary_zone is not None:
            boundary_violation = self._update_boundary_detection(body_centroid_x, body_centroid_y, now)
        
        # Check pacing status
        pacing_detected = self._check_pacing_pattern(now)
        
        # ---- State transitions ----------------------------------------

        if self._state == AgentStateName.NORMAL:
            if boundary_violation or pacing_detected:
                # Determine detection reason
                if boundary_violation and pacing_detected:
                    self._detection_reason = "both"
                elif boundary_violation:
                    self._detection_reason = "boundary_exit"
                else:
                    self._detection_reason = "pacing"
                
                self._transition(AgentStateName.SUSPICIOUS_EVENT, 1.0, now)

        elif self._state == AgentStateName.SUSPICIOUS_EVENT:
            # Check if we should escalate to monitoring recovery
            if boundary_violation or pacing_detected:
                # Sustained wandering behavior - escalate after brief evaluation
                if now - self._last_change > 2.0:  # 2 second evaluation period
                    self._transition(AgentStateName.MONITORING_RECOVERY, 1.0, now)
                    self._timer_start = now
                    self._log_event("wandering_detected", "monitoring_recovery",
                                    f"Wandering behavior detected ({self._detection_reason}). Monitoring for return to normal activity.")
            else:
                # No longer wandering - return to normal
                self._transition(AgentStateName.NORMAL, 0.0, now)
                self._detection_reason = ""

        elif self._state == AgentStateName.MONITORING_RECOVERY:
            elapsed = now - (self._timer_start or now)
            
            # Check for recovery: back inside boundary AND no recent pacing
            if not boundary_violation and not pacing_detected:
                # Recovery detected
                self._transition(AgentStateName.RECOVERED, 0.0, now)
                self._log_event("wandering_recovered", "recovered",
                                f"Subject returned to normal activity after {elapsed:.1f}s.")
            elif elapsed >= self._recovery_window:
                # Recovery window expired - critical alert
                self._transition(AgentStateName.CRITICAL_ALERT, 1.0, now)
                self._log_event(
                    "wandering_no_recovery", "critical_alert",
                    f"Wandering behavior persists after {self._recovery_window:.0f}s. "
                    "Subject may be at risk.",
                    recommended_action="Check on the subject. Ensure doors and exits are secured.",
                    elapsed=elapsed,
                )

        elif self._state == AgentStateName.RECOVERED:
            # Stay in recovered state briefly then return to normal
            if now - self._last_change > 3.0:
                self._transition(AgentStateName.NORMAL, 0.0, now)
                self._detection_reason = ""

        elif self._state == AgentStateName.CRITICAL_ALERT:
            # Stay in alert until manually acknowledged or late recovery
            if not boundary_violation and not pacing_detected:
                self._transition(AgentStateName.RECOVERED, 0.0, now)
                self._log_event("wandering_late_recovery", "recovered",
                                "Subject returned to normal activity after critical alert was raised.")

        return self._build_state(now)

    def reset(self) -> None:
        """Reset agent to NORMAL state."""
        self._state = AgentStateName.NORMAL
        self._confidence = 0.0
        self._timer_start = None
        self._last_change = time.time()
        
        # Reset boundary tracking
        self._outside_boundary_start = None
        self._inside_boundary = True
        
        # Reset pacing tracking
        self._centroid_history.clear()
        self._midpoint_crossings.clear()
        self._last_side = None
        
        self._detection_reason = ""

    def _update_boundary_detection(self, x: float, y: float, now: float) -> bool:
        """Update boundary detection state and return True if violation detected."""
        if self._boundary_zone is None:
            return False
        
        # Check if currently inside boundary
        inside = (
            self._boundary_zone.get('x_min', 0.0) <= x <= self._boundary_zone.get('x_max', 1.0) and
            self._boundary_zone.get('y_min', 0.0) <= y <= self._boundary_zone.get('y_max', 1.0)
        )
        
        if inside:
            # Inside boundary
            if not self._inside_boundary:
                # Just re-entered
                self._inside_boundary = True
                self._outside_boundary_start = None
            return False
        else:
            # Outside boundary
            if self._inside_boundary:
                # Just exited
                self._inside_boundary = False
                self._outside_boundary_start = now
                return False
            else:
                # Still outside - check if exceeded threshold
                if self._outside_boundary_start is not None:
                    time_outside = now - self._outside_boundary_start
                    return time_outside >= self._exit_threshold
                return False

    def _update_pacing_detection(self, x: float, now: float) -> None:
        """Update pacing detection by tracking midpoint crossings."""
        # Determine which side of frame midpoint (0.5) the subject is on
        current_side = "left" if x < 0.5 else "right"
        
        # Check for crossing
        if self._last_side is not None and self._last_side != current_side:
            # Crossing detected
            self._midpoint_crossings.append(now)
            
            # Remove old crossings outside the pacing window
            cutoff_time = now - self._pacing_window
            while self._midpoint_crossings and self._midpoint_crossings[0] < cutoff_time:
                self._midpoint_crossings.popleft()
        
        self._last_side = current_side

    def _check_pacing_pattern(self, now: float) -> bool:
        """Check if current pacing pattern exceeds threshold."""
        # Remove old crossings
        cutoff_time = now - self._pacing_window
        while self._midpoint_crossings and self._midpoint_crossings[0] < cutoff_time:
            self._midpoint_crossings.popleft()
        
        # Check if we have enough crossings
        return len(self._midpoint_crossings) >= self._pacing_threshold

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

        # Build summary based on detection mode and current state
        if self._boundary_zone is None:
            mode_desc = "pacing patterns"
        else:
            mode_desc = "boundary exits and pacing patterns"

        summaries = {
            AgentStateName.NORMAL: f"Monitoring for wandering behavior ({mode_desc}). No events detected.",
            AgentStateName.SUSPICIOUS_EVENT: f"Wandering behavior detected ({self._detection_reason}). Evaluating...",
            AgentStateName.MONITORING_RECOVERY: f"Wandering behavior confirmed. Monitoring for return to normal activity ({timer_remaining:.1f}s remaining).",
            AgentStateName.RECOVERED: "Subject returned to normal activity. Returning to normal monitoring.",
            AgentStateName.CRITICAL_ALERT: "CRITICAL: Persistent wandering behavior. Subject may be at risk.",
        }

        return AgentState(
            agent_name=self.get_agent_name(),
            state=self._state,
            confidence=round(self._confidence, 3),
            event_type="wandering_detected" if self._state != AgentStateName.NORMAL else "none",
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
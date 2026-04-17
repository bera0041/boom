"""Pydantic models for SentinelCare backend."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Agent states
# ---------------------------------------------------------------------------

class AgentStateName(str, Enum):
    NORMAL = "normal"
    SUSPICIOUS_EVENT = "suspicious_event"
    MONITORING_RECOVERY = "monitoring_recovery"
    RECOVERED = "recovered"
    CRITICAL_ALERT = "critical_alert"


# ---------------------------------------------------------------------------
# Pose / feature data sent to frontend
# ---------------------------------------------------------------------------

class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class PoseData(BaseModel):
    landmarks: list[LandmarkPoint] = Field(default_factory=list)
    detected: bool = False


class PoseFeatures(BaseModel):
    body_centroid_y: float = 0.0
    torso_angle: float = 0.0
    head_height: float = 0.0
    hip_height: float = 0.0
    velocity: float = 0.0
    motion_energy: float = 0.0
    stillness_score: float = 0.0
    ground_proximity: float = 0.0


# ---------------------------------------------------------------------------
# Agent state payload
# ---------------------------------------------------------------------------

class AgentState(BaseModel):
    state: AgentStateName = AgentStateName.NORMAL
    confidence: float = 0.0
    event_type: str = "none"
    timer_active: bool = False
    timer_remaining: float = 0.0
    timer_total: float = 10.0
    last_change: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    summary: str = "System operating normally."


# ---------------------------------------------------------------------------
# Events & alerts
# ---------------------------------------------------------------------------

class Event(BaseModel):
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:8]}")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    agent: str = "FallGuard"
    event_type: str = "unknown"
    status: str = "unknown"
    confidence: float = 0.0
    location: str = "Living Room"
    recovery_window_seconds: float = 10.0
    elapsed_seconds: float = 0.0
    summary: str = ""
    recommended_action: str = ""
    video_source: str = "camera_0"


class Alert(BaseModel):
    alert_id: str = Field(default_factory=lambda: f"alrt_{uuid.uuid4().hex[:8]}")
    event: Event
    triggered_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    acknowledged: bool = False


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

class AppConfig(BaseModel):
    video_source: str = "0"  # "0" for webcam, or path to video file
    recovery_window: float = 10.0  # seconds
    location_label: str = "Living Room"
    fall_confidence_threshold: float = 0.55
    show_pose_overlay: bool = True
    frame_skip: int = 0  # process every Nth frame (0 = every frame)


# ---------------------------------------------------------------------------
# WebSocket message
# ---------------------------------------------------------------------------

class WSMessage(BaseModel):
    type: str  # "frame_update", "agent_update", "event", "alert"
    frame: Optional[str] = None  # base64 JPEG
    agent_state: Optional[AgentState] = None
    features: Optional[PoseFeatures] = None
    event: Optional[Event] = None
    alert: Optional[Alert] = None
    pose_detected: bool = False
    num_people: int = 0


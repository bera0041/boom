"""Feature extraction from MediaPipe pose landmarks."""

from __future__ import annotations

import math
from collections import deque
from typing import Optional

from .models import PoseData, PoseFeatures

# MediaPipe landmark indices
NOSE = 0
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_HIP = 23
RIGHT_HIP = 24
LEFT_KNEE = 25
RIGHT_KNEE = 26
LEFT_ANKLE = 27
RIGHT_ANKLE = 28
LEFT_ELBOW = 13
RIGHT_ELBOW = 14
LEFT_WRIST = 15
RIGHT_WRIST = 16


class FeatureExtractor:
    """Computes derived posture/motion features from raw landmarks.
    
    All Y coordinates use MediaPipe convention: 0 = top, 1 = bottom.
    So a *lower* body position → *higher* Y value → higher ground proximity.
    """

    HISTORY_LEN = 15  # frames of history for velocity / motion

    def __init__(self) -> None:
        self._centroid_history: deque[float] = deque(maxlen=self.HISTORY_LEN)
        self._motion_history: deque[float] = deque(maxlen=self.HISTORY_LEN)
        self._prev_landmarks: Optional[list] = None

    def reset(self) -> None:
        self._centroid_history.clear()
        self._motion_history.clear()
        self._prev_landmarks = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract(self, pose: PoseData) -> PoseFeatures:
        """Compute features from a single frame's pose data."""
        if not pose.detected or len(pose.landmarks) < 33:
            return PoseFeatures()

        lms = pose.landmarks

        # Core positions (Y axis: 0=top, 1=bottom)
        shoulder_mid_y = (lms[LEFT_SHOULDER].y + lms[RIGHT_SHOULDER].y) / 2
        hip_mid_y = (lms[LEFT_HIP].y + lms[RIGHT_HIP].y) / 2
        shoulder_mid_x = (lms[LEFT_SHOULDER].x + lms[RIGHT_SHOULDER].x) / 2
        hip_mid_x = (lms[LEFT_HIP].x + lms[RIGHT_HIP].x) / 2

        body_centroid_y = (shoulder_mid_y + hip_mid_y) / 2
        head_height = lms[NOSE].y
        hip_height = hip_mid_y

        # Torso angle: angle of shoulder→hip vector vs downward vertical
        dx = hip_mid_x - shoulder_mid_x
        dy = hip_mid_y - shoulder_mid_y
        torso_angle = math.degrees(math.atan2(abs(dx), dy)) if dy != 0 else 0.0

        # Velocity: centroid displacement frame-to-frame
        velocity = 0.0
        if self._centroid_history:
            prev_y = self._centroid_history[-1]
            velocity = body_centroid_y - prev_y  # positive = moving down

        self._centroid_history.append(body_centroid_y)

        # Motion energy: sum of all joint displacements
        motion_energy = 0.0
        if self._prev_landmarks is not None:
            for i, lm in enumerate(lms):
                prev = self._prev_landmarks[i]
                motion_energy += math.sqrt(
                    (lm.x - prev.x) ** 2 + (lm.y - prev.y) ** 2
                )

        self._motion_history.append(motion_energy)
        self._prev_landmarks = list(lms)

        # Stillness: inverse of recent motion (rolling average)
        avg_motion = (
            sum(self._motion_history) / len(self._motion_history)
            if self._motion_history
            else 0.0
        )
        stillness_score = max(0.0, 1.0 - avg_motion * 10)

        # Ground proximity: how low in frame (higher Y = lower in scene)
        ground_proximity = max(0.0, min(1.0, (body_centroid_y - 0.3) / 0.5))

        return PoseFeatures(
            body_centroid_y=round(body_centroid_y, 4),
            torso_angle=round(torso_angle, 2),
            head_height=round(head_height, 4),
            hip_height=round(hip_height, 4),
            velocity=round(velocity, 5),
            motion_energy=round(motion_energy, 5),
            stillness_score=round(stillness_score, 4),
            ground_proximity=round(ground_proximity, 4),
        )

    def get_rapid_drop(self, window: int = 5) -> float:
        """Sum of positive (downward) centroid changes over last N frames."""
        if len(self._centroid_history) < 2:
            return 0.0
        changes = []
        hist = list(self._centroid_history)
        for i in range(max(0, len(hist) - window), len(hist)):
            if i > 0:
                delta = hist[i] - hist[i - 1]
                if delta > 0:  # moving downward
                    changes.append(delta)
        return sum(changes)

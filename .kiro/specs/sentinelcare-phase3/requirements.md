# Requirements Document

## Introduction

This document captures the requirements for completing SentinelCare Phase 3 and Phase 4.
SentinelCare is a modular AI home safety monitoring platform that uses real-time pose estimation
to detect emergencies (falls, seizures, strokes, wandering) and route caregivers to the nearest
appropriate medical facility.

Phase 3 (immediate priority) covers two workstreams:
1. **Hospital Finder Integration** — using the Google Maps Places API to surface the nearest
   specialist facility (Trauma Center, Stroke Center, etc.) inside the existing alert UI.
2. **Specialized Detection Agents** — backend state machines for Seizure, Stroke, and Wandering
   detection, following the same architecture as the existing `FallGuardAgent`.

Phase 4 (future) captures thermal body-temperature detection, wearable sensor fusion, AWS SNS
emergency SMS notifications, and Amazon S3 critical-event storage.

---

## Glossary

- **System**: The SentinelCare platform as a whole (backend + frontend).
- **Backend**: The Python/FastAPI service running on the edge device.
- **Frontend**: The Next.js 16 / React 19 dashboard served to the caregiver.
- **Agent**: A rule-based state machine that processes per-frame pose features and emits events.
- **FallGuardAgent**: The existing fall/collapse detection agent (already implemented).
- **SeizureAgent**: The new agent responsible for detecting seizure-like repetitive motion.
- **StrokeAgent**: The new agent responsible for detecting stroke indicators (facial/limb asymmetry, sudden immobility).
- **WanderingAgent**: The new agent responsible for detecting prolonged pacing or boundary-crossing behaviour.
- **ThermalAgent**: The Phase 4 agent responsible for detecting elevated body temperature via a thermal sensor.
- **AgentOrchestrator**: The backend component that runs all active agents per frame and merges their outputs.
- **HospitalFinder**: The frontend service that queries the Google Maps Places API to locate specialist facilities.
- **AlertPanel**: The existing frontend component that renders a critical alert card.
- **EventStore**: The thread-safe in-memory store that holds `Event` and `Alert` objects.
- **WSMessage**: The Pydantic model broadcast over the WebSocket to all connected clients.
- **PoseFeatures**: The per-frame feature vector produced by `FeatureExtractor` (centroid, velocity, torso angle, etc.).
- **MotionHistory**: A rolling window of per-joint displacement values maintained by `FeatureExtractor`.
- **AsymmetryScore**: A derived feature measuring left/right landmark position difference, used by `StrokeAgent`.
- **RepetitionScore**: A derived feature measuring periodic oscillation in joint trajectories, used by `SeizureAgent`.
- **BoundaryZone**: A configurable rectangular region of the camera frame; used by `WanderingAgent` to detect exit events.
- **ThermalFrame**: A single-channel temperature map produced by a FLIR or compatible thermal sensor.
- **SNS**: Amazon Simple Notification Service, used for emergency SMS delivery.
- **S3**: Amazon Simple Storage Service, used for critical-event video clip storage.
- **Google Maps Places API**: The REST API used to search for nearby hospitals by type.
- **Specialist Facility Type**: A Google Maps place type string (e.g., `"hospital"`) combined with a keyword (e.g., `"stroke center"`) that narrows the search to the appropriate care facility.
- **Caregiver**: The human user monitoring the dashboard.
- **Subject**: The person being monitored in the camera frame.
- **Recovery Window**: The configurable countdown (seconds) after a suspicious event during which the subject must return to a safe posture before a critical alert is raised.
- **Confidence Score**: A normalised float in [0, 1] representing the agent's certainty that a target event is occurring.
- **Critical Alert**: An `Alert` object emitted when the recovery window expires without recovery, or when a high-confidence single-frame event is detected.

---

## Requirements

---

### Requirement 1: Agent Orchestrator

**User Story:** As a backend developer, I want a single orchestration layer that runs all active
agents per frame, so that the vision loop does not need to be modified each time a new agent is added.

#### Acceptance Criteria

1. THE AgentOrchestrator SHALL accept a `PoseFeatures` object and a `pose_detected` boolean and return a list of `AgentState` objects, one per registered agent.
2. WHEN a new agent class is registered with the AgentOrchestrator, THE AgentOrchestrator SHALL include that agent's output in every subsequent frame update without requiring changes to `main.py`.
3. THE AgentOrchestrator SHALL expose a `reset_all()` method that calls `reset()` on every registered agent.
4. WHEN any registered agent transitions to `CRITICAL_ALERT`, THE AgentOrchestrator SHALL emit a single `Alert` to the EventStore for that agent's event.
5. THE WSMessage model SHALL be extended to carry a list of `AgentState` objects (one per agent) in addition to the existing single `agent_state` field, maintaining backward compatibility.

---

### Requirement 2: Seizure Detection Agent

**User Story:** As a caregiver, I want the system to detect seizure-like repetitive motion, so that
I am alerted when the subject may be experiencing a seizure.

#### Acceptance Criteria

1. THE FeatureExtractor SHALL compute a `RepetitionScore` by measuring the autocorrelation of per-joint vertical displacement over a 60-frame rolling window.
2. WHEN the `RepetitionScore` exceeds 0.65 for at least 2 consecutive seconds, THE SeizureAgent SHALL transition from `NORMAL` to `SUSPICIOUS_EVENT`.
3. WHILE in `SUSPICIOUS_EVENT`, THE SeizureAgent SHALL transition to `MONITORING_RECOVERY` if the `RepetitionScore` remains above 0.65 for 3 or more additional frames.
4. WHILE in `MONITORING_RECOVERY`, THE SeizureAgent SHALL transition to `CRITICAL_ALERT` if the recovery window elapses without the `RepetitionScore` dropping below 0.30.
5. WHILE in `MONITORING_RECOVERY`, THE SeizureAgent SHALL transition to `RECOVERED` if the `RepetitionScore` drops below 0.30 before the recovery window elapses.
6. IF the `RepetitionScore` drops below 0.30 while in `SUSPICIOUS_EVENT`, THEN THE SeizureAgent SHALL transition back to `NORMAL` without logging an event.
7. THE SeizureAgent SHALL set `event_type` to `"seizure_suspected"` on all emitted `Event` objects.
8. THE SeizureAgent SHALL set `recommended_action` to `"Call emergency services (911). Do not restrain the subject. Clear the area of hazards."` on all `CRITICAL_ALERT` events.

---

### Requirement 3: Stroke Detection Agent

**User Story:** As a caregiver, I want the system to detect stroke indicators such as facial/limb
asymmetry and sudden immobility, so that I am alerted when the subject may be experiencing a stroke.

#### Acceptance Criteria

1. THE FeatureExtractor SHALL compute an `AsymmetryScore` by measuring the normalised absolute difference between corresponding left and right landmark Y-coordinates (shoulders, hips, wrists, elbows) averaged across all pairs.
2. WHEN the `AsymmetryScore` exceeds 0.15 AND the subject's `motion_energy` drops below 0.01 for at least 3 consecutive frames, THE StrokeAgent SHALL transition from `NORMAL` to `SUSPICIOUS_EVENT`.
3. WHILE in `SUSPICIOUS_EVENT`, THE StrokeAgent SHALL transition to `MONITORING_RECOVERY` if the combined condition (high asymmetry AND low motion) persists for 5 or more additional frames.
4. WHILE in `MONITORING_RECOVERY`, THE StrokeAgent SHALL transition to `CRITICAL_ALERT` if the recovery window elapses without the `AsymmetryScore` dropping below 0.10 and motion resuming above 0.02.
5. WHILE in `MONITORING_RECOVERY`, THE StrokeAgent SHALL transition to `RECOVERED` if the `AsymmetryScore` drops below 0.10 and `motion_energy` rises above 0.02 before the recovery window elapses.
6. THE StrokeAgent SHALL set `event_type` to `"stroke_suspected"` on all emitted `Event` objects.
7. THE StrokeAgent SHALL set `recommended_action` to `"Call emergency services (911). Note the time symptoms began. Do not give food or water."` on all `CRITICAL_ALERT` events.
8. FOR ALL valid `PoseFeatures` inputs, the `AsymmetryScore` SHALL be a float in the range [0.0, 1.0].

---

### Requirement 4: Wandering Detection Agent

**User Story:** As a caregiver, I want the system to detect prolonged pacing or boundary-crossing
behaviour, so that I am alerted when a subject with dementia or cognitive impairment may be at risk.

#### Acceptance Criteria

1. THE WanderingAgent SHALL accept a configurable `BoundaryZone` (normalised x1, y1, x2, y2 rectangle) that defines the safe region within the camera frame.
2. WHEN the subject's body centroid exits the `BoundaryZone` for more than 5 consecutive seconds, THE WanderingAgent SHALL transition from `NORMAL` to `SUSPICIOUS_EVENT`.
3. WHEN the subject's body centroid re-enters the `BoundaryZone`, THE WanderingAgent SHALL transition back to `NORMAL` and reset the exit timer.
4. WHILE in `SUSPICIOUS_EVENT`, THE WanderingAgent SHALL transition to `CRITICAL_ALERT` if the subject remains outside the `BoundaryZone` for the full recovery window.
5. THE WanderingAgent SHALL also detect prolonged pacing: WHEN the subject's centroid oscillates across a midpoint more than 8 times within a 30-second window, THE WanderingAgent SHALL transition to `SUSPICIOUS_EVENT`.
6. THE WanderingAgent SHALL set `event_type` to `"wandering_detected"` on all emitted `Event` objects.
7. THE WanderingAgent SHALL set `recommended_action` to `"Check on the subject. Ensure doors and exits are secured."` on all `CRITICAL_ALERT` events.
8. IF no `BoundaryZone` is configured, THEN THE WanderingAgent SHALL operate in pacing-only mode and SHALL NOT emit boundary-exit events.

---

### Requirement 5: Multi-Agent WebSocket Protocol

**User Story:** As a frontend developer, I want the WebSocket message to carry state from all
active agents, so that the dashboard can display each agent's status simultaneously.

#### Acceptance Criteria

1. THE WSMessage model SHALL include an `agents` field of type `list[AgentState]` where each entry carries an `agent_name` string identifying the source agent.
2. THE AgentState model SHALL include an `agent_name` field (string) that identifies the agent (e.g., `"FallGuard"`, `"Seizure"`, `"Stroke"`, `"Wandering"`).
3. WHEN the Backend broadcasts a `frame_update` message, THE Backend SHALL populate the `agents` list with the current state of every registered agent.
4. THE Backend SHALL maintain backward compatibility: the existing top-level `agent_state` field SHALL continue to carry the FallGuardAgent state.
5. FOR ALL `frame_update` messages, the number of entries in the `agents` list SHALL equal the number of registered agents.

---

### Requirement 6: Hospital Finder — Geolocation

**User Story:** As a caregiver, I want the system to automatically determine my location, so that
the hospital search is centred on the correct geographic position.

#### Acceptance Criteria

1. WHEN the AlertPanel renders a critical alert, THE HospitalFinder SHALL request the browser's Geolocation API for the caregiver's current coordinates.
2. IF the Geolocation API returns an error or is denied, THEN THE HospitalFinder SHALL display a text input allowing the caregiver to enter a manual address.
3. THE HospitalFinder SHALL cache the last successfully obtained coordinates in browser session storage and reuse them for subsequent searches within the same session.
4. THE HospitalFinder SHALL request geolocation with a maximum age of 300 seconds and a timeout of 10 seconds.
5. WHEN geolocation is in progress, THE HospitalFinder SHALL display a loading indicator within the AlertPanel.

---

### Requirement 7: Hospital Finder — Places Search

**User Story:** As a caregiver, I want the system to find the nearest specialist hospital for the
detected emergency type, so that I can act immediately without searching manually.

#### Acceptance Criteria

1. THE HospitalFinder SHALL map each `event_type` to a `Specialist Facility Type` keyword according to the following table:

   | `event_type`           | Google Maps keyword          |
   |------------------------|------------------------------|
   | `fall_collapse`        | `"trauma center"`            |
   | `collapse_no_recovery` | `"trauma center"`            |
   | `seizure_suspected`    | `"neurological center"`      |
   | `stroke_suspected`     | `"stroke center"`            |
   | `wandering_detected`   | `"memory care"`              |
   | `test_alert`           | `"hospital"`                 |
   | *(default)*            | `"hospital"`                 |

2. WHEN coordinates are available, THE HospitalFinder SHALL call the Google Maps Places Nearby Search API with the mapped keyword, `type=hospital`, and a radius of 25,000 metres.
3. THE HospitalFinder SHALL display the top 3 results, each showing: facility name, distance in kilometres (rounded to one decimal place), rating (if available), and a "Get Directions" link that opens Google Maps in a new tab.
4. IF the Places API returns zero results within 25,000 metres, THEN THE HospitalFinder SHALL retry with a radius of 50,000 metres and display a notice that results are beyond 25 km.
5. IF the Places API call fails due to a network error or invalid API key, THEN THE HospitalFinder SHALL display a fallback message: `"Unable to load hospital results. Call 911 immediately."`.
6. THE HospitalFinder SHALL complete the Places API call and render results within 5 seconds of obtaining coordinates under normal network conditions.
7. THE Frontend SHALL store the Google Maps API key exclusively in an environment variable (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) and SHALL NOT hard-code it in source files.

---

### Requirement 8: Hospital Finder — Alert Panel Integration

**User Story:** As a caregiver, I want the nearest hospital results to appear directly inside the
critical alert card, so that I do not need to navigate away from the dashboard during an emergency.

#### Acceptance Criteria

1. WHEN a `CRITICAL_ALERT` event is received via WebSocket, THE AlertPanel SHALL render a "Nearest Facilities" section below the recommended action block.
2. THE AlertPanel SHALL display a loading skeleton while the HospitalFinder is fetching results.
3. WHEN hospital results are available, THE AlertPanel SHALL render each result as a card containing: name, distance, star rating, and a "Directions" button.
4. THE "Directions" button SHALL open `https://www.google.com/maps/dir/?api=1&destination={place_id}` in a new browser tab.
5. WHEN the caregiver clicks "Acknowledge Alert", THE AlertPanel SHALL retain the hospital results visible until the panel is dismissed.
6. THE AlertPanel SHALL be accessible: all interactive elements SHALL have descriptive `aria-label` attributes, and the facility cards SHALL be keyboard-navigable.

---

### Requirement 9: Agent Dashboard Cards

**User Story:** As a caregiver, I want to see a live status card for each active agent on the
dashboard, so that I can monitor all detection modules simultaneously.

#### Acceptance Criteria

1. THE Frontend SHALL render one `AgentCard` component per entry in the `agents` list received via WebSocket.
2. WHEN an agent's state is `CRITICAL_ALERT`, THE AgentCard SHALL display a pulsing red border and a prominent alert icon.
3. WHEN an agent's state is `MONITORING_RECOVERY`, THE AgentCard SHALL display the recovery countdown timer.
4. WHEN an agent's state is `NORMAL` and no subject is detected, THE AgentCard SHALL display a "No Subject" badge.
5. THE AgentCard SHALL display the agent's `agent_name`, current `state`, `confidence` percentage bar, and time since last state change.
6. THE Frontend SHALL replace the static `FutureAgents` placeholder list with live `AgentCard` components for all registered agents once those agents are implemented.

---

### Requirement 10: Per-Agent Configuration

**User Story:** As a caregiver or system administrator, I want to configure each agent's thresholds
independently, so that the system can be tuned for different subjects and environments.

#### Acceptance Criteria

1. THE AppConfig model SHALL include per-agent configuration blocks: `seizure_config`, `stroke_config`, and `wandering_config`, each containing the agent's `recovery_window`, `confidence_threshold`, and agent-specific parameters.
2. THE Backend `/config` GET endpoint SHALL return the full `AppConfig` including all per-agent blocks.
3. THE Backend `/config` POST endpoint SHALL accept and persist an updated `AppConfig` and apply the new thresholds to all running agents within the same request-response cycle.
4. WHEN a per-agent config block is absent from a POST request, THE Backend SHALL retain the existing defaults for that agent.
5. THE `wandering_config` block SHALL include a `boundary_zone` field accepting normalised coordinates `{x1, y1, x2, y2}` with values in [0.0, 1.0].

---

### Requirement 11: Agent Reset Endpoint

**User Story:** As a caregiver, I want to reset all agents simultaneously via the dashboard, so
that I can clear false positives without restarting the backend.

#### Acceptance Criteria

1. THE Backend `/agent/reset` POST endpoint SHALL call `AgentOrchestrator.reset_all()` and return `{"status": "all_agents_reset"}`.
2. WHEN a `reset_agent` WebSocket message is received from a client, THE Backend SHALL call `AgentOrchestrator.reset_all()`.
3. AFTER a reset, every agent SHALL return to `NORMAL` state with `confidence` of 0.0 on the next `frame_update` message.
4. THE Frontend "Acknowledge Alert" button SHALL send a `reset_agent` WebSocket message AND dismiss the AlertPanel.

---

### Requirement 12: Phase 4 — Thermal Body Temperature Detection

**User Story:** As a caregiver, I want the system to detect elevated body temperature using a
thermal sensor, so that I am alerted when the subject may have a fever or heat-related illness.

#### Acceptance Criteria

1. WHERE a FLIR or compatible thermal sensor is configured, THE ThermalAgent SHALL process `ThermalFrame` data alongside the standard RGB pose pipeline.
2. WHEN the maximum skin-region temperature in a `ThermalFrame` exceeds 38.5 °C for 3 consecutive frames, THE ThermalAgent SHALL transition from `NORMAL` to `SUSPICIOUS_EVENT`.
3. WHILE in `SUSPICIOUS_EVENT`, THE ThermalAgent SHALL transition to `CRITICAL_ALERT` if the temperature remains above 38.5 °C for the full recovery window.
4. THE ThermalAgent SHALL set `event_type` to `"elevated_temperature"` on all emitted `Event` objects.
5. THE ThermalAgent SHALL set `recommended_action` to `"Monitor the subject. Administer fluids. Seek medical attention if temperature exceeds 39.5 °C."` on all `CRITICAL_ALERT` events.
6. IF no thermal sensor is configured, THEN THE ThermalAgent SHALL remain in a `DISABLED` state and SHALL NOT emit any events.
7. THE Backend SHALL expose a `/thermal/frame` POST endpoint that accepts a `ThermalFrame` payload and routes it to the ThermalAgent.

---

### Requirement 13: Phase 4 — Wearable Sensor Fusion

**User Story:** As a system architect, I want the system to accept wearable accelerometer triggers
from Apple Watch or Fitbit, so that the high-cost vision pipeline is only activated when a physical
fall signal is detected.

#### Acceptance Criteria

1. THE Backend SHALL expose a `/wearable/event` POST endpoint that accepts a JSON payload containing `device_type` (string), `event_type` (string), `confidence` (float), and `timestamp` (ISO 8601 string).
2. WHEN a wearable event with `event_type` of `"hard_fall"` and `confidence` >= 0.7 is received, THE Backend SHALL activate the vision pipeline if it is currently idle.
3. WHEN the vision pipeline is activated by a wearable trigger, THE Backend SHALL set the FallGuardAgent directly to `SUSPICIOUS_EVENT` state with the wearable's confidence score.
4. THE Backend SHALL log all received wearable events to the EventStore with `agent` set to `"WearableBridge"`.
5. IF the wearable event payload is malformed or missing required fields, THEN THE Backend SHALL return HTTP 422 with a descriptive error message.

---

### Requirement 14: Phase 4 — AWS SNS Emergency Notifications

**User Story:** As a caregiver, I want to receive an SMS when a critical alert is raised, so that
I am notified even when I am not watching the dashboard.

#### Acceptance Criteria

1. WHERE AWS SNS is configured (ARN and region provided via environment variables), THE Backend SHALL publish an SNS message to the configured topic ARN within 3 seconds of a `CRITICAL_ALERT` transition.
2. THE SNS message SHALL include: alert ID, event type, location label, confidence score, timestamp, and recommended action.
3. IF the SNS publish call fails, THEN THE Backend SHALL log the error and SHALL NOT block the WebSocket broadcast of the alert.
4. THE Backend SHALL read the SNS topic ARN from the environment variable `SNS_TOPIC_ARN` and the AWS region from `AWS_REGION`.
5. IF `SNS_TOPIC_ARN` is not set, THEN THE Backend SHALL skip SNS publishing and log a warning at startup.

---

### Requirement 15: Phase 4 — Amazon S3 Critical Event Storage

**User Story:** As a caregiver or administrator, I want critical event video clips to be saved to
S3, so that I can review what happened after an alert.

#### Acceptance Criteria

1. WHERE Amazon S3 is configured (bucket name provided via environment variable `S3_BUCKET_NAME`), THE Backend SHALL upload a video clip to S3 within 30 seconds of a `CRITICAL_ALERT` transition.
2. THE clip SHALL consist of the 10 seconds of frames immediately preceding the alert and 5 seconds following it (a 15-second window).
3. THE Backend SHALL store clips using the key pattern `events/{event_id}/{timestamp}.mp4`.
4. THE Backend SHALL use server-side encryption (SSE-S3) for all uploaded clips.
5. IF the S3 upload fails, THEN THE Backend SHALL log the error and SHALL NOT block the WebSocket broadcast of the alert.
6. IF `S3_BUCKET_NAME` is not set, THEN THE Backend SHALL skip S3 uploads and log a warning at startup.
7. THE Backend SHALL read AWS credentials from the standard AWS credential chain (environment variables, IAM role, or `~/.aws/credentials`) and SHALL NOT hard-code credentials in source files.

# Build Handout for Antigravity

## Project Title
**SentinelCare**  
A modular AI home safety monitoring platform for vulnerable people living alone.

## One-Sentence Product Definition
SentinelCare uses a real-time camera feed, pose tracking, and specialized event agents to detect dangerous observable states, monitor whether recovery happens within a critical response window, and trigger structured alerts.

## Core Hackathon Goal
Build **one highly reliable emergency-focused agent** end-to-end:
- detect collapse/fall or dangerous low-to-ground state
- track whether the person recovers within a short response window
- escalate if no recovery occurs
- show everything clearly in a live dashboard

## What We Are Building Right Now
A working prototype with:
1. webcam or camera feed input
2. human detection and body pose/joint tracking
3. a **Fall/Collapse + No-Recovery Agent**
4. backend event state machine
5. dashboard UI
6. alert generation with:
   - timestamp
   - event type
   - confidence
   - location label
   - event summary
   - escalation status

## What We Are Not Claiming Right Now
Do not position the first build as:
- a medical diagnosis tool
- a perfect stroke detector
- a seizure diagnosis tool
- a broken-bone detector
- a direct universal 911 auto-caller

Instead, position it as:
- assistive emergency monitoring
- dangerous observable state detection
- response-window-based escalation
- modular architecture for future specialized agents

---

# Product Framing

## Problem Statement
Many vulnerable people live alone. When a dangerous event happens at home, help may be delayed because no one notices quickly enough. Existing solutions often depend on the person pressing a button, wearing a device consistently, or already being conscious and able to ask for help.

## Solution Statement
SentinelCare monitors a live camera feed, detects dangerous observable events such as a collapse, tracks whether recovery occurs, and escalates when it does not. The system is modular, so specialized agents for other emergency scenarios can be added to the same pipeline.

## Strongest User Segment
Primary:
- older adults living alone
- vulnerable adults living alone
- recently discharged patients who may need monitoring

Secondary:
- home caregivers
- assisted independent living settings
- family members remotely caring for loved ones

## Best Value Proposition
This system reduces **time-to-awareness** during emergencies at home.

---

# Scope Discipline

## The Only Agent That Must Work
**Fall / Collapse + No-Recovery Agent**

That means:
- detect a likely collapse or fall-like transition
- confirm a dangerous end posture
- monitor a timer
- cancel if recovery is detected
- alert if recovery does not happen

## Future Agent Story
Keep these visible in the UI as future or experimental modules:
- seizure-like abnormal motion agent
- stroke-like asymmetry / immobility agent
- injury-risk / unnatural-joint-angle agent
- wandering / prolonged immobility agent

But only the first one needs to be real and polished.

---

# System Requirements

## Functional Requirements
1. ingest live or prerecorded camera feed
2. detect a human in frame
3. extract body landmarks / joints in real time
4. compute posture and movement features
5. classify system state:
   - normal
   - suspicious event
   - monitoring recovery
   - critical alert
6. render live UI
7. generate structured alert
8. store event log
9. support modular agent interface

## Non-Functional Requirements
1. low-latency processing
2. stable enough for a live demo
3. visually understandable
4. privacy-conscious design
5. graceful handling when detection confidence is low
6. simple architecture that can be explained in under one minute

---

# Recommended Technical Stack

## Frontend
- Next.js or React
- Tailwind CSS
- WebSocket or Socket.IO for live updates
- optional chart/timeline library

## Backend
- Python FastAPI preferred
- WebSocket streaming for real-time event updates
- REST endpoints for configuration, logs, alert payloads
- simple in-memory state store or lightweight database

## Vision / AI
- OpenCV for camera/video ingestion
- MediaPipe Pose for real-time body landmark detection
- optional YOLO person detector only if needed for robustness

## Alerts
- mock alert card in UI
- optional SMS/email integration for demo
- local audio alert optional

## Data / Storage
- JSON event logs
- SQLite or flat-file logs
- minimal storage of frames, or none unless explicitly needed for the demo

---

# High-Level Architecture

## Pipeline
**Camera Feed**  
→ Frame Capture  
→ Person Detection / Pose Estimation  
→ Landmark Processing  
→ Event Agent  
→ State Machine  
→ Alert Generator  
→ Dashboard / Notification Output

## Core Modules
1. **Video Input Module**
   - webcam, IP cam, or prerecorded video
2. **Pose Tracking Module**
   - returns body joint coordinates each frame
3. **Feature Extraction Module**
   - computes body angle, vertical drop, posture, motion level
4. **Agent Module**
   - decides whether a collapse/fall event happened
5. **Recovery Monitor**
   - starts timer and checks for recovery
6. **Decision Layer**
   - escalates or cancels
7. **Alert Layer**
   - creates structured event summary
8. **Dashboard**
   - displays live feed, overlays, state, and logs

---

# Agent Design

## Agent Name
**FallGuard Agent**

## Goal
Detect a probable collapse or fall and determine whether the person recovers in time.

## Inputs
- body landmarks over time
- motion vectors / frame-to-frame joint deltas
- estimated body orientation
- estimated body centroid height
- time since suspected event

## Outputs
- state
- confidence score
- event type
- timer status
- escalation recommendation
- event summary

## Agent States
1. **NORMAL**
   - normal standing, walking, sitting behavior
2. **SUSPICIOUS_EVENT**
   - sudden posture change or drop detected
3. **MONITORING_RECOVERY**
   - event triggered, waiting to see if person recovers
4. **RECOVERED**
   - person stood up, sat up safely, or returned to baseline
5. **CRITICAL_ALERT**
   - no recovery detected within threshold

## Trigger Logic
A possible fall/collapse is triggered when several conditions occur together:
- rapid downward change in torso/hip centroid
- major orientation shift from vertical to horizontal or collapsed posture
- body remains near ground
- motion pattern indicates impact or abrupt stop
- post-event movement is limited

## Recovery Logic
Recovery is detected if within the timer window:
- torso returns upright
- head and shoulders rise sufficiently
- hips and torso move back above threshold height
- sustained movement suggests the person got up or sat back safely

## Escalation Logic
Escalate if:
- body remains near floor
- posture remains collapsed
- movement remains below recovery threshold
- timer expires

## Suggested Timing
For demo purposes:
- suspicious event detected immediately
- recovery window: 10 to 20 seconds
- alert after no recovery

Use 10 seconds for a clean demo unless testing suggests 15 is safer.

---

# Pose Features to Compute

## Core Joints
Track:
- nose
- shoulders
- hips
- knees
- ankles
- elbows
- wrists

## Useful Derived Features
1. **Body centroid**
   - average of shoulders and hips
2. **Torso angle**
   - shoulder-to-hip line vs vertical axis
3. **Head height**
   - Y position of nose or shoulders
4. **Hip height**
   - Y position of hip midpoint
5. **Aspect/orientation**
   - estimated upright vs horizontal posture
6. **Velocity**
   - joint displacement over recent frames
7. **Motion energy**
   - cumulative joint movement
8. **Ground proximity proxy**
   - relative low position in frame
9. **Post-event stillness**
   - very low movement after suspected collapse

## Simple Heuristic Formula
A fall/collapse confidence can be a weighted score:
- rapid downward movement
- high torso angle change
- low centroid position
- low post-event movement
- horizontal posture

You do not need a trained classifier if heuristics are clean and tuned.

---

# Suggested Event Schema

Use a structured event object like this:

```json
{
  "event_id": "evt_001",
  "timestamp": "2026-04-17T14:21:03Z",
  "agent": "FallGuard",
  "event_type": "collapse_no_recovery",
  "status": "critical_alert",
  "confidence": 0.91,
  "location": "Living Room",
  "recovery_window_seconds": 10,
  "elapsed_seconds": 10,
  "summary": "Possible collapse detected. Subject remained low to ground and did not recover within threshold.",
  "recommended_action": "Notify caregiver / emergency contact",
  "video_source": "camera_1"
}
```

---

# Backend Plan

## Backend Responsibilities
- receive pose/event data
- maintain state machine per camera/session
- handle timing logic
- generate alerts
- serve event logs
- stream live state to frontend

## Core Backend Services
### 1. Session Manager
Keeps track of:
- camera stream
- active state
- active event
- current timer

### 2. Event State Machine
Handles transitions:
- NORMAL → SUSPICIOUS_EVENT
- SUSPICIOUS_EVENT → MONITORING_RECOVERY
- MONITORING_RECOVERY → RECOVERED
- MONITORING_RECOVERY → CRITICAL_ALERT

### 3. Alert Service
Generates:
- UI alert card
- log entry
- optional SMS/email

### 4. API Endpoints
Suggested:
- `POST /stream/start`
- `POST /stream/stop`
- `GET /events`
- `GET /status`
- `POST /alerts/test`
- `GET /config`
- `POST /config`

### 5. WebSocket Messages
Suggested event types:
- `pose_update`
- `agent_update`
- `event_started`
- `recovery_timer_started`
- `event_resolved`
- `critical_alert`

---

# Frontend / Dashboard Plan

## Dashboard Goal
Judges should understand the system in under 10 seconds.

## Main Layout
### Left Panel
- live camera feed
- pose skeleton overlay
- bounding box / subject label
- current source label

### Right Panel
Top:
- status badge:
  - Normal
  - Monitoring
  - Alert

Middle:
- active agent cards
- confidence score
- time since event
- recovery timer countdown

Bottom:
- structured event summary
- recommended action
- location
- timestamp

### Bottom Panel
- event timeline
- recent logs
- notification history

## UI Components
1. **LiveFeedCard**
2. **PoseOverlay**
3. **AgentStatusCard**
4. **RecoveryTimer**
5. **AlertPanel**
6. **EventLogTable**
7. **SystemHealthBadge**
8. **FutureAgentsPanel**

## Future Agents Panel
Show inactive or prototype cards:
- Seizure Agent — experimental
- Stroke Risk Agent — future
- Injury Angle Agent — future

This helps sell the multi-agent architecture.

---

# Folder / Repo Structure

```txt
sentinelcare/
  frontend/
    src/
      components/
      pages/
      hooks/
      lib/
  backend/
    app/
      api/
      core/
      services/
      models/
      agents/
      utils/
  vision/
    pose/
    features/
    detectors/
    test_videos/
  shared/
    schemas/
  docs/
    pitch/
    architecture/
```

---

# Implementation Plan for Antigravity

Use this section directly as a build instruction set.

## Build Objective
Create a hackathon prototype called SentinelCare that performs real-time human pose tracking from a live or prerecorded video feed, detects likely collapse/fall events, opens a recovery timer, and escalates if the subject does not recover in time. Display all outputs in a polished dashboard with structured alerts.

## Build Order

### Phase 1 — Setup and Skeleton
1. initialize frontend and backend
2. connect frontend to backend
3. add webcam or video feed handling
4. show raw feed on dashboard
5. add placeholder status cards

### Phase 2 — Pose Tracking
1. integrate MediaPipe Pose
2. extract landmarks each frame
3. overlay skeleton on feed
4. expose landmark data to backend or processing layer
5. verify stable tracking on test clips

### Phase 3 — Feature Extraction
1. compute body centroid
2. compute torso angle
3. compute head/hip height
4. compute movement deltas
5. compute post-event stillness score

### Phase 4 — FallGuard Agent
1. detect sudden downward motion
2. detect collapsed or horizontal posture
3. start monitoring timer
4. evaluate recovery vs no recovery
5. output state transitions and confidence

### Phase 5 — Backend Event Logic
1. add state machine
2. add event object generation
3. add alert generation
4. add event logs
5. stream updates to dashboard

### Phase 6 — Dashboard Polish
1. replace placeholders with real-time data
2. add status badges
3. add timer UI
4. add alert card
5. add event timeline
6. add future agent cards

### Phase 7 — Demo Stability
1. tune thresholds using a few prepared clips
2. reduce false triggers
3. reduce lag
4. create fallback prerecorded demo
5. test end-to-end flow repeatedly

---

# Suggested Heuristics

## Possible Collapse Trigger
Trigger if at least 3 or 4 of the following happen within a short window:
- hip centroid drops rapidly
- shoulder centroid drops rapidly
- torso angle shifts from upright to near-horizontal
- body remains low in frame
- motion becomes low after abrupt change

## Recovery Detection
Count recovery if:
- torso returns sufficiently upright
- body centroid rises significantly
- movement indicates standing or sitting up
- position stabilizes in non-collapsed state

## Confidence Strategy
Start with rule-based confidence:
- assign weighted points per signal
- normalize to 0–1
- display confidence but do not overpromise its meaning

Example:
- downward drop: 0.25
- torso orientation change: 0.25
- low final posture: 0.25
- lack of recovery: 0.25

---

# Demo Inputs

## Best Demo Approach
Prepare both:
1. live webcam test
2. prerecorded video fallback

## Best Demo Scenarios
### Scenario A — Normal Behavior
Person walking, standing, sitting normally  
Expected result: no alert

### Scenario B — Fall With Recovery
Person drops to floor or crouches, then gets up  
Expected result: suspicious event → monitoring → recovered

### Scenario C — Fall With No Recovery
Person collapses and remains down  
Expected result: suspicious event → monitoring → critical alert

Scenario C is the main demo.

---

# Privacy Positioning

## What to Say
- opt-in only
- for users who consent to safety monitoring
- edge-first processing whenever possible
- no need to continuously store full video
- retain only event summaries or short event snippets if necessary
- designed to minimize unnecessary surveillance

## What to Avoid Saying
- always-on surveillance
- constant monitoring of everything
- permanent video archival by default

## Best Framing
This is a consent-based safety system designed to reduce response delays during emergencies, while minimizing retained data and focusing on high-risk events only.

---

# How to Present It

## Core Presentation Strategy
Your presentation should feel like this:
1. emotionally clear problem
2. narrow, believable solution
3. clean technical architecture
4. live or prerecorded proof
5. modular future expansion
6. privacy-aware design

## Presentation Tone
- disciplined
- credible
- not overclaimed
- product-minded
- technically grounded

## What Judges Need to Feel
- this solves a real problem
- the team understood scope
- the system actually works
- the architecture is extensible
- the founders thought about privacy and safety
- this could become a serious product

---

# Presentation Outline

## Slide 1 — Title
**SentinelCare**  
Multi-agent AI monitoring for critical at-home emergencies

Subheadline:  
Real-time detection of dangerous observable states with response-window escalation

## Slide 2 — Problem
At-home emergencies often go unnoticed for too long, especially when vulnerable people live alone.

Say:  
“Many emergency tools depend on the user being conscious, mobile, and able to ask for help. In real emergencies, that assumption can fail.”

## Slide 3 — Why Current Solutions Fall Short
- panic buttons require action
- wearables require consistent use
- basic cameras record but do not reason
- caregivers cannot watch 24/7

## Slide 4 — Our Solution
SentinelCare uses:
- camera input
- pose tracking
- specialized AI agents
- recovery-window reasoning
- escalation alerts

Use a simple diagram:
camera → pose → agent → timer → alert

## Slide 5 — Why Multi-Agent
Different emergency scenarios require different logic.  
A fall, a seizure-like episode, and stroke-like asymmetry should not all be handled by one generic decision rule.

Then say:  
“For the hackathon, we focused on one agent and built it properly.”

## Slide 6 — What We Built
- live feed ingestion
- pose tracking
- FallGuard agent
- no-recovery timer
- structured alert dashboard

## Slide 7 — Demo
Show:
- live or prerecorded feed
- event trigger
- timer
- no recovery
- critical alert

## Slide 8 — Privacy and Trust
- consent-based
- edge-first
- event-focused
- minimal retention
- assistive, not diagnostic

## Slide 9 — Expansion
Future agents:
- seizure-like motion
- stroke-like asymmetry
- injury-angle detection
- prolonged immobility

Say:  
“The platform is modular. The pipeline stays the same; the agent logic changes.”

## Slide 10 — Closing
SentinelCare shortens time-to-awareness during emergencies at home.

End with:  
“We are not claiming diagnosis. We are detecting dangerous observable states and escalating when recovery does not happen.”

---

# Exact Demo Script

Use this almost word for word.

## Opening
“SentinelCare is a real-time home safety monitoring platform for vulnerable people living alone. Instead of relying on one generic model, we use specialized agents for specific emergency scenarios.”

## Scope
“For this hackathon, we focused on one high-impact agent: collapse or fall detection with no-recovery escalation.”

## Live System Explanation
“On the left is the live camera feed with pose tracking. On the right is the agent state, confidence, timer, and alert system.”

## Trigger
“When the system detects a likely collapse, it does not immediately overreact. It opens a short recovery window.”

## Reasoning
“If the person gets up or returns to baseline, the event is marked as recovered. If not, the system escalates.”

## Alert
“At escalation, SentinelCare generates a structured alert with time, location, event type, confidence, and recommended action.”

## Architecture
“The same pipeline can support additional agents for other scenarios like seizure-like motion or stroke-like asymmetry.”

## Close
“The goal is simple: reduce time-to-awareness when every minute matters.”

---

# Judge Q&A Prep

## Why multiple agents?
Because different emergency scenarios have different physical signatures and different thresholds. Specialized agents are more modular, easier to improve, and more credible than pretending one generic model can handle everything.

## Are you diagnosing medical conditions?
No. We are detecting dangerous observable states and escalating when recovery does not occur. This is assistive monitoring, not diagnosis.

## Why would someone use this over a wearable?
Wearables require compliance. People forget them, remove them, or may not be able to activate them during an emergency. Camera-based monitoring can serve as a passive backup layer.

## What about privacy?
This system is opt-in, event-focused, and designed for edge-first processing with minimal retention. It is intended for users who explicitly consent to safety monitoring.

## How do you avoid false positives?
We use multi-signal event logic and a recovery window. The timer reduces overreaction by allowing normal recovery before escalation.

## What did you actually build?
A complete end-to-end prototype for one emergency-focused agent with real-time tracking, event reasoning, timer logic, dashboard output, and alert generation.

## How would this scale?
The pipeline stays the same. New agents plug into the same input, state, and alert framework with different task-specific logic.

---

# What to Say and What Not to Say

## Say
- assistive monitoring
- dangerous observable states
- response-window escalation
- modular multi-agent architecture
- privacy-aware
- edge-friendly
- event-focused
- high-risk scenario monitoring

## Do Not Say
- we diagnose strokes
- we know exactly what happened medically
- we automatically call 911 everywhere
- zero false positives
- perfect detection
- broken bones are accurately diagnosed from a webcam

---

# Fallback Version If Build Slips

If things go wrong, reduce to:
- prerecorded video only
- pose skeleton overlay
- one fall event
- one timer
- one critical alert card
- one event log
- one strong presentation

That is still a valid, strong demo.

---

# Final Prompt Block for Antigravity

You can paste this directly:

```text
Build a hackathon prototype called SentinelCare, a modular home safety monitoring platform for vulnerable people living alone.

Core requirement:
Implement one specialized agent end-to-end: a Fall/Collapse + No-Recovery Agent.

The system should:
1. ingest a live webcam feed or prerecorded video
2. detect a person and extract body pose/joint landmarks in real time
3. compute posture and movement features such as torso angle, body centroid height, sudden downward motion, and post-event stillness
4. detect a likely collapse/fall event
5. start a recovery timer after the event
6. classify the subject as recovered if they return to an upright or non-collapsed state within the threshold
7. escalate to a critical alert if no recovery occurs within the threshold
8. display everything in a clean real-time dashboard

Frontend requirements:
- React or Next.js
- show live feed
- show pose skeleton overlay
- show current state badge: Normal / Monitoring / Alert
- show active agent card with confidence and last update
- show recovery timer countdown
- show structured alert card with timestamp, location, event type, confidence, recommended action
- show recent event timeline/log
- show future agent cards for seizure, stroke-like risk, and injury-angle detection as inactive or prototype modules

Backend requirements:
- Python FastAPI preferred
- expose APIs for status, logs, and config
- use WebSockets for live event updates
- implement a state machine with states NORMAL, SUSPICIOUS_EVENT, MONITORING_RECOVERY, RECOVERED, CRITICAL_ALERT
- generate structured event objects

Vision requirements:
- use OpenCV for video ingestion
- use MediaPipe Pose for body landmarks
- implement rule-based fall/collapse detection using multiple signals:
  - rapid vertical drop
  - large torso orientation change
  - low final posture
  - low motion after event
- implement recovery detection based on body rising and regaining upright posture

Design requirements:
- polished hackathon dashboard
- modern, minimal UI
- easy to understand in under 10 seconds
- optimized for demo clarity over feature bloat

Product framing:
- do not position as a diagnostic tool
- position as assistive monitoring for dangerous observable states
- emphasize privacy-aware, opt-in, event-focused monitoring
- emphasize modular architecture for specialized future agents

Also generate:
- a clean architecture diagram section in the app or docs
- sample event schema
- a short demo mode with prerecorded scenarios:
  1. normal movement
  2. fall with recovery
  3. fall with no recovery leading to alert
```

---

# Notes Based on the Uploaded Planning Document
This guide follows the strongest recommendation from the uploaded planning document: build one polished emergency-oriented agent first, prove the shared pipeline, and present additional agents as modular expansion rather than trying to build everything at once. fileciteturn0file0

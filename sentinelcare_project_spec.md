# SentinelCare Project Specification & Roadmap

SentinelCare is a modular AI home safety monitoring platform designed to detect emergencies (falls, seizures, strokes) using real-time pose estimation and specialized agents.

---

## 🏗 System Architecture

### Backend (Python/FastAPI)
- **Vision Pipeline**: OpenCV + MediaPipe Pose (Tasks API).
- **Core Engine**: Real-time feature extraction (centroid drop, torso angle, velocity).
- **Agent System**: Modular state machines (e.g., `FallGuardAgent`) that process features and maintain event states.
- **Communication**: WebSocket for low-latency frame and state streaming; REST for logs and config.

### Frontend (Next.js 16 / React 19)
- **Real-time Dashboard**: Live camera feed with per-person color-coded skeleton overlays.
- **Agent UI**: Dynamic status cards showing confidence, timer countdowns, and escalation status.
- **Alert System**: Structured emergency cards with recommended actions and hospital location integration.

---

## 📁 Project Structure

```text
sentinelcare/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point, WebSocket management
│   │   ├── vision.py        # MediaPipe & OpenCV integration
│   │   ├── agent.py         # FallGuardAgent logic (State Machine)
│   │   ├── features.py      # Pose feature extraction
│   │   ├── models.py        # Pydantic data models
│   │   └── event_store.py   # Thread-safe in-memory event/alert logging
│   ├── pose_landmarker.task # AI Model file (Heavy)
│   ├── requirements.txt     # Python dependencies
│   └── test_multi.py        # Standalone multi-person detection test
└── frontend/
    ├── src/
    │   ├── app/             # Next.js App Router (Page, Layout, Global CSS)
    │   ├── components/      # UI Components (LiveFeed, AgentCard, AlertPanel, etc.)
    │   ├── hooks/           # useWebSocket for real-time data sync
    │   └── lib/             # Utility functions
    └── package.json         # Frontend dependencies (Tailwind 4, React 19)
```

---

## 🚀 Command Flows

### 📦 Setup
```bash
# Backend
conda activate sentinelcare
cd sentinelcare/backend
pip install -r requirements.txt

# Frontend
cd sentinelcare/frontend
npm install
```

### 🏃 Running the Project
```bash
# Backend (Port 8000)
cd sentinelcare/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (Port 3000)
cd sentinelcare/frontend
npm run dev
```

### 🧹 Cleanup (Kill stale ports)
```bash
fuser -k 8000/tcp
fuser -k 3000/tcp
```

---

## 📊 Progress & Roadmap

### ✅ Completed (Phase 1 & 2)
- [x] Multi-person pose detection (MediaPipe Heavy).
- [x] FallGuard Agent logic (Detection -> Timer -> Alert).
- [x] Frame-by-frame feature extraction (Centroid, Velocity, etc.).
- [x] Real-time WebSocket bridge (Base64 JPEG streaming).
- [x] Responsive Dashboard UI (Glassmorphic design).
- [x] Fix: Concurrency bug in WebSocket broadcasting.

### 🚧 In Progress (Phase 3)
- [ ] **Hospital Finder Integration**: Using Google Maps API to find the nearest specialized center (e.g., "Stroke Center" for stroke alerts, "Trauma Center" for falls).
- [ ] **Specialized Agents**: Implementing backend logic for Seizure, Stroke, and Wandering.

### 🔮 Future Plans (Phase 4)
- [ ] **Thermal Integration**: High Body Temp detection using FLIR/Thermal sensors.
- [ ] **Cost Optimization Architecture** (See Economy section).

---

## 💰 Economic Strategy: Cost Optimization

To make SentinelCare affordable and appealing, we focus on **Edge-First Intelligence**:

### 1. Edge Processing vs. Cloud
- **The Problem**: Continuous cloud GPU inference (like A100/H100) is prohibitively expensive for a "consumer" home product.
- **The Fix**: Process MediaPipe **locally** on the edge device (user's home hub or local PC). Pose estimation is lightweight enough to run on modern CPUs or integrated GPUs (like your RTX 4060).
- **Cost Impact**: Reduces recurring cloud costs from hundreds of dollars/month to **$0** (after hardware purchase).

### 2. Triggered High-Resolution AI
- **Smart Activation**: Use a "Lite" model for basic motion detection. Only activate the "Heavy" Pose model or cloud-based complex reasoning when a "Suspicious Event" is flagged locally.

### 3. Wearable Hybridization
- **Sensor Fusion**: Integrate with Apple Watch/Fitbit via HealthKit/Google Fit.
- **Cost Optimization**: If the Watch detects a "Hard Fall" via its accelerometer, *then* it triggers the Camera AI to confirm. This saves power and compute by keeping the high-end vision logic in "sleep mode" until a physical trigger occurs.

### 4. Aggregated Hospital Logic
- Instead of calling a central human dispatcher (expensive human labor), use AI to automate the triage and provide the caregiver/user with the direct path to the nearest hospital via Maps.

---

## 🎯 AWS Kiro Context Notes
- **Infrastructure**: Designed for AWS App Runner or ECS if cloud-hosted.
- **Storage**: Amazon S3 for critical event "highlights" (not continuous video).
- **Messaging**: AWS SNS for emergency SMS notifications.

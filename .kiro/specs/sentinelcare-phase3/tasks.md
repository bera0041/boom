# Implementation Plan: SentinelCare Phase 3

## Overview

This implementation plan breaks down the SentinelCare Phase 3 feature into discrete, ordered coding tasks. The plan follows a bottom-up approach: first establishing the multi-agent foundation (BaseAgent, AgentOrchestrator), then implementing each specialized agent (Seizure, Stroke, Wandering), extending the backend infrastructure, and finally integrating the frontend hospital finder and multi-agent UI components.

Each task builds incrementally on previous work, with checkpoints to validate core functionality. Property-based tests are included as optional sub-tasks to validate correctness properties from the design document.

---

## Tasks

- [x] 1. Extend PoseFeatures model and FeatureExtractor for new agent signals
  - [x] 1.1 Add new fields to PoseFeatures model in `models.py`
    - Add `repetition_score: float = 0.0` for SeizureAgent
    - Add `asymmetry_score: float = 0.0` for StrokeAgent
    - Add `body_centroid_x: float = 0.0` for WanderingAgent
    - _Requirements: 2.1, 3.1, 4.1_

  - [x] 1.2 Implement RepetitionScore computation in FeatureExtractor
    - Add `_joint_history: deque[list[float]]` to track 60-frame rolling window of per-joint vertical displacement
    - Implement autocorrelation at lag=12 frames (~0.5s at 24 FPS)
    - Normalize result to [0, 1] range
    - Update `extract()` method to compute and return `repetition_score`
    - _Requirements: 2.1_

  - [x] 1.3 Implement AsymmetryScore computation in FeatureExtractor
    - For bilateral landmark pairs (shoulders, hips, wrists, elbows), compute absolute Y-coordinate difference
    - Normalize by frame height
    - Average across all pairs
    - Update `extract()` method to compute and return `asymmetry_score`
    - _Requirements: 3.1, 3.8_

  - [x] 1.4 Add body_centroid_x computation in FeatureExtractor
    - Compute X-coordinate of body centroid (average of shoulder and hip midpoints)
    - Update `extract()` method to return `body_centroid_x`
    - _Requirements: 4.1_

  - [ ]* 1.5 Write property test for feature score bounds
    - **Property 5: Feature Score Bounds Invariant**
    - **Validates: Requirements 2.1, 3.1, 3.8**
    - Test that RepetitionScore and AsymmetryScore are always in [0.0, 1.0] for any valid pose landmarks

  - [ ]* 1.6 Write property test for RepetitionScore periodicity correlation
    - **Property 6: RepetitionScore Periodicity Correlation**
    - **Validates: Requirements 2.1**
    - Test that perfectly periodic sequences produce higher RepetitionScore than random sequences

  - [ ]* 1.7 Write property test for AsymmetryScore symmetry correlation
    - **Property 7: AsymmetryScore Symmetry Correlation**
    - **Validates: Requirements 3.1**
    - Test that symmetric landmarks produce lower AsymmetryScore than asymmetric landmarks

- [x] 2. Create BaseAgent abstract class and agent infrastructure
  - [x] 2.1 Create BaseAgent abstract base class in new file `agent_base.py`
    - Define abstract `update(features: PoseFeatures, pose_detected: bool) -> AgentState` method
    - Define abstract `reset() -> None` method
    - Define abstract `get_agent_name() -> str` method
    - Include common state fields: `_state`, `_confidence`, `_recovery_window`, `_confidence_threshold`, `_timer_start`, `_last_change`
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Update AgentState model in `models.py` to include agent_name field
    - Add `agent_name: str = "Unknown"` field to AgentState
    - _Requirements: 5.2_

  - [x] 2.3 Refactor existing FallGuardAgent to inherit from BaseAgent
    - Update `agent.py` to import and inherit from BaseAgent
    - Implement `get_agent_name()` to return "FallGuard"
    - Update `_build_state()` to set `agent_name` field
    - Ensure all existing functionality remains unchanged (backward compatibility)
    - _Requirements: 1.2, 5.4_

- [x] 3. Implement AgentOrchestrator
  - [x] 3.1 Create AgentOrchestrator class in new file `orchestrator.py`
    - Implement `__init__()` with `_agents: dict[str, BaseAgent]` registry
    - Implement `register_agent(name: str, agent: BaseAgent) -> None` with duplicate name validation
    - Implement `update(features: PoseFeatures, pose_detected: bool) -> list[AgentState]` that calls all agents
    - Implement `reset_all() -> None` that calls reset on all agents
    - Implement `get_agent(name: str) -> BaseAgent | None` for agent retrieval
    - Track previous agent states to detect CRITICAL_ALERT transitions
    - Emit Alert to EventStore on first CRITICAL_ALERT transition (deduplicated)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 3.2 Write property test for orchestrator registration completeness
    - **Property 1: Agent Orchestrator Registration Completeness**
    - **Validates: Requirements 1.1, 1.2, 5.3, 5.5**
    - Test that update() returns list with length equal to number of registered agents, each with unique agent_name

  - [ ]* 3.3 Write property test for orchestrator reset propagation
    - **Property 2: Agent Orchestrator Reset Propagation**
    - **Validates: Requirements 1.3, 11.1, 11.2, 11.3**
    - Test that reset_all() causes all agents to return to NORMAL state with confidence 0.0

  - [ ]* 3.4 Write property test for critical alert emission uniqueness
    - **Property 3: Critical Alert Emission Uniqueness**
    - **Validates: Requirements 1.4**
    - Test that transitioning to CRITICAL_ALERT emits exactly one Alert, no duplicates for remaining in CRITICAL_ALERT

- [x] 4. Implement SeizureAgent
  - [x] 4.1 Create SeizureAgent class in new file `seizure_agent.py`
    - Inherit from BaseAgent
    - Implement `__init__()` with recovery_window=10.0, confidence_threshold=0.65, recovery_threshold=0.30, history_window=60
    - Implement `get_agent_name()` to return "Seizure"
    - Implement state machine: NORMAL → SUSPICIOUS_EVENT (RepetitionScore > 0.65 for 2s/48 frames)
    - Implement SUSPICIOUS_EVENT → MONITORING_RECOVERY (sustained 3+ frames)
    - Implement MONITORING_RECOVERY → RECOVERED (RepetitionScore < 0.30)
    - Implement MONITORING_RECOVERY → CRITICAL_ALERT (timeout)
    - Implement SUSPICIOUS_EVENT → NORMAL (RepetitionScore < 0.30, false alarm)
    - Set event_type to "seizure_suspected"
    - Set recommended_action to "Call emergency services (911). Do not restrain the subject. Clear the area of hazards."
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 4.2 Write property test for SeizureAgent suspicious event transition
    - **Property 8: SeizureAgent Suspicious Event Transition**
    - **Validates: Requirements 2.2**

  - [ ]* 4.3 Write property test for SeizureAgent monitoring transition
    - **Property 9: SeizureAgent Monitoring Transition**
    - **Validates: Requirements 2.3**

  - [ ]* 4.4 Write property test for SeizureAgent recovery detection
    - **Property 10: SeizureAgent Recovery Detection**
    - **Validates: Requirements 2.5**

  - [ ]* 4.5 Write property test for SeizureAgent critical alert on timeout
    - **Property 11: SeizureAgent Critical Alert on Timeout**
    - **Validates: Requirements 2.4**

  - [ ]* 4.6 Write property test for SeizureAgent false alarm handling
    - **Property 12: SeizureAgent False Alarm Handling**
    - **Validates: Requirements 2.6**

- [x] 5. Implement StrokeAgent
  - [x] 5.1 Create StrokeAgent class in new file `stroke_agent.py`
    - Inherit from BaseAgent
    - Implement `__init__()` with recovery_window=15.0, asymmetry_threshold=0.15, motion_threshold=0.01, recovery_asymmetry_threshold=0.10, recovery_motion_threshold=0.02
    - Implement `get_agent_name()` to return "Stroke"
    - Implement state machine: NORMAL → SUSPICIOUS_EVENT (AsymmetryScore > 0.15 AND motion_energy < 0.01 for 3 frames)
    - Implement SUSPICIOUS_EVENT → MONITORING_RECOVERY (sustained 5+ frames)
    - Implement MONITORING_RECOVERY → RECOVERED (AsymmetryScore < 0.10 AND motion_energy > 0.02)
    - Implement MONITORING_RECOVERY → CRITICAL_ALERT (timeout)
    - Set event_type to "stroke_suspected"
    - Set recommended_action to "Call emergency services (911). Note the time symptoms began. Do not give food or water."
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 5.2 Write property test for StrokeAgent suspicious event transition
    - **Property 13: StrokeAgent Suspicious Event Transition**
    - **Validates: Requirements 3.2**

  - [ ]* 5.3 Write property test for StrokeAgent monitoring transition
    - **Property 14: StrokeAgent Monitoring Transition**
    - **Validates: Requirements 3.3**

  - [ ]* 5.4 Write property test for StrokeAgent recovery detection
    - **Property 15: StrokeAgent Recovery Detection**
    - **Validates: Requirements 3.5**

  - [ ]* 5.5 Write property test for StrokeAgent critical alert on timeout
    - **Property 16: StrokeAgent Critical Alert on Timeout**
    - **Validates: Requirements 3.4**

- [x] 6. Implement WanderingAgent
  - [x] 6.1 Create WanderingAgent class in new file `wandering_agent.py`
    - Inherit from BaseAgent
    - Implement `__init__()` with recovery_window=20.0, boundary_zone (optional dict), exit_threshold=5.0, pacing_threshold=8, pacing_window=30.0
    - Implement `get_agent_name()` to return "Wandering"
    - Track body centroid position relative to BoundaryZone
    - Implement boundary exit detection: outside zone for >5s → SUSPICIOUS_EVENT
    - Implement boundary re-entry: re-enter zone → NORMAL
    - Implement sustained exit: remain outside for recovery_window → CRITICAL_ALERT
    - Implement pacing detection: >8 midpoint crossings in 30s → SUSPICIOUS_EVENT
    - Implement pacing-only mode when boundary_zone is None
    - Set event_type to "wandering_detected"
    - Set recommended_action to "Check on the subject. Ensure doors and exits are secured."
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 6.2 Write property test for WanderingAgent boundary exit detection
    - **Property 17: WanderingAgent Boundary Exit Detection**
    - **Validates: Requirements 4.2**

  - [ ]* 6.3 Write property test for WanderingAgent boundary re-entry recovery
    - **Property 18: WanderingAgent Boundary Re-entry Recovery**
    - **Validates: Requirements 4.3**

  - [ ]* 6.4 Write property test for WanderingAgent sustained exit alert
    - **Property 19: WanderingAgent Sustained Exit Alert**
    - **Validates: Requirements 4.4**

  - [ ]* 6.5 Write property test for WanderingAgent pacing detection
    - **Property 20: WanderingAgent Pacing Detection**
    - **Validates: Requirements 4.5**

  - [ ]* 6.6 Write property test for WanderingAgent pacing-only mode
    - **Property 21: WanderingAgent Pacing-Only Mode**
    - **Validates: Requirements 4.8**

  - [ ]* 6.7 Write property test for agent event metadata consistency
    - **Property 22: Agent Event Metadata Consistency**
    - **Validates: Requirements 2.7, 2.8, 3.6, 3.7, 4.6, 4.7**
    - Test that all agents set correct event_type and include recommended_action on CRITICAL_ALERT

- [x] 7. Checkpoint - Ensure all agent tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Extend backend configuration models for per-agent config
  - [x] 8.1 Create per-agent configuration models in `models.py`
    - Create `SeizureConfig` model with recovery_window, confidence_threshold, recovery_threshold, history_window
    - Create `StrokeConfig` model with recovery_window, asymmetry_threshold, motion_threshold, recovery_asymmetry_threshold, recovery_motion_threshold
    - Create `WanderingConfig` model with recovery_window, boundary_zone (optional dict), exit_threshold, pacing_threshold, pacing_window
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 8.2 Extend AppConfig model to include per-agent configuration blocks
    - Add `seizure_config: SeizureConfig = Field(default_factory=SeizureConfig)` to AppConfig
    - Add `stroke_config: StrokeConfig = Field(default_factory=StrokeConfig)` to AppConfig
    - Add `wandering_config: WanderingConfig = Field(default_factory=WanderingConfig)` to AppConfig
    - _Requirements: 10.1, 10.2, 10.5_

  - [ ]* 8.3 Write property test for AppConfig per-agent block completeness
    - **Property 26: AppConfig Per-Agent Block Completeness**
    - **Validates: Requirements 10.1, 10.2, 10.5**

  - [ ]* 8.4 Write property test for AppConfig partial update preservation
    - **Property 27: AppConfig Partial Update Preservation**
    - **Validates: Requirements 10.4**

- [x] 9. Extend WSMessage model for multi-agent support
  - [x] 9.1 Add agents field to WSMessage model in `models.py`
    - Add `agents: list[AgentState] = Field(default_factory=list)` to WSMessage
    - Maintain backward compatibility: keep existing `agent_state: Optional[AgentState]` field
    - _Requirements: 1.5, 5.1, 5.2_

  - [ ]* 9.2 Write property test for WSMessage multi-agent schema completeness
    - **Property 4: WSMessage Multi-Agent Schema Completeness**
    - **Validates: Requirements 1.5, 5.1, 5.2, 5.4**

- [x] 10. Integrate AgentOrchestrator into main.py vision loop
  - [x] 10.1 Update vision loop in `main.py` to use AgentOrchestrator
    - Import AgentOrchestrator, SeizureAgent, StrokeAgent, WanderingAgent
    - Replace single FallGuardAgent with AgentOrchestrator
    - Register FallGuardAgent with orchestrator as "FallGuard"
    - Register SeizureAgent with orchestrator as "Seizure" using config.seizure_config
    - Register StrokeAgent with orchestrator as "Stroke" using config.stroke_config
    - Register WanderingAgent with orchestrator as "Wandering" using config.wandering_config
    - Call `orchestrator.update(features, pose_detected)` to get list of agent states
    - Populate WSMessage.agents with all agent states
    - Set WSMessage.agent_state to FallGuard state for backward compatibility
    - _Requirements: 1.2, 1.5, 5.3, 5.4, 5.5_

  - [x] 10.2 Update /agent/reset endpoint to call orchestrator.reset_all()
    - Modify `/agent/reset` POST endpoint to call `orchestrator.reset_all()`
    - Return `{"status": "all_agents_reset"}`
    - _Requirements: 11.1_

  - [x] 10.3 Update WebSocket reset_agent message handler
    - Modify WebSocket message handler to call `orchestrator.reset_all()` on "reset_agent" message
    - _Requirements: 11.2_

  - [ ]* 10.4 Write property test for configuration update application
    - **Property 28: Configuration Update Application**
    - **Validates: Requirements 10.3**

- [x] 11. Update /config endpoint to support per-agent configuration
  - [x] 11.1 Update GET /config endpoint to return full AppConfig including per-agent blocks
    - Ensure response includes seizure_config, stroke_config, wandering_config
    - _Requirements: 10.2_

  - [x] 11.2 Update POST /config endpoint to accept and apply per-agent configuration
    - Accept updated AppConfig with per-agent blocks
    - Apply new thresholds to running agents by re-instantiating them with new config
    - Preserve existing defaults for omitted config blocks
    - _Requirements: 10.3, 10.4_

- [x] 12. Checkpoint - Ensure backend integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement HospitalFinder service in frontend
  - [ ] 13.1 Create HospitalFinder service in new file `src/services/HospitalFinder.ts`
    - Define `FacilityResult` interface (name, distance, rating, placeId, address)
    - Define `FACILITY_KEYWORDS` mapping from event_type to Google Maps keyword
    - Implement `findNearestFacilities(eventType: string, onProgress: (status: string) => void): Promise<FacilityResult[]>`
    - Request geolocation with 10s timeout, 300s max age
    - Cache coordinates in sessionStorage
    - Call Google Maps Places Nearby Search API with mapped keyword, type=hospital, radius=25000m
    - Parse results, compute distances using Haversine formula
    - Sort by distance, return top 3
    - Retry with 50km radius if zero results within 25km
    - Handle errors: geolocation denied → return error for manual input, API error → return error for fallback message
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 13.2 Write property test for event type to facility keyword mapping
    - **Property 23: Event Type to Facility Keyword Mapping**
    - **Validates: Requirements 7.1**

  - [ ]* 13.3 Write property test for hospital search radius retry
    - **Property 24: Hospital Search Radius Retry**
    - **Validates: Requirements 7.4**

  - [ ]* 13.4 Write property test for geolocation caching round-trip
    - **Property 25: Geolocation Caching Round-Trip**
    - **Validates: Requirements 6.3**

- [ ] 14. Update AlertPanel component to integrate HospitalFinder
  - [ ] 14.1 Extend AlertPanel component in `src/components/AlertPanel.tsx`
    - Add internal state: `facilities: FacilityResult[]`, `loadingFacilities: boolean`, `facilityError: string | null`
    - On CRITICAL_ALERT received, call HospitalFinder.findNearestFacilities()
    - Display loading skeleton while fetching
    - Render "Nearest Facilities" section below recommended action block
    - Render each facility as a card with name, distance, rating, "Directions" button
    - "Directions" button opens `https://www.google.com/maps/dir/?api=1&destination={place_id}` in new tab
    - Display fallback message on error: "Unable to load hospital results. Call 911 immediately."
    - Add aria-label attributes to all interactive elements
    - Retain hospital results visible after "Acknowledge Alert" until panel dismissed
    - _Requirements: 7.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 14.2 Write property test for AlertPanel facility card completeness
    - **Property 30: AlertPanel Facility Card Completeness**
    - **Validates: Requirements 8.3**

  - [ ]* 14.3 Write property test for AlertPanel accessibility compliance
    - **Property 31: AlertPanel Accessibility Compliance**
    - **Validates: Requirements 8.6**

- [ ] 15. Create AgentCard component for multi-agent dashboard
  - [ ] 15.1 Create AgentCard component in new file `src/components/AgentCard.tsx`
    - Accept `agentState: AgentState` prop
    - Display agent_name, current state, confidence percentage bar, time since last state change
    - Visual states:
      - NORMAL: Gray border, checkmark icon, "Monitoring" badge
      - SUSPICIOUS_EVENT: Yellow border, warning icon, "Evaluating" badge
      - MONITORING_RECOVERY: Orange border, clock icon, countdown timer
      - RECOVERED: Green border, checkmark icon, "Recovered" badge
      - CRITICAL_ALERT: Red pulsing border, alert icon, "CRITICAL" badge
    - Display "No Subject" badge when state is NORMAL and no subject detected
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 15.2 Write property test for AgentCard rendering count
    - **Property 29: AgentCard Rendering Count**
    - **Validates: Requirements 9.1, 9.5**

- [ ] 16. Update Dashboard page to render multiple AgentCards
  - [ ] 16.1 Update `src/app/page.tsx` to render AgentCard for each agent
    - Update useWebSocket hook to expose `agents: AgentState[]` from WSMessage
    - Replace FutureAgents placeholder with live AgentCards
    - Map over `agents` array and render one AgentCard per agent
    - Maintain existing FallGuard AgentCard for backward compatibility
    - _Requirements: 9.1, 9.5, 9.6_

  - [ ] 16.2 Update useWebSocket hook in `src/hooks/useWebSocket.ts` to parse agents array
    - Extract `agents` field from WSMessage
    - Expose `agents` in hook return value
    - _Requirements: 5.3, 5.5_

- [ ] 17. Update "Acknowledge Alert" button to send reset_agent message
  - [ ] 17.1 Update AlertPanel acknowledge handler to send WebSocket message
    - Modify `onAcknowledge` callback to call `sendMessage({ type: "reset_agent" })`
    - Dismiss AlertPanel after sending message
    - _Requirements: 11.4_

- [ ] 18. Final checkpoint - Ensure all tests pass and end-to-end workflows function
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional property-based test sub-tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests and integration tests validate specific examples and edge cases
- Backend tasks use Python with FastAPI and Pydantic
- Frontend tasks use TypeScript with Next.js 16 and React 19
- Phase 4 requirements (thermal detection, wearable fusion, AWS SNS/S3) are documented in the design but not included in this task list

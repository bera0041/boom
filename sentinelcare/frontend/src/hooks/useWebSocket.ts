"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ---- Types matching backend models ----

export interface AgentState {
  state: "normal" | "suspicious_event" | "monitoring_recovery" | "recovered" | "critical_alert";
  confidence: number;
  event_type: string;
  timer_active: boolean;
  timer_remaining: number;
  timer_total: number;
  last_change: string;
  summary: string;
}

export interface PoseFeatures {
  body_centroid_y: number;
  torso_angle: number;
  head_height: number;
  hip_height: number;
  velocity: number;
  motion_energy: number;
  stillness_score: number;
  ground_proximity: number;
}

export interface EventData {
  event_id: string;
  timestamp: string;
  agent: string;
  event_type: string;
  status: string;
  confidence: number;
  location: string;
  recovery_window_seconds: number;
  elapsed_seconds: number;
  summary: string;
  recommended_action: string;
  video_source: string;
}

export interface AlertData {
  alert_id: string;
  event: EventData;
  triggered_at: string;
  acknowledged: boolean;
}

export interface WSMessage {
  type: string;
  frame?: string;
  agent_state?: AgentState;
  features?: PoseFeatures;
  event?: EventData;
  alert?: AlertData;
  pose_detected?: boolean;
  num_people?: number;
}

// ---- Hook ----

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [connected, setConnected] = useState(false);
  const [frame, setFrame] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<AgentState>({
    state: "normal",
    confidence: 0,
    event_type: "none",
    timer_active: false,
    timer_remaining: 0,
    timer_total: 10,
    last_change: new Date().toISOString(),
    summary: "Waiting for connection...",
  });
  const [features, setFeatures] = useState<PoseFeatures | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [latestAlert, setLatestAlert] = useState<AlertData | null>(null);
  const [poseDetected, setPoseDetected] = useState(false);
  const [numPeople, setNumPeople] = useState(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log("[WS] Connected");
    };

    ws.onmessage = (evt) => {
      try {
        const msg: WSMessage = JSON.parse(evt.data);

        if (msg.frame) setFrame(msg.frame);
        if (msg.agent_state) setAgentState(msg.agent_state);
        if (msg.features) setFeatures(msg.features);
        if (msg.pose_detected !== undefined) setPoseDetected(msg.pose_detected);
        if (msg.num_people !== undefined) setNumPeople(msg.num_people);

        if (msg.event) {
          setEvents((prev) => [msg.event!, ...prev].slice(0, 100));
        }

        if (msg.alert) {
          setLatestAlert(msg.alert);
        }
      } catch (e) {
        console.warn("[WS] Parse error:", e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log("[WS] Disconnected — reconnecting in 2s");
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = (err) => {
      console.warn("[WS] Error:", err);
      ws.close();
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return {
    connected,
    frame,
    agentState,
    features,
    events,
    latestAlert,
    poseDetected,
    numPeople,
    sendMessage,
  };
}

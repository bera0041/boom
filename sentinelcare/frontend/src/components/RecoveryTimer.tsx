"use client";

import { useEffect, useState } from "react";
import type { AgentState } from "@/hooks/useWebSocket";

interface RecoveryTimerProps {
  agentState: AgentState;
}

export default function RecoveryTimer({ agentState }: RecoveryTimerProps) {
  const { timer_active, timer_remaining, timer_total } = agentState;
  const [displayTime, setDisplayTime] = useState(timer_remaining);

  useEffect(() => {
    setDisplayTime(timer_remaining);
  }, [timer_remaining]);

  // Smooth countdown interpolation
  useEffect(() => {
    if (!timer_active) return;
    const interval = setInterval(() => {
      setDisplayTime((prev) => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(interval);
  }, [timer_active]);

  if (!timer_active && agentState.state !== "monitoring_recovery") {
    return null;
  }

  const pct = timer_total > 0 ? (displayTime / timer_total) * 100 : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - pct / 100);
  const isUrgent = displayTime < timer_total * 0.3;

  // Color based on urgency
  const strokeColor = isUrgent ? "#ef4444" : displayTime < timer_total * 0.6 ? "#f59e0b" : "#10b981";

  return (
    <div className={`glass-card p-5 flex flex-col items-center animate-slide-up ${isUrgent ? "timer-urgent" : ""}`}>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Recovery Window
      </h3>

      {/* Circular timer */}
      <div className="relative w-32 h-32 mb-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Background ring */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="rgba(100,116,139,0.15)"
            strokeWidth="8"
          />
          {/* Progress ring */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{
              transition: "stroke-dashoffset 0.3s ease, stroke 0.5s ease",
              filter: `drop-shadow(0 0 6px ${strokeColor}60)`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold font-mono tabular-nums"
            style={{ color: strokeColor }}
          >
            {displayTime.toFixed(1)}
          </span>
          <span className="text-xs text-slate-500">seconds</span>
        </div>
      </div>

      <p className={`text-xs text-center ${isUrgent ? "text-red-400 font-medium" : "text-slate-500"}`}>
        {isUrgent
          ? "Time running out — no recovery detected"
          : "Monitoring for recovery..."}
      </p>
    </div>
  );
}

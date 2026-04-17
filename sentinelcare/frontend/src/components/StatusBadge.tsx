"use client";

import type { AgentState } from "@/hooks/useWebSocket";

const STATE_CONFIG = {
  normal: {
    label: "Normal",
    color: "bg-emerald-500",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgTint: "bg-emerald-500/10",
    pulse: "pulse-normal",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  suspicious_event: {
    label: "Suspicious",
    color: "bg-amber-500",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgTint: "bg-amber-500/10",
    pulse: "pulse-monitoring",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  monitoring_recovery: {
    label: "Monitoring",
    color: "bg-amber-500",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgTint: "bg-amber-500/10",
    pulse: "pulse-monitoring",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  recovered: {
    label: "Recovered",
    color: "bg-emerald-500",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgTint: "bg-emerald-500/10",
    pulse: "pulse-normal",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  critical_alert: {
    label: "CRITICAL ALERT",
    color: "bg-red-500",
    textColor: "text-red-400",
    borderColor: "border-red-500/40",
    bgTint: "bg-red-500/15",
    pulse: "pulse-alert",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.95l-7-12a2 2 0 00-3.5 0l-7 12A2 2 0 005.07 19z" />
      </svg>
    ),
  },
};

interface StatusBadgeProps {
  agentState: AgentState;
}

export default function StatusBadge({ agentState }: StatusBadgeProps) {
  const cfg = STATE_CONFIG[agentState.state] || STATE_CONFIG.normal;

  return (
    <div className={`glass-card p-4 ${cfg.bgTint} border ${cfg.borderColor} transition-all duration-500`}>
      <div className="flex items-center gap-3">
        {/* Pulsing dot */}
        <div className={`w-4 h-4 rounded-full ${cfg.color} ${cfg.pulse}`} />

        {/* Icon + label */}
        <div className={`${cfg.textColor} flex items-center gap-2`}>
          {cfg.icon}
          <span className="text-lg font-bold tracking-wide">{cfg.label}</span>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{agentState.summary}</p>
    </div>
  );
}

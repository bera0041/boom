"use client";

import type { AgentState } from "@/hooks/useWebSocket";

interface AgentCardProps {
  agentState: AgentState;
  poseDetected: boolean;
}

export default function AgentCard({ agentState, poseDetected }: AgentCardProps) {
  const confidencePct = Math.round(agentState.confidence * 100);

  // Confidence bar color
  const barColor =
    confidencePct >= 70
      ? "bg-red-500"
      : confidencePct >= 40
      ? "bg-amber-500"
      : "bg-emerald-500";

  const lastChange = new Date(agentState.last_change);
  const timeAgo = Math.round((Date.now() - lastChange.getTime()) / 1000);
  const timeLabel = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">FallGuard Agent</h3>
            <p className="text-xs text-slate-500">Fall / Collapse Detection</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          poseDetected
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
            : "bg-slate-700/50 text-slate-500 border border-slate-600/20"
        }`}>
          {poseDetected ? "Active" : "No Subject"}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Confidence</span>
          <span className="text-slate-300 font-mono">{confidencePct}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-800/50 rounded-lg px-3 py-2">
          <span className="text-slate-500 block">State</span>
          <span className="text-slate-300 font-medium capitalize">
            {agentState.state.replace(/_/g, " ")}
          </span>
        </div>
        <div className="bg-slate-800/50 rounded-lg px-3 py-2">
          <span className="text-slate-500 block">Last Change</span>
          <span className="text-slate-300 font-medium">{timeLabel}</span>
        </div>
      </div>
    </div>
  );
}

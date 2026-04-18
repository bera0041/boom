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
      ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
      : confidencePct >= 40
      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
      : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]";

  const barBg =
    confidencePct >= 70
      ? "bg-red-500/10"
      : confidencePct >= 40
      ? "bg-amber-500/10"
      : "bg-emerald-500/10";

  const lastChange = new Date(agentState.last_change);
  const timeAgo = Math.round((Date.now() - lastChange.getTime()) / 1000);
  const timeLabel = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 leading-none">FallGuard Agent</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Fall / Collapse Detection</p>
          </div>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
          poseDetected
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
            : "bg-slate-800/60 text-slate-500 border border-slate-700/30"
        }`}>
          {poseDetected ? "Active" : "No Subject"}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[11px] mb-1.5">
          <span className="text-slate-500 font-medium">Fall Confidence</span>
          <span className="text-slate-300 font-mono font-semibold">{confidencePct}%</span>
        </div>
        <div className={`h-1.5 ${barBg} rounded-full overflow-hidden`}>
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/40 rounded-xl px-3 py-2 border border-slate-700/20">
          <span className="text-[10px] text-slate-500 block font-medium uppercase tracking-wider">State</span>
          <span className="text-[13px] text-slate-300 font-medium capitalize mt-0.5 block">
            {agentState.state.replace(/_/g, " ")}
          </span>
        </div>
        <div className="bg-slate-800/40 rounded-xl px-3 py-2 border border-slate-700/20">
          <span className="text-[10px] text-slate-500 block font-medium uppercase tracking-wider">Changed</span>
          <span className="text-[13px] text-slate-300 font-mono font-medium mt-0.5 block">{timeLabel}</span>
        </div>
      </div>
    </div>
  );
}

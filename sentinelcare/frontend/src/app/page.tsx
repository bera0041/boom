"use client";

import { useWebSocket } from "@/hooks/useWebSocket";
import LiveFeed from "@/components/LiveFeed";
import StatusBadge from "@/components/StatusBadge";
import AgentCard from "@/components/AgentCard";
import RecoveryTimer from "@/components/RecoveryTimer";
import AlertPanel from "@/components/AlertPanel";
import EventLog from "@/components/EventLog";
import FutureAgents from "@/components/FutureAgents";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export default function Dashboard() {
  const {
    connected,
    frame,
    agentState,
    events,
    latestAlert,
    poseDetected,
    numPeople,
    sendMessage,
  } = useWebSocket(WS_URL);

  const handleAcknowledge = () => {
    sendMessage({ type: "reset_agent" });
  };

  return (
    <main className="flex-1 flex flex-col p-5 gap-5 max-w-[1920px] mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">
              Sentinel<span className="text-cyan-400">Care</span>
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">AI Home Safety Monitor</p>
          </div>
        </div>

        {/* Connection status pill */}
        <div className="stat-pill">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-red-400 animate-pulse"}`} />
          <span className={`text-[11px] ${connected ? "text-slate-400" : "text-red-400"}`}>
            {connected ? "Live" : "Offline"}
          </span>
        </div>
      </header>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
        {/* Left: Live feed */}
        <div className="lg:col-span-8 flex flex-col min-h-[420px]">
          <LiveFeed frame={frame} poseDetected={poseDetected} connected={connected} numPeople={numPeople} />
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto pr-0.5">
          <StatusBadge agentState={agentState} />
          <AgentCard agentState={agentState} poseDetected={poseDetected} />
          <RecoveryTimer agentState={agentState} />
          <AlertPanel alert={latestAlert} onAcknowledge={handleAcknowledge} />
          <FutureAgents />
        </div>
      </div>

      {/* Bottom: Event Log */}
      <div className="h-[200px] shrink-0">
        <EventLog events={events} />
      </div>
    </main>
  );
}

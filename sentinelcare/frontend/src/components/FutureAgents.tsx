"use client";

const FUTURE_AGENTS = [
  {
    name: "Seizure Agent",
    description: "Abnormal repetitive motion patterns",
    status: "Experimental",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  {
    name: "Stroke Risk Agent",
    description: "Asymmetry and sudden immobility detection",
    status: "Future",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
  {
    name: "Injury Angle Agent",
    description: "Unnatural joint angle detection",
    status: "Future",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    name: "Wandering Agent",
    description: "Prolonged immobility / pacing detection",
    status: "Future",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
];

export default function FutureAgents() {
  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Agent Modules
      </h3>
      <div className="space-y-2">
        {FUTURE_AGENTS.map((agent) => (
          <div
            key={agent.name}
            className={`flex items-center gap-3 ${agent.bg} border ${agent.border} rounded-lg px-3 py-2.5 opacity-60 hover:opacity-80 transition-opacity`}
          >
            <div className={`${agent.color}`}>{agent.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300">{agent.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/60 text-slate-500 border border-slate-700/40">
                  {agent.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">{agent.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

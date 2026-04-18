"use client";

interface LiveFeedProps {
  frame: string | null;
  poseDetected: boolean;
  connected: boolean;
  numPeople: number;
}

export default function LiveFeed({ frame, poseDetected, connected, numPeople }: LiveFeedProps) {
  return (
    <div className="glass-card overflow-hidden flex flex-col h-full group">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <div
              className={`w-2 h-2 rounded-full ${
                connected
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "bg-red-400 animate-pulse"
              }`}
            />
          </div>
          <span className="section-label">Live Feed</span>
        </div>
        <div className="flex items-center gap-2.5">
          {poseDetected && (
            <div className="stat-pill !bg-emerald-500/10 !border-emerald-500/20">
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-emerald-400 font-medium">
                {numPeople} {numPeople === 1 ? "Person" : "People"}
              </span>
            </div>
          )}
          <div className="stat-pill">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-slate-400">CAM-01</span>
          </div>
        </div>
      </div>

      {/* Video area */}
      <div className="relative flex-1 bg-black/50 flex items-center justify-center min-h-[300px]">
        {frame ? (
          <>
            <img
              src={`data:image/jpeg;base64,${frame}`}
              alt="Live camera feed with pose overlay"
              className="w-full h-full object-contain"
              style={{ imageRendering: "auto" }}
            />
            {/* Subtle scanline overlay */}
            <div className="absolute inset-0 scanline-overlay" />
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-600">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-500">
                {connected ? "Waiting for stream..." : "Connecting..."}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {connected ? "Video feed will appear shortly" : "Establishing backend connection"}
              </p>
            </div>
          </div>
        )}

        {/* Disconnected overlay */}
        {!connected && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-6 h-6 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-sm font-medium text-amber-400/90">Reconnecting</span>
            </div>
          </div>
        )}

        {/* Corner decorations */}
        <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-cyan-500/20 rounded-tl" />
        <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-cyan-500/20 rounded-tr" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-cyan-500/20 rounded-bl" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-cyan-500/20 rounded-br" />
      </div>
    </div>
  );
}

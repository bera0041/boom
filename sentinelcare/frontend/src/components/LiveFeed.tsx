"use client";

interface LiveFeedProps {
  frame: string | null;
  poseDetected: boolean;
  connected: boolean;
  numPeople: number;
}

export default function LiveFeed({ frame, poseDetected, connected, numPeople }: LiveFeedProps) {
  return (
    <div className="glass-card overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              connected ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-red-400"
            }`}
          />
          <span className="text-sm font-semibold text-slate-300 tracking-wide uppercase">
            Live Feed
          </span>
        </div>
        <div className="flex items-center gap-3">
          {poseDetected && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {numPeople} {numPeople === 1 ? "Person" : "People"} Detected
            </span>
          )}
          <span className="text-xs text-slate-500">Camera 1</span>
        </div>
      </div>

      {/* Feed */}
      <div className="relative flex-1 bg-black/40 flex items-center justify-center min-h-[300px]">
        {frame ? (
          <img
            src={`data:image/jpeg;base64,${frame}`}
            alt="Live camera feed with pose overlay"
            className="w-full h-full object-contain"
            style={{ imageRendering: "auto" }}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <svg className="w-16 h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">
              {connected ? "Waiting for video stream..." : "Connecting to backend..."}
            </p>
          </div>
        )}

        {/* Overlay: connection status */}
        {!connected && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="flex items-center gap-2 text-amber-400">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-sm font-medium">Reconnecting...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

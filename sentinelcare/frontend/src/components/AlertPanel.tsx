"use client";

import type { AlertData } from "@/hooks/useWebSocket";

interface AlertPanelProps {
  alert: AlertData | null;
  onAcknowledge?: () => void;
}

export default function AlertPanel({ alert, onAcknowledge }: AlertPanelProps) {
  if (!alert) return null;

  const { event } = alert;
  const ts = new Date(event.timestamp);
  const timeStr = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="glass-card border border-red-500/40 bg-red-500/10 p-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-red-400">Critical Alert</h3>
          <p className="text-xs text-red-300/70">{timeStr}</p>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-slate-300 mb-3 leading-relaxed">{event.summary}</p>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="bg-black/20 rounded-lg px-3 py-2">
          <span className="text-slate-500 block">Event Type</span>
          <span className="text-slate-200 font-medium capitalize">{event.event_type.replace(/_/g, " ")}</span>
        </div>
        <div className="bg-black/20 rounded-lg px-3 py-2">
          <span className="text-slate-500 block">Confidence</span>
          <span className="text-slate-200 font-mono font-medium">{Math.round(event.confidence * 100)}%</span>
        </div>
        <div className="bg-black/20 rounded-lg px-3 py-2">
          <span className="text-slate-500 block">Location</span>
          <span className="text-slate-200 font-medium">{event.location}</span>
        </div>
        <div className="bg-black/20 rounded-lg px-3 py-2">
          <span className="text-slate-500 block">Elapsed</span>
          <span className="text-slate-200 font-mono font-medium">{event.elapsed_seconds}s</span>
        </div>
      </div>

      {/* Action */}
      {event.recommended_action && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
          <span className="text-xs text-red-300/70 block mb-0.5">Recommended Action</span>
          <span className="text-sm text-red-300 font-medium">{event.recommended_action}</span>
        </div>
      )}

      {onAcknowledge && (
        <button
          onClick={onAcknowledge}
          className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-medium text-red-300 transition-colors"
        >
          Acknowledge Alert
        </button>
      )}
    </div>
  );
}

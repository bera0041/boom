"use client";

import type { EventData } from "@/hooks/useWebSocket";

interface EventLogProps {
  events: EventData[];
}

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  critical_alert: { dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]", text: "text-red-400", bg: "bg-red-500/[0.04]" },
  monitoring_recovery: { dot: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]", text: "text-amber-400", bg: "bg-amber-500/[0.04]" },
  recovered: { dot: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]", text: "text-emerald-400", bg: "bg-emerald-500/[0.04]" },
  normal: { dot: "bg-slate-500", text: "text-slate-400", bg: "bg-transparent" },
};

export default function EventLog({ events }: EventLogProps) {
  return (
    <div className="glass-card p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-label">Event Timeline</h3>
        <span className="text-[11px] text-slate-600 font-mono">{events.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-800/40 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[12px] text-slate-600">No events recorded yet</p>
            </div>
          </div>
        ) : (
          events.map((evt) => {
            const style = STATUS_STYLES[evt.status] || STATUS_STYLES.normal;
            const ts = new Date(evt.timestamp);
            const timeStr = ts.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            return (
              <div
                key={evt.event_id}
                className={`flex items-start gap-3 ${style.bg} rounded-xl px-3 py-2 animate-slide-up hover:bg-slate-800/30 transition-colors duration-200`}
              >
                {/* Timeline dot */}
                <div className="pt-1.5 shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[11px] font-semibold capitalize ${style.text}`}>
                      {evt.event_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">{timeStr}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed truncate">{evt.summary}</p>
                </div>

                {/* Confidence badge */}
                <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-800/40 px-1.5 py-0.5 rounded-md shrink-0 border border-slate-700/20">
                  {Math.round(evt.confidence * 100)}%
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

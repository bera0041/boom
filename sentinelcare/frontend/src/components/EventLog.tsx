"use client";

import type { EventData } from "@/hooks/useWebSocket";

interface EventLogProps {
  events: EventData[];
}

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  critical_alert: { dot: "bg-red-500", text: "text-red-400" },
  monitoring_recovery: { dot: "bg-amber-500", text: "text-amber-400" },
  recovered: { dot: "bg-emerald-500", text: "text-emerald-400" },
  normal: { dot: "bg-slate-500", text: "text-slate-400" },
};

export default function EventLog({ events }: EventLogProps) {
  return (
    <div className="glass-card p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Event Timeline
        </h3>
        <span className="text-xs text-slate-500">{events.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-600 italic">No events recorded yet</p>
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
                className="flex items-start gap-3 bg-slate-800/30 rounded-lg px-3 py-2.5 animate-slide-up"
              >
                {/* Timeline dot */}
                <div className="pt-1.5">
                  <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold capitalize ${style.text}`}>
                      {evt.event_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">{timeStr}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed truncate">{evt.summary}</p>
                </div>

                {/* Confidence badge */}
                <span className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded shrink-0">
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

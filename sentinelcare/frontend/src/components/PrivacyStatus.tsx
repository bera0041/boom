"use client";

interface PrivacyStatusProps {
  connected: boolean;
  isSecure?: boolean;
}

export default function PrivacyStatus({ connected, isSecure = true }: PrivacyStatusProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Edge Processing Indicator */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="text-xs font-medium text-emerald-400">Edge Processing</span>
      </div>

      {/* No Cloud Storage Indicator */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364L5.636 5.636" />
        </svg>
        <span className="text-xs font-medium text-emerald-400">No Cloud Storage</span>
      </div>

      {/* Connection Security Indicator */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
        connected && isSecure 
          ? "bg-emerald-500/10 border border-emerald-500/20" 
          : connected 
            ? "bg-amber-500/10 border border-amber-500/20"
            : "bg-red-500/10 border border-red-500/20"
      }`}>
        <svg className={`w-3.5 h-3.5 ${
          connected && isSecure ? "text-emerald-400" : connected ? "text-amber-400" : "text-red-400"
        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className={`text-xs font-medium ${
          connected && isSecure ? "text-emerald-400" : connected ? "text-amber-400" : "text-red-400"
        }`}>
          {connected && isSecure ? "Encrypted" : connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Live View Only Indicator */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-xs font-medium text-cyan-400">Live View Only</span>
      </div>
    </div>
  );
}

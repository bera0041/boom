"use client";

import { UserSettings } from "@/hooks/useUserSettings";

interface PrivacyStatusProps {
  connected: boolean;
  isSecure?: boolean;
  settings?: UserSettings | null;
  onToggleRecording?: () => void;
  onTogglePrivacyMode?: () => void;
  loading?: boolean;
}

export default function PrivacyStatus({ 
  connected, 
  isSecure = true,
  settings,
  onToggleRecording,
  onTogglePrivacyMode,
  loading = false,
}: PrivacyStatusProps) {
  const recordingEnabled = settings?.recording_enabled ?? true;
  const privacyMode = settings?.privacy_mode ?? false;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Recording Toggle */}
      <button
        onClick={onToggleRecording}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
          recordingEnabled 
            ? "bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20" 
            : "bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {recordingEnabled ? (
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
          </svg>
        )}
        <span className={`text-xs font-medium ${recordingEnabled ? "text-emerald-400" : "text-red-400"}`}>
          {recordingEnabled ? "Recording On" : "Recording Off"}
        </span>
      </button>

      {/* Privacy Mode Toggle */}
      <button
        onClick={onTogglePrivacyMode}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
          privacyMode 
            ? "bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20" 
            : "bg-slate-500/10 border border-slate-500/20 hover:bg-slate-500/20"
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <svg className={`w-3.5 h-3.5 ${privacyMode ? "text-amber-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {privacyMode ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          )}
        </svg>
        <span className={`text-xs font-medium ${privacyMode ? "text-amber-400" : "text-slate-400"}`}>
          {privacyMode ? "Privacy Mode" : "Normal Mode"}
        </span>
      </button>

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
    </div>
  );
}

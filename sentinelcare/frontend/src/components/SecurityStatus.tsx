"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SecurityStatusProps {
  connected: boolean;
}

export default function SecurityStatus({ connected }: SecurityStatusProps) {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ email: user.email });
        setLastLogin(user.last_sign_in_at || null);
      }
    };
    
    getUser();
  }, []);

  const formatLastLogin = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Security Status</span>
      </div>

      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Connection</span>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
            connected ? "bg-emerald-500/10" : "bg-red-500/10"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              connected ? "bg-emerald-400" : "bg-red-400"
            }`} />
            <span className={`text-xs font-medium ${
              connected ? "text-emerald-400" : "text-red-400"
            }`}>
              {connected ? "Secure" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Authentication Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Authenticated</span>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
            user ? "bg-emerald-500/10" : "bg-amber-500/10"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              user ? "bg-emerald-400" : "bg-amber-400"
            }`} />
            <span className={`text-xs font-medium ${
              user ? "text-emerald-400" : "text-amber-400"
            }`}>
              {user ? "Yes" : "No"}
            </span>
          </div>
        </div>

        {/* Last Login */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Last Login</span>
          <span className="text-xs text-slate-400">{formatLastLogin(lastLogin)}</span>
        </div>

        {/* User Email */}
        {user?.email && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Account</span>
            <span className="text-xs text-slate-400 truncate max-w-[150px]">{user.email}</span>
          </div>
        )}

        {/* Data Protection Badges */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              AES-256
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              TLS 1.3
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              JWT Auth
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

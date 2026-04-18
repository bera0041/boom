"use client";

import Link from "next/link";

export default function SignUpSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
          <p className="text-slate-400 mb-6">
            We&apos;ve sent you a confirmation link. Click the link in your email to activate your account and access your safety dashboard.
          </p>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-6">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-300 font-medium">What happens next?</p>
                <p className="text-xs text-slate-500">After confirming your email, you&apos;ll be able to set up monitoring consent and access your dashboard.</p>
              </div>
            </div>
          </div>

          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}

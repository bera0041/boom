'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAlertDispatch } from '@/hooks/useAlertDispatch';

interface EmergencyAlertModalProps {
  isOpen: boolean;
  alertType: string;
  alertSeverity: string;
  alertTimestamp: Date;
  onClose: () => void;
  onDispatched?: () => void;
}

const COUNTDOWN_SECONDS = 10;

export default function EmergencyAlertModal({
  isOpen,
  alertType,
  alertSeverity,
  alertTimestamp,
  onClose,
  onDispatched,
}: EmergencyAlertModalProps) {
  const { settings } = useUserSettings();
  const { contacts } = useEmergencyContacts();
  const { location } = useUserLocation();
  const { 
    dispatching, 
    dispatchAlert, 
    fetchNearestHospital,
    requestNotificationPermission,
    notificationPermission,
  } = useAlertDispatch();

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [nearestHospital, setNearestHospital] = useState<any>(null);

  // Request notification permission on mount
  useEffect(() => {
    if (isOpen && notificationPermission === 'default') {
      requestNotificationPermission();
    }
  }, [isOpen, notificationPermission, requestNotificationPermission]);

  // Fetch nearest hospital on open
  useEffect(() => {
    if (isOpen && location?.latitude && location?.longitude) {
      fetchNearestHospital(Number(location.latitude), Number(location.longitude))
        .then(setNearestHospital);
    }
  }, [isOpen, location, fetchNearestHospital]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || isCancelled || isDispatched) return;

    if (countdown <= 0) {
      handleDispatch();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, countdown, isCancelled, isDispatched]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(COUNTDOWN_SECONDS);
      setIsCancelled(false);
      setIsDispatched(false);
      setDispatchResult(null);
    }
  }, [isOpen]);

  const handleDispatch = useCallback(async () => {
    if (isDispatched || dispatching) return;

    const result = await dispatchAlert(
      {
        type: alertType,
        severity: alertSeverity,
        timestamp: alertTimestamp,
        location,
      },
      settings,
      contacts,
      location
    );

    setDispatchResult(result);
    setIsDispatched(true);
    onDispatched?.();
  }, [
    isDispatched,
    dispatching,
    dispatchAlert,
    alertType,
    alertSeverity,
    alertTimestamp,
    settings,
    contacts,
    location,
    onDispatched,
  ]);

  const handleCancel = () => {
    setIsCancelled(true);
    onClose();
  };

  const handleImmediateDispatch = () => {
    setCountdown(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-slate-900 border border-red-500/50 rounded-2xl shadow-2xl shadow-red-500/20 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Pulsing border effect */}
        <div className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-pulse opacity-50 pointer-events-none" />

        {/* Header */}
        <div className="relative bg-red-500/20 p-6 border-b border-red-500/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/30 flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-400">CRITICAL ALERT</h2>
              <p className="text-red-300/80">{alertType} Detected</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6 space-y-4">
          {!isDispatched ? (
            <>
              {/* Countdown */}
              <div className="text-center">
                <p className="text-slate-400 mb-2">Emergency services will be notified in</p>
                <div className="text-6xl font-bold text-red-400 tabular-nums">
                  {countdown}
                </div>
                <p className="text-slate-500 text-sm mt-2">seconds</p>
              </div>

              {/* Alert Info */}
              <div className="space-y-2 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Issue:</span>
                  <span className="text-slate-200 font-medium">{alertType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Time:</span>
                  <span className="text-slate-200">{alertTimestamp.toLocaleTimeString()}</span>
                </div>
                {location?.home_address && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Location:</span>
                    <span className="text-slate-200 text-right max-w-[200px] truncate">{location.home_address}</span>
                  </div>
                )}
              </div>

              {/* Who will be notified */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Will Notify:</p>
                <div className="flex flex-wrap gap-2">
                  {settings?.notify_911 && (
                    <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                      911 Emergency
                    </span>
                  )}
                  {settings?.notify_emergency_contacts && contacts.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                      {contacts.length} Contact{contacts.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {settings?.notify_nearest_hospital && nearestHospital && (
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                      {nearestHospital.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 rounded-lg bg-slate-700 text-slate-200 font-medium hover:bg-slate-600 transition-colors"
                >
                  Cancel Alert
                </button>
                <button
                  onClick={handleImmediateDispatch}
                  disabled={dispatching}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {dispatching ? 'Dispatching...' : 'Send Now'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Dispatched Confirmation */}
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-200 mb-2">Alert Prepared</h3>
                <p className="text-slate-400 text-sm">Click the buttons below to contact emergency services</p>
              </div>

              {/* 911 Emergency Button */}
              {dispatchResult?.notified911 && (
                <a
                  href="tel:911"
                  className="flex items-center justify-center gap-3 w-full px-4 py-4 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  CALL 911
                </a>
              )}

              {/* Email Contacts */}
              {dispatchResult?.emailLinks?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email Emergency Contacts:</p>
                  {dispatchResult.emailLinks.map((link: any, idx: number) => (
                    <a
                      key={idx}
                      href={link.mailtoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">{link.name}</span>
                      </div>
                      <span className="text-xs text-amber-400/70">{link.email}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Phone Contacts */}
              {dispatchResult?.phoneLinks?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Call Emergency Contacts:</p>
                  {dispatchResult.phoneLinks.map((link: any, idx: number) => (
                    <a
                      key={idx}
                      href={link.telUrl}
                      className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-medium">{link.name}</span>
                      </div>
                      <span className="text-xs text-emerald-400/70">{link.phone}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Hospital Contact */}
              {dispatchResult?.hospitalLink && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nearest Hospital:</p>
                  <div className="p-4 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-cyan-300">{dispatchResult.hospitalLink.name}</p>
                        {dispatchResult.hospitalLink.phone && (
                          <a 
                            href={dispatchResult.hospitalLink.telUrl}
                            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {dispatchResult.hospitalLink.phone}
                          </a>
                        )}
                      </div>
                      <svg className="w-8 h-8 text-cyan-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Alert logged notice */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 text-slate-400 text-xs">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Alert logged to history at {new Date().toLocaleTimeString()}
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="w-full px-4 py-3 rounded-lg bg-slate-700 text-slate-200 font-medium hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

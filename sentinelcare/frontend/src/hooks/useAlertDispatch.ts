'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserSettings } from './useUserSettings';
import { EmergencyContact } from './useEmergencyContacts';
import { UserLocation } from './useUserLocation';

interface Hospital {
  name: string;
  address: string;
  phone?: string;
  distance: number;
}

interface AlertInfo {
  type: string;
  severity: string;
  timestamp: Date;
  location?: UserLocation | null;
  nearestHospital?: Hospital | null;
}

interface DispatchResult {
  success: boolean;
  notified911: boolean;
  notifiedContacts: EmergencyContact[];
  notifiedHospital: Hospital | null;
  alertId?: string;
  // New: Links for user to click
  emailLinks: Array<{ name: string; email: string; mailtoUrl: string }>;
  phoneLinks: Array<{ name: string; phone: string; telUrl: string }>;
  hospitalLink: { name: string; phone?: string; telUrl?: string } | null;
}

export function useAlertDispatch() {
  const [dispatching, setDispatching] = useState(false);
  const [lastDispatch, setLastDispatch] = useState<DispatchResult | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const supabase = createClient();

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    }

    return false;
  }, []);

  // Send browser notification
  const sendBrowserNotification = useCallback((title: string, body: string, tag?: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/sentinel-icon.png',
        badge: '/sentinel-badge.png',
        tag: tag || 'sentinelcare-alert',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 30 seconds
      setTimeout(() => notification.close(), 30000);
    }
  }, []);

  // Fetch nearest hospital based on location
  const fetchNearestHospital = useCallback(async (lat: number, lng: number): Promise<Hospital | null> => {
    try {
      const response = await fetch('/api/nearby-hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.hospitals?.[0] || null;
    } catch (err) {
      console.error('Error fetching nearest hospital:', err);
      return null;
    }
  }, []);

  // Main dispatch function
  const dispatchAlert = useCallback(async (
    alertInfo: AlertInfo,
    settings: UserSettings | null,
    contacts: EmergencyContact[],
    location: UserLocation | null
  ): Promise<DispatchResult> => {
    setDispatching(true);

    const result: DispatchResult = {
      success: false,
      notified911: false,
      notifiedContacts: [],
      notifiedHospital: null,
      emailLinks: [],
      phoneLinks: [],
      hospitalLink: null,
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get nearest hospital if location is available
      let nearestHospital: Hospital | null = null;
      if (location?.latitude && location?.longitude && settings?.notify_nearest_hospital) {
        nearestHospital = await fetchNearestHospital(
          Number(location.latitude),
          Number(location.longitude)
        );
      }

      // Send browser notification immediately
      sendBrowserNotification(
        `EMERGENCY: ${alertInfo.type}`,
        `Critical alert detected at ${alertInfo.timestamp.toLocaleTimeString()}. ${location?.home_address || 'Location unknown'}`,
        `alert-${Date.now()}`
      );

      // Prepare alert payload for API
      const payload = {
        alertType: alertInfo.type,
        severity: alertInfo.severity,
        timestamp: alertInfo.timestamp.toISOString(),
        location: location ? {
          address: location.home_address,
          latitude: location.latitude ? Number(location.latitude) : undefined,
          longitude: location.longitude ? Number(location.longitude) : undefined,
        } : undefined,
        contacts: contacts.map(c => ({
          name: c.name,
          email: c.email || undefined,
          phone: c.phone,
        })),
        notify911: settings?.notify_911 || false,
        notifyHospital: settings?.notify_nearest_hospital || false,
        nearestHospital: nearestHospital ? {
          name: nearestHospital.name,
          address: nearestHospital.address,
          phone: nearestHospital.phone,
        } : undefined,
      };

      // Call API to generate mailto/tel links
      const response = await fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        result.emailLinks = data.dispatched.emailContacts || [];
        result.phoneLinks = data.dispatched.phoneContacts || [];
        if (data.dispatched.hospital) {
          result.hospitalLink = {
            name: data.dispatched.hospital.name,
            phone: data.dispatched.hospital.phone,
            telUrl: data.dispatched.hospital.telUrl,
          };
        }
      }

      // Update result flags
      if (settings?.notify_911) {
        result.notified911 = true;
      }
      if (settings?.notify_emergency_contacts && contacts.length > 0) {
        result.notifiedContacts = contacts;
      }
      if (settings?.notify_nearest_hospital && nearestHospital) {
        result.notifiedHospital = nearestHospital;
      }

      // Log alert to database
      const { data: alertData, error: alertError } = await supabase
        .from('alert_history')
        .insert({
          user_id: user.id,
          alert_type: alertInfo.type,
          severity: alertInfo.severity,
          location_address: location?.home_address || null,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          triggered_at: alertInfo.timestamp.toISOString(),
          notified_911: result.notified911,
          notified_contacts: result.notifiedContacts.map(c => ({ name: c.name, phone: c.phone, email: c.email })),
          notified_hospital: result.notifiedHospital?.name || null,
          status: 'dispatched',
        })
        .select()
        .single();

      if (alertError) {
        console.error('Error logging alert:', alertError);
      } else {
        result.alertId = alertData.id;
      }

      result.success = true;
      setLastDispatch(result);
      return result;
    } catch (err) {
      console.error('Error dispatching alert:', err);
      return result;
    } finally {
      setDispatching(false);
    }
  }, [supabase, fetchNearestHospital, sendBrowserNotification]);

  // Cancel/acknowledge an alert
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alert_history')
        .update({
          acknowledged_at: new Date().toISOString(),
          status: 'acknowledged',
        })
        .eq('id', alertId);

      if (error) throw error;
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  }, [supabase]);

  // Open email client for a contact
  const openEmailForContact = useCallback((mailtoUrl: string) => {
    window.open(mailtoUrl, '_blank');
  }, []);

  // Open phone dialer for a contact
  const openPhoneForContact = useCallback((telUrl: string) => {
    window.location.href = telUrl;
  }, []);

  return {
    dispatching,
    lastDispatch,
    dispatchAlert,
    acknowledgeAlert,
    fetchNearestHospital,
    notificationPermission,
    requestNotificationPermission,
    sendBrowserNotification,
    openEmailForContact,
    openPhoneForContact,
  };
}

import { NextRequest, NextResponse } from 'next/server';

export interface AlertPayload {
  alertType: string;
  severity: string;
  timestamp: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  contacts: Array<{
    name: string;
    email?: string;
    phone?: string;
  }>;
  notify911: boolean;
  notifyHospital: boolean;
  nearestHospital?: {
    name: string;
    address: string;
    phone?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: AlertPayload = await request.json();
    
    // Generate email content for emergency contacts
    const emailSubject = encodeURIComponent(
      `URGENT: SentinelCare Emergency Alert - ${payload.alertType}`
    );
    
    const locationText = payload.location?.address 
      ? `Location: ${payload.location.address}`
      : payload.location?.latitude 
        ? `Location: ${payload.location.latitude}, ${payload.location.longitude}`
        : 'Location: Not available';
    
    const mapsLink = payload.location?.latitude && payload.location?.longitude
      ? `https://maps.google.com/?q=${payload.location.latitude},${payload.location.longitude}`
      : '';
    
    const emailBody = encodeURIComponent(
`EMERGENCY ALERT FROM SENTINELCARE

Alert Type: ${payload.alertType}
Severity: ${payload.severity.toUpperCase()}
Time: ${new Date(payload.timestamp).toLocaleString()}

${locationText}
${mapsLink ? `Google Maps: ${mapsLink}` : ''}

${payload.nearestHospital ? `Nearest Hospital: ${payload.nearestHospital.name}
Hospital Address: ${payload.nearestHospital.address}
${payload.nearestHospital.phone ? `Hospital Phone: ${payload.nearestHospital.phone}` : ''}` : ''}

This is an automated emergency alert. Please check on the person immediately or contact emergency services.

---
Sent by SentinelCare Home Safety Monitoring System`
    );

    // Build mailto links for each contact with email
    const emailContacts = payload.contacts.filter(c => c.email);
    const mailtoLinks = emailContacts.map(contact => ({
      name: contact.name,
      email: contact.email,
      mailtoUrl: `mailto:${contact.email}?subject=${emailSubject}&body=${emailBody}`
    }));

    // Build tel links for phone contacts (for 911 simulation and hospital)
    const phoneContacts = payload.contacts.filter(c => c.phone);
    const telLinks = phoneContacts.map(contact => ({
      name: contact.name,
      phone: contact.phone,
      telUrl: `tel:${contact.phone}`
    }));

    // 911 link (for demo purposes - shows what would happen)
    const emergency911 = payload.notify911 ? {
      enabled: true,
      telUrl: 'tel:911',
      message: 'In a real emergency, this would connect to 911'
    } : { enabled: false };

    // Hospital contact
    const hospitalContact = payload.notifyHospital && payload.nearestHospital ? {
      name: payload.nearestHospital.name,
      address: payload.nearestHospital.address,
      phone: payload.nearestHospital.phone,
      telUrl: payload.nearestHospital.phone ? `tel:${payload.nearestHospital.phone}` : null
    } : null;

    return NextResponse.json({
      success: true,
      dispatched: {
        emailContacts: mailtoLinks,
        phoneContacts: telLinks,
        emergency911,
        hospital: hospitalContact,
        timestamp: new Date().toISOString(),
        alertSummary: {
          type: payload.alertType,
          severity: payload.severity,
          location: locationText
        }
      }
    });
  } catch (error) {
    console.error('Alert dispatch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to prepare alert dispatch' },
      { status: 500 }
    );
  }
}

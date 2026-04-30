'use client';

import { buildManagerWhatsAppUrl } from '@/lib/whatsapp';

export default function ContactManagerButton({ agentName, agentId }) {
  const message = `היי, כאן ${agentName || 'סוכן'}${agentId ? ` (סוכן ${agentId})` : ''}. יש לי שאלה לגבי לקוח / עסקה במערכת VIPO.`;
  const url = buildManagerWhatsAppUrl(message);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
    >
      ווצאפ למנהל
    </a>
  );
}

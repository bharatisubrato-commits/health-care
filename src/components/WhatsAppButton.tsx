import React from 'react';
import { MessageCircle } from 'lucide-react';

export function WhatsAppButton({ phone = '8388922869' }: { phone?: string }) {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const href = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
    'Hi Muscle Arena Durgapur! I would like to know more about gym memberships.'
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp with Muscle Arena"
      className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#16A34A] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-transform duration-150 hover:scale-105 hover:bg-[#15803D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4F000]"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline whitespace-nowrap">WhatsApp</span>
    </a>
  );
}

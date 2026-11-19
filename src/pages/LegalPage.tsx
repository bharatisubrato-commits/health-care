import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { PublicSettings } from '../types';

interface LegalPageProps {
  type: 'privacy' | 'terms' | 'refund';
  settings: PublicSettings;
  onNavigate: (path: string) => void;
}

export function LegalPage({ type, settings, onNavigate }: LegalPageProps) {
  const titles = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    refund: 'Refund & Cancellation Policy',
  };

  return (
    <main className="bg-[#09090B] py-16 sm:py-20">
      <div className="mx-auto max-w-[820px] px-4 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-[#B4F000] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </button>

        <h1 className="mt-6 font-display text-5xl tracking-wide text-white">{titles[type]}</h1>
        <p className="mt-2 text-xs text-zinc-500">
          Last updated: 2026 · {settings.gym_name}, {settings.address}
        </p>

        <div className="mt-8 space-y-6 border-t border-white/10 pt-8 text-sm leading-relaxed text-zinc-300">
          {type === 'privacy' && (
            <>
              <p>
                Muscle Arena collects only the personal information required to manage gym
                memberships, verify UPI or front-desk payments, contact emergency guardians if
                needed, and schedule trial sessions.
              </p>
              <p>
                Payment UTR references and optional screenshots uploaded during enrollment are used
                solely by authorized Muscle Arena staff and management to confirm fee receipts and
                generate official membership receipts.
              </p>
              <p>
                We never sell or share member phone numbers, emails, or health goals with third-party
                marketers. To request updates or deletion of your records, contact{' '}
                <span className="text-white">{settings.email}</span> or call +91 {settings.phone}.
              </p>
            </>
          )}

          {type === 'terms' && (
            <>
              <p>
                All members must follow gym floor safety guidelines, re-rack weights after use,
                carry a clean towel, and use indoor athletic footwear inside training zones.
              </p>
              <p>
                Memberships are strictly personal and non-transferable. Access validity begins on
                the confirmed start date upon payment approval and expires automatically at the end
                of the selected plan duration.
              </p>
              <p>
                Muscle Arena management reserves the right to pause or revoke access for unsafe
                conduct, equipment misuse, or fraudulent payment submissions (including duplicate or
                fabricated UTR entries).
              </p>
            </>
          )}

          {type === 'refund' && (
            <>
              <p>
                Membership fees paid via UPI, bank transfer, or at the Gopalmath reception desk are
                non-refundable once the membership has been activated and floor access has begun.
              </p>
              <p>
                In case of accidental duplicate payment or a rejected UPI verification where funds
                were debited, please present your bank statement and Order ID at the front desk or
                email <span className="text-white">{settings.email}</span> within 7 working days for
                reconciliation.
              </p>
              <p>
                Medical freeze requests for Quarterly or Yearly plans may be considered on a
                case-by-case basis by Owner {settings.owner_name} upon valid documentation.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

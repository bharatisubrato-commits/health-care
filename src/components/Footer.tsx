import React, { useState } from 'react';
import { ArrowRight, ArrowUp, Instagram, Facebook, Youtube, Mail, MapPin, Phone, Clock } from 'lucide-react';
import { PublicSettings } from '../types';
import { api, validateEmail, validateIndianMobile } from '../lib/api';
import { useToast } from './Toast';

interface FooterProps {
  settings: PublicSettings;
  onNavigate: (path: string) => void;
}

export function Footer({ settings, onNavigate }: FooterProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      showToast('Please enter your name for the free trial.', 'error');
      return;
    }
    if (!validateIndianMobile(phone)) {
      showToast('Enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }
    if (!validateEmail(email)) {
      showToast('Enter a valid email address.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>('/api/enquiries', {
        name: name.trim(),
        phone: phone.replace(/\D/g, '').slice(-10),
        email: email.trim(),
        source: 'free_trial',
        message: 'Requested 1-day free trial pass from footer form.',
      });
      showToast(res.message, 'success');
      setName('');
      setPhone('');
      setEmail('');
    } catch (err: any) {
      showToast(err.message || 'Could not submit free trial request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-white/10 bg-[#09090B] text-zinc-300">
      {/* Free Trial Bar matching reference newsletter bar */}
      <div className="border-b border-white/10 bg-[#0E0E12]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-white/15 bg-white/5 text-[#B4F000]">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-2xl tracking-wide text-white">
                CLAIM YOUR FREE TRIAL SESSION
              </h3>
              <p className="text-sm text-zinc-400">
                Experience the Gopalmath floor first. Drop your details for a 1-day pass.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleTrialSubmit}
            className="grid w-full grid-cols-1 gap-2 sm:grid-cols-4 lg:max-w-2xl"
          >
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Full Name for Free Trial"
              className="min-h-[44px] rounded-sm border border-white/15 bg-[#141418] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
            />
            <input
              type="tel"
              placeholder="10-digit Mobile"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-label="10-digit Indian Mobile Number"
              className="min-h-[44px] rounded-sm border border-white/15 bg-[#141418] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email Address"
              className="min-h-[44px] rounded-sm border border-white/15 bg-[#141418] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm bg-[#B4F000] px-4 text-xs font-bold uppercase tracking-wider text-[#09090B] transition-colors hover:bg-[#C9FF24] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <span>{submitting ? 'Sending...' : 'Book Trial'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Main 4-Column Footer */}
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <svg width="24" height="16" viewBox="0 0 26 18" fill="none" aria-hidden="true">
              <path
                d="M2 15L8.5 3H12.5L6 15H2ZM10 15L16.5 3H20.5L14 15H10ZM18 15L21.5 8.5H25L21.5 15H18Z"
                fill="#B4F000"
              />
            </svg>
            <span className="font-display text-2xl tracking-wider text-white">
              {settings.gym_name.toUpperCase()}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Durgapur’s dedicated strength, hypertrophy, and conditioning training floor founded by{' '}
            {settings.owner_name}.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href={settings.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Muscle Arena Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 text-zinc-300 transition-colors hover:border-[#B4F000] hover:text-[#B4F000]"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={settings.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Muscle Arena Facebook"
              className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 text-zinc-300 transition-colors hover:border-[#B4F000] hover:text-[#B4F000]"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href={settings.youtube}
              target="_blank"
              rel="noreferrer"
              aria-label="Muscle Arena YouTube"
              className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 text-zinc-300 transition-colors hover:border-[#B4F000] hover:text-[#B4F000]"
            >
              <Youtube className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white">Quick Links</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
            <li>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/');
                }}
                className="hover:text-[#B4F000] transition-colors"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/about');
                }}
                className="hover:text-[#B4F000] transition-colors"
              >
                About Us
              </a>
            </li>
            <li>
              <a
                href="/plans"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/plans');
                }}
                className="hover:text-[#B4F000] transition-colors"
              >
                Membership Plans
              </a>
            </li>
            <li>
              <a
                href="/join"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/join');
                }}
                className="hover:text-[#B4F000] transition-colors"
              >
                Join Online
              </a>
            </li>
            <li>
              <a
                href="/status"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/status');
                }}
                className="hover:text-[#B4F000] transition-colors"
              >
                Check Order / Receipt
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white">Programs</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
            <li>Strength &amp; Powerlifting</li>
            <li>Hypertrophy Bodybuilding</li>
            <li>HIIT &amp; Athletic Conditioning</li>
            <li>90-Day Transformation Coaching</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white">Contact &amp; Hours</h4>
          <ul className="mt-4 space-y-3 text-sm text-zinc-400">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B4F000]" />
              <span>{settings.address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-[#B4F000]" />
              <a href={`tel:+91${settings.phone}`} className="hover:text-white font-mono-num">
                +91 {settings.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-[#B4F000]" />
              <a href={`mailto:${settings.email}`} className="hover:text-white">
                {settings.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#B4F000]" />
              <div>
                <div>Mon–Sat: {settings.timings_mon_sat}</div>
                <div>Sun: {settings.timings_sun}</div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-zinc-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 Muscle Arena. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/privacy');
              }}
              className="hover:text-zinc-200 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/terms');
              }}
              className="hover:text-zinc-200 transition-colors"
            >
              Terms &amp; Conditions
            </a>
            <a
              href="/refund"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/refund');
              }}
              className="hover:text-zinc-200 transition-colors"
            >
              Refund Policy
            </a>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-3 py-1.5 text-zinc-300 transition-colors hover:border-[#B4F000] hover:text-[#B4F000] cursor-pointer"
              aria-label="Back to top"
            >
              <span>Back to Top</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

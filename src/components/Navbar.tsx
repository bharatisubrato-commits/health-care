import React, { useState } from 'react';
import { Menu, Shield, X } from 'lucide-react';
import { trackCtaEvent } from '../lib/api';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  gymName?: string;
}

export function Navbar({ currentPath, onNavigate, gymName = 'MUSCLE ARENA' }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Plans', path: '/plans' },
    { label: 'Contact', path: '/#contact' },
  ];

  const handleLink = (path: string) => {
    setMobileOpen(false);
    if (path === '/#contact') {
      if (currentPath !== '/') {
        onNavigate('/');
        setTimeout(() => {
          document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      } else {
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#09090B]/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleLink('/');
          }}
          className="flex items-center gap-2 whitespace-nowrap shrink-0 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4F000]"
        >
          <svg
            width="26"
            height="18"
            viewBox="0 0 26 18"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M2 15L8.5 3H12.5L6 15H2ZM10 15L16.5 3H20.5L14 15H10ZM18 15L21.5 8.5H25L21.5 15H18Z"
              fill="#B4F000"
            />
          </svg>
          <span className="font-display text-2xl tracking-wider text-white">
            {gymName.toUpperCase()}
          </span>
        </a>

        {/* Zone 2: 4 Single-line Nav Links */}
        <nav aria-label="Primary navigation" className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? currentPath === '/'
                : item.path.startsWith('/#')
                ? false
                : currentPath === item.path;
            return (
              <a
                key={item.label}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleLink(item.path);
                }}
                className={`whitespace-nowrap shrink-0 text-sm font-medium tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4F000] ${
                  isActive
                    ? 'text-[#B4F000] underline decoration-[#B4F000] underline-offset-8'
                    : 'text-zinc-300 hover:text-white hover:underline hover:decoration-white/40 hover:underline-offset-8'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Admin Panel + Primary CTA + Mobile Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleLink('/admin')}
            className="hidden sm:inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-sm border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-200 transition-colors duration-150 hover:border-[#B4F000] hover:text-[#B4F000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4F000] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Admin Panel</span>
          </button>
          <button
            type="button"
            onClick={() => {
              trackCtaEvent('join_now', 'Join Now (Navbar)', currentPath);
              handleLink('/join?source=join_now');
            }}
            className="hidden sm:inline-flex min-h-[40px] items-center justify-center rounded-sm bg-[#B4F000] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#09090B] transition-colors duration-150 hover:bg-[#C9FF24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4F000] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Join Now
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-white/10 text-zinc-200 hover:border-white/25 hover:text-white md:hidden"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0D0D10] px-4 py-4 md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleLink(item.path);
                }}
                className="flex min-h-[44px] items-center px-3 text-base font-medium text-zinc-200 hover:bg-white/5 hover:text-[#B4F000]"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                trackCtaEvent('join_now', 'Join Now (Mobile Menu)', currentPath);
                handleLink('/join?source=join_now');
              }}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-sm bg-[#B4F000] px-5 py-3 text-sm font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24]"
            >
              Join Now
            </button>
            <button
              type="button"
              onClick={() => handleLink('/admin')}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-sm border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-zinc-200 hover:border-[#B4F000] hover:text-[#B4F000]"
            >
              <Shield className="h-4 w-4" />
              <span>Admin Panel</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

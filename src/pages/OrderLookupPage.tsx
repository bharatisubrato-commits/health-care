import React, { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';

interface OrderLookupPageProps {
  onNavigate: (path: string) => void;
}

export function OrderLookupPage({ onNavigate }: OrderLookupPageProps) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = query.trim().toUpperCase();
    if (!cleaned) {
      showToast('Enter your Order ID (e.g. ORD-BB-...) or Member ID (e.g. BB-2026-...).', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<{ orderId: string }>(
        `/api/orders/lookup?query=${encodeURIComponent(cleaned)}`
      );
      onNavigate(`/payment/${encodeURIComponent(res.orderId)}`);
    } catch (err: any) {
      showToast(err.message || 'No matching order or member ID found.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#09090B] py-20">
      <div className="mx-auto max-w-[600px] px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4F000]">
          Member Self-Service
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-white">
          CHECK ORDER &amp; RECEIPT
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Enter your Order ID (e.g. <span className="font-mono-num text-zinc-200">ORD-BB-A1B2C3</span>)
          or Member ID (e.g. <span className="font-mono-num text-zinc-200">BB-2026-1001</span>) to
          check UPI verification status or download your PDF membership receipt.
        </p>

        <form
          onSubmit={handleLookup}
          className="mt-8 space-y-4 rounded-sm border border-white/10 bg-[#111114] p-6"
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ORD-BB-XXXXXX or BB-2026-XXXX"
              aria-label="Order ID or Member ID"
              className="min-h-[46px] w-full rounded-sm border border-white/15 bg-[#09090B] pl-10 pr-4 font-mono-num text-sm uppercase text-white placeholder:normal-case placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-sm bg-[#B4F000] text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] disabled:opacity-60 cursor-pointer"
          >
            <span>{loading ? 'Searching...' : 'View Status & Receipt'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </main>
  );
}

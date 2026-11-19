import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Upload,
  Building2,
  Smartphone,
} from 'lucide-react';
import { OrderDetailsResponse, PublicSettings } from '../types';
import { api, formatDuration, formatINR, resolveApiUrl, validateUtr } from '../lib/api';
import { downloadMembershipReceiptPdf, ReceiptData } from '../lib/pdfReceipt';
import { useToast } from '../components/Toast';

interface PaymentPageProps {
  orderId: string;
  settings: PublicSettings;
  onNavigate: (path: string) => void;
}

export function PaymentPage({ orderId, settings, onNavigate }: PaymentPageProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<OrderDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<OrderDetailsResponse>(`/api/orders/${encodeURIComponent(orderId)}`);
      setData(res);
      if (res.order.utr) setUtr(res.order.utr);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not load order details.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard.`, 'info');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Only JPG, PNG, or WEBP screenshots are supported.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Screenshot must be under 5MB.', 'error');
      return;
    }
    setScreenshot(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedUtr = utr.replace(/\s+/g, '');
    if (!validateUtr(cleanedUtr)) {
      showToast('Please enter a valid 12-digit numeric UTR number.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('payment_method', 'upi');
      formData.append('utr', cleanedUtr);
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }
      const res = await api.post<{ message: string }>(
        `/api/orders/${encodeURIComponent(orderId)}/submit-payment`,
        formData
      );
      showToast(res.message, 'success');
      await loadOrder();
    } catch (err: any) {
      showToast(err.message || 'Could not submit UTR.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayAtGym = async () => {
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>(
        `/api/orders/${encodeURIComponent(orderId)}/submit-payment`,
        { payment_method: 'pay_at_gym' }
      );
      showToast(res.message, 'info');
      await loadOrder();
    } catch (err: any) {
      showToast(err.message || 'Could not update payment option.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      const res = await api.get<{ receipt: ReceiptData; gym: PublicSettings }>(
        `/api/orders/${encodeURIComponent(orderId)}/receipt`
      );
      downloadMembershipReceiptPdf(res.receipt, res.gym || settings);
      showToast('PDF receipt downloaded.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not download receipt.', 'error');
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-[960px] px-4 py-20 text-center text-zinc-400">
        Loading payment &amp; order details...
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-[720px] px-4 py-20 text-center">
        <h1 className="font-display text-4xl text-white">ORDER NOT FOUND</h1>
        <p className="mt-2 text-sm text-zinc-400">{error || 'Invalid order reference.'}</p>
        <button
          type="button"
          onClick={() => onNavigate('/plans')}
          className="mt-6 rounded-sm bg-[#B4F000] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#09090B]"
        >
          Back to Plans
        </button>
      </main>
    );
  }

  const { order, paymentDetails } = data;
  const isApproved = order.payment_status === 'approved';
  const isRejected = order.payment_status === 'rejected';
  const isPendingVerification =
    order.payment_status === 'pending_verification' ||
    order.payment_status === 'pending_gym_payment';
  const showPaymentForm = order.payment_status === 'awaiting_payment' || isRejected;

  return (
    <main className="bg-[#09090B] py-12 sm:py-16">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4F000]">
              Membership Checkout &amp; Verification
            </p>
            <h1 className="mt-2 font-display text-4xl tracking-wide text-white sm:text-5xl">
              ORDER {order.order_id}
            </h1>
          </div>
          <button
            type="button"
            onClick={loadOrder}
            className="inline-flex min-h-[40px] items-center gap-2 self-start rounded-sm border border-white/15 bg-[#111114] px-4 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:border-[#B4F000] hover:text-[#B4F000] cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Status</span>
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left: Order & Member Summary */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-sm border border-white/10 bg-[#111114] p-6">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Order Summary
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-400">Member ID</span>
                  <span className="font-mono-num font-semibold text-white">
                    {order.member_code}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-400">Member Name</span>
                  <span className="font-medium text-white">{order.member_name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-400">Mobile</span>
                  <span className="font-mono-num text-zinc-200">+91 {order.phone}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-400">Plan</span>
                  <span className="font-medium text-white">
                    {order.plan_name} ({formatDuration(order.duration_value, order.duration_unit)})
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-400">Start Date</span>
                  <span className="font-mono-num text-zinc-200">{order.start_date}</span>
                </div>
                {order.expiry_date && (
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-400">Expiry Date</span>
                    <span className="font-mono-num font-semibold text-[#B4F000]">
                      {order.expiry_date}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Total Payable
                  </span>
                  <span className="font-mono-num text-2xl font-bold text-white">
                    {formatINR(order.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Backup Bank Transfer Details (shown ONLY on payment page) */}
            {showPaymentForm && (
              <div className="rounded-sm border border-white/10 bg-[#111114] p-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-300">
                  <Building2 className="h-4 w-4 text-[#B4F000]" />
                  <span>Backup Bank Transfer (NEFT / IMPS)</span>
                </div>
                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-400">Account Holder</span>
                    <span className="text-white">{paymentDetails.bank.accountName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-400">Account Number</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(paymentDetails.bank.accountNumber, 'Account number')
                      }
                      className="inline-flex items-center gap-1.5 font-mono-num text-white hover:text-[#B4F000] cursor-pointer"
                    >
                      <span>{paymentDetails.bank.accountNumber}</span>
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-400">Bank</span>
                    <span className="text-zinc-200">
                      {paymentDetails.bank.bankName} ({paymentDetails.bank.branch})
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-400">IFSC Code</span>
                    <button
                      type="button"
                      onClick={() => copyText(paymentDetails.bank.ifsc, 'IFSC code')}
                      className="inline-flex items-center gap-1.5 font-mono-num text-white hover:text-[#B4F000] cursor-pointer"
                    >
                      <span>{paymentDetails.bank.ifsc}</span>
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Status Screen or UPI Payment + UTR Submission */}
          <div className="lg:col-span-7">
            {isApproved && (
              <div className="rounded-sm border border-emerald-500/40 bg-[#101814] p-8">
                <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 className="h-7 w-7 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Payment Approved · Membership Active
                  </span>
                </div>
                <h2 className="mt-4 font-display text-4xl tracking-wide text-white">
                  WELCOME TO MUSCLE ARENA, {order.member_name.toUpperCase()}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  Your membership ({order.member_code}) is now Active through{' '}
                  <span className="font-mono-num font-semibold text-white">
                    {order.expiry_date}
                  </span>
                  . Download your verified PDF receipt below and present your Member ID at the gym
                  desk.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadReceipt}
                    className="inline-flex min-h-[46px] items-center gap-2 rounded-sm bg-[#B4F000] px-6 text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download PDF Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('/')}
                    className="inline-flex min-h-[46px] items-center gap-2 rounded-sm border border-white/20 px-6 text-xs font-semibold uppercase tracking-wider text-white hover:border-white/40 cursor-pointer"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            )}

            {isPendingVerification && (
              <div className="rounded-sm border border-amber-500/40 bg-[#18140E] p-8">
                <div className="flex items-center gap-3 text-amber-400">
                  <Clock className="h-7 w-7 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {order.payment_status === 'pending_gym_payment'
                      ? 'Pending Gym Desk Payment'
                      : 'Submitted · Pending Verification'}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-4xl tracking-wide text-white">
                  {order.payment_status === 'pending_gym_payment'
                    ? 'PAY AT GYM FRONT DESK TO ACTIVATE'
                    : 'PAYMENT SUBMITTED FOR VERIFICATION'}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {order.payment_status === 'pending_gym_payment' ? (
                    <>
                      Your membership (<span className="font-mono-num">{order.member_code}</span>) is
                      reserved as <strong>Pending</strong>. Please pay{' '}
                      <span className="font-mono-num">{formatINR(order.amount)}</span> at the Muscle
                      Arena Gopalmath reception desk to activate your access.
                    </>
                  ) : (
                    <>
                      Thank you! Your UTR{' '}
                      <span className="font-mono-num font-semibold text-white">{order.utr}</span> has
                      been recorded. Your membership will become <strong>Active</strong> immediately
                      after admin verification.
                    </>
                  )}
                </p>

                {order.screenshot_path && (
                  <div className="mt-5">
                    <div className="mb-2 text-xs uppercase tracking-wider text-zinc-400">
                      Uploaded Payment Screenshot
                    </div>
                    <img
                      src={resolveApiUrl(order.screenshot_path)}
                      alt="Uploaded UPI screenshot"
                      className="max-h-48 rounded-sm border border-white/10 object-contain"
                    />
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={loadOrder}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-sm bg-[#B4F000] px-5 text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Check Approval Status</span>
                  </button>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="mb-6 rounded-sm border border-red-500/40 bg-[#1B1012] p-6">
                <div className="flex items-center gap-2 text-red-400">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Payment Verification Rejected
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-200">
                  <strong>Reason:</strong> {order.rejection_reason || 'UTR could not be verified.'}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Please verify your 12-digit UTR number and resubmit below, or choose Pay at Gym.
                </p>
              </div>
            )}

            {showPaymentForm && (
              <div className="space-y-6 rounded-sm border border-white/10 bg-[#111114] p-6 sm:p-8">
                <div>
                  <h2 className="font-display text-3xl tracking-wide text-white">
                    SCAN &amp; PAY VIA UPI
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Scan the QR code with PhonePe, Google Pay, Paytm, or BHIM, then submit your
                    12-digit UTR below.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-6 rounded-sm border border-white/10 bg-[#0D0D10] p-6 sm:flex-row">
                  {paymentDetails.qrDataUrl && (
                    <div className="shrink-0 rounded-sm bg-white p-3">
                      <img
                        src={paymentDetails.qrDataUrl}
                        alt={`UPI QR Code for ${formatINR(order.amount)}`}
                        className="h-44 w-44"
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-zinc-400">UPI ID</div>
                      <button
                        type="button"
                        onClick={() => copyText(paymentDetails.upiId, 'UPI ID')}
                        className="mt-1 inline-flex items-center gap-2 font-mono-num text-base font-semibold text-white hover:text-[#B4F000] cursor-pointer"
                      >
                        <span>{paymentDetails.upiId}</span>
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Payee: <span className="text-zinc-200">{paymentDetails.upiName}</span> · Amount:{' '}
                      <span className="font-mono-num font-semibold text-white">
                        {formatINR(order.amount)}
                      </span>
                    </div>

                    <a
                      href={paymentDetails.upiDeepLink}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm bg-[#B4F000] px-5 text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24]"
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>Pay with UPI App</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* UTR Verification Form */}
                <form onSubmit={handleUtrSubmit} className="space-y-4 border-t border-white/10 pt-6">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      12-Digit UTR / Reference Number *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      value={utr}
                      onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="e.g. 431890234512"
                      className="min-h-[46px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3.5 font-mono-num text-base text-white placeholder:text-zinc-600 focus:border-[#B4F000] focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Duplicate UTR numbers are automatically blocked.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      Payment Screenshot (Optional · JPG/PNG/WEBP, max 5MB)
                    </label>
                    <label className="flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-sm border border-dashed border-white/20 bg-[#09090B] px-4 py-3 text-sm text-zinc-300 hover:border-[#B4F000]">
                      <span className="flex items-center gap-2 truncate">
                        <Upload className="h-4 w-4 shrink-0 text-[#B4F000]" />
                        <span className="truncate">
                          {screenshot ? screenshot.name : 'Choose UPI confirmation screenshot'}
                        </span>
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Screenshot preview"
                        className="mt-3 max-h-40 rounded-sm border border-white/10 object-contain"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-sm bg-[#B4F000] px-6 text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? 'Submitting...' : 'Submit UTR for Verification'}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handlePayAtGym}
                      className="inline-flex min-h-[46px] items-center justify-center rounded-sm border border-white/20 bg-white/5 px-5 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:border-white/40 cursor-pointer"
                    >
                      Pay at Gym Desk
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { Plan } from '../types';
import {
  api,
  formatDuration,
  formatINR,
  validateEmail,
  validateIndianMobile,
} from '../lib/api';
import { useToast } from '../components/Toast';

interface PlansJoinPageProps {
  plans: Plan[];
  initialPlanId?: number | null;
  initialSourceCta?: string;
  mode: 'plans' | 'join';
  onNavigate: (path: string) => void;
}

export function PlansJoinPage({
  plans,
  initialPlanId,
  initialSourceCta = 'direct',
  mode,
  onNavigate,
}: PlansJoinPageProps) {
  const { showToast } = useToast();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [selectedPlanId, setSelectedPlanId] = useState<number>(
    initialPlanId || plans.find((p) => p.is_popular)?.id || plans[0]?.id || 0
  );

  useEffect(() => {
    if (initialPlanId && plans.some((p) => p.id === initialPlanId)) {
      setSelectedPlanId(initialPlanId);
    } else if (!selectedPlanId && plans.length > 0) {
      setSelectedPlanId(plans.find((p) => p.is_popular)?.id || plans[0].id);
    }
  }, [initialPlanId, plans, selectedPlanId]);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Male',
    dob: '1999-01-01',
    address: '',
    emergency_contact: '',
    fitness_goal: 'Strength & Muscle Gain',
    start_date: todayStr,
    terms_accepted: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handlePlanSelect = (planId: number) => {
    setSelectedPlanId(planId);
    document.getElementById('membership-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      nextErrors.name = 'Enter your full name.';
    }
    if (!validateIndianMobile(form.phone)) {
      nextErrors.phone = 'Enter a valid 10-digit Indian mobile number (starts with 6-9).';
    }
    if (!validateEmail(form.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!form.dob) {
      nextErrors.dob = 'Select your date of birth.';
    }
    if (!form.address.trim() || form.address.trim().length < 5) {
      nextErrors.address = 'Enter your residential address.';
    }
    if (!validateIndianMobile(form.emergency_contact)) {
      nextErrors.emergency_contact = 'Enter a valid 10-digit emergency contact mobile number.';
    }
    if (!form.start_date) {
      nextErrors.start_date = 'Select your preferred start date.';
    }
    if (!selectedPlanId) {
      nextErrors.plan_id = 'Please select a membership plan.';
    }
    if (!form.terms_accepted) {
      nextErrors.terms_accepted = 'Please accept the Terms & Conditions to proceed.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fix the highlighted fields before continuing.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ orderId: string; memberCode: string }>(
        '/api/memberships/register',
        {
          ...form,
          phone: form.phone.replace(/\D/g, '').slice(-10),
          emergency_contact: form.emergency_contact.replace(/\D/g, '').slice(-10),
          plan_id: selectedPlanId,
          source_cta: initialSourceCta,
        }
      );
      showToast(`Order ${res.orderId} created. Proceed to payment.`, 'success');
      onNavigate(`/payment/${res.orderId}`);
    } catch (err: any) {
      showToast(err.message || 'Could not create membership order.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-[#09090B] py-14 sm:py-20">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4F000]">
            {mode === 'plans' ? 'Plans & Pricing' : 'Online Enrollment'}
          </p>
          <h1 className="mt-2 font-display text-5xl tracking-wide text-white sm:text-6xl">
            CHOOSE YOUR PLAN &amp; JOIN
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Select a plan below, complete your member registration form, and pay via UPI or at the
            Gopalmath front desk.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-sm border p-6 transition-colors ${
                  isSelected
                    ? 'border-[#B4F000] bg-[#141518] ring-1 ring-[#B4F000]/40'
                    : 'border-white/10 bg-[#111114] hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                      {formatDuration(plan.duration_value, plan.duration_unit)}
                    </span>
                    {plan.is_popular && (
                      <span className="text-xs font-bold uppercase tracking-widest text-[#B4F000]">
                        Most Popular
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 font-display text-3xl tracking-wide text-white">
                    {plan.name}
                  </h2>
                  <div className="mt-3 font-mono-num text-3xl font-bold text-white">
                    {formatINR(plan.price)}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">{plan.description}</p>

                  <ul className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-zinc-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B4F000]" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`mt-6 inline-flex min-h-[42px] w-full items-center justify-center rounded-sm px-4 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#B4F000] text-[#09090B]'
                      : 'border border-white/20 bg-white/5 text-white hover:border-[#B4F000] hover:text-[#B4F000]'
                  }`}
                >
                  {isSelected ? 'Selected Plan' : 'Choose Plan'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Membership Registration Form */}
        <section
          id="membership-form"
          className="mt-16 grid grid-cols-1 gap-8 border-t border-white/10 pt-14 lg:grid-cols-12"
        >
          <div className="lg:col-span-8">
            <h2 className="font-display text-4xl tracking-wide text-white">
              MEMBER REGISTRATION FORM
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              All fields are validated before generating your UPI Order ID and Member ID.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Anirudh Roy"
                    className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Mobile Number (10-digit Indian) *
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="9832100000"
                    className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Gender *
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                    className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
                    className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                  />
                  {errors.dob && <p className="mt-1 text-xs text-red-400">{errors.dob}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Full Residential Address *
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="House/Street, Locality, Durgapur, PIN"
                  className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
                />
                {errors.address && <p className="mt-1 text-xs text-red-400">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Emergency Contact Mobile *
                  </label>
                  <input
                    type="tel"
                    value={form.emergency_contact}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, emergency_contact: e.target.value }))
                    }
                    placeholder="9832100001"
                    className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
                  />
                  {errors.emergency_contact && (
                    <p className="mt-1 text-xs text-red-400">{errors.emergency_contact}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Primary Fitness Goal *
                  </label>
                  <select
                    value={form.fitness_goal}
                    onChange={(e) => setForm((p) => ({ ...p, fitness_goal: e.target.value }))}
                    className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                  >
                    <option value="Strength & Muscle Gain">Strength &amp; Muscle Gain</option>
                    <option value="Fat Loss & Recomposition">Fat Loss &amp; Recomposition</option>
                    <option value="Powerlifting & Performance">Powerlifting &amp; Performance</option>
                    <option value="General Fitness & Mobility">General Fitness &amp; Mobility</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Selected Plan *
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                    className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatINR(p.price)} (
                        {formatDuration(p.duration_value, p.duration_unit)})
                      </option>
                    ))}
                  </select>
                  {errors.plan_id && (
                    <p className="mt-1 text-xs text-red-400">{errors.plan_id}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Preferred Start Date *
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={form.start_date}
                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-xs text-red-400">{errors.start_date}</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 text-sm text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.terms_accepted}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, terms_accepted: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-white/20 accent-[#B4F000]"
                  />
                  <span>
                    I confirm my health readiness and agree to Muscle Arena’s{' '}
                    <a
                      href="/terms"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('/terms');
                      }}
                      className="text-[#B4F000] underline"
                    >
                      Terms &amp; Conditions
                    </a>{' '}
                    and{' '}
                    <a
                      href="/refund"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('/refund');
                      }}
                      className="text-[#B4F000] underline"
                    >
                      Refund Policy
                    </a>
                    .
                  </span>
                </label>
                {errors.terms_accepted && (
                  <p className="mt-1 text-xs text-red-400">{errors.terms_accepted}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-sm bg-[#B4F000] px-8 text-xs font-bold uppercase tracking-wider text-[#09090B] transition-colors hover:bg-[#C9FF24] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                <span>{submitting ? 'Creating Order...' : 'Proceed to Payment'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Sticky Order Summary Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded-sm border border-white/10 bg-[#111114] p-6">
              <div className="text-xs font-bold uppercase tracking-widest text-[#B4F000]">
                Enrollment Summary
              </div>
              {selectedPlan ? (
                <>
                  <h3 className="mt-3 font-display text-3xl tracking-wide text-white">
                    {selectedPlan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline justify-between border-y border-white/10 py-4">
                    <span className="text-sm text-zinc-400">
                      Duration: {formatDuration(selectedPlan.duration_value, selectedPlan.duration_unit)}
                    </span>
                    <span className="font-mono-num text-2xl font-bold text-white">
                      {formatINR(selectedPlan.price)}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2.5 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 text-zinc-200">
                      <ShieldCheck className="h-4 w-4 text-[#B4F000]" />
                      <span>Dynamic UPI QR &amp; Bank Transfer</span>
                    </div>
                    <p>
                      After submitting your 12-digit UTR (or choosing Pay at Gym), our team verifies
                      and activates your membership with an instant PDF receipt.
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-zinc-400">Select a plan to view summary.</p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

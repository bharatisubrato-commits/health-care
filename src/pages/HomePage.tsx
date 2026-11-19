import React, { useState } from 'react';
import {
  ArrowRight,
  Dumbbell,
  Flame,
  Zap,
  ShieldCheck,
  Target,
  Activity,
  HeartPulse,
  ChevronDown,
  MapPin,
  Phone,
  Clock,
  Check,
  Award,
} from 'lucide-react';
import { Plan, PublicSettings } from '../types';
import { GYM_IMAGES, TRAINERS, TESTIMONIALS, FAQS } from '../data/gymContent';
import { AnimatedCounter } from '../components/AnimatedCounter';
import {
  api,
  formatDuration,
  formatINR,
  trackCtaEvent,
  validateEmail,
  validateIndianMobile,
} from '../lib/api';
import { useToast } from '../components/Toast';

interface HomePageProps {
  settings: PublicSettings;
  plans: Plan[];
  onNavigate: (path: string) => void;
}

export function HomePage({ settings, plans, onNavigate }: HomePageProps) {
  const { showToast } = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [sendingContact, setSendingContact] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || contactForm.name.trim().length < 2) {
      showToast('Please enter your full name.', 'error');
      return;
    }
    if (!validateIndianMobile(contactForm.phone)) {
      showToast('Please enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }
    if (!validateEmail(contactForm.email)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    if (!contactForm.message.trim()) {
      showToast('Please enter a short message or question.', 'error');
      return;
    }

    setSendingContact(true);
    try {
      const res = await api.post<{ message: string }>('/api/enquiries', {
        ...contactForm,
        phone: contactForm.phone.replace(/\D/g, '').slice(-10),
        source: 'contact',
      });
      showToast(res.message, 'success');
      setContactForm({ name: '', phone: '', email: '', message: '' });
    } catch (err: any) {
      showToast(err.message || 'Could not send message.', 'error');
    } finally {
      setSendingContact(false);
    }
  };

  const categoryCircles = [
    { label: 'Strength', icon: Dumbbell },
    { label: 'Hypertrophy', icon: Flame },
    { label: 'HIIT Turf', icon: Zap },
    { label: 'Coaching', icon: Target },
    { label: 'Recovery', icon: HeartPulse },
  ];

  const showcasePrograms = [
    {
      title: 'STRENGTH & POWER',
      subtitle: 'Barbell squats, deadlifts, and calibrated progressive overload.',
      cta: 'Explore Plans',
      image: GYM_IMAGES.strength,
      action: () => onNavigate('/plans'),
    },
    {
      title: 'HIIT & CONDITIONING',
      subtitle: 'Battle ropes, sled pushes, and high-output metabolic blocks.',
      cta: 'Join a Batch',
      image: GYM_IMAGES.conditioning,
      action: () => onNavigate('/join'),
    },
    {
      title: 'CALIBRATED FLOOR',
      subtitle: 'Uncluttered racks, turf lane, and disciplined training culture.',
      cta: 'About Our Gym',
      image: GYM_IMAGES.floor,
      action: () => onNavigate('/about'),
    },
  ];

  const galleryShots = [
    { src: GYM_IMAGES.hero, alt: 'Muscle Arena barbell deadlift platform' },
    { src: GYM_IMAGES.strength, alt: 'Loading Olympic plates at Muscle Arena' },
    { src: GYM_IMAGES.conditioning, alt: 'Battle ropes conditioning zone' },
    { src: GYM_IMAGES.floor, alt: 'Muscle Arena squat racks and turf track' },
    { src: GYM_IMAGES.midbanner, alt: 'Focused athlete resting between sets' },
  ];

  return (
    <main>
      {/* 1. FULL-SCREEN HERO */}
      <section className="relative flex min-h-[82vh] items-center overflow-hidden border-b border-white/10 bg-[#09090B]">
        <img
          src={GYM_IMAGES.hero}
          alt="Athletes training with barbells and dumbbells at Muscle Arena Durgapur"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#09090B]/95 via-[#09090B]/70 to-[#09090B]/25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-[#09090B]/40"
        />

        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
              Gopalmath, Durgapur · Est. by {settings.owner_name}
            </p>
            <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-wide text-white sm:text-7xl lg:text-8xl [text-wrap:balance]">
              {settings.hero_headline}
            </h1>
            <div className="mt-5 h-1 w-14 bg-[#B4F000]" aria-hidden="true" />
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-200 sm:text-lg">
              {settings.hero_subtext}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  trackCtaEvent('join_now', 'Join Now (Hero)', '/');
                  onNavigate('/join?source=join_now');
                }}
                className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-sm bg-[#B4F000] px-7 py-3 text-sm font-bold uppercase tracking-wider text-[#09090B] transition-colors duration-150 hover:bg-[#C9FF24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4F000] cursor-pointer whitespace-nowrap"
              >
                <span>Join Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-sm border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors duration-150 hover:border-[#B4F000] hover:text-[#B4F000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4F000] cursor-pointer whitespace-nowrap"
              >
                <span>View Plans</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CIRCULAR PROGRAM PILLARS STRIP (Matching reference icon strip) */}
      <section className="border-b border-white/10 bg-[#09090B] py-10">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-center gap-6 px-4 sm:justify-between sm:px-6">
          {categoryCircles.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() =>
                  document.getElementById('programs-section')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="group flex flex-col items-center gap-2.5 focus-visible:outline-none cursor-pointer"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-[#111114] text-zinc-200 transition-colors duration-150 group-hover:border-[#B4F000] group-hover:text-[#B4F000]">
                  <Icon className="h-6 w-6 stroke-[1.5]" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 group-hover:text-white">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. 3-CARD PROGRAM SHOWCASE GRID */}
      <section id="programs-section" className="bg-[#09090B] py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {showcasePrograms.map((card) => (
              <div
                key={card.title}
                onClick={card.action}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') card.action();
                }}
                className="group relative flex min-h-[380px] cursor-pointer flex-col justify-end overflow-hidden rounded-sm border border-white/10 bg-[#111114]"
              >
                <img
                  src={card.image}
                  alt={card.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/15"
                />
                <div className="relative z-10 p-6">
                  <h2 className="font-display text-3xl tracking-wide text-white">{card.title}</h2>
                  <p className="mt-1.5 text-sm text-zinc-300">{card.subtitle}</p>
                  <div className="mt-4 inline-flex items-center gap-2 border-b border-white/30 pb-1 text-xs font-bold uppercase tracking-widest text-white transition-colors group-hover:border-[#B4F000] group-hover:text-[#B4F000]">
                    <span>{card.cta}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ANIMATED COUNTERS & FEATURE STRIP */}
      <section className="border-y border-white/10 bg-[#0D0D10] py-12">
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div className="flex items-start gap-4">
            <Activity className="mt-1 h-7 w-7 shrink-0 text-[#B4F000] stroke-[1.5]" />
            <div>
              <div className="text-3xl text-white sm:text-4xl">
                <AnimatedCounter target={1200} suffix="+" />
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Durgapur Members Trained
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Dumbbell className="mt-1 h-7 w-7 shrink-0 text-[#B4F000] stroke-[1.5]" />
            <div>
              <div className="text-3xl text-white sm:text-4xl">
                <AnimatedCounter target={12000} suffix=" sq ft" />
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Strength &amp; Turf Floor
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Award className="mt-1 h-7 w-7 shrink-0 text-[#B4F000] stroke-[1.5]" />
            <div>
              <div className="text-3xl text-white sm:text-4xl">
                <AnimatedCounter target={8} />
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Certified Floor Coaches
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Clock className="mt-1 h-7 w-7 shrink-0 text-[#B4F000] stroke-[1.5]" />
            <div>
              <div className="text-3xl text-white sm:text-4xl">
                <AnimatedCounter target={16.5} decimals={1} suffix=" hrs" />
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Daily Training Access
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FULL-WIDTH SPLIT MID-BANNER ("TRAIN. PERFORM. REPEAT.") */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#09090B]">
        <img
          src={GYM_IMAGES.midbanner}
          alt="Focused athlete inside Muscle Arena Durgapur"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#09090B]/95 via-[#09090B]/65 to-[#09090B]/90"
        />

        <div className="relative z-10 mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-6">
            <h2 className="font-display text-5xl leading-[0.95] text-white sm:text-6xl">
              TRAIN.
              <br />
              PERFORM.
              <br />
              REPEAT.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-300">
              Consistent coaching, calibrated weights, and honest accountability built for real
              transformations in Durgapur.
            </p>
            <button
              type="button"
              onClick={() => {
                trackCtaEvent('start_membership', 'Start Your Membership', '/');
                onNavigate('/join?source=start_membership');
              }}
              className="mt-7 inline-flex min-h-[46px] items-center gap-2.5 rounded-sm bg-[#B4F000] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#09090B] transition-colors hover:bg-[#C9FF24] cursor-pointer"
            >
              <span>Start Your Membership</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="lg:col-span-6 lg:flex lg:justify-end">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#B4F000]/40 bg-[#09090B]/70 text-[#B4F000]">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-2xl tracking-wide text-white">
                    ENERGY UNLEASHED
                  </h3>
                  <p className="text-sm text-zinc-300">Structured push-pull-legs &amp; strength splits</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#B4F000]/40 bg-[#09090B]/70 text-[#B4F000]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-2xl tracking-wide text-white">
                    FORM SUPERVISED
                  </h3>
                  <p className="text-sm text-zinc-300">Certified floor coaches on every shift</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#B4F000]/40 bg-[#09090B]/70 text-[#B4F000]">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-2xl tracking-wide text-white">
                    LIMITS LEFT BEHIND
                  </h3>
                  <p className="text-sm text-zinc-300">Weekly PR &amp; body composition check-ins</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. MEMBERSHIP PLANS (LIVE FROM DB) */}
      <section id="plans-section" className="border-b border-white/10 bg-[#09090B] py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4F000]">
                Transparent INR Pricing
              </p>
              <h2 className="mt-2 font-display text-4xl tracking-wide text-white sm:text-5xl">
                MEMBERSHIP PLANS
              </h2>
            </div>
            <p className="max-w-md text-sm text-zinc-400">
              No hidden registration surprises. Pay instantly via UPI or select Pay at Gym Front
              Desk during enrollment.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="mt-10 rounded-sm border border-white/10 bg-[#111114] p-8 text-center text-zinc-400">
              Loading active membership plans...
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex flex-col justify-between rounded-sm border bg-[#111114] p-6 transition-colors ${
                    plan.is_popular
                      ? 'border-[#B4F000] ring-1 ring-[#B4F000]/40'
                      : 'border-white/10 hover:border-white/25'
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

                    <h3 className="mt-3 font-display text-3xl tracking-wide text-white">
                      {plan.name}
                    </h3>

                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="font-mono-num text-3xl font-bold text-white">
                        {formatINR(plan.price)}
                      </span>
                      <span className="text-xs text-zinc-400">
                        / {formatDuration(plan.duration_value, plan.duration_unit)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                      {plan.description}
                    </p>

                    <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-sm text-zinc-300">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#B4F000]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate(`/join?plan=${plan.id}&source=select_plan`)}
                    className={`mt-8 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-sm px-4 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      plan.is_popular
                        ? 'bg-[#B4F000] text-[#09090B] hover:bg-[#C9FF24]'
                        : 'border border-white/20 bg-white/5 text-white hover:border-[#B4F000] hover:text-[#B4F000]'
                    }`}
                  >
                    <span>Select Plan</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. TRAINERS & TESTIMONIALS */}
      <section className="border-b border-white/10 bg-[#0D0D10] py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4F000]">
              Coaching &amp; Member Results
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-wide text-white sm:text-5xl">
              MEET OUR COACHES
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {TRAINERS.map((trainer) => (
              <div
                key={trainer.name}
                className="overflow-hidden rounded-sm border border-white/10 bg-[#111114]"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#18181C]">
                  <img
                    src={trainer.image}
                    alt={`${trainer.name} — ${trainer.role}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="p-6">
                  <div className="text-xs text-[#B4F000]">{trainer.role}</div>
                  <h3 className="mt-1 font-display text-2xl tracking-wide text-white">
                    {trainer.name}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">{trainer.experience}</p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">{trainer.bio}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonials adjacent to trainers */}
          <div className="mt-16 border-t border-white/10 pt-14">
            <h3 className="font-display text-3xl tracking-wide text-white">
              REAL RESULTS IN DURGAPUR
            </h3>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((item) => (
                <blockquote
                  key={item.name}
                  className="flex flex-col justify-between rounded-sm border border-white/10 bg-[#111114] p-6"
                >
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#B4F000]">
                      {item.outcome}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">“{item.quote}”</p>
                  </div>
                  <footer className="mt-5 border-t border-white/10 pt-4">
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <div className="text-xs text-zinc-400">{item.role}</div>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. GYM GALLERY STRIP (#MUSCLEARENA) */}
      <section className="border-b border-white/10 bg-[#09090B] py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="lg:w-64 shrink-0">
              <h2 className="font-display text-3xl tracking-wide text-white">#MUSCLEARENA</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Real iron. Real lifters. Gopalmath’s daily training floor.
              </p>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5">
              {galleryShots.map((shot, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-sm border border-white/10 bg-[#111114]"
                >
                  <img
                    src={shot.src}
                    alt={shot.alt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <section className="border-b border-white/10 bg-[#0D0D10] py-20">
        <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl tracking-wide text-white sm:text-5xl">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex min-h-[56px] w-full items-center justify-between gap-4 py-4 text-left text-base font-medium text-white hover:text-[#B4F000] cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-[#B4F000]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="pb-5 text-sm leading-relaxed text-zinc-400">{faq.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. CONTACT FORM + DURGAPUR MAP */}
      <section id="contact" className="bg-[#09090B] py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4F000]">
                Visit or Message Us
              </p>
              <h2 className="mt-2 font-display text-4xl tracking-wide text-white sm:text-5xl">
                GET IN TOUCH
              </h2>
              <p className="mt-3 text-sm text-zinc-400">
                Have questions about batch timings, personal training, or transformations? Send an
                enquiry directly to our front desk.
              </p>

              <form onSubmit={handleContactSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Rohan Chatterjee"
                    className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      Mobile Number (10-digit)
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactForm.phone}
                      onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="9832100000"
                      className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="min-h-[44px] w-full rounded-sm border border-white/15 bg-[#111114] px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us your fitness goal or preferred batch timing..."
                    className="w-full rounded-sm border border-white/15 bg-[#111114] p-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#B4F000] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingContact}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-sm bg-[#B4F000] px-7 text-xs font-bold uppercase tracking-wider text-[#09090B] transition-colors hover:bg-[#C9FF24] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <span>{sendingContact ? 'Sending Enquiry...' : 'Send Enquiry'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="flex flex-col gap-5 lg:col-span-6">
              <div className="overflow-hidden rounded-sm border border-white/10 bg-[#111114]">
                <iframe
                  title="Muscle Arena Durgapur Location Map"
                  src="https://maps.google.com/maps?q=Gopalmath%20Water%20Tank,%20Durgapur,%20West%20Bengal%20713217&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  className="h-80 w-full border-0 grayscale contrast-125 invert-[0.9] hue-rotate-180"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-sm border border-white/10 bg-[#111114] p-6 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#B4F000]" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Gym Address
                    </div>
                    <p className="mt-1 text-sm text-zinc-200">{settings.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#B4F000]" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Phone &amp; WhatsApp
                    </div>
                    <p className="mt-1 font-mono-num text-sm text-zinc-200">+91 {settings.phone}</p>
                    <p className="text-xs text-zinc-400">
                      Mon–Sat {settings.timings_mon_sat} · Sun {settings.timings_sun}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

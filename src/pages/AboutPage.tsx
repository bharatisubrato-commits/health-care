import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Dumbbell, Users } from 'lucide-react';
import { PublicSettings } from '../types';
import { FACILITIES, GYM_IMAGES, TRAINERS } from '../data/gymContent';

interface AboutPageProps {
  settings: PublicSettings;
  onNavigate: (path: string) => void;
}

export function AboutPage({ settings, onNavigate }: AboutPageProps) {
  return (
    <main className="bg-[#09090B]">
      {/* Page Hero */}
      <section className="border-b border-white/10 bg-[#0D0D10] py-16 sm:py-24">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4F000]">
              About {settings.gym_name}
            </p>
            <h1 className="mt-3 font-display text-5xl leading-[0.95] tracking-wide text-white sm:text-6xl">
              BUILT FOR SERIOUS PROGRESS IN DURGAPUR
            </h1>
            <div className="mt-5 h-1 w-14 bg-[#B4F000]" aria-hidden="true" />
            <p className="mt-6 text-base leading-relaxed text-zinc-300">{settings.about_story}</p>
            <div className="mt-6 rounded-sm border border-white/10 bg-[#111114] p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-[#B4F000]">
                Our Mission
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{settings.about_mission}</p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="aspect-[4/3] overflow-hidden rounded-sm border border-white/10 bg-[#111114]">
              <img
                src={GYM_IMAGES.floor}
                alt="Muscle Arena training floor near Gopalmath Water Tank, Durgapur"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="border-b border-white/10 py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl tracking-wide text-white">WHY CHOOSE MUSCLE ARENA</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-sm border border-white/10 bg-[#111114] p-6">
              <Dumbbell className="h-6 w-6 text-[#B4F000]" />
              <h3 className="mt-4 font-display text-2xl tracking-wide text-white">
                CALIBRATED HARDWARE
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Dedicated squat cages, competition benches, Olympic bars, and heavy dumbbells
                maintained weekly.
              </p>
            </div>
            <div className="rounded-sm border border-white/10 bg-[#111114] p-6">
              <ShieldCheck className="h-6 w-6 text-[#B4F000]" />
              <h3 className="mt-4 font-display text-2xl tracking-wide text-white">
                ACCOUNTABLE COACHING
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Led by {settings.owner_name}, our coaches correct technique early so you lift heavier
                safely.
              </p>
            </div>
            <div className="rounded-sm border border-white/10 bg-[#111114] p-6">
              <Users className="h-6 w-6 text-[#B4F000]" />
              <h3 className="mt-4 font-display text-2xl tracking-wide text-white">
                DISCIPLINED COMMUNITY
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Supportive morning and evening training environment welcoming beginners and seasoned
                lifters alike.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="border-b border-white/10 bg-[#0D0D10] py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl tracking-wide text-white">FACILITIES &amp; ZONES</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FACILITIES.map((fac) => (
              <div
                key={fac.title}
                className="flex items-start gap-4 rounded-sm border border-white/10 bg-[#111114] p-6"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#B4F000]" />
                <div>
                  <h3 className="font-display text-2xl tracking-wide text-white">{fac.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{fac.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trainers */}
      <section className="border-b border-white/10 py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl tracking-wide text-white">COACHING TEAM</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {TRAINERS.map((trainer) => (
              <div
                key={trainer.name}
                className="overflow-hidden rounded-sm border border-white/10 bg-[#111114]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#18181C]">
                  <img
                    src={trainer.image}
                    alt={trainer.name}
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
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <h2 className="font-display text-4xl tracking-wide text-white">
              READY TO START TRAINING?
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Choose a flexible INR plan and activate your membership online in 2 minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/plans')}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-sm bg-[#B4F000] px-7 text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] cursor-pointer whitespace-nowrap"
          >
            <span>Explore Plans</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </main>
  );
}

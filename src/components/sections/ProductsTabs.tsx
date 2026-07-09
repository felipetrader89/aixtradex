"use client";

import { useState } from "react";
import { GlowCard } from "@/components/brand/GlowCard";
import { IconCalendar, IconChartUp, IconRocket } from "@/components/brand/icons";
import { Link } from "@/i18n/navigation";

const ICONS = [IconCalendar, IconChartUp, IconRocket];

export type PlanCardData = {
  label: string;
  price: string;
  period: string;
  originalPrice?: string;
  badge?: string;
  note?: string;
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
};

type ConditionData = {
  tag: string;
  description: string;
  plans: PlanCardData[];
};

type Props = {
  tabs: { managed: string; license: string };
  managed: ConditionData & { performanceNote: string; riskNote: string };
  license: ConditionData & { requirementsNote: string };
};

function PlanCard({ plan, Icon }: { plan: PlanCardData; Icon: (typeof ICONS)[number] }) {
  return (
    <div className="flex flex-col gap-4">
      <GlowCard
        className={`flex flex-col items-center gap-2 text-center ${
          plan.highlight ? "!border-2 !border-brand-accent shadow-[0_0_40px_rgba(51,214,160,0.25)]" : ""
        }`}
      >
        <p className="font-display text-lg font-bold text-brand-accent">{plan.label}</p>
        {plan.badge && (
          <span className="rounded-full bg-brand-accent px-3 py-1 text-xs font-bold text-brand-bg">
            {plan.badge}
          </span>
        )}
        <p className="font-display text-3xl font-extrabold text-chrome">
          {plan.price}
          <span className="text-base font-medium text-brand-ink-dim"> {plan.period}</span>
        </p>
        {plan.originalPrice && (
          <p className="text-sm text-brand-ink-dim line-through">{plan.originalPrice}</p>
        )}
        {plan.note && <p className="mt-1 text-xs text-brand-ink-dim">{plan.note}</p>}
      </GlowCard>
      <Link
        href={plan.ctaHref}
        className="cta-neon flex items-center justify-center gap-2 rounded-full bg-brand-surface px-6 py-3 text-sm font-semibold text-brand-ink transition-colors duration-300 hover:text-brand-accent"
      >
        <Icon className="h-5 w-5" />
        {plan.ctaLabel}
      </Link>
    </div>
  );
}

export function ProductsTabs({ tabs, managed, license }: Props) {
  const [tab, setTab] = useState<"managed" | "license">("managed");
  const active = tab === "managed" ? managed : license;

  return (
    <section>
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTab("managed")}
          className={`rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors duration-200 ${
            tab === "managed"
              ? "bg-brand-accent text-brand-bg"
              : "border border-brand-hairline text-brand-ink-dim hover:border-brand-accent hover:text-brand-accent"
          }`}
        >
          {tabs.managed}
        </button>
        <button
          type="button"
          onClick={() => setTab("license")}
          className={`rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors duration-200 ${
            tab === "license"
              ? "bg-brand-accent text-brand-bg"
              : "border border-brand-hairline text-brand-ink-dim hover:border-brand-accent hover:text-brand-accent"
          }`}
        >
          {tabs.license}
        </button>
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-accent">
        {active.tag}
      </p>
      <p className="mb-8 max-w-2xl text-brand-ink-dim">{active.description}</p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-stretch">
        {active.plans.map((plan, i) => (
          <PlanCard key={plan.label} plan={plan} Icon={ICONS[i % ICONS.length]} />
        ))}
      </div>

      {tab === "managed" ? (
        <GlowCard className="text-sm">
          <p className="mb-1 font-semibold text-brand-ink">{managed.performanceNote}</p>
          <p className="text-brand-ink-dim">{managed.riskNote}</p>
        </GlowCard>
      ) : (
        <GlowCard className="text-sm">
          <p className="text-brand-ink-dim">{license.requirementsNote}</p>
        </GlowCard>
      )}
    </section>
  );
}

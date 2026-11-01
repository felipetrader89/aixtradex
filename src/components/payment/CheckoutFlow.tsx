"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { GlowCard } from "@/components/brand/GlowCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { Link } from "@/i18n/navigation";
import { siteConfig, paymentAddresses, partnerBrokers } from "@/lib/site-config";
import { PLAN_KEYS, PLAN_PATH, type PlanKey } from "@/lib/plans";

const STEPS = ["discount", "broker", "account", "payment"] as const;
type Step = (typeof STEPS)[number];
type BrokerSlug = (typeof partnerBrokers)[number]["slug"];

const METHODS = [
  { key: "binancePay", value: paymentAddresses.binancePayId },
  { key: "btc", value: paymentAddresses.btc },
  { key: "usdtTrc20", value: paymentAddresses.usdtTrc20 },
  { key: "usdtErc20", value: paymentAddresses.usdtErc20 },
  { key: "usdtBep20", value: paymentAddresses.usdtBep20 },
  { key: "usdc", value: paymentAddresses.usdc },
  { key: "ltc", value: paymentAddresses.ltc },
  { key: "eth", value: paymentAddresses.eth },
] as const;

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-brand-accent to-brand-accent-dark px-6 py-3 text-sm font-semibold text-brand-bg transition-[transform,filter] duration-200 hover:scale-[1.03] hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";
const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-brand-accent/40 px-6 py-3 text-sm font-semibold text-brand-ink transition-colors duration-200 hover:border-brand-accent hover:text-brand-accent";
const backBtn = "text-sm text-brand-ink-dim transition-colors hover:text-brand-accent";

export function CheckoutFlow({ initialPlan }: { initialPlan?: PlanKey }) {
  const t = useTranslations("Payment");
  const tFlow = useTranslations("Payment.flow");
  const tProducts = useTranslations("Products");

  const [plan, setPlan] = useState<PlanKey | undefined>(initialPlan);
  const [step, setStep] = useState<Step>("discount");
  const [wantsDiscount, setWantsDiscount] = useState(false);
  const [brokerSlug, setBrokerSlug] = useState<BrokerSlug | undefined>();
  const topRef = useRef<HTMLDivElement>(null);

  function goTo(next: Step) {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const broker = partnerBrokers.find((b) => b.slug === brokerSlug);
  const discountApplied = wantsDiscount && Boolean(broker);
  const planPath = plan ? PLAN_PATH[plan] : undefined;
  const planLabel = planPath ? tProducts(`${planPath}.label`) : "";
  const fullPrice = planPath ? tProducts(`${planPath}.price`) : "";
  const discount = planPath ? tProducts(`${planPath}.discount`) : "";
  const discountPrice = planPath ? tProducts(`${planPath}.discountPrice`) : "";
  const finalPrice = discountApplied ? discountPrice : fullPrice;
  const period = planPath ? tProducts(`${planPath}.period`) : "";

  const dmText = discountApplied
    ? t("dmMessageDiscount", { plan: planLabel, price: finalPrice, broker: broker!.name })
    : t("dmMessage", { plan: planLabel, price: finalPrice });
  const dmHref = `${siteConfig.telegramDmUrl}?text=${encodeURIComponent(dmText)}`;

  const visibleSteps: readonly Step[] = wantsDiscount ? STEPS : STEPS.filter((s) => s !== "broker");
  const currentIndex = visibleSteps.indexOf(step);

  return (
    <div ref={topRef} className="scroll-mt-24">
      {/* Plano selecionado */}
      <GlowCard className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
          {plan ? t("planLabel") : tFlow("choosePlan")}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          {PLAN_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlan(key)}
              className={
                plan === key
                  ? "rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-bg"
                  : "rounded-full border border-brand-hairline px-4 py-2 text-xs font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
              }
            >
              {tProducts(`${PLAN_PATH[key]}.label`)}
            </button>
          ))}
        </div>
        {plan && (
          <>
            <p className="mt-4 font-display text-3xl font-extrabold text-chrome">
              {discountApplied && (
                <span className="mr-2 text-lg font-medium text-brand-ink-dim line-through">
                  {fullPrice}
                </span>
              )}
              {finalPrice}
              <span className="text-sm font-medium text-brand-ink-dim"> {period}</span>
            </p>
            {discountApplied && (
              <p className="mt-1 text-xs font-semibold text-brand-accent">
                {tFlow("discountApplied", { discount, broker: broker!.name })}
              </p>
            )}
          </>
        )}
      </GlowCard>

      {plan && (
        <>
          {/* Indicador de etapas */}
          <ol className="mb-6 flex items-center justify-center gap-2 text-xs">
            {visibleSteps.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={
                    i <= currentIndex
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent font-bold text-brand-bg"
                      : "flex h-6 w-6 items-center justify-center rounded-full border border-brand-hairline font-bold text-brand-ink-dim"
                  }
                >
                  {i + 1}
                </span>
                <span className={i === currentIndex ? "font-semibold text-brand-ink" : "hidden text-brand-ink-dim sm:inline"}>
                  {tFlow(`steps.${s}`)}
                </span>
                {i < visibleSteps.length - 1 && <span className="h-px w-4 bg-brand-hairline sm:w-6" />}
              </li>
            ))}
          </ol>

          {step === "discount" && (
            <GlowCard className="text-center">
              <p className="text-4xl">🎁</p>
              <h2 className="mt-3 font-display text-2xl font-extrabold text-chrome">
                {tFlow("discount.title", { discount })}
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-brand-ink-dim">
                {tFlow("discount.body", { price: fullPrice, discountPrice })}
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  className={primaryBtn}
                  onClick={() => {
                    setWantsDiscount(true);
                    goTo("broker");
                  }}
                >
                  {tFlow("discount.yes", { discount })}
                </button>
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => {
                    setWantsDiscount(false);
                    setBrokerSlug(undefined);
                    goTo("account");
                  }}
                >
                  {tFlow("discount.no")}
                </button>
              </div>
            </GlowCard>
          )}

          {step === "broker" && (
            <GlowCard>
              <h2 className="text-center font-display text-xl font-bold text-chrome">
                {tFlow("broker.title")}
              </h2>
              <p className="mt-2 text-center text-sm text-brand-ink-dim">{tFlow("broker.body")}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {partnerBrokers.map((b) => (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => setBrokerSlug(b.slug)}
                    aria-pressed={brokerSlug === b.slug}
                    className={`flex h-20 items-center justify-center rounded-xl bg-white p-4 transition-transform duration-200 hover:scale-[1.03] ${
                      brokerSlug === b.slug ? "ring-4 ring-brand-accent" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={`/brokers/${b.slug}.png`}
                      alt={b.name}
                      width={140}
                      height={48}
                      unoptimized
                      className="h-auto max-h-10 w-auto object-contain"
                    />
                  </button>
                ))}
              </div>

              {broker && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-brand-surface-2 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                      {tFlow("broker.newTitle")}
                    </p>
                    <p className="mt-2 text-sm text-brand-ink-dim">
                      {tFlow("broker.newBody", { broker: broker.name })}
                    </p>
                    <a
                      href={broker.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${primaryBtn} mt-4 w-full`}
                    >
                      {tFlow("broker.newCta", { broker: broker.name })} ↗
                    </a>
                    <p className="mt-2 text-center text-[11px] text-brand-ink-dim">{tFlow("broker.newTab")}</p>
                  </div>
                  <div className="rounded-xl bg-brand-surface-2 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                      {tFlow("broker.switchTitle")}
                    </p>
                    <p className="mt-2 text-sm text-brand-ink-dim">
                      {tFlow("broker.switchBody", { broker: broker.name })}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-brand-accent/40 bg-brand-bg px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-brand-ink-dim">
                          {tFlow("broker.ibLabel", { broker: broker.name })}
                        </p>
                        <p className="break-all font-mono text-base font-bold text-brand-accent">{broker.ibCode}</p>
                      </div>
                      <CopyButton value={broker.ibCode} label={t("copy")} copiedLabel={t("copied")} />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" className={backBtn} onClick={() => goTo("discount")}>
                  {tFlow("back")}
                </button>
                <button type="button" className={primaryBtn} disabled={!broker} onClick={() => goTo("account")}>
                  {tFlow("broker.next")}
                </button>
              </div>
            </GlowCard>
          )}

          {step === "account" && (
            <GlowCard>
              <h2 className="text-center font-display text-xl font-bold text-chrome">
                {tFlow("account.title")}
              </h2>
              <p className="mt-2 text-center text-sm text-brand-ink-dim">
                {discountApplied
                  ? tFlow("account.bodyBroker", { broker: broker!.name })
                  : tFlow("account.body")}
              </p>
              <dl className="mx-auto mt-5 grid max-w-md gap-3">
                {(["platform", "leverage", "deposit", "type"] as const).map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 border-b border-brand-hairline pb-3 text-sm last:border-none last:pb-0"
                  >
                    <dt className="text-brand-ink-dim">{tFlow(`account.${key}`)}</dt>
                    <dd className="font-mono font-semibold text-brand-accent">{tFlow(`account.${key}Value`)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mx-auto mt-5 max-w-md rounded-lg bg-brand-surface-2 p-3 text-xs text-brand-ink-dim">
                💡 {tFlow("account.note")}
              </p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className={backBtn}
                  onClick={() => goTo(wantsDiscount ? "broker" : "discount")}
                >
                  {tFlow("back")}
                </button>
                <button type="button" className={primaryBtn} onClick={() => goTo("payment")}>
                  {tFlow("account.next")}
                </button>
              </div>
            </GlowCard>
          )}

          {step === "payment" && (
            <div>
              <GlowCard className="mb-4 text-center">
                <h2 className="font-display text-xl font-bold text-chrome">
                  {tFlow("payment.title", { price: finalPrice })}
                </h2>
                <p className="mt-2 text-sm text-brand-ink-dim">{tFlow("payment.body")}</p>
              </GlowCard>

              <GlowCard className="mb-4 text-sm text-brand-ink-dim">
                <p>⚠️ {t("warning")}</p>
              </GlowCard>

              <div className="mb-8 flex flex-col gap-4">
                {METHODS.map(({ key, value }) => (
                  <GlowCard key={key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-display text-base font-bold text-chrome">{t(`methods.${key}.label`)}</p>
                      <p className="text-xs text-brand-ink-dim">{t(`methods.${key}.network`)}</p>
                      <p className="mt-1 break-all font-mono text-xs text-brand-ink">{value}</p>
                    </div>
                    <CopyButton value={value} label={t("copy")} copiedLabel={t("copied")} />
                  </GlowCard>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4">
                <a
                  href={dmHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-neon flex items-center gap-2 rounded-full bg-brand-surface px-6 py-3 text-center text-sm font-semibold text-brand-ink transition-colors duration-300 hover:text-brand-accent"
                >
                  {t("ctaTelegram")}
                </a>
                <button type="button" className={backBtn} onClick={() => goTo("account")}>
                  {tFlow("back")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-8 text-center">
        <Link href="/products" className="text-sm text-brand-ink-dim hover:text-brand-accent">
          {t("backToPlans")}
        </Link>
      </div>
    </div>
  );
}

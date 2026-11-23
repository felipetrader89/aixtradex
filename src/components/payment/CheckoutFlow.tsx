"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { GlowCard } from "@/components/brand/GlowCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { Link } from "@/i18n/navigation";
import { siteConfig, partnerBrokers } from "@/lib/site-config";
import { PLAN_ACCOUNTS, PLAN_KEYS, PLAN_PATH, type PlanKey } from "@/lib/plans";
import { AccountIdSlots } from "@/components/payment/AccountIdSlots";
import { InlineField } from "@/components/payment/InlineField";
import { CountryField } from "@/components/payment/CountryField";
import { PaymentMethods } from "@/components/payment/PaymentMethods";
import { createOrderAction, orderStatusAction } from "@/app/actions/checkout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const STEPS = ["discount", "broker", "account", "payment"] as const;
type Step = (typeof STEPS)[number];
type BrokerSlug = (typeof partnerBrokers)[number]["slug"];

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
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerCountry, setCustomerCountry] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  // Pedido gravado no banco; a chave evita criar outro pedido se o cliente só voltou e avançou de novo.
  const [order, setOrder] = useState<{ key: string; code: string; payAmount: string | null } | null>(null);
  const [paid, setPaid] = useState(false);
  const locale = useLocale();
  const [saving, startSaving] = useTransition();
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
  const maxAccounts = plan ? PLAN_ACCOUNTS[plan] : 0;
  // Ao trocar de vitalícia pra mensal, só as primeiras contas cabem no plano.
  const savedIds = accountIds.slice(0, maxAccounts).filter(Boolean);
  const accounts = savedIds.join(", ");
  const accountStepDone = Boolean(customerName && customerCountry && customerEmail && savedIds.length > 0);
  const orderKey = JSON.stringify([plan, brokerSlug, customerEmail, customerName, customerCountry, savedIds]);
  const orderCode = order?.key === orderKey ? order.code : "";
  const payAmount = order?.key === orderKey ? order.payAmount : null;

  // Pagamento automático (Binance): confere o pedido a cada 8s enquanto o cliente está na tela de pagamento.
  useEffect(() => {
    if (step !== "payment" || !orderCode || !payAmount || paid) return;
    const timer = setInterval(async () => {
      const status = await orderStatusAction(orderCode).catch(() => null);
      if (status === "paid") setPaid(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [step, orderCode, payAmount, paid]);

  function submitAccountStep() {
    if (orderCode) return goTo("payment");
    startSaving(async () => {
      const result = await createOrderAction({
        planKey: plan ?? "",
        email: customerEmail,
        name: customerName,
        country: customerCountry,
        broker: discountApplied ? brokerSlug : null,
        logins: savedIds,
        locale,
      }).catch(() => null);
      // Se o banco falhar, o cliente segue mesmo assim: os dados vão na mensagem do Telegram.
      setOrder(result?.ok ? { key: orderKey, code: result.code, payAmount: result.payAmount } : null);
      goTo("payment");
    });
  }

  const dmValues = {
    plan: planLabel,
    price: finalPrice,
    name: customerName,
    country: customerCountry,
    email: customerEmail,
    order: orderCode || "-",
    accounts,
  };
  const dmText = discountApplied
    ? t("dmMessageDiscount", { ...dmValues, broker: broker!.name })
    : t("dmMessage", dmValues);
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
              <div className="mx-auto mt-6 max-w-md">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-accent">
                  {tFlow("account.customerTitle")}
                </p>
                <div className="flex flex-col gap-2">
                  <InlineField
                    label={tFlow("account.nameLabel")}
                    emptyText={tFlow("account.nameEmpty")}
                    value={customerName}
                    placeholder={tFlow("account.namePlaceholder")}
                    autoComplete="name"
                    validate={(v) => (v.split(" ").length < 2 ? tFlow("account.nameInvalid") : null)}
                    onSave={setCustomerName}
                  />
                  <CountryField value={customerCountry} onSave={setCustomerCountry} />
                  <InlineField
                    label={tFlow("account.emailLabel")}
                    emptyText={tFlow("account.emailEmpty")}
                    value={customerEmail}
                    placeholder={tFlow("account.emailPlaceholder")}
                    inputMode="email"
                    autoComplete="email"
                    sanitize={(raw) => raw.replace(/\s/g, "").toLowerCase()}
                    validate={(v) => (EMAIL_RE.test(v) ? null : tFlow("account.emailInvalid"))}
                    onSave={setCustomerEmail}
                  />
                </div>
              </div>
              <AccountIdSlots max={maxAccounts} ids={accountIds} onChange={setAccountIds} />
              {!accountStepDone && (
                <p className="mt-3 text-center text-xs text-brand-ink-dim">{tFlow("account.required")}</p>
              )}
              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className={backBtn}
                  onClick={() => goTo(wantsDiscount ? "broker" : "discount")}
                >
                  {tFlow("back")}
                </button>
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={!accountStepDone || saving}
                  onClick={submitAccountStep}
                >
                  {saving ? tFlow("account.saving") : tFlow("account.next")}
                </button>
              </div>
            </GlowCard>
          )}

          {step === "payment" && paid && (
            <GlowCard className="text-center">
              <h2 className="font-display text-2xl font-bold text-chrome">{t("auto.paidTitle")}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-brand-ink-dim">
                {t("auto.paidBody", { email: customerEmail })}
              </p>
              <Link href="/account" className={`${primaryBtn} mt-6`}>
                {t("auto.paidCta")}
              </Link>
            </GlowCard>
          )}

          {step === "payment" && !paid && (
            <div>
              <GlowCard className="mb-4 text-center">
                <h2 className="font-display text-xl font-bold text-chrome">
                  {tFlow("payment.title", { price: finalPrice })}
                </h2>
                <p className="mt-2 text-sm text-brand-ink-dim">{tFlow("payment.body")}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <p className="rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold text-brand-accent">
                    {customerName} · {customerCountry}
                  </p>
                  <p className="rounded-full bg-brand-accent/10 px-3 py-1 font-mono text-xs font-semibold text-brand-accent">
                    {tFlow("payment.accounts", { ids: savedIds.join(" · ") })}
                  </p>
                  {orderCode && (
                    <p className="rounded-full bg-brand-accent px-3 py-1 font-mono text-xs font-bold text-brand-bg">
                      {tFlow("payment.order", { code: orderCode })}
                    </p>
                  )}
                </div>
                {orderCode && (
                  <p className="mx-auto mt-3 max-w-md text-xs text-brand-ink-dim">
                    {tFlow("payment.accountHint", { email: customerEmail })}
                  </p>
                )}
              </GlowCard>

              <PaymentMethods dmHref={dmHref} exactAmount={payAmount} />

              {payAmount && (
                <p className="mb-6 mt-2 flex items-center justify-center gap-2 text-center text-xs text-brand-ink-dim">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-accent" />
                  {t("auto.waiting")}
                </p>
              )}

              <div className="mt-4 flex flex-col items-center gap-4">
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

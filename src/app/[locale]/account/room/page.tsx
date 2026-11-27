import type { Metadata } from "next";
import NextLink from "next/link";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadAccountsWithStats, requireCustomer } from "@/lib/portal";
import { PRODUCT } from "@/lib/plans";
import { ACCOUNT_COOKIE } from "@/lib/panel";
import { roomPairs } from "@/lib/room";
import { PortalHeader } from "@/components/portal/ui";
import { TradingRoom } from "@/components/room/TradingRoom";
import { AutoRefresh } from "@/components/room/AutoRefresh";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal.room" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

// Sala de Operações da conta escolhida no topo do painel.
export default async function RoomPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCustomer(locale);
  const t = await getTranslations("Portal.room");
  const [{ rows }, jar] = await Promise.all([loadAccountsWithStats(user.id), cookies()]);
  const chosen = jar.get(ACCOUNT_COOKIE)?.value;
  const row = rows.find((r) => r.account.login === chosen) ?? rows[0];

  if (!row) {
    return (
      <>
        <PortalHeader title={t("title")} intro={t("intro")} />
        <p className="text-sm text-brand-ink-dim">
          {t("noAccount")}{" "}
          <NextLink href={`/${locale}/account/licenses`} className="font-semibold text-brand-accent hover:underline">
            {t("addAccount")}
          </NextLink>
        </p>
      </>
    );
  }

  const s = row.stats;
  const pairs = await roomPairs(PRODUCT.slug, row.account.login, s?.brokerGmt);
  const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cur = s?.currency ?? null;
  const money = (v: string | number | undefined, signed = true) => {
    const n = Number(v ?? 0);
    return `${n < 0 ? "-" : signed && n > 0 ? "+" : ""}${nf.format(Math.abs(n))}${cur ? ` ${cur}` : ""}`;
  };
  const tone = (v: string | number | undefined) => (Number(v) > 0 ? "text-brand-accent" : Number(v) < 0 ? "text-red-400" : "text-brand-ink");
  const tiles = s
    ? [
        { label: t("tiles.today"), value: money(s.resultToday), cls: tone(s.resultToday) },
        { label: t("tiles.floating"), value: money(s.floating), cls: tone(s.floating) },
        { label: t("tiles.open"), value: String(s.openOrders + s.pendingOrders), cls: "text-brand-ink" },
        { label: t("tiles.week"), value: money(s.resultWeek), cls: tone(s.resultWeek) },
      ]
    : [];

  return (
    <>
      <AutoRefresh seconds={30} />
      <PortalHeader title={t("title")} intro={t("intro", { login: row.account.login })} />
      {tiles.length > 0 && (
        <div className="stagger mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map((x) => (
            <div key={x.label} className="panel-tile rounded-xl bg-brand-surface px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-brand-ink-dim">{x.label}</p>
              <p className={`font-mono text-base font-bold ${x.cls}`}>{x.value}</p>
            </div>
          ))}
        </div>
      )}
      <TradingRoom pairs={pairs} online={row.state === "running"} dayStart={Number(s?.balanceDayStart ?? 0)} currency={cur} />
    </>
  );
}

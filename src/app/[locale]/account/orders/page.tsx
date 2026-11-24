import { getTranslations, setRequestLocale } from "next-intl/server";
import { PayOrder } from "@/components/account/AccountActions";
import { Card, PortalHeader } from "@/components/portal/ui";
import { getPublicPaymentMethods, isAutoPayActive } from "@/lib/config";
import { loadOrders, requireCustomer } from "@/lib/portal";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal" });
  return { title: t("nav.orders"), robots: { index: false, follow: false } };
}

const STATUS_STYLE = {
  paid: "bg-brand-accent text-brand-bg",
  pending: "bg-amber-500/20 text-amber-300",
  cancelled: "bg-brand-surface-2 text-brand-ink-dim",
} as const;

export default async function OrdersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCustomer(locale);
  const t = await getTranslations("Account");
  const tp = await getTranslations("Portal");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const usd = (value: string | number) => `$${Number(value).toFixed(Number(value) % 1 ? 2 : 0)}`;
  const [orders, methods, autoPay] = await Promise.all([loadOrders(user.id), getPublicPaymentMethods(), isAutoPayActive()]);

  return (
    <div className="flex flex-col gap-4">
      <PortalHeader title={tp("orders.title")} intro={tp("orders.intro")} />
      {orders.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-ink-dim">{t("ordersEmpty")}</p>
        </Card>
      ) : (
        orders.map((order) => (
          <Card key={order.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-bold text-brand-ink">{order.code}</p>
              <p className="text-xs text-brand-ink-dim">
                {date.format(order.createdAt)} · {t(`plan.${order.plan}`)}
                {order.licenseId && order.mt4Logins.length === 0 ? ` · ${t("renewal")}` : ""} · {usd(order.amountUsd)}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[order.status]}`}>{t(`orderStatus.${order.status}`)}</span>
            {order.status === "pending" && (
              <PayOrder
                code={order.code}
                amount={usd(order.amountUsd)}
                email={user.email}
                methods={methods}
                exactAmount={autoPay && order.payAmount ? Number(order.payAmount).toFixed(2) : null}
              />
            )}
          </Card>
        ))
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AccountIdSlots } from "@/components/payment/AccountIdSlots";
import { updateMyAccountsAction } from "@/app/actions/account";

const primaryBtn =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-b from-brand-accent to-brand-accent-dark px-5 py-2.5 text-sm font-semibold text-brand-bg transition-[filter] hover:brightness-110 disabled:pointer-events-none disabled:opacity-40";

export function LicenseAccountsEditor({
  licenseId,
  max,
  initial,
}: {
  licenseId: string;
  max: number;
  initial: string[];
}) {
  const t = useTranslations("Account");
  const [ids, setIds] = useState<string[]>(initial);
  const [saved, setSaved] = useState<string[]>(initial);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const current = ids.slice(0, max).filter(Boolean);
  const dirty = current.join(",") !== saved.join(",");

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateMyAccountsAction(licenseId, current);
      if (result.ok) {
        setSaved(current);
        setMessage({ kind: "ok", text: t("accountsSaved") });
      } else {
        setMessage({
          kind: "error",
          text: t(`accountErrors.${result.error}`, { max, logins: result.logins?.join(", ") ?? "" }),
        });
      }
    });
  }

  return (
    <div>
      <AccountIdSlots max={max} ids={ids} onChange={setIds} />
      <p className="mx-auto mt-2 max-w-md text-xs text-brand-ink-dim">{t("accountsHint")}</p>
      <div className="mx-auto mt-3 flex max-w-md items-center gap-3">
        <button type="button" className={primaryBtn} disabled={!dirty || pending} onClick={save}>
          {pending ? t("savingAccounts") : t("saveAccounts")}
        </button>
        {message && (
          <p className={`text-xs ${message.kind === "error" ? "text-red-400" : "text-brand-accent"}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
}

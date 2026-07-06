"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — user can still select/copy manually.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-full border border-brand-accent/40 px-3 py-1.5 text-xs font-semibold text-brand-accent transition-colors duration-200 hover:border-brand-accent hover:bg-brand-accent/10"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

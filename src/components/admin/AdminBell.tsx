"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Sininho do admin: avisa (com som) quando cliente se cadastra, entra no portal, faz pedido, paga ou pede acesso.
// Consulta /api/admin/activity a cada 15 s. O som é gerado no navegador (sem arquivo de áudio) e pode ser desligado.

type Kind = "signup" | "online" | "order" | "paid" | "claim";
type Item = { id: number; kind: Kind; email: string | null; name: string | null; detail: string | null; createdAt: string };
type Feed = { unread: number; seen: number; online: { email: string; name: string | null; lastSeenAt: string }[]; items: Item[] };

const POLL_MS = 15_000;
const SOUND_KEY = "aix_admin_sound";

const KIND: Record<Kind, { icon: string; label: string; tone: string }> = {
  paid: { icon: "💰", label: "Pagamento confirmado", tone: "text-brand-accent" },
  order: { icon: "🛒", label: "Pedido novo", tone: "text-amber-300" },
  signup: { icon: "✨", label: "Cadastro novo", tone: "text-sky-300" },
  claim: { icon: "🔑", label: "Pedido de acesso", tone: "text-violet-300" },
  online: { icon: "🟢", label: "Cliente entrou no portal", tone: "text-brand-ink" },
};
// Quando chegam vários de uma vez, toca o som do mais importante.
const PRIORITY: Kind[] = ["paid", "order", "signup", "claim", "online"];

// Notas de cada aviso (frequência em Hz, início e duração em segundos).
const MELODY: Record<Kind, [number, number, number][]> = {
  online: [[880, 0, 0.22]],
  signup: [[660, 0, 0.16], [990, 0.13, 0.26]],
  claim: [[740, 0, 0.16], [587, 0.14, 0.26]],
  order: [[523, 0, 0.14], [659, 0.11, 0.14], [784, 0.22, 0.3]],
  paid: [[784, 0, 0.12], [988, 0.09, 0.12], [1319, 0.18, 0.4], [1568, 0.3, 0.45]],
};

let audio: AudioContext | null = null;
function getAudio() {
  if (typeof window === "undefined") return null;
  audio ??= new AudioContext();
  return audio;
}

function play(kind: Kind) {
  const ctx = getAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const t0 = ctx.currentTime + 0.02;
  for (const [freq, start, dur] of MELODY[kind]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + start);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.05);
  }
}

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
function ago(iso: string, now: number) {
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  if (s > -60) return "agora";
  if (s > -3600) return rtf.format(Math.round(s / 60), "minute");
  if (s > -86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}
const who = (i: { name: string | null; email: string | null }) =>
  i.name || (i.email && !i.email.endsWith("@sem-email.invalid") ? i.email : null) || "Cliente";

export function AdminBell() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(true);
  const [ring, setRing] = useState(0);
  const [toast, setToast] = useState<Item | null>(null);
  const [now, setNow] = useState(0);
  const lastId = useRef<number | null>(null);
  const soundRef = useRef(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Lista abre colada no sino, qualquer que seja a posição do menu (esquerda, direita ou topo).
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 64, left: 12 });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Feed;
      const newest = data.items[0]?.id ?? 0;
      if (lastId.current !== null && newest > lastId.current) {
        const fresh = data.items.filter((i) => i.id > lastId.current!);
        const top = PRIORITY.map((k) => fresh.find((i) => i.kind === k)).find(Boolean);
        if (top) {
          if (soundRef.current) play(top.kind);
          setRing((r) => r + 1);
          setToast(top);
        }
      }
      lastId.current = newest;
      setFeed(data);
      setNow(Date.now());
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SOUND_KEY) !== "off";
      soundRef.current = saved;
      // Lido do navegador depois de montar (no servidor não existe localStorage).
      setTimeout(() => setSound(saved), 0);
    } catch {}
    // O navegador só libera som depois de um clique na página: prepara o áudio no primeiro clique.
    const unlock = () => void getAudio()?.resume();
    window.addEventListener("pointerdown", unlock, { once: true });
    const first = setTimeout(load, 0);
    const timer = setInterval(load, POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [load]);

  // Some sozinho depois de 6 s.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Número de não lidas no título da aba.
  const unread = feed?.unread ?? 0;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = unread > 0 && !open ? `(${unread}) ${base}` : base;
  }, [unread, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (next && rect) {
      const width = Math.min(384, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
      setPos({ top: rect.bottom + 10, left });
    }
    setOpen(next);
    setToast(null);
    const newest = feed?.items[0]?.id ?? 0;
    if (next && feed && feed.unread > 0) {
      setFeed({ ...feed, unread: 0 });
      void fetch("/api/admin/activity", { method: "POST", body: JSON.stringify({ upTo: newest }) });
    }
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    soundRef.current = next;
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {}
    if (next) play("online");
  }

  const onlineCount = feed?.online.length ?? 0;

  return (
    <div ref={panelRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-brand-ink-dim transition hover:bg-brand-surface-2 hover:text-brand-ink"
      >
        <svg
          key={ring}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-5 w-5 ${ring ? "bell-ring" : ""}`}
          aria-hidden
        >
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span key={unread} className="badge-pop absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        {onlineCount > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-bg bg-brand-accent" title={`${onlineCount} online`} />
        )}
      </button>

      {open && (
        <div
          style={{ top: pos.top, left: pos.left }}
          className="animate-slide-down fixed z-[70] flex max-h-[75vh] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-brand-hairline bg-brand-surface/95 shadow-2xl shadow-black/50 backdrop-blur"
        >
          <div className="flex items-center justify-between gap-2 border-b border-brand-hairline px-4 py-3">
            <p className="font-display text-sm font-bold text-chrome">Notificações</p>
            <button
              type="button"
              onClick={toggleSound}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${sound ? "bg-brand-accent/15 text-brand-accent" : "bg-brand-surface-2 text-brand-ink-dim"}`}
              title="Ligar/desligar o som dos avisos"
            >
              {sound ? "🔔 Som ligado" : "🔕 Som desligado"}
            </button>
          </div>

          <div className="border-b border-brand-hairline px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim">
              Online agora no portal · {onlineCount}
            </p>
            {onlineCount === 0 ? (
              <p className="text-xs text-brand-ink-dim">Nenhum cliente com o portal aberto agora.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {feed!.online.map((o) => (
                  <span key={o.email} className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent/10 px-2.5 py-1 text-xs text-brand-ink" title={o.email}>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-accent" />
                    {who(o)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <ul className="panel-scroll-area flex-1 overflow-y-auto py-1">
            {!feed || feed.items.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-brand-ink-dim">Nada por aqui ainda.</li>
            ) : (
              feed.items.map((i) => (
                <li key={i.id} className={`flex gap-3 px-4 py-2.5 ${i.id > feed.seen ? "bg-brand-accent/5" : ""}`}>
                  <span className="mt-0.5 text-base leading-none">{KIND[i.kind].icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-brand-ink">
                      <span className={`font-semibold ${KIND[i.kind].tone}`}>{KIND[i.kind].label}</span> · {who(i)}
                    </p>
                    {i.detail && <p className="truncate text-xs text-brand-ink-dim">{i.detail}</p>}
                    {i.email && !i.email.endsWith("@sem-email.invalid") && <p className="truncate text-[11px] text-brand-ink-dim">{i.email}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-brand-ink-dim">{ago(i.createdAt, now)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {toast && !open && (
        <button
          type="button"
          onClick={toggle}
          className="animate-slide-down fixed bottom-5 right-5 z-[70] flex max-w-sm items-center gap-3 rounded-2xl border border-brand-accent/30 bg-brand-surface/95 px-4 py-3 text-left shadow-2xl shadow-black/50 backdrop-blur"
        >
          <span className="text-xl">{KIND[toast.kind].icon}</span>
          <span className="min-w-0">
            <span className={`block text-sm font-semibold ${KIND[toast.kind].tone}`}>{KIND[toast.kind].label}</span>
            <span className="block truncate text-xs text-brand-ink-dim">
              {who(toast)}
              {toast.detail ? ` · ${toast.detail}` : ""}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

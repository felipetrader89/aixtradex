type IconProps = { className?: string };

const base = "h-9 w-9";

export function IconLock({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function IconServer({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <circle cx="8" cy="7" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconChartUp({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      <path d="M4 17 L9 11 L13 14 L20 6" />
      <path d="M14 6 H20 V12" />
    </svg>
  );
}

export function IconGlobe({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12 H21" />
    </svg>
  );
}

export function IconCalendar({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9 H20" />
      <path d="M8 3 V7 M16 3 V7" />
      <rect x="7.5" y="12" width="3" height="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTelegram({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9 22 2Z" />
    </svg>
  );
}

export function IconRocket({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      <path d="M12 2c3 2 5 6 5 10 0 2-1 4-2 5l-3 3-3-3c-1-1-2-3-2-5 0-4 2-8 5-10z" />
      <circle cx="12" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <path d="M9 16l-2 4M15 16l2 4" />
    </svg>
  );
}

// Ícones novos: o tamanho vem do className (h-*/w-*); sem tamanho, usa o padrão h-9 w-9.
function Stroke({ className = "", children }: IconProps & { children: React.ReactNode }) {
  const sized = /(^|\s)!?h-/.test(className);
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sized ? className : `${base} ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconShield({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3z" />
      <path d="m9 12 2 2 4-4" />
    </Stroke>
  );
}

export function IconTarget({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Stroke>
  );
}



export function IconCheck({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Stroke>
  );
}

export function IconAlert({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 3.5 2.8 19.5h18.4L12 3.5z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </Stroke>
  );
}

export function IconSliders({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </Stroke>
  );
}

export function IconCandles({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M7 3v4M7 15v6M17 5v3M17 17v3" />
      <rect x="5" y="7" width="4" height="8" rx="0.8" />
      <rect x="15" y="8" width="4" height="9" rx="0.8" />
    </Stroke>
  );
}

export function IconSpark({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.2 10.8 15.5 12 13.2 13.2 12 15.5 10.8 13.2 8.5 12 10.8 10.8z" />
    </Stroke>
  );
}

export function IconVerified({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 2.8 14.4 4.6 17.4 4.4 18.4 7.2 20.9 9 20 11.9 20.9 14.8 18.4 16.6 17.4 19.4 14.4 19.2 12 21 9.6 19.2 6.6 19.4 5.6 16.6 3.1 14.8 4 11.9 3.1 9 5.6 7.2 6.6 4.4 9.6 4.6z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </Stroke>
  );
}

export function IconUser({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </Stroke>
  );
}

export function IconClock({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Stroke>
  );
}

export function IconChat({ className = "" }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4.5 5.5h15v10h-8l-4 3.5v-3.5h-3z" />
      <path d="M8.5 10.5h7" />
    </Stroke>
  );
}

type FlagProps = { className?: string };

export function FlagBR({ className = "" }: FlagProps) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#009C3B" />
      <polygon points="12,2 22,8 12,14 2,8" fill="#FFDF00" />
      <circle cx="12" cy="8" r="4" fill="#002776" />
    </svg>
  );
}

export function FlagUS({ className = "" }: FlagProps) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#B22234" />
      <rect y="1.23" width="24" height="1.23" fill="#fff" />
      <rect y="3.69" width="24" height="1.23" fill="#fff" />
      <rect y="6.15" width="24" height="1.23" fill="#fff" />
      <rect y="8.61" width="24" height="1.23" fill="#fff" />
      <rect y="11.07" width="24" height="1.23" fill="#fff" />
      <rect y="13.53" width="24" height="1.23" fill="#fff" />
      <rect width="10" height="8.6" fill="#3C3B6E" />
    </svg>
  );
}

export function FlagES({ className = "" }: FlagProps) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#AA151B" />
      <rect y="4" width="24" height="8" fill="#F1BF00" />
    </svg>
  );
}

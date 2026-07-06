export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-chrome">Ai </span>
      <span className="text-brand-accent">X</span>
      <span className="text-chrome"> Trade</span>
      <span className="text-brand-accent">X</span>
    </span>
  );
}

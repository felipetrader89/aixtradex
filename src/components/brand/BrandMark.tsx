export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={className} aria-label="Ai X TradeX" role="text">
      <span aria-hidden="true">
        <span className="text-chrome">A</span>
        <span className="relative inline-block normal-case text-chrome">
          ı
          <span className="absolute left-[42%] top-[0.08em] h-[0.15em] w-[0.15em] -translate-x-1/2 bg-brand-accent" />
        </span>
        <span className="text-chrome"> </span>
        <span className="text-brand-accent">X</span>
        <span className="text-chrome"> Trade</span>
        <span className="text-brand-accent">X</span>
      </span>
    </span>
  );
}

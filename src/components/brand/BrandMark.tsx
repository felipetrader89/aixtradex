export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={className} aria-label="Ai X TradeX" role="text">
      <span aria-hidden="true">
        <span className="text-chrome">A</span>
        <span className="relative inline-block normal-case text-chrome">
          ı
          <span className="absolute left-[53%] top-[0.27em] h-[0.13em] w-[0.21em] -translate-x-1/2 bg-brand-accent" />
        </span>
        <span className="text-chrome"> </span>
        <span className="text-brand-accent">X</span>
        <span className="text-chrome"> Trade</span>
        <span className="text-brand-accent">X</span>
      </span>
    </span>
  );
}

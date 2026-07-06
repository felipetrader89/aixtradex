export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={className} aria-label="Ai X TradeX" role="text">
      <span aria-hidden="true">
        <span className="text-chrome">A</span>
        <span className="relative inline-block normal-case">
          <span
            className="inline-block"
            style={{
              color: "#E4E9EC",
              transform: "scaleY(0.85)",
              transformOrigin: "bottom",
            }}
          >
            ı
          </span>
          <span className="absolute left-[53%] top-[0.27em] h-[0.21em] w-[0.21em] -translate-x-1/2 bg-brand-accent" />
        </span>
        <span className="text-chrome"> </span>
        <span className="text-brand-accent">X</span>
        <span className="text-chrome"> Trade</span>
        <span className="text-brand-accent">X</span>
      </span>
    </span>
  );
}

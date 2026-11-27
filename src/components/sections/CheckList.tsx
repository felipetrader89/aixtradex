import { IconCheck } from "@/components/brand/icons";

// Lista simples com marcador de check verde.
export function CheckList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`grid gap-3 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-brand-ink">
          <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

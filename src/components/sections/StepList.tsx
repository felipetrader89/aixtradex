export type Step = { title: string; body: string };

// Lista numerada de etapas (01, 02...) em cartões, com linha guia no desktop.
export function StepList({ steps, columns = 2 }: { steps: Step[]; columns?: 2 | 4 }) {
  const grid = columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2";
  return (
    <ol className={`grid grid-cols-1 gap-4 ${grid}`}>
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="glow-border hover-card flex gap-4 rounded-2xl bg-brand-surface p-6"
        >
          <span
            aria-hidden="true"
            className="font-display text-2xl font-extrabold leading-none text-brand-accent"
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="text-base font-bold text-brand-ink">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-brand-ink-dim">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

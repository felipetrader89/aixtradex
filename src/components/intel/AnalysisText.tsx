import { Fragment } from "react";

// Mostra o texto da IA (títulos "## ", listas "- ", **negrito**) sem HTML vindo de fora.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold text-brand-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export function AnalysisText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    const items = list;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
        {items.map((li, i) => (
          <li key={i}>{inline(li)}</li>
        ))}
      </ul>
    );
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (/^[-*•]\s+/.test(line)) {
      list.push(line.replace(/^[-*•]\s+/, ""));
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      list.push(line);
      continue;
    }
    flush();
    if (!line) continue;
    if (/^#{1,4}\s+/.test(line))
      blocks.push(
        <h3 key={`h-${blocks.length}`} className="pt-1 text-sm font-bold text-brand-ink">
          {inline(line.replace(/^#{1,4}\s+/, ""))}
        </h3>
      );
    else blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>);
  }
  flush();
  return <div className="flex flex-col gap-2 text-sm leading-relaxed text-brand-ink-dim">{blocks}</div>;
}

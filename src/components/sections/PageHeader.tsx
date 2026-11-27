import { SectionHeading } from "@/components/sections/SectionHeading";

// Topo das páginas internas: mesmo brilho verde do Hero, sem o gráfico.
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
}) {
  return (
    <header className="page-header relative overflow-hidden border-b border-brand-hairline px-4 pb-4 pt-14 sm:px-6 sm:pt-20">
      <div className="relative mx-auto max-w-4xl">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} intro={intro} />
      </div>
    </header>
  );
}

import { Eyebrow } from "@/components/brand/Eyebrow";

// Cabeçalho padrão das seções públicas: etiqueta verde, título cromado e texto de apoio.
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "center",
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "center" | "left";
  as?: "h1" | "h2";
}) {
  const centered = align === "center";
  const size =
    Tag === "h1"
      ? "text-3xl sm:text-4xl lg:text-5xl"
      : "text-2xl sm:text-3xl";
  return (
    <div className={`mb-10 ${centered ? "text-center" : ""}`}>
      {eyebrow && (
        <Eyebrow className={`mb-4 ${centered ? "justify-center" : ""}`}>{eyebrow}</Eyebrow>
      )}
      <Tag
        className={`text-balance font-display font-extrabold uppercase tracking-tight text-chrome ${size}`}
      >
        {title}
      </Tag>
      {intro && (
        <p
          className={`mt-4 text-pretty text-brand-ink-dim sm:text-lg ${
            centered ? "mx-auto max-w-2xl" : "max-w-2xl"
          }`}
        >
          {intro}
        </p>
      )}
    </div>
  );
}

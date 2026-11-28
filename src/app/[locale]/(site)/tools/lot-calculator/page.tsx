import { permanentRedirect } from "next/navigation";

// A calculadora de lote mudou pra página Calculadoras (2026-11-27). Links antigos continuam funcionando.
type Props = { params: Promise<{ locale: string }> };

export default async function LotCalculatorRedirect({ params }: Props) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/tools/calculators/lot`);
}

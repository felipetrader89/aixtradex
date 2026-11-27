import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { ProfileCards, type ProfileItem } from "@/components/sections/ProfileCards";

// Seção completa dos perfis de risco (usada em Home, Planos e Como Funciona).
export async function ProfilesSection() {
  const t = await getTranslations("Profiles");
  return (
    <>
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <ProfileCards
        items={t.raw("items") as ProfileItem[]}
        labels={{
          goal: t("goal"),
          loss: t("loss"),
          risk: t("risk"),
          levelLabel: t("levelLabel"),
          customTitle: t("customTitle"),
          customBody: t("customBody"),
          warning: t("warning"),
        }}
      />
    </>
  );
}

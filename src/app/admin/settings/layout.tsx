import { getAiKey, getBinanceCreds, getBinanceSettings, getSmtpConfig } from "@/lib/config";
import { SettingsTabs } from "@/components/admin/AdminNav";
import { PageHeader } from "@/components/admin/ui";

// Configurações do portal: tudo que antes precisava mexer no servidor agora fica aqui.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [creds, binance, smtp, ai] = await Promise.all([getBinanceCreds(), getBinanceSettings(), getSmtpConfig(), getAiKey()]);
  const test = binance.lastTest;
  const binanceDot = !creds ? "warn" : test && !test.ok ? "bad" : "ok";
  const checks = Object.values(binance.walletCheck?.results ?? {});
  const walletsDot = checks.length === 0 ? "warn" : checks.every((r) => r === "ok") ? "ok" : "warn";

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Conexão com a Binance, carteiras do checkout, email de envio, limites do robô, IA e administradores. Tudo salvo aqui vale na hora, sem mexer no servidor."
      />
      <SettingsTabs
        tabs={[
          { href: "/admin/settings/binance", label: "Binance", dot: binanceDot },
          { href: "/admin/settings/wallets", label: "Carteiras", dot: walletsDot },
          { href: "/admin/settings/email", label: "Email", dot: smtp.pass ? "ok" : "bad" },
          { href: "/admin/settings/robot", label: "Robô" },
          { href: "/admin/settings/ai", label: "IA", dot: ai ? "ok" : "warn" },
          { href: "/admin/settings/admins", label: "Administradores" },
          { href: "/admin/settings/system", label: "Sistema" },
        ]}
      />
      {children}
    </div>
  );
}

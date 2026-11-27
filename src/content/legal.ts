// Textos das páginas legais (Termos de uso, Política de privacidade e Aviso de risco), em PT/EN/ES.
// Ficam fora dos messages/*.json porque são longos e mudam pouco. Ao mudar regra de licença, preço ou dado coletado,
// atualizar aqui também (e a data em UPDATED).

export type LegalKey = "terms" | "privacy" | "risk";
export type LegalLocale = "pt" | "en" | "es";
type Section = { h: string; p: string[] };
export type LegalDoc = { eyebrow: string; title: string; intro: string; sections: Section[] };

export const LEGAL_KEYS: LegalKey[] = ["terms", "privacy", "risk"];
export const LEGAL_HREF: Record<LegalKey, "/terms" | "/privacy" | "/risk"> = {
  terms: "/terms",
  privacy: "/privacy",
  risk: "/risk",
};

const UPDATED = "2026-11-27";

export const LEGAL_UI: Record<LegalLocale, { updated: string; others: string; contact: string; date: string }> = {
  pt: { updated: "Atualizado em", others: "Veja também", contact: "Dúvidas sobre este texto? Escreva pra support@aixtradex.com.", date: "27/11/2026" },
  en: { updated: "Last updated", others: "See also", contact: "Questions about this page? Write to support@aixtradex.com.", date: "November 27, 2026" },
  es: { updated: "Actualizado el", others: "Ver también", contact: "¿Dudas sobre este texto? Escribe a support@aixtradex.com.", date: "27/11/2026" },
};
export const LEGAL_UPDATED_ISO = UPDATED;

export const LEGAL: Record<LegalLocale, Record<LegalKey, LegalDoc>> = {
  pt: {
    terms: {
      eyebrow: "Legal",
      title: "Termos de uso",
      intro:
        "Estes termos valem pra quem usa o site, o portal (Minha Conta) e o Ai X PULSE RS. Ao comprar uma licença ou um passe de teste, você concorda com eles.",
      sections: [
        {
          h: "1. Quem somos",
          p: [
            "Ai X TradeX é a marca de Alesson Felipe, que desenvolve e dá suporte ao Ai X PULSE RS. Contato: support@aixtradex.com ou Telegram (@AlessonFelipe89).",
          ],
        },
        {
          h: "2. O que você está comprando",
          p: [
            "Uma licença de uso de software: o Ai X PULSE RS, nossa inteligência artificial de trading que roda no MetaTrader 4 da sua conta.",
            "Não é gestão de conta, fundo de investimento, recomendação de investimento nem promessa de rendimento. O dinheiro fica na sua conta, na corretora que você escolheu. Nós não temos acesso a ele e não operamos por você.",
          ],
        },
        {
          h: "3. Licenças e passes de teste",
          p: [
            "Licença Mensal: US$99 a cada 30 dias, até 2 contas MT4. Licença Vitalícia: US$499, pagamento único, até 5 contas MT4, sem data de vencimento.",
            "Passe de teste: 1 dia (US$10), 3 dias (US$25) ou 7 dias (US$49), em 1 conta MT4. Recargas somam dias. O que você pagou em passes nos últimos 7 dias vira desconto na Licença Mensal ou Vitalícia, até metade do preço.",
            "Desconto de corretora parceira (FPMarkets, Tickmill, Vantage ou Exness, com conta aberta pelo nosso link ou Código IB trocado pro nosso): US$30 por mês na Mensal e US$50 na Vitalícia.",
            "A licença fica vinculada aos números das contas MT4 informados na compra. Você pode trocar as contas 1 vez em Minha Conta; outras trocas, só pelo suporte.",
          ],
        },
        {
          h: "4. Pagamento e renovação",
          p: [
            "O pagamento é em cripto: USDT ou USDC (Binance Pay ou carteira), com confirmação automática quando o valor é exato. BTC, ETH e LTC têm confirmação manual. Taxas de rede e de saque ficam por conta de quem paga.",
            "A licença é liberada quando o pagamento é confirmado. A Licença Mensal não renova sozinha: você renova em Minha Conta. Se ela vencer, o sistema para de abrir operações novas e continua administrando as que já estão abertas.",
          ],
        },
        {
          h: "5. Reembolso",
          p: [
            "A licença é um produto digital liberado na hora, e o passe de teste existe justamente pra você conhecer o sistema antes de assinar. Por isso, pagamentos confirmados não são reembolsados. Se houver cobrança em duplicidade ou erro do nosso lado, fale com o suporte que a gente corrige.",
          ],
        },
        {
          h: "6. Uso permitido",
          p: [
            "A licença é pessoal e vale só nas contas vinculadas a ela. Não é permitido revender, compartilhar, copiar, descompilar ou tentar burlar a checagem de licença. Nesses casos a licença pode ser cancelada, sem reembolso.",
          ],
        },
        {
          h: "7. Requisitos",
          p: [
            "MetaTrader 4 (o MT5 ainda não é suportado), conta Raw, Zero ou ECN, spread de até 10 pts no ouro e alavancagem 1:500 recomendada. Capital recomendado: US$500 no ouro e US$100 nos pares. O MT4 precisa ficar aberto, no seu computador ou numa VPS, com acesso à internet.",
          ],
        },
        {
          h: "8. Risco e responsabilidade",
          p: [
            "Trading envolve risco real de perda, inclusive de todo o capital. Você escolhe a corretora, a conta, o capital, o perfil de risco e as configurações, e é responsável por essas escolhas. Leia o Aviso de risco antes de começar.",
            "O sistema depende do seu MT4, da sua internet, da corretora e dos nossos servidores. Falhas técnicas, desconexões, spread alto, slippage e gaps podem afetar o resultado. Não nos responsabilizamos por perdas de trading nem por lucros que deixaram de acontecer.",
          ],
        },
        {
          h: "9. Mudanças",
          p: [
            "O sistema, o portal, os preços e estes termos podem ser atualizados. Mudança de preço vale pra compras novas e não altera o período que você já pagou. Mudanças importantes nestes termos são avisadas no site.",
          ],
        },
      ],
    },
    privacy: {
      eyebrow: "Legal",
      title: "Política de privacidade",
      intro:
        "O que coletamos, pra que usamos e o que você pode pedir. Coletamos só o que é preciso pra liberar a licença, mostrar o seu painel e te atender.",
      sections: [
        {
          h: "1. Dados que você informa",
          p: [
            "Na compra e no portal: email, nome, país e os números das contas MT4 que vão usar a licença. No pedido de acesso de cliente antigo: email e uma conta MT4.",
          ],
        },
        {
          h: "2. Dados do pagamento",
          p: [
            "Plano, valor, moeda, rede e o identificador da transação em cripto. Não recebemos dados de cartão nem de conta bancária. Transações em blockchain são públicas por natureza.",
          ],
        },
        {
          h: "3. Dados enviados pelo Ai X PULSE RS",
          p: [
            "Com a licença ativa, o sistema envia pro portal: número da conta MT4, corretora, servidor, moeda, alavancagem, saldo, capital, resultados do dia, da semana e do mês, operações abertas e fechadas, a lista de ativos da corretora, velas usadas nas análises e a versão do sistema. É isso que alimenta o seu painel, a checagem da licença e as análises da IA.",
          ],
        },
        {
          h: "4. Dados de uso e segurança",
          p: [
            "Data do último acesso ao portal e, em alguns formulários, o endereço IP, pra evitar abuso e tentativas repetidas.",
          ],
        },
        {
          h: "5. Pra que usamos",
          p: [
            "Liberar e validar a licença, processar pagamentos, mostrar o painel e o histórico, gerar as análises da IA, mandar o código de acesso e avisos da licença por email, dar suporte e manter o serviço seguro. Não vendemos seus dados e não usamos seus dados pra publicidade.",
          ],
        },
        {
          h: "6. Com quem compartilhamos",
          p: [
            "Só com os serviços necessários pra funcionar: o servidor que hospeda o site e o portal, o serviço de envio de email e o provedor de inteligência artificial que gera as análises (ele recebe dados de mercado e de configuração, não o seu nome nem o seu email). Também quando a lei exigir.",
          ],
        },
        {
          h: "7. Cookies",
          p: [
            "Usamos só o necessário: um cookie de sessão pra manter você conectado em Minha Conta e o registro do idioma escolhido no seu navegador. Não usamos cookies de publicidade nem de rastreamento.",
          ],
        },
        {
          h: "8. Por quanto tempo",
          p: [
            "Enquanto você tiver conta ou licença, e depois pelo tempo necessário pra cumprir obrigações legais e resolver eventuais disputas.",
          ],
        },
        {
          h: "9. Seus direitos",
          p: [
            "Você pode pedir uma cópia dos seus dados, a correção ou a exclusão, escrevendo pra support@aixtradex.com com o email da sua conta. Excluir os dados encerra o acesso ao portal e a licença vinculada a eles.",
          ],
        },
        {
          h: "10. Segurança e idade",
          p: [
            "O acesso é por código enviado ao seu email, sem senha, sempre por conexão segura (HTTPS), e as chaves sensíveis ficam criptografadas. O serviço é só pra maiores de 18 anos.",
          ],
        },
      ],
    },
    risk: {
      eyebrow: "Legal",
      title: "Aviso de risco",
      intro:
        "Leia antes de usar o Ai X PULSE RS em conta real. Trading automatizado não tira o risco do mercado: ele organiza a operação e tira a emoção do caminho.",
      sections: [
        {
          h: "Você pode perder dinheiro",
          p: [
            "Operar forex e ouro (XAU/USD) com alavancagem envolve risco alto. Você pode perder parte ou todo o capital depositado. A alavancagem aumenta o ganho e também a perda.",
          ],
        },
        {
          h: "Passado não garante futuro",
          p: [
            "Prints, resultados de clientes, backtests e simulações, incluindo a chance de bater a meta mostrada pela Ai X Intelligence, mostram o que aconteceu num período. Não garantem resultado futuro. Simulações não capturam tudo: spread que abre, slippage, notícias e mudanças no comportamento do mercado.",
          ],
        },
        {
          h: "A IA não prevê o mercado",
          p: [
            "A inteligência artificial monta o plano, testa combinações no histórico da sua corretora e dá um parecer técnico. As ordens seguem regras definidas. Nenhuma IA sabe o que o preço vai fazer.",
          ],
        },
        {
          h: "Meta e limite de perda não eliminam o risco",
          p: [
            "Bater a meta ou chegar no limite de perda faz o sistema parar até o dia seguinte. Em gaps ou movimentos muito rápidos, a perda pode passar do limite. O limite de perda do dia pode ser desligado no portal, e sem ele um dia ruim pode custar mais. A recuperação de lote vem desligada; ligar aumenta o risco.",
          ],
        },
        {
          h: "Riscos técnicos",
          p: [
            "O sistema depende do MT4 aberto, da sua internet ou VPS, da corretora e dos nossos servidores. Queda de conexão, MT4 fechado, mudança de condições da corretora ou spread acima do limite podem impedir entradas, saídas ou ajustes.",
          ],
        },
        {
          h: "Não é aconselhamento financeiro",
          p: [
            "A Ai X TradeX vende licença de software. Não somos corretora, não fazemos gestão de conta e nada neste site é recomendação de investimento. Confira se operar com alavancagem é permitido no seu país.",
          ],
        },
        {
          h: "Como começar com cuidado",
          p: [
            "Teste antes em conta demo ou com o passe de teste. Comece pelo perfil Conservador. Use uma conta Raw, Zero ou ECN com spread baixo. E opere só com dinheiro que você pode perder.",
          ],
        },
      ],
    },
  },
  en: {
    terms: {
      eyebrow: "Legal",
      title: "Terms of use",
      intro:
        "These terms apply to anyone who uses the website, the client portal (My Account) and Ai X PULSE RS. By buying a license or a trial pass, you agree to them.",
      sections: [
        {
          h: "1. Who we are",
          p: [
            "Ai X TradeX is the brand of Alesson Felipe, who develops and supports Ai X PULSE RS. Contact: support@aixtradex.com or Telegram (@AlessonFelipe89).",
          ],
        },
        {
          h: "2. What you are buying",
          p: [
            "A software license: Ai X PULSE RS, our trading artificial intelligence that runs on your account's MetaTrader 4.",
            "It is not account management, an investment fund, investment advice or a promise of returns. Your money stays in your account, at the broker you chose. We have no access to it and we don't trade for you.",
          ],
        },
        {
          h: "3. Licenses and trial passes",
          p: [
            "Monthly License: US$99 every 30 days, up to 2 MT4 accounts. Lifetime License: US$499, one-time payment, up to 5 MT4 accounts, with no expiry date.",
            "Trial pass: 1 day (US$10), 3 days (US$25) or 7 days (US$49), on 1 MT4 account. Top-ups add days. What you paid in passes over the last 7 days becomes a discount on the Monthly or Lifetime License, up to half the price.",
            "Partner broker discount (FPMarkets, Tickmill, Vantage or Exness, with the account opened through our link or the IB code switched to ours): US$30 per month on the Monthly and US$50 on the Lifetime.",
            "The license is tied to the MT4 account numbers entered at purchase. You can change the accounts once in My Account; any further changes go through support.",
          ],
        },
        {
          h: "4. Payment and renewal",
          p: [
            "Payment is in crypto: USDT or USDC (Binance Pay or wallet), confirmed automatically when the amount is exact. BTC, ETH and LTC are confirmed manually. Network and withdrawal fees are paid by the payer.",
            "The license is released once the payment is confirmed. The Monthly License does not renew on its own: you renew it in My Account. If it expires, the system stops opening new trades and keeps managing the ones already open.",
          ],
        },
        {
          h: "5. Refunds",
          p: [
            "The license is a digital product delivered right away, and the trial pass exists so you can get to know the system before subscribing. For that reason, confirmed payments are not refunded. If you were charged twice or we made a mistake, contact support and we will fix it.",
          ],
        },
        {
          h: "6. Permitted use",
          p: [
            "The license is personal and only valid on the accounts linked to it. Reselling, sharing, copying, decompiling or trying to bypass the license check is not allowed. In those cases the license may be cancelled, with no refund.",
          ],
        },
        {
          h: "7. Requirements",
          p: [
            "MetaTrader 4 (MT5 is not supported yet), a Raw, Zero or ECN account, spread of up to 10 pts on gold and 1:500 leverage recommended. Recommended capital: US$500 on gold and US$100 on currency pairs. MT4 must stay open, on your computer or a VPS, with internet access.",
          ],
        },
        {
          h: "8. Risk and liability",
          p: [
            "Trading involves a real risk of loss, including all of your capital. You choose the broker, the account, the capital, the risk profile and the settings, and you are responsible for those choices. Read the Risk warning before you start.",
            "The system depends on your MT4, your internet connection, the broker and our servers. Technical failures, disconnections, high spread, slippage and gaps can affect results. We are not liable for trading losses or for profits that did not happen.",
          ],
        },
        {
          h: "9. Changes",
          p: [
            "The system, the portal, prices and these terms may be updated. Price changes apply to new purchases and do not change a period you have already paid for. Important changes to these terms are announced on the website.",
          ],
        },
      ],
    },
    privacy: {
      eyebrow: "Legal",
      title: "Privacy policy",
      intro:
        "What we collect, what we use it for and what you can ask for. We only collect what is needed to release your license, show your dashboard and support you.",
      sections: [
        {
          h: "1. Data you provide",
          p: [
            "At purchase and in the portal: email, name, country and the MT4 account numbers that will use the license. In an access request from an existing client: email and one MT4 account.",
          ],
        },
        {
          h: "2. Payment data",
          p: [
            "Plan, amount, currency, network and the crypto transaction ID. We never receive card or bank account details. Blockchain transactions are public by nature.",
          ],
        },
        {
          h: "3. Data sent by Ai X PULSE RS",
          p: [
            "While the license is active, the system sends to the portal: MT4 account number, broker, server, currency, leverage, balance, equity, daily, weekly and monthly results, open and closed trades, the broker's list of instruments, candles used in the analyses and the system version. This powers your dashboard, the license check and the AI analyses.",
          ],
        },
        {
          h: "4. Usage and security data",
          p: [
            "The date of your last visit to the portal and, on some forms, your IP address, to prevent abuse and repeated attempts.",
          ],
        },
        {
          h: "5. What we use it for",
          p: [
            "Releasing and validating the license, processing payments, showing your dashboard and history, generating the AI analyses, emailing your access code and license notices, providing support and keeping the service secure. We do not sell your data and we do not use it for advertising.",
          ],
        },
        {
          h: "6. Who we share it with",
          p: [
            "Only with the services needed to run: the server that hosts the website and portal, the email delivery service and the artificial intelligence provider that generates the analyses (it receives market and settings data, not your name or email). Also when required by law.",
          ],
        },
        {
          h: "7. Cookies",
          p: [
            "We only use what is necessary: a session cookie to keep you signed in to My Account and a record of the language you picked, stored in your browser. No advertising or tracking cookies.",
          ],
        },
        {
          h: "8. How long we keep it",
          p: [
            "For as long as you have an account or license, and afterwards for the time needed to meet legal obligations and resolve any disputes.",
          ],
        },
        {
          h: "9. Your rights",
          p: [
            "You can ask for a copy of your data, a correction or deletion by writing to support@aixtradex.com from your account email. Deleting your data ends your portal access and the license linked to it.",
          ],
        },
        {
          h: "10. Security and age",
          p: [
            "Access is by a code sent to your email, with no password, always over a secure connection (HTTPS), and sensitive keys are stored encrypted. The service is for people aged 18 or over only.",
          ],
        },
      ],
    },
    risk: {
      eyebrow: "Legal",
      title: "Risk warning",
      intro:
        "Read this before using Ai X PULSE RS on a live account. Automated trading does not remove market risk: it organizes the trading and takes emotion out of the way.",
      sections: [
        {
          h: "You can lose money",
          p: [
            "Trading forex and gold (XAU/USD) with leverage carries high risk. You can lose part or all of the capital you deposited. Leverage increases gains and losses alike.",
          ],
        },
        {
          h: "The past does not guarantee the future",
          p: [
            "Screenshots, client results, backtests and simulations, including the chance of hitting the goal shown by Ai X Intelligence, show what happened over a period. They do not guarantee future results. Simulations do not capture everything: widening spreads, slippage, news and changes in market behavior.",
          ],
        },
        {
          h: "AI does not predict the market",
          p: [
            "The artificial intelligence builds the plan, tests combinations on your broker's history and gives a technical view. Orders follow defined rules. No AI knows what the price will do.",
          ],
        },
        {
          h: "Goal and loss limit do not remove risk",
          p: [
            "Hitting the goal or reaching the loss limit stops the system until the next day. In gaps or very fast moves, the loss can go beyond the limit. The daily loss limit can be turned off in the portal, and without it a bad day can cost more. Lot recovery comes turned off; turning it on raises the risk.",
          ],
        },
        {
          h: "Technical risks",
          p: [
            "The system depends on MT4 being open, your internet or VPS, the broker and our servers. Connection drops, a closed MT4, changes in broker conditions or spread above the limit can prevent entries, exits or adjustments.",
          ],
        },
        {
          h: "Not financial advice",
          p: [
            "Ai X TradeX sells a software license. We are not a broker, we do not manage accounts and nothing on this website is investment advice. Check whether leveraged trading is allowed in your country.",
          ],
        },
        {
          h: "How to start carefully",
          p: [
            "Test first on a demo account or with the trial pass. Start with the Conservative profile. Use a Raw, Zero or ECN account with low spread. And only trade money you can afford to lose.",
          ],
        },
      ],
    },
  },
  es: {
    terms: {
      eyebrow: "Legal",
      title: "Términos de uso",
      intro:
        "Estos términos valen para quien usa el sitio, el portal (Mi Cuenta) y el Ai X PULSE RS. Al comprar una licencia o un pase de prueba, los aceptas.",
      sections: [
        {
          h: "1. Quiénes somos",
          p: [
            "Ai X TradeX es la marca de Alesson Felipe, que desarrolla y da soporte al Ai X PULSE RS. Contacto: support@aixtradex.com o Telegram (@AlessonFelipe89).",
          ],
        },
        {
          h: "2. Qué estás comprando",
          p: [
            "Una licencia de uso de software: el Ai X PULSE RS, nuestra inteligencia artificial de trading que funciona en el MetaTrader 4 de tu cuenta.",
            "No es gestión de cuenta, fondo de inversión, recomendación de inversión ni promesa de rentabilidad. El dinero queda en tu cuenta, en el bróker que elegiste. No tenemos acceso a él y no operamos por ti.",
          ],
        },
        {
          h: "3. Licencias y pases de prueba",
          p: [
            "Licencia Mensual: US$99 cada 30 días, hasta 2 cuentas MT4. Licencia Vitalicia: US$499, pago único, hasta 5 cuentas MT4, sin fecha de vencimiento.",
            "Pase de prueba: 1 día (US$10), 3 días (US$25) o 7 días (US$49), en 1 cuenta MT4. Las recargas suman días. Lo que pagaste en pases en los últimos 7 días se convierte en descuento en la Licencia Mensual o Vitalicia, hasta la mitad del precio.",
            "Descuento de bróker asociado (FPMarkets, Tickmill, Vantage o Exness, con la cuenta abierta con nuestro enlace o el código IB cambiado al nuestro): US$30 al mes en la Mensual y US$50 en la Vitalicia.",
            "La licencia queda vinculada a los números de las cuentas MT4 informados en la compra. Puedes cambiar las cuentas 1 vez en Mi Cuenta; otros cambios, solo por soporte.",
          ],
        },
        {
          h: "4. Pago y renovación",
          p: [
            "El pago es en cripto: USDT o USDC (Binance Pay o billetera), con confirmación automática cuando el monto es exacto. BTC, ETH y LTC tienen confirmación manual. Las comisiones de red y de retiro corren por cuenta de quien paga.",
            "La licencia se libera cuando se confirma el pago. La Licencia Mensual no se renueva sola: la renuevas en Mi Cuenta. Si vence, el sistema deja de abrir operaciones nuevas y sigue administrando las que ya están abiertas.",
          ],
        },
        {
          h: "5. Reembolso",
          p: [
            "La licencia es un producto digital que se entrega al momento, y el pase de prueba existe justamente para que conozcas el sistema antes de suscribirte. Por eso, los pagos confirmados no se reembolsan. Si hubo un cobro duplicado o un error de nuestra parte, habla con soporte y lo corregimos.",
          ],
        },
        {
          h: "6. Uso permitido",
          p: [
            "La licencia es personal y solo vale en las cuentas vinculadas a ella. No está permitido revender, compartir, copiar, descompilar ni intentar burlar la verificación de licencia. En esos casos la licencia puede cancelarse, sin reembolso.",
          ],
        },
        {
          h: "7. Requisitos",
          p: [
            "MetaTrader 4 (MT5 todavía no es compatible), cuenta Raw, Zero o ECN, spread de hasta 10 pts en el oro y apalancamiento 1:500 recomendado. Capital recomendado: US$500 en el oro y US$100 en los pares. MT4 debe quedar abierto, en tu computadora o en un VPS, con acceso a internet.",
          ],
        },
        {
          h: "8. Riesgo y responsabilidad",
          p: [
            "El trading implica un riesgo real de pérdida, incluso de todo el capital. Tú eliges el bróker, la cuenta, el capital, el perfil de riesgo y la configuración, y eres responsable de esas elecciones. Lee el Aviso de riesgo antes de empezar.",
            "El sistema depende de tu MT4, de tu internet, del bróker y de nuestros servidores. Fallas técnicas, desconexiones, spread alto, slippage y gaps pueden afectar el resultado. No nos responsabilizamos por pérdidas de trading ni por ganancias que no ocurrieron.",
          ],
        },
        {
          h: "9. Cambios",
          p: [
            "El sistema, el portal, los precios y estos términos pueden actualizarse. Un cambio de precio vale para compras nuevas y no altera el período que ya pagaste. Los cambios importantes en estos términos se avisan en el sitio.",
          ],
        },
      ],
    },
    privacy: {
      eyebrow: "Legal",
      title: "Política de privacidad",
      intro:
        "Qué recopilamos, para qué lo usamos y qué puedes pedir. Solo recopilamos lo necesario para liberar la licencia, mostrar tu panel y atenderte.",
      sections: [
        {
          h: "1. Datos que tú informas",
          p: [
            "En la compra y en el portal: email, nombre, país y los números de las cuentas MT4 que usarán la licencia. En la solicitud de acceso de cliente antiguo: email y una cuenta MT4.",
          ],
        },
        {
          h: "2. Datos del pago",
          p: [
            "Plan, monto, moneda, red y el identificador de la transacción en cripto. No recibimos datos de tarjeta ni de cuenta bancaria. Las transacciones en blockchain son públicas por naturaleza.",
          ],
        },
        {
          h: "3. Datos que envía el Ai X PULSE RS",
          p: [
            "Con la licencia activa, el sistema envía al portal: número de cuenta MT4, bróker, servidor, moneda, apalancamiento, saldo, capital, resultados del día, de la semana y del mes, operaciones abiertas y cerradas, la lista de activos del bróker, velas usadas en los análisis y la versión del sistema. Eso alimenta tu panel, la verificación de la licencia y los análisis de la IA.",
          ],
        },
        {
          h: "4. Datos de uso y seguridad",
          p: [
            "Fecha del último acceso al portal y, en algunos formularios, la dirección IP, para evitar abusos e intentos repetidos.",
          ],
        },
        {
          h: "5. Para qué los usamos",
          p: [
            "Liberar y validar la licencia, procesar pagos, mostrar el panel y el historial, generar los análisis de la IA, enviar por email el código de acceso y avisos de la licencia, dar soporte y mantener el servicio seguro. No vendemos tus datos ni los usamos para publicidad.",
          ],
        },
        {
          h: "6. Con quién los compartimos",
          p: [
            "Solo con los servicios necesarios para funcionar: el servidor que aloja el sitio y el portal, el servicio de envío de email y el proveedor de inteligencia artificial que genera los análisis (recibe datos de mercado y de configuración, no tu nombre ni tu email). También cuando la ley lo exija.",
          ],
        },
        {
          h: "7. Cookies",
          p: [
            "Usamos solo lo necesario: una cookie de sesión para mantenerte conectado en Mi Cuenta y el registro del idioma elegido en tu navegador. No usamos cookies de publicidad ni de rastreo.",
          ],
        },
        {
          h: "8. Por cuánto tiempo",
          p: [
            "Mientras tengas cuenta o licencia, y después por el tiempo necesario para cumplir obligaciones legales y resolver posibles disputas.",
          ],
        },
        {
          h: "9. Tus derechos",
          p: [
            "Puedes pedir una copia de tus datos, su corrección o su eliminación escribiendo a support@aixtradex.com desde el email de tu cuenta. Eliminar los datos termina el acceso al portal y la licencia vinculada a ellos.",
          ],
        },
        {
          h: "10. Seguridad y edad",
          p: [
            "El acceso es por un código enviado a tu email, sin contraseña, siempre por conexión segura (HTTPS), y las claves sensibles se guardan cifradas. El servicio es solo para mayores de 18 años.",
          ],
        },
      ],
    },
    risk: {
      eyebrow: "Legal",
      title: "Aviso de riesgo",
      intro:
        "Léelo antes de usar el Ai X PULSE RS en una cuenta real. El trading automatizado no quita el riesgo del mercado: organiza la operación y saca la emoción del camino.",
      sections: [
        {
          h: "Puedes perder dinero",
          p: [
            "Operar forex y oro (XAU/USD) con apalancamiento implica un riesgo alto. Puedes perder parte o todo el capital depositado. El apalancamiento aumenta la ganancia y también la pérdida.",
          ],
        },
        {
          h: "El pasado no garantiza el futuro",
          p: [
            "Capturas, resultados de clientes, backtests y simulaciones, incluida la probabilidad de alcanzar la meta que muestra la Ai X Intelligence, muestran lo que pasó en un período. No garantizan resultados futuros. Las simulaciones no lo capturan todo: spread que se abre, slippage, noticias y cambios en el comportamiento del mercado.",
          ],
        },
        {
          h: "La IA no predice el mercado",
          p: [
            "La inteligencia artificial arma el plan, prueba combinaciones en el historial de tu bróker y da una opinión técnica. Las órdenes siguen reglas definidas. Ninguna IA sabe lo que hará el precio.",
          ],
        },
        {
          h: "La meta y el límite de pérdida no eliminan el riesgo",
          p: [
            "Alcanzar la meta o llegar al límite de pérdida detiene el sistema hasta el día siguiente. En gaps o movimientos muy rápidos, la pérdida puede pasar del límite. El límite de pérdida del día se puede desactivar en el portal, y sin él un mal día puede costar más. La recuperación de lote viene desactivada; activarla aumenta el riesgo.",
          ],
        },
        {
          h: "Riesgos técnicos",
          p: [
            "El sistema depende de que MT4 esté abierto, de tu internet o VPS, del bróker y de nuestros servidores. Caídas de conexión, MT4 cerrado, cambios en las condiciones del bróker o spread por encima del límite pueden impedir entradas, salidas o ajustes.",
          ],
        },
        {
          h: "No es asesoría financiera",
          p: [
            "Ai X TradeX vende una licencia de software. No somos un bróker, no hacemos gestión de cuentas y nada en este sitio es recomendación de inversión. Verifica si operar con apalancamiento está permitido en tu país.",
          ],
        },
        {
          h: "Cómo empezar con cuidado",
          p: [
            "Prueba antes en una cuenta demo o con el pase de prueba. Empieza con el perfil Conservador. Usa una cuenta Raw, Zero o ECN con spread bajo. Y opera solo con dinero que puedas perder.",
          ],
        },
      ],
    },
  },
};

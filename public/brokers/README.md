Copie aqui os logos das corretoras parceiras, com esses nomes exatos:

- `fpmarkets.png`
- `tickmill.png`
- `vantage.png`
- `exness.png`

A seção "Corretoras Parceiras" na Home (`src/app/[locale]/page.tsx`) detecta automaticamente se cada arquivo existe:
- Se existir, mostra o logo real.
- Se não existir, mostra um pill de texto com o nome (mesmo padrão da página Sobre) como placeholder.

Não precisa mexer em código — só copiar os arquivos pra essa pasta.

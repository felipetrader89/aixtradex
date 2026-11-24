import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PRODUCT } from "@/lib/plans";
import { deleteVersionAction, setCurrentVersionAction } from "@/app/actions/admin";
import { Badge, Flash, PageHeader, Panel, adminBtn, adminBtnDanger, adminBtnGhost, adminInput, fmtDate } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ msg?: string }> };

export default async function AdminFiles({ searchParams }: Props) {
  const { msg } = await searchParams;
  const versions = await db()
    .select({
      id: schema.productVersions.id,
      version: schema.productVersions.version,
      notes: schema.productVersions.notes,
      fileName: schema.productVersions.fileName,
      size: schema.productVersions.size,
      isCurrent: schema.productVersions.isCurrent,
      createdAt: schema.productVersions.createdAt,
    })
    .from(schema.productVersions)
    .where(eq(schema.productVersions.product, PRODUCT.slug))
    .orderBy(desc(schema.productVersions.createdAt));

  return (
    <div>
      <PageHeader title="Arquivos do robô" description="Versões do robô que o cliente baixa na Minha Conta. Só quem tem licença ativa consegue baixar." />
      <Flash msg={msg} />
      <Panel title={`Enviar versão nova - ${PRODUCT.name}`} className="mb-6">
        <form action="/api/admin/upload" method="post" encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
          <input name="version" required placeholder="Versão (ex.: 1.02)" className={adminInput} />
          <input name="file" type="file" required className={`${adminInput} file:mr-3 file:rounded-full file:border-0 file:bg-brand-accent file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-bg`} />
          <textarea
            name="notes"
            rows={3}
            placeholder="O que mudou nessa versão - Português (aparece pro cliente)"
            className={`${adminInput} sm:col-span-2`}
          />
          <textarea name="notes_en" rows={2} placeholder="Mesma observação em Inglês" className={adminInput} />
          <textarea name="notes_es" rows={2} placeholder="Mesma observação em Espanhol" className={adminInput} />
          <label className="flex items-center gap-2 text-sm text-brand-ink">
            <input type="checkbox" name="current" defaultChecked /> Marcar como versão atual
          </label>
          <div className="sm:text-right">
            <button type="submit" className={adminBtn}>
              Enviar arquivo
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-brand-ink-dim">
          Preencha a observação nos 3 idiomas: o cliente vê a do idioma dele (sem tradução, aparece a em Português). Até 4 MB por arquivo. Pra mandar .ex4 + .set + manual juntos, compacte num .zip.
        </p>
      </Panel>

      <Panel title={`Versões (${versions.length})`}>
        {versions.length === 0 && <p className="text-sm text-brand-ink-dim">Nenhum arquivo enviado ainda.</p>}
        <ul className="flex flex-col gap-3">
          {versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-brand-surface-2 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
                  {v.version} {v.isCurrent && <Badge tone="ok">Atual</Badge>}
                </p>
                <p className="text-xs text-brand-ink-dim">
                  {v.fileName} · {(v.size / 1024).toFixed(0)} KB · {fmtDate(v.createdAt)}
                </p>
                {v.notes && <p className="mt-1 whitespace-pre-line text-xs text-brand-ink-dim">{v.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/api/download/${v.id}`} className={adminBtnGhost}>
                  Baixar
                </a>
                {!v.isCurrent && (
                  <form action={setCurrentVersionAction}>
                    <input type="hidden" name="versionId" value={v.id} />
                    <input type="hidden" name="back" value="/admin/files" />
                    <button type="submit" className={adminBtnGhost}>
                      Marcar como atual
                    </button>
                  </form>
                )}
                <form action={deleteVersionAction}>
                  <input type="hidden" name="versionId" value={v.id} />
                  <input type="hidden" name="back" value="/admin/files" />
                  <button type="submit" className={adminBtnDanger}>
                    Apagar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

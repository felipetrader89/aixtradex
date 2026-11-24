import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { PRODUCT } from "@/lib/plans";
import { logEvent } from "@/lib/config";

// Upload de versão nova do robô (formulário do /admin/files). Limite: ~4 MB por envio.
const MAX_BYTES = 4 * 1024 * 1024;

// Redirect relativo: atrás do Caddy o request.url é http://localhost:3100, então não dá pra montar URL absoluta com ele.
function backTo(_request: Request, msg: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/admin/files?msg=${encodeURIComponent(msg)}` },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });

  const form = await request.formData();
  const version = String(form.get("version") ?? "").trim().slice(0, 32);
  // Observação por idioma: o cliente vê a do idioma dele (PT é a principal e vale de reserva).
  const note = (name: string) => String(form.get(name) ?? "").trim().slice(0, 2000);
  const notes = note("notes") || null;
  const notesI18n = { pt: note("notes") || undefined, en: note("notes_en") || undefined, es: note("notes_es") || undefined };
  const makeCurrent = form.get("current") === "on";

  // Um arquivo por idioma (o cliente baixa o do idioma dele). "file" = arquivo único, sem idioma.
  const files: { lang: string; file: File }[] = [];
  for (const [field, lang] of [["file_pt", "pt"], ["file_en", "en"], ["file_es", "es"], ["file", ""]] as const) {
    const value = form.get(field);
    if (value instanceof File && value.size > 0) files.push({ lang, file: value });
  }

  if (!version) return backTo(request, "Informe o número da versão.");
  if (files.length === 0) return backTo(request, "Escolha pelo menos um arquivo.");
  if (files.some((f) => f.file.size > MAX_BYTES)) return backTo(request, "Arquivo maior que 4 MB. Compacte em .zip.");

  // Nome que o cliente recebe: o mesmo nos 3 idiomas (assim a versão nova substitui a antiga no MT4).
  const main = files[0].file;
  const [created] = await db()
    .insert(schema.productVersions)
    .values({
      product: PRODUCT.slug,
      version,
      notes,
      notesI18n,
      // Nome base, sem o idioma (o download acrescenta " PT"/" EN"/" ES" conforme o arquivo).
      fileName: main.name.replace(/ (PT|EN|ES)(\.\w+)$/i, "$2").slice(0, 120),
      size: main.size,
      isCurrent: false,
    })
    .returning({ id: schema.productVersions.id });
  for (const { lang, file } of files) {
    const dataBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    await db().insert(schema.productFiles).values({ versionId: created.id, lang, size: file.size, dataBase64 });
  }
  if (makeCurrent) {
    await db().transaction(async (tx) => {
      await tx
        .update(schema.productVersions)
        .set({ isCurrent: false })
        .where(eq(schema.productVersions.product, PRODUCT.slug));
      await tx.update(schema.productVersions).set({ isCurrent: true }).where(eq(schema.productVersions.id, created.id));
    });
  }
  const langs = files.map((f) => f.lang.toUpperCase() || "único").join("/");
  await logEvent(user.email, "files.upload", `${version} · ${main.name} · ${langs}${makeCurrent ? " · atual" : ""}`);
  return backTo(request, `Versão ${version} enviada.`);
}

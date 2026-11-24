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
  const file = form.get("file");
  const version = String(form.get("version") ?? "").trim().slice(0, 32);
  // Observação por idioma: o cliente vê a do idioma dele (PT é a principal e vale de reserva).
  const note = (name: string) => String(form.get(name) ?? "").trim().slice(0, 2000);
  const notes = note("notes") || null;
  const notesI18n = { pt: note("notes") || undefined, en: note("notes_en") || undefined, es: note("notes_es") || undefined };
  const makeCurrent = form.get("current") === "on";

  if (!version) return backTo(request, "Informe o número da versão.");
  if (!(file instanceof File) || file.size === 0) return backTo(request, "Escolha um arquivo.");
  if (file.size > MAX_BYTES) return backTo(request, "Arquivo maior que 4 MB. Compacte em .zip.");

  const dataBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const [created] = await db()
    .insert(schema.productVersions)
    .values({
      product: PRODUCT.slug,
      version,
      notes,
      notesI18n,
      fileName: file.name.slice(0, 120),
      size: file.size,
      isCurrent: false,
    })
    .returning({ id: schema.productVersions.id });
  await db().insert(schema.productFiles).values({ versionId: created.id, dataBase64 });
  if (makeCurrent) {
    await db().transaction(async (tx) => {
      await tx
        .update(schema.productVersions)
        .set({ isCurrent: false })
        .where(eq(schema.productVersions.product, PRODUCT.slug));
      await tx.update(schema.productVersions).set({ isCurrent: true }).where(eq(schema.productVersions.id, created.id));
    });
  }
  await logEvent(user.email, "files.upload", `${version} · ${file.name} · ${(file.size / 1024).toFixed(0)} KB${makeCurrent ? " · atual" : ""}`);
  return backTo(request, `Versão ${version} enviada.`);
}

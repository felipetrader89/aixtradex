import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { PRODUCT } from "@/lib/plans";

// Upload de versão nova do robô (formulário do /admin/files). Limite da Vercel: ~4 MB por envio.
const MAX_BYTES = 4 * 1024 * 1024;

function backTo(request: Request, msg: string) {
  const url = new URL("/admin/files", request.url);
  url.searchParams.set("msg", msg);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  const version = String(form.get("version") ?? "").trim().slice(0, 32);
  const notes = String(form.get("notes") ?? "").trim().slice(0, 2000) || null;
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
      fileName: file.name.slice(0, 120),
      size: file.size,
      isCurrent: false,
    })
    .returning({ id: schema.productVersions.id });
  await db().insert(schema.productFiles).values({ versionId: created.id, dataBase64 });
  if (makeCurrent) {
    await db().batch([
      db()
        .update(schema.productVersions)
        .set({ isCurrent: false })
        .where(eq(schema.productVersions.product, PRODUCT.slug)),
      db().update(schema.productVersions).set({ isCurrent: true }).where(eq(schema.productVersions.id, created.id)),
    ]);
  }
  return backTo(request, `Versão ${version} enviada.`);
}

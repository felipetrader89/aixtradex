import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { licenseState } from "@/lib/licensing";

// Download do robô: só pra quem tem licença ativa do produto (ou admin).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [version] = await db().select().from(schema.productVersions).where(eq(schema.productVersions.id, id));
  if (!version) return new Response("Not found", { status: 404 });

  if (!user.isAdmin) {
    const licenses = await db().select().from(schema.licenses).where(eq(schema.licenses.userId, user.id));
    const allowed = licenses.some((l) => l.product === version.product && licenseState(l) === "active");
    if (!allowed) return new Response("Forbidden", { status: 403 });
  }

  const [file] = await db().select().from(schema.productFiles).where(eq(schema.productFiles.versionId, id));
  if (!file) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(file.dataBase64, "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${version.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}

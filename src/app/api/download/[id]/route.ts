import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { licenseState } from "@/lib/licensing";

// Download do robô: só pra quem tem licença ativa do produto (ou admin).
// ?lang=pt|en|es escolhe o arquivo do idioma; se a versão não tiver esse idioma, vai o arquivo único, depois inglês.
const FALLBACK = ["", "en", "pt", "es"];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const wanted = new URL(request.url).searchParams.get("lang") ?? "";
  const files = await db().select().from(schema.productFiles).where(eq(schema.productFiles.versionId, id));
  const file = [wanted, ...FALLBACK].map((lang) => files.find((f) => f.lang === lang)).find(Boolean) ?? files[0];
  if (!file) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(file.dataBase64, "base64");
  // Arquivo por idioma sai com o idioma no nome (ex.: "Ai X PULSE RS v6.6 VIP PT.ex4") - dá pra guardar os 3 lado a lado.
  const name = file.lang ? version.fileName.replace(/(\.\w+)$/, ` ${file.lang.toUpperCase()}$1`) : version.fileName;
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name.replace(/[^\w.\- ]/g, "_")}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/features/auth/session";
import { parseBackup, restoreBackup } from "@/features/backup/service";

const MAX_BACKUP_BYTES = 10_000_000;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return new Response("Origem inválida", { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("backup");
    if (formData.get("confirmation") !== "RESTAURAR") throw new Error("confirmation");
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_BACKUP_BYTES) throw new Error("file");
    const data = parseBackup(JSON.parse(await file.text()));
    await restoreBackup(data, user.id);
    return NextResponse.redirect(new URL("/backup?restaurado=1", request.url), 303);
  } catch (error) {
    console.error("Falha ao restaurar backup", error);
    return NextResponse.redirect(new URL("/backup?erro=1", request.url), 303);
  }
}

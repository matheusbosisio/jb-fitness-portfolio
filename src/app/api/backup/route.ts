import { getCurrentUser } from "@/features/auth/session";
import { createBackup } from "@/features/backup/service";

export async function GET() {
  if (!await getCurrentUser()) return new Response("Não autorizado", { status: 401 });
  const backup = await createBackup();
  const date = backup.generatedAt.slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="jb-fitness-backup-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

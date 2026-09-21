import { createHash } from "node:crypto";

export type LoginLimitDatabase = {
  $queryRaw<T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
};

export function loginAccountKey(identifier: string) {
  return createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex");
}

// PostgreSQL serializes the conflicting UPSERTs. Reserve BEFORE checking a
// password: concurrent requests, workers and restarts share the same budget.
async function reserve(db: LoginLimitDatabase, key: string, limit: number, seconds: number) {
  const rows = await db.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "login_attempts" ("key", "attempts", "reset_at")
    VALUES (${key}, 1, statement_timestamp() + ${seconds} * interval '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "login_attempts"."reset_at" <= statement_timestamp()
        THEN 1 ELSE "login_attempts"."attempts" + 1 END,
      "reset_at" = CASE WHEN "login_attempts"."reset_at" <= statement_timestamp()
        THEN statement_timestamp() + ${seconds} * interval '1 second'
        ELSE "login_attempts"."reset_at" END
    WHERE "login_attempts"."reset_at" <= statement_timestamp()
       OR "login_attempts"."attempts" < ${limit}
    RETURNING "attempts"
  `;
  return rows.length === 1;
}

export async function reserveLoginAttempt(db: LoginLimitDatabase, identifier: string) {
  // Callers pass a persisted user ID. No client-supplied IP or global bucket
  // can reset this budget or lock unrelated accounts.
  await db.$executeRaw`DELETE FROM "login_attempts" WHERE "reset_at" <= statement_timestamp()`;
  return reserve(db, loginAccountKey(identifier), 5, 15 * 60);
}

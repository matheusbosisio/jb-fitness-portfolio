CREATE TABLE "login_attempts" (
  "key" VARCHAR(64) PRIMARY KEY,
  "attempts" INTEGER NOT NULL CHECK ("attempts" > 0),
  "reset_at" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "login_attempts_reset_at_idx" ON "login_attempts" ("reset_at");

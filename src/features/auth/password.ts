import { hash, verify } from "@node-rs/argon2";

const PASSWORD_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$JTi1tPeSuv4yjPjaU6Uv4w$qH5TA9fQzBRPGsqaKDf2assSds1Qt23MXfBMZ0UB4PI";

export function hashPassword(password: string) {
  return hash(password, PASSWORD_OPTIONS);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}

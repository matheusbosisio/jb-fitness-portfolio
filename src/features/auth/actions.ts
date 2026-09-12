"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "node:crypto";

import { prisma } from "@/server/db/client";
import {
  DUMMY_PASSWORD_HASH,
  verifyPassword,
} from "@/features/auth/password";
import { createSession, deleteSession } from "@/features/auth/session";
import { loginSchema, type LoginState } from "@/features/auth/validation";
import { loginRateLimiter } from "@/features/auth/login-rate-limit";

async function loginAttemptKey() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwardedFor || requestHeaders.get("x-real-ip") || "local";
  return createHash("sha256").update(address).digest("hex");
}

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Informe um e-mail e uma senha válidos." };
  }

  const { email, password } = parsed.data;
  const attemptKey = await loginAttemptKey();
  if (loginRateLimiter.isBlocked(attemptKey)) {
    return { error: "Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, active: true, passwordHash: true },
    });

    const passwordMatches = await verifyPassword(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      password,
    );

    if (!user || !user.active || !passwordMatches) {
      loginRateLimiter.recordFailure(attemptKey);
      return { error: "E-mail ou senha incorretos." };
    }

    loginRateLimiter.clear(attemptKey);
    await createSession(user.id);
  } catch (error) {
    console.error("Falha ao autenticar usuário", error);
    return { error: "Não foi possível entrar agora. Tente novamente." };
  }

  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

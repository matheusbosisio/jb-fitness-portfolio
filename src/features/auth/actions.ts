"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/server/db/client";
import {
  DUMMY_PASSWORD_HASH,
  verifyPassword,
} from "@/features/auth/password";
import { createSession, deleteSession } from "@/features/auth/session";
import { loginSchema, type LoginState } from "@/features/auth/validation";
import { reserveLoginAttempt } from "@/features/auth/login-rate-limit";

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
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, active: true, passwordHash: true },
    });

    // Only persisted accounts create buckets: arbitrary names cannot grow the table.
    // Key by stable user ID so aliases/renames cannot reset the password budget.
    if (user && !await reserveLoginAttempt(prisma, user.id)) {
      return { error: "Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente." };
    }

    const passwordMatches = await verifyPassword(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      password,
    );

    if (!user || !user.active || !passwordMatches) {
      return { error: "E-mail ou senha incorretos." };
    }

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

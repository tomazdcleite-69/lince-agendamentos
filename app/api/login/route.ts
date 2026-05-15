import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE,
} from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase";

export const runtime = "nodejs";

const cookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message, success: false }, { status });
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Envie e-mail e senha em JSON.");
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password =
    typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    return errorResponse("Informe e-mail e senha.");
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return errorResponse("E-mail ou senha inválidos.", 401);
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_ACCESS_TOKEN_COOKIE, data.session.access_token, {
    ...cookieOptions,
    maxAge: data.session.expires_in,
  });
  cookieStore.set(ADMIN_REFRESH_TOKEN_COOKIE, data.session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({
    success: true,
    user: {
      email: data.user.email,
      id: data.user.id,
    },
  });
}

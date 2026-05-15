import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE,
} from "@/lib/auth";

export const runtime = "nodejs";

const expiredCookieOptions = {
  httpOnly: true,
  maxAge: 0,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_ACCESS_TOKEN_COOKIE, "", expiredCookieOptions);
  cookieStore.set(ADMIN_REFRESH_TOKEN_COOKIE, "", expiredCookieOptions);

  return NextResponse.json({ success: true });
}

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken, checkPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let password = "";
  try {
    const body = await request.json();
    password = String(body?.password ?? "");
  } catch {
    return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!checkPassword(password)) {
    return Response.json({ ok: false, error: "Sai mật khẩu" }, { status: 401 });
  }
  const c = await cookies();
  c.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json().catch(() => ({}));
  const pin = typeof body.pin === "string" ? body.pin : "";

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.pinHash) return NextResponse.json({ error: "No PIN set on this account" }, { status: 400 });

  const valid = await bcrypt.compare(pin, user.pinHash);
  if (!valid) return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}

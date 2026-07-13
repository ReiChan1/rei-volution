import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pinSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = pinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a 6-digit PIN" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
  });

  if (!user?.pinHash) {
    return NextResponse.json({ error: "No PIN set on this account" }, { status: 400 });
  }

  const valid = await bcrypt.compare(parsed.data.pin, user.pinHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

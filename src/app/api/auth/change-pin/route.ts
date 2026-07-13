import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  currentPin: z.string().regex(/^\d{6}$/, "Enter your current 6-digit PIN"),
  newPin: z.string().regex(/^\d{6}$/, "New PIN must be 6 digits"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.pinHash) return NextResponse.json({ error: "No PIN set on this account" }, { status: 400 });

  const valid = await bcrypt.compare(parsed.data.currentPin, user.pinHash);
  if (!valid) return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 403 });

  const pinHash = await bcrypt.hash(parsed.data.newPin, 12);
  await prisma.user.update({ where: { id: userId }, data: { pinHash } });

  return NextResponse.json({ ok: true });
}

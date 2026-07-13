import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const settingsSchema = z.object({
  currency: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  dateFormat: z.string().min(1).optional(),
  monthlyBudget: z.coerce.number().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true, timezone: true, theme: true } }),
    prisma.settings.findUnique({ where: { userId } }),
  ]);

  return NextResponse.json({
    currency: user?.currency ?? "USD",
    timezone: user?.timezone ?? "UTC",
    dateFormat: settings?.dateFormat ?? "MM/dd/yyyy",
    monthlyBudget: settings?.monthlyBudget ?? null,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { currency, timezone, dateFormat, monthlyBudget } = parsed.data;

  if (currency || timezone) {
    await prisma.user.update({
      where: { id: userId },
      data: { ...(currency ? { currency } : {}), ...(timezone ? { timezone } : {}) },
    });
  }

  await prisma.settings.upsert({
    where: { userId },
    update: { ...(dateFormat ? { dateFormat } : {}), ...(monthlyBudget !== undefined ? { monthlyBudget } : {}) },
    create: { userId, dateFormat: dateFormat ?? "MM/dd/yyyy", monthlyBudget: monthlyBudget ?? undefined },
  });

  return NextResponse.json({ ok: true });
}

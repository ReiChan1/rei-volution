import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "month"; // week | month | all

  const now = new Date();
  let from: Date | undefined;
  if (range === "week") {
    from = new Date(now);
    from.setDate(now.getDate() - now.getDay());
    from = startOfDay(from);
  } else if (range === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const records = await prisma.attendance.findMany({
    where: { userId, ...(from ? { date: { gte: from } } : {}) },
    orderBy: { date: "desc" },
  });

  const today = await prisma.attendance.findFirst({
    where: { userId, date: startOfDay(now) },
  });

  type Rec = { status: string; totalHours: number };
  const present = (records as Rec[]).filter((r) => r.status === "present" || r.status === "late" || r.status === "half_day").length;
  const total = records.length || 1;
  const attendancePct = Math.round((present / total) * 100);
  const totalHours = (records as Rec[]).reduce((s, r) => s + r.totalHours, 0);
  const lateCount = (records as Rec[]).filter((r) => r.status === "late").length;

  return NextResponse.json({
    records,
    today,
    stats: { attendancePct, totalHours, lateCount, count: records.length },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const date = body.date ? startOfDay(new Date(body.date)) : startOfDay(new Date());
  const status = body.status ?? "present";

  const existing = await prisma.attendance.findFirst({ where: { userId, date } });
  if (existing) {
    return NextResponse.json({ error: "A record already exists for this date" }, { status: 409 });
  }

  const record = await prisma.attendance.create({
    data: { userId, date, status },
  });

  return NextResponse.json(record, { status: 201 });
}

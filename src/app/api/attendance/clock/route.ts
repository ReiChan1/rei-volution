import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const STEP_ORDER = ["timeIn", "lunchOut", "lunchIn", "timeOut"] as const;
type Step = (typeof STEP_ORDER)[number];

function computeHours(a: { timeIn: Date | null; lunchOut: Date | null; lunchIn: Date | null; timeOut: Date | null }) {
  if (!a.timeIn || !a.timeOut) return 0;
  let ms = a.timeOut.getTime() - a.timeIn.getTime();
  if (a.lunchOut && a.lunchIn) {
    ms -= a.lunchIn.getTime() - a.lunchOut.getTime();
  }
  return Math.max(0, Math.round((ms / 3600000) * 100) / 100);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json().catch(() => ({}));
  const step: Step | undefined = body.step;
  if (!step || !STEP_ORDER.includes(step)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  const today = startOfDay(new Date());
  const now = new Date();

  let record = await prisma.attendance.findFirst({ where: { userId, date: today } });

  if (step === "timeIn") {
    if (record) return NextResponse.json({ error: "Already clocked in today" }, { status: 400 });
    const shiftStart = new Date(today);
    shiftStart.setHours(9, 0, 0, 0);
    const lateMinutes = now > shiftStart ? Math.round((now.getTime() - shiftStart.getTime()) / 60000) : 0;
    record = await prisma.attendance.create({
      data: {
        userId,
        date: today,
        timeIn: now,
        status: lateMinutes > 0 ? "late" : "present",
        lateMinutes,
      },
    });
    return NextResponse.json(record, { status: 201 });
  }

  if (!record) return NextResponse.json({ error: "Clock in first" }, { status: 400 });

  const data: Record<string, unknown> = { [step]: now };
  const updated = await prisma.attendance.update({ where: { id: record.id }, data });

  if (step === "timeOut") {
    const hours = computeHours(updated);
    const final = await prisma.attendance.update({
      where: { id: record.id },
      data: { totalHours: hours, overtimeMins: hours > 8 ? Math.round((hours - 8) * 60) : 0 },
    });
    return NextResponse.json(final);
  }

  return NextResponse.json(updated);
}

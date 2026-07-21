import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Normalizes date to midnight in local time (or Asia/Manila offset +08:00)
function getTodayDateString(d: Date = new Date()): Date {
  // Uses local date string format YYYY-MM-DD to avoid UTC offset rollbacks
  const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
  return new Date(`${localIso}T00:00:00.000Z`);
}

const STEP_ORDER = ["timeIn", "lunchOut", "lunchIn", "timeOut"] as const;
type Step = (typeof STEP_ORDER)[number];

function computeHours(a: {
  timeIn: Date | null;
  lunchOut: Date | null;
  lunchIn: Date | null;
  timeOut: Date | null;
}) {
  if (!a.timeIn || !a.timeOut) return 0;
  let ms = a.timeOut.getTime() - a.timeIn.getTime();
  if (a.lunchOut && a.lunchIn) {
    ms -= a.lunchIn.getTime() - a.lunchOut.getTime();
  }
  return Math.max(0, Math.round((ms / 3600000) * 100) / 100);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const body = await req.json().catch(() => ({}));
  const step: Step | undefined = body.step;
  if (!step || !STEP_ORDER.includes(step)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  const now = new Date();
  const today = getTodayDateString(now);

  // Fetch today's existing record for the user
  let record = await prisma.attendance.findFirst({
    where: { userId, date: today },
  });

  // Fetch user settings for standard work schedule (or fallback to defaults)
  const userSettings = await prisma.user.findUnique({
    where: { id: userId },
    select: { workTimeIn: true, expectedHours: true },
  });

  const targetWorkIn = userSettings?.workTimeIn || "08:00";
  const [targetHour, targetMin] = targetWorkIn.split(":").map(Number);

  if (step === "timeIn") {
    // RECOVERY FIX: Return the existing record so the UI updates and recovers state
    if (record) {
      return NextResponse.json(
        {
          error: "Already clocked in today",
          record,
        },
        { status: 400 }
      );
    }

    // Dynamic shift calculation based on Settings
    const shiftStart = new Date(now);
    shiftStart.setHours(targetHour, targetMin, 0, 0);

    const lateMinutes =
      now > shiftStart
        ? Math.round((now.getTime() - shiftStart.getTime()) / 60000)
        : 0;

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

  // If trying to do lunchOut / lunchIn / timeOut without a clock-in record
  if (!record) {
    return NextResponse.json({ error: "Clock in first" }, { status: 400 });
  }

  const data: Record<string, unknown> = { [step]: now };

  if (step === "timeOut") {
    const tempRecord = { ...record, timeOut: now };
    const hours = computeHours(tempRecord);
    const expected = userSettings?.expectedHours ?? 8;

    data.timeOut = now;
    data.totalHours = hours;
    data.overtimeMins =
      hours > expected ? Math.round((hours - expected) * 60) : 0;
  }

  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data,
  });

  return NextResponse.json(updated);
}

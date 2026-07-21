import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Converts current time to local date string (YYYY-MM-DD) to query start of day
function getTodayDateString(d: Date = new Date()): Date {
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

  // Fetch today's existing attendance record
  let record = await prisma.attendance.findFirst({
    where: { userId, date: today },
  });

  // Fetch settings via the related `settings` relation on User
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      settings: {
        select: {
          workTimeIn: true,
          expectedHours: true,
        },
      },
    },
  });

  const targetWorkIn = user?.settings?.workTimeIn || "08:00";
  const [targetHour, targetMin] = targetWorkIn.split(":").map(Number);

  if (step === "timeIn") {
    // RECOVERY: Return the existing record so the UI can update its state
    if (record) {
      return NextResponse.json(
        {
          error: "Already clocked in today",
          record,
        },
        { status: 400 }
      );
    }

    // Dynamic late minute calculation based on user settings
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

  // If clocking lunch or out without an initial timeIn record
  if (!record) {
    return NextResponse.json({ error: "Clock in first" }, { status: 400 });
  }

  const data: Record<string, unknown> = { [step]: now };

  if (step === "timeOut") {
    const tempRecord = { ...record, timeOut: now };
    const hours = computeHours(tempRecord);
    const expected = user?.settings?.expectedHours ?? 8;

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

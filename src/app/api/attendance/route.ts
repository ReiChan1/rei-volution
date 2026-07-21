import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper to calculate total hours worked
function computeHours(
  timeIn: Date | null,
  lunchOut: Date | null,
  lunchIn: Date | null,
  timeOut: Date | null
) {
  if (!timeIn || !timeOut) return 0;
  let ms = timeOut.getTime() - timeIn.getTime();
  if (lunchOut && lunchIn) {
    ms -= lunchIn.getTime() - lunchOut.getTime();
  }
  return Math.max(0, Math.round((ms / 3600000) * 100) / 100);
}

// Helper to construct ISO string with local timezone offset (+08:00)
function createLocalDate(dateStr: string, timeStr?: string | null): Date | null {
  if (!timeStr) return null;
  // Expresses explicitly as UTC+08:00 (Philippine Standard Time)
  return new Date(`${dateStr}T${timeStr}:00.000+08:00`);
}

// GET: Fetch history + today's active record
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  // Fetch full history
  const history = await prisma.attendance.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
  });

  // Calculate today's date in local YYYY-MM-DD
  const now = new Date();
  const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  const todayRecord =
    history.find(
      (item) => new Date(item.date).toISOString().split("T")[0] === todayStr
    ) || null;

  return NextResponse.json({ history, todayRecord });
}

// POST: Manual Entry & Editing (AttendanceForm modal)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const body = await req.json();
  const { id, date, timeInStr, lunchOutStr, lunchInStr, timeOutStr, notes } = body;

  if (!date || !timeInStr) {
    return NextResponse.json({ error: "Date and Time In are required" }, { status: 400 });
  }

  // Parse dates with explicit Philippine Time offset (+08:00)
  const entryDate = new Date(`${date}T00:00:00.000+08:00`);
  const timeIn = createLocalDate(date, timeInStr);
  const lunchOut = createLocalDate(date, lunchOutStr);
  const lunchIn = createLocalDate(date, lunchInStr);
  const timeOut = createLocalDate(date, timeOutStr);

  const totalHours = computeHours(timeIn, lunchOut, lunchIn, timeOut);

  // Fetch user settings to check late status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: { select: { workTimeIn: true } } },
  });

  const targetWorkIn = user?.settings?.workTimeIn || "08:00";
  const shiftStart = new Date(`${date}T${targetWorkIn}:00.000+08:00`);
  const isLate = timeIn ? timeIn > shiftStart : false;

  const data = {
    userId,
    date: entryDate,
    timeIn,
    lunchOut,
    lunchIn,
    timeOut,
    notes,
    totalHours,
    status: isLate ? "late" : "present",
  };

  let record;
  if (id) {
    // Edit existing entry
    record = await prisma.attendance.update({
      where: { id },
      data,
    });
  } else {
    // Create new manual entry
    record = await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId,
          date: entryDate,
        },
      },
      update: data,
      create: data,
    });
  }

  return NextResponse.json(record);
}

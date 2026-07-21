import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Helper to combine a Date object or string with a "HH:mm" time string
function combineDateAndTime(dateStr: string | Date, timeStr?: string | null): Date | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// ---------------------------------------------------------------------------
// GET /api/attendance
// Supports query parameters: ?range=month | ?range=week | ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let whereClause: any = { userId: session.user.id };

    const now = new Date();

    if (range === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      whereClause.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (range === "week") {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: startOfWeek,
        lte: endOfWeek,
      };
    } else if (startDateParam || endDateParam) {
      whereClause.date = {};
      if (startDateParam) {
        whereClause.date.gte = new Date(startDateParam);
      }
      if (endDateParam) {
        const endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
        whereClause.date.lte = endDate;
      }
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/attendance
// Creates or logs attendance and calculates totals, late mins, and overtime
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const {
      date,
      timeInStr,
      lunchOutStr,
      lunchInStr,
      timeOutStr,
      notes,
      useDefaults = false,
    } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Fetch user schedule settings
    const userSettings = await prisma.settings.findUnique({
      where: { userId },
    });

    // Determine target time strings
    const finalTimeInStr = timeInStr || (useDefaults ? userSettings?.workTimeIn : null);
    const finalTimeOutStr = timeOutStr || (useDefaults ? userSettings?.workTimeOut : null);

    const timeIn = combineDateAndTime(date, finalTimeInStr);
    const lunchOut = combineDateAndTime(date, lunchOutStr);
    const lunchIn = combineDateAndTime(date, lunchInStr);
    const timeOut = combineDateAndTime(date, finalTimeOutStr);

    const expectedWorkInStr = userSettings?.workTimeIn || "08:00";
    const expectedWorkOutStr = userSettings?.workTimeOut || "17:00";
    const expectedHours = userSettings?.expectedHours || 8.0;

    const expectedTimeIn = combineDateAndTime(date, expectedWorkInStr);

    // 1. Calculate Late Minutes
    let lateMinutes = 0;
    if (timeIn && expectedTimeIn && timeIn > expectedTimeIn) {
      lateMinutes = Math.floor((timeIn.getTime() - expectedTimeIn.getTime()) / (1000 * 60));
    }

    // 2. Calculate Break Minutes
    let breakMinutes = 0;
    if (lunchOut && lunchIn && lunchIn > lunchOut) {
      breakMinutes = Math.floor((lunchIn.getTime() - lunchOut.getTime()) / (1000 * 60));
    }

    // 3. Calculate Total Worked Hours
    let totalHours = 0;
    if (timeIn && timeOut && timeOut > timeIn) {
      const grossMins = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60);
      const netMins = Math.max(0, grossMins - breakMinutes);
      totalHours = parseFloat((netMins / 60).toFixed(2));
    }

    // 4. Calculate Overtime & Undertime Minutes
    let overtimeMins = 0;
    let undertimeMins = 0;

    if (totalHours > 0) {
      const diffMins = Math.round((totalHours - expectedHours) * 60);
      if (diffMins > 0) {
        overtimeMins = diffMins;
      } else if (diffMins < 0) {
        undertimeMins = Math.abs(diffMins);
      }
    }

    // 5. Determine Status
    let status = "present";
    if (lateMinutes > 0) {
      status = "late";
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        date: new Date(date),
        timeIn,
        lunchOut,
        lunchIn,
        timeOut,
        status,
        lateMinutes,
        overtimeMins,
        undertimeMins,
        breakMinutes,
        expectedHours,
        totalHours,
        notes,
      },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json(
      { error: "Failed to create attendance entry" },
      { status: 500 }
    );
  }
}

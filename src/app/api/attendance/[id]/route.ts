import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attendanceEditSchema } from "@/lib/validations";

// Combines a record's calendar date with a "HH:mm" time-of-day string into
// a full timestamp. Returns null if no time was given.
function combine(date: Date, time?: string | null): Date | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function computeHours(
  timeIn: Date | null,
  timeOut: Date | null,
  lunchOut: Date | null,
  lunchIn: Date | null,
  breakMinutes: number
) {
  if (!timeIn || !timeOut) return 0;
  let ms = timeOut.getTime() - timeIn.getTime();
  if (lunchOut && lunchIn) ms -= lunchIn.getTime() - lunchOut.getTime();
  ms -= breakMinutes * 60000;
  return Math.max(0, Math.round((ms / 3600000) * 100) / 100);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.attendance.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = attendanceEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { status, timeIn, lunchOut, lunchIn, timeOut, breakMinutes, expectedHours, notes } = parsed.data;

  const timeInDate = combine(existing.date, timeIn);
  const lunchOutDate = combine(existing.date, lunchOut);
  const lunchInDate = combine(existing.date, lunchIn);
  const timeOutDate = combine(existing.date, timeOut);

  const totalHours = computeHours(timeInDate, timeOutDate, lunchOutDate, lunchInDate, breakMinutes);
  const diffHours = totalHours - expectedHours;
  const overtimeMins = diffHours > 0 ? Math.round(diffHours * 60) : 0;
  const undertimeMins = diffHours < 0 && timeInDate && timeOutDate ? Math.round(-diffHours * 60) : 0;

  const shiftStart = new Date(existing.date);
  shiftStart.setHours(9, 0, 0, 0);
  const lateMinutes =
    timeInDate && timeInDate > shiftStart ? Math.round((timeInDate.getTime() - shiftStart.getTime()) / 60000) : 0;

  const updated = await prisma.attendance.update({
    where: { id },
    data: {
      status,
      timeIn: timeInDate,
      lunchOut: lunchOutDate,
      lunchIn: lunchInDate,
      timeOut: timeOutDate,
      breakMinutes,
      expectedHours,
      totalHours,
      overtimeMins,
      undertimeMins,
      lateMinutes,
      notes: notes || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.attendance.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.attendance.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

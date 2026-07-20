import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CATEGORY_COLORS } from "@/lib/calendar";

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string().min(1),
  end: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean().default(true),
  type: z.enum(["meeting", "birthday", "event", "deadline"]).default("event"),
  color: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const events = await prisma.calendarEvent.findMany({
    where: { userId },
    include: { task: { select: { id: true, priority: true, status: true } } },
    orderBy: { start: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      start: new Date(parsed.data.start),
      end: parsed.data.end ? new Date(parsed.data.end) : null,
      startTime: parsed.data.startTime || null,
      endTime: parsed.data.endTime || null,
      allDay: parsed.data.allDay,
      type: parsed.data.type,
      color: parsed.data.color ?? CATEGORY_COLORS[parsed.data.type],
      userId,
    },
  });

  return NextResponse.json(event, { status: 201 });
}

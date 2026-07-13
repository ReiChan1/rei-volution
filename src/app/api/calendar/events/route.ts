import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1),
  start: z.string().min(1),
  end: z.string().optional(),
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

  const COLORS: Record<string, string> = {
    meeting: "#A78BDB",
    birthday: "#F3B988",
    deadline: "#F2A0B3",
    event: "#7FD1B9",
  };

  const event = await prisma.calendarEvent.create({
    data: {
      title: parsed.data.title,
      start: new Date(parsed.data.start),
      end: parsed.data.end ? new Date(parsed.data.end) : null,
      allDay: parsed.data.allDay,
      type: parsed.data.type,
      color: parsed.data.color ?? COLORS[parsed.data.type],
      userId,
    },
  });

  return NextResponse.json(event, { status: 201 });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CATEGORY_COLORS } from "@/lib/calendar-lib";

const eventEditSchema = z.object({
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.taskId) {
    return NextResponse.json(
      { error: "This event is linked to a task. Edit the task instead." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = eventEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const updated = await prisma.calendarEvent.update({
    where: { id },
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
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.taskId) {
    return NextResponse.json(
      { error: "This event is linked to a task. Delete the task instead." },
      { status: 400 }
    );
  }

  await prisma.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

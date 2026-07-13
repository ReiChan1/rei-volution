import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";

const STATUS_COLOR: Record<string, string> = {
  completed: "#7FD1B9",
  pending: "#F3B988",
  in_progress: "#A78BDB",
  cancelled: "#B9AEC7",
};

function colorFor(status: string, priority: string, dueDate: Date | null) {
  if (status === "completed") return STATUS_COLOR.completed;
  if (priority === "critical") return "#D9AEE8";
  if (dueDate && dueDate < new Date() && status !== "completed") return "#F2A0B3";
  return STATUS_COLOR[status] ?? STATUS_COLOR.pending;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Lightweight status-only update (e.g. checkbox toggle / drag on a board)
  if (body.status !== undefined && Object.keys(body).length === 1) {
    const updated = await prisma.task.update({
      where: { id },
      data: { status: body.status },
      include: { subtasks: true, labels: { include: { label: true } } },
    });
    await prisma.calendarEvent.updateMany({
      where: { taskId: id },
      data: { color: colorFor(updated.status, updated.priority, updated.dueDate) },
    });
    return NextResponse.json(updated);
  }

  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { subtasks, dueDate, ...rest } = parsed.data;
  const due = dueDate ? new Date(dueDate) : null;

  const updated = await prisma.task.update({
    where: { id },
    data: { ...rest, dueDate: due },
    include: { subtasks: true, labels: { include: { label: true } } },
  });

  const existingEvent = await prisma.calendarEvent.findUnique({ where: { taskId: id } });
  if (due) {
    if (existingEvent) {
      await prisma.calendarEvent.update({
        where: { taskId: id },
        data: {
          title: updated.title,
          start: due,
          allDay: !updated.dueTime,
          color: colorFor(updated.status, updated.priority, due),
        },
      });
    } else {
      await prisma.calendarEvent.create({
        data: {
          title: updated.title,
          start: due,
          allDay: !updated.dueTime,
          type: "task",
          color: colorFor(updated.status, updated.priority, due),
          taskId: updated.id,
          userId,
        },
      });
    }
  } else if (existingEvent) {
    await prisma.calendarEvent.delete({ where: { taskId: id } });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } }); // cascades to subtasks + calendar event
  return NextResponse.json({ ok: true });
}

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(status && status !== "all" ? { status } : {}),
      ...(priority && priority !== "all" ? { priority } : {}),
    },
    include: { subtasks: true, labels: { include: { label: true } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { subtasks, dueDate, ...rest } = parsed.data;
  const due = dueDate ? new Date(dueDate) : null;

  const task = await prisma.task.create({
    data: {
      ...rest,
      dueDate: due,
      userId,
      subtasks: subtasks?.length
        ? { create: subtasks.map((title) => ({ title })) }
        : undefined,
    },
    include: { subtasks: true, labels: { include: { label: true } } },
  });

  if (due) {
    await prisma.calendarEvent.create({
      data: {
        title: task.title,
        start: due,
        allDay: !task.dueTime,
        type: "task",
        color: colorFor(task.status, task.priority, due),
        taskId: task.id,
        userId,
      },
    });
  }

  return NextResponse.json(task, { status: 201 });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

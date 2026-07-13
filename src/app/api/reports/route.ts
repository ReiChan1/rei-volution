import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const reports = await prisma.report.findMany({
    where: { userId },
    include: { task: { select: { id: true, title: true } } },
    orderBy: { reportDate: "desc" },
  });

  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { reportDate, taskId, ...rest } = parsed.data;

  const report = await prisma.report.create({
    data: {
      ...rest,
      reportDate: new Date(reportDate),
      taskId: taskId || null,
      userId,
    },
    include: { task: { select: { id: true, title: true } } },
  });

  return NextResponse.json(report, { status: 201 });
}

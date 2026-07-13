import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.archived !== undefined && Object.keys(body).length === 1) {
    const updated = await prisma.expense.update({
      where: { id },
      data: { archived: body.archived },
      include: { category: true },
    });
    return NextResponse.json(updated);
  }

  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { category, date, ...rest } = parsed.data;

  let categoryRecord = await prisma.expenseCategory.findUnique({ where: { name: category } });
  if (!categoryRecord) {
    categoryRecord = await prisma.expenseCategory.create({ data: { name: category } });
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: { ...rest, date: new Date(date), categoryId: categoryRecord.id },
    include: { category: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

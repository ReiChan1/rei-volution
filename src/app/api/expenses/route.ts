import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") ?? "date_desc";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const archived = searchParams.get("archived") === "true";

  const [sortField, sortDir] = sort.split("_") as [string, "asc" | "desc"];
  const orderBy =
    sortField === "amount"
      ? { amount: sortDir }
      : sortField === "title"
      ? { title: sortDir }
      : { date: sortDir };

  const where = {
    userId,
    archived,
    ...(search
      ? { title: { contains: search, mode: "insensitive" } }
      : {}),
    ...(category && category !== "all" ? { category: { name: category } } : {}),
  };

  const [items, total, allForStats] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
    prisma.expense.findMany({ where: { userId, archived: false }, select: { amount: true, date: true } }),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  type StatRow = { amount: number; date: Date };
  const sum = (rows: StatRow[]) => rows.reduce((s, e) => s + e.amount, 0);
  const stats = {
    monthly: sum(allForStats.filter((e: StatRow) => e.date >= startOfMonth)),
    weekly: sum(allForStats.filter((e: StatRow) => e.date >= startOfWeek)),
    yearly: sum(allForStats.filter((e: StatRow) => e.date >= startOfYear)),
    total: sum(allForStats),
  };

  return NextResponse.json({ items, total, page, pageSize, stats });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { category, date, ...rest } = parsed.data;

  let categoryRecord = await prisma.expenseCategory.findUnique({ where: { name: category } });
  if (!categoryRecord) {
    categoryRecord = await prisma.expenseCategory.create({ data: { name: category } });
  }

  const expense = await prisma.expense.create({
    data: {
      ...rest,
      date: new Date(date),
      userId,
      categoryId: categoryRecord.id,
    },
    include: { category: true },
  });

  return NextResponse.json(expense, { status: 201 });
}

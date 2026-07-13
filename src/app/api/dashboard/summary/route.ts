import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [expenses, accounts, tasks, upcomingEvents, settings] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, archived: false },
      include: { category: true },
    }),
    prisma.savingsAccount.findMany({ where: { userId } }),
    prisma.task.findMany({ where: { userId } }),
    prisma.calendarEvent.findMany({
      where: { userId, start: { gte: now } },
      orderBy: { start: "asc" },
      take: 5,
    }),
    prisma.settings.findUnique({ where: { userId } }),
  ]);

  const monthlyExpenses = expenses
    .filter((e: { date: Date; amount: number }) => e.date >= startOfMonth)
    .reduce((s: number, e: { amount: number }) => s + e.amount, 0);

  const personalSavings = accounts
    .filter((a: { isCompany: boolean; balance: number }) => !a.isCompany)
    .reduce((s: number, a: { balance: number }) => s + a.balance, 0);
  const companySavings = accounts
    .filter((a: { isCompany: boolean; balance: number }) => a.isCompany)
    .reduce((s: number, a: { balance: number }) => s + a.balance, 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const name = e.category?.name ?? "Others";
    byCategory[name] = (byCategory[name] ?? 0) + e.amount;
  }

  const monthlyTrend: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const amount = expenses
      .filter((e: { date: Date; amount: number }) => e.date >= d && e.date < next)
      .reduce((s: number, e: { amount: number }) => s + e.amount, 0);
    monthlyTrend.push({ month: d.toLocaleString("en-US", { month: "short" }), amount });
  }

  return NextResponse.json({
    totalExpensesThisMonth: monthlyExpenses,
    monthlyBudget: settings?.monthlyBudget ?? null,
    personalSavings,
    companySavings,
    pendingTasks: tasks.filter((t: { status: string }) => t.status === "pending" || t.status === "in_progress").length,
    completedTasks: tasks.filter((t: { status: string }) => t.status === "completed").length,
    upcomingEvents,
    expensesByCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
    monthlyTrend,
  });
}

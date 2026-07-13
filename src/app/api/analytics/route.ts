import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);

  const [expenses, lastYearExpenses, savingsTx, tasks, attendance] = await Promise.all([
    prisma.expense.findMany({ where: { userId, archived: false, date: { gte: yearStart } }, include: { category: true } }),
    prisma.expense.findMany({ where: { userId, archived: false, date: { gte: lastYearStart, lt: yearStart } } }),
    prisma.savingsTransaction.findMany({
      where: { account: { userId } },
      orderBy: { date: "asc" },
      include: { account: { select: { isCompany: true } } },
    }),
    prisma.task.findMany({ where: { userId } }),
    prisma.attendance.findMany({ where: { userId, date: { gte: yearStart } } }),
  ]);

  type Row = { date: Date; amount: number };
  const monthlyExpenses: { month: string; amount: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), i, 1);
    const next = new Date(now.getFullYear(), i + 1, 1);
    const amount = (expenses as Row[]).filter((e) => e.date >= d && e.date < next).reduce((s, e) => s + e.amount, 0);
    monthlyExpenses.push({ month: d.toLocaleString("en-US", { month: "short" }), amount });
  }

  const thisYearTotal = (expenses as Row[]).reduce((s, e) => s + e.amount, 0);
  const lastYearTotal = (lastYearExpenses as Row[]).reduce((s, e) => s + e.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const name = e.category?.name ?? "Others";
    byCategory[name] = (byCategory[name] ?? 0) + e.amount;
  }

  let personalRunning = 0;
  let companyRunning = 0;
  const savingsGrowth: { date: string; personal: number; company: number }[] = [];
  for (const tx of savingsTx) {
    const delta = tx.type === "deposit" ? tx.amount : -tx.amount;
    if (tx.account.isCompany) companyRunning += delta;
    else personalRunning += delta;
    savingsGrowth.push({
      date: tx.date.toISOString().slice(0, 10),
      personal: Math.round(personalRunning * 100) / 100,
      company: Math.round(companyRunning * 100) / 100,
    });
  }

  const taskByStatus = ["pending", "in_progress", "completed", "cancelled"].map((status) => ({
    name: status.replace("_", " "),
    value: tasks.filter((t: { status: string }) => t.status === status).length,
  }));

  const taskByPriority = ["low", "medium", "high", "critical"].map((priority) => ({
    name: priority,
    value: tasks.filter((t: { priority: string }) => t.priority === priority).length,
  }));

  const completionRate = tasks.length
    ? Math.round((tasks.filter((t: { status: string }) => t.status === "completed").length / tasks.length) * 100)
    : 0;

  const attendanceRate = attendance.length
    ? Math.round(
        (attendance.filter((a: { status: string }) => ["present", "late", "half_day"].includes(a.status)).length /
          attendance.length) *
          100
      )
    : 0;

  return NextResponse.json({
    monthlyExpenses,
    yearComparison: { thisYear: thisYearTotal, lastYear: lastYearTotal },
    expensesByCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
    savingsGrowth: savingsGrowth.slice(-24),
    taskByStatus,
    taskByPriority,
    completionRate,
    attendanceRate,
  });
}

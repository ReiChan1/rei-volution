import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function generateNotifications(userId: string) {
  const now = new Date();
  const in2Days = new Date(now.getTime() + 2 * 86400000);
  const dedupSince = new Date(now.getTime() - 24 * 3600000);

  const dueSoonTasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ["pending", "in_progress"] },
      dueDate: { gte: now, lte: in2Days },
    },
  });

  for (const task of dueSoonTasks) {
    const already = await prisma.notification.findFirst({
      where: { userId, type: "task_due", title: task.title, createdAt: { gte: dedupSince } },
    });
    if (!already) {
      await prisma.notification.create({
        data: {
          userId,
          type: "task_due",
          title: task.title,
          message: `Due ${task.dueDate!.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — don't let this one slip.`,
        },
      });
    }
  }

  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (settings?.monthlyBudget) {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenses = await prisma.expense.findMany({
      where: { userId, archived: false, date: { gte: startOfMonth } },
      select: { amount: true },
    });
    const total = expenses.reduce((s: number, e: { amount: number }) => s + e.amount, 0);
    if (total > settings.monthlyBudget) {
      const already = await prisma.notification.findFirst({
        where: { userId, type: "budget_exceeded", createdAt: { gte: dedupSince } },
      });
      if (!already) {
        await prisma.notification.create({
          data: {
            userId,
            type: "budget_exceeded",
            title: "Monthly budget exceeded",
            message: `You've spent past your ${settings.monthlyBudget} budget for this month.`,
          },
        });
      }
    }
  }

  const accounts = await prisma.savingsAccount.findMany({ where: { userId, goal: { not: null } } });
  for (const acc of accounts) {
    if (acc.goal && acc.balance >= acc.goal) {
      const already = await prisma.notification.findFirst({
        where: { userId, type: "savings_goal", title: acc.name, createdAt: { gte: dedupSince } },
      });
      if (!already) {
        await prisma.notification.create({
          data: {
            userId,
            type: "savings_goal",
            title: acc.name,
            message: `You reached your savings goal for ${acc.name}! 🎉`,
          },
        });
      }
    }
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  await generateNotifications(userId).catch(() => {});

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const unreadCount = await prisma.notification.count({ where: { userId, read: false } });

  return NextResponse.json({ notifications, unreadCount });
}

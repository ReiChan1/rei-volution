"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Wallet,
  PiggyBank,
  ListChecks,
  CheckCircle2,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card";
import { formatCurrency, formatTimeOfDay, greeting, EVENT_CATEGORY_LABEL } from "@/lib/utils";

type Summary = {
  totalExpensesThisMonth: number;
  monthlyBudget: number | null;
  personalSavings: number;
  companySavings: number;
  pendingTasks: number;
  completedTasks: number;
  upcomingEvents: {
    id: string;
    title: string;
    start: string;
    color: string | null;
    type: string;
    allDay: boolean;
    startTime: string | null;
  }[];
  expensesByCategory: { name: string; value: number }[];
  monthlyTrend: { month: string; amount: number }[];
};

const PIE_COLORS = ["#A78BDB", "#7FD1B9", "#F3B988", "#F2A0B3", "#9FC4E8", "#D9AEE8", "#B8D98F"];

export default function DashboardOverviewPage() {
  const { data: session } = useSession();
  const currency = (session?.user as any)?.currency ?? "USD";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [now] = useState(new Date());

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((res) => res.json())
      .then(setSummary)
      .catch(() => {});
  }, []);

  const user = session?.user as any;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary via-[#C9A8E8] to-danger p-0 text-white">
        <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-white/70">
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
              {greeting(now)}, {user?.firstName ?? "there"}
            </h1>
            <p className="mt-2 text-sm text-white/70">
              {user?.jobPosition ?? "Team member"}
              {user?.companyName ? ` · ${user.companyName}` : ""}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-3 text-right backdrop-blur-sm">
            <p className="text-xs text-white/60">Today</p>
            <p className="font-display text-lg font-semibold">
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      </Card>

      {!summary ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Expenses this month"
            value={formatCurrency(summary.totalExpensesThisMonth, currency)}
            icon={Wallet}
            accent="amber"
            hint={summary.monthlyBudget ? `of ${formatCurrency(summary.monthlyBudget, currency)} budget` : undefined}
            delay={0}
          />
          <StatCard
            label="Personal savings"
            value={formatCurrency(summary.personalSavings, currency)}
            icon={PiggyBank}
            accent="teal"
            delay={0.05}
          />
          <StatCard
            label="Pending tasks"
            value={String(summary.pendingTasks)}
            icon={ListChecks}
            accent="primary"
            delay={0.1}
          />
          <StatCard
            label="Completed tasks"
            value={String(summary.completedTasks)}
            icon={CheckCircle2}
            accent="teal"
            delay={0.15}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending, last 6 months</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {summary && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.monthlyTrend}>
                  <defs>
                    <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 13,
                    }}
                    formatter={(value) => formatCurrency(Number(value), currency)}
                  />
                  <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2} fill="url(#spend)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {summary?.upcomingEvents.length ? (
                summary.upcomingEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: e.color ?? "var(--primary)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <span>{new Date(e.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        {!e.allDay && e.startTime && <span>· {formatTimeOfDay(e.startTime)}</span>}
                      </p>
                    </div>
                    <Badge variant="muted" className="shrink-0">{EVENT_CATEGORY_LABEL[e.type] ?? e.type}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Nothing scheduled yet. Add a task with a due date, or a new event on the calendar.</p>
              )}
            </div>
            <Link
              href="/dashboard/calendar"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Open calendar <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {summary && summary.expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.expensesByCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {summary.expensesByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted">
                No expenses logged yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-surface-2 p-4">
              <p className="text-xs text-muted">Company card</p>
              <p className="mt-1 font-display text-lg font-semibold text-primary">
                {summary ? formatCurrency(summary.companySavings, currency) : "—"}
              </p>
              <Badge variant="default" className="mt-2">
                Company
              </Badge>
            </div>
            <Link href="/dashboard/expenses" className="rounded-xl border border-dashed border-border p-4 transition-colors hover:border-primary hover:bg-surface-2">
              <p className="text-xs text-muted">Add expense</p>
              <p className="mt-1 flex items-center gap-1 text-sm font-medium text-primary">
                Go <ArrowUpRight className="h-3.5 w-3.5" />
              </p>
            </Link>
            <Link href="/dashboard/tasks" className="rounded-xl border border-dashed border-border p-4 transition-colors hover:border-primary hover:bg-surface-2">
              <p className="text-xs text-muted">Add task</p>
              <p className="mt-1 flex items-center gap-1 text-sm font-medium text-primary">
                Go <ArrowUpRight className="h-3.5 w-3.5" />
              </p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

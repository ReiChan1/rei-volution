"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/utils";

const PIE_COLORS = ["#A78BDB", "#7FD1B9", "#F3B988", "#F2A0B3", "#9FC4E8", "#D9AEE8", "#B8D98F"];
const STATUS_COLORS: Record<string, string> = {
  pending: "#F3B988",
  "in progress": "#A78BDB",
  completed: "#7FD1B9",
  cancelled: "#B9AEC7",
};

type Analytics = {
  monthlyExpenses: { month: string; amount: number }[];
  yearComparison: { thisYear: number; lastYear: number };
  expensesByCategory: { name: string; value: number }[];
  savingsGrowth: { date: string; personal: number; company: number }[];
  taskByStatus: { name: string; value: number }[];
  taskByPriority: { name: string; value: number }[];
  completionRate: number;
  attendanceRate: number;
};

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const currency = (session?.user as any)?.currency ?? "USD";
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  const yoyChange = data && data.yearComparison.lastYear > 0
    ? Math.round(((data.yearComparison.thisYear - data.yearComparison.lastYear) / data.yearComparison.lastYear) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted">Deeper comparisons across expenses, savings, tasks, and attendance. 🐾</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This year's spending"
          value={data ? formatCurrency(data.yearComparison.thisYear, currency) : "—"}
          icon={yoyChange !== null && yoyChange > 0 ? TrendingUp : TrendingDown}
          accent="amber"
          hint={yoyChange !== null ? `${yoyChange > 0 ? "+" : ""}${yoyChange}% vs last year` : "No prior-year data yet"}
        />
        <StatCard label="Task completion rate" value={data ? `${data.completionRate}%` : "—"} icon={CheckCircle2} accent="teal" />
        <StatCard label="Attendance rate" value={data ? `${data.attendanceRate}%` : "—"} icon={Clock} accent="primary" />
        <StatCard
          label="Last year total"
          value={data ? formatCurrency(data.yearComparison.lastYear, currency) : "—"}
          icon={TrendingDown}
          accent="danger"
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Monthly expenses, this year</CardTitle></CardHeader>
        <CardContent className="h-72">
          {data && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyExpenses}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, fontSize: 13 }}
                  formatter={(value) => formatCurrency(Number(value), currency)}
                />
                <Bar dataKey="amount" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Savings growth</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data && data.savingsGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.savingsGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, fontSize: 13 }}
                    formatter={(value) => formatCurrency(Number(value), currency)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="personal" name="Personal" stroke="var(--teal)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="company" name="Company" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted">Add a few savings transactions to see growth.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expenses by category</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data && data.expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.expensesByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {data.expensesByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted">No expenses yet this year.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tasks by status</CardTitle></CardHeader>
          <CardContent className="h-64">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.taskByStatus} layout="vertical">
                  <XAxis type="number" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={80} className="capitalize" />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, fontSize: 13 }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {data.taskByStatus.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? "var(--primary)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tasks by priority</CardTitle></CardHeader>
          <CardContent className="h-64">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.taskByPriority} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {data.taskByPriority.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

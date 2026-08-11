import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month"); // 1 = Jan, 12 = Dec

  if (!yearParam || !monthParam) {
    return NextResponse.json({ error: "Year and month query parameters are required" }, { status: 400 });
  }

  const year = parseInt(yearParam, 10);
  const month = parseInt(monthParam, 10) - 1; // Convert to 0-indexed month for JS Date

  const startDate = new Date(Date.UTC(year, month, 1));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  // Query database for all reports falling inside the target month
  const reports = await prisma.report.findMany({
    where: {
      userId,
      reportDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: { task: { select: { id: true, title: true } } },
    orderBy: { reportDate: "asc" },
  });

  if (reports.length === 0) {
    return NextResponse.json({ error: "No reports found for the selected month." }, { status: 404 });
  }

  // Compile individual entries into a single document format
  const monthName = startDate.toLocaleString("default", { month: "long", timeZone: "UTC" });
  const header = `MONTHLY REPORT SUMMARY: ${monthName.toUpperCase()} ${year}\nTotal Entries: ${reports.length}\n${"=".repeat(60)}\n\n`;

  const body = reports
    .map((report, index) => {
      const dateStr = new Date(report.reportDate).toISOString().split("T")[0];
      const taskTitle = report.task?.title ? `Task: ${report.task.title}` : "Task: Unassigned";
      const details = report.content || report.summary || JSON.stringify(report, null, 2);

      return `[Entry ${index + 1}] Date: ${dateStr}\n${taskTitle}\n${"-".repeat(30)}\nContent:\n${details}`;
    })
    .join("\n\n" + "=".repeat(60) + "\n\n");

  return NextResponse.json({
    year,
    month: month + 1,
    monthName,
    document: header + body,
  });
}

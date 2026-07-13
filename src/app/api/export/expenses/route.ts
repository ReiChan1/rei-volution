import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const expenses = await prisma.expense.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const header: string[] = ["Date", "Title", "Category", "Payment Method", "Amount", "Notes", "Archived"];
  const rows: string[][] = expenses.map((e: (typeof expenses)[number]) => [
    e.date.toISOString().slice(0, 10),
    e.title,
    e.category?.name ?? "Others",
    e.paymentMethod,
    e.amount.toFixed(2),
    e.notes ?? "",
    e.archived ? "Yes" : "No",
  ]);

  const csv = [header, ...rows]
    .map((row: string[]) => row.map((cell: string) => escapeCsv(String(cell))).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

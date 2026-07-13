import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savingsAccountSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const accounts = await prisma.savingsAccount.findMany({
    where: { userId },
    include: { transactions: { orderBy: { date: "desc" }, take: 10 } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json();
  const parsed = savingsAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const account = await prisma.savingsAccount.create({
    data: {
      ...parsed.data,
      isCompany: parsed.data.type === "company",
      userId,
    },
  });

  return NextResponse.json(account, { status: 201 });
}

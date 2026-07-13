import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savingsTransactionSchema } from "@/lib/validations";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const account = await prisma.savingsAccount.findFirst({ where: { id, userId } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = savingsTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { type, amount, notes } = parsed.data;
  if (type === "withdraw" && amount > account.balance) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  const newBalance = type === "deposit" ? account.balance + amount : account.balance - amount;

  const [, transaction] = await prisma.$transaction([
    prisma.savingsAccount.update({ where: { id }, data: { balance: newBalance } }),
    prisma.savingsTransaction.create({
      data: { type, amount, notes, accountId: id },
    }),
  ]);

  return NextResponse.json({ transaction, balance: newBalance }, { status: 201 });
}

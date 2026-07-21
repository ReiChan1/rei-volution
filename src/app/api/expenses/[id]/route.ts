import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.archived !== undefined && Object.keys(body).length === 1) {
    const updated = await prisma.expense.update({
      where: { id },
      data: { archived: body.archived },
      include: { category: true},
    });
    return NextResponse.json(updated);
  }

  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { category, date, savingsAccountId, amount, title, description, paymentMethod, notes } =
    parsed.data;

  let categoryRecord = await prisma.expenseCategory.findUnique({ where: { name: category } });
  if (!categoryRecord) {
    categoryRecord = await prisma.expenseCategory.create({ data: { name: category } });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const accountChanged = existing.savingsAccountId !== savingsAccountId;
      const amountChanged = existing.amount !== amount;

      if (accountChanged || amountChanged) {
        if (existing.savingsAccountId) {
          await tx.savingsAccount.update({
            where: { id: existing.savingsAccountId },
            data: { balance: { increment: existing.amount } },
          });

          await tx.savingsTransaction.create({
            data: {
              accountId: existing.savingsAccountId,
              type: "deposit",
              amount: existing.amount,
              notes: `Expense updated (refund): ${existing.title}`,
              date: new Date(),
            },
          });
        }

        const account = await tx.savingsAccount.findFirst({
          where: { id: savingsAccountId, userId },
        });

        if (!account) {
          throw new Error("Selected savings account was not found.");
        }

        if (account.balance < amount) {
          throw new Error(`Not enough balance in "${account.name}".`);
        }

        await tx.savingsAccount.update({
          where: { id: account.id },
          data: { balance: { decrement: amount } },
        });

        await tx.savingsTransaction.create({
          data: {
            accountId: account.id,
            type: "withdraw",
            amount,
            notes: notes ?? `Expense: ${title}`,
            date: new Date(date),
          },
        });
      }

      return tx.expense.update({
        where: { id },
        data: {
          title,
          description,
          amount,
          paymentMethod,
          notes,
          date: new Date(date),
          categoryId: categoryRecord.id,
          savingsAccountId,
        },
        include: { category: true, savingsAccount: true },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Unable to update expense." },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      if (existing.savingsAccountId) {
        await tx.savingsAccount.update({
          where: { id: existing.savingsAccountId },
          data: { balance: { increment: existing.amount } },
        });

        await tx.savingsTransaction.create({
          data: {
            accountId: existing.savingsAccountId,
            type: "deposit",
            amount: existing.amount,
            notes: `Expense deleted (refund): ${existing.title}`,
            date: new Date(),
          },
        });
      }

      await tx.expense.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Unable to delete expense." },
      { status: 400 }
    );
  }
}

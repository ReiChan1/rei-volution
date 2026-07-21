import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const expenseId = params.id;

  const body = await req.json();
  const parsed = expenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const {
    category,
    date,
    amount,
    title,
    description,
    paymentMethod,
    notes,
  } = parsed.data;

  // Find or create category record
  let categoryRecord = await prisma.expenseCategory.findUnique({
    where: { name: category },
  });

  if (!categoryRecord) {
    categoryRecord = await prisma.expenseCategory.create({
      data: { name: category },
    });
  }

  try {
    const updatedExpense = await prisma.expense.update({
      where: {
        id: expenseId,
        userId, // Ensure the expense belongs to the user
      },
      data: {
        title,
        description,
        amount,
        paymentMethod,
        date: new Date(date),
        notes,
        category: {
          connect: {
            id: categoryRecord.id,
          },
        },
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Failed to update expense." },
      { status: 400 }
    );
  }
}

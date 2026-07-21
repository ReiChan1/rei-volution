import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";

// Helper function to handle update logic for both PUT and PATCH
async function handleUpdate(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const resolvedParams = await params;
  const expenseId = resolvedParams.id;

  if (!expenseId) {
    return NextResponse.json(
      { error: "Missing expense ID" },
      { status: 400 }
    );
  }

  const body = await req.json();

  // Validate request body
  const parsed = expenseSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message,
      },
      {
        status: 400,
      }
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

  // Check if expense exists and belongs to user
  const existingExpense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      userId,
    },
  });

  if (!existingExpense) {
    return NextResponse.json(
      { error: "Expense not found" },
      { status: 404 }
    );
  }

  // Handle Category relation if provided
  let categoryConnect = undefined;
  if (category) {
    let categoryRecord = await prisma.expenseCategory.findUnique({
      where: { name: category },
    });

    if (!categoryRecord) {
      categoryRecord = await prisma.expenseCategory.create({
        data: { name: category },
      });
    }

    categoryConnect = {
      connect: { id: categoryRecord.id },
    };
  }

  try {
    const updatedExpense = await prisma.expense.update({
      where: {
        id: expenseId,
      },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(notes !== undefined && { notes }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(categoryConnect && { category: categoryConnect }),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message ?? "Failed to update expense.",
      },
      {
        status: 400,
      }
    );
  }
}

// 1. Export PATCH Handler
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(req, context);
}

// 2. Export PUT Handler
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(req, context);
}

// 3. Export DELETE Handler
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const resolvedParams = await params;
  const expenseId = resolvedParams.id;

  if (!expenseId) {
    return NextResponse.json(
      { error: "Missing expense ID" },
      { status: 400 }
    );
  }

  try {
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        userId,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    await prisma.expense.delete({
      where: {
        id: expenseId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message ?? "Failed to delete expense.",
      },
      {
        status: 400,
      }
    );
  }
}

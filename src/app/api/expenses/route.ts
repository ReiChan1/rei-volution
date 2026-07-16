import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") ?? "date_desc";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const archived = searchParams.get("archived") === "true";

  const [sortField, sortDir] = sort.split("_") as [
    string,
    "asc" | "desc"
  ];

  const orderBy =
    sortField === "amount"
      ? { amount: sortDir }
      : sortField === "title"
      ? { title: sortDir }
      : { date: sortDir };

  const where: Prisma.ExpenseWhereInput = {
    userId,
    archived,

    ...(search
      ? {
          title: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(category && category !== "all"
      ? {
          category: {
            name: category,
          },
        }
      : {}),
  };

  const [items, total, allForStats] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        category: true,
        savingsAccount: true,
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.expense.count({
      where,
    }),

    prisma.expense.findMany({
      where: {
        userId,
        archived: false,
      },
      select: {
        amount: true,
        date: true,
      },
    }),
  ]);

  const now = new Date();

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const startOfYear = new Date(
    now.getFullYear(),
    0,
    1
  );

  type StatRow = {
    amount: number;
    date: Date;
  };

  const sum = (rows: StatRow[]) =>
    rows.reduce((s,e)=>s+e.amount,0);

  const stats = {
    monthly: sum(
      allForStats.filter(e => e.date >= startOfMonth)
    ),

    weekly: sum(
      allForStats.filter(e => e.date >= startOfWeek)
    ),

    yearly: sum(
      allForStats.filter(e => e.date >= startOfYear)
    ),

    total: sum(allForStats),
  };

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    stats,
  });
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;

  const body = await req.json();

  const parsed = expenseSchema.safeParse(body);

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
    savingsAccountId,
    amount,
    title,
    description,
    paymentMethod,
    notes,
  } = parsed.data;

  let categoryRecord =
    await prisma.expenseCategory.findUnique({
      where: {
        name: category,
      },
    });

  if (!categoryRecord) {
    categoryRecord =
      await prisma.expenseCategory.create({
        data: {
          name: category,
        },
      });
  }

  try {
    const expense = await prisma.$transaction(
      async (tx) => {
        //------------------------------------------------------
        // Find account
        //------------------------------------------------------

        const account =
          await tx.savingsAccount.findFirst({
            where: {
              id: savingsAccountId,
              userId,
            },
          });

        if (!account) {
          throw new Error(
            "Selected savings account was not found."
          );
        }

        //------------------------------------------------------
        // Check balance
        //------------------------------------------------------

        if (account.balance < amount) {
          throw new Error(
            `Not enough balance in "${account.name}".`
          );
        }

        //------------------------------------------------------
        // Deduct balance
        //------------------------------------------------------

        await tx.savingsAccount.update({
          where: {
            id: account.id,
          },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        //------------------------------------------------------
        // Record withdrawal
        //------------------------------------------------------

        await tx.savingsTransaction.create({
          data: {
            accountId: account.id,
            type: "withdraw",
            amount,
            notes:
              notes ??
              `Expense: ${title}`,
            date: new Date(date),
          },
        });

        //------------------------------------------------------
        // Create expense
        //------------------------------------------------------

        return tx.expense.create({
          data: {
            title,
            description,
            amount,
            paymentMethod,
            date: new Date(date),
            notes,
            userId,

            categoryId: categoryRecord.id,

            savingsAccountId: account.id,
          },

          include: {
            category: true,
            savingsAccount: true,
          },
        });
      }
    );

    return NextResponse.json(
      expense,
      {
        status: 201,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ??
          "Unable to create expense.",
      },
      {
        status: 400,
      }
    );
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const {
      firstName,
      lastName,
      email,
      password,
      companyName,
      jobPosition,
      pin,
    } = parsed.data;

    const profileImage: string | null =
      typeof body.profileImage === "string" ? body.profileImage.slice(0, 2_000_000) : null;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const pinHash = await bcrypt.hash(pin, 12);

    let company = await prisma.company.findFirst({
      where: { name: companyName },
    });
    if (!company) {
      company = await prisma.company.create({ data: { name: companyName } });
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        passwordHash,
        pinHash,
        jobPosition,
        profileImage,
        companyId: company.id,
        settings: { create: {} },
      },
    });

    // Seed default expense categories on first signup if none exist yet.
    const categoryCount = await prisma.expenseCategory.count();
    if (categoryCount === 0) {
      const defaults = [
        "Food",
        "Transportation",
        "Shopping",
        "Bills",
        "Entertainment",
        "Health",
        "Education",
        "Subscriptions",
        "Office",
        "Others",
      ];
      try {
        await prisma.expenseCategory.createMany({
          data: defaults.map((name) => ({ name })),
        });
      } catch {
        // Another request seeded categories at the same moment — safe to ignore.
      }
    }

    return NextResponse.json(
      { id: user.id, email: user.email },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

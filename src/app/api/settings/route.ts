import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      monthlyBudget,
      dateFormat,
      notifyTaskDue,
      notifyBudget,
      notifySavingsGoal,
      notifyAttendance,
      workTimeIn,
      workTimeOut,
      expectedHours,
    } = body;

    const settings = await prisma.settings.upsert({
      where: { userId: session.user.id },
      update: {
        ...(monthlyBudget !== undefined && { monthlyBudget: parseFloat(monthlyBudget) }),
        ...(dateFormat && { dateFormat }),
        ...(notifyTaskDue !== undefined && { notifyTaskDue }),
        ...(notifyBudget !== undefined && { notifyBudget }),
        ...(notifySavingsGoal !== undefined && { notifySavingsGoal }),
        ...(notifyAttendance !== undefined && { notifyAttendance }),
        ...(workTimeIn !== undefined && { workTimeIn }),
        ...(workTimeOut !== undefined && { workTimeOut }),
        ...(expectedHours !== undefined && { expectedHours: parseFloat(expectedHours) }),
      },
      create: {
        userId: session.user.id,
        monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
        dateFormat: dateFormat || "MM/dd/yyyy",
        notifyTaskDue: notifyTaskDue ?? true,
        notifyBudget: notifyBudget ?? true,
        notifySavingsGoal: notifySavingsGoal ?? true,
        notifyAttendance: notifyAttendance ?? true,
        workTimeIn: workTimeIn || "08:00",
        workTimeOut: workTimeOut || "17:00",
        expectedHours: expectedHours ? parseFloat(expectedHours) : 8.0,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

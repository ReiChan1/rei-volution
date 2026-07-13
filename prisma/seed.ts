import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill in your Supabase connection strings."
  );
}

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  "Food", "Transportation", "Shopping", "Bills", "Entertainment",
  "Health", "Education", "Subscriptions", "Office", "Others",
];

async function main() {
  console.log("Seeding database...");

  const existingCategories = await prisma.expenseCategory.findMany({ select: { name: true } });
  const existingNames = new Set(existingCategories.map((c: { name: string }) => c.name));
  const newCategories = CATEGORIES.filter((name) => !existingNames.has(name));
  if (newCategories.length > 0) {
    await prisma.expenseCategory.createMany({
      data: newCategories.map((name) => ({ name })),
    });
  }
  const categories = await prisma.expenseCategory.findMany();
  const cat = (name: string) =>
    categories.find((c: { name: string }) => c.name === name)!.id;

  const company = await prisma.company.upsert({
    where: { id: "demo-company" },
    update: {},
    create: { id: "demo-company", name: "Northwind Studio" },
  });

  const passwordHash = await bcrypt.hash("Demo1234!", 12);
  const pinHash = await bcrypt.hash("123456", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@rei-volution.app" },
    update: {},
    create: {
      firstName: "Jordan",
      lastName: "Rivera",
      email: "demo@rei-volution.app",
      passwordHash,
      pinHash,
      jobPosition: "Product Designer",
      companyId: company.id,
      settings: { create: { monthlyBudget: 2500 } },
    },
  });

  const alreadySeeded = (await prisma.expense.count({ where: { userId: user.id } })) > 0;
  if (alreadySeeded) {
    console.log("Demo user already has data — skipping sample expenses/savings/tasks/attendance.");
    console.log("Demo login: demo@rei-volution.app / Demo1234!  (PIN: 123456)");
    return;
  }

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  await prisma.expense.createMany({
    data: [
      { title: "Grocery run", amount: 84.5, paymentMethod: "Debit Card", date: daysAgo(2), userId: user.id, categoryId: cat("Food") },
      { title: "Uber to office", amount: 18.2, paymentMethod: "GCash", date: daysAgo(3), userId: user.id, categoryId: cat("Transportation") },
      { title: "Netflix", amount: 15.99, paymentMethod: "Credit Card", date: daysAgo(5), userId: user.id, categoryId: cat("Subscriptions") },
      { title: "Electric bill", amount: 120, paymentMethod: "Bank Transfer", date: daysAgo(6), userId: user.id, categoryId: cat("Bills") },
      { title: "New keyboard", amount: 65, paymentMethod: "Credit Card", date: daysAgo(10), userId: user.id, categoryId: cat("Office") },
      { title: "Movie night", amount: 32, paymentMethod: "Cash", date: daysAgo(12), userId: user.id, categoryId: cat("Entertainment") },
      { title: "Pharmacy", amount: 27.4, paymentMethod: "Debit Card", date: daysAgo(20), userId: user.id, categoryId: cat("Health") },
      { title: "Online course", amount: 49, paymentMethod: "Credit Card", date: daysAgo(35), userId: user.id, categoryId: cat("Education") },
    ],
  });

  const cash = await prisma.savingsAccount.create({
    data: { name: "Everyday Cash", type: "cash", balance: 420, userId: user.id },
  });
  await prisma.savingsTransaction.create({ data: { type: "deposit", amount: 420, accountId: cash.id } });

  const bank = await prisma.savingsAccount.create({
    data: { name: "Main Bank Account", type: "bank", balance: 3200, goal: 5000, userId: user.id },
  });
  await prisma.savingsTransaction.create({ data: { type: "deposit", amount: 3200, accountId: bank.id } });

  const emergency = await prisma.savingsAccount.create({
    data: { name: "Emergency Fund", type: "emergency", balance: 1500, goal: 6000, userId: user.id },
  });
  await prisma.savingsTransaction.create({ data: { type: "deposit", amount: 1500, accountId: emergency.id } });

  const companyCard = await prisma.savingsAccount.create({
    data: { name: "Northwind Corporate Card", type: "company", isCompany: true, balance: 950, userId: user.id },
  });
  await prisma.savingsTransaction.create({ data: { type: "deposit", amount: 950, accountId: companyCard.id } });

  const task1 = await prisma.task.create({
    data: {
      title: "Ship dashboard redesign",
      description: "Finalize the new sidebar and stat cards",
      priority: "high",
      status: "in_progress",
      dueDate: daysAgo(-2),
      userId: user.id,
      subtasks: { create: [{ title: "Design review" }, { title: "Dev handoff" }] },
    },
  });
  await prisma.calendarEvent.create({
    data: { title: task1.title, start: task1.dueDate!, allDay: true, type: "task", color: "#A78BDB", taskId: task1.id, userId: user.id },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Submit Q3 expense report",
      priority: "critical",
      status: "pending",
      dueDate: daysAgo(-1),
      userId: user.id,
    },
  });
  await prisma.calendarEvent.create({
    data: { title: task2.title, start: task2.dueDate!, allDay: true, type: "task", color: "#D9AEE8", taskId: task2.id, userId: user.id },
  });

  await prisma.task.create({
    data: { title: "Renew driver's license", priority: "medium", status: "completed", userId: user.id },
  });

  await prisma.calendarEvent.create({
    data: { title: "Team standup", start: daysAgo(-3), allDay: true, type: "meeting", color: "#A78BDB", userId: user.id },
  });
  await prisma.calendarEvent.create({
    data: { title: "Alex's birthday", start: daysAgo(-8), allDay: true, type: "birthday", color: "#F3B988", userId: user.id },
  });

  const attendanceDays = [1, 2, 3, 4, 7, 8, 9, 10, 11];
  for (const d of attendanceDays) {
    const day = daysAgo(d);
    day.setHours(0, 0, 0, 0);
    const timeIn = new Date(day);
    timeIn.setHours(9, d % 4 === 0 ? 22 : 2, 0, 0);
    const lunchOut = new Date(day); lunchOut.setHours(12, 0, 0, 0);
    const lunchIn = new Date(day); lunchIn.setHours(13, 0, 0, 0);
    const timeOut = new Date(day); timeOut.setHours(18, 5, 0, 0);
    const late = d % 4 === 0;
    await prisma.attendance.create({
      data: {
        userId: user.id,
        date: day,
        timeIn, lunchOut, lunchIn, timeOut,
        status: late ? "late" : "present",
        lateMinutes: late ? 22 : 0,
        totalHours: 8,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Demo login: demo@rei-volution.app / Demo1234!  (PIN: 123456)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

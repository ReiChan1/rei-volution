import { z } from "zod";

export const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
    companyName: z.string().min(1, "Company name is required"),
    jobPosition: z.string().min(1, "Job position is required"),
    pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
    confirmPin: z.string(),
    agree: z.boolean().refine((v) => v === true, "You must agree to the terms"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const expenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Pick a category"),
  paymentMethod: z.string().min(1, "Pick a payment method"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseFormValues = z.input<typeof expenseSchema>;

export const savingsAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum([
    "cash",
    "bank",
    "ewallet",
    "credit_card",
    "emergency",
    "investment",
    "company",
  ]),
  balance: z.coerce.number().default(0),
  goal: z.coerce.number().optional(),
  color: z.string().optional(),
});

export type SavingsAccountInput = z.infer<typeof savingsAccountSchema>;
export type SavingsAccountFormValues = z.input<typeof savingsAccountSchema>;

export const savingsTransactionSchema = z.object({
  type: z.enum(["deposit", "withdraw"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  notes: z.string().optional(),
});

export type SavingsTransactionInput = z.infer<typeof savingsTransactionSchema>;

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .default("pending"),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  reminder: z.boolean().default(false),
  subtasks: z.array(z.string()).optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskFormValues = z.input<typeof taskSchema>;

export const pinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export const reportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Write something before saving"),
  reportDate: z.string().min(1, "Date is required"),
  taskId: z.string().optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;

export const attendanceEditSchema = z.object({
  status: z.enum(["present", "absent", "late", "leave", "holiday", "half_day"]),
  timeIn: z.string().optional().nullable(),
  lunchOut: z.string().optional().nullable(),
  lunchIn: z.string().optional().nullable(),
  timeOut: z.string().optional().nullable(),
  breakMinutes: z.coerce.number().min(0).default(0),
  expectedHours: z.coerce.number().min(0).default(8),
  notes: z.string().optional(),
});

export type AttendanceEditInput = z.infer<typeof attendanceEditSchema>;
export type AttendanceEditFormValues = z.input<typeof attendanceEditSchema>;

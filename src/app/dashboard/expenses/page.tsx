"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Archive,
  Wallet,
  CalendarClock,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/dashboard/stat-card";
import { expenseSchema, type ExpenseInput, type ExpenseFormValues } from "@/lib/validations";
import { formatCurrency, cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

const CATEGORIES = [
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

const PAYMENT_METHODS = ["Cash", "Debit Card", "Credit Card", "Bank Transfer", "GCash", "Maya"];

type Expense = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  paymentMethod: string;
  date: string;
  notes: string | null;
  category: { name: string } | null;
};

type Stats = { monthly: number; weekly: number; yearly: number; total: number };

export default function ExpensesPage() {
  const { requestPin } = useUIStore();
  const { data: session } = useSession();
  const currency = (session?.user as any)?.currency ?? "USD";
  const [items, setItems] = useState<Expense[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("date_desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const pageSize = 8;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues, any, ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search,
      category,
      sort,
      page: String(page),
      pageSize: String(pageSize),
    });
    const res = await fetch(`/api/expenses?${params}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setStats(data.stats ?? null);
    setLoading(false);
  }, [search, category, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    reset({
      title: "",
      description: "",
      amount: undefined,
      category: CATEGORIES[0],
      paymentMethod: PAYMENT_METHODS[0],
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setDialogOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    reset({
      title: expense.title,
      description: expense.description ?? "",
      amount: expense.amount,
      category: expense.category?.name ?? CATEGORIES[0],
      paymentMethod: expense.paymentMethod,
      date: expense.date.slice(0, 10),
      notes: expense.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: ExpenseInput) {
    const url = editing ? `/api/expenses/${editing.id}` : "/api/expenses";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Something went wrong");
      return;
    }
    toast.success(editing ? "Expense updated" : "Expense added");
    setDialogOpen(false);
    load();
  }

  function confirmDelete(expense: Expense) {
    requestPin(`Delete "${expense.title}"? This can't be undone.`, async () => {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete expense");
        return;
      }
      toast.success("Expense deleted");
      load();
    });
  }

  async function archive(expense: Expense) {
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      toast.success("Expense archived");
      load();
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted">Track spending across every category and method.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="This week" value={formatCurrency(stats?.weekly ?? 0, currency)} icon={CalendarClock} accent="primary" />
        <StatCard label="This month" value={formatCurrency(stats?.monthly ?? 0, currency)} icon={Wallet} accent="amber" />
        <StatCard label="This year" value={formatCurrency(stats?.yearly ?? 0, currency)} icon={TrendingUp} accent="teal" />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search expenses…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={category} onValueChange={(v) => { setPage(1); setCategory(v); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest first</SelectItem>
                <SelectItem value="date_asc">Oldest first</SelectItem>
                <SelectItem value="amount_desc">Amount: high to low</SelectItem>
                <SelectItem value="amount_asc">Amount: low to high</SelectItem>
                <SelectItem value="title_asc">Title: A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-3 pr-4 font-medium">Title</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium">Method</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 text-right font-medium">Amount</th>
                  <th className="pb-3 pr-0 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="py-3.5" colSpan={6}><div className="skeleton h-5 w-full rounded-lg" /></td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted">
                      No expenses match your filters yet.
                    </td>
                  </tr>
                ) : (
                  items.map((e) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3.5 pr-4">
                        <p className="font-medium">{e.title}</p>
                        {e.description && <p className="text-xs text-muted">{e.description}</p>}
                      </td>
                      <td className="py-3.5 pr-4"><Badge variant="muted">{e.category?.name ?? "Others"}</Badge></td>
                      <td className="py-3.5 pr-4 text-muted">{e.paymentMethod}</td>
                      <td className="py-3.5 pr-4 text-muted">
                        {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-3.5 pr-4 text-right font-medium">{formatCurrency(e.amount, currency)}</td>
                      <td className="py-3.5 pr-0">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => archive(e)}><Archive className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmDelete(e)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input {...register("title")} placeholder="Groceries, taxi, electric bill…" />
              {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" step="0.01" {...register("amount")} />
                {errors.amount && <p className="text-xs text-danger">{errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" {...register("date")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input {...register("description")} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register("notes")} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save changes" : "Add expense"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2,
  Building2,
  Wallet2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { savingsAccountSchema, type SavingsAccountInput, type SavingsAccountFormValues } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

const ACCOUNT_TYPES: { value: SavingsAccountInput["type"]; label: string; color: string }[] = [
  { value: "cash", label: "Personal Cash", color: "#7FD1B9" },
  { value: "bank", label: "Personal Bank", color: "#A78BDB" },
  { value: "ewallet", label: "E-Wallet (GCash/Maya)", color: "#F3B988" },
  { value: "credit_card", label: "Credit Card", color: "#F2A0B3" },
  { value: "emergency", label: "Emergency Fund", color: "#8FD1A8" },
  { value: "investment", label: "Investment", color: "#9FC4E8" },
  { value: "company", label: "Company Card", color: "#A78BDB" },
];

type Account = {
  id: string;
  name: string;
  type: string;
  isCompany: boolean;
  balance: number;
  goal: number | null;
  color: string | null;
  transactions: { id: string; type: string; amount: number; date: string; notes: string | null }[];
};

export default function SavingsPage() {
  const { requestPin } = useUIStore();
  const { data: session } = useSession();
  const currency = (session?.user as any)?.currency ?? "USD";
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [txAccount, setTxAccount] = useState<Account | null>(null);
  const [txType, setTxType] = useState<"deposit" | "withdraw">("deposit");
  const [txAmount, setTxAmount] = useState("");
  const [txNotes, setTxNotes] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SavingsAccountFormValues, any, SavingsAccountInput>({
    resolver: zodResolver(savingsAccountSchema),
    defaultValues: { type: "cash", balance: 0 },
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/savings");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(values: SavingsAccountInput) {
    const res = await fetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Something went wrong");
      return;
    }
    toast.success("Account created");
    setCreateOpen(false);
    reset({ type: "cash", balance: 0, name: "" });
    load();
  }

  async function submitTransaction() {
    if (!txAccount) return;
    const amount = Number(txAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const res = await fetch(`/api/savings/${txAccount.id}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: txType, amount, notes: txNotes }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Transaction failed");
      return;
    }
    toast.success(txType === "deposit" ? "Deposit added" : "Withdrawal recorded");
    setTxAccount(null);
    setTxAmount("");
    setTxNotes("");
    load();
  }

  function confirmDelete(account: Account) {
    requestPin(`Delete "${account.name}"? Its transaction history will be lost.`, async () => {
      const res = await fetch(`/api/savings/${account.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete account");
        return;
      }
      toast.success("Account deleted");
      load();
    });
  }

  const companyAccounts = accounts.filter((a) => a.isCompany);
  const personalAccounts = accounts.filter((a) => !a.isCompany);
  const totalPersonal = personalAccounts.reduce((s, a) => s + a.balance, 0);

  function AccountCard({ account }: { account: Account }) {
    const meta = ACCOUNT_TYPES.find((t) => t.value === account.type);
    const progress = account.goal ? Math.min(100, (account.balance / account.goal) * 100) : null;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          className={
            account.isCompany
              ? "border-primary/40 bg-gradient-to-br from-primary/10 to-transparent"
              : ""
          }
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: `${meta?.color ?? "#A78BDB"}26`, color: meta?.color ?? "#A78BDB" }}
                >
                  {account.isCompany ? <Building2 className="h-4.5 w-4.5" /> : <Wallet2 className="h-4.5 w-4.5" />}
                </div>
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-xs text-muted">{meta?.label ?? account.type}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => confirmDelete(account)}>
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>

            <p className="mt-4 font-display text-2xl font-semibold">{formatCurrency(account.balance, currency)}</p>

            {progress !== null && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted">
                  <span>Goal progress</span>
                  <span>{formatCurrency(account.goal!, currency)}</span>
                </div>
                <Progress value={progress} className="mt-1.5" />
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                variant="subtle"
                size="sm"
                className="flex-1"
                onClick={() => { setTxAccount(account); setTxType("deposit"); }}
              >
                <ArrowDownCircle className="h-4 w-4 text-teal" /> Deposit
              </Button>
              <Button
                variant="subtle"
                size="sm"
                className="flex-1"
                onClick={() => { setTxAccount(account); setTxType("withdraw"); }}
              >
                <ArrowUpCircle className="h-4 w-4 text-danger" /> Withdraw
              </Button>
            </div>

            {account.transactions.length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                {account.transactions.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted">
                      {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {t.notes ? ` · ${t.notes}` : ""}
                    </span>
                    <span className={t.type === "deposit" ? "text-teal" : "text-danger"}>
                      {t.type === "deposit" ? "+" : "-"}{formatCurrency(t.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Savings</h1>
          <p className="text-sm text-muted">
            Personal total: <span className="font-medium text-foreground">{formatCurrency(totalPersonal, currency)}</span>
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add account
        </Button>
      </div>

      {companyAccounts.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold">Company Card</h2>
            <Badge>Kept separate from personal savings</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companyAccounts.map((a) => <AccountCard key={a.id} account={a} />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Personal Accounts</h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-5"><div className="skeleton h-32 rounded-xl" /></Card>
            ))}
          </div>
        ) : personalAccounts.length === 0 ? (
          <Card className="p-10 text-center text-muted">No personal accounts yet. Add your first one.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personalAccounts.map((a) => <AccountCard key={a.id} account={a} />)}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add savings account</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account name</Label>
              <Input {...register("name")} placeholder="e.g. Emergency Fund" />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Starting balance</Label>
                <Input type="number" step="0.01" {...register("balance")} />
              </div>
              <div className="space-y-1.5">
                <Label>Savings goal</Label>
                <Input type="number" step="0.01" {...register("goal")} placeholder="Optional" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Create account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!txAccount} onOpenChange={(open) => !open && setTxAccount(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {txType === "deposit" ? "Deposit to" : "Withdraw from"} {txAccount?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={txType === "deposit" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setTxType("deposit")}
              >
                Deposit
              </Button>
              <Button
                variant={txType === "withdraw" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setTxType("withdraw")}
              >
                Withdraw
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxAccount(null)}>Cancel</Button>
            <Button onClick={submitTransaction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

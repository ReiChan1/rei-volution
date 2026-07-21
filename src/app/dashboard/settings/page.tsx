"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { LogOut, Moon, Sun, Download, KeyRound, ShieldCheck, Trash2, Check, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { initials, cn } from "@/lib/utils";
import { ACCENT_THEMES, type AccentId, getStoredAccent, setStoredAccent } from "@/lib/accent-theme";

const CURRENCIES = ["USD", "EUR", "GBP", "PHP", "JPY", "AUD", "CAD", "SGD"];
const TIMEZONES = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Manila", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney"];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { theme, setTheme } = useTheme();
  const user = session?.user as any;

  const [accent, setAccentState] = useState<AccentId>("lavender");

  useEffect(() => {
    setAccentState(getStoredAccent());
  }, []);

  function setAccent(id: AccentId) {
    setAccentState(id);
    setStoredAccent(id);
  }

  // Preferences state
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Company Work Hours state
  const [workTimeIn, setWorkTimeIn] = useState("08:00");
  const [workTimeOut, setWorkTimeOut] = useState("17:00");
  const [expectedHours, setExpectedHours] = useState("8");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Dialog states
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [pinOpen, setPinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!data) return;
        setCurrency(data.currency ?? "USD");
        setTimezone(data.timezone ?? "UTC");
        setMonthlyBudget(data.monthlyBudget ? String(data.monthlyBudget) : "");
        if (data.workTimeIn) setWorkTimeIn(data.workTimeIn);
        if (data.workTimeOut) setWorkTimeOut(data.workTimeOut);
        if (data.expectedHours) setExpectedHours(String(data.expectedHours));
      })
      .catch(() => {});
  }, []);

  async function savePreferences() {
    setSavingPrefs(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency, timezone, monthlyBudget: monthlyBudget ? Number(monthlyBudget) : null }),
    });
    setSavingPrefs(false);
    if (!res.ok) { toast.error("Could not save preferences"); return; }
    await update({ currency });
    toast.success("Preferences saved — your new currency is now used everywhere.");
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workTimeIn,
        workTimeOut,
        expectedHours: expectedHours ? Number(expectedHours) : 8.0,
      }),
    });
    setSavingSchedule(false);
    if (!res.ok) { toast.error("Could not save office schedule"); return; }
    toast.success("Work schedule saved — default hours updated.");
  }

  async function submitPasswordChange() {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Could not change password"); return; }
    toast.success("Password updated");
    setPwOpen(false);
    setCurrentPassword("");
    setNewPassword("");
  }

  async function submitPinChange() {
    const res = await fetch("/api/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin, newPin }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Could not change PIN"); return; }
    toast.success("PIN updated");
    setPinOpen(false);
    setCurrentPin("");
    setNewPin("");
  }

  function exportExpenses() {
    window.location.href = "/api/export/expenses";
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Manage your profile, preferences, work schedule, and security. 🐾</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {user?.image && <AvatarImage src={user.image} />}
            <AvatarFallback>{user ? initials(user.firstName, user.lastName) : ""}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-muted">{user?.email}</p>
            <p className="text-xs text-muted">{user?.jobPosition} · {user?.companyName}</p>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted">Switch between light and dark mode.</p>
            </div>
            <div className="flex gap-2">
              <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
                <Sun className="h-4 w-4" /> Light
              </Button>
              <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
                <Moon className="h-4 w-4" /> Dark
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-medium">Accent color</p>
            <p className="text-xs text-muted">Pick the hue used for buttons, links, and highlights.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {ACCENT_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAccent(t.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 transition-colors",
                    accent === t.id ? "bg-surface-2" : "hover:bg-surface-2/60"
                  )}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-shadow"
                    style={{
                      background: t.swatch,
                      boxShadow: accent === t.id ? `0 0 0 3px var(--surface), 0 0 0 5px ${t.swatch}` : "none",
                    }}
                  >
                    {accent === t.id && <Check className="h-4 w-4 text-white" />}
                  </span>
                  <span className="text-xs text-muted">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Monthly budget</Label>
            <Input type="number" step="0.01" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} placeholder="e.g. 2500" />
            <p className="text-xs text-muted">Used to power the budget-exceeded notification.</p>
          </div>
          <Button onClick={savePreferences} disabled={savingPrefs}>{savingPrefs ? "Saving…" : "Save preferences"}</Button>
        </CardContent>
      </Card>

      {/* Office Work Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted" /> Company Work Schedule
          </CardTitle>
          <CardDescription>
            Configure your standard shift times to calculate tardiness, undertime, and overtime automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Standard Time In</Label>
              <Input
                type="time"
                value={workTimeIn}
                onChange={(e) => setWorkTimeIn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Standard Time Out</Label>
              <Input
                type="time"
                value={workTimeOut}
                onChange={(e) => setWorkTimeOut(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Expected Daily Hours</Label>
            <Input
              type="number"
              step="0.5"
              min="1"
              max="24"
              value={expectedHours}
              onChange={(e) => setExpectedHours(e.target.value)}
              placeholder="8"
            />
            <p className="text-xs text-muted">Required net work hours per day (excluding breaks).</p>
          </div>
          <Button onClick={saveSchedule} disabled={savingSchedule}>
            {savingSchedule ? "Saving schedule…" : "Save work schedule"}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted">Change your account password.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
              <KeyRound className="h-4 w-4" /> Change
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Security PIN</p>
              <p className="text-xs text-muted">Required for every delete action across the app.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPinOpen(true)}>
              <ShieldCheck className="h-4 w-4" /> Change
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader><CardTitle>Data</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Export expenses</p>
              <p className="text-xs text-muted">Download all your expenses as a CSV file.</p>
            </div>
            <Button variant="outline" size="sm" onClick={exportExpenses}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>These actions are permanent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" /> Log out
            </Button>
            <DeleteAccountButton />
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button onClick={submitPasswordChange} disabled={!currentPassword || newPassword.length < 8}>
              Update password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change PIN Dialog */}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change security PIN</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current PIN</Label>
              <Input
                inputMode="numeric" maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                className="text-center tracking-[0.5em]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>New PIN</Label>
              <Input
                inputMode="numeric" maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                className="text-center tracking-[0.5em]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinOpen(false)}>Cancel</Button>
            <Button onClick={submitPinChange} disabled={currentPin.length !== 6 || newPin.length !== 6}>
              Update PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error ?? "Could not delete account"); return; }
    toast.success("Account deleted. Goodbye for now 🐾");
    signOut({ callbackUrl: "/login" });
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> Delete account
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">
            This permanently deletes your account and everything in it — expenses, savings,
            tasks, and calendar events. Enter your PIN to confirm.
          </p>
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="text-center text-lg tracking-[0.5em]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={loading || pin.length !== 6} onClick={handleDelete}>
              {loading ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Clock, LogIn, Coffee, LogOut, Trash2, Plus, Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUIStore } from "@/store/ui-store";

const STATUS_BADGE: Record<string, "default" | "amber" | "danger" | "muted" | "teal"> = {
  present: "teal",
  late: "amber",
  absent: "danger",
  leave: "muted",
  holiday: "default",
  half_day: "amber",
};

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  leave: "Leave",
  holiday: "Holiday",
  half_day: "Half day",
};

const STATUS_OPTIONS = ["present", "late", "absent", "leave", "holiday", "half_day"];

type AttendanceRecord = {
  id: string;
  date: string;
  timeIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  timeOut: string | null;
  status: string;
  lateMinutes: number;
  overtimeMins: number;
  undertimeMins: number;
  breakMinutes: number;
  expectedHours: number;
  totalHours: number;
  notes: string | null;
};

function fmt(t: string | null) {
  if (!t) return "—";
  return new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Converts a stored ISO timestamp into an "HH:mm" string for a <input type="time">.
function toTimeInput(t: string | null) {
  if (!t) return "";
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AttendancePage() {
  const { requestPin } = useUIStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [stats, setStats] = useState({ attendancePct: 0, totalHours: 0, lateCount: 0, count: 0 });
  const [range, setRange] = useState("month");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [markDate, setMarkDate] = useState("");
  const [markStatus, setMarkStatus] = useState("leave");

  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState("present");
  const [editTimeIn, setEditTimeIn] = useState("");
  const [editLunchOut, setEditLunchOut] = useState("");
  const [editLunchIn, setEditLunchIn] = useState("");
  const [editTimeOut, setEditTimeOut] = useState("");
  const [editBreakMinutes, setEditBreakMinutes] = useState("0");
  const [editExpectedHours, setEditExpectedHours] = useState("8");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/attendance?range=${range}`);
    const data = await res.json();
    setRecords(data.records ?? []);
    setToday(data.today ?? null);
    setStats(data.stats ?? { attendancePct: 0, totalHours: 0, lateCount: 0, count: 0 });
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  async function clock(step: "timeIn" | "lunchOut" | "lunchIn" | "timeOut") {
    setBusy(true);
    const res = await fetch("/api/attendance/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? "Something went wrong");
      return;
    }
    toast.success(
      step === "timeIn" ? "Clocked in!" :
      step === "lunchOut" ? "Lunch started" :
      step === "lunchIn" ? "Lunch ended" : "Clocked out — see you tomorrow!"
    );
    load();
  }

  async function markManual() {
    if (!markDate) { toast.error("Pick a date"); return; }
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: markDate, status: markStatus }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Could not save"); return; }
    toast.success("Attendance recorded");
    setMarkOpen(false);
    setMarkDate("");
    load();
  }

  function confirmDelete(record: AttendanceRecord) {
    requestPin(`Delete the attendance record for ${new Date(record.date).toLocaleDateString()}?`, async () => {
      const res = await fetch(`/api/attendance/${record.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Could not delete record"); return; }
      toast.success("Record deleted");
      load();
    });
  }

  function openEdit(record: AttendanceRecord) {
    setEditing(record);
    setEditStatus(record.status);
    setEditTimeIn(toTimeInput(record.timeIn));
    setEditLunchOut(toTimeInput(record.lunchOut));
    setEditLunchIn(toTimeInput(record.lunchIn));
    setEditTimeOut(toTimeInput(record.timeOut));
    setEditBreakMinutes(String(record.breakMinutes ?? 0));
    setEditExpectedHours(String(record.expectedHours ?? 8));
    setEditNotes(record.notes ?? "");
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    const res = await fetch(`/api/attendance/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: editStatus,
        timeIn: editTimeIn || null,
        lunchOut: editLunchOut || null,
        lunchIn: editLunchIn || null,
        timeOut: editTimeOut || null,
        breakMinutes: editBreakMinutes,
        expectedHours: editExpectedHours,
        notes: editNotes,
      }),
    });
    const data = await res.json();
    setSavingEdit(false);
    if (!res.ok) { toast.error(data.error ?? "Could not save changes"); return; }
    toast.success("Attendance updated");
    setEditing(null);
    load();
  }

  const nextStep = !today ? "timeIn" : !today.lunchOut ? "lunchOut" : !today.lunchIn ? "lunchIn" : !today.timeOut ? "timeOut" : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted">Clock in and out, and keep an eye on your hours. 🐾</p>
        </div>
        <Button variant="outline" onClick={() => setMarkOpen(true)}>
          <Plus className="h-4 w-4" /> Mark leave / holiday
        </Button>
      </div>

      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary via-[#C9A8E8] to-danger p-0 text-white">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-sm text-white/75">Today</p>
            <p className="font-display text-xl font-semibold">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-white/80 sm:justify-start">
              <span>In: {fmt(today?.timeIn ?? null)}</span>
              <span>Lunch out: {fmt(today?.lunchOut ?? null)}</span>
              <span>Lunch in: {fmt(today?.lunchIn ?? null)}</span>
              <span>Out: {fmt(today?.timeOut ?? null)}</span>
            </div>
            {today && (
              <button
                className="mt-2 text-xs font-medium text-white/90 underline underline-offset-2 hover:text-white"
                onClick={() => openEdit(today)}
              >
                Made a mistake? Edit today's entry
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              disabled={busy || nextStep !== "timeIn"}
              onClick={() => clock("timeIn")}
              className="bg-white text-primary hover:bg-white/90"
            >
              <LogIn className="h-4 w-4" /> Time in
            </Button>
            <Button
              disabled={busy || (nextStep !== "lunchOut" && nextStep !== "lunchIn")}
              onClick={() => clock(nextStep === "lunchOut" ? "lunchOut" : "lunchIn")}
              variant="subtle"
              className="bg-white/15 text-white hover:bg-white/25"
            >
              <Coffee className="h-4 w-4" /> {nextStep === "lunchIn" ? "Back from lunch" : "Lunch"}
            </Button>
            <Button
              disabled={busy || nextStep !== "timeOut"}
              onClick={() => clock("timeOut")}
              variant="subtle"
              className="bg-white/15 text-white hover:bg-white/25"
            >
              <LogOut className="h-4 w-4" /> Time out
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Attendance rate" value={`${stats.attendancePct}%`} icon={Clock} accent="teal" />
        <StatCard label="Hours logged" value={`${stats.totalHours.toFixed(1)}h`} icon={Clock} accent="primary" />
        <StatCard label="Late days" value={String(stats.lateCount)} icon={Clock} accent="amber" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>History</CardTitle>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Time in</th>
                  <th className="pb-3 pr-4 font-medium">Time out</th>
                  <th className="pb-3 pr-4 font-medium">Break</th>
                  <th className="pb-3 pr-4 font-medium">Hours</th>
                  <th className="pb-3 pr-0 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-6"><div className="skeleton h-5 w-full rounded-lg" /></td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-muted">No attendance records yet.</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-4">{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td className="py-3 pr-4"><Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</Badge></td>
                      <td className="py-3 pr-4 text-muted">{fmt(r.timeIn)}</td>
                      <td className="py-3 pr-4 text-muted">{fmt(r.timeOut)}</td>
                      <td className="py-3 pr-4 text-muted">{r.breakMinutes ? `${r.breakMinutes}m` : "—"}</td>
                      <td className="py-3 pr-4">{r.totalHours ? `${r.totalHours.toFixed(1)}h` : "—"}</td>
                      <td className="py-3 pr-0 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(r)}>
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mark a day</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={markDate} onChange={(e) => setMarkDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={markStatus} onValueChange={setMarkStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half_day">Half day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkOpen(false)}>Cancel</Button>
            <Button onClick={markManual}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit attendance record */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit attendance</DialogTitle>
            <DialogDescription>
              {editing && new Date(editing.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {" "}— fix a mistaken clock-in/out, or fill in your company hours and breaks by hand.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Time in</Label>
                <Input type="time" value={editTimeIn} onChange={(e) => setEditTimeIn(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Time out</Label>
                <Input type="time" value={editTimeOut} onChange={(e) => setEditTimeOut(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Lunch out</Label>
                <Input type="time" value={editLunchOut} onChange={(e) => setEditLunchOut(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Lunch in</Label>
                <Input type="time" value={editLunchIn} onChange={(e) => setEditLunchIn(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Extra breaks (minutes)</Label>
                <Input type="number" min={0} value={editBreakMinutes} onChange={(e) => setEditBreakMinutes(e.target.value)} />
                <p className="text-xs text-muted">On top of lunch — short coffee/rest breaks.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Company hours (expected)</Label>
                <Input type="number" min={0} step="0.5" value={editExpectedHours} onChange={(e) => setEditExpectedHours(e.target.value)} />
                <p className="text-xs text-muted">Standard shift length, used for overtime/undertime.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

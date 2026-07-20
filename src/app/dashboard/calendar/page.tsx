"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { toast } from "sonner";
import {
  Plus, Search, MapPin, CalendarDays, Clock, Tag, Pencil, Trash2, Link2, ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useUIStore } from "@/store/ui-store";
import { formatTimeOfDay, EVENT_CATEGORY_LABEL } from "@/lib/utils";

type CalEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string | null;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  type: string;
  color: string | null;
  taskId: string | null;
};

const CATEGORY_OPTIONS = ["event", "meeting", "birthday", "deadline"];
const RANGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const emptyForm = {
  title: "",
  description: "",
  location: "",
  date: "",
  startTime: "",
  endTime: "",
  allDay: true,
  type: "event",
};

export default function CalendarPage() {
  const { requestPin } = useUIStore();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef<FullCalendar | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState<CalEvent | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"nearest" | "farthest">("nearest");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/calendar/events");
    setEvents(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate(dateSeed?: string) {
    setEditing(null);
    setForm({ ...emptyForm, date: dateSeed ?? new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  }

  function openEdit(event: CalEvent) {
    if (event.taskId) {
      toast.info("This event is linked to a task — edit it from the Tasks page.");
      return;
    }
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      date: event.start.slice(0, 10),
      startTime: event.startTime ?? "",
      endTime: event.endTime ?? "",
      allDay: event.allDay,
      type: event.type,
    });
    setViewing(null);
    setDialogOpen(true);
  }

  async function saveEvent() {
    if (!form.title || !form.date) {
      toast.error("Add a title and date");
      return;
    }
    setSaving(true);
    const url = editing ? `/api/calendar/events/${editing.id}` : "/api/calendar/events";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
        start: form.date,
        allDay: form.allDay,
        startTime: form.allDay ? undefined : form.startTime || undefined,
        endTime: form.allDay ? undefined : form.endTime || undefined,
        type: form.type,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Could not save event");
      return;
    }
    toast.success(editing ? "Event updated" : "Event added");
    setDialogOpen(false);
    load();
  }

  function confirmDelete(event: CalEvent) {
    if (event.taskId) {
      toast.info("This event is linked to a task — delete it from the Tasks page.");
      return;
    }
    requestPin(`Delete "${event.title}"? This can't be undone.`, async () => {
      const res = await fetch(`/api/calendar/events/${event.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Could not delete event");
        return;
      }
      toast.success("Event deleted");
      setViewing(null);
      load();
    });
  }

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const q = search.trim().toLowerCase();

    let list = events.filter((e) => {
      if (q) {
        const haystack = `${e.title} ${e.description ?? ""} ${e.location ?? ""} ${EVENT_CATEGORY_LABEL[e.type] ?? e.type}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (categoryFilter !== "all" && e.type !== categoryFilter) return false;

      const eventDate = new Date(e.start);
      if (rangeFilter === "today") {
        if (startOfDay(eventDate).getTime() !== startOfDay(now).getTime()) return false;
      } else if (rangeFilter === "week") {
        const ws = startOfWeek(now);
        const we = new Date(ws);
        we.setDate(we.getDate() + 7);
        if (eventDate < ws || eventDate >= we) return false;
      } else if (rangeFilter === "month") {
        if (eventDate.getMonth() !== now.getMonth() || eventDate.getFullYear() !== now.getFullYear()) return false;
      } else if (rangeFilter === "upcoming") {
        if (eventDate < startOfDay(now)) return false;
      } else if (rangeFilter === "past") {
        if (eventDate >= startOfDay(now)) return false;
      }
      return true;
    });

    list = list.sort((a, b) => {
      const diff = new Date(a.start).getTime() - new Date(b.start).getTime();
      return sortOrder === "nearest" ? diff : -diff;
    });

    return list;
  }, [events, search, categoryFilter, rangeFilter, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted">Tasks, deadlines, and events in one place. Click an event for details.</p>
        </div>
        <Button onClick={() => openCreate()}><Plus className="h-4 w-4" /> New event</Button>
      </div>

      <Card className="p-4 sm:p-6 [--fc-border-color:var(--border)] [--fc-page-bg-color:transparent] [--fc-neutral-bg-color:var(--surface-2)] [--fc-today-bg-color:color-mix(in_srgb,var(--primary)_10%,transparent)]">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
          height="auto"
          editable
          eventClick={(info) => {
            const found = events.find((e) => e.id === info.event.id);
            if (found) setViewing(found);
          }}
          events={events.map((e) => ({
            id: e.id,
            title: e.title,
            start: e.start,
            end: e.end ?? undefined,
            allDay: e.allDay,
            backgroundColor: e.color ?? "#7C6CF0",
            borderColor: e.color ?? "#7C6CF0",
          }))}
        />
      </Card>

      {/* Search + filters + scrollable event list */}
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>All events</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, description, location…"
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{EVENT_CATEGORY_LABEL[c]}</SelectItem>)}
                <SelectItem value="task">Task</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rangeFilter} onValueChange={setRangeFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="When" /></SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder((s) => (s === "nearest" ? "farthest" : "nearest"))}
              className="sm:ml-auto"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === "nearest" ? "Nearest first" : "Farthest first"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <div className="skeleton h-16 rounded-xl" />
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
                <CalendarDays className="h-6 w-6 text-muted" />
                <p className="text-sm font-medium">No events match</p>
                <p className="max-w-xs text-xs text-muted">
                  {events.length === 0
                    ? "Nothing on your calendar yet — add your first event above."
                    : "Try a different search term or filter."}
                </p>
              </div>
            ) : (
              filteredEvents.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setViewing(e)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span>{new Date(e.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      {!e.allDay && e.startTime && <span>{formatTimeOfDay(e.startTime)}{e.endTime ? ` – ${formatTimeOfDay(e.endTime)}` : ""}</span>}
                      {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                    </div>
                  </div>
                  <Badge variant="muted" className="shrink-0">{EVENT_CATEGORY_LABEL[e.type] ?? e.type}</Badge>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit event" : "New calendar event"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Team meeting, birthday…" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allDay"
                checked={form.allDay}
                onCheckedChange={(v) => setForm((f) => ({ ...f, allDay: v === true }))}
              />
              <Label htmlFor="allDay" className="font-normal">All day</Label>
            </div>
            {!form.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start time</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End time</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{EVENT_CATEGORY_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEvent} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event details modal */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-md">
          {viewing && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: viewing.color ?? "var(--primary)" }} />
                  <DialogTitle>{viewing.title}</DialogTitle>
                </div>
                {viewing.taskId && (
                  <DialogDescription className="flex items-center gap-1">
                    <Link2 className="h-3.5 w-3.5" /> Linked to a task —{" "}
                    <Link href="/dashboard/tasks" className="text-primary hover:underline">edit it from Tasks</Link>
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2.5 text-muted">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">
                    {new Date(viewing.start).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                {!viewing.allDay && (viewing.startTime || viewing.endTime) && (
                  <div className="flex items-center gap-2.5 text-muted">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span className="text-foreground">
                      {formatTimeOfDay(viewing.startTime)}
                      {viewing.endTime ? ` – ${formatTimeOfDay(viewing.endTime)}` : ""}
                    </span>
                  </div>
                )}

                {viewing.location && (
                  <div className="flex items-center gap-2.5 text-muted">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="text-foreground">{viewing.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2.5 text-muted">
                  <Tag className="h-4 w-4 shrink-0" />
                  <Badge variant="muted">{EVENT_CATEGORY_LABEL[viewing.type] ?? viewing.type}</Badge>
                </div>

                {viewing.description && (
                  <p className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-foreground">{viewing.description}</p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                {!viewing.taskId && (
                  <>
                    <Button variant="outline" onClick={() => openEdit(viewing)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button variant="destructive" onClick={() => confirmDelete(viewing)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

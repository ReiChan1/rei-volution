"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type CalEvent = {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  type: string;
  color: string | null;
  taskId: string | null;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("event");
  const calendarRef = useRef<FullCalendar | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/calendar/events");
    setEvents(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createEvent() {
    if (!title || !date) {
      toast.error("Add a title and date");
      return;
    }
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, start: date, allDay: true, type }),
    });
    if (!res.ok) {
      toast.error("Could not create event");
      return;
    }
    toast.success("Event added");
    setDialogOpen(false);
    setTitle("");
    setDate("");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted">Tasks, deadlines, and events in one place. Drag to reschedule.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New event</Button>
      </div>

      <Card className="p-4 sm:p-6 [--fc-border-color:var(--border)] [--fc-page-bg-color:transparent] [--fc-neutral-bg-color:var(--surface-2)] [--fc-today-bg-color:color-mix(in_srgb,var(--primary)_10%,transparent)]">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
          height="auto"
          editable
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New calendar event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Team meeting, birthday…" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Custom event</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={createEvent}>Add event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

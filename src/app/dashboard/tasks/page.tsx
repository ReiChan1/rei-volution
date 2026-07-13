"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Calendar, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { taskSchema, type TaskInput, type TaskFormValues } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { ReportsPanel } from "@/components/dashboard/reports-panel";

const PRIORITY_STYLE: Record<string, "muted" | "amber" | "danger" | "default"> = {
  low: "muted",
  medium: "default",
  high: "amber",
  critical: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const COLUMNS = ["pending", "in_progress", "completed", "cancelled"] as const;

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  dueTime: string | null;
  subtasks: { id: string; title: string; done: boolean }[];
};

export default function TasksPage() {
  const { requestPin } = useUIStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState("");

  const {
    register, handleSubmit, reset, setValue, watch, formState: { errors },
  } = useForm<TaskFormValues, any, TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: "medium", status: "pending", reminder: false, subtasks: [] },
  });

  const subtasks = watch("subtasks") ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tasks");
    setTasks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    reset({ title: "", description: "", priority: "medium", status: "pending", dueDate: "", dueTime: "", reminder: false, subtasks: [] });
    setDialogOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    reset({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority as any,
      status: task.status as any,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      dueTime: task.dueTime ?? "",
      reminder: false,
      subtasks: task.subtasks.map((s) => s.title),
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: TaskInput) {
    const url = editing ? `/api/tasks/${editing.id}` : "/api/tasks";
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
    toast.success(editing ? "Task updated" : "Task created");
    setDialogOpen(false);
    load();
  }

  async function setStatus(task: Task, status: string) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  }

  function confirmDelete(task: Task) {
    requestPin(`Delete "${task.title}"? It will also be removed from your calendar.`, async () => {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Could not delete task"); return; }
      toast.success("Task deleted");
      load();
    });
  }

  function addSubtaskDraft() {
    if (!subtaskDraft.trim()) return;
    setValue("subtasks", [...subtasks, subtaskDraft.trim()]);
    setSubtaskDraft("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted">Tasks with a due date sync automatically to your calendar.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New task</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{STATUS_LABEL[col]}</h3>
                <Badge variant="muted">{columnTasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <Card className="p-4"><div className="skeleton h-16 rounded-lg" /></Card>
                ) : columnTasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">Nothing here</p>
                ) : (
                  columnTasks.map((task) => {
                    const done = task.subtasks.filter((s) => s.done).length;
                    return (
                      <Card key={task.id} className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug">{task.title}</p>
                          <Badge variant={PRIORITY_STYLE[task.priority]} className="shrink-0 capitalize">
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && <p className="mt-1 text-xs text-muted line-clamp-2">{task.description}</p>}
                        <div className="mt-3 flex items-center justify-between text-xs text-muted">
                          <span className="flex items-center gap-1">
                            {task.dueDate && (
                              <>
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </>
                            )}
                          </span>
                          {task.subtasks.length > 0 && <span>{done}/{task.subtasks.length} subtasks</span>}
                        </div>
                        <div className="mt-3 flex items-center gap-1">
                          <Select value={task.status} onValueChange={(v) => setStatus(task, v)}>
                            <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {COLUMNS.map((c) => <SelectItem key={c} value={c}>{STATUS_LABEL[c]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(task)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => confirmDelete(task)}>
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input {...register("title")} />
              {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register("description")} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => <SelectItem key={c} value={c}>{STATUS_LABEL[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" {...register("dueDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>Due time</Label>
                <Input type="time" {...register("dueTime")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Subtasks</Label>
              <div className="flex gap-2">
                <Input
                  value={subtaskDraft}
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtaskDraft(); } }}
                  placeholder="Add a subtask and press Enter"
                />
                <Button type="button" variant="outline" onClick={addSubtaskDraft}>Add</Button>
              </div>
              {subtasks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {subtasks.map((s, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-sm">
                      {s}
                      <button
                        type="button"
                        className="text-xs text-danger"
                        onClick={() => setValue("subtasks", subtasks.filter((_, idx) => idx !== i))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save changes" : "Create task"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ReportsPanel />
    </div>
  );
}

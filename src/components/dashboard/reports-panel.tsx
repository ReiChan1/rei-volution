"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2, Download, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { reportSchema, type ReportInput } from "@/lib/validations";
import { useUIStore } from "@/store/ui-store";

type Report = {
  id: string;
  title: string;
  content: string;
  reportDate: string;
  taskId: string | null;
  task: { id: string; title: string } | null;
};

type TaskOption = { id: string; title: string };

export function ReportsPanel() {
  const { requestPin } = useUIStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<Report | null>(null);
  const [editing, setEditing] = useState<Report | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reportDate: new Date().toISOString().slice(0, 10) },
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [reportsRes, tasksRes] = await Promise.all([
      fetch("/api/reports"),
      fetch("/api/tasks"),
    ]);
    setReports(await reportsRes.json());
    const tasks = await tasksRes.json();
    setTaskOptions(
      Array.isArray(tasks) ? tasks.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })) : []
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    reset({ title: "", content: "", reportDate: new Date().toISOString().slice(0, 10), taskId: "" });
    setDialogOpen(true);
  }

  function openEdit(report: Report) {
    setEditing(report);
    reset({
      title: report.title,
      content: report.content,
      reportDate: report.reportDate.slice(0, 10),
      taskId: report.taskId ?? "",
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: ReportInput) {
    const url = editing ? `/api/reports/${editing.id}` : "/api/reports";
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
    toast.success(editing ? "Report updated" : "Report saved");
    setDialogOpen(false);
    load();
  }

  function confirmDelete(report: Report) {
    requestPin(`Delete report "${report.title}"? This can't be undone.`, async () => {
      const res = await fetch(`/api/reports/${report.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete report");
        return;
      }
      toast.success("Report deleted");
      load();
    });
  }

  function downloadPdf(report: Report) {
    window.open(`/api/reports/${report.id}/pdf`, "_blank");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Daily or weekly write-ups, saved as PDF anytime.</CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New report
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="skeleton h-24 rounded-xl" />
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
            <FileText className="h-6 w-6 text-muted" />
            <p className="text-sm font-medium">No reports yet</p>
            <p className="max-w-xs text-xs text-muted">
              Log what you got done today, link it to a task if you like, and export it as a PDF
              whenever you need one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => setViewing(r)}>
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">{r.content}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{new Date(r.reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    {r.task && (
                      <Badge variant="muted" className="gap-1">
                        <Link2 className="h-3 w-3" /> {r.task.title}
                      </Badge>
                    )}
                  </div>
                </button>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => downloadPdf(r)} title="Download PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => confirmDelete(r)} title="Delete">
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit report" : "New report"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input {...register("title")} placeholder="Daily hustle report — July 12" />
              {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" {...register("reportDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>Link to a task (optional)</Label>
                <Select value={watch("taskId") || "none"} onValueChange={(v) => setValue("taskId", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {taskOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>What did you get done?</Label>
              <Textarea rows={8} {...register("content")} placeholder="Write your report here…" />
              {errors.content && <p className="text-xs text-danger">{errors.content.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save changes" : "Save report"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{new Date(viewing.reportDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                {viewing.task && (
                  <Badge variant="muted" className="gap-1">
                    <Link2 className="h-3 w-3" /> {viewing.task.title}
                  </Badge>
                )}
              </div>
              <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
                {viewing.content}
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                <Button onClick={() => downloadPdf(viewing)}>
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

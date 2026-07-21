"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AttendanceClock } from "@/components/AttendanceClock";
import { AttendanceForm } from "@/components/AttendanceForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Pencil, Plus } from "lucide-react";

export interface AttendanceRecord {
  id: string;
  date: string;
  timeIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  timeOut: string | null;
  status: string;
  totalHours: number;
  notes?: string | null;
}

export default function AttendancePage() {
  const router = useRouter();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal State for Manual Entry / Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  async function fetchAttendanceData() {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        setTodayRecord(data.todayRecord || null);
      }
    } catch (err) {
      console.error("Failed to fetch attendance records", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  function handleOpenEdit(record?: AttendanceRecord) {
    setSelectedRecord(record || null);
    setIsModalOpen(true);
  }

  function handleFormSuccess() {
    setIsModalOpen(false);
    setSelectedRecord(null);
    fetchAttendanceData();
    router.refresh();
  }

  function formatTime(dateStr: string | null | undefined) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      {/* 1. Live Clock Card */}
      <AttendanceClock initialRecord={todayRecord} />

      {/* 2. History & Manual Entry Header */}
      <Card>
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" /> Attendance History
          </CardTitle>
          <Button
            onClick={() => handleOpenEdit()}
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Log Past Shift
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Loading attendance records...
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No attendance records found yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Lunch Out</TableHead>
                  <TableHead>Lunch In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          item.status === "late"
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            : item.status === "absent"
                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}
                      >
                        {item.status || "present"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">{formatTime(item.timeIn)}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{formatTime(item.lunchOut)}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{formatTime(item.lunchIn)}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{formatTime(item.timeOut)}</TableCell>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {item.totalHours ? `${item.totalHours} hrs` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(item)}
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                        title="Edit entry"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 3. Modal Dialog for Editing / Retroactive Logging */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white p-0">
          <DialogHeader className="p-4 border-b border-zinc-800">
            <DialogTitle className="text-base font-semibold">
              {selectedRecord ? "Edit Attendance Entry" : "Log Missed Shift"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <AttendanceForm
              initialData={selectedRecord}
              onSuccess={handleFormSuccess}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

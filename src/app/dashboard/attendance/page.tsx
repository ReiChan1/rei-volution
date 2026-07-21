import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceClock } from "@/components/AttendanceClock";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, History } from "lucide-react";

export default async function AttendancePage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return <div className="p-6 text-center text-zinc-400">Please sign in to view attendance.</div>;
  }

  // Calculate local date string (YYYY-MM-DD) for today in Manila/Local Time
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
  const today = new Date(`${localIso}T00:00:00.000Z`);

  // Fetch today's record for the clock widget
  const todayRecord = await prisma.attendance.findFirst({
    where: { userId, date: today },
  });

  // Fetch full attendance history sorted by date descending
  const attendanceHistory = await prisma.attendance.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30, // Most recent 30 records
  });

  function formatTime(date: Date | null | undefined) {
    if (!date) return "—";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      {/* 1. Live Clock & Shift Widget */}
      <AttendanceClock initialRecord={JSON.parse(JSON.stringify(todayRecord))} />

      {/* 2. Attendance History Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-muted" /> Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attendanceHistory.length === 0 ? (
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
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceHistory.map((item) => (
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
                    <TableCell className="text-right font-medium text-xs sm:text-sm">
                      {item.totalHours ? `${item.totalHours} hrs` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, Coffee, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AttendanceRecord {
  id: string;
  date: string;
  timeIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  timeOut: string | null;
  status: string;
  totalHours: number;
}

interface AttendanceClockProps {
  initialRecord?: AttendanceRecord | null;
}

export function AttendanceClock({ initialRecord = null }: AttendanceClockProps) {
  const router = useRouter();
  const [record, setRecord] = useState<AttendanceRecord | null>(initialRecord);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRecord(initialRecord);
  }, [initialRecord]);

  // Determine current active step
  const hasTimeIn = Boolean(record?.timeIn);
  const hasLunchOut = Boolean(record?.lunchOut);
  const hasLunchIn = Boolean(record?.lunchIn);
  const hasTimeOut = Boolean(record?.timeOut);

  function getNextStep(): { step: "timeIn" | "lunchOut" | "lunchIn" | "timeOut"; label: string; icon: any } | null {
    if (!hasTimeIn) return { step: "timeIn", label: "Time In", icon: LogIn };
    if (!hasLunchOut) return { step: "lunchOut", label: "Lunch Out", icon: Coffee };
    if (!hasLunchIn) return { step: "lunchIn", label: "Lunch In", icon: Coffee };
    if (!hasTimeOut) return { step: "timeOut", label: "Time Out", icon: LogOut };
    return null; // All steps completed
  }

  const nextStep = getNextStep();

  async function handleClockAction() {
    if (!nextStep) return;
    setLoading(true);

    try {
      const res = await fetch("/api/attendance/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: nextStep.step }),
      });

      const data = await res.json();

      if (res.ok) {
        setRecord(data);
        toast.success(`Successfully recorded ${nextStep.label}!`);
        router.refresh();
      } else if (data.record) {
        // STATE RECOVERY: Server returns existing record on 400 "Already clocked in"
        setRecord(data.record);
        toast.info("Synced today's attendance log from database.");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to update attendance.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function formatTime(isoString: string | null | undefined) {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  const IconComponent = nextStep?.icon;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted" /> Today's Shift
          </span>
          {record?.status && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${
                record.status === "late"
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
              }`}
            >
              {record.status}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timestamp Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-border bg-surface-1">
            <span className="text-muted block font-medium">In</span>
            <span className="font-semibold text-sm">{formatTime(record?.timeIn)}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-border bg-surface-1">
            <span className="text-muted block font-medium">Lunch Out</span>
            <span className="font-semibold text-sm">{formatTime(record?.lunchOut)}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-border bg-surface-1">
            <span className="text-muted block font-medium">Lunch In</span>
            <span className="font-semibold text-sm">{formatTime(record?.lunchIn)}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-border bg-surface-1">
            <span className="text-muted block font-medium">Out</span>
            <span className="font-semibold text-sm">{formatTime(record?.timeOut)}</span>
          </div>
        </div>

        {/* Action Button */}
        {nextStep ? (
          <Button
            onClick={handleClockAction}
            disabled={loading}
            className="w-full h-11 text-sm font-medium gap-2"
          >
            {IconComponent && <IconComponent className="h-4 w-4" />}
            {loading ? "Updating shift..." : nextStep.label}
          </Button>
        ) : (
          <div className="p-3 text-center rounded-xl bg-surface-2 text-xs text-muted">
            Shift completed for today 🎉 ({record?.totalHours ?? 0} hrs logged)
          </div>
        )}
      </CardContent>
    </Card>
  );
}

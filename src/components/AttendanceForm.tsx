"use client";

import { useState, useEffect } from "react";

interface AttendanceRecord {
  id?: string;
  date: string;
  timeIn?: string | null;
  lunchOut?: string | null;
  lunchIn?: string | null;
  timeOut?: string | null;
  notes?: string | null;
}

interface UserSettings {
  workTimeIn?: string | null;
  workTimeOut?: string | null;
  expectedHours?: number;
}

interface AttendanceFormProps {
  settings?: UserSettings | null;
  initialData?: AttendanceRecord | null;
  onSuccess?: () => void;
}

export function AttendanceForm({ settings, initialData, onSuccess }: AttendanceFormProps) {
  const defaultIn = settings?.workTimeIn || "08:00";
  const defaultOut = settings?.workTimeOut || "17:00";

  function extractTimeString(isoString?: string | null) {
    if (!isoString) return "";
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const [date, setDate] = useState<string>(
    initialData ? initialData.date.split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [timeInStr, setTimeInStr] = useState<string>(
    initialData?.timeIn ? extractTimeString(initialData.timeIn) : defaultIn
  );
  const [lunchOutStr, setLunchOutStr] = useState<string>(
    extractTimeString(initialData?.lunchOut)
  );
  const [lunchInStr, setLunchInStr] = useState<string>(
    extractTimeString(initialData?.lunchIn)
  );
  const [timeOutStr, setTimeOutStr] = useState<string>(
    initialData?.timeOut ? extractTimeString(initialData.timeOut) : defaultOut
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || "");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date.split("T")[0]);
      setTimeInStr(extractTimeString(initialData.timeIn) || defaultIn);
      setLunchOutStr(extractTimeString(initialData.lunchOut));
      setLunchInStr(extractTimeString(initialData.lunchIn));
      setTimeOutStr(extractTimeString(initialData.timeOut) || defaultOut);
      setNotes(initialData.notes || "");
    }
  }, [initialData]);

  const handleApplyDefaults = () => {
    setTimeInStr(defaultIn);
    setTimeOutStr(defaultOut);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id, // Includes ID if editing an existing entry
          date,
          timeInStr,
          lunchOutStr: lunchOutStr || null,
          lunchInStr: lunchInStr || null,
          timeOutStr,
          notes,
        }),
      });

      if (res.ok) {
        if (onSuccess) onSuccess();
      } else {
        alert("Failed to save attendance entry.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-white">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">Shift Time Presets</span>
        <button
          type="button"
          onClick={handleApplyDefaults}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition"
        >
          Use Standard Shift ({defaultIn} – {defaultOut})
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Time In</label>
          <input
            type="time"
            value={timeInStr}
            onChange={(e) => setTimeInStr(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Time Out</label>
          <input
            type="time"
            value={timeOutStr}
            onChange={(e) => setTimeOutStr(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Lunch Out (Optional)</label>
          <input
            type="time"
            value={lunchOutStr}
            onChange={(e) => setLunchOutStr(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Lunch In (Optional)</label>
          <input
            type="time"
            value={lunchInStr}
            onChange={(e) => setLunchInStr(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional shift notes..."
          rows={2}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition"
      >
        {loading ? "Saving..." : initialData ? "Update Attendance" : "Save Attendance"}
      </button>
    </form>
  );
}

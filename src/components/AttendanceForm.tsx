"use client";

import { useState } from "react";

interface UserSettings {
  workTimeIn?: string | null;
  workTimeOut?: string | null;
  expectedHours?: number;
}

interface AttendanceFormProps {
  settings?: UserSettings | null;
  onSuccess?: () => void;
}

export function AttendanceForm({ settings, onSuccess }: AttendanceFormProps) {
  const defaultIn = settings?.workTimeIn || "08:00";
  const defaultOut = settings?.workTimeOut || "17:00";

  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [timeInStr, setTimeInStr] = useState<string>(defaultIn);
  const [lunchOutStr, setLunchOutStr] = useState<string>("");
  const [lunchInStr, setLunchInStr] = useState<string>("");
  const [timeOutStr, setTimeOutStr] = useState<string>(defaultOut);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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
        alert("Failed to submit attendance.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 text-white space-y-4 max-w-md">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h2 className="font-semibold text-base text-zinc-100">Log Attendance</h2>
        <button
          type="button"
          onClick={handleApplyDefaults}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition"
        >
          Fill Company Shift ({defaultIn} – {defaultOut})
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
        {loading ? "Saving..." : "Save Attendance"}
      </button>
    </form>
  );
}

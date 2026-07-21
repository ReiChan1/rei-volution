"use client";

import { useState, useEffect } from "react";

interface UserSettings {
  workTimeIn?: string | null;
  workTimeOut?: string | null;
  expectedHours?: number;
  monthlyBudget?: number | null;
  dateFormat?: string;
  notifyTaskDue?: boolean;
  notifyBudget?: boolean;
  notifySavingsGoal?: boolean;
  notifyAttendance?: boolean;
}

export function SettingsForm() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Office schedule states
  const [workTimeIn, setWorkTimeIn] = useState<string>("08:00");
  const [workTimeOut, setWorkTimeOut] = useState<string>("17:00");
  const [expectedHours, setExpectedHours] = useState<number>(8.0);

  // Load existing settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data: UserSettings = await res.json();
          if (data) {
            if (data.workTimeIn) setWorkTimeIn(data.workTimeIn);
            if (data.workTimeOut) setWorkTimeOut(data.workTimeOut);
            if (data.expectedHours) setExpectedHours(data.expectedHours);
          }
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workTimeIn,
          workTimeOut,
          expectedHours: parseFloat(expectedHours.toString()),
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Company work hours updated successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to update settings." });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "An error occurred while saving." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-zinc-400 text-sm">Loading settings...</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-white space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Company Work Schedule</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Set your default office hours. These values will auto-fill your attendance entries and be used to calculate lates and undertime.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-medium ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Standard Time In
            </label>
            <input
              type="time"
              value={workTimeIn}
              onChange={(e) => setWorkTimeIn(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Standard Time Out
            </label>
            <input
              type="time"
              value={workTimeOut}
              onChange={(e) => setWorkTimeOut(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Expected Daily Hours
          </label>
          <input
            type="number"
            step="0.5"
            min="1"
            max="24"
            value={expectedHours}
            onChange={(e) => setExpectedHours(parseFloat(e.target.value))}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <span className="text-[11px] text-zinc-500 mt-1 block">
            Used as the baseline for calculating overtime and undertime.
          </span>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition"
          >
            {saving ? "Saving Schedule..." : "Save Office Hours"}
          </button>
        </div>
      </form>
    </div>
  );
}

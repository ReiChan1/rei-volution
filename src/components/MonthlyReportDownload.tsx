"use client";

import { useState } from "react";

export function MonthlyReportDownload() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly?year=${selectedYear}&month=${selectedMonth}`);
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to download monthly report.");
        return;
      }

      const data = await res.json();

      // Trigger text file download in browser
      const blob = new Blob([data.document], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Monthly_Report_${data.year}_${String(selectedMonth).padStart(2, "0")}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("An error occurred during download.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-2xl border border-border">
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(Number(e.target.value))}
        className="bg-transparent text-sm font-medium px-2 py-1 rounded-xl outline-none"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={i + 1} className="bg-background text-foreground">
            {new Date(0, i).toLocaleString("default", { month: "short" })}
          </option>
        ))}
      </select>

      <input
        type="number"
        value={selectedYear}
        onChange={(e) => setSelectedYear(Number(e.target.value))}
        className="w-16 bg-transparent text-sm font-medium px-1 py-1 rounded-xl outline-none"
      />

      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-xs font-medium transition-all bg-secondary text-secondary-foreground hover:opacity-80 px-3 py-1.5 disabled:opacity-50"
      >
        {loading ? "Compiling..." : "Save Monthly"}
      </button>
    </div>
  );
}

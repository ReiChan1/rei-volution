"use client";

import { useState } from "react";

export function MonthlyReportButton() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly?year=${year}&month=${month}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "Failed to download monthly report.");
        return;
      }

      const data = await res.json();

      // Create a text file blob and trigger browser download
      const blob = new Blob([data.document], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Monthly_Report_${data.year}_${String(data.month).padStart(2, "0")}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("An error occurred while compiling the report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    
       setMonth(Number(e.target.value))}
        className="border px-3 py-1.5 rounded-md bg-white text-sm"
      >
        {Array.from({ length: 12 }, (_, i) => (
          
            {new Date(0, i).toLocaleString("default", { month: "long" })}
          
        ))}
      

       setYear(Number(e.target.value))}
        className="border px-3 py-1.5 rounded-md w-24 bg-white text-sm"
      />

      
        {loading ? "Compiling..." : "Save Monthly Report"}
      
    
  );
}

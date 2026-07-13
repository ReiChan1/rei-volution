"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  hint,
  delay = 0,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "primary" | "teal" | "amber" | "danger";
  hint?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="p-5 transition-transform hover:-translate-y-0.5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              accent === "primary" && "bg-primary/15 text-primary",
              accent === "teal" && "bg-teal/15 text-teal",
              accent === "amber" && "bg-amber/15 text-amber",
              accent === "danger" && "bg-danger/15 text-danger"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="skeleton h-3 w-20 rounded-full" />
      <div className="skeleton mt-3 h-7 w-28 rounded-lg" />
    </Card>
  );
}

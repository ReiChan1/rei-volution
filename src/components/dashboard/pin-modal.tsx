"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useUIStore } from "@/store/ui-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PinModal() {
  const { pinModal, closePinModal } = useUIStore();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!/^\d{6}$/.test(pin)) {
      setError("Enter your 6-digit PIN");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Incorrect PIN");
        setLoading(false);
        return;
      }
      pinModal.onSuccess?.();
      toast.success("PIN verified");
      setPin("");
      closePinModal();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={pinModal.open}
      onOpenChange={(open) => {
        if (!open) {
          setPin("");
          setError(null);
          closePinModal();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <DialogTitle>Security PIN required</DialogTitle>
          <DialogDescription>{pinModal.reason || "Enter your 6-digit PIN to continue."}</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className="text-center text-lg tracking-[0.5em]"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={closePinModal}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Verifying…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

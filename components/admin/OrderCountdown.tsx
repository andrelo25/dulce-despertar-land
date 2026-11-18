"use client";

import { confirmCountdown } from "@/lib/domain/orders";
import { useNow } from "./useNow";

export function OrderCountdown({ createdAt }: { createdAt: string }) {
  const now = useNow();
  if (now === 0) return <span className="timer">&nbsp;</span>;
  const { label, urgent } = confirmCountdown(Date.parse(createdAt), now);
  return <span className={urgent ? "timer late" : "timer"}>{label}</span>;
}

"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function StreakCounter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value <= 0) {
      setDisplayed(0);
      return;
    }

    let current = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const timer = window.setInterval(() => {
      current = Math.min(current + step, value);
      setDisplayed(current);
      if (current >= value) window.clearInterval(timer);
    }, 40);

    return () => window.clearInterval(timer);
  }, [value]);

  return (
    <span
      className={cn(
        "block font-mono text-[40px] font-semibold leading-none text-[#FBBF24]",
        className,
      )}
    >
      {displayed}
    </span>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";

interface CountdownTimerProps {
  /** ISO timestamp when voting ends */
  endAt: string | null;
  /** Current event status */
  status: string;
  /** Called when countdown reaches zero */
  onExpired?: () => void;
  /** Display variant: 'badge' for small corner display, 'inline' for admin panel */
  variant?: "badge" | "inline";
}

function calcRemaining(endAt: string | null): number {
  if (!endAt) return 0;
  const diff = new Date(endAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CountdownTimer({
  endAt,
  status,
  onExpired,
  variant = "badge",
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(endAt));
  const [expired, setExpired] = useState(false);

  const isActive = status === "voting" || status === "countdown";

  // Recalc when endAt changes
  useEffect(() => {
    setRemaining(calcRemaining(endAt));
    setExpired(false);
  }, [endAt]);

  // Tick every second while active
  useEffect(() => {
    if (!isActive || !endAt) return;

    const tick = () => {
      const r = calcRemaining(endAt);
      setRemaining(r);
      if (r <= 0 && !expired) {
        setExpired(true);
        onExpired?.();
      }
    };

    tick(); // immediate
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt, isActive, expired, onExpired]);

  // Don't render if no end time or not in an active state
  if (!endAt) return null;

  const isUrgent = remaining <= 15 && remaining > 0;
  const isDone = remaining <= 0 || !isActive;

  if (variant === "inline") {
    return (
      <div className="countdown-inline">
        <div className={`countdown-display ${isUrgent ? "countdown-urgent" : ""} ${isDone ? "countdown-done" : ""}`}>
          <svg
            className="countdown-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="countdown-time">{isDone ? "00:00" : formatTime(remaining)}</span>
        </div>
        {isDone && isActive && (
          <span className="countdown-expired-text">Hết giờ!</span>
        )}
      </div>
    );
  }

  // Badge variant — small fixed position
  return (
    <div
      className={`countdown-badge ${isUrgent ? "countdown-badge-urgent" : ""} ${isDone ? "countdown-badge-done" : ""}`}
    >
      <svg
        className="countdown-badge-icon"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="countdown-badge-time">
        {isDone ? (status === "locked" || status === "result" ? "Đã kết thúc" : "00:00") : formatTime(remaining)}
      </span>
    </div>
  );
}

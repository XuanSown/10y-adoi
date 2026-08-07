"use client";

import { useCallback, useEffect, useState } from "react";
import { ConnectionBanner } from "@/components/connection-banner";
import { CountdownTimer } from "@/components/countdown-timer";
import { SponsorBanner } from "@/components/sponsor-banner";
import { useRealtimeSubscription } from "@/lib/supabase/realtime";

type Candidate = {
  id: string;
  name: string;
  image_path: string;
  display_order: number;
  vote_count: number;
};

type EventData = {
  id: string;
  name: string;
  status: string;
  end_at: string | null;
};

const POLL_INTERVAL = 15_000;

function getBarColor(rank: number): string {
  if (rank === 0) return "rank-bar-gold";
  if (rank <= 2) return "rank-bar-blue";
  return "rank-bar-gray";
}

const XAXIS_TICKS = [0, 50, 100, 150, 200];
const XAXIS_MAX = 200;

export default function RankPage() {
  const [event, setEvent] = useState<EventData | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch("/api/snapshot");
      const json = await res.json();
      if (json.ok) {
        setEvent(json.data.event);
        setCandidates(json.data.candidates ?? []);
      }
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCountdownExpired = useCallback(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const refreshSnapshot = useCallback(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  useRealtimeSubscription("candidates-ch", "candidates", refreshSnapshot);
  useRealtimeSubscription("events-ch", "events", refreshSnapshot);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/snapshot");
      const json = await res.json();
      if (!active) return;
      if (json.ok) {
        setEvent(json.data.event);
        setCandidates(json.data.candidates ?? []);
      }
      setConnected(true);
      setLoading(false);
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white text-lg">Đang tải...</p>
      </main>
    );
  }

  const sorted = [...candidates].sort((a, b) => b.vote_count - a.vote_count);
  const totalVotes = sorted.reduce((sum, c) => sum + c.vote_count, 0);

  return (
    <main className="min-h-screen flex flex-col">
      <ConnectionBanner connected={connected} />

      {event?.end_at && (event?.status === "voting" || event?.status === "countdown") && (
        <CountdownTimer
          endAt={event.end_at}
          status={event.status}
          onExpired={handleCountdownExpired}
        />
      )}

      {/* Sponsor logos banner — before header */}
      <SponsorBanner />

      <header className="liquid-glass-header text-white py-4 px-4 text-center">
        <div className="fx-focus" role="img" aria-label={event?.name ?? "Sự kiện"}>
          {(event?.name ?? "Sự kiện").split("").map((ch, i) => (
            <b key={i} aria-hidden="true" style={{ "--i": i } as React.CSSProperties}>{ch === " " ? "\u00A0" : ch}</b>
          ))}
        </div>
        <p className="fx-subtitle text-white/90 text-base sm:text-xl mt-1.5">Bình chọn bài video truyền cảm hứng nhất</p>
      </header>

      <div className="flex-1 flex items-center justify-center px-2 sm:px-8 py-4">
        <div className="w-full max-w-7xl">
          {/* Chart area */}
          <div className="space-y-6 sm:space-y-8">
            {sorted.map((c, idx) => {
              const pct = (c.vote_count / XAXIS_MAX) * 100;
              return (
                <div key={c.id} className="rank-row">
                  {/* Label */}
                  <div className="rank-label">
                    <span className="rank-order">{idx + 1}</span>
                    <span className="rank-name">{c.name}</span>
                  </div>
                  {/* Bar */}
                  <div className="rank-bar-track">
                    <div
                      className={`rank-bar-fill ${getBarColor(idx)} ${mounted ? "rank-bar-animate" : ""}`}
                      style={{ width: mounted ? `${pct}%` : "0%" }}
                    />
                    {/* Value at end of bar */}
                    <span
                      className={`rank-value ${mounted ? "rank-value-animate" : ""}`}
                      style={{ opacity: mounted ? 1 : 0 }}
                    >
                      {c.vote_count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis */}
          <div className="rank-xaxis">
            <div className="rank-xaxis-line" />
            <div className="rank-xaxis-ticks">
              {XAXIS_TICKS.map((t) => (
                <span key={t} className="rank-xaxis-tick" style={{ left: `${(t / XAXIS_MAX) * 100}%` }}>
                  {t}
                </span>
              ))}
            </div>
            <p className="text-center text-white/50 text-xs mt-1">Số vote</p>
          </div>
        </div>
      </div>

      <footer className="bg-black/20 text-white/70 text-center py-2 text-xs">
        Tổng {totalVotes} vote
      </footer>
    </main>
  );
}

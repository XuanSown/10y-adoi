"use client";

import { useCallback, useEffect, useState } from "react";
import { ConnectionBanner } from "@/components/connection-banner";
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

export default function RankPage() {
  const [event, setEvent] = useState<EventData | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white text-lg">Đang tải...</p>
      </main>
    );
  }

  const sorted = [...candidates].sort((a, b) => a.display_order - b.display_order);
  const maxVotes = Math.max(...sorted.map((c) => c.vote_count), 1);
  const totalVotes = sorted.reduce((sum, c) => sum + c.vote_count, 0);

  return (
    <main className="min-h-screen flex flex-col">
      <ConnectionBanner connected={connected} />

      <header className="liquid-glass-header text-white py-4 px-4 text-center">
        <div className="fx-focus" role="img" aria-label={event?.name ?? "Sự kiện"}>
          {(event?.name ?? "Sự kiện").split("").map((ch, i) => (
            <b key={i} aria-hidden="true" style={{ "--i": i } as React.CSSProperties}>{ch}</b>
          ))}
        </div>
        <p className="fx-subtitle text-white/70 text-sm mt-1">Bảng xếp hạng</p>
      </header>

      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {sorted.map((c) => {
            const pct = (c.vote_count / maxVotes) * 100;
            return (
              <div key={c.id} className="liquid-glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                      {c.display_order}
                    </span>
                    <span className="font-medium text-sm text-on-surface">{c.name}</span>
                  </div>
                  <span className="font-bold text-primary text-sm shrink-0 ml-2">
                    {c.vote_count} <span className="text-on-surface-muted font-normal text-xs">vote</span>
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="bg-black/20 text-white/70 text-center py-2 text-xs">
        Tổng {totalVotes} vote
      </footer>
    </main>
  );
}

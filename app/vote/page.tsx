"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CandidateCard } from "@/components/candidate-card";
import { VoteConfirmDialog } from "@/components/vote-confirm-dialog";
import { ConnectionBanner } from "@/components/connection-banner";
import { CountdownTimer } from "@/components/countdown-timer";
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

type VoterData = {
  id: string;
  display_name: string;
  has_voted: boolean;
  voted_at: string | null;
};

const POLL_INTERVAL = 15_000;

function VoteInner() {
  const searchParams = useSearchParams();
  const isDisplay = searchParams.get("display") === "true";

  const [event, setEvent] = useState<EventData | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voter, setVoter] = useState<VoterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);
  const [nameVisible, setNameVisible] = useState(true);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch("/api/snapshot");
      const json = await res.json();
      if (json.ok) {
        setEvent(json.data.event);
        setCandidates(json.data.candidates ?? []);
        setVoter(json.data.voter ?? null);
        if (json.data.voter?.has_voted) {
          setVotedCandidateId(json.data.voter.id);
        }
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

  const handleCountdownExpired = useCallback(() => {
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
        setVoter(json.data.voter ?? null);
        if (json.data.voter?.has_voted) {
          setVotedCandidateId(json.data.voter.id);
        }
      }
      setConnected(true);
      setLoading(false);
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, []);

  function handleCardClick(candidate: Candidate) {
    if (isDisplay) return;
    if (voter?.has_voted) return;
    setSelectedCandidate(candidate);
    setConfirmOpen(true);
  }

  async function handleConfirmVote() {
    if (!selectedCandidate) return;
    setVotingLoading(true);

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setVotedCandidateId(selectedCandidate.id);
        setVoter((prev) => prev ? { ...prev, has_voted: true, voted_at: new Date().toISOString() } : null);
        setConfirmOpen(false);
        setSelectedCandidate(null);
      } else {
        setError(data.message || "Bình chọn thất bại");
        setConfirmOpen(false);
      }
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setVotingLoading(false);
    }
  }

  function handleCancelVote() {
    setConfirmOpen(false);
    setSelectedCandidate(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white text-lg">Đang tải...</p>
      </main>
    );
  }

  const votingOpen = event?.status === "voting";
  const votingClosed = event?.status === "locked" || event?.status === "result";

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

      <header className="liquid-glass-header text-white py-4 px-4 text-center">
        <div className="fx-focus" role="img" aria-label={event?.name ?? "Sự kiện"}>
          {(event?.name ?? "Sự kiện").split("").map((ch, i) => (
            <b key={i} aria-hidden="true" style={{ "--i": i } as React.CSSProperties}>{ch === " " ? "\u00A0" : ch}</b>
          ))}
        </div>
        {voter && !isDisplay && (
          <p className="text-sm opacity-80 inline-flex items-center gap-1.5">
            Xin chào, {nameVisible ? voter.display_name : "• • • •"}
            <button
              onClick={() => setNameVisible((v) => !v)}
              className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-white/20 transition-colors"
              aria-label={nameVisible ? "Ẩn tên" : "Hiện tên"}
            >
              {nameVisible ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              )}
            </button>
          </p>
        )}
        {votingClosed && !isDisplay && (
          <p className="text-xs mt-1 text-amber-300">Đã khóa bình chọn</p>
        )}
      </header>

      <div className="flex-1 p-4">
        {error && (
          <div className="bg-danger/10 border border-danger text-danger px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {voter?.has_voted && !isDisplay && (
          <div className="bg-success/10 border border-success text-success px-4 py-2 rounded-lg mb-4 text-sm text-center">
            ✓ Bạn đã bình chọn. Cảm ơn bạn đã tham gia!
          </div>
        )}

        {/* Layout grid — all cards equal size */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 mb-4">
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              id={c.id}
              name={c.name}
              imagePath={c.image_path}
              voteCount={c.vote_count}
              displayOrder={c.display_order}
              disabled={isDisplay || !!voter?.has_voted || !votingOpen}
              selected={votedCandidateId === c.id}
              hasVoted={!!voter?.has_voted}
              onSelect={() => handleCardClick(c)}
            />
          ))}
        </div>
      </div>

      <footer className="bg-black/20 text-white/70 text-center py-2 text-xs">
        {voter?.has_voted && !isDisplay && <span>Đã bình chọn • </span>}
        {!voter?.has_voted && !isDisplay && votingOpen && <span>Chọn một thí sinh để vote • </span>}
        Tổng {candidates.reduce((sum, c) => sum + c.vote_count, 0)} vote
      </footer>

      <VoteConfirmDialog
        candidateName={selectedCandidate?.name ?? ""}
        open={confirmOpen}
        loading={votingLoading}
        onConfirm={handleConfirmVote}
        onCancel={handleCancelVote}
      />
    </main>
  );
}

export default function VotePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white text-lg">Đang tải...</p>
      </main>
    }>
      <VoteInner />
    </Suspense>
  );
}

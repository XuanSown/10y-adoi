"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CandidateCard } from "@/components/candidate-card";
import { VoteConfirmDialog } from "@/components/vote-confirm-dialog";
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

      <header className="liquid-glass-header text-white py-3 px-4 text-center">
        <div className="fx-focus truncate" role="img" aria-label={event?.name ?? "Sự kiện"}>
          {(event?.name ?? "Sự kiện").split("").map((ch, i) => (
            <b key={i} aria-hidden="true" style={{ "--i": i } as React.CSSProperties}>{ch}</b>
          ))}
        </div>
        {voter && !isDisplay && (
          <p className="text-sm opacity-80">Xin chào, {voter.display_name}</p>
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

        {/* Layout 2-2-1 */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 mb-4">
          {candidates.slice(0, 4).map((c) => (
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

        {candidates[4] && (
          <div className="max-w-[50%] mx-auto">
            <CandidateCard
              id={candidates[4].id}
              name={candidates[4].name}
              imagePath={candidates[4].image_path}
              voteCount={candidates[4].vote_count}
              displayOrder={candidates[4].display_order}
              disabled={isDisplay || !!voter?.has_voted || !votingOpen}
              selected={votedCandidateId === candidates[4].id}
              hasVoted={!!voter?.has_voted}
              onSelect={() => handleCardClick(candidates[4])}
            />
          </div>
        )}
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

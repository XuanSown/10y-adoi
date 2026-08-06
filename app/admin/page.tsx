"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeSubscription } from "@/lib/supabase/realtime";
import { CountdownTimer } from "@/components/countdown-timer";

type Candidate = {
  id: string;
  name: string;
  display_order: number;
  vote_count: number;
};

type EventData = {
  id: string;
  name: string;
  status: string;
  end_at: string | null;
};

type VoterEntry = {
  display_name: string;
  has_voted: boolean;
  voted_at: string | null;
};

type Stats = {
  total: number;
  voted: number;
  notVoted: number;
  completionRate: number;
};

export default function AdminPage() {
  const [event, setEvent] = useState<EventData | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<VoterEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, voted: 0, notVoted: 0, completionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const [startMinutes, setStartMinutes] = useState(5);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showResetVotesModal, setShowResetVotesModal] = useState(false);
  const [showResetEventModal, setShowResetEventModal] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (json.ok) {
        setEvent(json.data.event);
        setCandidates(json.data.candidates ?? []);
        setVoters(json.data.voters ?? []);
        setStats(json.data.stats);
      } else if (res.status === 403) {
        setError("Không có quyền truy cập");
      }
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useRealtimeSubscription("admin-candidates", "candidates", refreshDashboard);
  useRealtimeSubscription("admin-events", "events", refreshDashboard);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/dashboard");
        const json = await res.json();
        if (!active) return;
        if (json.ok) {
          setEvent(json.data.event);
          setCandidates(json.data.candidates ?? []);
          setVoters(json.data.voters ?? []);
          setStats(json.data.stats);
        } else if (res.status === 403) {
          setError("Không có quyền truy cập");
        }
      } catch {
        if (active) setError("Lỗi kết nối");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  async function callAdminApi(endpoint: string, body?: object) {
    setActionLoading(endpoint);
    try {
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message || "Thao tác thất bại");
      }
      await fetchDashboard();
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setActionLoading("");
    }
  }

  function handleStart() {
    callAdminApi("start", { durationMinutes: startMinutes });
    setShowStartModal(false);
  }

  function handleLock() {
    callAdminApi("lock");
    setShowLockModal(false);
  }

  function handleReopen() {
    callAdminApi("reopen");
    setShowReopenModal(false);
  }

  function handleReveal() {
    callAdminApi("reveal");
    setShowRevealModal(false);
  }

  const handleAutoLock = useCallback(async () => {
    if (event?.status !== "voting") return;
    await callAdminApi("lock");
  }, [event?.status]);

  function handleResetVotes() {
    if (resetConfirmation !== "RESET_VOTES") {
      setError('Cần nhập "RESET_VOTES" để xác nhận');
      return;
    }
    callAdminApi("reset-votes", { confirmation: resetConfirmation });
    setShowResetVotesModal(false);
    setResetConfirmation("");
  }

  function handleResetEvent() {
    if (resetConfirmation !== "RESET_EVENT") {
      setError('Cần nhập "RESET_EVENT" để xác nhận');
      return;
    }
    callAdminApi("reset-event", { confirmation: resetConfirmation });
    setShowResetEventModal(false);
    setResetConfirmation("");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white">Đang tải...</p>
      </main>
    );
  }

  const statusLabels: Record<string, string> = {
    draft: "Chưa bắt đầu",
    countdown: "Đếm ngược",
    voting: "Đang vote",
    locked: "Đã khóa",
    result: "Đã công bố",
  };

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
        <p className="text-white/70 text-sm mb-4">{event?.name}</p>

        {error && (
          <div className="bg-danger/10 border border-danger text-danger px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Tổng đăng nhập" value={stats.total} />
          <StatCard label="Đã vote" value={stats.voted} />
          <StatCard label="Chưa vote" value={stats.notVoted} />
          <StatCard label="Tỷ lệ hoàn thành" value={`${stats.completionRate}%`} />
        </div>

        {/* Status */}
        <div className="liquid-glass-card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Trạng thái:</span>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary">
              {statusLabels[event?.status ?? ""] ?? event?.status}
            </span>
          </div>
          {event?.end_at && event?.status === "voting" && (
            <CountdownTimer
              endAt={event.end_at}
              status={event.status}
              variant="inline"
              onExpired={handleAutoLock}
            />
          )}
          {event?.end_at && event?.status !== "voting" && (
            <p className="text-sm text-on-surface-muted">
              Kết thúc: {new Date(event.end_at).toLocaleTimeString("vi-VN")}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="liquid-glass-card p-4 mb-6">
          <h2 className="font-bold mb-3">Điều khiển</h2>
          <div className="flex flex-wrap gap-2">
            {event?.status === "draft" && (
              <Btn onClick={() => setShowStartModal(true)} loading={actionLoading === "start"}>
                Bắt đầu vote
              </Btn>
            )}
            {event?.status === "voting" && (
              <Btn onClick={() => setShowLockModal(true)} loading={actionLoading === "lock"} variant="danger">
                Khóa vote
              </Btn>
            )}
            {event?.status === "locked" && (
              <>
                <Btn onClick={() => setShowReopenModal(true)} loading={actionLoading === "reopen"}>
                  Mở lại
                </Btn>
                <Btn onClick={() => setShowRevealModal(true)} loading={actionLoading === "reveal"} variant="success">
                  Công bố kết quả
                </Btn>
              </>
            )}
            {event?.status === "result" && (
              <Btn onClick={() => setShowReopenModal(true)} loading={actionLoading === "reopen"}>
                Mở lại vote
              </Btn>
            )}
          </div>
        </div>

        {/* Candidates */}
        <div className="liquid-glass-card p-4 mb-6">
          <h2 className="font-bold mb-3">Kết quả vote</h2>
          <div className="space-y-2">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {c.display_order}
                  </span>
                  <span className="font-medium text-sm">{c.name}</span>
                </div>
                <span className="font-bold text-primary">{c.vote_count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Voters */}
        <div className="liquid-glass-card p-4 mb-6">
          <h2 className="font-bold mb-3">Danh sách người tham gia ({voters.length})</h2>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-white/60 border-b border-white/15">
                <tr>
                  <th className="py-2">Tên</th>
                  <th className="py-2 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {voters.map((v, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="py-1.5">{v.display_name}</td>
                    <td className="py-1.5 text-center">
                      {v.has_voted ? (
                        <span className="text-success text-xs font-medium">✓ Đã vote</span>
                      ) : (
                        <span className="text-white/50 text-xs">Chưa vote</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reset */}
        <div className="liquid-glass-card p-4">
          <h2 className="font-bold mb-3 text-danger">Nguy hiểm</h2>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => setShowResetVotesModal(true)} variant="danger" small>
              Reset votes
            </Btn>
            <Btn onClick={() => setShowResetEventModal(true)} variant="danger" small>
              Reset toàn bộ
            </Btn>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showStartModal && (
        <Modal title="Bắt đầu vote" onClose={() => setShowStartModal(false)}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Thời gian (phút)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={startMinutes}
              onChange={(e) => setStartMinutes(Number(e.target.value))}
              className="w-full border border-white/30 bg-white/10 text-white rounded-lg px-3 py-2"
            />
          </div>
          <Btn onClick={handleStart} loading={actionLoading === "start"}>Bắt đầu</Btn>
        </Modal>
      )}

      {showLockModal && (
        <Modal title="Khóa vote" onClose={() => setShowLockModal(false)}>
          <p className="mb-4 text-sm text-white/70">Xác nhận khóa vote? Người dùng sẽ không thể vote tiếp.</p>
          <Btn onClick={handleLock} variant="danger" loading={actionLoading === "lock"}>Xác nhận khóa</Btn>
        </Modal>
      )}

      {showReopenModal && (
        <Modal title="Mở lại vote" onClose={() => setShowReopenModal(false)}>
          <p className="mb-4 text-sm text-white/70">Mở lại vote?</p>
          <Btn onClick={handleReopen} loading={actionLoading === "reopen"}>Xác nhận mở lại</Btn>
        </Modal>
      )}

      {showRevealModal && (
        <Modal title="Công bố kết quả" onClose={() => setShowRevealModal(false)}>
          <p className="mb-4 text-sm text-white/70">Công bố kết quả? Hành động này không thể hoàn tác.</p>
          <Btn onClick={handleReveal} variant="success" loading={actionLoading === "reveal"}>Xác nhận công bố</Btn>
        </Modal>
      )}

      {showResetVotesModal && (
        <Modal title="Reset votes" onClose={() => { setShowResetVotesModal(false); setResetConfirmation(""); }}>
          <p className="mb-2 text-sm text-danger">Tất cả votes và trạng thái đã vote sẽ bị xóa.</p>
          <p className="mb-4 text-sm text-white/70">Nhập <code className="bg-white/10 px-1 rounded">RESET_VOTES</code> để xác nhận:</p>
          <input
            type="text"
            value={resetConfirmation}
            onChange={(e) => setResetConfirmation(e.target.value)}
            className="w-full border border-white/30 bg-white/10 text-white rounded-lg px-3 py-2 mb-4"
            placeholder="RESET_VOTES"
          />
          <Btn onClick={handleResetVotes} variant="danger" loading={actionLoading === "reset-votes"}>Xác nhận reset</Btn>
        </Modal>
      )}

      {showResetEventModal && (
        <Modal title="Reset toàn bộ" onClose={() => { setShowResetEventModal(false); setResetConfirmation(""); }}>
          <p className="mb-2 text-danger font-medium">XÓA TOÀN BỘ DỮ LIỆU!</p>
          <p className="mb-4 text-sm text-white/70">Nhập <code className="bg-white/10 px-1 rounded">RESET_EVENT</code> để xác nhận:</p>
          <input
            type="text"
            value={resetConfirmation}
            onChange={(e) => setResetConfirmation(e.target.value)}
            className="w-full border border-white/30 bg-white/10 text-white rounded-lg px-3 py-2 mb-4"
            placeholder="RESET_EVENT"
          />
          <Btn onClick={handleResetEvent} variant="danger" loading={actionLoading === "reset-event"}>Xác nhận reset</Btn>
        </Modal>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="liquid-glass-card p-3 text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-white/70 mt-1">{label}</p>
    </div>
  );
}

function Btn({
  children,
  onClick,
  loading,
  variant = "primary",
  small,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  variant?: "primary" | "danger" | "success";
  small?: boolean;
}) {
  const colors = {
    primary: "bg-primary hover:bg-primary-dark text-white",
    danger: "bg-danger hover:bg-red-700 text-white",
    success: "bg-success hover:bg-emerald-700 text-white",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${colors[variant]} ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2"} rounded-lg font-medium transition disabled:opacity-50`}
    >
      {loading ? "Đang xử lý..." : children}
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="liquid-glass-card rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 border border-white/30 rounded-lg text-sm font-medium hover:bg-white/10 transition"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

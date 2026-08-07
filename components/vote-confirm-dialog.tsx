"use client";

import { useRef } from "react";

interface VoteConfirmDialogProps {
  candidateName: string;
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function VoteConfirmDialog({
  candidateName,
  open,
  loading,
  onConfirm,
  onCancel,
}: VoteConfirmDialogProps) {
  const submittedRef = useRef(false);

  if (!open) {
    // Reset guard when dialog closes
    submittedRef.current = false;
    return null;
  }

  const isDisabled = loading || submittedRef.current;

  function handleConfirmClick() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onConfirm();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-bold text-on-surface mb-2">Xác nhận bình chọn</h2>
        <p className="text-on-surface-muted mb-6">
          Bạn chọn <span className="font-semibold text-primary">{candidateName}</span>?
          <br />
          <span className="text-sm text-danger">Bạn chỉ được vote một lần và không thể đổi sau khi đã chọn.</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDisabled}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium text-on-surface hover:bg-gray-50 transition disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={isDisabled}
            className="flex-1 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition disabled:opacity-50"
          >
            {loading ? "Đang gửi..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

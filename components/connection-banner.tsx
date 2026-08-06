"use client";

interface ConnectionBannerProps {
  connected: boolean;
}

export function ConnectionBanner({ connected }: ConnectionBannerProps) {
  if (connected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-amber-500 text-white text-center py-2 text-sm font-medium">
      ⚠ Mất kết nối realtime — đang kết nối lại...
    </div>
  );
}

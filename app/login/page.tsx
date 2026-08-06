"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.message || "Đăng nhập thất bại");
        setLoading(false);
        return;
      }

      router.push(data.redirectTo ?? "/vote");
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="fx-spotlight text-primary-dark">SPOTLIGHT</div>
          <p className="text-on-surface-muted mt-2">A Decade Of Inspiration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-on-surface mb-1">
              Nhập tên của bạn
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên hiển thị (2–50 ký tự)"
              minLength={2}
              maxLength={50}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
            />
          </div>

          {error && (
            <p className="text-danger text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || name.trim().length < 2}
            className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}

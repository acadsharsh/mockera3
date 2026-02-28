"use client";

import { useEffect, useMemo, useState } from "react";

export type BroadcastMessage = {
  id: string;
  title: string;
  body: string;
  startsAt?: string | null;
  endsAt?: string | null;
};

const shouldShowToday = (id: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const key = `broadcast_seen_${id}_${today}`;
  return !localStorage.getItem(key);
};

const markSeen = (id: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const key = `broadcast_seen_${id}_${today}`;
  localStorage.setItem(key, "1");
};

export default function BroadcastPopup() {
  const [message, setMessage] = useState<BroadcastMessage | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/broadcast/active", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as BroadcastMessage | null;
      if (!data) return;
      if (shouldShowToday(data.id)) {
        setMessage(data);
        setOpen(true);
      }
    };
    load();

    const handleRefresh = () => {
      load();
    };

    window.addEventListener("broadcast:refresh", handleRefresh);
    const interval = window.setInterval(load, 60000);

    return () => {
      window.removeEventListener("broadcast:refresh", handleRefresh);
      window.clearInterval(interval);
    };
  }, []);

  const handleClose = () => {
    if (message) {
      markSeen(message.id);
    }
    setOpen(false);
  };

  if (!open || !message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-black p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">{message.title}</div>
            <div className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{message.body}</div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/70"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

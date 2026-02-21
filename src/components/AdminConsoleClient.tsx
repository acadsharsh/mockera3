"use client";

import { useEffect, useMemo, useState } from "react";
import GlassRail from "@/components/GlassRail";

type TestItem = {
  id: string;
  title: string;
  visibility: string;
  hidden: boolean;
  ownerEmail?: string | null;
  createdAt?: string;
};

type UserItem = {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
};

type BroadcastMessage = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export default function AdminConsoleClient() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [active, setActive] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const load = async () => {
    const [t, u, b] = await Promise.all([
      fetch("/api/admin/tests", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/broadcast", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setTests(Array.isArray(t) ? t : []);
    setUsers(Array.isArray(u) ? u : []);
    setBroadcasts(Array.isArray(b) ? b : []);
  };

  useEffect(() => {
    load();
  }, []);

  const createBroadcast = async () => {
    if (!title.trim() || !body.trim()) return;
    await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, active, startsAt, endsAt }),
    });
    setTitle("");
    setBody("");
    setStartsAt("");
    setEndsAt("");
    await load();
  };

  const toggleHidden = async (id: string, hidden: boolean) => {
    await fetch("/api/admin/tests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, hidden }),
    });
    await load();
  };

  const deleteTest = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    await fetch(`/api/admin/tests?id=${id}`, { method: "DELETE" });
    await load();
  };

  const revokeUser = async (id: string) => {
    if (!confirm("Revoke all sessions for this user?")) return;
    await fetch("/api/admin/sessions/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <GlassRail />
      <div className="mx-auto w-full max-w-6xl px-6 pt-24 pb-10">
        <h1 className="text-2xl font-semibold">Admin</h1>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">Broadcast Message</h2>
          <div className="mt-3 grid gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message"
              rows={4}
              className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Active
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="rounded-md border border-white/10 bg-black px-2 py-1"
              />
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="rounded-md border border-white/10 bg-black px-2 py-1"
              />
              <button onClick={createBroadcast} className="rounded-md border border-white/10 px-3 py-1">
                Publish
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">Tests</h2>
          <div className="mt-3 space-y-2 text-xs">
            {tests.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border border-white/10 rounded-md px-3 py-2">
                <div>
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-white/50">{t.ownerEmail ?? ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-white/10 px-2 py-1" onClick={() => toggleHidden(t.id, !t.hidden)}>
                    {t.hidden ? "Unhide" : "Hide"}
                  </button>
                  <button className="rounded-md border border-rose-400/40 px-2 py-1 text-rose-200" onClick={() => deleteTest(t.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">Users</h2>
          <div className="mt-3 space-y-2 text-xs">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 border border-white/10 rounded-md px-3 py-2">
                <div>
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-white/50">{u.email}</div>
                </div>
                <button className="rounded-md border border-white/10 px-2 py-1" onClick={() => revokeUser(u.id)}>
                  Revoke Sessions
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

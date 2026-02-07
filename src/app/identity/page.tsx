"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import GlassRail from "@/components/GlassRail";

type ProfileData = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  stats: {
    testsCount: number;
    attemptsCount: number;
    totalTimeSeconds: number;
    avgAccuracy?: number;
    avgScore?: number;
    bestScore?: number;
    fastestAttemptSeconds?: number;
    lastAttemptAt?: string | null;
    strongestSubject?: string | null;
    subjectStats?: Array<{
      subject: string;
      attempted: number;
      correct: number;
      accuracy: number;
    }>;
  };
  sessions: Array<{ id: string; expires: string }>;
};

export default function IdentityPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [imageDraft, setImageDraft] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/profile");
      const data = await response.json();
      setProfile(data);
      setNameDraft(data?.user?.name ?? "");
      setImageDraft(data?.user?.image ?? "");
      setLoading(false);
    };
    load();
  }, []);

  const totalHours = profile ? Math.round(profile.stats.totalTimeSeconds / 360) / 10 : 0;
  const avgAccuracy = profile ? Math.round((profile.stats.avgAccuracy ?? 0) * 100) : 0;
  const avgScore = profile ? Math.round(profile.stats.avgScore ?? 0) : 0;
  const bestScore = profile ? Math.round(profile.stats.bestScore ?? 0) : 0;
  const avgTimeMinutes =
    profile && profile.stats.attemptsCount > 0
      ? Math.round(profile.stats.totalTimeSeconds / profile.stats.attemptsCount / 6) / 10
      : 0;
  const fastestAttemptMinutes = profile?.stats.fastestAttemptSeconds
    ? Math.round(profile.stats.fastestAttemptSeconds / 6) / 10
    : 0;
  const subjectStats = profile?.stats.subjectStats ?? [];

  const saveProfile = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft.trim(), image: imageDraft.trim() }),
      });
      const data = await response.json();
      setProfile((prev) => (prev ? { ...prev, user: data.user } : prev));
      setSaveMessage("Profile updated.");
    } catch {
      setSaveMessage("Update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      <GlassRail />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-20 pt-24 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Identity Vault</p>
            <h1 className="mt-3 text-3xl font-semibold">Profile & Security</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Manage your presence, sessions, and the glow of your workspace.
            </p>
          </div>
          <button
            className="rounded-full bg-rose-500/20 px-4 py-2 text-xs text-rose-100 transition hover:bg-rose-500/40"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-card col-span-2 rounded-[28px] border border-white/10 bg-white/5 p-6"
          >
            <div className="flex items-center gap-4">
              {profile?.user?.image ? (
                <img
                  src={profile.user.image}
                  alt={profile.user.name ?? "Profile"}
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/60 to-indigo-800/40" />
              )}
              <div>
                <div className="text-xl font-semibold">
                  {profile?.user?.name ?? (loading ? "Loading..." : "Anonymous")}
                </div>
                <div className="text-xs text-slate-400">{profile?.user?.email ?? "—"}</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-slate-400">Display Name</label>
                <input
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Avatar URL</label>
                <input
                  value={imageDraft}
                  onChange={(event) => setImageDraft(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
              {saveMessage && <span className="text-xs text-slate-400">{saveMessage}</span>}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-3xl font-semibold">{loading ? 0 : totalHours}</div>
                <p className="text-xs text-slate-400">Total Solving Hours</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-3xl font-semibold">
                  {loading ? 0 : profile?.stats.attemptsCount ?? 0}
                </div>
                <p className="text-xs text-slate-400">Tests Attempted</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-3xl font-semibold">
                  {loading ? 0 : profile?.stats.testsCount ?? 0}
                </div>
                <p className="text-xs text-slate-400">Tests Created</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-3xl font-semibold">{loading ? "0%" : `${avgAccuracy}%`}</div>
                <p className="text-xs text-slate-400">Avg Accuracy</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-3xl font-semibold">{loading ? 0 : avgScore}</div>
                <p className="text-xs text-slate-400">Avg Score</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-3xl font-semibold">{loading ? 0 : bestScore}</div>
                <p className="text-xs text-slate-400">Best Score</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass-card col-span-1 rounded-[28px] border border-white/10 bg-white/5 p-6"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Overview</p>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Tests Created</span>
                <span>{loading ? 0 : profile?.stats.testsCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Attempts</span>
                <span>{loading ? 0 : profile?.stats.attemptsCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Avg Time / Attempt</span>
                <span>{loading ? "0 min" : `${avgTimeMinutes} min`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fastest Attempt</span>
                <span>{loading ? "0 min" : `${fastestAttemptMinutes} min`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Strongest Subject</span>
                <span>{loading ? "Not set" : profile?.stats.strongestSubject ?? "Not set"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Attempt</span>
                <span>
                  {loading
                    ? "Not yet"
                    : profile?.stats.lastAttemptAt
                    ? new Date(profile.stats.lastAttemptAt).toLocaleDateString()
                    : "Not yet"}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="glass-card rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Subject Accuracy</p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
                Fetching subject performance...
              </div>
            ) : subjectStats.length ? (
              subjectStats.map((stat) => (
                <div
                  key={stat.subject}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {stat.subject}
                  </div>
                  <div className="mt-3 text-3xl font-semibold">
                    {Math.round(stat.accuracy * 100)}%
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {stat.correct} correct of {stat.attempted} attempts
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
                No subject data yet. Finish a test to unlock subject accuracy.
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Session Security</p>
          <div className="mt-5 space-y-3 text-sm">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
                Loading sessions...
              </div>
            ) : profile?.sessions?.length ? (
              profile.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <div className="font-semibold">Active Session</div>
                    <div className="text-xs text-slate-400">Expires {new Date(session.expires).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-slate-400">{session.id.slice(0, 6)}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
                No active sessions found.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

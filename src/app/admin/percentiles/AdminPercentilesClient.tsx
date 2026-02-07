"use client";

import { useEffect, useMemo, useState } from "react";
import GlassRail from "@/components/GlassRail";

type Test = { id: string; title: string };
type Band = {
  minScore: number;
  maxScore?: number | null;
  percentileLabel: string;
};

export default function AdminPercentilesClient() {
  const [tests, setTests] = useState<Test[]>([]);
  const [activeTestId, setActiveTestId] = useState("");
  const [bands, setBands] = useState<Band[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/tests");
      const data = await res.json();
      const list = Array.isArray(data)
        ? data.map((item: any) => ({ id: item.id, title: item.title }))
        : [];
      setTests(list);
      if (list.length > 0) {
        setActiveTestId(list[0].id);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!activeTestId) return;
    const loadBands = async () => {
      const res = await fetch(`/api/percentile-bands?testId=${activeTestId}`);
      const data = await res.json();
      setBands(
        Array.isArray(data)
          ? data.map((band: any) => ({
              minScore: Number(band.minScore),
              maxScore: band.maxScore === null ? null : Number(band.maxScore),
              percentileLabel: String(band.percentileLabel ?? ""),
            }))
          : []
      );
    };
    loadBands();
  }, [activeTestId]);

  const sortedBands = useMemo(
    () => [...bands].sort((a, b) => a.minScore - b.minScore),
    [bands]
  );

  const updateBand = (index: number, patch: Partial<Band>) => {
    setBands((prev) =>
      prev.map((band, idx) => (idx === index ? { ...band, ...patch } : band))
    );
  };

  const addBand = () => {
    setBands((prev) => [...prev, { minScore: 0, maxScore: null, percentileLabel: "" }]);
  };

  const removeBand = (index: number) => {
    setBands((prev) => prev.filter((_, idx) => idx !== index));
  };

  const saveBands = async () => {
    if (!activeTestId) return;
    setSaving(true);
    setStatus("");
    try {
      const payload = {
        testId: activeTestId,
        bands: sortedBands.map((band) => ({
          minScore: Number.isFinite(band.minScore) ? band.minScore : 0,
          maxScore:
            band.maxScore === null || band.maxScore === undefined
              ? null
              : Number(band.maxScore),
          percentileLabel: band.percentileLabel.trim(),
        })),
      };
      const res = await fetch("/api/percentile-bands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error ?? "Save failed");
      }
      const saved = await res.json();
      setBands(
        Array.isArray(saved)
          ? saved.map((band: any) => ({
              minScore: Number(band.minScore),
              maxScore: band.maxScore === null ? null : Number(band.maxScore),
              percentileLabel: String(band.percentileLabel ?? ""),
            }))
          : []
      );
      setStatus("Saved");
    } catch (error: any) {
      setStatus(error?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      <GlassRail />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-16 pt-28">
        <div className="rounded-3xl border border-white/10 bg-[#121826] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Admin</p>
              <h1 className="mt-2 text-2xl font-semibold">Percentile Bands</h1>
              <p className="mt-1 text-sm text-white/60">
                Map score thresholds to percentile labels for each test.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="rounded-xl border border-white/10 bg-[#0F1524] px-4 py-2 text-sm text-white"
                value={activeTestId}
                onChange={(event) => setActiveTestId(event.target.value)}
              >
                {tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.title}
                  </option>
                ))}
              </select>
              <button
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/30"
                onClick={addBand}
              >
                Add Band
              </button>
              <button
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                onClick={saveBands}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0F1524] p-6">
          <div className="grid grid-cols-12 gap-3 text-xs uppercase tracking-[0.2em] text-white/50">
            <div className="col-span-3">Min Score</div>
            <div className="col-span-3">Max Score</div>
            <div className="col-span-5">Percentile Label</div>
            <div className="col-span-1 text-right">Remove</div>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {sortedBands.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/50">
                No bands yet. Add the first one for this test.
              </div>
            )}
            {sortedBands.map((band, index) => (
              <div
                key={`${band.minScore}-${index}`}
                className="grid grid-cols-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#121826] p-4"
              >
                <input
                  type="number"
                  className="col-span-3 rounded-xl border border-white/10 bg-[#0F1524] px-3 py-2 text-sm text-white"
                  value={band.minScore}
                  onChange={(event) => updateBand(index, { minScore: Number(event.target.value) })}
                />
                <input
                  type="number"
                  className="col-span-3 rounded-xl border border-white/10 bg-[#0F1524] px-3 py-2 text-sm text-white"
                  placeholder="Optional"
                  value={band.maxScore ?? ""}
                  onChange={(event) =>
                    updateBand(index, {
                      maxScore: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                />
                <input
                  className="col-span-5 rounded-xl border border-white/10 bg-[#0F1524] px-3 py-2 text-sm text-white"
                  placeholder="e.g. 99.95+"
                  value={band.percentileLabel}
                  onChange={(event) => updateBand(index, { percentileLabel: event.target.value })}
                />
                <button
                  className="col-span-1 text-right text-xs text-white/60 hover:text-white"
                  onClick={() => removeBand(index)}
                  aria-label="Remove band"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {status && <p className="mt-4 text-xs text-white/60">{status}</p>}
        </div>
      </div>
    </div>
  );
}

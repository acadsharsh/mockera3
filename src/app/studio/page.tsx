"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GlassRail from "@/components/GlassRail";

type CropMeta = {
  id: string;
  pageNumber: number;
  parts: number;
  x: number;
  y: number;
  w: number;
  h: number;
  subject: "Physics" | "Chemistry" | "Maths";
  questionType: "MCQ" | "MSQ" | "NUM";
  correctOption: "A" | "B" | "C" | "D";
  correctOptions?: Array<"A" | "B" | "C" | "D">;
  correctNumeric?: string;
  marks: "+4/-1";
  difficulty: "Easy" | "Moderate" | "Tough";
  imageDataUrl: string;
  questionText: string;
  options: string[];
};

const subjects = ["Physics", "Chemistry", "Maths"] as const;
const difficulties = ["Easy", "Moderate", "Tough"] as const;
const optionLetters = ["A", "B", "C", "D"] as const;

const subjectAccents: Record<CropMeta["subject"], { accent: string; glow: string }> = {
  Physics: { accent: "#38bdf8", glow: "rgba(56,189,248,0.35)" },
  Chemistry: { accent: "#34d399", glow: "rgba(52,211,153,0.35)" },
  Maths: { accent: "#a78bfa", glow: "rgba(167,139,250,0.35)" },
};

const makeAccessCode = () => `BATCH-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const SETTINGS_KEY = "creatorStudioSettings";

export default function CreatorStudio() {
  const router = useRouter();
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfApi, setPdfApi] = useState<{ getDocument: any } | null>(null);
  const [pageScale, setPageScale] = useState(1.7);
  const [currentPage, setCurrentPage] = useState(1);
  const [cropRects, setCropRects] = useState<CropMeta[]>([]);
  const [activeCropId, setActiveCropId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftRect, setDraftRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [visibility, setVisibility] = useState<"Public" | "Private">("Public");
  const [accessCode, setAccessCode] = useState(makeAccessCode());
  const [title, setTitle] = useState("JEE Advanced Mock Test 2024");
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [markingCorrect, setMarkingCorrect] = useState(4);
  const [markingIncorrect, setMarkingIncorrect] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [lastSubject, setLastSubject] = useState<CropMeta["subject"]>("Physics");
  const [lastDifficulty, setLastDifficulty] = useState<CropMeta["difficulty"]>("Easy");
  const [selectedCropIds, setSelectedCropIds] = useState<Set<string>>(new Set());
  const [bulkSubject, setBulkSubject] = useState<CropMeta["subject"]>("Physics");
  const [bulkDifficulty, setBulkDifficulty] = useState<CropMeta["difficulty"]>("Easy");
  const [lockNavigation, setLockNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const cropTool: "rect" = "rect";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  const renderScaleRef = useRef(1);

  useEffect(() => {
    let mounted = true;
    import("pdfjs-dist").then((mod) => {
      if (!mounted) return;
      mod.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      setPdfApi({ getDocument: mod.getDocument });
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Partial<{
        subject: CropMeta["subject"];
        difficulty: CropMeta["difficulty"];
        markingCorrect: number;
        markingIncorrect: number;
      }>;
      if (saved.subject) {
        setLastSubject(saved.subject);
        setBulkSubject(saved.subject);
      }
      if (saved.difficulty) {
        setLastDifficulty(saved.difficulty);
        setBulkDifficulty(saved.difficulty);
      }
      if (typeof saved.markingCorrect === "number") {
        setMarkingCorrect(saved.markingCorrect);
      }
      if (typeof saved.markingIncorrect === "number") {
        setMarkingIncorrect(saved.markingIncorrect);
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        subject: lastSubject,
        difficulty: lastDifficulty,
        markingCorrect,
        markingIncorrect,
      })
    );
  }, [lastSubject, lastDifficulty, markingCorrect, markingIncorrect]);

  const saveTest = useCallback(async () => {
    if (!title.trim() || cropRects.length === 0) {
      alert("Please enter a title and create at least one crop.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          visibility,
          accessCode: visibility === "Private" ? accessCode : undefined,
          durationMinutes,
          markingCorrect,
          markingIncorrect,
          crops: cropRects,
          lockNavigation,
        }),
      });
      const saved = await response.json();
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2200);
      router.push(`/test-created?testId=${saved.id}`);
    } finally {
      setSaving(false);
    }
  }, [
    accessCode,
    cropRects,
    durationMinutes,
    lockNavigation,
    markingCorrect,
    markingIncorrect,
    router,
    title,
    visibility,
  ]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "s") {
        event.preventDefault();
        saveTest();
        return;
      }
      if (key === "c") {
        event.preventDefault();
        setActiveCropId(null);
        if (viewerRef.current) {
          viewerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      if (key === "s") {
        event.preventDefault();
        saveTest();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveTest]);

  const activeCrop = cropRects.find((rect) => rect.id === activeCropId) || null;
  const activeAccent = activeCrop ? subjectAccents[activeCrop.subject] : subjectAccents.Physics;

  const renderPdfPage = async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current) {
      return;
    }

    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: pageScale });
    const outputScale = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    renderScaleRef.current = outputScale;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    if (overlayRef.current) {
      overlayRef.current.style.width = `${viewport.width}px`;
      overlayRef.current.style.height = `${viewport.height}px`;
    }

    if (context) {
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      await page.render({ canvasContext: context, viewport }).promise;
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPdfPage(currentPage);
    }
  }, [pdfDoc, currentPage, pageScale]);

  useEffect(() => {
    setDraftRect(null);
    setSelectionRect(null);
    setIsDrawing(false);
    setIsSelecting(false);
    if (activeCropId) {
      const activeCrop = cropRects.find((rect) => rect.id === activeCropId);
      if (activeCrop && activeCrop.pageNumber !== currentPage) {
        setActiveCropId(null);
      }
    }
  }, [currentPage, activeCropId, cropRects]);

  useEffect(() => {
    if (!pendingFocusIdRef.current) return;
    const target = cropRects.find((rect) => rect.id === pendingFocusIdRef.current);
    if (!target || target.pageNumber !== currentPage) return;
    if (viewerRef.current) {
      viewerRef.current.scrollTo({
        top: Math.max(0, target.y - 40),
        behavior: "smooth",
      });
    }
    pendingFocusIdRef.current = null;
  }, [currentPage, cropRects]);

  const handleUpload = async (file: File | null) => {
    if (!file) {
      return;
    }
    if (!pdfApi) {
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdfApi.getDocument({ data: arrayBuffer }).promise;
    setPdfDoc(doc);
    setCurrentPage(1);
    setCropRects([]);
    setActiveCropId(null);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current) {
      return;
    }

    const rect = overlayRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    startRef.current = { x, y };
    if (event.shiftKey) {
      setSelectionRect({ x, y, w: 0, h: 0 });
      setIsSelecting(true);
      setIsDrawing(false);
      return;
    }
    setDraftRect({ x, y, w: 0, h: 0 });
    setIsDrawing(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((!isDrawing && !isSelecting) || !startRef.current || !overlayRef.current) {
      return;
    }

    const rect = overlayRef.current.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    let x = Math.min(startRef.current.x, currentX);
    let y = Math.min(startRef.current.y, currentY);
    let w = Math.abs(currentX - startRef.current.x);
    let h = Math.abs(currentY - startRef.current.y);
    if (isSelecting) {
      setSelectionRect({ x, y, w, h });
      return;
    }
    setDraftRect({ x, y, w, h });
  };

  const createImageDataUrl = (rect: { x: number; y: number; w: number; h: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return "";
    }
    const tempCanvas = document.createElement("canvas");
    const scale = renderScaleRef.current || 1;
    tempCanvas.width = Math.max(1, Math.floor(rect.w * scale));
    tempCanvas.height = Math.max(1, Math.floor(rect.h * scale));
    const tempContext = tempCanvas.getContext("2d");
    if (!tempContext) {
      return "";
    }
    tempContext.drawImage(
      canvas,
      rect.x * scale,
      rect.y * scale,
      rect.w * scale,
      rect.h * scale,
      0,
      0,
      rect.w * scale,
      rect.h * scale
    );
    return tempCanvas.toDataURL("image/png");
  };

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = src;
    });

  const makeId = (prefix: string) => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const stitchImages = async (topSrc: string, bottomSrc: string) => {
    const [top, bottom] = await Promise.all([loadImage(topSrc), loadImage(bottomSrc)]);
    const width = Math.max(top.width, bottom.width);
    const height = top.height + bottom.height;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return topSrc;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(top, (width - top.width) / 2, 0);
    ctx.drawImage(bottom, (width - bottom.width) / 2, top.height);
    return canvas.toDataURL("image/png");
  };

  const mergeCrops = async (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const source = cropRects.find((rect) => rect.id === sourceId);
    const target = cropRects.find((rect) => rect.id === targetId);
    if (!source || !target) return;
    const mergedImage = await stitchImages(target.imageDataUrl, source.imageDataUrl);
    const nextParts = (target.parts ?? 1) + (source.parts ?? 1);
    setCropRects((prev) =>
      prev
        .filter((rect) => rect.id !== sourceId)
        .map((rect) =>
          rect.id === targetId ? { ...rect, imageDataUrl: mergedImage, parts: nextParts } : rect
        )
    );
    setSelectedCropIds((prev) => {
      const next = new Set(prev);
      next.delete(sourceId);
      return next;
    });
    if (activeCropId === sourceId) {
      setActiveCropId(targetId);
    }
  };


  const handlePointerUp = () => {
    if (isSelecting && selectionRect) {
      const sx = selectionRect.x;
      const sy = selectionRect.y;
      const ex = selectionRect.x + selectionRect.w;
      const ey = selectionRect.y + selectionRect.h;
      const hits = cropRects
        .filter((rect) => rect.pageNumber === currentPage)
        .filter((rect) => {
          const rx1 = rect.x;
          const ry1 = rect.y;
          const rx2 = rect.x + rect.w;
          const ry2 = rect.y + rect.h;
          const overlap =
            Math.max(0, Math.min(ex, rx2) - Math.max(sx, rx1)) *
            Math.max(0, Math.min(ey, ry2) - Math.max(sy, ry1));
          return overlap > 0;
        })
        .map((rect) => rect.id);
      setSelectedCropIds((prev) => {
        const next = new Set(prev);
        hits.forEach((id) => next.add(id));
        return next;
      });
      setSelectionRect(null);
      setIsSelecting(false);
      return;
    }
    const minSize = 12;
    if (!draftRect || draftRect.w < minSize || draftRect.h < 12) {
      setDraftRect(null);
      setIsDrawing(false);
      return;
    }

    const imageDataUrl = createImageDataUrl(draftRect);

    const newRect: CropMeta = {
      id: makeId("crop"),
      pageNumber: currentPage,
      parts: 1,
      ...draftRect,
      subject: lastSubject,
      questionType: "MCQ",
      correctOption: "A",
      correctOptions: ["A"],
      correctNumeric: "",
      marks: "+4/-1",
      difficulty: lastDifficulty,
      imageDataUrl,
      questionText: "",
      options: ["Option A", "Option B", "Option C", "Option D"],
    };

    setCropRects((prev) => [...prev, newRect]);
    setActiveCropId(null);
    setDraftRect(null);
    setIsDrawing(false);

    if (viewerRef.current) {
      viewerRef.current.scrollBy({
        top: Math.max(120, newRect.h + 48),
        behavior: "smooth",
      });
    }
  };

  const updateActiveCrop = (updates: Partial<CropMeta>) => {
    if (!activeCropId) {
      return;
    }

    setCropRects((prev) =>
      prev.map((rect) => (rect.id === activeCropId ? { ...rect, ...updates } : rect))
    );
  };

  const toggleCorrectOption = (letter: "A" | "B" | "C" | "D") => {
    if (!activeCropId) return;
    setCropRects((prev) =>
      prev.map((rect) => {
        if (rect.id !== activeCropId) return rect;
        const current = new Set(rect.correctOptions ?? []);
        if (current.has(letter)) {
          current.delete(letter);
        } else {
          current.add(letter);
        }
        const next = Array.from(current);
        return { ...rect, correctOptions: next };
      })
    );
  };

  const toggleSelection = (id: string) => {
    setSelectedCropIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyBulkTags = () => {
    if (selectedCropIds.size === 0) return;
    setCropRects((prev) =>
      prev.map((rect) =>
        selectedCropIds.has(rect.id)
          ? { ...rect, subject: bulkSubject, difficulty: bulkDifficulty }
          : rect
      )
    );
    setLastSubject(bulkSubject);
    setLastDifficulty(bulkDifficulty);
  };

  const updateOption = (index: number, value: string) => {
    if (!activeCropId) {
      return;
    }
    setCropRects((prev) =>
      prev.map((rect) => {
        if (rect.id !== activeCropId) {
          return rect;
        }
        const nextOptions = [...(rect.options ?? [])];
        while (nextOptions.length < 4) {
          nextOptions.push("");
        }
        nextOptions[index] = value;
        return { ...rect, options: nextOptions };
      })
    );
  };

  const deleteSelected = () => {
    if (selectedCropIds.size === 0) return;
    setCropRects((prev) => prev.filter((rect) => !selectedCropIds.has(rect.id)));
    if (activeCropId && selectedCropIds.has(activeCropId)) {
      setActiveCropId(null);
    }
    setSelectedCropIds(new Set());
  };

  const focusCrop = (id: string) => {
    const rect = cropRects.find((item) => item.id === id);
    if (!rect) return;
    setActiveCropId(id);
    if (rect.pageNumber !== currentPage) {
      pendingFocusIdRef.current = id;
      setCurrentPage(rect.pageNumber);
      return;
    }
    if (viewerRef.current) {
      viewerRef.current.scrollTo({
        top: Math.max(0, rect.y - 40),
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      className="relative min-h-screen bg-[#0f0f10] text-white"
      style={{ "--accent": activeAccent.accent } as React.CSSProperties}
    >
      <GlassRail />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(circle at 15% 20%, ${activeAccent.glow}, transparent 55%)`,
        }}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pt-24 pb-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Precision Workbench</p>
            <h1 className="mt-2 text-3xl font-semibold">Creator Studio</h1>
            <p className="mt-2 text-sm text-white/60">Turn any PDF into a CBT-ready test in minutes.</p>
            <p className="mt-2 text-[11px] text-white/50">Shortcuts: C = Crop · S = Save</p>
            <p className="mt-1 text-[11px] text-white/40">Shift + drag = multi-select</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card flex items-center gap-2 rounded-full px-2 py-1 text-xs">
              <span className="px-2 text-[11px] text-white/60">Visibility</span>
              <button
                className={`rounded-full px-3 py-1 ${visibility === "Public" ? "bg-white text-black" : "text-white/60"}`}
                onClick={() => setVisibility("Public")}
                type="button"
              >
                Public
              </button>
              <button
                className={`rounded-full px-3 py-1 ${visibility === "Private" ? "bg-white text-black" : "text-white/60"}`}
                onClick={() => setVisibility("Private")}
                type="button"
              >
                Private
              </button>
            </div>
            {visibility === "Private" && (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs">
                <input
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  className="w-28 bg-transparent text-xs text-white outline-none placeholder:text-white/40"
                />
                <button
                  className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70"
                  onClick={() => setAccessCode(makeAccessCode())}
                  type="button"
                >
                  Generate
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200 transition hover:border-white/30 hover:text-white"
            >
              Settings
            </button>
            <button
              onClick={saveTest}
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black"
              disabled={saving}
            >
              {saving ? "Saving..." : "Publish Test"}
            </button>
          </div>
        </header>

        <div
          className={`pointer-events-none fixed right-6 top-6 z-50 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-semibold text-white shadow-lg transition-all duration-300 ${
            toastVisible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0"
          }`}
        >
          Test saved successfully
        </div>

        {pdfDoc ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <main className="glass-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-white/60">
                  {pdfDoc ? `Page ${currentPage} of ${pdfDoc.numPages}` : "Upload a PDF"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                <span>Total: {cropRects.length}</span>
                <span className="text-white/30">•</span>
                <span>Current: {activeCropId ? cropRects.findIndex((crop) => crop.id === activeCropId) + 1 : "--"}</span>
                <span className="text-white/30">•</span>
                <span>Selected: {selectedCropIds.size}</span>
                <span className="text-white/30">•</span>
                {selectedCropIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCropIds(new Set())}
                    className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/70 transition hover:border-white/30"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 text-[11px]">
                  <button
                    type="button"
                    className={`rounded-md px-2 py-1 ${
                      cropTool === "rect" ? "bg-white text-black" : "text-white/70 hover:text-white"
                    }`}
                  >
                    Rect
                  </button>
                </div>
                <button
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  type="button"
                >
                  &lt;
                </button>
                <button
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs"
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  type="button"
                >
                  &gt;
                </button>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1 text-xs">
                    <span>Zoom</span>
                    <input
                      type="range"
                      min="0.8"
                      max="2.4"
                      step="0.1"
                      value={pageScale}
                      onChange={(event) => setPageScale(Number(event.target.value))}
                    />
                  </label>
              </div>
            </div>

            <div
              ref={viewerRef}
              className="relative mt-4 flex max-h-[96vh] justify-center overflow-auto rounded-2xl bg-[#0c0c0e] p-1"
            >
              <div className="relative rounded-2xl bg-white p-3 shadow-xl">
                <canvas ref={canvasRef} className="rounded-2xl" />
                <div
                  ref={overlayRef}
                  className="absolute left-3 top-3 cursor-crosshair"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <div className="absolute inset-0 h-full w-full" />
                  {(draftRect || activeCrop) && (
                    <div
                      className="absolute rounded-md"
                      style={{
                        left: (draftRect ?? activeCrop)?.x ?? 0,
                        top: (draftRect ?? activeCrop)?.y ?? 0,
                        width: (draftRect ?? activeCrop)?.w ?? 0,
                        height: (draftRect ?? activeCrop)?.h ?? 0,
                        boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                        border: `2px solid ${activeAccent.accent}`,
                      }}
                    />
                  )}
                  {selectionRect && (
                    <div
                      className="absolute rounded-md border border-dashed border-white/70 bg-white/10"
                      style={{
                        left: selectionRect.x,
                        top: selectionRect.y,
                        width: selectionRect.w,
                        height: selectionRect.h,
                      }}
                    />
                  )}
                    {cropRects
                      .filter((rect) => rect.pageNumber === currentPage)
                      .map((rect) => (
                        <button
                          key={rect.id}
                          className={`absolute rounded-md border-2 ${
                            rect.id === activeCropId
                              ? "border-white/80"
                              : selectedCropIds.has(rect.id)
                              ? "border-emerald-300/80"
                              : "border-white/30"
                          }`}
                          style={{
                            left: rect.x,
                            top: rect.y,
                            width: rect.w,
                            height: rect.h,
                            background: rect.id === activeCropId ? "rgba(255,255,255,0.12)" : "transparent",
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (event.shiftKey) {
                              toggleSelection(rect.id);
                              return;
                            }
                            setActiveCropId(rect.id);
                          }}
                          type="button"
                        >
                          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">
                            {rect.subject} · {markingCorrect >= 0 ? `+${markingCorrect}` : markingCorrect}
                            /{markingIncorrect}
                          </span>
                        </button>
                      ))}
                </div>
              </div>
            </div>
          </main>

          <aside
            className="glass-card p-5"
            style={{ boxShadow: `0 0 40px ${activeAccent.glow}` }}
          >
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase text-white/60">Question Editor</p>
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">
                      {activeCrop
                        ? `Question ${cropRects.findIndex((crop) => crop.id === activeCrop.id) + 1}`
                        : "Question"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                    <div className="mb-2 text-[10px] uppercase text-white/50">Select Question</div>
                      <div className="flex max-h-32 flex-wrap gap-2 overflow-auto">
                        {cropRects.map((crop, index) => (
                          <button
                            key={crop.id}
                            type="button"
                            onClick={() => focusCrop(crop.id)}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/plain", crop.id);
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              const sourceId = event.dataTransfer.getData("text/plain");
                              mergeCrops(sourceId, crop.id);
                            }}
                            className={`rounded-full px-3 py-1 text-[11px] ${
                              crop.id === activeCropId
                                ? "bg-white text-black"
                                : "border border-white/10 text-white/70 hover:border-white/30"
                            }`}
                          >
                            <span>Q{index + 1}</span>
                            {crop.parts > 1 && (
                              <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-100">
                                Merged {crop.parts}
                              </span>
                            )}
                          </button>
                        ))}
                        {cropRects.length === 0 && (
                          <span className="text-[11px] text-white/50">No crops yet.</span>
                        )}
                    </div>
                  </div>
                  {activeCrop ? (
                    <>
                      <div>
                        <label className="text-white/60">Question Type</label>
                        <select
                          value={activeCrop.questionType}
                          onChange={(event) => {
                            const next = event.target.value as CropMeta["questionType"];
                            updateActiveCrop({ questionType: next });
                          }}
                          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                        >
                          <option value="MCQ">Multiple Choice</option>
                          <option value="MSQ">Multiple Answer</option>
                          <option value="NUM">Numerical</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-white/60">Subject</label>
                        <select
                          value={activeCrop.subject}
                          onChange={(event) => {
                            const next = event.target.value as CropMeta["subject"];
                            updateActiveCrop({ subject: next });
                            setLastSubject(next);
                          }}
                          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                        >
                          {subjects.map((subject) => (
                            <option key={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>
                      {activeCrop.questionType === "MCQ" && (
                        <div>
                          <label className="text-white/60">Correct Option</label>
                          <div className="mt-2 grid grid-cols-4 gap-2">
                            {optionLetters.map((letter) => (
                              <button
                                key={letter}
                                className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                                  activeCrop.correctOption === letter
                                    ? "border-white/80 bg-white/20"
                                    : "border-white/10 bg-white/5 text-white/70"
                                }`}
                                onClick={() => updateActiveCrop({ correctOption: letter })}
                                type="button"
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {activeCrop.questionType === "MSQ" && (
                        <div>
                          <label className="text-white/60">Correct Options</label>
                          <div className="mt-2 grid grid-cols-4 gap-2">
                            {optionLetters.map((letter) => {
                              const selected = activeCrop.correctOptions?.includes(letter) ?? false;
                              return (
                                <button
                                  key={letter}
                                  className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                                    selected
                                      ? "border-emerald-300/80 bg-emerald-400/20"
                                      : "border-white/10 bg-white/5 text-white/70"
                                  }`}
                                  onClick={() => toggleCorrectOption(letter)}
                                  type="button"
                                >
                                  {letter}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {activeCrop.questionType === "NUM" && (
                        <div>
                          <label className="text-white/60">Correct Answer (Numeric)</label>
                          <input
                            value={activeCrop.correctNumeric ?? ""}
                            onChange={(event) => updateActiveCrop({ correctNumeric: event.target.value })}
                            className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                            placeholder="e.g., 42"
                          />
                        </div>
                      )}
                      {activeCrop.questionType !== "NUM" && (
                        <div>
                          <label className="text-white/60">Options</label>
                          <div className="mt-2 space-y-2">
                            {optionLetters.map((letter, index) => (
                              <div key={letter} className="flex items-center gap-2">
                                <span className="w-6 text-[11px] text-white/60">{letter}.</span>
                                <input
                                  value={activeCrop.options?.[index] ?? ""}
                                  onChange={(event) => updateOption(index, event.target.value)}
                                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                                  placeholder={`Option ${letter}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
        ) : (
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-sm text-white/70">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={(event) => handleUpload(event.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                className="rounded-full bg-white px-6 py-3 text-xs font-semibold text-black shadow-lg shadow-white/10"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Browse PDF
              </button>
              <div className="text-xs text-white/50">Upload a PDF to unlock creator tools.</div>
            </div>
          </div>
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f10] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Test Settings</h2>
              <button
                type="button"
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70"
                onClick={() => setShowSettings(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <label className="text-white/60">Test Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-white/60">Duration (minutes)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/60">+ Marks</label>
                  <input
                    type="number"
                    value={markingCorrect}
                    onChange={(event) => setMarkingCorrect(Number(event.target.value))}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-white/60">- Marks</label>
                  <input
                    type="number"
                    value={markingIncorrect}
                    onChange={(event) => setMarkingIncorrect(Number(event.target.value))}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70"
                onClick={() => setShowSettings(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCropIds.size > 0 && (
        <div className="fixed bottom-6 right-6 z-40 w-72 rounded-2xl border border-white/10 bg-black/70 p-4 text-white shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">Selected Crops</div>
            <div className="text-xs text-white/70">{selectedCropIds.size} selected</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              value={bulkSubject}
              onChange={(event) => setBulkSubject(event.target.value as CropMeta["subject"])}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]"
            >
              {subjects.map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </select>
            <select
              value={bulkDifficulty}
              onChange={(event) => setBulkDifficulty(event.target.value as CropMeta["difficulty"])}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]"
            >
              {difficulties.map((difficulty) => (
                <option key={difficulty}>{difficulty}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="flex-1 rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-white/20"
              type="button"
              onClick={applyBulkTags}
            >
              Apply
            </button>
            <button
              className="flex-1 rounded-full border border-white/10 px-3 py-2 text-[11px] text-white/70 transition hover:border-white/30"
              type="button"
              onClick={() => setSelectedCropIds(new Set())}
            >
              Clear
            </button>
          </div>
          <button
            className="mt-3 w-full rounded-full bg-rose-500/20 px-3 py-2 text-[11px] text-rose-200 transition hover:bg-rose-500/30"
            type="button"
            onClick={deleteSelected}
          >
            Delete Selected
          </button>
        </div>
      )}
    </div>
  );
}

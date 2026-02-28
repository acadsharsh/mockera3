"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GlassRail from "@/components/GlassRail";
import { safeJson } from "@/lib/safe-json";

type ExamItem = {
  id: string;
  name: string;
  shortCode?: string | null;
};

type ChapterItem = {
  id: string;
  examId?: string | null;
  subject: string;
  name: string;
  order: number;
  topics?: TopicItem[];
};

type TopicItem = {
  id: string;
  chapterId: string;
  name: string;
  order: number;
};

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
  correctOption: "" | "A" | "B" | "C" | "D";
  correctOptions?: Array<"A" | "B" | "C" | "D">;
  correctNumeric?: string;
  solution?: string;
  marks: "+4/-1";
  difficulty: "Easy" | "Moderate" | "Tough";
  chapter?: string;
  topic?: string;
  imageDataUrl: string;
  questionText: string;
  options: string[];
  hasDiagram?: boolean;
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
const DRAFT_KEY = "creatorStudioDraftV1";

export default function CreatorStudio() {
  const router = useRouter();
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [testDescription, setTestDescription] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [examDirectory, setExamDirectory] = useState<ExamItem[]>([]);
  const [chapterDirectory, setChapterDirectory] = useState<ChapterItem[]>([]);
  const [pyqExamId, setPyqExamId] = useState<string | null>(null);
  const [pyqExamName, setPyqExamName] = useState<string | null>(null);
  const [pyqYear, setPyqYear] = useState<number | null>(null);
  const [pyqShift, setPyqShift] = useState<string | null>(null);
  const [testTags, setTestTags] = useState<string[]>([]);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [pdfApi, setPdfApi] = useState<{ getDocument: any } | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
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
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [markingCorrect, setMarkingCorrect] = useState(4);
  const [markingIncorrect, setMarkingIncorrect] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [lastSubject, setLastSubject] = useState<CropMeta["subject"]>("Physics");
  const [lastDifficulty, setLastDifficulty] = useState<CropMeta["difficulty"]>("Easy");
  const [selectedCropIds, setSelectedCropIds] = useState<Set<string>>(new Set());
  const [bulkSubject, setBulkSubject] = useState<CropMeta["subject"]>("Physics");
  const [bulkDifficulty, setBulkDifficulty] = useState<CropMeta["difficulty"]>("Easy");
  const [bulkChapter, setBulkChapter] = useState("");
  const [bulkTopic, setBulkTopic] = useState("");
  const [bulkChapterId, setBulkChapterId] = useState("");
  const [bulkTopicId, setBulkTopicId] = useState("");
  const [newChapterSubject, setNewChapterSubject] = useState<CropMeta["subject"]>("Physics");
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterOrder, setNewChapterOrder] = useState(0);
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [lockNavigation, setLockNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingOptions, setIsEditingOptions] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showAnswerKeyConfirm, setShowAnswerKeyConfirm] = useState(false);
  const [answerKeyStatus, setAnswerKeyStatus] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [answerKeyPreview, setAnswerKeyPreview] = useState<
    Array<{ index: number; value: string }>
  >([]);
  const [answerKeyPending, setAnswerKeyPending] = useState<
    Array<{ index?: number; value: string }>
  >([]);
  const [answerKeyMode, setAnswerKeyMode] = useState<"manual" | "file">("file");
  const [manualAnswerKey, setManualAnswerKey] = useState("");

  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonImportText, setJsonImportText] = useState("");
  const [jsonImportStatus, setJsonImportStatus] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [bulkApplyStatus, setBulkApplyStatus] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<"nw" | "ne" | "sw" | "se" | null>(null);
  const [cropTool, setCropTool] = useState<"rect" | "hand">("rect");
const [isPanning, setIsPanning] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{
    x: number;
    y: number;
    rect: CropMeta;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  const renderScaleRef = useRef(1);
  const renderTaskRef = useRef<{ cancel: () => void; promise: Promise<any> } | null>(null);
  const prevPageRef = useRef<number>(currentPage);
  const prevActiveIdRef = useRef<string | null>(activeCropId);
  const draftTimerRef = useRef<number | null>(null);
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

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
    let active = true;
    fetch("/api/admin/check")
      .then((res) => {
        if (active) setIsAdmin(res.ok);
      })
      .catch(() => setIsAdmin(false));

    fetch("/api/pyq/exams")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setExamDirectory(data);
        }
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, []);

  const refreshChapters = useCallback(async () => {
    if (!pyqExamId) {
      setChapterDirectory([]);
      return;
    }
    try {
      const res = await fetch(`/api/pyq/chapters?examId=${pyqExamId}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      if (Array.isArray(data)) {
        setChapterDirectory(data);
      }
    } catch {
      // ignore
    }
  }, [pyqExamId]);

  useEffect(() => {
    let active = true;
    if (!pyqExamId) {
      setChapterDirectory([]);
      return () => {
        active = false;
      };
    }
    refreshChapters().finally(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [pyqExamId, refreshChapters]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const testId = params.get("testId");
    if (testId) {
      // Never restore local draft while editing an existing test.
      return;
    }
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    if (cropRects.length > 0 || title.trim() || uploadedFile) return;
    try {
      const parsed = JSON.parse(raw);
      setTitle(parsed.title ?? "");
      setTestDescription(parsed.testDescription ?? "");
      setTestTags(parsed.testTags ?? []);
      setVisibility(parsed.visibility ?? "Public");
      setAccessCode(parsed.accessCode ?? makeAccessCode());
      setDurationMinutes(parsed.durationMinutes ?? 180);
      setMarkingCorrect(parsed.markingCorrect ?? 4);
      setMarkingIncorrect(parsed.markingIncorrect ?? -1);
      setLockNavigation(parsed.lockNavigation ?? false);
      setLastSubject(parsed.lastSubject ?? "Physics");
      setLastDifficulty(parsed.lastDifficulty ?? "Easy");
      setCurrentPage(parsed.currentPage ?? 1);
      setPageScale(parsed.pageScale ?? 1.7);
      setCropRects(parsed.cropRects ?? []);
      // Don't preload previous draft PDF into a new test flow.
      setPdfUrl(null);
    } catch {
      // ignore corrupted draft
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const testId = params.get("testId");
    if (!testId) return;
    setEditingTestId(testId);
    const loadExisting = async () => {
      const response = await fetch(`/api/tests?testId=${testId}`);
      const data = await safeJson<any>(response, null);
      if (!data) return;
      setTitle(data.title ?? "");
      setTestDescription(data.description ?? "");
      setTestTags(data.tags ?? []);
      setVisibility(data.visibility ?? "Public");
      setAccessCode(data.accessCode ?? makeAccessCode());
      setDurationMinutes(data.durationMinutes ?? 180);
      setMarkingCorrect(data.markingCorrect ?? 4);
      setMarkingIncorrect(data.markingIncorrect ?? -1);
      setLockNavigation(Boolean(data.lockNavigation));
      setPdfUrl(data.pdfUrl ?? null);
      if (data.pdfUrl) {
        loadPdfFromUrl(data.pdfUrl);
      }
      const mapped = (data.crops ?? []).map((crop: any) => ({
        id: crop.id,
        pageNumber: crop.pageNumber ?? 1,
        parts: crop.parts ?? 1,
        x: crop.x ?? 0,
        y: crop.y ?? 0,
        w: crop.w ?? 0,
        h: crop.h ?? 0,
        subject: crop.subject ?? "Physics",
        questionType: crop.questionType ?? "MCQ",
        correctOption: crop.correctOption ?? "",
        correctOptions: crop.correctOptions ?? [],
        correctNumeric: crop.correctNumeric ?? "",
        marks: "+4/-1",
        difficulty: crop.difficulty ?? "Easy",
        chapter: crop.chapter ?? "",
        topic: crop.topic ?? "",
        imageDataUrl: crop.imageDataUrl ?? "",
        questionText: crop.questionText ?? "",
        solution: crop.solution ?? "",
        options: crop.options ?? [],
        hasDiagram: Boolean(crop.imageDataUrl),
      }));
      setCropRects(mapped);
      if (mapped.length > 0) {
        setActiveCropId(mapped[0].id);
      }
    };
    loadExisting();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = window.setTimeout(() => {
      const payload = {
        title,
        testDescription,
        testTags,
        visibility,
        accessCode,
        durationMinutes,
        markingCorrect,
        markingIncorrect,
        lockNavigation,
        lastSubject,
        lastDifficulty,
        currentPage,
        pageScale,
        cropRects,
        pdfUrl,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    }, 600);
    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
    };
  }, [
    title,
    testDescription,
    testTags,
    visibility,
    accessCode,
    durationMinutes,
    markingCorrect,
    markingIncorrect,
    lockNavigation,
    lastSubject,
    lastDifficulty,
    currentPage,
    pageScale,
    cropRects,
  ]);

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

  const chaptersBySubject = useMemo(() => {
    const map = new Map<string, ChapterItem[]>();
    chapterDirectory.forEach((chapter) => {
      const key = chapter.subject || "General";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(chapter);
    });
    return map;
  }, [chapterDirectory]);

  const topicsByChapterId = useMemo(() => {
    const map = new Map<string, TopicItem[]>();
    chapterDirectory.forEach((chapter) => {
      if (chapter.topics?.length) {
        map.set(chapter.id, chapter.topics);
      }
    });
    return map;
  }, [chapterDirectory]);

  useEffect(() => {
    if (!bulkChapterId) {
      setBulkChapter("");
      setBulkTopic("");
      setBulkTopicId("");
      return;
    }
    const chapter = chapterDirectory.find((item) => item.id === bulkChapterId);
    setBulkChapter(chapter?.name ?? "");
    setBulkTopic("");
    setBulkTopicId("");
  }, [bulkChapterId, chapterDirectory]);

  useEffect(() => {
    if (!bulkTopicId || !bulkChapterId) {
      setBulkTopic("");
      return;
    }
    const topics = topicsByChapterId.get(bulkChapterId) ?? [];
    const topic = topics.find((item) => item.id === bulkTopicId);
    setBulkTopic(topic?.name ?? "");
  }, [bulkTopicId, bulkChapterId, topicsByChapterId]);

  useEffect(() => {
    if (!bulkChapterId) return;
    if (!chapterDirectory.some((chapter) => chapter.id === bulkChapterId)) {
      setBulkChapterId("");
    }
  }, [bulkChapterId, chapterDirectory]);

  const updateZoom = useCallback((value: number) => {
    if (!Number.isFinite(value)) return;
    setPageScale(Math.max(0.2, value));
  }, []);

  const handleViewerPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (cropTool !== "hand") return;
    const el = viewerRef.current;
    if (!el) return;
    event.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
    try {
      el.setPointerCapture(event.pointerId);
    } catch {}
  }, [cropTool]);

  const handleViewerPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || cropTool !== "hand") return;
    const el = viewerRef.current;
    const start = panStartRef.current;
    if (!el || !start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    el.scrollLeft = start.left - dx;
    el.scrollTop = start.top - dy;
  }, [isPanning, cropTool]);

  const handleViewerPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (cropTool !== "hand") return;
    setIsPanning(false);
    panStartRef.current = null;
    const el = viewerRef.current;
    if (el) {
      try {
        el.releasePointerCapture(event.pointerId);
      } catch {}
    }
  }, [cropTool]);

  const hasAnswerKey = useCallback(() => {
    return cropRects.some((crop) => {
      if (crop.questionType === "NUM") {
        return Boolean(crop.correctNumeric && crop.correctNumeric.trim().length > 0);
      }
      if (crop.questionType === "MSQ") {
        return Boolean(
          crop.correctOptions &&
            crop.correctOptions.length > 0 &&
            crop.correctOptions.some((letter) => letter !== "A")
        );
      }
      return crop.correctOption !== "A";
    });
  }, [cropRects]);

  const runSaveTest = useCallback(async () => {
    if (cropRects.length === 0) {
      alert("Please create at least one crop.");
      return;
    }
    setSaving(true);
    setDraftRect(null);
    setSelectionRect(null);
    setIsDrawing(false);
    setIsSelecting(false);
    try {
      let resolvedPdfUrl = pdfUrl;
      if (uploadedFile && !resolvedPdfUrl) {
        setUploadingPdf(true);
        try {
          const formData = new FormData();
          formData.append("file", uploadedFile);
          const uploadResponse = await fetch("/api/upload/pdf", {
            method: "POST",
            body: formData,
          });
          if (!uploadResponse.ok) {
            const errorPayload = await safeJson<{ error?: string }>(uploadResponse, {});
            const errorMessage = errorPayload?.error || "PDF upload failed. Please re-upload the PDF and try again.";
            alert(errorMessage);
            return;
          }
          const uploadData = await safeJson<{ url?: string }>(uploadResponse, {} as any);
          resolvedPdfUrl = uploadData?.url ?? null;
          if (!resolvedPdfUrl) {
            alert("PDF upload failed. Please re-upload the PDF and try again.");
            return;
          }
          setPdfUrl(resolvedPdfUrl);
        } finally {
          setUploadingPdf(false);
        }
      }

      const resolvedTitle =
        title.trim() ||
        [
          pyqExamName || "Chapterwise PYQ",
          pyqYear ? String(pyqYear) : "",
          pyqShift ?? "",
          bulkChapter || "",
        ]
          .filter(Boolean)
          .join(" ");

      const shouldFillChapter = Boolean(bulkChapter) && cropRects.every((c) => !c.chapter);
      const shouldFillTopic = Boolean(bulkTopic) && cropRects.every((c) => !c.topic);
      const normalizedCrops = shouldFillChapter || shouldFillTopic
        ? cropRects.map((c) => ({
            ...c,
            chapter: c.chapter || (shouldFillChapter ? bulkChapter : ""),
            topic: c.topic || (shouldFillTopic ? bulkTopic : ""),
          }))
        : cropRects;

      const response = await fetch("/api/tests", {
        method: editingTestId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: editingTestId ?? undefined,
          title: resolvedTitle || "Untitled Test",
          visibility,
          accessCode: visibility === "Private" ? accessCode : undefined,
          durationMinutes,
          markingCorrect,
          markingIncorrect,
          description: testDescription,
          tags: testTags,
          pdfUrl: resolvedPdfUrl ?? undefined,
          isPyq: Boolean(pyqExamId || pyqYear || pyqShift),
          examId: pyqExamId ?? undefined,
          exam: pyqExamName ?? undefined,
          year: pyqYear ?? undefined,
          shift: pyqShift ?? undefined,
          crops: normalizedCrops,
          lockNavigation,
        }),
      });
      const saved = await safeJson<{ id?: string } | null>(response, null);
      if (!saved?.id) {
        throw new Error("Test creation failed.");
      }
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
    editingTestId,
    lockNavigation,
    markingCorrect,
    markingIncorrect,
    pdfUrl,
    router,
    testDescription,
    testTags,
    title,
    uploadedFile,

    visibility,
  ]);
  const saveTest = useCallback(() => {
    if (!hasAnswerKey()) {
      setShowAnswerKeyConfirm(true);
      return;
    }
    runSaveTest();
  }, [hasAnswerKey, runSaveTest]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (isAdmin && (event.metaKey || event.ctrlKey) && key === "a") {
        event.preventDefault();
        setSelectedCropIds(new Set(cropRects.map((crop) => crop.id)));
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === "s") {
        event.preventDefault();
        saveTest();
        return;
      }
      if (key === "c") {
        event.preventDefault();
        clearSelection();
        if (viewerRef.current) {
          viewerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        deleteActiveCrop();
        return;
      }
      if (key === "s") {
        event.preventDefault();
        saveTest();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveTest]);

  const renderPdfPage = async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current) {
      return;
    }
    if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
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
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      const renderTask = page.render({ canvasContext: context, viewport });
      renderTaskRef.current = renderTask;
      try {
        await renderTask.promise;
      } catch (error: any) {
        if (!error || error.name !== "RenderingCancelledException") {
          throw error;
        }
      }
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPdfPage(currentPage);
    }
  }, [pdfDoc, currentPage, pageScale]);

  useEffect(() => {
    const pageChanged = prevPageRef.current !== currentPage;
    const cropChanged = prevActiveIdRef.current !== activeCropId;
    prevPageRef.current = currentPage;
    prevActiveIdRef.current = activeCropId;

    setDraftRect(null);
    setSelectionRect(null);
    setIsDrawing(false);
    setIsSelecting(false);
    if (cropChanged) {
      setIsEditingOptions(false);
    }
    // Keep the active crop selected even when page changes so edit mode doesn't close.
  }, [currentPage, activeCropId, cropRects]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!editorRef.current) return;
      if (!editorRef.current.contains(event.target as Node)) {
        // Keep edit mode active until user clicks Save.
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

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

  const loadPdfFromUrl = useCallback(async (url: string) => {
    if (!pdfApi) return;
    const doc = await pdfApi.getDocument(url).promise;
    setPdfDoc(doc);
    setCurrentPage(1);
  }, [pdfApi]);

  const uploadPdfToCloud = useCallback(async (file: File): Promise<string | null> => {
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload/pdf", { method: "POST", body: formData });
      if (!response.ok) {
        return null;
      }
      const data = await safeJson<{ url?: string }>(response, {} as any);
      if (data?.url) {
        setPdfUrl(data.url);
        return data.url;
      }
      return null;
    } finally {
      setUploadingPdf(false);
    }
  }, []);
  useEffect(() => {
    if (pdfApi && pdfUrl && !pdfDoc) {
      loadPdfFromUrl(pdfUrl);
    }
  }, [pdfApi, pdfUrl, pdfDoc, loadPdfFromUrl]);

  const handleUpload = async (file: File | null) => {
    if (!file) {
      return;
    }
    if (!pdfApi) {
      return;
    }

    setUploadedFile(file);
    setPdfUrl(null);
    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdfApi.getDocument({ data: arrayBuffer }).promise;
    setPdfDoc(doc);
    setCurrentPage(1);
    setCropRects([]);
    setActiveCropId(null);
    void uploadPdfToCloud(file);
  };

  const startResize = (
    handle: "nw" | "ne" | "sw" | "se",
    rect: CropMeta,
    event: React.PointerEvent
  ) => {
    if (!overlayRef.current) return;
    event.stopPropagation();
    const bounds = overlayRef.current.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    resizeStartRef.current = { x, y, rect: { ...rect } };
    setResizeHandle(handle);
    setIsDrawing(false);
    setIsSelecting(false);
    setDraftRect(null);
    setSelectionRect(null);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current) {
      return;
    }

    if (resizeHandle) {
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
    if (resizeHandle && resizeStartRef.current && overlayRef.current) {
      const bounds = overlayRef.current.getBoundingClientRect();
      const currentX = event.clientX - bounds.left;
      const currentY = event.clientY - bounds.top;
      const start = resizeStartRef.current;
      const dx = currentX - start.x;
      const dy = currentY - start.y;
      const minSize = 12;
      let newX = start.rect.x;
      let newY = start.rect.y;
      let newW = start.rect.w;
      let newH = start.rect.h;
      if (resizeHandle.includes("e")) {
        newW = Math.max(minSize, start.rect.w + dx);
      }
      if (resizeHandle.includes("s")) {
        newH = Math.max(minSize, start.rect.h + dy);
      }
      if (resizeHandle.includes("w")) {
        newW = Math.max(minSize, start.rect.w - dx);
        newX = start.rect.x + (start.rect.w - newW);
      }
      if (resizeHandle.includes("n")) {
        newH = Math.max(minSize, start.rect.h - dy);
        newY = start.rect.y + (start.rect.h - newH);
      }
      setCropRects((prev) =>
        prev.map((rect) =>
          rect.id === start.rect.id ? { ...rect, x: newX, y: newY, w: newW, h: newH } : rect
        )
      );
      return;
    }
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

  const normalizeAnswer = (raw: string) => raw.trim().toUpperCase();

  const normalizeSubject = (value?: string) => {
    const normalized = (value || "").toLowerCase();
    if (!normalized) return undefined;
    if (normalized.startsWith("phy")) return "Physics";
    if (normalized.startsWith("chem")) return "Chemistry";
    if (normalized.startsWith("math")) return "Maths";
    return undefined;
  };

  const resolveExam = (value?: string) => {
    if (!value) return undefined;
    const needle = value.toLowerCase();
    return examDirectory.find((exam) =>
      exam.name.toLowerCase() === needle ||
      exam.shortCode?.toLowerCase() === needle
    );
  };

  const resolveChapter = (name?: string, subject?: string) => {
    if (!name) return undefined;
    const match = chapterDirectory.find(
      (chapter) =>
        chapter.name.toLowerCase() === name.toLowerCase() &&
        (!subject || chapter.subject === subject)
    );
    if (match) return match;
    return chapterDirectory.find(
      (chapter) => chapter.name.toLowerCase() === name.toLowerCase()
    );
  };

  const resolveTopic = (name?: string, chapterId?: string) => {
    if (!name || !chapterId) return undefined;
    const topics = topicsByChapterId.get(chapterId) ?? [];
    return topics.find((topic) => topic.name.toLowerCase() === name.toLowerCase());
  };

  const activeCrop = cropRects.find((rect) => rect.id === activeCropId) || null;
  const activeAccent = activeCrop ? subjectAccents[activeCrop.subject] : subjectAccents.Physics;
  const activeChapter = activeCrop
    ? resolveChapter(activeCrop.chapter, activeCrop.subject)
    : undefined;
  const activeChapterId = activeChapter?.id ?? "";
  const activeTopics = activeChapterId ? topicsByChapterId.get(activeChapterId) ?? [] : [];
  const activeTopic = activeCrop ? resolveTopic(activeCrop.topic, activeChapterId) : undefined;
  const activeTopicId = activeTopic?.id ?? "";
  const activeChaptersForSubject = activeCrop
    ? chaptersBySubject.get(activeCrop.subject) ?? chapterDirectory
    : chapterDirectory;

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonImportText || "{}") as {
        meta?: {
          exam?: string;
          year?: number | string;
          shift?: string;
          subject?: string;
          chapter?: string;
          topic?: string;
        };
        questions?: Array<{
          number?: number;
          text?: string;
          options?: string[];
          answer?: string;
          solution?: string;
          subject?: CropMeta["subject"];
          chapter?: string;
          topic?: string;
          hasDiagram?: boolean;
        }>;
      };
      if (!parsed.questions || parsed.questions.length === 0) {
        setJsonImportStatus({ message: "No questions found in JSON.", tone: "error" });
        return;
      }
      const meta = parsed.meta || {};
      const metaSubject = normalizeSubject(meta.subject) ?? undefined;
      const metaChapter = meta.chapter ? String(meta.chapter) : "";
      const metaTopic = meta.topic ? String(meta.topic) : "";
      const examMatch = resolveExam(meta.exam);
      if (examMatch) {
        setPyqExamId(examMatch.id);
        setPyqExamName(examMatch.name);
      } else if (meta.exam) {
        setPyqExamName(String(meta.exam));
      }
      if (meta.year !== undefined && meta.year !== null && String(meta.year).trim()) {
        const parsedYear = Number(meta.year);
        if (!Number.isNaN(parsedYear)) setPyqYear(parsedYear);
      }
      if (meta.shift) {
        setPyqShift(String(meta.shift));
      }
      const mapped = parsed.questions.map((q) => {
        const answer = q.answer ? normalizeAnswer(q.answer) : "";
        const isNumeric = answer.length > 0 && /^[0-9.+-]+$/.test(answer);
        const isMulti = answer.includes(",");
        const correctOptions = isMulti
          ? answer
              .split(",")
              .map((v) => v.trim())
              .filter((v) => ["A", "B", "C", "D"].includes(v as any)) as Array<
              "A" | "B" | "C" | "D"
            >
          : [];
        const correctOption =
          !isNumeric && !isMulti && ["A", "B", "C", "D"].includes(answer as any)
            ? (answer as "A" | "B" | "C" | "D")
            : "";
        const options = q.options?.length
          ? q.options.map((opt) => String(opt))
          : ["Option A", "Option B", "Option C", "Option D"];
        return {
          id: makeId("crop"),
          pageNumber: currentPage || 1,
          parts: 1,
          x: 0,
          y: 0,
          w: 0,
          h: 0,
          subject: q.subject ?? metaSubject ?? lastSubject,
          questionType: isNumeric ? "NUM" : isMulti ? "MSQ" : "MCQ",
          correctOption,
          correctOptions,
          correctNumeric: isNumeric ? answer : "",
          marks: "+4/-1",
          difficulty: lastDifficulty,
          chapter: q.chapter ?? metaChapter ?? "",
          topic: q.topic ?? metaTopic ?? "",
          imageDataUrl: "",
          questionText: String(q.text ?? ""),
          solution: q.solution ? String(q.solution) : "",
          options,
          hasDiagram: Boolean(q.hasDiagram),
        } as CropMeta;
      });
      setCropRects((prev) => [...prev, ...mapped]);
      setJsonImportStatus({ message: `Imported ${mapped.length} questions.`, tone: "success" });
      setShowJsonImport(false);
      setJsonImportText("");
    } catch (error) {
      setJsonImportStatus({ message: "Invalid JSON. Please check the format.", tone: "error" });
    }
  };

  const adminJsonPrompt = `Extract questions into strict JSON with this shape (include full details per question):

{
  "questions": [
    {
      "number": 1,
      "text": "Question text only (remove Section labels like [Section 1])",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "questionType": "MCQ|MSQ|NUM",
      "correctOptions": ["A","C"],
      "correctNumeric": "42",
      "solution": "Step-by-step solution in plain text or LaTeX",
      "exam": "JEE Main",
      "year": 2024,
      "shift": "Jan 27 S1",
      "subject": "Physics|Chemistry|Maths",
      "difficulty": "Easy|Moderate|Tough",
      "marksCorrect": 4,
      "marksIncorrect": -1,
      "hasDiagram": true|false
    }
  ]
}

Rules (MathJax-friendly):
- Use LaTeX commands with backslashes: \\pi, \\sin, \\cos, \\tan, \\log.
- Use fractions as \\frac{a}{b} (do NOT use a/b or fracpi3).
- Use vectors as \\vec{a}, hats as \\hat{a}.
- Use exponents as x^2, (a+b)^2, 10^{-3}.
- Use \\times for multiplication, \\cdot for dot product.
- Wrap math in $...$ (inline) or $$...$$ (display) when mixed with plain English.
- If a question has a diagram, set hasDiagram: true.
- Provide exam/year/shift/subject/difficulty/marks for every question.
- Do NOT include section labels in the question text.
- One JSON object only, no extra commentary.`;

  const userJsonPrompt = `Extract questions into strict JSON with this shape:

{
  "questions": [
    {
      "number": 1,
      "text": "Question text only (remove Section labels like [Section 1])",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "subject": "Physics|Chemistry|Maths",
      "hasDiagram": true|false
    }
  ]
}

Rules (MathJax-friendly):
- Use LaTeX commands with backslashes: \\pi, \\sin, \\cos, \\tan, \\log.
- Use fractions as \\frac{a}{b} (do NOT use a/b or fracpi3).
- Use vectors as \\vec{a}, hats as \\hat{a}.
- Use exponents as x^2, (a+b)^2, 10^{-3}.
- Use \\times for multiplication, \\cdot for dot product.
- Wrap math in $...$ (inline) or $$...$$ (display) when mixed with plain English.
- If a question has a diagram, set hasDiagram: true.
- Do NOT include section labels in the question text.
- One JSON object only, no extra commentary.`;

  const jsonPrompt = isAdmin ? adminJsonPrompt : userJsonPrompt;

  const handleCreateChapter = async () => {
    if (!isAdmin || !pyqExamId || !newChapterName.trim()) return;
    setCreatingChapter(true);
    try {
      const response = await fetch("/api/admin/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: pyqExamId,
          subject: newChapterSubject,
          name: newChapterName.trim(),
          order: newChapterOrder,
        }),
      });
      if (response.status === 409) {
        const payload = await response.json().catch(() => null);
        if (payload?.chapter?.id) {
          setBulkChapterId(payload.chapter.id);
        }
      }
      setNewChapterName("");
      setNewChapterOrder(0);
      await refreshChapters();
    } finally {
      setCreatingChapter(false);
    }
  };

  const handleCopyJsonPrompt = async () => {
    try {
      await navigator.clipboard.writeText(jsonPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1500);
    } catch {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1500);
    }
  };
  const parseAnswerKeyText = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const parsed: Array<{ index?: number; value: string }> = [];
    for (const line of lines) {
      const cleaned = line.replace(/\t+/g, " ").trim();
      const match = cleaned.match(
        /^(?:Q\s*)?(\d{1,4})[\)\.\-: ]+\s*([A-Da-d, ]+|[0-9.+-]+)$/i
      );
      if (match) {
        const idx = Number(match[1]);
        const value = normalizeAnswer(match[2].replace(/\s+/g, ""));
        parsed.push({ index: Number.isFinite(idx) ? idx : undefined, value });
        continue;
      }
      parsed.push({ value: normalizeAnswer(cleaned.replace(/\s+/g, "")) });
    }
    return parsed;
  };

  const scoreEntries = (entries: Array<{ index?: number; value: string }>) => {
    if (!entries.length) return -1;
    let letterLike = 0;
    let numericLike = 0;
    let shortNums = 0;
    let indexed = 0;
    entries.forEach((entry) => {
      const value = entry.value.trim();
      if (entry.index && entry.index > 0) {
        indexed += 1;
      }
      if (/^[A-D](,[A-D])*$/.test(value)) {
        letterLike += 1;
        return;
      }
      if (/^[0-9.+-]+$/.test(value)) {
        numericLike += 1;
        if (!value.includes(".") && value.length <= 2) shortNums += 1;
      }
    });
    return letterLike * 5 + numericLike * 2 + indexed * 2 - shortNums;
  };

  const pickBestEntries = (
    candidates: Array<Array<{ index?: number; value: string }>>
  ) => {
    const scored = candidates.map((entries) => ({
      entries,
      score: scoreEntries(entries),
      hasLetters: entries.some((entry) => /^[A-D](,[A-D])*$/.test(entry.value.trim())),
    }));
    const withLetters = scored.filter((item) => item.hasLetters);
    const pool = withLetters.length ? withLetters : scored;
    return pool.sort((a, b) => b.score - a.score || b.entries.length - a.entries.length)[0]
      ?.entries ?? [];
  };

  const parseAnswerKeyTokens = (text: string) => {
    const rawTokens = text
      .replace(/\r?\n/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ");

    const markerSet = new Set(["Q", "Q.", "QUE", "QUE.", "QUESTION", "A", "A.", "ANS", "ANS.", "ANSWER"]);
    const upperTokens = rawTokens.map((token) => token.toUpperCase());
    const aIndex = upperTokens.findIndex((token) => markerSet.has(token) && token.startsWith("A"));
    if (aIndex > 0) {
      const qIndex = upperTokens.findIndex((token) => markerSet.has(token) && token.startsWith("Q"));
      const start = qIndex >= 0 ? qIndex + 1 : 0;
      const numTokens = rawTokens.slice(start, aIndex).filter((token) => /^\d{1,4}$/.test(token));
      const ansTokens = rawTokens
        .slice(aIndex + 1)
        .filter(
          (token) =>
            /^[A-Da-d]+$/.test(token) ||
            /^[A-Da-d](?:[,A-Da-d]+)+$/.test(token) ||
            /^[0-9.+-]+$/.test(token)
        )
        .map((token) => normalizeAnswer(token));
      if (numTokens.length >= 3 && ansTokens.length >= numTokens.length) {
        return numTokens.map((num, idx) => ({ index: Number(num), value: ansTokens[idx] }));
      }
    }

    const tokens = rawTokens.filter((token) => {
      const upper = token.toUpperCase();
      if (["Q", "Q.", "QUE", "QUE.", "QUESTION", "ANS", "ANS.", "A", "A."].includes(upper)) {
        return false;
      }
      if (["SECTION", "PART", "PHYSICS", "CHEMISTRY", "MATHS"].includes(upper)) {
        return false;
      }
      return true;
    });
    const entries: Array<{ index?: number; value: string }> = [];
    for (let i = 0; i < tokens.length - 1; i += 1) {
      const indexToken = tokens[i];
      const valueToken = tokens[i + 1];
      if (!/^\d{1,4}$/.test(indexToken)) {
        continue;
      }
      if (
        !/^[A-Da-d]+$/.test(valueToken) &&
        !/^[A-Da-d](?:[,A-Da-d]+)+$/.test(valueToken) &&
        !/^[0-9.+-]+$/.test(valueToken)
      ) {
        continue;
      }
      entries.push({ index: Number(indexToken), value: normalizeAnswer(valueToken) });
    }
    return entries;
  };

  const parseAnswerKeyRows = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const entries: Array<{ index?: number; value: string }> = [];
    const qRegex = /\bQ(?:UE|UESTION)?\.?\b/i;
    const aRegex = /\bA(?:NS|NSWER)?\.?\b/i;
    const extractNums = (line: string) => line.match(/\b\d{1,4}\b/g)?.map(Number) ?? [];
    const extractAns = (line: string) =>
      line
        .replace(qRegex, " ")
        .replace(aRegex, " ")
        .replace(/[^A-Da-d0-9.+-,]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .filter(
          (token) =>
            /^[A-Da-d]+$/.test(token) ||
            /^[A-Da-d](?:[,A-Da-d]+)+$/.test(token) ||
            /^[0-9.+-]+$/.test(token)
        )
        .map((token) => normalizeAnswer(token));

    for (let i = 0; i < lines.length - 1; i += 1) {
      if (!qRegex.test(lines[i])) continue;
      const nums = extractNums(lines[i]);
      if (nums.length < 3) continue;
      const ansLine = lines[i + 1];
      if (!aRegex.test(ansLine)) continue;
      const ans = extractAns(ansLine);
      if (ans.length >= nums.length) {
        nums.forEach((num, idx) => entries.push({ index: num, value: ans[idx] }));
        return entries;
      }
    }
    return entries;
  };

  const parseAnswerKeyGrid = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const entries: Array<{ index?: number; value: string }> = [];
    const qRegex = /\bQ(?:UE|UESTION)?\.?\b/i;
    const aRegex = /\bA(?:NS|NSWER)?\.?\b/i;
    const extractNums = (line: string) => line.match(/\b\d{1,4}\b/g)?.map(Number) ?? [];
    const extractAns = (line: string, allowNumeric: boolean) =>
      line
        .replace(qRegex, " ")
        .replace(aRegex, " ")
        .replace(/[^A-Da-d0-9.+-,]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .filter((token) => {
          if (/^[A-Da-d]+$/.test(token) || /^[A-Da-d](?:[,A-Da-d]+)+$/.test(token)) {
            return true;
          }
          if (allowNumeric && /^[0-9.+-]+$/.test(token)) {
            return true;
          }
          return false;
        })
        .map((token) => normalizeAnswer(token.replace(/;+/, ",")));

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const hasQ = qRegex.test(line);
      const hasA = aRegex.test(line);
      if (hasQ && hasA) {
        const splitIdx = line.search(aRegex);
        if (splitIdx >= 0) {
          const qPart = line.slice(0, splitIdx);
          const aPart = line.slice(splitIdx);
          const nums = extractNums(qPart);
          const ans = extractAns(aPart, true);
          if (nums.length >= 1 && ans.length >= nums.length) {
            nums.forEach((num, idx) => entries.push({ index: num, value: ans[idx] }));
            continue;
          }
        }
      }

      if (hasQ) {
        const nums = extractNums(line);
        if (nums.length >= 3) {
          for (let j = i + 1; j < lines.length; j += 1) {
            const nextHasA = aRegex.test(lines[j]);
            const ans = extractAns(lines[j], nextHasA);
            if (ans.length >= nums.length) {
              nums.forEach((num, idx) => entries.push({ index: num, value: ans[idx] }));
              i = j;
              break;
            }
            if (nextHasA && ans.length > 0) {
              break;
            }
          }
        }
        continue;
      }

      const nums = extractNums(line);
      if (nums.length >= 3) {
        const ansSameLine = extractAns(line, hasA);
        if (hasA && ansSameLine.length >= nums.length) {
          nums.forEach((num, idx) => entries.push({ index: num, value: ansSameLine[idx] }));
          continue;
        }
        const nextLine = lines[i + 1];
        if (!nextLine) continue;
        const nextHasA = aRegex.test(nextLine);
        const ansNext = extractAns(nextLine, nextHasA);
        if (ansNext.length >= nums.length) {
          nums.forEach((num, idx) => entries.push({ index: num, value: ansNext[idx] }));
          i += 1;
        }
      }
    }

    return entries;
  };

  const getOrderedCrops = () =>
    [...cropRects].sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

  const applyAnswerKey = (entries: Array<{ index?: number; value: string }>) => {
    if (entries.length === 0 || cropRects.length === 0) {
      setAnswerKeyStatus({
        message: "No answers found to apply.",
        tone: "error",
      });
      return;
    }
    const ordered = getOrderedCrops();
    const updates = new Map<string, Partial<CropMeta>>();
    let applied = 0;

    const applyToCrop = (crop: CropMeta, rawValue: string) => {
      if (!rawValue) return;
      const value = normalizeAnswer(rawValue);
      if (crop.questionType === "NUM") {
        updates.set(crop.id, { correctNumeric: value });
        applied += 1;
        return;
      }
      const letters = value.split(",").join("").split("");
      const cleaned = letters.filter((letter) => optionLetters.includes(letter as any)) as Array<
        "A" | "B" | "C" | "D"
      >;
      if (cleaned.length === 0) return;
      if (crop.questionType === "MSQ") {
        updates.set(crop.id, { correctOptions: cleaned });
      } else {
        updates.set(crop.id, { correctOption: cleaned[0] });
      }
      applied += 1;
    };

    entries.forEach((entry, idx) => {
      const targetIndex = entry.index ? entry.index - 1 : idx;
      if (targetIndex < 0 || targetIndex >= ordered.length) return;
      applyToCrop(ordered[targetIndex], entry.value);
    });

    if (updates.size === 0) {
      setAnswerKeyStatus({
        message: "Could not match answers to questions.",
        tone: "error",
      });
      return;
    }

    setCropRects((prev) =>
      prev.map((rect) => (updates.has(rect.id) ? { ...rect, ...updates.get(rect.id)! } : rect))
    );

    setAnswerKeyStatus({
      message: `Applied ${applied} answers.`,
      tone: "success",
    });
    setAnswerKeyPreview([]);
    setAnswerKeyPending([]);
  };

  const extractPdfText = async (file: File) => {
    if (!pdfApi) return "";
    setUploadedFile(file);
    setPdfUrl(null);
    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdfApi.getDocument({ data: arrayBuffer }).promise;
    let all = "";
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str || "").join(" ");
      all += `${text}\n`;
    }
    return all;
  };

  const handleAnswerKeyUpload = async (file: File | null) => {
    if (!file) return;
    setAnswerKeyStatus({ message: "Parsing answer key...", tone: "info" });
    try {
      let text = "";
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }
      const rowEntries = parseAnswerKeyRows(text);
      const lineEntries = parseAnswerKeyText(text);
      const tokenEntries = parseAnswerKeyTokens(text);
      const gridEntries = parseAnswerKeyGrid(text);
      const entries =
        rowEntries.length > 0
          ? rowEntries
          : pickBestEntries([lineEntries, tokenEntries, gridEntries]);
      setAnswerKeyPending(entries);
      const preview = entries
        .map((entry, idx) => ({
          index: entry.index ?? idx + 1,
          value: entry.value,
        }))
        .slice(0, 10);
      setAnswerKeyPreview(preview);
      setAnswerKeyStatus({
        message: `Parsed ${entries.length} answers. Review and apply.`,
        tone: "info",
      });
    } catch {
      setAnswerKeyStatus({
        message: "Failed to read answer key.",
        tone: "error",
      });
    }
  };

  const handleManualAnswerKey = () => {
    const text = manualAnswerKey.trim();
    if (!text) {
      setAnswerKeyStatus({
        message: "Paste the answer key first.",
        tone: "error",
      });
      return;
    }
    const rowEntries = parseAnswerKeyRows(text);
    const lineEntries = parseAnswerKeyText(text);
    const tokenEntries = parseAnswerKeyTokens(text);
    const gridEntries = parseAnswerKeyGrid(text);
    const entries =
      rowEntries.length > 0
        ? rowEntries
        : pickBestEntries([lineEntries, tokenEntries, gridEntries]);
    setAnswerKeyPending(entries);
    const preview = entries
      .map((entry, idx) => ({
        index: entry.index ?? idx + 1,
        value: entry.value,
      }))
      .slice(0, 10);
    setAnswerKeyPreview(preview);
    setAnswerKeyStatus({
      message: `Parsed ${entries.length} answers. Review and apply.`,
      tone: "info",
    });
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
    if (resizeHandle) {
      setResizeHandle(null);
      resizeStartRef.current = null;
      return;
    }
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

    if (activeCrop && activeCrop.hasDiagram && !activeCrop.imageDataUrl) {
      setCropRects((prev) =>
        prev.map((rect) =>
          rect.id === activeCrop.id
            ? {
                ...rect,
                pageNumber: currentPage,
                x: draftRect.x,
                y: draftRect.y,
                w: draftRect.w,
                h: draftRect.h,
                imageDataUrl,
              }
            : rect
        )
      );
      setDraftRect(null);
      setIsDrawing(false);
      if (viewerRef.current) {
        viewerRef.current.scrollBy({
          top: Math.max(120, draftRect.h + 48),
          behavior: "smooth",
        });
      }
      return;
    }

    const newRect: CropMeta = {
      id: makeId("crop"),
      pageNumber: currentPage,
      parts: 1,
      ...draftRect,
      subject: lastSubject,
      questionType: "MCQ",
      correctOption: "",
      correctOptions: [],
      correctNumeric: "",
      marks: "+4/-1",
      difficulty: lastDifficulty,
      imageDataUrl,
      questionText: "",
      options: ["Option A", "Option B", "Option C", "Option D"],
    };

    setCropRects((prev) => [...prev, newRect]);
    setActiveCropId(newRect.id);
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
          ? {
              ...rect,
              subject: bulkSubject,
              difficulty: bulkDifficulty,
              chapter: bulkChapter || rect.chapter || "",
              topic: bulkTopic || rect.topic || "",
            }
          : rect
      )
    );
    setLastSubject(bulkSubject);
    setLastDifficulty(bulkDifficulty);
    setBulkApplyStatus(`Applied to ${selectedCropIds.size} question${selectedCropIds.size > 1 ? "s" : ""}.`);
    setTimeout(() => setBulkApplyStatus(null), 1500);
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

  const deleteActiveCrop = () => {
    if (!activeCropId) return;
    setCropRects((prev) => prev.filter((rect) => rect.id != activeCropId));
    setActiveCropId(null);
  };

  const clearSelection = () => {
    setActiveCropId(null);
    setDraftRect(null);
    setSelectionRect(null);
    setIsDrawing(false);
    setIsSelecting(false);
  };

  const focusCrop = (id: string) => {
    const rect = cropRects.find((item) => item.id === id);
    if (!rect) return;
    setActiveCropId(id);
    if (rect.hasDiagram && !rect.imageDataUrl) {
      return;
    }
    if (rect.pageNumber < 1 || (pdfDoc && rect.pageNumber > pdfDoc.numPages)) {
      return;
    }
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
            <p className="mt-2 text-[11px] text-white/50">Shortcuts: C = Crop  S = Save</p>
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
              onClick={() => {
                setJsonImportStatus(null);
                setShowJsonImport(true);
              }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200 transition hover:border-white/30 hover:text-white"
            >
              Paste JSON
            </button>
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
              disabled={saving || uploadingPdf}
            >
              {uploadingPdf ? "Uploading PDF..." : saving ? "Saving..." : "Publish Test"}
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
                <span className="text-white/30"></span>
                <span>Current: {activeCropId ? cropRects.findIndex((crop) => crop.id === activeCropId) + 1 : "--"}</span>
                <span className="text-white/30"></span>
                <span>Selected: {selectedCropIds.size}</span>
                <span className="text-white/30"></span>
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
                    onClick={() => setCropTool("rect")}
                    className={`rounded-md px-2 py-1 ${
                      cropTool === "rect" ? "bg-white text-black" : "text-white/70 hover:text-white"
                    }`}
                  >
                    Rect
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropTool("hand")}
                    className={`rounded-md px-2 py-1 ${
                      cropTool === "hand" ? "bg-white text-black" : "text-white/70 hover:text-white"
                    }`}
                  >
                    Hand
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
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1 text-xs">
                    <span>Zoom</span>
                    <input
                      type="range"
                      min="0.5"
                      max="4"
                      step="0.1"
                      value={Math.min(pageScale, 4)}
                      onChange={(event) => updateZoom(Number(event.target.value))}
                    />
                    <input
                      type="number"
                      min={0.2}
                      step={0.1}
                      value={Number.isFinite(pageScale) ? pageScale : 1}
                      onChange={(event) => updateZoom(Number(event.target.value))}
                      className="w-16 bg-transparent text-right text-white outline-none"
                    />
                  </div>
              </div>
            </div>

            <div
              ref={viewerRef}
              className={`relative mt-4 flex max-h-[96vh] justify-center overflow-auto rounded-2xl bg-[#0c0c0e] p-1 ${
                cropTool === "hand" ? (isPanning ? "cursor-grabbing" : "cursor-grab") : ""
              }`}
              onPointerDown={handleViewerPointerDown}
              onPointerMove={handleViewerPointerMove}
              onPointerUp={handleViewerPointerUp}
              onPointerLeave={handleViewerPointerUp}
            >
              <div className="relative rounded-2xl bg-white p-3 shadow-xl">
                <canvas ref={canvasRef} className="rounded-2xl" />
                <div
                  ref={overlayRef}
                  className={`absolute left-3 top-3 ${cropTool === "hand" ? "cursor-grab" : "cursor-crosshair"}`}
                  onPointerDown={cropTool === "rect" ? handlePointerDown : undefined}
                  onPointerMove={cropTool === "rect" ? handlePointerMove : undefined}
                  onPointerUp={cropTool === "rect" ? handlePointerUp : undefined}
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
                  {activeCrop && activeCrop.pageNumber === currentPage && activeCrop.w > 0 && activeCrop.h > 0 && (
                    <>
                      {(["nw","ne","sw","se"] as const).map((handle) => {
                        const size = 10;
                        const left = handle.includes("w") ? activeCrop.x - size / 2 : activeCrop.x + activeCrop.w - size / 2;
                        const top = handle.includes("n") ? activeCrop.y - size / 2 : activeCrop.y + activeCrop.h - size / 2;
                        return (
                          <button
                            key={handle}
                            type="button"
                            data-resize-handle
                            className="absolute rounded-sm border border-white/80 bg-white/80"
                            style={{ left, top, width: size, height: size, cursor: `${handle}-resize` }}
                            onPointerDown={(event) => startResize(handle, activeCrop, event)}
                          />
                        );
                      })}
                    </>
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
                            if (event.shiftKey || event.ctrlKey || event.metaKey) {
                              toggleSelection(rect.id);
                              return;
                            }
                            setActiveCropId(rect.id);
                          }}
                          type="button"
                        >
                          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">
                            {rect.subject}  {markingCorrect >= 0 ? `+${markingCorrect}` : markingCorrect}
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
              <div
                ref={editorRef}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                  <p className="text-[11px] uppercase text-white/60">Question Editor</p>
                  <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">
                      {activeCrop
                        ? `Question ${cropRects.findIndex((crop) => crop.id === activeCrop.id) + 1}`
                        : "Question"}
                    </div>
                    {activeCrop && (
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          isEditingOptions
                            ? "bg-emerald-400/20 text-emerald-100"
                            : "border border-white/10 text-white/70 hover:border-white/30"
                        }`}
                        onClick={() => {
                          if (isEditingOptions) {
                            setIsEditingOptions(false);
                          } else {
                            setIsEditingOptions(true);
                          }
                        }}
                      >
                        {isEditingOptions ? "? Save" : "Edit"}
                      </button>
                    )}
                  </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                      <div className="mb-2 text-[10px] uppercase text-white/50">Select Question</div>
                <div className="flex max-h-32 flex-wrap gap-2 overflow-auto">
                  {cropRects.map((crop, index) => (
                    <button
                      key={crop.id}
                      type="button"
                            onClick={(event) => {
                              if (event.ctrlKey || event.metaKey) {
                                toggleSelection(crop.id);
                                return;
                              }
                              focusCrop(crop.id);
                            }}
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
                          : selectedCropIds.has(crop.id)
                          ? "border border-emerald-300/80 text-emerald-100"
                          : "border border-white/10 text-white/70 hover:border-white/30"
                      }`}
                    >
                      <span>Q{index + 1}</span>
                      {crop.hasDiagram && !crop.imageDataUrl && (
                        <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-100">
                          Diagram
                        </span>
                      )}
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
                      {isEditingOptions ? (
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
                          <div>
                            <label className="text-white/60">Chapter</label>
                            {chapterDirectory.length ? (
                              <select
                                value={activeChapterId}
                                onChange={(event) => {
                                  const nextId = event.target.value;
                                  const chapter = chapterDirectory.find((item) => item.id === nextId);
                                  updateActiveCrop({
                                    chapter: chapter?.name ?? "",
                                    topic: "",
                                  });
                                }}
                                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                              >
                                <option value="">Select chapter</option>
                                {activeChaptersForSubject.map((chapter) => (
                                  <option key={chapter.id} value={chapter.id}>
                                    {chapter.subject} · {chapter.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={activeCrop.chapter ?? ""}
                                onChange={(event) => updateActiveCrop({ chapter: event.target.value })}
                                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                                placeholder="e.g., Thermodynamics"
                              />
                            )}
                          </div>
                          <div>
                            <label className="text-white/60">Topic</label>
                            {activeChapterId && activeTopics.length ? (
                              <select
                                value={activeTopicId}
                                onChange={(event) => {
                                  const nextId = event.target.value;
                                  const topic = activeTopics.find((item) => item.id === nextId);
                                  updateActiveCrop({ topic: topic?.name ?? "" });
                                }}
                                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                              >
                                <option value="">Select topic</option>
                                {activeTopics.map((topic) => (
                                  <option key={topic.id} value={topic.id}>
                                    {topic.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={activeCrop.topic ?? ""}
                                onChange={(event) => updateActiveCrop({ topic: event.target.value })}
                                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                                placeholder="e.g., First Law"
                              />
                            )}
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
                                onChange={(event) =>
                                  updateActiveCrop({ correctNumeric: event.target.value })
                                }
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
                      ) : (
                        <div className="space-y-3 text-sm text-white/70">
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                            <div className="text-[11px] uppercase text-white/50">Question Type</div>
                            <div className="mt-1 font-semibold text-white">
                              {activeCrop.questionType}
                            </div>
                          </div>
                          {activeCrop.hasDiagram && !activeCrop.imageDataUrl && (
                            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                              Diagram detected. Crop only the diagram area (not the full question).
                            </div>
                          )}
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                            <div className="text-[11px] uppercase text-white/50">Subject</div>
                            <div className="mt-1 font-semibold text-white">
                              {activeCrop.subject}
                            </div>
                          </div>
                          {activeCrop.chapter ? (
                            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                              <div className="text-[11px] uppercase text-white/50">Chapter</div>
                              <div className="mt-1 font-semibold text-white">{activeCrop.chapter}</div>
                            </div>
                          ) : null}
                          {activeCrop.topic ? (
                            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                              <div className="text-[11px] uppercase text-white/50">Topic</div>
                              <div className="mt-1 font-semibold text-white">{activeCrop.topic}</div>
                            </div>
                          ) : null}
                          {activeCrop.questionType === "NUM" ? (
                            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                              <div className="text-[11px] uppercase text-white/50">
                                Correct Answer
                              </div>
                              <div className="mt-1 font-semibold text-white">
                                {activeCrop.correctNumeric || ""}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                              <div className="text-[11px] uppercase text-white/50">
                                Correct {activeCrop.questionType === "MSQ" ? "Options" : "Option"}
                              </div>
                              <div className="mt-1 font-semibold text-white">
                                {activeCrop.questionType === "MSQ"
                                  ? (activeCrop.correctOptions ?? []).join(", ") || ""
                                  : activeCrop.correctOption}
                              </div>
                            </div>
                          )}
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
                  placeholder="Enter test title"
                />
              </div>
              {isAdmin && (
                <>
                  <div>
                    <label className="text-white/60">Exam (PYQ)</label>
                    <select
                      value={pyqExamId ?? ""}
                      onChange={(event) => {
                        const nextId = event.target.value || null;
                        const match = examDirectory.find((exam) => exam.id === nextId);
                        setPyqExamId(nextId);
                        setPyqExamName(match?.name ?? null);
                      }}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <option value="">Select exam</option>
                      {examDirectory.map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-white/60">Year</label>
                      <input
                        type="number"
                        value={pyqYear ?? ""}
                        onChange={(event) =>
                          setPyqYear(event.target.value ? Number(event.target.value) : null)
                        }
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-white/60">Shift</label>
                      <input
                        value={pyqShift ?? ""}
                        onChange={(event) => setPyqShift(event.target.value || null)}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                        placeholder="optional"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-xs font-semibold text-white/70">Create Chapter</div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <select
                        value={newChapterSubject}
                        onChange={(event) => setNewChapterSubject(event.target.value as CropMeta["subject"])}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                      >
                        {subjects.map((subject) => (
                          <option key={subject}>{subject}</option>
                        ))}
                      </select>
                      <input
                        value={newChapterName}
                        onChange={(event) => setNewChapterName(event.target.value)}
                        placeholder="Chapter name"
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        value={newChapterOrder}
                        onChange={(event) => setNewChapterOrder(Number(event.target.value))}
                        placeholder="Order"
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateChapter}
                      disabled={!pyqExamId || creatingChapter}
                      className="mt-3 rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 hover:border-white/30 disabled:opacity-50"
                    >
                      {creatingChapter ? "Creating..." : "Add Chapter"}
                    </button>
                    {!pyqExamId && (
                      <div className="mt-2 text-[11px] text-white/40">
                        Select an exam first to add chapters.
                      </div>
                    )}
                  </div>
                </>
              )}
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

      {showJsonImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f0f10] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Paste JSON</h2>
              <button
                type="button"
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70"
                onClick={() => setShowJsonImport(false)}
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-white/70">
              Paste your questions JSON and we will add them as draft questions. You can still crop diagrams manually.
            </p>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70">AI Prompt</div>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/70"
                  onClick={handleCopyJsonPrompt}
                >
                  Copy Prompt
                </button>
              </div>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-white/75">{jsonPrompt}</pre>
            </div>
            <textarea
              value={jsonImportText}
              onChange={(event) => setJsonImportText(event.target.value)}
              className="mt-3 h-40 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/80 outline-none"
              placeholder='{"questions": [{"number": 1, "text": "...", "options": ["A", "B", "C", "D"], "answer": "A", "subject": "Physics"}]}'
            />

            {promptCopied && (
              <div className="mt-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">
                Prompt copied.
              </div>
            )}
            {jsonImportStatus && (
              <div
                className={
                  "mt-3 rounded-lg px-3 py-2 text-xs " +
                  (jsonImportStatus.tone === "success"
                    ? "bg-emerald-500/15 text-emerald-200"
                    : jsonImportStatus.tone === "error"
                    ? "bg-rose-500/15 text-rose-200"
                    : "bg-slate-500/15 text-slate-200")
                }
              >
                {jsonImportStatus.message}
              </div>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70"
                onClick={() => setShowJsonImport(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-100"
                onClick={handleJsonImport}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnswerKeyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f10] p-6 text-white shadow-2xl">
            <h2 className="text-lg font-semibold">Answer key missing</h2>
            <p className="mt-2 text-sm text-white/70">
              Your test still has the default answers. Add an answer key now to avoid manual editing later.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-xs">
              <button
                type="button"
                className="rounded-full bg-emerald-400/20 px-4 py-2 text-emerald-100"
                onClick={() => {
                  setShowAnswerKeyConfirm(false);
                  setShowSettings(true);
                }}
              >
                Add answer key now
              </button>
              <button
                type="button"
                className="rounded-full border border-white/10 px-4 py-2 text-white/70"
                onClick={() => {
                  setShowAnswerKeyConfirm(false);
                  runSaveTest();
                }}
              >
                Submit without answer key
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
          <div className="mt-2 grid grid-cols-2 gap-2">
            {chapterDirectory.length ? (
              <select
                value={bulkChapterId}
                onChange={(event) => setBulkChapterId(event.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]"
              >
                <option value="">Chapter</option>
                {chapterDirectory.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.subject} · {chapter.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={bulkChapter}
                onChange={(event) => setBulkChapter(event.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]"
                placeholder="Chapter"
              />
            )}
            {bulkChapterId && (topicsByChapterId.get(bulkChapterId) ?? []).length ? (
              <select
                value={bulkTopicId}
                onChange={(event) => setBulkTopicId(event.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]"
              >
                <option value="">Topic</option>
                {(topicsByChapterId.get(bulkChapterId) ?? []).map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={bulkTopic}
                onChange={(event) => setBulkTopic(event.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]"
                placeholder="Topic"
              />
            )}
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
          {bulkApplyStatus && (
            <div className="mt-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-[11px] text-emerald-200">
              {bulkApplyStatus}
            </div>
          )}
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















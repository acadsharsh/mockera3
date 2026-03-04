"use client";

import { useEffect, useMemo, useState } from "react";
import GlassRail from "@/components/GlassRail";

type TestItem = {
  id: string;
  title: string;
  visibility: string;
  hidden: boolean;
  isPyq?: boolean;
  isYearPaper?: boolean;
  exam?: string | null;
  examId?: string | null;
  year?: number | null;
  shift?: string | null;
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

type ExamItem = {
  id: string;
  name: string;
  shortCode?: string | null;
  order: number;
  active: boolean;
};

type ChapterItem = {
  id: string;
  examId?: string | null;
  subject: string;
  name: string;
  iconUrl?: string | null;
  order: number;
  exam?: { id: string; name: string } | null;
};

type TopicItem = {
  id: string;
  chapterId: string;
  name: string;
  order: number;
  chapter?: ChapterItem;
};

export default function AdminConsoleClient() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [solutionsEnabled, setSolutionsEnabled] = useState(true);
  const [solutionsLoading, setSolutionsLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [active, setActive] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [examName, setExamName] = useState("");
  const [examCode, setExamCode] = useState("");
  const [examOrder, setExamOrder] = useState(0);

  const [chapterSubject, setChapterSubject] = useState("Physics");
  const [chapterName, setChapterName] = useState("");
  const [chapterOrder, setChapterOrder] = useState(0);
  const [chapterExamId, setChapterExamId] = useState("");
  const [chapterIconUrl, setChapterIconUrl] = useState("");
  const [chapterIconUploading, setChapterIconUploading] = useState(false);

  const [topicExamId, setTopicExamId] = useState("");
  const [topicChapterId, setTopicChapterId] = useState("");
  const [topicName, setTopicName] = useState("");
  const [topicOrder, setTopicOrder] = useState(0);
  const [pyqJsonFile, setPyqJsonFile] = useState<File | null>(null);
  const [pyqImportOverwrite, setPyqImportOverwrite] = useState(false);
  const [pyqImportLang, setPyqImportLang] = useState<"en" | "hi">("en");
  const [pyqImportExamId, setPyqImportExamId] = useState("");
  const [pyqImportChapterId, setPyqImportChapterId] = useState("");
  const [pyqImportMode, setPyqImportMode] = useState<"papers" | "questions">("papers");
  const [pyqImportTestTitle, setPyqImportTestTitle] = useState("");
  const [purgeExamId, setPurgeExamId] = useState("");
  const [purgeStatus, setPurgeStatus] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [purging, setPurging] = useState(false);
  const [pyqImporting, setPyqImporting] = useState(false);
  const [pyqImportStatus, setPyqImportStatus] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const safeFetch = async <T,>(url: string, fallback: T): Promise<T> => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return fallback;
      return (await res.json()) as T;
    } catch {
      return fallback;
    }
  };

  const load = async () => {
    const [t, u, b, e, c, tp, m, s] = await Promise.all([
      safeFetch("/api/admin/tests?limit=200", [] as TestItem[]),
      safeFetch("/api/admin/users", [] as UserItem[]),
      safeFetch("/api/admin/broadcast", [] as BroadcastMessage[]),
      safeFetch("/api/admin/exams", [] as ExamItem[]),
      safeFetch("/api/admin/chapters", [] as ChapterItem[]),
      safeFetch("/api/admin/topics", [] as TopicItem[]),
      safeFetch("/api/maintenance", { enabled: false }),
      safeFetch("/api/solutions", { enabled: true }),
    ]);
    setTests(Array.isArray(t) ? t : []);
    setUsers(Array.isArray(u) ? u : []);
    setBroadcasts(Array.isArray(b) ? b : []);
    setExams(Array.isArray(e) ? e : []);
    setChapters(Array.isArray(c) ? c : []);
    setTopics(Array.isArray(tp) ? tp : []);
    setMaintenanceEnabled(Boolean(m?.enabled));
    setSolutionsEnabled(Boolean(s?.enabled ?? true));
    if (Array.isArray(e) && e[0]?.id && !chapterExamId) {
      setChapterExamId(e[0].id);
    }
    if (Array.isArray(e) && e[0]?.id && !topicExamId) {
      setTopicExamId(e[0].id);
    }
    if (Array.isArray(c) && c[0]?.id && !topicChapterId) {
      setTopicChapterId(c[0].id);
    }
    if (Array.isArray(e) && e[0]?.id && !pyqImportExamId) {
      setPyqImportExamId(e[0].id);
    }
    if (Array.isArray(e) && e[0]?.id && !purgeExamId) {
      setPurgeExamId(e[0].id);
    }
  };

  const toggleMaintenance = async (enabled: boolean) => {
    setMaintenanceLoading(true);
    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setMaintenanceLoading(false);
    await load();
  };

  const toggleSolutions = async (enabled: boolean) => {
    setSolutionsLoading(true);
    await fetch("/api/solutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setSolutionsLoading(false);
    await load();
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
    window.dispatchEvent(new Event("broadcast:refresh"));
    await load();
  };

  const createExam = async () => {
    if (!examName.trim()) return;
    await fetch("/api/admin/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: examName, shortCode: examCode, order: examOrder }),
    });
    setExamName("");
    setExamCode("");
    setExamOrder(0);
    await load();
  };

  const createChapter = async () => {
    if (!chapterName.trim() || !chapterExamId) return;
    await fetch("/api/admin/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: chapterExamId,
        subject: chapterSubject,
        name: chapterName,
        iconUrl: chapterIconUrl || null,
        order: chapterOrder,
      }),
    });
    setChapterName("");
    setChapterOrder(0);
    setChapterIconUrl("");
    await load();
  };

  const uploadChapterIcon = async (file: File) => {
    setChapterIconUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload/icon", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data?.url) {
        setChapterIconUrl(String(data.url));
      }
    } finally {
      setChapterIconUploading(false);
    }
  };

  const createTopic = async () => {
    if (!topicName.trim() || !topicChapterId) return;
    await fetch("/api/admin/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: topicChapterId, name: topicName, order: topicOrder }),
    });
    setTopicName("");
    setTopicOrder(0);
    await load();
  };

  const importPyqJson = async () => {
    if (!pyqJsonFile) {
      setPyqImportStatus({ tone: "error", message: "Please choose a JSON file first." });
      return;
    }
    if (!pyqImportExamId) {
      setPyqImportStatus({ tone: "error", message: "Please select exam first." });
      return;
    }
    if (!pyqImportChapterId) {
      setPyqImportStatus({ tone: "error", message: "Please select chapter first." });
      return;
    }
    setPyqImporting(true);
    setPyqImportStatus({ tone: "info", message: "Importing PYQ JSON..." });
    try {
      const formData = new FormData();
      formData.append("file", pyqJsonFile);
      formData.append("overwrite", String(pyqImportOverwrite));
      formData.append("lang", pyqImportLang);
      formData.append("examId", pyqImportExamId);
      formData.append("chapterId", pyqImportChapterId);
      formData.append("mode", pyqImportMode);
      if (pyqImportMode === "questions" && pyqImportTestTitle.trim()) {
        formData.append("testTitle", pyqImportTestTitle.trim());
      }

      const response = await fetch("/api/admin/pyq-import", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPyqImportStatus({
          tone: "error",
          message: String(data?.error ?? "Import failed."),
        });
        return;
      }

      const summary = data?.summary ?? {};
      setPyqImportStatus({
        tone: "success",
        message: `Imported ${summary.questionsImported ?? 0} questions across ${summary.papersCreated ?? 0} papers. Skipped ${summary.papersSkipped ?? 0}.`,
      });
      await load();
    } catch {
      setPyqImportStatus({ tone: "error", message: "Import failed due to network/server error." });
    } finally {
      setPyqImporting(false);
    }
  };

  const purgeOrphanedQuestions = async () => {
    if (!purgeExamId) {
      setPurgeStatus({ tone: "error", message: "Please select an exam first." });
      return;
    }
    setPurging(true);
    setPurgeStatus({ tone: "info", message: "Purging orphaned questions..." });
    try {
      const response = await fetch("/api/admin/chapters/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: purgeExamId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPurgeStatus({ tone: "error", message: String(data?.error ?? "Purge failed.") });
        return;
      }
      setPurgeStatus({
        tone: "success",
        message: `Deleted ${data?.deleted ?? 0} questions not linked to any chapter.`,
      });
      await load();
    } catch {
      setPurgeStatus({ tone: "error", message: "Purge failed due to network/server error." });
    } finally {
      setPurging(false);
    }
  };


  const updateTestMeta = async (id: string, payload: Record<string, any>) => {
    await fetch("/api/admin/tests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
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

  const deleteExam = async (id: string) => {
    if (!confirm("Delete this exam?")) return;
    await fetch(`/api/admin/exams?id=${id}`, { method: "DELETE" });
    await load();
  };

  const deleteChapter = async (id: string) => {
    if (!confirm("Delete this chapter?")) return;
    await fetch(`/api/admin/chapters?id=${id}`, { method: "DELETE" });
    await load();
  };

  const deleteTopic = async (id: string) => {
    if (!confirm("Delete this topic?")) return;
    await fetch(`/api/admin/topics?id=${id}`, { method: "DELETE" });
    await load();
  };

  const topicChapterMap = useMemo(() => {
    const map = new Map<string, ChapterItem>();
    chapters.forEach((c) => map.set(c.id, c));
    return map;
  }, [chapters]);

  const filteredChaptersForTopics = useMemo(() => {
    if (!topicExamId) return chapters;
    return chapters.filter((chapter) => chapter.examId === topicExamId);
  }, [chapters, topicExamId]);

  const filteredChaptersForPyqImport = useMemo(() => {
    if (!pyqImportExamId) return chapters;
    return chapters.filter((chapter) => chapter.examId === pyqImportExamId);
  }, [chapters, pyqImportExamId]);

  useEffect(() => {
    if (!filteredChaptersForTopics.length) {
      if (topicChapterId) setTopicChapterId("");
      return;
    }
    if (!filteredChaptersForTopics.some((chapter) => chapter.id === topicChapterId)) {
      setTopicChapterId(filteredChaptersForTopics[0].id);
    }
  }, [filteredChaptersForTopics, topicChapterId]);

  useEffect(() => {
    if (!filteredChaptersForPyqImport.length) {
      if (pyqImportChapterId) setPyqImportChapterId("");
      return;
    }
    if (!filteredChaptersForPyqImport.some((chapter) => chapter.id === pyqImportChapterId)) {
      setPyqImportChapterId(filteredChaptersForPyqImport[0].id);
    }
  }, [filteredChaptersForPyqImport, pyqImportChapterId]);

  return (
    <div className="min-h-screen bg-black text-white">
      <GlassRail />
      <div className="mx-auto w-full max-w-6xl px-6 pt-24 pb-10">
        <h1 className="text-2xl font-semibold">Admin</h1>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">Maintenance Mode</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={maintenanceEnabled}
                disabled={maintenanceLoading}
                onChange={(e) => toggleMaintenance(e.target.checked)}
              />
              {maintenanceEnabled ? "Enabled" : "Disabled"}
            </label>
            <span className="text-white/50">
              When enabled, only admin routes remain accessible.
            </span>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">Solution Visibility</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={solutionsEnabled}
                disabled={solutionsLoading}
                onChange={(e) => toggleSolutions(e.target.checked)}
              />
              {solutionsEnabled ? "Enabled" : "Disabled"}
            </label>
            <span className="text-white/50">
              When disabled, solution text is hidden for users.
            </span>
          </div>
        </section>

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
          <h2 className="text-sm font-semibold">Exams</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <input
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Exam name"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <input
              value={examCode}
              onChange={(e) => setExamCode(e.target.value)}
              placeholder="Short code"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <input
              type="number"
              value={examOrder}
              onChange={(e) => setExamOrder(Number(e.target.value))}
              placeholder="Order"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <button onClick={createExam} className="rounded-md border border-white/10 px-3 py-2 text-xs">
              Add Exam
            </button>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {exams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
                <div>
                  <div className="font-semibold">{exam.name}</div>
                  <div className="text-white/50">{exam.shortCode ?? ""}</div>
                </div>
                <button className="rounded-md border border-rose-400/40 px-2 py-1 text-rose-200" onClick={() => deleteExam(exam.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">Chapters</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-6">
            <select
              value={chapterExamId}
              onChange={(e) => setChapterExamId(e.target.value)}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
            <select
              value={chapterSubject}
              onChange={(e) => setChapterSubject(e.target.value)}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option>Physics</option>
              <option>Chemistry</option>
              <option>Maths</option>
            </select>
            <input
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
              placeholder="Chapter name"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <input
              type="number"
              value={chapterOrder}
              onChange={(e) => setChapterOrder(Number(e.target.value))}
              placeholder="Order"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <label className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black px-3 py-2 text-xs text-white/70">
              <span>{chapterIconUploading ? "Uploading..." : "Upload icon"}</span>
              <input
                type="file"
                accept="image/*"
                disabled={chapterIconUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadChapterIcon(file);
                }}
                className="text-xs text-white/70 file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:text-white"
              />
            </label>
            <button onClick={createChapter} className="rounded-md border border-white/10 px-3 py-2 text-xs">
              Add Chapter
            </button>
          </div>
          {chapterIconUrl && (
            <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
              <img src={chapterIconUrl} alt="Chapter icon preview" className="h-8 w-8 rounded-full border border-white/10 object-cover" />
              <span className="truncate">{chapterIconUrl}</span>
            </div>
          )}
          <div className="mt-3 space-y-2 text-xs">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold text-white/70">
                    {chapter.iconUrl ? (
                      <img src={chapter.iconUrl} alt={chapter.name} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      chapter.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{chapter.name}</div>
                    <div className="text-white/50">
                      {chapter.exam?.name ?? "Exam"} - {chapter.subject}
                    </div>
                  </div>
                </div>
                <button className="rounded-md border border-rose-400/40 px-2 py-1 text-rose-200" onClick={() => deleteChapter(chapter.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">Topics</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            <select
              value={topicExamId}
              onChange={(e) => setTopicExamId(e.target.value)}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
            <select
              value={topicChapterId}
              onChange={(e) => setTopicChapterId(e.target.value)}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option value="">Select chapter</option>
              {filteredChaptersForTopics.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.subject}  {chapter.name}
                </option>
              ))}
            </select>
            <input
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="Topic name"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <input
              type="number"
              value={topicOrder}
              onChange={(e) => setTopicOrder(Number(e.target.value))}
              placeholder="Order"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <button onClick={createTopic} className="rounded-md border border-white/10 px-3 py-2 text-xs">
              Add Topic
            </button>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {topics.map((topic) => (
              <div key={topic.id} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
                <div>
                  <div className="font-semibold">{topic.name}</div>
                  <div className="text-white/50">
                    {topicChapterMap.get(topic.chapterId)?.exam?.name ?? "Exam"} - {topicChapterMap.get(topic.chapterId)?.name ?? ""}
                  </div>
                </div>
                <button className="rounded-md border border-rose-400/40 px-2 py-1 text-rose-200" onClick={() => deleteTopic(topic.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">PYQ JSON Import</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-6">
            <select
              value={pyqImportExamId}
              onChange={(e) => setPyqImportExamId(e.target.value)}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
            <select
              value={pyqImportChapterId}
              onChange={(e) => setPyqImportChapterId(e.target.value)}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option value="">Select chapter</option>
              {filteredChaptersForPyqImport.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.subject}  {chapter.name}
                </option>
              ))}
            </select>
            <select
              value={pyqImportMode}
              onChange={(e) =>
                setPyqImportMode(e.target.value === "questions" ? "questions" : "papers")
              }
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option value="papers">Import year-wise papers</option>
              <option value="questions">Import questions only</option>
            </select>
            <label className="flex items-center rounded-md border border-white/10 bg-black px-3 py-2 text-xs text-white/70 sm:col-span-2">
              <input
                type="file"
                accept="application/json"
                onChange={(e) => setPyqJsonFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-white/70 file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:text-white"
              />
            </label>
            <select
              value={pyqImportLang}
              onChange={(e) => setPyqImportLang(e.target.value === "hi" ? "hi" : "en")}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option value="en">Language: English</option>
              <option value="hi">Language: Hindi</option>
            </select>
            <button
              onClick={importPyqJson}
              disabled={!pyqJsonFile || pyqImporting}
              className="rounded-md border border-white/10 px-3 py-2 text-xs disabled:opacity-60"
            >
              {pyqImporting ? "Importing..." : "Import PYQ"}
            </button>
          </div>
          {pyqImportMode === "questions" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <input
                value={pyqImportTestTitle}
                onChange={(e) => setPyqImportTestTitle(e.target.value)}
                placeholder="Test title (optional)"
                className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs sm:col-span-2"
              />
              <span className="text-xs text-white/50 sm:col-span-2">
                Uses a single test instead of year-wise papers.
              </span>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pyqImportOverwrite}
                onChange={(e) => setPyqImportOverwrite(e.target.checked)}
              />
              Overwrite existing same paper/test
            </label>
            <span className="text-white/50">
              Imports all questions into selected exam/chapter. Images in JSON are auto-linked.
            </span>
          </div>
          {pyqImportStatus && (
            <div
              className={
                "mt-3 rounded-md px-3 py-2 text-xs " +
                (pyqImportStatus.tone === "success"
                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : pyqImportStatus.tone === "error"
                  ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border border-white/10 bg-white/5 text-white/70")
              }
            >
              {pyqImportStatus.message}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">PYQ Cleanup</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <select
              value={purgeExamId}
              onChange={(e) => setPurgeExamId(e.target.value)}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
            <button
              onClick={purgeOrphanedQuestions}
              disabled={purging}
              className="rounded-md border border-white/10 px-3 py-2 text-xs disabled:opacity-60"
            >
              {purging ? "Purging..." : "Purge Orphaned Questions"}
            </button>
            <span className="text-xs text-white/50 sm:col-span-2">
              Removes PYQ questions whose chapters no longer exist.
            </span>
          </div>
          {purgeStatus && (
            <div
              className={
                "mt-3 rounded-md px-3 py-2 text-xs " +
                (purgeStatus.tone === "success"
                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : purgeStatus.tone === "error"
                  ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border border-white/10 bg-white/5 text-white/70")
              }
            >
              {purgeStatus.message}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">Tests</h2>
          <div className="mt-3 space-y-3 text-xs">
            {tests.map((t) => (
              <div key={t.id} className="rounded-md border border-white/10 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
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

                <div className="mt-3 grid gap-2 sm:grid-cols-6">
                  <label className="flex items-center gap-2 rounded-md border border-white/10 px-2 py-1">
                    <input
                      type="checkbox"
                      checked={Boolean(t.isPyq)}
                      onChange={(e) => updateTestMeta(t.id, { isPyq: e.target.checked })}
                    />
                    <span>PYQ</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-md border border-white/10 px-2 py-1">
                    <input
                      type="checkbox"
                      checked={Boolean(t.isYearPaper)}
                      onChange={(e) => updateTestMeta(t.id, { isYearPaper: e.target.checked })}
                    />
                    <span>Year-wise paper</span>
                  </label>
                  <select
                    value={t.examId ?? ""}
                    onChange={(e) => updateTestMeta(t.id, { examId: e.target.value || null })}
                    className="rounded-md border border-white/10 bg-black px-2 py-1"
                  >
                    <option value="">Exam</option>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Year"
                    type="number"
                    defaultValue={t.year ?? ""}
                    className="rounded-md border border-white/10 bg-black px-2 py-1"
                    onBlur={(e) => updateTestMeta(t.id, { year: e.target.value || null })}
                  />
                  <input
                    placeholder="Shift"
                    defaultValue={t.shift ?? ""}
                    className="rounded-md border border-white/10 bg-black px-2 py-1"
                    onBlur={(e) => updateTestMeta(t.id, { shift: e.target.value || null })}
                  />
                  <input
                    placeholder="Exam label"
                    defaultValue={t.exam ?? ""}
                    className="rounded-md border border-white/10 bg-black px-2 py-1"
                    onBlur={(e) => updateTestMeta(t.id, { exam: e.target.value || null })}
                  />
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

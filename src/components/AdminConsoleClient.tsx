"use client";

import { useEffect, useMemo, useState } from "react";
import GlassRail from "@/components/GlassRail";

type TestItem = {
  id: string;
  title: string;
  visibility: string;
  hidden: boolean;
  isPyq?: boolean;
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
  subject: string;
  name: string;
  order: number;
};

type TopicItem = {
  id: string;
  chapterId: string;
  name: string;
  order: number;
  chapter?: ChapterItem;
};

type PaperItem = {
  id: string;
  year: number;
  shift?: string | null;
  pdfUrl: string;
  examId: string;
  exam?: { name: string };
  testId?: string | null;
};

export default function AdminConsoleClient() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [papers, setPapers] = useState<PaperItem[]>([]);

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

  const [topicChapterId, setTopicChapterId] = useState("");
  const [topicName, setTopicName] = useState("");
  const [topicOrder, setTopicOrder] = useState(0);

  const [paperExamId, setPaperExamId] = useState("");
  const [paperYear, setPaperYear] = useState(new Date().getFullYear());
  const [paperShift, setPaperShift] = useState("");
  const [paperPdf, setPaperPdf] = useState("");
  const [paperTestId, setPaperTestId] = useState("");

  const load = async () => {
    const [t, u, b, e, c, tp, p] = await Promise.all([
      fetch("/api/admin/tests", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/broadcast", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/exams", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/chapters", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/topics", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/papers", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setTests(Array.isArray(t) ? t : []);
    setUsers(Array.isArray(u) ? u : []);
    setBroadcasts(Array.isArray(b) ? b : []);
    setExams(Array.isArray(e) ? e : []);
    setChapters(Array.isArray(c) ? c : []);
    setTopics(Array.isArray(tp) ? tp : []);
    setPapers(Array.isArray(p) ? p : []);
    if (Array.isArray(e) && e[0]?.id && !paperExamId) {
      setPaperExamId(e[0].id);
    }
    if (Array.isArray(c) && c[0]?.id && !topicChapterId) {
      setTopicChapterId(c[0].id);
    }
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
    if (!chapterName.trim()) return;
    await fetch("/api/admin/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: chapterSubject, name: chapterName, order: chapterOrder }),
    });
    setChapterName("");
    setChapterOrder(0);
    await load();
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

  const createPaper = async () => {
    if (!paperExamId || !paperPdf) return;
    await fetch("/api/admin/papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: paperExamId,
        year: paperYear,
        shift: paperShift,
        pdfUrl: paperPdf,
        testId: paperTestId || null,
      }),
    });
    setPaperPdf("");
    setPaperShift("");
    setPaperTestId("");
    await load();
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

  const deletePaper = async (id: string) => {
    if (!confirm("Delete this paper?")) return;
    await fetch(`/api/admin/papers?id=${id}`, { method: "DELETE" });
    await load();
  };

  const topicChapterMap = useMemo(() => {
    const map = new Map<string, ChapterItem>();
    chapters.forEach((c) => map.set(c.id, c));
    return map;
  }, [chapters]);

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
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
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
            <button onClick={createChapter} className="rounded-md border border-white/10 px-3 py-2 text-xs">
              Add Chapter
            </button>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
                <div>
                  <div className="font-semibold">{chapter.name}</div>
                  <div className="text-white/50">{chapter.subject}</div>
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
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <select
              value={topicChapterId}
              onChange={(e) => setTopicChapterId(e.target.value)}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option value="">Select chapter</option>
              {chapters.map((chapter) => (
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
                  <div className="text-white/50">{topicChapterMap.get(topic.chapterId)?.name ?? ""}</div>
                </div>
                <button className="rounded-md border border-rose-400/40 px-2 py-1 text-rose-200" onClick={() => deleteTopic(topic.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold">Year-wise Papers</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            <select
              value={paperExamId}
              onChange={(e) => setPaperExamId(e.target.value)}
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={paperYear}
              onChange={(e) => setPaperYear(Number(e.target.value))}
              placeholder="Year"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <input
              value={paperShift}
              onChange={(e) => setPaperShift(e.target.value)}
              placeholder="Shift (optional)"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <input
              value={paperPdf}
              onChange={(e) => setPaperPdf(e.target.value)}
              placeholder="PDF URL"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <input
              value={paperTestId}
              onChange={(e) => setPaperTestId(e.target.value)}
              placeholder="Test ID (optional)"
              className="rounded-md border border-white/10 bg-black px-3 py-2 text-xs"
            />
            <button onClick={createPaper} className="rounded-md border border-white/10 px-3 py-2 text-xs">
              Add Paper
            </button>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {papers.map((paper) => (
              <div key={paper.id} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
                <div>
                  <div className="font-semibold">{paper.exam?.name ?? "Exam"}  {paper.year}{paper.shift ? `  ${paper.shift}` : ""}</div>
                  <div className="text-white/50">{paper.pdfUrl}</div>
                </div>
                <button className="rounded-md border border-rose-400/40 px-2 py-1 text-rose-200" onClick={() => deletePaper(paper.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
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

                <div className="mt-3 grid gap-2 sm:grid-cols-5">
                  <label className="flex items-center gap-2 rounded-md border border-white/10 px-2 py-1">
                    <input
                      type="checkbox"
                      checked={Boolean(t.isPyq)}
                      onChange={(e) => updateTestMeta(t.id, { isPyq: e.target.checked })}
                    />
                    <span>PYQ</span>
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

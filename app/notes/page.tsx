"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Trash2, FileText, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, EmptyState, PrimaryButton, Skeleton } from "@/components/ui";

type NoteItem = { id: string; title: string; excerpt: string; updatedAt: string };
type NoteDetail = { id: string; title: string; content: string; createdAt: string; updatedAt: string };
type SaveState = "idle" | "saving" | "saved";
type Snapshot = { id: string; title: string; content: string };

const AUTOSAVE_DELAY = 800;

function fmtListTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function fmtClock(d: Date) {
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

function makeExcerpt(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 60);
}

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState("");

  const savedRef = useRef<Snapshot>({ id: "", title: "", content: "" });
  const pendingRef = useRef<Snapshot | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchToken = useRef(0);

  /* 初始加载列表 */
  useEffect(() => {
    api
      .get<NoteItem[]>("/api/notes")
      .then((list) => setNotes(Array.isArray(list) ? list : []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, []);

  /* 卸载时清掉定时器，顺手把未落盘的改动刷掉 */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const p = pendingRef.current;
      if (p) {
        pendingRef.current = null;
        api.patch(`/api/notes/${p.id}`, { title: p.title, content: p.content }).catch(() => {});
      }
    };
  }, []);

  const persist = async (snap: Snapshot) => {
    setSaveState("saving");
    try {
      await api.patch(`/api/notes/${snap.id}`, { title: snap.title, content: snap.content });
      const now = new Date();
      setNotes((list) =>
        list.map((n) =>
          n.id === snap.id
            ? { ...n, title: snap.title, excerpt: makeExcerpt(snap.content), updatedAt: now.toISOString() }
            : n,
        ),
      );
      savedRef.current = snap;
      setSavedAt(fmtClock(now));
      setSaveState("saved");
    } catch {
      setSaveState("idle");
    }
  };

  /** 切换笔记前先把上一条的待保存改动落盘 */
  const flushPending = async () => {
    const p = pendingRef.current;
    pendingRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!p) return;
    const s = savedRef.current;
    if (p.id === s.id && p.title === s.title && p.content === s.content) return;
    await persist(p);
  };

  const scheduleSave = (id: string, nextTitle: string, nextContent: string) => {
    pendingRef.current = { id, title: nextTitle, content: nextContent };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const p = pendingRef.current;
      pendingRef.current = null;
      if (!p) return;
      const s = savedRef.current;
      if (p.id === s.id && p.title === s.title && p.content === s.content) return;
      void persist(p);
    }, AUTOSAVE_DELAY);
  };

  const selectNote = async (id: string) => {
    if (id === selectedId) return;
    await flushPending();
    setSelectedId(id);
    setDetailLoading(true);
    const token = ++fetchToken.current;
    try {
      const d = await api.get<NoteDetail>(`/api/notes/${id}`);
      if (token !== fetchToken.current) return;
      const c = d.content ?? "";
      setTitle(d.title);
      setContent(c);
      savedRef.current = { id: d.id, title: d.title, content: c };
      setSaveState("idle");
      setSavedAt("");
    } catch {
      /* 拉取失败则保持现状 */
    } finally {
      if (token === fetchToken.current) setDetailLoading(false);
    }
  };

  const createNote = async () => {
    await flushPending();
    try {
      const n = await api.post<{
        id: string;
        title: string;
        content?: string;
        excerpt?: string;
        updatedAt?: string;
      }>("/api/notes", { title: "未命名笔记", content: "" });
      const item: NoteItem = {
        id: n.id,
        title: n.title,
        excerpt: n.excerpt ?? "",
        updatedAt: n.updatedAt ?? new Date().toISOString(),
      };
      setNotes((list) => [item, ...list]);
      setSelectedId(item.id);
      setTitle(item.title);
      setContent(n.content ?? "");
      savedRef.current = { id: item.id, title: item.title, content: n.content ?? "" };
      setSaveState("idle");
      setSavedAt("");
    } catch {
      /* 创建失败静默 */
    }
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm("确定删除这条笔记吗？删除后无法恢复。")) return;
    try {
      await api.del(`/api/notes/${id}`);
      setNotes((list) => list.filter((n) => n.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setTitle("");
        setContent("");
        setSaveState("idle");
        setSavedAt("");
        pendingRef.current = null;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    } catch {
      /* 删除失败静默 */
    }
  };

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (selectedId) scheduleSave(selectedId, v, content);
  };

  const onContentChange = (v: string) => {
    setContent(v);
    if (selectedId) scheduleSave(selectedId, title, v);
  };

  const visible = notes.filter((n) =>
    n.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const selectedUpdatedAt = notes.find((n) => n.id === selectedId)?.updatedAt;

  const saveHint =
    saveState === "saving" ? (
      <span className="flex items-center gap-1.5 text-[12px] text-aurora-cyan whitespace-nowrap">
        <Loader2 size={13} className="animate-spin" />
        保存中…
      </span>
    ) : saveState === "saved" && savedAt ? (
      <span className="flex items-center gap-1.5 text-[12px] text-aurora-teal whitespace-nowrap">
        <Check size={13} />
        已保存 {savedAt}
      </span>
    ) : null;

  return (
    <div>
      <PageHeader
        title="笔记"
        sub="想法落字为安，改动会自动保存，不用操心"
        actions={
          <PrimaryButton onClick={createNote}>
            <Plus size={15} />
            新建笔记
          </PrimaryButton>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* 左侧：笔记列表 */}
        <div className="glass rounded-2xl p-4 flex flex-col gap-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-160px)]">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索笔记标题…"
              className="input-aurora w-full pl-9 pr-3 py-2.5 text-[13px] text-ink"
            />
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[280px] lg:max-h-none lg:flex-1 pr-0.5">
            {loading ? (
              <>
                <Skeleton className="h-[76px]" />
                <Skeleton className="h-[76px]" />
                <Skeleton className="h-[76px]" />
              </>
            ) : visible.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<FileText size={22} />}
                  text={notes.length === 0 ? "还没有笔记" : "没有匹配的笔记"}
                  hint={notes.length === 0 ? "点右上角新建，记下第一条灵感" : "换个关键词试试"}
                />
              </div>
            ) : (
              visible.map((n, idx) => {
                const active = n.id === selectedId;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.25) }}
                    onClick={() => selectNote(n.id)}
                    className={`text-left rounded-xl p-3.5 border cursor-pointer transition-all ${
                      active
                        ? "bg-white/[0.08] border-violet-400/40 shadow-[0_0_24px_rgba(139,92,246,0.16)]"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-[13.5px] text-ink truncate flex-1 min-w-0">
                        {n.title || "无标题"}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(n.id);
                        }}
                        title="删除笔记"
                        className="shrink-0 p-1 rounded-md text-ink-faint hover:text-aurora-rose hover:bg-rose-400/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-ink-dim text-[12px] leading-5 line-clamp-2 mt-1 min-h-[20px]">
                      {n.excerpt || "暂无内容"}
                    </div>
                    <div className="text-ink-faint text-[11px] mt-1.5 num">
                      {fmtListTime(n.updatedAt)}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* 右侧：编辑区 */}
        {!selectedId ? (
          <div className="glass rounded-2xl min-h-[420px] lg:min-h-[560px] flex items-center justify-center">
            <EmptyState
              icon={<FileText size={26} />}
              text="从左侧选一条笔记开始编辑"
              hint="或点击右上角新建一条"
            />
          </div>
        ) : detailLoading ? (
          <div className="glass rounded-2xl p-5 min-h-[420px] lg:min-h-[560px] flex flex-col gap-4">
            <Skeleton className="h-11 w-2/3" />
            <Skeleton className="flex-1" />
          </div>
        ) : (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-2xl flex flex-col min-h-[420px] lg:min-h-[560px] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-white/[0.07]">
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="给笔记起个标题"
                className="input-aurora flex-1 min-w-0 px-4 py-2.5 text-[15px] font-medium text-ink"
              />
              <div className="shrink-0 hidden sm:block">{saveHint}</div>
            </div>
            <div className="sm:hidden px-5 pt-3 h-5">{saveHint}</div>
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="把想法写下来…"
              className="input-aurora flex-1 mx-4 sm:mx-5 my-4 p-4 text-[14px] leading-7 text-ink resize-none min-h-[300px] lg:min-h-[400px]"
            />
            {selectedUpdatedAt && (
              <div className="px-5 py-3 border-t border-white/[0.07] text-[11.5px] text-ink-faint num">
                更新于 {fmtListTime(selectedUpdatedAt)}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

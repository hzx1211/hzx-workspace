"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckSquare, NotebookPen, BookOpenText, FolderKanban } from "lucide-react";

type Hit = { id: string; title: string; subtitle?: string; href: string; kind: string };

const KIND_ICON: Record<string, React.ReactNode> = {
  task: <CheckSquare size={15} className="text-aurora-cyan" />,
  note: <NotebookPen size={15} className="text-aurora-violet" />,
  word: <BookOpenText size={15} className="text-aurora-teal" />,
  project: <FolderKanban size={15} className="text-aurora-amber" />,
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ(""); setHits([]); setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open ]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setHits([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const d = await r.json();
        setHits(d.results ?? []);
        setActive(0);
      } catch { /* ignore */ }
    }, 220);
  }, [q]);

  const go = (h: Hit) => {
    setOpen(false);
    router.push(h.href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4"
      onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="glass-deep relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Search size={18} className="text-ink-faint shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && hits[active]) go(hits[active]);
            }}
            placeholder="搜索任务、笔记、单词、项目…"
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-ink-faint"
          />
          <kbd className="text-[11px] text-ink-faint px-1.5 py-0.5 rounded bg-white/10">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {hits.length === 0 && q.trim() && (
            <div className="px-4 py-8 text-center text-ink-faint text-sm">没有找到「{q}」相关的内容</div>
          )}
          {hits.map((h, i) => (
            <button
              key={h.kind + h.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors
                ${i === active ? "bg-white/[0.08]" : ""}`}>
              {KIND_ICON[h.kind]}
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] truncate">{h.title}</span>
                {h.subtitle && <span className="block text-[12px] text-ink-faint truncate">{h.subtitle}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

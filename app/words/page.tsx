"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Flame,
  BookOpen,
  Search,
  ChevronDown,
  Eye,
  PartyPopper,
  Check,
  HelpCircle,
  X,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, Card, EmptyState, Skeleton } from "@/components/ui";

interface WordCard {
  id: string;
  word: string;
  level: string;
  definition: string;
}
interface NextResp {
  word: WordCard | null;
}
interface WeekDay {
  date: string;
  count: number;
}
interface WordStats {
  total: number;
  known: number;
  learning: number;
  fresh: number;
  todayReviews: number;
  streakDays: number;
  week: WeekDay[];
}
interface WordItem {
  id: string;
  word: string;
  level: string;
  definition: string;
  progress: { familiarity: number; reviews: number } | null;
}

const LEVELS = [
  { key: "CET4", label: "CET-4" },
  { key: "CET6", label: "CET-6" },
  { key: "ALL", label: "全部" },
] as const;
type LevelKey = (typeof LEVELS)[number]["key"];

const LEVEL_CLS: Record<string, string> = {
  CET4: "text-aurora-cyan bg-cyan-400/10",
  CET6: "text-aurora-violet bg-violet-400/10",
};

/** familiarity: 0 生词 / 1 模糊 / 2 认识 */
const FAM_META = [
  { label: "生词", dot: "bg-aurora-rose" },
  { label: "模糊", dot: "bg-aurora-amber" },
  { label: "认识", dot: "bg-aurora-teal" },
];

const REVIEW_ACTIONS = [
  {
    result: 0 as const,
    label: "不认识",
    icon: X,
    cls: "border-rose-400/30 text-aurora-rose hover:bg-rose-400/10 hover:border-rose-400/50",
  },
  {
    result: 1 as const,
    label: "模糊",
    icon: HelpCircle,
    cls: "border-amber-400/30 text-aurora-amber hover:bg-amber-400/10 hover:border-amber-400/50",
  },
  {
    result: 2 as const,
    label: "认识",
    icon: Check,
    cls: "border-teal-400/30 text-aurora-teal hover:bg-teal-400/10 hover:border-teal-400/50",
  },
];

function splitDefs(def: string): string[] {
  return def
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function WordsPage() {
  const [level, setLevel] = useState<LevelKey>("CET4");
  const [stats, setStats] = useState<WordStats | null>(null);
  const [current, setCurrent] = useState<WordCard | null>(null);
  const [nextLoading, setNextLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const [bookOpen, setBookOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState("");
  const [book, setBook] = useState<WordItem[]>([]);
  const [bookLoading, setBookLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStats(await api.get<WordStats>("/api/words/stats"));
    } catch {
      /* 保持旧数据 */
    }
  }, []);

  const loadNext = useCallback(async () => {
    setNextLoading(true);
    try {
      const data = await api.get<NextResp>(
        `/api/words/next?level=${encodeURIComponent(level)}`
      );
      setCurrent(data.word);
      setRevealed(false);
    } catch {
      setCurrent(null);
    } finally {
      setNextLoading(false);
    }
  }, [level]);

  const loadBook = useCallback(async () => {
    setBookLoading(true);
    try {
      const data = await api.get<WordItem[]>(
        `/api/words?level=${encodeURIComponent(level)}&take=60&q=${encodeURIComponent(bookQuery.trim())}`
      );
      setBook(data);
    } catch {
      setBook([]);
    } finally {
      setBookLoading(false);
    }
  }, [level, bookQuery]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  /* 单词本：级别/搜索变化时防抖加载 */
  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadBook();
    }, 350);
    return () => window.clearTimeout(id);
  }, [loadBook]);

  const switchLevel = (key: LevelKey) => {
    if (key === level) return;
    setLevel(key);
    setBookQuery("");
  };

  const handleReview = async (result: 0 | 1 | 2) => {
    if (!current || reviewing) return;
    setReviewing(true);
    try {
      await api.post("/api/words/review", { wordId: current.id, result });
      await Promise.all([loadStats(), loadNext()]);
    } catch {
      /* 失败时停留在当前词，可重试 */
    } finally {
      setReviewing(false);
    }
  };

  const knownPct =
    stats && stats.total > 0
      ? Math.round((stats.known / stats.total) * 100)
      : 0;

  return (
    <div>
      <PageHeader title="背单词" sub="CET-4 / CET-6 词库 · 间隔重复，认识、模糊、不认识三档记忆" />

      {/* ---- 顶部统计条 ---- */}
      <Card delay={0.05} className="!p-4">
        {stats ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center">
                <Flame size={18} className="text-orange-400" />
              </div>
              <div>
                <div className="num text-[20px] font-bold leading-none">
                  {stats.streakDays}
                  <span className="text-[12px] font-normal text-ink-faint ml-1">天</span>
                </div>
                <div className="text-ink-faint text-[11.5px] mt-1">连续打卡</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center">
                <Sparkles size={18} className="text-aurora-cyan" />
              </div>
              <div>
                <div className="num text-[20px] font-bold leading-none">
                  {stats.todayReviews}
                  <span className="text-[12px] font-normal text-ink-faint ml-1">个</span>
                </div>
                <div className="text-ink-faint text-[11.5px] mt-1">今日已学</div>
              </div>
            </div>
            <div className="flex-1 sm:pl-4 sm:border-l sm:border-white/[0.08]">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[12.5px] text-ink-dim">
                  已认识{" "}
                  <span className="num font-semibold text-white">{stats.known}</span>
                  <span className="text-ink-faint"> / {stats.total}</span>
                </span>
                <span className="num text-[12px] text-aurora">{knownPct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.07] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${knownPct}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-aurora-violet via-aurora-cyan to-aurora-teal"
                />
              </div>
              <div className="flex gap-3 mt-1.5 text-[11.5px] text-ink-faint">
                <span>
                  学习中 <span className="num text-ink-dim">{stats.learning}</span>
                </span>
                <span>
                  未学 <span className="num text-ink-dim">{stats.fresh}</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <Skeleton className="h-[76px]" />
        )}
      </Card>

      {/* ---- 级别 tabs ---- */}
      <div className="flex gap-2 mt-5 mb-5">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            onClick={() => switchLevel(l.key)}
            className={`px-5 py-2 rounded-full text-[13.5px] font-medium transition-all duration-300 ${
              level === l.key
                ? "btn-aurora text-white"
                : "glass text-ink-dim hover:text-white"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* ---- 单词卡片 ---- */}
      <Card className="relative overflow-hidden !p-0" delay={0.1}>
        <div
          aria-hidden
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[480px] h-[300px] rounded-full bg-gradient-to-br from-aurora-violet/25 to-aurora-cyan/15 blur-[100px] pointer-events-none"
        />
        {nextLoading ? (
          <div className="p-8">
            <Skeleton className="h-10 w-40 mx-auto" />
            <Skeleton className="h-16 w-3/4 mx-auto mt-6" />
            <Skeleton className="h-6 w-1/2 mx-auto mt-4" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 70, rotate: 1.5 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: -70, rotate: -1.5 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  onClick={() => setRevealed((v) => !v)}
                  className="relative cursor-pointer select-none px-6 pt-10 pb-8 text-center"
                >
                  <span
                    className={`inline-block px-2.5 py-1 rounded-lg text-[11.5px] font-medium mb-5 ${
                      LEVEL_CLS[current.level] ?? "text-ink-dim bg-white/[0.07]"
                    }`}
                  >
                    {current.level}
                  </span>
                  <div className="display text-[52px] sm:text-[68px] font-bold leading-tight text-white">
                    {current.word}
                  </div>
                  <div className="mt-6 min-h-[86px] flex items-start justify-center">
                    {revealed ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-1.5"
                      >
                        {splitDefs(current.definition).map((d, i) => (
                          <p
                            key={i}
                            className="text-[16px] text-ink leading-relaxed"
                          >
                            {d}
                          </p>
                        ))}
                      </motion.div>
                    ) : (
                      <div className="flex items-center gap-2 text-ink-faint text-[13.5px] pt-4">
                        <Eye size={15} />
                        点击卡片显示释义
                      </div>
                    )}
                  </div>
                </div>
                {/* 三档评价 */}
                <div className="relative flex gap-2.5 px-5 sm:px-8 pb-7">
                  {REVIEW_ACTIONS.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.result}
                        disabled={reviewing}
                        onClick={() => void handleReview(a.result)}
                        className={`flex-1 rounded-xl border py-3.5 flex items-center justify-center gap-2 text-[14px] font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-wait active:scale-[0.97] ${a.cls}`}
                      >
                        <Icon size={16} />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="word-done"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <EmptyState
                  icon={<PartyPopper size={22} className="text-aurora-amber" />}
                  text="今日已学完"
                  hint="这个级别的单词都复习完啦，明天再来，或者去单词本里巩固"
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </Card>

      {/* ---- 单词本折叠区 ---- */}
      <Card delay={0.16} className="mt-5 !p-0 overflow-hidden">
        <button
          onClick={() => setBookOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-5 py-4 text-left"
        >
          <BookOpen size={15} className="text-aurora-teal" />
          <span className="text-[14px] font-medium">单词本</span>
          <span className="text-ink-faint text-[12px]">
            {book.length > 0 ? `共 ${book.length} 词` : ""}
          </span>
          <ChevronDown
            size={16}
            className={`ml-auto text-ink-faint transition-transform duration-300 ${
              bookOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        <AnimatePresence initial={false}>
          {bookOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5">
                <div className="relative mb-3">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    value={bookQuery}
                    onChange={(e) => setBookQuery(e.target.value)}
                    placeholder="搜索单词…"
                    className="input-aurora w-full pl-10 pr-3.5 py-2.5 text-[13.5px] text-ink"
                  />
                </div>
                {bookLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : book.length === 0 ? (
                  <EmptyState
                    icon={<BookOpen size={20} />}
                    text={bookQuery ? "没有找到匹配的单词" : "单词本是空的"}
                  />
                ) : (
                  <ul className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
                    {book.map((w) => {
                      const fam = w.progress
                        ? FAM_META[w.progress.familiarity]
                        : null;
                      return (
                        <li
                          key={w.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-medium truncate">
                                {w.word}
                              </span>
                              <span
                                className={`shrink-0 px-1.5 py-0.5 rounded text-[10.5px] font-medium ${
                                  LEVEL_CLS[w.level] ??
                                  "text-ink-dim bg-white/[0.07]"
                                }`}
                              >
                                {w.level}
                              </span>
                            </div>
                            <div className="text-ink-faint text-[12px] truncate mt-0.5">
                              {splitDefs(w.definition)[0]}
                            </div>
                          </div>
                          <span className="flex items-center gap-1.5 shrink-0 text-[11.5px] text-ink-faint">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                fam ? fam.dot : "bg-white/20"
                              }`}
                            />
                            {fam ? fam.label : "未学习"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

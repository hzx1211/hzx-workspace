"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ListTodo, Timer, BookOpen, Inbox, Plus, Check, StickyNote,
  CalendarDays, NotebookPen, Sparkles, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Card, EmptyState, Skeleton, PRIORITY_META,
} from "@/components/ui";

/* ---------- 类型 ---------- */
type DashTask = {
  id: string;
  title: string;
  priority: string;
  dueDate?: string | null;
  status: string;
  project?: { id: string; name: string; color: string } | null;
};

type DashboardData = {
  todayTasks: DashTask[];
  stats: { todo: number; doing: number; done: number; doneToday: number };
  pomodoro: { todayCount: number; todayMinutes: number };
  words: { todayReviews: number; streakDays: number; learning: number };
  recentNotes: { id: string; title: string; excerpt: string; updatedAt: string }[];
  inboxCount: number;
};

/* ---------- 问候 ---------- */
function greetingOf(h: number): string {
  if (h >= 5 && h < 9) return "清晨好";
  if (h >= 9 && h < 12) return "上午好";
  if (h >= 12 && h < 14) return "中午好";
  if (h >= 14 && h < 18) return "下午好";
  if (h >= 18 && h < 23) return "晚上好";
  return "夜深了";
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
}

function fmtClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmtDue(due?: string | null): string {
  if (!due) return "";
  const d = new Date(due);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function DashboardPage() {
  const [now, setNow] = useState<Date | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api
      .get<DashboardData>("/api/dashboard")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  async function toggleTask(task: DashTask) {
    const next = task.status === "done" ? "todo" : "done";
    setData((d) =>
      d ? { ...d, todayTasks: d.todayTasks.map((x) => (x.id === task.id ? { ...x, status: next } : x)) } : d,
    );
    try {
      await api.patch(`/api/tasks/${task.id}`, { status: next });
      const fresh = await api.get<DashboardData>("/api/dashboard");
      setData(fresh);
    } catch {
      // 回滚
      setData((d) =>
        d ? { ...d, todayTasks: d.todayTasks.map((x) => (x.id === task.id ? { ...x, status: task.status } : x)) } : d,
      );
    }
  }

  const statCards = data
    ? [
        {
          icon: ListTodo, label: "今日待办", href: "/tasks",
          value: `${data.stats.todo + data.stats.doing}`, unit: "项",
          sub: `今日已完成 ${data.stats.doneToday} 项`,
          iconBox: "text-aurora-violet bg-violet-500/10",
          glow: "hover:shadow-[0_0_32px_rgba(139,92,246,0.18)]",
        },
        {
          icon: Timer, label: "今日番茄", href: "/pomodoro",
          value: `${data.pomodoro.todayCount}`, unit: "个",
          sub: `专注 ${data.pomodoro.todayMinutes} 分钟`,
          iconBox: "text-aurora-rose bg-rose-500/10",
          glow: "hover:shadow-[0_0_32px_rgba(251,113,133,0.18)]",
        },
        {
          icon: BookOpen, label: "单词打卡", href: "/words",
          value: `${data.words.todayReviews}`, unit: "次",
          sub: `连续打卡 ${data.words.streakDays} 天`,
          iconBox: "text-aurora-amber bg-amber-500/10",
          glow: "hover:shadow-[0_0_32px_rgba(251,191,36,0.18)]",
        },
        {
          icon: Inbox, label: "收集箱", href: "/inbox",
          value: `${data.inboxCount}`, unit: "条",
          sub: "待整理的新想法",
          iconBox: "text-aurora-cyan bg-cyan-500/10",
          glow: "hover:shadow-[0_0_32px_rgba(34,211,238,0.18)]",
        },
      ]
    : [];

  const shortcuts = [
    { icon: Plus, label: "新建任务", desc: "记录一件事", href: "/tasks", cls: "text-aurora-violet bg-violet-500/10" },
    { icon: Timer, label: "开始番茄", desc: "专注 25 分钟", href: "/pomodoro", cls: "text-aurora-rose bg-rose-500/10" },
    { icon: BookOpen, label: "背单词", desc: "今日复习", href: "/words", cls: "text-aurora-amber bg-amber-500/10" },
    { icon: NotebookPen, label: "写笔记", desc: "捕捉灵感", href: "/notes", cls: "text-aurora-teal bg-teal-500/10" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-28 md:pb-12 pt-6 sm:pt-8">
      {/* ===== Hero ===== */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
        <div>
          <div className="flex items-center gap-2 text-ink-dim text-[13px] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-aurora-cyan" />
            {now ? fmtDate(now) : <span className="inline-block w-40 h-4" />}
          </div>
          <h1 className="display text-[34px] sm:text-[44px] font-bold leading-tight">
            {now ? greetingOf(now.getHours()) : "你好"}
            <span className="text-aurora">，hzx</span>
          </h1>
          <p className="text-ink-dim text-[13.5px] mt-2">新的一天，从专注开始。今天也有小确幸在等你。</p>
        </div>
        <div className="glass rounded-2xl px-6 py-4 text-right shrink-0 card-lift">
          <div className="num text-[30px] sm:text-[34px] font-semibold text-aurora leading-none">
            {now ? fmtClock(now) : "--:--:--"}
          </div>
          <div className="text-ink-faint text-[11.5px] mt-1.5 tracking-widest">LOCAL TIME</div>
        </div>
      </section>

      {/* ===== 统计卡 ===== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
        {loading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[132px]" />)
          : statCards.map((s, i) => (
              <Link key={s.label} href={s.href}>
                <Card delay={i * 0.06} className={`!p-4 sm:!p-5 cursor-pointer ${s.glow}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.iconBox}`}>
                    <s.icon className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="num text-[28px] sm:text-[32px] font-semibold">{s.value}</span>
                    <span className="text-ink-faint text-[12px]">{s.unit}</span>
                  </div>
                  <div className="text-ink-dim text-[12.5px] mt-1">{s.label}</div>
                  <div className="text-ink-faint text-[11.5px] mt-0.5 truncate">{s.sub}</div>
                </Card>
              </Link>
            ))}
      </section>

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-5">
        {/* ===== 今日任务 ===== */}
        <section className="lg:col-span-3">
          <Card delay={0.1} className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="display text-[17px] font-bold">今日任务</h2>
              <Link href="/tasks" className="flex items-center gap-1 text-[12.5px] text-ink-dim hover:text-white transition-colors">
                全部任务 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="px-5 pb-5 space-y-2.5">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[52px]" />)}
              </div>
            ) : !data || data.todayTasks.length === 0 ? (
              <div className="px-5 pb-4">
                <EmptyState
                  icon={<CalendarDays className="w-6 h-6" />}
                  text="今天没有待办任务"
                  hint="去任务页新建一个，开启高效的一天"
                />
              </div>
            ) : (
              <ul className="px-2.5 pb-3">
                {data.todayTasks.map((t) => {
                  const done = t.status === "done";
                  const pm = PRIORITY_META[t.priority] ?? PRIORITY_META.medium;
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 px-2.5 py-3 rounded-xl hover:bg-white/[0.04] transition-colors"
                    >
                      <button
                        onClick={() => toggleTask(t)}
                        aria-label={done ? "标为未完成" : "标为完成"}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          done
                            ? "bg-gradient-to-br from-aurora-teal to-aurora-cyan border-transparent"
                            : "border-white/25 hover:border-aurora-cyan"
                        }`}
                      >
                        {done && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[14px] truncate ${done ? "line-through text-ink-faint" : "text-ink"}`}>
                          {t.title}
                        </div>
                        <div className="flex items-center gap-2.5 mt-1 text-[11.5px] text-ink-faint">
                          <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${pm.dot}`} />
                            {pm.label}优先级
                          </span>
                          {t.dueDate && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {fmtDue(t.dueDate)}
                            </span>
                          )}
                          {t.project && (
                            <span className="flex items-center gap-1 max-w-[120px]">
                              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: t.project.color }} />
                              <span className="truncate">{t.project.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>

        {/* ===== 最近笔记 + 快捷入口 ===== */}
        <section className="lg:col-span-2 flex flex-col gap-4 sm:gap-5">
          <Card delay={0.16} className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="display text-[17px] font-bold">最近笔记</h2>
              <Link href="/notes" className="flex items-center gap-1 text-[12.5px] text-ink-dim hover:text-white transition-colors">
                全部笔记 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="px-5 pb-5 space-y-2.5">
                {[0, 1].map((i) => <Skeleton key={i} className="h-[64px]" />)}
              </div>
            ) : !data || data.recentNotes.length === 0 ? (
              <div className="px-5 pb-4">
                <EmptyState
                  icon={<StickyNote className="w-6 h-6" />}
                  text="还没有笔记"
                  hint="把灵感写下来吧"
                />
              </div>
            ) : (
              <ul className="px-2.5 pb-3">
                {data.recentNotes.slice(0, 3).map((n) => (
                  <li key={n.id}>
                    <Link
                      href="/notes"
                      className="flex gap-3 px-2.5 py-3 rounded-xl hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-aurora-violet flex items-center justify-center shrink-0">
                        <StickyNote className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] text-ink truncate">{n.title}</div>
                        <div className="text-[12px] text-ink-faint truncate mt-0.5">{n.excerpt}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card delay={0.22}>
            <h2 className="display text-[17px] font-bold mb-4">快捷入口</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {shortcuts.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:border-aurora-violet/40 hover:bg-white/[0.07] transition-all"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.cls}`}>
                    <s.icon className="w-[17px] h-[17px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] text-ink font-medium">{s.label}</div>
                    <div className="text-[11px] text-ink-faint truncate">{s.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

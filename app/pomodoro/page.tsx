"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Timer,
  Coffee,
  Link2,
  TrendingUp,
  CalendarCheck,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  PageHeader,
  Card,
  EmptyState,
  PrimaryButton,
  GhostButton,
  Skeleton,
} from "@/components/ui";

type Kind = "focus" | "short-break" | "long-break";

interface DayStat {
  date: string;
  count: number;
  minutes: number;
}
interface PomoRecord {
  id: string;
  kind: Kind;
  minutes: number;
  completedAt: string;
  taskTitle?: string;
}
interface PomoStats {
  today: { count: number; minutes: number };
  week: DayStat[];
  recent: PomoRecord[];
}
interface TaskItem {
  id: string;
  title: string;
  status: string;
}

interface ModeDef {
  key: string;
  label: string;
  kind: Kind;
  minutes: number;
}

const MODES: ModeDef[] = [
  { key: "focus25", label: "专注 25", kind: "focus", minutes: 25 },
  { key: "focus50", label: "专注 50", kind: "focus", minutes: 50 },
  { key: "short5", label: "休息 5", kind: "short-break", minutes: 5 },
  { key: "long10", label: "休息 10", kind: "long-break", minutes: 10 },
];

const KIND_META: Record<Kind, { label: string; icon: LucideIcon; cls: string }> = {
  focus: { label: "专注", icon: Timer, cls: "text-aurora-rose bg-rose-400/10" },
  "short-break": { label: "短休息", icon: Coffee, cls: "text-aurora-teal bg-teal-400/10" },
  "long-break": { label: "长休息", icon: Coffee, cls: "text-aurora-cyan bg-cyan-400/10" },
};

const WEEK_DAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function fmt(totalSec: number) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${mo}月${day}日 ${hh}:${mm}`;
}

function weekDayOf(dateStr: string) {
  return WEEK_DAYS[new Date(`${dateStr}T12:00:00`).getDay()];
}

/** 用 AudioContext 合成结束提示音（正弦波三连音），无需外部音频文件 */
function playChime() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    [880, 660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.3;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.28, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    });
    window.setTimeout(() => void ctx.close(), 1400);
  } catch {
    /* 音频不可用时静默 */
  }
}

const RING_R = 138;
const RING_C = 2 * Math.PI * RING_R;

export default function PomodoroPage() {
  const [modeKey, setModeKey] = useState("focus25");
  const activeMode = MODES.find((m) => m.key === modeKey) ?? MODES[0];
  const total = activeMode.minutes * 60;

  const [secondsLeft, setSecondsLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [linkedTask, setLinkedTask] = useState("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState<PomoStats | null>(null);

  const isFocus = activeMode.kind === "focus";
  const progress = total > 0 ? 1 - secondsLeft / total : 0;
  const linkedTaskTitle = tasks.find((t) => t.id === linkedTask)?.title;

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get<PomoStats>("/api/pomodoro?days=7");
      setStats(data);
    } catch {
      /* 保持旧数据 */
    }
  }, []);

  /* 初始加载：统计 + 未完成任务 */
  useEffect(() => {
    void loadStats();
    (async () => {
      try {
        const [todo, doing] = await Promise.all([
          api.get<TaskItem[]>("/api/tasks?status=todo"),
          api.get<TaskItem[]>("/api/tasks?status=doing"),
        ]);
        const seen = new Set<string>();
        setTasks(
          [...todo, ...doing].filter((t) => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
          })
        );
      } catch {
        /* 无任务时可不关联 */
      }
    })();
  }, [loadStats]);

  /* 倒计时 tick */
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  /* 倒计时结束：提示音 + 自动记录 + 刷新统计 */
  useEffect(() => {
    if (!running || secondsLeft > 0) return;
    let cancelled = false;
    (async () => {
      playChime();
      try {
        await api.post("/api/pomodoro", {
          kind: activeMode.kind,
          minutes: activeMode.minutes,
          ...(linkedTask ? { taskId: linkedTask } : {}),
        });
        if (!cancelled) await loadStats();
      } catch {
        /* 记录失败不打断流程 */
      }
      if (!cancelled) {
        setRunning(false);
        setSecondsLeft(activeMode.minutes * 60);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [secondsLeft, running, activeMode, linkedTask, loadStats]);

  /* 标签页标题随倒计时变化 */
  useEffect(() => {
    document.title = `${fmt(secondsLeft)} · 番茄钟`;
    return () => {
      document.title = "hzx的工作台";
    };
  }, [secondsLeft]);

  const switchMode = (key: string) => {
    if (key === modeKey) return;
    const m = MODES.find((x) => x.key === key);
    if (!m) return;
    setRunning(false);
    setModeKey(key);
    setSecondsLeft(m.minutes * 60);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(activeMode.minutes * 60);
  };

  const maxWeekMin = Math.max(1, ...((stats?.week ?? []).map((d) => d.minutes)));

  return (
    <div>
      <PageHeader
        title="番茄钟"
        sub="沉浸式专注计时 · 完成自动记录，切换标签页也能在标题栏看到倒计时"
      />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ---- 计时器主卡 ---- */}
        <Card className="lg:col-span-3 relative overflow-hidden" delay={0.05}>
          {/* 模式氛围光 */}
          <div
            aria-hidden
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full blur-[110px] opacity-25 animate-breathe pointer-events-none transition-colors duration-700 ${
              isFocus
                ? "bg-gradient-to-br from-aurora-rose to-aurora-violet"
                : "bg-gradient-to-br from-aurora-cyan to-aurora-teal"
            }`}
          />

          {/* 模式胶囊 */}
          <div className="relative flex flex-wrap justify-center gap-2 mb-2">
            {MODES.map((m) => {
              const active = m.key === modeKey;
              const focusMode = m.kind === "focus";
              return (
                <button
                  key={m.key}
                  onClick={() => switchMode(m.key)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-300 ${
                    active
                      ? focusMode
                        ? "bg-gradient-to-r from-aurora-rose to-aurora-violet text-white shadow-[0_0_20px_rgba(251,113,133,0.45)]"
                        : "bg-gradient-to-r from-aurora-cyan to-aurora-teal text-white shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                      : "glass text-ink-dim hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* 进度环 */}
          <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] mx-auto my-4">
            <svg
              viewBox="0 0 320 320"
              className="w-full h-full tomato-glow -rotate-90"
            >
              <defs>
                <linearGradient id="pomo-focus" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="pomo-rest" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
              <circle
                cx="160"
                cy="160"
                r={RING_R}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="14"
              />
              <circle
                cx="160"
                cy="160"
                r={RING_R}
                fill="none"
                stroke={isFocus ? "url(#pomo-focus)" : "url(#pomo-rest)"}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - progress)}
                style={{
                  transition:
                    "stroke-dashoffset 0.9s linear, stroke 0.5s ease",
                }}
              />
            </svg>
            {/* 圆心 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-[12px] tracking-[0.3em] mb-2 font-medium ${
                  isFocus ? "text-aurora-rose" : "text-aurora-teal"
                }`}
              >
                {isFocus ? "专注中" : "休息中"}
              </span>
              <span className="num text-[64px] sm:text-[76px] font-bold leading-none text-white">
                {fmt(secondsLeft)}
              </span>
              <span className="text-ink-faint text-[12px] mt-3 max-w-[200px] text-center leading-relaxed">
                {linkedTaskTitle
                  ? `正在为「${linkedTaskTitle}」计时`
                  : isFocus
                    ? "保持专注，深呼吸，一次只做一件事"
                    : "起来走走，看看远方，让眼睛休息一下"}
              </span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="relative flex items-center justify-center gap-3">
            <GhostButton onClick={reset} className="!px-3.5">
              <RotateCcw size={16} />
              重置
            </GhostButton>
            <PrimaryButton
              onClick={() => setRunning((r) => !r)}
              className="!px-8 !py-3 !text-[15px]"
            >
              {running ? <Pause size={17} /> : <Play size={17} />}
              {running ? "暂停" : secondsLeft < total ? "继续" : "开始"}
            </PrimaryButton>
          </div>

          {/* 关联任务 */}
          <div className="relative mt-6">
            <label className="flex items-center gap-1.5 text-[12.5px] text-ink-dim mb-2">
              <Link2 size={13} />
              关联任务
              <span className="text-ink-faint">（完成时一起记录）</span>
            </label>
            <select
              value={linkedTask}
              onChange={(e) => setLinkedTask(e.target.value)}
              className="input-aurora w-full px-3.5 py-2.5 text-[13.5px] text-ink appearance-none cursor-pointer"
            >
              <option value="" className="bg-abyss-2">
                不关联任务
              </option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id} className="bg-abyss-2">
                  {t.title}
                </option>
              ))}
            </select>
            {tasks.length === 0 && (
              <p className="text-ink-faint text-[12px] mt-1.5">
                暂无未完成任务，可直接开始计时
              </p>
            )}
          </div>
        </Card>

        {/* ---- 右侧统计 ---- */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <Card delay={0.12}>
            <div className="flex items-center gap-2 mb-4">
              <CalendarCheck size={15} className="text-aurora-violet" />
              <h3 className="text-[14px] font-medium">今日专注</h3>
            </div>
            {stats ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 text-center">
                  <div className="num text-[34px] font-bold text-aurora">
                    {stats.today.count}
                  </div>
                  <div className="text-ink-faint text-[12px] mt-1">完成个数</div>
                </div>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 text-center">
                  <div className="num text-[34px] font-bold text-aurora">
                    {stats.today.minutes}
                  </div>
                  <div className="text-ink-faint text-[12px] mt-1">累计分钟</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-[104px]" />
                <Skeleton className="h-[104px]" />
              </div>
            )}
          </Card>

          <Card delay={0.18} className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-aurora-cyan" />
              <h3 className="text-[14px] font-medium">近 7 天</h3>
              <span className="text-ink-faint text-[11.5px] ml-auto">分钟/天</span>
            </div>
            {stats ? (
              <div className="flex items-end gap-2 h-36">
                {stats.week.map((d) => {
                  const isMax = d.minutes === maxWeekMin && d.minutes > 0;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 h-full flex flex-col items-center justify-end gap-1.5"
                    >
                      <span className="num text-[11px] text-ink-faint h-4">
                        {d.minutes > 0 ? d.minutes : ""}
                      </span>
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          height: `${Math.max(5, (d.minutes / maxWeekMin) * 100)}%`,
                        }}
                        className={`w-full rounded-t-lg origin-bottom ${
                          isMax
                            ? "bg-gradient-to-t from-aurora-violet to-aurora-cyan shadow-[0_0_16px_rgba(139,92,246,0.4)]"
                            : "bg-white/10"
                        }`}
                      />
                      <span className="text-[11px] text-ink-faint">
                        {weekDayOf(d.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Skeleton className="h-36" />
            )}
          </Card>
        </div>
      </div>

      {/* ---- 最近记录 ---- */}
      <Card delay={0.24} className="mt-5">
        <div className="flex items-center gap-2 mb-2">
          <Hourglass size={15} className="text-aurora-amber" />
          <h3 className="text-[14px] font-medium">最近记录</h3>
        </div>
        {!stats ? (
          <div className="space-y-2.5 mt-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : stats.recent.length === 0 ? (
          <EmptyState
            icon={<Timer size={22} />}
            text="还没有专注记录"
            hint="完成第一个番茄钟，它会出现在这里"
          />
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {stats.recent.map((r) => {
              const meta = KIND_META[r.kind] ?? KIND_META.focus;
              const Icon = meta.icon;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3.5 py-3.5"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium">
                        {meta.label}
                      </span>
                      <span className="num text-[12px] text-ink-faint">
                        {r.minutes} 分钟
                      </span>
                    </div>
                    {r.taskTitle && (
                      <div className="text-ink-faint text-[12px] mt-0.5 truncate">
                        关联：{r.taskTitle}
                      </div>
                    )}
                  </div>
                  <span className="num text-[12px] text-ink-faint shrink-0">
                    {fmtDateTime(r.completedAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox as InboxIcon,
  Trash2,
  CheckSquare,
  NotebookPen,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, EmptyState, PrimaryButton, Skeleton } from "@/components/ui";

type InboxItem = { id: string; content: string; createdAt: string };
type Toast = { key: number; msg: string };

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const t = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return `今天 ${t}`;
  const date = d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  return `${date} ${t}`;
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .get<InboxItem[]>("/api/inbox")
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ key: Date.now(), msg });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const collect = async () => {
    const v = input.trim();
    if (!v || posting) return;
    setPosting(true);
    try {
      const item = await api.post<InboxItem>("/api/inbox", { content: v });
      setItems((list) => [item, ...list]);
      setInput("");
    } catch {
      showToast("收集失败，稍后再试");
    } finally {
      setPosting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void collect();
    }
  };

  const convert = async (id: string, type: "task" | "note") => {
    if (convertingId) return;
    setConvertingId(id);
    try {
      await api.post(`/api/inbox/${id}`, { action: "convert", type });
      setItems((list) => list.filter((i) => i.id !== id));
      showToast(type === "task" ? "已转为任务，去任务页查看" : "已转为笔记，去笔记页查看");
    } catch {
      showToast("转换失败，稍后再试");
    } finally {
      setConvertingId(null);
    }
  };

  const removeItem = async (id: string) => {
    if (!window.confirm("确定删除这条收集吗？")) return;
    try {
      await api.del(`/api/inbox/${id}`);
      setItems((list) => list.filter((i) => i.id !== id));
    } catch {
      showToast("删除失败，稍后再试");
    }
  };

  return (
    <div>
      <PageHeader
        title="收集箱"
        sub="先全部倒进来，整理是稍后的事"
        actions={
          <span className="text-[12.5px] text-ink-dim whitespace-nowrap">
            共 <span className="num text-aurora font-semibold text-[15px]">{items.length}</span> 条待处理
          </span>
        }
      />

      {/* 收集输入 */}
      <div className="glass rounded-2xl p-4 sm:p-5 mb-6">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="把脑子里的一闪而过记下来，Enter 快速收集…"
            className="input-aurora flex-1 min-w-0 px-4 py-3 text-[14px] text-ink"
          />
          <PrimaryButton onClick={collect} className="shrink-0">
            {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            收集
          </PrimaryButton>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[92px]" />
          <Skeleton className="h-[92px]" />
          <Skeleton className="h-[92px]" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState
            icon={<InboxIcon size={26} />}
            text="大脑已清空，去喝杯水吧"
            hint="有想法就扔进来，晚点再慢慢整理"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 48, transition: { duration: 0.22 } }}
                transition={{ duration: 0.32, delay: Math.min(idx * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
                className="glass rounded-2xl p-4 flex items-start gap-3 card-lift"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] leading-6 text-ink whitespace-pre-wrap break-words">
                    {item.content}
                  </div>
                  <div className="text-ink-faint text-[11.5px] mt-1.5 num">{fmtTime(item.createdAt)}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => convert(item.id, "task")}
                    disabled={convertingId === item.id}
                    title="转为任务"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-ink-dim border border-white/10 hover:text-white hover:border-aurora-cyan/40 hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                  >
                    {convertingId === item.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckSquare size={15} />
                    )}
                    <span className="hidden sm:inline">转任务</span>
                  </button>
                  <button
                    onClick={() => convert(item.id, "note")}
                    disabled={convertingId === item.id}
                    title="转为笔记"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-ink-dim border border-white/10 hover:text-white hover:border-violet-400/40 hover:bg-violet-400/10 transition-colors disabled:opacity-50"
                  >
                    <NotebookPen size={15} />
                    <span className="hidden sm:inline">转笔记</span>
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    title="删除"
                    className="p-1.5 rounded-lg text-ink-faint hover:text-aurora-rose hover:bg-rose-400/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 右下角浮动提示 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 right-6 z-50 glass-deep rounded-xl px-4 py-3 text-[13px] text-ink flex items-center gap-2 shadow-2xl"
          >
            <CheckCircle2 size={16} className="text-aurora-teal shrink-0" />
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

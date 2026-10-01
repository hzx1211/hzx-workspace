"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/** 页面标题区 */
export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-7">
      <div>
        <h1 className="display text-[28px] sm:text-[34px] font-bold leading-tight">
          <span className="text-aurora">{title}</span>
        </h1>
        {sub && <p className="text-ink-dim text-[13px] mt-1.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** 玻璃卡片（带入场动画） */
export function Card({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass rounded-2xl p-5 card-lift ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** 空状态 */
export function EmptyState({ icon, text, hint }: { icon: ReactNode; text: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-ink-faint mb-4">
        {icon}
      </div>
      <div className="text-ink-dim text-[14px]">{text}</div>
      {hint && <div className="text-ink-faint text-[12px] mt-1">{hint}</div>}
    </div>
  );
}

/** 主按钮 */
export function PrimaryButton({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick}
      className={`btn-aurora text-white text-[13.5px] font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 ${className}`}>
      {children}
    </button>
  );
}

/** 幽灵按钮 */
export function GhostButton({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-[13.5px] text-ink-dim border border-white/10 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2 ${className}`}>
      {children}
    </button>
  );
}

export const PRIORITY_META: Record<string, { label: string; dot: string }> = {
  high: { label: "高", dot: "bg-aurora-rose" },
  medium: { label: "中", dot: "bg-aurora-amber" },
  low: { label: "低", dot: "bg-aurora-teal" },
};

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  todo: { label: "待办", cls: "text-ink-dim bg-white/[0.06]" },
  doing: { label: "进行中", cls: "text-aurora-cyan bg-cyan-400/10" },
  done: { label: "已完成", cls: "text-aurora-teal bg-teal-400/10" },
};

/** 加载骨架 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

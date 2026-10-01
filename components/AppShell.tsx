"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, FolderKanban, SquareKanban, Timer,
  BookOpenText, NotebookPen, Inbox, Sparkles,
} from "lucide-react";
import CommandPalette from "./CommandPalette";

const NAV = [
  { href: "/", label: "总览", icon: LayoutDashboard },
  { href: "/tasks", label: "任务", icon: CheckSquare },
  { href: "/projects", label: "项目", icon: FolderKanban },
  { href: "/boards", label: "看板", icon: SquareKanban },
  { href: "/pomodoro", label: "番茄钟", icon: Timer },
  { href: "/words", label: "背单词", icon: BookOpenText },
  { href: "/notes", label: "笔记", icon: NotebookPen },
  { href: "/inbox", label: "收集箱", icon: Inbox },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen lg:flex">
      {/* 侧边栏 */}
      <aside className="glass-deep lg:w-60 lg:shrink-0 lg:min-h-screen lg:sticky lg:top-0 z-20
        max-lg:fixed max-lg:bottom-0 max-lg:inset-x-0 max-lg:border-t max-lg:border-white/10">
        <div className="max-lg:hidden px-5 pt-7 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl btn-aurora flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <div className="display font-bold text-[17px] leading-tight">hzx的工作台</div>
              <div className="text-[11px] text-ink-faint tracking-[0.2em]">HZX SPACE</div>
            </div>
          </div>
        </div>
        <nav className="px-3 pb-3 max-lg:flex max-lg:justify-around max-lg:px-2 max-lg:py-2 max-lg:bg-[#0a1020]/90 max-lg:backdrop-blur-xl">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] mb-1 transition-all duration-200
                  max-lg:flex-col max-lg:gap-1 max-lg:px-3 max-lg:py-2 max-lg:text-[11px] max-lg:mb-0
                  ${active
                    ? "bg-white/[0.09] text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] border border-white/10"
                    : "text-ink-dim hover:text-white hover:bg-white/[0.05] border border-transparent"}`}
              >
                <Icon size={18} className={active ? "text-aurora-cyan" : ""} />
                <span className="max-lg:hidden">{label}</span>
                <span className="lg:hidden">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="max-lg:hidden px-5 mt-auto pb-6 pt-4">
          <div className="glass rounded-2xl p-4 text-[12px] text-ink-dim leading-relaxed">
            按 <kbd className="px-1.5 py-0.5 rounded-md bg-white/10 text-white text-[11px] num">⌘K</kbd> 快速搜索跳转
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 min-w-0 px-5 sm:px-8 lg:px-12 py-6 lg:py-9 max-w-6xl max-lg:pb-24">
        {children}
      </main>

      <CommandPalette />
    </div>
  );
}

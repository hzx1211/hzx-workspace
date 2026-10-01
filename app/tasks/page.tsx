"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus, Search, Pencil, Trash2, CalendarDays, Check,
  List, LayoutGrid, ArrowRight, Undo2, X, ListTodo,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  PageHeader, Card, EmptyState, PrimaryButton, GhostButton,
  Skeleton, PRIORITY_META, STATUS_META,
} from "@/components/ui";

/* ---------- 类型 ---------- */
type ProjectLite = { id: string; name: string; color: string };

type Task = {
  id: string;
  title: string;
  notes?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  projectId?: string | null;
  project: ProjectLite | null;
  createdAt: string;
  updatedAt: string;
};

type Project = {
  id: string; name: string; color: string;
  description?: string | null; createdAt: string;
  _count: { tasks: number }; openTasks: number;
};

type StatusTab = "all" | "todo" | "doing" | "done";
type ViewMode = "list" | "board";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "todo", label: "待办" },
  { key: "doing", label: "进行中" },
  { key: "done", label: "已完成" },
];

const PRIORITIES = [
  { key: "high", label: "高" },
  { key: "medium", label: "中" },
  { key: "low", label: "低" },
];

function fmtDue(due?: string | null): string {
  if (!due) return "";
  const d = new Date(due);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function toDateInput(v?: string | null): string {
  if (!v) return "";
  return v.slice(0, 10);
}

/* ---------- 任务弹窗（新建 / 编辑共用） ---------- */
function TaskModal({
  open, initial, projects, onClose, onSaved,
}: {
  open: boolean;
  initial: Task | null;
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setNotes(initial?.notes ?? "");
      setPriority(initial?.priority ?? "medium");
      setDueDate(toDateInput(initial?.dueDate));
      setProjectId(initial?.projectId ?? "");
      setSaving(false);
    }
  }, [open, initial]);

  async function save() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      projectId: projectId || undefined,
    };
    try {
      if (initial) await api.patch(`/api/tasks/${initial.id}`, payload);
      else await api.post("/api/tasks", { ...payload, status: "todo" });
      onSaved();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="glass-deep rounded-2xl p-6 w-[min(520px,94vw)] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="display text-[18px] font-bold">{initial ? "编辑任务" : "新建任务"}</h3>
              <button onClick={onClose} className="text-ink-faint hover:text-white transition-colors" aria-label="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-[12.5px] text-ink-dim mb-1.5">标题</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="要做什么？"
              className="input-aurora w-full px-3.5 py-2.5 text-[14px] text-ink mb-4"
            />

            <label className="block text-[12.5px] text-ink-dim mb-1.5">备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="补充说明（可选）"
              rows={3}
              className="input-aurora w-full px-3.5 py-2.5 text-[14px] text-ink mb-4 resize-none"
            />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[12.5px] text-ink-dim mb-1.5">优先级</label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => {
                    const pm = PRIORITY_META[p.key];
                    const active = priority === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setPriority(p.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] border transition-all ${
                          active
                            ? "border-aurora-violet/60 bg-violet-500/15 text-white"
                            : "border-white/10 text-ink-dim hover:border-white/25"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${pm.dot}`} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] text-ink-dim mb-1.5">截止日期</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-aurora w-full px-3.5 py-2.5 text-[14px] text-ink [color-scheme:dark]"
                />
              </div>
            </div>

            <label className="block text-[12.5px] text-ink-dim mb-1.5">所属项目</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input-aurora w-full px-3.5 py-2.5 text-[14px] text-ink mb-6 bg-transparent"
            >
              <option value="" className="bg-[#0a1020]">无项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0a1020]">{p.name}</option>
              ))}
            </select>

            <div className="flex justify-end gap-2.5">
              <GhostButton onClick={onClose}>取消</GhostButton>
              <PrimaryButton onClick={save}>
                {saving ? "保存中…" : initial ? "保存修改" : "创建任务"}
              </PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- 主体（读 searchParams，需 Suspense 包裹） ---------- */
function TasksInner() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [projectFilter, setProjectFilter] = useState<string>(searchParams.get("projectId") ?? "");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  useEffect(() => {
    api.get<Project[]>("/api/projects").then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusTab !== "all") params.set("status", statusTab);
    if (projectFilter) params.set("projectId", projectFilter);
    if (debouncedQ) params.set("q", debouncedQ);
    try {
      const list = await api.get<Task[]>(`/api/tasks?${params.toString()}`);
      setTasks(list);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [statusTab, projectFilter, debouncedQ]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function setStatus(t: Task, status: string) {
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, status } : x)));
    try {
      await api.patch(`/api/tasks/${t.id}`, { status });
    } catch {
      fetchTasks();
    }
  }

  async function removeTask(t: Task) {
    if (!confirm(`确定删除任务「${t.title}」吗？`)) return;
    try {
      await api.del(`/api/tasks/${t.id}`);
      fetchTasks();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(t: Task) {
    setEditing(t);
    setModalOpen(true);
  }

  const columns = useMemo(
    () => [
      { key: "todo", label: "待办", items: tasks.filter((t) => t.status === "todo") },
      { key: "doing", label: "进行中", items: tasks.filter((t) => t.status === "doing") },
      { key: "done", label: "已完成", items: tasks.filter((t) => t.status === "done") },
    ],
    [tasks],
  );

  const nextStatus: Record<string, string> = { todo: "doing", doing: "done" };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 md:pb-12 pt-6 sm:pt-8">
      <PageHeader
        title="任务"
        sub="管理你的待办、进行中与已完成事项"
        actions={
          <>
            <div className="glass rounded-xl p-1 flex gap-1">
              <button
                onClick={() => setView("list")}
                aria-label="列表视图"
                className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-white/10 text-white" : "text-ink-faint hover:text-white"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("board")}
                aria-label="看板视图"
                className={`p-2 rounded-lg transition-colors ${view === "board" ? "bg-white/10 text-white" : "text-ink-faint hover:text-white"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <PrimaryButton onClick={openCreate}>
              <Plus className="w-4 h-4" /> 新建任务
            </PrimaryButton>
          </>
        }
      />

      {/* ===== 筛选行 ===== */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="glass rounded-xl p-1 flex gap-1 overflow-x-auto shrink-0">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusTab(t.key)}
              className={`px-3.5 py-2 rounded-lg text-[13px] whitespace-nowrap transition-colors ${
                statusTab === t.key ? "bg-gradient-to-r from-aurora-violet/30 to-aurora-cyan/20 text-white" : "text-ink-dim hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="input-aurora px-3.5 py-2.5 text-[13.5px] text-ink bg-transparent shrink-0 sm:max-w-[180px]"
        >
          <option value="" className="bg-[#0a1020]">全部项目</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#0a1020]">{p.name}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索任务标题…"
            className="input-aurora w-full pl-10 pr-3.5 py-2.5 text-[13.5px] text-ink"
          />
        </div>
      </div>

      {/* ===== 内容区 ===== */}
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[60px]" />)}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListTodo className="w-6 h-6" />}
            text="没有符合条件的任务"
            hint="新建一个任务，或调整筛选条件"
          />
        </Card>
      ) : view === "list" ? (
        <Card className="!p-0 overflow-hidden">
          <ul className="divide-y divide-white/[0.06]">
            {tasks.map((t) => {
              const done = t.status === "done";
              const pm = PRIORITY_META[t.priority] ?? PRIORITY_META.medium;
              const sm = STATUS_META[t.status] ?? STATUS_META.todo;
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-white/[0.03] transition-colors group">
                  <button
                    onClick={() => setStatus(t, done ? "todo" : "done")}
                    aria-label={done ? "标为未完成" : "标为完成"}
                    className={`w-5.5 h-5.5 w-[22px] h-[22px] rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      done
                        ? "bg-gradient-to-br from-aurora-teal to-aurora-cyan border-transparent"
                        : "border-white/25 hover:border-aurora-cyan"
                    }`}
                  >
                    {done && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[14px] truncate ${done ? "line-through text-ink-faint" : "text-ink"}`}>
                      {t.title}
                    </div>
                    <div className="flex items-center gap-2.5 mt-1 text-[11.5px] text-ink-faint flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded-md ${sm.cls}`}>{sm.label}</span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${pm.dot}`} />
                        {pm.label}
                      </span>
                      {t.dueDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {fmtDue(t.dueDate)}
                        </span>
                      )}
                      {t.project && (
                        <span className="flex items-center gap-1 max-w-[130px]">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: t.project.color }} />
                          <span className="truncate">{t.project.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(t)}
                      aria-label="编辑"
                      className="p-2 rounded-lg text-ink-faint hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeTask(t)}
                      aria-label="删除"
                      className="p-2 rounded-lg text-ink-faint hover:text-aurora-rose hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {columns.map((col) => (
            <div key={col.key} className="glass rounded-2xl p-3.5">
              <div className="flex items-center justify-between px-1.5 pb-3">
                <span className="text-[13.5px] font-medium text-ink">{col.label}</span>
                <span className="num text-[12px] text-ink-faint bg-white/[0.06] px-2 py-0.5 rounded-full">
                  {col.items.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {col.items.length === 0 && (
                  <div className="text-center text-ink-faint text-[12px] py-6">暂无任务</div>
                )}
                {col.items.map((t) => {
                  const pm = PRIORITY_META[t.priority] ?? PRIORITY_META.medium;
                  const done = t.status === "done";
                  return (
                    <div
                      key={t.id}
                      className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3.5 hover:border-aurora-violet/35 transition-colors group"
                    >
                      <div className={`text-[13.5px] leading-snug ${done ? "line-through text-ink-faint" : "text-ink"}`}>
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-ink-faint flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${pm.dot}`} />
                          {pm.label}
                        </span>
                        {t.dueDate && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {fmtDue(t.dueDate)}
                          </span>
                        )}
                        {t.project && (
                          <span className="flex items-center gap-1 max-w-[110px]">
                            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: t.project.color }} />
                            <span className="truncate">{t.project.name}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06]">
                        <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(t)}
                            aria-label="编辑"
                            className="p-1.5 rounded-lg text-ink-faint hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeTask(t)}
                            aria-label="删除"
                            className="p-1.5 rounded-lg text-ink-faint hover:text-aurora-rose hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {done ? (
                          <button
                            onClick={() => setStatus(t, "doing")}
                            className="flex items-center gap-1 text-[12px] text-ink-dim hover:text-aurora-cyan transition-colors"
                          >
                            <Undo2 className="w-3.5 h-3.5" /> 退回
                          </button>
                        ) : (
                          <button
                            onClick={() => setStatus(t, nextStatus[t.status])}
                            className="flex items-center gap-1 text-[12px] text-ink-dim hover:text-aurora-teal transition-colors"
                          >
                            推进 <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        initial={editing}
        projects={projects}
        onClose={() => setModalOpen(false)}
        onSaved={fetchTasks}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 md:pb-12 pt-6 sm:pt-8 space-y-2.5">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[60px]" />)}
        </div>
      }
    >
      <TasksInner />
    </Suspense>
  );
}

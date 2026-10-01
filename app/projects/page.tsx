"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Pencil, Trash2, X, FolderKanban } from "lucide-react";
import { api } from "@/lib/api";
import {
  PageHeader, Card, EmptyState, PrimaryButton, GhostButton, Skeleton,
} from "@/components/ui";

/* ---------- 类型 ---------- */
type Project = {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  createdAt: string;
  _count: { tasks: number };
  openTasks: number;
};

const PRESET_COLORS = [
  "#8b5cf6", "#22d3ee", "#2dd4bf", "#fbbf24",
  "#fb7185", "#f472b6", "#60a5fa", "#a3e635",
];

/* ---------- 项目弹窗（新建 / 编辑共用） ---------- */
function ProjectModal({
  open, initial, onClose, onSaved,
}: {
  open: boolean;
  initial: Project | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setColor(initial?.color ?? PRESET_COLORS[0]);
      setDescription(initial?.description ?? "");
      setSaving(false);
    }
  }, [open, initial]);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    const payload = { name: name.trim(), color, description: description.trim() || undefined };
    try {
      if (initial) await api.patch(`/api/projects/${initial.id}`, payload);
      else await api.post("/api/projects", payload);
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
            className="glass-deep rounded-2xl p-6 w-[min(480px,94vw)] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="display text-[18px] font-bold">{initial ? "编辑项目" : "新建项目"}</h3>
              <button onClick={onClose} className="text-ink-faint hover:text-white transition-colors" aria-label="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-[12.5px] text-ink-dim mb-1.5">项目名称</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="给项目起个名字"
              className="input-aurora w-full px-3.5 py-2.5 text-[14px] text-ink mb-4"
            />

            <label className="block text-[12.5px] text-ink-dim mb-2">主题色</label>
            <div className="flex gap-2.5 mb-5 flex-wrap">
              {PRESET_COLORS.map((c) => {
                const active = color === c;
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`选择颜色 ${c}`}
                    className={`w-9 h-9 rounded-full transition-all ${
                      active ? "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110" : "hover:scale-105"
                    }`}
                    style={{
                      background: c,
                      boxShadow: active ? `0 0 18px ${c}66` : `0 0 10px ${c}33`,
                    }}
                  />
                );
              })}
            </div>

            <label className="block text-[12.5px] text-ink-dim mb-1.5">项目描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这个项目是做什么的？（可选）"
              rows={3}
              className="input-aurora w-full px-3.5 py-2.5 text-[14px] text-ink mb-6 resize-none"
            />

            <div className="flex justify-end gap-2.5">
              <GhostButton onClick={onClose}>取消</GhostButton>
              <PrimaryButton onClick={save}>
                {saving ? "保存中…" : initial ? "保存修改" : "创建项目"}
              </PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- 主体 ---------- */
export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const list = await api.get<Project[]>("/api/projects");
      setProjects(list);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  async function removeProject(p: Project) {
    if (!confirm(`确定删除项目「${p.name}」吗？`)) return;
    try {
      await api.del(`/api/projects/${p.id}`);
      fetchProjects();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(e: React.MouseEvent, p: Project) {
    e.stopPropagation();
    setEditing(p);
    setModalOpen(true);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 md:pb-12 pt-6 sm:pt-8">
      <PageHeader
        title="项目"
        sub="把任务按项目归类，进度一目了然"
        actions={
          <PrimaryButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> 新建项目
          </PrimaryButton>
        }
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[168px]" />)}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="w-6 h-6" />}
            text="还没有项目"
            hint="创建一个项目，把相关的任务组织起来"
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, i) => {
            const total = p._count?.tasks ?? 0;
            const done = Math.max(0, total - (p.openTasks ?? 0));
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Card
                key={p.id}
                delay={i * 0.05}
                className="!p-0 overflow-hidden cursor-pointer group"
              >
                <div onClick={() => router.push(`/tasks?projectId=${p.id}`)}>
                  {/* 顶部颜色光晕条 */}
                  <div
                    className="h-1.5 w-full"
                    style={{
                      background: `linear-gradient(90deg, ${p.color}, ${p.color}55, transparent)`,
                      boxShadow: `0 2px 16px ${p.color}44`,
                    }}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-md shrink-0"
                          style={{ background: p.color, boxShadow: `0 0 12px ${p.color}66` }}
                        />
                        <h3 className="display text-[16.5px] font-bold text-ink truncate">{p.name}</h3>
                      </div>
                      <div className="flex gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openEdit(e, p)}
                          aria-label="编辑项目"
                          className="p-1.5 rounded-lg text-ink-faint hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeProject(p);
                          }}
                          aria-label="删除项目"
                          className="p-1.5 rounded-lg text-ink-faint hover:text-aurora-rose hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[12.5px] text-ink-dim line-clamp-2 min-h-[36px] mb-4">
                      {p.description || <span className="text-ink-faint">暂无描述</span>}
                    </p>

                    {/* 进度 */}
                    <div className="flex items-center justify-between text-[11.5px] text-ink-faint mb-1.5">
                      <span>
                        <span className="num text-ink-dim font-medium">{done}</span>
                        <span className="num">/{total}</span> 已完成
                      </span>
                      <span className="num" style={{ color: p.color }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${p.color}99, ${p.color})`,
                          boxShadow: `0 0 10px ${p.color}55`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ProjectModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSaved={fetchProjects}
      />
    </div>
  );
}

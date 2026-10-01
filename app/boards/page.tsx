"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus, ArrowLeft, X, Pencil, Trash2, GripVertical,
  KanbanSquare, Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, Card, EmptyState, PrimaryButton, GhostButton, Skeleton } from "@/components/ui";

/* ---------- 类型 ---------- */
type CardT = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  columnId: string;
};
type ColumnT = { id: string; name: string; order: number; cards: CardT[] };
type Board = { id: string; name: string; color: string; columns: ColumnT[] };
type BoardLite = {
  id: string; name: string; color: string;
  columns: number; cards: number; createdAt: string;
};

const BOARD_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#ec4899"];

type DragState = { cardId: string; fromColumnId: string; fromIndex: number } | null;
type DropTarget = { columnId: string; index: number } | null;

/* ---------- 新建看板弹窗 ---------- */
function BoardModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(""); setColor(BOARD_COLORS[0]); setSaving(false); }
  }, [open ]);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const b = await api.post<Board>("/api/boards", { name: name.trim(), color });
      onSaved(b.id);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "创建失败");
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
            className="glass-deep rounded-2xl p-6 w-[min(440px,94vw)]"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="display text-[18px] font-bold">新建看板</h3>
              <button onClick={onClose} className="text-ink-faint hover:text-white transition-colors" aria-label="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-[12.5px] text-ink-dim mb-1.5">看板名称</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="比如：产品迭代、装修计划…"
              className="input-aurora w-full px-3.5 py-2.5 text-[14px] text-ink mb-4"
            />
            <label className="block text-[12.5px] text-ink-dim mb-2">主题色</label>
            <div className="flex gap-2.5 mb-6">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`选择颜色 ${c}`}
                  className={`w-9 h-9 rounded-xl transition-all ${color === c ? "ring-2 ring-white/70 scale-110" : "opacity-60 hover:opacity-100"}`}
                  style={{ background: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white mx-auto" />}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2.5">
              <GhostButton onClick={onClose}>取消</GhostButton>
              <PrimaryButton onClick={save}>{saving ? "创建中…" : "创建看板"}</PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- 卡片编辑弹窗 ---------- */
function CardModal({ open, card, columns, onClose, onSaved, onDeleted }: {
  open: boolean;
  card: CardT | null;
  columns: ColumnT[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && card) {
      setTitle(card.title);
      setDescription(card.description ?? "");
      setSaving(false);
    }
  }, [open, card]);

  async function save() {
    if (!card || !title.trim() || saving) return;
    setSaving(true);
    try {
      await api.patch(`/api/cards/${card.id}`, { title: title.trim(), description });
      onSaved();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
      setSaving(false);
    }
  }

  async function moveTo(columnId: string) {
    if (!card || columnId === card.columnId) return;
    try {
      const col = columns.find((c) => c.id === columnId);
      await api.post(`/api/cards/${card.id}/move`, { columnId, toIndex: col ? col.cards.length : 0 });
      onSaved();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "移动失败");
    }
  }

  async function remove() {
    if (!card || !confirm(`确定删除卡片「${card.title}」吗？`)) return;
    try {
      await api.del(`/api/cards/${card.id}`);
      onDeleted();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  }

  return (
    <AnimatePresence>
      {open && card && (
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
              <h3 className="display text-[18px] font-bold">编辑卡片</h3>
              <button onClick={onClose} className="text-ink-faint hover:text-white transition-colors" aria-label="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-[12.5px] text-ink-dim mb-1.5">标题</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-aurora w-full px-3.5 py-2.5 text-[14px] text-ink mb-4"
            />
            <label className="block text-[12.5px] text-ink-dim mb-1.5">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="补充说明（可选）"
              rows={4}
              className="input-aurora w-full px-3.5 py-2.5 text-[14px] text-ink mb-4 resize-none"
            />
            <label className="block text-[12.5px] text-ink-dim mb-2">移动到</label>
            <div className="flex flex-wrap gap-2 mb-6">
              {columns.map((c) => (
                <button
                  key={c.id}
                  disabled={c.id === card.columnId}
                  onClick={() => moveTo(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-[12.5px] border transition-colors ${
                    c.id === card.columnId
                      ? "border-white/10 text-ink-faint opacity-50 cursor-default"
                      : "border-white/15 text-ink-dim hover:text-white hover:border-aurora-cyan/50"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={remove}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13.5px] text-aurora-rose hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 删除卡片
              </button>
              <div className="flex gap-2.5">
                <GhostButton onClick={onClose}>取消</GhostButton>
                <PrimaryButton onClick={save}>{saving ? "保存中…" : "保存"}</PrimaryButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- 看板详情（Trello 式拖拽） ---------- */
function BoardDetail({ boardId, onBack, onRenamed }: {
  boardId: string; onBack: () => void; onRenamed: () => void;
}) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState<DragState>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [renamingCol, setRenamingCol] = useState<string | null>(null);
  const [colDraft, setColDraft] = useState("");
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [cardModal, setCardModal] = useState<CardT | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchBoard = useCallback(async () => {
    try {
      const b = await api.get<Board>(`/api/boards/${boardId}`);
      setBoard(b);
    } catch {
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    setLoading(true);
    fetchBoard();
  }, [fetchBoard]);

  /* ----- 拖拽 ----- */
  function onDragStart(e: React.DragEvent, card: CardT, colId: string, index: number) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", card.id);
    setDrag({ cardId: card.id, fromColumnId: colId, fromIndex: index });
  }

  function onDragOverCard(e: React.DragEvent, colId: string, index: number) {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ columnId: colId, index });
  }

  function onDragOverColumn(e: React.DragEvent, colId: string, count: number) {
    if (!drag) return;
    // 卡片上的事件会冒泡到列：已由卡片处理器设置目标，这里跳过
    if ((e.target as HTMLElement).closest?.("[data-card]")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ columnId: colId, index: count });
  }

  async function onDrop(e: React.DragEvent, colId: string, index: number, fromCard: boolean) {
    e.preventDefault();
    // 冒泡到列的 drop：若来自卡片则已处理，跳过
    if (!fromCard && (e.target as HTMLElement).closest?.("[data-card]")) return;
    if (!drag || !board) { setDrag(null); setDropTarget(null); return; }
    let to = index;
    if (drag.fromColumnId === colId && drag.fromIndex < index) to = index - 1;
    const d = drag;
    setDrag(null);
    setDropTarget(null);
    if (d.fromColumnId === colId && d.fromIndex === to) return; // 原地

    // 乐观更新
    setBoard((prev) => {
      if (!prev) return prev;
      const cols = prev.columns.map((c) => ({ ...c, cards: [...c.cards] }));
      const from = cols.find((c) => c.id === d.fromColumnId);
      const toCol = cols.find((c) => c.id === colId);
      if (!from || !toCol) return prev;
      const [moved] = from.cards.splice(d.fromIndex, 1);
      if (!moved) return prev;
      toCol.cards.splice(Math.min(to, toCol.cards.length), 0, { ...moved, columnId: colId });
      return { ...prev, columns: cols };
    });
    try {
      await api.post(`/api/cards/${d.cardId}/move`, { columnId: colId, toIndex: to });
    } catch {
      fetchBoard(); // 失败回滚
    }
  }

  function onDragEnd() {
    setDrag(null);
    setDropTarget(null);
  }

  /* ----- 看板操作 ----- */
  async function saveBoardName() {
    if (!board || !nameDraft.trim()) { setEditingName(false); return; }
    try {
      await api.patch(`/api/boards/${board.id}`, { name: nameDraft.trim() });
      setBoard({ ...board, name: nameDraft.trim() });
      onRenamed();
    } catch { /* ignore */ }
    setEditingName(false);
  }

  async function deleteBoard() {
    if (!board || !confirm(`确定删除看板「${board.name}」吗？所有列和卡片都会被删除。`)) return;
    try {
      await api.del(`/api/boards/${board.id}`);
      onBack();
      onRenamed();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  }

  /* ----- 列操作 ----- */
  async function addColumn() {
    if (!board || !newColName.trim()) return;
    try {
      await api.post(`/api/boards/${board.id}/columns`, { name: newColName.trim() });
      setNewColName("");
      setAddingColumn(false);
      fetchBoard();
    } catch (e) {
      alert(e instanceof Error ? e.message : "添加失败");
    }
  }

  async function saveColName(col: ColumnT) {
    setRenamingCol(null);
    if (!colDraft.trim() || colDraft.trim() === col.name) return;
    try {
      await api.patch(`/api/columns/${col.id}`, { name: colDraft.trim() });
      fetchBoard();
    } catch { /* ignore */ }
  }

  async function deleteColumn(col: ColumnT) {
    if (!confirm(`确定删除「${col.name}」吗？其中的 ${col.cards.length} 张卡片也会被删除。`)) return;
    try {
      await api.del(`/api/columns/${col.id}`);
      fetchBoard();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  }

  /* ----- 卡片操作 ----- */
  async function addCard(colId: string) {
    if (!board || !cardDraft.trim()) return;
    try {
      await api.post(`/api/boards/${board.id}/cards`, { columnId: colId, title: cardDraft.trim() });
      setCardDraft("");
      setAddingCardCol(null);
      fetchBoard();
    } catch (e) {
      alert(e instanceof Error ? e.message : "添加失败");
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="w-[300px] h-[420px] shrink-0" />)}
      </div>
    );
  }

  if (!board) {
    return (
      <Card>
        <EmptyState icon={<KanbanSquare className="w-6 h-6" />} text="看板不存在或已被删除" />
        <div className="flex justify-center -mt-8 pb-4">
          <GhostButton onClick={onBack}>返回看板列表</GhostButton>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {/* 看板头 */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={onBack}
          aria-label="返回看板列表"
          className="p-2 rounded-xl text-ink-dim hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="w-3.5 h-3.5 rounded-md shrink-0" style={{ background: board.color }} />
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveBoardName}
            onKeyDown={(e) => e.key === "Enter" && saveBoardName()}
            className="input-aurora px-3 py-1.5 text-[17px] font-bold text-ink w-[220px]"
          />
        ) : (
          <button
            onClick={() => { setNameDraft(board.name); setEditingName(true); }}
            className="display text-[20px] font-bold text-ink hover:text-aurora transition-colors flex items-center gap-2"
            title="点击重命名"
          >
            {board.name}
            <Pencil className="w-3.5 h-3.5 text-ink-faint" />
          </button>
        )}
        <span className="num text-[12px] text-ink-faint">
          {board.columns.length} 列 · {board.columns.reduce((n, c) => n + c.cards.length, 0)} 张卡片
        </span>
        <div className="flex-1" />
        <button
          onClick={deleteBoard}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] text-ink-faint hover:text-aurora-rose hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" /> 删除看板
        </button>
      </div>

      {/* 列横向滚动区 */}
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-6 items-start -mx-4 px-4 sm:mx-0 sm:px-0">
        {board.columns.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => onDragOverColumn(e, col.id, col.cards.length)}
            onDrop={(e) => onDrop(e, col.id, col.cards.length, false)}
            className={`glass rounded-2xl p-3.5 w-[300px] shrink-0 flex flex-col max-h-[68vh] transition-colors ${
              drag && dropTarget?.columnId === col.id && dropTarget.index === col.cards.length
                ? "border-aurora-cyan/50" : ""
            }`}
          >
            {/* 列头 */}
            <div className="flex items-center gap-1.5 px-1 pb-3">
              {renamingCol === col.id ? (
                <input
                  autoFocus
                  value={colDraft}
                  onChange={(e) => setColDraft(e.target.value)}
                  onBlur={() => saveColName(col)}
                  onKeyDown={(e) => e.key === "Enter" && saveColName(col)}
                  className="input-aurora flex-1 px-2 py-1 text-[13.5px] font-medium text-ink min-w-0"
                />
              ) : (
                <button
                  onClick={() => { setColDraft(col.name); setRenamingCol(col.id); }}
                  className="flex-1 min-w-0 text-left text-[13.5px] font-medium text-ink truncate hover:text-aurora transition-colors"
                  title="点击重命名"
                >
                  {col.name}
                </button>
              )}
              <span className="num text-[12px] text-ink-faint bg-white/[0.06] px-2 py-0.5 rounded-full shrink-0">
                {col.cards.length}
              </span>
              <button
                onClick={() => deleteColumn(col)}
                aria-label={`删除列 ${col.name}`}
                className="p-1.5 rounded-lg text-ink-faint hover:text-aurora-rose hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 卡片列表 */}
            <div className="space-y-2.5 overflow-y-auto pr-0.5 -mr-0.5">
              {col.cards.map((card, ci) => (
                <div key={card.id}>
                  {drag && dropTarget?.columnId === col.id && dropTarget.index === ci && (
                    <div className="h-1 rounded-full bg-gradient-to-r from-aurora-cyan to-aurora-violet mb-2.5" />
                  )}
                  <div
                    data-card="1"
                    draggable
                    onDragStart={(e) => onDragStart(e, card, col.id, ci)}
                    onDragOver={(e) => onDragOverCard(e, col.id, ci)}
                    onDrop={(e) => onDrop(e, col.id, ci, true)}
                    onDragEnd={onDragEnd}
                    onClick={() => setCardModal(card)}
                    className={`bg-white/[0.04] border border-white/[0.07] rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-aurora-violet/35 transition-all group ${
                      drag?.cardId === card.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-ink-faint shrink-0 mt-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] leading-snug text-ink">{card.title}</div>
                        {card.description && (
                          <div className="text-[12px] text-ink-faint mt-1.5 line-clamp-2 leading-relaxed">
                            {card.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {drag && dropTarget?.columnId === col.id && dropTarget.index === col.cards.length && col.cards.length > 0 && (
                <div className="h-1 rounded-full bg-gradient-to-r from-aurora-cyan to-aurora-violet" />
              )}
              {col.cards.length === 0 && !drag && (
                <div className="text-center text-ink-faint text-[12px] py-5 border border-dashed border-white/10 rounded-xl">
                  拖拽卡片到这里
                </div>
              )}
            </div>

            {/* 添加卡片 */}
            {addingCardCol === col.id ? (
              <div className="mt-2.5">
                <textarea
                  autoFocus
                  value={cardDraft}
                  onChange={(e) => setCardDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(col.id); }
                    if (e.key === "Escape") { setAddingCardCol(null); setCardDraft(""); }
                  }}
                  placeholder="卡片标题…"
                  rows={2}
                  className="input-aurora w-full px-3 py-2.5 text-[13.5px] text-ink resize-none mb-2"
                />
                <div className="flex gap-2">
                  <PrimaryButton onClick={() => addCard(col.id)} className="!px-3.5 !py-2 text-[12.5px]">
                    添加
                  </PrimaryButton>
                  <GhostButton onClick={() => { setAddingCardCol(null); setCardDraft(""); }} className="!px-3.5 !py-2 text-[12.5px]">
                    取消
                  </GhostButton>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setAddingCardCol(col.id); setCardDraft(""); }}
                className="mt-2.5 flex items-center gap-1.5 px-2 py-2 rounded-xl text-[13px] text-ink-faint hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <Plus className="w-4 h-4" /> 添加卡片
              </button>
            )}
          </div>
        ))}

        {/* 添加列 */}
        <div className="w-[300px] shrink-0">
          {addingColumn ? (
            <div className="glass rounded-2xl p-3.5">
              <input
                autoFocus
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addColumn();
                  if (e.key === "Escape") { setAddingColumn(false); setNewColName(""); }
                }}
                placeholder="列表名称…"
                className="input-aurora w-full px-3 py-2.5 text-[13.5px] text-ink mb-2"
              />
              <div className="flex gap-2">
                <PrimaryButton onClick={addColumn} className="!px-3.5 !py-2 text-[12.5px]">添加</PrimaryButton>
                <GhostButton onClick={() => { setAddingColumn(false); setNewColName(""); }} className="!px-3.5 !py-2 text-[12.5px]">
                  取消
                </GhostButton>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-[13.5px] text-ink-dim hover:text-white transition-colors border-dashed"
            >
              <Plus className="w-4 h-4" /> 添加列表
            </button>
          )}
        </div>
      </div>

      <CardModal
        open={!!cardModal}
        card={cardModal}
        columns={board.columns}
        onClose={() => setCardModal(null)}
        onSaved={fetchBoard}
        onDeleted={fetchBoard}
      />
    </div>
  );
}

/* ---------- 主体：看板列表 / 详情 ---------- */
function BoardsInner() {
  const [boards, setBoards] = useState<BoardLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      setBoards(await api.get<BoardLite[]>("/api/boards"));
    } catch {
      setBoards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 md:pb-12 pt-6 sm:pt-8">
      {activeId ? (
        <BoardDetail
          boardId={activeId}
          onBack={() => setActiveId(null)}
          onRenamed={fetchBoards}
        />
      ) : (
        <>
          <PageHeader
            title="看板"
            sub="Trello 式看板：拖拽卡片，自由管理工作流"
            actions={
              <PrimaryButton onClick={() => setModalOpen(true)}>
                <Plus className="w-4 h-4" /> 新建看板
              </PrimaryButton>
            }
          />
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[150px]" />)}
            </div>
          ) : boards.length === 0 ? (
            <Card>
              <EmptyState
                icon={<KanbanSquare className="w-6 h-6" />}
                text="还没有看板"
                hint="新建一个看板，开始拖拽管理你的工作流"
              />
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((b, i) => (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.06, 0.3) }}
                  onClick={() => setActiveId(b.id)}
                  className="glass rounded-2xl overflow-hidden text-left card-lift group"
                >
                  <div className="h-[72px] relative" style={{ background: `linear-gradient(135deg, ${b.color}55, ${b.color}22)` }}>
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{ background: `radial-gradient(120px 60px at 20% 30%, ${b.color}66, transparent)` }}
                    />
                    <div className="absolute bottom-2.5 left-4 display text-[16px] font-bold text-white">
                      {b.name}
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="num text-[12px] text-ink-faint">
                      {b.columns} 列 · {b.cards} 张卡片
                    </span>
                    <span className="text-[12px] text-ink-faint group-hover:text-aurora-cyan transition-colors">
                      打开 →
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </>
      )}
      <BoardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(id) => { fetchBoards(); setActiveId(id); }}
      />
    </div>
  );
}

export default function BoardsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 md:pb-12 pt-6 sm:pt-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[150px]" />)}
          </div>
        </div>
      }
    >
      <BoardsInner />
    </Suspense>
  );
}

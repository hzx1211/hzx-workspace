import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/cards/[id]/move —— 移动卡片（跨列或列内排序）
// body: { columnId: string, toIndex: number }
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const columnId = typeof body.columnId === "string" ? body.columnId : "";
  const toIndex = typeof body.toIndex === "number" ? Math.max(0, Math.floor(body.toIndex)) : 0;
  if (!columnId) return Response.json({ error: "缺少 columnId" }, { status: 400 });

  const card = await db.boardCard.findUnique({
    where: { id },
    include: { column: { select: { boardId: true } } },
  });
  if (!card) return Response.json({ error: "卡片不存在" }, { status: 404 });
  const target = await db.boardColumn.findFirst({
    where: { id: columnId, boardId: card.column.boardId },
  });
  if (!target) return Response.json({ error: "目标列不存在" }, { status: 400 });

  const fromColumnId = card.columnId;
  const movingSameColumn = fromColumnId === columnId;

  // 取出目标列现有卡片（按 order），去掉被移动的卡片后插入到目标位置
  const existing = await db.boardCard.findMany({
    where: { columnId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  const ids = existing.map((c) => c.id).filter((cid) => cid !== id);
  const insertAt = Math.min(toIndex, ids.length);
  ids.splice(insertAt, 0, id);

  await db.$transaction([
    ...(movingSameColumn
      ? []
      : [db.boardCard.update({ where: { id }, data: { columnId } })]),
    ...ids.map((cid, i) =>
      db.boardCard.update({ where: { id: cid }, data: { order: i } }),
    ),
  ]);

  return Response.json({ ok: true });
}

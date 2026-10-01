import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/boards/[id]/cards —— 在某列新增卡片
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const columnId = typeof body.columnId === "string" ? body.columnId : "";
  if (!title) return Response.json({ error: "卡片标题不能为空" }, { status: 400 });
  if (!columnId) return Response.json({ error: "缺少 columnId" }, { status: 400 });
  const column = await db.boardColumn.findFirst({ where: { id: columnId, boardId: id } });
  if (!column) return Response.json({ error: "列不存在" }, { status: 404 });
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const max = await db.boardCard.aggregate({
    where: { columnId },
    _max: { order: true },
  });
  const card = await db.boardCard.create({
    data: { title, description, columnId, order: (max._max.order ?? -1) + 1 },
  });
  return Response.json(card, { status: 201 });
}

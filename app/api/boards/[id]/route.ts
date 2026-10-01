import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const BOARD_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#ec4899"];

const fullBoard = (id: string) =>
  db.board.findUnique({
    where: { id },
    include: {
      columns: {
        orderBy: { order: "asc" },
        include: { cards: { orderBy: { order: "asc" } } },
      },
    },
  });

// GET /api/boards/[id] —— 看板详情（含列与卡片）
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const board = await fullBoard(id);
  if (!board) return Response.json({ error: "看板不存在" }, { status: 404 });
  return Response.json(board);
}

// PATCH /api/boards/[id] —— 改名 / 换色
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.color === "string" && BOARD_COLORS.includes(body.color)) data.color = body.color;
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "没有可更新的字段" }, { status: 400 });
  }
  try {
    const board = await db.board.update({ where: { id }, data });
    return Response.json(board);
  } catch {
    return Response.json({ error: "看板不存在" }, { status: 404 });
  }
}

// DELETE /api/boards/[id] —— 删除看板（级联删列与卡片）
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await db.board.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "看板不存在" }, { status: 404 });
  }
}

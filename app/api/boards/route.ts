import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_COLUMNS = ["待办", "进行中", "已完成"];
const BOARD_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#ec4899"];

// GET /api/boards —— 看板列表（含卡片数）
export async function GET() {
  const boards = await db.board.findMany({
    orderBy: { createdAt: "desc" },
    include: { columns: { include: { _count: { select: { cards: true } } } } },
  });
  return Response.json(
    boards.map((b) => ({
      id: b.id,
      name: b.name,
      color: b.color,
      createdAt: b.createdAt,
      columns: b.columns.length,
      cards: b.columns.reduce((n, c) => n + c._count.cards, 0),
    })),
  );
}

// POST /api/boards —— 新建看板（自动带三列）
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return Response.json({ error: "看板名称不能为空" }, { status: 400 });
  const color =
    typeof body.color === "string" && BOARD_COLORS.includes(body.color)
      ? body.color
      : "#8b5cf6";
  const board = await db.board.create({
    data: {
      name,
      color,
      columns: { create: DEFAULT_COLUMNS.map((n, i) => ({ name: n, order: i })) },
    },
    include: { columns: { orderBy: { order: "asc" } } },
  });
  return Response.json(board, { status: 201 });
}

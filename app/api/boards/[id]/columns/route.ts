import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/boards/[id]/columns —— 新增一列
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return Response.json({ error: "列名不能为空" }, { status: 400 });
  try {
    const max = await db.boardColumn.aggregate({
      where: { boardId: id },
      _max: { order: true },
    });
    const column = await db.boardColumn.create({
      data: { name, boardId: id, order: (max._max.order ?? -1) + 1 },
    });
    return Response.json(column, { status: 201 });
  } catch {
    return Response.json({ error: "看板不存在" }, { status: 404 });
  }
}

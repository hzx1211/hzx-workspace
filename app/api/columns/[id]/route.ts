import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/columns/[id] —— 重命名列
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return Response.json({ error: "列名不能为空" }, { status: 400 });
  try {
    const column = await db.boardColumn.update({ where: { id }, data: { name } });
    return Response.json(column);
  } catch {
    return Response.json({ error: "列不存在" }, { status: 404 });
  }
}

// DELETE /api/columns/[id] —— 删除列（级联删卡片）
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await db.boardColumn.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "列不存在" }, { status: 404 });
  }
}

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/cards/[id] —— 编辑卡片标题 / 描述
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (body.description !== undefined) {
    data.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "没有可更新的字段" }, { status: 400 });
  }
  try {
    const card = await db.boardCard.update({ where: { id }, data });
    return Response.json(card);
  } catch {
    return Response.json({ error: "卡片不存在" }, { status: 404 });
  }
}

// DELETE /api/cards/[id] —— 删除卡片
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await db.boardCard.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "卡片不存在" }, { status: 404 });
  }
}

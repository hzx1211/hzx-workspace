import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/notes/[id] —— 笔记全文
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const note = await db.note.findUnique({ where: { id } });
  if (!note) {
    return Response.json({ error: "笔记不存在" }, { status: 404 });
  }
  return Response.json(note);
}

// PATCH /api/notes/[id] —— 部分更新笔记
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: { title?: string; content?: string } = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.content === "string") data.content = body.content;
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "没有可更新的字段" }, { status: 400 });
  }
  try {
    const note = await db.note.update({ where: { id }, data });
    return Response.json(note);
  } catch {
    return Response.json({ error: "笔记不存在" }, { status: 404 });
  }
}

// DELETE /api/notes/[id] —— 删除笔记
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await db.note.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "笔记不存在" }, { status: 404 });
  }
}

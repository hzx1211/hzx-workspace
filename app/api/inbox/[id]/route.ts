import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/inbox/[id] —— 删除速记
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await db.inboxItem.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "速记不存在" }, { status: 404 });
  }
}

// POST /api/inbox/[id] —— 转换速记为任务或笔记
// body: { action: "convert", type: "task" | "note" }
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.action !== "convert") {
    return Response.json({ error: "未知操作" }, { status: 400 });
  }
  const item = await db.inboxItem.findUnique({ where: { id } });
  if (!item) {
    return Response.json({ error: "速记不存在" }, { status: 404 });
  }

  let created: unknown;
  if (body.type === "task") {
    created = await db.task.create({ data: { title: item.content } });
  } else if (body.type === "note") {
    const firstLine = item.content.split("\n")[0].trim().slice(0, 20);
    created = await db.note.create({
      data: { title: firstLine || "未命名笔记", content: item.content },
    });
  } else {
    return Response.json({ error: 'type 必须为 "task" 或 "note"' }, { status: 400 });
  }

  await db.inboxItem.delete({ where: { id } });
  return Response.json(created);
}

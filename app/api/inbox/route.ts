import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/inbox —— 速记列表（倒序）
export async function GET() {
  const items = await db.inboxItem.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(items);
}

// POST /api/inbox —— 新增速记
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { content?: unknown } | null;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return Response.json({ error: "内容不能为空" }, { status: 400 });
  }
  const item = await db.inboxItem.create({ data: { content } });
  return Response.json(item, { status: 201 });
}

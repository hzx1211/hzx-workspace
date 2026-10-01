import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/notes —— 笔记列表（标题 + 前 80 字摘要）
export async function GET() {
  const notes = await db.note.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, content: true, updatedAt: true },
  });
  return Response.json(
    notes.map((n: { id: string; title: string; content: string; updatedAt: Date }) => ({
      id: n.id,
      title: n.title,
      excerpt: n.content.slice(0, 80),
      updatedAt: n.updatedAt,
    }))
  );
}

// POST /api/notes —— 新建笔记
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    content?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return Response.json({ error: "笔记标题不能为空" }, { status: 400 });
  }
  const note = await db.note.create({
    data: {
      title,
      content: typeof body?.content === "string" ? body.content : "",
    },
  });
  return Response.json(note, { status: 201 });
}

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type ResultKind = "task" | "note" | "word" | "project";
type Result = { id: string; title: string; subtitle?: string; href: string; kind: ResultKind };

// GET /api/search?q= —— 全局搜索（任务 / 笔记 / 单词 / 项目，各最多 5 条）
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return Response.json({ results: [] });
  }

  const [tasks, notes, words, projects] = await Promise.all([
    db.task.findMany({
      where: { title: { contains: q } },
      take: 5,
      select: { id: true, title: true },
    }),
    db.note.findMany({
      where: { OR: [{ title: { contains: q } }, { content: { contains: q } }] },
      take: 5,
      select: { id: true, title: true, content: true },
    }),
    db.word.findMany({
      where: { word: { startsWith: q } },
      take: 5,
      select: { id: true, word: true, definition: true },
    }),
    db.project.findMany({
      where: { name: { contains: q } },
      take: 5,
      select: { id: true, name: true, description: true },
    }),
  ]);

  const results: Result[] = [
    ...tasks.map((t: { id: string; title: string }) => ({
      id: t.id,
      title: t.title,
      href: "/tasks",
      kind: "task" as ResultKind,
    })),
    ...notes.map((n: { id: string; title: string; content: string }) => ({
      id: n.id,
      title: n.title,
      subtitle: n.content.slice(0, 40),
      href: "/notes",
      kind: "note" as ResultKind,
    })),
    ...words.map((w: { id: string; word: string; definition: string }) => ({
      id: w.id,
      title: w.word,
      subtitle: w.definition,
      href: "/words",
      kind: "word" as ResultKind,
    })),
    ...projects.map((p: { id: string; name: string; description: string | null }) => ({
      id: p.id,
      title: p.name,
      ...(p.description ? { subtitle: p.description } : {}),
      href: "/projects",
      kind: "project" as ResultKind,
    })),
  ];

  return Response.json({ results });
}

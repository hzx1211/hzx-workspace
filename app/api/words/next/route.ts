import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const wordSelect = { id: true, word: true, level: true, definition: true } as const;

// GET /api/words/next?level=CET4|CET6|ALL —— 取下一个要复习的单词
// 优先取 nextReview 已到期的（按 nextReview 升序）；没有则随机取一个无学习记录的单词
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const levelParam = searchParams.get("level");
  const level = levelParam === "CET4" || levelParam === "CET6" ? levelParam : undefined;
  const now = new Date();

  const due = await db.wordProgress.findFirst({
    where: {
      nextReview: { lte: now },
      ...(level ? { word: { level } } : {}),
    },
    orderBy: { nextReview: "asc" },
    include: { word: { select: wordSelect } },
  });
  if (due) {
    return Response.json({ word: due.word });
  }

  const where: Record<string, unknown> = { progress: null };
  if (level) where.level = level;
  const total = await db.word.count({ where });
  if (total === 0) {
    return Response.json({ word: null });
  }
  const skip = Math.floor(Math.random() * total);
  const fresh = await db.word.findFirst({ where, skip, select: wordSelect });
  return Response.json({ word: fresh });
}

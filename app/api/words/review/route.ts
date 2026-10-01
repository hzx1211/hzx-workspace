import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

// POST /api/words/review —— 提交一次单词复习结果
// body: { wordId, result: 0 不认识 | 1 模糊 | 2 认识 }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    wordId?: unknown;
    result?: unknown;
  } | null;
  const wordId = typeof body?.wordId === "string" ? body.wordId : "";
  const result = body?.result;
  if (!wordId) {
    return Response.json({ error: "wordId 不能为空" }, { status: 400 });
  }
  if (result !== 0 && result !== 1 && result !== 2) {
    return Response.json({ error: "result 必须为 0、1 或 2" }, { status: 400 });
  }

  const word = await db.word.findUnique({ where: { id: wordId }, select: { id: true } });
  if (!word) {
    return Response.json({ error: "单词不存在" }, { status: 404 });
  }

  const existing = await db.wordProgress.findUnique({ where: { wordId } });
  const reviews = (existing?.reviews ?? 0) + 1;

  const now = new Date();
  let nextReview: Date;
  if (result === 2) {
    const days = INTERVALS_DAYS[Math.min(reviews, 5)];
    nextReview = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  } else if (result === 1) {
    nextReview = new Date(now.getTime() + 10 * 60 * 1000); // 10 分钟后
  } else {
    nextReview = new Date(now.getTime() + 5 * 60 * 1000); // 5 分钟后
  }

  const progress = await db.wordProgress.upsert({
    where: { wordId },
    create: { wordId, familiarity: result, reviews, nextReview },
    update: { familiarity: result, reviews, nextReview },
  });
  return Response.json(progress);
}

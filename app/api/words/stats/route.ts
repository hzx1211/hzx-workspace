import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const pad2 = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const mmdd = (d: Date) => `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// GET /api/words/stats —— 单词学习统计
export async function GET() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [total, known, learning, fresh, todayReviews, progresses] = await Promise.all([
    db.word.count(),
    db.wordProgress.count({ where: { familiarity: 2 } }),
    db.wordProgress.count({ where: { familiarity: 1 } }),
    db.word.count({ where: { progress: null } }),
    db.wordProgress.count({ where: { updatedAt: { gte: start } } }),
    db.wordProgress.findMany({ select: { updatedAt: true } }),
  ]);

  // 连续复习天数：从今天（或昨天）起往前数
  const daySet = new Set(progresses.map((p: { updatedAt: Date }) => dayKey(p.updatedAt)));
  let streakDays = 0;
  const cursor = new Date(start);
  if (!daySet.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(dayKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // 近 7 天每天复习数
  const week: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    week.push({
      date: mmdd(d),
      count: progresses.filter((p: { updatedAt: Date }) => dayKey(p.updatedAt) === key).length,
    });
  }

  return Response.json({ total, known, learning, fresh, todayReviews, streakDays, week });
}

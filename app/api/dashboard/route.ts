import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const pad2 = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// GET /api/dashboard —— 首页聚合数据
export async function GET() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [
    todayTasks,
    todo,
    doing,
    done,
    doneToday,
    focusToday,
    progresses,
    learningCount,
    todayReviews,
    recentNotes,
    inboxCount,
  ] = await Promise.all([
    db.task.findMany({
      where: { status: { not: "done" }, dueDate: { lte: end } },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 8,
    }),
    db.task.count({ where: { status: "todo" } }),
    db.task.count({ where: { status: "doing" } }),
    db.task.count({ where: { status: "done" } }),
    db.task.count({ where: { status: "done", updatedAt: { gte: start } } }),
    db.pomodoroSession.findMany({
      where: { kind: "focus", completedAt: { gte: start } },
      select: { minutes: true },
    }),
    db.wordProgress.findMany({ select: { updatedAt: true } }),
    db.wordProgress.count({ where: { familiarity: 1 } }),
    db.wordProgress.count({ where: { updatedAt: { gte: start } } }),
    db.note.findMany({
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { id: true, title: true, content: true, updatedAt: true },
    }),
    db.inboxItem.count(),
  ]);

  // 单词连续复习天数：从今天（或昨天）起往前数
  const daySet = new Set(progresses.map((p: { updatedAt: Date }) => dayKey(p.updatedAt)));
  let streakDays = 0;
  const cursor = new Date(start);
  if (!daySet.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(dayKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return Response.json({
    todayTasks,
    stats: { todo, doing, done, doneToday },
    pomodoro: {
      todayCount: focusToday.length,
      todayMinutes: focusToday.reduce((sum: number, s: { minutes: number }) => sum + s.minutes, 0),
    },
    words: { todayReviews, streakDays, learning: learningCount },
    recentNotes: recentNotes.map(
      (n: { id: string; title: string; content: string; updatedAt: Date }) => ({
        id: n.id,
        title: n.title,
        excerpt: n.content.slice(0, 80),
        updatedAt: n.updatedAt,
      })
    ),
    inboxCount,
  });
}

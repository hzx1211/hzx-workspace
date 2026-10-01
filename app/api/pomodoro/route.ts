import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const KINDS = ["focus", "short-break", "long-break"];

const pad2 = (n: number) => String(n).padStart(2, "0");
const mmdd = (d: Date) => `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// GET /api/pomodoro?days=7 —— 番茄钟统计
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.max(1, parseInt(searchParams.get("days") || "7", 10) || 7);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfRange = new Date(startOfToday);
  startOfRange.setDate(startOfRange.getDate() - (days - 1));

  const sessions = (await db.pomodoroSession.findMany({
    where: { completedAt: { gte: startOfRange } },
    include: { task: { select: { title: true } } },
    orderBy: { completedAt: "desc" },
  })) as {
    id: string;
    kind: string;
    minutes: number;
    completedAt: Date;
    task: { title: string } | null;
  }[];

  const focus = sessions.filter((s) => s.kind === "focus");
  const todayFocus = focus.filter((s) => s.completedAt >= startOfToday);
  const today = {
    count: todayFocus.length,
    minutes: todayFocus.reduce((sum, s) => sum + s.minutes, 0),
  };

  const week: { date: string; count: number; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const dayEnd = new Date(d);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayFocus = focus.filter((s) => s.completedAt >= d && s.completedAt < dayEnd);
    week.push({
      date: mmdd(d),
      count: dayFocus.length,
      minutes: dayFocus.reduce((sum, s) => sum + s.minutes, 0),
    });
  }

  const recent = sessions.slice(0, 10).map((s) => ({
    id: s.id,
    kind: s.kind,
    minutes: s.minutes,
    completedAt: s.completedAt,
    taskTitle: s.task?.title,
  }));

  return Response.json({ today, week, recent });
}

// POST /api/pomodoro —— 记录一次番茄钟
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    taskId?: unknown;
    kind?: unknown;
    minutes?: unknown;
  } | null;
  const kind = typeof body?.kind === "string" && KINDS.includes(body.kind) ? body.kind : "focus";
  const minutes =
    typeof body?.minutes === "number" && body.minutes > 0 ? Math.round(body.minutes) : 25;
  const taskId = typeof body?.taskId === "string" && body.taskId ? body.taskId : undefined;

  try {
    const session = await db.pomodoroSession.create({
      data: { taskId, kind, minutes },
      include: { task: { select: { title: true } } },
    });
    return Response.json(session, { status: 201 });
  } catch {
    return Response.json({ error: "关联的任务不存在" }, { status: 400 });
  }
}

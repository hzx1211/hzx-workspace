import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const projectSelect = { id: true, name: true, color: true } as const;
const STATUSES = ["todo", "doing", "done"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;

// GET /api/tasks?status=&projectId=&q= —— 任务列表
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");
  const q = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (status && (STATUSES as readonly string[]).includes(status)) where.status = status;
  if (projectId) where.projectId = projectId;
  if (q) where.title = { contains: q };

  const tasks = await db.task.findMany({
    where,
    include: { project: { select: projectSelect } },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(tasks);
}

// POST /api/tasks —— 新建任务
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return Response.json({ error: "任务标题不能为空" }, { status: 400 });
  }
  const { status, priority, dueDate, projectId, notes } = body ?? {};
  if (status !== undefined && !(STATUSES as readonly unknown[]).includes(status)) {
    return Response.json({ error: "status 非法" }, { status: 400 });
  }
  if (priority !== undefined && !(PRIORITIES as readonly unknown[]).includes(priority)) {
    return Response.json({ error: "priority 非法" }, { status: 400 });
  }
  let parsedDue: Date | undefined;
  if (dueDate) {
    parsedDue = new Date(dueDate as string);
    if (isNaN(parsedDue.getTime())) {
      return Response.json({ error: "dueDate 非法" }, { status: 400 });
    }
  }
  try {
    const task = await db.task.create({
      data: {
        title,
        notes: typeof notes === "string" ? notes : undefined,
        status: (status as string | undefined) ?? undefined,
        priority: (priority as string | undefined) ?? undefined,
        dueDate: parsedDue,
        projectId: typeof projectId === "string" && projectId ? projectId : undefined,
      },
      include: { project: { select: projectSelect } },
    });
    return Response.json(task, { status: 201 });
  } catch {
    return Response.json({ error: "项目不存在" }, { status: 400 });
  }
}

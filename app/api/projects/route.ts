import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/projects —— 项目列表，每个带 _count.tasks 和 openTasks（未完成任务数）
export async function GET() {
  const projects = (await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tasks: true } },
      tasks: { where: { status: { not: "done" } }, select: { id: true } },
    },
  })) as {
    id: string;
    name: string;
    color: string;
    description: string | null;
    createdAt: Date;
    _count: { tasks: number };
    tasks: { id: string }[];
  }[];
  return Response.json(
    projects.map(({ tasks, ...rest }) => ({ ...rest, openTasks: tasks.length }))
  );
}

// POST /api/projects —— 新建项目
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    color?: unknown;
    description?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "项目名称不能为空" }, { status: 400 });
  }
  const project = await db.project.create({
    data: {
      name,
      ...(typeof body?.color === "string" && body.color ? { color: body.color } : {}),
      ...(typeof body?.description === "string" && body.description
        ? { description: body.description }
        : {}),
    },
  });
  return Response.json(project, { status: 201 });
}

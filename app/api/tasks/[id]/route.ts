import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const projectSelect = { id: true, name: true, color: true } as const;
const STATUSES = ["todo", "doing", "done"];
const PRIORITIES = ["high", "medium", "low"];

// PATCH /api/tasks/[id] —— 部分更新任务
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (body.notes !== undefined) {
    data.notes = typeof body.notes === "string" ? body.notes : null;
  }
  if (typeof body.status === "string" && STATUSES.includes(body.status)) {
    data.status = body.status;
  }
  if (typeof body.priority === "string" && PRIORITIES.includes(body.priority)) {
    data.priority = body.priority;
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate) {
      const d = new Date(body.dueDate as string);
      if (isNaN(d.getTime())) {
        return Response.json({ error: "dueDate 非法" }, { status: 400 });
      }
      data.dueDate = d;
    } else {
      data.dueDate = null;
    }
  }
  if (body.projectId !== undefined) {
    data.projectId = typeof body.projectId === "string" && body.projectId ? body.projectId : null;
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "没有可更新的字段" }, { status: 400 });
  }
  try {
    const task = await db.task.update({
      where: { id },
      data,
      include: { project: { select: projectSelect } },
    });
    return Response.json(task);
  } catch {
    return Response.json({ error: "任务不存在" }, { status: 404 });
  }
}

// DELETE /api/tasks/[id] —— 删除任务
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await db.task.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "任务不存在" }, { status: 404 });
  }
}

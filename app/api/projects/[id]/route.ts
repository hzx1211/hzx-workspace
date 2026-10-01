import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/projects/[id] —— 部分更新项目
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: { name?: string; color?: string; description?: string | null } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.color === "string") data.color = body.color;
  if (body.description !== undefined) {
    data.description =
      typeof body.description === "string" && body.description ? body.description : null;
  }
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "没有可更新的字段" }, { status: 400 });
  }
  try {
    const project = await db.project.update({ where: { id }, data });
    return Response.json(project);
  } catch {
    return Response.json({ error: "项目不存在" }, { status: 404 });
  }
}

// DELETE /api/projects/[id] —— 删除项目（任务的 projectId 置空）
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await db.project.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "项目不存在" }, { status: 404 });
  }
}

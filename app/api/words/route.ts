import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/words?level=&q=&familiarity=(0|1|2|new)&take= —— 单词列表
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const q = searchParams.get("q");
  const familiarity = searchParams.get("familiarity");
  const take = Math.min(500, Math.max(1, parseInt(searchParams.get("take") || "50", 10) || 50));

  const where: Record<string, unknown> = {};
  if (level === "CET4" || level === "CET6") where.level = level;
  if (q) where.word = { contains: q };
  if (familiarity === "new") {
    where.progress = null;
  } else if (familiarity === "0" || familiarity === "1" || familiarity === "2") {
    where.progress = { familiarity: parseInt(familiarity, 10) };
  } else if (familiarity) {
    return Response.json({ error: "familiarity 非法" }, { status: 400 });
  }

  const words = await db.word.findMany({
    where,
    take,
    orderBy: { word: "asc" },
    include: { progress: { select: { familiarity: true, reviews: true } } },
  });
  return Response.json(words);
}

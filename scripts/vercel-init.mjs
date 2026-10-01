/**
 * Vercel 构建时幂等初始化：
 * 1. `prisma db push`（在 build 命令中先执行）负责建表；
 * 2. 本脚本只在 Word 表为空时灌入四六级词库（避免覆盖用户的背单词进度）。
 *
 * 本地开发不需要跑它（用 npx prisma db seed）。
 */
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

try {
  const count = await prisma.word.count();
  if (count > 0) {
    console.log(`[init] 词库已有 ${count} 条，跳过灌入`);
  } else {
    console.log("[init] 词库为空，开始灌入…");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  }
} catch (e) {
  console.error("[init] 初始化失败：", e.message ?? e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

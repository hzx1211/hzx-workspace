/**
 * 词库种子脚本：把四六级 JSON 词库导入 Word 表
 * 运行：npx prisma db seed
 * 数据来源：KyleBing/english-vocabulary（MIT）
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { get } from "https";

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

// 上游词库（KyleBing/english-vocabulary，MIT）；本地缺失时自动下载
const SOURCES: Record<string, string> = {
  "cet4.json":
    "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/3-CET4-%E9%A1%BA%E5%BA%8F.json",
  "cet6.json":
    "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/4-CET6-%E9%A1%BA%E5%BA%8F.json",
};

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`下载词库失败：HTTP ${res.statusCode}`));
      }
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function ensureFile(file: string) {
  const dir = join(here, "seed-data");
  const path = join(dir, file);
  if (existsSync(path)) return path;
  console.log(`[seed] 本地没有 ${file}，从上游下载…`);
  mkdirSync(dir, { recursive: true });
  const text = await fetchText(SOURCES[file]);
  writeFileSync(path, text);
  console.log(`[seed] 已保存 ${file}（${(text.length / 1024 / 1024).toFixed(1)}MB）`);
  return path;
}

type RawWord = {
  word: string;
  translations?: { translation: string; type?: string }[];
};

async function load(level: "CET4" | "CET6", file: string) {
  const path = await ensureFile(file);
  const raw = JSON.parse(readFileSync(path, "utf-8")) as RawWord[];
  return raw
    .filter((w) => w.word && w.translations?.length)
    .map((w) => ({
      word: w.word.trim().toLowerCase(),
      level,
      definition: (w.translations ?? [])
        .map((t) => `${t.type ? t.type + " " : ""}${t.translation}`)
        .join("；"),
    }));
}

async function main() {
  const rawWords = [
    ...(await load("CET4", "cet4.json")),
    ...(await load("CET6", "cet6.json")),
  ];
  // 单词全局唯一（Word.word @unique）；同一词在四六级都出现时保留第一条（CET4 优先）
  const seen = new Set<string>();
  const words = rawWords.filter((w) => {
    if (seen.has(w.word)) return false;
    seen.add(w.word);
    return true;
  });
  console.log(`[seed] 原始 ${rawWords.length} 条，去重后 ${words.length} 个单词，开始导入…`);
  await prisma.word.deleteMany();

  const BATCH = 500;
  let done = 0;
  for (let i = 0; i < words.length; i += BATCH) {
    const batch = words.slice(i, i + BATCH);
    await prisma.word.createMany({ data: batch });
    done += batch.length;
    if (done % 2000 < BATCH) console.log(`[seed] 已导入 ${done}/${words.length}`);
  }
  console.log(`[seed] 完成，共 ${words.length} 个单词`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

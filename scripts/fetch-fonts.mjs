/**
 * 安装时拉取自托管字体（Noto Sans SC / Noto Serif SC）
 * 来源：fontsource CDN（jsDelivr），版本 pinned，保证可复现。
 * 已存在且大小正常的文件会跳过；CI / Vercel 构建时自动执行（postinstall）。
 */
import { existsSync, mkdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { get } from "https";

const here = dirname(fileURLToPath(import.meta.url));
const DEST = join(here, "..", "app", "fonts");
const VERSION = "5.1.0";

const FILES = [];
for (const [fam, weights] of [
  ["noto-sans-sc", [400, 500, 700]],
  ["noto-serif-sc", [600, 700, 900]],
]) {
  for (const wt of weights) {
    for (const subset of ["chinese-simplified", "latin"]) {
      FILES.push(`${fam}-${subset}-${wt}-normal.woff2`);
    }
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      get(url, { timeout: 60000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location, { timeout: 60000 }, handle).on("error", retry);
          return;
        }
        handle(res);
        function handle(r) {
          if (r.statusCode !== 200) {
            r.resume();
            return retry(new Error(`HTTP ${r.statusCode}`));
          }
          const chunks = [];
          r.on("data", (c) => chunks.push(c));
          r.on("end", () => resolve(Buffer.concat(chunks)));
          r.on("error", retry);
        }
        function retry(err) {
          if (n <= 1) reject(err);
          else setTimeout(() => attempt(n - 1), 2000);
        }
      }).on("error", (e) =>
        n <= 1 ? reject(e) : setTimeout(() => attempt(n - 1), 2000)
      );
    };
    attempt(3);
  });
}

async function main() {
  mkdirSync(DEST, { recursive: true });
  const { writeFileSync } = await import("fs");
  let fetched = 0;
  for (const f of FILES) {
    const fam = f.split("-").slice(0, 3).join("-");
    const dest = join(DEST, f);
    if (existsSync(dest) && statSync(dest).size > 10000) continue;
    const url = `https://cdn.jsdelivr.net/npm/@fontsource/${fam}@${VERSION}/files/${f}`;
    process.stdout.write(`[fonts] 下载 ${f} … `);
    const buf = await download(url, dest);
    writeFileSync(dest, buf);
    fetched++;
    console.log(`${(buf.length / 1024).toFixed(0)}KB`);
  }
  console.log(`[fonts] 完成，${fetched} 个新文件，目录共 ${FILES.length} 个字体文件。`);
}

main().catch((e) => {
  console.error("[fonts] 字体下载失败，构建需要这些字体文件：", e.message);
  process.exit(1);
});

/** 演示数据：项目 / 任务 / 笔记 / 收集箱 / 番茄记录（单词已由 seed.ts 导入） */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const now = new Date();
const day = 24 * 3600 * 1000;
const at = (h: number, m = 0, offsetDays = 0) => {
  const d = new Date(now.getTime() + offsetDays * day);
  d.setHours(h, m, 0, 0);
  return d;
};

async function main() {
  // 清理旧演示数据（保留单词）
  await prisma.pomodoroSession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.note.deleteMany();
  await prisma.inboxItem.deleteMany();

  const p1 = await prisma.project.create({
    data: { name: "hzx的工作台", color: "#8b5cf6", description: "把这个工作台本身打磨到能上线" },
  });
  const p2 = await prisma.project.create({
    data: { name: "英语六级", color: "#14b8a6", description: "12 月六级考试，一天 40 词" },
  });
  const p3 = await prisma.project.create({
    data: { name: "求职", color: "#f43f5e", description: "珠三角计算机岗，银十投递" },
  });

  const tasks = [
    { title: "把工作台部署到 Vercel", projectId: p1.id, priority: "high", status: "doing", dueDate: at(18, 0, 1) },
    { title: "给番茄钟加上白噪音", projectId: p1.id, priority: "medium", status: "todo", dueDate: at(18, 0, 3) },
    { title: "背 40 个六级单词", projectId: p2.id, priority: "high", status: "todo", dueDate: at(22, 0, 0) },
    { title: "整理错词本", projectId: p2.id, priority: "low", status: "todo" },
    { title: "改一版简历", projectId: p3.id, priority: "high", status: "todo", dueDate: at(20, 0, 2) },
    { title: "看两个目标公司的 JD", projectId: p3.id, priority: "medium", status: "todo" },
    { title: "买一杯生椰拿铁", priority: "low", status: "done", dueDate: at(15, 0, 0) },
  ];
  for (const t of tasks) await prisma.task.create({ data: t as never });

  await prisma.note.create({
    data: {
      title: "工作台设计备忘",
      content: "主题叫「深海极光」：深蓝黑底 + 紫青薄荷极光 + 玻璃拟态。\n\n核心原则：\n- 所有模块围绕「今天我要完成什么」联动\n- 手机端优先，底部导航\n- 克制动效，少即是多\n\n下一步：白噪音、习惯打卡、GitHub 热力图式的单词统计。",
    },
  });
  await prisma.note.create({
    data: {
      title: "六级高频词根",
      content: "spect- 看：inspect / expect / spectacle\nport- 搬运：transport / import / portable\n词根比死记硬背快三倍，配合番茄钟每天 2 组。",
    },
  });

  await prisma.inboxItem.create({ data: { content: "问问迪迦 Vercel 部署的进度" } });
  await prisma.inboxItem.create({ data: { content: "浴室的灯好像坏了，找房东" } });
  await prisma.inboxItem.create({ data: { content: "灵感：给工作台加一个「灵感胶囊」随机回顾功能" } });

  // 近 7 天番茄记录（今天 2 个，之前每天 1-3 个）
  const sessions: { offset: number; minutes: number; kind: string }[] = [];
  for (let d = 6; d >= 1; d--) {
    const n = 1 + ((d * 7) % 3);
    for (let i = 0; i < n; i++) sessions.push({ offset: -d, minutes: 25, kind: "focus" });
  }
  sessions.push({ offset: 0, minutes: 25, kind: "focus" }, { offset: 0, minutes: 25, kind: "focus" });
  for (const s of sessions) {
    await prisma.pomodoroSession.create({
      data: { kind: s.kind, minutes: s.minutes, completedAt: new Date(now.getTime() + s.offset * day) },
    });
  }

  console.log("[demo] 演示数据写入完成");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

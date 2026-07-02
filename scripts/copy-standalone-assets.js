/**
 * Next.js standalone 输出不自带 public/ 和 prisma/ 目录，
 * 此脚本在构建后复制这些必要文件。
 */
const fs = require("fs");
const path = require("path");

const standaloneDir = path.join(__dirname, "..", ".next", "standalone");

// 复制 .next/static/（CSS/JS 浏览器加载必需）
const staticSrc = path.join(__dirname, "..", ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
if (fs.existsSync(staticSrc)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true });
    console.log("[copy-assets] .next/static/ -> .next/standalone/.next/static/");
}

// 复制 public/（模型文件、图片等）
const publicSrc = path.join(__dirname, "..", "public");
const publicDest = path.join(standaloneDir, "public");
if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log("[copy-assets] public/ → .next/standalone/public/");
}

// 复制 prisma schema
const prismaSrc = path.join(__dirname, "..", "prisma");
const prismaDest = path.join(standaloneDir, "prisma");
if (fs.existsSync(prismaSrc)) {
    fs.cpSync(prismaSrc, prismaDest, { recursive: true });
    console.log("[copy-assets] prisma/ → .next/standalone/prisma/");
}

// 复制生成的 Prisma client
const generatedSrc = path.join(__dirname, "..", "src", "generated");
const generatedDest = path.join(standaloneDir, "src", "generated");
if (fs.existsSync(generatedSrc)) {
    fs.cpSync(generatedSrc, generatedDest, { recursive: true });
    console.log(
        "[copy-assets] src/generated/ → .next/standalone/src/generated/"
    );
}

// 复制 prisma.config.ts
const prismaConfigSrc = path.join(__dirname, "..", "prisma.config.ts");
const prismaConfigDest = path.join(standaloneDir, "prisma.config.ts");
if (fs.existsSync(prismaConfigSrc)) {
    fs.copyFileSync(prismaConfigSrc, prismaConfigDest);
    console.log("[copy-assets] prisma.config.ts → .next/standalone/");
}

// 创建数据目录（SQLite 数据库存放位置）
const dataDir = path.join(standaloneDir, "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("[copy-assets] 创建 data/ 目录");
}

console.log("[copy-assets] 完成");

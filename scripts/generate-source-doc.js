/**
 * 软著源代码文档生成器
 * 将 src 目录下所有 .ts/.tsx/.css 文件整理为符合软著格式的文档
 * 每页 50 行，A4 纸规格
 */
const fs = require("fs");
const path = require("path");

const LINES_PER_PAGE = 50;
const SOFTWARE_NAME = "奶牛行为智能检测系统";
const VERSION = "V1.0";

// 收集所有源文件
function collectFiles(dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    // 按名称排序保证顺序一致
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectFiles(fullPath));
        } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
            results.push(fullPath);
        }
    }
    return results;
}

// 读取文件内容，统一缩进为 4 空格，去除行尾空白
function readFileNormalized(filePath) {
    const raw = fs.readFileSync(filePath, "utf-8");
    return raw
        .split("\n")
        .map((line) => line.replace(/\t/g, "    ").trimEnd())
        .join("\n");
}

// 主流程
function main() {
    const srcDir = path.join(__dirname, "..", "src");
    const files = collectFiles(srcDir);
    const relativeFiles = files.map((f) => path.relative(path.join(__dirname, ".."), f));

    // 收集所有文件内容
    let allLines = [];
    const fileRanges = []; // 记录每个文件起止行号

    for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const relPath = relativeFiles[i];
        const content = readFileNormalized(filePath);
        const lines = content.split("\n");
        const startLine = allLines.length + 1;
        allLines.push(`/* ===== 文件: ${relPath} ===== */`);
        allLines.push(...lines);
        allLines.push(""); // 文件间空行
        fileRanges.push({ path: relPath, start: startLine, end: allLines.length, count: lines.length });
    }

    const totalLines = allLines.length;
    const totalPages = Math.ceil(totalLines / LINES_PER_PAGE);

    // 生成文档（纯文本格式，适合导入 Word）
    const output = [];

    // === 封面信息 ===
    output.push("=".repeat(72));
    output.push("");
    output.push("    软件著作权登记 — 源代码文档");
    output.push("");
    output.push(`    软件名称：${SOFTWARE_NAME}`);
    output.push(`    版本号：  ${VERSION}`);
    output.push(`    源代码总行数：${totalLines}`);
    output.push(`    文档总页数：  ${totalPages + 1}（含本封面）`);
    output.push(`    源代码文件数：${files.length}`);
    output.push("");
    output.push("=".repeat(72));
    output.push("");
    output.push("");

    // === 分页输出源代码 ===
    for (let page = 0; page < totalPages; page++) {
        const pageNum = page + 1;
        const start = page * LINES_PER_PAGE;
        const end = Math.min(start + LINES_PER_PAGE, totalLines);
        const pageLines = allLines.slice(start, end);

        // 页首
        output.push(
            `  ${SOFTWARE_NAME} ${VERSION}                                          第 ${String(pageNum).padStart(2, " ")} 页 / 共 ${totalPages} 页`
        );
        output.push("-".repeat(72));
        output.push("");
        output.push(...pageLines);
        output.push("");
        output.push("-".repeat(72));
        output.push("");
    }

    const outputDir = path.join(__dirname, "..");
    const outputPath = path.join(outputDir, "源代码整理文档.txt");

    fs.writeFileSync(outputPath, output.join("\n"), "utf-8");

    console.log(`源代码整理文档已生成: ${outputPath}`);
    console.log(`总行数: ${totalLines}`);
    console.log(`总页数: ${totalPages}`);
    console.log(`文件数: ${files.length}`);
    console.log("");
    console.log("文件清单：");
    for (const r of fileRanges) {
        console.log(`  ${r.path} (${r.count} 行)`);
    }
}

main();

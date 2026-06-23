import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type PDFDocumentConstructor from "pdfkit";
import PptxGenJS from "pptxgenjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const PDFDocumentModule = require("pdfkit/js/pdfkit.standalone.js") as
  | { default?: typeof PDFDocumentConstructor }
  | typeof PDFDocumentConstructor;
const PDFDocument = ("default" in PDFDocumentModule ? PDFDocumentModule.default : PDFDocumentModule) as typeof PDFDocumentConstructor;

const CHINESE_FONT_CANDIDATES = [
  "C:\\Windows\\Fonts\\simhei.ttf",
  "C:\\Windows\\Fonts\\Deng.ttf",
  "C:\\Windows\\Fonts\\NotoSansSC-VF.ttf",
  "C:\\Windows\\Fonts\\msyh.ttc",
];

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "_");
}

function dateText(date: Date) {
  return new Intl.DateTimeFormat("zh-CN").format(date);
}

function firstExistingFont() {
  return CHINESE_FONT_CANDIDATES.find((fontPath) => existsSync(fontPath)) ?? null;
}

function pdfBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function addWrappedText(doc: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  text.split("\n").forEach((line) => {
    if (line.trim() === "") {
      doc.moveDown(0.5);
    } else {
      doc.text(line, { lineGap: 5, ...options });
    }
  });
}

async function loadReport(id: string) {
  return prisma.report.findUnique({
    where: { id },
    include: { client: true },
  });
}

async function buildPdf(report: NonNullable<Awaited<ReturnType<typeof loadReport>>>) {
  const doc = new PDFDocument({ margin: 50 });
  const fontPath = firstExistingFont();
  if (fontPath) {
    doc.registerFont("Chinese", readFileSync(fontPath));
    doc.font("Chinese");
  }

  doc.fontSize(22).text(report.title);
  doc.moveDown();
  doc.fontSize(12).text(`客户：${report.client.name}`);
  doc.text(`周期：${dateText(report.periodStart)} - ${dateText(report.periodEnd)}`);
  doc.text(`状态：${report.status}`);
  doc.moveDown();
  doc.fontSize(16).text("报告摘要");
  doc.moveDown(0.5);
  doc.fontSize(12);
  addWrappedText(doc, report.summary, { width: 500 });
  doc.moveDown();
  doc.fontSize(16).text("交付建议");
  doc.moveDown(0.5);
  doc.fontSize(12);
  addWrappedText(
    doc,
    "建议将本报告与真实提升实验页面一起展示：先说明优化前真实采集结果，再说明复盘测试提升，最后用后续真实复测确认自然回答是否发生变化。",
    { width: 500 },
  );

  return pdfBuffer(doc);
}

async function buildPptx(report: NonNullable<Awaited<ReturnType<typeof loadReport>>>) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "GEO AI 搜索可见度监测平台";
  pptx.subject = report.title;
  pptx.title = report.title;
  pptx.company = report.client.name;
  pptx.theme = {
    headFontFace: "Microsoft YaHei",
    bodyFontFace: "Microsoft YaHei",
  };

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "F8FAFC" };
  titleSlide.addText(report.title, { x: 0.7, y: 0.9, w: 11.8, h: 0.8, fontSize: 28, bold: true, color: "0F172A" });
  titleSlide.addText(report.client.name, { x: 0.7, y: 1.9, w: 8, h: 0.35, fontSize: 16, color: "0E7490" });
  titleSlide.addText(`${dateText(report.periodStart)} - ${dateText(report.periodEnd)}`, {
    x: 0.7,
    y: 2.35,
    w: 8,
    h: 0.35,
    fontSize: 14,
    color: "475569",
  });

  const summarySlide = pptx.addSlide();
  summarySlide.addText("报告摘要", { x: 0.7, y: 0.6, w: 8, h: 0.5, fontSize: 24, bold: true, color: "0F172A" });
  summarySlide.addText(report.summary, {
    x: 0.7,
    y: 1.35,
    w: 11.8,
    h: 4.7,
    fontSize: 14,
    color: "334155",
    breakLine: false,
    fit: "shrink",
    valign: "top",
  });

  const nextSlide = pptx.addSlide();
  nextSlide.addText("下一步建议", { x: 0.7, y: 0.6, w: 8, h: 0.5, fontSize: 24, bold: true, color: "0F172A" });
  nextSlide.addText(
    [
      "1. 将复盘测试中有效的内容结构发布到官网、案例页或 FAQ 页。",
      "2. 为缺少引用来源的问题补充可被 AI 摘录的第三方资料或权威页面。",
      "3. 发布后间隔一段时间再次运行真实采集，验证自然回答是否变化。",
      "4. 将真实复测结果同步回真实提升实验，形成客户交付闭环。",
    ].join("\n"),
    { x: 0.9, y: 1.5, w: 11.2, h: 3.2, fontSize: 16, color: "334155", breakLine: false },
  );

  const output = await pptx.write({ outputType: "nodebuffer" });
  if (Buffer.isBuffer(output)) return output;
  if (output instanceof ArrayBuffer) return Buffer.from(output);
  if (output instanceof Uint8Array) return Buffer.from(output);
  if (typeof output === "string") return Buffer.from(output);
  throw new Error("PPTX 导出失败：未知输出类型");
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const report = await loadReport(id);
  if (!report) {
    return Response.json({ error: "报告不存在", displayNames: { error: "错误信息" } }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pptx" ? "pptx" : "pdf";
  const fileName = `${safeFileName(report.title)}.${format}`;
  const buffer = format === "pptx" ? await buildPptx(report) : await buildPdf(report);
  const contentType =
    format === "pptx"
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/pdf";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

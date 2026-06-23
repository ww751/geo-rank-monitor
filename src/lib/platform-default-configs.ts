import type { CollectorConfig } from "@/lib/platform-collector";

export const doubaoRealCollectorConfig = {
  promptSelectors: [
    "textarea",
    "[contenteditable=\"true\"]",
    "[role=\"textbox\"]",
    "div[contenteditable=\"true\"]",
    "[placeholder*=\"发消息\"]",
    "[placeholder*=\"输入\"]",
    "[placeholder*=\"问\"]",
  ],
  submitSelectors: [
    "button[aria-label*=\"发送\"]",
    "button:has-text(\"发送\")",
    "button[type=\"submit\"]",
    "[data-testid*=\"send\"]",
  ],
  answerSelectors: [
    "[data-testid*=\"message\"]",
    "[data-testid*=\"answer\"]",
    "[class*=\"message\"]",
    "[class*=\"answer\"]",
    "[class*=\"markdown\"]",
    "main",
  ],
  bodyDiffFallback: true,
  headless: false,
  timeoutMs: 120_000,
  waitAfterSubmitMs: 15_000,
  settleMs: 3_000,
  minAnswerLength: 20,
} satisfies CollectorConfig;

export function defaultCollectorConfigForPlatform(slug: string): CollectorConfig | null {
  if (slug.toLowerCase() === "doubao") return doubaoRealCollectorConfig;
  return null;
}

export function realCollectorNotesForPlatform(platformName: string) {
  return `${platformName} 已切换为 Playwright 真实采集配置；首次运行使用可视化浏览器，便于处理登录、验证码或风控提示。`;
}

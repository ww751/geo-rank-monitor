import { existsSync } from "node:fs";
import type { Locator, Page } from "playwright";

export type CollectorConfig = {
  promptSelector?: string;
  promptSelectors?: string[];
  submitSelector?: string;
  submitSelectors?: string[];
  answerSelector?: string;
  answerSelectors?: string[];
  readySelector?: string;
  readySelectors?: string[];
  waitAfterSubmitMs?: number;
  manualInterventionMs?: number;
  settleMs?: number;
  minAnswerLength?: number;
  timeoutMs?: number;
  headless?: boolean;
  bodyDiffFallback?: boolean;
  mockAnswer?: string;
  mockAnswerTemplate?: string;
};

export type CollectedAnswer = {
  answer: string;
  rawAnswer: string;
  htmlSummary: string;
  durationMs: number;
  mode: "playwright" | "mock";
};

function asConfig(value: unknown): CollectorConfig {
  if (!value || typeof value !== "object") return {};
  return value as CollectorConfig;
}

function timeout(config: CollectorConfig) {
  return typeof config.timeoutMs === "number" && config.timeoutMs > 0 ? config.timeoutMs : 60_000;
}

function minAnswerLength(config: CollectorConfig) {
  return typeof config.minAnswerLength === "number" && config.minAnswerLength > 0 ? config.minAnswerLength : 20;
}

function settleMs(config: CollectorConfig) {
  return typeof config.settleMs === "number" && config.settleMs > 0 ? config.settleMs : 2_000;
}

function selectorList(primary: string | undefined, candidates: string[] | undefined) {
  return [primary, ...(candidates ?? [])].filter((selector): selector is string => Boolean(selector?.trim()));
}

function cleanAnswerText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/\n{4,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}


function isUsableAnswerCandidate(answer: string, prompt: string) {
  const normalized = cleanAnswerText(answer);
  if (!normalized) return false;

  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const questionLineCount = lines.filter((line) => /[?\uFF1F]$/.test(line)).length;
  const looksLikeFollowUps = lines.length > 0 && lines.length <= 8 && questionLineCount >= Math.max(2, lines.length - 1);
  const looksLikeHomePage = /\u6709\u4EC0\u4E48\u6211\u80FD\u5E2E\u4F60\u7684?\u5417|\u65B0\u5BF9\u8BDD|PPT \u751F\u6210|\u56FE\u50CF\u751F\u6210|\u89C6\u9891\u751F\u6210/.test(normalized);

  if (normalized.includes(prompt)) return true;
  if (looksLikeHomePage || looksLikeFollowUps) return false;
  return normalized.length >= 200;
}
function commonPrefixLength(left: string, right: string) {
  const length = Math.min(left.length, right.length);
  let index = 0;
  while (index < length && left[index] === right[index]) index += 1;
  return index;
}

function diffBodyText(beforeText: string, afterText: string, prompt: string) {
  if (!afterText || afterText === beforeText) return "";

  const prefixLength = commonPrefixLength(beforeText, afterText);
  let diff = afterText.slice(prefixLength);

  if (diff.trim().length < 20) {
    const promptIndex = afterText.lastIndexOf(prompt);
    if (promptIndex >= 0) {
      diff = afterText.slice(promptIndex + prompt.length);
    }
  }

  return cleanAnswerText(diff);
}

function looksLikeVerification(text: string) {
  return /验证|验证码|安全检查|身份验证|拖动滑块|环境异常|访问受限|风控/.test(text);
}

async function isVisible(locator: Locator) {
  return locator.isVisible().catch(() => false);
}

async function firstVisibleLocator(page: Page, selectors: string[], timeoutMs = 1_500) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: "visible", timeout: timeoutMs });
      if (await isVisible(locator)) return locator;
    } catch {
      // Try the next selector candidate.
    }
  }

  return null;
}

async function fillPrompt(locator: Locator, prompt: string, page: Page) {
  try {
    await locator.fill(prompt);
    return;
  } catch {
    await locator.click();
    await page.keyboard.type(prompt, { delay: 5 });
  }
}

async function readBodyText(page: Page) {
  return page.locator("body").innerText().catch(() => "");
}

async function readAnswerFromSelectors(page: Page, selectors: string[], minLength: number) {
  const candidates: string[] = [];

  for (const selector of selectors) {
    try {
      const locator = page.locator(selector);
      const count = await locator.count();
      const start = Math.max(0, count - 8);

      for (let index = start; index < count; index += 1) {
        const item = locator.nth(index);
        if (!(await isVisible(item))) continue;
        const text = cleanAnswerText(await item.innerText().catch(() => ""));
        if (text.length >= minLength) candidates.push(text);
      }
    } catch {
      // Invalid or stale selectors should not stop collection.
    }
  }

  return candidates.sort((left, right) => right.length - left.length)[0] ?? "";
}

async function waitForAnswerText(input: {
  page: Page;
  prompt: string;
  beforeText: string;
  answerSelectors: string[];
  config: CollectorConfig;
}) {
  const deadline = Date.now() + timeout(input.config);
  const minLength = minAnswerLength(input.config);
  const settleWindow = settleMs(input.config);
  const useBodyDiff = input.config.bodyDiffFallback !== false;
  let lastCandidate = "";
  let lastChangedAt = Date.now();

  while (Date.now() < deadline) {
    const selectorAnswer = await readAnswerFromSelectors(input.page, input.answerSelectors, minLength);
    const bodyText = useBodyDiff ? await readBodyText(input.page) : "";
    const bodyAnswer = useBodyDiff ? diffBodyText(input.beforeText, bodyText, input.prompt) : "";
    const candidate = cleanAnswerText(selectorAnswer.length >= minLength ? selectorAnswer : bodyAnswer);

    if (candidate.length >= minLength && isUsableAnswerCandidate(candidate, input.prompt)) {
      if (candidate !== lastCandidate) {
        lastCandidate = candidate;
        lastChangedAt = Date.now();
      } else if (Date.now() - lastChangedAt >= settleWindow) {
        return candidate;
      }
    }

    await input.page.waitForTimeout(1_000);
  }

  return lastCandidate;
}

async function waitForSubmission(input: {
  page: Page;
  beforeText: string;
  initialUrl: string;
  prompt: string;
  config: CollectorConfig;
}) {
  const deadline = Date.now() + (input.config.manualInterventionMs ?? 180_000);
  const minLength = minAnswerLength(input.config);
  let sawVerification = false;

  while (Date.now() < deadline) {
    const currentUrl = input.page.url();
    const bodyText = await readBodyText(input.page);
    const diffText = diffBodyText(input.beforeText, bodyText, input.prompt);
    const urlChanged = currentUrl !== input.initialUrl;
    const contentGrew = bodyText.length > input.beforeText.length + Math.max(80, minLength);

    if (looksLikeVerification(bodyText)) {
      sawVerification = true;
    }

    if (urlChanged && contentGrew && !looksLikeVerification(diffText)) {
      return;
    }

    if (diffText.length >= minLength && !looksLikeVerification(diffText)) {
      return;
    }

    await input.page.waitForTimeout(1_000);
  }

  if (sawVerification) {
    throw new Error("豆包出现验证或风控，请在打开的浏览器中手动完成验证并重新运行采集。");
  }
  throw new Error("未检测到问题已成功发送，未保存无效采集结果。");
}

export async function collectPlatformAnswer(input: {
  homepageUrl: string | null;
  platformName: string;
  prompt: string;
  brandName?: string;
  storageStatePath?: string | null;
  collectorConfig: unknown;
}): Promise<CollectedAnswer> {
  const started = Date.now();
  const config = asConfig(input.collectorConfig);
  const mockAnswer = config.mockAnswerTemplate
    ?.replaceAll("{{keyword}}", input.prompt)
    .replaceAll("{{brand}}", input.brandName ?? "客户品牌")
    .replaceAll("{{platform}}", input.platformName)
    .trim();

  if (config.mockAnswer?.trim() || mockAnswer) {
    const answer = config.mockAnswer?.trim() || mockAnswer || "";
    return {
      answer,
      rawAnswer: answer,
      htmlSummary: `${input.platformName} 使用 mockAnswer 完成模拟采集。`,
      durationMs: Date.now() - started,
      mode: "mock",
    };
  }

  if (!input.homepageUrl) {
    throw new Error(`${input.platformName} 未配置平台官网 URL`);
  }

  const promptSelectors = selectorList(config.promptSelector, config.promptSelectors);
  const submitSelectors = selectorList(config.submitSelector, config.submitSelectors);
  const answerSelectors = selectorList(config.answerSelector, config.answerSelectors);
  const readySelectors = selectorList(config.readySelector, config.readySelectors);

  if (promptSelectors.length === 0) {
    throw new Error(`${input.platformName} 未配置 promptSelector/promptSelectors，无法执行真实采集`);
  }
  if (answerSelectors.length === 0 && config.bodyDiffFallback === false) {
    throw new Error(`${input.platformName} 未配置 answerSelector/answerSelectors，无法执行真实采集`);
  }

  const storageState =
    input.storageStatePath && existsSync(input.storageStatePath) ? input.storageStatePath : undefined;
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: config.headless ?? true });

  try {
    const context = await browser.newContext(storageState ? { storageState } : undefined);
    const page = await context.newPage();
    page.setDefaultTimeout(timeout(config));

    await page.goto(input.homepageUrl, { waitUntil: "domcontentloaded" });
    for (const readySelector of readySelectors) {
      await page.waitForSelector(readySelector, { state: "visible" }).catch(() => undefined);
    }
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);

    const promptLocator = await firstVisibleLocator(page, promptSelectors, 5_000);
    if (!promptLocator) {
      throw new Error(`${input.platformName} 已打开页面，但未找到可用的提示词输入框`);
    }

    const beforeText = await readBodyText(page);
    const initialUrl = page.url();
    await fillPrompt(promptLocator, input.prompt, page);
    await page.waitForTimeout(800);

    const submitLocator = await firstVisibleLocator(page, submitSelectors, 800);
    if (submitLocator) {
      await submitLocator.click({ force: true });
    } else {
      await page.keyboard.press("Enter");
    }

    await waitForSubmission({
      page,
      beforeText,
      initialUrl,
      prompt: input.prompt,
      config,
    });

    if (config.waitAfterSubmitMs) {
      await page.waitForTimeout(config.waitAfterSubmitMs);
    }

    const answer = await waitForAnswerText({
      page,
      prompt: input.prompt,
      beforeText,
      answerSelectors,
      config,
    });
    const title = await page.title().catch(() => input.platformName);

    if (!answer) {
      throw new Error(`${input.platformName} 已打开页面，但没有提取到回答文本`);
    }

    return {
      answer,
      rawAnswer: answer,
      htmlSummary: `${title} · ${input.platformName} · selectors=${answerSelectors.join(",") || "body-diff"}`,
      durationMs: Date.now() - started,
      mode: "playwright",
    };
  } finally {
    await browser.close();
  }
}

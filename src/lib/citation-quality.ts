import type { CitationType } from "@/generated/prisma/enums";

const mediaDomains = ["36kr.com", "huxiu.com", "thepaper.cn", "sina.com.cn", "sohu.com", "163.com", "qq.com"];
const qaDomains = ["zhihu.com", "baidu.com", "toutiao.com"];
const wikiDomains = ["baike.baidu.com", "wikipedia.org"];
const mapDomains = ["amap.com", "map.baidu.com", "maps.qq.com"];
const localLifeDomains = ["dianping.com", "meituan.com", "koubei.com", "anjuke.com", "lianjia.com", "ke.com"];

export function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function includesDomain(domain: string, candidates: string[]) {
  return candidates.some((candidate) => domain === candidate || domain.endsWith(`.${candidate}`));
}

export function classifyCitationType(url: string, brandWebsite?: string | null): CitationType {
  const domain = domainFromUrl(url);
  const brandDomain = brandWebsite ? domainFromUrl(brandWebsite) : "";

  if (!domain) return "UNKNOWN";
  if (brandDomain && (domain === brandDomain || domain.endsWith(`.${brandDomain}`))) return "OFFICIAL";
  if (includesDomain(domain, wikiDomains)) return "WIKI";
  if (includesDomain(domain, mapDomains)) return "MAP";
  if (includesDomain(domain, localLifeDomains)) return "LOCAL_LIFE";
  if (includesDomain(domain, qaDomains)) return "QA";
  if (includesDomain(domain, mediaDomains)) return "MEDIA";
  if (/bbs|forum|tieba|club/.test(domain)) return "FORUM";
  return "OTHER";
}

export function authorityScoreForCitation(input: {
  type: CitationType | string;
  isValid?: boolean | null;
  url?: string | null;
}) {
  if (input.isValid === false) return 0;

  const validUrl = input.url
    ? (() => {
        try {
          const parsed = new URL(input.url);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      })()
    : true;

  if (!validUrl) return 0;

  switch (input.type) {
    case "OFFICIAL":
      return 30;
    case "LOCAL_LIFE":
      return 25;
    case "MEDIA":
    case "MAP":
      return 20;
    case "WIKI":
      return 15;
    case "QA":
    case "FORUM":
    case "SOCIAL":
      return 10;
    case "OTHER":
      return 5;
    default:
      return 3;
  }
}

export function citationScoreForRows(
  citations: Array<{ url: string; type?: string; isValid?: boolean | null; authorityScore?: number | null }>,
) {
  return Math.min(
    30,
    citations.reduce((sum, citation) => {
      if (citation.authorityScore && citation.authorityScore > 0) {
        return sum + Math.min(10, Math.ceil(citation.authorityScore / 10));
      }
      return sum + Math.min(10, authorityScoreForCitation({ type: citation.type ?? "OTHER", isValid: citation.isValid, url: citation.url }) / 3);
    }, 0),
  );
}

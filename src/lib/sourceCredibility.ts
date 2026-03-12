/**
 * Source Credibility Scoring System
 * 
 * Analyzes domain reputation and assigns credibility scores
 */

export interface CredibilityResult {
  domain: string;
  credibilityScore: number; // 0-1
  reputation: "trusted" | "medium" | "unknown" | "risky" | "satire";
  category: string;
  explanation: string;
}

// Trusted mainstream media
const TRUSTED_SOURCES: Record<string, string> = {
  "bbc.com": "International News",
  "bbc.co.uk": "International News",
  "reuters.com": "International News",
  "apnews.com": "International News",
  "associatedpress.com": "International News",
  "nytimes.com": "National News",
  "newyorktimes.com": "National News",
  "washingtonpost.com": "National News",
  "theguardian.com": "International News",
  "guardian.co.uk": "International News",
  "cnn.com": "Cable News",
  "edition.cnn.com": "Cable News",
  "npr.org": "Public Radio",
  "wsj.com": "Financial News",
  "wallstreetjournal.com": "Financial News",
  "economist.com": "Financial News",
  "bloomberg.com": "Financial News",
  "ft.com": "Financial News",
  "financialtimes.com": "Financial News",
  "aljazeera.com": "International News",
  "politico.com": "Political News",
  "axios.com": "Political News",
  "usatoday.com": "National News",
  "latimes.com": "Regional News",
  "chicagotribune.com": "Regional News",
  "time.com": "Magazine",
  "newsweek.com": "Magazine",
  "forbes.com": "Business News",
  "fortune.com": "Business News",
  "businessinsider.com": "Business News",
  "techcrunch.com": "Technology News",
  "theverge.com": "Technology News",
  "wired.com": "Technology News",
  "arstechnica.com": "Technology News",
  "nature.com": "Scientific Journal",
  "science.org": "Scientific Journal",
  "sciencedirect.com": "Scientific Journal",
  "nejm.org": "Medical Journal",
  "thelancet.com": "Medical Journal",
  "who.int": "Health Organization",
  "cdc.gov": "Health Organization",
  "fda.gov": "Government Agency",
  "epa.gov": "Government Agency",
  "nasa.gov": "Government Agency",
  "whitehouse.gov": "Government",
  "congress.gov": "Government",
  "senate.gov": "Government",
  "house.gov": "Government",
  "census.gov": "Government Statistics",
  "bls.gov": "Government Statistics",
};

// Medium credibility - partisan or opinion-heavy
const MEDIUM_SOURCES: Record<string, string> = {
  "huffpost.com": "Progressive News",
  "huffingtonpost.com": "Progressive News",
  "vox.com": "Progressive News",
  "slate.com": "Progressive Commentary",
  "salon.com": "Progressive Commentary",
  "thedailybeast.com": "Progressive News",
  "rawstory.com": "Progressive News",
  "dailykos.com": "Progressive Blog",
  "thinkprogress.org": "Progressive Policy",
  "motherjones.com": "Progressive Magazine",
  "thenation.com": "Progressive Magazine",
  "breitbart.com": "Conservative News",
  "dailycaller.com": "Conservative News",
  "foxnews.com": "Conservative News",
  "newsmax.com": "Conservative News",
  "oann.com": "Conservative News",
  "theblaze.com": "Conservative Commentary",
  "townhall.com": "Conservative Commentary",
  "nationalreview.com": "Conservative Magazine",
  "spectator.org": "Conservative Magazine",
  "buzzfeednews.com": "Digital News",
  "vice.com": "Digital News",
  "mic.com": "Digital News",
  "mashable.com": "Digital News",
  "gizmodo.com": "Technology Blog",
  "engadget.com": "Technology Blog",
  "cnet.com": "Technology Review",
};

// Known satire/fake sites
const SATIRE_SOURCES: string[] = [
  "theonion.com",
  "clickhole.com",
  "babylonbee.com",
  "saturdaynightlive.com",
  "dailycurrant.com",
  "empirenews.net",
  "nationalreport.net",
  "worldnewsdailyreport.com",
  "huzlers.com",
];

// Suspicious indicators in domain
const SUSPICIOUS_PATTERNS = [
  /\d{4,}/, // Numbers in domain (news2024.com)
  /(truth|exposed|real|secret|conspiracy|alternative)/i,
  /(natural|organic|miracle|cure|detox)/i,
  /(liberty|freedom|patriot|conservative|liberal)/i,
  /blog|wordpress\.com|blogspot\.com/i,
];

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObj.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    // Fallback: extract domain manually
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    return match ? match[1].toLowerCase() : url.toLowerCase();
  }
}

/**
 * Analyze source credibility
 */
export function analyzeSourceCredibility(url: string): CredibilityResult {
  const domain = extractDomain(url);
  
  // Check trusted sources
  if (TRUSTED_SOURCES[domain]) {
    return {
      domain,
      credibilityScore: 0.9,
      reputation: "trusted",
      category: TRUSTED_SOURCES[domain],
      explanation: `${domain} is a well-established, reputable news organization with editorial standards and fact-checking processes.`,
    };
  }
  
  // Check medium sources
  if (MEDIUM_SOURCES[domain]) {
    return {
      domain,
      credibilityScore: 0.6,
      reputation: "medium",
      category: MEDIUM_SOURCES[domain],
      explanation: `${domain} has a known editorial perspective. Cross-reference with other sources for balanced view.`,
    };
  }
  
  // Check satire
  if (SATIRE_SOURCES.includes(domain)) {
    return {
      domain,
      credibilityScore: 0.0,
      reputation: "satire",
      category: "Satire/Parody",
      explanation: `${domain} is a satirical website. Content is intended as humor/parody, not factual reporting.`,
    };
  }
  
  // Check for suspicious patterns
  const suspiciousScore = SUSPICIOUS_PATTERNS.reduce((score, pattern) => {
    return score + (pattern.test(domain) ? 1 : 0);
  }, 0);
  
  if (suspiciousScore >= 2) {
    return {
      domain,
      credibilityScore: 0.2,
      reputation: "risky",
      category: "Unknown/Suspicious",
      explanation: `Domain name contains patterns often associated with unreliable sources. Verify claims independently.`,
    };
  }
  
  if (suspiciousScore === 1) {
    return {
      domain,
      credibilityScore: 0.4,
      reputation: "unknown",
      category: "Unknown Source",
      explanation: `Limited information about ${domain}. Exercise caution and verify through established sources.`,
    };
  }
  
  // Generic unknown
  return {
    domain,
    credibilityScore: 0.5,
    reputation: "unknown",
    category: "Unknown Source",
    explanation: `Unable to verify reputation of ${domain}. Cross-reference with trusted sources before sharing.`,
  };
}

/**
 * Adjust fake probability based on source credibility
 */
export function adjustProbabilityBySource(
  baseProbability: number,
  credibilityResult: CredibilityResult
): { adjustedProbability: number; reasoning: string } {
  const { credibilityScore, reputation } = credibilityResult;
  
  // Trusted sources reduce fake probability
  if (reputation === "trusted") {
    const reduction = Math.min(30, (0.9 - credibilityScore) * 100);
    return {
      adjustedProbability: Math.max(0, baseProbability - reduction),
      reasoning: `Source is highly credible (${credibilityResult.category}). Reducing fake probability by ${Math.round(reduction)}%.`,
    };
  }
  
  // Medium sources - slight reduction
  if (reputation === "medium") {
    const reduction = Math.min(15, (0.6 - credibilityScore) * 100);
    return {
      adjustedProbability: Math.max(0, baseProbability - reduction),
      reasoning: `Source has established reputation but known perspective. Minor adjustment applied.`,
    };
  }
  
  // Satire - always fake
  if (reputation === "satire") {
    return {
      adjustedProbability: 95,
      reasoning: "Source is satirical/parody content. Not intended as factual reporting.",
    };
  }
  
  // Risky sources increase fake probability
  if (reputation === "risky") {
    const increase = Math.min(30, (0.5 - credibilityScore) * 100);
    return {
      adjustedProbability: Math.min(100, baseProbability + increase),
      reasoning: `Source shows suspicious characteristics. Increasing fake probability by ${Math.round(increase)}%.`,
    };
  }
  
  // Unknown - slight increase
  return {
    adjustedProbability: Math.min(100, baseProbability + 10),
    reasoning: "Unknown source reputation. Exercise caution.",
  };
}

/**
 * Get list of trusted domains for display
 */
export function getTrustedDomains(): string[] {
  return Object.keys(TRUSTED_SOURCES);
}

/**
 * Source Credibility Scoring System
 * 
 * Comprehensive Tier-Based Domain Database (100+ sources)
 * Scores: 0-100 scale (normalized to 0-1 internally)
 */

export interface CredibilityResult {
  domain: string;
  credibilityScore: number; // 0-1
  reputation: "tier1" | "tier2" | "tier3" | "tier4" | "tier5" | "tier6" | "gov" | "edu" | "org" | "satire" | "unknown";
  category: string;
  tier: number;
  explanation: string;
}

// Tier 1 (90-100): Highest credibility
const TIER_1_SOURCES: Record<string, { category: string; score: number }> = {
  "reuters.com": { category: "International News", score: 97 },
  "apnews.com": { category: "International News", score: 96 },
  "associatedpress.com": { category: "International News", score: 96 },
  "bbc.com": { category: "International News", score: 95 },
  "bbc.co.uk": { category: "International News", score: 95 },
  "nytimes.com": { category: "National News", score: 94 },
  "newyorktimes.com": { category: "National News", score: 94 },
  "washingtonpost.com": { category: "National News", score: 93 },
  "wsj.com": { category: "Financial News", score: 92 },
  "wallstreetjournal.com": { category: "Financial News", score: 92 },
  "economist.com": { category: "Financial News", score: 91 },
  "theguardian.com": { category: "International News", score: 90 },
  "guardian.co.uk": { category: "International News", score: 90 },
  "ft.com": { category: "Financial News", score: 90 },
  "financialtimes.com": { category: "Financial News", score: 90 },
  "npr.org": { category: "Public Radio", score: 90 },
};

// Tier 2 (80-89): High credibility
const TIER_2_SOURCES: Record<string, { category: string; score: number }> = {
  "usatoday.com": { category: "National News", score: 88 },
  "latimes.com": { category: "Regional News", score: 87 },
  "bloomberg.com": { category: "Financial News", score: 87 },
  "chicagotribune.com": { category: "Regional News", score: 86 },
  "bostonglobe.com": { category: "Regional News", score: 85 },
  "cnn.com": { category: "Cable News", score: 84 },
  "edition.cnn.com": { category: "Cable News", score: 84 },
  "abcnews.go.com": { category: "Broadcast News", score: 84 },
  "nbcnews.com": { category: "Broadcast News", score: 84 },
  "cbsnews.com": { category: "Broadcast News", score: 83 },
  "politico.com": { category: "Political News", score: 82 },
  "axios.com": { category: "Political News", score: 82 },
  "aljazeera.com": { category: "International News", score: 81 },
  "time.com": { category: "Magazine", score: 80 },
  "newsweek.com": { category: "Magazine", score: 80 },
};

// Tier 3 (60-79): Moderate credibility
const TIER_3_SOURCES: Record<string, { category: string; score: number }> = {
  "vox.com": { category: "Progressive News", score: 78 },
  "huffpost.com": { category: "Progressive News", score: 75 },
  "huffingtonpost.com": { category: "Progressive News", score: 75 },
  "slate.com": { category: "Progressive Commentary", score: 74 },
  "thedailybeast.com": { category: "Progressive News", score: 73 },
  "vice.com": { category: "Digital News", score: 72 },
  "buzzfeednews.com": { category: "Digital News", score: 71 },
  "salon.com": { category: "Progressive Commentary", score: 70 },
  "motherjones.com": { category: "Progressive Magazine", score: 69 },
  "thenation.com": { category: "Progressive Magazine", score: 68 },
  "nationalreview.com": { category: "Conservative Magazine", score: 67 },
  "spectator.org": { category: "Conservative Magazine", score: 66 },
  "forbes.com": { category: "Business News", score: 76 },
  "fortune.com": { category: "Business News", score: 75 },
  "businessinsider.com": { category: "Business News", score: 72 },
  "techcrunch.com": { category: "Technology News", score: 70 },
  "theverge.com": { category: "Technology News", score: 70 },
  "wired.com": { category: "Technology News", score: 72 },
  "cnet.com": { category: "Technology Review", score: 68 },
};

// Tier 4 (40-59): Lower credibility
const TIER_4_SOURCES: Record<string, { category: string; score: number }> = {
  "foxnews.com": { category: "Conservative News", score: 58 },
  "dailymail.co.uk": { category: "Tabloid", score: 55 },
  "nypost.com": { category: "Tabloid", score: 58 },
  "breitbart.com": { category: "Conservative News", score: 45 },
  "dailycaller.com": { category: "Conservative News", score: 48 },
  "newsmax.com": { category: "Conservative News", score: 50 },
  "theblaze.com": { category: "Conservative Commentary", score: 52 },
  "townhall.com": { category: "Conservative Commentary", score: 51 },
  "oann.com": { category: "Conservative News", score: 48 },
  "rawstory.com": { category: "Progressive News", score: 55 },
  "dailykos.com": { category: "Progressive Blog", score: 50 },
  "gizmodo.com": { category: "Technology Blog", score: 58 },
  "engadget.com": { category: "Technology Blog", score: 60 },
  "mashable.com": { category: "Digital News", score: 55 },
};

// Tier 5 (20-39): Low credibility
const TIER_5_SOURCES: Record<string, { category: string; score: number }> = {
  "beforeitsnews.com": { category: "Conspiracy", score: 25 },
  "yournewswire.com": { category: "Fake News", score: 20 },
  "activistpost.com": { category: "Conspiracy", score: 30 },
  "naturalnews.com": { category: "Pseudo-science", score: 25 },
  "infowars.com": { category: "Conspiracy", score: 20 },
  "prisonplanet.com": { category: "Conspiracy", score: 22 },
  "zerohedge.com": { category: "Financial Conspiracy", score: 35 },
};

// Tier 6 (<20): Very low credibility - Known misinformation
const TIER_6_SOURCES: Record<string, { category: string; score: number }> = {
  "nationalreport.net": { category: "Fake News", score: 15 },
  "worldnewsdailyreport.com": { category: "Fake News", score: 15 },
  "empirenews.net": { category: "Fake News", score: 15 },
  "huzlers.com": { category: "Fake News", score: 15 },
  "dailycurrant.com": { category: "Fake News", score: 15 },
};

// Known satire/parody sites
const SATIRE_SOURCES: Record<string, { category: string; score: number }> = {
  "theonion.com": { category: "Satire", score: 0 },
  "clickhole.com": { category: "Satire", score: 0 },
  "babylonbee.com": { category: "Satire", score: 0 },
  "saturdaynightlive.com": { category: "Satire", score: 0 },
};

// Academic sources (.edu, .ac.uk, etc.)
const ACADEMIC_DOMAINS = [".edu", ".ac.uk", ".ac.au", ".ac.nz", ".ac.za"];

// Government sources (.gov, etc.)
const GOVERNMENT_DOMAINS = [".gov", ".gov.uk", ".gov.au", ".gov.in", ".gov.ca"];

// Suspicious patterns for unknown domains
const SUSPICIOUS_PATTERNS = [
  { pattern: /\d{4,}/, score: 25, reason: "Numbers in domain" },
  { pattern: /(truth|exposed|real|secret|conspiracy|alternative)/i, score: 25, reason: "Conspiracy keywords" },
  { pattern: /(natural|organic|miracle|cure|detox)/i, score: 30, reason: "Pseudo-science keywords" },
  { pattern: /blog|wordpress\.com|blogspot\.com|medium\.com/i, score: 35, reason: "Blog platform" },
  { pattern: /facebook|twitter|instagram|tiktok|youtube/i, score: 25, reason: "Social media" },
];

// Trusted TLDs
const TRUSTED_TLDS = [".org", ".int", ".edu", ".gov"];

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
 * Analyze source credibility using comprehensive tier-based system
 */
export function analyzeSourceCredibility(url: string): CredibilityResult {
  const domain = extractDomain(url);
  
  // Check Tier 1 (90-100): Highest credibility
  if (TIER_1_SOURCES[domain]) {
    const source = TIER_1_SOURCES[domain];
    return {
      domain,
      credibilityScore: source.score / 100,
      reputation: "tier1",
      category: source.category,
      tier: 1,
      explanation: `${domain} is a Tier 1 source (${source.score}/100) - highest credibility with rigorous editorial standards and fact-checking.`,
    };
  }
  
  // Check Tier 2 (80-89): High credibility
  if (TIER_2_SOURCES[domain]) {
    const source = TIER_2_SOURCES[domain];
    return {
      domain,
      credibilityScore: source.score / 100,
      reputation: "tier2",
      category: source.category,
      tier: 2,
      explanation: `${domain} is a Tier 2 source (${source.score}/100) - high credibility established news organization.`,
    };
  }
  
  // Check Tier 3 (60-79): Moderate credibility
  if (TIER_3_SOURCES[domain]) {
    const source = TIER_3_SOURCES[domain];
    return {
      domain,
      credibilityScore: source.score / 100,
      reputation: "tier3",
      category: source.category,
      tier: 3,
      explanation: `${domain} is a Tier 3 source (${source.score}/100) - moderate credibility, may have editorial perspective. Cross-reference recommended.`,
    };
  }
  
  // Check Tier 4 (40-59): Lower credibility
  if (TIER_4_SOURCES[domain]) {
    const source = TIER_4_SOURCES[domain];
    return {
      domain,
      credibilityScore: source.score / 100,
      reputation: "tier4",
      category: source.category,
      tier: 4,
      explanation: `${domain} is a Tier 4 source (${source.score}/100) - lower credibility, verify claims through other sources.`,
    };
  }
  
  // Check Tier 5 (20-39): Low credibility
  if (TIER_5_SOURCES[domain]) {
    const source = TIER_5_SOURCES[domain];
    return {
      domain,
      credibilityScore: source.score / 100,
      reputation: "tier5",
      category: source.category,
      tier: 5,
      explanation: `${domain} is a Tier 5 source (${source.score}/100) - low credibility, high skepticism advised.`,
    };
  }
  
  // Check Tier 6 (<20): Very low credibility
  if (TIER_6_SOURCES[domain]) {
    const source = TIER_6_SOURCES[domain];
    return {
      domain,
      credibilityScore: source.score / 100,
      reputation: "tier6",
      category: source.category,
      tier: 6,
      explanation: `${domain} is a Tier 6 source (${source.score}/100) - known misinformation source. Avoid.`,
    };
  }
  
  // Check satire
  if (SATIRE_SOURCES[domain]) {
    return {
      domain,
      credibilityScore: 0.0,
      reputation: "satire",
      category: "Satire/Parody",
      tier: 0,
      explanation: `${domain} is satirical content - intended as humor/parody, not factual reporting.`,
    };
  }
  
  // Check academic domains (.edu, .ac.uk, etc.)
  if (ACADEMIC_DOMAINS.some(tld => domain.endsWith(tld))) {
    return {
      domain,
      credibilityScore: 0.80,
      reputation: "edu",
      category: "Academic Institution",
      tier: 2,
      explanation: `${domain} is an academic institution (80/100) - high credibility for research and educational content.`,
    };
  }
  
  // Check government domains (.gov, etc.)
  if (GOVERNMENT_DOMAINS.some(tld => domain.endsWith(tld))) {
    return {
      domain,
      credibilityScore: 0.85,
      reputation: "gov",
      category: "Government Source",
      tier: 2,
      explanation: `${domain} is a government source (85/100) - official information, though may have political perspective.`,
    };
  }
  
  // Check .org domains
  if (domain.endsWith(".org")) {
    return {
      domain,
      credibilityScore: 0.65,
      reputation: "org",
      category: "Organization",
      tier: 3,
      explanation: `${domain} is a .org domain (65/100) - organizational source, credibility varies by organization.`,
    };
  }
  
  // Check for suspicious patterns in unknown domains
  let suspiciousScore = 0;
  let suspiciousReasons: string[] = [];
  
  for (const { pattern, score, reason } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(domain)) {
      suspiciousScore += score;
      suspiciousReasons.push(reason);
    }
  }
  
  if (suspiciousScore >= 50) {
    return {
      domain,
      credibilityScore: Math.max(0.1, (100 - suspiciousScore) / 100),
      reputation: "tier6",
      category: "Suspicious Domain",
      tier: 6,
      explanation: `${domain} shows multiple suspicious patterns (${suspiciousReasons.join(", ")}). Very low credibility.`,
    };
  }
  
  if (suspiciousScore >= 25) {
    return {
      domain,
      credibilityScore: Math.max(0.2, (100 - suspiciousScore) / 100),
      reputation: "tier5",
      category: "Questionable Domain",
      tier: 5,
      explanation: `${domain} shows suspicious patterns (${suspiciousReasons.join(", ")}). Low credibility.`,
    };
  }
  
  // Generic unknown - neutral score
  return {
    domain,
    credibilityScore: 0.50,
    reputation: "unknown",
    category: "Unknown Source",
    tier: 3,
    explanation: `${domain} is not in our database (50/100). Cross-reference with trusted sources before sharing.`,
  };
}

/**
 * Adjust fake probability based on source credibility
 */
export function adjustProbabilityBySource(
  baseProbability: number,
  credibilityResult: CredibilityResult
): { adjustedProbability: number; reasoning: string } {
  const { credibilityScore, reputation, tier } = credibilityResult;
  
  // Tier 1 & 2 sources (high credibility) reduce fake probability
  if (tier <= 2 || reputation === "gov" || reputation === "edu") {
    const reduction = Math.min(30, (0.9 - credibilityScore) * 100);
    return {
      adjustedProbability: Math.max(0, baseProbability - reduction),
      reasoning: `Source is Tier ${tier} (${credibilityResult.category}, ${Math.round(credibilityScore * 100)}/100). Reducing fake probability by ${Math.round(reduction)}%.`,
    };
  }
  
  // Tier 3 sources (moderate) - slight reduction
  if (tier === 3 || reputation === "org") {
    const reduction = Math.min(15, (0.7 - credibilityScore) * 100);
    return {
      adjustedProbability: Math.max(0, baseProbability - reduction),
      reasoning: `Source is Tier 3 (${credibilityResult.category}, ${Math.round(credibilityScore * 100)}/100). Minor adjustment applied.`,
    };
  }
  
  // Satire - always fake
  if (reputation === "satire") {
    return {
      adjustedProbability: 95,
      reasoning: "Source is satirical/parody content. Not intended as factual reporting.",
    };
  }
  
  // Tier 5 & 6 sources (low credibility) increase fake probability
  if (tier >= 5) {
    const increase = Math.min(40, (0.5 - credibilityScore) * 100);
    return {
      adjustedProbability: Math.min(100, baseProbability + increase),
      reasoning: `Source is Tier ${tier} (${credibilityResult.category}, ${Math.round(credibilityScore * 100)}/100). Increasing fake probability by ${Math.round(increase)}%.`,
    };
  }
  
  // Tier 4 (lower credibility) - slight increase
  if (tier === 4) {
    const increase = Math.min(20, (0.5 - credibilityScore) * 100);
    return {
      adjustedProbability: Math.min(100, baseProbability + increase),
      reasoning: `Source is Tier 4 (${credibilityResult.category}, ${Math.round(credibilityScore * 100)}/100). Slight increase in fake probability.`,
    };
  }
  
  // Unknown - neutral
  return {
    adjustedProbability: baseProbability,
    reasoning: "Unknown source reputation. No adjustment applied.",
  };
}

/**
 * Get list of trusted domains for display
 */
export function getTrustedDomains(): string[] {
  return [
    ...Object.keys(TIER_1_SOURCES),
    ...Object.keys(TIER_2_SOURCES),
  ];
}

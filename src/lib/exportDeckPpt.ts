import PptxGenJS from "pptxgenjs";

const COLORS = {
  bg: "F8FAFC",
  text: "111827",
  muted: "6B7280",
  navy: "0F172A",
  slate: "334155",
  cyan: "06B6D4",
  emerald: "10B981",
  amber: "F59E0B",
  rose: "F43F5E",
  white: "FFFFFF",
  border: "CBD5E1",
};

const addHeader = (slide: PptxGenJS.Slide, title: string) => {
  slide.background = { color: COLORS.bg };
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.7, fill: { color: COLORS.navy }, line: { color: COLORS.navy } });
  slide.addText(title, {
    x: 0.6,
    y: 0.16,
    w: 10.6,
    h: 0.3,
    fontFace: "Aptos",
    fontSize: 16,
    color: COLORS.white,
    bold: true,
  });
};

const addBulletList = (slide: PptxGenJS.Slide, points: string[], x = 0.8, y = 1.25, w = 12, h = 5.8) => {
  const bulletRuns = points.map((point) => ({
    text: point,
    options: { bullet: { indent: 18 } },
  }));

  slide.addText(bulletRuns as PptxGenJS.TextProps[], {
    x,
    y,
    w,
    h,
    fontFace: "Aptos",
    fontSize: 22,
    color: COLORS.text,
    breakLine: true,
    paraSpaceAfter: 14,
  });
};

export const exportFakeNewsDeckPpt = async () => {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Fake News Detection Team";
  pptx.company = "AI Media Project";
  pptx.subject = "Fake News Detection Using AI";
  pptx.title = "Fake News Detection Using AI";

  const title = pptx.addSlide();
  title.background = { color: COLORS.navy };
  title.addShape("rect", { x: 0.55, y: 0.62, w: 12.2, h: 6.18, fill: { color: COLORS.slate, transparency: 15 }, line: { color: COLORS.cyan, pt: 1 } });
  title.addText("Fake News Detection Using AI", {
    x: 0.95,
    y: 1.25,
    w: 8.8,
    h: 1,
    fontFace: "Aptos Display",
    fontSize: 44,
    bold: true,
    color: COLORS.white,
  });
  title.addText("PROBLEM STATEMENT TITLE", {
    x: 0.95,
    y: 0.85,
    w: 5,
    h: 0.35,
    fontFace: "Aptos",
    fontSize: 13,
    bold: true,
    color: COLORS.cyan,
  });
  title.addText("TRACK: AI / NLP / Social Impact", {
    x: 0.95,
    y: 2.75,
    w: 6,
    h: 0.4,
    fontFace: "Aptos",
    fontSize: 20,
    color: COLORS.white,
  });
  title.addText("TEAM LEADER NAME: [Your Name]", {
    x: 0.95,
    y: 3.35,
    w: 6.6,
    h: 0.4,
    fontFace: "Aptos",
    fontSize: 20,
    color: COLORS.white,
  });
  title.addText("TEAM NAME: [Your Team Name]", {
    x: 0.95,
    y: 3.95,
    w: 6.6,
    h: 0.4,
    fontFace: "Aptos",
    fontSize: 20,
    color: COLORS.white,
  });
  title.addText("Media / Public Information", {
    x: 0.95,
    y: 5.85,
    w: 4.4,
    h: 0.35,
    fontFace: "Aptos",
    fontSize: 14,
    color: COLORS.cyan,
  });

  const abstract = pptx.addSlide();
  addHeader(abstract, "ABSTRACT");
  addBulletList(abstract, [
    "Social media accelerates the spread of fake and misleading news.",
    "Misinformation can trigger panic, bias public opinion, and weaken trust in media.",
    "Our AI system combines NLP classification with source credibility signals.",
    "The output includes a fake-news score and explainable reasons for the prediction.",
    "The solution is deployable via web interface and browser extension.",
  ]);

  const problem = pptx.addSlide();
  addHeader(problem, "PROBLEM STATEMENT");
  addBulletList(problem, [
    "Unverified online content goes viral faster than fact-checking can respond.",
    "Users need instant authenticity checks before sharing information.",
    "Manual verification is expensive, slow, and difficult to scale.",
    "A robust and explainable automated detection pipeline is required.",
  ]);

  const solution = pptx.addSlide();
  addHeader(solution, "PROPOSED SOLUTION");
  addBulletList(solution, [
    "NLP-based text classifier predicts Real / Fake / Misleading labels.",
    "Source credibility module scores publisher trustworthiness.",
    "Unified confidence score (0–100) supports quick user decisions.",
    "Transparent explanations highlight contributing text and source signals.",
    "Delivered through a responsive web app and browser extension.",
  ]);

  const poc = pptx.addSlide();
  addHeader(poc, "PROOF OF CONCEPT");
  poc.addText("Model F1 Comparison", {
    x: 0.8,
    y: 1.05,
    w: 4,
    h: 0.4,
    fontFace: "Aptos",
    fontSize: 19,
    bold: true,
    color: COLORS.text,
  });

  const bars = [
    { label: "LR", score: 0.84, color: COLORS.slate },
    { label: "SVM", score: 0.87, color: COLORS.slate },
    { label: "RF", score: 0.89, color: COLORS.slate },
    { label: "BERT", score: 0.94, color: COLORS.cyan },
  ];

  bars.forEach((bar, idx) => {
    const x = 1 + idx * 1.45;
    const h = (bar.score - 0.75) * 8;
    const y = 5.9 - h;
    poc.addShape("rect", {
      x,
      y,
      w: 0.95,
      h,
      fill: { color: bar.color },
      line: { color: bar.color },
      radius: 0.06,
    });
    poc.addText(bar.label, {
      x,
      y: 6.05,
      w: 0.95,
      h: 0.3,
      align: "center",
      fontFace: "Aptos",
      fontSize: 12,
      color: COLORS.text,
      bold: true,
    });
    poc.addText(bar.score.toFixed(2), {
      x,
      y: y - 0.24,
      w: 0.95,
      h: 0.25,
      align: "center",
      fontFace: "Aptos",
      fontSize: 11,
      color: COLORS.text,
      bold: true,
    });
  });

  poc.addShape("line", {
    x: 0.86,
    y: 5.95,
    w: 6.1,
    h: 0,
    line: { color: COLORS.border, pt: 1.25 },
  });

  poc.addShape("roundRect", {
    x: 7.35,
    y: 1.2,
    w: 5.1,
    h: 5.2,
    fill: { color: COLORS.white },
    line: { color: COLORS.border, pt: 1 },
    radius: 0.08,
  });
  poc.addText("Evaluation Snapshot", {
    x: 7.75,
    y: 1.55,
    w: 3.6,
    h: 0.4,
    fontFace: "Aptos",
    fontSize: 18,
    bold: true,
    color: COLORS.text,
  });
  addBulletList(
    poc,
    [
      "Dataset-based training + validation (stratified splits).",
      "Best model: BERT with F1 = 0.94.",
      "Metrics tracked: Accuracy, Precision, Recall, F1, ROC-AUC.",
      "Confusion matrix validates balanced performance.",
    ],
    7.72,
    2.1,
    4.5,
    3.9,
  );

  const mvp = pptx.addSlide();
  addHeader(mvp, "MVP (MINIMUM VIABLE PRODUCT FEATURES)");
  addBulletList(mvp, [
    "Text and URL input for news verification.",
    "AI output: Real / Fake / Misleading + confidence score.",
    "Source credibility badge and explanation module.",
    "Recent checks dashboard for user history.",
    "Browser extension prototype for one-click validation.",
  ]);

  const conclusion = pptx.addSlide();
  addHeader(conclusion, "CONCLUSION");
  addBulletList(conclusion, [
    "The system helps prevent misinformation spread through rapid checks.",
    "NLP + source credibility fusion improves reliability and trust.",
    "The project supports media literacy and responsible sharing behavior.",
    "Future scope: multilingual support and multimodal fake-news detection.",
  ]);

  await pptx.writeFile({ fileName: "Fake-News-Detection-Deck.pptx" });
};

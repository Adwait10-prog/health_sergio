// Rian Tech Roadmap — strategic theme definitions (H2 2026)
// The themes + Now/Next/Later items are authored strategy (not derivable from Asana).
// Each item can carry `match` keywords used to link it to live Asana tickets for grounding.

export type ThemeStatus = "critical" | "active" | "planned" | "upcoming";
export type ItemState = "done" | "in_progress" | "todo";

export interface RoadmapItem {
  label: string;
  state: ItemState;
  // keywords to fuzzy-match against live Asana task names/sections for grounding
  match?: string[];
}

export type Tier = "focus" | "supporting";

export interface RoadmapTheme {
  id: number;
  name: string;
  emoji: string;
  status: ThemeStatus;
  tier: Tier;
  objective: string;
  whyItMatters: string[];
  successMetrics: string[];
  now: RoadmapItem[];
  next: RoadmapItem[];
  later: RoadmapItem[];
  risks: string[];
  owner: string;
  // Asana projects this theme draws evidence from (for live ticket counts)
  projects?: string[];
}

// R&D pipeline — stage axis instead of Now/Next/Later (honest grammar for research).
export type RndStage = "exploring" | "validating" | "productizing" | "graduated";

export interface RndTrack {
  name: string;
  stage: RndStage;
  what: string;   // what it is
  why: string;    // why it matters
  match?: string[]; // keywords to link live Asana tickets
}

export interface HealthMetric {
  label: string;
  status: "critical" | "active" | "planned" | "upcoming";
  statusText: string;
  target: string;
}

export interface TimelineMonth {
  month: string;
  items: { emoji: string; label: string }[];
}

export const PRIORITIES = [
  "Recipe Cloud Self-Serve Launch",
  "Website Translation Demo",
  "Rian Recipe STS — Phase I automation",
  "Secrets Manager Rollout",
  "Translation Quality & Infra",
  "Enterprise / AI Platform (later)",
];

export const HEALTH_METRICS: HealthMetric[] = [
  { label: "Rian Recipe (STS Tool)",      status: "active",   statusText: "Phase I — active dev", target: "Automated QC loop" },
  { label: "Self-Serve Launch Readiness", status: "critical", statusText: "92% · UX testing",     target: "100% live" },
  { label: "Website Translation MVP",     status: "critical", statusText: "Demo scheduled",       target: "Pilot ready" },
  { label: "Translation Quality Program", status: "active",   statusText: "Active",               target: "Enterprise grade" },
  { label: "Infrastructure Cost Reduction", status: "planned", statusText: "Planned",             target: "−40% cost" },
  { label: "Enterprise / AI Platform",    status: "upcoming", statusText: "Upcoming",             target: "Q4" },
];

export const THEMES: RoadmapTheme[] = [
  {
    id: 1,
    name: "Rian Recipe — STS Tool",
    emoji: "🎙️",
    status: "active",
    tier: "focus",
    objective: "Enhance the core Speech-to-Speech dubbing tool — the flagship product. Automate the manual QC/ingestion loop and ship new features (per the Tech Roadmap).",
    whyItMatters: [
      "The STS tool is Rian's core revenue product (the Recipe Method)",
      "Manual QC handoff & cross-referencing are the biggest time sinks today",
      "Faster, automated dubbing loop = higher delivery throughput & margin",
    ],
    successMetrics: [
      "Box export loop closes (no manual re-upload)",
      "Missing-dialogue detection live — auto timestamps",
      "Editor fast enough for vendors (no platform-hopping)",
      "Weekly release cadence with safe rollback",
    ],
    now: [
      { label: "Phase 0 ✓ — Quick STS, Box import, track downloads (live)", state: "done", match: ["quick sts", "track download"] },
      { label: "Export to Box (Rian API) — two-way sync", state: "in_progress", match: ["export to box", "box integration"] },
      { label: "Missing Dialogue Detection (script→waveform)", state: "in_progress", match: ["missing dialogue", "missing dialogue identification"] },
      { label: "STS Editor enhancements + speed/perf", state: "in_progress", match: ["sts editor enhancements", "sts editor", "recipe cloud discussion"] },
    ],
    next: [
      { label: "Character creation from script", state: "todo", match: ["character creation"] },
      { label: "Automated track renaming (waveform, human-in-loop)", state: "todo", match: ["track renaming", "automated track"] },
      { label: "Contextual workflows (embedded iframes)", state: "todo", match: ["contextual workflow", "iframe"] },
      { label: "Automated end-cut QC before vendor submission", state: "todo", match: ["end-cut", "audio qc"] },
    ],
    later: [
      { label: "Weekly release cycle (4wk → 1wk) + auto-rollback", state: "todo", match: ["release cycle"] },
      { label: "Sprint fixes — pagination, Speaker Boost defaults", state: "todo" },
      { label: "Full autopilot track renaming (post-calibration)", state: "todo" },
    ],
    risks: [
      "Track-renaming autopilot needs human-in-loop calibration first (2–3 episodes)",
      "Weekly release cadence requires safe DB-migration + rollback infra before turning on",
    ],
    owner: "Adwait / Saijash · sync w/ Sumant on timeline",
    projects: ["Media Squad", "Core Engineering", "Recipe Cloud"],
  },
  {
    id: 2,
    name: "Self-Serve Launch",
    emoji: "🚀",
    status: "critical",
    tier: "focus",
    objective: "Launch the first self-serve version of Rian and validate real customer acquisition.",
    whyItMatters: [
      "First recurring revenue channel",
      "Product-market validation",
      "Reduced sales dependency",
      "Usage analytics foundation",
    ],
    successMetrics: [
      "First 10 paying users",
      ">90% successful job completion",
      "<5% async processing failure rate",
      "Avg translation completion <15 min",
    ],
    now: [
      { label: "Pricing & plan structure finalized", state: "done" },
      { label: "UX testing (17 Jun)", state: "in_progress", match: ["self serve", "pre-launch", "self-serve"] },
      { label: "Lambda audio pipeline validation", state: "in_progress", match: ["lambda function - audio", "audio processing"] },
      { label: "Launch monitoring & error tracking", state: "todo" },
      { label: "First customer support flows", state: "todo" },
    ],
    next: [
      { label: "Subscription management", state: "todo" },
      { label: "Usage metering", state: "todo" },
      { label: "Customer analytics", state: "todo" },
      { label: "Upgrade / downgrade flows", state: "todo" },
    ],
    later: [
      { label: "Team accounts", state: "todo" },
      { label: "API access", state: "todo" },
      { label: "White-label plans", state: "todo" },
    ],
    risks: ["Async batch failures", "Processing delays", "Onboarding confusion"],
    owner: "Engineering + Product",
    projects: ["Recipe Cloud"],
  },
  {
    id: 3,
    name: "Translation Quality Platform",
    emoji: "🎯",
    status: "active",
    tier: "supporting",
    objective: "Create industry-leading translation quality and consistency — Rian's primary moat.",
    whyItMatters: [
      "Quality directly drives customer retention",
      "Gates enterprise adoption",
      "Protects brand reputation & premium pricing",
    ],
    successMetrics: [
      "Improved QA scores",
      "Reduced manual corrections",
      "Reduced hallucinations",
      "Higher customer satisfaction",
    ],
    now: [
      { label: "OCR Phase 4 → DT module integration", state: "in_progress", match: ["ocr + image translation — phase 4", "ocr"] },
      { label: "MT pipeline improvements", state: "in_progress" },
      { label: "QC confidence flags (<50%)", state: "in_progress", match: ["confidence", "flag translation"] },
      { label: "Evaluation dataset & benchmarking", state: "todo" },
    ],
    next: [
      { label: "Translation memory", state: "todo" },
      { label: "Terminology management", state: "todo" },
      { label: "Human review workflows", state: "todo" },
      { label: "Unify 3 OCR pipelines", state: "todo" },
    ],
    later: [
      { label: "Domain-specific models", state: "todo" },
      { label: "Adaptive pipelines", state: "todo" },
      { label: "Japanese voice transcription", state: "todo", match: ["japanese voice"] },
    ],
    risks: ["Model provider dependency", "GPU capacity", "Eval framework maturity"],
    owner: "Adwait / Rugved / Rohit",
    projects: ["Core Engineering", "Updates"],
  },
  {
    id: 4,
    name: "Infrastructure & Cost Optimization",
    emoji: "⚙️",
    status: "planned",
    tier: "supporting",
    objective: "Improve margins through infrastructure ownership — convert paid-API spend into owned infra.",
    whyItMatters: [
      "Current vendor costs scale linearly with volume",
      "Ownership improves margins, scalability, reliability",
      "Self-hosting is also a ZDR / security win for TPN clients",
    ],
    successMetrics: [
      "30–40% reduction in vendor spend",
      "Faster processing",
      "Reduced external dependency",
    ],
    now: [
      { label: "AWS cost observability dashboard", state: "in_progress", match: ["aws cost"] },
      { label: "GCP / GPU credits provisioning", state: "in_progress", match: ["gcp credits"] },
    ],
    next: [
      { label: "TTS+ Phase 3 — MOSS-TTS into pipeline", state: "todo", match: ["tts+ — phase 3"] },
      { label: "OCR cost validation (25–50×)", state: "todo" },
      { label: "GPU usage analytics", state: "todo" },
      { label: "Cache layer", state: "todo" },
    ],
    later: [
      { label: "Self-hosted custom models", state: "todo" },
      { label: "Hybrid inference", state: "todo" },
      { label: "Multi-region deployment", state: "todo" },
    ],
    risks: ["Premature optimization before revenue validation", "MOSS-TTS must be QC-equivalent before displacing ElevenLabs"],
    owner: "Adwait / Vishal / Saijash",
    projects: ["Core Engineering"],
  },
  {
    id: 5,
    name: "Enterprise Readiness",
    emoji: "🏢",
    status: "upcoming",
    tier: "supporting",
    objective: "Prepare Rian for larger enterprise contracts (TPN-framework clients: Amazon, Disney+, JioStar).",
    whyItMatters: [
      "Enterprise deals require security, governance, auditability",
      "Reliability is a sales prerequisite, not a nice-to-have",
    ],
    successMetrics: [
      "Enterprise compliance checklist",
      "Security review pass",
      "Audit logging coverage",
    ],
    now: [
      { label: "AWS Secrets Manager rollout (KEY UNBLOCKER)", state: "in_progress", match: ["secret key manager", "secrets manager"] },
      { label: "Dev/Test/Stage/Prod env files", state: "in_progress", match: ["environment files"] },
    ],
    next: [
      { label: "CloudWatch alerting on async chain", state: "todo" },
      { label: "Audit logging", state: "todo" },
      { label: "RBAC", state: "todo" },
      { label: "Enterprise billing & contract controls", state: "todo" },
    ],
    later: [
      { label: "Multi-tenancy", state: "todo" },
      { label: "SSO / SCIM", state: "todo" },
      { label: "Data residency & compliance certs (TPN)", state: "todo" },
    ],
    risks: ["Secrets Manager blocks AI Platform + this theme — sequence it first"],
    owner: "Saijash",
    projects: ["Core Engineering"],
  },
  {
    id: 6,
    name: "AI Platform Expansion",
    emoji: "🤖",
    status: "upcoming",
    tier: "supporting",
    objective: "Increase engineering velocity, then expand Rian into an AI content-operations platform.",
    whyItMatters: [
      "Faster engineering org via AI-assisted dev",
      "Longer-arc bet: Rian as an agent-callable capability",
      "Creates future revenue surfaces",
    ],
    successMetrics: [
      "PRDs consistently ≥3.5 on Sufficiency Check",
      "Mechanical issues caught pre-review",
      "Faster cycle time",
    ],
    now: [
      { label: "AI-Assisted Dev Phase 3 — CI/CD review", state: "in_progress", match: ["ai-assisted dev adoption — phase 3"] },
    ],
    next: [
      { label: "PRD Pipeline v1 GA (Stages 1–6)", state: "todo", match: ["prd"] },
      { label: "Automated testing expansion", state: "todo" },
      { label: "Agent orchestration framework", state: "todo" },
    ],
    later: [
      { label: "Agent-first callable-capability spike", state: "todo", match: ["agent-first"] },
      { label: "Multi-agent systems", state: "todo" },
      { label: "Enterprise AI workspaces / AI Studio", state: "todo" },
    ],
    risks: ["Self-referential dependency on Secrets Manager", "Agent-first stays a bet: one spike, one decision gate"],
    owner: "Adwait / Ojas / Anand",
    projects: ["Core Engineering"],
  },
  {
    id: 7,
    name: "Website Live Translation",
    emoji: "🌐",
    status: "critical",
    tier: "focus",
    objective: "Validate website localization as a new product category — client owns 100% of translation data.",
    whyItMatters: [
      "New market expansion",
      "High-value enterprise opportunity",
      "Strong upsell path · own-your-data wedge vs Reverie",
    ],
    successMetrics: [
      "Successful demo (week of 23 Jun)",
      "Pilot customer secured",
      "MVP validation",
    ],
    now: [
      { label: "Demo preparation (week of 23 Jun)", state: "in_progress" },
      { label: "Snippet injection workflow", state: "in_progress" },
      { label: "QC layer", state: "in_progress" },
      { label: "Single language-pair support", state: "in_progress" },
    ],
    next: [
      { label: "Pilot customer deployment", state: "todo" },
      { label: "Feedback collection", state: "todo" },
      { label: "Quality monitoring", state: "todo" },
    ],
    later: [
      { label: "Multi-language support", state: "todo" },
      { label: "CMS integrations", state: "todo" },
      { label: "Dynamic content translation", state: "todo" },
    ],
    risks: [
      "⚠ Scope creep — a successful demo may pressure features beyond MVP",
      "Guardrail: snippet-based · pipeline reuse · QC workflow · one language pair · no custom infra before pilot",
    ],
    owner: "Adwait",
    projects: ["Core Engineering"],
  },
];

// R&D pillar — concentrated on owning the voice & audio pipeline our margins depend on.
export const RND_THESIS =
  "Rian's R&D is concentrated on owning the voice & audio pipeline our margins depend on — from training data, to synthesis, to QC. Each track graduates into a product theme as it matures.";

export const RND_TRACKS: RndTrack[] = [
  {
    name: "TTS+ / MOSS-TTS",
    stage: "validating",
    what: "Self-hosted voice generation stack evaluated as an ElevenLabs alternative.",
    why: "Voice synthesis is the single largest per-call API dependency — owning it changes our margin structure at scale.",
    match: ["tts+", "moss-tts", "moss tts"],
  },
  {
    name: "Hybrid TTS + Human Dubbing",
    stage: "exploring",
    what: "AI voice + targeted human performance to hit broadcast quality at lower cost than full human dubbing.",
    why: "Attacks per-minute cost on the highest-volume service while protecting the Amazon/Disney quality bar.",
    match: ["hybrid tts", "hybrid"],
  },
  {
    name: "Missing Dialogue Detection",
    stage: "validating",
    what: "Aligns source script against the audio waveform to auto-flag dropped or unrecorded dialogue.",
    why: "Missed segments are a recurring QC failure caught manually today — automating removes a defect class.",
    match: ["missing dialogue"],
  },
  {
    name: "OCR + Image Translation",
    stage: "productizing",
    what: "Document/image translation: extract text → translate → re-render at original coordinates.",
    why: "Technical core of the DT product line; ~25–50× cheaper than per-image API translation.",
    match: ["ocr", "image translation"],
  },
  {
    name: "STTS Training Data Pipeline",
    stage: "exploring",
    what: "Dataset curation + prep that feeds custom speech-to-speech model training.",
    why: "Every self-hosted model ambition (TTS+, hybrid) is gated on clean, well-structured training data.",
    match: ["data pipeline", "sttS", "stts"],
  },
  {
    name: "SRT + Translation Prototype",
    stage: "validating",
    what: "Claude-based subtitle generation + transcreation, tested on Shochiku / Tarak Mehta content.",
    why: "Fastest path to a near-term subtitle product; proving ground for subtitle automation before human QC.",
    match: ["srt", "subtitle"],
  },
  {
    name: "Website Live Translation",
    stage: "graduated",
    what: "1-tag website localization, client-owned data, Rian QC. Now a focus product.",
    why: "Proof the pipeline works: graduated R&D → product. Demo this week.",
    match: ["website live translation", "live translation"],
  },
  {
    name: "Recipe Cloud Self-Serve",
    stage: "graduated",
    what: "Product-led self-service motion. Past research, now launching.",
    why: "Tests whether the tech sells without a sales team. Graduated R&D → product.",
    match: ["self serve", "self-serve"],
  },
];

export const RND_STAGE_ORDER: RndStage[] = ["exploring", "validating", "productizing", "graduated"];
export const RND_STAGE_LABEL: Record<RndStage, string> = {
  exploring: "Exploring", validating: "Validating", productizing: "Productizing", graduated: "Graduated",
};

export const RISK_REGISTER = {
  high: ["Self-serve launch stability", "Website translation demo scope"],
  medium: ["Vendor costs", "Translation quality consistency"],
  low: ["Enterprise readiness", "Future AI expansion"],
};

export const TIMELINE: TimelineMonth[] = [
  {
    month: "June 2026",
    items: [
      { emoji: "🚀", label: "Recipe Cloud launch" },
      { emoji: "🧪", label: "UX testing" },
      { emoji: "🔍", label: "Launch monitoring" },
      { emoji: "🌐", label: "Website translation demo" },
    ],
  },
  {
    month: "July 2026",
    items: [
      { emoji: "🔐", label: "Secrets Manager" },
      { emoji: "📚", label: "Translation memory" },
      { emoji: "🌐", label: "Website translation pilot" },
    ],
  },
  {
    month: "August 2026",
    items: [
      { emoji: "⚙️", label: "Infrastructure optimization" },
      { emoji: "📊", label: "Cost analytics" },
      { emoji: "🏢", label: "Enterprise controls" },
    ],
  },
  {
    month: "September 2026",
    items: [
      { emoji: "🤖", label: "AI workflow framework" },
      { emoji: "🧠", label: "Agentic systems foundation" },
      { emoji: "📈", label: "Platform expansion planning" },
    ],
  },
];

// All Asana project names the roadmap is aware of (for triage scanning).
// Tickets in these projects that don't match any theme keyword surface in "Needs triage".
export const ALL_TRACKED_PROJECTS = [
  "Core Engineering",
  "Recipe Cloud",
  "Updates",
  "Media Squad",
  "Media Rian",
  "Japan Market Entry",
  "Brand Guidelines & Messaging",
];

export const CTO_COMMENTARY = {
  intro: "Current strategy prioritizes revenue validation before platform expansion.",
  next60: [
    "Successful self-serve launch",
    "Successful website translation demo",
    "Maintaining quality while avoiding scope creep",
  ],
  mantra: "If it doesn't help launch, validate, retain customers, or improve margins, it is not a priority right now.",
};

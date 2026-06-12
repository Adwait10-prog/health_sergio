# Rian.io — Business Reference Document
> Rikaian Technology Pvt. Ltd. | Confidential Internal Reference

---

## 1. Company Overview

**Rian.io** is a media localization company offering AI-human hybrid services across dubbing, subtitling, audio description, closed captioning, and document translation in 60+ languages.

- **Founded by:** Rian (CEO), after 10+ years in Japan
- **Headquarters:** Pune, India
- **Satellite office:** Tokyo, Japan
- **Legal entity:** Rikaian Technology Pvt. Ltd.
- **Client base:** 300+ global clients
- **Core philosophy:** AI efficiency + human quality — the "hybrid model"
- **Proprietary pipeline:** The **Recipe Method** (dubbing workflow)
- **Internal platform:** **VOX** (not used in public-facing materials)

---

## 2. Product Vision

### 2.1 VOX Platform
VOX is Rian's internal operational platform powering all localization workflows. It is the backbone for project management, subtitle editing, voice-over delivery, and QC.

Key VOX modules and recent development:
- **STS Editor** — Subtitle-to-Speech editor with voice setting sliders (Stability, Similarity), STSModal, and progress bar
- **Markers & Comments** (VOX-PRD-2026) — annotation layer for STS workflows
- **Missed Dialogue Detection** (VOX-PRD-2026-013) — VAD-based script-to-stems comparison to catch undubbed lines
- **Box Cloud Integration** (v3.1) — file management via Box API, scoped to Rian Recipe
- **Keyboard Shortcuts** — Alt+S for split row; broader shortcut PRD in progress
- **VO Billing Module** — Individual Segment Audio added as a Trigger 2 billing event

### 2.2 Recipe Method
The proprietary dubbing pipeline. Positions Rian's AI-human hybrid approach as methodologically distinct — not a commodity AI tool or a traditional dubbing house. Not referenced externally as "SaaS" or AI-only.

### 2.3 Engineering Methodology
**Spec-Driven Development** with PRD Sufficiency Checks across four axes:
- **Clarity** — Is the requirement unambiguous?
- **Feasibility** — Can it be built within constraints?
- **Scope** — Is it bounded and deliverable?
- **Testability** — Can acceptance criteria be verified?

Minimum average score: **≥ 3.5** across axes before development begins.

### 2.4 PRD Pipeline Tool (In Development)
A 12-stage internal PRD generation tool being built in React + Node.js.
- Human-in-the-loop at every stage
- Knowledge Base backed by RAG over VOX source, past PRDs, client constraints
- Asana comment sync for task-linked PRD tracking
- V1 scoped to Stages 1–6, session-only, no database
- **Team:** Ojas (PRD writing), Adwait (frontend tech lead), Saijash (engineering)

### 2.5 AI / TTS R&D
- **MOSS-TTS 8B** — evaluated as a self-hosted ElevenLabs alternative (zero-shot cloning, multilingual, ZDR-by-design)
- **ElevenLabs** — IVC/PVC voice cloning; speech-to-speech Voice Changer API in active use
- **R&D Tracks:** TTS+ (Vishal Kaushal, intern), OCR + Image Translation (Rugved Myakal)
- **Document pipeline:** Google Vision API + Azure Document Intelligence + Mistral OCR

### 2.6 OTT Accessibility Opportunity
India's MIB draft OTT guidelines (October 2025) propose **mandatory audio description and closed captioning** — a significant near-term market expansion for Rian's AD pipeline.

---

## 3. Team Structure

| Name | Role | Scope |
|---|---|---|
| **Rian** | Founder & CEO | Strategy, BD, client relationships, product direction |
| **Saijash** | CTO | Engineering leadership, AWS/IAM infrastructure |
| **Adwait Natekar** | Tech Lead / Dev Lead | Architecture, code review, deployment, frontend |
| **Ashish Shinde** | CBO / CSO | Business & commercial — media only (not corporate document translation) |
| **Sumant Jamdar** | Delivery / Operations | Project delivery, operations management |
| **Ojas** | Product | PRD writing, product requirements |
| **Rohit** | QC Lead | Quality control oversight |
| **Radha Kulkarni** | BD | Korea market outreach, B2B prospecting |
| **Amruta Soundalgekar** | QC Analyst | Shochiku project QC (HP contractor) |
| **Vishal Kaushal** | R&D Intern | TTS+ track |
| **Rugved Myakal** | R&D | OCR + Image Translation |

> **Note:** "Rian" appearing alongside Saijash in Lambda/AWS work session notes refers to **Adwait**, not Rian the CEO. These are two different people — do not conflate.

---

## 4. Infrastructure & Engineering Stack

| Layer | Technology |
|---|---|
| CDN / Security | AWS CloudFront + WAF (IP allowlist) |
| API Layer | AWS API Gateway |
| Compute | AWS Lambda |
| Database | Amazon Aurora MySQL |
| DB Proxy | RDS Proxy with IAM Auth |
| Secrets | AWS Secrets Manager |
| Logging | Logstash + OpenSearch |
| Alerting | CloudWatch on `level:error` |
| Backend API | RianAPI (ASP.NET Core Web API) |
| Email Services | RianEmailTranslationService |
| Build Pipeline | Jenkins (.NET/C#, NuGet, MSBuild) |

**Mumbai Studio:** 704 sq ft, 5–6 staff, Blazenet + Airtel ISP, TPN certification in progress.  
**Tokyo office:** No shared content infrastructure with Pune.

---

## 5. Client Context

### 5.1 Major Clients

| Client | Relationship | Services |
|---|---|---|
| **Amazon Prime Video** | Vendor (TPN framework) | Dubbing, subtitling, CC |
| **Disney+ Hotstar** | Active client | Localization services |
| **JioStar** | Active client | Localization services |
| **TV Tokyo** | Active client (Japan) | Subtitling, localization |
| **Shochiku** | Active client (Japan) | Subtitling, CC, SDH, curation |

### 5.2 Shochiku Projects
Active slate includes: *Le Chevalier D'Eon*, *ARIA The AVVENIRE*, *Izetta*, *Captain Earth*, and others.

- **Gintama:** Timecoding (150 episodes)
- **QC:** 91 Days, Tamayura, Madan Senki RyuKendo
- **QC Parameters:** CPL ≤32, duration 1–7s, gap ≥100ms; reading speed excluded per Shochiku override

### 5.3 Amazon Vendor Security
- TPN (Trusted Partner Network) framework compliance documentation produced
- AI sub-processor disclosure: two-document strategy
  - **Version A:** AI governance document
  - **Version B:** Human-led workflow document

### 5.4 Eventus (Internal Tooling Client)
- Jira board L2 Execution Visibility Dashboard
- Assignment Intelligence panel: IDF-weighted expertise scoring, admin-only access controls

### 5.5 IP / Content Owned or Operated
- Content acquired from **Reliance Animation**
- **Bonobono** — Eiken license with FTB Communications
- **Kamen Rider** — Dubbing active
- **Neela Films (TMKCC)** — Dubbing negotiated; contains AI-prohibition clause (flagged as critical risk)

---

## 6. Sales & Business Development

### 6.1 Service Offerings
| Service | Notes |
|---|---|
| AI-Human Hybrid Dubbing | Recipe Method; Premium & Normal grades |
| Subtitling | SDH, CC, curated |
| Audio Description (AD) | India cost model: ₹200/min |
| Closed Captioning | MIB compliance opportunity |
| Document Translation | PDF, Word; separate from media BD |
| OCR + Image Translation | R&D stage (Rugved) |

### 6.2 Revenue Tracking
- Excel-based pipeline tracker (Rian_Revenue_Tracker)
- Columns: Q2/Q3 forecasts
- Probability tiers: Committed / High / Mid
- Dropdown validations for consistency

### 6.3 Korea B2B Outreach
**Lead:** Radha Kulkarni | **Calendly:** https://calendly.com/radha-kulkarni-rian/30min

**Active assets:**
- Korea stakeholder Excel: 73+ companies, ~71 direct contacts
- Korea_Response_Database: 442 contacts, 25 companies (analysis ongoing)

**Discovery engine (primary):** Event/market attendee lists — signals budget and intent.
- Key events: TIFFCOM, ATF, FILMART, BCWW, MIPCOM, Annecy/MIFA

**Targeting rules:**
- Tag each company: EXPORTER (producer) or IMPORTER (acquirer)
- Pitch both angles in every email regardless of tag:
  1. Korean localization of foreign content — faster and lower cost
  2. Taking Korean content to global markets — quality safeguarded
- Exclude localization competitors (Iyuno, Keywords, ZOO Digital, GloZ, Deluxe, etc.)
- Position Rian as a **global partner** (60+ languages, all markets) — not India-specific

**Email rules:**
- Open warm with a shared observation before introducing Rian
- No em dashes; simple, formal-but-natural language
- Bold key points
- Subject format: `Topic: Rian.io × [Company Name]`
- Include Calendly link in every CTA
- Do not lead with India market or Indian languages as the hook

**Samsung TV Plus:** Referral / partner angle only — not a direct vendor pitch.

**Creek & River Entertainment (Korea):** Meeting set; Salil Vaidya speaking Japanese.

### 6.4 India Market — Engineering IT Firms
Active outreach to:
- Cyient, Birlasoft, KPIT, LTTS, Tata Elxsi, Tata Technologies

Angle: Document translation and localization services for global operations.

> **Note:** Ashish Shinde (CBO/CSO) is media-focused only — do not loop into corporate document translation opportunities.

### 6.5 Positioning Rules (All Markets)
- Never describe VOX externally
- Never use "SaaS" in AI dubbing context
- Position as a global partner, not an India-specific vendor
- The Recipe Method is the differentiator, not just AI

---

## 7. Editorial & Communication Standards

| Rule | Detail |
|---|---|
| No em dashes | Across all written output and outreach |
| No "SaaS" | Do not use in AI dubbing or media context |
| "VOX" is internal | Never use in public-facing materials |
| No India-first framing | Korea outreach positions Rian globally |
| Warm open | Korea emails must start with shared observation, not Rian's agenda |
| Bold key points | All Korea outreach emails |
| Subject format | `Topic: Rian.io × Company` |

---

*Last updated: June 2026 | Internal use only — Rikaian Technology Pvt. Ltd.*

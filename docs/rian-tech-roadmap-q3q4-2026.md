# Rian — Engineering Roadmap, H2 2026

**Owner:** Adwait Natekar (Tech Lead) · **CTO:** Saijash · **Window:** Jul–Dec 2026 (12-month view where noted)
**Lens:** Strategic themes → Now / Next / Later. Every initiative maps to a business outcome.
**Source of truth:** Asana (Core Engineering, Recipe Cloud, Updates) + tech/business context
**Last grounded against Asana:** 16 Jun 2026 · **Updated:** 17 Jun 2026 (self-serve launch + live-translation demo)

> Organized by **why we're building**, not what product it belongs to. Each theme has a goal, an owner, and a Now/Next/Later sequence. The Asana tickets are the evidence underneath each line.

---

## The thesis

H1 2026 was **build-and-prove**: the STS Editor shipped and four R&D tracks (OCR, TTS+, Website Live Translation, AI-Assisted Dev) went from research to near-production. H2 2026 is **earn-and-harden** — turn that engineering into (1) self-serve revenue, (2) defensible translation quality, (3) better margins via self-hosting, (4) enterprise-grade reliability, and (5) a faster engineering org. The financial spine running through it all: **convert paid-API spend into owned infrastructure** (in-house OCR at 25–50× savings, self-hosted MOSS-TTS vs ElevenLabs).

---

## Themes at a glance

| # | Theme | Business goal | Now (Q3 early) | Next (Q3–Q4) | Later (Q4+/2027) | Lead |
|---|-------|---------------|----------------|--------------|------------------|------|
| 1 | **Self-Serve Revenue** | Land paying customers without sales touch | **Recipe Cloud launch — UX testing in progress (17 Jun)** | Pricing, metering, billing, onboarding | Team/enterprise plans | Adwait / Saijash |
| 2 | **Translation Quality Leadership** | Best output in the market | OCR Phase 4 → DT module; QC features (confidence flags) | Translation memory, terminology mgmt, image-translation unification | Domain adaptation, JA voice transcription | Adwait / Rugved / Rohit |
| 3 | **Margin & Infra Optimization** | Reduce vendor/API cost | AWS cost dashboard; GCP/GPU credits | TTS+ Phase 3 (MOSS-TTS displaces ElevenLabs); OCR cost validation | Custom in-house models; caching layer | Adwait / Vishal / Saijash |
| 4 | **Enterprise Readiness** | Support TPN/enterprise clients | **Secrets Manager** (unblocker); env files | Monitoring/alerting on async chain; audit logging | Multi-tenancy; security certs (TPN) | Saijash |
| 5 | **AI Platform Expansion** | Engineering velocity + agent-first bet | AI-Assisted Dev Phase 3 (CI/CD review) | PRD Pipeline v1 GA (Stages 1–6) | Agent-first callable-capability decision gate | Adwait / Ojas / Anand |
| 6 | **Website Live Translation** | New product line — own-your-data vs Reverie | **Client demo (week of 23 Jun)** | Phase 3 Sprint 1+2; first pilot | Multi-language, SEO URL pages | Adwait |

---

## Theme 1 — Self-Serve Revenue

**Goal:** A customer can sign up, pay, and run a dubbing/translation job without a salesperson. This is the single biggest revenue-model shift on the board.

**Now (live — 17 Jun)**
- **Recipe Cloud Self-Serve Portal is in final launch.** UX testing in progress today (17 Jun). Immediate focus: close out UX issues from testing, confirm the Lambda audio pipeline (STS/TTS/split/merge/silence) holds under the launch path, ship.
- Post-launch: tight monitoring on the first real self-serve jobs (error rates on the async batch chain, first-job completion rate).

**Next (Q3 → Q4)**
- Pricing model + subscription management.
- Usage metering + billing (tie to existing VO billing triggers — Individual Segment Audio is already a Trigger-2 event).
- User onboarding flow (sign-up → first job).
- PDF/Document translation MVP as a low-friction self-serve entry product (rides on Theme 2's OCR work).

**Later (Q4+)**
- Team plans / seat management.
- Self-serve for enterprise (overlaps Theme 4 multi-tenancy).

**Risk:** Recipe Cloud Lambda audio pipeline is incomplete and gates everything here. **Neela Films AI-prohibition clause** — self-serve must not auto-route prohibited content through AI paths.

---

## Theme 2 — Translation Quality Leadership

**Goal:** Output quality is the differentiator (the "human quality" half of the AI-human hybrid). This is what protects premium pricing and TPN-grade clients.

**Now (early Q3)**
- **OCR + Image Translation Phase 4** → production: C# port, Angular UI with human-in-the-loop bounding-box curation, SQS→Lambda queue, integration into the **DT module** (Phases 1–3 complete; Phase 4 in flight, due 16 Jun).
- **QC features in the editor:** confidence-score column, flag translations <50% confidence, reject guided tracks with duration mismatch (carry v25.1 UAT items into steady state).

**Next (Q3 → Q4)**
- **Translation Memory** — reuse approved translations across jobs (quality + speed + cost compounding).
- **Terminology management** — client/domain glossaries enforced at translation time.
- Unify the three OCR pipelines (Azure DI, Adobe OCR, Image-to-Image) into one DT-module entry point.
- Human review workflows formalized (the QC-Lead loop, Rohit).

**Later (Q4+)**
- Domain adaptation / fine-tuned terminology per vertical.
- **Japanese voice translation & transcription for support calls** (Gautam Kulkarni request) — JA→EN near-real-time; also the forcing function for Theme 5's agent-first spike.

**Risk:** DT-module integration needs Saijash's infra sign-off on the SQS→Lambda queue.

---

## Theme 3 — Margin & Infrastructure Optimization

**Goal:** Turn recurring paid-API spend into owned infrastructure. Directly improves gross margin per minute/page and de-risks vendor dependency.

**Now (early Q3)**
- **AWS cost periodic review / dashboard** (Pranav's ticket) — compute/storage breakdown, margin impact per product line, pending-credits tracking.
- **GCP credits** (Nikhil, due 17 Jun) + AWS GPU compute provisioning for self-hosted inference.

**Next (Q3 → Q4)**
- **TTS+ Phase 3:** integrate MOSS-TTS into the Recipe pipeline to **replace/complement the ElevenLabs STS/TTS call** (Phase 1–2 complete; pitch/speed/accent consistency via Vishal's F0/energy/DTW pipeline; gated on Tech Lead architecture review).
- **OCR cost validation:** prove the **25–50× saving** ($0.002 vs $0.05–0.10/image vs ImageTranslate API) at production volume.
- Route a measured % of STS/TTS volume through MOSS-TTS; track ElevenLabs spend reduction.

**Later (Q4+)**
- Custom in-house voice/OCR models tuned to Rian's content.
- Caching layer (translation cache, OCR result cache) for repeat-content economics.

**Risk:** Don't displace ElevenLabs until MOSS-TTS is **QC-equivalent** — quality regression here hits Theme 2. Cost-saving claims are financial-model inputs — validate with real production numbers, not benchmarks. (Self-hosting is also a *security* win: ZDR-by-design for AI-prohibition-clause and TPN clients — credit it in Theme 4 too.)

---

## Theme 4 — Enterprise Readiness

**Goal:** Be a reliable, auditable, secure vendor for TPN-framework and enterprise clients (Amazon Prime, Disney+ Hotstar, JioStar). Reliability is a sales prerequisite, not a nice-to-have.

**Now (early Q3)**
- **AWS Secrets Manager rollout** — move all API keys (ElevenLabs + MT engines: Google/Microsoft/Amazon/DeepL/ChatGPT) out of code. **This is the single highest-leverage unblocker on the whole roadmap** — it gates AI-Assisted Dev Phase 3 (Theme 5) and is a TPN security-audit item. Do it first.
- Complete Dev/Test/Stage/Prod environment files (Planning/Scoping ticket exists).

**Next (Q3 → Q4)**
- CloudWatch alerting coverage on the async batch chain (STS/merge/download failures — the `STSRAT`/`MPRATS`/`DRAT` path).
- Audit logging for client-data access (TPN requirement).
- RDS Proxy / Aurora load validation for self-serve concurrency.

**Later (Q4+)**
- Multi-tenancy (shared infra, isolated client data) — prerequisite for enterprise self-serve.
- Formalize TPN certification + the AI sub-processor two-document disclosure strategy.

**Risk:** Secrets Manager blocks two themes — sequence it as the very first Q3 deliverable.

---

## Theme 5 — AI Platform Expansion

**Goal:** (a) Make the engineering org faster via AI-assisted development, and (b) place the longer-arc bet on Rian becoming an agent-callable capability.

**Now (early Q3)**
- **AI-Assisted Dev Phase 3:** code-review automation in CI/CD — automated pre-review catches mechanical issues so Tech Lead review focuses on architecture + intent. Gated on Phases 1–2 stable **and** Secrets Manager audit clean (Theme 4).

**Next (Q3 → Q4)**
- **PRD Pipeline v1 GA** — React + Node.js, Stages 1–6, human-in-the-loop, RAG over VOX source + past PRDs + client constraints, Asana comment sync. Team: Ojas (PRD), Adwait (FE lead), Saijash (eng). Success metric: PRDs consistently ≥3.5 on the Sufficiency Check.
- Automated testing expansion as AI-assisted dev matures.

**Later (Q4+) — Agent-first bet**
- Spike: expose one Recipe operation (e.g. STS-generate-for-track) as a clean, documented, auth'd callable API — the "products become callable capabilities" thesis (Anand's note). The JA voice-transcription request (Theme 2) is the natural first agent-callable use case.
- **Decision gate (end Q4):** invest in an agent-first API layer in 2027, or park. Don't commit before Themes 1–4 are solid.

**Risk:** Self-referential dependency on Secrets Manager (Theme 4). Agent-first stays a *bet* — one spike, one gate, no premature investment.

---

## Theme 6 — Website Live Translation *(new product line)*

**Goal:** A net-new product — a 1-tag JS snippet that live-translates a client's website, where **the client owns 100% of the translation data** (the wedge against Reverie Anuvadak's all-language-bundle model). New revenue surface, not an extension of the dubbing core.

**Now (week of 23 Jun) — Demo**
- **Client demo next week.** Get the Phase 2 architecture into a demonstrable state: the JS snippet rendering live-translated content with Rian-owned QC in the loop. The demo is the forcing function — it sets the MVP scope and surfaces which of the three open blockers actually matter.

**Next (Q3 → Q4) — Build & pilot**
- Resolve the three blockers exposed by the demo: (1) Rian API capability confirmation (string push/pull), (2) client CDN preference, (3) MVP scope lock.
- **Sprint 1:** core JS snippet + backend API + crawler + MT pipeline.
- **Sprint 2:** Rian integration (string push/pull), change detection, SEO language-URL pages.
- Convert the demo client into the **first paying pilot**.

**Later (Q4+)**
- Multi-language expansion, lazy-loading optimization (vs Reverie's full bundle), SEO URL pages at scale.

**Risk:** Highest scope-creep risk on the board — it's a new product line. Keep the post-demo MVP tight (snippet + QC + one language pair) before chasing multi-language/SEO ambitions. The demo going well will create pressure to over-promise; hold the MVP line. Lean on Theme 2's MT pipeline and Theme 4's platform rather than building parallel infra.

---

## Now / Next / Later — consolidated board

| Theme | **Now** (early Q3) | **Next** (Q3 → Q4) | **Later** (Q4+ / 2027) |
|-------|--------------------|--------------------|------------------------|
| **1 · Self-Serve Revenue** | 🔴 **Recipe Cloud LAUNCHING — UX testing 17 Jun** | Pricing · metering · billing · onboarding · PDF MVP | Team & enterprise plans |
| **2 · Quality Leadership** | OCR Phase 4 → DT; QC confidence flags | Translation memory · terminology · pipeline unification · review workflows | Domain adaptation · JA voice transcription |
| **3 · Margin & Infra** | Cost dashboard · GCP/GPU credits | TTS+ Phase 3 (MOSS-TTS) · OCR cost validation | Custom models · caching layer |
| **4 · Enterprise Readiness** | **Secrets Manager** · env files | Monitoring/alerting · audit logging · DB load test | Multi-tenancy · TPN certification |
| **5 · AI Platform** | AI-Assisted Dev Phase 3 (CI/CD review) | PRD Pipeline v1 GA · automated testing | Agent-first spike → decision gate |
| **6 · Live Translation** | 🔴 **Client demo (week of 23 Jun)** | Sprint 1+2 build · first pilot | Multi-language · SEO URL pages |

---

## Sequencing logic (the critical path)

**Two live launches dominate the next two weeks** — Recipe Cloud self-serve (UX testing today, 17 Jun) and the Website Live Translation client demo (week of 23 Jun). Everything below sequences around protecting those.

1. **Ship Recipe Cloud self-serve (Theme 1)** — in final launch now; close UX issues, confirm Lambda audio holds, monitor first real jobs. This is the revenue-model unlock and it's *this week*.
2. **Nail the Live Translation demo (Theme 6, week of 23 Jun)** — get Phase 2 architecture demonstrable; let the demo set MVP scope and expose the real blockers.
3. **Secrets Manager (Theme 4)** — once the two launches are stable, this is the highest-leverage hardening item: unblocks AI-assisted dev *and* clears a TPN security item.
4. **Land the near-done R&D into production (Themes 2 & 3)** — OCR Phase 4 and TTS+ Phase 3 are due end-June; value is realized only on integration, not research.
5. **Build the self-serve commercial layer (Theme 1)** — pricing/metering/billing through Q3–Q4 on top of the now-launched portal.
6. **Agent-first stays a bet** — one spike, one decision gate at end of Q4.

## Watch-list / cross-theme risks

- **Recipe Cloud launch (17 Jun)** — UX testing in progress; first real self-serve jobs are the live risk. Watch async-batch-chain error rates and first-job completion closely post-launch.
- **Live Translation demo (week of 23 Jun)** — a strong demo will create pressure to over-promise; hold the post-demo MVP tight (snippet + QC + one language pair).
- **Secrets Manager** — blocks both Enterprise Readiness and AI Platform; do it first once launches stabilize.
- **MOSS-TTS quality bar** — Margin theme must not regress Quality theme; QC-equivalent before displacement.
- **Neela Films AI-prohibition clause** — self-serve + TTS must not route prohibited content through AI.
- **Cost-saving claims (OCR 25–50×, TTS self-hosting)** — financial-model inputs; validate with production numbers.
- **Vishal not yet in the Asana workspace** — TTS+ work assignment falls back to Adwait until he's invited and synced.

---

*Generated from live Asana state on 16 Jun 2026. Re-grounded each time tickets move — this doc will become the `/work/roadmap` page in the Personal OS, rendered live from the Asana tables and grouped by strategic theme.*

// Adwait OS — the Q4 operating picture. Authored data (edit here, like the HTML DATA block).
// Checklist items carry stable `id`s so DB tick-state survives relabelling/reordering.

export type Mode = "skeleton" | "block" | "post";
export type Status = "done" | "prog" | "todo" | "parked" | "next";

export interface Countdown { id: string; label: string; date: string | null; text?: string }
export interface ChecklistItem { id: string; label: string }

export const OS = {
  // Mode boundaries
  skeletonEnds: "2026-10-25", // when Saijash's skeleton lands → block mode
  raceDay: "2027-01-17",

  modes: {
    skeleton: { label: "Skeleton mode", hint: "Separation light · front-load ElevenLabs, demo pipeline, cost/min, money work" },
    block:    { label: "Block mode",    hint: "Separation + marathon. Everything else minimal. Lights out 22:00." },
    post:     { label: "Post-race",     hint: "Recover, then restart side streams" },
  } satisfies Record<Mode, { label: string; hint: string }>,

  rules: [
    "Run before work, sleep before 22:30. Everything else is negotiable; these two are the floor.",
    "Corporate gets one slot, not a stream. Monday 16:30 and two owned numbers.",
    "Three things a day, written the night before. If they ship, the day was good.",
  ],

  countdowns: [
    { id: "el-call",      label: "ElevenLabs call with Karthik",              date: null, text: "this week" },
    { id: "blr-dinner",   label: "Founders dinner, Bengaluru — Mati intro",    date: "2026-10-05" },
    { id: "el-summit",    label: "ElevenLabs Summit India",                    date: "2026-10-06" },
    { id: "demo-live",    label: "Demo pipeline live (48h SLA)",               date: "2026-10-07" },
    { id: "delhi-hm",     label: "Vedanta Delhi Half Marathon",                date: "2026-10-18" },
    { id: "box-reveal",   label: "Box agent reveal",                           date: "2026-10-31" },
    { id: "tmm-wave",     label: "TMM wave-change deadline (working)",         date: "2026-11-01" },
    { id: "blood-panel",  label: "Nov blood panel — Vit D, ferritin, CBC",     date: "2026-11-10" },
    { id: "kol-refund",   label: "Kolkata hotel refund deadline",              date: "2026-12-17" },
    { id: "kol-25k",      label: "Tata Steel Kolkata 25K (rehearsal @ MP)",    date: "2026-12-20" },
    { id: "equity-docs",  label: "Definitive equity documentation",            date: "2026-12-31" },
    { id: "tmm",          label: "Tata Mumbai Marathon — first full",          date: "2027-01-17" },
  ] as Countdown[],

  separation: [
    { label: "Seed data → new Media DB",                status: "done" },
    { label: "API trimming & cleanup",                  status: "done" },
    { label: "Admin: user registration",                status: "done" },
    { label: "Admin: role assignment",                  status: "done" },
    { label: "Login: user activation",                  status: "done" },
    { label: "Admin: batch monitor screen",             status: "prog" },
    { label: "Batch service — media-specific cleanup",  status: "prog" },
    { label: "Stored procedures",                       status: "prog" },
    { label: "Cutover",                                 status: "todo" },
  ] as { label: string; status: Status }[],
  separationNote: "My load in skeleton mode: standup, unblock, review, decide. Don't build.",

  tech: [
    { label: "v2 tool — workspaces (guiding Vishal)",                        status: "prog", note: "teams see only their projects · shared S3 per workspace · delete removed" },
    { label: "Demo pipeline — 48h SLA, due 7 Oct",                           status: "todo", note: "spec in one paragraph, then see what v2 already does" },
    { label: "Cost per delivered minute — reconcile EL invoice vs minutes",  status: "todo", note: "the November number I own" },
    { label: "ElevenLabs commercial terms ahead of volume step-up",          status: "todo", note: "after Bengaluru, inside the partnership frame" },
    { label: "Reliance line: 20 → 90 min/day",                               status: "done", note: "runs on my v2 fixes — say so in updates" },
  ] as { label: string; status: Status; note: string }[],

  corpGates: [
    { date: "31 Oct", target: "₹2L per rep · 200 contacts · 12 demos" },
    { date: "30 Nov", target: "₹3.5L per rep · 60% on commitment" },
    { date: "31 Dec", target: "₹5L per rep · ₹13L month" },
  ],
  corpNote: "Two owned numbers: margin per delivered minute · 48h demo SLA. Gates are fixed dates. Q3 ramp: Oct ₹5L → Nov ₹9L → Dec ₹13L. Weekly scorecard fills Friday 18:00 (theirs). Named accounts due 3 Oct.",

  elevenlabs: [
    { label: "Background note to Anand",                            status: "done", when: "23 Sep" },
    { label: "Rapport call — Karthik Rajaram",                      status: "next", when: "this week · one ask: Bengaluru date" },
    { label: "Bengaluru working session + founders dinner",         status: "todo", when: "5 Oct · Summit 6 Oct" },
    { label: "Partnership agreement + first joint case study",      status: "todo", when: "Q4 2026" },
    { label: "Joint GTM to networks · Indic feedback loop",         status: "todo", when: "H1 2027" },
    { label: "Broadcast story from their Summit stage",             status: "todo", when: "2027" },
  ] as { label: string; status: Status; when: string }[],

  slam: [
    { race: "TCS World 10K Bengaluru",  date: "26 Apr", status: "done", note: "1:00:25" },
    { race: "Vedanta Delhi HM",         date: "18 Oct", status: "reg",  note: "target 2:01–2:05" },
    { race: "Tata Steel Kolkata 25K",   date: "20 Dec", status: "reg",  note: "~2:40 @ MP · not raced" },
    { race: "Tata Mumbai Marathon",     date: "17 Jan", status: "reg",  note: "4:30–4:45" },
  ] as { race: string; date: string; status: "done" | "reg"; note: string }[],
  slamSpent: 44961,
  slamTotal: 73461,

  // [week-commencing (Sun), weekly km, long run]
  block: [
    { weekStart: "2026-10-25", km: 28, longRun: "10 easy" },
    { weekStart: "2026-11-01", km: 42, longRun: "16 easy" },
    { weekStart: "2026-11-08", km: 50, longRun: "21" },
    { weekStart: "2026-11-15", km: 56, longRun: "24" },
    { weekStart: "2026-11-22", km: 44, longRun: "16 cutback" },
    { weekStart: "2026-11-29", km: 58, longRun: "27 + Wed ML" },
    { weekStart: "2026-12-06", km: 62, longRun: "30 + Wed ML" },
    { weekStart: "2026-12-13", km: 64, longRun: "30–32 peak" },
    { weekStart: "2026-12-20", km: 52, longRun: "Kolkata 25K @ MP" },
    { weekStart: "2026-12-27", km: 58, longRun: "26 (last 10 @ MP)" },
    { weekStart: "2027-01-03", km: 48, longRun: "21 (10 @ MP)" },
    { weekStart: "2027-01-10", km: 34, longRun: "14 taper" },
    { weekStart: "2027-01-17", km: 0,  longRun: "TMM 42.195" },
  ],
  blockNote: "Gels every long run from now. Prehab 2×/wk. Easy long runs ≤158 HR. Nothing new in the 4 weeks before a race.",
  blockPreNote: "Now: finish the HM plan for Delhi. Gels + prehab start this week.",
  kolkataNote: "Kolkata: fly Fri 18 Dec, expo Sat, race Sun, home Sun evening. Hotel paid, refundable to 17 Dec.",

  money: [
    { label: "Emergency — 6 months",                    amount: "₹2.5L",         note: "FD, laddered" },
    { label: "Near-term — wedding seed, Kolkata, CC",   amount: "₹1.0L",         note: "sweep FD" },
    { label: "Long-horizon",                            amount: "₹50k + ₹1.5L",  note: "Parag Parikh · never before 2031" },
    { label: "NSE IPO — 13 sh @ ₹1,785",                amount: "₹23,205",       note: "single stock · 5.8% of corpus" },
    { label: "SIP",                                     amount: "₹20k / mo",     note: "never paused" },
    { label: "RD",                                      amount: "₹25k / mo",     note: "from December · raise on ₹1.5L months" },
  ],
  moneyNote: "Wedding gap ≈ ₹5.3L on current RD — decide total vs share first. Insurance and a lawyer beat every SIP this year.",

  ftm: [
    { id: "ftm-wk1-rupee",    label: "Wk 1 · one rupee in — quote → PO → invoice → bank credit, one real job · DSO" },
    { id: "ftm-wk1-mis",      label: "Wk 1 · reconcile one month MIS revenue vs bank receipts" },
    { id: "ftm-wk2-el",       label: "Wk 2 · ElevenLabs invoice vs delivered minutes · RCM IGST on imported services?" },
    { id: "ftm-wk2-tds",      label: "Wk 2 · reviewer payouts — TDS 194J in or out of ₹30/min?" },
    { id: "ftm-wk2-fixed",    label: "Wk 2 · monthly fixed cost — structure and total, not amounts" },
    { id: "ftm-wk3-pnl",      label: "Wk 3 · P&L line by line with Pranav/CA · media vs corporate allocation rule" },
    { id: "ftm-wk3-content",  label: "Wk 3 · content bank — expensed or capitalised? inter-company invoice basis?" },
    { id: "ftm-wk4-mca",      label: "Wk 4 · MCA filings for both companies" },
    { id: "ftm-wk4-mrr",      label: "Wk 4 · subscription MRR via Stripe/Razorpay vs invoiced services" },
    { id: "ftm-wk4-tp",       label: "Wk 4 · transfer-pricing question to the CA, framed as diligence" },
  ] as ChecklistItem[],

  learn: [
    { label: "Content economics — 15–45 min daily",        note: "FICCI-EY report · Netflix 10-K content note · The Town podcast · TBI · Content Asia" },
    { label: "MIPCOM coverage week — 12–15 Oct",           note: "a year of deal patterns in four days, free" },
    { label: "Title P&L model — build in skeleton mode",   note: "so December is reading only" },
    { label: "Bidding-power memo — before December",       note: "localisation cost as acquisition advantage" },
  ],

  side: [
    { label: "Box intake agent",                            status: "prog",   note: "PUBLIC now — bots live, posted in daily updates. Intake → job spec is the next layer. Build in daylight." },
    { label: "Strava TRIMP / ACWR from own archive",        status: "todo",   note: "a weekend, no hardware · request archive first" },
    { label: "Whoop-like (chest strap + scripts)",          status: "parked", note: "January, if still wanted" },
  ] as { label: string; status: Status; note: string }[],

  open: [
    { id: "el-note-anand",     label: "Send ElevenLabs background note to Anand" },
    { id: "aws-region",        label: "Confirm AWS region for the security doc" },
    { id: "reviewer-ndas",     label: "Reviewer NDAs — every active reviewer signed?" },
    { id: "el-invoice",        label: "Request last month EL invoice + delivered minutes" },
    { id: "kol-flights",       label: "Book Kolkata flights — Fri 18 out, Sun 20 evening back, not the last flight" },
    { id: "demo-spec",         label: "Spec the demo pipeline (one paragraph) + what v2 already does" },
    { id: "pranav-trail",      label: "Ask Pranav for one job's full document trail" },
    { id: "delete-el-brief",   label: "Delete old ElevenLabs_India_Call_Brief.docx from 04 Rian" },
    { id: "strava-archive",    label: "Request Strava archive" },
    { id: "strava-privacy",    label: "Strava privacy zones — home + uncle's" },
    { id: "health-floater",    label: "Health floater for parents — get quotes (₹10–15L)" },
    { id: "equity-lawyer",     label: "Brief an independent equity lawyer — before December drafting" },
    { id: "wedding-share",     label: "Wedding: ₹10L total or own share? — decide the savings rate" },
    { id: "fd-ladder",         label: "Ladder the ₹2.5L FD, tranches late 2027" },
    { id: "sip-raise",         label: "Raise SIP to ₹20k" },
    { id: "vit-d",             label: "Vitamin D maintenance dose after loading course" },
    { id: "airbnb-charge",     label: "Identify the ₹3,796.80 second Airbnb charge" },
    { id: "tmm-wave-email",    label: "TMM wave change if Delhi < 2:24 — email by 1 Nov" },
    { id: "marathon-week",     label: "Marathon week (11–17 Jan): book with team in November" },
    { id: "kol-prerace-food",  label: "Kolkata: buy pre-race food Sat — exactly what I'll eat before Mumbai" },
  ] as ChecklistItem[],

  eod: {
    template: `Updates —

[OUTCOME, one line, with a number or a name, and who it helps]

- what moved
- what moved
- what moved

Next: [trajectory — where this is by tomorrow/Monday]`,
    note: "Ashish's discipline: outcome + number + client name + trajectory + the bad thing and its fix in one sentence. Mine currently read as tool lists. The Reliance ramp (20 → 90 min/day) runs on my v2 fixes — say so.",
  },
};

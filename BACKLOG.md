# Personal OS — Feature Backlog

Last updated: 28 May 2026

---

## ✅ Done

### Core App
- [x] Next.js 16 + Prisma 7 + Neon PostgreSQL setup
- [x] Today page — habits, streaks, tasks, weekly mileage, mood
- [x] Reflection page — journal streak (IST-aware), habit grid, gratitude, lessons
- [x] Meetings page — grouped by month, expandable cards with summary/decisions/action items
- [x] Tasks — Today's Tasks list, priority dots, done/strikethrough, add inline
- [x] Fitness section — Strava integration, weekly mileage, workout history
- [x] HM Tracker — 175 sessions seeded to Neon, morning brief shows correct session

### WhatsApp Bot (Jarvis)
- [x] Journal entry via text — appends with timestamp, preserves existing
- [x] Gratitude, lessons, mood, water, habits via text
- [x] Query today / query week summaries
- [x] Add task via text — server-side date always, never trusts LLM
- [x] Query tasks — grouped by priority with emoji headers
- [x] Complete task via keyword ("done with X")
- [x] Voice note transcription — OpenAI Whisper (auto-detect for Hinglish/Marathi)
- [x] Voice note → meeting notes extraction (title, attendees, summary, decisions, action items)
- [x] Voice note → journal entry (appends with 🎤 label)
- [x] Voice note → task creation
- [x] Q&A memory — "what did I discuss with X?" searches meetings + journal + tasks
- [x] Google Calendar event creation for timed tasks ("remind me to X at 3pm")
- [x] Calendar: 10-min event duration, 1-hour popup reminder, correct IST timezone
- [x] Calendar works from both text and voice notes
- [x] Fixed: Twilio "OK" bug — returns empty TwiML not plain text
- [x] Fixed: journal streak showing 0 — IST-aware date comparison
- [x] Fixed: habit grid one day off — localKey() uses IST offset
- [x] Fixed: weekly mileage showing 0.0 — uses Strava buckets not HM logs
- [x] Fixed: tasks not appearing in Today — always sets isToday: true
- [x] Fixed: task date showing "10 Jan" — removed dueDate from parser entirely

### Cron Jobs (2/2 Vercel Hobby slots used)
- [x] Morning brief — 7 AM IST (1:30 AM UTC) Mon–Sat, coach review on Sunday
- [x] Evening nudge — 9 PM IST (3:30 PM UTC) Mon–Sat, skips Sunday

### Meeting Notes → Tasks
- [x] "Add to Today's Tasks" button on meeting cards
- [x] Creates tasks from action items with isToday: true

### UI
- [x] Today's Tasks — last 5 done visible, rest hidden with "+N more completed"

---

## 🔲 Backlog

### High Priority
- [ ] Google Calendar — pull yesterday's meetings into MeetingNote (piggyback on morning brief cron)
- [ ] ElevenLabs STT — speaker diarisation for meeting recordings (replaces Whisper for voice notes)
- [ ] "Remind me at X" → Google Calendar + task (time-specific reminder, currently works but needs testing edge cases)

### Medium Priority
- [ ] Outlook calendar integration (Microsoft Graph API)
- [ ] Weekly coach review — include meeting notes summary in Sunday brief
- [ ] Insights page — 30-day trend charts (mood, mileage, tasks completed, habits)
- [ ] WhatsApp: "what's on my calendar today?" — reads Google Calendar events
- [ ] WhatsApp: reschedule task ("move the Aryan call to 4pm")

### Low Priority / V2
- [ ] Dark mode toggle
- [ ] Zerodha / Kite API for portfolio sync (Finance section)
- [ ] LinkedIn API sync (Founder section)
- [ ] Multi-device real-time sync
- [ ] Export to CSV / PDF
- [ ] Deep work timer (start/stop focus session from WhatsApp)
- [ ] Weekly email summary
- [ ] Strava webhook (real-time sync instead of polling)

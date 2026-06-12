# Rian Platform — Technical Context Document
**Purpose:** Context for the Asana AI Bot — so the bot understands Rian's domain, terminology, workflows, and data structures when writing or interpreting tickets.  
**Source:** Angular + React codebase at `rianapp-rianwebv2-e4648312e793`  
**Date:** June 2026

---

## What Rian Is

Rian is a **Speech-to-Speech (STS) dubbing platform**. Studios and localisation agencies use it to replace the voice of a speaker in a video with a cloned or selected AI voice in a different language. The core output is dubbed audio tracks that match the timing and delivery of the original speaker.

**Key concepts the bot must understand:**

| Term | What it means |
|---|---|
| **Recipe** | A dubbing project in Rian. "Recipe audio tracks" = the speaker audio files uploaded for a dubbing job |
| **STS** | Speech-to-Speech — the process of converting one voice to another via ElevenLabs API |
| **TTS** | Text-to-Speech — generating audio from text (used for previews) |
| **Recipe Audio Track** | One audio file per speaker, uploaded by the vendor/PM for STS processing |
| **Segment** | A single speech region within a track, shown as a block on the timeline editor |
| **rk (return key)** | The unique identifier for a job/file assignment. Used in virtually every API call |
| **vk (voice key)** | ElevenLabs voice ID assigned to a speaker |
| **Speaker** | A named entity (person) associated with one or more audio tracks and a voice |
| **Batch process** | Any async background job on Rian's backend (STS generation, download, merge, etc.) |
| **STS Editor** | The React-based waveform/timeline editor for reviewing and correcting STS output |
| **QC** | Quality Control — the post-STS review step in the editor |
| **Owner** | The PM/studio who created the project (role `rl = 1`) |
| **Vendor** | The assignee who does dubbing work (role `rl != 1`) |
| **ElevenLabs** | The AI voice provider used for STS and TTS generation |

---

## Application Architecture

```
Angular App (main platform)       React App (STS Editor)
  ├── Login / Auth                  ├── /sts-editor?rk=XXXX
  ├── Project listing               └── /media-popup
  ├── File / job management
  ├── Recipe audio tracks upload
  ├── Speaker & voice assignment
  └── Batch job triggering
           │                                │
           └──────────── Rian API ──────────┘
                    (api.rian.io / testapi.rian.io)
                         │
                    ElevenLabs API
                    S3 (presigned URLs)
                    SignalR (real-time)
```

---

## Key Abbreviated Field Names

The Rian API uses heavily abbreviated field names. The bot must know these when interpreting ticket descriptions or API references.

```
rk   = return key (unique job identifier — used in ALL recipe calls)
fk   = file key
pk   = project key
em   = email
at   = access token
rt   = refresh token (also overloaded as "rating" in some contexts)
pw   = password
fn   = file name
fs   = file size
du   = duration (ms)
tc   = track code (e.g. "RECIPE_SPEAKER_TRACK")
tn   = track name
vk   = voice key (ElevenLabs voice ID)
vn   = voice name
vtc  = voice type code
il   = isLocked (0/1)
ice  = isChunked (1 = STS output exists and is ready)
stex = style exaggeration (ElevenLabs expressiveness 0–100)
spd  = speed
stb  = stability (ElevenLabs voice setting 0–100)
sb   = similarity boost (ElevenLabs voice setting 0–100)
engCd = speech engine code (e.g. "ElevenLabs")
sid  = segment ID
atid = audio track ID
tlp  = timeline position (ms)
st   = start time (ms)
et   = end time (ms)
pt   = processing type ('STS', 'ORIGINAL', 'razor', etc.)
pid  = parent segment ID
vr   = version number
snm  = segment name
bstc = batch status code (NEW / RUNNING / SUCCESSFUL / FAILED)
bid  = batch ID
dst  = display status
bermsg = batch error message
jid  = job ID
rl   = role (1 = owner/PM, other = vendor)
oan  = owner account number
stc  = status code (ACCEPTED / SUBMITTED / CONFIRMED / etc.)
spkid = speaker ID
spknm = speaker name
slsn = source language short name (e.g. "hi")
tlsn = target language short name (e.g. "en")
accNo = account number
accId = account ID
```

---

## Main User Workflows

### 1. Recipe Audio Track Upload

```
User navigates to Files tab → Audio Tracks sub-tab (Angular)
  ↓
RecipeAudioTracks component loads
  → POST RianRecipe/GetAudioTracks { rk } → existing tracks list
  ↓
User uploads audio files (1 per speaker)
  → Chunked upload to VoiceOver/UploadRecipeAudioTrack
  → 10MB chunks, fields: { rk, fn, fs, ct, tc, cn, tn, spkid, vk, vn, stex, spd, stb, sb, engCd }
  → Backend assembles chunks server-side
  ↓
OR user imports from Box
  → POST Box/ImportRecipeAudioTracks202 (async 202 response)
  ↓
Track list refreshes → tracks visible in table with speaker/voice assignments
```

### 2. Speaker & Voice Assignment

```
Speaker config panel loads (Angular, within project editor)
  → GET File/GetFileSpeaker { rk } → speaker list
  ↓
Each speaker has: name (nm), voice ID (vk), voice name (vn),
  voice settings (stb, sb, stex, spd)
  ↓
User assigns speaker to track:
  → POST RianRecipe/UpdateAudioTrackSpeaker { rk, atid, spkid }
  ↓
Optional: voice cloning
  → QueueBatchProcess { bc: 'CLONE_VOICE', prm: { fk, fsId, vn, gid, asnt, vtoc, vagc } }
  → SignalR notifies when clone complete
```

### 3. STS Generation (Bulk)

```
User selects tracks (must have vk assigned) → clicks "Generate STS"
  → QueueBatchProcess { bc: 'GENERATE_SPEECH_TO_SPEECH_RECIPE_AUDIO_TRACKS', prm: { rk, atid } }
  → Returns batch job { bid, bstc: 'NEW' }
  ↓
Backend processes via ElevenLabs API asynchronously
  ↓
SignalR pushes VOICEOVER_FILE_CHANGE event
  → data.changeDataType = 'STSRAT' (STS complete for that track)
  → Angular reloads track: ice=1, fnsts=<processed filename>
  ↓
If segments need merging:
  → QueueBatchProcess { bc: 'MERGE_PROCESSED_RECIPE_AUDIO_TRACK_SEGMENTS', prm: { rk, atids } }
  → SignalR pushes changeDataType: 'MPRATS' when done
```

### 4. STS Editor (React)

```
Angular navigates → window.open(stsHost + 'sts-editor?rk=' + rk)
  (Prerequisite: track.ice === 1 and fnsts is set)
  ↓
React STS Editor loads at /sts-editor?rk=XXXX
  → Auth check (AT cookie)
  → GET Auth/GetUserInfo + GET User/GetUserDetails (Redux state)
  ↓
Parallel load:
  → POST RianRecipe/GetSTSEditorData { rk }
    Returns: tracks (IRianAudioTrack[]), videoUrl, audioUrl, peakUrl,
             ttsEngines, markers, header (hdr with role/job info)
  → POST RianRecipe/GetSTSEditorMarkersData { rk }
  ↓
  → POST File/UpdateJobStatus { rk, fk, stc: 'ACCEPTED' } (if not yet accepted)
  ↓
WaveSurfer.js renders waveforms
Video player shows source video (mvurl), synced via BroadcastChannel
  ↓
  → POST RianRecipe/GetSegments { rk }
    Returns segments: { id, atid, st, et, tlp, turl, pt, snm, vr, ... }
    pt = 'STS' for processed segments
  ↓
User edits:
  Move segment    → POST RianRecipe/MoveSegment { rk, sid, tlp }
  Razor cut       → POST RianRecipe/RazorCutSegment { rk, sid, ct }
  STS preview     → POST RianRecipe/STSPreview { rk, sid, vn, vtc, stb, sb, stex }
  TTS preview     → POST RianRecipe/TTSPreview { rk, sid, vn, vtc, txt, lang, stex, spd, stb }
  Confirm segment → POST RianRecipe/SegmentConfirm { rk, sid, dur, pt, atid }
  Lock track      → POST RianRecipe/ToggleAudioTrackLock { rk, atid, il }
  ↓
Job status changes (submit, confirm, return, etc.):
  → POST File/UpdateJobStatus { rk, fk, stc, cm, ... }
  → POST Notification/BroadcastMessage (notifies counterparty)
  ↓
Download:
  → QueueBatchProcess { bc: 'DOWNLOAD_RECIPE_AUDIO_TRACKS', prm: { rk, fn, trackType, acnf, atids } }
  → SignalR changeDataType: 'DRAT' → GET VoiceOver/DownloadVoiceOverFileDataFromURL → S3 presigned URL
```

### 5. Bulk Download

```
User selects tracks → clicks Download
  → Download options dialog: trackType (both/original/processed), channelType, reGenMerge
  ↓
  → QueueBatchProcess { bc: 'DOWNLOAD_RECIPE_AUDIO_TRACKS',
      prm: { rk, fn, trackType, reGenMerge, acnf: { ext, brt, cbr, vbr, sfq, ssz, noc }, atids } }
  ↓
SignalR VOICEOVER_FILE_CHANGE changeDataType: 'DRAT' when ZIP ready
  → GET VoiceOver/DownloadVoiceOverFileDataFromURL { em, accNo, pk, rk, fn, voft: 'RECIPE_ZIPPED_SPEAKER_AUDIO_TRACKS' }
  → Returns S3 presigned URL → browser downloads ZIP
```

---

## All API Endpoints

### Base URL
`https://api.rian.io/` (production) | `https://testapi.rian.io/` (test)

All requests: AES-256-CBC encrypted payloads. Header `x-encrypted-pl: 1` on POST. GET params sent as `?_pld_=<base64>`.

### RianRecipe/ — Core Recipe/STS Endpoints

| Method | Path | What it does | Key request fields |
|---|---|---|---|
| POST | `RianRecipe/GetSTSEditorData` | Load full STS editor — tracks, video, audio, markers, TTS engines | `{ rk }` |
| POST | `RianRecipe/GetSTSEditorMarkersData` | Load timeline markers | `{ rk }` |
| POST | `RianRecipe/AddUpdateMarker` | Add/edit timeline marker | `{ rk, dtls: { id, tlp, mtp, mtxt, cc } }` |
| DELETE | `RianRecipe/DeleteMarker` | Delete timeline marker | `{ rk, mid }` |
| POST | `RianRecipe/GetSegments` | Load all timeline segments | `{ rk }` |
| POST | `RianRecipe/MoveSegment` | Move segment to new position | `{ rk, sid, tlp }` |
| POST | `RianRecipe/RazorCutSegment` | Split segment at cut point | `{ rk, sid, ct }` |
| POST | `RianRecipe/STSPreview` | Generate STS preview audio for segment | `{ rk, sid, vn, vtc, sts, stb, sb, stex }` |
| POST | `RianRecipe/TTSPreview` | Generate TTS preview audio for segment | `{ rk, sid, vn, vtc, txt, tts, lang, stex, spd, stb }` |
| POST | `RianRecipe/SegmentConfirm` | Confirm/save segment final audio | `{ rk, sid, dur, pt, atid }` |
| POST | `RianRecipe/ToggleAudioTrackLock` | Lock/unlock audio track | `{ rk, atid, il }` |
| POST | `RianRecipe/GetAudioTracks` | Get recipe audio track listing | `{ rk, atid? }` |
| POST | `RianRecipe/UpdateAudioTrackSpeaker` | Assign speaker to track | `{ rk, atid, spkid }` |
| POST | `RianRecipe/AutoMatchSpeakers` | Auto-assign speakers | `{ rk, atids: number[] }` |
| DELETE | `RianRecipe/DeleteAudioTracks` | Delete audio track | `{ rk, atid }` |
| POST | `RianRecipe/DownloadIndividualSegment` | Download URL for one segment | `{ rk, sid }` |

### VoiceOver/ — File Upload & Download

| Method | Path | What it does | Key request fields |
|---|---|---|---|
| GET | `VoiceOver/DownloadVoiceOverFileDataFromURL` | Get S3 presigned download URL | `{ em, accNo, pk, rk, fn, voft }` |
| POST | `VoiceOver/UploadRecipeAudioTrack` | Upload recipe audio track (chunked) | Multipart: `{ rk, fn, fs, ct, tc, cn, tn, cc, tcc, spkid, vk, vn, stex, spd, stb, sb, engCd }` + chunk bytes |

### File/ — Job Status & Speakers

| Method | Path | What it does | Key request fields |
|---|---|---|---|
| POST | `File/UpdateJobStatus` | Change job status | `{ rk, fk, stc, cm, rt, data, jbr, iqa, ca, ecd, rateParams, dd }` |
| GET | `File/GetFileSpeaker` | Get speaker list for file | `{ rk }` or `{ fk, fsId? }` |
| POST | `File/AddUpdateSpeaker` | Create/edit speaker | Speaker payload |
| POST | `File/FileSpeakerDelete` | Delete speaker | `{ fsId }` |

### BatchProcess/ — Async Jobs

| Method | Path | What it does | Key request fields |
|---|---|---|---|
| POST | `BatchProcess/QueueBatchProcess` | Trigger any async batch job | `{ rk, bc (BatchCode), prm (params) }` |

### Auth/ & User/

| Method | Path | What it does |
|---|---|---|
| POST | `Auth/LoginUser` | Login: `{ em, pw }` → tokens |
| POST | `Auth/RefreshToken` | Refresh: `{ at, rt }` → new tokens |
| GET | `Auth/GetUserInfo` | Current user info from cookie |
| GET | `User/GetUserDetails` | Extra user details (profile image) |

### Box/ — Box.com Integration

| Method | Path | What it does |
|---|---|---|
| GET | `Box/OAuthUrl` | Get Box OAuth authorization URL |
| POST | `Box/OAuthExchange` | Exchange OAuth code for token |
| POST | `Box/ImportRecipeAudioTracks202` | Import tracks from Box (async 202) |

### Common/ — Lookup Data

| Method | Path | What it does |
|---|---|---|
| GET | `Common/GetAudioConfigParams` | Audio encoding defaults |
| GET | `Common/GetTypes` | Dropdown lists (VOICE_TONE, VOICE_AGE_GROUP) |
| POST | `Common/GetSpeechEngineVoiceDetails` | Available ElevenLabs voices |

---

## Batch Process Codes (bc field in QueueBatchProcess)

These are the strings passed to `BatchProcess/QueueBatchProcess` as `bc`:

| Code | What it triggers |
|---|---|
| `GENERATE_SPEECH_TO_SPEECH_RECIPE_AUDIO_TRACKS` | STS generation for selected tracks |
| `MERGE_PROCESSED_RECIPE_AUDIO_TRACK_SEGMENTS` | Merge STS segment chunks into final file |
| `DOWNLOAD_RECIPE_AUDIO_TRACKS` | Package tracks into downloadable ZIP |
| `CLONE_VOICE` | Clone a speaker voice via ElevenLabs |
| `GENERATE_SPEECH_TO_SPEECH_AUDIO` | General STS audio generation |
| `AUTO_CREATE_TTS` | Auto-generate TTS for segments |
| `NORMALIZE_AUDIO` | Normalise audio levels |
| `REMOVE_NOISE_FROM_AUDIO` | Denoise audio |
| `AUTO_TRIM_SILENCE_FROM_AUDIO` | Trim silence |
| `SUBTITLE_GENERATION` | Generate subtitles |
| `FILE_SEGMENTATION` | Segment file |
| `GENERATE_WAVE_FILE` | Generate WAV file |
| `GENERATE_SYSTEM_AUDIO` | Generate system/mixed audio |
| `PRODUCE_MIXED_VIDEO` | Produce mixed video output |
| `POPULATE_MEMORY` | Populate translation memory |
| `PROJECT_ANALYSIS` | Run project analysis |
| `JOB_ANALYSIS` | Run job analysis |
| `AUTO_ADJUST` | Auto-adjust voice-over timing |
| `ATTACH_BACKGROUND_MUSIC` | Attach BGM |
| `QA_CHECK_REPORT` | Generate QA report |
| `TRANSLATE_USING_AI_AGENT` | AI-assisted translation |
| `RECIPE_AUTO_TRANSLATE` | Recipe auto-translate |
| `DIRECT_DOWNLOAD` | Direct file download |

---

## Status & Type Codes

### Job Status Codes (stc — used in UpdateJobStatus)

```
ACCEPTED    — Vendor accepted the job
REJECTED    — Vendor rejected
SUBMITTED   — Vendor submitted for review
RETURNED    — Returned to vendor by reviewer/owner
REVOKED     — Owner revoked job
REOPENED    — Job reopened
CONFIRMED   — Owner confirmed/approved final output
```

### Batch Status Codes (bstc)

```
NEW         — Job queued, not started
RUNNING     — Currently processing
SUCCESSFUL  — Completed without errors
FAILED      — Completed with errors
```

### Segment Processing Types (pt)

```
STS         — Processed by Speech-to-Speech
ORIGINAL    — Original uploaded audio (not yet STS processed)
razor       — Created by razor cut tool
trim        — Created by trim operation
cut         — Created by cut operation
```

### Track Role (trackRole)

```
original    — RIAN-downloaded, unmodified — used as STS source
processed   — STS output, editable
speaker     — Uploaded speaker track
source      — Source audio track
```

### Track Type (trackType)

```
source      — Source audio
speaker     — Speaker/dubbing track
me          — Self-recorded track
```

### File Ownership Role (rl field in hdr)

```
1           — Owner (PM / studio who created project)
other       — Vendor (assigned dubbing artist or reviewer)
```

### VoiceOverFileType Codes (voft — used in download URL call)

```
RECIPE_ZIPPED_SPEAKER_AUDIO_TRACKS  — ZIP of all selected recipe tracks
MIXED_VIDEO                          — Final mixed video
SYSTEM_AUDIO                         — System-generated audio
SPEAKER_WISE_AUDIO                   — Audio separated by speaker
BACKGROUND_MUSIC                     — BGM track
NORMALIZED_SYSTEM_AUDIO              — Normalised audio
EXTERNAL_VIDEO                       — Externally provided video
TARGET_REF_MEDIA                     — Target reference media
```

### API Response Status Codes

```
1       — Success
10000   — Success (alternate)
50009   — Access restricted or file not found
50010   — Invalid credentials
50027   — Not enough credits
50085   — Job no longer available
50100   — Email already registered
50155   — Expired subscription
50370   — Wrong password / account locked
13015   — Something went wrong
```

### Marker Types (mtp)

```
SECTION, CUE, COMMENT
```

---

## Real-Time Events (SignalR)

Hub URL: `{apiHost}notify`  
Hub method received: `BroadcastMessage(tp: string, data: any)`

### Event Types (tp field)

| Event | When it fires |
|---|---|
| `VOICEOVER_FILE_CHANGE` | Any async batch job completes — STS, download, merge, etc. |
| `EDITOR_DATA_CHANGES` | STS editor data changed (segment confirm, move, etc.) |
| `SPEAKER_DATA_CHANGES` | Speaker assignment changed |
| `JOBSTATUS` | Job status changed (accept, submit, confirm, etc.) |
| `NOTIFICATION` | General in-app notification |
| `AVAILABLE_CREDITS` | Credit balance updated |
| `REFRESH_TOKEN` | Server-pushed token refresh |
| `RIAN_MAINTENANCE` | Maintenance mode active |
| `DISCONNECT_CLIENT` | Force client disconnect |

### changeDataType Codes (in VOICEOVER_FILE_CHANGE events)

| Code | What it means |
|---|---|
| `STSRAT` | STS generation complete for a recipe audio track |
| `MPRATS` | Merge of processed STS chunks complete |
| `DRAT` | Download ZIP of recipe audio tracks is ready |
| `CA` | Audio created |
| `CV` | Video created |
| `CS` | Subtitle created |
| `RCPAT` | Recipe auto-translate complete |
| `RCPSG` | Recipe subtitle generation complete |

---

## Key Data Structures

### IRianAudioTrack — track from GetSTSEditorData

```typescript
{
  id: number;       // Track ID (atid)
  fn: string;       // Filename
  fs: number;       // File size (bytes)
  tc: string;       // Track code ("RECIPE_SPEAKER_TRACK")
  tn: string;       // Track name
  du: number;       // Duration (ms)
  vk?: string;      // ElevenLabs voice ID
  vn?: string;      // Voice name
  vtc?: string;     // Voice type code
  il?: number;      // isLocked (0/1)
  stex?: number;    // Style exaggeration (0–100)
  spd?: number;     // Speed
  stb?: number;     // Stability (0–100)
  sb?: number;      // Similarity boost (0–100)
  engCd?: string;   // Speech engine ("ElevenLabs")
  idsts?: number;   // STS Track ID (populated after STS generation)
}
```

### Segment — from GetSegments

```typescript
{
  id: number;
  trackId: number;          // atid
  startTime: number;        // ms (st)
  endTime: number;          // ms (et)
  timelinePosition: number; // ms (tlp)
  audioFile: string;        // presigned S3 URL (turl)
  processingType: string;   // pt — 'STS', 'ORIGINAL', 'razor', etc.
  segmentName: string;      // snm
  version: number;          // vr
  parentSegmentId: number;  // pid
  originalS3Key: string;    // os3p
}
```

### ISpeakerListDTO — speaker from GetFileSpeaker

```typescript
{
  id: number;     // speaker ID (spkid)
  nm: string;     // speaker name
  vk: string;     // ElevenLabs voice ID
  vn: string;     // voice name
  gid: number;    // gender ID
  gnm: string;    // gender name
  spd: number;    // speed
  stb: number;    // stability
  stex: number;   // style exaggeration
  sb: number;     // similarity boost
  des: string;    // description
  ibr: boolean;   // isBroadcast (uses broadcast quality voice?)
  sc: number;     // segment count
  scfvc: number;  // segment count for voice cloning
  vcHist: [];     // voice clone history
}
```

### IRecipeAudioTrackDetailsDTO — track from GetAudioTracks (Angular)

```typescript
{
  id: number;
  fn: string;       // original filename
  fnsts: string;    // STS output filename
  fs: number; du: number;
  tc: string; tn: string;       // original track code/name
  tcsts: string; tnsts: string; // STS track code/name
  ice: number;      // isChunked — 1 means STS output exists and is ready
  il: number;       // isLocked
  spkid: number;    // assigned speaker ID
  spknm: string;    // assigned speaker name
  vk: string;       // ElevenLabs voice ID
  vn: string;       // voice name
  stex: number; spd: number; stb: number; sb: number; engCd: string;
  bstc: string;     // current batch status code
  dst: string;      // display status
  bermsg: string;   // batch error message
}
```

---

## Authentication

- **Tokens stored as:** AES-encrypted cookies (`_tknAt{SALT}`, `_tknRt{SALT}`)
- **Payload encryption:** AES-256-CBC, key `RIAN=CRYPTO=AES256=20221107=$#2@`, IV `RIANCRYPTOAES256`
- **All POST bodies** are encrypted as Base64 before sending (header: `x-encrypted-pl: 1`)
- **GET params** are encrypted and sent as `?_pld_=<base64>`
- **Token refresh:** On 401 response, automatic — queues pending requests, refreshes, retries
- **Angular proactive refresh:** Every 9 minutes regardless of 401
- **Multipart uploads** (file chunks) are NOT encrypted

---

## Voice Settings — ElevenLabs Parameters

| Setting | Field | Range | Default |
|---|---|---|---|
| Stability | `stb` | 0–100 | 50 |
| Similarity Boost | `sb` | 0–100 | 75 |
| Style Exaggeration | `stex` | 0–100 | 0 |
| Speed | `spd` | 0.1–4.0 | 1.0 |

### Voice Presets

| Profile | stb | stex | sb |
|---|---|---|---|
| Default | 30 | 40 | 75 |
| Highly Emotional | 0 | 60 | 75 |
| Narrator Clean | 60 | 0 | 75 |

### Speech Engines (engCd values)

```
ElevenLabs, ElevenLabsV3, Google, Google2, Microsoft, Amazon,
AmiVoice, Otter, ChatGPT, VertexAI, SarvamAI
```

---

## File Upload — Chunk Sizes

| File type | Max size | Chunk size |
|---|---|---|
| Recipe audio tracks | unlimited | 10 MB |
| Source video | 100 MB | 5 MB |
| Reference files | 2 GB | 10 MB |
| Background music | 50 MB | 5 MB |
| Segment audio | 10 MB | 5 MB |

---

## Angular Routes

```
/recipe/projects                          → Project listing
/recipe/projects/files?rk=XXXX           → File listing tabs
/recipe/projects/files?rk=XXXX&tab=AUDIOTRACKS → Recipe audio tracks
/recipe/projects/files/editor?rk=XXXX    → Speaker config + VO editor
/recipe/projects/files/curation-editor?rk=XXXX → Curation editor
/recipe/new-project                       → Create new project
/jobs/allocated                           → Jobs received (vendor view)
/jobs/allocated/editor?rk=XXXX           → VO editor for vendor job
/settings                                 → Account settings
/box/oauth-callback                       → Box OAuth redirect handler
/login, /recover, /reset                  → Auth pages
```

## React Routes

```
/sts-editor?rk=XXXX    → STS Editor (waveform + video timeline)
/media-popup           → Floating media popup
```

---

## Box Integration

Box.com is used for both importing and (planned) exporting recipe audio tracks.

**Import flow:**
1. User authenticates via Box OAuth popup (`Box/OAuthUrl` → user authorises → `Box/OAuthExchange`)
2. Box file picker shows user's Box folders
3. User selects audio files
4. `POST Box/ImportRecipeAudioTracks202` — Rian backend fetches files from Box server-to-server
5. `GET Box/OAuthUrl` → `POST Box/OAuthExchange { code }` → `boxAccessToken` (short-lived, ~60min)

**Token pattern:** `boxAccessToken` passed per-request from frontend — Rian does not store Box tokens.

---

## Notification Codes (for BroadcastMessage between owner and vendor)

```
JobAssigned          — Job sent to vendor
JobAccepted          — Vendor accepted
JobRejected          — Vendor rejected
JobReturned          — Returned to vendor by reviewer
JobSubmitted         — Vendor submitted
JobRevoked           — Owner revoked
JobReopened          — Reopened after return
JobConfirmed         — Owner confirmed final
PreProcessingJobAssigned — Pre-processing job assigned
NotEnoughCredits     — Insufficient credits
```

---

## Modules & Apps (for permission checking)

```
Apps:    ALL, ACCOUNT, CAT, QT, JOB, VO, EMAIL, SUB, NAS
Modules: CMS, DT, VO, QT, RSS, RSP, REV, EMAIL, SERVICE_VO, SERVICE_DT,
         VENDOR, TM_TB, RECIPE_SUBTITLE, RECIPE_DUB
```

`RECIPE_DUB` module = access to the recipe audio tracks / STS dubbing workflow  
`hasATCV` (has access to clone voice) and `hasATRD` (has access to recipe dubbing) are flags returned by `GetFileSpeaker`

---

## Key Terminology Cheat Sheet (for ticket writing)

| When a ticket says... | It means in Rian terms... |
|---|---|
| "recipe audio tracks" or "RAT" | The speaker audio files uploaded per-speaker for STS |
| "STS generation" / "generate STS" | Running ElevenLabs STS on uploaded tracks |
| "ice flag" | `ice=1` means an STS-processed version of the track exists |
| "merge chunks" | Stitching together the STS segment files into one final WAV |
| "the editor" | The React STS Editor at /sts-editor |
| "batch job" | Any async background process via QueueBatchProcess |
| "rk" or "return key" | The job's unique identifier — everything flows through this |
| "bstc: SUCCESSFUL" | A batch job finished successfully |
| "changeDataType: STSRAT" | SignalR event saying STS just finished for a track |
| "vk" | ElevenLabs voice ID assigned to a speaker |
| "speaker profile" | A named speaker entity with voice settings |
| "voice cloning" | Using ElevenLabs to clone a speaker's voice from their audio |
| "segment confirm" | Saving a corrected/approved segment in the STS editor |
| "razor cut" | Splitting a segment at a specific time point in the editor |
| "QC" | Quality Control review of STS output in the editor |
| "owner role (rl=1)" | The PM/studio who created the project |
| "vendor" | The assignee doing the dubbing/review work |

🕸️ Karen's Ear

AI-Assisted Emergency Dispatch & Threat-Alert System — NYC Prototype

Karen's Ear is a working prototype of an AI-driven emergency dispatch platform for New York City. An AI dispatcher — "Karen" — sits between every incoming report and the units responding to it, classifying incidents by severity and dispatching the correct real-world response automatically. No dropdowns, no manual sorting.

The problem

A naive first-in-first-out dispatch queue lets low-severity incidents delay high-severity ones, and it leaves minor incidents unattended while a borough's main response capacity is tied up with a major event.

Karen's Ear solves this with:

Strict severity-based queue ordering — a higher-ranked threat is always surfaced and actioned before a lower-ranked one, regardless of arrival time.
A coordinated multi-unit response model — every borough always has a responder available, even mid-crisis.
Features
🎙️ Multi-modal intake — type a report, speak it, or leave the mic open with live sensing for hands-free, continuous reporting.
📞 Call Voice AI Assistant — a phone-style control that "picks up," greets the caller, and starts listening automatically.
🤖 AI classification — Karen parses each report for threat and location cues in real time and dispatches the moment she's confident, narrating every decision in a distinct dispatcher voice.
🚨 Live alert system — a flashing citywide alert bar and severity-coded alert cards, not a static table.
🗺️ NYC dispatch map — a road-atlas-style map with all five boroughs highlighted as active coverage, bridge/highway corridors, interstate shields, and real landmarks.
🏙️ Real-world grounding — real incident categories, real response units, and real NYC dispatch routing (see below).
Incident taxonomy
Rank	Category
1 (highest)	Active Shooter / Terrorist Attack
2	Multi-Alarm Structural Fire
3	Hazmat / Chemical Spill
4	Serious Medical Emergency
5 (lowest)	Motor Vehicle Collision
Response units
Unit	Role
First-Due Unit (FDNY/NYPD)	Lead responder on every major (rank 1–2) incident
NYPD ESU	Perimeter, containment, and structural/crowd safety support on majors
FDNY EMS	Triage and treatment, dispatched in parallel on majors
Second-Due Unit (Mutual Aid)	Absorbs minor (rank 3–5) incidents while a borough's major-incident bundle is committed

Major incidents get the full First-Due + ESU + EMS bundle dispatched together. Minor incidents go straight to First-Due if nothing major is active in that borough, or to Second-Due if it is — recalculated live every time an incident is logged or resolved.

Dispatch routing

Each borough resolves to its real NYC dispatch facility:

Borough	Facility
Brooklyn	PSAC I — 11 MetroTech Center
Bronx	PSAC II — 1200 Waters Place
Manhattan	FDNY Manhattan Dispatch
Queens	FDNY Queens Dispatch
Staten Island	FDNY Staten Island Dispatch
Tech stack
Single self-contained HTML / CSS / vanilla JavaScript file — no build step, no backend, no dependencies
Web Speech API (SpeechRecognition + SpeechSynthesis) for voice intake and spoken confirmations
Inline SVG for the NYC dispatch map (boroughs, dispatch markers, live incident dots, highway network)
State held in memory (browser-local by design — see Limitations)
Getting started

No installation needed — it's a single HTML file.

bash
# clone the repo
git clone https://github.com/<your-username>/karens-ear.git
cd karens-ear

# just open it
open index.html   # or double-click the file

Voice features require microphone permission and work best in Chromium-based browsers (Chrome, Edge).

Known limitations
Browser-local state — refreshing or opening a second tab doesn't share the same queue.
Single Second-Due lane per borough — more than one simultaneous minor incident during a major event still queues against the same mutual-aid unit.
Borough-level routing, not live unit geolocation.
Fictional-inspired severity structure — the five-tier ranking is illustrative; a production deployment would validate it against a real dispatch protocol (e.g., NFPA or local EMS triage standards).
Roadmap
 Shared, persistent incident state across sessions/devices
 Sized Second-Due pool instead of a single lane per borough
 Live unit geolocation on the map
 Validated real-world incident schema, signed off against an actual dispatch protocol
License

MIT — use, modify, and share freely.

Disclaimer

This is a prototype/demo project, not an operational dispatch tool. It is not affiliated with, endorsed by, or connected to the FDNY, NYPD, or the City of New York.

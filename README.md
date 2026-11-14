# Questathon Customer Success Intelligence CRM

An evidence-led, executive-grade Customer Success CRM built for **Eastern Counties Police Alliance** and **Aldermoor Industrial Group**. Built for Questathon, it reads live data via the Questathon MCP API, separates verified operating signals from champion claims, and answers the five critical account questions for Monday management review.

---

## The 5 Core Questions Answered (For Both Accounts)

### 1. What is the book worth?
- **Distinction between Ceilings and Confirmed Revenue:** Clearly separates confirmed/booked revenue from qualified pipeline ceilings.
  - **Eastern Counties Police Alliance:** **$2.30M** total opportunity ceiling across 4 deals (`a_renewal`: $350k, `a_tarn`: $200k, `a_westmere`: $250k, `a_tender`: $1.5M). Confirmed revenue is **$0** (each force funds separately; no pooled budget `rc_funding_2`, `hd_calloff_2`).
  - **Aldermoor Industrial Group:** **$320,000** opportunity ceiling across 2 priced deals (`b_renewal`: $140k, `b_idle`: $180k) + 1 unpriced case study (`b_sister`). Confirmed revenue is **$0** (contract is up for renewal; the claimed €1.2M annual savings was verified as a theoretical spreadsheet with $0 booked by Finance `sr_roi_2`).
- **Source Traceability:** Every deal and valuation bridges directly to verified source IDs and file records.

### 2. Who holds the power?
- **Deal-by-deal power mapping:** Explicitly categorizes each stakeholder into **Decider**, **Payer**, **User**, and **Blocker** roles with relationship stances (*Ally*, *Warm*, *Neutral*, *Cold/Disengaged*).
  - **Eastern Counties:** Identifies force CFOs as actual budget payers (`hd_calloff_2`), Fatima Osei as DPIA blocker (`fo_dpia_2`), Insp. Karen Mbeki as primary operational user (`km_usage_1`), Ewan Brooks as financial gatekeeper (`eb_sign_2`), and flags Hannah Doyle going cold (`hd_silence_3`).
  - **Aldermoor Industrial:** Identifies Nadia Rahman (Finance) as the ultimate payer/decider demanding hard ROI (`sr_roi_2`), Stefan Roy as champion (`sr_roi_0`), Owen Fitch as IT network blocker (`b_idle`), and Beatriz Alonso as operational user receiving nocturnal alerts on her personal phone (`ba_use_2`).

### 3. What do you do first?
- **Top 3 Priority Moves Ranked 1 → 2 → 3:**
  - Each action has an explicit **Owner**, **Target Window** inside real deadlines, and the specific **Deal Moved**, backed by source IDs.
  - **Eastern Counties:**
    1. *Rank 1:* Deliver engineering data-flow pack to Fatima Osei within 7 business days to unblock 4-month stalled DPIA ticket `pj_ticket` for Tarn Valley and Norwold go-live (`a_tarn`).
    2. *Rank 2:* Reconcile operator overtime with Ewan Brooks and Insp. Karen Mbeki to produce cost-per-flight vs £1,500/hr helicopter benchmark before autumn budget round closes (`a_westmere`).
    3. *Rank 3:* Submit formal written clarification and 300-dock operating model proposal to Hannah Doyle within 14 days (inside 25 moves remaining before spec lock) (`a_tender`).
  - **Aldermoor Industrial:**
    1. *Rank 1:* Capture rollout playbook before Stefan's deputy leaves (`ba_deputy_0`, `sr_repl_2`) to prevent complete loss of deployment knowledge (`b_idle`).
    2. *Rank 2:* Amend third-party guard contractor SLA so guards respond to drone alerts rather than routing notifications to Beatriz Alonso's personal phone (`b_renewal`).
    3. *Rank 3:* Map IT network dependencies with Owen Fitch to avoid docks being severed by plant network upgrade, and audit credible savings with Nadia Rahman (`b_renewal`, `b_idle`).

### 4. What is about to go wrong?
- **Evidence-Backed Threat Radar:**
  - Pinpoints looming deadlines, stalled tickets, disengaged contacts, and exact turnaround dates.
  - Highlights critical blockers: 4-month unanswered DPIA ticket (`pj_ticket`), 25 moves left before 300-dock tender specification locks (`moves_left: 25`), departure of Stefan's deputy without written documentation (`ba_deputy_0`), and plant manager resentment over security budget levies (`sr_plants_2`).

### 5. What do you still not know?
- **Blindspots Ledger:**
  - Transparent inventory of missing information: the gap description, why it matters to the forecast, severity impact rating, and the specific person who can fill it.

---

## Live MCP Integration & 1-Call-Per-Minute Architecture

- **Strict Server-Side Rate Limiting:** Questathon limits MCP calls to 1 per minute per token. The server enforces a 60-second cooldown, providing the client with remaining cooldown seconds for UI countdown timers and disabling write-backs during cooldowns.
- **Persistent Data Store:** Snapshot data (`data/questathon_export.json`), live signals (`data/signals.json`), and user-written notes (`data/notes.json`) are stored locally on the server (git-ignored) so server reboots do not discard state or consume unnecessary API calls.
- **Two-Way Live Synchronization:**
  - `POST /api/refresh` invokes the MCP tool `get_signals` to ingest live events (such as urgent ticket FB-11206 or stakeholder departure notices).
  - `POST /api/notes` invokes the MCP tool `write_note` to write back notes, next steps, risks, and tasks directly to the Questathon live account.

---

## Getting Started Locally

### Prerequisites
- Node.js 18+ (tested on Node 18, 20, 22, 24)
- npm or pnpm

### Installation & Run

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd questathon-crm
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Configure your Questathon token in `.env`:
   ```bash
   AQ_TOKEN=your_questathon_api_token_here
   PORT=3000
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the server:
   ```bash
   npm start
   ```

6. Open [http://localhost:3000](http://localhost:3000) in any modern browser.

### Automated Test Suite

Run the full integration test suite:
```bash
node test_app.js
```
The test verifies:
- Server health and token verification
- Cooldown tracking and rate-limit handling
- Export data integrity and opportunity ceiling totals for both accounts
- Live signal refresh via MCP
- Frontend HTML delivery

---

## Security & Secrets Management

- **No Secrets in Client-Side Code:** The Questathon API token (`AQ_TOKEN`) is consumed strictly on the server and is never sent to the browser or embedded in client assets.
- **Clean Repository:** `.env`, `data/*.json`, and `questathon_export.json` are listed in `.gitignore` to prevent credential or private snapshot leaks.
- **No Invented Metrics:** Financial metrics and operational statuses are sourced directly from the verified export snapshot or live MCP signals.

---

## Deployment Ready

The project contains no native binary dependencies and is ready for one-click deployment to any standard platform:
- **Render / Railway / Fly.io / Heroku:** Set `AQ_TOKEN` in the platform environment variables and run `npm start`.
- **Node.js Production:** Set `NODE_ENV=production` and `PORT=8080`.

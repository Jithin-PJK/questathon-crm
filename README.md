# FlytBase CS Intelligence CRM

A real-time Customer Success intelligence and portfolio management platform built for the **Questathon** competition. The application integrates with the Questathon Model Context Protocol (MCP) server to monitor autonomous drone deployments, track live operational events, bridge customer claims against ground-truth telemetry, and log strategic account notes.

---

## Overview

The FlytBase CS Intelligence CRM is designed for Customer Success Managers (CSMs) and enterprise account teams overseeing autonomous drone docking stations. It provides a single operational cockpit to:

- **Monitor Multi-Account Portfolios:** Track enterprise customer accounts, opportunity pipelines, operational flight health, and stakeholder networks.
- **Surface Real-Time Signals:** Automatically ingest live operational alerts, incoming customer tickets, and organizational changes via Questathon MCP tools (`get_signals`).
- **Bridge Claims vs. Ground Truth:** Compare official champion narratives against verified telemetry and source records.
- **Execute Account Action Plans:** Log action items, risk flags, and strategic notes back to the live server via MCP (`write_note`).
- **Handle Server Drops Dynamically:** Detect and integrate new accounts released during live evaluation rounds.

---

## Key Features

- **FlytBase Official Design System:** A clean, dark-mode command center styled with FlytBase's brand identity (Charcoal base, Signal Orange accent, and Eucalyptus status indicators).
- **Zero-Barrier Direct Workspace:** Instant access to portfolio analytics and account workspaces without friction.
- **Multi-Account Support:** Seamless switching across all active customer accounts, with automated synchronization for newly released drops.
- **5-Dimension Account Framework:** Structured analysis of pipeline valuation, stakeholder power dynamics, prioritized next steps, looming operational threats, and information blindspots.
- **Autonomous MCP Synchronization:** Background polling, live event notifications, relative time tracking, and unread alert drawers.
- **Rate Limit & Cooldown Engine:** Built-in safeguards respecting Questathon's 1-call-per-minute policy, featuring cooldown tracking and intelligent local caching.

---

## System Architecture

```
questathon-crm/
├── server.js              # Express API server & Questathon MCP client
├── public/
│   └── index.html         # Single-page application with FlytBase UI & real-time engine
├── data/                  # Local persistence (Export snapshots, signals, notes, drops)
│   ├── questathon_export.json
│   ├── signals.json
│   └── notes.json
├── test_app.js            # Automated verification & integration test suite
├── package.json           # Node.js project manifest & scripts
└── .env                   # Environment configuration (git-ignored)
```

---

## Getting Started

### Prerequisites
- **Node.js** (v18 or newer)
- **npm** or **pnpm**
- A valid **Questathon API Token** (`AQ_TOKEN`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Jithin-PJK/questathon-crm.git
   cd questathon-crm
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```bash
   AQ_TOKEN=your_questathon_api_token_here
   PORT=3000
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## Verification & Testing

To run the automated end-to-end test suite:

```bash
node test_app.js
```

The test script validates:
1. Server health and token verification (`/api/health`)
2. Status and sync tracking (`/api/status`)
3. Dashboard data integrity and account ceilings (`/api/dashboard`)
4. Rate limit enforcement and MCP cooldown handling (`/api/refresh`)
5. Authentication and credential validation (`/api/auth/login`)
6. Account synchronization (`/api/accounts/sync`)
7. Frontend delivery and UI asset integrity

---

## Deployment

The application is lightweight, uses standard Node.js without native C++ compilation, and is ready for one-click deployment:

- **Render / Railway / Fly.io:**
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Environment Variable: Add `AQ_TOKEN` with your Questathon API token.
- **Production Mode:** Set `NODE_ENV=production` and configure your preferred `PORT`.

---

## License

MIT License. Built for Questathon by FlytBase Customer Success.

# Base Gym — Weekly WOD Planner

A single-file web app that reads your gym's training log from Google Sheets, calls the Claude AI API, and generates a ready-to-use 5-day CrossFit programming plan — with per-day tweaks and save-back to Sheets.

---

## How it works

```
Google Sheets (training log)
        │
        │  GET ?action=getLogs
        ▼
  Code.gs (Apps Script web app)
        │
        │  JSON { log: "..." }
        ▼
  Boxplan.html (runs in browser)
        │
        │  POST /v1/messages
        ▼
  Claude Sonnet API
        │
        │  JSON weekly plan
        ▼
  Rendered day grid  ──► Save back to Sheets
```

1. On page load, `Boxplan.html` fetches the last 60 rows of training data from your Google Sheets via the Apps Script URL.
2. The coach fills in optional focus notes and selects the athlete level.
3. Clicking **Generate Week Plan** sends the log + notes to Claude Sonnet, which returns a structured 5-day plan as JSON.
4. The plan is rendered as a card grid (Mon–Fri). Each card shows a strength block, a metcon with time domain, and three scaling tiers (RX / Scaled / Beginner).
5. Any day can be individually tweaked with a freetext instruction, which fires another Claude call to regenerate just that day.
6. The finished plan can be copied as plain text, printed/saved as PDF, or pushed back to a *Generated Plans* tab in the same Google Sheets.

---

## Files

| File | Purpose |
|------|---------|
| `Boxplan.html` | The entire front-end — open this in a browser |
| `Code.gs` | Google Apps Script backend — deployed as a web app |
| `crossfit_log_25_29_march.xlsx` | Sample training log (import into Google Sheets) |

---

## Prerequisites

- A modern browser (Chrome, Firefox, Edge, Safari)
- An [Anthropic API key](https://console.anthropic.com/) with credits
- A Google account to host the Apps Script backend

---

## Setup

### 1. Set up Google Sheets + Apps Script

1. Create a new Google Sheets spreadsheet.
2. Import your training log into the first tab. The default tab name expected by `Code.gs` is `Sheet1` — change `LOG_SHEET_NAME` at the top of `Code.gs` if your tab is named differently.
3. Open **Extensions → Apps Script** and paste the contents of `Code.gs` into the editor.
4. Click **Deploy → New deployment**, choose type **Web app**.
   - Execute as: *Me*
   - Who has access: *Anyone* (required for the browser to call it without OAuth)
5. Copy the deployment URL — it looks like:
   ```
   https://script.google.com/macros/s/<ID>/exec
   ```
6. In `Boxplan.html`, find the constant near the bottom of the `<script>` block and replace the URL:
   ```js
   const SHEETS_URL = 'https://script.google.com/macros/s/<YOUR_ID>/exec';
   ```

### 2. Open the planner

Double-click `Boxplan.html` or open it with:

```powershell
Start-Process Boxplan.html
```

### 3. Enter your API key

On the first click of **Generate Week Plan**, a prompt will ask for your Anthropic API key. It is stored in `localStorage` and never sent anywhere except directly to `api.anthropic.com`.

To clear a saved key, run in the browser console:
```js
localStorage.removeItem('anthropicKey')
```

---

## Using the planner

### Generating a plan

1. The training log loads automatically from Sheets on page open (status shown next to the panel title).
2. Optionally fill in **Focus / notes for next week** — deload week, upcoming competition, equipment notes, athlete injuries, etc.
3. Choose the **Athletes level** that best matches your class.
4. Click **GENERATE WEEK PLAN**.

The plan renders as five day cards with:
- A **weekly theme** banner
- **Strength block** — title, sets/reps/loading
- **Metcon** — WOD name, description, time domain
- **Scaling** — RX / Scaled / Beginner tiers

### Tweaking a single day

Each day card has a text area at the bottom. Describe the change you want (e.g. *"shorter metcon, no burpees, athlete has a knee injury"*) and click **↺ REDO** or press `Ctrl+Enter`. Only that day is regenerated — the rest of the plan is untouched.

### Exporting

| Button | What it does |
|--------|-------------|
| **Copy as Text** | Copies the full plan to clipboard as plain text |
| **Print / Save PDF** | Opens the browser print dialog — use "Save as PDF" |
| **Save to Sheets** | Appends all 5 days to a *Generated Plans* tab in your spreadsheet, with ISO week number, dates, and a saved timestamp |

### Heslo dňa

A "Quote / motto of the day" field below the generate button. Default value is *Hala Madrid*. Edit it freely — it is for display purposes only.

---

## Google Sheets data format

### Training log (source tab)

The Apps Script reads every non-empty row and joins the cells with ` | `. The last `N` rows (default 60) are sent to Claude as context. Column names do not matter — just keep rows readable.

Example rows:
```
02.06.2025 | Back Squat 5x5 @ 100kg | Metcon: Fran 21-15-9 | Time: 4:32
03.06.2025 | Rest day
```

### Generated Plans (output tab)

Created automatically on first save. Columns:

| Week # | Date | Week Theme | Day | Strength | Strength Details | Coach Note | Metcon | Metcon Details | Time Domain | RX | Scaled | Beginner | Date Saved |
|--------|------|-----------|-----|----------|-----------------|-----------|--------|---------------|-------------|-----|--------|----------|------------|

---

## Architecture notes

- **Zero dependencies** — no npm, no bundler, no server. Everything runs in one HTML file.
- **API key security** — the key is stored in `localStorage` and sent directly from the browser to `api.anthropic.com`. It never touches the Apps Script or any other server.
- **CORS** — the `anthropic-dangerous-direct-browser-access: true` header is required because the call is made from a browser rather than a server. This is intentional and documented by Anthropic for browser-based integrations.
- **Model** — uses `claude-sonnet-4-20250514`. To switch models, change the `model` field in both `fetch` calls inside `generatePlan()` and `tweakDay()`.
- **Metric only** — all prompts instruct Claude to use kg, meters, and km. Imperial units are not generated.

---

## Customisation

| What | Where |
|------|-------|
| Accent color | CSS variable `--accent: #4E8D28` at the top of `<style>` |
| Day card colors | `DAY_COLORS` array in the `<script>` block |
| Default motto | `value="Hala Madrid"` on the `#hesloDna` input |
| Log sheet tab name | `LOG_SHEET_NAME` at the top of `Code.gs` |
| Rows fetched from Sheets | `?limit=60` in `loadFromSheets()` |
| Max tokens per generation | `max_tokens: 4000` in `generatePlan()` |
| Max tokens per tweak | `max_tokens: 1000` in `tweakDay()` |

---

## Troubleshooting

**"Training log not loaded yet"**
The Apps Script URL is unreachable. Check that:
- The deployment is still active (Apps Script → Deploy → Manage deployments)
- Access is set to *Anyone*
- The `SHEETS_URL` constant in `Boxplan.html` matches your deployment URL

**"HTTP 401" or "HTTP 403" from API**
Your Anthropic API key is wrong or revoked. Clear it from localStorage and re-enter.

**"HTTP 529" or "overloaded_error"**
Anthropic API is under load. Wait a few seconds and try again.

**Plan saves to Sheets but dates are off**
Ensure the `weekStart` value being passed is a valid `YYYY-MM-DD` string. This is derived from `nextMon.toISOString()` and should always be correct unless the browser clock is wrong.

**Apps Script returns an error about `Sheet1`**
Your training log tab is named differently. Edit `LOG_SHEET_NAME` in `Code.gs` and redeploy.

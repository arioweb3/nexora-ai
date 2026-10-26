# NEXORA AI

**Intelligence. Insights. Innovation.**  
A crypto market intelligence dashboard built by **ARIO WEB3**.

NEXORA AI is an independent React + TypeScript project designed as a polished portfolio product. It combines public cryptocurrency market data, interactive price history, a locally stored portfolio tracker, a watchlist, and an explicitly configurable AI explainer.

> NEXORA AI is an informational product, not financial advice. Crypto assets are volatile. Market data can be delayed, incomplete, or rate-limited.

## Features

- **Live market data:** CoinGecko public API; current prices, 24-hour percentage changes, market caps, volumes, and 7-day sparklines for the top 100 returned assets.
- **Interactive chart:** Select a listed asset and inspect historical prices over 1 day, 7 days, 30 days, or 90 days. Historical intervals depend on upstream API availability.
- **Markets table:** Search, sort by market-cap rank, price, 24-hour change or volume, and add/remove watchlist assets.
- **Portfolio tracker:** Add asset quantities and optional buy prices, estimate current value and P/L, and remove holdings. No wallet connection is required.
- **Watchlist:** Stored in browser LocalStorage.
- **AI Market Explainer integration point:** Without a configured backend the app clearly explains that AI is not connected; it does not fabricate AI responses.
- **Responsive dark UI:** Sidebar navigation, accessible labels, loading/error states, mobile layout and reduced-motion support.
- **Branding:** Built by ARIO WEB3; this is a separate project and does not alter ARIO Ethereum Blockchain Explorer.

## Tech stack

- React 18, TypeScript 5, Vite 6
- Tailwind CSS 3 (available for extension), custom responsive CSS
- Recharts for interactive price-history charts
- CoinGecko public API for market data
- LocalStorage for portfolio, watchlist and preferences
- ESLint and TypeScript build checks

## Requirements

- Node.js 20.19+ or 22.12+ recommended for Vite 6
- npm
- Internet access for live market data and remote font loading

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Quality checks

```bash
npm run lint
npm run build
npm run preview
```

`npm run build` runs TypeScript project checks and creates the production bundle in `dist/`.

## Data source and rate limits

The browser calls the public CoinGecko API at `api.coingecko.com/api/v3` without an API key. Public service availability and request limits can change. NEXORA refreshes the market list every two minutes and also exposes a manual refresh button. If requests are rate-limited or the network is unavailable, an error state is shown; the app does not intentionally replace failed live data with fabricated market figures.

Data source: [CoinGecko API documentation](https://docs.coingecko.com/)

## AI backend: secure configuration

The AI explainer is deliberately not presented as working AI until an endpoint is configured. Set `VITE_AI_ENDPOINT` to your backend endpoint (see `.env.example`) and restart/rebuild the frontend.

**Important:** Vite variables prefixed with `VITE_` are bundled into client code and are public. The endpoint URL is not a secret, but an AI provider API key must never be stored in a `VITE_*` variable or committed to GitHub.

Recommended backend design:
1. Provide an HTTPS `POST /api/explain` endpoint on a server or serverless function.
2. Store the provider key in the hosting platform's server-side environment secrets.
3. Validate input length and request schema; apply rate limits, abuse protection and CORS allowlists.
4. Accept `{ "question": "...", "market": [...] }` and return `{ "answer": "..." }`.
5. Never accept wallet seed phrases or private keys. Do not claim certainty about future prices.

The current frontend sends a JSON POST to the configured endpoint and expects an `answer` string in its JSON response. The endpoint must implement that contract.

## Deploy to GitHub Pages

1. Create a new repository named `nexora-ai` under your GitHub account.
2. Upload/commit the project files (not the ZIP file alone; GitHub must contain `package.json` and `src/` at the repository root).
3. In repository **Settings → Pages**, choose **GitHub Actions** as the build and deployment source.
4. Add the workflow below at `.github/workflows/deploy.yml`.
5. Push/commit the workflow. After the Actions workflow succeeds, the Pages site should be available at `https://arioweb3.github.io/nexora-ai/`. Treat this as the expected URL until GitHub Pages confirms deployment.

### GitHub Actions workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy NEXORA AI to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm install
      - run: GITHUB_PAGES=true npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

## Upload from a phone

1. Download and extract `nexora-ai.zip` using your phone's Files app.
2. Open GitHub in your mobile browser and sign in.
3. Create a **new public repository** named `nexora-ai`. Do not choose or reuse `ario-blockchain-explorer`.
4. Open the new repository, tap **Add file → Upload files** (desktop view may be easier).
5. Select the extracted project files and folders. Ensure `package.json`, `src`, `public`, and config files appear at the repository root—not inside an extra nested `nexora-ai/nexora-ai` folder.
6. Commit the files to `main`. If mobile upload of many files is difficult, use GitHub's web upload from a desktop browser or GitHub Desktop.
7. Add `.github/workflows/deploy.yml` as described above, then enable Pages with **GitHub Actions**.
8. Wait for the workflow in the **Actions** tab to finish successfully. Open the deployment URL shown by GitHub.

## Brand and anti-copying guidance

The project includes ARIO WEB3 attribution in the app and README. This is attribution, not technical copy protection. No public website can guarantee that nobody copies its visible design or client-side code. For clearer ownership:
- Keep your original Git history and publish under your account.
- Add a license that matches how you want others to reuse the code. No license is included by default; without a license, standard copyright applies, though repository hosting still exposes the code.
- Consider adding your own brand logo, trademark and a short copyright notice after confirming you have rights to those marks.
- Never commit secrets, wallet credentials or private keys.

## Project structure

```text
nexora-ai/
├── public/
├── src/
│   ├── components/       # Reserved for future reusable UI components
│   ├── lib/market.ts     # CoinGecko API and formatting helpers
│   ├── App.tsx           # App pages and interactions
│   ├── main.tsx
│   └── styles.css
├── .env.example
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig*.json
└── vite.config.ts
```

## Current limitations

- Market prices and history require internet access and the upstream API; public API limits are outside this project's control.
- The UI uses USD market values. Settings for EUR/GBP are saved as display preferences only and do not convert prices.
- Portfolio entries are browser-local and do not sync across devices. P/L is an estimate based on each entered buy price and current market quote, excluding fees/taxes.
- AI explanations require a separately deployed secure backend and are not active by default.
- This deliverable should be run through `npm install`, `npm run lint`, and `npm run build` in a Node environment before public release. The generated project files have not been executed in this environment.

## Credits

Built with care by **ARIO WEB3**.  
**NEXORA AI — Intelligence. Insights. Innovation.**

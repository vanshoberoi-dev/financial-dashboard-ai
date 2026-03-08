# ð° financial-dashboard-ai

> An intelligent, all-in-one personal finance dashboard built for Indian investors â powered by AI, real-time market data, and a clean minimalist design.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-16A34A?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://python.org/)

---

## ð Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Data Sources](#-data-sources)
- [Contributing](#-contributing)
- [License](#-license)

---

## ð Overview

**financial-dashboard-ai** is a full-stack personal finance platform built specifically for the Indian financial ecosystem. It consolidates your mutual funds, stocks, insurance policies, and tax calculations into a single elegant dashboard, augmented by an AI financial advisor that understands Indian markets, tax laws, and investment products.

Whether you are a salaried professional trying to decide between the old and new tax regimes, a retail investor tracking your Groww portfolio, or someone comparing term insurance policies â this dashboard is your unified financial cockpit.

> **Design Philosophy:** Clean, minimalist light mode â white/cream backgrounds (`#FAFAF7`), subtle confident green (`#16A34A`) for positive indicators, with generous whitespace and typography-first layouts that keep your financial data readable and stress-free.

---

## â¨ Features

### ð Portfolio Dashboard
- **Net Worth Tracker** â Aggregated real-time view across mutual funds, stocks, and other assets
- **Holdings Summary** â Interactive pie charts powered by Recharts showing asset allocation by category, sector, and individual holding
- **Gain/Loss Indicators** â Absolute and percentage returns with colour-coded indicators
- **Historical Performance** â Line charts for portfolio value over time (1M, 3M, 6M, 1Y, All)

### ð¦ Mutual Fund Central Connect
- **OTP-based CAS Fetch** â Securely authenticate with MF Central using your PAN and registered mobile OTP to fetch your Consolidated Account Statement
- **NAV Tracking** â Live NAV updates for all held schemes via the official AMFI NAV API
- **Scheme Details** â Fund house, category, AUM, expense ratio, and NAV history
- **SIP Tracker** â Monitor active SIP mandates, next installment dates, and cumulative investments

### ð¤ AI Financial Advisor
- **Gemini 2.0 Flash Powered** â Conversational AI built on Google's Gemini 2.0 Flash model, fine-tuned with prompts aware of Indian financial regulations, SEBI guidelines, and tax laws
- **Personalized Advice** â Context-aware suggestions based on your actual portfolio data, risk profile, and financial goals
- **Tax Optimisation Tips** â AI-driven suggestions for ELSS investments, 80C deductions, and regime selection
- **Market Insights** â Ask questions about specific mutual fund schemes, sectors, or macroeconomic events
- **Conversation History** â Persistent chat history per session with markdown-rendered responses

### ð Stock Tracker
- **Groww CSV Import** â Upload your holdings export from Groww and instantly populate your stock portfolio
- **Live NSE Prices** â Real-time equity prices fetched from NSE India data feeds
- **P&L Analysis** â Realised and unrealised gains, average cost basis, and XIRR calculations
- **Watchlist** â Add any NSE-listed equity to a personal watchlist with price alerts

### ð¡ï¸ Insurance Comparator
- **Multi-Insurer Support** â Compare term, endowment, ULIP, and health insurance products across LIC, HDFC Life, and ICICI Prudential
- **Side-by-Side Comparison** â Premium, sum assured, policy term, claim settlement ratio, and key riders in a structured comparison table
- **Eligibility Filter** â Filter policies by age, sum assured range, premium budget, and policy type
- **IRR Calculator** â Calculate effective return on investment for endowment and money-back plans

### ð§¾ Tax Calculator
- **FY 2024-25 Ready** â Updated slabs for both Old and New tax regimes as per Union Budget 2024
- **Regime Comparison** â Side-by-side net tax liability under both regimes for instant decision-making
- **Deduction Planner** â Itemised entry for 80C, 80D, HRA, LTA, standard deduction, NPS (80CCD), home loan interest, and more
- **Surcharge & Cess** â Accurate computation including applicable surcharge and 4% health & education cess
- **Downloadable Report** â Export tax computation summary as PDF

---

## ð ï¸ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | Next.js 14 (App Router) | SSR/SSG, routing, API routes |
| **Styling** | Tailwind CSS 3.4 | Utility-first responsive design |
| **UI Components** | shadcn/ui | Accessible, composable component library |
| **Charts** | Recharts 2.x | Portfolio pie charts, line graphs, bar charts |
| **Backend Framework** | FastAPI 0.111 | High-performance Python REST API |
| **Database** | SQLite + SQLAlchemy 2.x | Local persistent storage for holdings and history |
| **ASGI Server** | Uvicorn | Production-grade async Python server |
| **AI Engine** | Gemini 2.0 Flash (`google-generativeai`) | Conversational AI financial advisor |
| **Mutual Fund Data** | AMFI NAV API | Official NAV feed for all Indian MF schemes |
| **Equity Data** | NSE India | Live and historical stock prices |
| **MF Portfolio** | MF Central API | OTP-authenticated CAS fetch |
| **Language** | TypeScript (Frontend), Python 3.11+ (Backend) | Type safety across the stack |

---

## ðï¸ Project Structure

```
financial-dashboard-ai/
âââ README.md
âââ LICENSE
âââ .gitignore
â
âââ frontend/                          # Next.js 14 Application
â   âââ app/
â   â   âââ layout.tsx                 # Root layout with providers
â   â   âââ page.tsx                   # Dashboard home page
â   â   âââ globals.css                # Tailwind base + custom tokens
â   â   âââ (dashboard)/
â   â   â   âââ portfolio/
â   â   â   â   âââ page.tsx           # Portfolio overview
â   â   â   âââ mutual-funds/
â   â   â   â   âââ page.tsx           # MF holdings & NAV tracker
â   â   â   â   âââ connect/
â   â   â   â       âââ page.tsx       # MF Central OTP connect flow
â   â   â   âââ stocks/
â   â   â   â   âââ page.tsx           # Stock tracker & watchlist
â   â   â   â   âââ import/
â   â   â   â       âââ page.tsx       # Groww CSV import
â   â   â   âââ insurance/
â   â   â   â   âââ page.tsx           # Insurance comparator
â   â   â   âââ tax/
â   â   â   â   âââ page.tsx           # Tax calculator
â   â   â   âââ advisor/
â   â   â       âââ page.tsx           # AI financial advisor chat
â   â   âââ api/
â   â       âââ proxy/
â   â           âââ route.ts           # Optional Next.js API proxy
â   âââ components/
â   â   âââ ui/                        # shadcn/ui generated components
â   â   â   âââ button.tsx
â   â   â   âââ card.tsx
â   â   â   âââ dialog.tsx
â   â   â   âââ input.tsx
â   â   â   âââ select.tsx
â   â   â   âââ table.tsx
â   â   â   âââ tabs.tsx
â   â   â   âââ tooltip.tsx
â   â   âââ layout/
â   â   â   âââ Sidebar.tsx            # Main navigation sidebar
â   â   â   âââ Header.tsx             # Top bar with user info
â   â   â   âââ MobileNav.tsx          # Responsive mobile navigation
â   â   âââ portfolio/
â   â   â   âââ NetWorthCard.tsx       # Net worth summary tile
â   â   â   âââ AllocationPieChart.tsx # Asset allocation donut chart
â   â   â   âââ PerformanceLineChart.tsx
â   â   â   âââ HoldingsTable.tsx
â   â   âââ mutual-funds/
â   â   â   âââ MFCentralConnect.tsx   # OTP flow component
â   â   â   âââ SchemeCard.tsx         # Individual fund card
â   â   â   âââ NAVChart.tsx           # Historical NAV line chart
â   â   â   âââ SIPTracker.tsx
â   â   âââ stocks/
â   â   â   âââ StockTable.tsx         # Holdings with live prices
â   â   â   âââ GrowwImport.tsx        # CSV drag-and-drop uploader
â   â   â   âââ Watchlist.tsx
â   â   â   âââ PLSummary.tsx
â   â   âââ insurance/
â   â   â   âââ PolicyFilter.tsx       # Filter sidebar
â   â   â   âââ ComparisonTable.tsx    # Side-by-side policy table
â   â   â   âââ IRRCalculator.tsx
â   â   âââ tax/
â   â   â   âââ IncomeForm.tsx         # Income & deduction inputs
â   â   â   âââ RegimeComparison.tsx   # Old vs New regime table
â   â   â   âââ DeductionChecklist.tsx
â   â   â   âââ TaxBreakdownChart.tsx
â   â   âââ advisor/
â   â       âââ ChatWindow.tsx         # Scrollable message thread
â   â       âââ MessageBubble.tsx      # User & AI message components
â   â       âââ SuggestedQuestions.tsx # Quick-action question chips
â   âââ lib/
â   â   âââ api.ts                     # Axios/fetch client for FastAPI
â   â   âââ formatters.ts              # INR formatting, date utils
â   â   âââ constants.ts               # App-wide constants
â   â   âââ types.ts                   # Shared TypeScript interfaces
â   âââ hooks/
â   â   âââ usePortfolio.ts            # Portfolio data hook
â   â   âââ useMutualFunds.ts
â   â   âââ useStocks.ts
â   â   âââ useChat.ts                 # AI advisor chat state
â   âââ public/
â   â   âââ favicon.ico
â   â   âââ screenshots/               # README screenshots
â   âââ tailwind.config.ts             # Custom green theme tokens
â   âââ next.config.ts
â   âââ tsconfig.json
â   âââ package.json
â
âââ backend/                           # FastAPI Application
â   âââ main.py                        # App entry point & router registration
â   âââ config.py                      # Settings via pydantic-settings
â   âââ database.py                    # SQLAlchemy engine & session
â   âââ models/
â   â   âââ __init__.py
â   â   âââ user.py                    # User profile model
â   â   âââ holding.py                 # Mutual fund & stock holdings
â   â   âââ transaction.py             # Buy/sell transaction history
â   â   âââ chat_message.py            # AI advisor conversation log
â   âââ schemas/
â   â   âââ __init__.py
â   â   âââ portfolio.py               # Pydantic request/response schemas
â   â   âââ mutual_fund.py
â   â   âââ stock.py
â   â   âââ insurance.py
â   â   âââ tax.py
â   â   âââ chat.py
â   âââ routers/
â   â   âââ __init__.py
â   â   âââ portfolio.py               # /api/portfolio endpoints
â   â   âââ mutual_funds.py            # /api/mutual-funds endpoints
â   â   âââ stocks.py                  # /api/stocks endpoints
â   â   âââ insurance.py               # /api/insurance endpoints
â   â   âââ tax.py                     # /api/tax endpoints
â   â   âââ advisor.py                 # /api/advisor chat endpoints
â   âââ services/
â   â   âââ __init__.py
â   â   âââ amfi_service.py            # AMFI NAV API integration
â   â   âââ mf_central_service.py      # MF Central OTP + CAS fetch
â   â   âââ nse_service.py             # NSE live price fetcher
â   â   âââ insurance_service.py       # Insurance product data & logic
â   â   âââ tax_service.py             # Old/new regime computation engine
â   â   âââ gemini_service.py          # Gemini 2.0 Flash AI service
â   âââ utils/
â   â   âââ __init__.py
â   â   âââ csv_parser.py              # Groww CSV parser
â   â   âââ xirr.py                    # XIRR calculation utility
â   â   âââ formatters.py             # Number formatting helpers
â   âââ data/
â   â   âââ insurance_products.json    # Seeded insurance product data
â   âââ tests/
â   â   âââ test_tax_service.py
â   â   âââ test_amfi_service.py
â   â   âââ test_portfolio.py
â   âââ requirements.txt
â   âââ .env.example
â   âââ alembic/                       # Database migrations
â       âââ env.py
â       âââ versions/
â
âââ docker-compose.yml                 # Optional Docker setup
```

---

## ð¸ Screenshots

> Screenshots are located in `frontend/public/screenshots/`.

| Portfolio Dashboard | AI Financial Advisor |
|:---:|:---:|
| ![Portfolio Dashboard](frontend/public/screenshots/portfolio-dashboard.png) | ![AI Advisor](frontend/public/screenshots/ai-advisor.png) |

| Mutual Fund Central | Tax Calculator |
|:---:|:---:|
| ![MF Central](frontend/public/screenshots/mf-central.png) | ![Tax Calculator](frontend/public/screenshots/tax-calculator.png) |

| Stock Tracker | Insurance Comparator |
|:---:|:---:|
| ![Stock Tracker](frontend/public/screenshots/stock-tracker.png) | ![Insurance](frontend/public/screenshots/insurance-comparator.png) |

---

## ð Getting Started

### Prerequisites

Ensure the following are installed on your system:

| Tool | Version | Installation |
|---|---|---|
| Node.js | 18.17+ | [nodejs.org](https://nodejs.org/) |
| Python | 3.11+ | [python.org](https://python.org/) |
| npm / pnpm | Latest | Bundled with Node.js / `npm i -g pnpm` |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/financial-dashboard-ai.git
cd financial-dashboard-ai
```

---

### Backend Setup

#### Step 1 â Create and activate a virtual environment

```bash
cd backend
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows (Command Prompt)
venv\Scripts\activate.bat

# Windows (PowerShell)
venv\Scripts\Activate.ps1
```

#### Step 2 â Install Python dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### Step 3 â Configure environment variables

```bash
cp .env.example .env
# Open .env and fill in your API keys (see Environment Variables section below)
```

#### Step 4 â Initialise the database

```bash
# Run Alembic migrations to create SQLite schema
alembic upgrade head
```

#### Step 5 â Start the FastAPI server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive Swagger docs: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`

---

### Frontend Setup

#### Step 1 â Install Node.js dependencies

```bash
cd ../frontend
npm install
# or, if using pnpm:
pnpm install
```

#### Step 2 â Configure environment variables

```bash
cp .env.local.example .env.local
# Open .env.local and set NEXT_PUBLIC_API_URL to your backend URL
```

#### Step 3 â Start the development server

```bash
npm run dev
# or
pnpm dev
```

The dashboard will be available at `http://localhost:3000`

#### Step 4 â Build for production (optional)

```bash
npm run build
npm run start
```

---

### Docker Compose (Optional)

To run both services together with a single command:

```bash
# From the project root
docker-compose up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

---

## ð Environment Variables

### Backend â `backend/.env`

```env
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
# Application
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
APP_ENV=development                        # development | production
SECRET_KEY=your-super-secret-key-here      # Used for session signing
ALLOWED_ORIGINS=http://localhost:3000      # CORS allowed origins (comma-separated)

# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
# Database
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
DATABASE_URL=sqlite:///./financial_dashboard.db

# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
# Google Gemini AI
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
GEMINI_API_KEY=your-google-gemini-api-key  # Get from https://ai.google.dev/
GEMINI_MODEL=gemini-2.0-flash              # Model identifier

# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
# MF Central API
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
MF_CENTRAL_BASE_URL=https://www.mfcentral.com
MF_CENTRAL_API_KEY=your-mf-central-api-key # Request access from MF Central

# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
# NSE Data
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
NSE_BASE_URL=https://www.nseindia.com
NSE_REQUEST_TIMEOUT=10                     # Seconds

# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
# AMFI
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
AMFI_NAV_URL=https://www.amfiindia.com/spages/NAVAll.txt

# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
# Cache (optional Redis â falls back to in-memory)
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
REDIS_URL=redis://localhost:6379/0         # Optional: remove for in-memory cache
NAV_CACHE_TTL_SECONDS=3600                 # Cache NAV data for 1 hour
NSE_CACHE_TTL_SECONDS=60                   # Cache NSE prices for 1 minute
```

### Frontend â `frontend/.env.local`

```env
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
# API Configuration
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
NEXT_PUBLIC_API_URL=http://localhost:8000  # FastAPI backend base URL

# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
# Application
# âââââââââââââââââââââââââââââââââââââââââââââââââââââ
NEXT_PUBLIC_APP_NAME=financial-dashboard-ai
NEXT_PUBLIC_APP_ENV=development
```

> **Security Note:** Never commit `.env` or `.env.local` files to version control. Both files are listed in `.gitignore`. Always use `.env.example` / `.env.local.example` as templates.

---

## ð¡ API Reference

All endpoints are prefixed with `/api`. The full interactive documentation is available at `http://localhost:8000/docs` when the backend is running.

### Portfolio

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/portfolio/summary` | Aggregate net worth, total invested, current value, overall P&L |
| `GET` | `/api/portfolio/holdings` | All holdings (MF + stocks) with current values |
| `GET` | `/api/portfolio/performance` | Historical portfolio value time series |
| `GET` | `/api/portfolio/allocation` | Asset allocation breakdown for pie chart |

### Mutual Funds

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/mutual-funds/connect/initiate` | Initiate MF Central OTP for given PAN |
| `POST` | `/api/mutual-funds/connect/verify` | Verify OTP and fetch CAS from MF Central |
| `GET` | `/api/mutual-funds/holdings` | User's mutual fund holdings with NAV |
| `GET` | `/api/mutual-funds/nav/{scheme_code}` | Current NAV for a specific scheme |
| `GET` | `/api/mutual-funds/nav/{scheme_code}/history` | Historical NAV for charts |
| `GET` | `/api/mutual-funds/schemes/search` | Search AMFI scheme master by name or code |
| `GET` | `/api/mutual-funds/sips` | List active SIP mandates |

### Stocks

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/stocks/import/groww` | Upload Groww CSV and parse holdings |
| `GET` | `/api/stocks/holdings` | Stock holdings with live NSE prices |
| `GET` | `/api/stocks/quote/{symbol}` | Live quote for a single NSE symbol |
| `GET` | `/api/stocks/watchlist` | User's stock watchlist |
| `POST` | `/api/stocks/watchlist` | Add symbol to watchlist |
| `DELETE` | `/api/stocks/watchlist/{symbol}` | Remove symbol from watchlist |
| `GET` | `/api/stocks/pl/summary` | Realised and unrealised P&L summary |

### Insurance

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/insurance/products` | List all available insurance products |
| `GET` | `/api/insurance/products/{product_id}` | Detailed product information |
| `POST` | `/api/insurance/compare` | Compare up to 3 policies side-by-side |
| `POST` | `/api/insurance/irr` | Calculate IRR for an endowment/ULIP policy |
| `GET` | `/api/insurance/insurers` | List supported insurers |

### Tax Calculator

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tax/calculate` | Calculate tax for both regimes given income & deductions |
| `GET` | `/api/tax/slabs` | Current FY 2024-25 tax slabs for both regimes |
| `GET` | `/api/tax/deductions` | List of all available deductions with limits |
| `POST` | `/api/tax/report` | Generate and return a PDF tax computation report |

### AI Financial Advisor

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/advisor/chat` | Send a message and receive a streaming AI response |
| `GET` | `/api/advisor/history` | Retrieve conversation history for current session |
| `DELETE` | `/api/advisor/history` | Clear conversation history |
| `GET` | `/api/advisor/suggestions` | Context-aware suggested questions based on portfolio |

### Request / Response Example

**POST** `/api/tax/calculate`

```json
// Request Body
{
  "gross_salary": 1500000,
  "other_income": 50000,
  "deductions": {
    "section_80c": 150000,
    "section_80d": 25000,
    "hra_exemption": 120000,
    "standard_deduction": 50000,
    "nps_80ccd": 50000,
    "home_loan_interest": 200000
  },
  "age": 32
}

// Response Body
{
  "old_regime": {
    "taxable_income": 955000,
    "tax_before_cess": 114000,
    "surcharge": 0,
    "cess": 4560,
    "total_tax": 118560,
    "effective_rate": 7.91
  },
  "new_regime": {
    "taxable_income": 1450000,
    "tax_before_cess": 175000,
    "surcharge": 0,
    "cess": 7000,
    "total_tax": 182000,
    "effective_rate": 12.14
  },
  "recommendation": "old_regime",
  "savings": 63440
}
```

---

## ð Data Sources

| Source | Data Provided | Update Frequency | Access |
|---|---|---|---|
| [AMFI India](https://www.amfiindia.com/spages/NAVAll.txt) | All mutual fund NAVs | Daily (post 9:00 PM IST) | Public |
| [MF Central](https://www.mfcentral.com) | Consolidated Account Statement, SIP mandates | Real-time | OTP Auth |
| [NSE India](https://www.nseindia.com) | Live equity prices, historical OHLCV | Market hours (9:15 AM â 3:30 PM IST) | Public |
| LIC / HDFC Life / ICICI Prudential | Insurance product details, premiums, claim ratios | Periodic manual update | Public / Scraped |
| Internal JSON (`data/insurance_products.json`) | Seeded insurance product catalogue | Manual | Bundled |

---

## ðï¸ Architecture Overview

```
âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
â                      Browser / Mobile                        â
â              Next.js 14 (App Router + RSC)                   â
â    Tailwind CSS  â  shadcn/ui  â  Recharts  â  TypeScript     â
ââââââââââââââââââââââââââ¬âââââââââââââââââââââââââââââââââââââ
                         â HTTP / REST (JSON)
                         â Streaming (SSE for AI chat)
ââââââââââââââââââââââââââ¼âââââââââââââââââââââââââââââââââââââ
â                     FastAPI Backend                          â
â                    (Uvicorn ASGI)                            â
â  ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ   â
â  â  Routers: portfolio â mf â stocks â insurance â tax   â   â
â  â           advisor                                    â   â
â  ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ   â
â  ââââââââââââ  ââââââââââââ  ââââââââââââ  âââââââââââââ   â
â  â  SQLite  â  â  AMFI    â  â NSE Indiaâ  â  Gemini   â   â
â  âSQLAlchemyâ  â  NAV API â  â  Prices  â  â 2.0 Flash â   â
â  ââââââââââââ  ââââââââââââ  ââââââââââââ  âââââââââââââ   â
â                    ââââââââââââââââ                          â
â                    â  MF Central  â                          â
â                    â  OTP + CAS   â                          â
â                    ââââââââââââââââ                          â
âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
```

---

## ð¤ Contributing

Contributions are welcome and appreciated! This project follows a standard fork-and-pull-request workflow.

### Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/your-username/financial-dashboard-ai.git
   ```
3. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** with clear, atomic commits
5. **Write or update tests** for any backend logic changes
6. **Run the test suite** before submitting:
   ```bash
   # Backend tests
   cd backend
   pytest tests/ -v

   # Frontend lint & type check
   cd frontend
   npm run lint
   npm run type-check
   ```
7. **Push** your branch and open a **Pull Request** against `main`

### Contribution Guidelines

- Follow the existing code style â Prettier for TypeScript, Black + isort for Python
- Add meaningful commit messages following [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat:` new features
  - `fix:` bug fixes
  - `docs:` documentation changes
  - `refactor:` code restructuring
  - `test:` adding or updating tests
  - `chore:` tooling/config changes
- All new API endpoints must include Pydantic schemas and Swagger docstrings
- UI components should be responsive and accessible (WCAG AA minimum)
- Do not commit sensitive data, API keys, or `.env` files

### Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/your-username/financial-dashboard-ai/issues/new/choose) using the appropriate template. Include:
- A clear title and description
- Steps to reproduce (for bugs)
- Expected vs actual behaviour
- Your OS, Node.js version, and Python version

---

## â ï¸ Disclaimer

This project is intended **for educational and personal use only**. It is not a SEBI-registered investment advisor. The AI-generated financial advice is based on general knowledge and should not be treated as professional financial, tax, or legal advice. Always consult a qualified financial advisor before making investment decisions. The developers are not responsible for any financial losses incurred through the use of this software.

---

## ð License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full details.

```
MIT License

Copyright (c) 2024 financial-dashboard-ai contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

<div align="center">

Built with â¤ï¸ for Indian investors &nbsp;|&nbsp; Powered by Next.js, FastAPI & Gemini AI

**[â¬ Back to Top](#-financial-dashboard-ai)**

</div>

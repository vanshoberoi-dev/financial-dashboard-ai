# Finora -- AI-Powered Indian Personal Finance Dashboard

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=nextdotjs)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-16A34A?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active-16A34A?style=flat-square)

**Finora** is a comprehensive personal finance dashboard built specifically for Indian investors. It consolidates your mutual fund portfolio, stock holdings, insurance policies, and tax planning into a single, elegant interface -- augmented by an AI financial advisor powered by Gemini 2.0 Flash.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Data Sources](#data-sources)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Finora addresses a common problem for Indian retail investors: financial data is scattered across Zerodha, Groww, CAMS, Karvy, insurance portals, and tax filing tools. Finora pulls all of this together into one clean dashboard, giving you a real-time picture of your net worth, portfolio allocation, insurance coverage, and tax liability -- with an AI advisor ready to answer questions about your specific financial situation.

Designed with a light, minimalist aesthetic using a white/cream base (`#FAFAF7`) and a signature green (`#16A34A`), Finora is as pleasant to use daily as it is powerful.

---

## Features

### Portfolio Dashboard
- Unified net worth calculation across all asset classes
- Holdings summary with interactive pie charts via Recharts
- Day-over-day and absolute gain/loss tracking
- Asset allocation breakdown: equity, debt, gold, insurance, cash

### Mutual Fund Central Connect
- OTP-based authentication with MF Central to fetch your Consolidated Account Statement (CAS)
- Automatic parsing of fund names, folios, units, and current NAV
- NAV tracking via the official AMFI NAV API (updated daily)
- Historical NAV charts with selectable time ranges

### AI Financial Advisor
- Conversational chat interface powered by Gemini 2.0 Flash
- Context-aware responses grounded in your actual portfolio data
- Covers topics including SIP planning, tax-loss harvesting, asset rebalancing, and insurance adequacy
- Follows SEBI general guidance standards; does not provide SEBI-regulated advice

### Stock Tracker
- Import equity holdings directly from a Groww CSV export
- Live stock prices sourced from NSE India
- Displays LTP, day change, 52-week high/low, and portfolio weight
- Sortable and filterable holdings table

### Insurance Comparator
- Side-by-side comparison of term and ULIP policies from LIC, HDFC Life, and ICICI Prudential
- Inputs: age, sum assured, policy term, premium frequency
- Output: premium estimates, claim settlement ratios, and key feature matrix

### Tax Calculator
- Old regime vs. New regime comparison for FY 2024-25
- Supports standard deduction, HRA, 80C, 80D, 80CCD(1B), and home loan interest
- Visual tax liability bar chart and effective tax rate display
- Downloadable summary report

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | Next.js (App Router) | 14.x |
| Styling | Tailwind CSS | 3.x |
| UI Components | shadcn/ui | Latest |
| Charts | Recharts | 2.x |
| Language (Frontend) | TypeScript | 5.x |
| Backend Framework | FastAPI | 0.111.x |
| ASGI Server | Uvicorn | 0.29.x |
| Database | SQLite via SQLAlchemy | 2.x |
| AI Model | Gemini 2.0 Flash | google-generativeai |
| Language (Backend) | Python | 3.11+ |

---

## Project Structure

```
financial-dashboard-ai/
|
|-- frontend/                         # Next.js 14 application
|   |-- app/
|   |   |-- (dashboard)/
|   |   |   |-- page.tsx              # Portfolio overview
|   |   |   |-- mutual-funds/
|   |   |   |   |-- page.tsx
|   |   |   |-- stocks/
|   |   |   |   |-- page.tsx
|   |   |   |-- insurance/
|   |   |   |   |-- page.tsx
|   |   |   |-- tax/
|   |   |   |   |-- page.tsx
|   |   |   |-- advisor/
|   |   |       |-- page.tsx
|   |   |-- api/
|   |   |   |-- chat/
|   |   |       |-- route.ts          # AI advisor proxy route
|   |   |-- layout.tsx
|   |   |-- globals.css
|   |-- components/
|   |   |-- ui/                       # shadcn/ui primitives
|   |   |-- charts/
|   |   |   |-- AllocationPie.tsx
|   |   |   |-- NavHistory.tsx
|   |   |   |-- TaxComparison.tsx
|   |   |-- dashboard/
|   |   |   |-- NetWorthCard.tsx
|   |   |   |-- HoldingsSummary.tsx
|   |   |-- mutual-funds/
|   |   |   |-- MFCentralConnect.tsx
|   |   |   |-- FundCard.tsx
|   |   |-- stocks/
|   |   |   |-- HoldingsTable.tsx
|   |   |   |-- CsvImport.tsx
|   |   |-- insurance/
|   |   |   |-- PolicyComparator.tsx
|   |   |-- tax/
|   |   |   |-- RegimeCalculator.tsx
|   |   |-- advisor/
|   |       |-- ChatWindow.tsx
|   |       |-- MessageBubble.tsx
|   |-- lib/
|   |   |-- api.ts                    # Axios client for backend
|   |   |-- utils.ts
|   |   |-- types.ts
|   |-- hooks/
|   |   |-- usePortfolio.ts
|   |   |-- useMutualFunds.ts
|   |   |-- useStocks.ts
|   |-- public/
|   |-- tailwind.config.ts
|   |-- next.config.ts
|   |-- tsconfig.json
|   |-- package.json
|
|-- backend/                          # FastAPI application
|   |-- app/
|   |   |-- main.py                   # FastAPI entry point
|   |   |-- database.py               # SQLAlchemy setup
|   |   |-- models/
|   |   |   |-- user.py
|   |   |   |-- holding.py
|   |   |   |-- fund.py
|   |   |   |-- insurance.py
|   |   |-- routers/
|   |   |   |-- portfolio.py
|   |   |   |-- mutual_funds.py
|   |   |   |-- stocks.py
|   |   |   |-- insurance.py
|   |   |   |-- tax.py
|   |   |   |-- advisor.py
|   |   |-- services/
|   |   |   |-- amfi_service.py       # AMFI NAV fetcher
|   |   |   |-- nse_service.py        # NSE price fetcher
|   |   |   |-- mfcentral_service.py  # MF Central CAS
|   |   |   |-- gemini_service.py     # Gemini 2.0 Flash client
|   |   |   |-- tax_service.py        # Tax regime logic
|   |   |-- schemas/
|   |   |   |-- portfolio.py
|   |   |   |-- fund.py
|   |   |   |-- stock.py
|   |   |   |-- tax.py
|   |   |-- utils/
|   |       |-- csv_parser.py         # Groww CSV parser
|   |       |-- cas_parser.py         # MF Central CAS parser
|   |-- requirements.txt
|   |-- .env
|
|-- .gitignore
|-- README.md
|-- LICENSE
```

---

## Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **Python** 3.11 or higher
- **pip** and **virtualenv** (or `venv`)
- A Google AI Studio API key for Gemini 2.0 Flash
- Git

### Backend Setup

**1. Navigate to the backend directory**

```bash
cd financial-dashboard-ai/backend
```

**2. Create and activate a virtual environment**

```bash
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Configure environment variables**

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values. See the [Environment Variables](#environment-variables) section for details.

**5. Initialize the database**

```bash
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

**6. Start the development server**

```bash
uvicorn app.main:app --reload --port 8000
```

The FastAPI server will be available at `http://localhost:8000`. The interactive API docs are at `http://localhost:8000/docs`.

---

### Frontend Setup

**1. Navigate to the frontend directory**

```bash
cd financial-dashboard-ai/frontend
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values.

**4. Start the development server**

```bash
npm run dev
```

The Next.js application will be available at `http://localhost:3000`.

**5. Build for production**

```bash
npm run build
npm start
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key for Gemini 2.0 Flash | `AIzaSy...` |
| `DATABASE_URL` | SQLAlchemy database connection string | `sqlite:///./finora.db` |
| `MFCENTRAL_BASE_URL` | MF Central API base URL | `https://www.mfcentral.com/api` |
| `NSE_BASE_URL` | NSE India data endpoint | `https://www.nseindia.com` |
| `AMFI_NAV_URL` | AMFI daily NAV flat file URL | `https://www.amfiindia.com/spages/NAVAll.txt` |
| `SECRET_KEY` | JWT signing secret (if auth is enabled) | `your-secret-key-here` |
| `CORS_ORIGINS` | Comma-separated list of allowed origins | `http://localhost:3000` |
| `DEBUG` | Enable debug logging | `true` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend | `http://localhost:8000` |
| `NEXT_PUBLIC_APP_NAME` | Application display name | `Finora` |
| `GEMINI_API_KEY` | Gemini key used in the Next.js API route | `AIzaSy...` |

---

## API Reference

### Portfolio

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/portfolio/summary` | Returns net worth, total invested, total current value, and day change |
| `GET` | `/api/v1/portfolio/allocation` | Returns asset allocation percentages for pie chart rendering |

### Mutual Funds

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/mf/cas/request-otp` | Initiates OTP request to MF Central for the given PAN and mobile number |
| `POST` | `/api/v1/mf/cas/verify-otp` | Verifies OTP and fetches CAS data from MF Central |
| `GET` | `/api/v1/mf/holdings` | Returns parsed mutual fund holdings with current NAV |
| `GET` | `/api/v1/mf/nav/{scheme_code}` | Returns current and historical NAV for a specific scheme |
| `GET` | `/api/v1/mf/nav/all` | Fetches and caches the full AMFI NAV dataset |

### Stocks

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/stocks/import` | Accepts a Groww CSV file upload and parses holdings |
| `GET` | `/api/v1/stocks/holdings` | Returns stored equity holdings |
| `GET` | `/api/v1/stocks/price/{symbol}` | Returns live NSE price for a given ticker symbol |
| `GET` | `/api/v1/stocks/prices` | Returns live prices for all stored holdings in a single batch |

### Insurance

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/insurance/compare` | Accepts comparison parameters and returns policy matrix |
| `GET` | `/api/v1/insurance/providers` | Returns list of supported insurers and available policy types |

### Tax Calculator

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/tax/calculate` | Accepts income and deduction inputs; returns old and new regime tax liability |
| `GET` | `/api/v1/tax/slabs` | Returns current FY 2024-25 tax slab data for both regimes |

### AI Advisor

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/advisor/chat` | Accepts a message and optional portfolio context; returns Gemini-generated advice |
| `GET` | `/api/v1/advisor/history` | Returns chat history for the current session |
| `DELETE` | `/api/v1/advisor/history` | Clears chat history for the current session |

---

## Data Sources

| Source | Usage | Notes |
|---|---|---|
| **AMFI NAV API** | Daily mutual fund NAV data | Public flat file, updated every business day by 11:00 PM IST |
| **MF Central** | Consolidated Account Statement (CAS) | Requires PAN-linked mobile OTP authentication |
| **NSE India** | Live equity prices and historical OHLC data | Rate limits apply; responses are cached for 60 seconds |
| **Groww CSV Export** | Equity holdings import | Downloaded manually from the Groww app or website |

---

## Contributing

Contributions are welcome. Please read the guidelines below before opening a pull request.

**1. Fork and clone the repository**

```bash
git clone https://github.com/your-username/financial-dashboard-ai.git
cd financial-dashboard-ai
```

**2. Create a feature branch**

```bash
git checkout -b feature/your-feature-name
```

**3. Follow code style conventions**

- Frontend: ESLint + Prettier (config included). Run `npm run lint` before committing.
- Backend: Black + isort + Flake8. Run `black . && isort . && flake8` before committing.
- Write meaningful commit messages in the imperative present tense: `Add NAV chart component`, not `Added NAV chart`.

**4. Write tests where applicable**

- Backend: pytest is used. Add tests under `backend/tests/`.
- Frontend: Vitest and React Testing Library. Add tests alongside components.

**5. Open a pull request**

Please include a clear description of what was changed and why. Reference any related issues using `Closes #issue-number`.

**Reporting Issues**

Please use the GitHub Issues tab. Include your OS, Node/Python version, and steps to reproduce.

---

## License

This project is licensed under the **MIT License**.

See the [LICENSE](./LICENSE) file for the full text.

---

## Disclaimer

Finora is a personal finance tool intended for informational and educational purposes only. The AI Advisor does not constitute registered investment advice under SEBI regulations. Always consult a SEBI-registered financial advisor before making investment decisions. The creators of Finora are not liable for any financial decisions made based on information displayed in this application.

---

*Built with care for the Indian investor.*
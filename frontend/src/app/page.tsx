"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// TypeScript interfaces
// ---------------------------------------------------------------------------
interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  investedValue: number;
  totalGain: number;
  totalGainPercent: number;
}

interface AssetAllocation {
  category: string;
  value: number;
  percentage: number;
  icon: string;
  color: string;
  change: number;
}

interface PerformancePoint {
  month: string;
  value: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "credit" | "debit";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatINR(value: number): string {
  if (value >= 100000) {
    return `â¹${(value / 100000).toFixed(2)}L`;
  }
  if (value >= 1000) {
    return `â¹${(value / 1000).toFixed(1)}K`;
  }
  return `â¹${value.toFixed(0)}`;
}

function formatFullINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const mockSummary: PortfolioSummary = {
  totalValue: 4823500,
  dayChange: 12340,
  dayChangePercent: 0.26,
  investedValue: 3950000,
  totalGain: 873500,
  totalGainPercent: 22.11,
};

const mockAllocations: AssetAllocation[] = [
  {
    category: "Mutual Funds",
    value: 2145000,
    percentage: 44.5,
    icon: "ð",
    color: "#16A34A",
    change: 1.45,
  },
  {
    category: "Stocks",
    value: 1380000,
    percentage: 28.6,
    icon: "ð¢",
    color: "#2563EB",
    change: -0.87,
  },
  {
    category: "Insurance",
    value: 750000,
    percentage: 15.5,
    icon: "ð¡ï¸",
    color: "#7C3AED",
    change: 0.0,
  },
  {
    category: "Savings",
    value: 548500,
    percentage: 11.4,
    icon: "ð¦",
    color: "#D97706",
    change: 0.53,
  },
];

const mockPerformance: PerformancePoint[] = [
  { month: "Oct '23", value: 3850000 },
  { month: "Nov '23", value: 3920000 },
  { month: "Dec '23", value: 3780000 },
  { month: "Jan '24", value: 4050000 },
  { month: "Feb '24", value: 4310000 },
  { month: "Mar '24", value: 4823500 },
];

const mockTransactions: Transaction[] = [
  {
    id: "1",
    date: "2024-03-18",
    description: "SIP â Mirae Asset Large Cap Fund",
    category: "Mutual Funds",
    amount: 10000,
    type: "debit",
  },
  {
    id: "2",
    date: "2024-03-17",
    description: "Dividend â Infosys Ltd",
    category: "Stocks",
    amount: 3420,
    type: "credit",
  },
  {
    id: "3",
    date: "2024-03-15",
    description: "LIC Premium â Jeevan Anand",
    category: "Insurance",
    amount: 25000,
    type: "debit",
  },
  {
    id: "4",
    date: "2024-03-14",
    description: "SIP â Axis Bluechip Fund",
    category: "Mutual Funds",
    amount: 5000,
    type: "debit",
  },
  {
    id: "5",
    date: "2024-03-12",
    description: "FD Interest â SBI",
    category: "Savings",
    amount: 8750,
    type: "credit",
  },
  {
    id: "6",
    date: "2024-03-10",
    description: "Buy â Reliance Industries (5 shares)",
    category: "Stocks",
    amount: 14650,
    type: "debit",
  },
];

// ---------------------------------------------------------------------------
// Sub-components (inline, no separate file needed for the page)
// ---------------------------------------------------------------------------

function NetWorthCard({ summary, loading }: { summary: PortfolioSummary | null; loading: boolean }) {
  const isPositiveDay = (summary?.dayChange ?? 0) >= 0;
  const isPositiveTotal = (summary?.totalGain ?? 0) >= 0;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #16A34A 0%, #15803D 60%, #166534 100%)",
      }}
      className="rounded-2xl p-6 text-white shadow-lg col-span-full"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-green-100 text-sm font-medium uppercase tracking-wider mb-1">
            Total Net Worth
          </p>
          {loading ? (
            <div className="h-10 w-48 bg-green-700 animate-pulse rounded-lg" />
          ) : (
            <p className="text-4xl font-bold tracking-tight">
              {formatFullINR(summary?.totalValue ?? 0)}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                isPositiveDay ? "bg-green-600 text-white" : "bg-red-500 text-white"
              }`}
            >
              {isPositiveDay ? "â²" : "â¼"} {summary?.dayChangePercent.toFixed(2)}%
            </span>
            <span className="text-green-100 text-sm">
              {isPositiveDay ? "+" : ""}
              {formatINR(summary?.dayChange ?? 0)} today
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="bg-white/10 rounded-xl p-4 min-w-[140px]">
            <p className="text-green-100 text-xs uppercase tracking-wider">Invested</p>
            <p className="text-xl font-bold mt-1">{formatINR(summary?.investedValue ?? 0)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 min-w-[140px]">
            <p className="text-green-100 text-xs uppercase tracking-wider">Total Gain</p>
            <p
              className={`text-xl font-bold mt-1 ${
                isPositiveTotal ? "text-white" : "text-red-300"
              }`}
            >
              {isPositiveTotal ? "+" : ""}
              {formatINR(summary?.totalGain ?? 0)}
            </p>
            <p className="text-green-200 text-xs">
              {isPositiveTotal ? "+" : ""}
              {summary?.totalGainPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetCard({ asset, loading }: { asset: AssetAllocation; loading: boolean }) {
  const isPositive = asset.change >= 0;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{asset.icon}</span>
          <span className="text-sm font-semibold text-gray-600">{asset.category}</span>
        </div>
        {!loading && asset.change !== 0 && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {isPositive ? "â²" : "â¼"} {Math.abs(asset.change)}%
          </span>
        )}
      </div>
      {loading ? (
        <>
          <div className="h-7 w-32 bg-gray-200 animate-pulse rounded mb-2" />
          <div className="h-3 w-full bg-gray-100 rounded-full" />
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900">{formatINR(asset.value)}</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">{formatFullINR(asset.value)}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${asset.percentage}%`, backgroundColor: asset.color }}
              />
            </div>
            <span className="text-xs text-gray-500 font-medium w-10 text-right">
              {asset.percentage}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function PortfolioChart({
  data,
  loading,
}: {
  data: PerformancePoint[];
  loading: boolean;
}) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-base font-bold text-gray-900">
            {formatFullINR(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="h-5 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-56 bg-gray-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Portfolio Performance</h2>
          <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
        </div>
        <span className="text-xs bg-green-50 text-green-700 font-semibold px-3 py-1 rounded-full">
          +25.3% this period
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatINR(v)}
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#16A34A"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#16A34A", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#16A34A", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.type === "credit";
  const categoryColors: Record<string, string> = {
    "Mutual Funds": "bg-green-50 text-green-700",
    Stocks: "bg-blue-50 text-blue-700",
    Insurance: "bg-purple-50 text-purple-700",
    Savings: "bg-yellow-50 text-yellow-700",
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${
            isCredit ? "bg-green-50" : "bg-gray-50"
          }`}
        >
          {isCredit ? "ð°" : "ð¤"}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800 leading-tight">
            {tx.description}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                categoryColors[tx.category] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {tx.category}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(tx.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </div>
      </div>
      <p
        className={`text-sm font-bold ${
          isCredit ? "text-green-600" : "text-gray-700"
        }`}
      >
        {isCredit ? "+" : "-"}â¹{tx.amount.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [performance, setPerformance] = useState<PerformancePoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName] = useState("Rahul");

  const today = formatDate(new Date());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, allocRes, perfRes, txRes] = await Promise.allSettled([
          axios.get("/api/portfolio/summary"),
          axios.get("/api/portfolio/allocation"),
          axios.get("/api/portfolio/performance"),
          axios.get("/api/portfolio/transactions"),
        ]);

        setSummary(
          summaryRes.status === "fulfilled" ? summaryRes.value.data : mockSummary
        );
        setAllocations(
          allocRes.status === "fulfilled" ? allocRes.value.data : mockAllocations
        );
        setPerformance(
          perfRes.status === "fulfilled" ? perfRes.value.data : mockPerformance
        );
        setTransactions(
          txRes.status === "fulfilled" ? txRes.value.data : mockTransactions
        );
      } catch {
        setSummary(mockSummary);
        setAllocations(mockAllocations);
        setPerformance(mockPerformance);
        setTransactions(mockTransactions);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <main
      className="min-h-screen px-4 py-8 md:px-8 lg:px-12"
      style={{ backgroundColor: "#FAFAF7" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* ----------------------------------------------------------------- */}
        {/* Header */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Good morning, {userName}! ð
            </h1>
            <p className="text-sm text-gray-500 mt-1">{today}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="self-start sm:self-auto flex items-center gap-2 text-sm bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl shadow-sm hover:shadow-md hover:border-green-300 transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Error Banner */}
        {/* ----------------------------------------------------------------- */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Net Worth Card */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-5 mb-5">
          <NetWorthCard summary={summary} loading={loading} />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Asset Allocation Grid */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-5">
          <h2 className="text-base font-bold text-gray-700 mb-3 px-1">Asset Allocation</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse"
                  >
                    <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
                    <div className="h-7 w-28 bg-gray-200 rounded mb-3" />
                    <div className="h-2 w-full bg-gray-100 rounded-full" />
                  </div>
                ))
              : (allocations.length > 0 ? allocations : mockAllocations).map((asset) => (
                  <AssetCard key={asset.category} asset={asset} loading={false} />
                ))}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* Chart + Recent Transactions */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart â takes 2 cols on large screens */}
          <div className="lg:col-span-2">
            <PortfolioChart
              data={performance.length > 0 ? performance : mockPerformance}
              loading={loading}
            />
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Recent Transactions</h2>
                <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
              </div>
              <button className="text-xs text-green-700 font-semibold hover:underline">
                View all
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3.5 w-40 bg-gray-200 animate-pulse rounded mb-1.5" />
                      <div className="h-2.5 w-24 bg-gray-100 animate-pulse rounded" />
                    </div>
                    <div className="h-3.5 w-16 bg-gray-200 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {(transactions.length > 0 ? transactions : mockTransactions).map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Footer note */}
        {/* ----------------------------------------------------------------- */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Last updated: {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} Â· Data is for informational purposes only
        </p>
      </div>
    </main>
  );
}

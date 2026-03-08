"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Upload,
  Search,
  LayoutGrid,
  Table,
  X,
  RefreshCw,
  IndianRupee,
  AlertCircle,
} from "lucide-react";

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface Holding {
  symbol: string;
  name: string;
  sector: string;
  qty: number;
  avgBuyPrice: number;
  currentPrice: number;
  dayChange: number;   // %
  exchange: "NSE" | "BSE";
}

interface SectorBreakdown {
  sector: string;
  value: number;
  color: string;
}

// âââ Helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);

const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

const pnlClass = (v: number) =>
  v >= 0 ? "text-emerald-400" : "text-rose-400";

const pnlBg = (v: number) =>
  v >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20";

// âââ Mock Data (fallback when API is unavailable) ââââââââââââââââââââââââââââ

const MOCK_HOLDINGS: Holding[] = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", sector: "Energy", qty: 50, avgBuyPrice: 2340, currentPrice: 2891.45, dayChange: 1.23, exchange: "NSE" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", qty: 30, avgBuyPrice: 3410, currentPrice: 3654.80, dayChange: -0.45, exchange: "NSE" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", sector: "Banking", qty: 80, avgBuyPrice: 1540, currentPrice: 1723.60, dayChange: 0.88, exchange: "NSE" },
  { symbol: "INFY", name: "Infosys Ltd", sector: "IT", qty: 60, avgBuyPrice: 1420, currentPrice: 1567.30, dayChange: -1.12, exchange: "NSE" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", sector: "Banking", qty: 100, avgBuyPrice: 870, currentPrice: 1089.75, dayChange: 2.01, exchange: "NSE" },
  { symbol: "WIPRO", name: "Wipro Ltd", sector: "IT", qty: 120, avgBuyPrice: 420, currentPrice: 478.50, dayChange: 0.34, exchange: "NSE" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", sector: "NBFC", qty: 15, avgBuyPrice: 6200, currentPrice: 7342.10, dayChange: -0.78, exchange: "NSE" },
  { symbol: "ASIANPAINT", name: "Asian Paints Ltd", sector: "Consumer", qty: 25, avgBuyPrice: 2800, currentPrice: 3012.40, dayChange: 1.56, exchange: "NSE" },
  { symbol: "MARUTI", name: "Maruti Suzuki India Ltd", sector: "Auto", qty: 10, avgBuyPrice: 8900, currentPrice: 10234.55, dayChange: -2.14, exchange: "NSE" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Ind", sector: "Pharma", qty: 45, avgBuyPrice: 950, currentPrice: 1178.90, dayChange: 0.67, exchange: "NSE" },
  { symbol: "LT", name: "Larsen & Toubro Ltd", sector: "Infra", qty: 20, avgBuyPrice: 2200, currentPrice: 3456.75, dayChange: 3.12, exchange: "NSE" },
  { symbol: "ONGC", name: "Oil & Natural Gas Corp", sector: "Energy", qty: 200, avgBuyPrice: 145, currentPrice: 189.30, dayChange: -0.23, exchange: "NSE" },
];

const SECTOR_COLORS: Record<string, string> = {
  IT: "#6366f1",
  Banking: "#0ea5e9",
  Energy: "#f59e0b",
  NBFC: "#ec4899",
  Consumer: "#10b981",
  Auto: "#f97316",
  Pharma: "#8b5cf6",
  Infra: "#14b8a6",
};

// âââ CSVImporter Component ââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface CSVImporterProps {
  onClose: () => void;
  onImport: (holdings: Holding[]) => void;
}

function CSVImporter({ onClose, onImport }: CSVImporterProps) {
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<Holding[]>([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const sampleCSV = `symbol,name,sector,qty,avgBuyPrice,currentPrice,dayChange,exchange
RELIANCE,Reliance Industries Ltd,Energy,50,2340,2891.45,1.23,NSE
TCS,Tata Consultancy Services,IT,30,3410,3654.80,-0.45,NSE`;

  const parseCSV = (text: string) => {
    try {
      setError("");
      const lines = text.trim().split("\n");
      if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");
      const headers = lines[0].split(",").map((h) => h.trim());
      const required = ["symbol", "name", "sector", "qty", "avgBuyPrice", "currentPrice", "dayChange", "exchange"];
      for (const r of required) {
        if (!headers.includes(r)) throw new Error(`Missing column: ${r}`);
      }
      const results: Holding[] = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => (row[h] = vals[i] ?? ""));
        return {
          symbol: row.symbol,
          name: row.name,
          sector: row.sector,
          qty: parseFloat(row.qty),
          avgBuyPrice: parseFloat(row.avgBuyPrice),
          currentPrice: parseFloat(row.currentPrice),
          dayChange: parseFloat(row.dayChange),
          exchange: (row.exchange as "NSE" | "BSE") || "NSE",
        };
      });
      setParsed(results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to parse CSV");
    }
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => parseCSV((e.target?.result as string) || "");
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-semibold text-lg">Import from CSV</h2>
            <p className="text-gray-400 text-sm mt-0.5">Upload your holdings in CSV format</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-white/20"
            }`}
            onClick={() => document.getElementById("csv-input")?.click()}
          >
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            {fileName ? (
              <p className="text-white font-medium">{fileName}</p>
            ) : (
              <>
                <p className="text-white font-medium">Drop your CSV file here</p>
                <p className="text-gray-500 text-sm mt-1">or click to browse</p>
              </>
            )}
          </div>

          {/* Sample CSV */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-400 text-xs font-mono whitespace-pre-wrap">{sampleCSV}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          {/* Preview */}
          {parsed.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">
                Ready to import <span className="text-white font-semibold">{parsed.length}</span> holdings
              </p>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 sticky top-0">
                    <tr>
                      {["Symbol", "Qty", "Avg Price", "Current"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-gray-400 text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((h, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-3 py-2 text-white font-medium">{h.symbol}</td>
                        <td className="px-3 py-2 text-gray-300">{h.qty}</td>
                        <td className="px-3 py-2 text-gray-300">{formatINR(h.avgBuyPrice)}</td>
                        <td className="px-3 py-2 text-gray-300">{formatINR(h.currentPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              disabled={parsed.length === 0}
              onClick={() => { onImport(parsed); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors text-sm font-medium"
            >
              Import {parsed.length > 0 ? `${parsed.length} Holdings` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// âââ StockTable Component âââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface StockTableProps {
  holdings: Holding[];
}

function StockTable({ holdings }: StockTableProps) {
  const headers = ["Symbol", "Company", "Sector", "Qty", "Avg Price", "LTP", "Invested", "Current Value", "P&L", "P&L %", "Day Change"];

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/5">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((stock, i) => {
            const invested = stock.qty * stock.avgBuyPrice;
            const current = stock.qty * stock.currentPrice;
            const pnl = current - invested;
            const pnlPct = (pnl / invested) * 100;
            return (
              <tr
                key={stock.symbol}
                className={`border-t border-white/5 hover:bg-white/5 transition-colors ${
                  i % 2 === 0 ? "" : "bg-white/[0.02]"
                }`}
              >
                <td className="px-4 py-3">
                  <span className="font-bold text-white">{stock.symbol}</span>
                  <span className="ml-1.5 text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-medium">
                    {stock.exchange}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap max-w-[180px] truncate">{stock.name}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{stock.sector}</span>
                </td>
                <td className="px-4 py-3 text-gray-300">{formatNumber(stock.qty)}</td>
                <td className="px-4 py-3 text-gray-300">{formatINR(stock.avgBuyPrice)}</td>
                <td className="px-4 py-3 text-white font-medium">{formatINR(stock.currentPrice)}</td>
                <td className="px-4 py-3 text-gray-400">{formatINR(invested)}</td>
                <td className="px-4 py-3 text-white">{formatINR(current)}</td>
                <td className={`px-4 py-3 font-medium ${pnlClass(pnl)}`}>
                  {pnl >= 0 ? "+" : ""}{formatINR(pnl)}
                </td>
                <td className={`px-4 py-3 font-medium ${pnlClass(pnlPct)}`}>
                  {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                </td>
                <td className={`px-4 py-3 font-medium ${pnlClass(stock.dayChange)}`}>
                  <div className="flex items-center gap-1">
                    {stock.dayChange >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    {stock.dayChange >= 0 ? "+" : ""}{stock.dayChange.toFixed(2)}%
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// âââ StockCard Component ââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function StockCard({ stock }: { stock: Holding }) {
  const invested = stock.qty * stock.avgBuyPrice;
  const current = stock.qty * stock.currentPrice;
  const pnl = current - invested;
  const pnlPct = (pnl / invested) * 100;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 hover:bg-white/[0.07] transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">{stock.symbol}</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-medium">
              {stock.exchange}
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[180px]">{stock.name}</p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${pnlClass(stock.dayChange)}`}>
          {stock.dayChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {stock.dayChange >= 0 ? "+" : ""}{stock.dayChange.toFixed(2)}%
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <div>
            <p className="text-gray-500 text-xs">LTP</p>
            <p className="text-white font-semibold">{formatINR(stock.currentPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs">Qty</p>
            <p className="text-white font-semibold">{formatNumber(stock.qty)}</p>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        <div className="flex justify-between">
          <div>
            <p className="text-gray-500 text-xs">Invested</p>
            <p className="text-gray-300 text-sm">{formatINR(invested)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs">Current</p>
            <p className="text-gray-300 text-sm">{formatINR(current)}</p>
          </div>
        </div>

        <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${pnlBg(pnl)}`}>
          <span className="text-xs text-gray-400">P&amp;L</span>
          <div className="text-right">
            <span className={`font-semibold text-sm ${pnlClass(pnl)}`}>
              {pnl >= 0 ? "+" : ""}{formatINR(pnl)}
            </span>
            <span className={`ml-2 text-xs ${pnlClass(pnlPct)}`}>
              ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <span className="text-[11px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">{stock.sector}</span>
      </div>
    </div>
  );
}

// âââ Summary Card âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface SummaryCardProps {
  title: string;
  value: string;
  sub?: string;
  positive?: boolean;
  icon: React.ReactNode;
  accent: string;
}

function SummaryCard({ title, value, sub, positive, icon, accent }: SummaryCardProps) {
  return (
    <div className={`bg-white/5 border rounded-2xl p-5 border-white/10`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-400 text-sm">{title}</p>
        <div className={`p-2 rounded-xl ${accent}`}>{icon}</div>
      </div>
      <p className="text-white text-2xl font-bold tracking-tight">{value}</p>
      {sub !== undefined && (
        <p className={`text-sm mt-1 font-medium ${positive === undefined ? "text-gray-400" : positive ? "text-emerald-400" : "text-rose-400"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

// âââ Sector Chart âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function SectorChart({ data }: { data: SectorBreakdown[] }) {
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: SectorBreakdown; value: number }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#1a1f2e] border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
          <p className="text-white font-semibold">{d.sector}</p>
          <p className="text-gray-400">{formatINR(d.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-white font-semibold mb-4">Sector Breakdown</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="sector"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `â¹${(v / 100000).toFixed(0)}L`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// âââ Main Page âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function StocksPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [showImporter, setShowImporter] = useState(false);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stocks/holdings");
      if (!res.ok) throw new Error("API returned non-OK status");
      const data = await res.json();
      setHoldings(data.holdings || data);
    } catch {
      // Fallback to mock data
      setHoldings(MOCK_HOLDINGS);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const handleImport = (newHoldings: Holding[]) => {
    setHoldings((prev) => {
      const symbols = new Set(newHoldings.map((h) => h.symbol));
      return [...prev.filter((h) => !symbols.has(h.symbol)), ...newHoldings];
    });
  };

  // Computed values
  const filtered = holdings.filter(
    (h) =>
      h.symbol.toLowerCase().includes(search.toLowerCase()) ||
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.sector.toLowerCase().includes(search.toLowerCase())
  );

  const totalInvested = holdings.reduce((acc, h) => acc + h.qty * h.avgBuyPrice, 0);
  const totalCurrent = holdings.reduce((acc, h) => acc + h.qty * h.currentPrice, 0);
  const totalPnL = totalCurrent - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const dayPnL = holdings.reduce((acc, h) => {
    const prevPrice = h.currentPrice / (1 + h.dayChange / 100);
    return acc + h.qty * (h.currentPrice - prevPrice);
  }, 0);

  const sectorBreakdown: SectorBreakdown[] = Object.entries(
    holdings.reduce<Record<string, number>>((acc, h) => {
      acc[h.sector] = (acc[h.sector] || 0) + h.qty * h.currentPrice;
      return acc;
    }, {})
  ).map(([sector, value]) => ({
    sector,
    value,
    color: SECTOR_COLORS[sector] || "#6b7280",
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ââ Header ââ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Stock Portfolio</h1>
            <p className="text-gray-400 mt-1">Track your equity holdings</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-gray-500 text-xs hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={fetchHoldings}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowImporter(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
          </div>
        </div>

        {/* ââ Summary Cards ââ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Total Invested"
            value={formatINR(totalInvested)}
            sub={`${holdings.length} stocks`}
            icon={<IndianRupee className="w-4 h-4 text-indigo-400" />}
            accent="bg-indigo-500/10"
          />
          <SummaryCard
            title="Current Value"
            value={formatINR(totalCurrent)}
            sub={totalPnLPct >= 0 ? `+${totalPnLPct.toFixed(2)}% returns` : `${totalPnLPct.toFixed(2)}% returns`}
            positive={totalPnLPct >= 0}
            icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
            accent="bg-emerald-500/10"
          />
          <SummaryCard
            title="Day's P&L"
            value={(dayPnL >= 0 ? "+" : "") + formatINR(dayPnL)}
            sub={dayPnL >= 0 ? "Positive today" : "Negative today"}
            positive={dayPnL >= 0}
            icon={
              dayPnL >= 0 ? (
                <TrendingUp className="w-4 h-4 text-sky-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              )
            }
            accent="bg-sky-500/10"
          />
          <SummaryCard
            title="Overall P&L"
            value={(totalPnL >= 0 ? "+" : "") + formatINR(totalPnL)}
            sub={(totalPnL >= 0 ? "+" : "") + totalPnLPct.toFixed(2) + "%"}
            positive={totalPnL >= 0}
            icon={
              totalPnL >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              )
            }
            accent={totalPnL >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"}
          />
        </div>

        {/* ââ Sector Chart ââ */}
        {sectorBreakdown.length > 0 && (
          <div className="mb-8">
            <SectorChart data={sectorBreakdown} />
          </div>
        )}

        {/* ââ Controls ââ */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search symbol, name or sectorâ¦"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            {filtered.length !== holdings.length && (
              <span className="text-gray-400 text-sm">
                {filtered.length} of {holdings.length} stocks
              </span>
            )}
            {/* View toggle */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "table"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Table className="w-4 h-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "card"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* ââ Loading / Error / Content ââ */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-gray-400">Fetching your holdingsâ¦</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-12 h-12 text-rose-400" />
            <p className="text-rose-400 font-medium">{error}</p>
            <button
              onClick={fetchHoldings}
              className="px-6 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm hover:bg-rose-500/20 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Search className="w-12 h-12 text-gray-600" />
            <p className="text-gray-400 font-medium">No stocks match your search</p>
            <button
              onClick={() => setSearch("")}
              className="text-indigo-400 text-sm hover:text-indigo-300 underline underline-offset-2"
            >
              Clear search
            </button>
          </div>
        ) : viewMode === "table" ? (
          <StockTable holdings={filtered} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        )}

        {/* ââ Footer stats ââ */}
        {!loading && filtered.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500 justify-end">
            <span>NSE â Live prices</span>
            <span>â</span>
            <span>{holdings.length} holdings tracked</span>
            <span>â</span>
            <span>As of {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>
        )}
      </div>

      {/* ââ CSV Importer Modal ââ */}
      {showImporter && (
        <CSVImporter
          onClose={() => setShowImporter(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

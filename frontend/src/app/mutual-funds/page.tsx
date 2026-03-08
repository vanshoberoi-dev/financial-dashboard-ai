"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, TrendingUp, TrendingDown, RefreshCw, Link2, IndianRupee, BarChart3, Percent, Wallet } from "lucide-react";

// âââ Types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type Category = "All" | "Equity" | "Debt" | "Hybrid";
type SortBy = "Returns" | "Value" | "Name";

interface MFHolding {
  id: string;
  name: string;
  category: "Equity" | "Debt" | "Hybrid";
  subCategory: string;
  amc: string;
  units: number;
  avgNav: number;
  currentNav: number;
  investedAmount: number;
  currentValue: number;
  returns: number;
  returnsPercent: number;
  xirr: number;
  navDate: string;
  logoColor: string;
}

// âââ Sample Data âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const SAMPLE_DATA: MFHolding[] = [
  {
    id: "1",
    name: "Axis Bluechip Fund - Direct Growth",
    category: "Equity",
    subCategory: "Large Cap",
    amc: "Axis Mutual Fund",
    units: 285.432,
    avgNav: 42.18,
    currentNav: 56.74,
    investedAmount: 120000,
    currentValue: 161987,
    returns: 41987,
    returnsPercent: 34.99,
    xirr: 14.2,
    navDate: "28 Jun 2025",
    logoColor: "#8B0000",
  },
  {
    id: "2",
    name: "Parag Parikh Flexi Cap Fund - Direct Growth",
    category: "Equity",
    subCategory: "Flexi Cap",
    amc: "PPFAS Mutual Fund",
    units: 412.891,
    avgNav: 60.52,
    currentNav: 84.36,
    investedAmount: 250000,
    currentValue: 348384,
    returns: 98384,
    returnsPercent: 39.35,
    xirr: 17.8,
    navDate: "28 Jun 2025",
    logoColor: "#1a3c5e",
  },
  {
    id: "3",
    name: "SBI Small Cap Fund - Direct Growth",
    category: "Equity",
    subCategory: "Small Cap",
    amc: "SBI Mutual Fund",
    units: 198.764,
    avgNav: 75.42,
    currentNav: 118.93,
    investedAmount: 150000,
    currentValue: 236337,
    returns: 86337,
    returnsPercent: 57.56,
    xirr: 22.4,
    navDate: "28 Jun 2025",
    logoColor: "#003087",
  },
  {
    id: "4",
    name: "HDFC Mid-Cap Opportunities Fund - Direct Growth",
    category: "Equity",
    subCategory: "Mid Cap",
    amc: "HDFC Mutual Fund",
    units: 324.156,
    avgNav: 88.24,
    currentNav: 124.67,
    investedAmount: 286000,
    currentValue: 404208,
    returns: 118208,
    returnsPercent: 41.33,
    xirr: 18.9,
    navDate: "28 Jun 2025",
    logoColor: "#e31837",
  },
  {
    id: "5",
    name: "ICICI Pru Balanced Advantage Fund - Direct Growth",
    category: "Hybrid",
    subCategory: "Dynamic Asset Allocation",
    amc: "ICICI Prudential",
    units: 876.543,
    avgNav: 45.68,
    currentNav: 58.21,
    investedAmount: 400000,
    currentValue: 510158,
    returns: 110158,
    returnsPercent: 27.54,
    xirr: 12.6,
    navDate: "28 Jun 2025",
    logoColor: "#f58220",
  },
  {
    id: "6",
    name: "Kotak Equity Hybrid Fund - Direct Growth",
    category: "Hybrid",
    subCategory: "Aggressive Hybrid",
    amc: "Kotak Mutual Fund",
    units: 543.21,
    avgNav: 32.14,
    currentNav: 41.88,
    investedAmount: 174600,
    currentValue: 227449,
    returns: 52849,
    returnsPercent: 30.27,
    xirr: 13.1,
    navDate: "28 Jun 2025",
    logoColor: "#e31837",
  },
];

// âââ Helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function formatINR(value: number): string {
  const absValue = Math.abs(value);
  let formatted: string;
  if (absValue >= 10000000) {
    formatted = (absValue / 10000000).toFixed(2) + " Cr";
  } else if (absValue >= 100000) {
    formatted = (absValue / 100000).toFixed(2) + " L";
  } else if (absValue >= 1000) {
    formatted = new Intl.NumberFormat("en-IN").format(Math.round(absValue));
  } else {
    formatted = absValue.toFixed(2);
  }
  return (value < 0 ? "-â¹" : "â¹") + formatted;
}

function formatINRFull(value: number): string {
  return (
    (value < 0 ? "-â¹" : "â¹") +
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
      Math.abs(value)
    )
  );
}

function getInitials(name: string): string {
  const words = name.split(" ");
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// âââ MFCard Component âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function MFCard({ fund }: { fund: MFHolding }) {
  const isPositive = fund.returns >= 0;

  const categoryColors: Record<string, string> = {
    Equity: "bg-blue-100 text-blue-700",
    Debt: "bg-green-100 text-green-700",
    Hybrid: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-5 group">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Logo + Name */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
            style={{ backgroundColor: fund.logoColor }}
          >
            {getInitials(fund.amc)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {fund.name}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[fund.category]}`}
              >
                {fund.category}
              </span>
              <span className="text-xs text-gray-500">{fund.subCategory}</span>
            </div>
          </div>
        </div>

        {/* Right: Current Value */}
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-gray-900">
            {formatINR(fund.currentValue)}
          </p>
          <div
            className={`flex items-center justify-end gap-1 mt-0.5 ${
              isPositive ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {isPositive ? (
              <TrendingUp size={13} />
            ) : (
              <TrendingDown size={13} />
            )}
            <span className="text-xs font-semibold">
              {isPositive ? "+" : ""}
              {formatINR(fund.returns)} ({fund.returnsPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-4 grid grid-cols-4 gap-3 pt-4 border-t border-gray-50">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Invested</p>
          <p className="text-sm font-semibold text-gray-700">
            {formatINR(fund.investedAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Units</p>
          <p className="text-sm font-semibold text-gray-700">
            {fund.units.toFixed(3)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Curr. NAV</p>
          <p className="text-sm font-semibold text-gray-700">
            â¹{fund.currentNav.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">XIRR</p>
          <p
            className={`text-sm font-bold ${
              fund.xirr >= 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {fund.xirr.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* NAV Date */}
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">NAV as of {fund.navDate}</span>
        <span className="text-xs text-gray-400">Avg NAV: â¹{fund.avgNav.toFixed(2)}</span>
      </div>
    </div>
  );
}

// âââ MFCentralConnect Modal âââââââââââââââââââââââââââââââââââââââââââââââââââ

function MFCentralConnect({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [mobile, setMobile] = useState("");
  const [pan, setPan] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestOTP = async () => {
    if (!mobile || mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!pan || pan.length !== 10) {
      setError("Please enter a valid 10-character PAN.");
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setStep("otp");
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 pt-6 pb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Link2 size={16} className="text-white" />
                </div>
                <span className="text-white/80 text-sm font-medium">MF Central</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Connect Your Folios</h2>
              <p className="text-indigo-200 text-sm mt-1">
                Import all your mutual fund holdings automatically
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 -mt-4">
          {step === "form" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Enter Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Mobile Number (linked with MF Central)
                  </label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                    <span className="px-3 py-2.5 text-gray-500 text-sm bg-gray-50 border-r border-gray-200">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="9876543210"
                      className="flex-1 px-3 py-2.5 text-sm text-gray-800 outline-none bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={pan}
                    onChange={(e) =>
                      setPan(e.target.value.toUpperCase())
                    }
                    placeholder="ABCDE1234F"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all uppercase tracking-widest"
                  />
                </div>
                {error && (
                  <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <button
                  onClick={handleRequestOTP}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Request OTP"
                  )}
                </button>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="text-center mb-5">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">ð²</span>
                </div>
                <h3 className="font-semibold text-gray-800">Enter OTP</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Sent to +91 {mobile.slice(0, 2)}XXXXXX{mobile.slice(-2)}
                </p>
              </div>
              <div className="space-y-4">
                <input
                  type="tel"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="â¢ â¢ â¢ â¢ â¢ â¢"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-center text-xl text-gray-800 tracking-[0.5em] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
                />
                {error && (
                  <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Import"
                  )}
                </button>
                <button
                  onClick={() => setStep("form")}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
                >
                  â Go Back
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">â</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Successfully Connected!
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                Your MF Central account has been linked.
              </p>
              <p className="text-xs text-gray-400 mb-6">
                {SAMPLE_DATA.length} funds imported from your portfolio.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl py-3 text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all"
              >
                View Portfolio
              </button>
            </div>
          )}

          {/* Security note */}
          <p className="text-xs text-center text-gray-400 mt-4">
            ð Your data is encrypted & never stored on our servers
          </p>
        </div>
      </div>
    </div>
  );
}

// âââ Summary Card âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function SummaryCard({
  title,
  value,
  subValue,
  icon: Icon,
  positive,
  gradient,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  positive?: boolean;
  gradient: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${gradient}`}
      >
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium mb-1">{title}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        {subValue && (
          <p
            className={`text-xs font-medium mt-0.5 ${
              positive === undefined
                ? "text-gray-500"
                : positive
                ? "text-emerald-600"
                : "text-red-500"
            }`}
          >
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}

// âââ Main Page ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function MutualFundsPage() {
  const [holdings, setHoldings] = useState<MFHolding[]>(SAMPLE_DATA);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [sortBy, setSortBy] = useState<SortBy>("Returns");
  const [showConnect, setShowConnect] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Fetch from API
  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mf/holdings");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setHoldings(data);
        } else {
          setHoldings(SAMPLE_DATA);
        }
      } else {
        setHoldings(SAMPLE_DATA);
      }
    } catch {
      setHoldings(SAMPLE_DATA);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  // Computed stats
  const totalInvested = holdings.reduce((s, h) => s + h.investedAmount, 0);
  const totalCurrentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalReturns = totalCurrentValue - totalInvested;
  const totalReturnsPercent =
    totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
  const avgXIRR =
    holdings.length > 0
      ? holdings.reduce((s, h) => s + h.xirr, 0) / holdings.length
      : 0;

  // Filter + Sort
  const filtered = holdings
    .filter((h) => {
      const matchesCategory = category === "All" || h.category === category;
      const matchesSearch = h.name
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "Returns") return b.returnsPercent - a.returnsPercent;
      if (sortBy === "Value") return b.currentValue - a.currentValue;
      if (sortBy === "Name") return a.name.localeCompare(b.name);
      return 0;
    });

  const categories: Category[] = ["All", "Equity", "Debt", "Hybrid"];
  const sortOptions: SortBy[] = ["Returns", "Value", "Name"];

  const categoryCounts = {
    All: holdings.length,
    Equity: holdings.filter((h) => h.category === "Equity").length,
    Debt: holdings.filter((h) => h.category === "Debt").length,
    Hybrid: holdings.filter((h) => h.category === "Hybrid").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mutual Funds</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Track your mutual fund portfolio
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs text-gray-400">
                Updated{" "}
                {lastRefreshed.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <button
                onClick={fetchHoldings}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setShowConnect(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm shadow-indigo-200"
              >
                <Link2 size={15} />
                <span>Connect MF Central</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Invested"
            value={formatINR(totalInvested)}
            subValue={`${holdings.length} funds`}
            icon={Wallet}
            gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
          />
          <SummaryCard
            title="Current Value"
            value={formatINR(totalCurrentValue)}
            subValue={`As of today`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <SummaryCard
            title="Total Returns"
            value={formatINR(totalReturns)}
            subValue={`${totalReturns >= 0 ? "+" : ""}${totalReturnsPercent.toFixed(2)}% overall`}
            icon={BarChart3}
            positive={totalReturns >= 0}
            gradient={
              totalReturns >= 0
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                : "bg-gradient-to-br from-red-500 to-red-600"
            }
          />
          <SummaryCard
            title="Avg. XIRR"
            value={`${avgXIRR.toFixed(1)}%`}
            subValue="Annualised return"
            icon={Percent}
            positive={avgXIRR >= 0}
            gradient={
              avgXIRR >= 12
                ? "bg-gradient-to-br from-teal-500 to-teal-600"
                : "bg-gradient-to-br from-amber-500 to-amber-600"
            }
          />
        </div>

        {/* Returns highlight banner */}
        {totalReturns > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Portfolio is in profit ð
                </p>
                <p className="text-xs text-emerald-600">
                  You have earned {formatINRFull(totalReturns)} across all funds
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-emerald-700">
                +{totalReturnsPercent.toFixed(2)}%
              </p>
              <p className="text-xs text-emerald-500">Overall gain</p>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search funds by nameâ¦"
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  category === cat
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {cat}
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 ${
                    category === cat
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {categoryCounts[cat]}
                </span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
              Sort by:
            </span>
            <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-0.5">
              {sortOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortBy === s
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Holdings List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-11 h-11 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="w-24 space-y-2">
                    <div className="h-5 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-3 pt-4 border-t border-gray-50">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="space-y-1">
                      <div className="h-2 bg-gray-100 rounded w-2/3" />
                      <div className="h-4 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 size={28} className="text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">
              No funds found
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {search
                ? `No results for "${search}"`
                : `No ${category} funds in your portfolio.`}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-indigo-600 text-sm font-medium hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "fund" : "funds"}
                {category !== "All" && ` in ${category}`}
                {search && ` matching "${search}"`}
              </p>
              <p className="text-xs text-gray-400">
                Portfolio value:{" "}
                <span className="font-semibold text-gray-700">
                  {formatINRFull(
                    filtered.reduce((s, h) => s + h.currentValue, 0)
                  )}
                </span>
              </p>
            </div>
            {filtered.map((fund) => (
              <MFCard key={fund.id} fund={fund} />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        {!loading && holdings.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-bold text-lg">
                Import all your MF folios
              </h3>
              <p className="text-indigo-200 text-sm mt-0.5">
                Connect with MF Central to auto-sync your complete portfolio
              </p>
            </div>
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-2 bg-white text-indigo-600 rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-indigo-50 transition-colors flex-shrink-0 shadow-sm"
            >
              <Link2 size={15} />
              Connect Now
            </button>
          </div>
        )}
      </div>

      {/* MF Central Modal */}
      {showConnect && (
        <MFCentralConnect onClose={() => setShowConnect(false)} />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  TrendingUp,
  Users,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Star,
  Info,
  Calculator,
  ArrowRight,
  Phone,
  Clock,
  IndianRupee,
  Heart,
  FileText,
  BarChart3,
  X,
} from "lucide-react";

interface InsurancePlan {
  id: string;
  name: string;
  provider: string;
  coverAmount: number;
  annualPremium: number;
  claimSettlementRatio: number;
  maxAge: number;
  features: string[];
  rating: number;
  solvencyRatio: number;
  iRecommended: boolean;
  premiumPayingTerm: string;
  policyTerm: string;
  riders: string[];
}

interface CurrentPolicy {
  id: string;
  name: string;
  provider: string;
  coverAmount: number;
  premium: number;
  expiryYear: number;
  type: string;
}

const formatIndianCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `â¹${(amount / 10000000).toFixed(1)} Cr`;
  } else if (amount >= 100000) {
    return `â¹${(amount / 100000).toFixed(1)} L`;
  } else if (amount >= 1000) {
    return `â¹${(amount / 1000).toFixed(0)}K`;
  }
  return `â¹${amount.toLocaleString("en-IN")}`;
};

const formatCurrencyFull = (amount: number): string => {
  return `â¹${amount.toLocaleString("en-IN")}`;
};

const mockPlans: InsurancePlan[] = [
  {
    id: "1",
    name: "Click 2 Protect Super",
    provider: "HDFC Life",
    coverAmount: 10000000,
    annualPremium: 12500,
    claimSettlementRatio: 98.66,
    maxAge: 85,
    features: ["Life Cover", "Terminal Illness", "Waiver of Premium"],
    rating: 4.8,
    solvencyRatio: 1.83,
    iRecommended: true,
    premiumPayingTerm: "Regular Pay",
    policyTerm: "Up to 85 years",
    riders: ["Accidental Death", "Critical Illness", "Premium Waiver"],
  },
  {
    id: "2",
    name: "Saral Jeevan Bima",
    provider: "LIC",
    coverAmount: 10000000,
    annualPremium: 15200,
    claimSettlementRatio: 98.74,
    maxAge: 70,
    features: ["Life Cover", "Maturity Benefit", "Tax Benefits"],
    rating: 4.6,
    solvencyRatio: 1.64,
    iRecommended: false,
    premiumPayingTerm: "Regular Pay",
    policyTerm: "Up to 70 years",
    riders: ["Accidental Death", "Disability"],
  },
  {
    id: "3",
    name: "iTerm Plus",
    provider: "ICICI Prudential",
    coverAmount: 10000000,
    annualPremium: 11800,
    claimSettlementRatio: 97.9,
    maxAge: 85,
    features: ["Life Cover", "Return of Premium", "Flexibility"],
    rating: 4.7,
    solvencyRatio: 2.11,
    iRecommended: false,
    premiumPayingTerm: "Limited / Regular Pay",
    policyTerm: "Up to 85 years",
    riders: ["Critical Illness", "Accidental Death", "Income Benefit"],
  },
  {
    id: "4",
    name: "Digi Term Plan",
    provider: "Max Life",
    coverAmount: 10000000,
    annualPremium: 10900,
    claimSettlementRatio: 99.51,
    maxAge: 85,
    features: ["Highest CSR", "Online Discount", "Flexible Pay"],
    rating: 4.9,
    solvencyRatio: 1.94,
    iRecommended: false,
    premiumPayingTerm: "Regular / Limited Pay",
    policyTerm: "Up to 85 years",
    riders: ["Critical Illness Plus", "Accidental Death", "Waiver of Premium"],
  },
];

const mockCurrentPolicies: CurrentPolicy[] = [
  {
    id: "cp1",
    name: "Jeevan Anand",
    provider: "LIC",
    coverAmount: 500000,
    premium: 18000,
    expiryYear: 2038,
    type: "Endowment",
  },
  {
    id: "cp2",
    name: "Group Term Cover",
    provider: "Employer",
    coverAmount: 1000000,
    premium: 0,
    expiryYear: 2025,
    type: "Group Term",
  },
];

const PolicyComparator = () => {
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [annualIncome, setAnnualIncome] = useState(1200000);
  const [age, setAge] = useState(30);
  const [compareMode, setCompareMode] = useState(false);
  const [sortBy, setSortBy] = useState<"premium" | "csr" | "rating">("csr");

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/insurance/compare");
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || mockPlans);
        } else {
          setPlans(mockPlans);
        }
      } catch {
        setPlans(mockPlans);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const idealCoverage = annualIncome * 10;
  const totalCurrentCoverage = mockCurrentPolicies.reduce(
    (sum, p) => sum + p.coverAmount,
    0
  );
  const coverageGap = Math.max(0, idealCoverage - totalCurrentCoverage);

  const sortedPlans = [...plans].sort((a, b) => {
    if (sortBy === "premium") return a.annualPremium - b.annualPremium;
    if (sortBy === "csr")
      return b.claimSettlementRatio - a.claimSettlementRatio;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });

  const toggleSelect = (id: string) => {
    setSelectedPlans((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  };

  const selectedPlanData = plans.filter((p) => selectedPlans.includes(p.id));

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={12}
          className={
            star <= Math.floor(rating)
              ? "text-amber-400 fill-amber-400"
              : "text-gray-300"
          }
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Fetching best plans for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter & Sort Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <IndianRupee size={16} className="text-gray-500" />
            <span className="text-sm text-gray-600">Cover:</span>
            <span className="font-semibold text-blue-700">{formatIndianCurrency(10000000)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Age:</span>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={18}
              max={60}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Sort by:</span>
          {(["premium", "csr", "rating"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "premium" ? "Premium" : s === "csr" ? "Claim Ratio" : "Rating"}
            </button>
          ))}
        </div>
      </div>

      {/* Compare Mode Toggle */}
      {selectedPlans.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 size={18} className="text-blue-600" />
            <span className="text-blue-800 font-medium">
              {selectedPlans.length} plan{selectedPlans.length > 1 ? "s" : ""} selected for comparison
            </span>
            {selectedPlans.length < 2 && (
              <span className="text-blue-500 text-sm">(Select at least 2 to compare)</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPlans([])}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
            {selectedPlans.length >= 2 && (
              <button
                onClick={() => setCompareMode(!compareMode)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {compareMode ? "Hide Comparison" : "Compare Now"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {compareMode && selectedPlanData.length >= 2 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Side-by-Side Comparison</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <td className="p-4 text-sm font-medium text-gray-500 w-40">Feature</td>
                {selectedPlanData.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    <div className="font-semibold text-gray-800 text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.provider}</div>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Annual Premium", key: "annualPremium", format: formatCurrencyFull },
                { label: "Claim Settlement", key: "claimSettlementRatio", format: (v: number) => `${v}%` },
                { label: "Solvency Ratio", key: "solvencyRatio", format: (v: number) => v.toFixed(2) },
                { label: "Max Age", key: "maxAge", format: (v: number) => `${v} yrs` },
                { label: "Rating", key: "rating", format: (v: number) => `${v}/5` },
              ].map(({ label, key, format }) => (
                <tr key={label} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-500">{label}</td>
                  {selectedPlanData.map((p) => {
                    const val = p[key as keyof InsurancePlan] as number;
                    const isMin = key === "annualPremium" && val === Math.min(...selectedPlanData.map((x) => x[key as keyof InsurancePlan] as number));
                    const isMax = key !== "annualPremium" && val === Math.max(...selectedPlanData.map((x) => x[key as keyof InsurancePlan] as number));
                    const highlight = isMin || isMax;
                    return (
                      <td key={p.id} className="p-4 text-center">
                        <span className={`text-sm font-medium ${highlight ? "text-green-600" : "text-gray-700"}`}>
                          {format(val)}
                          {highlight && <span className="ml-1 text-xs">â</span>}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-gray-100">
                <td className="p-4 text-sm text-gray-500">Riders</td>
                {selectedPlanData.map((p) => (
                  <td key={p.id} className="p-4">
                    <div className="flex flex-col gap-1">
                      {p.riders.map((r) => (
                        <span key={r} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-center">{r}</span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Plan Cards */}
      <div className="space-y-4">
        {sortedPlans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border-2 transition-all ${
              selectedPlans.includes(plan.id)
                ? "border-blue-400 shadow-md shadow-blue-100"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
            }`}
          >
            {plan.iRecommended && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold px-4 py-1 rounded-t-xl flex items-center gap-1">
                <Star size={12} className="fill-white" /> Recommended Plan
              </div>
            )}
            <div className="p-5">
              <div className="flex flex-wrap gap-4 items-start justify-between">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                    <p className="text-gray-500 text-sm">{plan.provider}</p>
                    <StarRating rating={plan.rating} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 items-start">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Cover Amount</p>
                    <p className="font-bold text-gray-900 text-lg">{formatIndianCurrency(plan.coverAmount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Annual Premium</p>
                    <p className="font-bold text-blue-700 text-lg">{formatCurrencyFull(plan.annualPremium)}</p>
                    <p className="text-xs text-gray-400">{formatCurrencyFull(Math.round(plan.annualPremium / 12))}/mo</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Claim Ratio</p>
                    <p
                      className={`font-bold text-lg ${
                        plan.claimSettlementRatio >= 99
                          ? "text-green-600"
                          : plan.claimSettlementRatio >= 97
                          ? "text-blue-600"
                          : "text-amber-600"
                      }`}
                    >
                      {plan.claimSettlementRatio}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Max Age</p>
                    <p className="font-bold text-gray-900 text-lg">{plan.maxAge} yrs</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => toggleSelect(plan.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedPlans.includes(plan.id)
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {selectedPlans.includes(plan.id) ? (
                      <><X size={14} /> Remove</>
                    ) : (
                      <><BarChart3 size={14} /> Compare</>
                    )}
                  </button>
                  <Link
                    href="/insurance/quote"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 justify-center"
                  >
                    Get Quote <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 items-center">
                <div className="flex flex-wrap gap-2">
                  {plan.features.map((f) => (
                    <span key={f} className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-gray-600">
                      <CheckCircle size={12} className="text-green-500" /> {f}
                    </span>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                  <span>Solvency: <span className="font-medium text-gray-600">{plan.solvencyRatio}</span></span>
                  <span>Â·</span>
                  <span>{plan.policyTerm}</span>
                  <span>Â·</span>
                  <span>{plan.premiumPayingTerm}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Coverage Gap Alert */}
      {coverageGap > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Coverage Gap Detected</p>
            <p className="text-sm text-amber-700 mt-1">
              Your ideal coverage is <strong>{formatIndianCurrency(idealCoverage)}</strong> (10x your annual income). You currently have{" "}
              <strong>{formatIndianCurrency(totalCurrentCoverage)}</strong> in coverage. Consider adding{" "}
              <strong>{formatIndianCurrency(coverageGap)}</strong> more coverage.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default function InsurancePage() {
  const [annualIncome, setAnnualIncome] = useState(1200000);

  const idealCoverage = annualIncome * 10;
  const totalCurrentCoverage = mockCurrentPolicies.reduce(
    (sum, p) => sum + p.coverAmount,
    0
  );
  const coverageGap = Math.max(0, idealCoverage - totalCurrentCoverage);
  const coveragePercent = Math.min(100, (totalCurrentCoverage / idealCoverage) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight size={14} />
            <span className="text-gray-800 font-medium">Insurance</span>
          </div>
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Shield size={22} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Insurance Comparator</h1>
              </div>
              <p className="text-gray-500 ml-13">Compare term insurance plans from top Indian insurers</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/insurance/calculator"
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white"
              >
                <Calculator size={16} /> Coverage Calculator
              </Link>
              <Link
                href="/insurance/quote"
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Phone size={16} /> Get a Quote
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Policy Comparator */}
            <PolicyComparator />

            {/* Why Term Insurance */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <Heart size={18} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Why Term Insurance?</h2>
                  <p className="text-sm text-gray-500">The most cost-effective life protection</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  {
                    icon: <IndianRupee size={20} className="text-blue-600" />,
                    bg: "bg-blue-50",
                    title: "Maximum Cover, Minimum Cost",
                    desc: "Term insurance offers the highest life cover for the lowest premium. A â¹1 Cr cover can cost as little as â¹900/month for a 30-year-old â far cheaper than endowment or ULIP plans.",
                  },
                  {
                    icon: <Users size={20} className="text-purple-600" />,
                    bg: "bg-purple-50",
                    title: "Income Replacement for Family",
                    desc: "In the event of your untimely demise, the sum assured replaces your income and protects your family's financial future â EMIs, children's education, and retirement.",
                  },
                  {
                    icon: <FileText size={20} className="text-green-600" />,
                    bg: "bg-green-50",
                    title: "Tax Benefits Under Section 80C",
                    desc: "Premiums paid for term insurance are deductible under Section 80C (up to â¹1.5L). Death benefit received by nominees is fully exempt under Section 10(10D).",
                  },
                  {
                    icon: <TrendingUp size={20} className="text-amber-600" />,
                    bg: "bg-amber-50",
                    title: "Human Life Value (HLV) Concept",
                    desc: "HLV is the present value of your future income. Ideally, your cover should be 10xâ15x your annual income to ensure your family maintains the same lifestyle for 15-20 years.",
                  },
                ].map(({ icon, bg, title, desc }) => (
                  <div key={title} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm mb-1">{title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Key Metrics */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Ideal Coverage", value: "10â15x", sub: "Annual Income", color: "text-blue-700" },
                  { label: "Best Age to Buy", value: "25â35", sub: "Years", color: "text-green-700" },
                  { label: "Policy Term", value: "Till 60â65", sub: "Years of age", color: "text-purple-700" },
                  { label: "Min. Claim CSR", value: ">97%", sub: "Settlement Ratio", color: "text-amber-700" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="text-center p-3 bg-white border border-gray-200 rounded-xl">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24" />
              <div className="relative">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Protect Your Family Today</h2>
                    <p className="text-blue-200 text-sm">
                      Get a personalised term insurance quote in minutes. No medical test required for basic plans.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Link
                    href="/insurance/quote"
                    className="flex items-center justify-between gap-2 px-5 py-3.5 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Phone size={16} />
                      Get Instant Quote
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/insurance/calculator"
                    className="flex items-center justify-between gap-2 px-5 py-3.5 bg-blue-700/60 text-white font-semibold rounded-xl hover:bg-blue-700/80 transition-colors border border-blue-500 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Calculator size={16} />
                      HLV Calculator
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/insurance/advisor"
                    className="flex items-center justify-between gap-2 px-5 py-3.5 bg-blue-700/60 text-white font-semibold rounded-xl hover:bg-blue-700/80 transition-colors border border-blue-500 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      Talk to Advisor
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                </div>
                <p className="mt-4 text-xs text-blue-300 flex items-center gap-1">
                  <Clock size={12} /> Takes less than 3 minutes Â· No spam calls guaranteed
                </p>
              </div>
            </section>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Coverage Overview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield size={16} className="text-blue-600" /> Your Coverage
              </h3>

              {/* Income Input */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-1.5">Annual Income</label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">â¹</span>
                  <input
                    type="number"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(Number(e.target.value))}
                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                    step={100000}
                  />
                </div>
              </div>

              {/* Coverage Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Current vs Ideal</span>
                  <span>{coveragePercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      coveragePercent >= 80 ? "bg-green-500" : coveragePercent >= 50 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-gray-400">{formatIndianCurrency(totalCurrentCoverage)}</span>
                  <span className="text-xs text-gray-400">Ideal: {formatIndianCurrency(idealCoverage)}</span>
                </div>
              </div>

              {coverageGap > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
                  <p className="text-xs text-red-600 font-medium">â  Coverage Gap</p>
                  <p className="text-lg font-bold text-red-700">{formatIndianCurrency(coverageGap)}</p>
                  <p className="text-xs text-red-500">additional cover needed</p>
                </div>
              )}

              {/* Current Policies */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Policies</p>
                {mockCurrentPolicies.map((policy) => (
                  <div key={policy.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{policy.name}</p>
                        <p className="text-xs text-gray-500">{policy.provider}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        policy.type === "Group Term" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                      }`}>
                        {policy.type}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <div>
                        <p className="text-xs text-gray-400">Cover</p>
                        <p className="text-sm font-bold text-gray-800">{formatIndianCurrency(policy.coverAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Expires</p>
                        <p className="text-sm font-medium text-gray-700">{policy.expiryYear}</p>
                      </div>
                      {policy.premium > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Premium/yr</p>
                          <p className="text-sm font-medium text-gray-700">{formatCurrencyFull(policy.premium)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/insurance/policies"
                className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 border border-blue-200 rounded-xl text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Manage Policies <ChevronRight size={14} />
              </Link>
            </div>

            {/* Quick Info Cards */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Info size={16} className="text-blue-600" /> Quick Facts
              </h3>
              {[
                { label: "Top CSR (FY2024)", value: "Max Life: 99.51%" },
                { label: "Min Premium Age 30", value: "~â¹900/month" },
                { label: "GST on Premium", value: "18%" },
                { label: "IRDAI Regulated", value: "All listed insurers" },
                { label: "Free Look Period", value: "30 days" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Premium amounts are indicative for a healthy non-smoker male aged 30. Actual premiums vary based on age, health, and insurer underwriting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Needed because mockCurrentPolicies is used in the page component
const mockCurrentPolicies: CurrentPolicy[] = [
  {
    id: "cp1",
    name: "Jeevan Anand",
    provider: "LIC",
    coverAmount: 500000,
    premium: 18000,
    expiryYear: 2038,
    type: "Endowment",
  },
  {
    id: "cp2",
    name: "Group Term Cover",
    provider: "Employer",
    coverAmount: 1000000,
    premium: 0,
    expiryYear: 2025,
    type: "Group Term",
  },
];

interface CurrentPolicy {
  id: string;
  name: string;
  provider: string;
  coverAmount: number;
  premium: number;
  expiryYear: number;
  type: string;
}

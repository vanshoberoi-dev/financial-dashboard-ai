"use client";

import { useState, useMemo } from "react";

type Gender = "male" | "female";
type SmokingStatus = "non-smoker" | "smoker";
type SumAssured = 5000000 | 10000000 | 20000000 | 50000000;

interface PolicyInputs {
  age: number;
  sumAssured: SumAssured;
  smokingStatus: SmokingStatus;
  gender: Gender;
}

interface PolicyPlan {
  insurer: string;
  planName: string;
  logo: string;
  claimSettlementRatio: number;
  features: string[];
  riders: string[];
  policyTermOptions: string;
  annualPremium: number;
  coverAmount: number;
  isBestValue?: boolean;
  isLowestPremium?: boolean;
  isBestClaim?: boolean;
}

const SUM_ASSURED_OPTIONS: { label: string; value: SumAssured }[] = [
  { label: "â¹50 Lakh", value: 5000000 },
  { label: "â¹1 Crore", value: 10000000 },
  { label: "â¹2 Crore", value: 20000000 },
  { label: "â¹5 Crore", value: 50000000 },
];

function formatINR(amount: number): string {
  if (amount >= 10000000) {
    return `â¹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `â¹${(amount / 100000).toFixed(0)} Lakh`;
  }
  return `â¹${amount.toLocaleString("en-IN")}`;
}

function formatPremium(amount: number): string {
  return `â¹${amount.toLocaleString("en-IN")}`;
}

// Realistic premium calculation based on actuarial approximations
// Premiums per lakh of sum assured per year
function calculateLICTechTermPremium(inputs: PolicyInputs): number {
  const { age, sumAssured, smokingStatus, gender } = inputs;
  let baseRatePerLakh = 0;

  if (gender === "male") {
    if (age <= 25) baseRatePerLakh = smokingStatus === "non-smoker" ? 52 : 95;
    else if (age <= 30) baseRatePerLakh = smokingStatus === "non-smoker" ? 65 : 118;
    else if (age <= 35) baseRatePerLakh = smokingStatus === "non-smoker" ? 88 : 160;
    else if (age <= 40) baseRatePerLakh = smokingStatus === "non-smoker" ? 130 : 238;
    else if (age <= 45) baseRatePerLakh = smokingStatus === "non-smoker" ? 195 : 355;
    else baseRatePerLakh = smokingStatus === "non-smoker" ? 310 : 565;
  } else {
    if (age <= 25) baseRatePerLakh = smokingStatus === "non-smoker" ? 42 : 78;
    else if (age <= 30) baseRatePerLakh = smokingStatus === "non-smoker" ? 52 : 95;
    else if (age <= 35) baseRatePerLakh = smokingStatus === "non-smoker" ? 70 : 128;
    else if (age <= 40) baseRatePerLakh = smokingStatus === "non-smoker" ? 105 : 192;
    else if (age <= 45) baseRatePerLakh = smokingStatus === "non-smoker" ? 158 : 288;
    else baseRatePerLakh = smokingStatus === "non-smoker" ? 250 : 455;
  }

  const lakhs = sumAssured / 100000;
  let premium = baseRatePerLakh * lakhs;

  // Bulk discount for higher sum assured
  if (sumAssured >= 50000000) premium *= 0.82;
  else if (sumAssured >= 20000000) premium *= 0.88;
  else if (sumAssured >= 10000000) premium *= 0.93;

  // GST 18%
  premium = premium * 1.18;
  return Math.round(premium);
}

function calculateHDFCClick2ProtectPremium(inputs: PolicyInputs): number {
  const { age, sumAssured, smokingStatus, gender } = inputs;
  let baseRatePerLakh = 0;

  if (gender === "male") {
    if (age <= 25) baseRatePerLakh = smokingStatus === "non-smoker" ? 48 : 88;
    else if (age <= 30) baseRatePerLakh = smokingStatus === "non-smoker" ? 60 : 110;
    else if (age <= 35) baseRatePerLakh = smokingStatus === "non-smoker" ? 82 : 150;
    else if (age <= 40) baseRatePerLakh = smokingStatus === "non-smoker" ? 122 : 224;
    else if (age <= 45) baseRatePerLakh = smokingStatus === "non-smoker" ? 185 : 338;
    else baseRatePerLakh = smokingStatus === "non-smoker" ? 295 : 538;
  } else {
    if (age <= 25) baseRatePerLakh = smokingStatus === "non-smoker" ? 38 : 70;
    else if (age <= 30) baseRatePerLakh = smokingStatus === "non-smoker" ? 48 : 88;
    else if (age <= 35) baseRatePerLakh = smokingStatus === "non-smoker" ? 65 : 118;
    else if (age <= 40) baseRatePerLakh = smokingStatus === "non-smoker" ? 98 : 178;
    else if (age <= 45) baseRatePerLakh = smokingStatus === "non-smoker" ? 148 : 270;
    else baseRatePerLakh = smokingStatus === "non-smoker" ? 235 : 428;
  }

  const lakhs = sumAssured / 100000;
  let premium = baseRatePerLakh * lakhs;

  if (sumAssured >= 50000000) premium *= 0.80;
  else if (sumAssured >= 20000000) premium *= 0.86;
  else if (sumAssured >= 10000000) premium *= 0.91;

  premium = premium * 1.18;
  return Math.round(premium);
}

function calculateICICIiProtectPremium(inputs: PolicyInputs): number {
  const { age, sumAssured, smokingStatus, gender } = inputs;
  let baseRatePerLakh = 0;

  if (gender === "male") {
    if (age <= 25) baseRatePerLakh = smokingStatus === "non-smoker" ? 50 : 92;
    else if (age <= 30) baseRatePerLakh = smokingStatus === "non-smoker" ? 63 : 115;
    else if (age <= 35) baseRatePerLakh = smokingStatus === "non-smoker" ? 85 : 155;
    else if (age <= 40) baseRatePerLakh = smokingStatus === "non-smoker" ? 126 : 230;
    else if (age <= 45) baseRatePerLakh = smokingStatus === "non-smoker" ? 190 : 347;
    else baseRatePerLakh = smokingStatus === "non-smoker" ? 302 : 550;
  } else {
    if (age <= 25) baseRatePerLakh = smokingStatus === "non-smoker" ? 40 : 73;
    else if (age <= 30) baseRatePerLakh = smokingStatus === "non-smoker" ? 50 : 92;
    else if (age <= 35) baseRatePerLakh = smokingStatus === "non-smoker" ? 67 : 122;
    else if (age <= 40) baseRatePerLakh = smokingStatus === "non-smoker" ? 101 : 185;
    else if (age <= 45) baseRatePerLakh = smokingStatus === "non-smoker" ? 153 : 278;
    else baseRatePerLakh = smokingStatus === "non-smoker" ? 242 : 442;
  }

  const lakhs = sumAssured / 100000;
  let premium = baseRatePerLakh * lakhs;

  if (sumAssured >= 50000000) premium *= 0.81;
  else if (sumAssured >= 20000000) premium *= 0.87;
  else if (sumAssured >= 10000000) premium *= 0.92;

  premium = premium * 1.18;
  return Math.round(premium);
}

export default function PolicyComparator() {
  const [inputs, setInputs] = useState<PolicyInputs>({
    age: 30,
    sumAssured: 10000000,
    smokingStatus: "non-smoker",
    gender: "male",
  });

  const [compared, setCompared] = useState(false);
  const [ageError, setAgeError] = useState("");

  const handleAgeChange = (val: string) => {
    const parsed = parseInt(val);
    if (isNaN(parsed)) { setAgeError("Please enter a valid age"); return; }
    if (parsed < 18) { setAgeError("Minimum age is 18 years"); }
    else if (parsed > 65) { setAgeError("Maximum age is 65 years"); }
    else { setAgeError(""); }
    setInputs((prev) => ({ ...prev, age: parsed }));
  };

  const policies = useMemo<PolicyPlan[]>(() => {
    const lic = calculateLICTechTermPremium(inputs);
    const hdfc = calculateHDFCClick2ProtectPremium(inputs);
    const icici = calculateICICIiProtectPremium(inputs);
    const minPremium = Math.min(lic, hdfc, icici);
    const maxClaim = Math.max(98.38, 99.07, 97.84);

    return [
      {
        insurer: "LIC of India",
        planName: "LIC Tech Term",
        logo: "ðï¸",
        claimSettlementRatio: 98.38,
        annualPremium: lic,
        coverAmount: inputs.sumAssured,
        policyTermOptions: "10 â 40 years",
        features: [
          "Government-backed insurer since 1956",
          "Online only plan â no agent commission",
          "Level & increasing cover options",
          "Joint life cover available",
          "Tax benefit u/s 80C & 10(10D)",
          "Death benefit paid as lump-sum or monthly income",
        ],
        riders: [
          "Accidental Death Benefit Rider",
          "Accidental Disability Rider",
          "Premium Waiver on Disability",
        ],
        isBestValue: lic === minPremium,
        isLowestPremium: lic === minPremium,
        isBestClaim: 98.38 === maxClaim,
      },
      {
        insurer: "HDFC Life",
        planName: "HDFC Click 2 Protect Life",
        logo: "ðµ",
        claimSettlementRatio: 99.07,
        annualPremium: hdfc,
        coverAmount: inputs.sumAssured,
        policyTermOptions: "5 â 85 years (whole life)",
        features: [
          "Highest claim settlement ratio among private insurers",
          "Return of premium option available",
          "COVID-19 death covered from day 1",
          "Three plan options: Life, 3D Life, Life & CI Rebalance",
          "Cover continuance benefit on job loss",
          "Smart Exit Benefit to exit before maturity",
        ],
        riders: [
          "Critical Illness Plus Rider (60 CI)",
          "Accidental Death Benefit Rider",
          "Waiver of Premium on Disability",
          "Income Benefit on Accidental Disability",
        ],
        isBestValue: hdfc === minPremium,
        isLowestPremium: hdfc === minPremium,
        isBestClaim: 99.07 === maxClaim,
      },
      {
        insurer: "ICICI Prudential",
        planName: "ICICI iProtect Smart",
        logo: "ð ",
        claimSettlementRatio: 97.84,
        annualPremium: icici,
        coverAmount: inputs.sumAssured,
        policyTermOptions: "5 â 85 years (whole life)",
        features: [
          "Terminal illness benefit included (no extra cost)",
          "4 death benefit options incl. monthly income",
          "Cover for 34 critical illnesses available",
          "Accidental death cover up to â¹2 Crore extra",
          "Special exit value (return of premiums)",
          "Women-specific cover for breast/cervical cancer",
        ],
        riders: [
          "Critical Illness Rider (34 CI)",
          "Accidental Death Benefit Rider",
          "Waiver of Premium on CI",
          "Income Benefit Rider",
        ],
        isBestValue: icici === minPremium,
        isLowestPremium: icici === minPremium,
        isBestClaim: 97.84 === maxClaim,
      },
    ];
  }, [inputs]);

  const bestPremiumPlan = policies.find((p) => p.isLowestPremium);
  const bestClaimPlan = policies.find((p) => p.isBestClaim);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-8 px-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 mb-4">
            <span className="text-blue-400 text-sm font-medium">IRDAI Registered Plans</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Term Insurance{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Comparator
            </span>
          </h1>
          <p className="text-slate-400 text-lg">
            Compare top term plans â find the best cover for your family
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 mb-8 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs">1</span>
            Enter Your Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Age */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Your Age (years)</label>
              <input
                type="number"
                min={18}
                max={65}
                value={inputs.age}
                onChange={(e) => handleAgeChange(e.target.value)}
                className={`w-full bg-slate-700/50 border ${
                  ageError ? "border-red-500" : "border-slate-600"
                } text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
                placeholder="e.g., 30"
              />
              {ageError && <p className="text-red-400 text-xs mt-1">{ageError}</p>}
              <p className="text-slate-500 text-xs mt-1">Age: 18 â 65 years</p>
            </div>

            {/* Sum Assured */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Sum Assured</label>
              <select
                value={inputs.sumAssured}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, sumAssured: Number(e.target.value) as SumAssured }))
                }
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {SUM_ASSURED_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Gender</label>
              <div className="flex gap-3">
                {(["male", "female"] as Gender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setInputs((prev) => ({ ...prev, gender: g }))}
                    className={`flex-1 py-3 rounded-xl border font-medium transition capitalize ${
                      inputs.gender === g
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {g === "male" ? "â Male" : "â Female"}
                  </button>
                ))}
              </div>
            </div>

            {/* Smoking Status */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Smoking Status</label>
              <div className="flex gap-3">
                {(["non-smoker", "smoker"] as SmokingStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setInputs((prev) => ({ ...prev, smokingStatus: s }))}
                    className={`flex-1 py-3 rounded-xl border font-medium transition text-sm ${
                      inputs.smokingStatus === s
                        ? s === "smoker"
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-green-600 border-green-500 text-white"
                        : "bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {s === "non-smoker" ? "ð­ No" : "ð¬ Yes"}
                  </button>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-1">Smoker = higher premiums</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (!ageError && inputs.age >= 18 && inputs.age <= 65) setCompared(true);
            }}
            className="mt-6 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold px-10 py-3.5 rounded-xl transition shadow-lg shadow-blue-900/40 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Compare Plans
          </button>
        </div>

        {/* Comparison Results */}
        {compared && (
          <>
            {/* Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-green-900/30 border border-green-700/40 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">ð</span>
                <div>
                  <p className="text-green-400 text-xs font-medium uppercase tracking-wide">Lowest Premium</p>
                  <p className="text-white font-semibold">{bestPremiumPlan?.planName}</p>
                  <p className="text-green-300 text-sm">{formatPremium(bestPremiumPlan?.annualPremium ?? 0)} / year (incl. GST)</p>
                </div>
              </div>
              <div className="bg-purple-900/30 border border-purple-700/40 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">ð¡ï¸</span>
                <div>
                  <p className="text-purple-400 text-xs font-medium uppercase tracking-wide">Best Claim Settlement</p>
                  <p className="text-white font-semibold">{bestClaimPlan?.planName}</p>
                  <p className="text-purple-300 text-sm">{bestClaimPlan?.claimSettlementRatio}% (IRDAI 2022-23)</p>
                </div>
              </div>
            </div>

            {/* Policy Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {policies.map((policy) => (
                <div
                  key={policy.planName}
                  className={`relative bg-slate-800/60 backdrop-blur border rounded-2xl p-6 shadow-2xl transition-transform hover:-translate-y-1 ${
                    policy.isLowestPremium
                      ? "border-green-500/60 ring-1 ring-green-500/30"
                      : policy.isBestClaim
                      ? "border-purple-500/60 ring-1 ring-purple-500/30"
                      : "border-slate-700/50"
                  }`}
                >
                  {/* Best Value Badge */}
                  {policy.isLowestPremium && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                        â­ BEST VALUE
                      </span>
                    </div>
                  )}
                  {policy.isBestClaim && !policy.isLowestPremium && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-purple-500 to-violet-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                        ð¡ï¸ BEST CLAIM RATIO
                      </span>
                    </div>
                  )}

                  {/* Insurer Header */}
                  <div className="flex items-center gap-3 mb-5 mt-2">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-2xl">
                      {policy.logo}
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">{policy.insurer}</p>
                      <h3 className="text-white font-bold text-sm leading-tight">{policy.planName}</h3>
                    </div>
                  </div>

                  {/* Premium */}
                  <div
                    className={`rounded-xl p-4 mb-4 ${
                      policy.isLowestPremium ? "bg-green-900/30 border border-green-700/40" : "bg-slate-700/40 border border-slate-600/40"
                    }`}
                  >
                    <p className="text-slate-400 text-xs mb-1">Annual Premium (incl. 18% GST)</p>
                    <p
                      className={`text-3xl font-bold ${
                        policy.isLowestPremium ? "text-green-400" : "text-white"
                      }`}
                    >
                      {formatPremium(policy.annualPremium)}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      â {formatPremium(Math.round(policy.annualPremium / 12))}/month
                    </p>
                  </div>

                  {/* Key Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-slate-700/30 rounded-xl p-3">
                      <p className="text-slate-500 text-xs mb-0.5">Cover Amount</p>
                      <p className="text-white font-semibold text-sm">{formatINR(policy.coverAmount)}</p>
                    </div>
                    <div
                      className={`rounded-xl p-3 ${
                        policy.isBestClaim
                          ? "bg-purple-900/30 border border-purple-700/30"
                          : "bg-slate-700/30"
                      }`}
                    >
                      <p className="text-slate-500 text-xs mb-0.5">Claim Ratio</p>
                      <p
                        className={`font-semibold text-sm ${
                          policy.isBestClaim ? "text-purple-300" : "text-white"
                        }`}
                      >
                        {policy.claimSettlementRatio}%
                        {policy.isBestClaim && <span className="ml-1 text-xs">ð</span>}
                      </p>
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-3 col-span-2">
                      <p className="text-slate-500 text-xs mb-0.5">Policy Term</p>
                      <p className="text-white font-semibold text-sm">{policy.policyTermOptions}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-4">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Key Features</p>
                    <ul className="space-y-1.5">
                      {policy.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-slate-300 text-xs leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Riders */}
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Riders Available</p>
                    <div className="flex flex-wrap gap-1.5">
                      {policy.riders.map((r) => (
                        <span
                          key={r}
                          className="bg-blue-900/40 border border-blue-700/40 text-blue-300 text-xs px-2.5 py-1 rounded-full"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    className={`w-full mt-5 py-3 rounded-xl font-semibold text-sm transition ${
                      policy.isLowestPremium
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/30"
                        : "bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600"
                    }`}
                  >
                    {policy.isLowestPremium ? "â Get Best Quote" : "View Quote"}
                  </button>
                </div>
              ))}
            </div>

            {/* Comparison Table */}
            <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-white font-bold text-lg">Detailed Comparison Table</h2>
                <p className="text-slate-400 text-sm">Side-by-side feature comparison</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-700/40">
                      <th className="text-left text-slate-400 font-medium px-6 py-3 w-44">Parameter</th>
                      {policies.map((p) => (
                        <th key={p.planName} className="text-center text-slate-300 font-semibold px-4 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-lg">{p.logo}</span>
                            <span className="text-xs text-slate-400">{p.insurer}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {[
                      {
                        label: "Plan Name",
                        values: policies.map((p) => ({ val: p.planName, highlight: false })),
                      },
                      {
                        label: "Annual Premium",
                        values: policies.map((p) => ({
                          val: formatPremium(p.annualPremium),
                          highlight: p.isLowestPremium,
                          green: true,
                        })),
                      },
                      {
                        label: "Cover Amount",
                        values: policies.map((p) => ({ val: formatINR(p.coverAmount), highlight: false })),
                      },
                      {
                        label: "Claim Settlement",
                        values: policies.map((p) => ({
                          val: `${p.claimSettlementRatio}%`,
                          highlight: p.isBestClaim,
                          purple: true,
                        })),
                      },
                      {
                        label: "Policy Term",
                        values: policies.map((p) => ({ val: p.policyTermOptions, highlight: false })),
                      },
                      {
                        label: "No. of Riders",
                        values: policies.map((p) => ({ val: `${p.riders.length} riders`, highlight: false })),
                      },
                    ].map((row) => (
                      <tr key={row.label} className="hover:bg-slate-700/20">
                        <td className="text-slate-400 px-6 py-3.5 font-medium">{row.label}</td>
                        {row.values.map((cell, i) => (
                          <td
                            key={i}
                            className={`text-center px-4 py-3.5 font-semibold ${
                              cell.highlight && (cell as { green?: boolean }).green
                                ? "text-green-400"
                                : cell.highlight && (cell as { purple?: boolean }).purple
                                ? "text-purple-400"
                                : "text-white"
                            }`}
                          >
                            {cell.val}
                            {cell.highlight && (cell as { green?: boolean }).green && (
                              <span className="ml-1 text-xs bg-green-900/50 border border-green-700/50 rounded px-1">Lowest</span>
                            )}
                            {cell.highlight && (cell as { purple?: boolean }).purple && (
                              <span className="ml-1 text-xs bg-purple-900/50 border border-purple-700/50 rounded px-1">Best</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-5">
              <div className="flex gap-3">
                <span className="text-amber-400 text-xl flex-shrink-0">â ï¸</span>
                <div className="space-y-1.5">
                  <p className="text-amber-300 font-semibold text-sm">Important Disclaimer</p>
                  <p className="text-amber-200/70 text-xs leading-relaxed">
                    Premiums shown are indicative estimates based on standard actuarial approximations and include 18% GST. Actual premiums may vary based on your medical history, occupation, lifestyle, and the insurer's underwriting norms. Please obtain official quotes directly from the insurer or a registered intermediary before making any purchase decision.
                  </p>
                  <p className="text-amber-200/70 text-xs">
                    ð Claim Settlement Ratios (CSR) are sourced from the <strong className="text-amber-300">IRDAI Annual Report 2022-23</strong> (LIC: 98.38% | HDFC Life: 99.07% | ICICI Prudential: 97.84%). CSR data is based on individual death claims by number.
                  </p>
                  <p className="text-amber-200/70 text-xs">
                    ð Insurance is the subject matter of solicitation. IRDAI is not involved in activities like selling insurance policies, announcing bonus or investment of premiums.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {!compared && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">ð¡ï¸</div>
            <p className="text-slate-400 text-lg">Enter your details above and click <strong className="text-white">Compare Plans</strong> to see premium estimates</p>
            <p className="text-slate-500 text-sm mt-2">Comparing LIC Tech Term Â· HDFC Click 2 Protect Life Â· ICICI iProtect Smart</p>
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-6">
          PolicyComparator Â© 2024 â For educational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  );
}

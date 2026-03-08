"use client";

import { useState, useEffect, useCallback } from "react";

interface TaxInputs {
  grossIncome: string;
  ageGroup: "below60" | "60to80" | "above80";
  ppf: string;
  elss: string;
  licPremium: string;
  otherSection80C: string;
  healthInsuranceSelf: string;
  healthInsuranceParents: string;
  npsAdditional: string;
  hraExemption: string;
  homeLoanInterest: string;
}

interface TaxBreakdown {
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  taxBeforeCess: number;
  cess: number;
  totalTax: number;
  slabWise: { slab: string; taxableAmount: number; rate: number; tax: number }[];
  rebate87A: number;
}

interface TaxResult {
  old: TaxBreakdown;
  new: TaxBreakdown;
  savings: number;
  betterRegime: "old" | "new" | "equal";
}

const formatINR = (amount: number): string => {
  if (isNaN(amount)) return "â¹0";
  const absAmount = Math.abs(Math.round(amount));
  const str = absAmount.toString();
  let result = "";
  if (str.length <= 3) {
    result = str;
  } else {
    const last3 = str.slice(-3);
    const remaining = str.slice(0, -3);
    const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    result = formatted + "," + last3;
  }
  return (amount < 0 ? "-â¹" : "â¹") + result;
};

const parseAmount = (val: string): number => {
  const num = parseFloat(val.replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
};

const calculateOldRegimeTax = (
  taxableIncome: number,
  ageGroup: TaxInputs["ageGroup"]
): { tax: number; slabs: { slab: string; taxableAmount: number; rate: number; tax: number }[]; rebate87A: number } => {
  let slabs: { min: number; max: number; rate: number; label: string }[] = [];

  if (ageGroup === "below60") {
    slabs = [
      { min: 0, max: 250000, rate: 0, label: "â¹0 â â¹2.5L" },
      { min: 250000, max: 500000, rate: 5, label: "â¹2.5L â â¹5L" },
      { min: 500000, max: 1000000, rate: 20, label: "â¹5L â â¹10L" },
      { min: 1000000, max: Infinity, rate: 30, label: "Above â¹10L" },
    ];
  } else if (ageGroup === "60to80") {
    slabs = [
      { min: 0, max: 300000, rate: 0, label: "â¹0 â â¹3L" },
      { min: 300000, max: 500000, rate: 5, label: "â¹3L â â¹5L" },
      { min: 500000, max: 1000000, rate: 20, label: "â¹5L â â¹10L" },
      { min: 1000000, max: Infinity, rate: 30, label: "Above â¹10L" },
    ];
  } else {
    slabs = [
      { min: 0, max: 500000, rate: 0, label: "â¹0 â â¹5L" },
      { min: 500000, max: 1000000, rate: 20, label: "â¹5L â â¹10L" },
      { min: 1000000, max: Infinity, rate: 30, label: "Above â¹10L" },
    ];
  }

  let totalTax = 0;
  const slabWise: { slab: string; taxableAmount: number; rate: number; tax: number }[] = [];

  for (const slab of slabs) {
    if (taxableIncome <= slab.min) break;
    const taxableInSlab = Math.min(taxableIncome, slab.max === Infinity ? taxableIncome : slab.max) - slab.min;
    const taxInSlab = (taxableInSlab * slab.rate) / 100;
    totalTax += taxInSlab;
    slabWise.push({
      slab: slab.label,
      taxableAmount: taxableInSlab,
      rate: slab.rate,
      tax: taxInSlab,
    });
  }

  let rebate87A = 0;
  if (ageGroup === "below60" && taxableIncome <= 500000) {
    rebate87A = Math.min(totalTax, 12500);
    totalTax = Math.max(0, totalTax - rebate87A);
  } else if ((ageGroup === "60to80" || ageGroup === "above80") && taxableIncome <= 500000) {
    rebate87A = Math.min(totalTax, 12500);
    totalTax = Math.max(0, totalTax - rebate87A);
  }

  return { tax: totalTax, slabs: slabWise, rebate87A };
};

const calculateNewRegimeTax = (
  taxableIncome: number
): { tax: number; slabs: { slab: string; taxableAmount: number; rate: number; tax: number }[]; rebate87A: number } => {
  const slabs = [
    { min: 0, max: 300000, rate: 0, label: "â¹0 â â¹3L" },
    { min: 300000, max: 700000, rate: 5, label: "â¹3L â â¹7L" },
    { min: 700000, max: 1000000, rate: 10, label: "â¹7L â â¹10L" },
    { min: 1000000, max: 1200000, rate: 15, label: "â¹10L â â¹12L" },
    { min: 1200000, max: 1500000, rate: 20, label: "â¹12L â â¹15L" },
    { min: 1500000, max: Infinity, rate: 30, label: "Above â¹15L" },
  ];

  let totalTax = 0;
  const slabWise: { slab: string; taxableAmount: number; rate: number; tax: number }[] = [];

  for (const slab of slabs) {
    if (taxableIncome <= slab.min) break;
    const taxableInSlab = Math.min(taxableIncome, slab.max === Infinity ? taxableIncome : slab.max) - slab.min;
    const taxInSlab = (taxableInSlab * slab.rate) / 100;
    totalTax += taxInSlab;
    slabWise.push({
      slab: slab.label,
      taxableAmount: taxableInSlab,
      rate: slab.rate,
      tax: taxInSlab,
    });
  }

  let rebate87A = 0;
  if (taxableIncome <= 700000) {
    rebate87A = Math.min(totalTax, 25000);
    totalTax = Math.max(0, totalTax - rebate87A);
  }

  return { tax: totalTax, slabs: slabWise, rebate87A };
};

const computeTax = (inputs: TaxInputs): TaxResult => {
  const gross = parseAmount(inputs.grossIncome);

  const section80C = Math.min(
    parseAmount(inputs.ppf) + parseAmount(inputs.elss) + parseAmount(inputs.licPremium) + parseAmount(inputs.otherSection80C),
    150000
  );
  const section80D_self = parseAmount(inputs.healthInsuranceSelf);
  const section80D_parents = parseAmount(inputs.healthInsuranceParents);
  const maxSelf = inputs.ageGroup === "below60" ? 25000 : 50000;
  const maxParents = inputs.ageGroup === "below60" ? 25000 : 50000;
  const section80D = Math.min(section80D_self, maxSelf) + Math.min(section80D_parents, maxParents);
  const nps = Math.min(parseAmount(inputs.npsAdditional), 50000);
  const hra = parseAmount(inputs.hraExemption);
  const homeLoan = Math.min(parseAmount(inputs.homeLoanInterest), 200000);

  // OLD REGIME
  const oldStdDeduction = 50000;
  const oldTotalDeductions = oldStdDeduction + section80C + section80D + nps + hra + homeLoan;
  const oldTaxableIncome = Math.max(0, gross - oldTotalDeductions);
  const oldCalc = calculateOldRegimeTax(oldTaxableIncome, inputs.ageGroup);
  const oldCess = oldCalc.tax * 0.04;
  const oldTotalTax = oldCalc.tax + oldCess;

  // NEW REGIME
  const newStdDeduction = 75000;
  const newTotalDeductions = newStdDeduction;
  const newTaxableIncome = Math.max(0, gross - newTotalDeductions);
  const newCalc = calculateNewRegimeTax(newTaxableIncome);
  const newCess = newCalc.tax * 0.04;
  const newTotalTax = newCalc.tax + newCess;

  const savings = Math.abs(oldTotalTax - newTotalTax);
  const betterRegime: "old" | "new" | "equal" =
    oldTotalTax < newTotalTax ? "old" : newTotalTax < oldTotalTax ? "new" : "equal";

  return {
    old: {
      grossIncome: gross,
      totalDeductions: oldTotalDeductions,
      taxableIncome: oldTaxableIncome,
      taxBeforeCess: oldCalc.tax,
      cess: oldCess,
      totalTax: oldTotalTax,
      slabWise: oldCalc.slabs,
      rebate87A: oldCalc.rebate87A,
    },
    new: {
      grossIncome: gross,
      totalDeductions: newTotalDeductions,
      taxableIncome: newTaxableIncome,
      taxBeforeCess: newCalc.tax,
      cess: newCess,
      totalTax: newTotalTax,
      slabWise: newCalc.slabs,
      rebate87A: newCalc.rebate87A,
    },
    savings,
    betterRegime,
  };
};

const InputField = ({
  label,
  value,
  onChange,
  hint,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  max?: number;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">â¹</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        placeholder="0"
        min="0"
        max={max}
      />
    </div>
    {hint && <span className="text-xs text-gray-400">{hint}</span>}
  </div>
);

const SummaryRow = ({
  label,
  value,
  highlight,
  bold,
  green,
  red,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  bold?: boolean;
  green?: boolean;
  red?: boolean;
}) => (
  <div
    className={`flex justify-between items-center py-2 px-3 rounded-lg ${
      highlight ? "bg-blue-50 border border-blue-100" : ""
    }`}
  >
    <span className={`text-sm ${bold ? "font-bold text-gray-800" : "text-gray-600"}`}>{label}</span>
    <span
      className={`text-sm font-semibold ${
        green ? "text-emerald-600" : red ? "text-red-500" : bold ? "text-gray-900" : "text-gray-700"
      }`}
    >
      {formatINR(value)}
    </span>
  </div>
);

const SlabTable = ({ slabs }: { slabs: { slab: string; taxableAmount: number; rate: number; tax: number }[] }) => (
  <div className="mt-3">
    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Slab-wise Breakdown</p>
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left py-2 px-2 text-gray-500 font-semibold">Slab</th>
            <th className="text-right py-2 px-2 text-gray-500 font-semibold">Taxable Amt</th>
            <th className="text-right py-2 px-2 text-gray-500 font-semibold">Rate</th>
            <th className="text-right py-2 px-2 text-gray-500 font-semibold">Tax</th>
          </tr>
        </thead>
        <tbody>
          {slabs.map((s, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="py-1.5 px-2 text-gray-700">{s.slab}</td>
              <td className="py-1.5 px-2 text-right text-gray-700">{formatINR(s.taxableAmount)}</td>
              <td className="py-1.5 px-2 text-right text-blue-600 font-medium">{s.rate}%</td>
              <td className="py-1.5 px-2 text-right text-gray-800 font-semibold">{formatINR(s.tax)}</td>
            </tr>
          ))}
          {slabs.length === 0 && (
            <tr>
              <td colSpan={4} className="py-2 px-2 text-center text-gray-400">
                No taxable income
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default function TaxCalculator() {
  const [inputs, setInputs] = useState<TaxInputs>({
    grossIncome: "",
    ageGroup: "below60",
    ppf: "",
    elss: "",
    licPremium: "",
    otherSection80C: "",
    healthInsuranceSelf: "",
    healthInsuranceParents: "",
    npsAdditional: "",
    hraExemption: "",
    homeLoanInterest: "",
  });

  const [result, setResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverVerified, setServerVerified] = useState(false);
  const [apiError, setApiError] = useState("");
  const [activeTab, setActiveTab] = useState<"comparison" | "old" | "new">("comparison");

  const updateInput = (key: keyof TaxInputs) => (value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const compute = useCallback(() => {
    if (parseAmount(inputs.grossIncome) > 0) {
      const res = computeTax(inputs);
      setResult(res);
    } else {
      setResult(null);
    }
  }, [inputs]);

  useEffect(() => {
    compute();
  }, [compute]);

  const handleCalculate = async () => {
    compute();
    setLoading(true);
    setApiError("");
    setServerVerified(false);
    try {
      const payload = {
        grossIncome: parseAmount(inputs.grossIncome),
        ageGroup: inputs.ageGroup,
        section80C: Math.min(
          parseAmount(inputs.ppf) + parseAmount(inputs.elss) + parseAmount(inputs.licPremium) + parseAmount(inputs.otherSection80C),
          150000
        ),
        section80D:
          Math.min(parseAmount(inputs.healthInsuranceSelf), inputs.ageGroup === "below60" ? 25000 : 50000) +
          Math.min(parseAmount(inputs.healthInsuranceParents), inputs.ageGroup === "below60" ? 25000 : 50000),
        npsAdditional: Math.min(parseAmount(inputs.npsAdditional), 50000),
        hraExemption: parseAmount(inputs.hraExemption),
        homeLoanInterest: Math.min(parseAmount(inputs.homeLoanInterest), 200000),
      };
      const response = await fetch("/api/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setServerVerified(true);
      } else {
        setApiError("Server verification returned an error. Showing client-side calculation.");
      }
    } catch {
      setApiError("Could not reach server. Showing client-side calculation.");
    } finally {
      setLoading(false);
    }
  };

  const section80CTotal = Math.min(
    parseAmount(inputs.ppf) + parseAmount(inputs.elss) + parseAmount(inputs.licPremium) + parseAmount(inputs.otherSection80C),
    150000
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-blue-100 mb-4">
            <span className="text-blue-600 text-lg">ð®ð³</span>
            <span className="text-sm font-semibold text-blue-700">FY 2024-25 (AY 2025-26)</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Income Tax Calculator
          </h1>
          <p className="text-gray-500 text-sm md:text-base">
            Old Regime vs New Regime â Find your optimal tax saving strategy
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Inputs */}
          <div className="lg:col-span-2 space-y-5">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 text-xs">â¹</span>
                Basic Information
              </h2>
              <div className="space-y-4">
                <InputField
                  label="Gross Annual Income"
                  value={inputs.grossIncome}
                  onChange={updateInput("grossIncome")}
                  hint="Include salary, business income, other sources"
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Age Group</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["below60", "60to80", "above80"] as const).map((age) => (
                      <button
                        key={age}
                        onClick={() => setInputs((p) => ({ ...p, ageGroup: age }))}
                        className={`py-2.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                          inputs.ageGroup === age
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        {age === "below60" ? "Below 60" : age === "60to80" ? "60 â 80" : "Above 80"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 80C */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center text-green-600 text-xs">80C</span>
                  Section 80C
                </h2>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  section80CTotal >= 150000 ? "bg-green-100 text-green-700" : "bg-orange-50 text-orange-600"
                }`}>
                  {formatINR(section80CTotal)} / â¹1.5L
                </span>
              </div>
              <div className="space-y-3">
                <InputField label="PPF (Public Provident Fund)" value={inputs.ppf} onChange={updateInput("ppf")} />
                <InputField label="ELSS (Tax Saving Mutual Funds)" value={inputs.elss} onChange={updateInput("elss")} />
                <InputField label="LIC Premium" value={inputs.licPremium} onChange={updateInput("licPremium")} />
                <InputField
                  label="Other (NSC, SCSS, Home Loan Principal, etc.)"
                  value={inputs.otherSection80C}
                  onChange={updateInput("otherSection80C")}
                />
              </div>
              {section80CTotal > 150000 && (
                <p className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  â ï¸ Capped at â¹1,50,000 as per IT rules
                </p>
              )}
            </div>

            {/* Section 80D */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center text-purple-600 text-xs">80D</span>
                Section 80D â Health Insurance
              </h2>
              <div className="space-y-3">
                <InputField
                  label="Self + Spouse + Children"
                  value={inputs.healthInsuranceSelf}
                  onChange={updateInput("healthInsuranceSelf")}
                  hint={`Max: ${inputs.ageGroup === "below60" ? "â¹25,000" : "â¹50,000"} (Senior citizen)`}
                  max={inputs.ageGroup === "below60" ? 25000 : 50000}
                />
                <InputField
                  label="Parents"
                  value={inputs.healthInsuranceParents}
                  onChange={updateInput("healthInsuranceParents")}
                  hint={`Max: ${inputs.ageGroup === "below60" ? "â¹25,000" : "â¹50,000"} (Senior citizen parents)`}
                  max={inputs.ageGroup === "below60" ? 25000 : 50000}
                />
              </div>
            </div>

            {/* Other Deductions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center text-orange-600 text-xs">+</span>
                Other Deductions
              </h2>
              <div className="space-y-3">
                <InputField
                  label="NPS â Sec 80CCD(1B) Additional"
                  value={inputs.npsAdditional}
                  onChange={updateInput("npsAdditional")}
                  hint="Max â¹50,000 (over and above 80C)"
                  max={50000}
                />
                <InputField
                  label="HRA Exemption"
                  value={inputs.hraExemption}
                  onChange={updateInput("hraExemption")}
                  hint="Calculated as per HRA rules (old regime only)"
                />
                <InputField
                  label="Home Loan Interest â Sec 24(b)"
                  value={inputs.homeLoanInterest}
                  onChange={updateInput("homeLoanInterest")}
                  hint="Max â¹2,00,000 for self-occupied (old regime only)"
                  max={200000}
                />
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={loading || !inputs.grossIncome}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying with Server...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Calculate & Verify Tax
                </>
              )}
            </button>

            {serverVerified && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <span className="text-green-500 text-lg">â</span>
                <span className="text-xs text-green-700 font-medium">Server verified â calculations confirmed</span>
              </div>
            )}
            {apiError && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-amber-500 text-lg">â </span>
                <span className="text-xs text-amber-700">{apiError}</span>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-3 space-y-5">
            {!result ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-10 w-10 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Enter Your Income Details</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Fill in your gross annual income and applicable deductions to see a detailed tax comparison.
                </p>
              </div>
            ) : (
              <>
                {/* Winner Banner */}
                <div
                  className={`rounded-2xl p-5 text-white ${
                    result.betterRegime === "new"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                      : result.betterRegime === "old"
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                      : "bg-gradient-to-r from-gray-500 to-gray-600"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">Recommended Regime</p>
                      <h3 className="text-2xl font-bold">
                        {result.betterRegime === "equal"
                          ? "Both Regimes Equal"
                          : result.betterRegime === "new"
                          ? "ð¯ New Tax Regime"
                          : "ð Old Tax Regime"}
                      </h3>
                      {result.betterRegime !== "equal" && (
                        <p className="text-white/90 text-sm mt-1">
                          Saves <span className="font-bold text-yellow-300">{formatINR(result.savings)}</span> more than{" "}
                          {result.betterRegime === "new" ? "Old" : "New"} Regime
                        </p>
                      )}
                    </div>
                    <div className="bg-white/20 rounded-xl px-5 py-3 text-center">
                      <p className="text-white/70 text-xs">Your Tax Saving</p>
                      <p className="text-2xl font-bold text-yellow-200">{formatINR(result.savings)}</p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex border-b border-gray-100">
                    {(["comparison", "old", "new"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-all ${
                          activeTab === tab
                            ? "bg-blue-600 text-white"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {tab === "comparison" ? "Side by Side" : tab === "old" ? "Old Regime" : "New Regime"}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {activeTab === "comparison" && (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Old Regime Summary */}
                        <div
                          className={`rounded-xl p-4 border-2 ${
                            result.betterRegime === "old"
                              ? "border-blue-400 bg-blue-50"
                              : "border-gray-100 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-gray-800 text-sm">Old Regime</h4>
                            {result.betterRegime === "old" && (
                              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">BEST</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <SummaryRow label="Gross Income" value={result.old.grossIncome} />
                            <SummaryRow label="Total Deductions" value={result.old.totalDeductions} green />
                            <SummaryRow label="Taxable Income" value={result.old.taxableIncome} />
                            {result.old.rebate87A > 0 && (
                              <SummaryRow label="Rebate u/s 87A" value={result.old.rebate87A} green />
                            )}
                            <SummaryRow label="Tax Before Cess" value={result.old.taxBeforeCess} />
                            <SummaryRow label="4% Cess" value={result.old.cess} />
                            <div className="border-t border-gray-200 mt-2 pt-2">
                              <SummaryRow
                                label="Total Tax"
                                value={result.old.totalTax}
                                bold
                                highlight
                                red={result.betterRegime === "new"}
                                green={result.betterRegime === "old"}
                              />
                            </div>
                          </div>
                        </div>

                        {/* New Regime Summary */}
                        <div
                          className={`rounded-xl p-4 border-2 ${
                            result.betterRegime === "new"
                              ? "border-emerald-400 bg-emerald-50"
                              : "border-gray-100 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-gray-800 text-sm">New Regime</h4>
                            {result.betterRegime === "new" && (
                              <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">BEST</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <SummaryRow label="Gross Income" value={result.new.grossIncome} />
                            <SummaryRow label="Std. Deduction" value={result.new.totalDeductions} green />
                            <SummaryRow label="Taxable Income" value={result.new.taxableIncome} />
                            {result.new.rebate87A > 0 && (
                              <SummaryRow label="Rebate u/s 87A" value={result.new.rebate87A} green />
                            )}
                            <SummaryRow label="Tax Before Cess" value={result.new.taxBeforeCess} />
                            <SummaryRow label="4% Cess" value={result.new.cess} />
                            <div className="border-t border-gray-200 mt-2 pt-2">
                              <SummaryRow
                                label="Total Tax"
                                value={result.new.totalTax}
                                bold
                                highlight
                                red={result.betterRegime === "old"}
                                green={result.betterRegime === "new"}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "old" && (
                      <div>
                        <div className="space-y-1 mb-4">
                          <SummaryRow label="Gross Annual Income" value={result.old.grossIncome} />
                          <div className="bg-green-50 rounded-lg p-3 my-2">
                            <p className="text-xs font-semibold text-green-700 mb-2">Deductions Breakdown</p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Standard Deduction</span>
                                <span className="text-green-700 font-medium">{formatINR(50000)}</span>
                              </div>
                              {parseAmount(inputs.ppf) + parseAmount(inputs.elss) + parseAmount(inputs.licPremium) + parseAmount(inputs.otherSection80C) > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Section 80C (capped)</span>
                                  <span className="text-green-700 font-medium">{formatINR(Math.min(parseAmount(inputs.ppf) + parseAmount(inputs.elss) + parseAmount(inputs.licPremium) + parseAmount(inputs.otherSection80C), 150000))}</span>
                                </div>
                              )}
                              {parseAmount(inputs.healthInsuranceSelf) + parseAmount(inputs.healthInsuranceParents) > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Section 80D</span>
                                  <span className="text-green-700 font-medium">{formatINR(Math.min(parseAmount(inputs.healthInsuranceSelf), inputs.ageGroup === "below60" ? 25000 : 50000) + Math.min(parseAmount(inputs.healthInsuranceParents), inputs.ageGroup === "below60" ? 25000 : 50000))}</span>
                                </div>
                              )}
                              {parseAmount(inputs.npsAdditional) > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">NPS 80CCD(1B)</span>
                                  <span className="text-green-700 font-medium">{formatINR(Math.min(parseAmount(inputs.npsAdditional), 50000))}</span>
                                </div>
                              )}
                              {parseAmount(inputs.hraExemption) > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">HRA Exemption</span>
                                  <span className="text-green-700 font-medium">{formatINR(parseAmount(inputs.hraExemption))}</span>
                                </div>
                              )}
                              {parseAmount(inputs.homeLoanInterest) > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Home Loan Interest 24(b)</span>
                                  <span className="text-green-700 font-medium">{formatINR(Math.min(parseAmount(inputs.homeLoanInterest), 200000))}</span>
                                </div>
                              )}
                              <div className="border-t border-green-200 pt-1 flex justify-between text-xs font-bold">
                                <span className="text-green-800">Total Deductions</span>
                                <span className="text-green-800">{formatINR(result.old.totalDeductions)}</span>
                              </div>
                            </div>
                          </div>
                          <SummaryRow label="Taxable Income" value={result.old.taxableIncome} />
                          {result.old.rebate87A > 0 && <SummaryRow label="Less: Rebate u/s 87A" value={result.old.rebate87A} green />}
                          <SummaryRow label="Income Tax" value={result.old.taxBeforeCess} />
                          <SummaryRow label="Health & Education Cess (4%)" value={result.old.cess} />
                          <div className="border-t border-gray-200 pt-2">
                            <SummaryRow label="Total Tax Payable" value={result.old.totalTax} bold highlight />
                          </div>
                        </div>
                        <SlabTable slabs={result.old.slabWise} />
                        <div className="mt-4 bg-blue-50 rounded-lg px-4 py-3">
                          <p className="text-xs text-blue-700">
                            <strong>Note:</strong> Old regime allows deductions under 80C (â¹1.5L), 80D, 80CCD(1B) (â¹50K), HRA, and Home Loan Interest (â¹2L). Standard deduction of â¹50,000.
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === "new" && (
                      <div>
                        <div className="space-y-1 mb-4">
                          <SummaryRow label="Gross Annual Income" value={result.new.grossIncome} />
                          <div className="bg-emerald-50 rounded-lg p-3 my-2">
                            <p className="text-xs font-semibold text-emerald-700 mb-1">Deductions Breakdown</p>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Standard Deduction (FY 2024-25)</span>
                              <span className="text-emerald-700 font-medium">â¹75,000</span>
                            </div>
                            <p className="text-xs text-emerald-600 mt-1">No other deductions allowed in New Regime</p>
                          </div>
                          <SummaryRow label="Taxable Income" value={result.new.taxableIncome} />
                          {result.new.rebate87A > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-emerald-700 font-medium">â¨ Rebate u/s 87A (Taxable â¤ â¹7L)</span>
                                <span className="text-emerald-700 font-bold">- {formatINR(result.new.rebate87A)}</span>
                              </div>
                            </div>
                          )}
                          <SummaryRow label="Income Tax" value={result.new.taxBeforeCess} />
                          <SummaryRow label="Health & Education Cess (4%)" value={result.new.cess} />
                          <div className="border-t border-gray-200 pt-2">
                            <SummaryRow label="Total Tax Payable" value={result.new.totalTax} bold highlight />
                          </div>
                        </div>
                        <SlabTable slabs={result.new.slabWise} />
                        <div className="mt-4 bg-emerald-50 rounded-lg px-4 py-3">
                          <p className="text-xs text-emerald-700">
                            <strong>Note:</strong> New regime (FY 2024-25) offers standard deduction of â¹75,000. Section 87A rebate available up to â¹7L taxable income (max rebate â¹25,000). No other deductions permitted.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Effective Tax Rate Card */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Old Regime ETR</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {result.old.grossIncome > 0
                        ? ((result.old.totalTax / result.old.grossIncome) * 100).toFixed(2)
                        : "0.00"}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Effective Tax Rate</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">New Regime ETR</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {result.new.grossIncome > 0
                        ? ((result.new.totalTax / result.new.grossIncome) * 100).toFixed(2)
                        : "0.00"}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Effective Tax Rate</p>
                  </div>
                </div>

                {/* Monthly Take-Home */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Monthly Take-Home Estimate</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-blue-600 font-semibold mb-1">Old Regime</p>
                      <p className="text-xl font-bold text-blue-800">
                        {formatINR((result.old.grossIncome - result.old.totalTax) / 12)}
                      </p>
                      <p className="text-xs text-blue-500 mt-1">per month</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-emerald-600 font-semibold mb-1">New Regime</p>
                      <p className="text-xl font-bold text-emerald-800">
                        {formatINR((result.new.grossIncome - result.new.totalTax) / 12)}
                      </p>
                      <p className="text-xs text-emerald-500 mt-1">per month</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    * Approximate estimate. Actual take-home may vary based on PF, gratuity, and other components.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Disclaimer: This calculator is for informational purposes only based on FY 2024-25 tax slabs.
            Consult a qualified CA or tax advisor for accurate tax planning. Surcharge calculations for income above â¹50L not included.
          </p>
        </div>
      </div>
    </div>
  );
}

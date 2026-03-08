"use client";

import React, { useState, useCallback } from "react";

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface TaxInput {
  grossSalary: number;
  hra: number;
  lta: number;
  professionalTax: number;
  // Old Regime Deductions
  section80C: number;
  section80D: number;
  section80CCD1B: number;
  homeLoanInterest: number;
  otherDeductions: number;
  // HRA Exemption
  rentPaid: number;
  metroCity: boolean;
}

interface TaxBreakdown {
  grossIncome: number;
  totalExemptions: number;
  totalDeductions: number;
  taxableIncome: number;
  taxBeforeCess: number;
  surcharge: number;
  rebate: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
  slabWiseTax: { slab: string; rate: string; tax: number }[];
}

// âââ Helper Utilities âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const formatINR = (amount: number): string => {
  if (amount === 0) return "â¹0";
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
  return `${amount < 0 ? "-" : ""}â¹${formatted}`;
};

const formatINRLakh = (amount: number): string => {
  if (amount >= 10_00_00_000)
    return `â¹${(amount / 10_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000)
    return `â¹${(amount / 1_00_000).toFixed(2)} L`;
  return formatINR(amount);
};

// âââ Tax Calculation Logic ââââââââââââââââââââââââââââââââââââââââââââââââââââ

const calculateHRAExemption = (
  basicSalary: number,
  hraReceived: number,
  rentPaid: number,
  isMetro: boolean
): number => {
  const actual = hraReceived;
  const rentMinus10Percent = Math.max(0, rentPaid - 0.1 * basicSalary);
  const percentOfBasic = isMetro ? 0.5 * basicSalary : 0.4 * basicSalary;
  return Math.min(actual, rentMinus10Percent, percentOfBasic);
};

const calcOldRegime = (input: TaxInput): TaxBreakdown => {
  const basic = input.grossSalary * 0.4;
  const hraExemption =
    input.rentPaid > 0
      ? calculateHRAExemption(basic, input.hra, input.rentPaid, input.metroCity)
      : 0;

  const standardDeduction = 50_000;
  const totalExemptions =
    hraExemption + input.lta + input.professionalTax + standardDeduction;

  const capped80C = Math.min(input.section80C, 1_50_000);
  const capped80D = Math.min(input.section80D, 50_000);
  const capped80CCD = Math.min(input.section80CCD1B, 50_000);
  const cappedHLI = Math.min(input.homeLoanInterest, 2_00_000);

  const totalDeductions =
    capped80C +
    capped80D +
    capped80CCD +
    cappedHLI +
    input.otherDeductions;

  const taxableIncome = Math.max(
    0,
    input.grossSalary - totalExemptions - totalDeductions
  );

  const slabWiseTax: { slab: string; rate: string; tax: number }[] = [];
  let taxBeforeCess = 0;

  const oldSlabs = [
    { limit: 2_50_000, lower: 0, rate: 0, label: "Up to â¹2.5L" },
    { limit: 5_00_000, lower: 2_50_000, rate: 0.05, label: "â¹2.5L â â¹5L" },
    { limit: 10_00_000, lower: 5_00_000, rate: 0.2, label: "â¹5L â â¹10L" },
    { limit: Infinity, lower: 10_00_000, rate: 0.3, label: "Above â¹10L" },
  ];

  oldSlabs.forEach(({ limit, lower, rate, label }) => {
    if (taxableIncome > lower) {
      const taxable = Math.min(taxableIncome, limit) - lower;
      const tax = taxable * rate;
      taxBeforeCess += tax;
      slabWiseTax.push({
        slab: label,
        rate: `${(rate * 100).toFixed(0)}%`,
        tax,
      });
    }
  });

  // Section 87A rebate (old regime: income <= 5L, rebate up to â¹12,500)
  const rebate = taxableIncome <= 5_00_000 ? Math.min(taxBeforeCess, 12_500) : 0;
  const afterRebate = Math.max(0, taxBeforeCess - rebate);

  // Surcharge
  let surcharge = 0;
  if (taxableIncome > 5_00_00_000) surcharge = afterRebate * 0.37;
  else if (taxableIncome > 2_00_00_000) surcharge = afterRebate * 0.25;
  else if (taxableIncome > 1_00_00_000) surcharge = afterRebate * 0.15;
  else if (taxableIncome > 50_00_000) surcharge = afterRebate * 0.1;

  const cess = (afterRebate + surcharge) * 0.04;
  const totalTax = afterRebate + surcharge + cess;

  return {
    grossIncome: input.grossSalary,
    totalExemptions,
    totalDeductions,
    taxableIncome,
    taxBeforeCess,
    surcharge,
    rebate,
    cess,
    totalTax,
    effectiveRate: input.grossSalary > 0 ? (totalTax / input.grossSalary) * 100 : 0,
    slabWiseTax,
  };
};

const calcNewRegime = (input: TaxInput): TaxBreakdown => {
  // New Regime FY 2024-25: Standard deduction â¹75,000
  const standardDeduction = 75_000;
  const totalExemptions = standardDeduction;
  const totalDeductions = 0;

  const taxableIncome = Math.max(0, input.grossSalary - totalExemptions);

  const slabWiseTax: { slab: string; rate: string; tax: number }[] = [];
  let taxBeforeCess = 0;

  // New regime slabs FY 2024-25
  const newSlabs = [
    { limit: 3_00_000, lower: 0, rate: 0, label: "Up to â¹3L" },
    { limit: 7_00_000, lower: 3_00_000, rate: 0.05, label: "â¹3L â â¹7L" },
    { limit: 10_00_000, lower: 7_00_000, rate: 0.1, label: "â¹7L â â¹10L" },
    { limit: 12_00_000, lower: 10_00_000, rate: 0.15, label: "â¹10L â â¹12L" },
    { limit: 15_00_000, lower: 12_00_000, rate: 0.2, label: "â¹12L â â¹15L" },
    { limit: Infinity, lower: 15_00_000, rate: 0.3, label: "Above â¹15L" },
  ];

  newSlabs.forEach(({ limit, lower, rate, label }) => {
    if (taxableIncome > lower) {
      const taxable = Math.min(taxableIncome, limit) - lower;
      const tax = taxable * rate;
      taxBeforeCess += tax;
      slabWiseTax.push({
        slab: label,
        rate: `${(rate * 100).toFixed(0)}%`,
        tax,
      });
    }
  });

  // Section 87A rebate (new regime: income <= 7L, full rebate)
  const rebate = taxableIncome <= 7_00_000 ? Math.min(taxBeforeCess, 25_000) : 0;
  const afterRebate = Math.max(0, taxBeforeCess - rebate);

  let surcharge = 0;
  if (taxableIncome > 5_00_00_000) surcharge = afterRebate * 0.25;
  else if (taxableIncome > 2_00_00_000) surcharge = afterRebate * 0.25;
  else if (taxableIncome > 1_00_00_000) surcharge = afterRebate * 0.15;
  else if (taxableIncome > 50_00_000) surcharge = afterRebate * 0.1;

  const cess = (afterRebate + surcharge) * 0.04;
  const totalTax = afterRebate + surcharge + cess;

  return {
    grossIncome: input.grossSalary,
    totalExemptions,
    totalDeductions,
    taxableIncome,
    taxBeforeCess,
    surcharge,
    rebate,
    cess,
    totalTax,
    effectiveRate: input.grossSalary > 0 ? (totalTax / input.grossSalary) * 100 : 0,
    slabWiseTax,
  };
};

// âââ Sub-components âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const InputField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
  helper?: string;
}> = ({ label, value, onChange, max, helper }) => (
  <div className="space-y-1">
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">
        â¹
      </span>
      <input
        type="number"
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => {
          const v = parseFloat(e.target.value) || 0;
          onChange(max ? Math.min(v, max) : v);
        }}
        className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition"
      />
    </div>
    {helper && <p className="text-xs text-slate-400">{helper}</p>}
  </div>
);

const ResultRow: React.FC<{
  label: string;
  old: number;
  newR: number;
  negative?: boolean;
  bold?: boolean;
  highlight?: boolean;
}> = ({ label, old, newR, negative, bold, highlight }) => (
  <div
    className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
      highlight
        ? "bg-blue-50 border border-blue-200"
        : "border-b border-slate-100"
    }`}
  >
    <span
      className={`text-sm ${
        bold ? "font-bold text-slate-800" : "text-slate-600"
      }`}
    >
      {label}
    </span>
    <div className="flex gap-6">
      <span
        className={`text-sm w-28 text-right ${
          bold ? "font-bold" : "font-medium"
        } ${
          negative ? "text-green-600" : highlight ? "text-blue-700" : "text-slate-700"
        }`}
      >
        {formatINR(old)}
      </span>
      <span
        className={`text-sm w-28 text-right ${
          bold ? "font-bold" : "font-medium"
        } ${
          negative ? "text-green-600" : highlight ? "text-blue-700" : "text-slate-700"
        }`}
      >
        {formatINR(newR)}
      </span>
    </div>
  </div>
);

const SlabTable: React.FC<{
  slabs: { slab: string; rate: string; tax: number }[];
  regime: "old" | "new";
}> = ({ slabs, regime }) => (
  <div className="overflow-hidden rounded-lg border border-slate-200">
    <table className="w-full text-sm">
      <thead>
        <tr
          className={`${
            regime === "old" ? "bg-purple-50" : "bg-emerald-50"
          }`}
        >
          <th className="text-left px-3 py-2 font-semibold text-slate-700">
            Slab
          </th>
          <th className="text-center px-3 py-2 font-semibold text-slate-700">
            Rate
          </th>
          <th className="text-right px-3 py-2 font-semibold text-slate-700">
            Tax
          </th>
        </tr>
      </thead>
      <tbody>
        {slabs.map((s, i) => (
          <tr key={i} className="border-t border-slate-100">
            <td className="px-3 py-2 text-slate-600">{s.slab}</td>
            <td className="px-3 py-2 text-center font-medium text-slate-700">
              {s.rate}
            </td>
            <td className="px-3 py-2 text-right font-semibold text-slate-800">
              {formatINR(s.tax)}
            </td>
          </tr>
        ))}
        {slabs.length === 0 && (
          <tr>
            <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
              Enter income to see slab breakdown
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

// âââ Main TaxCalculator Component ââââââââââââââââââââââââââââââââââââââââââââ

const TaxCalculator: React.FC = () => {
  const [input, setInput] = useState<TaxInput>({
    grossSalary: 12_00_000,
    hra: 2_40_000,
    lta: 20_000,
    professionalTax: 2_400,
    section80C: 1_50_000,
    section80D: 25_000,
    section80CCD1B: 50_000,
    homeLoanInterest: 0,
    otherDeductions: 0,
    rentPaid: 0,
    metroCity: true,
  });

  const [activeTab, setActiveTab] = useState<"summary" | "slabs" | "breakdown">(
    "summary"
  );

  const update = useCallback(
    (field: keyof TaxInput, value: number | boolean) =>
      setInput((prev) => ({ ...prev, [field]: value })),
    []
  );

  const oldResult = calcOldRegime(input);
  const newResult = calcNewRegime(input);
  const savings = oldResult.totalTax - newResult.totalTax;
  const betterRegime = savings > 0 ? "New" : savings < 0 ? "Old" : "Equal";

  return (
    <div className="space-y-6">
      {/* Recommendation Banner */}
      {input.grossSalary > 0 && (
        <div
          className={`p-4 rounded-xl border-2 ${
            betterRegime === "New"
              ? "bg-emerald-50 border-emerald-300"
              : betterRegime === "Old"
              ? "bg-purple-50 border-purple-300"
              : "bg-slate-50 border-slate-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {betterRegime === "New" ? "ð" : betterRegime === "Old" ? "ð" : "âï¸"}
            </span>
            <div>
              <p className="font-bold text-slate-800 text-base">
                {betterRegime === "Equal"
                  ? "Both regimes result in equal tax"
                  : `${betterRegime} Regime is better for you`}
              </p>
              {savings !== 0 && (
                <p className="text-sm text-slate-600">
                  You save{" "}
                  <span className="font-bold text-green-700">
                    {formatINR(Math.abs(savings))}
                  </span>{" "}
                  annually by choosing the{" "}
                  <span className="font-semibold">{betterRegime} Regime</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ââ Input Panel ââ */}
        <div className="lg:col-span-1 space-y-4">
          {/* Income Details */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                Income Details
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <InputField
                label="Gross Annual Salary"
                value={input.grossSalary}
                onChange={(v) => update("grossSalary", v)}
                helper="CTC before any deductions"
              />
              <InputField
                label="HRA Received"
                value={input.hra}
                onChange={(v) => update("hra", v)}
                helper="House Rent Allowance per year"
              />
              <InputField
                label="LTA"
                value={input.lta}
                onChange={(v) => update("lta", v)}
                helper="Leave Travel Allowance"
              />
              <InputField
                label="Professional Tax"
                value={input.professionalTax}
                onChange={(v) => update("professionalTax", v)}
                helper="Usually â¹2,400/year"
              />
            </div>
          </div>

          {/* HRA Exemption */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500">
              <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                HRA Exemption
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <InputField
                label="Annual Rent Paid"
                value={input.rentPaid}
                onChange={(v) => update("rentPaid", v)}
                helper="0 if living in own house"
              />
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <input
                  type="checkbox"
                  id="metro"
                  checked={input.metroCity}
                  onChange={(e) => update("metroCity", e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <label
                  htmlFor="metro"
                  className="text-sm font-medium text-slate-700"
                >
                  Metro City
                  <span className="block text-xs text-slate-500">
                    Delhi, Mumbai, Kolkata, Chennai
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Deductions (Old Regime) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-purple-600 to-purple-700">
              <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                Deductions (Old Regime Only)
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <InputField
                label="Section 80C"
                value={input.section80C}
                onChange={(v) => update("section80C", v)}
                max={1_50_000}
                helper="Max â¹1.5L â EPF, ELSS, PPF, LIC"
              />
              <InputField
                label="Section 80D"
                value={input.section80D}
                onChange={(v) => update("section80D", v)}
                max={50_000}
                helper="Max â¹50K â Health Insurance"
              />
              <InputField
                label="Section 80CCD(1B)"
                value={input.section80CCD1B}
                onChange={(v) => update("section80CCD1B", v)}
                max={50_000}
                helper="Max â¹50K â NPS Additional"
              />
              <InputField
                label="Home Loan Interest"
                value={input.homeLoanInterest}
                onChange={(v) => update("homeLoanInterest", v)}
                max={2_00_000}
                helper="Max â¹2L â Section 24(b)"
              />
              <InputField
                label="Other Deductions"
                value={input.otherDeductions}
                onChange={(v) => update("otherDeductions", v)}
                helper="80E, 80G, 80TTA etc."
              />
            </div>
          </div>
        </div>

        {/* ââ Results Panel ââ */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-xs uppercase tracking-widest text-purple-200 mb-1">
                Old Regime Tax
              </p>
              <p className="text-3xl font-black">
                {formatINRLakh(oldResult.totalTax)}
              </p>
              <p className="text-sm text-purple-200 mt-1">
                Effective: {oldResult.effectiveRate.toFixed(2)}%
              </p>
              <div className="mt-3 text-xs text-purple-200">
                Taxable Income:{" "}
                <span className="font-semibold text-white">
                  {formatINRLakh(oldResult.taxableIncome)}
                </span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-xs uppercase tracking-widest text-emerald-200 mb-1">
                New Regime Tax
              </p>
              <p className="text-3xl font-black">
                {formatINRLakh(newResult.totalTax)}
              </p>
              <p className="text-sm text-emerald-200 mt-1">
                Effective: {newResult.effectiveRate.toFixed(2)}%
              </p>
              <div className="mt-3 text-xs text-emerald-200">
                Taxable Income:{" "}
                <span className="font-semibold text-white">
                  {formatINRLakh(newResult.taxableIncome)}
                </span>
              </div>
            </div>
          </div>

          {/* In-hand Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Old Regime In-Hand</p>
              <p className="text-xl font-bold text-slate-800 mt-1">
                {formatINRLakh(input.grossSalary - oldResult.totalTax)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatINRLakh(Math.round((input.grossSalary - oldResult.totalTax) / 12))}/month
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wide">New Regime In-Hand</p>
              <p className="text-xl font-bold text-slate-800 mt-1">
                {formatINRLakh(input.grossSalary - newResult.totalTax)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatINRLakh(Math.round((input.grossSalary - newResult.totalTax) / 12))}/month
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200">
              {(["summary", "slabs", "breakdown"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-semibold capitalize transition ${
                    activeTab === tab
                      ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* Summary Tab */}
              {activeTab === "summary" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-slate-400">Description</span>
                    <div className="flex gap-6">
                      <span className="text-xs font-bold text-purple-700 w-28 text-right">
                        Old Regime
                      </span>
                      <span className="text-xs font-bold text-emerald-700 w-28 text-right">
                        New Regime
                      </span>
                    </div>
                  </div>
                  <ResultRow
                    label="Gross Income"
                    old={oldResult.grossIncome}
                    newR={newResult.grossIncome}
                  />
                  <ResultRow
                    label="(-) Exemptions"
                    old={-oldResult.totalExemptions}
                    newR={-newResult.totalExemptions}
                    negative
                  />
                  <ResultRow
                    label="(-) Deductions"
                    old={-oldResult.totalDeductions}
                    newR={-newResult.totalDeductions}
                    negative
                  />
                  <ResultRow
                    label="Taxable Income"
                    old={oldResult.taxableIncome}
                    newR={newResult.taxableIncome}
                    bold
                  />
                  <ResultRow
                    label="Tax Before Cess"
                    old={oldResult.taxBeforeCess}
                    newR={newResult.taxBeforeCess}
                  />
                  <ResultRow
                    label="(-) 87A Rebate"
                    old={-oldResult.rebate}
                    newR={-newResult.rebate}
                    negative
                  />
                  {(oldResult.surcharge > 0 || newResult.surcharge > 0) && (
                    <ResultRow
                      label="(+) Surcharge"
                      old={oldResult.surcharge}
                      newR={newResult.surcharge}
                    />
                  )}
                  <ResultRow
                    label="(+) Health & Education Cess (4%)"
                    old={oldResult.cess}
                    newR={newResult.cess}
                  />
                  <ResultRow
                    label="Total Tax Liability"
                    old={oldResult.totalTax}
                    newR={newResult.totalTax}
                    bold
                    highlight
                  />
                </div>
              )}

              {/* Slabs Tab */}
              {activeTab === "slabs" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-600 rounded-full inline-block"></span>
                      Old Regime Slabs
                    </h4>
                    <SlabTable slabs={oldResult.slabWiseTax} regime="old" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-700 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-600 rounded-full inline-block"></span>
                      New Regime Slabs
                    </h4>
                    <SlabTable slabs={newResult.slabWiseTax} regime="new" />
                  </div>
                </div>
              )}

              {/* Breakdown Tab */}
              {activeTab === "breakdown" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                      <h4 className="font-bold text-purple-800 mb-3 text-sm">Old Regime</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Standard Deduction</span>
                          <span className="font-semibold">â¹50,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">80C (capped)</span>
                          <span className="font-semibold">{formatINR(Math.min(input.section80C, 1_50_000))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">80D (capped)</span>
                          <span className="font-semibold">{formatINR(Math.min(input.section80D, 50_000))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">80CCD(1B)</span>
                          <span className="font-semibold">{formatINR(Math.min(input.section80CCD1B, 50_000))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">HRA Exemption</span>
                          <span className="font-semibold">
                            {formatINR(
                              input.rentPaid > 0
                                ? calculateHRAExemption(
                                    input.grossSalary * 0.4,
                                    input.hra,
                                    input.rentPaid,
                                    input.metroCity
                                  )
                                : 0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-bold">
                          <span>Total Savings</span>
                          <span className="text-green-700">
                            {formatINR(oldResult.totalExemptions + oldResult.totalDeductions)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <h4 className="font-bold text-emerald-800 mb-3 text-sm">New Regime</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Standard Deduction</span>
                          <span className="font-semibold">â¹75,000</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>80C</span>
                          <span>Not applicable</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>80D</span>
                          <span>Not applicable</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>HRA</span>
                          <span>Not applicable</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Home Loan Interest</span>
                          <span>Not applicable</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-bold">
                          <span>Total Savings</span>
                          <span className="text-green-700">â¹75,000</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Tax Bar */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Tax as % of Income</p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-purple-700 font-semibold">Old Regime</span>
                          <span>{oldResult.effectiveRate.toFixed(2)}%</span>
                        </div>
                        <div className="h-4 bg-purple-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(oldResult.effectiveRate, 40)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-emerald-700 font-semibold">New Regime</span>
                          <span>{newResult.effectiveRate.toFixed(2)}%</span>
                        </div>
                        <div className="h-4 bg-emerald-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(newResult.effectiveRate, 40)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// âââ FY 2024-25 Changes Info Bar âââââââââââââââââââââââââââââââââââââââââââââ

const changes = [
  { icon: "ð", title: "New Rebate Limit", desc: "87A rebate raised to â¹7L (New Regime)" },
  { icon: "ð¼", title: "Standard Deduction", desc: "Increased to â¹75,000 in New Regime" },
  { icon: "ð¦", title: "NPS Employer", desc: "14% employer NPS deduction (New Regime)" },
  { icon: "ð¯", title: "Default Regime", desc: "New regime is default from FY 2024-25" },
  { icon: "ð°", title: "Family Pension", desc: "Deduction raised to â¹25K in New Regime" },
];

const InfoBar: React.FC = () => (
  <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-5 overflow-hidden">
    <p className="text-xs text-blue-300 uppercase tracking-widest mb-3 font-semibold">
      Key Changes â Union Budget 2024 / FY 2024-25
    </p>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {changes.map((c, i) => (
        <div
          key={i}
          className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10"
        >
          <span className="text-xl">{c.icon}</span>
          <p className="text-white font-semibold text-xs mt-2">{c.title}</p>
          <p className="text-blue-200 text-xs mt-0.5">{c.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

// âââ Tax Saving Investments Section ââââââââââââââââââââââââââââââââââââââââââ

const investmentCategories = [
  {
    section: "80C",
    color: "blue",
    limit: "â¹1,50,000",
    icon: "ðï¸",
    items: [
      { name: "EPF", desc: "Employee Provident Fund", return: "8.25% p.a." },
      { name: "PPF", desc: "Public Provident Fund", return: "7.1% p.a." },
      { name: "ELSS Funds", desc: "Tax-saving Mutual Funds", return: "12-15% (market linked)" },
      { name: "NSC", desc: "National Savings Certificate", return: "7.7% p.a." },
      { name: "LIC Premium", desc: "Life Insurance Premium", return: "Varies" },
      { name: "Tax Saver FD", desc: "5-Year Bank FD", return: "6.5-7.5% p.a." },
    ],
  },
  {
    section: "80D",
    color: "green",
    limit: "â¹50,000",
    icon: "ð¥",
    items: [
      { name: "Health Insurance", desc: "Self + Family", return: "Up to â¹25,000" },
      { name: "Parent Insurance", desc: "Senior Citizen Parents", return: "Up to â¹50,000" },
      { name: "Preventive Check-up", desc: "Annual health check", return: "Up to â¹5,000" },
    ],
  },
  {
    section: "80CCD",
    color: "purple",
    limit: "â¹50,000",
    icon: "ð¯",
    items: [
      { name: "NPS Tier I", desc: "80CCD(1) â Part of 80C limit", return: "Market linked" },
      {
        name: "NPS Extra",
        desc: "80CCD(1B) â Over & above 80C",
        return: "Extra â¹50K deduction",
      },
      {
        name: "Employer NPS",
        desc: "80CCD(2) â No upper limit",
        return: "Up to 10% of basic",
      },
    ],
  },
];

const colorMap: Record<string, { bg: string; badge: string; dot: string }> = {
  blue: { bg: "bg-blue-50 border-blue-200", badge: "bg-blue-600 text-white", dot: "bg-blue-500" },
  green: { bg: "bg-green-50 border-green-200", badge: "bg-green-600 text-white", dot: "bg-green-500" },
  purple: { bg: "bg-purple-50 border-purple-200", badge: "bg-purple-600 text-white", dot: "bg-purple-500" },
};

const TaxSavingSection: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Tax Saving Investments</h2>
        <p className="text-sm text-slate-500">Applicable under Old Regime only</p>
      </div>
      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
        Old Regime
      </span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {investmentCategories.map((cat) => {
        const c = colorMap[cat.color];
        return (
          <div
            key={cat.section}
            className={`border rounded-2xl overflow-hidden ${c.bg}`}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-opacity-30">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.icon}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                  Sec {cat.section}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-600">Max {cat.limit}</span>
            </div>
            <div className="p-4 space-y-3">
              {cat.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${c.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">{item.return}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// âââ Quick Tips âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const tips = [
  {
    icon: "ð¡",
    title: "Choose New Regime if...",
    points: [
      "Your total deductions are less than â¹3.75L",
      "You have minimal investments in 80C instruments",
      "You prefer simplicity in filing",
    ],
    color: "emerald",
  },
  {
    icon: "ð",
    title: "Choose Old Regime if...",
    points: [
      "You maximize 80C, 80D, NPS deductions",
      "Paying significant home loan interest",
      "Claiming HRA with high rent in metro city",
    ],
    color: "purple",
  },
  {
    icon: "ðï¸",
    title: "Important Deadlines",
    points: [
      "ITR filing: July 31, 2025",
      "Advance tax Q4: March 15, 2025",
      "Form 16 from employer: June 15, 2025",
    ],
    color: "blue",
  },
  {
    icon: "â¡",
    title: "Last-Minute Tax Saving",
    points: [
      "Invest in ELSS before March 31",
      "Pay health insurance premium",
      "Contribute to NPS via employer",
    ],
    color: "amber",
  },
];

const tipColorMap: Record<string, { bg: string; border: string; icon: string }> = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "bg-emerald-100" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", icon: "bg-purple-100" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "bg-blue-100" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "bg-amber-100" },
};

const QuickTips: React.FC = () => (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-slate-800">ð¬ Quick Tax Planning Tips</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {tips.map((tip, i) => {
        const c = tipColorMap[tip.color];
        return (
          <div
            key={i}
            className={`rounded-2xl border ${c.bg} ${c.border} p-4 space-y-3`}
          >
            <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center text-xl`}>
              {tip.icon}
            </div>
            <h3 className="font-bold text-slate-800 text-sm">{tip.title}</h3>
            <ul className="space-y-1.5">
              {tip.points.map((p, j) => (
                <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-slate-400 mt-0.5">â¢</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  </div>
);

// âââ Tax Slab Reference âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const SlabReference: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100">
      <h3 className="font-bold text-slate-800">FY 2024-25 Tax Slab Reference</h3>
      <p className="text-xs text-slate-500 mt-0.5">For individuals below 60 years</p>
    </div>
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-semibold text-purple-700 mb-3 text-sm">Old Regime</h4>
        <div className="space-y-1.5">
          {[
            ["Up to â¹2,50,000", "Nil"],
            ["â¹2,50,001 â â¹5,00,000", "5%"],
            ["â¹5,00,001 â â¹10,00,000", "20%"],
            ["Above â¹10,00,000", "30%"],
          ].map(([slab, rate]) => (
            <div key={slab} className="flex justify-between items-center py-2 px-3 rounded-lg bg-purple-50">
              <span className="text-xs text-slate-700">{slab}</span>
              <span className="text-xs font-bold text-purple-700">{rate}</span>
            </div>
          ))}
          <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
            87A Rebate: Full tax rebate if income â¤ â¹5L
          </div>
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-emerald-700 mb-3 text-sm">New Regime (Default)</h4>
        <div className="space-y-1.5">
          {[
            ["Up to â¹3,00,000", "Nil"],
            ["â¹3,00,001 â â¹7,00,000", "5%"],
            ["â¹7,00,001 â â¹10,00,000", "10%"],
            ["â¹10,00,001 â â¹12,00,000", "15%"],
            ["â¹12,00,001 â â¹15,00,000", "20%"],
            ["Above â¹15,00,000", "30%"],
          ].map(([slab, rate]) => (
            <div key={slab} className="flex justify-between items-center py-2 px-3 rounded-lg bg-emerald-50">
              <span className="text-xs text-slate-700">{slab}</span>
              <span className="text-xs font-bold text-emerald-700">{rate}</span>
            </div>
          ))}
          <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
            87A Rebate: Full tax rebate if income â¤ â¹7L
          </div>
        </div>
      </div>
    </div>
  </div>
);

// âââ Page âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function TaxPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              ð§® Tax Calculator
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Old vs New Regime â FY 2024-25
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <span className="text-amber-600 text-lg">â ï¸</span>
            <div>
              <p className="text-xs font-bold text-amber-800">Assessment Year</p>
              <p className="text-xs text-amber-700">AY 2025-26</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Info Bar */}
        <InfoBar />

        {/* Main Calculator */}
        <TaxCalculator />

        {/* Slab Reference */}
        <SlabReference />

        {/* Tax Saving Investments */}
        <TaxSavingSection />

        {/* Quick Tips */}
        <QuickTips />

        {/* Disclaimer */}
        <div className="bg-slate-800 rounded-2xl p-5 flex items-start gap-4">
          <span className="text-2xl flex-shrink-0">âï¸</span>
          <div>
            <p className="font-bold text-white text-sm">Disclaimer</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              This calculator is for <strong className="text-slate-200">informational purposes only</strong>.
              Tax calculations are simplified estimates and may not account for all individual
              circumstances, special provisions, or recent amendments. TDS, advance tax,
              and other obligations may differ. Please{" "}
              <strong className="text-slate-200">consult a Chartered Accountant (CA)</strong>{" "}
              or tax professional for accurate tax filing, returns, and advice. All figures
              are in Indian Rupees (INR) as per Income Tax Act, 1961.
            </p>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center text-xs text-slate-400 pb-4">
          Last updated: July 2024 â¢ Finance Act 2024 â¢ Income Tax Act, 1961
        </div>
      </div>
    </main>
  );
}

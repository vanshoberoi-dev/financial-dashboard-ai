"use client";

import React from "react";

interface MFCardProps {
  schemeName: string;
  folioNumber: string;
  currentNAV: number;
  units: number;
  investedValue: number;
  currentValue: number;
  returns: number;
  returnsPercent: number;
  category: string;
}

function formatIndianCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(absAmount);
  return amount < 0 ? `-â¹${formatted}` : `â¹${formatted}`;
}

function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 4,
  }).format(num);
}

function getCategoryStyle(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes("equity")) {
    return "bg-blue-100 text-blue-700 border border-blue-200";
  } else if (cat.includes("debt")) {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  } else if (cat.includes("hybrid")) {
    return "bg-purple-100 text-purple-700 border border-purple-200";
  } else if (cat.includes("elss") || cat.includes("tax")) {
    return "bg-green-100 text-green-700 border border-green-200";
  } else if (cat.includes("liquid") || cat.includes("money")) {
    return "bg-cyan-100 text-cyan-700 border border-cyan-200";
  } else {
    return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

const MFCard: React.FC<MFCardProps> = ({
  schemeName,
  folioNumber,
  currentNAV,
  units,
  investedValue,
  currentValue,
  returns,
  returnsPercent,
  category,
}) => {
  const isPositive = returns >= 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden w-full">
      {/* Top accent bar based on category */}
      <div
        className={`h-1 w-full ${
          category.toLowerCase().includes("equity")
            ? "bg-blue-500"
            : category.toLowerCase().includes("debt")
            ? "bg-amber-400"
            : category.toLowerCase().includes("hybrid")
            ? "bg-purple-500"
            : category.toLowerCase().includes("elss") ||
              category.toLowerCase().includes("tax")
            ? "bg-green-500"
            : "bg-gray-400"
        }`}
      />

      <div className="p-5">
        {/* Header: Scheme Name + Category Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3
              className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2"
              title={schemeName}
            >
              {schemeName}
            </h3>
            <p className="text-gray-400 text-xs mt-1 font-mono">Folio: {folioNumber}</p>
          </div>
          <span
            className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getCategoryStyle(
              category
            )}`}
          >
            {category}
          </span>
        </div>

        {/* Current Value - Large Display */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
            Current Value
          </p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatIndianCurrency(currentValue)}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-50 mb-4" />

        {/* Invested vs Current Comparison */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
              Invested
            </p>
            <p className="text-sm font-semibold text-gray-700">
              {formatIndianCurrency(investedValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
              Returns
            </p>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-sm font-bold ${
                  isPositive ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {isPositive ? "+" : ""}
                {formatIndianCurrency(returns)}
              </span>
            </div>
          </div>
        </div>

        {/* Returns Percent Badge + Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">Performance</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                isPositive
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-500"
              }`}
            >
              <svg
                className={`w-3 h-3 ${
                  isPositive ? "" : "rotate-180"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {isPositive ? "+" : ""}
              {returnsPercent.toFixed(2)}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isPositive ? "bg-emerald-400" : "bg-red-400"
              }`}
              style={{
                width: `${Math.min(Math.abs(returnsPercent), 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-50 mb-3" />

        {/* Units & NAV Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-3.5 h-3.5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-400">Units</p>
              <p className="text-xs font-semibold text-gray-700">
                {formatIndianNumber(units)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-3.5 h-3.5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-400">NAV</p>
              <p className="text-xs font-semibold text-gray-700">
                â¹{currentNAV.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MFCard;

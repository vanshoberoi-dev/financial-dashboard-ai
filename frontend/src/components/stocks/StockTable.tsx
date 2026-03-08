"use client";

import React, { useState, useMemo } from "react";

type Holding = {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  sector: string;
};

type SortKey = keyof Holding;
type SortDirection = "asc" | "desc";

const defaultHoldings: Holding[] = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    quantity: 50,
    avgPrice: 2450.0,
    currentPrice: 2891.45,
    dayChange: 34.25,
    dayChangePercent: 1.2,
    totalReturn: 22072.5,
    totalReturnPercent: 18.03,
    sector: "Energy",
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    quantity: 30,
    avgPrice: 3200.0,
    currentPrice: 3756.8,
    dayChange: -22.1,
    dayChangePercent: -0.58,
    totalReturn: 16704.0,
    totalReturnPercent: 17.4,
    sector: "IT",
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd",
    quantity: 75,
    avgPrice: 1380.0,
    currentPrice: 1452.35,
    dayChange: 12.45,
    dayChangePercent: 0.86,
    totalReturn: 5426.25,
    totalReturnPercent: 5.24,
    sector: "IT",
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    quantity: 60,
    avgPrice: 1550.0,
    currentPrice: 1623.9,
    dayChange: -8.6,
    dayChangePercent: -0.53,
    totalReturn: 4434.0,
    totalReturnPercent: 4.77,
    sector: "Banking",
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd",
    quantity: 100,
    avgPrice: 820.0,
    currentPrice: 1089.75,
    dayChange: 15.3,
    dayChangePercent: 1.42,
    totalReturn: 26975.0,
    totalReturnPercent: 32.9,
    sector: "Banking",
  },
  {
    symbol: "ITC",
    name: "ITC Ltd",
    quantity: 200,
    avgPrice: 310.0,
    currentPrice: 458.6,
    dayChange: 3.45,
    dayChangePercent: 0.76,
    totalReturn: 29720.0,
    totalReturnPercent: 47.94,
    sector: "FMCG",
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    quantity: 120,
    avgPrice: 560.0,
    currentPrice: 623.4,
    dayChange: -5.2,
    dayChangePercent: -0.83,
    totalReturn: 7608.0,
    totalReturnPercent: 11.32,
    sector: "Banking",
  },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors Ltd",
    quantity: 80,
    avgPrice: 620.0,
    currentPrice: 548.3,
    dayChange: -18.7,
    dayChangePercent: -3.3,
    totalReturn: -5736.0,
    totalReturnPercent: -11.56,
    sector: "Auto",
  },
  {
    symbol: "BAJFINANCE",
    name: "Bajaj Finance Ltd",
    quantity: 15,
    avgPrice: 6800.0,
    currentPrice: 7245.55,
    dayChange: 78.9,
    dayChangePercent: 1.1,
    totalReturn: 6683.25,
    totalReturnPercent: 6.55,
    sector: "Finance",
  },
  {
    symbol: "WIPRO",
    name: "Wipro Ltd",
    quantity: 90,
    avgPrice: 420.0,
    currentPrice: 389.15,
    dayChange: -6.85,
    dayChangePercent: -1.73,
    totalReturn: -2776.5,
    totalReturnPercent: -7.35,
    sector: "IT",
  },
];

const formatINR = (value: number, decimals = 2): string => {
  const absValue = Math.abs(value);
  let formatted: string;
  if (absValue >= 10000000) {
    formatted = (absValue / 10000000).toFixed(2) + " Cr";
  } else if (absValue >= 100000) {
    formatted = (absValue / 100000).toFixed(2) + " L";
  } else {
    formatted = absValue.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return (value < 0 ? "-" : "") + "\u20B9" + formatted;
};

const formatPrice = (value: number): string => {
  return (
    "\u20B9" +
    value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

const SortIcon = ({ direction }: { direction: SortDirection | null }) => {
  if (!direction)
    return (
      <span className="ml-1 text-gray-400 opacity-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="inline h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      </span>
    );
  return (
    <span className="ml-1 text-indigo-600">
      {direction === "asc" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="inline h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="inline h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      )}
    </span>
  );
};

const sectorColors: Record<string, string> = {
  Energy: "bg-orange-100 text-orange-700",
  IT: "bg-blue-100 text-blue-700",
  Banking: "bg-purple-100 text-purple-700",
  FMCG: "bg-green-100 text-green-700",
  Auto: "bg-yellow-100 text-yellow-700",
  Finance: "bg-pink-100 text-pink-700",
};

interface Props {
  holdings?: Holding[];
}

export default function StockTable({ holdings = defaultHoldings }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [holdings, sortKey, sortDir]);

  const summary = useMemo(() => {
    const totalInvested = holdings.reduce(
      (sum, h) => sum + h.avgPrice * h.quantity,
      0
    );
    const totalCurrent = holdings.reduce(
      (sum, h) => sum + h.currentPrice * h.quantity,
      0
    );
    const totalPnL = totalCurrent - totalInvested;
    const totalPnLPercent =
      totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const totalDayChange = holdings.reduce(
      (sum, h) => sum + h.dayChange * h.quantity,
      0
    );
    return { totalInvested, totalCurrent, totalPnL, totalPnLPercent, totalDayChange };
  }, [holdings]);

  const columns: { key: SortKey; label: string; align: string }[] = [
    { key: "symbol", label: "Symbol", align: "text-left" },
    { key: "name", label: "Company Name", align: "text-left" },
    { key: "quantity", label: "Qty", align: "text-right" },
    { key: "avgPrice", label: "Avg Price", align: "text-right" },
    { key: "currentPrice", label: "Current Price", align: "text-right" },
    { key: "dayChange", label: "Day Change", align: "text-right" },
    { key: "totalReturn", label: "Total P&L", align: "text-right" },
    { key: "sector", label: "Sector", align: "text-center" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-1 bg-indigo-600 rounded-full" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Stock Holdings
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-4">
            NSE Portfolio \ Live Market Data \ {holdings.length} Positions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
              Total Invested
            </p>
            <p className="text-lg md:text-xl font-bold text-gray-800">
              {formatINR(summary.totalInvested)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
              Current Value
            </p>
            <p className="text-lg md:text-xl font-bold text-gray-800">
              {formatINR(summary.totalCurrent)}
            </p>
          </div>
          <div
            className={`rounded-xl p-4 shadow-sm border ${
              summary.totalPnL >= 0
                ? "bg-emerald-50 border-emerald-100"
                : "bg-red-50 border-red-100"
            }`}
          >
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
              Total P&L
            </p>
            <p
              className={`text-lg md:text-xl font-bold ${
                summary.totalPnL >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {summary.totalPnL >= 0 ? "+" : ""}
              {formatINR(summary.totalPnL)}
            </p>
            <p
              className={`text-xs font-medium ${
                summary.totalPnL >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {summary.totalPnLPercent >= 0 ? "+" : ""}
              {summary.totalPnLPercent.toFixed(2)}%
            </p>
          </div>
          <div
            className={`rounded-xl p-4 shadow-sm border ${
              summary.totalDayChange >= 0
                ? "bg-blue-50 border-blue-100"
                : "bg-orange-50 border-orange-100"
            }`}
          >
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
              Day&apos;s Change
            </p>
            <p
              className={`text-lg md:text-xl font-bold ${
                summary.totalDayChange >= 0 ? "text-blue-600" : "text-orange-600"
              }`}
            >
              {summary.totalDayChange >= 0 ? "+" : ""}
              {formatINR(summary.totalDayChange)}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider cursor-pointer select-none hover:bg-indigo-500 transition-colors duration-150 ${
                        col.align
                      }`}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {col.label}
                        <SortIcon
                          direction={sortKey === col.key ? sortDir : null}
                        />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.map((holding, index) => {
                  const invested = holding.avgPrice * holding.quantity;
                  const current = holding.currentPrice * holding.quantity;
                  const isProfitDay = holding.dayChange >= 0;
                  const isProfitTotal = holding.totalReturn >= 0;
                  const isEven = index % 2 === 0;

                  return (
                    <tr
                      key={holding.symbol}
                      className={`group transition-colors duration-100 hover:bg-indigo-50 border-b border-gray-100 ${
                        isEven ? "bg-white" : "bg-amber-50/30"
                      }`}
                    >
                      {/* Symbol */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-indigo-700">
                              {holding.symbol.substring(0, 2)}
                            </span>
                          </div>
                          <span className="font-bold text-sm text-indigo-700 tracking-wide">
                            {holding.symbol}
                          </span>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-700 font-medium line-clamp-1">
                          {holding.name}
                        </span>
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-semibold text-gray-800">
                          {holding.quantity.toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Avg Price */}
                      <td className="px-4 py-3.5 text-right">
                        <div>
                          <span className="text-sm font-semibold text-gray-700">
                            {formatPrice(holding.avgPrice)}
                          </span>
                          <p className="text-xs text-gray-400">
                            {formatINR(invested)}
                          </p>
                        </div>
                      </td>

                      {/* Current Price */}
                      <td className="px-4 py-3.5 text-right">
                        <div>
                          <span className="text-sm font-bold text-gray-900">
                            {formatPrice(holding.currentPrice)}
                          </span>
                          <p className="text-xs text-gray-400">
                            {formatINR(current)}
                          </p>
                        </div>
                      </td>

                      {/* Day Change */}
                      <td className="px-4 py-3.5 text-right">
                        <div
                          className={`inline-flex flex-col items-end px-2 py-0.5 rounded-md ${
                            isProfitDay
                              ? "bg-emerald-50"
                              : "bg-red-50"
                          }`}
                        >
                          <span
                            className={`text-sm font-bold ${
                              isProfitDay ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {isProfitDay ? "+" : ""}
                            {formatPrice(holding.dayChange)}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              isProfitDay ? "text-emerald-500" : "text-red-500"
                            }`}
                          >
                            {isProfitDay ? "+" : ""}
                            {holding.dayChangePercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>

                      {/* Total P&L */}
                      <td className="px-4 py-3.5 text-right">
                        <div
                          className={`inline-flex flex-col items-end px-2 py-0.5 rounded-md ${
                            isProfitTotal ? "bg-emerald-50" : "bg-red-50"
                          }`}
                        >
                          <span
                            className={`text-sm font-bold ${
                              isProfitTotal
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {isProfitTotal ? "+" : ""}
                            {formatINR(holding.totalReturn)}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              isProfitTotal
                                ? "text-emerald-500"
                                : "text-red-500"
                            }`}
                          >
                            {isProfitTotal ? "+" : ""}
                            {holding.totalReturnPercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>

                      {/* Sector */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            sectorColors[holding.sector] ??
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {holding.sector}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary Footer */}
              <tfoot>
                <tr className="bg-gradient-to-r from-gray-800 to-gray-900">
                  <td
                    colSpan={3}
                    className="px-4 py-4 text-sm font-bold text-white"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-indigo-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Portfolio Summary ({holdings.length} stocks)
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        Invested
                      </p>
                      <p className="text-sm font-bold text-white">
                        {formatINR(summary.totalInvested)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        Current
                      </p>
                      <p className="text-sm font-bold text-white">
                        {formatINR(summary.totalCurrent)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        Day Change
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          summary.totalDayChange >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {summary.totalDayChange >= 0 ? "+" : ""}
                        {formatINR(summary.totalDayChange)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        Total P&L
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          summary.totalPnL >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {summary.totalPnL >= 0 ? "+" : ""}
                        {formatINR(summary.totalPnL)}
                      </p>
                      <p
                        className={`text-xs ${
                          summary.totalPnL >= 0
                            ? "text-emerald-500"
                            : "text-red-500"
                        }`}
                      >
                        {summary.totalPnLPercent >= 0 ? "+" : ""}
                        {summary.totalPnLPercent.toFixed(2)}%
                      </p>
                    </div>
                  </td>
                  <td colSpan={2} className="px-4 py-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Click column headers to sort. All prices in INR (\u20B9). Data for
            illustrative purposes only. Not financial advice.
          </span>
        </div>
      </div>
    </div>
  );
}

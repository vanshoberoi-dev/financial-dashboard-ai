"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";

interface DataPoint {
  month: string;
  value: number;
}

interface PortfolioChartProps {
  data?: DataPoint[];
}

const defaultData: DataPoint[] = [
  { month: "Jan", value: 1520000 },
  { month: "Feb", value: 1635000 },
  { month: "Mar", value: 1580000 },
  { month: "Apr", value: 1742000 },
  { month: "May", value: 1891000 },
  { month: "Jun", value: 2184000 },
];

const formatINR = (value: number): string => {
  const lakhs = value / 100000;
  return `\u20B9${lakhs.toFixed(2)}L`;
};

const formatYAxis = (value: number): string => {
  const lakhs = value / 100000;
  return `${lakhs.toFixed(0)}L`;
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const value = payload[0].value as number;
    const change =
      payload[0].payload && defaultData.length > 1
        ? null
        : null;
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-xl px-4 py-3 min-w-[140px]">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
          {label}
        </p>
        <p className="text-lg font-bold text-gray-800">{formatINR(value)}</p>
        <p className="text-xs text-green-600 font-medium mt-0.5">
          Portfolio Value
        </p>
      </div>
    );
  }
  return null;
};

const PortfolioChart: React.FC<PortfolioChartProps> = ({ data = defaultData }) => {
  const minValue = Math.min(...data.map((d) => d.value));
  const maxValue = Math.max(...data.map((d) => d.value));
  const yDomain = [
    Math.floor((minValue * 0.97) / 100000) * 100000,
    Math.ceil((maxValue * 1.03) / 100000) * 100000,
  ];

  const totalGrowth = (
    ((data[data.length - 1].value - data[0].value) / data[0].value) *
    100
  ).toFixed(2);

  const isPositive = parseFloat(totalGrowth) >= 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">
            Portfolio Performance
          </h2>
          <p className="text-sm text-gray-400 mt-1">Jan &ndash; Jun 2024</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-extrabold text-gray-800">
            {formatINR(data[data.length - 1].value)}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-sm font-semibold mt-1 px-2 py-0.5 rounded-full ${
              isPositive
                ? "text-green-700 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}
          >
            <span>{isPositive ? "\u25B2" : "\u25BC"}</span>
            {Math.abs(parseFloat(totalGrowth))}% overall
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="#F1F5F9"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "#94A3B8", fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: "#94A3B8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={yDomain}
              width={40}
              dx={-4}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "#16A34A",
                strokeWidth: 1.5,
                strokeDasharray: "5 5",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#16A34A"
              strokeWidth={2.5}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#16A34A",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
        <div className="text-center">
          <p className="text-xs text-gray-400 font-medium">Starting Value</p>
          <p className="text-sm font-bold text-gray-700 mt-0.5">
            {formatINR(data[0].value)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 font-medium">Highest</p>
          <p className="text-sm font-bold text-green-600 mt-0.5">
            {formatINR(maxValue)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 font-medium">Net Gain</p>
          <p
            className={`text-sm font-bold mt-0.5 ${
              isPositive ? "text-green-600" : "text-red-500"
            }`}
          >
            {isPositive ? "+" : ""}
            {formatINR(
              data[data.length - 1].value - data[0].value
            )}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 font-medium">Current</p>
          <p className="text-sm font-bold text-gray-700 mt-0.5">
            {formatINR(data[data.length - 1].value)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortfolioChart;

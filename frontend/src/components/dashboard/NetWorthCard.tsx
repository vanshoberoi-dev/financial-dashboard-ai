"use client";

import React from "react";

interface NetWorthCardProps {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
}

function formatINR(value: number): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  return `â¹${formatted}`;
}

function formatINRWithDecimals(value: number): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return `â¹${formatted}`;
}

const SparklineIndicator: React.FC<{ isPositive: boolean }> = ({ isPositive }) => {
  const points = isPositive
    ? [40, 35, 38, 30, 28, 32, 25, 20, 22, 15, 10, 5]
    : [10, 15, 12, 18, 20, 16, 22, 25, 20, 28, 32, 38];

  const width = 120;
  const height = 48;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const svgPoints = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height * 0.8 - height * 0.1;
      return `${x},${y}`;
    })
    .join(" ");

  const fillPoints = `0,${height} ${svgPoints} ${width},${height}`;

  const color = isPositive ? "#22c55e" : "#ef4444";
  const fillColor = isPositive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient
          id={`sparkGrad-${isPositive ? "pos" : "neg"}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill={`url(#sparkGrad-${isPositive ? "pos" : "neg"})`}
      />
      <polyline
        points={svgPoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points.length > 0 ? width : 0}
        cy={(() => {
          const lastPoint = points[points.length - 1];
          return height - ((lastPoint - min) / range) * height * 0.8 - height * 0.1;
        })()}
        r="3"
        fill={color}
      />
    </svg>
  );
};

const UpArrowIcon: React.FC = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const DownArrowIcon: React.FC = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const NetWorthCard: React.FC<NetWorthCardProps> = ({
  totalValue,
  dayChange,
  dayChangePercent,
}) => {
  const isPositive = dayChange >= 0;

  return (
    <div
      className="
        relative
        bg-white
        rounded-2xl
        shadow-[0_4px_24px_rgba(0,0,0,0.08)]
        border border-gray-100
        p-6
        w-full
        max-w-sm
        overflow-hidden
        transition-shadow
        duration-300
        hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]
      "
    >
      {/* Background decoration */}
      <div
        className={`
          absolute
          top-0
          right-0
          w-48
          h-48
          rounded-full
          opacity-5
          -translate-y-16
          translate-x-16
          ${
            isPositive
              ? "bg-green-500"
              : "bg-red-500"
          }
        `}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className={`
              w-2
              h-2
              rounded-full
              animate-pulse
              ${
                isPositive ? "bg-green-500" : "bg-red-500"
              }
            `}
          />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">
            Total Net Worth
          </span>
        </div>
        <span className="text-xs text-gray-400 font-medium">Today</span>
      </div>

      {/* Main Value */}
      <div className="mt-3 mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900 tracking-tight leading-none">
            {formatINR(totalValue)}
          </span>
        </div>

        {/* Subtle sub-label */}
        <p className="text-xs text-gray-400 mt-1 font-medium">
          Portfolio valuation as of today
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100 mb-4" />

      {/* Day Change Row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            Day&apos;s Change
          </span>

          <div className="flex items-center gap-2">
            {/* Arrow + amount */}
            <div
              className={`
                flex
                items-center
                gap-1
                ${
                  isPositive
                    ? "text-green-600"
                    : "text-red-500"
                }
              `}
            >
              {isPositive ? <UpArrowIcon /> : <DownArrowIcon />}
              <span className="text-base font-semibold">
                {isPositive ? "+" : "-"}
                {formatINRWithDecimals(dayChange)}
              </span>
            </div>

            {/* Percentage badge */}
            <span
              className={`
                inline-flex
                items-center
                px-2
                py-0.5
                rounded-full
                text-xs
                font-semibold
                ${
                  isPositive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }
              `}
            >
              {isPositive ? "+" : ""}
              {dayChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="flex-shrink-0">
          <SparklineIndicator isPositive={isPositive} />
        </div>
      </div>

      {/* Bottom gradient accent line */}
      <div
        className={`
          absolute
          bottom-0
          left-0
          right-0
          h-1
          rounded-b-2xl
          ${
            isPositive
              ? "bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400"
              : "bg-gradient-to-r from-red-400 via-rose-500 to-pink-400"
          }
        `}
      />
    </div>
  );
};

export default NetWorthCard;

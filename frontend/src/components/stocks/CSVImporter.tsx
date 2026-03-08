"use client";

import React, { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";

interface ParsedHolding {
  symbol: string;
  companyName: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currentValue: number;
  investedValue: number;
  pnl: number;
  pnlPercent: number;
}

interface ValidationError {
  row: number;
  message: string;
}

type ImportStatus = "idle" | "parsing" | "preview" | "importing" | "success" | "error";

const REQUIRED_COLUMNS = ["Symbol", "Company Name", "Quantity", "Average Price", "Current Price"];

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const FileIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
  </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function CSVImporter() {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedHolding[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStatus("idle");
    setIsDragOver(false);
    setFileName(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportProgress(0);
    setImportMessage("");
    setImportedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateAndParseCSV = (content: string, name: string) => {
    setStatus("parsing");
    setFileName(name);
    const errors: ValidationError[] = [];

    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setValidationErrors([{ row: 0, message: "CSV file is empty or has no data rows." }]);
      setStatus("preview");
      return;
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.trim());
    const missingCols = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    if (missingCols.length > 0) {
      setValidationErrors([
        {
          row: 0,
          message: `Missing required columns: ${missingCols.join(", ")}. Found: ${headers.join(", ")}`,
        },
      ]);
      setStatus("preview");
      return;
    }

    const idxSymbol = headers.indexOf("Symbol");
    const idxCompany = headers.indexOf("Company Name");
    const idxQty = headers.indexOf("Quantity");
    const idxAvg = headers.indexOf("Average Price");
    const idxCurrent = headers.indexOf("Current Price");

    const holdings: ParsedHolding[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < headers.length && cols.every((c) => c === "")) continue;

      const symbol = cols[idxSymbol]?.trim() || "";
      const companyName = cols[idxCompany]?.trim() || "";
      const qtyRaw = cols[idxQty]?.trim() || "";
      const avgRaw = cols[idxAvg]?.trim().replace(/,/g, "") || "";
      const currentRaw = cols[idxCurrent]?.trim().replace(/,/g, "") || "";

      if (!symbol) {
        errors.push({ row: i, message: `Row ${i}: Symbol is empty.` });
        continue;
      }

      const quantity = parseFloat(qtyRaw);
      const averagePrice = parseFloat(avgRaw);
      const currentPrice = parseFloat(currentRaw);

      if (isNaN(quantity) || quantity <= 0) {
        errors.push({ row: i, message: `Row ${i} (${symbol}): Invalid quantity "${qtyRaw}".` });
        continue;
      }
      if (isNaN(averagePrice) || averagePrice < 0) {
        errors.push({ row: i, message: `Row ${i} (${symbol}): Invalid average price "${avgRaw}".` });
        continue;
      }
      if (isNaN(currentPrice) || currentPrice < 0) {
        errors.push({ row: i, message: `Row ${i} (${symbol}): Invalid current price "${currentRaw}".` });
        continue;
      }

      const investedValue = quantity * averagePrice;
      const currentValue = quantity * currentPrice;
      const pnl = currentValue - investedValue;
      const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

      holdings.push({
        symbol,
        companyName,
        quantity,
        averagePrice,
        currentPrice,
        currentValue,
        investedValue,
        pnl,
        pnlPercent,
      });
    }

    setValidationErrors(errors);
    setParsedData(holdings);
    setStatus("preview");
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setValidationErrors([{ row: 0, message: "Please upload a valid .csv file." }]);
      setStatus("preview");
      setFileName(file.name);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      validateAndParseCSV(content, file.name);
    };
    reader.onerror = () => {
      setValidationErrors([{ row: 0, message: "Failed to read file. Please try again." }]);
      setStatus("preview");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setStatus("importing");
    setImportProgress(0);
    setImportMessage("");

    const simulateProgress = () => {
      let progress = 0;
      return new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          progress += Math.random() * 15 + 5;
          if (progress >= 90) {
            progress = 90;
            clearInterval(interval);
            resolve();
          }
          setImportProgress(Math.min(progress, 90));
        }, 150);
      });
    };

    await simulateProgress();

    try {
      const response = await fetch("/api/stocks/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: parsedData }),
      });

      setImportProgress(100);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      setImportedCount(result.imported ?? parsedData.length);
      setImportMessage(result.message || `Successfully imported ${parsedData.length} holdings.`);
      setStatus("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setImportMessage(message);
      setStatus("error");
      setImportProgress(0);
    }
  };

  const totalInvested = parsedData.reduce((sum, h) => sum + h.investedValue, 0);
  const totalCurrent = parsedData.reduce((sum, h) => sum + h.currentValue, 0);
  const totalPnL = totalCurrent - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <FileIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Import Stock Holdings</h1>
              <p className="text-slate-400 text-sm">Import your portfolio from Groww CSV export</p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-emerald-500/30 via-slate-600 to-transparent mt-4" />
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">

          {/* Step Indicator */}
          <div className="px-6 pt-6">
            <div className="flex items-center gap-2 mb-6">
              {[{ label: "Upload", step: 1 }, { label: "Preview", step: 2 }, { label: "Import", step: 3 }].map(({ label, step }, idx) => {
                const isActive =
                  (step === 1 && (status === "idle" || status === "parsing")) ||
                  (step === 2 && (status === "preview")) ||
                  (step === 3 && (status === "importing" || status === "success" || status === "error"));
                const isCompleted =
                  (step === 1 && status !== "idle" && status !== "parsing") ||
                  (step === 2 && (status === "importing" || status === "success" || status === "error"));
                return (
                  <React.Fragment key={step}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          isCompleted
                            ? "bg-emerald-500 text-white"
                            : isActive
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                            : "bg-slate-700 text-slate-500"
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          step
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          isActive ? "text-emerald-400" : isCompleted ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {idx < 2 && (
                      <div className={`flex-1 h-px max-w-16 ${
                        isCompleted ? "bg-emerald-500" : "bg-slate-700"
                      } transition-all duration-300`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="px-6 pb-6 space-y-6">

            {/* Dropzone - shown when idle or can re-upload */}
            {(status === "idle" || status === "parsing") && (
              <div>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 p-12 flex flex-col items-center justify-center gap-4 group ${
                    isDragOver
                      ? "border-emerald-400 bg-emerald-500/10 scale-[1.01]"
                      : "border-slate-600 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-700/50"
                  }`}
                >
                  {/* Animated background on drag */}
                  {isDragOver && (
                    <div className="absolute inset-0 rounded-xl bg-emerald-500/5 animate-pulse" />
                  )}

                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isDragOver
                        ? "bg-emerald-500/20 text-emerald-400 scale-110"
                        : "bg-slate-700 text-slate-400 group-hover:bg-slate-600 group-hover:text-slate-300"
                    }`}
                  >
                    <UploadIcon className="w-8 h-8" />
                  </div>

                  <div className="text-center">
                    <p
                      className={`text-lg font-semibold mb-1 transition-colors ${
                        isDragOver ? "text-emerald-300" : "text-slate-200"
                      }`}
                    >
                      {isDragOver ? "Drop your CSV file here" : "Drag & drop your CSV file"}
                    </p>
                    <p className="text-slate-400 text-sm mb-3">
                      or click to browse from your device
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700 border border-slate-600">
                      <FileIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs text-slate-400">.csv files only</span>
                    </div>
                  </div>

                  <div className="w-full max-w-sm bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
                    <p className="text-xs text-slate-400 font-medium mb-2 text-center">Expected Groww CSV columns:</p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {REQUIRED_COLUMNS.map((col) => (
                        <span key={col} className="px-2 py-0.5 rounded bg-slate-600 text-slate-300 text-xs">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>

                  {status === "parsing" && (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.3" />
                        <path d="M21 12a9 9 0 00-9-9" />
                      </svg>
                      <span className="text-sm">Parsing file...</span>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInput}
                />

                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="mt-3 w-full py-2.5 rounded-xl border border-slate-600 bg-slate-700/50 text-slate-300 text-sm font-medium hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <FileIcon className="w-4 h-4" />
                  Browse Files
                </button>
              </div>
            )}

            {/* Preview Section */}
            {status === "preview" && (
              <div className="space-y-4">
                {/* File info bar */}
                <div className="flex items-center justify-between bg-slate-700/50 rounded-xl p-3 border border-slate-600/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <FileIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{fileName}</p>
                      <p className="text-xs text-slate-400">{parsedData.length} valid rows Â· {validationErrors.length} errors</p>
                    </div>
                  </div>
                  <button
                    onClick={resetState}
                    className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Upload different file"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircleIcon className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-semibold text-red-300">
                        {validationErrors.length} Validation {validationErrors.length === 1 ? "Error" : "Errors"}
                      </span>
                    </div>
                    <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                      {validationErrors.map((err, i) => (
                        <li key={i} className="text-xs text-red-300/80 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">â¢</span>
                          {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsedData.length > 0 && (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600/50">
                        <p className="text-xs text-slate-400 mb-1">Holdings</p>
                        <p className="text-xl font-bold text-white">{formatNumber(parsedData.length)}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600/50">
                        <p className="text-xs text-slate-400 mb-1">Invested</p>
                        <p className="text-base font-bold text-white truncate">{formatINR(totalInvested)}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600/50">
                        <p className="text-xs text-slate-400 mb-1">Current Value</p>
                        <p className="text-base font-bold text-white truncate">{formatINR(totalCurrent)}</p>
                      </div>
                      <div className={`rounded-xl p-3 border ${
                        totalPnL >= 0
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-red-500/10 border-red-500/30"
                      }`}>
                        <p className="text-xs text-slate-400 mb-1">Total P&L</p>
                        <p className={`text-base font-bold truncate ${
                          totalPnL >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {totalPnL >= 0 ? "+" : ""}{formatINR(totalPnL)}
                        </p>
                        <p className={`text-xs ${
                          totalPnL >= 0 ? "text-emerald-500" : "text-red-500"
                        }`}>
                          {totalPnLPercent >= 0 ? "+" : ""}{totalPnLPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                      <div className="bg-slate-700/70 px-4 py-2.5 border-b border-slate-700/50">
                        <h3 className="text-sm font-semibold text-slate-200">Preview â {parsedData.length} Holdings</h3>
                      </div>
                      <div className="overflow-x-auto max-h-72 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-800/90 backdrop-blur-sm">
                              {["Symbol", "Company", "Qty", "Avg Price", "Curr Price", "Invested", "Curr Value", "P&L"].map((h) => (
                                <th
                                  key={h}
                                  className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap border-b border-slate-700/50"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/30">
                            {parsedData.map((holding, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-slate-700/30 transition-colors"
                              >
                                <td className="px-3 py-2.5">
                                  <span className="font-semibold text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded">
                                    {holding.symbol}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="text-slate-300 text-xs max-w-[120px] block truncate" title={holding.companyName}>
                                    {holding.companyName}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-slate-300 text-xs">
                                  {formatNumber(holding.quantity)}
                                </td>
                                <td className="px-3 py-2.5 text-slate-300 text-xs">
                                  â¹{holding.averagePrice.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-slate-300 text-xs">
                                  â¹{holding.currentPrice.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-slate-400 text-xs">
                                  {formatINR(holding.investedValue)}
                                </td>
                                <td className="px-3 py-2.5 text-slate-300 text-xs">
                                  {formatINR(holding.currentValue)}
                                </td>
                                <td className="px-3 py-2.5 text-xs">
                                  <div>
                                    <span className={holding.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                                      {holding.pnl >= 0 ? "+" : ""}{formatINR(holding.pnl)}
                                    </span>
                                    <span className={`block text-xs ${
                                      holding.pnl >= 0 ? "text-emerald-500/70" : "text-red-500/70"
                                    }`}>
                                      {holding.pnlPercent >= 0 ? "+" : ""}{holding.pnlPercent.toFixed(2)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={resetState}
                    className="flex-1 py-2.5 rounded-xl border border-slate-600 bg-slate-700/50 text-slate-300 text-sm font-medium hover:bg-slate-700 hover:text-white transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={parsedData.length === 0}
                    className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="16 16 12 12 8 16" />
                      <line x1="12" y1="12" x2="12" y2="21" />
                      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
                    </svg>
                    Import {parsedData.length} Holdings to Portfolio
                  </button>
                </div>
              </div>
            )}

            {/* Importing Section */}
            {status === "importing" && (
              <div className="space-y-6 py-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-emerald-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.3" />
                      <path d="M21 12a9 9 0 00-9-9" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Importing Holdings</h3>
                  <p className="text-slate-400 text-sm">Uploading {parsedData.length} stocks to your portfolio...</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Uploading to server...</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 relative overflow-hidden"
                      style={{ width: `${importProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    Please do not close this page
                  </p>
                </div>
              </div>
            )}

            {/* Success Section */}
            {status === "success" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-300 mb-2">Import Successful!</h3>
                  <p className="text-slate-300 text-sm mb-1">{importMessage}</p>
                  <p className="text-slate-400 text-xs">
                    {importedCount} holdings added to your portfolio
                  </p>

                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Imported</p>
                      <p className="text-lg font-bold text-emerald-400">{importedCount}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Invested</p>
                      <p className="text-sm font-bold text-white">{formatINR(totalInvested)}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">P&L</p>
                      <p className={`text-sm font-bold ${
                        totalPnL >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {totalPnL >= 0 ? "+" : ""}{formatINR(totalPnL)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 w-full" />
                </div>

                <button
                  onClick={resetState}
                  className="w-full py-2.5 rounded-xl border border-slate-600 bg-slate-700/50 text-slate-300 text-sm font-medium hover:bg-slate-700 hover:text-white transition-all duration-200"
                >
                  Import Another File
                </button>
              </div>
            )}

            {/* Error Section */}
            {status === "error" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-4">
                    <AlertCircleIcon className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-red-300 mb-2">Import Failed</h3>
                  <p className="text-slate-300 text-sm">{importMessage}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={resetState}
                    className="flex-1 py-2.5 rounded-xl border border-slate-600 bg-slate-700/50 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-all"
                  >
                    Upload New File
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold hover:from-red-400 hover:to-red-500 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                    </svg>
                    Retry Import
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-1">How to export from Groww?</h4>
              <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                <li>Open Groww app or website â Go to Portfolio</li>
                <li>Click on "Stocks" tab â Tap the â® menu</li>
                <li>Select "Download Portfolio" â Choose CSV format</li>
                <li>Your file will have columns: Symbol, Company Name, Quantity, Average Price, Current Price</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Your data is processed securely Â· NSE/BSE symbols supported Â· All values in INR â¹
        </p>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}

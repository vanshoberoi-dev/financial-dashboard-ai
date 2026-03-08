"use client";

import React, { useState, useRef, useEffect } from "react";

type Step = 1 | 2 | 3;

interface Toast {
  message: string;
  type: "success" | "error" | "info";
}

interface HoldingFund {
  scheme: string;
  folio: string;
  units: number;
  nav: number;
  value: number;
}

interface ImportStatus {
  totalFunds: number;
  totalValue: number;
  funds: HoldingFund[];
}

const formatINR = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatIndianNumber = (num: number): string => {
  return new Intl.NumberFormat("en-IN").format(num);
};

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MFCentralConnect() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [pan, setPan] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(["" ,"", "", "", "", ""]);
  const [panError, setPanError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [requestId, setRequestId] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: Toast["type"]) => {
    setToast({ message, type });
  };

  const validatePan = (value: string): boolean => {
    if (!value) {
      setPanError("PAN is required");
      return false;
    }
    if (!PAN_REGEX.test(value)) {
      setPanError("Invalid PAN format (e.g. ABCDE1234F)");
      return false;
    }
    setPanError("");
    return true;
  };

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError("Email is required");
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError("Invalid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setPan(val);
    if (panError) validatePan(val);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailError) validateEmail(val);
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isPanValid = validatePan(pan);
    const isEmailValid = validateEmail(email);
    if (!isPanValid || !isEmailValid) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/mf/central/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pan, email, action: "send" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setRequestId(data.requestId || "");
      showToast("OTP sent successfully to your registered email", "success");
      setCurrentStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP. Please try again.";
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    const lastFilled = Math.min(pasted.length, 5);
    otpRefs.current[lastFilled]?.focus();
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length < 6) {
      showToast("Please enter all 6 digits of the OTP", "error");
      return;
    }

    setIsLoading(true);
    try {
      const verifyRes = await fetch("/api/mf/central/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pan, email, otp: otpValue, requestId, action: "verify" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.message || "OTP verification failed");

      showToast("OTP verified! Fetching your holdingsâ¦", "info");

      const holdingsRes = await fetch(`/api/mf/holdings?pan=${encodeURIComponent(pan)}&email=${encodeURIComponent(email)}`);
      const holdingsData = await holdingsRes.json();
      if (!holdingsRes.ok) throw new Error(holdingsData.message || "Failed to fetch holdings");

      const funds: HoldingFund[] = (holdingsData.funds || []).map((f: HoldingFund) => ({
        scheme: f.scheme,
        folio: f.folio,
        units: f.units,
        nav: f.nav,
        value: f.value,
      }));

      const totalValue = funds.reduce((sum, f) => sum + f.value, 0);

      setImportStatus({
        totalFunds: funds.length,
        totalValue,
        funds,
      });

      setCurrentStep(3);
      showToast("Holdings imported successfully!", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed. Please try again.";
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/mf/central/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pan, email, action: "send" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to resend OTP");
      setRequestId(data.requestId || "");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      showToast("OTP resent to your email", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend OTP.";
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPan("");
    setEmail("");
    setOtp(["", "", "", "", "", ""]);
    setPanError("");
    setEmailError("");
    setImportStatus(null);
    setRequestId("");
    setCurrentStep(1);
  };

  const steps = [
    { id: 1, label: "Identity" },
    { id: 2, label: "Verify OTP" },
    { id: 3, label: "Import Status" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-white text-sm font-medium max-w-sm animate-fade-in transition-all ${
            toast.type === "success"
              ? "bg-green-600"
              : toast.type === "error"
              ? "bg-red-500"
              : "bg-blue-500"
          }`}
        >
          <span className="text-lg">
            {toast.type === "success" ? "â" : toast.type === "error" ? "â" : "â¹"}
          </span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-white/80 hover:text-white transition-colors"
          >
            â
          </button>
        </div>
      )}

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MF Central Connect</h1>
          <p className="text-gray-500 text-sm mt-1">Fetch your Consolidated Account Statement</p>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-amber-800 text-sm font-semibold">What is MF Central CAS?</p>
            <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
              MF Central CAS (Consolidated Account Statement) is an official statement from AMFI that consolidates all your mutual fund holdings across all AMCs, folios, and registrars into a single comprehensive report.
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    currentStep > step.id
                      ? "bg-green-600 text-white shadow-md"
                      : currentStep === step.id
                      ? "bg-green-600 text-white shadow-lg ring-4 ring-green-100"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {currentStep > step.id ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium transition-colors ${
                    currentStep >= step.id ? "text-green-700" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 mx-3 mb-5">
                  <div className="h-0.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: currentStep > step.id ? "100%" : "0%" }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Step 1: PAN + Email */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">Enter Your Details</h2>
                <p className="text-gray-500 text-sm mt-1">We'll send an OTP to your registered email with MF Central</p>
              </div>

              {/* PAN Field */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  PAN Number
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={pan}
                    onChange={handlePanChange}
                    onBlur={() => validatePan(pan)}
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    className={`w-full px-4 py-3 rounded-xl border-2 text-gray-900 font-mono tracking-widest text-sm uppercase placeholder:normal-case placeholder:tracking-normal outline-none transition-all ${
                      panError
                        ? "border-red-400 focus:border-red-500 bg-red-50"
                        : "border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-50 bg-white"
                    }`}
                  />
                  {pan && PAN_REGEX.test(pan) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {panError && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {panError}
                  </p>
                )}
                <p className="text-gray-400 text-xs mt-1">Format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)</p>
              </div>

              {/* Email Field */}
              <div className="mb-7">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Registered Email
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => validateEmail(email)}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-3 rounded-xl border-2 text-gray-900 text-sm outline-none transition-all ${
                      emailError
                        ? "border-red-400 focus:border-red-500 bg-red-50"
                        : "border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-50 bg-white"
                    }`}
                  />
                  {email && EMAIL_REGEX.test(email) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {emailError && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {emailError}
                  </p>
                )}
                <p className="text-gray-400 text-xs mt-1">Must match your email registered with MF Central</p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:shadow-green-300"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending OTPâ¦
                  </>
                ) : (
                  <>
                    Send OTP
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>

              <div className="mt-4 flex items-start gap-2 bg-green-50 rounded-xl p-3">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-green-700 text-xs">Your data is securely fetched directly from MF Central. We do not store your PAN or email.</p>
              </div>
            </form>
          )}

          {/* Step 2: OTP */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">Verify OTP</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Enter the 6-digit OTP sent to{" "}
                  <span className="font-semibold text-gray-700">{email}</span>
                </p>
              </div>

              {/* OTP Boxes */}
              <div className="flex gap-3 justify-center mb-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all ${
                      digit
                        ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                        : "border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-50 bg-white text-gray-900"
                    }`}
                  />
                ))}
              </div>
              <p className="text-center text-gray-400 text-xs mb-7">You can also paste the OTP directly</p>

              <button
                type="submit"
                disabled={isLoading || otp.join("").length < 6}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:shadow-green-300"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying & Importingâ¦
                  </>
                ) : (
                  <>
                    Verify & Import Holdings
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </>
                )}
              </button>

              <div className="mt-5 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-green-600 hover:text-green-700 text-sm font-medium disabled:text-gray-400 transition-colors"
                >
                  Didn't receive OTP? Resend
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-gray-400 hover:text-gray-600 text-sm transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Change PAN / Email
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Import Status */}
          {currentStep === 3 && importStatus && (
            <div className="p-8">
              {/* Success Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Import Successful!</h2>
                <p className="text-gray-500 text-sm mt-1">Your MF Central CAS has been imported</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                  <p className="text-green-600 text-xs font-semibold uppercase tracking-wide mb-1">Total Funds</p>
                  <p className="text-2xl font-bold text-green-700">{formatIndianNumber(importStatus.totalFunds)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                  <p className="text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-1">Portfolio Value</p>
                  <p className="text-lg font-bold text-emerald-700 leading-tight">{formatINR(importStatus.totalValue)}</p>
                </div>
              </div>

              {/* Holdings List */}
              {importStatus.funds.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Imported Holdings</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {importStatus.funds.map((fund, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm font-semibold leading-tight truncate">{fund.scheme}</p>
                          <p className="text-gray-400 text-xs mt-0.5">Folio: {fund.folio}</p>
                          <p className="text-gray-500 text-xs">
                            {fund.units.toFixed(3)} units @ {formatINR(fund.nav)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-gray-900 text-sm font-bold">{formatINR(fund.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PAN Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">Fetched for PAN</p>
                  <p className="text-gray-900 font-mono font-bold tracking-wider">{pan}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs">Email</p>
                  <p className="text-gray-700 text-sm font-medium">{email}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 bg-white border-2 border-green-600 text-green-600 hover:bg-green-50 font-semibold py-3 rounded-full transition-all duration-200 text-sm"
                >
                  Fetch Again
                </button>
                <button
                  type="button"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-full transition-all duration-200 text-sm shadow-lg shadow-green-200"
                >
                  View Portfolio
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-xs">
            Powered by{" "}
            <span className="font-semibold text-green-600">MF Central</span>{" "}Â· AMFI Registered
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, TrendingUp, Shield, IndianRupee, Sparkles, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface UserProfile {
  incomeRange: string;
  riskAppetite: string;
  ageGroup: string;
  portfolioValue: string;
  equityAllocation: number;
  debtAllocation: number;
  goldAllocation: number;
  cashAllocation: number;
}

const userProfile: UserProfile = {
  incomeRange: "â¹15L â â¹25L / year",
  riskAppetite: "Moderate",
  ageGroup: "30 â 35 years",
  portfolioValue: "â¹28,45,000",
  equityAllocation: 55,
  debtAllocation: 25,
  goldAllocation: 10,
  cashAllocation: 10,
};

const quickPrompts = [
  "How should I rebalance my portfolio?",
  "Best tax-saving instruments for FY 2024-25?",
  "Should I invest in index funds or mutual funds?",
  "How much emergency fund should I maintain?",
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2 px-1">
      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

function AllocationBar({ equity, debt, gold, cash }: { equity: number; debt: number; gold: number; cash: number }) {
  return (
    <div className="space-y-2">
      <div className="flex rounded-full overflow-hidden h-3">
        <div style={{ width: `${equity}%` }} className="bg-violet-500" />
        <div style={{ width: `${debt}%` }} className="bg-blue-400" />
        <div style={{ width: `${gold}%` }} className="bg-amber-400" />
        <div style={{ width: `${cash}%` }} className="bg-emerald-400" />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {[
          { label: "Equity", value: equity, color: "bg-violet-500" },
          { label: "Debt", value: debt, color: "bg-blue-400" },
          { label: "Gold", value: gold, color: "bg-amber-400" },
          { label: "Cash", value: cash, color: "bg-emerald-400" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-sm ${item.color} flex-shrink-0`} />
            <span className="text-xs text-slate-400">{item.label}</span>
            <span className="text-xs text-slate-200 ml-auto font-medium">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} group`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
        isUser
          ? "bg-gradient-to-br from-violet-500 to-purple-600"
          : "bg-gradient-to-br from-indigo-500 to-violet-600"
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md ${
          isUser
            ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm"
            : "bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 text-slate-100 rounded-tl-sm"
        }`}>
          {message.isLoading ? (
            <TypingIndicator />
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>
        {!message.isLoading && (
          <span className={`text-xs text-slate-500 px-1 ${isUser ? "text-right" : "text-left"}`}>
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Namaste! ð I'm your AI Financial Advisor powered by Gemini 2.0 Flash. I have access to your profile â moderate risk appetite, age 30â35, annual income â¹15â25L, and a portfolio of â¹28.45L.\n\nHow can I help you with your financial journey today? Feel free to ask about investments, tax planning, portfolio rebalancing, or any other financial queries.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [statsExpanded, setStatsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildSystemContext = () => {
    return `You are an expert AI Financial Advisor for Indian investors. You have the following context about the user:
- Age Group: ${userProfile.ageGroup}
- Annual Income: ${userProfile.incomeRange}
- Risk Appetite: ${userProfile.riskAppetite}
- Current Portfolio Value: ${userProfile.portfolioValue}
- Asset Allocation: Equity ${userProfile.equityAllocation}%, Debt ${userProfile.debtAllocation}%, Gold ${userProfile.goldAllocation}%, Cash ${userProfile.cashAllocation}%

Provide personalized, actionable financial advice relevant to Indian markets, SEBI regulations, Indian tax laws (Section 80C, ELSS, NPS, etc.), and Indian financial instruments (mutual funds, FD, PPF, SGB, etc.). Be concise, clear, and helpful. Always consider the user's risk profile and income when giving advice. Format responses clearly with bullet points where appropriate.`;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .filter((m) => !m.isLoading)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          systemContext: buildSystemContext(),
          history: conversationHistory,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? { ...m, content: data.response || "I apologize, I couldn't process that request. Please try again.", isLoading: false, timestamp: new Date() }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? {
                ...m,
                content: "I'm having trouble connecting right now. Please check your connection and try again. In the meantime, I can share that for your moderate risk profile and age group, a balanced portfolio of 55% equity, 25% debt, 10% gold, and 10% cash is generally appropriate for long-term wealth creation.",
                isLoading: false,
                timestamp: new Date(),
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Chat cleared. How can I assist you with your finances today?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">AI Financial Advisor</h1>
              <p className="text-xs text-violet-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Powered by Gemini 2.0 Flash
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 border border-slate-700/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 gap-6">
        {/* Chat Interface */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/60 overflow-hidden shadow-xl" style={{ height: "calc(100vh - 220px)" }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length <= 1 && (
              <div className="px-4 sm:px-6 pb-3">
                <p className="text-xs text-slate-500 mb-2 font-medium">Quick questions</p>
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleQuickPrompt(prompt)}
                      disabled={isLoading}
                      className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-slate-800/60 p-4 bg-slate-900/40">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about investments, tax planning, portfolio strategy..."
                    rows={1}
                    disabled={isLoading}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 resize-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 120) + "px";
                    }}
                  />
                </div>
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-900/40 hover:from-violet-400 hover:to-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-2 text-center">Press Enter to send Â· Shift+Enter for new line</p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 flex items-start gap-2 bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/70 leading-relaxed">
              <span className="font-semibold text-amber-300">Disclaimer:</span> AI-generated advice is for informational purposes only and does not constitute financial advice. Consult a SEBI-registered investment advisor before making investment decisions. Past performance is not indicative of future returns.
            </p>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 flex-shrink-0 space-y-4 hidden lg:flex lg:flex-col">
          {/* Your Profile Card */}
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-2xl overflow-hidden shadow-lg">
            <button
              onClick={() => setProfileExpanded(!profileExpanded)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <span className="text-sm font-semibold text-white">Your Profile</span>
              </div>
              {profileExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {profileExpanded && (
              <div className="px-5 pb-5 space-y-3">
                <div className="h-px bg-slate-800/80" />
                {[
                  { label: "Income Range", value: userProfile.incomeRange, icon: IndianRupee },
                  { label: "Risk Appetite", value: userProfile.riskAppetite, icon: Shield },
                  { label: "Age Group", value: userProfile.ageGroup, icon: User },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-xs text-slate-500 truncate">{label}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-200 text-right">{value}</span>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Risk Level</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-4 h-1.5 rounded-full ${
                            level <= 3 ? "bg-amber-400" : "bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Card */}
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-2xl overflow-hidden shadow-lg">
            <button
              onClick={() => setStatsExpanded(!statsExpanded)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-white">Quick Stats</span>
              </div>
              {statsExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {statsExpanded && (
              <div className="px-5 pb-5 space-y-4">
                <div className="h-px bg-slate-800/80" />
                <div>
                  <p className="text-xs text-slate-500 mb-1">Portfolio Value</p>
                  <p className="text-2xl font-bold text-white">{userProfile.portfolioValue}</p>
                  <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3" />
                    +12.4% this year
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-2">Asset Allocation</p>
                  <AllocationBar
                    equity={userProfile.equityAllocation}
                    debt={userProfile.debtAllocation}
                    gold={userProfile.goldAllocation}
                    cash={userProfile.cashAllocation}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { label: "XIRR", value: "14.2%", color: "text-emerald-400" },
                    { label: "Invested", value: "â¹22.1L", color: "text-slate-200" },
                    { label: "Gain", value: "â¹6.35L", color: "text-emerald-400" },
                    { label: "Funds", value: "8", color: "text-slate-200" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-slate-800/50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                      <p className={`text-sm font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Context Indicator */}
          <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-medium text-slate-400">Context Aware</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your profile data is automatically included with every message for personalized advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

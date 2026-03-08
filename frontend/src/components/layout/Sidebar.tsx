"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Shield,
  Calculator,
  MessageSquare,
  Settings,
  User,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Mutual Funds", href: "/mutual-funds", icon: TrendingUp },
  { label: "Stocks", href: "/stocks", icon: BarChart3 },
  { label: "Insurance", href: "/insurance", icon: Shield },
  { label: "Tax Calculator", href: "/tax", icon: Calculator },
  { label: "AI Advisor", href: "/advisor", icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      style={{ width: "260px" }}
      className="fixed left-0 top-0 h-full bg-white border-r border-[#E5E5E5] flex flex-col z-50"
    >
      {/* Logo Area */}
      <div className="px-6 py-6 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className="text-xl font-bold tracking-tight text-gray-900"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Finora
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mb-0.5" />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-[#F0F0F0]" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto">
        <p
          className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Menu
        </p>
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ease-in-out
                ${
                  active
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }
              `}
            >
              {/* Active indicator bar */}
              <span
                className={`absolute left-0 w-1 h-6 rounded-r-full bg-emerald-500 transition-all duration-150 ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
              <span
                className={`flex-shrink-0 transition-colors duration-150 ${
                  active
                    ? "text-emerald-500"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span
                className={`text-sm transition-colors duration-150 ${
                  active ? "font-semibold text-emerald-700" : "font-medium"
                }`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {item.label}
              </span>
              {item.label === "AI Advisor" && (
                <span className="ml-auto text-[10px] font-semibold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
                  NEW
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-[#F0F0F0]" />

      {/* Bottom Section */}
      <div className="px-4 py-5 flex items-center justify-between">
        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <User size={16} strokeWidth={2} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span
              className="text-sm font-semibold text-gray-800 leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Aryan Shah
            </span>
            <span
              className="text-[11px] text-gray-400 leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Premium Plan
            </span>
          </div>
        </div>

        {/* Settings Icon */}
        <Link
          href="/settings"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-150"
        >
          <Settings size={16} strokeWidth={1.8} />
        </Link>
      </div>
    </aside>
  );
}

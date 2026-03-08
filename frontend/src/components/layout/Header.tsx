"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, User } from "lucide-react";
import { useState, useEffect } from "react";

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";
  const last = segments[segments.length - 1];
  return last
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Header() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [hasNotifications, setHasNotifications] = useState(true);

  useEffect(() => {
    setCurrentDate(new Date());
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full px-8 py-5 flex items-center justify-between bg-transparent">
      {/* Left: Page Title + Date */}
      <div className="flex flex-col gap-0.5">
        <h1
          className="text-2xl font-semibold text-stone-800 tracking-tight"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {pageTitle}
        </h1>
        {currentDate ? (
          <p className="text-sm text-stone-400 font-normal">
            {formatDate(currentDate)}
          </p>
        ) : (
          <p className="text-sm text-stone-400 font-normal h-5" />
        )}
      </div>

      {/* Right: Search + Bell + Avatar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex items-center">
          <Search
            className="absolute left-3 text-stone-400 pointer-events-none"
            size={15}
            strokeWidth={2}
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Searchâ¦"
            className="pl-9 pr-4 py-2 text-sm bg-stone-100 text-stone-700 placeholder-stone-400 rounded-full border border-transparent focus:outline-none focus:border-stone-300 focus:bg-white transition-all duration-200 w-48 focus:w-60"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>

        {/* Notification Bell */}
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 transition-colors duration-200 text-stone-600 hover:text-stone-800"
          aria-label="Notifications"
          onClick={() => setHasNotifications(false)}
        >
          <Bell size={16} strokeWidth={2} />
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-400 border-2 border-white" />
          )}
        </button>

        {/* User Avatar */}
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white hover:from-violet-500 hover:to-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md"
          aria-label="User profile"
        >
          <User size={16} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

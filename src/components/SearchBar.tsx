import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { SearchResult } from "../types";
import { cn } from "../lib/utils";

interface SearchBarProps {
  onSelect: (symbol: string) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.quotes || []);
        setShowDropdown(true);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-xl" ref={dropdownRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          placeholder="SEARCH TICKER OR COMPANY..."
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-2.5 pl-11 pr-4 text-sm font-mono tracking-wider focus:outline-hidden focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-zinc-600 uppercase"
        />
        {loading && (
          <div className="absolute right-4">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-20 shadow-2xl backdrop-blur-xl">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelect(result.symbol);
                setQuery("");
                setShowDropdown(false);
              }}
              className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0"
            >
              <div className="flex flex-col items-start">
                <span className="font-mono font-bold text-blue-500">{result.symbol}</span>
                <span className="text-xs text-zinc-400 truncate max-w-[250px]">
                  {result.shortname || result.longname}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded uppercase">
                {result.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

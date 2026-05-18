import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Activity, 
  Globe, 
  RefreshCw,
  ArrowUpRight,
  BarChart3,
  PieChart,
  LayoutDashboard,
  Plus,
  ArrowLeftRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StockQuote, ChartDataPoint } from "./types";
import { formatCurrency, formatCompactNumber, cn } from "./lib/utils";
import SearchBar from "./components/SearchBar";
import StockChart from "./components/StockChart";
import SentimentModule from "./components/SentimentModule";
import CompareView from "./components/CompareView";
import NewsSection from "./components/NewsSection";
import MarketTicker from "./components/MarketTicker";

const WATCHLIST_DEFAULT = ["AAPL", "GOOGL", "TSLA", "BTC-USD"];

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [watchlistQuotes, setWatchlistQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("1mo");

  const [isMarketOpen, setIsMarketOpen] = useState(false);

  // Comparison State
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const [compareQuotes, setCompareQuotes] = useState<Record<string, StockQuote>>({});
  const [compareHistories, setCompareHistories] = useState<Record<string, any[]>>({});
  const [viewMode, setViewMode] = useState<"single" | "compare">("single");
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    // Simple US market state check (approx 9:30 - 16:00 ET)
    const checkMarket = () => {
      const now = new Date();
      const day = now.getUTCDay();
      const hour = now.getUTCHours();
      const minute = now.getUTCMinutes();
      const etHour = (hour - 4 + 24) % 24; // EDT
      
      const open = day >= 1 && day <= 5 && (etHour > 9 || (etHour === 9 && minute >= 30)) && etHour < 16;
      setIsMarketOpen(open);
    };
    checkMarket();
    const interval = setInterval(checkMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (symbol: string) => {
    setLoading(true);
    try {
      const [quoteRes, historyRes] = await Promise.all([
        fetch(`/api/stock/${symbol}`),
        fetch(`/api/stock/${symbol}/history?range=${range}`),
      ]);
      const quoteData = await quoteRes.json();
      const historyData = await historyRes.json();
      
      if (quoteData.error) throw new Error(quoteData.error);
      
      setQuote(quoteData);
      setHistory(historyData?.quotes || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    try {
      const promises = WATCHLIST_DEFAULT.map(s => fetch(`/api/stock/${s}`).then(r => r.json()));
      const results = await Promise.all(promises);
      // Filter out invalid results that might not have a symbol (e.g. error responses)
      setWatchlistQuotes(results.filter(q => q && q.symbol));
    } catch (error) {
      console.error("Watchlist fetch error:", error);
    }
  };

  useEffect(() => {
    fetchData(selectedSymbol);
  }, [selectedSymbol, range]);

  useEffect(() => {
    const fetchCompareData = async () => {
      if (compareSymbols.length === 0) return;
      setCompareLoading(true);
      try {
        const [quotesRes, historyRes] = await Promise.all([
          Promise.all(compareSymbols.map(s => fetch(`/api/stock/${s}`).then(r => r.json()))),
          fetch(`/api/stock/bulk/history?symbols=${compareSymbols.join(",")}&range=${range}`).then(r => r.json())
        ]);
        
        const quotesMap: Record<string, StockQuote> = {};
        quotesRes.forEach((q: any) => { if (q.symbol) quotesMap[q.symbol] = q; });
        
        setCompareQuotes(quotesMap);
        setCompareHistories(historyRes);
      } catch (error) {
        console.error("Comparison fetch error:", error);
      } finally {
        setCompareLoading(false);
      }
    };

    if (viewMode === "compare") {
      fetchCompareData();
    }
  }, [compareSymbols, range, viewMode]);

  useEffect(() => {
    fetchWatchlist();
    const interval = setInterval(fetchWatchlist, 60000); // Update watchlist every minute
    return () => clearInterval(interval);
  }, []);

  const addToCompare = (symbol: string) => {
    if (!compareSymbols.includes(symbol)) {
      setCompareSymbols(prev => [...prev, symbol]);
    }
    setViewMode("compare");
  };

  const removeFromCompare = (symbol: string) => {
    setCompareSymbols(prev => prev.filter(s => s !== symbol));
  };

  const isPositive = (quote?.regularMarketChangePercent || 0) >= 0;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
      {/* Sidebar - Desktop Only */}
      <aside className="fixed left-0 top-0 bottom-0 w-16 hidden lg:flex flex-col items-center py-8 border-r border-zinc-900 bg-black z-20">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-12 shadow-lg shadow-blue-900/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <nav className="flex flex-col gap-8">
          <button onClick={() => setViewMode("single")}>
            <LayoutDashboard className={cn("w-5 h-5 transition-colors", viewMode === "single" ? "text-blue-500" : "text-zinc-600 hover:text-white")} />
          </button>
          <button onClick={() => setViewMode("compare")}>
            <ArrowLeftRight className={cn("w-5 h-5 transition-colors", viewMode === "compare" ? "text-blue-500" : "text-zinc-600 hover:text-white")} />
          </button>
          <BarChart3 className="w-5 h-5 text-zinc-600 hover:text-white transition-colors cursor-pointer" />
          <PieChart className="w-5 h-5 text-zinc-600 hover:text-white transition-colors cursor-pointer" />
        </nav>
        <div className="mt-auto">
          <RefreshCw 
            className={cn("w-5 h-5 text-zinc-600 hover:text-white transition-colors cursor-pointer", loading && "animate-spin")} 
            onClick={() => viewMode === "single" ? fetchData(selectedSymbol) : setCompareSymbols([...compareSymbols])}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-16 p-4 lg:p-8 max-w-(--breakpoint-2xl) mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 group">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 uppercase font-mono">
                StockPulse <span className="text-blue-500 font-normal">Terminal</span>
              </h1>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-widest flex items-center gap-1.5",
                isMarketOpen ? "bg-green-500/10 text-green-500 ring-1 ring-green-500/20" : "bg-zinc-800 text-zinc-500"
              )}>
                <div className={cn("w-1 h-1 rounded-full", isMarketOpen ? "bg-green-500 animate-pulse" : "bg-zinc-500")} />
                {isMarketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
              </div>
            </div>
            <p className="text-zinc-500 text-[10px] font-mono flex items-center gap-2 mt-1 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              MODE: {viewMode} | SYNC: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <SearchBar onSelect={(s) => { setSelectedSymbol(s); setViewMode("single"); }} />
        </header>

        {viewMode === "compare" ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-mono tracking-tight uppercase flex items-center gap-2 text-blue-500">
                <ArrowLeftRight className="w-5 h-5" />
                Comparison Dashboard
              </h2>
              <div className="flex bg-zinc-950/50 p-1 rounded-xl border border-zinc-800 shrink-0 gap-1">
                {["1d", "5d", "1mo", "6mo", "1y"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all",
                      range === r ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {r}
                  </button>
                ))}
                <div className="w-px h-4 bg-zinc-800 self-center mx-1" />
                <button
                  onClick={() => setCompareSymbols([...compareSymbols])}
                  className="px-2 py-1.5 text-zinc-500 hover:text-white transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", compareLoading && "animate-spin")} />
                </button>
              </div>
            </div>
            <CompareView 
              symbols={compareSymbols} 
              quotes={compareQuotes} 
              histories={compareHistories} 
              onRemove={removeFromCompare}
              loading={compareLoading}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Chart Area */}
            <section className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-3xl font-bold font-mono tracking-tighter">{quote?.symbol}</h2>
                      <span className="text-zinc-500 text-sm font-mono mt-1 truncate max-w-[200px]">
                        {quote?.shortName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-mono font-bold tracking-tighter">
                        {formatCurrency(quote?.regularMarketPrice, quote?.currency)}
                      </span>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold font-mono",
                        isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {quote?.regularMarketChangePercent?.toFixed(2)}%
                      </div>
                    </div>
                    
                    {/* Trading & Comparison Buttons */}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 min-w-[120px] max-w-[140px] bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-500 py-2 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        BUY
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 min-w-[120px] max-w-[140px] bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-500 py-2 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        SELL
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => quote && addToCompare(quote.symbol)}
                        className="flex-1 min-w-[150px] max-w-[180px] bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-500 py-2 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        ADD TO COMPARE
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex bg-zinc-950/50 p-1 rounded-xl border border-zinc-800 shrink-0 gap-1">
                    {["1d", "5d", "1mo", "6mo", "1y"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all",
                          range === r ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-white"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-zinc-800 self-center mx-1" />
                    <button
                      onClick={() => fetchData(selectedSymbol)}
                      className="px-2 py-1.5 text-zinc-500 hover:text-white transition-colors"
                      title="Refresh Data"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>
                  </div>
                </div>

                <div className="h-[350px] w-full">
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <LoaderPulse />
                    </div>
                  ) : (
                    <StockChart data={history} isPositive={isPositive} currency={quote?.currency} />
                  )}
                </div>
              </div>

              {/* Key Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="MARKET CAP" value={formatCompactNumber(quote?.marketCap)} />
                <StatCard label="VOLUME" value={formatCompactNumber(quote?.regularMarketVolume)} />
                <StatCard label="DAY HIGH" value={formatCurrency(quote?.regularMarketDayHigh, quote?.currency)} />
                <StatCard label="DAY LOW" value={formatCurrency(quote?.regularMarketDayLow, quote?.currency)} />
              </div>
            </section>

            {/* Right Sidebar: Watchlist & Sentiment */}
            <aside className="lg:col-span-4 flex flex-col gap-6">
              <SentimentModule symbol={selectedSymbol} />
              
              <NewsSection symbol={selectedSymbol} />
              
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
                <h3 className="font-mono text-sm font-bold uppercase tracking-widest mb-4 flex items-center justify-between">
                  WATCHLIST
                  <span className="text-[10px] font-normal text-zinc-500">AUTO-UPDATE</span>
                </h3>
                <div className="space-y-3">
                  {watchlistQuotes.map((q) => (
                    <div key={q.symbol} className="flex gap-2">
                      <button
                        onClick={() => setSelectedSymbol(q.symbol)}
                        className={cn(
                          "flex-1 flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                          selectedSymbol === q.symbol 
                            ? "bg-blue-600/10 border-blue-500/50" 
                            : "bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700"
                        )}
                      >
                        <div>
                          <p className="font-mono font-bold text-sm">{q.symbol}</p>
                          <p className="text-[10px] text-zinc-500 truncate w-32 uppercase font-mono">{q.shortName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm">{q.regularMarketPrice?.toFixed(2)}</p>
                          <p className={cn(
                            "text-[10px] font-mono",
                            (q.regularMarketChangePercent || 0) >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {(q.regularMarketChangePercent || 0) >= 0 ? "+" : ""}{q.regularMarketChangePercent?.toFixed(2)}%
                          </p>
                        </div>
                      </button>
                      <button 
                        onClick={() => addToCompare(q.symbol)}
                        className="p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:border-blue-500/50 transition-all text-zinc-500 hover:text-blue-500"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

      </main>

      {/* Decorative background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20 -z-10 bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:40px_40px]"></div>
      
      <MarketTicker />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col gap-1 hover:border-zinc-700 transition-colors">
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none mb-1">{label}</span>
      <span className="text-xl font-mono font-bold tracking-tighter">{value}</span>
    </div>
  );
}

function LoaderPulse() {
  return (
    <div className="flex gap-1.5 items-end">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          animate={{ height: [10, 40, 10] }}
          transition={{
            repeat: Infinity,
            duration: 1,
            delay: i * 0.1,
          }}
          className="w-1.5 bg-blue-500/50 rounded-full"
        />
      ))}
    </div>
  );
}

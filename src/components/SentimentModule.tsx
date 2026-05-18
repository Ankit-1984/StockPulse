import React, { useState, useEffect } from "react";
import { BrainCircuit, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

interface SentimentModuleProps {
  symbol: string;
}

export default function SentimentModule({ symbol }: SentimentModuleProps) {
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSentiment() {
      if (!symbol) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/stock/${symbol}/sentiment`);
        const data = await res.json();
        setSentiment(data.sentiment);
      } catch (error) {
        console.error("Failed to fetch sentiment:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSentiment();
  }, [symbol]);

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <BrainCircuit className="w-5 h-5 text-blue-500" />
        <h3 className="font-mono text-sm uppercase tracking-wider font-bold">
          AI INSIGHTS <span className="text-zinc-600 font-normal">/ {symbol}</span>
        </h3>
      </div>

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scaleY: [1, 2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.8,
                      delay: i * 0.1,
                    }}
                    className="w-1 h-4 bg-blue-500 rounded-full"
                  />
                ))}
              </div>
              <span className="text-[10px] uppercase font-mono tracking-widest">
                Analyzing Market Signals...
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-invert prose-zinc max-w-none"
            >
              <div className="text-sm leading-relaxed text-zinc-300 font-sans">
                <ReactMarkdown>
                  {sentiment || "Select a ticker to analyze market sentiment."}
                </ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-zinc-600" />
        <p className="text-[10px] text-zinc-600 uppercase font-mono">
          Data powered by Gemini-3 Flash & Yahoo Finance
        </p>
      </div>
    </div>
  );
}

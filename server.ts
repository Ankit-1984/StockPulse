import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import YahooFinance from "yahoo-finance2";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const yahooFinance = new YahooFinance();

// Gemini AI Setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// API: Get stock quote
app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await yahooFinance.quote(symbol);
    res.json(quote);
  } catch (error) {
    console.error("Error fetching quote:", error);
    res.status(500).json({ error: "Failed to fetch stock quote" });
  }
});

// API: Get historical data
app.get("/api/stock/:symbol/history", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = "1mo", interval = "1d" } = req.query;
    
    // Convert range to approximate dates for yahoo-finance2
    const now = new Date();
    let startDate = new Date();
    
    switch(range) {
      case '1d': startDate.setDate(now.getDate() - 1); break;
      case '5d': startDate.setDate(now.getDate() - 5); break;
      case '1mo': startDate.setMonth(now.getMonth() - 1); break;
      case '6mo': startDate.setMonth(now.getMonth() - 6); break;
      case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
      case '5y': startDate.setFullYear(now.getFullYear() - 5); break;
      default: startDate.setMonth(now.getMonth() - 1);
    }

    const result = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: now,
      interval: interval as any,
    });
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch stock history" });
  }
});

// API: Search stocks (includes news)
app.get("/api/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ quotes: [], news: [] });
    const results = await yahooFinance.search(q as string) as any;
    res.json({
      quotes: results.quotes || [],
      news: results.news || []
    });
  } catch (error) {
    console.error("Search failed:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// API: Get stock news
app.get("/api/stock/:symbol/news", async (req, res) => {
  try {
    const { symbol } = req.params;
    const results = await yahooFinance.search(symbol) as any;
    res.json(results.news || []);
  } catch (error) {
    console.error("News fetch error:", error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// API: Market Sentiment Summary with Gemini
app.get("/api/stock/:symbol/sentiment", async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const quote = await yahooFinance.quote(symbol) as any;
    const chart = await yahooFinance.chart(symbol, { period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }) as any;

    const prompt = `
      Analyze the current market sentiment for ${symbol} (${quote?.shortName || symbol}).
      Current Price: ${quote?.regularMarketPrice} ${quote?.currency}
      Change: ${quote?.regularMarketChangePercent}%
      Day High/Low: ${quote?.regularMarketDayHigh}/${quote?.regularMarketDayLow}
      Volume: ${quote?.regularMarketVolume}
      
      Recent trend data (last 7 days): ${JSON.stringify((chart?.quotes || []).map((q: any) => ({ date: q.date, close: q.close })))}

      Provide a concise summary (max 100 words) of the likely market sentiment and what traders should watch out for. 
      Focus on technical trends if obvious. Keep it professional.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    res.json({ sentiment: response.text });
  } catch (error) {
    console.error("Gemini sentiment error:", error);
    res.status(500).json({ error: "Failed to generate sentiment" });
  }
});

// API: Get historical data (Bulk)
app.get("/api/stock/bulk/history", async (req, res) => {
  try {
    const symbols = (req.query.symbols as string || "").split(",");
    const { range = "1mo", interval = "1d" } = req.query;
    
    if (!symbols.length || symbols[0] === "") return res.json({});

    const now = new Date();
    let startDate = new Date();
    switch(range) {
      case '1d': startDate.setDate(now.getDate() - 1); break;
      case '5d': startDate.setDate(now.getDate() - 5); break;
      case '1mo': startDate.setMonth(now.getMonth() - 1); break;
      case '6mo': startDate.setMonth(now.getMonth() - 6); break;
      case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setMonth(now.getMonth() - 1);
    }

    const results: Record<string, any> = {};
    await Promise.all(symbols.map(async (sym) => {
      try {
        const data = await yahooFinance.chart(sym, {
          period1: startDate,
          period2: now,
          interval: interval as any,
        });
        results[sym] = data.quotes;
      } catch (e) {
        console.error(`Error fetching bulk for ${sym}:`, e);
      }
    }));
    
    res.json(results);
  } catch (error) {
    console.error("Bulk history error:", error);
    res.status(500).json({ error: "Failed to fetch bulk stock history" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

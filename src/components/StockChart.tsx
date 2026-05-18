import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { format } from "date-fns";
import { formatCurrency } from "../lib/utils";

interface StockChartProps {
  data: any[];
  isPositive: boolean;
  currency?: string;
}

export default function StockChart({ data, isPositive, currency = "USD" }: StockChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .map((d) => {
        const date = new Date(d.date);
        if (isNaN(date.getTime())) return null;
        return {
          ...d,
          timestamp: format(date, "MMM dd"),
        };
      })
      .filter((d): d is any => d !== null);
  }, [data]);

  const gradientColor = isPositive ? "#22c55e" : "#ef4444";

  if (!chartData.length) {
    return (
      <div className="h-full w-full flex items-center justify-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
        NO DATA AVAILABLE
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColor} stopOpacity={0.1} />
                <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#27272a"
              opacity={0.5}
            />
            <XAxis
              dataKey="timestamp"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }}
              minTickGap={30}
              interval="preserveStartEnd"
            />
            <YAxis
              hide
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-2xl shadow-black/80 flex flex-col gap-2 min-w-[140px]">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-1">
                        <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold tracking-wider">
                          {data.timestamp}
                        </span>
                        <span className="text-[10px] font-mono text-blue-500 bg-blue-500/10 px-1 rounded">
                          CLOSE
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase">Open</span>
                          <span className="text-xs font-mono font-medium">{formatCurrency(data.open, currency)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase">High</span>
                          <span className="text-xs font-mono font-medium text-green-500">{formatCurrency(data.high, currency)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase">Low</span>
                          <span className="text-xs font-mono font-medium text-red-500">{formatCurrency(data.low, currency)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-zinc-800 mt-1">
                          <span className="text-[9px] font-mono text-zinc-100 uppercase font-bold">Close</span>
                          <span className="text-sm font-mono font-bold text-white">{formatCurrency(data.close, currency)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={gradientColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVal)"
              animationDuration={800}
              isAnimationActive={true}
            />
            <Brush
              dataKey="timestamp"
              height={30}
              stroke="#3f3f46"
              fill="#09090b"
              gap={1}
              travellerWidth={10}
              className="stock-brush"
            >
              <AreaChart data={chartData}>
                <Area 
                  type="monotone" 
                  dataKey="close" 
                  stroke={gradientColor} 
                  fill={gradientColor} 
                  fillOpacity={0.1} 
                  strokeWidth={1}
                />
              </AreaChart>
            </Brush>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

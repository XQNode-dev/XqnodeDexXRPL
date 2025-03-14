import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export interface TvlPoint {
  time: number;
  tvl: number;
}

interface DexChartProps {
  chartData: TvlPoint[];
}

function shortTvlFormatter(val: number): string {
  if (val >= 1_000_000_000) {
    return (val / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  } else if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  } else if (val >= 1_000) {
    return (val / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return val.toString();
}

function timeFormatter(timestamp: number) {
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

const DexChart: React.FC<DexChartProps> = ({ chartData }) => {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-gray-500 bg-black/20 rounded">
        No TVL data available
      </div>
    );
  }

  const dataForChart =
    chartData.length === 1 ? [chartData[0], chartData[0]] : chartData;
  const lastValue = dataForChart[dataForChart.length - 1].tvl;

  return (
    <div className="w-full h-[260px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={dataForChart}
          margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRedShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4d4f" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ff4d4f" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#333" />

          <XAxis
            dataKey="time"
            tickFormatter={timeFormatter}
            stroke="#999"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
          />

          {/* 
            domain={['dataMin', 'auto']} => 
          */}
          <YAxis
            stroke="#999"
            tickFormatter={shortTvlFormatter}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            domain={["dataMin", "auto"]}
          />

          <Tooltip
            formatter={(val: number) => `$${val.toLocaleString()}`}
            labelFormatter={timeFormatter}
            contentStyle={{ backgroundColor: "#1f1f1f", border: "1px solid #333" }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#ddd" }}
          />

          <ReferenceLine
            y={lastValue}
            stroke="#ff4d4f"
            strokeDasharray="3 3"
            ifOverflow="extendDomain"
            label={{
              value: shortTvlFormatter(lastValue),
              position: "right",
              fill: "#ff4d4f",
              fontSize: 10,
            }}
          />

          <Area
            type="monotone"
            dataKey="tvl"
            stroke="#ff4d4f"
            strokeWidth={2}
            fill="url(#colorRedShade)"
            isAnimationActive
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DexChart;

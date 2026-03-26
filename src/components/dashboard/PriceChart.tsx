"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DailyPrice } from "@/types";

export function PriceChart({ data }: { data: DailyPrice[] }) {
  const chartData = useMemo(() => {
    return data.map((d, i) => {
      const isNextPredicted = i + 1 < data.length && data[i + 1].isPredicted;
      let historyPrice: number | null = null;
      let predictedPrice: number | null = null;

      if (!d.isPredicted) {
        historyPrice = d.price;
        if (isNextPredicted) {
          predictedPrice = d.price;
        }
      } else {
        predictedPrice = d.price;
      }

      return {
        date: new Date(d.date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }),
        historyPrice,
        predictedPrice,
        originalPrice: d.price,
        isPredicted: d.isPredicted,
      };
    });
  }, [data]);

  const splitIndex = chartData.findIndex((d) => d.isPredicted);

  return (
    <div className="h-[200px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#64748B" 
            fontSize={10} 
            tickMargin={10}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="#64748B" 
            fontSize={10} 
            tickFormatter={(value) => `Rp ${value / 1000}k`}
            axisLine={false}
            tickLine={false}
            domain={['dataMin - 1000', 'dataMax + 1000']}
            width={60}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#0B0914' }}
            itemStyle={{ color: '#166534' }}
            formatter={(value: unknown, name: string | number | undefined) => [`Rp ${Number(value).toLocaleString("id-ID")}`, name === 'historyPrice' ? 'Histori' : 'Prediksi']}
          />
          {splitIndex !== -1 && (
            <ReferenceLine x={chartData[splitIndex]?.date} stroke="#EAB308" strokeDasharray="3 3" />
          )}
          <Line
            type="monotone"
            dataKey="historyPrice"
            stroke="#166534"
            strokeWidth={2}
            dot={{ r: 3, fill: "#166534" }}
            activeDot={{ r: 5, fill: "#166534", stroke: "#FFFFFF", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="predictedPrice"
            stroke="#EAB308"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: "#EAB308" }}
            activeDot={{ r: 5, fill: "#EAB308", stroke: "#FFFFFF", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

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

interface ChartDataPoint {
  date: string;
  historyPrice: number | null;
  predictedPrice: number | null;
  originalPrice: number;
  isPredicted: boolean;
}

export function PriceChart({ data }: { data: DailyPrice[] }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const points: ChartDataPoint[] = [];
    let lastValidPrice: number | null = null;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const isNextPredicted = i + 1 < data.length && data[i + 1].isPredicted;

      // If today's price is null/0, use last valid price (forward-fill)
      const price = d.price > 0 ? d.price : (lastValidPrice ?? 0);
      if (d.price > 0) {
        lastValidPrice = d.price;
      }

      let historyPrice: number | null = null;
      let predictedPrice: number | null = null;

      if (!d.isPredicted) {
        historyPrice = price;
        // Bridge point: last actual data point also starts the predicted line
        if (isNextPredicted) {
          predictedPrice = price;
        }
      } else {
        predictedPrice = price;
      }

      points.push({
        date: new Date(d.date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        }),
        historyPrice,
        predictedPrice,
        originalPrice: price,
        isPredicted: d.isPredicted,
      });
    }

    return points;
  }, [data]);

  const splitIndex = chartData.findIndex((d) => d.isPredicted);

  if (chartData.length === 0) {
    return (
      <div className="h-[200px] w-full mt-4 flex items-center justify-center bg-muted/30 rounded-lg">
        <p className="text-sm text-muted-foreground">Belum ada data harga</p>
      </div>
    );
  }

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
            domain={["dataMin - 1000", "dataMax + 1000"]}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E2E8F0",
              color: "#0B0914",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            itemStyle={{ color: "#166534" }}
            formatter={(value: unknown, name: string | number | undefined) => [
              `Rp ${Number(value).toLocaleString("id-ID")}`,
              name === "historyPrice" ? "Harga Aktual" : "Prediksi AI",
            ]}
            labelStyle={{ fontWeight: "bold", marginBottom: 4 }}
          />
          {splitIndex !== -1 && (
            <ReferenceLine
              x={chartData[splitIndex]?.date}
              stroke="#EAB308"
              strokeDasharray="3 3"
              label={{
                value: "Hari Ini",
                position: "top",
                fill: "#EAB308",
                fontSize: 10,
              }}
            />
          )}
          {/* Solid line: Actual historical prices */}
          <Line
            type="monotone"
            dataKey="historyPrice"
            stroke="#166534"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#166534" }}
            activeDot={{ r: 6, fill: "#166534", stroke: "#FFFFFF", strokeWidth: 2 }}
            connectNulls
            name="historyPrice"
          />
          {/* Dashed line: AI Predicted prices (H+1 to H+7) */}
          <Line
            type="monotone"
            dataKey="predictedPrice"
            stroke="#EAB308"
            strokeWidth={2.5}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: "#EAB308" }}
            activeDot={{ r: 6, fill: "#EAB308", stroke: "#FFFFFF", strokeWidth: 2 }}
            connectNulls
            name="predictedPrice"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

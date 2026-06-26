"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QuarterPoint } from "@/lib/types";

const AXIS = { stroke: "#3f3f46", fontSize: 11 };
const GRID = "#27272a";

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid #27272a",
  borderRadius: 8,
  color: "#fafafa",
  fontSize: 12,
};

export function PriceLineChart({
  data,
  height = 220,
  color = "#6366f1",
}: {
  data: QuarterPoint[];
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <XAxis dataKey="quarter" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis
          tick={AXIS}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`AED ${Number(v).toLocaleString()}/sqm`, "Avg price"]} />
        <Line
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 2, fill: color }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AssetVolumeBar({
  data,
  height = 240,
}: {
  data: { asset_type: string; count: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <XAxis dataKey="asset_type" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#27272a55" }} />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#f97316", "#8b5cf6"];

export function ReasonDonut({
  data,
  height = 240,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="#09090b" />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

const URGENCY_FILL: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  moderate: "#f97316",
  low: "#71717a",
};

export function QualityScatter({
  data,
  height = 260,
}: {
  data: { x: number; y: number; tier: string; title: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
        <XAxis
          type="number"
          dataKey="x"
          name="Discount"
          unit="%"
          tick={AXIS}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          domain={[0, "dataMax + 5"]}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Quality"
          tick={AXIS}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          domain={[0, 100]}
          width={40}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ strokeDasharray: "3 3", stroke: GRID }}
          formatter={(v: any, n: any) => [n === "x" ? `${v}%` : v, n === "x" ? "Discount" : "Quality"]}
        />
        <Scatter data={data}>
          {data.map((d, i) => (
            <Cell key={i} fill={URGENCY_FILL[d.tier] ?? "#71717a"} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

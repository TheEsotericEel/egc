"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const data = [
  { date: "2025-08-20", gross: 120, net: 90 },
  { date: "2025-08-21", gross: 200, net: 150 },
  { date: "2025-08-22", gross: 160, net: 120 },
];

export default function RechartsDemo() {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <h2 className="text-lg font-semibold mb-2">Recharts Demo</h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="gross" name="Gross" stroke="#8884d8" />
          <Line type="monotone" dataKey="net" name="Net" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}






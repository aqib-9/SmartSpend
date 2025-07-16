"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
} from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const DATE_RANGES = {
  "7D": { label: "Last 7 Days", days: 7 },
  "1M": { label: "Last Month", days: 30 },
  "3M": { label: "Last 3 Months", days: 90 },
  "6M": { label: "Last 6 Months", days: 180 },
  ALL: { label: "All Time", days: null },
};

export function AccountChart({ transactions }) {
  const [dateRange, setDateRange] = useState("1M");
  const [chartType, setChartType] = useState("bar");

  const filteredData = useMemo(() => {
    const range = DATE_RANGES[dateRange];
    const now = new Date();
    const startDate = range.days
      ? startOfDay(subDays(now, range.days))
      : startOfDay(new Date(0));
    const endDate = endOfDay(now);

    const grouped = new Map();

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (isAfter(tDate, endDate) || isBefore(tDate, startDate)) return;

      const key = format(startOfDay(tDate), "MMM dd");

      if (!grouped.has(key)) {
        grouped.set(key, { date: key, income: 0, expense: 0 });
      }

      if (t.type === "INCOME") grouped.get(key).income += t.amount;
      else grouped.get(key).expense += t.amount;
    });

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [transactions, dateRange]);

  const totals = useMemo(
    () =>
      filteredData.reduce(
        (acc, day) => ({
          income: acc.income + day.income,
          expense: acc.expense + day.expense,
        }),
        { income: 0, expense: 0 }
      ),
    [filteredData]
  );

  const ChartComponent = chartType === "bar" ? BarChart : LineChart;

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-7">
        <CardTitle className="text-base font-normal">
          Transaction Overview
        </CardTitle>

        <div className="flex items-center gap-2">
          <Select defaultValue={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_RANGES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={chartType === "bar" ? "default" : "ghost"}
              onClick={() => setChartType("bar")}
              className="rounded-none text-sm px-3"
            >
              Bar
            </Button>
            <Button
              variant={chartType === "line" ? "default" : "ghost"}
              onClick={() => setChartType("line")}
              className="rounded-none text-sm px-3"
            >
              Line
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex justify-around mb-6 text-sm">
          <div className="text-center">
            <p className="text-muted-foreground">Total Income</p>
            <p className="text-lg font-bold text-green-500">
              ${totals.income.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-bold text-red-500">
              ${totals.expense.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Net</p>
            <p
              className={`text-lg font-bold ${
                totals.income - totals.expense >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              ${(totals.income - totals.expense).toFixed(2)}
            </p>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            No transactions in this range
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponent
                data={filteredData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;

                    return (
                      <div className="bg-white border border-gray-300 rounded-md shadow-sm p-3 text-sm">
                        <p className="font-medium text-black mb-2">Date: {label}</p>
                        {payload.map((entry, index) => (
                          <div
                            key={index}
                            className="text-gray-700 flex justify-between gap-2"
                          >
                            <span>{entry.name}:</span>
                            <span
                              className={
                                entry.name === "Income"
                                  ? "text-green-500"
                                  : "text-red-500"
                              }
                            >
                              ${parseFloat(entry.value).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend />
                {chartType === "bar" ? (
                  <>
                    <defs>
                      <linearGradient id="incomeColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="expenseColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="url(#incomeColor)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expense"
                      fill="url(#expenseColor)"
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      name="Expense"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </>
                )}
              </ChartComponent>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

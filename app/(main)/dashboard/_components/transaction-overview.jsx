"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9FA8DA",
];

// ✅ Custom tooltip component
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-popover p-3 shadow-xl text-sm min-w-[180px]">
        {payload.map((entry, index) => (
          <div
            key={`item-${index}`}
            className="flex items-center justify-between py-1"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-medium text-foreground">
              ${entry.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export function DashboardOverview({ accounts, transactions }) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.find((a) => a.isDefault)?.id || accounts[0]?.id
  );

  const accountTransactions = transactions.filter(
    (t) => t.accountId === selectedAccountId
  );

  const recentTransactions = accountTransactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const currentDate = new Date();
  const currentMonthExpenses = accountTransactions.filter((t) => {
    const transactionDate = new Date(t.date);
    return (
      t.type === "EXPENSE" &&
      transactionDate.getMonth() === currentDate.getMonth() &&
      transactionDate.getFullYear() === currentDate.getFullYear()
    );
  });

  const expensesByCategory = currentMonthExpenses.reduce((acc, transaction) => {
    const category = transaction.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += transaction.amount;
    return acc;
  }, {});

  const pieChartData = Object.entries(expensesByCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Recent Transactions Card */}
      <Card className="shadow-lg rounded-2xl border border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-foreground">
            Recent Transactions
          </CardTitle>
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger className="w-[160px] border-muted bg-muted hover:border-primary focus:ring-2 focus:ring-primary/50">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="mt-4 space-y-4">
          {recentTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No recent transactions
            </p>
          ) : (
            recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {transaction.description || "Untitled Transaction"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(transaction.date), "PP")}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex items-center font-semibold",
                    transaction.type === "EXPENSE"
                      ? "text-red-500"
                      : "text-green-500"
                  )}
                >
                  {transaction.type === "EXPENSE" ? (
                    <ArrowDownRight className="mr-1 h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="mr-1 h-4 w-4" />
                  )}
                  ${transaction.amount.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Expense Breakdown Card */}
      <Card className="shadow-lg rounded-2xl border border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Monthly Expense Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {pieChartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No expenses this month
            </p>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

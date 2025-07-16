import { inngest } from "./client";
import { db } from "@/lib/prisma";
import EmailTemplate from "@/emails/template";
import { SendEmail } from "@/action/send-email";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Trigger Recurring Transactions
export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions",
    name: "Trigger Recurring Transactions",
  },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    const recurring = await step.run("fetch-recurring", async () => {
      return await db.transaction.findMany({
        where: {
          isRecurring: true,
          status: "COMPLETED",
          OR: [
            { lastProcessed: null },
            { nextRecurringDate: { lte: new Date() } },
          ],
        },
      });
    });

    if (recurring.length > 0) {
      const events = recurring.map((tx) => ({
        name: "transaction.recurring.process",
        data: {
          transactionId: tx.id,
          userId: tx.userId,
        },
      }));
      await inngest.send(events);
    }

    return { triggered: recurring.length };
  }
);

// 2. Process Recurring Transaction
export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    throttle: {
      limit: 10,
      period: "1m",
      key: "event.data.userId",
    },
  },
  { event: "transaction.recurring.process" },
  async ({ event, step }) => {
    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data:", event);
      return { error: "Missing event data" };
    }

    await step.run("process", async () => {
      const tx = await db.transaction.findUnique({
        where: {
          id: event.data.transactionId,
          userId: event.data.userId,
        },
        include: { account: true },
      });

      if (!tx || !isTransactionDue(tx)) return;

      await db.$transaction(async (dbtx) => {
        await dbtx.transaction.create({
          data: {
            type: tx.type,
            amount: tx.amount,
            description: `${tx.description} (Recurring)`,
            date: new Date(),
            category: tx.category,
            userId: tx.userId,
            accountId: tx.accountId,
            isRecurring: false,
          },
        });

        const change = tx.type === "EXPENSE" ? -tx.amount.toNumber() : tx.amount.toNumber();

        await dbtx.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: change } },
        });

        await dbtx.transaction.update({
          where: { id: tx.id },
          data: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextRecurringDate(new Date(), tx.recurringInterval),
          },
        });
      });
    });

    return { success: true };
  }
);

// 3. Budget Alerts
export const checkBudgetAlerts = inngest.createFunction(
  { name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: { where: { isDefault: true } },
            },
          },
        },
      });
    });

    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) continue;

      await step.run(`check-budget-${budget.id}`, async () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);

        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: defaultAccount.id,
            type: "EXPENSE",
            date: { gte: start, lte: now },
          },
          _sum: { amount: true },
        });

        const spent = expenses._sum.amount?.toNumber() || 0;
        const threshold = (spent / budget.amount) * 100;

        if (
          threshold >= 80 &&
          (!budget.lastAlertSent || isNewMonth(new Date(budget.lastAlertSent), now))
        ) {
          await SendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed: threshold.toFixed(1),
                budgetAmount: budget.amount.toFixed(1),
                totalExpenses: spent.toFixed(1),
                accountName: defaultAccount.name,
              },
            }),
          });

          await db.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: now },
          });
        }
      });
    }
  }
);

// 4. Monthly Reports
export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" },
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: { accounts: true },
      });
    });

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id, lastMonth);
        const monthName = lastMonth.toLocaleString("default", { month: "long" });
        const insights = await generateFinancialInsights(stats, monthName);

        await SendEmail({
          to: user.email,
          subject: `Your Monthly Financial Report - ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: { stats, month: monthName, insights },
          }),
        });
      });
    }

    return { processed: users.length };
  }
);

// Utils
function isTransactionDue(tx) {
  if (!tx.nextRecurringDate) return false;
  return new Date(tx.nextRecurringDate) <= new Date();
}

function calculateNextRecurringDate(date, interval) {
  const next = new Date(date);
  switch (interval) {
    case "DAILY": next.setDate(next.getDate() + 1); break;
    case "WEEKLY": next.setDate(next.getDate() + 7); break;
    case "MONTHLY": next.setMonth(next.getMonth() + 1); break;
    case "YEARLY": next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

function isNewMonth(last, current) {
  return last.getMonth() !== current.getMonth() || last.getFullYear() !== current.getFullYear();
}

async function getMonthlyStats(userId, month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const txs = await db.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
    },
  });

  return txs.reduce(
    (stats, t) => {
      const amt = t.amount.toNumber();
      if (t.type === "EXPENSE") {
        stats.totalExpenses += amt;
        stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + amt;
      } else {
        stats.totalIncome += amt;
      }
      return stats;
    },
    {
      totalExpenses: 0,
      totalIncome: 0,
      byCategory: {},
      transactionCount: txs.length,
    }
  );
}

async function generateFinancialInsights(stats, month) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational.

    Financial Data for ${month}:
    - Total Income: $${stats.totalIncome}
    - Total Expenses: $${stats.totalExpenses}
    - Net Income: $${stats.totalIncome - stats.totalExpenses}
    - Expense Categories: ${Object.entries(stats.byCategory).map(([c, a]) => `${c}: $${a}`).join(", ")}

    Format the response as a JSON array of strings.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("AI insight error:", e);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings.",
    ];
  }
}

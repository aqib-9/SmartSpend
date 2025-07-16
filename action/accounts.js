"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 🔧 Use one consistent serializer for Decimal values
const serializeDecimal = (obj) => {
  const serialized = { ...obj };
  if (obj.balance && typeof obj.balance.toNumber === "function") {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount && typeof obj.amount.toNumber === "function") {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export async function updateDefaultAccount(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Set all accounts to isDefault: false
    await db.account.updateMany({
      where: {
        userId: user.id,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set the selected account as default
    const account = await db.account.update({
      where: {
        id: accountId,
        userId: user.id,
      },
      data: {
        isDefault: true,
      },
    });

    revalidatePath("/dashboard");

    return { success: true, data: serializeDecimal(account) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getAccountWithTransactions(accountId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const account = await db.account.findUnique({
    where: {
      id: accountId,
      userId: user.id,
    },
    include: {
      transactions: {
        orderBy: { date: "desc" },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!account) return null;

  return {
    ...serializeDecimal(account),
    transactions: account.transactions.map(serializeDecimal),
  };
}


export async function bulkdeletetransactions(transactionids) {
  try{
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionids },
        userId: user.id,
      },
    });
      
    const accountbalancechanges = transactions.reduce((acc, transaction) => {
      const change = 
            transaction.type === "INCOME"
              ? transaction.amount
              : transaction.amount * -1;    
              
              acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;
              return acc;
    },{});


    await db.$transaction(async (tx) => {
  await tx.transaction.deleteMany({
    where: {
      id: { in: transactionids },
      userId: user.id,
    },
  });

  for (const [accountId, balanceChange] of Object.entries(accountbalancechanges)) {
    await tx.account.update({
      where: {
        id: accountId,
      },
      data: {
        balance: {
          increment: balanceChange,
        },
      },
    });
  }
});

revalidatePath("/dashboard");

// Revalidate all affected account pages
const uniqueAccountIds = [
  ...new Set(transactions.map((tx) => tx.accountId)),
];

for (const id of uniqueAccountIds) {
  revalidatePath(`/account/${id}`, "page");
}

return { success: true };

  }catch(error){
    return {success:false,error:error.message};
  
  }

}

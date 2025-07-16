"use server";
import { revalidatePath } from "next/cache";
import {auth} from '@clerk/nextjs/server';
import { db } from "@/lib/prisma";
export async function getCurrentBudget(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    const budget = await db.budget.findFirst({
      where: { userId: user.id },
    });

    const currentDate = new Date();
    const startofMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endofMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const expenses = await db.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: { gte: startofMonth, lte: endofMonth },
        accountId,
      },
      _sum: { amount: true },
    });

    return {
      budget: budget
        ? { ...budget, amount: budget.amount.toNumber() }
        : null,
      currentExpenses: expenses._sum.amount
        ? expenses._sum.amount.toNumber()
        : 0,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function updateBudget(amount){
    try{
        const {userId} = await auth();
        if(!userId){
            throw new Error("Unauthorized");
        }
        const user = await db.user.findUnique({
            where: {
                clerkUserId: userId
            }
        });
        if(!user){
            throw new Error("User not found");
        }


        const budget = await db.budget.upsert({
            where: {
                userId: user.id,
            },
            update: {
                amount,
            },
            create: {
                userId: user.id,
                amount: amount,
            },
        })


        revalidatePath("/dashboard");
        return {
            success: true,
            data : {...budget, amount: budget.amount.toNumber()},
        }
    }
    catch(error){
        console.log(error)
        return {
            success: false,
            error: error.message
        }

    }
}

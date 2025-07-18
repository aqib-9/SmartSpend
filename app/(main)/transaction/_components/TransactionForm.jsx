"use client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner"; // or "react-hot-toast", depending on your setup

import { format } from "date-fns";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { transactionSchema } from "@/app/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import useFetch from "@/hooks/usefetch";
import { createTransaction,updateTransaction  } from "@/action/transaction";
import { Input } from "@/components/ui/input";
import CreateAccountDrawer from "@/components/create-account-drawer";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { is } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";

import { useEffect } from "react";
import { ReceiptScanner } from "./receiptScanner";

const AddTransactionForm = ({
    accounts,
    categories,
    editMode = false,
    initialData = null,
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit"); 



    const defaultAccountId = accounts.find((ac) => ac.isDefault)?.id || accounts[0]?.id || "";

    const { register, setValue, handleSubmit, formState: { errors }, watch, getValues, reset } = useForm({
        resolver: zodResolver(transactionSchema),
        defaultValues:
            editMode && initialData?{
            type: initialData.type,
            amount: initialData.amount.toString(),
            description: initialData.description,
            accountId: initialData.accountId,
            category: initialData.category,
            date: new Date(initialData.date),
            isRecurring: initialData.isRecurring,
            ...(initialData.recurringInterval && {
              recurringInterval: initialData.recurringInterval,
            }),
          }:



        {
            type: "EXPENSE",
            amount: "0.00",
            description: "",
            date: new Date(),
            accountId: defaultAccountId,
            isRecurring: false,
        }
    });

    const {
        loading: transactionLoading,
        fn: transactionFn,
        data: transactionResult,
    } = useFetch(editMode ? updateTransaction : createTransaction);

    const type = watch("type");
    const isRecurring = watch("isRecurring");
    const date = watch("date");

    const filteredCategories = categories.filter(
        (category) => category.type === type
    );
    const onSubmit = async (data) => {
        const formData = {
            ...data,
            amount: parseFloat(data.amount),
        }

        if (editMode) {
      transactionFn(editId, formData);
    } else {
      transactionFn(formData);
    }
  };


     const handleScanComplete = (scannedData) => {
        // console.log(scannedData);
    if (scannedData) {
      setValue("amount", scannedData.amount.toString());
      setValue("date", new Date(scannedData.date));
      if (scannedData.description) {
        setValue("description", scannedData.description);
      }
      if (scannedData.category) {
        setValue("category", scannedData.category);
      }
      toast.success("Receipt scanned successfully");
    }
  };



    useEffect(() => {
    if (transactionResult?.success && !transactionLoading) {
      toast.success(
        editMode
          ? "Transaction updated successfully"
          : "Transaction created successfully"
      );
      reset();
      router.push(`/account/${transactionResult.data.accountId}`);
    }
  }, [transactionResult, transactionLoading, editMode]);

    return <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>

    {/* Ai receipt scanner */}
    
    {!editMode && <ReceiptScanner onScanComplete={handleScanComplete} />}

        {/* Type */}
        <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select onValueChange={(value) => setValue("type", value)} defaultValue={type}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="select type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
        </div>

        {/* Amount + Account */}
        <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
                {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Account</label>
                <Select onValueChange={(value) => setValue("accountId", value)} defaultValue={getValues("accountId")}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="select Account" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map((ac) => (
                            <SelectItem key={ac.id} value={ac.id}>
                                {ac.name} (${parseFloat(ac.balance).toFixed(2)})
                            </SelectItem>
                        ))}
                        <CreateAccountDrawer>
                            <Button variant="ghost" className="w-full text-left text-sm">
                                Create Account
                            </Button>
                        </CreateAccountDrawer>
                    </SelectContent>
                </Select>
                {errors.accountId && <p className="text-sm text-red-500">{errors.accountId.message}</p>}
            </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select onValueChange={(value) => setValue("category", value)} defaultValue={getValues("category")}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                    {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                            {category.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
        </div>

        {/* Date */}
        <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full pl-3 text-left font-normal">
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => setValue("date", d)}
                        disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input placeholder="Enter Description" {...register("description")} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
        </div>

        {/* Recurring Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
                <label htmlFor="isDefault" className="text-base font-medium">
                    Recurring Transaction
                </label>
                <p className="text-sm text-muted-foreground">
                    Set up a recurring schedule for this transaction
                </p>
            </div>
            <Switch
                checked={isRecurring}
                onCheckedChange={(checked) => setValue("isRecurring", checked)}
            />
        </div>

        {/* Recurring Interval */}
        {isRecurring && (
            <div className="space-y-2">
                <label className="text-sm font-medium">Recurring Interval</label>
                <Select
                    onValueChange={(value) => setValue("recurringInterval", value)}
                    defaultValue={getValues("recurringInterval")}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Interval" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                </Select>
                {errors.recurringInterval && (
                    <p className="text-sm text-red-500">{errors.recurringInterval.message}</p>
                )}
            </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4">
            <Button
                type="button"
                variant="outline"
                className="w-full sm:w-1/2"
                onClick={() => router.back()}
            >
                Cancel
            </Button>
            <Button
                type="submit"
                className="w-full sm:w-1/2"
                disabled={transactionLoading}
            >
                {transactionLoading ? (
            <>
           
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Updating..." : "Creating..."}
            </>
          ) : editMode ? (
            "Update Transaction"
          ) : (
            "Create Transaction"
          )}
            </Button>
        </div>


    </form>

};

export default AddTransactionForm;

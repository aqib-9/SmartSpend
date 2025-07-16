"use client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ChevronDown,
    ChevronUp,
    MoreHorizontal,
    Trash,
    Search,
    X,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Clock,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { categoryColors } from "@/data/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import useFetch from "@/hooks/usefetch";
import { bulkdeletetransactions } from "@/action/accounts";
import { BarLoader } from "react-spinners";
import { toast } from "sonner";

const RECURRING_INTERVALS = {
    DAILY: "Daily",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    YEARLY: "Yearly",
};

function TransactionTable({ transactions }) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState([]);
    const [sortConfig, setSortConfig] = useState({ field: "date", direction: "desc" });
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [recurringFilter, setRecurringFilter] = useState("");

    const {
        loading: deleteLoading,
        fn: deleteFn,
        data: deleted,
    } = useFetch(bulkdeletetransactions);

    const handleBulkDelete = async () => {
        if (
            !window.confirm(
                `Are you sure you want to delete ${selectedIds.length} transactions?`
            )
        ) return;

        await deleteFn(selectedIds);
        router.refresh();
    };

    useEffect(() => {
        if (deleted && !deleteLoading) {
            toast.success("Transactions deleted successfully");
        }
    }, [deleted, deleteLoading]);

    const filterandsortedtransactions = useMemo(() => {
        let result = [...transactions];
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            result = result.filter((transaction) =>
                transaction.description?.toLowerCase().includes(searchLower)
            );
        }
        if (typeFilter) {
            result = result.filter((transaction) => transaction.type === typeFilter);
        }
        if (recurringFilter) {
            result = result.filter((transaction) => {
                if (recurringFilter === "recurring") return transaction.isRecurring;
                return !transaction.isRecurring;
            });
        }
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortConfig.field) {
                case "date":
                    comparison = new Date(a.date) - new Date(b.date);
                    break;
                case "amount":
                    comparison = a.amount - b.amount;
                    break;
                case "category":
                    comparison = a.category.localeCompare(b.category);
                    break;
                default:
                    comparison = 0;
            }
            return sortConfig.direction === "asc" ? comparison : -comparison;
        });
        return result;
    }, [transactions, searchTerm, typeFilter, recurringFilter, sortConfig]);

    // Pagination logic
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filterandsortedtransactions.length / itemsPerPage);

    const visibleTransactions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return filterandsortedtransactions.slice(start, end);
    }, [filterandsortedtransactions, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter, recurringFilter, sortConfig]);

    const handleSort = (field) => {
        setSortConfig((current) => ({
            field,
            direction:
                current.field === field && current.direction === "asc" ? "desc" : "asc",
        }));
    };

    const handleSelect = (id) => {
        setSelectedIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    };

    const handleSelectAll = () => {
        setSelectedIds((current) =>
            current.length === visibleTransactions.length
                ? []
                : visibleTransactions.map((t) => t.id)
        );
    };

    const handleClearFilters = () => {
        setSearchTerm("");
        setTypeFilter("");
        setRecurringFilter("");
        setSelectedIds([]);
    };

    return (
        <div className="space-y-4">
            {deleteLoading && (
                <BarLoader className="mt-4" width={"100%"} color="#9333ea" />
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search Transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="flex gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="INCOME">Income</SelectItem>
                            <SelectItem value="EXPENSE">Expense</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={recurringFilter} onValueChange={setRecurringFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="All Transactions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="recurring">Recurring Only</SelectItem>
                            <SelectItem value="non-recurring">Non-Recurring Only</SelectItem>
                        </SelectContent>
                    </Select>

                    {selectedIds.length > 0 && (
                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                            <Trash className="h-4 w-4 mr-2" />
                            Delete ({selectedIds.length})
                        </Button>
                    )}

                    {(searchTerm || typeFilter || recurringFilter) && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleClearFilters}
                            title="Clear Filters"
                        >
                            <X className="h-4 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Transactions Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    onCheckedChange={handleSelectAll}
                                    checked={
                                        selectedIds.length === visibleTransactions.length &&
                                        visibleTransactions.length > 0
                                    }
                                />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                                <div className="flex items-center">
                                    Date
                                    {sortConfig.field === "date" &&
                                        (sortConfig.direction === "asc" ? (
                                            <ChevronUp className="ml-1 h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="ml-1 h-4 w-4" />
                                        ))}
                                </div>
                            </TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
                                <div className="flex items-center">
                                    Category
                                    {sortConfig.field === "category" &&
                                        (sortConfig.direction === "asc" ? (
                                            <ChevronUp className="ml-1 h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="ml-1 h-4 w-4" />
                                        ))}
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("amount")}>
                                <div className="flex items-center justify-end">
                                    Amount
                                    {sortConfig.field === "amount" &&
                                        (sortConfig.direction === "asc" ? (
                                            <ChevronUp className="ml-1 h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="ml-1 h-4 w-4" />
                                        ))}
                                </div>
                            </TableHead>
                            <TableHead>Recurring</TableHead>
                            <TableHead className="w-[50px]" />
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {visibleTransactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    No results.
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleTransactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell>
                                        <Checkbox
                                            onCheckedChange={() => handleSelect(transaction.id)}
                                            checked={selectedIds.includes(transaction.id)}
                                        />
                                    </TableCell>
                                    <TableCell>{format(new Date(transaction.date), "PP")}</TableCell>
                                    <TableCell>{transaction.description || "N/A"}</TableCell>
                                    <TableCell className="capitalize">
                                        <span
                                            style={{
                                                background: categoryColors[transaction.category],
                                            }}
                                            className="px-2 py-1 rounded text-white text-sm"
                                        >
                                            {transaction.category || "Uncategorized"}
                                        </span>
                                    </TableCell>
                                    <TableCell
                                        className="text-right font-medium"
                                        style={{
                                            color: transaction.type === "EXPENSE" ? "red" : "green",
                                        }}
                                    >
                                        {transaction.type === "EXPENSE" ? "-" : "+"}
                                        ${transaction.amount?.toFixed(2) || "0.00"}
                                    </TableCell>
                                    <TableCell>
                                        {transaction.isRecurring ? (
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Badge
                                                        variant="outline"
                                                        className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200"
                                                    >
                                                        <RefreshCw className="h-3 w-3" />
                                                        {RECURRING_INTERVALS[transaction.recurringInterval]}
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="text-sm">
                                                        <div className="font-medium">Next Date:</div>
                                                        <div>
                                                            {format(
                                                                new Date(transaction.nextRecurringDate),
                                                                "PP"
                                                            )}
                                                        </div>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Badge variant="outline" className="gap-1">
                                                <Clock className="h-3 w-3" />
                                                One-time
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuLabel
                                                    onClick={() =>
                                                        router.push(`/transaction/create?edit=${transaction.id}`)
                                                    }
                                                >
                                                    Edit
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={async () => {
                                                        await deleteFn([transaction.id]);
                                                        router.refresh();
                                                    }}
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Prev
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    );
}

export default TransactionTable;

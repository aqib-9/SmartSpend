import { getTransaction } from "@/action/transaction";
import AddTransactionForm from "../_components/TransactionForm";

const { GetUserAccount } = require("@/action/dashboard");
const { defaultCategories } = require("@/data/categories");

const AddTransaction = async ({ searchParams }) => {
  const accounts = await GetUserAccount();
  const editId = searchParams?.edit;// ✅ FIXED HERE
  let initialData = null;

  if (editId) {
    const transaction = await getTransaction(editId);
    initialData = transaction;
  }

  return (
    <div className="max-w-3xl mx-auto px-5">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title ">
          {editId ? "Edit" : "Add"} Transaction
        </h1>
      </div>
      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        editMode={!!editId}
        initialData={initialData}
      />
    </div>
  );
};

export default AddTransaction;

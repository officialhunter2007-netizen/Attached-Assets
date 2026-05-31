export type LabTab =
  | "equation" | "t-accounts" | "journal" | "cycle"
  | "income-statement" | "balance-sheet" | "cash-flow" | "ratios"
  | "break-even" | "depreciation" | "bank-recon" | "adjusting";

export interface TAccount {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  debits: { amount: number; desc: string }[];
  credits: { amount: number; desc: string }[];
}

export interface LabJournalEntry {
  id: number;
  date: string;
  description: string;
  lines: { accountCode: string; accountName: string; debit: number; credit: number }[];
  isPosted: boolean;
}

export interface IncomeStatementLine {
  label: string;
  amount: number;
  isTotal?: boolean;
  indent?: number;
}

export interface BalanceSheetItem {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity";
  amount: number;
}

export interface CashFlowItem {
  label: string;
  amount: number;
  category: "operating" | "investing" | "financing";
}

export interface DepreciationAsset {
  id: number;
  name: string;
  cost: number;
  salvageValue: number;
  usefulLife: number;
  method: "straight-line" | "declining" | "units";
  unitsTotal?: number;
  unitsUsed?: number;
}

export interface BankReconciliationItem {
  id: number;
  description: string;
  amount: number;
  type: "deposit" | "withdrawal";
  inBank: boolean;
  inBooks: boolean;
}

export interface AdjustingEntry {
  id: number;
  type: "accrual-revenue" | "accrual-expense" | "deferral-revenue" | "deferral-expense" | "depreciation" | "closing";
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  isApplied: boolean;
}

export interface CycleStep {
  id: number;
  name: string;
  description: string;
  isComplete: boolean;
}

export interface TabGroup {
  label: string;
  icon: React.ReactNode;
  tabs: { id: LabTab; label: string; icon: React.ReactNode }[];
}

export type SimTab =
  | "journal" | "accounts" | "invoices" | "inventory"
  | "cheques" | "fixed-assets" | "bank-reconciliation"
  | "cost-centers" | "payroll" | "financial-statements"
  | "trial-balance" | "aging" | "financial-ratios"
  | "budgeting" | "closing" | "multi-currency"
  | "vat" | "audit-trail" | "break-even";

export interface Account {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parent?: string;
  balance: number;
  costCenter?: string;
}

export interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
  costCenter?: string;
}

export interface JournalEntry {
  id: number;
  date: string;
  description: string;
  lines: JournalLine[];
  isPosted: boolean;
  source?: string;
  createdAt: string;
}

export interface InvoiceItem {
  itemName: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
}

export interface Invoice {
  id: number;
  type: "sale" | "purchase";
  date: string;
  counterparty: string;
  items: InvoiceItem[];
  paymentType: "cash" | "credit";
  isPosted: boolean;
  currency: string;
}

export interface InventoryItem {
  code: string;
  name: string;
  unit: string;
  qty: number;
  avgCost: number;
  category: string;
}

export interface InventoryMovement {
  id: number;
  date: string;
  type: "in" | "out" | "transfer";
  itemCode: string;
  qty: number;
  unitCost: number;
  warehouse: string;
  note: string;
}

export interface Cheque {
  id: number;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  type: "received" | "issued";
  counterparty: string;
  status: "pending" | "collected" | "deposited" | "bounced" | "cancelled";
  bankAccount: string;
  note: string;
}

export interface FixedAsset {
  id: number;
  code: string;
  name: string;
  category: string;
  purchaseDate: string;
  cost: number;
  salvageValue: number;
  usefulLifeYears: number;
  depMethod: "straight-line" | "declining" | "units";
  accumulatedDep: number;
  status: "active" | "disposed" | "fully-depreciated";
  depEntries: DepreciationEntry[];
}

export interface DepreciationEntry {
  date: string;
  amount: number;
  accumulated: number;
  bookValue: number;
}

export interface BankStatementLine {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  isReconciled: boolean;
  matchedEntryId?: number;
}

export interface CostCenter {
  code: string;
  name: string;
  budget: number;
  actual: number;
}

export interface Employee {
  id: number;
  name: string;
  position: string;
  department: string;
  baseSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  socialInsurance: number;
  otherDeductions: number;
}

export interface PayrollRun {
  id: number;
  month: number;
  year: number;
  entries: PayrollEntry[];
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  isPosted: boolean;
}

export interface PayrollEntry {
  employeeId: number;
  employeeName: string;
  basic: number;
  allowances: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
}

export interface Currency {
  code: string;
  name: string;
  rate: number;
}

export interface ForexTransaction {
  id: number;
  date: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  rate: number;
  convertedAmount: number;
  gainLoss: number;
}

export interface BudgetLine {
  accountCode: string;
  accountName: string;
  q1Budget: number;
  q2Budget: number;
  q3Budget: number;
  q4Budget: number;
  totalBudget: number;
  actual: number;
  variance: number;
}

export interface VATReturn {
  id: number;
  period: string;
  outputVAT: number;
  inputVAT: number;
  netVAT: number;
  isSubmitted: boolean;
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  action: string;
  module: string;
  description: string;
  user: string;
}

export interface TabGroup {
  label: string;
  icon: React.ReactNode;
  tabs: { id: SimTab; label: string; icon: React.ReactNode }[];
}

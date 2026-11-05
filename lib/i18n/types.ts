/**
 * Elvora Translation Schema Types
 * Defines the contract for all namespaces across supported languages.
 */

export interface CommonDictionary {
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  create: string;
  add: string;
  remove: string;
  search: string;
  filter: string;
  export: string;
  print: string;
  close: string;
  back: string;
  next: string;
  submit: string;
  confirm: string;
  loading: string;
  error: string;
  success: string;
  refresh: string;
  noData: string;
  viewAll: string;
  status: string;
  actions: string;
  active: string;
  inactive: string;
  yes: string;
  no: string;
  optional: string;
  required: string;
  retry: string;
  copy: string;
  copied: string;
  download: string;
  apply: string;
  clear: string;
  select: string;
  all: string;
  details: string;
  view: string;
  more: string;
  less: string;
  na: string;
}

export interface NavigationDictionary {
  dashboard: string;
  pos: string;
  invoices: string;
  inventory: string;
  purchases: string;
  customers: string;
  payments: string;
  expenses: string;
  accounting: string;
  assistant: string;
  analytics: string;
  automations: string;
  reports: string;
  settings: string;
  setup: string;
  signOut: string;
  liveStore: string;
  newBillShortcut: string;
  globalSearchPlaceholder: string;
  menu: string;
  switchStore: string;
  notifications: string;
  partiesKhata: string;
  financeBooks: string;
  smartAssistant: string;
  businessIntelligence: string;
}

export interface AuthDictionary {
  signIn: string;
  signUp: string;
  createAccount: string;
  register: string;
  login: string;
  logout: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  shopName: string;
  gstin: string;
  stateCode: string;
  forgotPassword: string;
  resetPassword: string;
  rememberMe: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
  getStartedFree: string;
  adminApprovalRequired: string;
  adminApprovalPending: string;
  approvalTitle: string;
  approvalDesc: string;
  checkStatus: string;
  backToLogin: string;
  welcomeBack: string;
  sendResetLink: string;
  resetPasswordTitle: string;
  resetSuccess: string;
  loginSubtitle: string;
  registerSubtitle: string;
}

export interface DashboardDictionary {
  overview: string;
  title: string;
  subtitle: string;
  todaysSales: string;
  monthlySales: string;
  grossProfit: string;
  lowStockAlerts: string;
  quickActions: string;
  newInvoice: string;
  addProduct: string;
  viewReports: string;
  recentInvoices: string;
  salesTrend: string;
  topSellingItems: string;
  customerOutstanding: string;
  supplierPayables: string;
  cashInHand: string;
  bankBalance: string;
  viewAllInvoices: string;
  viewAllProducts: string;
  compareLastMonth: string;
  noRecentTransactions: string;
  periodToday: string;
  periodThisMonth: string;
}

export interface BillingDictionary {
  title: string;
  posTitle: string;
  newInvoice: string;
  createInvoice: string;
  invoiceList: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customer: string;
  selectCustomer: string;
  walkInCustomer: string;
  addCustomer: string;
  items: string;
  item: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  gstRate: string;
  cgst: string;
  sgst: string;
  igst: string;
  taxAmount: string;
  subtotal: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  paymentMethod: string;
  cash: string;
  upi: string;
  card: string;
  netBanking: string;
  credit: string;
  paymentStatus: string;
  paid: string;
  unpaid: string;
  partial: string;
  printBill: string;
  downloadPdf: string;
  shareWhatsapp: string;
  voidInvoice: string;
  markAsPaid: string;
  billSavedSuccess: string;
  barcodeScanPlaceholder: string;
  searchProductPlaceholder: string;
  billSummary: string;
  roundOff: string;
  changeDue: string;
  notes: string;
  terms: string;
}

export interface InventoryDictionary {
  title: string;
  subtitle: string;
  products: string;
  addProduct: string;
  editProduct: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  stock: string;
  reorderLevel: string;
  costPrice: string;
  sellingPrice: string;
  mrp: string;
  stockStatus: string;
  inStock: string;
  lowStock: string;
  outOfStock: string;
  totalValuation: string;
  warehouses: string;
  addWarehouse: string;
  transferStock: string;
  stockMovement: string;
  openingStock: string;
  adjustStock: string;
  batchNumber: string;
  expiryDate: string;
  lowStockWarning: string;
  importProducts: string;
  exportInventory: string;
}

export interface AccountingDictionary {
  title: string;
  subtitle: string;
  chartOfAccounts: string;
  journalEntries: string;
  newEntry: string;
  ledger: string;
  profitLoss: string;
  balanceSheet: string;
  trialBalance: string;
  cashBank: string;
  credit: string;
  debit: string;
  balance: string;
  debitTotal: string;
  creditTotal: string;
  netProfit: string;
  netLoss: string;
  revenue: string;
  expenses: string;
  assets: string;
  liabilities: string;
  equity: string;
  accountName: string;
  accountCode: string;
  accountType: string;
  contraEntry: string;
  reconcile: string;
  periodSelection: string;
}

export interface CustomersDictionary {
  title: string;
  subtitle: string;
  customerList: string;
  addCustomer: string;
  customerName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  openingBalance: string;
  currentBalance: string;
  creditLimit: string;
  totalReceivable: string;
  paymentHistory: string;
  addPayment: string;
  recordUdhar: string;
  sendReminder: string;
  statement: string;
  statementPeriod: string;
  collectPayment: string;
  settleKhata: string;
}

export interface SuppliersDictionary {
  title: string;
  subtitle: string;
  supplierList: string;
  addSupplier: string;
  supplierName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  totalPayable: string;
  purchaseOrders: string;
  recordPayment: string;
  supplierKhata: string;
  pendingBills: string;
}

export interface ReportsDictionary {
  title: string;
  subtitle: string;
  salesReport: string;
  purchaseReport: string;
  gstReport: string;
  gstr1: string;
  gstr3b: string;
  profitLossReport: string;
  stockReport: string;
  dateRange: string;
  today: string;
  thisWeek: string;
  thisMonth: string;
  lastMonth: string;
  thisQuarter: string;
  thisYear: string;
  customRange: string;
  generateReport: string;
  exportExcel: string;
  exportPdf: string;
  totalRevenue: string;
  totalTax: string;
  taxableAmount: string;
}

export interface AutomationDictionary {
  title: string;
  subtitle: string;
  rules: string;
  workflows: string;
  createRule: string;
  ruleName: string;
  trigger: string;
  condition: string;
  action: string;
  sendPaymentReminder: string;
  lowStockAlert: string;
  dailyDigest: string;
  recurringInvoice: string;
  statusActive: string;
  statusPaused: string;
  executionLogs: string;
  lastRun: string;
  runNow: string;
  ruleCreatedSuccess: string;
}

export interface AssistantDictionary {
  name: string;
  subtitle: string;
  askElvori: string;
  online: string;
  offline: string;
  newChat: string;
  deleteChat: string;
  clearHistory: string;
  typePlaceholder: string;
  thinking: string;
  suggestFollowUp: string;
  shopNameBadge: string;
  publicModeBadge: string;
  loginRequiredPrompt: string;
  createAccountCta: string;
  loginCta: string;
  retryQuestion: string;
  copyResponse: string;
  helpfulFeedback: string;
  unauthenticatedAlert: string;
  switchLanguage: string;
  welcomePublic: string;
  welcomeAuth: string;
  todaysSalesChip: string;
  monthlyProfitChip: string;
  lowStockChip: string;
  customerUdharChip: string;
  helpSupportChip: string;
}

export interface SettingsDictionary {
  title: string;
  subtitle: string;
  businessProfile: string;
  legalName: string;
  tradeName: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  invoiceSettings: string;
  invoicePrefix: string;
  nextNumber: string;
  defaultNotes: string;
  taxSettings: string;
  enableGst: string;
  userManagement: string;
  addStaff: string;
  role: string;
  owner: string;
  manager: string;
  biller: string;
  accountant: string;
  permissions: string;
  saveSettings: string;
  settingsSaved: string;
  languageSettings: string;
  preferredLanguage: string;
}

export interface SupportDictionary {
  helpCenter: string;
  contactSupport: string;
  userGuides: string;
  posGuide: string;
  gstGuide: string;
  inventoryGuide: string;
  emailSupport: string;
  phoneSupport: string;
  faq: string;
  frequentlyAskedQuestions: string;
}

export interface ValidationDictionary {
  required: string;
  invalidEmail: string;
  minLength: string;
  maxLength: string;
  invalidPhone: string;
  invalidGstin: string;
  invalidNumber: string;
  passwordMismatch: string;
  networkError: string;
  serverError: string;
}

export interface TranslationDictionary {
  common: CommonDictionary;
  navigation: NavigationDictionary;
  auth: AuthDictionary;
  dashboard: DashboardDictionary;
  billing: BillingDictionary;
  inventory: InventoryDictionary;
  accounting: AccountingDictionary;
  customers: CustomersDictionary;
  suppliers: SuppliersDictionary;
  reports: ReportsDictionary;
  automation: AutomationDictionary;
  assistant: AssistantDictionary;
  settings: SettingsDictionary;
  support: SupportDictionary;
  validation: ValidationDictionary;
}

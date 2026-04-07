export type LeadStatus =
  | "new lead"
  | "estimate scheduled"
  | "estimate completed"
  | "quote sent"
  | "approved"
  | "declined"
  | "job scheduled"
  | "completed"
  | "invoiced"
  | "paid";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void";
export type QuoteStatus = "draft" | "sent" | "approved" | "declined" | "completed";

export type PaymentMethod = "cash" | "check" | "venmo" | "zelle" | "other";
export type ExpenseCategory =
  | "materials"
  | "equipment"
  | "fuel"
  | "labor"
  | "marketing"
  | "insurance"
  | "software"
  | "other";
export type TaskStatus = "to_do" | "in_progress" | "waiting_on_customer" | "completed";
export type TaskPriority = "high" | "normal" | "low";

export type EstimateRequest = {
  id: string;
  customerId: string;
  preferredSlot: string;
  jobType: string;
  description: string;
  photos: string[];
  status: LeadStatus;
  createdAt: string;
  serviceAddress: string;
};

export type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  preferredContact: "phone" | "email" | "text";
  notes: string;
  createdAt: string;
  lifecycle: "lead" | "active" | "archived";
};

export type QuoteLineItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

export type Quote = {
  id: string;
  customerId: string;
  estimateRequestId?: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  projectTitle: string;
  scope: string;
  depositType?: "none" | "fixed" | "percent";
  depositAmount: number;
  depositPercent?: number;
  depositRequired: boolean;
  items: QuoteLineItem[];
  total: number;
  terms: string[];
  customerSignature: string;
  customerSignedAt?: string;
  rootedSignature: string;
  rootedSignedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  status: QuoteStatus;
  createdAt: string;
};

export type Job = {
  id: string;
  customerId: string;
  quoteId: string;
  title: string;
  scheduledDate: string;
  status: "scheduled" | "in progress" | "completed";
  notes: string;
};

export type InvoiceLineItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

export type Invoice = {
  id: string;
  customerId: string;
  relatedQuoteId?: string;
  relatedWorkAuthorizationId?: string;
  createdAt: string;
  issuedAt: string;
  dueAt: string;
  quoteId: string;
  jobId?: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  billingAddress: string;
  serviceAddress: string;
  customerPhone: string;
  customerEmail: string;
  projectTitle: string;
  jobDate?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethodNotes: string;
  notes: string;
  paymentInstructions: string[];
  amount: number;
  status: InvoiceStatus;
  paymentNotes: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  note: string;
};

export type Expense = {
  id: string;
  expenseDate: string;
  vendor: string;
  category: ExpenseCategory;
  amount: number;
  note: string;
  linkedJobId?: string;
  receiptName?: string;
  receiptDataUrl?: string;
};

export type AvailabilitySlot = {
  id: string;
  weekday: string;
  isAvailable: boolean;
  start: string;
  end: string;
  label?: string;
};

export type AppNotification = {
  id: string;
  type: "estimate_request";
  title: string;
  message: string;
  createdAt: string;
  estimateRequestId?: string;
  customerId?: string;
  read: boolean;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  relatedLeadId?: string;
  relatedCustomerId?: string;
  relatedJobId?: string;
  relatedQuoteId?: string;
  relatedInvoiceId?: string;
  createdAt: string;
};

export type FeaturedProject = {
  id: string;
  title: string;
  summary: string;
  imageDataUrl?: string;
};

export type SiteContent = {
  businessName: string;
  heroTitle: string;
  heroDescription: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  aboutTitle: string;
  aboutDescription: string;
  serviceArea: string;
  featuredTitle: string;
  featuredIntro: string;
  services: string[];
  featuredProjects: FeaturedProject[];
};

export type AppData = {
  availability: AvailabilitySlot[];
  customers: Customer[];
  estimateRequests: EstimateRequest[];
  notifications: AppNotification[];
  tasks: Task[];
  quotes: Quote[];
  jobs: Job[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  siteContent: SiteContent;
};

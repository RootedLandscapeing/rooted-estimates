"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildHourlyTimeOptions,
  formatAvailabilityRange,
  TIME_FIELD_OPTIONS
} from "@/lib/availability";
import { printInvoicePdf, printQuotePdf } from "@/lib/documents";
import { downloadCsv } from "@/lib/export";
import { getInvoiceStatusLabel } from "@/lib/invoice-helpers";
import { loadSupabaseAppData, saveSupabaseAppData } from "@/lib/supabase/app-data";
import { createSignedReceiptUrl, uploadReceiptFile } from "@/lib/supabase/storage";
import {
  approveQuote,
  completeJobAndCreateInvoice,
  createTask,
  createQuote,
  declineQuote,
  loadAppData,
  markNotificationsRead,
  recordExpense,
  recordPayment,
  saveAppData,
  scheduleEstimate,
  sendQuote,
  startTimeEntry,
  stopTimeEntry,
  updateTask
} from "@/lib/storage";
import {
  AppData,
  AvailabilitySlot,
  ExpenseCategory,
  PaymentMethod,
  QuoteLineItem,
  Task,
  TaskPriority,
  TaskStatus,
  TimeCategory,
  TimeEntry
} from "@/lib/types";

const starterLine: QuoteLineItem = {
  id: "line-starter",
  description: "",
  qty: 1,
  unitPrice: 0,
  amount: 0
};

const LABOR_RATE_PER_PERSON_HOUR = 75;

type AdminSection =
  | "home"
  | "leads"
  | "jobs"
  | "tasks"
  | "time"
  | "customers"
  | "invoices"
  | "landing"
  | "availability"
  | "settings";

const taskStatusLabels: Record<TaskStatus, string> = {
  to_do: "To Do",
  in_progress: "In Progress",
  waiting_on_customer: "Waiting on Customer",
  completed: "Completed"
};

const taskPriorityLabels: Record<TaskPriority, string> = {
  high: "High",
  normal: "Normal",
  low: "Low"
};

const timeCategoryLabels: Record<TimeCategory, string> = {
  on_site_work: "On Site Work",
  travel: "Travel",
  loading_trailer: "Loading Trailer",
  dump_run: "Dump Run",
  getting_materials: "Getting Materials",
  fuel_stop: "Fuel / Gas Stop",
  equipment_maintenance: "Equipment Maintenance",
  estimate_appointment: "Estimate Appointment",
  admin_office: "Admin / Office",
  other: "Other"
};

export function Dashboard() {
  const expenseReceiptInputRef = useRef<HTMLInputElement | null>(null);
  const lastScrollYRef = useRef(0);
  const [data, setData] = useState<AppData | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuButtonVisible, setIsMobileMenuButtonVisible] = useState(true);
  const [quoteSourceMode, setQuoteSourceMode] = useState<"lead" | "customer">("lead");
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [quoteTitle, setQuoteTitle] = useState("");
  const [quoteScope, setQuoteScope] = useState("");
  const [quoteLines, setQuoteLines] = useState<QuoteLineItem[]>([starterLine]);
  const [laborPeople, setLaborPeople] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [depositMode, setDepositMode] = useState<"none" | "amount" | "percent">("none");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositPercent, setDepositPercent] = useState("");
  const [contractorSignature, setContractorSignature] = useState("Rooted Representative");
  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentMode, setPaymentMode] = useState<"full" | "partial">("full");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseVendor, setExpenseVendor] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("materials");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseJobId, setExpenseJobId] = useState("");
  const [expenseReceiptName, setExpenseReceiptName] = useState("");
  const [expenseReceiptDataUrl, setExpenseReceiptDataUrl] = useState("");
  const [expenseReceiptFile, setExpenseReceiptFile] = useState<File | null>(null);
  const [siteServiceInput, setSiteServiceInput] = useState("");
  const [projectTitleInput, setProjectTitleInput] = useState("");
  const [projectSummaryInput, setProjectSummaryInput] = useState("");
  const [projectImageDataUrl, setProjectImageDataUrl] = useState("");
  const [projectImageName, setProjectImageName] = useState("");
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(false);
  const [showPaidInvoices, setShowPaidInvoices] = useState(false);
  const [taskView, setTaskView] = useState<"today" | "week" | "overdue" | "all">("week");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("to_do");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("normal");
  const [taskRelatedCustomerId, setTaskRelatedCustomerId] = useState("");
  const [taskRelatedJobId, setTaskRelatedJobId] = useState("");
  const [scheduleEstimateId, setScheduleEstimateId] = useState("");
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleNote, setScheduleNote] = useState("");
  const [scheduleFeedback, setScheduleFeedback] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [isSendingSchedule, setIsSendingSchedule] = useState(false);
  const [timeEntryCategory, setTimeEntryCategory] = useState<TimeCategory>("on_site_work");
  const [timeEntryNote, setTimeEntryNote] = useState("");
  const [timeEntryCustomerId, setTimeEntryCustomerId] = useState("");
  const [timeEntryJobId, setTimeEntryJobId] = useState("");
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "all">("week");
  const [timeCategoryFilter, setTimeCategoryFilter] = useState<TimeCategory | "all">("all");
  const [timerTick, setTimerTick] = useState(Date.now());

  useEffect(() => {
    const localData = loadAppData();
    setData(localData);

    loadSupabaseAppData(localData)
      .then((supabaseData) => {
        if (!supabaseData) {
          return;
        }

        setData(supabaseData);
        saveAppData(supabaseData);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return;
    }

    setBrowserAlertsEnabled(Notification.permission === "granted");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const isNearTop = currentScrollY < 24;
      const isScrollingUp = currentScrollY < lastScrollYRef.current - 6;
      const isScrollingDown = currentScrollY > lastScrollYRef.current + 6;

      if (isMobileMenuOpen || isNearTop || isScrollingUp) {
        setIsMobileMenuButtonVisible(true);
      } else if (isScrollingDown) {
        setIsMobileMenuButtonVisible(false);
      }

      lastScrollYRef.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobileMenuOpen]);

  const estimateOptions = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.estimateRequests.map((estimate) => {
      const customer = data.customers.find((item) => item.id === estimate.customerId);
      const requestCount = data.estimateRequests.filter(
        (item) => item.customerId === estimate.customerId
      ).length;
      return {
        ...estimate,
        customerName: customer?.fullName ?? "Unknown customer",
        isRepeatCustomer: requestCount > 1,
        requestCount
      };
    });
  }, [data]);

  const quoteEstimateOptions = useMemo(() => {
    if (!data) {
      return [];
    }

    const closedStatuses = new Set(["approved", "declined", "completed", "paid"]);

    return estimateOptions.filter((estimate) => {
      const customer = data.customers.find((item) => item.id === estimate.customerId);
      const alreadyQuoted = data.quotes.some(
        (quote) => quote.estimateRequestId === estimate.id && quote.status !== "declined"
      );

      // Quote creation should only pull from active leads, not customers already moved forward.
      return customer?.lifecycle === "lead" && !alreadyQuoted && !closedStatuses.has(estimate.status);
    });
  }, [data, estimateOptions]);

  useEffect(() => {
    if (!data || !selectedEstimateId || quoteSourceMode !== "lead") {
      return;
    }

    const estimate = data.estimateRequests.find((item) => item.id === selectedEstimateId);
    if (estimate) {
      setQuoteTitle(estimate.jobType);
      setQuoteScope(estimate.description);
    }
  }, [data, quoteSourceMode, selectedEstimateId]);

  useEffect(() => {
    setSelectedEstimateId("");
    setSelectedCustomerId("");
    setQuoteTitle("");
    setQuoteScope("");
  }, [quoteSourceMode]);

  useEffect(() => {
    if (!data || !selectedCustomerId || quoteSourceMode !== "customer") {
      return;
    }

    const customer = data.customers.find((item) => item.id === selectedCustomerId);
    if (customer && !quoteTitle.trim()) {
      setQuoteTitle(`Additional Work for ${customer.fullName}`);
    }
  }, [data, quoteSourceMode, selectedCustomerId, quoteTitle]);

  const leadCustomers = useMemo(
    () => data?.customers.filter((customer) => customer.lifecycle === "lead") ?? [],
    [data]
  );

  const activeCustomers = useMemo(
    () => data?.customers.filter((customer) => customer.lifecycle === "active") ?? [],
    [data]
  );

  const archivedCustomers = useMemo(
    () => data?.customers.filter((customer) => customer.lifecycle === "archived") ?? [],
    [data]
  );

  const quoteCustomers = useMemo(
    () =>
      data?.customers.filter((customer) => customer.lifecycle === "active" || customer.lifecycle === "archived") ??
      [],
    [data]
  );

  const pendingQuoteLeads = useMemo(
    () =>
      quoteEstimateOptions.filter((estimate) =>
        ["new lead", "estimate scheduled", "estimate completed"].includes(estimate.status)
      ),
    [quoteEstimateOptions]
  );

  const quotedLeadHistory = useMemo(
    () =>
      estimateOptions.filter((estimate) =>
        ["quote sent", "approved", "declined", "completed", "paid"].includes(estimate.status)
      ),
    [estimateOptions]
  );

  const totals = useMemo(() => {
    if (!data) {
      return {
        totalLeads: 0,
        activeQuotes: 0,
        completedJobs: 0,
        unpaidInvoices: 0,
        collected: 0,
        expenses: 0
      };
    }

    return {
      totalLeads: data.estimateRequests.length,
      needsQuote: data.estimateRequests.filter((request) =>
        ["new lead", "estimate scheduled", "estimate completed"].includes(request.status)
      ).filter((request) =>
        !data.quotes.some((quote) => quote.estimateRequestId === request.id && quote.status !== "declined")
      ).length,
      activeQuotes: data.quotes.filter((quote) => quote.status === "sent").length,
      completedJobs: data.jobs.filter((job) => job.status === "completed").length,
      unpaidInvoices: data.invoices.filter((invoice) => invoice.status !== "paid").length,
      collected: data.payments.reduce((sum, payment) => sum + payment.amount, 0),
      expenses: data.expenses.reduce((sum, expense) => sum + expense.amount, 0)
    };
  }, [data]);

  const unreadNotifications = useMemo(
    () => data?.notifications.filter((notification) => !notification.read) ?? [],
    [data]
  );

  const activeInvoices = useMemo(
    () => data?.invoices.filter((invoice) => invoice.status !== "paid") ?? [],
    [data]
  );

  const paidInvoices = useMemo(
    () => data?.invoices.filter((invoice) => invoice.status === "paid") ?? [],
    [data]
  );

  const taskBuckets = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekEndDate = new Date();
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    const weekEnd = weekEndDate.toISOString().slice(0, 10);
    const openTasks = data?.tasks.filter((task) => task.status !== "completed") ?? [];

    return {
      today: openTasks.filter((task) => task.dueDate === today),
      week: openTasks.filter((task) => task.dueDate >= today && task.dueDate <= weekEnd),
      overdue: openTasks.filter((task) => task.dueDate < today),
      all: data?.tasks ?? []
    };
  }, [data]);

  const visibleTasks = taskBuckets[taskView];

  const runningTimeEntry = useMemo(
    () => data?.timeEntries.find((entry) => entry.isRunning),
    [data]
  );

  useEffect(() => {
    if (!runningTimeEntry) {
      return;
    }

    const interval = window.setInterval(() => setTimerTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [runningTimeEntry]);

  const filteredTimeEntries = useMemo(() => {
    if (!data) {
      return [];
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - 1);

    return data.timeEntries.filter((entry) => {
      if (timeCategoryFilter !== "all" && entry.category !== timeCategoryFilter) {
        return false;
      }

      const entryDate = new Date(`${entry.entryDate}T00:00:00`);
      if (timeFilter === "week") {
        return entryDate >= weekStart;
      }
      if (timeFilter === "month") {
        return entryDate >= monthStart;
      }

      return true;
    });
  }, [data, timeCategoryFilter, timeFilter]);

  const timeSummaryByCategory = useMemo(() => {
    const totals = new Map<TimeCategory, number>();

    filteredTimeEntries.forEach((entry) => {
      const existingMinutes = totals.get(entry.category) ?? 0;
      const runningMinutes =
        entry.isRunning && entry.startedAt
          ? Math.max(1, Math.round((timerTick - new Date(entry.startedAt).getTime()) / 60000))
          : entry.minutes;
      totals.set(entry.category, existingMinutes + runningMinutes);
    });

    return Array.from(totals.entries())
      .map(([category, minutes]) => ({ category, minutes }))
      .sort((left, right) => right.minutes - left.minutes);
  }, [filteredTimeEntries, timerTick]);

  useEffect(() => {
    if (!browserAlertsEnabled || typeof window === "undefined" || typeof Notification === "undefined") {
      return;
    }

    unreadNotifications.forEach((notification) => {
      const browserNotificationKey = `browser-alert-${notification.id}`;
      if (window.sessionStorage.getItem(browserNotificationKey)) {
        return;
      }

      new Notification(notification.title, {
        body: notification.message
      });
      window.sessionStorage.setItem(browserNotificationKey, "shown");
    });
  }, [browserAlertsEnabled, unreadNotifications]);

  if (!data) {
    return <section className="panel">Loading dashboard...</section>;
  }

  function persist(nextData: AppData) {
    setData(nextData);
    saveAppData(nextData);
    saveSupabaseAppData(nextData).catch((error) => {
      console.error(error);
    });
  }

  async function enableBrowserAlerts() {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return;
    }

    const result = await Notification.requestPermission();
    setBrowserAlertsEnabled(result === "granted");
  }

  function markAllNotificationsSeen() {
    if (!data || !unreadNotifications.length) {
      return;
    }

    persist(markNotificationsRead(data, unreadNotifications.map((notification) => notification.id)));
  }

  function isTaskOverdue(task: Task) {
    return task.status !== "completed" && task.dueDate < new Date().toISOString().slice(0, 10);
  }

  function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !taskTitle.trim()) {
      return;
    }

    persist(
      createTask(data, {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        dueDate: taskDueDate,
        status: taskStatus,
        priority: taskPriority,
        relatedCustomerId: taskRelatedCustomerId || undefined,
        relatedJobId: taskRelatedJobId || undefined
      })
    );
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate(new Date().toISOString().slice(0, 10));
    setTaskStatus("to_do");
    setTaskPriority("normal");
    setTaskRelatedCustomerId("");
    setTaskRelatedJobId("");
  }

  function updateTaskStatus(taskId: string, status: TaskStatus) {
    if (!data) {
      return;
    }

    persist(updateTask(data, taskId, { status }));
  }

  function getTaskRelationText(task: Task) {
    if (!data) {
      return "";
    }

    const customer = data.customers.find((item) => item.id === task.relatedCustomerId);
    const job = data.jobs.find((item) => item.id === task.relatedJobId);
    const estimate = data.estimateRequests.find((item) => item.id === task.relatedLeadId);
    const invoice = data.invoices.find((item) => item.id === task.relatedInvoiceId);

    return [
      customer ? `Customer: ${customer.fullName}` : "",
      job ? `Job: ${job.title}` : "",
      estimate ? `Lead: ${estimate.jobType}` : "",
      invoice ? `Invoice: ${invoice.id}` : ""
    ].filter(Boolean).join(" • ");
  }

  function updateLine(index: number, field: keyof QuoteLineItem, value: string) {
    setQuoteLines((current) =>
      current.map((line, currentIndex) => {
        if (currentIndex !== index) {
          return line;
        }

        if (field === "description") {
          return { ...line, description: value };
        }

        const numericValue = Number(value);
        const next = {
          ...line,
          [field]: numericValue
        } as QuoteLineItem;
        return {
          ...next,
          amount: (field === "qty" ? numericValue : next.qty) * (field === "unitPrice" ? numericValue : next.unitPrice)
        };
      })
    );
  }

  function addLine() {
    setQuoteLines((current) => [
      ...current,
      {
        id: `line-${current.length + 1}`,
        description: "",
        qty: 1,
        unitPrice: 0,
        amount: 0
      }
    ]);
  }

  function handleCreateQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) {
      return;
    }

    const estimate =
      quoteSourceMode === "lead"
        ? data.estimateRequests.find((item) => item.id === selectedEstimateId)
        : undefined;
    const customer =
      quoteSourceMode === "lead"
        ? estimate
          ? data.customers.find((item) => item.id === estimate.customerId)
          : undefined
        : data.customers.find((item) => item.id === selectedCustomerId);

    if (!customer) {
      return;
    }

    const laborPersonCount = Number(laborPeople || 0);
    const laborHourCount = Number(laborHours || 0);
    const laborAmount = laborPersonCount * laborHourCount * LABOR_RATE_PER_PERSON_HOUR;
    const laborLine =
      laborAmount > 0
        ? {
            id: `line-labor-${Date.now()}`,
            description: `Labor (${laborPersonCount} ${laborPersonCount === 1 ? "person" : "people"} x ${laborHourCount} ${laborHourCount === 1 ? "hour" : "hours"} @ $${LABOR_RATE_PER_PERSON_HOUR}/hr)`,
            qty: laborPersonCount * laborHourCount,
            unitPrice: LABOR_RATE_PER_PERSON_HOUR,
            amount: laborAmount
          }
        : null;
    const lineItems = [
      ...(laborLine ? [laborLine] : []),
      ...quoteLines.filter((line) => line.description.trim().length > 0)
    ];
    if (!lineItems.length) {
      return;
    }

    const nextData = createQuote(data, {
      customerId: customer.id,
      estimateRequestId: estimate?.id,
      customerName: customer.fullName,
      customerAddress: customer.address,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      projectTitle: quoteTitle || estimate?.jobType || "Additional Work",
      scope: quoteScope || estimate?.description || "",
      items: lineItems,
      depositType:
        depositMode === "none"
          ? "none"
          : depositMode === "percent"
            ? "percent"
            : "fixed",
      depositAmount:
        depositMode === "amount"
          ? Number(depositAmount || 0)
          : depositMode === "percent"
            ? (lineItems.reduce((sum, item) => sum + item.amount, 0) * Number(depositPercent || 0)) / 100
            : 0,
      depositPercent: depositMode === "percent" ? Number(depositPercent || 0) : 0,
      depositRequired:
        depositMode === "amount"
          ? Number(depositAmount || 0) > 0
          : depositMode === "percent"
            ? Number(depositPercent || 0) > 0
            : false,
      rootedSignature: contractorSignature
    });

    persist(nextData);
    setQuoteSourceMode("lead");
    setQuoteTitle("");
    setQuoteScope("");
    setSelectedEstimateId("");
    setSelectedCustomerId("");
    setQuoteLines([starterLine]);
    setLaborPeople("");
    setLaborHours("");
    setDepositMode("none");
    setDepositAmount("");
    setDepositPercent("");
    setContractorSignature("Rooted Representative");
  }

  async function handleScheduleEstimate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !scheduleEstimateId || !scheduleDate || !scheduleTime) {
      return;
    }

    const estimate = data.estimateRequests.find((item) => item.id === scheduleEstimateId);
    const customer = estimate
      ? data.customers.find((item) => item.id === estimate.customerId)
      : undefined;

    if (!estimate || !customer) {
      return;
    }

    setScheduleFeedback("");
    setScheduleError("");
    setIsSendingSchedule(true);

    const nextData = scheduleEstimate(data, {
      estimateRequestId: scheduleEstimateId,
      estimateDate: scheduleDate,
      estimateTime: scheduleTime,
      note: scheduleNote
    });

    persist(nextData);

    try {
      const response = await fetch("/api/schedule-estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerName: customer.fullName,
          customerEmail: customer.email,
          estimateDate: scheduleDate,
          estimateTime: scheduleTime,
          projectTitle: estimate.jobType,
          note: scheduleNote
        })
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setScheduleError(result?.error ?? "The estimate was scheduled, but the email could not be sent.");
      } else {
        setScheduleFeedback(`Estimate email sent to ${customer.fullName}.`);
      }
    } catch (error) {
      console.error(error);
      setScheduleError("The estimate was scheduled, but the email could not be sent.");
    } finally {
      setIsSendingSchedule(false);
      setScheduleEstimateId("");
      setScheduleDate(new Date().toISOString().slice(0, 10));
      setScheduleTime("09:00");
      setScheduleNote("");
    }
  }

  function handleRecordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) {
      return;
    }

    if (!paymentInvoiceId) {
      return;
    }

    const invoice = data.invoices.find((item) => item.id === paymentInvoiceId);
    if (!invoice) {
      return;
    }

    const amountToRecord =
      paymentMode === "full" ? invoice.balanceDue : Number(paymentAmount || 0);

    if (!amountToRecord || amountToRecord <= 0) {
      return;
    }

    const nextData = recordPayment(data, {
      invoiceId: paymentInvoiceId,
      amount: amountToRecord,
      method: paymentMethod,
      note: paymentNote || (paymentMode === "full" ? "Marked paid in full" : "Partial payment")
    });

    persist(nextData);
    setPaymentAmount("");
    setPaymentInvoiceId("");
    setPaymentMethod("cash");
    setPaymentNote("");
    setPaymentMode("full");
  }

  function handleReceiptUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setExpenseReceiptName("");
      setExpenseReceiptDataUrl("");
      setExpenseReceiptFile(null);
      return;
    }

    setExpenseReceiptName(file.name);
    setExpenseReceiptDataUrl("");
    setExpenseReceiptFile(file);
  }

  async function handleRecordExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !expenseVendor || !expenseAmount) {
      return;
    }

    let receiptName = expenseReceiptName || undefined;
    let receiptDataUrl = expenseReceiptDataUrl || undefined;

    if (expenseReceiptFile) {
      try {
        const uploadedReceipt = await uploadReceiptFile(expenseReceiptFile);
        receiptName = uploadedReceipt.fileName;
        receiptDataUrl = uploadedReceipt.filePath;
      } catch (error) {
        console.error(error);
      }
    }

    const nextData = recordExpense(data, {
      expenseDate,
      vendor: expenseVendor,
      category: expenseCategory,
      amount: Number(expenseAmount),
      note: expenseNote,
      linkedJobId: expenseJobId || undefined,
      receiptName,
      receiptDataUrl
    });

    persist(nextData);
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setExpenseVendor("");
    setExpenseCategory("materials");
    setExpenseAmount("");
    setExpenseNote("");
    setExpenseJobId("");
    setExpenseReceiptName("");
    setExpenseReceiptDataUrl("");
    setExpenseReceiptFile(null);
    if (expenseReceiptInputRef.current) {
      expenseReceiptInputRef.current.value = "";
    }
  }

  async function openReceipt(receiptReference: string) {
    if (!receiptReference) {
      return;
    }

    if (receiptReference.startsWith("data:") || receiptReference.startsWith("http")) {
      window.open(receiptReference, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const signedUrl = await createSignedReceiptUrl(receiptReference);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
    }
  }

  function updateSiteContentField<
    K extends keyof AppData["siteContent"]
  >(key: K, value: AppData["siteContent"][K]) {
    if (!data) {
      return;
    }

    persist({
      ...data,
      siteContent: {
        ...data.siteContent,
        [key]: value
      }
    });
  }

  function addService() {
    if (!data || !siteServiceInput.trim()) {
      return;
    }

    updateSiteContentField("services", [...data.siteContent.services, siteServiceInput.trim()]);
    setSiteServiceInput("");
  }

  function removeService(service: string) {
    if (!data) {
      return;
    }

    updateSiteContentField(
      "services",
      data.siteContent.services.filter((item) => item !== service)
    );
  }

  function addFeaturedProject() {
    if (!data || !projectTitleInput.trim() || !projectSummaryInput.trim()) {
      return;
    }

    updateSiteContentField("featuredProjects", [
      ...data.siteContent.featuredProjects,
      {
        id: `project-${Date.now()}`,
        title: projectTitleInput.trim(),
        summary: projectSummaryInput.trim(),
        imageDataUrl: projectImageDataUrl || undefined
      }
    ]);
    setProjectTitleInput("");
    setProjectSummaryInput("");
    setProjectImageDataUrl("");
    setProjectImageName("");
  }

  function removeFeaturedProject(projectId: string) {
    if (!data) {
      return;
    }

    updateSiteContentField(
      "featuredProjects",
      data.siteContent.featuredProjects.filter((project) => project.id !== projectId)
    );
  }

  function handleProjectImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setProjectImageDataUrl("");
      setProjectImageName("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProjectImageDataUrl(reader.result);
        setProjectImageName(file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  function updateAvailabilitySlot(weekday: string, updates: Partial<AvailabilitySlot>) {
    if (!data) {
      return;
    }

    const nextData = {
      ...data,
      availability: data.availability.map((slot) =>
        slot.weekday === weekday ? { ...slot, ...updates } : slot
      )
    };
    persist(nextData);
  }

  function handleStartTimeEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || runningTimeEntry) {
      return;
    }

    persist(
      startTimeEntry(data, {
        category: timeEntryCategory,
        note: timeEntryNote,
        customerId: timeEntryCustomerId || undefined,
        jobId: timeEntryJobId || undefined
      })
    );
    setTimeEntryNote("");
    setTimeEntryCustomerId("");
    setTimeEntryJobId("");
  }

  function handleStopTimeEntry() {
    if (!data || !runningTimeEntry) {
      return;
    }

    persist(stopTimeEntry(data, runningTimeEntry.id));
  }

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  }

  function chooseAdminSection(section: AdminSection) {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
  }

  const navItems: Array<{ id: AdminSection; label: string; count?: number }> = [
    { id: "home", label: "Dashboard" },
    { id: "leads", label: "Leads / Estimates", count: pendingQuoteLeads.length },
    { id: "jobs", label: "Jobs / Projects", count: data.jobs.length },
    { id: "tasks", label: "Tasks / Reminders", count: taskBuckets.overdue.length + taskBuckets.today.length },
    { id: "time", label: "Time Clock", count: data.timeEntries.filter((entry) => entry.isRunning).length },
    { id: "customers", label: "Customers", count: activeCustomers.length },
    { id: "invoices", label: "Invoices / Payments", count: activeInvoices.length },
    { id: "landing", label: "Edit Landing Page" },
    { id: "availability", label: "Estimate Availability" },
    { id: "settings", label: "Settings / Records" }
  ];

  return (
    <div className="admin-layout">
      <button
        type="button"
        className={`mobile-menu-toggle ${isMobileMenuOpen ? "open" : ""} ${
          isMobileMenuButtonVisible ? "visible" : "hidden"
        }`}
        aria-controls="admin-mobile-menu"
        aria-expanded={isMobileMenuOpen}
        aria-label={isMobileMenuOpen ? "Close admin menu" : "Open admin menu"}
        onClick={() => setIsMobileMenuOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>
      {isMobileMenuOpen ? (
        <button
          type="button"
          className="mobile-menu-scrim"
          aria-label="Close admin menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      ) : null}

      <aside
        id="admin-mobile-menu"
        className={`admin-sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}
      >
        <p className="eyebrow">Admin Menu</p>
        <nav className="sidebar-nav" aria-label="Dashboard sections">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeSection === item.id ? "sidebar-nav-item active" : "sidebar-nav-item"}
              onClick={() => chooseAdminSection(item.id)}
            >
              <span>{item.label}</span>
              {typeof item.count === "number" ? <strong>{item.count}</strong> : null}
            </button>
          ))}
        </nav>
      </aside>

      <div className="dashboard-grid admin-content" data-active-section={activeSection}>
      <section className="panel quick-actions-panel dashboard-section" data-admin-section="home">
        <div className="section-heading">
          <p className="eyebrow">Quick Actions</p>
          <h2>Jump straight to the next business task.</h2>
        </div>
        <div className="quick-actions-grid">
          <button
            type="button"
            className="action-tile action-tile-button"
            onClick={() => chooseAdminSection("leads")}
          >
            <strong>Create Quote</strong>
            <span>Price a lead and send the agreement.</span>
          </button>
          <button
            type="button"
            className="action-tile action-tile-button"
            onClick={() => chooseAdminSection("leads")}
          >
            <strong>Review Quotes</strong>
            <span>Approve, deny, or print the customer copy.</span>
          </button>
          <button
            type="button"
            className="action-tile action-tile-button"
            onClick={() => chooseAdminSection("invoices")}
          >
            <strong>Record Payment</strong>
            <span>Update invoices and move jobs into history.</span>
          </button>
          <button
            type="button"
            className="action-tile action-tile-button"
            onClick={() => chooseAdminSection("settings")}
          >
            <strong>Log Expense</strong>
            <span>Track receipts and tax-season costs quickly.</span>
          </button>
        </div>
      </section>

      <section className="panel dashboard-section" data-admin-section="home">
        <div className="section-heading">
          <p className="eyebrow">Notifications</p>
          <h2>See new estimate requests as they come in.</h2>
        </div>
        <div className="sticky-actions">
          <div>
            <strong>{unreadNotifications.length} unread notifications</strong>
            <p className="hero-card-copy">
              New estimate requests appear here and can also trigger a browser alert while the dashboard is open.
            </p>
          </div>
          <div className="inline-actions">
            {!browserAlertsEnabled ? (
              <button type="button" className="button-secondary" onClick={enableBrowserAlerts}>
                Enable Browser Alerts
              </button>
            ) : (
              <span className="pill accent-pill">Browser alerts on</span>
            )}
            <button
              type="button"
              className="button-inline"
              onClick={markAllNotificationsSeen}
              disabled={!unreadNotifications.length}
            >
              Mark All Read
            </button>
          </div>
        </div>
        <div className="stack top-gap">
          {data.notifications.map((notification) => (
            <article key={notification.id} className="list-card">
              <div>
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                <small>{new Date(notification.createdAt).toLocaleString()}</small>
              </div>
              <span className={`pill ${notification.read ? "" : "accent-pill"}`}>
                {notification.read ? "read" : "new"}
              </span>
            </article>
          ))}
          {!data.notifications.length ? (
            <p className="empty-state">New estimate request notifications will show up here.</p>
          ) : null}
        </div>
      </section>

        <section className="panel dashboard-section" data-admin-section="landing" id="site-content">
        <div className="section-heading">
          <p className="eyebrow">Website Content</p>
          <h2>Update the public landing page as the business grows.</h2>
        </div>
        <div className="form-grid">
          <label className="full-width">
            Business name
            <input
              value={data.siteContent.businessName}
              onChange={(event) => updateSiteContentField("businessName", event.target.value)}
            />
          </label>
          <label className="full-width">
            Hero title
            <input
              value={data.siteContent.heroTitle}
              onChange={(event) => updateSiteContentField("heroTitle", event.target.value)}
            />
          </label>
          <label className="full-width">
            Hero description
            <textarea
              rows={3}
              value={data.siteContent.heroDescription}
              onChange={(event) => updateSiteContentField("heroDescription", event.target.value)}
            />
          </label>
          <label>
            Primary CTA label
            <input
              value={data.siteContent.primaryCtaLabel}
              onChange={(event) => updateSiteContentField("primaryCtaLabel", event.target.value)}
            />
          </label>
          <label>
            Secondary CTA label
            <input
              value={data.siteContent.secondaryCtaLabel}
              onChange={(event) =>
                updateSiteContentField("secondaryCtaLabel", event.target.value)
              }
            />
          </label>
          <label className="full-width">
            About title
            <input
              value={data.siteContent.aboutTitle}
              onChange={(event) => updateSiteContentField("aboutTitle", event.target.value)}
            />
          </label>
          <label className="full-width">
            About description
            <textarea
              rows={4}
              value={data.siteContent.aboutDescription}
              onChange={(event) => updateSiteContentField("aboutDescription", event.target.value)}
            />
          </label>
          <label className="full-width">
            Service area
            <input
              value={data.siteContent.serviceArea}
              onChange={(event) => updateSiteContentField("serviceArea", event.target.value)}
            />
          </label>
          <label className="full-width">
            Featured section title
            <input
              value={data.siteContent.featuredTitle}
              onChange={(event) => updateSiteContentField("featuredTitle", event.target.value)}
            />
          </label>
          <label className="full-width">
            Featured section intro
            <textarea
              rows={3}
              value={data.siteContent.featuredIntro}
              onChange={(event) => updateSiteContentField("featuredIntro", event.target.value)}
            />
          </label>
        </div>

        <div className="editor-grid top-gap">
          <div className="editor-panel">
            <div className="section-heading">
              <p className="eyebrow">Services</p>
              <h2>List what Rooted offers.</h2>
            </div>
            <div className="chip-list">
              {data.siteContent.services.map((service) => (
                <div key={service} className="editable-chip">
                  <span>{service}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => removeService(service)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="inline-actions top-gap">
              <input
                value={siteServiceInput}
                onChange={(event) => setSiteServiceInput(event.target.value)}
                placeholder="Add a service"
              />
              <button type="button" className="button-primary" onClick={addService}>
                Add Service
              </button>
            </div>
          </div>

          <div className="editor-panel">
            <div className="section-heading">
              <p className="eyebrow">Featured Jobs</p>
              <h2>Show finished or example work on the landing page.</h2>
            </div>
            <div className="project-stack">
              {data.siteContent.featuredProjects.map((project) => (
                <article key={project.id} className="project-card dashboard-project-card">
                  <strong>{project.title}</strong>
                  <p>{project.summary}</p>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => removeFeaturedProject(project.id)}
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
            <div className="form-grid top-gap">
              <label className="full-width">
                Project title
                <input
                  value={projectTitleInput}
                  onChange={(event) => setProjectTitleInput(event.target.value)}
                />
              </label>
              <label className="full-width">
                Project summary
                <textarea
                  rows={3}
                  value={projectSummaryInput}
                  onChange={(event) => setProjectSummaryInput(event.target.value)}
                />
              </label>
              <label className="full-width">
                Project photo
                <input type="file" accept="image/*" onChange={handleProjectImageUpload} />
              </label>
              {projectImageName ? (
                <div className="full-width upload-note">Attached project photo: {projectImageName}</div>
              ) : null}
              <div className="full-width form-actions">
                <button type="button" className="button-primary" onClick={addFeaturedProject}>
                  Add Featured Job
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

        <section className="panel dashboard-section" data-admin-section="availability" id="availability-settings">
          <div className="section-heading">
            <p className="eyebrow">Estimate Availability</p>
            <h2>Set the days and hours customers can request estimates.</h2>
          </div>
          <div className="availability-grid">
            {data.availability.map((slot) => {
              const hourlyOptions = buildHourlyTimeOptions(slot);

              return (
                <article key={slot.id} className="availability-card availability-editor-card">
                  <div className="availability-card-head">
                    <div>
                      <strong>{slot.weekday}</strong>
                      <p className="availability-range">
                        {slot.isAvailable
                          ? formatAvailabilityRange(slot.start, slot.end)
                          : "Unavailable"}
                      </p>
                    </div>
                    <span className={`pill ${slot.isAvailable ? "accent-pill" : ""}`}>
                      {slot.isAvailable ? `${hourlyOptions.length} time options` : "Unavailable"}
                    </span>
                  </div>

                  <label>
                    Availability
                    <select
                      value={slot.isAvailable ? "available" : "unavailable"}
                      onChange={(event) =>
                        updateAvailabilitySlot(slot.weekday, {
                          isAvailable: event.target.value === "available"
                        })
                      }
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </label>

                  {slot.isAvailable ? (
                    <div className="availability-time-grid">
                      <label>
                        Start time
                        <select
                          value={slot.start}
                          onChange={(event) =>
                            updateAvailabilitySlot(slot.weekday, { start: event.target.value })
                          }
                        >
                          {TIME_FIELD_OPTIONS.map((option) => (
                            <option key={`${slot.weekday}-start-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        End time
                        <select
                          value={slot.end}
                          onChange={(event) =>
                            updateAvailabilitySlot(slot.weekday, { end: event.target.value })
                          }
                        >
                          {TIME_FIELD_OPTIONS.map((option) => (
                            <option key={`${slot.weekday}-end-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}

                  <p className="status-note">
                    {slot.isAvailable
                      ? hourlyOptions.length
                        ? `Customers can choose hourly estimate times on ${slot.weekday}.`
                        : "Set the end time later than the start time to create hourly options."
                      : `Customers will not see ${slot.weekday} as a booking option.`}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

      <section className="panel summary-grid dashboard-section" data-admin-section="home">
        <button type="button" className="summary-card summary-card-button" onClick={() => chooseAdminSection("leads")}>
          <span>New estimate requests</span>
          <strong>{totals.totalLeads}</strong>
        </button>
        <button type="button" className="summary-card summary-card-button" onClick={() => chooseAdminSection("leads")}>
          <span>Needs quote</span>
          <strong>{totals.needsQuote}</strong>
        </button>
        <button type="button" className="summary-card summary-card-button" onClick={() => chooseAdminSection("jobs")}>
          <span>Active jobs</span>
          <strong>{data.jobs.filter((job) => job.status !== "completed").length}</strong>
        </button>
        <button type="button" className="summary-card summary-card-button" onClick={() => chooseAdminSection("invoices")}>
          <span>Unpaid invoices</span>
          <strong>{totals.unpaidInvoices}</strong>
        </button>
        <button type="button" className="summary-card summary-card-button attention" onClick={() => chooseAdminSection("tasks")}>
          <span>Overdue tasks</span>
          <strong>{taskBuckets.overdue.length}</strong>
        </button>
        <button type="button" className="summary-card summary-card-button accent" onClick={() => chooseAdminSection("tasks")}>
          <span>Tasks due this week</span>
          <strong>{taskBuckets.week.length}</strong>
        </button>
        <button type="button" className="summary-card summary-card-button" onClick={() => chooseAdminSection("time")}>
          <span>Time logged</span>
          <strong>{formatMinutes(filteredTimeEntries.reduce((sum, entry) => sum + entry.minutes, 0))}</strong>
        </button>
      </section>

      <section className="panel dashboard-section" data-admin-section="tasks">
        <div className="section-heading">
          <p className="eyebrow">Tasks and Reminders</p>
          <h2>Keep follow-ups, estimate reminders, and payment checks in one place.</h2>
        </div>

        <div className="task-filter-row" aria-label="Task views">
          {[
            { id: "today", label: "Today", count: taskBuckets.today.length },
            { id: "week", label: "This Week", count: taskBuckets.week.length },
            { id: "overdue", label: "Overdue", count: taskBuckets.overdue.length },
            { id: "all", label: "All Tasks", count: taskBuckets.all.length }
          ].map((view) => (
            <button
              key={view.id}
              type="button"
              className={taskView === view.id ? "task-filter active" : "task-filter"}
              onClick={() => setTaskView(view.id as typeof taskView)}
            >
              {view.label}
              <span>{view.count}</span>
            </button>
          ))}
        </div>

        <div className="stack top-gap">
          {visibleTasks.map((task) => {
            const relationText = getTaskRelationText(task);

            return (
              <article
                key={task.id}
                className={isTaskOverdue(task) ? "task-card overdue" : "task-card"}
              >
                <div className="card-copy">
                  <div className="task-title-row">
                    <h3>{task.title}</h3>
                    <span className={`priority-pill ${task.priority}`}>
                      {taskPriorityLabels[task.priority]}
                    </span>
                  </div>
                  <p>{task.description || "No notes added."}</p>
                  <div className="timestamp-list">
                    <span>Due {task.dueDate}</span>
                    <span>Created {task.createdAt}</span>
                    {relationText ? <span>{relationText}</span> : null}
                  </div>
                </div>
                <div className="action-stack">
                  <span className={`pill ${task.status === "completed" ? "accent-pill" : ""}`}>
                    {taskStatusLabels[task.status]}
                  </span>
                  <select
                    value={task.status}
                    onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}
                    aria-label={`Update ${task.title} status`}
                  >
                    {Object.entries(taskStatusLabels).map(([status, label]) => (
                      <option key={status} value={status}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            );
          })}
          {!visibleTasks.length ? (
            <p className="empty-state">No tasks in this view yet.</p>
          ) : null}
        </div>

        <form className="form-grid top-gap" onSubmit={handleCreateTask}>
          <label className="full-width">
            Task title
            <input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Follow up on estimate, check payment, schedule materials..."
              required
            />
          </label>
          <label className="full-width">
            Notes
            <textarea
              rows={3}
              value={taskDescription}
              onChange={(event) => setTaskDescription(event.target.value)}
              placeholder="Add the reminder details."
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              value={taskDueDate}
              onChange={(event) => setTaskDueDate(event.target.value)}
              required
            />
          </label>
          <label>
            Status
            <select
              value={taskStatus}
              onChange={(event) => setTaskStatus(event.target.value as TaskStatus)}
            >
              {Object.entries(taskStatusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={taskPriority}
              onChange={(event) => setTaskPriority(event.target.value as TaskPriority)}
            >
              {Object.entries(taskPriorityLabels).map(([priority, label]) => (
                <option key={priority} value={priority}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Related customer
            <select
              value={taskRelatedCustomerId}
              onChange={(event) => setTaskRelatedCustomerId(event.target.value)}
            >
              <option value="">No customer linked</option>
              {data.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Related job
            <select
              value={taskRelatedJobId}
              onChange={(event) => setTaskRelatedJobId(event.target.value)}
            >
              <option value="">No job linked</option>
              {data.jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
          <div className="full-width form-actions">
            <button type="submit" className="button-primary">
              Add Task
            </button>
          </div>
        </form>
      </section>

      <section className="panel dashboard-section" data-admin-section="time">
        <div className="section-heading">
          <p className="eyebrow">Time Clock</p>
          <h2>Track where the day goes so pricing and operations get sharper over time.</h2>
        </div>

        {runningTimeEntry ? (
          <div className="sticky-actions">
            <div>
              <strong>
                Running: {timeCategoryLabels[runningTimeEntry.category]} •{" "}
                {formatMinutes(
                  Math.max(
                    1,
                    Math.round((timerTick - new Date(runningTimeEntry.startedAt ?? Date.now()).getTime()) / 60000)
                  )
                )}
              </strong>
              <p className="hero-card-copy">
                {runningTimeEntry.note || "No note added."}
              </p>
            </div>
            <div className="inline-actions">
              <button type="button" className="button-primary" onClick={handleStopTimeEntry}>
                Stop Timer
              </button>
            </div>
          </div>
        ) : null}

        <form className="form-grid top-gap" onSubmit={handleStartTimeEntry}>
          <label>
            Category
            <select
              value={timeEntryCategory}
              onChange={(event) => setTimeEntryCategory(event.target.value as TimeCategory)}
            >
              {Object.entries(timeCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Customer
            <select
              value={timeEntryCustomerId}
              onChange={(event) => setTimeEntryCustomerId(event.target.value)}
            >
              <option value="">No customer linked</option>
              {data.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Job
            <select value={timeEntryJobId} onChange={(event) => setTimeEntryJobId(event.target.value)}>
              <option value="">No job linked</option>
              {data.jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Note
            <input
              value={timeEntryNote}
              onChange={(event) => setTimeEntryNote(event.target.value)}
              placeholder="Front yard cleanup, loading trailer, fuel stop..."
            />
          </label>
          <div className="full-width form-actions">
            <button type="submit" className="button-primary" disabled={Boolean(runningTimeEntry)}>
              {runningTimeEntry ? "Timer Already Running" : "Start Timer"}
            </button>
          </div>
        </form>

        <div className="task-filter-row top-gap" aria-label="Time views">
          {[
            { id: "week", label: "Last 7 Days" },
            { id: "month", label: "Last 30 Days" },
            { id: "all", label: "All Time" }
          ].map((view) => (
            <button
              key={view.id}
              type="button"
              className={timeFilter === view.id ? "task-filter active" : "task-filter"}
              onClick={() => setTimeFilter(view.id as typeof timeFilter)}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="inline-actions top-gap">
          <select
            value={timeCategoryFilter}
            onChange={(event) => setTimeCategoryFilter(event.target.value as TimeCategory | "all")}
          >
            <option value="all">All categories</option>
            {Object.entries(timeCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="stack top-gap">
          {timeSummaryByCategory.map((entry) => {
            const maxMinutes = timeSummaryByCategory[0]?.minutes ?? 1;
            return (
              <article key={entry.category} className="list-card">
                <div className="card-copy">
                  <h3>{timeCategoryLabels[entry.category]}</h3>
                  <div className="time-bar-track">
                    <div
                      className="time-bar-fill"
                      style={{ width: `${Math.max(8, (entry.minutes / maxMinutes) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="pill">{formatMinutes(entry.minutes)}</span>
              </article>
            );
          })}
          {!timeSummaryByCategory.length ? (
            <p className="empty-state">Start logging time to see where the hours are going.</p>
          ) : null}
        </div>

        <div className="stack top-gap">
          {filteredTimeEntries.map((entry) => {
            const customer = data.customers.find((item) => item.id === entry.customerId);
            const job = data.jobs.find((item) => item.id === entry.jobId);
            const runningMinutes =
              entry.isRunning && entry.startedAt
                ? Math.max(1, Math.round((timerTick - new Date(entry.startedAt).getTime()) / 60000))
                : entry.minutes;
            return (
              <article key={entry.id} className="list-card split-card">
                <div className="card-copy">
                  <h3>{timeCategoryLabels[entry.category]}</h3>
                  <p>{entry.note || "No note added."}</p>
                  <div className="timestamp-list">
                    <span>{entry.entryDate}</span>
                    {customer ? <span>Customer: {customer.fullName}</span> : null}
                    {job ? <span>Job: {job.title}</span> : null}
                  </div>
                </div>
                <div className="action-stack">
                  <span className={`pill ${entry.isRunning ? "accent-pill" : ""}`}>
                    {entry.isRunning ? "running" : formatMinutes(runningMinutes)}
                  </span>
                </div>
              </article>
            );
          })}
          {!filteredTimeEntries.length ? (
            <p className="empty-state">No time entries in this filter yet.</p>
          ) : null}
        </div>
      </section>

      <section className="panel dashboard-section" data-admin-section="leads">
        <div className="section-heading">
          <p className="eyebrow">Lead Contacts</p>
          <h2>Everyone still in lead status lives here until work is approved.</h2>
        </div>
        <div className="stack">
          {leadCustomers.map((customer) => (
            <article key={customer.id} className="list-card">
              <div>
                <h3>{customer.fullName}</h3>
                <p>
                  {customer.phone} • {customer.email}
                </p>
                <small>{customer.address}</small>
              </div>
              <span className="pill">lead</span>
            </article>
          ))}
          {!leadCustomers.length ? <p className="empty-state">No open leads right now.</p> : null}
        </div>
      </section>

      <section className="panel dashboard-section" data-admin-section="customers">
        <div className="section-heading">
          <p className="eyebrow">Active Customers</p>
          <h2>Approved quotes become active customers while work and payment are in progress.</h2>
        </div>
        <div className="stack">
          {activeCustomers.map((customer) => (
            <article key={customer.id} className="list-card">
              <div>
                <h3>{customer.fullName}</h3>
                <p>
                  {customer.phone} • {customer.email}
                </p>
                <small>{customer.address}</small>
              </div>
              <span className="pill">{customer.preferredContact}</span>
            </article>
          ))}
          {!activeCustomers.length ? (
            <p className="empty-state">No active customers yet.</p>
          ) : null}
        </div>
      </section>

      <section className="panel dashboard-section" data-admin-section="customers">
        <div className="section-heading">
          <p className="eyebrow">Past Customers</p>
          <h2>Once payment is fully collected, the customer record moves here for history.</h2>
        </div>
        <div className="stack">
          {archivedCustomers.map((customer) => (
            <article key={customer.id} className="list-card">
              <div>
                <h3>{customer.fullName}</h3>
                <p>
                  {customer.phone} • {customer.email}
                </p>
                <small>{customer.address}</small>
              </div>
              <span className="pill">archived</span>
            </article>
          ))}
          {!archivedCustomers.length ? (
            <p className="empty-state">No archived customers yet.</p>
          ) : null}
        </div>
      </section>

      <section className="panel dashboard-section" data-admin-section="leads">
        <div className="section-heading">
          <p className="eyebrow">Needs Quote</p>
          <h2>Only open leads that still need pricing stay in the quote queue.</h2>
        </div>
        <div className="stack">
          {pendingQuoteLeads.map((estimate) => (
            <article key={estimate.id} className="list-card">
              <div>
                <h3>{estimate.customerName}</h3>
                <p>{estimate.jobType}</p>
                <small>
                  {estimate.preferredSlot} • {estimate.serviceAddress}
                </small>
                {estimate.isRepeatCustomer ? (
                  <div className="status-note">Repeat customer • {estimate.requestCount} total requests</div>
                ) : null}
              </div>
              <div className="action-stack compact-stack">
                {estimate.isRepeatCustomer ? (
                  <span className="pill accent-pill">repeat customer</span>
                ) : null}
                <span className="pill">{estimate.status}</span>
              </div>
            </article>
          ))}
          {!pendingQuoteLeads.length ? (
            <p className="empty-state">No leads are waiting on a quote right now.</p>
          ) : null}
        </div>
      </section>

      <section className="panel dashboard-section" data-admin-section="leads">
        <div className="section-heading">
          <p className="eyebrow">Schedule Estimate</p>
          <h2>Choose the actual estimate date and time, then email it to the customer.</h2>
        </div>
        {scheduleFeedback ? <div className="notice success">{scheduleFeedback}</div> : null}
        {scheduleError ? <div className="notice">{scheduleError}</div> : null}
        <form className="form-grid" onSubmit={handleScheduleEstimate}>
          <label className="full-width">
            Lead to schedule
            <select
              value={scheduleEstimateId}
              onChange={(event) => setScheduleEstimateId(event.target.value)}
              required
            >
              <option value="">Choose a lead</option>
              {estimateOptions
                .filter((estimate) =>
                  ["new lead", "estimate completed", "estimate scheduled"].includes(estimate.status)
                )
                .map((estimate) => (
                  <option key={estimate.id} value={estimate.id}>
                    {estimate.customerName} - {estimate.jobType}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Estimate date
            <input
              type="date"
              value={scheduleDate}
              onChange={(event) => setScheduleDate(event.target.value)}
              required
            />
          </label>
          <label>
            Estimate time
            <input
              type="time"
              value={scheduleTime}
              onChange={(event) => setScheduleTime(event.target.value)}
              required
            />
          </label>
          <label className="full-width">
            Customer note
            <textarea
              rows={3}
              value={scheduleNote}
              onChange={(event) => setScheduleNote(event.target.value)}
              placeholder="Anything helpful the customer should know before the visit."
            />
          </label>
          <div className="full-width form-actions">
            <button type="submit" className="button-primary" disabled={isSendingSchedule}>
              {isSendingSchedule ? "Sending Estimate Time..." : "Send Estimate Time"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel dashboard-section" data-admin-section="leads">
        <div className="section-heading">
          <p className="eyebrow">Quoted Lead History</p>
          <h2>Once a quote exists, the lead moves out of the quote queue and stays here for reference.</h2>
        </div>
        <div className="stack">
          {quotedLeadHistory.map((estimate) => (
            <article key={estimate.id} className="list-card">
              <div>
                <h3>{estimate.customerName}</h3>
                <p>{estimate.jobType}</p>
                <small>{estimate.preferredSlot}</small>
              </div>
              <span className="pill">{estimate.status}</span>
            </article>
          ))}
          {!quotedLeadHistory.length ? (
            <p className="empty-state">Quoted leads will show up here after a quote is created.</p>
          ) : null}
        </div>
      </section>

      <section className="panel dashboard-section" data-admin-section="leads" id="quote-calculator">
        <div className="section-heading">
          <p className="eyebrow">Quote Calculator</p>
          <h2>Create a quote from an active lead or add new work for an existing customer.</h2>
        </div>
        <form className="form-grid" onSubmit={handleCreateQuote}>
          <label>
            Quote source
            <select
              value={quoteSourceMode}
              onChange={(event) => setQuoteSourceMode(event.target.value as "lead" | "customer")}
            >
              <option value="lead">Active Lead</option>
              <option value="customer">Existing Customer</option>
            </select>
          </label>
          {quoteSourceMode === "lead" ? (
            <label className="full-width">
              Estimate request
              <select
                value={selectedEstimateId}
                onChange={(event) => setSelectedEstimateId(event.target.value)}
                required
              >
                <option value="">Choose a lead</option>
                {quoteEstimateOptions.map((estimate) => (
                  <option key={estimate.id} value={estimate.id}>
                    {estimate.customerName} - {estimate.jobType}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="full-width">
              Existing customer
              <select
                value={selectedCustomerId}
                onChange={(event) => setSelectedCustomerId(event.target.value)}
                required
              >
                <option value="">Choose a customer</option>
                {quoteCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="full-width">
            Quote title
            <input
              value={quoteTitle}
              onChange={(event) => setQuoteTitle(event.target.value)}
              placeholder={
                quoteSourceMode === "lead" ? "Auto-filled from job type" : "Example: Add-on cleanup work"
              }
            />
          </label>
          <label className="full-width">
            Scope of work
            <textarea
              rows={4}
              value={quoteScope}
              onChange={(event) => setQuoteScope(event.target.value)}
              readOnly={quoteSourceMode === "lead"}
              placeholder="List what is included in this quote."
            />
          </label>
          <div className="full-width labor-calculator">
            <div className="section-heading compact-heading">
              <p className="eyebrow">Labor Calculator</p>
              <h2>$75 per hour per person</h2>
            </div>
            <div className="labor-input-grid">
              <label>
                Number of people
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={laborPeople}
                  onChange={(event) => setLaborPeople(event.target.value)}
                  placeholder="2"
                />
              </label>
              <label>
                Hours on job
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={laborHours}
                  onChange={(event) => setLaborHours(event.target.value)}
                  placeholder="1"
                />
              </label>
              <div className="labor-total-card">
                <span>Labor total</span>
                <strong>
                  ${(Number(laborPeople || 0) * Number(laborHours || 0) * LABOR_RATE_PER_PERSON_HOUR).toFixed(2)}
                </strong>
              </div>
            </div>
            <p className="status-note">
              Labor is automatically added as a quote line when the quote is saved.
            </p>
          </div>
          <label>
            Deposit
            <select
              value={depositMode}
              onChange={(event) =>
                setDepositMode(event.target.value as "none" | "amount" | "percent")
              }
            >
              <option value="none">No deposit</option>
              <option value="amount">Fixed deposit amount</option>
              <option value="percent">Percentage deposit</option>
            </select>
          </label>
          <label>
            {depositMode === "percent" ? "Deposit percent" : "Deposit amount"}
            <input
              type="number"
              min="0"
              step={depositMode === "percent" ? "1" : "0.01"}
              max={depositMode === "percent" ? "100" : undefined}
              value={depositMode === "percent" ? depositPercent : depositAmount}
              onChange={(event) =>
                depositMode === "percent"
                  ? setDepositPercent(event.target.value)
                  : setDepositAmount(event.target.value)
              }
              disabled={depositMode === "none"}
              placeholder={depositMode === "percent" ? "20" : "0.00"}
            />
          </label>
          <label>
            Rooted signature
            <input
              value={contractorSignature}
              onChange={(event) => setContractorSignature(event.target.value)}
              placeholder="Owner or representative"
            />
          </label>

          <div className="full-width stack">
            {quoteLines.map((line, index) => (
              <div key={line.id} className="line-item-grid">
                <input
                  placeholder="Line item"
                  value={line.description}
                  onChange={(event) => updateLine(index, "description", event.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  value={line.qty}
                  onChange={(event) => updateLine(index, "qty", event.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) => updateLine(index, "unitPrice", event.target.value)}
                />
              </div>
            ))}
            <div className="inline-actions">
              <button type="button" className="button-secondary" onClick={addLine}>
                Add line item
              </button>
            </div>
          </div>

          <div className="full-width form-actions sticky-actions">
            <button type="submit" className="button-primary">
              Save Quote
            </button>
          </div>
        </form>
      </section>

      <section className="panel dashboard-section" data-admin-section="leads" id="quotes">
        <div className="section-heading">
          <p className="eyebrow">Quotes</p>
          <h2>Each quote needs a decision: approve it or remove the lead.</h2>
        </div>
        <div className="stack">
          {data.quotes.map((quote) => {
            const customer = data.customers.find((item) => item.id === quote.customerId);
            return (
              <article key={quote.id} className="list-card split-card action-card">
                <div className="card-copy">
                  <h3>{quote.projectTitle}</h3>
                  <p>{quote.customerName}</p>
                  <small>
                    ${quote.total.toFixed(2)}
                    {quote.depositRequired
                      ? quote.depositType === "percent" && quote.depositPercent
                        ? ` • Deposit ${quote.depositPercent}% ($${quote.depositAmount.toFixed(2)})`
                        : ` • Deposit $${quote.depositAmount.toFixed(2)}`
                      : " • No deposit"}
                  </small>
                  <div className="timestamp-list">
                    <span>Created {quote.createdAt}</span>
                    {quote.approvedAt ? <span>Approved {quote.approvedAt}</span> : null}
                    {quote.customerSignedAt ? <span>Customer signed {quote.customerSignedAt}</span> : null}
                    {quote.rootedSignedAt ? <span>Rooted signed {quote.rootedSignedAt}</span> : null}
                    {quote.completedAt ? <span>Completed {quote.completedAt}</span> : null}
                  </div>
                </div>
                <div className="action-stack">
                  <span className={`pill ${quote.status === "approved" ? "accent-pill" : ""}`}>
                    {quote.status}
                  </span>
                  <div className="action-row">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => printQuotePdf(quote, customer)}
                    >
                      PDF
                    </button>
                    {quote.status === "draft" ? (
                      <button
                        type="button"
                        className="button-primary"
                        onClick={() => persist(sendQuote(data, quote.id))}
                      >
                        Mark Sent
                      </button>
                    ) : null}
                    {quote.status === "sent" ? (
                      <button
                        type="button"
                        className="button-primary"
                        onClick={() => persist(approveQuote(data, quote.id))}
                      >
                        Approve
                      </button>
                    ) : null}
                    {quote.status === "sent" ? (
                      <button
                        type="button"
                        className="button-danger"
                        onClick={() => persist(declineQuote(data, quote.id))}
                      >
                        Deny
                      </button>
                    ) : null}
                    {quote.status === "approved" ? (
                      <button
                        type="button"
                        className="button-primary"
                        onClick={() => {
                          const job = data.jobs.find((item) => item.quoteId === quote.id);
                          if (job) {
                            persist(completeJobAndCreateInvoice(data, job.id));
                          }
                        }}
                      >
                        Completed
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel dashboard-section" data-admin-section="jobs">
        <div className="section-heading">
          <p className="eyebrow">Jobs</p>
          <h2>Approved work becomes a job and can generate an invoice.</h2>
        </div>
        <div className="stack">
          {data.jobs.map((job) => {
            const customer = data.customers.find((item) => item.id === job.customerId);
            const quote = data.quotes.find((item) => item.id === job.quoteId);
            return (
              <article key={job.id} className="list-card split-card action-card">
                <div className="card-copy">
                  <h3>{job.title}</h3>
                  <p>{customer?.fullName}</p>
                  <small>Scheduled {job.scheduledDate}</small>
                </div>
                <div className="action-stack">
                  <span className="pill">{job.status}</span>
                  <div className="action-row">
                    {quote ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => printQuotePdf(quote, customer)}
                      >
                        Quote PDF
                      </button>
                    ) : null}
                    {job.status !== "completed" ? (
                      <button
                        type="button"
                        className="button-primary"
                        onClick={() => persist(completeJobAndCreateInvoice(data, job.id))}
                      >
                        Complete Job
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel dashboard-section" data-admin-section="invoices" id="invoices">
        <div className="section-heading">
          <p className="eyebrow">Invoices and Payments</p>
          <h2>Track what is owed now, then add payment processing later.</h2>
        </div>
        <div className="stack">
          {activeInvoices.map((invoice) => {
            const customer = data.customers.find((item) => item.id === invoice.customerId);
            const quote = data.quotes.find(
              (item) => item.id === (invoice.relatedQuoteId ?? invoice.quoteId)
            );
            const job = data.jobs.find((item) => item.id === invoice.jobId);
            const relatedReference = invoice.relatedWorkAuthorizationId
              ? `Work Authorization ID: ${invoice.relatedWorkAuthorizationId}`
              : invoice.relatedQuoteId
                ? `Related Quote ID: ${invoice.relatedQuoteId}`
                : "";
            return (
              <article key={invoice.id} className="list-card split-card action-card">
                <div className="card-copy">
                  <h3>{invoice.projectTitle || customer?.fullName}</h3>
                  <p>Invoice {invoice.id}</p>
                  <small>
                    ${invoice.total.toFixed(2)} total • ${invoice.amountPaid.toFixed(2)} paid • $
                    {invoice.balanceDue.toFixed(2)} due
                  </small>
                  <div className="timestamp-list">
                    <span>Issued {invoice.issuedAt || invoice.issueDate}</span>
                    <span>Due {invoice.dueAt || invoice.dueDate}</span>
                    {invoice.jobDate ? <span>Job {invoice.jobDate}</span> : null}
                  </div>
                  <div className="invoice-meta-grid">
                    <span>Billing: {invoice.billingAddress}</span>
                    <span>Service: {invoice.serviceAddress || invoice.billingAddress}</span>
                    {relatedReference ? <span>{relatedReference}</span> : null}
                  </div>
                </div>
                <div className="action-stack">
                  <span className={`pill ${invoice.status === "paid" ? "accent-pill" : ""}`}>
                    {getInvoiceStatusLabel(invoice.status)}
                  </span>
                  <div className="action-row">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => printInvoicePdf(invoice, quote, customer, job)}
                    >
                      Invoice PDF
                    </button>
                    {invoice.status !== "void" ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() =>
                          persist({
                            ...data,
                            invoices: data.invoices.map((item) =>
                              item.id === invoice.id ? { ...item, status: "void" } : item
                            )
                          })
                        }
                      >
                        Void
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
          {!activeInvoices.length ? (
            <p className="empty-state">No active invoices right now.</p>
          ) : null}
        </div>

        <div className="top-gap">
          <button
            type="button"
            className="button-inline"
            onClick={() => setShowPaidInvoices((current) => !current)}
          >
            {showPaidInvoices
              ? `Hide Paid Invoices (${paidInvoices.length})`
              : `Paid Invoices (${paidInvoices.length})`}
          </button>
        </div>

        {showPaidInvoices ? (
          <div className="stack top-gap">
            {paidInvoices.map((invoice) => {
              const customer = data.customers.find((item) => item.id === invoice.customerId);
              const quote = data.quotes.find(
                (item) => item.id === (invoice.relatedQuoteId ?? invoice.quoteId)
              );
              const job = data.jobs.find((item) => item.id === invoice.jobId);
              return (
                <article key={invoice.id} className="list-card split-card action-card">
                  <div className="card-copy">
                    <h3>{invoice.projectTitle || customer?.fullName}</h3>
                    <p>Invoice {invoice.id}</p>
                    <small>
                      ${invoice.total.toFixed(2)} total • ${invoice.amountPaid.toFixed(2)} paid
                    </small>
                  </div>
                  <div className="action-stack">
                    <span className="pill accent-pill">{getInvoiceStatusLabel(invoice.status)}</span>
                    <div className="action-row">
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => printInvoicePdf(invoice, quote, customer, job)}
                      >
                        Invoice PDF
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {!paidInvoices.length ? (
              <p className="empty-state">No paid invoices yet.</p>
            ) : null}
          </div>
        ) : null}

        <form className="form-grid top-gap" onSubmit={handleRecordPayment}>
          <label>
            Invoice
            <select
              value={paymentInvoiceId}
              onChange={(event) => setPaymentInvoiceId(event.target.value)}
              required
            >
              <option value="">Choose invoice</option>
              {activeInvoices
                .filter((invoice) => invoice.status !== "void")
                .map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.id} - ${invoice.balanceDue.toFixed(2)} due
                </option>
                ))}
            </select>
          </label>
          <label>
            Payment Type
            <select
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value as "full" | "partial")}
            >
              <option value="full">Paid in Full</option>
              <option value="partial">Partial Payment</option>
            </select>
          </label>
          <label>
            Amount received
            <input
              type="number"
              step="0.01"
              min="0"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              required={paymentMode === "partial"}
              disabled={paymentMode === "full"}
              placeholder={paymentMode === "full" ? "Auto-fills remaining balance" : "Enter amount"}
            />
          </label>
          <label>
            Method
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="venmo">Venmo</option>
              <option value="zelle">Zelle</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="full-width">
            Note
            <input
              value={paymentNote}
              onChange={(event) => setPaymentNote(event.target.value)}
              placeholder="Check #1042, cash at completion, etc."
            />
          </label>
          <div className="full-width form-actions">
            <button type="submit" className="button-primary">
              {paymentMode === "full" ? "Mark Paid in Full" : "Record Partial Payment"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel dashboard-section" data-admin-section="settings" id="expenses">
        <div className="section-heading">
          <p className="eyebrow">Expenses</p>
          <h2>Track materials, fuel, tools, and other costs for tax season.</h2>
        </div>
        <div className="stack">
          {data.expenses.map((expense) => {
            const linkedJob = data.jobs.find((job) => job.id === expense.linkedJobId);
            return (
              <article key={expense.id} className="list-card split-card action-card">
                <div className="card-copy">
                  <h3>{expense.vendor}</h3>
                  <p>
                    {expense.category} • {expense.expenseDate}
                  </p>
                  <small>
                    {expense.note || "No note added"}
                    {linkedJob ? ` • Linked to ${linkedJob.title}` : ""}
                  </small>
                  {expense.receiptDataUrl ? (
                    <div className="receipt-links">
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => openReceipt(expense.receiptDataUrl ?? "")}
                      >
                        View receipt{expense.receiptName ? `: ${expense.receiptName}` : ""}
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="action-stack">
                  <span className="pill">${expense.amount.toFixed(2)}</span>
                  {expense.receiptDataUrl ? (
                    <div className="action-row">
                      <button
                        type="button"
                        className="button-inline"
                        onClick={() => openReceipt(expense.receiptDataUrl ?? "")}
                      >
                        Receipt
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <form className="form-grid top-gap" onSubmit={handleRecordExpense}>
          <label>
            Expense date
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              required
            />
          </label>
          <label>
            Vendor
            <input
              value={expenseVendor}
              onChange={(event) => setExpenseVendor(event.target.value)}
              placeholder="Home Depot, gas station, equipment rental..."
              required
            />
          </label>
          <label>
            Category
            <select
              value={expenseCategory}
              onChange={(event) => setExpenseCategory(event.target.value as ExpenseCategory)}
            >
              <option value="materials">Materials</option>
              <option value="equipment">Equipment</option>
              <option value="fuel">Fuel</option>
              <option value="labor">Labor</option>
              <option value="marketing">Marketing</option>
              <option value="insurance">Insurance</option>
              <option value="software">Software</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenseAmount}
              onChange={(event) => setExpenseAmount(event.target.value)}
              required
            />
          </label>
          <label className="full-width">
            Link to job
            <select value={expenseJobId} onChange={(event) => setExpenseJobId(event.target.value)}>
              <option value="">No job linked</option>
              {data.jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Note
            <input
              value={expenseNote}
              onChange={(event) => setExpenseNote(event.target.value)}
              placeholder="What was purchased and why?"
            />
          </label>
          <label className="full-width">
            Receipt attachment
            <input
              ref={expenseReceiptInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleReceiptUpload}
            />
          </label>
          {expenseReceiptName ? (
            <div className="full-width upload-note">Attached receipt: {expenseReceiptName}</div>
          ) : null}
          <div className="full-width form-actions">
            <button type="submit">Record Expense</button>
          </div>
        </form>
      </section>

      <section className="panel dashboard-section" data-admin-section="settings">
        <div className="section-heading">
          <p className="eyebrow">Tax Season Snapshot</p>
          <h2>Simple reporting that can be exported later.</h2>
        </div>
        <div className="report-grid">
          <div>
            <span>Invoices created</span>
            <strong>{data.invoices.length}</strong>
          </div>
          <div>
            <span>Payments recorded</span>
            <strong>{data.payments.length}</strong>
          </div>
          <div>
            <span>Revenue logged</span>
            <strong>${totals.collected.toFixed(2)}</strong>
          </div>
          <div>
            <span>Expenses logged</span>
            <strong>${totals.expenses.toFixed(2)}</strong>
          </div>
          <div>
            <span>Customers tracked</span>
            <strong>{data.customers.length}</strong>
          </div>
          <div>
            <span>Net tracked</span>
            <strong>${(totals.collected - totals.expenses).toFixed(2)}</strong>
          </div>
        </div>
        <div className="inline-actions top-gap">
          <button
            className="button-secondary"
            onClick={() =>
              downloadCsv(
                "customers.csv",
                data.customers.map((customer) => ({
                  name: customer.fullName,
                  phone: customer.phone,
                  email: customer.email,
                  address: customer.address,
                  preferred_contact: customer.preferredContact,
                  created_at: customer.createdAt,
                  lifecycle: customer.lifecycle
                }))
              )
            }
          >
            Export Customers CSV
          </button>
          <button
            className="button-secondary"
            onClick={() =>
              downloadCsv(
                "invoices.csv",
                data.invoices.map((invoice) => {
                  const customer = data.customers.find((item) => item.id === invoice.customerId);
                  return {
                    invoice_id: invoice.id,
                    customer: customer?.fullName ?? "",
                    amount: invoice.amount,
                    issue_date: invoice.issueDate,
                    due_date: invoice.dueDate,
                    status: invoice.status
                  };
                })
              )
            }
          >
            Export Invoices CSV
          </button>
          <button
            className="button-secondary"
            onClick={() =>
              downloadCsv(
                "payments.csv",
                data.payments.map((payment) => {
                  const customer = data.customers.find((item) => item.id === payment.customerId);
                  return {
                    payment_id: payment.id,
                    customer: customer?.fullName ?? "",
                    invoice_id: payment.invoiceId,
                    amount: payment.amount,
                    method: payment.method,
                    paid_at: payment.paidAt,
                    note: payment.note
                  };
                })
              )
            }
          >
            Export Payments CSV
          </button>
          <button
            className="button-secondary"
            onClick={() =>
              downloadCsv(
                "expenses.csv",
                data.expenses.map((expense) => {
                  const linkedJob = data.jobs.find((job) => job.id === expense.linkedJobId);
                  return {
                    expense_id: expense.id,
                    date: expense.expenseDate,
                    vendor: expense.vendor,
                    category: expense.category,
                    amount: expense.amount,
                    linked_job: linkedJob?.title ?? "",
                    note: expense.note,
                    receipt_name: expense.receiptName ?? ""
                  };
                })
              )
            }
          >
            Export Expenses CSV
          </button>
        </div>
      </section>
      </div>
    </div>
  );
}

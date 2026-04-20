import { DEFAULT_PAYMENT_INSTRUCTIONS } from "@/lib/invoice-config";
import { DEFAULT_QUOTE_TERMS } from "@/lib/quote-config";
import { DEFAULT_WEEKLY_AVAILABILITY } from "@/lib/availability";
import { AppData } from "@/lib/types";

export const defaultData: AppData = {
  availability: DEFAULT_WEEKLY_AVAILABILITY,
  customers: [
    {
      id: "customer-1",
      fullName: "Jane Miller",
      phone: "(555) 401-9021",
      email: "jane@example.com",
      address: "128 Oak Street, Springfield",
      preferredContact: "phone",
      notes: "Interested in front yard cleanup and fresh mulch.",
      createdAt: "2026-03-15",
      lifecycle: "lead"
    }
  ],
  estimateRequests: [
    {
      id: "estimate-1",
      customerId: "customer-1",
      preferredSlot: "Thursday Morning",
      jobType: "Landscape Refresh",
      description: "Front beds need cleanup, edging, and mulch.",
      photos: [],
      status: "quote sent",
      createdAt: "2026-03-15",
      serviceAddress: "128 Oak Street, Springfield"
    }
  ],
  notifications: [],
  tasks: [],
  timeEntries: [],
  quotes: [
    {
      id: "quote-1",
      customerId: "customer-1",
      estimateRequestId: "estimate-1",
      customerName: "Jane Miller",
      customerAddress: "128 Oak Street, Springfield",
      customerPhone: "(555) 401-9021",
      customerEmail: "jane@example.com",
      projectTitle: "Landscape Refresh",
      scope: "Front beds need cleanup, edging, and mulch.",
      items: [
        { id: "line-1", description: "Cleanup labor", qty: 4, unitPrice: 65, amount: 260 },
        { id: "line-2", description: "Mulch delivery", qty: 3, unitPrice: 55, amount: 165 }
      ],
      total: 425,
      depositAmount: 125,
      depositRequired: true,
      terms: DEFAULT_QUOTE_TERMS,
      customerSignature: "",
      customerSignedAt: undefined,
      rootedSignature: "Rooted Representative",
      rootedSignedAt: "2026-03-16",
      approvedAt: undefined,
      completedAt: undefined,
      status: "sent",
      createdAt: "2026-03-16"
    }
  ],
  jobs: [],
  invoices: [
    {
      id: "invoice-1",
      customerId: "customer-1",
      relatedQuoteId: "quote-1",
      relatedWorkAuthorizationId: undefined,
      createdAt: "2026-03-20",
      issuedAt: "2026-03-20",
      dueAt: "2026-04-03",
      quoteId: "quote-1",
      jobId: undefined,
      issueDate: "2026-03-20",
      dueDate: "2026-04-03",
      customerName: "Jane Miller",
      billingAddress: "128 Oak Street, Springfield",
      serviceAddress: "128 Oak Street, Springfield",
      customerPhone: "(555) 401-9021",
      customerEmail: "jane@example.com",
      projectTitle: "Landscape Refresh",
      jobDate: "2026-03-19",
      lineItems: [
        {
          id: "invoice-line-1",
          description: "Front Yard Cleanup and Mulch",
          qty: 1,
          unitPrice: 425,
          amount: 425
        }
      ],
      subtotal: 425,
      taxAmount: 0,
      total: 425,
      amountPaid: 0,
      balanceDue: 425,
      paymentMethodNotes: "",
      notes: "Thank you for your business.",
      paymentInstructions: DEFAULT_PAYMENT_INSTRUCTIONS,
      amount: 425,
      status: "issued",
      paymentNotes: ""
    }
  ],
  payments: [],
  expenses: [
    {
      id: "expense-1",
      expenseDate: "2026-03-18",
      vendor: "Springfield Supply Yard",
      category: "materials",
      amount: 132.45,
      note: "Mulch and edging materials for estimate prep."
    }
  ],
  siteContent: {
    businessName: "Rooted Moapa Valley Landscaping",
    heroTitle: "Professional landscaping, cleanup, and outdoor upgrades for Moapa Valley.",
    heroDescription:
      "Rooted helps homeowners and property owners with estimate scheduling, project planning, and reliable landscaping work from first visit to final invoice.",
    primaryCtaLabel: "Request an Estimate",
    secondaryCtaLabel: "Owner Dashboard",
    aboutTitle: "What Rooted Does",
    aboutDescription:
      "We handle landscaping projects that need clear communication, organized job planning, and professional follow-through. Use this page to request an estimate and learn what kinds of work Rooted takes on.",
    serviceArea: "Serving Moapa Valley and surrounding areas.",
    featuredTitle: "Featured Work",
    featuredIntro:
      "A preview of the kind of projects Rooted can take from estimate to finished result.",
    services: [
      "Landscape refresh and yard cleanup",
      "Mulch, rock, and bed installation",
      "Irrigation and outdoor improvement estimates"
    ],
    featuredProjects: [
      {
        id: "project-1",
        title: "Front Yard Refresh",
        summary: "Cleanup, edging, and fresh mulch to sharpen curb appeal.",
        imageDataUrl: "/rooted-logo.png"
      },
      {
        id: "project-2",
        title: "Desert Landscape Upgrade",
        summary: "Low-maintenance landscape improvements designed for the local climate.",
        imageDataUrl: "/rooted-logo.png"
      }
    ]
  }
};

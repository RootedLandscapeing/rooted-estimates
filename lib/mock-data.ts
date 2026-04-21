import { DEFAULT_WEEKLY_AVAILABILITY } from "@/lib/availability";
import { AppData } from "@/lib/types";

export const defaultData: AppData = {
  availability: DEFAULT_WEEKLY_AVAILABILITY,
  customers: [],
  estimateRequests: [],
  notifications: [],
  tasks: [],
  timeEntries: [],
  quotes: [],
  jobs: [],
  invoices: [],
  payments: [],
  expenses: [],
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
    featuredProjects: []
  }
};

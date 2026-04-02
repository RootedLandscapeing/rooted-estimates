import { QuoteStatus } from "@/lib/types";

export const DEFAULT_QUOTE_TERMS = [
  "Payment due upon completion unless otherwise stated.",
  "Changes to the scope of work may result in updated pricing.",
  "Scheduling is subject to weather and availability.",
  "Approval of this document authorizes the work described above."
];

export function getDocumentTitle(status: QuoteStatus) {
  return status === "approved" || status === "completed" ? "WORK AUTHORIZATION" : "QUOTE";
}

export function getDocumentSubtitle(status: QuoteStatus) {
  return status === "approved" || status === "completed"
    ? "Approved scope of work and pricing authorization."
    : "Estimate prepared for review and scheduling.";
}

export function getApprovalStatement(status: QuoteStatus) {
  return status === "approved" || status === "completed"
    ? "By signing below, the customer approves the scope of work, pricing, and authorizes Rooted Moapa Valley Landscaping to proceed with the job."
    : "Customer signature indicates review and acceptance of the quoted pricing and scope.";
}

export function getFooterStatement(status: QuoteStatus) {
  return status === "approved" || status === "completed"
    ? "This work authorization confirms the approved scope, pricing, and scheduling intent for Rooted Moapa Valley Landscaping."
    : "This quote is provided for review and scheduling. Final work begins only after customer approval.";
}

export function canApproveQuote(status: QuoteStatus, allowDraftApproval = false) {
  if (status === "declined" || status === "completed") {
    return false;
  }

  if (status === "draft") {
    return allowDraftApproval;
  }

  return status === "sent";
}

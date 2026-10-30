import { AccountStatus } from "@prisma/client";

export type { AccountStatus };

/**
 * Validates whether an account is fully approved to access dashboard and business APIs.
 *
 * Security Rules:
 * - PENDING accounts must NEVER access the application.
 * - REJECTED accounts must NEVER access the application.
 * - SUSPENDED accounts must NEVER access the application.
 * - Legacy accounts without an explicit approvalStatus default to APPROVED if isActive is true.
 */
export function isAccountApproved(
  status: AccountStatus | string | undefined | null,
  isActive: boolean = true
): boolean {
  if (!isActive) {
    return false;
  }
  if (status === "PENDING" || status === "REJECTED" || status === "SUSPENDED") {
    return false;
  }
  // Explicitly approved or legacy active account
  return status === "APPROVED" || status === undefined || status === null;
}

/**
 * Returns a human-friendly message explaining account status.
 */
export function getAccountStatusMessage(
  status: AccountStatus | string | undefined | null,
  rejectionReason?: string | null
): string {
  switch (status) {
    case "PENDING":
      return "Your account registration has been submitted and is currently under review by our administration team. You will be granted access as soon as it is approved.";
    case "REJECTED":
      return rejectionReason
        ? `Your registration was not approved. Reason: ${rejectionReason}`
        : "Your registration was not approved. Please contact Elvora support for more details.";
    case "SUSPENDED":
      return "Your account has been suspended by the platform administrator. Access to the business dashboard is blocked.";
    case "APPROVED":
      return "Account is active and approved.";
    default:
      return "Account is active.";
  }
}

export type TenantRole = "OWNER" | "MANAGER" | "BILLER" | "ACCOUNTANT";

export type AppPermission =
  | "MANAGE_STAFF"
  | "EDIT_SHOP_PROFILE"
  | "DELETE_INVOICE"
  | "VIEW_FINANCIAL_REPORTS"
  | "VIEW_PURCHASE_COSTS"
  | "MANAGE_INVENTORY"
  | "CREATE_INVOICE"
  | "RECORD_PURCHASE"
  | "RECORD_EXPENSE"
  | "RECORD_PAYMENT";

const ROLE_PERMISSIONS: Record<TenantRole, readonly AppPermission[]> = {
  OWNER: [
    "MANAGE_STAFF",
    "EDIT_SHOP_PROFILE",
    "DELETE_INVOICE",
    "VIEW_FINANCIAL_REPORTS",
    "VIEW_PURCHASE_COSTS",
    "MANAGE_INVENTORY",
    "CREATE_INVOICE",
    "RECORD_PURCHASE",
    "RECORD_EXPENSE",
    "RECORD_PAYMENT",
  ],
  MANAGER: [
    "VIEW_FINANCIAL_REPORTS",
    "VIEW_PURCHASE_COSTS",
    "MANAGE_INVENTORY",
    "CREATE_INVOICE",
    "RECORD_PURCHASE",
    "RECORD_EXPENSE",
    "RECORD_PAYMENT",
  ],
  ACCOUNTANT: [
    "VIEW_FINANCIAL_REPORTS",
    "VIEW_PURCHASE_COSTS",
    "RECORD_PURCHASE",
    "RECORD_EXPENSE",
    "RECORD_PAYMENT",
  ],
  BILLER: [
    "CREATE_INVOICE",
    "MANAGE_INVENTORY",
    "RECORD_PAYMENT",
  ],
};

/**
 * Checks if a specific role possesses the requested permission.
 */
export function hasPermission(role: TenantRole, permission: AppPermission): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.includes(permission) : false;
}

export class PermissionDeniedError extends Error {
  constructor(permission: AppPermission, role: TenantRole) {
    super(`Access Denied: Role '${role}' lacks required permission '${permission}'`);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Asserts that the role has the required permission; throws PermissionDeniedError otherwise.
 */
export function requirePermission(role: TenantRole, permission: AppPermission): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionDeniedError(permission, role);
  }
}

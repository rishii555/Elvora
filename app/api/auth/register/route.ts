import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { createVerificationToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email/service";
import { provisionTrialSubscription } from "@/lib/billing/service";

const registerSchema = z.object({
  // Owner info
  name: z.string().min(2, "Owner name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  // Shop / Tenant info
  tradeName: z.string().min(2, "Shop/Trade name is required"),
  legalName: z.string().optional(),
  gstin: z.string().optional(),
  stateCode: z.string().length(2, "State code must be 2 digits (e.g. 09 for UP, 07 for DL)"),
  address: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce IP-based rate limiting (10 registrations per hour)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimit = checkRateLimit(`register:${ip}`, { windowMs: 60 * 60 * 1000, maxAttempts: 10 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { 
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() }
        }
      );
    }

    const body = await req.json();
    const validated = registerSchema.parse(body);

    // Check if user email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(validated.password);

    // Execute atomic creation of User, Tenant, Membership, and Default Seeds in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the User
      const user = await tx.user.create({
        data: {
          name: validated.name,
          email: validated.email.toLowerCase(),
          passwordHash,
          phone: validated.phone,
        },
      });

      // 2. Create the Tenant (Shop)
      const tenant = await tx.tenant.create({
        data: {
          tradeName: validated.tradeName,
          legalName: validated.legalName || validated.tradeName,
          gstin: validated.gstin?.toUpperCase() || null,
          stateCode: validated.stateCode,
          phone: validated.phone,
          email: validated.email.toLowerCase(),
          address: validated.address || null,
          invoicePrefix: "INV-",
          nextInvoiceNumber: 1,
        },
      });

      // 3. Create Tenant Membership with OWNER role
      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
          isDefault: true,
        },
      });

      // 4. Seed Essential Ledger Accounts
      const defaultAccounts = [
        { code: "CASH", name: "Cash on Hand", type: "ASSET" as const },
        { code: "BANK", name: "Primary Bank Account", type: "ASSET" as const },
        { code: "ACCOUNTS_RECEIVABLE", name: "Sundry Debtors (Customers)", type: "ASSET" as const },
        { code: "ACCOUNTS_PAYABLE", name: "Sundry Creditors (Suppliers)", type: "LIABILITY" as const },
        { code: "SALES", name: "Sales Account", type: "REVENUE" as const },
        { code: "PURCHASES", name: "Purchase Account", type: "EXPENSE" as const },
        { code: "GST_PAYABLE", name: "GST Output Tax Liability", type: "LIABILITY" as const },
        { code: "GST_INPUT_CREDIT", name: "GST Input Tax Credit (ITC)", type: "ASSET" as const },
      ];

      for (const acc of defaultAccounts) {
        await tx.ledgerAccount.create({
          data: {
            tenantId: tenant.id,
            code: acc.code,
            name: acc.name,
            type: acc.type,
          },
        });
      }

      // 5. Seed Universal Business Default Categories
      const defaultCategories = [
        "General Products & Goods",
        "Office Equipment & Electronics",
        "Packaging & Supplies",
        "Tools & Hardware",
        "Professional Services & Consulting",
        "Maintenance & Repairs",
      ];

      for (const catName of defaultCategories) {
        await tx.category.create({
          data: {
            tenantId: tenant.id,
            name: catName,
          },
        });
      }

      // 6. Record Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: "TENANT_REGISTERED",
          entityType: "Tenant",
          entityId: tenant.id,
          changesJson: JSON.stringify({ tradeName: tenant.tradeName, stateCode: tenant.stateCode }),
        },
      });

      // 7. Provision 14-Day Full Access Commercial Free Trial
      await provisionTrialSubscription(tenant.id, tx);

      return { user, tenant };
    });

    // Create session token
    const token = await signSessionToken({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      activeTenantId: result.tenant.id,
      role: "OWNER",
    });

    // Generate and dispatch email verification token
    const { rawToken: verificationRawToken } = createVerificationToken(result.user.email, "EMAIL_VERIFICATION", 24 * 60 * 60 * 1000);
    await sendVerificationEmail(result.user.email, verificationRawToken);

    const response = NextResponse.json({
      success: true,
      message: "Shop account successfully created",
      tenantId: result.tenant.id,
    });

    // Set secure HTTP-only cookie
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

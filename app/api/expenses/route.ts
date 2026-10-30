import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { getIndianFinancialYear } from "@/lib/finance/decimal";
import { getNextSequentialNumber } from "@/lib/invoices/service";
import { postExpenseAccounting } from "@/lib/accounting/service";

const CreateExpenseSchema = z.object({
  category: z.string().min(1, "Expense category is required"),
  payee: z.string().min(1, "Payee name is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  taxAmount: z.coerce.number().min(0).default(0),
  paymentMode: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CREDIT", "SPLIT"]).default("BANK_TRANSFER"),
  paymentRef: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  expenseDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "VIEW_FINANCIAL_REPORTS");

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const paymentMode = searchParams.get("paymentMode") || undefined;
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {
      tenantId: context.tenantId,
    };

    if (category) where.category = category;
    if (paymentMode) where.paymentMode = paymentMode;

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { payee: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { expenseNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [totalCount, expenses, aggregates] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { expenseDate: "desc" },
      }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      expenses,
      totalAmount: aggregates._sum.amount || 0,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to load expenses";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "RECORD_EXPENSE");

    const json = await req.json();
    const parsed = CreateExpenseSchema.parse(json);

    const expenseDate = parsed.expenseDate ? new Date(parsed.expenseDate) : new Date();
    const fiscalYear = getIndianFinancialYear(expenseDate);

    const result = await prisma.$transaction(async (tx) => {
      const expenseNumber = await getNextSequentialNumber(
        context.tenantId,
        "EXPENSE",
        fiscalYear,
        "EXP-",
        tx
      );

      const created = await tx.expense.create({
        data: {
          tenantId: context.tenantId,
          expenseNumber,
          expenseDate,
          category: parsed.category.toUpperCase().replace(/\s+/g, "_"),
          payee: parsed.payee.trim(),
          amount: parsed.amount,
          taxAmount: parsed.taxAmount,
          paymentMode: parsed.paymentMode,
          paymentRef: parsed.paymentRef?.trim() || null,
          description: parsed.description?.trim() || null,
          notes: parsed.notes?.trim() || null,
        },
      });

      // Post balanced double-entry accounting entry
      await postExpenseAccounting(context.tenantId, created, tx);

      return created;
    });

    return NextResponse.json(
      {
        success: true,
        expense: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
        },
        { status: 400 }
      );
    }
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to record expense";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

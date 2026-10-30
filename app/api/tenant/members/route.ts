import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission, PermissionDeniedError } from "@/lib/auth/permissions";
import { checkPlanLimit } from "@/lib/billing/service";
import { PlanLimitExceededError } from "@/lib/billing/types";
import { hashPassword } from "@/lib/auth/session";

const AddMemberSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  role: z.enum(["OWNER", "MANAGER", "BILLER", "ACCOUNTANT"]).default("BILLER"),
  temporaryPassword: z.string().min(6).default("ElvoraStaff2026!"),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);

    const members = await prisma.tenantMember.findMany({
      where: { tenantId: context.tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        isDefault: m.isDefault,
        createdAt: m.createdAt,
        user: m.user,
      })),
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to load team members";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_STAFF");

    // Strictly enforce plan quota for staff members on the server
    await checkPlanLimit(context.tenantId, "STAFF_MEMBER");

    const json = await req.json();
    const validated = AddMemberSchema.parse(json);

    const normalizedEmail = validated.email.toLowerCase().trim();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const passwordHash = await hashPassword(validated.temporaryPassword);
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: validated.name.trim(),
          phone: validated.phone?.trim() || null,
          passwordHash,
          isActive: true,
        },
      });
    }

    // Check if membership already exists
    const existingMember = await prisma.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: context.tenantId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "This user is already a member of your business workspace." },
        { status: 400 }
      );
    }

    const member = await prisma.tenantMember.create({
      data: {
        tenantId: context.tenantId,
        userId: user.id,
        role: validated.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Staff member ${validated.name} (${validated.role}) added successfully.`,
        member,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof PlanLimitExceededError) {
      return NextResponse.json(
        { success: false, error: error.message, isPlanLimit: true },
        { status: 403 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to add team member";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

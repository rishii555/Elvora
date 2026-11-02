import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenant/context";
import { requirePermission } from "@/lib/auth/permissions";

const CreateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  code: z.string().optional(),
  parentId: z.string().optional().nullable(),
});

const UpdateCategorySchema = z.object({
  id: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Category name cannot be empty").optional(),
  code: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || undefined;
    const includeArchived = searchParams.get("includeArchived") === "true";
    const parentId = searchParams.get("parentId");

    const categories = await prisma.category.findMany({
      where: {
        tenantId: context.tenantId,
        ...(includeArchived ? {} : { isActive: true }),
        ...(parentId !== null ? { parentId: parentId || null } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      include: {
        _count: {
          select: { products: true, children: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch categories";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const body = await req.json();
    const validated = CreateCategorySchema.parse(body);

    // Check duplicate category name within this tenant
    const existing = await prisma.category.findFirst({
      where: {
        tenantId: context.tenantId,
        name: { equals: validated.name.trim(), mode: "insensitive" },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        // Reactivate archived category
        const reactivated = await prisma.category.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            code: validated.code || existing.code,
            parentId: validated.parentId !== undefined ? validated.parentId : existing.parentId,
          },
        });
        return NextResponse.json({
          success: true,
          message: "Category reactivated successfully",
          category: reactivated,
        });
      }
      return NextResponse.json(
        { success: false, error: `Category '${validated.name}' already exists.` },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        tenantId: context.tenantId,
        name: validated.name.trim(),
        code: validated.code?.trim() || null,
        parentId: validated.parentId || null,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Category created successfully",
        category,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to create category";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const body = await req.json();
    const validated = UpdateCategorySchema.parse(body);

    const category = await prisma.category.findFirst({
      where: { id: validated.id, tenantId: context.tenantId },
    });

    if (!category) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    // Check duplicate name if name is updated
    if (validated.name && validated.name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const duplicate = await prisma.category.findFirst({
        where: {
          tenantId: context.tenantId,
          name: { equals: validated.name.trim(), mode: "insensitive" },
          id: { not: category.id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: `Category '${validated.name}' already exists.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.category.update({
      where: { id: category.id },
      data: {
        ...(validated.name ? { name: validated.name.trim() } : {}),
        ...(validated.code !== undefined ? { code: validated.code?.trim() || null } : {}),
        ...(validated.parentId !== undefined ? { parentId: validated.parentId } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      category: updated,
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to update category";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const context = await requireTenantContext(req);
    requirePermission(context.role, "MANAGE_INVENTORY");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Category ID is required" }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: { id, tenantId: context.tenantId },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    if (category._count.products > 0 || category._count.children > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete category with associated products or subcategories. Please archive it instead.",
          hasProducts: category._count.products > 0,
          hasChildren: category._count.children > 0,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: category.id },
    });

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error: unknown) {
    if (error instanceof TenantAuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to delete category";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

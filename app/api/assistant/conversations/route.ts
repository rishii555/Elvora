import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/tenant/context";
import { handleApiError, getSafePagination } from "@/lib/api/security";
import { AssistantConversationService } from "@/lib/assistant/conversation-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateConversationSchema = z.object({
  title: z.string().max(80).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenantContext(req);
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = getSafePagination(
      searchParams.get("page"),
      searchParams.get("limit"),
      50,
      20
    );

    const conversations = await AssistantConversationService.listConversations(
      ctx.tenantId,
      ctx.userId,
      limit,
      skip
    );

    return NextResponse.json({
      success: true,
      conversations,
      pagination: {
        page,
        limit,
        count: conversations.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext(req);
    const body = await req.json().catch(() => ({}));
    const parsed = CreateConversationSchema.parse(body);

    const conversation = await AssistantConversationService.createConversation(
      ctx.tenantId,
      ctx.userId,
      parsed.title || "New Conversation"
    );

    return NextResponse.json({
      success: true,
      conversation,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

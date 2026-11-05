import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/tenant/context";
import { handleApiError } from "@/lib/api/security";
import { AssistantConversationService } from "@/lib/assistant/conversation-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(req);
    const { id } = await params;

    const data = await AssistantConversationService.getConversationWithMessages(
      ctx.tenantId,
      ctx.userId,
      id
    );

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Conversation not found or unauthorized access" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: data.conversation,
      messages: data.messages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext(req);
    const { id } = await params;

    const deleted = await AssistantConversationService.deleteConversation(
      ctx.tenantId,
      ctx.userId,
      id
    );

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Conversation not found or unauthorized access" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

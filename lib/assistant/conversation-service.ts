import { prisma } from "@/lib/db/prisma";
import { sanitizeInputString } from "@/lib/api/security";
import { AssistantIntent, AssistantStructuredData } from "./types";

export interface ConversationSummary {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageSnippet?: string;
  messageCount?: number;
}

export interface ConversationMessageDto {
  id: string;
  conversationId: string;
  tenantId: string;
  role: "USER" | "ASSISTANT";
  text: string;
  intent?: string | null;
  structuredData?: AssistantStructuredData | null;
  createdAt: string;
}

export class AssistantConversationService {
  /**
   * Creates a new conversation for the authenticated user and tenant.
   */
  static async createConversation(
    tenantId: string,
    userId: string,
    title = "New Conversation"
  ): Promise<ConversationSummary> {
    const cleanTitle = sanitizeInputString(title).slice(0, 80) || "New Conversation";

    const conv = await prisma.assistantConversation.create({
      data: {
        tenantId,
        userId,
        title: cleanTitle,
      },
    });

    return {
      id: conv.id,
      tenantId: conv.tenantId,
      userId: conv.userId,
      title: conv.title,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messageCount: 0,
    };
  }

  /**
   * Lists conversations for the user, strictly scoped to their tenant.
   */
  static async listConversations(
    tenantId: string,
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<ConversationSummary[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);

    const conversations = await prisma.assistantConversation.findMany({
      where: {
        tenantId,
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: safeLimit,
      skip: safeOffset,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { text: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return conversations.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      userId: c.userId,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastMessageSnippet: c.messages[0]?.text.slice(0, 60) || undefined,
      messageCount: c._count.messages,
    }));
  }

  /**
   * Retrieves a conversation and its messages. Fails if conversation doesn't belong to tenant & user.
   */
  static async getConversationWithMessages(
    tenantId: string,
    userId: string,
    conversationId: string,
    limit = 50
  ): Promise<{
    conversation: ConversationSummary;
    messages: ConversationMessageDto[];
  } | null> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const conv = await prisma.assistantConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
        userId,
      },
      include: {
        messages: {
          take: safeLimit,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conv) {
      return null;
    }

    const messages: ConversationMessageDto[] = conv.messages.map((m) => {
      let parsedData: AssistantStructuredData | null = null;
      if (m.structuredData) {
        try {
          parsedData = JSON.parse(m.structuredData);
        } catch {}
      }

      return {
        id: m.id,
        conversationId: m.conversationId,
        tenantId: m.tenantId,
        role: m.role as "USER" | "ASSISTANT",
        text: m.text,
        intent: m.intent,
        structuredData: parsedData,
        createdAt: m.createdAt.toISOString(),
      };
    });

    return {
      conversation: {
        id: conv.id,
        tenantId: conv.tenantId,
        userId: conv.userId,
        title: conv.title,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        messageCount: messages.length,
      },
      messages,
    };
  }

  /**
   * Deletes a conversation and its messages. Requires matching tenantId and userId.
   */
  static async deleteConversation(
    tenantId: string,
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    const existing = await prisma.assistantConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
        userId,
      },
    });

    if (!existing) {
      return false;
    }

    await prisma.assistantConversation.delete({
      where: {
        id: conversationId,
      },
    });

    return true;
  }

  /**
   * Appends a message to a conversation and updates the conversation's updatedAt timestamp and title if needed.
   */
  static async appendMessage(
    tenantId: string,
    userId: string,
    conversationId: string,
    role: "USER" | "ASSISTANT",
    text: string,
    intent?: AssistantIntent,
    structuredData?: AssistantStructuredData
  ): Promise<ConversationMessageDto> {
    // Validate ownership first
    const conv = await prisma.assistantConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
        userId,
      },
    });

    if (!conv) {
      throw new Error("Conversation not found or unauthorized access");
    }

    // Sanitize message content and enforce length limit
    const cleanText = sanitizeInputString(text).slice(0, 3000);
    const serializedData = structuredData ? JSON.stringify(structuredData) : null;

    const message = await prisma.assistantMessage.create({
      data: {
        conversationId,
        tenantId,
        role,
        text: cleanText,
        intent: intent || null,
        structuredData: serializedData,
      },
    });

    // Auto-update conversation title from first user query if still generic
    const shouldUpdateTitle = conv.title === "New Conversation" && role === "USER" && cleanText.length > 2;
    const newTitle = shouldUpdateTitle ? cleanText.slice(0, 40) : undefined;

    await prisma.assistantConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        ...(newTitle ? { title: newTitle } : {}),
      },
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      tenantId: message.tenantId,
      role: message.role as "USER" | "ASSISTANT",
      text: message.text,
      intent: message.intent,
      structuredData: structuredData || null,
      createdAt: message.createdAt.toISOString(),
    };
  }
}

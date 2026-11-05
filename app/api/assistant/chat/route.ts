import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, TenantContext } from "@/lib/tenant/context";
import { handleApiError, sanitizeInputString } from "@/lib/api/security";
import { checkTenantRateLimit } from "@/lib/auth/rate-limiter";
import { classifyIntent } from "@/lib/assistant/intent-engine";
import { BusinessToolsRegistry } from "@/lib/assistant/business-tools";
import { AssistantConversationService } from "@/lib/assistant/conversation-service";
import { findPublicKnowledge } from "@/lib/assistant/public-knowledge";
import { findSupportKnowledge } from "@/lib/assistant/support-knowledge";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000, "Message exceeds 2000 characters"),
  conversationId: z.string().optional(),
  language: z.enum(["en", "hinglish", "hi", "english", "hindi"]).optional(),
});

// Intents that strictly require authenticated tenant context
const PRIVATE_BUSINESS_INTENTS = new Set([
  "SALES_SUMMARY",
  "SALES_COMPARISON",
  "TOP_SELLING_PRODUCTS",
  "INVOICE_METRICS",
  "PROFIT_AND_LOSS",
  "EXPENSE_SUMMARY",
  "INVENTORY_CURRENT_STOCK",
  "INVENTORY_LOW_STOCK",
  "INVENTORY_OUT_OF_STOCK",
  "INVENTORY_VALUATION",
  "INVENTORY_REORDER",
  "CUSTOMER_OUTSTANDING",
  "TOP_CUSTOMERS",
  "SUPPLIER_OUTSTANDING",
  "PURCHASE_SUMMARY",
  "CASH_BANK_BALANCE",
  "TRIAL_BALANCE",
  "BALANCE_SHEET",
  "BUSINESS_OVERVIEW",
]);

export async function POST(req: NextRequest) {
  try {
    // 1. Determine Authentication & Tenant Status Server-Side
    let tenantCtx: TenantContext | null = null;
    try {
      tenantCtx = await requireTenantContext(req);
    } catch {
      tenantCtx = null;
    }

    // 2. Validate request payload
    const body = await req.json().catch(() => ({}));
    const validated = ChatRequestSchema.parse(body);
    const rawMessage = sanitizeInputString(validated.message);

    // 3. Classify Intent & Resolve Language
    const classification = classifyIntent(rawMessage);
    const rawLang = validated.language || classification.language;
    const isHindi = rawLang === "hi" || rawLang === "hindi";
    const isHinglish = rawLang === "hinglish";

    // =========================================================================
    // MODE A: PUBLIC MODE (Visitor is NOT logged in)
    // =========================================================================
    if (!tenantCtx) {
      // Check IP rate limit for public visitor
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "public_visitor";
      const rateLimit = checkTenantRateLimit(`public_${clientIp}`, "public_chat", {
        windowMs: 60 * 1000,
        maxAttempts: 30, // 30 queries per min for public
      });

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Too many requests. Please wait a moment before sending more messages.",
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          },
          { status: 429 }
        );
      }

      // Check if visitor asked for private business figures (Sales, Profit, Udhar, Stock)
      if (PRIVATE_BUSINESS_INTENTS.has(classification.intent)) {
        const text = isHindi
          ? "अपनी दुकान की लाइव बिक्री, मुनाफा, स्टॉक और खाता देखने के लिए कृपया अपने **एल्बोरा अकाउंट में लॉगिन करें**।"
          : isHinglish
          ? "Apni dukaan ki live sales, net profit, low stock alerts aur business records dekhne ke liye kripya apne **Elvora account me login karein**."
          : "To view your shop's live sales, net profit, low stock alerts, and financial records, please **log in to your Elvora account**.";

        return NextResponse.json({
          success: true,
          mode: "PUBLIC",
          intent: "PUBLIC_AUTH_REQUIRED",
          text,
          structuredData: {
            intent: "PUBLIC_AUTH_REQUIRED",
            periodLabel: "Login Required",
            sourceModule: "Elvora Security",
            navigationLink: {
              href: "/login",
              label: isHindi ? "लॉगिन करें →" : isHinglish ? "Login Karein →" : "Log In to Access Data →",
            },
            suggestedFollowUps: isHindi
              ? ["एल्बोरा क्या है?", "जीएसटी बिलिंग कैसे काम करती है?", "नया खाता कैसे बनाएं?"]
              : isHinglish
              ? ["Elvora kya hai?", "GST billing kaise hoti hai?", "Account kaise banayein?"]
              : ["What is Elvora?", "How does GST billing work?", "How do I create an account?"],
          },
        });
      }

      // Check Public Knowledge Base (About Elvora, Features, Onboarding, FAQs)
      const publicTopic = findPublicKnowledge(classification.normalizedQuery);
      if (publicTopic) {
        const text = isHindi
          ? publicTopic.answerHi
          : isHinglish
          ? publicTopic.answerHinglish
          : publicTopic.answerEn;

        const actionLink = publicTopic.actionLink
          ? {
              href: publicTopic.actionLink.href,
              label: isHindi
                ? publicTopic.actionLink.labelHi
                : isHinglish
                ? publicTopic.actionLink.labelHinglish
                : publicTopic.actionLink.labelEn,
            }
          : undefined;

        return NextResponse.json({
          success: true,
          mode: "PUBLIC",
          intent: "PUBLIC_SUPPORT",
          text,
          structuredData: {
            intent: "PUBLIC_SUPPORT",
            periodLabel: "Product Information",
            sourceModule: "Elvori Public Guide",
            navigationLink: actionLink,
            suggestedFollowUps: isHindi
              ? ["जीएसटी बिलिंग कैसे काम करती है?", "खाता कैसे बनाएं?", "प्लान्स और कीमतें क्या हैं?"]
              : isHinglish
              ? ["GST billing kaise kaam karti hai?", "Account kaise banayein?", "Pricing plans kya hain?"]
              : ["How does GST billing work?", "How do I create an account?", "What are the pricing plans?"],
          },
        });
      }

      // Check Feature Support Knowledge
      const supportMatch = findSupportKnowledge(classification.normalizedQuery);
      if (supportMatch) {
        const text = isHindi
          ? `### ${supportMatch.titleHi || supportMatch.titleEn}\n${supportMatch.summaryHi || supportMatch.summaryEn}\n\n**कदम-दर-कदम निर्देश:**\n` +
            (supportMatch.stepsHi || supportMatch.stepsEn).map((s, idx) => `${idx + 1}. ${s}`).join("\n")
          : isHinglish
          ? `### ${supportMatch.titleHinglish}\n${supportMatch.summaryHinglish}\n\n**Step-by-step instructions:**\n` +
            supportMatch.stepsHinglish.map((s, idx) => `${idx + 1}. ${s}`).join("\n")
          : `### ${supportMatch.titleEn}\n${supportMatch.summaryEn}\n\n**Step-by-step instructions:**\n` +
            supportMatch.stepsEn.map((s, idx) => `${idx + 1}. ${s}`).join("\n");

        return NextResponse.json({
          success: true,
          mode: "PUBLIC",
          intent: "ELVORA_SUPPORT",
          text,
          structuredData: {
            intent: "ELVORA_SUPPORT",
            periodLabel: "Feature Guide",
            sourceModule: supportMatch.moduleName,
            navigationLink: {
              href: "/register",
              label: isHindi ? "एल्बोरा पर निःशुल्क शुरू करें →" : isHinglish ? "Elvora Par Shuru Karein →" : "Get Started on Elvora →",
            },
            suggestedFollowUps: isHindi
              ? ["नया खाता कैसे बनाएं?", "एल्बोरा क्या है?", "काउंटर पीओएस क्या है?"]
              : isHinglish
              ? ["Account kaise banayein?", "Elvora kya hai?", "Counter POS kya hai?"]
              : ["How to create an account?", "What is Elvora?", "Tell me about Counter POS"],
          },
        });
      }

      // Public Default Fallback
      const fallbackText = isHindi
        ? "नमस्ते! मैं **एल्बोरी (Elvori)** हूँ, आपका एल्बोरा सहायक। मैं आपको एल्बोरा के फ़ीचर्स, जीएसटी बिलिंग, काउंटर पीओएस, इन्वेंटरी और अकाउंट बनाने में मदद कर सकता हूँ। आप क्या जानना चाहते हैं?"
        : isHinglish
        ? "Hello there! 👋 Main **Elvori** hoon, aapka Elvora Assistant. Main aapko Elvora ke features, GST billing, Counter POS, Inventory aur naya account banane me guide kar sakta hoon. Aap mujhse pooch sakte hain!"
        : "Hello there! 👋 I'm **Elvori**, your Elvora Assistant. I can help you explore Elvora, understand our features like GST Billing, Counter POS, and Inventory, or guide you through creating an account.";

      return NextResponse.json({
        success: true,
        mode: "PUBLIC",
        intent: "PUBLIC_INTRO",
        text: fallbackText,
        structuredData: {
          intent: "PUBLIC_INTRO",
          periodLabel: "Welcome",
          sourceModule: "Elvori Assistant",
          navigationLink: {
            href: "/register",
            label: isHindi ? "नया खाता बनाएं →" : isHinglish ? "Create Free Account →" : "Create Your Elvora Account →",
          },
          suggestedFollowUps: isHindi
            ? ["एल्बोरा क्या है?", "जीएसटी बिलिंग कैसे काम करती है?", "काउंटर पीओएस क्या है?", "नया खाता कैसे बनाएं?"]
            : isHinglish
            ? ["Elvora kya hai?", "GST billing kaise kaam karti hai?", "Counter POS kya hai?", "Account kaise banayein?"]
            : ["What is Elvora?", "How does GST billing work?", "Tell me about Counter POS", "How do I create an account?"],
        },
      });
    }

    // =========================================================================
    // MODE B: AUTHENTICATED MODE (User is verified & authorized to a tenant)
    // =========================================================================
    const rateLimit = checkTenantRateLimit(tenantCtx.tenantId, "assistant_chat", {
      windowMs: 60 * 1000,
      maxAttempts: 60, // 60 messages per minute per tenant
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please wait a moment before sending more messages.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // Resolve or create persistent conversation
    let convId = validated.conversationId;
    if (!convId) {
      const newConv = await AssistantConversationService.createConversation(
        tenantCtx.tenantId,
        tenantCtx.userId,
        rawMessage.slice(0, 35)
      );
      convId = newConv.id;
    }

    // Handle Clarification if ambiguous
    if (classification.needsClarification && classification.clarificationPrompt) {
      const text = isHindi
        ? (classification.clarificationPrompt.hi || classification.clarificationPrompt.hinglish)
        : isHinglish
        ? classification.clarificationPrompt.hinglish
        : classification.clarificationPrompt.en;

      // Save user message
      await AssistantConversationService.appendMessage(
        tenantCtx.tenantId,
        tenantCtx.userId,
        convId,
        "USER",
        rawMessage,
        classification.intent
      );

      const clarificationFollowUps = isHindi
        ? [
            "आज की बिक्री कितनी है?",
            "इस महीने का मुनाफा कितना है?",
            "कम स्टॉक वाले प्रोडक्ट्स दिखाओ",
            "ग्राहकों का कितना उधार बकाया है?",
          ]
        : isHinglish
        ? [
            "Aaj kitna sale hua?",
            "Is mahine ka profit kitna hai?",
            "Kaunse product low stock hain?",
            "Customer udhar kitna baaki hai?",
          ]
        : [
            "What is my total sales today?",
            "How much net profit this month?",
            "Which products are low on stock?",
            "How much money do customers owe?",
          ];

      const assistantMsg = await AssistantConversationService.appendMessage(
        tenantCtx.tenantId,
        tenantCtx.userId,
        convId,
        "ASSISTANT",
        text,
        classification.intent,
        {
          intent: classification.intent,
          periodLabel: isHindi ? "स्पष्टीकरण आवश्यक" : "Clarification Needed",
          sourceModule: "Elvori Business Assistant",
          suggestedFollowUps: clarificationFollowUps,
        }
      );

      return NextResponse.json({
        success: true,
        mode: "AUTHENTICATED",
        shopName: tenantCtx.tenantName,
        conversationId: convId,
        intent: classification.intent,
        confidence: classification.confidence,
        text,
        assistantMessage: assistantMsg,
      });
    }

    // Execute authorized business tool or verified support article
    const toolResult = await BusinessToolsRegistry.execute(
      classification.intent,
      tenantCtx.tenantId,
      tenantCtx.role,
      classification.dateRange,
      classification.supportTopic
    );

    const responseText = isHindi
      ? (toolResult.textHi || toolResult.textHinglish)
      : isHinglish
      ? toolResult.textHinglish
      : toolResult.textEn;

    const structuredData = toolResult.structuredData;
    if (structuredData && isHindi) {
      structuredData.suggestedFollowUps = [
        "आज की बिक्री कितनी है?",
        "कम स्टॉक वाले प्रोडक्ट्स कौन से हैं?",
        "ग्राहकों का बकाया उधार कितना है?",
        "इस महीने का शुद्ध मुनाफा कितना है?",
      ];
    } else if (structuredData && !isHinglish && !isHindi) {
      structuredData.suggestedFollowUps = [
        "What is today's total sales?",
        "Which products have low stock?",
        "What is total customer udhar?",
        "Show net profit this month",
      ];
    }

    // Save messages in authorized database
    await AssistantConversationService.appendMessage(
      tenantCtx.tenantId,
      tenantCtx.userId,
      convId,
      "USER",
      rawMessage,
      classification.intent
    );

    const assistantMsg = await AssistantConversationService.appendMessage(
      tenantCtx.tenantId,
      tenantCtx.userId,
      convId,
      "ASSISTANT",
      responseText,
      classification.intent,
      structuredData
    );

    return NextResponse.json({
      success: true,
      mode: "AUTHENTICATED",
      shopName: tenantCtx.tenantName,
      conversationId: convId,
      intent: classification.intent,
      confidence: classification.confidence,
      period: isHindi ? classification.dateRange.labelHi : isHinglish ? classification.dateRange.labelHinglish : classification.dateRange.labelEn,
      text: responseText,
      structuredData: structuredData || null,
      assistantMessage: assistantMsg,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

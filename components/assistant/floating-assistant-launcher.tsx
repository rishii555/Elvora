"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Send,
  Maximize2,
  AlertCircle,
  Loader2,
  Receipt,
  TrendingUp,
  Boxes,
  Users,
  HelpCircle,
  Paperclip,
  Store,
  LogIn,
  UserPlus
} from "lucide-react";
import { AssistantStructuredData } from "@/lib/assistant/types";
import { SafeMarkdown } from "./safe-markdown";
import { ElvoriMascot } from "./elvori-mascot";
import { ElvoriRichCard } from "./elvori-rich-cards";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageSelector } from "@/components/language-selector";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  text: string;
  structuredData?: AssistantStructuredData | null;
  timestamp: string;
}

type LangOption = "hinglish" | "en" | "hi";
type AccessMode = "PUBLIC" | "AUTHENTICATED";

export function FloatingAssistantLauncher() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AccessMode>("PUBLIC");
  const [shopName, setShopName] = useState<string | null>(null);
  const { language: globalLanguage, setLanguage: setGlobalLanguage } = useTranslation();
  const language = globalLanguage === "hi-Latn" ? "hinglish" : (globalLanguage as LangOption);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Detect Authenticated Session Server-Side on Mount
  useEffect(() => {
    let isMounted = true;

    // Restore saved language
    try {
      const savedLang = localStorage.getItem("elvora_assistant_language") as LangOption;
      if (savedLang === "en" || savedLang === "hi" || savedLang === "hinglish") {
        setGlobalLanguage(savedLang === "hinglish" ? "hi-Latn" : savedLang);
      }
    } catch {}

    // Check user auth state
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthenticated");
        return res.json();
      })
      .then((data) => {
        if (data && data.tenant && isMounted) {
          setMode("AUTHENTICATED");
          setShopName(data.tenant.name || "My Shop");
        }
      })
      .catch(() => {
        if (isMounted) {
          setMode("PUBLIC");
          setShopName(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [setGlobalLanguage]);



  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    setError(null);
    setInput("");
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "USER",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          conversationId: conversationId || undefined,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process message");
      }

      if (data.mode) {
        setMode(data.mode);
        if (data.shopName) setShopName(data.shopName);
      }

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMsg: Message = {
        id: data.assistantMessage?.id || `assistant-${Date.now()}`,
        role: "ASSISTANT",
        text: data.text,
        structuredData: data.structuredData,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Authenticated Quick Actions
  const authenticatedShortcuts = [
    {
      label: language === "hi" ? "आज की बिक्री" : language === "hinglish" ? "Today's Sales" : "Today's Sales",
      query: language === "hi" ? "आज की कुल बिक्री कितनी हुई?" : language === "hinglish" ? "Aaj kitna sale hua?" : "What is my total sales today?",
      icon: Receipt,
      color: "text-blue-600",
    },
    {
      label: language === "hi" ? "मासिक मुनाफा" : language === "hinglish" ? "Monthly Profit" : "Monthly Profit",
      query: language === "hi" ? "इस महीने का शुद्ध मुनाफा कितना है?" : language === "hinglish" ? "Is month ka net profit kitna hai?" : "What is my net profit this month?",
      icon: TrendingUp,
      color: "text-emerald-600",
    },
    {
      label: language === "hi" ? "कम स्टॉक" : language === "hinglish" ? "Low Stock" : "Low Stock",
      query: language === "hi" ? "कम स्टॉक वाले प्रोडक्ट्स कौन से हैं?" : language === "hinglish" ? "Kaunse product low stock hain?" : "Which products are low on stock?",
      icon: Boxes,
      color: "text-amber-600",
    },
    {
      label: language === "hi" ? "ग्राहक उधार" : language === "hinglish" ? "Customer Udhar" : "Customer Udhar",
      query: language === "hi" ? "ग्राहकों का कितना उधार बाकी है?" : language === "hinglish" ? "Customer udhar kitna baaki hai?" : "How much total Udhar is pending from customers?",
      icon: Users,
      color: "text-indigo-600",
    },
    {
      label: language === "hi" ? "सहायता" : language === "hinglish" ? "Help & Support" : "Help & Support",
      query: language === "hi" ? "काउंटर पीओएस में बिल कैसे बनाएं?" : language === "hinglish" ? "Counter POS kaise use karein?" : "How do I use Counter POS (F2)?",
      icon: HelpCircle,
      color: "text-slate-600",
    },
  ];

  // Public Suggested Questions
  const publicSuggestedQuestions = [
    {
      label: language === "hi" ? "एल्बोरा क्या है?" : language === "hinglish" ? "What is Elvora?" : "What is Elvora?",
      query: "What is Elvora?",
    },
    {
      label: language === "hi" ? "जीएसटी बिलिंग कैसे काम करती है?" : language === "hinglish" ? "How does GST Billing work?" : "How does GST Billing work?",
      query: "How does GST Billing work?",
    },
    {
      label: language === "hi" ? "काउंटर पीओएस क्या है?" : language === "hinglish" ? "What is Counter POS?" : "Tell me about Counter POS (F2)",
      query: "Tell me about Counter POS (F2)",
    },
    {
      label: language === "hi" ? "नया खाता कैसे बनाएं?" : language === "hinglish" ? "How do I create an account?" : "How do I create an account?",
      query: "How do I create an account?",
    },
    {
      label: language === "hi" ? "खाता अनुमोदन (Approval) कैसे होता है?" : language === "hinglish" ? "How does admin approval work?" : "How does admin approval work?",
      query: "How does admin approval work?",
    },
    {
      label: language === "hi" ? "प्लान्स और कीमतें" : language === "hinglish" ? "Frequently Asked Questions" : "Frequently Asked Questions",
      query: "What are the pricing plans and features?",
    },
  ];

  if (pathname === "/assistant") {
    return null;
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 px-4 py-2.5 font-semibold text-white shadow-xl shadow-blue-600/30 hover:shadow-indigo-600/40 transition-all transform hover:scale-105 active:scale-95 border border-white/20"
          aria-label="Open Elvori Assistant"
        >
          <ElvoriMascot size={28} pose="wave" animate={true} />
          <div className="text-left hidden sm:block">
            <span className="text-xs font-bold tracking-wide block leading-tight">Ask Elvori</span>
            <span className="text-[10px] text-blue-200 font-normal block">
              {mode === "AUTHENTICATED" ? (shopName || "Business Assistant") : "Product Help & FAQs"}
            </span>
          </div>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 flex h-[90vh] sm:h-[600px] w-[95vw] max-w-[430px] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header with Elvori Mascot & Identity */}
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 px-3.5 py-2.5 text-white shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <ElvoriMascot size={34} pose="happy" className="bg-white/15 p-0.5 rounded-xl backdrop-blur-sm" />
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold leading-tight">Elvori</h3>
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-300 bg-emerald-950/40 px-1.5 py-0.2 rounded-full border border-emerald-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-blue-100 truncate mt-0.5">
                  {mode === "AUTHENTICATED" ? (
                    <span className="inline-flex items-center gap-1">
                      <Store className="h-2.5 w-2.5" />
                      {shopName || "Your Business Assistant"}
                    </span>
                  ) : (
                    "Product Help & Support"
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Global Centralized Language Selector */}
              <LanguageSelector variant="assistant" />

              {/* Fullscreen Workspace Link (if authenticated) */}
              {mode === "AUTHENTICATED" && (
                <Link
                  href="/assistant"
                  className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                  title="Open Fullscreen Assistant"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Link>
              )}

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close Assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Stream Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/50">
            {/* If no messages yet, show Mode-Specific Welcome Screen */}
            {messages.length === 0 ? (
              <div className="my-auto py-4 space-y-4 text-center animate-in fade-in duration-300">
                {/* MODE A: PUBLIC WELCOME EXPERIENCE */}
                {mode === "PUBLIC" ? (
                  <div className="rounded-2xl border border-blue-100/90 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 p-4 text-center shadow-xs">
                    <div className="mx-auto mb-2 flex justify-center">
                      <ElvoriMascot size={72} pose="wave" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                      {language === "hi"
                        ? "नमस्ते! 👋 मैं एल्बोरी हूँ"
                        : language === "hinglish"
                        ? "Hello there! 👋 I'm Elvori"
                        : "Hello there! 👋 I'm Elvori"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                      {language === "hi"
                        ? "मैं एल्बोरा के फ़ीचर्स समझने, जीएसटी बिलिंग और अकाउंट शुरू करने में आपकी सहायता कर सकता हूँ।"
                        : language === "hinglish"
                        ? "I'm your Elvora Assistant. Main aapko Elvora ke features, GST billing, inventory aur FAQs me guide kar sakta hoon."
                        : "I'm your Elvora Assistant. I can help you explore Elvora, understand its features, get started, and find answers to common questions."}
                    </p>

                    {/* Public Quick Category Chips */}
                    <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
                      {publicSuggestedQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(q.query)}
                          className="rounded-full bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700 border border-slate-200/80 shadow-2xs transition-all text-left"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>

                    {/* Public CTA Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                      <Link
                        href="/register"
                        onClick={() => setIsOpen(false)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>
                          {language === "hi"
                            ? "एल्बोरा पर निःशुल्क खाता बनाएं"
                            : language === "hinglish"
                            ? "Create Your Elvora Account"
                            : "Create Your Elvora Account"}
                        </span>
                      </Link>
                      <Link
                        href="/login"
                        onClick={() => setIsOpen(false)}
                        className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 transition-colors"
                      >
                        <LogIn className="h-3 w-3" />
                        <span>
                          {language === "hi"
                            ? "पहले से खाता है? लॉगिन करें"
                            : language === "hinglish"
                            ? "Already have an account? Sign In"
                            : "Already have an account? Sign In"}
                        </span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* MODE B: AUTHENTICATED WELCOME EXPERIENCE */
                  <div className="rounded-2xl border border-blue-100/90 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 p-4 text-center shadow-xs">
                    <div className="mx-auto mb-2 flex justify-center">
                      <ElvoriMascot size={64} pose="laptop" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                      {language === "hi"
                        ? "नमस्ते! 👋 मैं एल्बोरी हूँ"
                        : language === "hinglish"
                        ? "Namaste! 👋 Main Elvori hoon"
                        : "Hello! 👋 I'm Elvori"}
                    </h3>
                    <p className="mt-0.5 text-xs text-blue-700 font-semibold">
                      {language === "hi"
                        ? `दुकान: ${shopName || "आपकी दुकान"}`
                        : `Your Business Assistant for ${shopName || "your shop"}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                      {language === "hi"
                        ? "आप अपनी दुकान की बिक्री, मुनाफा, स्टॉक, ग्राहकों के उधार या एल्बोरा फ़ीचर्स के बारे में पूछ सकते हैं।"
                        : language === "hinglish"
                        ? "Aap apne business ke sales, profit, inventory, customers, accounting aur Elvora features ke baare me pooch sakte hain."
                        : "Ask questions about your live shop data, profit & loss, inventory, customer udhar, or get guided module help."}
                    </p>

                    {/* Authenticated Suggested Action Chips */}
                    <div className="mt-3.5 grid grid-cols-2 gap-1.5">
                      {authenticatedShortcuts.map((shortcut, idx) => {
                        const Icon = shortcut.icon;
                        if (pathname === "/assistant") {
    return null;
  }

  return (
                          <button
                            key={idx}
                            onClick={() => handleSend(shortcut.query)}
                            className="flex items-center gap-2 rounded-xl bg-white hover:bg-blue-50 hover:border-blue-300 p-2 text-left border border-slate-200/80 shadow-2xs transition-all"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                              <Icon className={`h-3.5 w-3.5 ${shortcut.color}`} />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-800 truncate">
                              {shortcut.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Message Thread */
              messages.map((msg) => {
                const isUser = msg.role === "USER";
                if (pathname === "/assistant") {
    return null;
  }

  return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <ElvoriMascot size={26} pose="happy" className="mt-0.5 shrink-0" />
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                        isUser
                          ? "bg-blue-600 text-white rounded-tr-xs shadow-xs"
                          : "bg-white text-slate-800 border border-slate-200/90 shadow-xs rounded-tl-xs"
                      }`}
                    >
                      {/* Markdown rendering with asterisk elimination */}
                      <SafeMarkdown content={msg.text} isUser={isUser} />

                      {/* Rich Cards (Sales Summary, Low Stock Table, Public CTA) */}
                      {!isUser && msg.structuredData && (
                        <ElvoriRichCard
                          data={msg.structuredData}
                          language={language}
                          onActionClick={() => setIsOpen(false)}
                        />
                      )}

                      {/* Suggested Follow-Ups */}
                      {!isUser && msg.structuredData?.suggestedFollowUps && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            {language === "hi" ? "संबंधित प्रश्न:" : "Related questions:"}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {msg.structuredData.suggestedFollowUps.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSend(q)}
                                className="text-[10px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2 py-1 rounded-md border border-slate-200/60 transition-colors text-left"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className={`mt-1 text-[9px] ${
                          isUser ? "text-blue-200 text-right" : "text-slate-400"
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading Indicator with Elvori Thinking Pose */}
            {loading && (
              <div className="flex gap-2 items-center">
                <ElvoriMascot size={26} pose="thinking" className="shrink-0" />
                <div className="flex items-center gap-2 text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-2xl rounded-tl-xs shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 shrink-0" />
                  <span className="text-xs font-medium animate-pulse">
                    {language === "hi"
                      ? "एल्बोरी हिसाब लगा रहा है..."
                      : language === "hinglish"
                      ? "Elvori data check kar raha hai..."
                      : "Elvori is calculating..."}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <div className="flex-1 truncate">{error}</div>
                <button
                  onClick={() => handleSend(messages[messages.length - 1]?.text)}
                  className="font-bold underline text-[10px] shrink-0"
                >
                  {language === "hi" ? "पुनः प्रयास" : "Retry"}
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips Footer */}
          {mode === "AUTHENTICATED" && (
            <div className="border-t border-slate-100 bg-white px-2.5 py-1.5 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
              {authenticatedShortcuts.map((act, i) => {
                const Icon = act.icon;
                if (pathname === "/assistant") {
    return null;
  }

  return (
                  <button
                    key={i}
                    onClick={() => handleSend(act.query)}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors border border-slate-200/60 shrink-0"
                  >
                    <Icon className={`h-3 w-3 ${act.color}`} />
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="border-t border-slate-200 bg-white p-2.5"
          >
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50/60 px-2.5 py-1.5 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                title="Attachment"
                onClick={() => {}}
                aria-label="Attachments"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === "PUBLIC"
                    ? (language === "hi"
                        ? "एल्बोरा के बारे में कुछ भी पूछें..."
                        : language === "hinglish"
                        ? "Elvora ke baare me sawaal poochein..."
                        : "Ask about Elvora, features, or getting started...")
                    : (language === "hi"
                        ? "अपनी दुकान का सवाल पूछें (जैसे, आज की बिक्री कितनी है?)..."
                        : language === "hinglish"
                        ? "Apni dukaan ka sawaal yahan poochein..."
                        : "Ask a business question (e.g., today's sales)...")
                }
                className="flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors shrink-0"
                aria-label="Send Query"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Plus,
  Trash2,
  Receipt,
  Boxes,
  Users,
  TrendingUp,
  Landmark,
  HelpCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Store,
} from "lucide-react";
import { AssistantStructuredData } from "@/lib/assistant/types";
import { SafeMarkdown } from "@/components/assistant/safe-markdown";
import { ElvoriMascot } from "@/components/assistant/elvori-mascot";
import { ElvoriRichCard } from "@/components/assistant/elvori-rich-cards";
import { useTranslation } from "@/lib/i18n/context";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  lastMessageSnippet?: string;
  messageCount?: number;
}

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  text: string;
  intent?: string | null;
  structuredData?: AssistantStructuredData | null;
  createdAt: string;
}

type LangOption = "hinglish" | "en" | "hi";

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const { language: globalLanguage, setLanguage: setGlobalLanguage } = useTranslation();
  const language = globalLanguage === "hi-Latn" ? "hinglish" : (globalLanguage as LangOption);
  const [shopName, setShopName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore saved language and fetch tenant details
  useEffect(() => {
    try {
      const saved = localStorage.getItem("elvora_assistant_language") as LangOption;
      if (saved === "en" || saved === "hi" || saved === "hinglish") {
        setGlobalLanguage(saved === "hinglish" ? "hi-Latn" : saved);
      }
    } catch {}

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tenant?.name) {
          setShopName(data.tenant.name);
        }
      })
      .catch(() => {});
  }, [setGlobalLanguage]);

  const handleLanguageChange = (newLang: LangOption) => {
    setGlobalLanguage(newLang === "hinglish" ? "hi-Latn" : newLang);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await fetch("/api/assistant/conversations");
      const data = await res.json();
      if (data.success && data.conversations) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !activeConversationId) {
          selectConversation(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to load conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    setSidebarOpen(false);
    setError(null);
    try {
      setLoading(true);
      const res = await fetch(`/api/assistant/conversations/${id}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch {
      setError(
        language === "hi"
          ? "बातचीत लोड करने में विफल।"
          : language === "hinglish"
          ? "Conversation history load karne me dikkat aayi."
          : "Failed to load conversation history."
      );
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async () => {
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setSidebarOpen(false);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmPrompt =
      language === "hi"
        ? "क्या आप इस बातचीत को हटाना चाहते हैं?"
        : language === "hinglish"
        ? "Kya aap is conversation ko delete karna chahte hain?"
        : "Are you sure you want to delete this conversation?";

    if (!confirm(confirmPrompt)) return;

    try {
      const res = await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          startNewConversation();
        }
      }
    } catch {
      alert("Failed to delete conversation.");
    }
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    setError(null);
    setInput("");

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "USER",
      text: textToSend,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          conversationId: activeConversationId || undefined,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process query.");
      }

      if (data.shopName) {
        setShopName(data.shopName);
      }

      if (data.conversationId && (!activeConversationId || activeConversationId !== data.conversationId)) {
        setActiveConversationId(data.conversationId);
        loadConversations();
      }

      const assistantMsg: Message = {
        id: data.assistantMessage?.id || `assistant-${Date.now()}`,
        role: "ASSISTANT",
        text: data.text,
        intent: data.intent,
        structuredData: data.structuredData,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || "Failed to communicate with assistant.");
    } finally {
      setLoading(false);
    }
  };

  const quickCategories = [
    {
      category: "Sales & Invoices",
      categoryHinglish: "Bikri aur Bills",
      categoryHi: "बिक्री और बिल",
      icon: Receipt,
      promptsEn: [
        "What is my total sales today?",
        "What are our total sales this month?",
        "Show top selling products",
      ],
      promptsHinglish: [
        "Aaj kitna sale hua?",
        "Is mahine ki total bikri kitni hai?",
        "Top selling products dikhao",
      ],
      promptsHi: [
        "आज की कुल बिक्री कितनी हुई?",
        "इस महीने की कुल बिक्री कितनी है?",
        "सबसे ज्यादा बिकने वाले उत्पाद दिखाएं",
      ],
    },
    {
      category: "Profit & Expenses",
      categoryHinglish: "Munafa aur Kharche",
      categoryHi: "मुनाफा और खर्चे",
      icon: TrendingUp,
      promptsEn: [
        "What is my net profit this month?",
        "Show total shop expenses",
        "Compare sales with last month",
      ],
      promptsHinglish: [
        "Is month ka net profit kitna hai?",
        "Dukaan ka total kharcha kitna hua?",
        "Compare sales with last month",
      ],
      promptsHi: [
        "इस महीने का शुद्ध मुनाफा कितना है?",
        "दुकान का कुल खर्च दिखाएं",
        "पिछले महीने की तुलना में बिक्री दिखाएं",
      ],
    },
    {
      category: "Inventory & Stock",
      categoryHinglish: "Stock aur Godown",
      categoryHi: "स्टॉक और गोदाम",
      icon: Boxes,
      promptsEn: [
        "Which products are low on stock?",
        "Which items are out of stock?",
        "What is the total valuation of my inventory?",
      ],
      promptsHinglish: [
        "Kaunse product low stock hain?",
        "Kaunse items out of stock ho gaye?",
        "Dukaan me kitne ka maal hai?",
      ],
      promptsHi: [
        "कौन से उत्पादों का स्टॉक कम है?",
        "कौन से उत्पाद आउट-ऑफ-स्टॉक हैं?",
        "दुकान में कुल कितने मूल्य का माल है?",
      ],
    },
    {
      category: "Customers & Udhar",
      categoryHinglish: "Grahak aur Udhar",
      categoryHi: "ग्राहक और उधार",
      icon: Users,
      promptsEn: [
        "How much total Udhar is pending from customers?",
        "Who are our top customers?",
        "Show overdue invoices",
      ],
      promptsHinglish: [
        "Customers ke paas kitna udhar baaki hai?",
        "Sabse bade grahak kaun hain?",
        "Overdue invoices dikhao",
      ],
      promptsHi: [
        "ग्राहकों के पास कुल कितना उधार बकाया है?",
        "दुकान के सबसे बड़े ग्राहक कौन हैं?",
        "अतिदेय (Overdue) बिल दिखाएं",
      ],
    },
    {
      category: "Accounting & Cash",
      categoryHinglish: "Khata aur Rokad",
      categoryHi: "खाता और रोकड़",
      icon: Landmark,
      promptsEn: [
        "What is my cash and bank balance?",
        "Is my Trial Balance balanced?",
        "How much money do we owe suppliers?",
      ],
      promptsHinglish: [
        "Cash aur Bank me kitna balance hai?",
        "Trial Balance barabar hai kya?",
        "Suppliers ko kitna payment baaki hai?",
      ],
      promptsHi: [
        "नकद और बैंक खातों में कितना बैलेंस है?",
        "क्या ट्रायल बैलेंस संतुलित है?",
        "सप्लायर्स को कितना भुगतान बकाया है?",
      ],
    },
    {
      category: "Elvora Support",
      categoryHinglish: "Elvora Madad aur Guides",
      categoryHi: "एल्बोरा मदद और गाइड",
      icon: HelpCircle,
      promptsEn: [
        "How do I use Counter POS (F2)?",
        "How to generate a GST B2B invoice?",
        "How do I add staff and assign roles?",
      ],
      promptsHinglish: [
        "Counter POS me bill kaise banaye?",
        "GST tax invoice kaise generate kare?",
        "Staff add karke permissions kaise dein?",
      ],
      promptsHi: [
        "काउंटर पीओएस (F2) में बिल कैसे बनाएं?",
        "जीएसटी टैक्स इनवॉइस कैसे बनाएं?",
        "कर्मचारियों को जोड़कर भूमिकाएं कैसे सौंपें?",
      ],
    },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      {/* 1. Conversations Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-30 w-72 flex-col border-r border-slate-200 bg-slate-50 transition-transform duration-200 ease-in-out md:static md:flex md:translate-x-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-3.5 bg-white/70">
          <div className="flex items-center gap-2">
            <ElvoriMascot size={28} pose="happy" />
            <span className="text-xs font-bold text-slate-900">
              {language === "hi" ? "बातचीत सूची" : "Conversations"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={startNewConversation}
              className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200/60"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{language === "hi" ? "नई चैट" : "New"}</span>
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConversations ? (
            <div className="flex items-center justify-center p-8 text-xs text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>{language === "hi" ? "लोड हो रहा है..." : "Loading history..."}</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              <MessageSquare className="mx-auto mb-2 h-6 w-6 opacity-40" />
              <p>{language === "hi" ? "कोई पुरानी बातचीत नहीं" : "No previous conversations"}</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-700 hover:bg-slate-200/60"
                  }`}
                >
                  <div className="flex-1 truncate pr-2">
                    <p className="truncate text-xs">{conv.title}</p>
                    <p className={`text-[10px] ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                      {new Date(conv.updatedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className={`rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isActive
                        ? "text-white/80 hover:bg-blue-700 hover:text-white"
                        : "text-slate-400 hover:bg-slate-300 hover:text-rose-600"
                    }`}
                    title="Delete Conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Security badge */}
        <div className="border-t border-slate-200 p-3 bg-white/50">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Deterministic Tenant Sandbox</span>
          </div>
        </div>
      </aside>

      {/* 2. Main Chat Thread & Header */}
      <main className="flex flex-1 flex-col overflow-hidden bg-white">
        {/* Workspace Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5 truncate">
              <ElvoriMascot size={32} pose="happy" />
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h1 className="text-xs font-bold text-slate-900 sm:text-sm truncate">
                    Elvori — Your Elvora Business Assistant
                  </h1>
                  {shopName && (
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200/60">
                      <Store className="h-2.5 w-2.5" />
                      {shopName}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  {language === "hi"
                    ? "सटीक डेटा एनालिटिक्स, अकाउंटिंग गणनाएं और मॉड्यूल सहायता"
                    : "Deterministic analytics, accounting calculations & feature guides"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Language Selector: Hinglish / English / Hindi */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => handleLanguageChange("hinglish")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                  language === "hinglish"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Hinglish
              </button>
              <button
                onClick={() => handleLanguageChange("en")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                  language === "en"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                English
              </button>
              <button
                onClick={() => handleLanguageChange("hi")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                  language === "hi"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                हिंदी
              </button>
            </div>

            <button
              onClick={startNewConversation}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{language === "hi" ? "नई चैट" : "New Chat"}</span>
            </button>
          </div>
        </header>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
          {messages.length === 0 ? (
            /* Empty State: Prominent Elvori Mascot & Categorized Cards */
            <div className="mx-auto max-w-3xl space-y-6 py-4 animate-in fade-in duration-300">
              <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 p-6 text-center shadow-xs">
                <div className="mx-auto mb-3 flex justify-center">
                  <ElvoriMascot size={80} pose="laptop" />
                </div>
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  {language === "hi"
                    ? "नमस्ते! 👋 मैं एल्बोरी हूँ"
                    : language === "hinglish"
                    ? "Namaste! 👋 Main Elvori hoon"
                    : "Namaste! 👋 I'm Elvori"}
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-blue-700">
                  {language === "hi"
                    ? `दुकान: ${shopName || "आपकी अधिकृत दुकान"}`
                    : `Your Elvora Business Assistant for ${shopName || "your shop"}`}
                </p>
                <p className="mx-auto mt-1 max-w-lg text-xs text-slate-600">
                  {language === "hi"
                    ? "अपनी दुकान की रियल-टाइम बिक्री, शुद्ध लाभ, कम स्टॉक अलर्ट, ग्राहकों के उधार या एल्बोरा के किसी फ़ीचर के बारे में पूछें।"
                    : language === "hinglish"
                    ? "Apni dukaan ki real-time sales, net profit, low-stock alerts, customer udhar ya Elvora ke kisi feature ke baare me sawaal poochein."
                    : "Ask questions about your live shop data, profit & loss, low stock, customer udhar, or get guided support for any Elvora module."}
                </p>
              </div>

              {/* Categorized Question Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quickCategories.map((cat, i) => {
                  const Icon = cat.icon;
                  const title =
                    language === "hi"
                      ? cat.categoryHi
                      : language === "hinglish"
                      ? cat.categoryHinglish
                      : cat.category;
                  const promptList =
                    language === "hi"
                      ? cat.promptsHi
                      : language === "hinglish"
                      ? cat.promptsHinglish
                      : cat.promptsEn;

                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:border-blue-300 transition-all"
                    >
                      <div className="mb-2.5 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-800">{title}</h3>
                      </div>
                      <div className="space-y-1.5">
                        {promptList.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(p)}
                            className="group flex w-full items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <span className="truncate">{p}</span>
                            <ChevronRight className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Active Message List */
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === "USER";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <ElvoriMascot size={32} pose="happy" className="mt-0.5 shrink-0" />
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isUser
                          ? "bg-blue-600 text-white rounded-tr-xs shadow-xs"
                          : "bg-white text-slate-800 border border-slate-200/90 shadow-xs rounded-tl-xs"
                      }`}
                    >
                      {/* Safe Markdown formatting without asterisks */}
                      <SafeMarkdown content={msg.text} isUser={isUser} />

                      {/* Rich Business Response Cards */}
                      {!isUser && msg.structuredData && (
                        <ElvoriRichCard data={msg.structuredData} language={language} />
                      )}

                      {/* Suggested follow-up pills */}
                      {!isUser && msg.structuredData?.suggestedFollowUps && (
                        <div className="pt-2 border-t border-slate-100 mt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            {language === "hi" ? "सुझाए गए अगले प्रश्न:" : "Suggested next questions:"}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.structuredData.suggestedFollowUps.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSend(q)}
                                className="rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-all border border-slate-200/60 text-left"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className={`mt-1.5 text-[10px] ${
                          isUser ? "text-blue-200 text-right" : "text-slate-400"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing Loader with Mascot */}
              {loading && (
                <div className="flex gap-3 items-center">
                  <ElvoriMascot size={32} pose="thinking" className="shrink-0" />
                  <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-3 text-xs text-slate-500 shadow-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="font-medium animate-pulse">
                      {language === "hi"
                        ? "एल्बोरी दुकान के वास्तविक डेटा की गणना कर रहा है..."
                        : language === "hinglish"
                        ? "Elvori real-time figures calculate kar raha hai..."
                        : "Elvori is calculating real-time figures..."}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span className="flex-1">{error}</span>
                  <button
                    onClick={() => handleSend(messages[messages.length - 1]?.text)}
                    className="font-bold underline text-xs"
                  >
                    {language === "hi" ? "पुनः प्रयास" : "Retry"}
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar Footer */}
        <footer className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mx-auto max-w-3xl"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50/60 p-1.5 pl-4 shadow-xs focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  language === "hi"
                    ? "अपनी दुकान या एल्बोरा के बारे में प्रश्न पूछें (जैसे, आज की कुल बिक्री कितनी हुई?)..."
                    : language === "hinglish"
                    ? "Apni dukaan ka sawaal yahan poochein (e.g., Aaj ki sales kitni hui?)..."
                    : "Ask a business or support question (e.g., What are my sales today?)..."
                }
                disabled={loading}
                className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs hover:bg-blue-700 disabled:opacity-40 transition-colors"
                aria-label="Send Query"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </footer>
      </main>
    </div>
  );
}

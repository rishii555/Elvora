import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_SUGGESTIONS } from "@/lib/assistant/public-knowledge";
import { handleApiError } from "@/lib/api/security";

export const dynamic = "force-dynamic";

export interface SuggestedQuestionCategory {
  category: string;
  categoryHinglish: string;
  categoryHi: string;
  icon: string;
  questions: Array<{
    textEn: string;
    textHinglish: string;
    textHi: string;
    intentHint: string;
  }>;
}

const SUGGESTIONS: SuggestedQuestionCategory[] = [
  {
    category: "Sales & Invoicing",
    categoryHinglish: "Bikri aur Billing",
    categoryHi: "बिक्री और बिलिंग",
    icon: "Receipt",
    questions: [
      { textEn: "How much did we sell today?", textHinglish: "Aaj kitna sale hua?", textHi: "आज की कुल बिक्री कितनी हुई?", intentHint: "SALES_SUMMARY" },
      { textEn: "What are our total sales this month?", textHinglish: "Is mahine ki total bikri kitni hai?", textHi: "इस महीने की कुल बिक्री कितनी है?", intentHint: "SALES_SUMMARY" },
      { textEn: "Compare this month's sales with last month", textHinglish: "Pichle mahine se kitna jyada sale hua?", textHi: "पिछले महीने की तुलना में कितनी बिक्री हुई?", intentHint: "SALES_COMPARISON" },
      { textEn: "Show top selling products", textHinglish: "Sabse jyada kya bika?", textHi: "सबसे ज्यादा बिकने वाले उत्पाद दिखाएं", intentHint: "TOP_SELLING_PRODUCTS" },
      { textEn: "How many invoices were generated this week?", textHinglish: "Is hafte kitne bill bane?", textHi: "इस सप्ताह कुल कितने बिल बने?", intentHint: "INVOICE_METRICS" },
    ],
  },
  {
    category: "Profit & Expenses",
    categoryHinglish: "Munafa aur Kharche",
    categoryHi: "मुनाफा और खर्चे",
    icon: "DollarSign",
    questions: [
      { textEn: "What is my net profit this month?", textHinglish: "Is month ka net profit kitna hai?", textHi: "इस महीने का शुद्ध मुनाफा कितना है?", intentHint: "PROFIT_AND_LOSS" },
      { textEn: "Show total expenses and category breakdown", textHinglish: "Dukaan ka total kharcha kitna hua?", textHi: "दुकान का कुल खर्च और विवरण दिखाएं", intentHint: "EXPENSE_SUMMARY" },
      { textEn: "Show Profit & Loss statement for this year", textHinglish: "Is saal ka P&L statement dikhao", textHi: "इस वित्तीय वर्ष का लाभ-हानि विवरण दिखाएं", intentHint: "PROFIT_AND_LOSS" },
    ],
  },
  {
    category: "Inventory & Stock",
    categoryHinglish: "Stock aur Maal",
    categoryHi: "स्टॉक और इन्वेंटरी",
    icon: "Boxes",
    questions: [
      { textEn: "Which products are running low on stock?", textHinglish: "Kaunse products ka stock khatam hone wala hai?", textHi: "कौन से उत्पादों का स्टॉक खत्म होने वाला है?", intentHint: "INVENTORY_LOW_STOCK" },
      { textEn: "Which items are completely out of stock?", textHinglish: "Kaunse product out of stock ho gaye?", textHi: "कौन से उत्पाद आउट-ऑफ-स्टॉक हो चुके हैं?", intentHint: "INVENTORY_OUT_OF_STOCK" },
      { textEn: "What is the total valuation of my inventory?", textHinglish: "Dukaan me kul kitne rupaye ka maal hai?", textHi: "दुकान में कुल कितने मूल्य का स्टॉक है?", intentHint: "INVENTORY_VALUATION" },
      { textEn: "What items should I reorder now?", textHinglish: "Kya reorder karne ki zaroorat hai?", textHi: "कौन से उत्पाद अभी रीऑर्डर करने चाहिए?", intentHint: "INVENTORY_REORDER" },
    ],
  },
  {
    category: "Customers & Udhar",
    categoryHinglish: "Grahak aur Udhar Khata",
    categoryHi: "ग्राहक और उधार खाता",
    icon: "Users",
    questions: [
      { textEn: "How much total Udhar is pending from customers?", textHinglish: "Customers ke paas kitna udhar baaki hai?", textHi: "ग्राहकों के पास कुल कितना उधार बकाया है?", intentHint: "CUSTOMER_OUTSTANDING" },
      { textEn: "Who are our top customers by revenue?", textHinglish: "Sabse bade grahak kaun hain?", textHi: "दुकान के सबसे बड़े ग्राहक कौन हैं?", intentHint: "TOP_CUSTOMERS" },
      { textEn: "Show overdue customer balances", textHinglish: "Overdue udhar ki list dikhao", textHi: "अतिदेय (Overdue) ग्राहकों की सूची दिखाएं", intentHint: "CUSTOMER_OUTSTANDING" },
    ],
  },
  {
    category: "Suppliers & Purchases",
    categoryHinglish: "Vyapari aur Kharidari",
    categoryHi: "सप्लायर्स और खरीद",
    icon: "Truck",
    questions: [
      { textEn: "How much money do we owe suppliers?", textHinglish: "Suppliers ko kitna payment baaki hai?", textHi: "सप्लायर्स को कितना भुगतान करना शेष है?", intentHint: "SUPPLIER_OUTSTANDING" },
      { textEn: "How much did we purchase this month?", textHinglish: "Is mahine kitna maal kharida?", textHi: "इस महीने कुल कितना माल खरीदा गया?", intentHint: "PURCHASE_SUMMARY" },
    ],
  },
  {
    category: "Accounting & Cash",
    categoryHinglish: "Hisaab-Kitab aur Cash",
    categoryHi: "हिसाब-किताब और नकद",
    icon: "Landmark",
    questions: [
      { textEn: "What is my cash and bank balance?", textHinglish: "Galle aur Bank me kitna balance hai?", textHi: "नकद और बैंक खातों में कितना बैलेंस है?", intentHint: "CASH_BANK_BALANCE" },
      { textEn: "Is my Trial Balance balanced?", textHinglish: "Trial Balance barabar hai kya?", textHi: "क्या ट्रायल बैलेंस संतुलित है?", intentHint: "TRIAL_BALANCE" },
      { textEn: "Show my shop Balance Sheet", textHinglish: "Balance Sheet dikhao", textHi: "दुकान की बैलेंस शीट दिखाएं", intentHint: "BALANCE_SHEET" },
    ],
  },
  {
    category: "Elvora Help & How-To",
    categoryHinglish: "Elvora Madad aur Guides",
    categoryHi: "एल्बोरा मदद और गाइड",
    icon: "HelpCircle",
    questions: [
      { textEn: "How do I use Counter POS (F2)?", textHinglish: "Counter POS kaise use karein?", textHi: "काउंटर पीओएस (F2) का उपयोग कैसे करें?", intentHint: "ELVORA_SUPPORT" },
      { textEn: "How to generate a GST B2B invoice?", textHinglish: "GST bill kaise banayein?", textHi: "जीएसटी B2B टैक्स इनवॉइस कैसे बनाएं?", intentHint: "ELVORA_SUPPORT" },
      { textEn: "How do I add new products and barcode?", textHinglish: "Naya product aur barcode kaise add karein?", textHi: "नया उत्पाद और बारकोड कैसे जोड़ें?", intentHint: "ELVORA_SUPPORT" },
      { textEn: "How does new account approval work?", textHinglish: "Naye account ka approval kaise hota hai?", textHi: "नए खाते का अनुमोदन कैसे होता है?", intentHint: "ELVORA_SUPPORT" },
      { textEn: "How do I add staff and assign roles?", textHinglish: "Staff add karke role kaise assign karein?", textHi: "स्टाफ सदस्य जोड़कर भूमिकाएं कैसे सौंपें?", intentHint: "ELVORA_SUPPORT" },
    ],
  },
];

import { requireTenantContext } from "@/lib/tenant/context";

export async function GET(req: NextRequest) {
  try {
    let isAuthenticated = false;
    try {
      await requireTenantContext(req);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }

    if (isAuthenticated) {
      return NextResponse.json({
        success: true,
        mode: "AUTHENTICATED",
        categories: SUGGESTIONS,
      });
    }

    return NextResponse.json({
      success: true,
      mode: "PUBLIC",
      categories: PUBLIC_SUGGESTIONS,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

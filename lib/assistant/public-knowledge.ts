/**
 * Elvora — Public Product Knowledge Base & FAQ Engine
 * Safe, verified product information for unauthenticated visitors.
 * Never touches tenant databases or financial records.
 */

export interface PublicKnowledgeTopic {
  id: string;
  category: "ABOUT" | "FEATURES" | "GETTING_STARTED" | "FAQS";
  keywords: string[];
  titleEn: string;
  titleHinglish: string;
  titleHi: string;
  answerEn: string;
  answerHinglish: string;
  answerHi: string;
  keyFeatures?: string[];
  actionLink?: {
    labelEn: string;
    labelHinglish: string;
    labelHi: string;
    href: string;
  };
}

export const ELVORI_PUBLIC_KNOWLEDGE: PublicKnowledgeTopic[] = [
  {
    id: "WHAT_IS_ELVORA",
    category: "ABOUT",
    keywords: [
      "what is elvora", "elvora kya hai", "elvora", "about", "overview", "what does elvora do",
      "who can use elvora", "business types", "एल्बोरा क्या है", "एल्बोरा"
    ],
    titleEn: "What is Elvora?",
    titleHinglish: "Elvora Kya Hai?",
    titleHi: "एल्बोरा क्या है?",
    answerEn: "Elvora is an all-in-one, multi-tenant cloud business management SaaS designed specifically for Indian retail shops, distributors, and SMEs. It unifies **GST Invoicing**, **Fast Counter POS**, **Multi-Warehouse Inventory**, **Customer Khata (Udhar)**, **Supplier Payables**, and **Automated Double-Entry Accounting** into a single, intuitive platform.",
    answerHinglish: "Elvora ek all-in-one business management platform hai jisme aapko **GST Billing**, **Fast Counter POS**, **Inventory Management**, **Grahak Udhar Khata**, **Suppliers**, aur **Double-Entry Accounting** sabhi ek jagah milte hain. Ye retail dukaano, wholesalers aur SMEs ke liye specially design kiya gaya hai.",
    answerHi: "एल्बोरा एक संपूर्ण, क्लाउड-आधारित बिजनेस मैनेजमेंट प्लेटफ़ॉर्म है जिसे विशेष रूप से भारतीय रिटेल दुकानों, थोक व्यापारियों और छोटे-बड़े व्यवसायों के लिए बनाया गया है। इसमें **जीएसटी बिलिंग**, **फास्ट काउंटर पीओएस**, **इन्वेंटरी व गोदाम प्रबंधन**, **ग्राहक उधार खाता**, और **स्वचालित दोहरी प्रविष्टि अकाउंटिंग** सब एक साथ उपलब्ध है।",
    keyFeatures: [
      "GST Compliant Invoicing & Counter POS (F2)",
      "Real-time Inventory & Low-Stock Alerts",
      "Customer Khata & Automated Payment Reminders",
      "Double-Entry Accounting, P&L & Balance Sheet",
      "Multi-Tenant Security & Granular Staff Roles"
    ],
    actionLink: {
      labelEn: "Create Free Account →",
      labelHinglish: "Free Account Banayein →",
      labelHi: "निःशुल्क खाता बनाएं →",
      href: "/register",
    },
  },
  {
    id: "GST_BILLING_EXPLAINED",
    category: "FEATURES",
    keywords: [
      "gst", "gst billing", "gst invoice", "b2b", "b2c", "tax invoice", "cgst", "sgst", "igst",
      "gst bill kaise banaye", "hsn", "tax rates", "जीएसटी बिलिंग", "टैक्स बिल"
    ],
    titleEn: "How does GST Billing work in Elvora?",
    titleHinglish: "Elvora me GST Billing kaise kaam karti hai?",
    titleHi: "एल्बोरा में जीएसटी बिलिंग कैसे काम करती है?",
    answerEn: "Elvora automatically calculates CGST, SGST, and IGST based on customer state codes and product HSN codes. You can generate professional **B2B Tax Invoices** (with input tax credit) and fast **B2C retail receipts**. Print formats include full A4 invoices and 3-inch thermal POS slips, ready to export for monthly GSTR-1 and GSTR-3B filings.",
    answerHinglish: "Elvora me GST bill banana behad aasan hai. HSN code aur customer ke state code ke mutabiq CGST, SGST aur IGST apne aap calculate ho jata hai. B2B invoices aur B2C counter bills instant generate hote hain jinhe aap A4 ya Thermal receipt format me print kar sakte hain.",
    answerHi: "एल्बोरा में जीएसटी बिलिंग पूरी तरह स्वचालित है। ग्राहक के राज्य और उत्पाद के HSN कोड के अनुसार CGST, SGST और IGST अपने आप जुड़ जाते हैं। आप B2B टैक्स इनवॉइस (ITC सहित) और B2C रिटेल बिल तुरंत बना सकते हैं तथा A4 या थर्मल रसीद में प्रिंट कर सकते हैं।",
    actionLink: {
      labelEn: "Explore GST Billing Software →",
      labelHinglish: "GST Billing ke baare me janein →",
      labelHi: "जीएसटी बिलिंग सॉफ्टवेयर देखें →",
      href: "/gst-billing-software",
    },
  },
  {
    id: "COUNTER_POS_EXPLAINED",
    category: "FEATURES",
    keywords: [
      "pos", "counter pos", "fast billing", "f2", "barcode", "thermal", "receipt", "counter bill",
      "pos billing", "kachha bill", "पीओएस", "काउंटर बिलिंग", "फास्ट बिलिंग"
    ],
    titleEn: "Counter POS & Quick Billing (F2)",
    titleHinglish: "Counter POS aur F2 Quick Billing",
    titleHi: "काउंटर पीओएस और त्वरित बिलिंग (F2)",
    answerEn: "The Counter POS is built for high-speed retail checkout. Cashiers can use the **F2 keyboard hotkey**, scan barcodes in milliseconds, split payments across Cash, UPI (Dynamic QR), and Card, and print thermal receipts with zero lag.",
    answerHinglish: "Counter POS retail counters par tezi se billing karne ke liye banaya gaya hai. 'F2' shortcut press karein, barcode scan karein, Cash/UPI payment lein aur turant thermal bill print karein. Isme internet speed slow hone par bhi billing smoothly chalti hai.",
    answerHi: "काउंटर पीओएस रिटेल दुकानों पर तीव्र गति से बिलिंग करने के लिए डिज़ाइन किया गया है। 'F2' शॉर्टकट दबाकर तुरंत उत्पाद बारकोड स्कैन करें, नकद या यूपीआई भुगतान स्वीकार करें और बिना किसी रुकावट के थर्मल रसीद प्रिंट करें।",
    actionLink: {
      labelEn: "Learn More About POS →",
      labelHinglish: "POS Billing dekhein →",
      labelHi: "पीओएस बिलिंग विवरण देखें →",
      href: "/pos-software",
    },
  },
  {
    id: "INVENTORY_WAREHOUSES",
    category: "FEATURES",
    keywords: [
      "inventory", "stock", "warehouse", "godown", "low stock", "reorder", "variants", "sku",
      "stock kaise manage kare", "इन्वेंटरी", "स्टॉक", "गोदाम"
    ],
    titleEn: "Inventory & Multi-Warehouse Tracking",
    titleHinglish: "Inventory aur Godown Management",
    titleHi: "इन्वेंटरी और गोदाम प्रबंधन",
    answerEn: "Track stock across multiple warehouses or store branches in real-time. Features include **automated low-stock reorder alerts**, SKU/barcode generation, batch tracking, inventory cost valuation, and stock reconciliation adjustments.",
    answerHinglish: "Aap ek se jyada godown ya branches me stock ko live track kar sakte hain. Jab bhi kisi product ka stock kam hone lagta hai, Elvora pehle hi **Low Stock Warning** de deta hai taaki aapka koi customer bina maal ke wapas na jaye.",
    answerHi: "अपनी दुकान और अलग-अलग गोदामों में स्टॉक को रीयल-टाइम ट्रैक करें। इसमें कम-स्टॉक रीऑर्डर अलर्ट, बारकोड जेनरेशन, बैच ट्रैकिंग और स्टॉक वैल्यूएशन की पूरी सुविधा शामिल है।",
    actionLink: {
      labelEn: "Explore Inventory Features →",
      labelHinglish: "Inventory Features janein →",
      labelHi: "इन्वेंटरी फ़ीचर्स देखें →",
      href: "/inventory-management-software",
    },
  },
  {
    id: "HOW_TO_REGISTER",
    category: "GETTING_STARTED",
    keywords: [
      "register", "signup", "create account", "account kaise banaye", "registration", "free account",
      "sign up", "शुरू कैसे करें", "खाता कैसे बनाएं", "पंजीकरण"
    ],
    titleEn: "How to Create an Elvora Account?",
    titleHinglish: "Elvora Account Kaise Banayein?",
    titleHi: "एल्बोरा पर नया खाता कैसे बनाएं?",
    answerEn: "Creating an account is fast and free:\n1. Click **Create Account** at `/register`.\n2. Enter your full name, shop trade name, email, and secure password.\n3. Verify your email to activate your business tenant profile.\n4. Log in at `/login` to access your executive dashboard and complete initial shop setup.",
    answerHinglish: "Account banana bilkul aasan hai:\n1. `/register` page par jayein.\n2. Apna naam, dukaan ka naam, email aur password enter karein.\n3. Account submit hone par verification status activate ho jata hai.\n4. `/login` par jakar turant login karein aur pehla bill banayein.",
    answerHi: "एल्बोरा पर खाता बनाना बेहद सरल है:\n1. `/register` पर जाएं और 'खाता बनाएं' चुनें।\n2. अपना नाम, दुकान का व्यापारिक नाम, ईमेल और सुरक्षित पासवर्ड दर्ज करें।\n3. अकाउंट सबमिट होने के बाद अपने क्रेडेंशियल्स के साथ `/login` पर लॉगिन करें।\n4. अपनी दुकान की प्रोफाइल सेट करें और तुरंत बिलिंग शुरू करें।",
    actionLink: {
      labelEn: "Register Free Now →",
      labelHinglish: "Abhi Register Karein →",
      labelHi: "अभी निःशुल्क पंजीकरण करें →",
      href: "/register",
    },
  },
  {
    id: "ADMIN_APPROVAL_PROCESS",
    category: "GETTING_STARTED",
    keywords: [
      "admin approval", "approval", "pending approval", "account verify", "activate account",
      "approval kyu chahiye", "approval time", "approval status", "अनुमोदन", "अप्रूवल"
    ],
    titleEn: "How does Tenant Account Approval work?",
    titleHinglish: "Account Approval Process kaise kaam karta hai?",
    titleHi: "खाता अनुमोदन (Admin Approval) कैसे काम करता है?",
    answerEn: "For data security and platform integrity, newly registered shops may undergo a rapid platform verification. During this stage, your shop profile status displays 'Pending Approval'. Once verified by platform administrators, full multi-tenant access is unlocked immediately.",
    answerHinglish: "Security aur business authenticity ke liye naye accounts ka initial check hota hai. Approval process ke dauran screen par 'Pending Approval' dikhta hai. Verify hote hi aap apne dashboard me login karke sabhi tools use kar sakte hain.",
    answerHi: "सुरक्षा और व्यावसायिक सत्यापन के लिए नए पंजीकरणों की त्वरित समीक्षा की जाती है। समीक्षा के दौरान स्क्रीन पर 'Pending Approval' दिखाई देता है। अनुमोदन प्राप्त होते ही आपका संपूर्ण डैशबोर्ड सक्रिय हो जाता है।",
    actionLink: {
      labelEn: "Check Login Status →",
      labelHinglish: "Login Karke Check Karein →",
      labelHi: "लॉगिन स्थिति देखें →",
      href: "/login",
    },
  },
  {
    id: "PRICING_AND_PLANS",
    category: "FAQS",
    keywords: [
      "price", "pricing", "cost", "plan", "free", "charges", "kitne rupaye", "fees", "subscription",
      "कीमत", "प्लान", "शुल्क", "फ्री"
    ],
    titleEn: "What are Elvora's Pricing and Subscription options?",
    titleHinglish: "Elvora ke plans aur pricing kya hai?",
    titleHi: "एल्बोरा की कीमतें और प्लान्स क्या हैं?",
    answerEn: "Elvora offers transparent and flexible plans tailored for small retail stores as well as expanding multi-branch businesses. You can start with full feature exploration and upgrade as your transaction volume and warehouse requirements grow.",
    answerHinglish: "Elvora choti dukano se lekar bade multi-branch businesses ke liye affordable plans provide karta hai. Aap easily start kar sakte hain aur business badhne par plan upgrade kar sakte hain.",
    answerHi: "एल्बोरा छोटी दुकानों से लेकर बड़े मल्टी-ब्रांच व्यवसायों के लिए किफायती और पारदर्शी प्लान पेश करता है। आप आसानी से शुरुआत कर सकते हैं और व्यवसाय बढ़ने के साथ अपग्रेड कर सकते हैं।",
    actionLink: {
      labelEn: "View Pricing Plans →",
      labelHinglish: "Pricing Details Dekhein →",
      labelHi: "प्लान्स और कीमतें देखें →",
      href: "/pricing",
    },
  },
  {
    id: "DATA_SECURITY_BACKUPS",
    category: "FAQS",
    keywords: [
      "security", "safe", "backup", "data safety", "privacy", "secure", "data safe hai kya",
      "suraksha", "सुरक्षा", "डेटा सुरक्षा", "बैकअप"
    ],
    titleEn: "Is my business data secure with Elvora?",
    titleHinglish: "Kya mera business data Elvora me secure hai?",
    titleHi: "क्या एल्बोरा में मेरा बिजनेस डेटा सुरक्षित है?",
    answerEn: "Yes, absolutely. Elvora enforces **strict tenant data isolation**, end-to-end encryption for session cookies, automated database backups, role-based access control (RBAC), and CSRF token protection. Your financial records, customer details, and invoice history are strictly private to your authorized shop staff.",
    answerHinglish: "Haan, 100% secure. Elvora me bank-grade security aur strict tenant isolation hai. Har dukaan ka data completely alag aur encrypted rehta hai. Kisi bhi doosre user ya dukaan ko aapka data dekhne ki permission nahi hoti.",
    answerHi: "हाँ, पूरी तरह सुरक्षित। एल्बोरा में बैंक-ग्रेड डेटा आइसोलेशन, एन्क्रिप्शन और स्वचालित बैकअप लागू हैं। आपकी दुकान का वित्तीय डेटा, ग्राहकों की जानकारी और बिल केवल आपके अधिकृत स्टाफ के लिए ही उपलब्ध रहते हैं।",
  },
  {
    id: "CUSTOMER_SUPPORT_CONTACT",
    category: "FAQS",
    keywords: [
      "support", "contact", "help", "customer care", "phone", "email", "madad", "sampark",
      "सपोर्ट", "संपर्क", "हेल्प"
    ],
    titleEn: "How can I contact Elvora Support?",
    titleHinglish: "Elvora Support se contact kaise karein?",
    titleHi: "एल्बोरा सपोर्ट से संपर्क कैसे करें?",
    answerEn: "Our dedicated support team is available to assist you with onboarding, data migration, and troubleshooting. You can contact us through the `/contact` page or send an inquiry directly to our support desk.",
    answerHinglish: "Hamari team aapki madad ke liye hamesha tayyar hai. Aap `/contact` page par jakar humse baat kar sakte hain ya email bhej sakte hain.",
    answerHi: "हमारी सहायता टीम आपकी सहायता के लिए सदैव तत्पर है। आप `/contact` पेज पर जाकर हमसे संपर्क कर सकते हैं।",
    actionLink: {
      labelEn: "Contact Support →",
      labelHinglish: "Support se Baat Karein →",
      labelHi: "सपोर्ट से संपर्क करें →",
      href: "/contact",
    },
  },
];

/**
 * Finds matching public knowledge topics using normalized keyword matching.
 */
export function findPublicKnowledge(normalizedQuery: string): PublicKnowledgeTopic | null {
  const query = normalizedQuery.toLowerCase().trim();
  let bestMatch: PublicKnowledgeTopic | null = null;
  let highestScore = 0;

  for (const topic of ELVORI_PUBLIC_KNOWLEDGE) {
    let score = 0;
    for (const kw of topic.keywords) {
      const lowerKw = kw.toLowerCase();
      if (query === lowerKw) {
        score += 10;
      } else if (query.includes(lowerKw)) {
        score += lowerKw.includes(" ") ? 4 : 2;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = topic;
    }
  }

  return highestScore >= 2 ? bestMatch : null;
}


export interface PublicCategorySuggestion {
  category: string;
  categoryHinglish: string;
  categoryHi: string;
  icon: string;
  promptsEn: string[];
  promptsHinglish: string[];
  promptsHi: string[];
}

export const PUBLIC_SUGGESTIONS: PublicCategorySuggestion[] = [
  {
    category: "About Elvora",
    categoryHinglish: "Elvora ke Baare Me",
    categoryHi: "एल्बोरा के बारे में",
    icon: "Sparkles",
    promptsEn: [
      "What is Elvora?",
      "Who can use Elvora?",
      "What problems does Elvora solve?",
    ],
    promptsHinglish: [
      "Elvora kya hai?",
      "Elvora kin businesses ke liye hai?",
      "Elvora se kya fayda hoga?",
    ],
    promptsHi: [
      "एल्बोरा क्या है?",
      "एल्बोरा का उपयोग कौन कर सकता है?",
      "एल्बोरा से दुकान को क्या लाभ हैं?",
    ],
  },
  {
    category: "Features & Modules",
    categoryHinglish: "Features aur Modules",
    categoryHi: "फ़ीचर्स और मॉड्यूल्स",
    icon: "Boxes",
    promptsEn: [
      "How does GST Billing work?",
      "Tell me about Counter POS (F2)",
      "How does multi-warehouse inventory work?",
    ],
    promptsHinglish: [
      "GST billing kaise kaam karti hai?",
      "Counter POS kya hai?",
      "Inventory aur godown kaise manage hote hain?",
    ],
    promptsHi: [
      "जीएसटी बिलिंग कैसे काम करती है?",
      "काउंटर पीओएस (F2) क्या है?",
      "इन्वेंटरी और गोदाम कैसे प्रबंधित होते हैं?",
    ],
  },
  {
    category: "Getting Started",
    categoryHinglish: "Shuru Kaise Karein",
    categoryHi: "शुरुआत कैसे करें",
    icon: "Rocket",
    promptsEn: [
      "How do I create an account?",
      "How does admin approval work?",
      "How to create the first invoice?",
    ],
    promptsHinglish: [
      "Account kaise banayein?",
      "Admin approval process kya hai?",
      "Pehla bill kaise banayein?",
    ],
    promptsHi: [
      "नया खाता कैसे बनाएं?",
      "खाता अनुमोदन (Admin Approval) कैसे होता है?",
      "पहला बिल कैसे बनाएं?",
    ],
  },
  {
    category: "FAQs & Support",
    categoryHinglish: "Sawaal-Jawaab & Support",
    categoryHi: "सामान्य प्रश्न और सहायता",
    icon: "HelpCircle",
    promptsEn: [
      "What are the pricing plans?",
      "Is my business data secure?",
      "How can I contact support?",
    ],
    promptsHinglish: [
      "Elvora ke plans aur charges kya hain?",
      "Kya mera data secure hai?",
      "Support team se kaise baat karein?",
    ],
    promptsHi: [
      "प्लान्स और कीमतें क्या हैं?",
      "क्या मेरा डेटा सुरक्षित है?",
      "सपोर्ट टीम से कैसे संपर्क करें?",
    ],
  },
];

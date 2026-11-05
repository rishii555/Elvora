import { SupportArticle } from "./types";

/**
 * Verified knowledge base representing real, existing Elvora capabilities.
 * Every article references actual pages, components, and workflow paths in the codebase.
 */
export const ELVORA_SUPPORT_ARTICLES: SupportArticle[] = [
  {
    id: "POS_BILLING",
    keywords: [
      "pos", "counter", "f2", "quick bill", "billing", "counter pos", "barcode", "thermal print",
      "receipt", "kachha bill", "fast billing", "pos kaise use kare", "counter bill kaise banaye",
      "पीओएस", "काउंटर बिल", "फास्ट बिलिंग", "बिल कैसे बनाएं", "थर्मल प्रिंट", "बारकोड"
    ],
    titleEn: "Counter POS & Quick Billing (F2)",
    titleHinglish: "Counter POS aur F2 Fast Billing",
    titleHi: "काउंटर पीओएस (POS) और त्वरित बिलिंग (F2)",
    summaryEn: "Elvora's Counter POS is engineered for ultra-fast retail billing with keyboard shortcuts, barcode scanning, multiple payment methods, and instant thermal printing.",
    summaryHinglish: "Elvora Counter POS retail dukano ke liye ultra-fast billing support karta hai. Barcode scan, F2 shortcut, cash/online payment aur instant thermal print available hai.",
    summaryHi: "एल्बोरा का काउंटर पीओएस रिटेल दुकानों के लिए अल्ट्रा-फास्ट बिलिंग प्रदान करता है। इसमें बारकोड स्कैनिंग, F2 शॉर्टकट, नकद/यूपीआई भुगतान और तुरंत थर्मल प्रिंटिंग की सुविधा है।",
    stepsEn: [
      "Navigate to Counter POS from the sidebar or press the F2 hotkey.",
      "Scan product barcode or search product by name / SKU in the search bar.",
      "Adjust quantities and select price variants if applicable.",
      "Select an existing customer or enter a walk-in phone number.",
      "Choose payment mode: Cash, UPI, Card, or Multiple/Split Payment.",
      "Click 'Complete Sale' (or press Enter) to finalize and trigger thermal/A4 receipt printing."
    ],
    stepsHinglish: [
      "Sidebar se 'Counter POS' par click karein ya keyboard par 'F2' dabayein.",
      "Barcode scan karein ya search box me product ka naam/SKU likhein.",
      "Quantity select karein aur agar multiple variants hain to select karein.",
      "Customer ka number daalein ya walk-in customer ke roop me aage badhein.",
      "Payment mode select karein: Cash, UPI (QR), Card ya Udhar (Credit).",
      "'Complete Sale' par click karein aur instant thermal bill print karein."
    ],
    stepsHi: [
      "साइडबार से 'Counter POS' पर क्लिक करें या कीबोर्ड पर 'F2' दबाएं।",
      "उत्पाद का बारकोड स्कैन करें या सर्च बॉक्स में नाम/SKU लिखें।",
      "मात्रा (Quantity) सेट करें और लागू होने पर वेरिएंट चुनें।",
      "ग्राहक चुनें या वॉक-इन ग्राहक का मोबाइल नंबर दर्ज करें।",
      "भुगतान का तरीका चुनें: नकद (Cash), यूपीआई (UPI), कार्ड या उधार (Credit)।",
      "'Complete Sale' पर क्लिक करें (या Enter दबाएं) और तुरंत रसीद प्रिंट करें।"
    ],
    moduleName: "Counter POS",
    navigationPath: "/pos",
    requiredPermission: "CREATE_INVOICE",
  },
  {
    id: "GST_INVOICES",
    keywords: [
      "invoice", "gst invoice", "b2b", "b2c", "tax invoice", "bill history", "invoice sequence",
      "invoice prefix", "cgst", "sgst", "igst", "print a4", "gst bill kaise banaye", "tax bill",
      "जीएसटी इनवॉइस", "टैक्स बिल", "बिल हिस्ट्री", "बी2बी बिल"
    ],
    titleEn: "GST Compliant Invoicing & History",
    titleHinglish: "GST Tax Invoices aur Invoice History",
    titleHi: "जीएसटी टैक्स इनवॉइस और बिल इतिहास",
    summaryEn: "Generate GST-compliant B2B and B2C tax invoices with automated CGST, SGST, IGST calculations, custom sequence numbers, and downloadable A4 & thermal print formats.",
    summaryHinglish: "Elvora me full GST compliant B2B aur B2C bills banayein. CGST, SGST, IGST automatically calculate hote hain aur A4/Thermal format me print kar sakte hain.",
    summaryHi: "एल्बोरा में पूर्ण रूप से जीएसटी मान्य B2B और B2C टैक्स इनवॉइस बनाएं। इसमें CGST, SGST, IGST की स्वचालित गणना तथा A4 और थर्मल प्रिंटिंग उपलब्ध है।",
    stepsEn: [
      "Go to 'Invoice History' (/invoices) or open Counter POS.",
      "Ensure customer GSTIN is entered for B2B invoices to enable input tax credit (ITC).",
      "Tax rates (0%, 5%, 12%, 18%, 28%) are automatically applied based on HSN/SAC codes.",
      "If the customer is from another state, IGST is applied automatically based on the State Code.",
      "Open any invoice in history to view, download PDF, thermal print, or record customer payments."
    ],
    stepsHinglish: [
      "Sidebar se 'Invoice History' (/invoices) par jayein.",
      "B2B bills ke liye customer ka GSTIN number enter karein taaki unhe ITC mil sake.",
      "HSN code ke mutabiq GST rate (5%, 12%, 18%, 28%) auto-calculate ho jayega.",
      "Agar customer kisi doosre state ka hai, to system automatically IGST lagayega.",
      "Puraane bills ko dekhne, reprint karne ya payment update karne ke liye list me click karein."
    ],
    stepsHi: [
      "साइडबार से 'Invoice History' (/invoices) पर जाएं।",
      "B2B इनवॉइस के लिए ग्राहक का GSTIN दर्ज करें ताकि उन्हें इनपुट टैक्स क्रेडिट (ITC) मिल सके।",
      "HSN कोड के आधार पर टैक्स स्लैब (5%, 12%, 18%, 28%) स्वचालित रूप से लागू होगा।",
      "यदि ग्राहक अन्य राज्य का है, तो स्टेट कोड के अनुसार IGST अपने आप लग जाएगा।",
      "पुराने बिल देखने, पीडीएफ डाउनलोड करने या भुगतान दर्ज करने के लिए बिल पर क्लिक करें।"
    ],
    moduleName: "Invoices",
    navigationPath: "/invoices",
    requiredPermission: "CREATE_INVOICE",
  },
  {
    id: "INVENTORY_MANAGEMENT",
    keywords: [
      "inventory", "stock", "low stock", "products", "category", "brand", "hsn", "sku", "warehouse",
      "stock adjustment", "reorder", "maal", "stock kaise add kare", "product add kaise kare", "godown",
      "इन्वेंटरी", "स्टॉक", "उत्पाद", "कम स्टॉक", "गोदाम", "माल"
    ],
    titleEn: "Products, Stock & Warehouse Management",
    titleHinglish: "Products, Stock aur Godown Management",
    titleHi: "उत्पाद, स्टॉक और गोदाम प्रबंधन",
    summaryEn: "Manage your catalog with variants, brands, categories, HSN codes, barcode generation, multi-warehouse stock tracking, and automated low-stock warnings.",
    summaryHinglish: "Apne products aur stock ko aasani se manage karein. Brand, Category, HSN, Barcode, Multi-warehouse aur Low-stock warnings sabhi available hain.",
    summaryHi: "अपने उत्पादों और स्टॉक का संपूर्ण प्रबंधन करें। इसमें वेरिएंट्स, ब्रांड्स, श्रेणियां, HSN कोड्स, बारकोड, कई गोदाम और कम-स्टॉक चेतावनी शामिल हैं।",
    stepsEn: [
      "Navigate to 'Products & Stock' (/inventory).",
      "Click 'Add New Product' to input title, SKU, HSN code, tax slab, cost price, and selling price.",
      "Set 'Low Stock Threshold' (e.g. 5 units) so Elvora alerts you before running out.",
      "Assign stock across different godowns/locations in multi-warehouse setups.",
      "Use 'Stock Adjustment' to reconcile physical count discrepancies or damages with reason codes."
    ],
    stepsHinglish: [
      "Sidebar me 'Products & Stock' (/inventory) par jayein.",
      "'Add New Product' par click karke product name, SKU, HSN, Tax rate, Purchase Price aur Sale Price daalein.",
      "'Low Stock Threshold' set karein taaki stock kam hone par pehle hi alert mil jaye.",
      "Agar aapke paas multiple godown hain, to stock ko specific location par assign karein.",
      "Damage ya counting difference ke liye 'Stock Adjustment' option ka use karein."
    ],
    stepsHi: [
      "साइडबार में 'Products & Stock' (/inventory) पर जाएं।",
      "'Add New Product' पर क्लिक करके उत्पाद का नाम, SKU, HSN कोड, टैक्स दर, खरीद और बिक्री मूल्य दर्ज करें।",
      "'Low Stock Threshold' (न्यूनतम स्टॉक सीमा) सेट करें ताकि स्टॉक खत्म होने से पहले अलर्ट मिले।",
      "मल्टी-वेयरहाउस सेटअप में स्टॉक को अलग-अलग गोदामों में आवंटित करें।",
      "गणना में अंतर या टूट-फूट के लिए 'Stock Adjustment' विकल्प का उपयोग करें।"
    ],
    moduleName: "Inventory",
    navigationPath: "/inventory",
    requiredPermission: "MANAGE_INVENTORY",
  },
  {
    id: "CUSTOMERS_KHATA",
    keywords: [
      "customer", "khata", "udhar", "receivables", "credit", "ledger", "parties", "outstanding",
      "payment reminder", "grahak", "udhar balance", "customer statement", "collection",
      "ग्राहक", "खाता", "उधार", "बकाया", "लेजर", "पेमेंट रिमाइंडर"
    ],
    titleEn: "Customers & Udhar Khata Management",
    titleHinglish: "Grahak aur Udhar Khata Management",
    titleHi: "ग्राहक और उधार खाता प्रबंधन",
    summaryEn: "Track customer balances, payment history, outstanding receivables, overdue aging (0-30, 31-60, 60+ days), and send automated payment reminder statements.",
    summaryHinglish: "Customers ka bahi-khata, pending udhar balance, payment history aur statement track karein. Payment reminder bhi asaani se bhej sakte hain.",
    summaryHi: "ग्राहकों का बही-खाता, कुल बकाया उधार, भुगतान इतिहास और भुगतान रिमाइंडर आसानी से प्रबंधित करें।",
    stepsEn: [
      "Navigate to 'Customers & Udhar' (/customers).",
      "View total receivables, credit limits, and aging breakdown across all accounts.",
      "Click on any customer to view their detailed account statement and invoice history.",
      "Record incoming payments directly against specific unpaid invoices.",
      "Download or share the customer ledger statement as PDF."
    ],
    stepsHinglish: [
      "Sidebar se 'Customers & Udhar' (/customers) par click karein.",
      "Yahan aapko total udhar (receivables) aur aging status (kitne din se baaki hai) dikhega.",
      "Kisi bhi customer ke naam par click karke unka pura ledger statement dekhein.",
      "'Record Payment' par click karke received payment ko specific bill ke sath allocate karein.",
      "Customer ko unka balance statement share ya download karein."
    ],
    stepsHi: [
      "साइडबार से 'Customers & Udhar' (/customers) पर जाएं।",
      "यहाँ कुल बकाया उधार और समय-सीमा (Aging status) देखें।",
      "किसी भी ग्राहक के नाम पर क्लिक करके उनका विस्तृत खाता विवरण (Ledger statement) देखें।",
      "'Record Payment' पर क्लिक करके प्राप्त भुगतान को बिल के साथ जोड़ें।",
      "ग्राहक को उनका खाता विवरण पीडीएफ प्रारूप में डाउनलोड या साझा करें।"
    ],
    moduleName: "Customers",
    navigationPath: "/customers",
    requiredPermission: "VIEW_FINANCIAL_REPORTS",
  },
  {
    id: "PURCHASES_SUPPLIERS",
    keywords: [
      "purchase", "supplier", "vendor", "purchase invoice", "supplier payment", "procurement",
      "debit note", "vyapari", "maal kharidna", "supplier ko payment", "purchase entry",
      "खरीद", "सप्लायर", "व्यापारी", "परचेज", "डेबिट नोट"
    ],
    titleEn: "Suppliers & Purchase Invoices",
    titleHinglish: "Suppliers aur Purchase Invoices",
    titleHi: "सप्लायर्स और खरीद इनवॉइस",
    summaryEn: "Record inward goods with purchase bills, update inventory stocks automatically, manage vendor payables, and issue debit notes for returns.",
    summaryHinglish: "Suppliers se aane wale maal ki Purchase Invoices record karein. Stock automatically update ho jata hai aur supplier ka pending balance track hota hai.",
    summaryHi: "सप्लायर्स से खरीदे गए माल के बिल दर्ज करें। स्टॉक अपने आप बढ़ जाता है और सप्लायर का देय बकाया आसानी से ट्रैक होता है।",
    stepsEn: [
      "Navigate to 'Suppliers & Purchases' (/purchases).",
      "Click 'Record Purchase' and select the supplier and purchase invoice date.",
      "Add purchased items with batch, quantity, and purchase unit price (exclusive or inclusive of GST).",
      "Saving the purchase invoice instantly increases inventory quantities and credits the supplier ledger.",
      "To pay a supplier, record a supplier payment from the Payments module."
    ],
    stepsHinglish: [
      "Sidebar se 'Suppliers & Purchases' (/purchases) par jayein.",
      "'Record Purchase' par click karein aur supplier select karein.",
      "Items, quantity aur purchase rate enter karein.",
      "Save karne par aapka stock turant badh jayega aur supplier ke khate me entry ho jayegi.",
      "Supplier ko payment karne par 'Supplier Payment' record karein."
    ],
    stepsHi: [
      "साइडबार से 'Suppliers & Purchases' (/purchases) पर जाएं।",
      "'Record Purchase' पर क्लिक करें और सप्लायर तथा बिल की तारीख चुनें।",
      "खरीदे गए उत्पाद, मात्रा और खरीद दर (टैक्स सहित/रहित) दर्ज करें।",
      "सेव करने पर स्टॉक अपने आप अपडेट हो जाएगा और सप्लायर के खाते में क्रेडिट हो जाएगा।",
      "सप्लायर को भुगतान करने के लिए 'Supplier Payment' दर्ज करें।"
    ],
    moduleName: "Purchases",
    navigationPath: "/purchases",
    requiredPermission: "RECORD_PURCHASE",
  },
  {
    id: "EXPENSES_CASHBOOK",
    keywords: [
      "expense", "kharcha", "cashbook", "petty cash", "rent", "electricity", "salary", "tea",
      "indirect expense", "kharcha kaise dale", "daily expense", "cash in hand",
      "खर्च", "खर्चे", "रोकड़ बही", "किराया", "वेतन", "दैनिक खर्च"
    ],
    titleEn: "Expenses & Petty Cashbook",
    titleHinglish: "Expenses aur Petty Cashbook",
    titleHi: "खर्च और दैनिक रोकड़ बही (Cashbook)",
    summaryEn: "Log daily business operating expenses (shop rent, electricity, staff wages, refreshments) categorized by type and payment account for accurate P&L calculation.",
    summaryHinglish: "Dukaan ke daily kharche (kiraya, bijli bill, chai, staff salary) record karein. Isse aapka P&L aur net profit bilkul accurate rehta hai.",
    summaryHi: "दुकान के दैनिक परिचालन खर्च (दुकान किराया, बिजली, कर्मचारियों का वेतन, चाय-नाश्ता) दर्ज करें ताकि शुद्ध लाभ का सही हिसाब रहे।",
    stepsEn: [
      "Navigate to 'Expenses & Cashbook' (/expenses).",
      "Click 'Record Expense' and select the category (e.g., Rent, Utilities, Salaries, Office Supplies).",
      "Enter amount, date, payment mode (Cash, Bank Account), and optional reference receipt.",
      "View the breakdown of operating costs in Analytics to see where your money is going."
    ],
    stepsHinglish: [
      "Sidebar se 'Expenses & Cashbook' (/expenses) par jayein.",
      "'Record Expense' par click karke category chunein (Kiraya, Bijli, Salary, etc.).",
      "Amount daalein aur chunein ki payment Cash se hui ya Bank account se.",
      "Analytics me jakar dekhein ki kis category me sabse jyada kharcha ho raha hai."
    ],
    stepsHi: [
      "साइडबार से 'Expenses & Cashbook' (/expenses) पर जाएं।",
      "'Record Expense' पर क्लिक करके श्रेणी चुनें (किराया, उपयोगिताएं, वेतन आदि)।",
      "राशि, तारीख और भुगतान का तरीका (नकद या बैंक खाता) चुनें।",
      "एनालिटिक्स में जाकर देखें कि किस मद में सबसे अधिक खर्च हो रहा है।"
    ],
    moduleName: "Expenses",
    navigationPath: "/expenses",
    requiredPermission: "RECORD_EXPENSE",
  },
  {
    id: "ACCOUNTING_LEDGER",
    keywords: [
      "accounting", "ledger", "journal entry", "trial balance", "balance sheet", "p&l", "chart of accounts",
      "double entry", "munimji", "khata bahi", "roknamcha", "jama udhar", "audit",
      "अकाउंटिंग", "लेजर", "ट्रायल बैलेंस", "बैलेंस शीट", "खाता बही", "रोजनामचा"
    ],
    titleEn: "Double-Entry Accounting & Ledger",
    titleHinglish: "Double-Entry Accounting aur Khata Ledger",
    titleHi: "दोहरी प्रविष्टि (Double-Entry) अकाउंटिंग और लेजर",
    summaryEn: "Full automated double-entry accounting engine. Invoices, receipts, purchases, and expenses post balanced journal entries to real-time Trial Balance and Balance Sheet.",
    summaryHinglish: "Elvora me full double-entry accounting engine hai. Har bill aur kharche ki balanced journal entry auto-post hoti hai aur Trial Balance real-time update hota hai.",
    summaryHi: "एल्बोरा का स्वचालित डबल-एंट्री अकाउंटिंग इंजन हर बिल और खर्च के लिए संतुलित जर्नल एंट्री पोस्ट करता है तथा ट्रायल बैलेंस और बैलेंस शीट को रीयल-टाइम अपडेट रखता है।",
    stepsEn: [
      "Navigate to 'Accounting & Ledger' (/accounting).",
      "Explore the Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses).",
      "Click on any account (e.g., Cash In Hand, HDFC Bank, Sales Account) to inspect debit/credit transaction history.",
      "Generate instant Trial Balance, Profit & Loss Statement, and Balance Sheet with one click.",
      "Post manual journal entries or adjustments with automatic debit = credit validation."
    ],
    stepsHinglish: [
      "Sidebar se 'Accounting & Ledger' (/accounting) par jayein.",
      "Yahan aapko Chart of Accounts (Assets, Liabilities, Capital, Sales, Expenses) dikhega.",
      "Kisi bhi account (jaise Cash, Bank, Sales) par click karke debit/credit entries dekhein.",
      "Ek click me Trial Balance, P&L Statement aur Balance Sheet check karein.",
      "System ensure karta hai ki debit aur credit hamesha barabar rahein."
    ],
    stepsHi: [
      "साइडबार से 'Accounting & Ledger' (/accounting) पर जाएं।",
      "चार्ट ऑफ अकाउंट्स (परिसंपत्तियां, देनदारियां, पूंजी, राजस्व, व्यय) देखें।",
      "किसी भी खाते (जैसे Cash in Hand, Bank, Sales) पर क्लिक करके डेबिट/क्रेडिट प्रविष्टियां देखें।",
      "एक क्लिक में ट्रायल बैलेंस, लाभ-हानि खाता और बैलेंस शीट तैयार करें।",
      "डेबिट = क्रेडिट के अनिवार्य नियम के साथ मैनुअल जर्नल प्रविष्टियां जोड़ें।"
    ],
    moduleName: "Accounting",
    navigationPath: "/accounting",
    requiredPermission: "MANAGE_ACCOUNTING",
  },
  {
    id: "REPORTS_GST",
    keywords: [
      "reports", "gst report", "gstr1", "gstr3b", "tax report", "sales register", "purchase register",
      "csv export", "excel", "gst return kaise bhare", "tax summary",
      "रिपोर्ट्स", "जीएसटी रिपोर्ट", "जीएसटीआर", "टैक्स रिपोर्ट", "एक्सेल एक्सपोर्ट"
    ],
    titleEn: "Reports & GST Return Filing (GSTR-1 / 3B)",
    titleHinglish: "Reports aur GST Returns (GSTR-1 & 3B)",
    titleHi: "रिपोर्ट्स और जीएसटी रिटर्न फाइलिंग (GSTR-1 / 3B)",
    summaryEn: "Comprehensive financial, tax, and sales reporting. View GSTR-1 outward supplies, GSTR-3B monthly tax summary, and export clean CSV datasets for your CA or tax consultant.",
    summaryHinglish: "GSTR-1 outward sales aur GSTR-3B tax summary reports generate karein. Apne CA ya Tax consultant ke liye CSV/Excel format me report export karein.",
    summaryHi: "व्यापक वित्तीय, कर और बिक्री रिपोर्ट प्राप्त करें। GSTR-1 और GSTR-3B की मासिक समरी देखें तथा सीए या टैक्स सलाहकार के लिए CSV/Excel में डेटा निर्यात करें।",
    stepsEn: [
      "Navigate to 'Reports & GST' (/reports).",
      "Select desired report type: Sales Register, Purchase Register, GSTR-1, or GSTR-3B Summary.",
      "Choose the date range (e.g., Current Month, Last Quarter, or Custom Dates).",
      "Inspect B2B taxable turnover, B2C retail totals, and CGST/SGST/IGST tax collected.",
      "Click 'Export CSV' to download detailed item-level transaction records."
    ],
    stepsHinglish: [
      "Sidebar se 'Reports & GST' (/reports) par jayein.",
      "Apni report select karein: Sales Register, Purchase Register ya GSTR-1/3B Tax Summary.",
      "Date range chunein (Is mahine ka, Last Quarter ya Custom).",
      "B2B sales, retail sales aur total tax collected ki report screen par dekhein.",
      "'Export CSV' button daba kar file download karein aur apne CA ko forward karein."
    ],
    stepsHi: [
      "साइडबार से 'Reports & GST' (/reports) पर जाएं।",
      "वांछित रिपोर्ट चुनें: बिक्री रजिस्टर, खरीद रजिस्टर, GSTR-1 या GSTR-3B समरी।",
      "समय-सीमा चुनें (वर्तमान माह, पिछली तिमाही या कस्टम तारीख)।",
      "B2B टर्नओवर, B2C रिटेल योग और एकत्रित CGST/SGST/IGST की समीक्षा करें।",
      "'Export CSV' पर क्लिक करके अपने सीए को भेजने के लिए रिपोर्ट डाउनलोड करें।"
    ],
    moduleName: "Reports",
    navigationPath: "/reports",
    requiredPermission: "VIEW_FINANCIAL_REPORTS",
  },
  {
    id: "AUTOMATIONS_WORKFLOWS",
    keywords: [
      "automation", "workflows", "alerts", "rules", "scheduled reports", "reminder", "low stock alert",
      "invoice reminder", "auto email", "auto notification", "khud b khud alert",
      "ऑटोमेशन", "वर्कफ्लो", "अलर्ट्स", "स्वचालित रिपोर्ट", "रिमाइंडर"
    ],
    titleEn: "Automations & Intelligent Workflows",
    titleHinglish: "Automations aur Smart Workflows",
    titleHi: "ऑटोमेशन और स्मार्ट वर्कफ़्लो",
    summaryEn: "Automate routine operations: trigger low-stock alerts, schedule customer overdue payment reminders, and deliver daily business sales digests automatically.",
    summaryHinglish: "Apni dukaan ke kaamo ko automate karein: low-stock warnings, customer payment reminders aur scheduled daily sales reports auto-generate hote hain.",
    summaryHi: "दैनिक व्यावसायिक प्रक्रियाओं को स्वचालित करें: कम-स्टॉक अलर्ट, बकाया भुगतान रिमाइंडर और दैनिक बिक्री रिपोर्ट अपने आप प्राप्त करें।",
    stepsEn: [
      "Navigate to 'Automations & Workflows' (/automations).",
      "Configure Automation Rules (e.g. notify manager when stock drops below threshold).",
      "Schedule daily, weekly, or monthly automated business reports sent to your email.",
      "Review automated workflow approval queues and execution history logs."
    ],
    stepsHinglish: [
      "Sidebar me 'Automations & Workflows' (/automations) par jayein.",
      "Rule set karein: jaise hi stock kam ho, system notification trigger kare.",
      "Daily ya weekly sales report auto-schedule karein.",
      "System logs me dekhein ki kaunse automated reminders run hue hain."
    ],
    stepsHi: [
      "साइडबार में 'Automations & Workflows' (/automations) पर जाएं।",
      "नियम निर्धारित करें (जैसे स्टॉक कम होने पर मैनेजर को तुरंत सूचित करना)।",
      "ईमेल पर दैनिक, साप्ताहिक या मासिक स्वचालित बिक्री रिपोर्ट शेड्यूल करें।",
      "वर्कफ़्लो इतिहास और क्रियान्वयन लॉग की समीक्षा करें।"
    ],
    moduleName: "Automations",
    navigationPath: "/automations",
    requiredPermission: "MANAGE_AUTOMATION",
  },
  {
    id: "REGISTRATION_APPROVAL",
    keywords: [
      "registration", "account approval", "pending approval", "admin approval", "new account",
      "account status", "rejected account", "account activate kaise hoga", "approval kyu pending hai",
      "पंजीकरण", "अकाउंट अप्रूवल", "खाता सत्यापन", "लंबित अप्रूवल"
    ],
    titleEn: "Registration & Platform Admin Approval",
    titleHinglish: "Registration aur Admin Approval Process",
    titleHi: "पंजीकरण और व्यवस्थापक (Admin) अनुमोदन",
    summaryEn: "For security and business validation, new tenant registrations remain in PENDING status until reviewed and approved by a platform administrator.",
    summaryHinglish: "Suraksha aur business verification ke liye naye accounts PENDING status me rehte hain jab tak platform admin unhe approve na kar de.",
    summaryHi: "सुरक्षा और व्यावसायिक सत्यापन के लिए नए पंजीकरण तब तक लंबित (PENDING) रहते हैं जब तक व्यवस्थापक द्वारा उनकी समीक्षा न कर ली जाए।",
    stepsEn: [
      "When you submit a new registration, your account status is set to PENDING.",
      "While PENDING, you can see the Pending Approval screen informing you of the review status.",
      "A platform administrator verifies your business details and approves the account.",
      "Once approved, simply log in at /login with your credentials to access your tenant dashboard."
    ],
    stepsHinglish: [
      "Register karne ke baad aapka account 'PENDING' status me jata hai.",
      "Pending rehte waqt aapko 'Pending Approval' screen dikhti hai.",
      "Platform admin aapki shop details verify karke account ko approve karte hain.",
      "Approval milte hi aap /login par ja kar login kar sakte hain aur dashboard access kar sakte hain."
    ],
    stepsHi: [
      "नया पंजीकरण करने पर खाते की स्थिति 'PENDING' (लंबित) हो जाती है।",
      "लंबित रहने के दौरान आपको 'Pending Approval' स्क्रीन दिखाई देगी।",
      "प्लेटफ़ॉर्म व्यवस्थापक आपकी दुकान के विवरण सत्यापित करके खाते को स्वीकृत करते हैं।",
      "स्वीकृति मिलने के बाद, अपने डैशबोर्ड तक पहुँचने के लिए /login पर जाकर लॉगिन करें।"
    ],
    moduleName: "Account Status",
    navigationPath: "/pending-approval",
  },
  {
    id: "SETTINGS_ROLES",
    keywords: [
      "settings", "roles", "staff", "permissions", "gstin", "shop profile", "biller", "manager",
      "accountant", "staff add kaise kare", "permission change kaise kare", "profile update",
      "सेटिंग्स", "स्टाफ", "भूमिकाएं", "जीएसटीआईएन", "दुकान प्रोफाइल", "कर्मचारी"
    ],
    titleEn: "Shop Settings, Staff & Role-Based Access Control",
    titleHinglish: "Shop Settings aur Staff Roles (RBAC)",
    titleHi: "दुकान सेटिंग्स और कर्मचारी भूमिकाएं (RBAC)",
    summaryEn: "Configure shop trade name, legal entity, address, GSTIN, default invoice prefix, and add staff members with granular roles (OWNER, MANAGER, BILLER, ACCOUNTANT).",
    summaryHinglish: "Dukaan ka naam, GSTIN number, bill prefix aur staff members add karein. Har staff ko specific role (OWNER, MANAGER, BILLER, ACCOUNTANT) assign karein.",
    summaryHi: "दुकान का व्यापारिक नाम, जीएसटी नंबर, पता, इनवॉइस प्रीफ़िक्स सेट करें और कर्मचारियों को विशिष्ट भूमिकाएं (OWNER, MANAGER, BILLER, ACCOUNTANT) सौंपें।",
    stepsEn: [
      "Navigate to 'Shop Settings' (/settings).",
      "In 'Profile', update your Trade Name, Legal Name, GSTIN, Phone, and State Code.",
      "In 'Invoicing Preferences', configure your invoice prefix (e.g. 'INV-') and sequence number.",
      "In 'Staff & Access', invite employees and assign roles: BILLER (counter sales only), ACCOUNTANT (books and finances), or MANAGER (full operations)."
    ],
    stepsHinglish: [
      "Sidebar se 'Shop Settings' (/settings) par click karein.",
      "'Profile' tab me dukaan ka naam, GSTIN number, phone aur address update karein.",
      "'Invoicing' tab me bill prefix (jaise 'INV-') set karein.",
      "'Staff' section me naye employee add karein aur unhe role dein: Biller, Accountant ya Manager."
    ],
    stepsHi: [
      "साइडबार से 'Shop Settings' (/settings) पर जाएं।",
      "'Profile' में अपनी दुकान का नाम, GSTIN, संपर्क नंबर और पता अपडेट करें।",
      "'Invoicing' में जाकर अपना बिल प्रीफ़िक्स (जैसे 'INV-') और क्रम संख्या सेट करें।",
      "'Staff & Access' में नए कर्मचारियों को जोड़ें और भूमिकाएं (Biller, Accountant, Manager) आवंटित करें।"
    ],
    moduleName: "Settings",
    navigationPath: "/settings",
    requiredPermission: "EDIT_SHOP_PROFILE",
  },
];

/**
 * Searches the support knowledge base for matching articles using normalized keyword matching.
 */
export function findSupportKnowledge(normalizedQuery: string): SupportArticle | null {
  const query = normalizedQuery.toLowerCase().trim();
  let bestMatch: SupportArticle | null = null;
  let highestScore = 0;

  for (const article of ELVORA_SUPPORT_ARTICLES) {
    let score = 0;
    for (const kw of article.keywords) {
      if (query.includes(kw.toLowerCase())) {
        // Multi-word exact phrase matches get higher weight
        score += kw.includes(" ") ? 3 : 1;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = article;
    }
  }

  // Minimum threshold to avoid weak false positives
  return highestScore >= 1 ? bestMatch : null;
}

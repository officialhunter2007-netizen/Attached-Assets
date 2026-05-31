/**
 * English display translations for all curriculum data.
 * Keys follow the pattern: subjectId, categoryId, or composite "subjectId__unitId__lessonId".
 * Auto-generated units/lessons (no hand-written name) fall through to pattern helpers.
 */

// ── Subject names ────────────────────────────────────────────────────────────
export const SUBJECT_NAMES_EN: Record<string, string> = {
  "uni-it":           "Information Technology",
  "uni-cybersecurity":"Cybersecurity",
  "uni-data-science": "Data Science",
  "uni-accounting":   "Accounting",
  "uni-business":     "Business Administration",
  "uni-software-eng": "Software Engineering",
  "uni-ai":           "Artificial Intelligence",
  "uni-mobile":       "Mobile Development",
  "uni-cloud":        "Cloud Computing",
  "uni-networks":     "Advanced Networking",
  "uni-food-eng":     "Food Engineering",
  "skill-html":       "HTML",
  "skill-css":        "CSS",
  "skill-js":         "JavaScript",
  "skill-python":     "Python",
  "skill-cpp":        "C++",
  "skill-c":          "C",
  "skill-java":       "Java",
  "skill-linux":      "Linux",
  "skill-windows":    "Windows",
  "skill-net-basics": "Networking Basics",
  "skill-nmap":       "Nmap",
  "skill-wireshark":  "Wireshark",
  "skill-yemensoft":  "YemenSoft ERP",
};

// ── Category names ────────────────────────────────────────────────────────────
export const CATEGORY_NAMES_EN: Record<string, string> = {
  "skill-web":         "Web Development",
  "skill-programming": "Programming Languages",
  "skill-os":          "Operating Systems",
  "skill-networks":    "Networking",
  "skill-security":    "Security Tools",
  "skill-erp":         "ERP Systems",
};

// ── Default learning stage names ──────────────────────────────────────────────
export const STAGES_EN: Record<string, string[]> = {
  "uni-it":           ["Computer & OS Fundamentals", "Databases & Networks", "Programming & Applications", "Capstone Project"],
  "uni-cybersecurity":["Security Concepts & Threats", "Cryptography & Protection", "Penetration Testing & Tools", "Incident Response"],
  "uni-data-science": ["Statistics & Data Analysis", "Python for Data with NumPy/Pandas", "Data Visualization & Prediction", "Machine Learning Models"],
  "uni-accounting":   ["Accounting Basics & Double Entry", "Balance Sheet & Financial Reports", "Cost Accounting", "Auditing & Tax"],
  "uni-business":     ["Management Principles & Strategic Planning", "Marketing & Branding", "HR & Leadership", "Entrepreneurship & Projects"],
  "uni-software-eng": ["Requirements Engineering & Design", "Design Patterns & OOP", "Testing & QA", "Deployment & CI/CD"],
  "uni-ai":           ["AI Fundamentals & Logic", "Machine Learning & Neural Networks", "Natural Language Processing", "Modern AI Applications"],
  "uni-mobile":       ["Mobile Development Basics", "UI & UX Design", "State & Data Management", "App Store Publishing"],
  "uni-cloud":        ["Cloud Computing Concepts", "AWS/Azure Fundamentals", "Containers & Kubernetes", "Cloud Security & Costs"],
  "uni-networks":     ["OSI Model & TCP/IP Protocols", "Network Design & Routing", "Wireless Networks & Security", "Network Management & Monitoring"],
  "uni-food-eng":     ["Food Science Basics & Composition", "Food Microbiology & HACCP", "Preservation & Manufacturing Techniques", "Process Engineering & Thermal Calculations", "Quality Control & Sensory Evaluation", "Packaging & Product Development"],
  "skill-html":       ["HTML Page Structure & Elements", "Forms, Media & Links", "HTML5 & Semantic Elements"],
  "skill-css":        ["Selectors, Colors & Fonts", "Box Model & Flexbox Layout", "Grid & Responsive Design"],
  "skill-js":         ["JavaScript Basics & Variables", "Functions, Arrays & Objects", "DOM & Events & Interaction", "Async/Await & APIs"],
  "skill-python":     ["Python Basics & Variables", "Functions, Lists & Dicts", "Object-Oriented Programming", "Files & Core Libraries", "Capstone Project"],
  "skill-cpp":        ["C++ Basics & Variables", "Pointers & Memory", "Object-Oriented Programming", "Templates & STL", "Advanced Applications"],
  "skill-c":          ["C Basics & Variables", "Pointers & Arrays", "Functions & Memory Management", "Data Structures"],
  "skill-java":       ["Java Basics & Classes", "Inheritance & Polymorphism", "Collections & Libraries", "Concurrent Programming", "Practical Applications"],
  "skill-linux":      ["Linux Basics & Core Commands", "File & User Management", "Shell Scripting & Automation", "Networking & Linux Security"],
  "skill-windows":    ["Windows System Administration", "PowerShell & Automation", "Windows Security & Active Directory"],
  "skill-net-basics": ["OSI Model & TCP/IP", "IP Addressing & Subnetting", "Core Protocols", "Network Configuration & Troubleshooting"],
  "skill-nmap":       ["Nmap Basics & Port Scanning", "Scan Types & Advanced Techniques", "Result Analysis & Reporting"],
  "skill-wireshark":  ["Installing Wireshark & Packet Capture", "Protocol Analysis & Filtering", "Attack Analysis & Traffic Investigation"],
  "skill-yemensoft":  ["System Setup & Configuration", "General Ledger & Journal Entries", "Sales & Purchasing Cycle", "Warehouse & Inventory Management", "Treasury, Banks & Reconciliations", "Reports & Financial Statements"],
};

// ── Unit names  (key = subjectId + "__" + unitId) ─────────────────────────────
export const UNIT_NAMES_EN: Record<string, string> = {
  // uni-it
  "uni-it__u1":                 "Computer & OS Fundamentals",
  // uni-cybersecurity
  "uni-cybersecurity__u1":      "Security Concepts & Threats",
  // uni-data-science
  "uni-data-science__u1":       "Statistics & Data Analysis",
  // uni-accounting
  "uni-accounting__u1":         "Accounting Basics & Double Entry",
  // uni-business
  "uni-business__u1":           "Management Principles & Strategic Planning",
  // uni-software-eng
  "uni-software-eng__u1":       "Requirements Engineering & Design",
  // uni-ai
  "uni-ai__u1":                 "AI Fundamentals & Logic",
  // uni-mobile
  "uni-mobile__u1":             "Mobile Development Basics",
  // uni-cloud
  "uni-cloud__u1":              "Cloud Computing Concepts",
  // uni-networks
  "uni-networks__u1":           "OSI Model & TCP/IP Protocols",
  // uni-food-eng
  "uni-food-eng__u1":           "Food Science Basics",
  "uni-food-eng__u2":           "Food Microbiology & Food Safety",
  "uni-food-eng__u3":           "Preservation & Manufacturing Techniques",
  "uni-food-eng__u4":           "Food Process Engineering",
  "uni-food-eng__u5":           "Quality Control & Sensory Evaluation",
  "uni-food-eng__u6":           "Packaging & Product Development",
  // skill-html
  "skill-html__u1":             "HTML Page Structure & Semantic Elements",
  // skill-css
  "skill-css__u1":              "Selectors & Box Model",
  // skill-js
  "skill-js__u1":               "JavaScript Basics & Event Loop",
  // skill-python
  "skill-python__u1":           "Python Basics & Variables",
  // skill-cpp
  "skill-cpp__u1":              "C++ Basics & Memory",
  // skill-c
  "skill-c__u1":                "C Basics & Pointers",
  // skill-java
  "skill-java__u1":             "Java Basics & Classes",
  // skill-linux
  "skill-linux__u1":            "Linux Basics & Core Commands",
  // skill-windows
  "skill-windows__u1":          "Windows System Administration",
  // skill-net-basics
  "skill-net-basics__u1":       "OSI Model & TCP/IP",
  // skill-nmap
  "skill-nmap__u1":             "Nmap Basics & Port Scanning",
  // skill-wireshark
  "skill-wireshark__u1":        "Installing Wireshark & Capturing Packets",
  // skill-yemensoft (all hand-written)
  "skill-yemensoft__ys-u1":     "System Setup & Configuration",
  "skill-yemensoft__ys-u2":     "General Ledger & Journal Entries",
  "skill-yemensoft__ys-u3":     "Sales & Purchasing",
  "skill-yemensoft__ys-u4":     "Warehouse & Inventory Management",
  "skill-yemensoft__ys-u5":     "Treasury & Banking",
  "skill-yemensoft__ys-u6":     "Reports & Financial Statements",
};

// ── Lesson titles (key = subjectId + "__" + unitId + "__" + lessonId) ─────────
export const LESSON_TITLES_EN: Record<string, string> = {
  // ── uni-it u1 ──
  "uni-it__u1__l1": "What a Computer Really Is: Hardware, Software & How They Interact",
  "uni-it__u1__l2": "The Operating System: Managing Resources & Translating Your Requests",
  "uni-it__u1__l3": "How Devices Communicate on a Network: IP, Port & Protocol",
  "uni-it__u1__l4": "The Internet from the Inside: From Your Phone to the Server & Back",
  // ── uni-cybersecurity u1 ──
  "uni-cybersecurity__u1__l1": "The CIA Triad: Confidentiality, Integrity & Availability",
  "uni-cybersecurity__u1__l2": "Types of Threats: From Malware to Social Engineering",
  "uni-cybersecurity__u1__l3": "Thinking Like an Attacker: The Seven Phases of a Cyber Attack",
  "uni-cybersecurity__u1__l4": "The First Line of Defense: Users & Password Policies",
  // ── uni-data-science u1 ──
  "uni-data-science__u1__l1": "Types of Data: Quantitative & Qualitative, Continuous & Discrete",
  "uni-data-science__u1__l2": "Measures of Central Tendency: Mean, Median, Mode — and When Each Lies",
  "uni-data-science__u1__l3": "Measures of Dispersion: Standard Deviation & Interquartile Range",
  "uni-data-science__u1__l4": "Visualising Distributions: Histograms, Boxplots & Detecting Outliers",
  // ── uni-accounting u1 ──
  "uni-accounting__u1__l1": "The Accounting Equation: Assets = Liabilities + Equity",
  "uni-accounting__u1__l2": "Debit & Credit: The Double-Entry Rule and Keeping the Balance",
  "uni-accounting__u1__l3": "T-Accounts & Posting from the Journal to the Ledger",
  "uni-accounting__u1__l4": "The Trial Balance: When It Catches Errors and When It Stays Silent",
  // ── uni-business u1 ──
  "uni-business__u1__l1": "Management from the Inside: Planning, Organizing, Leading, Controlling",
  "uni-business__u1__l2": "SWOT Analysis: Reading Strengths, Weaknesses, Opportunities & Threats",
  "uni-business__u1__l3": "Business Model Canvas: Nine Boxes That Summarise Any Venture",
  "uni-business__u1__l4": "Break-Even Point & Preliminary Feasibility Study for a Small Business",
  // ── uni-software-eng u1 ──
  "uni-software-eng__u1__l1": "Programming vs Software Engineering: What's the Difference?",
  "uni-software-eng__u1__l2": "Requirements Gathering: Functional, Non-Functional & User Stories",
  "uni-software-eng__u1__l3": "SOLID Principles: Why Good Code Lasts",
  "uni-software-eng__u1__l4": "From Idea to Design: Simplified UML & Class Responsibilities",
  // ── uni-ai u1 ──
  "uni-ai__u1__l1": "What AI Really Is (and What It Isn't)",
  "uni-ai__u1__l2": "How a Model Learns from Data: Training & Prediction",
  "uni-ai__u1__l3": "Probability Is Everything: From Bigrams to Large Language Models",
  "uni-ai__u1__l4": "The Three Types of Learning: Supervised, Unsupervised & Reinforcement",
  // ── uni-mobile u1 ──
  "uni-mobile__u1__l1": "Native vs Cross-Platform: When to Choose Each",
  "uni-mobile__u1__l2": "Mobile App Architecture: Activities, Views & State",
  "uni-mobile__u1__l3": "Screen Lifecycle: onCreate, onPause, onResume, onDestroy",
  "uni-mobile__u1__l4": "Local Storage: SharedPreferences & Local Databases",
  // ── uni-cloud u1 ──
  "uni-cloud__u1__l1": "What the Cloud Really Means: IaaS, PaaS & SaaS",
  "uni-cloud__u1__l2": "Deployment Models: Public, Private & Hybrid Cloud",
  "uni-cloud__u1__l3": "Cloud Economics: Pay-as-You-Go & Time Flexibility",
  "uni-cloud__u1__l4": "Auto Scaling & Load Balancer: How the Cloud Handles Peak Traffic",
  // ── uni-networks u1 ──
  "uni-networks__u1__l1": "OSI Seven Layers: Why Division Simplifies Troubleshooting",
  "uni-networks__u1__l2": "TCP vs UDP: Reliability vs Speed",
  "uni-networks__u1__l3": "Data Segmentation Into Packets & Reassembly at the Destination",
  "uni-networks__u1__l4": "Routing: Why the Fastest Path Isn't Always the Best",
  // ── uni-food-eng units ──
  "uni-food-eng__u1__l1": "Food Composition: Water, Proteins, Fats & Carbohydrates",
  "uni-food-eng__u1__l2": "Vitamins, Minerals & Their Role in Food Quality",
  "uni-food-eng__u1__l3": "Water Activity & Its Relation to Food Spoilage",
  "uni-food-eng__u1__l4": "Chemical Reactions in Food: Maillard Reaction & Oxidation",
  "uni-food-eng__u1__l5": "Physical Properties of Food: Viscosity, Density & Texture",
  "uni-food-eng__u2__l1": "Microorganisms in Food: Bacteria, Molds & Yeasts",
  "uni-food-eng__u2__l2": "Foodborne Pathogens: Salmonella, E. coli & Listeria",
  "uni-food-eng__u2__l3": "HACCP Risk Analysis: The Seven Principles",
  "uni-food-eng__u2__l4": "Applying HACCP Practically on a Real Production Line",
  "uni-food-eng__u2__l5": "International Food Safety Standards: ISO 22000",
  "uni-food-eng__u3__l1": "Heat Preservation: Pasteurisation, Sterilisation & Drying",
  "uni-food-eng__u3__l2": "Refrigeration & Freezing: The Cold Chain",
  "uni-food-eng__u3__l3": "Drying Techniques: Spray, Freeze & Sun Drying",
  "uni-food-eng__u3__l4": "Food Manufacturing: Dairy, Juices & Canned Goods",
  "uni-food-eng__u3__l5": "Modern Technologies: High Pressure, Pulsed Electric Fields & Radiation",
  "uni-food-eng__u4__l1": "Heat Transfer in Food Processes",
  "uni-food-eng__u4__l2": "Mass Transfer, Evaporation & Distillation",
  "uni-food-eng__u4__l3": "Filtration & Mechanical Separation",
  "uni-food-eng__u4__l4": "Designing Food Production Lines & Energy Balance",
  "uni-food-eng__u4__l5": "Calculating Sterilisation Time & Thermal Treatments",
  "uni-food-eng__u5__l1": "Total Quality Management (TQM) in Food Industry",
  "uni-food-eng__u5__l2": "Chemical & Physical Analysis of Food Quality",
  "uni-food-eng__u5__l3": "Sensory Evaluation: Taste, Discrimination & Acceptance Tests",
  "uni-food-eng__u5__l4": "Nutrition Labels & Food Legislation",
  "uni-food-eng__u5__l5": "Food Plant Management: Planning, Costs & Productivity",
  "uni-food-eng__u6__l1": "Packaging Materials: Plastics, Glass & Metals",
  "uni-food-eng__u6__l2": "Packaging Techniques: Vacuum & Modified Atmosphere",
  "uni-food-eng__u6__l3": "New Food Product Development: From Idea to Shelf",
  "uni-food-eng__u6__l4": "Shelf Life & Stability Testing",
  "uni-food-eng__u6__l5": "Capstone Project: Full Food Product Design & Feasibility Study",
  // ── skill-html u1 ──
  "skill-html__u1__l1": "What the Browser Really Understands: The DOM & Meaning of Tags",
  "skill-html__u1__l2": "Semantic Elements: header, nav, main, article & footer",
  "skill-html__u1__l3": "Headings, Paragraphs & Lists: Visual & Semantic Hierarchy",
  "skill-html__u1__l4": "Images, Links & the Importance of alt for Accessibility & SEO",
  // ── skill-css u1 ──
  "skill-css__u1__l1": "How CSS Binds Styles to Elements: Selectors & Their Priority",
  "skill-css__u1__l2": "Colors, Fonts & When to Use rem vs px",
  "skill-css__u1__l3": "Box Model: Content, Padding, Border & Margin — Solving Layout Issues",
  "skill-css__u1__l4": "box-sizing: border-box and Why It Changes Everything",
  // ── skill-js u1 ──
  "skill-js__u1__l1": "Variables & Types: var, let, const & Key Differences",
  "skill-js__u1__l2": "Conditionals, Loops & Equality Types (== vs ===)",
  "skill-js__u1__l3": "Event Loop: How the Browser Stays Responsive While You Compute",
  "skill-js__u1__l4": "Timers: setTimeout & setInterval — and When to Use Each",
  "skill-js__u1__l5": "Offloading Heavy Work: chunking & Web Workers",
  // ── skill-python u1 ──
  "skill-python__u1__l1": "Variables & Basic Types in Python",
  "skill-python__u1__l2": "Lists & Dicts: The Most-Used Tools in Python",
  "skill-python__u1__l3": "List Comprehension: Condensing 30 Lines Into One",
  "skill-python__u1__l4": "Built-in Functions: sum, max, min, sorted, zip",
  "skill-python__u1__l5": "Reading & Writing Files: Working with Real-World Data",
  // ── skill-cpp u1 ──
  "skill-cpp__u1__l1": "C++ Program Structure: main, includes & namespace",
  "skill-cpp__u1__l2": "Variables, References & Pass-by-Value vs Pass-by-Reference",
  "skill-cpp__u1__l3": "Stack vs Heap: Where Your Variables Live",
  "skill-cpp__u1__l4": "new & delete: The Manual Allocation & Deallocation Contract",
  "skill-cpp__u1__l5": "Destructor & RAII: Never Forgetting to Free Memory",
  // ── skill-c u1 ──
  "skill-c__u1__l1": "C Program Structure: main, stdio & Basic Data Types",
  "skill-c__u1__l2": "Pointers: Address vs Value, & and *",
  "skill-c__u1__l3": "Arrays & Pointers: Why They're Twins in C",
  "skill-c__u1__l4": "Stack vs Heap & the Lifetime of a Local Variable Inside a Function",
  "skill-c__u1__l5": "Dangling Pointers: The No. 1 Cause of C Program Crashes",
  // ── skill-java u1 ──
  "skill-java__u1__l1": "Java Program Structure: class, main & packages",
  "skill-java__u1__l2": "Variables, Types & the Difference Between Primitive & Reference Types",
  "skill-java__u1__l3": "Defining a Class: Fields, Methods & Constructor",
  "skill-java__u1__l4": "Creating Objects, Working with References & null",
  "skill-java__u1__l5": "Single Responsibility Principle: Avoiding God Classes",
  // ── skill-linux u1 ──
  "skill-linux__u1__l1": "Linux Philosophy: Everything Is a File, Every Command Is a Precise Tool",
  "skill-linux__u1__l2": "Navigating the File Tree: pwd, ls, cd, tree",
  "skill-linux__u1__l3": "Disk & File Sizes: df, du, find, ls -lhS",
  "skill-linux__u1__l4": "Reading & Tailing Logs: cat, less, tail -f",
  // ── skill-windows u1 ──
  "skill-windows__u1__l1": "Windows Architecture: Registry, Services & User Accounts",
  "skill-windows__u1__l2": "PowerShell vs CMD: Why PowerShell Is Worth Learning",
  "skill-windows__u1__l3": "Core Cmdlets: Get-ChildItem, Rename-Item, Move-Item",
  "skill-windows__u1__l4": "Safe Testing: -WhatIf & -Confirm Before Any Bulk Change",
  // ── skill-net-basics u1 ──
  "skill-net-basics__u1__l1": "OSI Model: Why 7 Layers and Not Just One",
  "skill-net-basics__u1__l2": "Each Layer & Its Responsibility: From Cable to Application",
  "skill-net-basics__u1__l3": "Troubleshooting by Layer: Which Layer Is the Fault?",
  "skill-net-basics__u1__l4": "OSI and TCP/IP Integration in a Real Network",
  // ── skill-nmap u1 ──
  "skill-nmap__u1__l1": "What Nmap Is and What It Actually Does (and Doesn't Do)",
  "skill-nmap__u1__l2": "TCP Connect vs SYN Stealth Scan",
  "skill-nmap__u1__l3": "Service & Version Detection with -sV",
  "skill-nmap__u1__l4": "Port Classification: Expected, Suspicious, Critical Danger",
  // ── skill-wireshark u1 ──
  "skill-wireshark__u1__l1": "What Wireshark Captures on a Network Interface",
  "skill-wireshark__u1__l2": "Reading a Single Packet: Ethernet, IP, TCP & Application Payload",
  "skill-wireshark__u1__l3": "Basic Filters: dns, http, tcp.port == 443",
  "skill-wireshark__u1__l4": "Reading pcap Files & Distinguishing Normal from Suspicious Traffic",
  // ── skill-yemensoft ──
  "skill-yemensoft__ys-u1__ys-l1": "Introduction to YemenSoft & the Work Environment",
  "skill-yemensoft__ys-u1__ys-l2": "Creating the Company & Setting Up Basic Data",
  "skill-yemensoft__ys-u1__ys-l3": "Setting Up Branches, Warehouses & Cost Centres",
  "skill-yemensoft__ys-u1__ys-l4": "User Management & Permissions",
  "skill-yemensoft__ys-u1__ys-l5": "Setting Up the Fiscal Year & Accounting Periods",
  "skill-yemensoft__ys-u2__ys-l6": "Chart of Accounts & Classification (Assets, Liabilities, Revenue, Expenses)",
  "skill-yemensoft__ys-u2__ys-l7": "Creating Manual Journal Entries",
  "skill-yemensoft__ys-u2__ys-l8": "Compound Entries & Adjusting Entries",
  "skill-yemensoft__ys-u2__ys-l9": "General Ledger & Trial Balance",
  "skill-yemensoft__ys-u2__ys-l10": "Closing Periods & the Fiscal Year",
  "skill-yemensoft__ys-u3__ys-l11": "Setting Up Customer Data & Account Management",
  "skill-yemensoft__ys-u3__ys-l12": "Sales Invoices (Cash & Credit) & Returns",
  "skill-yemensoft__ys-u3__ys-l13": "Setting Up Supplier Data & Purchase Orders",
  "skill-yemensoft__ys-u3__ys-l14": "Purchase Invoices & Returns",
  "skill-yemensoft__ys-u3__ys-l15": "Sales & Purchase Reports & Analysis",
  "skill-yemensoft__ys-u4__ys-l16": "Defining Items, Groups & Units of Measure",
  "skill-yemensoft__ys-u4__ys-l17": "Stock-In, Stock-Out & Inter-Warehouse Transfers",
  "skill-yemensoft__ys-u4__ys-l18": "Physical Inventory Count & Adjustments",
  "skill-yemensoft__ys-u4__ys-l19": "Pricing Methods: FIFO, Weighted Average, LIFO",
  "skill-yemensoft__ys-u4__ys-l20": "Inventory Reports & Reorder Points",
  "skill-yemensoft__ys-u5__ys-l21": "Setting Up Cash Boxes & Bank Accounts",
  "skill-yemensoft__ys-u5__ys-l22": "Cash Receipt & Cash Payment Vouchers",
  "skill-yemensoft__ys-u5__ys-l23": "Cheques: Issuance, Receipt, Collection & Return",
  "skill-yemensoft__ys-u5__ys-l24": "Bank Reconciliation",
  "skill-yemensoft__ys-u5__ys-l25": "Transfers Between Cash Boxes & Bank Accounts",
  "skill-yemensoft__ys-u6__ys-l26": "Trial Balance & Account Analysis",
  "skill-yemensoft__ys-u6__ys-l27": "Income Statement (Profit & Loss)",
  "skill-yemensoft__ys-u6__ys-l28": "Balance Sheet (Financial Position)",
  "skill-yemensoft__ys-u6__ys-l29": "Cash Flow Statement",
  "skill-yemensoft__ys-u6__ys-l30": "Aging Reports & Custom Reports",
};

// ── Helper functions ──────────────────────────────────────────────────────────

export function getSubjectName(subjectId: string, arabicName: string, lang: string): string {
  if (lang !== "en") return arabicName;
  return SUBJECT_NAMES_EN[subjectId] ?? arabicName;
}

export function getCategoryName(categoryId: string, arabicName: string, lang: string): string {
  if (lang !== "en") return arabicName;
  return CATEGORY_NAMES_EN[categoryId] ?? arabicName;
}

export function getSubjectStages(subjectId: string, arabicStages: string[], lang: string): string[] {
  if (lang !== "en") return arabicStages;
  return STAGES_EN[subjectId] ?? arabicStages;
}

export function getUnitName(subjectId: string, unitId: string, arabicName: string, lang: string): string {
  if (lang !== "en") return arabicName;
  const key = `${subjectId}__${unitId}`;
  if (UNIT_NAMES_EN[key]) return UNIT_NAMES_EN[key];
  // Auto-translate numbered units: "الوحدة N" → "Unit N"
  const numbered = arabicName.match(/الوحدة\s*(\d+)/);
  if (numbered) return `Unit ${numbered[1]}`;
  return arabicName;
}

export function getLessonTitle(subjectId: string, unitId: string, lessonId: string, arabicTitle: string, lang: string): string {
  if (lang !== "en") return arabicTitle;
  const key = `${subjectId}__${unitId}__${lessonId}`;
  if (LESSON_TITLES_EN[key]) return LESSON_TITLES_EN[key];
  // Auto-translate numbered lessons: "الدرس N: ..." → "Lesson N: ..."
  const numbered = arabicTitle.match(/الدرس\s*(\d+)[:\s]/);
  if (numbered) return `Lesson ${numbered[1]}: Core Concepts`;
  return arabicTitle;
}

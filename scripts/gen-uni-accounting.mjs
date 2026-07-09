import { writeFileSync } from "fs";

const CURRICULUM = {
  schema_version: "v4.1",
  slug: "uni-accounting",
  name: "المحاسبة",
  icon: "📊",
  description: "مسار احترافي متكامل في المحاسبة يبدأ من القيد المزدوج والقوائم المالية ويصل إلى التدقيق المتقدم ومعايير IFRS وإعداد التقارير المتكاملة، وفق أرقى المعايير الدولية CPA وACCA وCMA",
  target_persona: "محاسب محترف يسعى للتأهل الكامل من أسس القيد المزدوج إلى التحليل المالي المتقدم والتدقيق واتخاذ قرارات الأعمال المبنية على البيانات المالية، للعمل في الشركات والبنوك والجهات الحكومية محلياً وعالمياً",
  teacher_tone: "محاسب خبير يجمع بين الدقة الرقمية وعمق الفهم القانوني والتفكير الاستراتيجي، يبدأ كل مفهوم بسؤال من الواقع اليمني والخليجي ثم يبني الحل خطوة بخطوة بأمثلة حية، ويربط كل قاعدة محاسبية بتأثيرها الحقيقي على قرارات الأعمال",
  allowed_viz_templates: ["flowchart", "comparison_table", "timeline", "architecture_diagram", "network_diagram", "scatter_plot"],
  allowed_tools: ["nukhba_ide_js", "nukhba_ide_python", "regex_playground"],
  levels: [
    {
      level_index: 1,
      name: "أساسيات المحاسبة والتسجيل",
      goal: "بناء أساس متين في القيد المزدوج والسجلات المحاسبية وإعداد القوائم المالية الأساسية وإدارة الأصول والنقدية، بما يُهيّئ المتعلم للتعامل مع دورة المحاسبة الكاملة باحترافية",
      bloom_focus: "understand",
      exam: { pass_threshold_percent: 65, time_limit_minutes: 70 },
      stages: [
        {
          stage_index: 1,
          name: "مفاهيم المحاسبة الأساسية والبيئة المهنية",
          goal: "بناء الفهم الجوهري لطبيعة المحاسبة وبيئتها ومبادئها الأساسية والأطر المفاهيمية الدولية التي تحكم إعداد التقارير المالية",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.1.1",
              name: "طبيعة المحاسبة ودورها في الأعمال",
              goal: "فهم ماهية المحاسبة ووظائفها الأساسية وأنواعها وعلاقتها بصنع القرار في المنشآت",
              key_concepts: ["Accounting Definition","Information System","Decision Making","Types of Accounting","Stakeholders"],
              lessons: [
                { name: "تعريف المحاسبة: لغة الأعمال العالمية", primary: "accounting definition as business language information system" },
                { name: "وظائف المحاسبة: التسجيل والتصنيف والتلخيص", primary: "accounting functions recording classifying summarizing" },
                { name: "المحاسبة المالية مقابل المحاسبة الإدارية", primary: "financial accounting vs managerial accounting differences" },
                { name: "المستخدمون الداخليون والخارجيون للمعلومات المالية", primary: "internal external users financial information accounting" },
                { name: "المحاسبة الحكومية والقطاع غير الربحي", primary: "government accounting non-profit sector accounting" },
                { name: "دور المحاسب في المنشأة: من المسجّل إلى المستشار", primary: "accountant role business advisor controller CFO" },
                { name: "البيئة القانونية والتنظيمية للمحاسبة", primary: "accounting regulatory environment legal framework standards" },
                { name: "الأخلاق المهنية للمحاسب: مبادئ IFAC", primary: "professional ethics accountant IFAC code integrity" },
                { name: "المحاسبة في سياق الاقتصاد اليمني والخليجي", primary: "accounting context Yemeni Gulf economy business practices" }
              ]
            },
            {
              unit_index: 2, code: "1.1.2",
              name: "المعادلة المحاسبية والعناصر المالية",
              goal: "إتقان المعادلة المحاسبية الأساسية وفهم عناصر القوائم المالية وتصنيفاتها وعلاقاتها المتشابكة",
              key_concepts: ["Accounting Equation","Assets","Liabilities","Equity","Revenue","Expenses"],
              lessons: [
                { name: "المعادلة المحاسبية: الأساس الذي لا يتغير", primary: "accounting equation assets liabilities equity balance" },
                { name: "الأصول: ما تملكه المنشأة وأنواعه", primary: "assets classification current non-current tangible intangible" },
                { name: "الخصوم: ما تدين به المنشأة وتصنيفاته", primary: "liabilities classification current non-current financial obligations" },
                { name: "حقوق الملكية: مطالبات المالكين وأشكالها", primary: "owners equity capital retained earnings shareholders equity" },
                { name: "الإيرادات: تعريفها وشروط اعترافها", primary: "revenue recognition definition criteria accounting standards" },
                { name: "المصروفات: أنواعها ومبدأ المقابلة", primary: "expenses types matching principle cost recognition" },
                { name: "المعادلة الموسّعة: إدراج الإيرادات والمصروفات", primary: "expanded accounting equation revenue expenses net income" },
                { name: "تأثير العمليات على المعادلة المحاسبية", primary: "transactions effect on accounting equation analysis" },
                { name: "تحليل العمليات المالية المركّبة والمتشعبة", primary: "complex transactions analysis accounting equation multiple effects" }
              ]
            },
            {
              unit_index: 3, code: "1.1.3",
              name: "المبادئ والافتراضات المحاسبية الدولية",
              goal: "فهم الأطر المفاهيمية والمبادئ المحاسبية المقبولة عموماً وكيفية توجيهها لإعداد التقارير المالية",
              key_concepts: ["GAAP","Going Concern","Accrual Basis","Materiality","Consistency","Prudence"],
              lessons: [
                { name: "الإطار المفاهيمي لـIFRS: الهدف والخصائص النوعية", primary: "IFRS conceptual framework objective qualitative characteristics" },
                { name: "افتراض الاستمرارية: أساس التقييم المالي", primary: "going concern assumption accounting valuation basis" },
                { name: "أساس الاستحقاق مقابل الأساس النقدي", primary: "accrual basis vs cash basis accounting differences" },
                { name: "مبدأ الأهمية النسبية والإفصاح", primary: "materiality principle disclosure accounting judgement" },
                { name: "مبدأ الثبات والاتساق في السياسات المحاسبية", primary: "consistency principle accounting policies changes" },
                { name: "مبدأ الحيطة والحذر في قياس الأصول", primary: "prudence conservatism principle asset measurement" },
                { name: "مبدأ الوحدة المحاسبية وفصل النشاط", primary: "entity concept accounting unit separation business owner" },
                { name: "مبدأ التكلفة التاريخية والقيمة العادلة", primary: "historical cost vs fair value measurement accounting" },
                { name: "التعارض بين المبادئ: توازن التكلفة والمنفعة", primary: "cost benefit trade-off accounting principles conflicts" }
              ]
            },
            {
              unit_index: 4, code: "1.1.4",
              name: "الدورة المحاسبية الكاملة: نظرة عامة",
              goal: "فهم مراحل الدورة المحاسبية الكاملة من تحليل العمليات إلى القوائم المالية وإقفال الدفاتر",
              key_concepts: ["Accounting Cycle","Transactions","Journals","Ledger","Trial Balance","Financial Statements"],
              lessons: [
                { name: "الدورة المحاسبية: الخريطة الكاملة للعملية", primary: "accounting cycle steps overview from transactions to statements" },
                { name: "تحليل العملية المالية: الخطوة الأولى والأهم", primary: "transaction analysis first step accounting cycle identification" },
                { name: "المستندات المحاسبية: الأساس القانوني للتسجيل", primary: "source documents vouchers invoices receipts accounting evidence" },
                { name: "القيود اليومية: تحويل العمليات لأرقام", primary: "journal entries recording transactions debit credit rules" },
                { name: "دفتر الأستاذ: ترحيل القيود وتجميعها", primary: "general ledger posting journal entries account balances" },
                { name: "ميزان المراجعة: التحقق من التوازن", primary: "trial balance preparation verification debit credit equality" },
                { name: "تسويات نهاية الفترة: استحقاق ودفعات مقدمة", primary: "adjusting entries accruals prepayments period end accounting" },
                { name: "القيود الإقفالية: إعادة الضبط للفترة التالية", primary: "closing entries temporary accounts reset new period" },
                { name: "ميزان المراجعة بعد التسويات: التحقق النهائي", primary: "adjusted post-closing trial balance final verification" }
              ]
            },
            {
              unit_index: 5, code: "1.1.5",
              name: "المستندات والنظم الورقية والرقمية",
              goal: "إتقان أنواع المستندات المحاسبية وكيفية توثيقها وأرشفتها في بيئتي العمل الورقية والرقمية",
              key_concepts: ["Invoices","Receipts","Purchase Orders","Credit Notes","Document Control","Digital Records"],
              lessons: [
                { name: "الفاتورة الضريبية: بيانات ومتطلبات التحقق", primary: "tax invoice requirements verification legal compliance" },
                { name: "سند القبض والصرف: توثيق تدفق النقدية", primary: "receipt payment voucher cash flow documentation" },
                { name: "أمر الشراء والتسليم: دورة المشتريات", primary: "purchase order delivery note procurement cycle documentation" },
                { name: "إشعار الخصم والإضافة: التصحيحات التجارية", primary: "debit credit notes adjustments commercial corrections" },
                { name: "كشوف الحساب البنكية ومطابقتها", primary: "bank statements reconciliation matching verification" },
                { name: "الأرشفة الورقية: التصنيف والحفظ القانوني", primary: "paper archiving classification legal retention period" },
                { name: "الأرشفة الرقمية: GED والإدارة الإلكترونية", primary: "digital document management electronic archiving GED systems" },
                { name: "ضوابط توثيق العمليات والموافقات", primary: "authorization controls approval process documentation audit trail" },
                { name: "إدارة المستندات في بيئة المحاسبة الحديثة", primary: "document management modern accounting cloud paperless" }
              ]
            },
            {
              unit_index: 6, code: "1.1.6",
              name: "المهنة المحاسبية وسوق العمل",
              goal: "فهم مسارات التأهل المهني واحتياجات سوق العمل والكفاءات المطلوبة من المحاسب في العالم الحديث",
              key_concepts: ["CPA","ACCA","CMA","Professional Development","Career Path","Accounting Firms"],
              lessons: [
                { name: "شهادة CPA: مسار المحاسب القانوني الأمريكي", primary: "CPA certification requirements career path United States" },
                { name: "شهادة ACCA: الاعتراف الدولي البريطاني", primary: "ACCA qualification international recognition British standard" },
                { name: "شهادة CMA: المحاسب الإداري المعتمد", primary: "CMA certified management accountant IMA qualification" },
                { name: "شهادة CFA: المحلل المالي المعتمد للمحاسبين", primary: "CFA chartered financial analyst accounting finance bridge" },
                { name: "شركات المحاسبة الكبرى: Big Four وفرص العمل", primary: "Big Four accounting firms Deloitte PwC KPMG EY career" },
                { name: "المحاسبة في البنوك والمؤسسات المالية", primary: "accounting banking financial institutions treasury role" },
                { name: "المحاسب الحكومي والقطاع العام في اليمن", primary: "government accountant public sector Yemen GCC countries" },
                { name: "المحاسب المستقل: مكاتب المحاسبة والتدقيق", primary: "independent accountant audit firm small practice setup" },
                { name: "مهارات القرن الواحد والعشرين للمحاسب", primary: "21st century skills accountant data analytics technology" }
              ]
            },
            {
              unit_index: 7, code: "1.1.7",
              name: "أخلاقيات المهنة والحوكمة",
              goal: "استيعاب مبادئ الأخلاقيات المهنية وقواعد السلوك المهني وأهميتها في الحفاظ على ثقة المجتمع بالمهنة",
              key_concepts: ["Professional Ethics","Independence","Integrity","Confidentiality","Objectivity","Governance"],
              lessons: [
                { name: "الأمانة والنزاهة: العمود الفقري للمهنة", primary: "honesty integrity accounting professional ethics foundation" },
                { name: "الموضوعية والاستقلالية: بعيداً عن التحيز", primary: "objectivity independence bias avoidance auditor accountant" },
                { name: "السرية المهنية: حماية معلومات العميل", primary: "confidentiality professional secrecy client information protection" },
                { name: "الكفاءة المهنية والتطوير المستمر", primary: "professional competence continuing education development CPE" },
                { name: "تعارض المصالح: التعرف والإفصاح والحلول", primary: "conflict of interest identification disclosure resolution ethics" },
                { name: "الغش المالي: أشكاله والمسؤولية الجنائية", primary: "financial fraud types criminal liability accountant responsibility" },
                { name: "حوكمة الشركات: دور المحاسب في الرقابة", primary: "corporate governance accountant oversight internal control role" },
                { name: "المسؤولية القانونية للمحاسب والمدقق", primary: "legal liability accountant auditor professional negligence" },
                { name: "أخلاقيات الرقمنة: الذكاء الاصطناعي والبيانات", primary: "digital ethics AI data privacy accounting modern challenges" }
              ]
            },
            {
              unit_index: 8, code: "1.1.8",
              name: "البيئة التشريعية للأعمال في اليمن والخليج",
              goal: "فهم الإطار القانوني والتشريعي الذي يحكم الأعمال التجارية والمحاسبة في اليمن ودول الخليج",
              key_concepts: ["Commercial Law","Company Types","Tax Law","Audit Requirements","Regulatory Bodies"],
              lessons: [
                { name: "القانون التجاري اليمني وأنواع الشركات", primary: "Yemeni commercial law company types legal forms" },
                { name: "الشركة الفردية والتضامنية: المحاسبة والمسؤولية", primary: "sole proprietorship partnership accounting liability" },
                { name: "شركة المساهمة: المتطلبات القانونية والمحاسبية", primary: "joint stock company JSC accounting legal requirements" },
                { name: "الشركة ذات المسؤولية المحدودة في اليمن والخليج", primary: "LLC limited liability company accounting GCC Yemen" },
                { name: "قانون الضريبة على الدخل في اليمن", primary: "Yemen income tax law accounting compliance filing" },
                { name: "ضريبة القيمة المضافة في الخليج: نظرة محاسبية", primary: "VAT Gulf countries accounting treatment recording compliance" },
                { name: "هيئات التنظيم المحاسبي في المنطقة العربية", primary: "Arab accounting standards regulatory bodies SOCPA AASB" },
                { name: "متطلبات التدقيق القانوني للشركات", primary: "statutory audit requirements companies legal obligation" },
                { name: "التقارير الإلزامية للجهات الرقابية", primary: "mandatory reporting regulatory authorities financial disclosure" }
              ]
            },
            {
              unit_index: 9, code: "1.1.9",
              name: "تقنيات المعلومات وأنظمة المحاسبة",
              goal: "استيعاب دور تقنية المعلومات في المحاسبة الحديثة والأنظمة المستخدمة وكيفية توظيفها بكفاءة",
              key_concepts: ["Accounting Software","ERP","Cloud Accounting","Cybersecurity","Data Integrity","Automation"],
              lessons: [
                { name: "برامج المحاسبة: QuickBooks وSAP وOracle", primary: "accounting software QuickBooks SAP Oracle comparison" },
                { name: "نظام ERP: تكامل المحاسبة مع العمليات", primary: "ERP system accounting integration business operations modules" },
                { name: "المحاسبة السحابية: الفوائد والتحديات", primary: "cloud accounting benefits challenges security data access" },
                { name: "Excel المتقدم في المحاسبة: الوظائف الجوهرية", primary: "Excel accounting VLOOKUP pivot tables financial functions" },
                { name: "أمن المعلومات في الأنظمة المحاسبية", primary: "information security accounting systems data protection" },
                { name: "التحقق من سلامة البيانات والنزاهة الرقمية", primary: "data integrity verification digital accounting accuracy controls" },
                { name: "أتمتة إدخال البيانات وتقليل الأخطاء", primary: "data entry automation error reduction accounting efficiency" },
                { name: "التقارير الآلية ولوحات المعلومات المالية", primary: "automated reporting financial dashboards real-time accounting" },
                { name: "مستقبل المحاسبة: AI والتحليلات المتقدمة", primary: "future accounting AI machine learning predictive analytics" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "القيد المزدوج والسجلات المحاسبية",
          goal: "إتقان نظام القيد المزدوج وتطبيقه في تسجيل العمليات المالية المختلفة وإعداد السجلات المحاسبية الأساسية بدقة واحترافية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.2.1",
              name: "نظام القيد المزدوج والحسابات",
              goal: "إتقان مفهوم القيد المزدوج وقاعدة المدين والدائن وتطبيقها على أنواع الحسابات المختلفة",
              key_concepts: ["Double Entry","Debit","Credit","T-Account","Account Types","Normal Balances"],
              lessons: [
                { name: "نظام القيد المزدوج: الاختراع الذي غيّر الأعمال", primary: "double entry bookkeeping history Luca Pacioli invention" },
                { name: "قاعدة المدين والدائن: الكود السري للمحاسبة", primary: "debit credit rules accounting fundamental equation T-account" },
                { name: "الحساب T: أداة تحليل العمليات المالية", primary: "T-account debit credit side increases decreases balances" },
                { name: "أرصدة الحسابات الطبيعية: حفظ القاعدة", primary: "normal balances accounts assets debit liabilities credit equity" },
                { name: "قواعد المدين للأصول والمصروفات والسحوبات", primary: "debit rule assets expenses withdrawals left side increases" },
                { name: "قواعد الدائن للخصوم وحقوق الملكية والإيرادات", primary: "credit rule liabilities equity revenue right side increases" },
                { name: "تحليل العمليات قبل التسجيل: الخطوات الخمس", primary: "transaction analysis five steps before journal entry" },
                { name: "القيود المركّبة: أكثر من حسابين في قيد واحد", primary: "compound journal entries multiple accounts single transaction" },
                { name: "تدريبات مكثفة على القيد المزدوج لعمليات متنوعة", primary: "double entry practice exercises mixed transactions intensive" }
              ]
            },
            {
              unit_index: 2, code: "1.2.2",
              name: "دفتر اليومية العامة",
              goal: "إتقان تسجيل العمليات المالية في دفتر اليومية العامة بصورة صحيحة ومنتظمة",
              key_concepts: ["General Journal","Journal Entry Format","Date","Description","Reference","Debit Credit Columns"],
              lessons: [
                { name: "دفتر اليومية: أول سجل في الدورة المحاسبية", primary: "general journal first book of original entry chronological" },
                { name: "شكل قيد اليومية: العناصر الستة الإلزامية", primary: "journal entry format date description reference amounts" },
                { name: "تسجيل عمليات رأس المال والتأسيس", primary: "capital investment transactions journal entries business setup" },
                { name: "تسجيل عمليات البيع النقدي والآجل", primary: "sales transactions cash credit journal entries recording" },
                { name: "تسجيل عمليات الشراء النقدي والآجل", primary: "purchases transactions cash credit journal entries recording" },
                { name: "تسجيل عمليات المصروفات بأنواعها", primary: "expense transactions various types journal entries payroll rent" },
                { name: "تسجيل المسحوبات والتوزيعات", primary: "drawings distributions owner withdrawals journal entries" },
                { name: "تسجيل الديون المشكوك فيها والمعدومة", primary: "bad debts doubtful accounts provision journal entries" },
                { name: "مراجعة دفتر اليومية واكتشاف الأخطاء وتصحيحها", primary: "journal review error detection correction correcting entries" }
              ]
            },
            {
              unit_index: 3, code: "1.2.3",
              name: "دفتر الأستاذ العام والمساعد",
              goal: "إتقان ترحيل القيود من دفتر اليومية إلى دفتر الأستاذ وإعداد الحسابات الفردية بدقة",
              key_concepts: ["General Ledger","Subsidiary Ledger","Posting","Account Balance","Running Balance","Control Account"],
              lessons: [
                { name: "دفتر الأستاذ العام: مستودع الحسابات الشاملة", primary: "general ledger accounts repository all accounting information" },
                { name: "الترحيل من اليومية للأستاذ: الخطوات والقواعد", primary: "posting journal to ledger steps procedure cross-referencing" },
                { name: "حساب رصيد الحساب: الجانبان والرصيد الختامي", primary: "account balance calculation debit credit sides closing balance" },
                { name: "دفتر الأستاذ المساعد للمدينين: تفاصيل كل عميل", primary: "accounts receivable subsidiary ledger customer detail records" },
                { name: "دفتر الأستاذ المساعد للدائنين: تفاصيل كل مورد", primary: "accounts payable subsidiary ledger supplier detail records" },
                { name: "الحساب المراقب: الربط بين الرئيسي والمساعد", primary: "control account reconciliation subsidiary ledger link" },
                { name: "دفتر يومية المبيعات: قيود خاصة للمبيعات الآجلة", primary: "sales journal special journal credit sales recording" },
                { name: "دفتر يومية المشتريات: قيود خاصة للمشتريات الآجلة", primary: "purchases journal special journal credit purchases recording" },
                { name: "دفتر النقدية: السجل المشترك للمقبوضات والمدفوعات", primary: "cash book receipts payments combined journal ledger" }
              ]
            },
            {
              unit_index: 4, code: "1.2.4",
              name: "ميزان المراجعة والأخطاء المحاسبية",
              goal: "إعداد ميزان المراجعة والتحقق منه واكتشاف الأخطاء المحاسبية المختلفة وتصحيحها",
              key_concepts: ["Trial Balance","Arithmetic Errors","Errors of Omission","Compensating Errors","Correction","Suspense Account"],
              lessons: [
                { name: "ميزان المراجعة: التحقق من المساواة الحسابية", primary: "trial balance debit credit equality arithmetic verification" },
                { name: "أخطاء لا تكشفها ميزان المراجعة: الأخطاء الخفية", primary: "errors not revealed trial balance compensating complete omission" },
                { name: "أخطاء الحذف الكلي والجزئي في التسجيل", primary: "errors omission partial complete journal ledger missing" },
                { name: "أخطاء القيد في الجانب الخطأ: التعكيس", primary: "errors commission wrong account wrong side reversal" },
                { name: "أخطاء الترحيل: بين اليومية والأستاذ", primary: "posting errors transposition wrong amount ledger journal" },
                { name: "حساب الأخطاء المعلّقة: الجسر المؤقت للتصحيح", primary: "suspense account error correction temporary bridge accounting" },
                { name: "القيود التصحيحية: كيف تُصلح دون حذف", primary: "correcting journal entries method without deletion proper way" },
                { name: "الحساب الجاري ومطابقة أرصدة الحسابات", primary: "current account balance reconciliation verification matching" },
                { name: "مراجعة شاملة وتمارين متقدمة على الأخطاء", primary: "comprehensive review advanced error exercises trial balance" }
              ]
            },
            {
              unit_index: 5, code: "1.2.5",
              name: "قيود التسوية في نهاية الفترة",
              goal: "إتقان قيود التسوية المختلفة لتحقيق مبدأ الاستحقاق وتطابق الإيرادات والمصروفات مع الفترة الصحيحة",
              key_concepts: ["Adjusting Entries","Accrued Revenue","Accrued Expenses","Prepaid Expenses","Unearned Revenue","Depreciation"],
              lessons: [
                { name: "لماذا التسويات؟ فجوة الوقت في الاعتراف", primary: "why adjusting entries time gap recognition accrual principle" },
                { name: "المصروفات المستحقة: ما دُفع مستقبلاً لكن استُهلك الآن", primary: "accrued expenses liability recognition end period adjusting" },
                { name: "الإيرادات المستحقة: ما كُسب الآن لكن يُقبض لاحقاً", primary: "accrued revenue asset recognition earned not yet received" },
                { name: "المدفوعات المقدمة: التوزيع على الفترات الزمنية", primary: "prepaid expenses asset allocation multiple periods insurance rent" },
                { name: "الإيرادات المقدمة: الالتزام بالخدمة المستقبلية", primary: "unearned revenue deferred liability future service obligation" },
                { name: "الاستهلاك: توزيع تكلفة الأصل على عمره", primary: "depreciation expense asset life allocation end period recording" },
                { name: "مخصص الديون المشكوك فيها: تسوية الائتمان", primary: "allowance doubtful accounts bad debt expense adjustment" },
                { name: "تسوية المخزون: نظام الجرد الدوري", primary: "inventory adjustment periodic system closing entries" },
                { name: "ورقة العمل: تجميع التسويات قبل القوائم", primary: "worksheet adjustments compilation before financial statements" }
              ]
            },
            {
              unit_index: 6, code: "1.2.6",
              name: "القيود الإقفالية وإعادة الافتتاح",
              goal: "إتقان عملية إقفال الحسابات المؤقتة وترحيل صافي الربح وإعداد حسابات الفترة الجديدة",
              key_concepts: ["Closing Entries","Temporary Accounts","Permanent Accounts","Income Summary","Post-Closing Trial Balance"],
              lessons: [
                { name: "الحسابات المؤقتة والدائمة: الفرق الجوهري", primary: "temporary permanent accounts difference closing carried forward" },
                { name: "خطوات الإقفال: من الإيرادات لرأس المال", primary: "closing steps revenue expenses income summary capital transfer" },
                { name: "إقفال حسابات الإيرادات: نقل لحساب ملخص الدخل", primary: "closing revenue accounts income summary debit credit transfer" },
                { name: "إقفال حسابات المصروفات: نقل لحساب ملخص الدخل", primary: "closing expense accounts income summary debit credit transfer" },
                { name: "إقفال حساب ملخص الدخل: نقل صافي الربح للرأسمال", primary: "closing income summary net income capital account transfer" },
                { name: "إقفال حساب المسحوبات: خصم من الرأسمال", primary: "closing drawings account capital reduction owner withdrawal" },
                { name: "ميزان المراجعة بعد الإقفال: التحقق النهائي", primary: "post-closing trial balance verification permanent accounts only" },
                { name: "القيود الافتتاحية للفترة الجديدة: الانطلاق من جديد", primary: "opening entries new period beginning balances carry forward" },
                { name: "مراجعة شاملة: الدورة الكاملة من البداية للنهاية", primary: "comprehensive review complete accounting cycle beginning to end" }
              ]
            },
            {
              unit_index: 7, code: "1.2.7",
              name: "المحاسبة على الحاسب: Excel والبرامج",
              goal: "تطبيق الدورة المحاسبية الكاملة باستخدام Excel وبرامج المحاسبة الأساسية",
              key_concepts: ["Excel Accounting","Spreadsheets","Automated Journals","Formulas","Templates","Software"],
              lessons: [
                { name: "إعداد قالب دفتر اليومية في Excel", primary: "Excel journal entry template setup accounting spreadsheet" },
                { name: "صيغ Excel لحساب أرصدة الحسابات آلياً", primary: "Excel formulas automatic account balance calculation SUMIF" },
                { name: "ربط الأستاذ بميزان المراجعة بـPivotTable", primary: "Excel pivot table ledger trial balance automatic link" },
                { name: "بناء قائمة الدخل الآلية من ميزان المراجعة", primary: "automated income statement Excel from trial balance data" },
                { name: "الميزانية العمومية الآلية من Excel", primary: "automated balance sheet Excel trial balance financial statements" },
                { name: "استخدام QuickBooks: إدخال العمليات الأساسية", primary: "QuickBooks basic transactions entry accounting workflow" },
                { name: "إعداد التقارير في QuickBooks وتفسيرها", primary: "QuickBooks reports generation interpretation financial analysis" },
                { name: "مقارنة برامج المحاسبة: الاختيار المناسب", primary: "accounting software comparison selection criteria business size" },
                { name: "أتمتة القيود المتكررة وتوفير الوقت", primary: "recurring entries automation time saving accounting software" }
              ]
            },
            {
              unit_index: 8, code: "1.2.8",
              name: "الدفاتر الخاصة والسجلات المساعدة",
              goal: "إتقان استخدام الدفاتر الخاصة لتحسين كفاءة التسجيل وتنظيم العمليات المتكررة",
              key_concepts: ["Special Journals","Cash Receipts","Cash Payments","Sales Journal","Purchases Journal","Posting Rules"],
              lessons: [
                { name: "الدفاتر الخاصة: لماذا نحتاجها؟ كفاءة التسجيل", primary: "special journals efficiency benefits high volume transactions" },
                { name: "دفتر مقبوضات النقدية: قيود التحصيل", primary: "cash receipts journal collections recording posting rules" },
                { name: "دفتر مدفوعات النقدية: قيود السداد", primary: "cash payments journal disbursements recording posting" },
                { name: "دفتر المبيعات: العمليات الآجلة للبيع", primary: "sales journal credit sales recording subsidiary ledger" },
                { name: "دفتر المشتريات: العمليات الآجلة للشراء", primary: "purchases journal credit purchases recording posting" },
                { name: "قواعد الترحيل من الدفاتر الخاصة للأستاذ", primary: "posting rules special journals general ledger totals method" },
                { name: "التحقق من توازن الدفاتر الخاصة مع الأستاذ", primary: "verification special journals general ledger control accounts" },
                { name: "ملخص اليومية: حين تكون عمليات متنوعة كثيرة", primary: "general journal remaining transactions special journal workflow" },
                { name: "ورقة عمل شاملة بالدفاتر الخاصة والعامة", primary: "comprehensive worksheet special general journals complete cycle" }
              ]
            },
            {
              unit_index: 9, code: "1.2.9",
              name: "تطبيق شامل على منشأة تجارية كاملة",
              goal: "تطبيق الدورة المحاسبية الكاملة على منشأة تجارية نموذجية من أول يوم حتى القوائم المالية",
              key_concepts: ["Complete Cycle","Business Simulation","Month-End Close","Annual Statements","Professional Practice"],
              lessons: [
                { name: "تأسيس المنشأة: قيود رأس المال والأصول الأولية", primary: "business setup capital injection initial assets journal entries" },
                { name: "الأسبوع الأول: عمليات البيع والشراء المتنوعة", primary: "first week mixed sales purchases transactions recording practice" },
                { name: "الأسبوع الثاني: الرواتب والمصروفات التشغيلية", primary: "payroll operating expenses week two recording practice" },
                { name: "الأسبوع الثالث: التحصيل والسداد والعمليات البنكية", primary: "collections payments bank transactions third week practice" },
                { name: "نهاية الشهر: قيود التسوية الكاملة", primary: "month end all adjusting entries comprehensive practice simulation" },
                { name: "الإقفال الشهري: من التسويات للقوائم المالية", primary: "monthly closing adjustments to financial statements simulation" },
                { name: "قراءة القوائم المالية الناتجة وتفسيرها", primary: "reading interpreting financial statements simulation results" },
                { name: "مقارنة الأشهر: التحليل الأفقي للأداء", primary: "monthly comparison horizontal analysis performance trends" },
                { name: "التقرير الختامي: التوثيق الاحترافي للفترة", primary: "closing report professional documentation period summary" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "القوائم المالية الأساسية وتحليلها",
          goal: "إتقان إعداد القوائم المالية الأربع الرئيسية وقراءتها وتفسير مضامينها المالية للمستخدمين المختلفين",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.3.1",
              name: "قائمة الدخل: قياس الربحية",
              goal: "إعداد قائمة الدخل بصورها المختلفة وتحليل مكوناتها وقراءة ما تكشفه عن ربحية المنشأة",
              key_concepts: ["Income Statement","Revenues","Expenses","Gross Profit","Operating Income","Net Income"],
              lessons: [
                { name: "قائمة الدخل: الحكم على أداء المنشأة", primary: "income statement profitability performance measurement purpose" },
                { name: "قائمة الدخل الفردية: الشكل المبسّط للمنشآت الصغيرة", primary: "single-step income statement simple format small business" },
                { name: "قائمة الدخل المتعددة الخطوات: التحليل التفصيلي", primary: "multi-step income statement gross profit operating income format" },
                { name: "مجمل الربح: الهامش التجاري الأول", primary: "gross profit calculation sales cost of goods sold margin" },
                { name: "الربح التشغيلي: الأداء من النشاط الرئيسي", primary: "operating income EBIT business core operations performance" },
                { name: "الإيرادات والمصروفات غير التشغيلية", primary: "non-operating revenues expenses interest investments other income" },
                { name: "الربح قبل وبعد الضريبة: مراحل الربحية", primary: "earnings before after tax EBT EAT net income calculation" },
                { name: "ربحية السهم: مؤشر حيوي للمساهمين", primary: "earnings per share EPS calculation significance shareholders" },
                { name: "قراءة وتفسير قائمة الدخل لشركات حقيقية", primary: "reading interpreting income statement real companies analysis" }
              ]
            },
            {
              unit_index: 2, code: "1.3.2",
              name: "الميزانية العمومية: المركز المالي",
              goal: "إعداد الميزانية العمومية المصنفة وتفسير ما تكشفه عن المركز المالي للمنشأة",
              key_concepts: ["Balance Sheet","Current Assets","Non-Current Assets","Current Liabilities","Long-Term Liabilities","Equity"],
              lessons: [
                { name: "الميزانية العمومية: لحظة في زمن المنشأة", primary: "balance sheet snapshot point in time financial position" },
                { name: "الأصول المتداولة: ما يتحول لنقد في سنة", primary: "current assets cash receivables inventory year conversion" },
                { name: "الأصول غير المتداولة: استثمارات المنشأة طويلة الأمد", primary: "non-current assets fixed assets investments long-term" },
                { name: "الخصوم المتداولة: الالتزامات قصيرة الأجل", primary: "current liabilities short-term obligations due within year" },
                { name: "الخصوم طويلة الأجل: التمويل المستدام", primary: "long-term liabilities loans bonds debt financing structure" },
                { name: "حقوق المساهمين: أنواعها وعناصرها", primary: "shareholders equity components common stock retained earnings" },
                { name: "الميزانية المقارنة: المقارنة بين فترتين", primary: "comparative balance sheet two periods analysis changes" },
                { name: "القراءة العمودية والأفقية للميزانية", primary: "vertical horizontal analysis balance sheet percentage reading" },
                { name: "الميزانية في السياق: ماذا تقول عن المنشأة؟", primary: "balance sheet interpretation context industry benchmarks" }
              ]
            },
            {
              unit_index: 3, code: "1.3.3",
              name: "قائمة التدفقات النقدية",
              goal: "إعداد قائمة التدفقات النقدية بالطريقتين المباشرة وغير المباشرة وفهم التدفقات من كل نشاط",
              key_concepts: ["Cash Flow Statement","Operating Activities","Investing Activities","Financing Activities","Direct Method","Indirect Method"],
              lessons: [
                { name: "لماذا التدفق النقدي أهم من الربح؟ الحقيقة الخفية", primary: "cash flow vs profit importance company survival liquidity" },
                { name: "أنشطة التشغيل: النقد من النشاط الرئيسي", primary: "operating activities cash generation core business operations" },
                { name: "أنشطة الاستثمار: تدفقات الأصول والاستثمارات", primary: "investing activities assets purchase sale investments cash" },
                { name: "أنشطة التمويل: تدفقات الديون والملكية", primary: "financing activities debt equity issuance repayment dividends" },
                { name: "الطريقة المباشرة: التدفقات النقدية الفعلية", primary: "direct method cash receipts payments actual cash flows" },
                { name: "الطريقة غير المباشرة: من الربح للنقدية", primary: "indirect method net income adjustments non-cash items" },
                { name: "التسوية بين الطريقتين: نفس الرقم النهائي", primary: "reconciliation direct indirect methods same operating cash flow" },
                { name: "قراءة إشارات التدفق النقدي: منشأة صحية أم مريضة؟", primary: "cash flow signals healthy company financial stress analysis" },
                { name: "التدفق النقدي الحر: المقياس الذهبي للقيمة", primary: "free cash flow calculation significance valuation investment" }
              ]
            },
            {
              unit_index: 4, code: "1.3.4",
              name: "قائمة حقوق الملكية والتغيرات فيها",
              goal: "إعداد قائمة حقوق الملكية وفهم العوامل المؤثرة فيها من أرباح وتوزيعات وتغييرات في رأس المال",
              key_concepts: ["Statement of Equity","Retained Earnings","Dividends","Capital Changes","Comprehensive Income"],
              lessons: [
                { name: "قائمة حقوق الملكية: قصة رأس المال عبر الزمن", primary: "statement equity changes capital story time beginning ending" },
                { name: "الأرباح المحتجزة: الوقود الذاتي للنمو", primary: "retained earnings growth self-financing reinvestment business" },
                { name: "توزيعات الأرباح: نقدية وأسهم وأثرها على الحقوق", primary: "dividends cash stock declaration payment effect equity" },
                { name: "إصدار الأسهم الجديدة وأثرها على الحقوق", primary: "share issuance new shares effect equity capital increase" },
                { name: "إعادة شراء الأسهم: أثرها على الميزانية والملكية", primary: "share buyback treasury stock effect balance sheet equity" },
                { name: "الدخل الشامل الآخر: تأثيرات خارج الربح", primary: "other comprehensive income OCI foreign exchange revaluation" },
                { name: "التغيرات في السياسات المحاسبية وأثرها", primary: "accounting policy changes retrospective effect equity statement" },
                { name: "تصحيح الأخطاء الجوهرية: معالجة الماضي", primary: "prior period errors correction restatement equity effect" },
                { name: "ربط القوائم المالية الأربع ببعضها", primary: "linking four financial statements articulation comprehensive" }
              ]
            },
            {
              unit_index: 5, code: "1.3.5",
              name: "الإيضاحات والملاحظات على القوائم المالية",
              goal: "فهم دور الإيضاحات وإعدادها بما يُكمل صورة القوائم المالية ويُوفي بمتطلبات الإفصاح",
              key_concepts: ["Notes to Statements","Disclosure","Accounting Policies","Contingencies","Commitments","Significant Judgements"],
              lessons: [
                { name: "الإيضاحات: الجزء الأهم الذي يتجاهله المبتدئون", primary: "notes financial statements importance often overlooked investors" },
                { name: "إيضاح السياسات المحاسبية: الإطار المرجعي", primary: "accounting policies note basis preparation IFRS GAAP chosen" },
                { name: "إيضاح الأصول الثابتة والاستهلاك", primary: "fixed assets note depreciation method rates carrying amounts" },
                { name: "إيضاح المخزون: طريقة التقييم والاحتياطيات", primary: "inventory note valuation method FIFO weighted average reserves" },
                { name: "إيضاح الذمم المدينة وبنود الديون المشكوكة", primary: "receivables note aging bad debt allowance credit risk" },
                { name: "إيضاح القروض والديون طويلة الأجل", primary: "loans debt note maturity interest rate covenants terms" },
                { name: "الالتزامات الطارئة والتعهدات المستقبلية", primary: "contingent liabilities commitments future obligations disclosure" },
                { name: "إيضاح الأطراف ذات العلاقة: الشفافية الحاكمة", primary: "related parties transactions disclosure governance transparency" },
                { name: "إيضاحات الأحداث اللاحقة: ما بعد تاريخ الميزانية", primary: "subsequent events post balance sheet events disclosure" }
              ]
            },
            {
              unit_index: 6, code: "1.3.6",
              name: "جودة التقارير المالية والمصداقية",
              goal: "تقييم جودة التقارير المالية وفهم محاور التلاعب المحاسبي والمؤشرات التحذيرية",
              key_concepts: ["Earnings Quality","Aggressive Accounting","Creative Accounting","Red Flags","Fraud Detection","Accruals Analysis"],
              lessons: [
                { name: "جودة الأرباح: هل الربح المُعلَن حقيقي؟", primary: "earnings quality real vs managed reported profit analysis" },
                { name: "المحاسبة الإبداعية: الأساليب المشروعة وغير المشروعة", primary: "creative accounting aggressive legitimate vs manipulation" },
                { name: "مؤشرات الخطر: إشارات التلاعب في القوائم", primary: "red flags financial statement manipulation warning signals" },
                { name: "تحليل الاستحقاقات: فصل النقد من التسويات", primary: "accruals analysis cash vs non-cash earnings quality" },
                { name: "نسبة التحويل النقدي: هل الأرباح تتحول لنقد؟", primary: "cash conversion ratio earnings cash flow quality indicator" },
                { name: "تحليل DuPont: تشريح مؤشر العائد على الأصول", primary: "DuPont analysis ROA decomposition margin turnover leverage" },
                { name: "المقارنة مع المنافسين: القراءة الصناعية", primary: "peer comparison industry analysis benchmarking quality" },
                { name: "تقرير المدقق وما يخبرنا به عن المصداقية", primary: "auditor report opinion modified unqualified credibility signal" },
                { name: "حالات تلاعب مالي شهيرة ودروسها المستفادة", primary: "famous accounting fraud cases Enron WorldCom lessons learned" }
              ]
            },
            {
              unit_index: 7, code: "1.3.7",
              name: "عرض القوائم المالية وفق IAS 1",
              goal: "إعداد وعرض القوائم المالية وفق متطلبات معيار IAS 1 والامتثال للمتطلبات الشكلية والموضوعية",
              key_concepts: ["IAS 1","Presentation","General Features","Complete Set","Comparative Information","Materiality"],
              lessons: [
                { name: "IAS 1: المعيار الشامل لعرض القوائم المالية", primary: "IAS 1 presentation financial statements overview requirements" },
                { name: "المجموعة الكاملة من القوائم المالية وفق IFRS", primary: "complete set financial statements IFRS five components required" },
                { name: "الخصائص العامة: الوضوح والمقارنة والاستمرارية", primary: "IAS 1 general features fair presentation materiality consistency" },
                { name: "قائمة الدخل الشامل: صورة IFRS الموسّعة", primary: "statement comprehensive income OCI IFRS format two approaches" },
                { name: "التصنيف في الميزانية: المتداول وغير المتداول", primary: "balance sheet classification current non-current IAS 1 criteria" },
                { name: "المعلومات المقارنة: فترتان على الأقل", primary: "comparative information minimum two periods IAS 1 requirement" },
                { name: "الإفصاح عن السياسات والتغييرات الجوهرية", primary: "significant accounting policies disclosure changes IAS 1 notes" },
                { name: "الكيانات الصغيرة والمتوسطة: IFRS for SMEs", primary: "IFRS SMEs small medium entities simplified reporting standard" },
                { name: "تطبيق عملي: إعداد قوائم IFRS كاملة من البيانات الخام", primary: "practical application complete IFRS statements from raw data" }
              ]
            },
            {
              unit_index: 8, code: "1.3.8",
              name: "التقرير المالي السنوي والفصلي",
              goal: "فهم مكوّنات التقرير السنوي الشامل ومتطلبات إعداد التقارير الدورية وأهميتها للمستثمرين",
              key_concepts: ["Annual Report","Quarterly Reports","Management Discussion","Audit Report","Corporate Governance","Investor Relations"],
              lessons: [
                { name: "التقرير السنوي: أكثر من مجرد قوائم مالية", primary: "annual report beyond financial statements narrative governance" },
                { name: "رسالة رئيس مجلس الإدارة: الرواية الاستراتيجية", primary: "chairman letter CEO strategic narrative annual report" },
                { name: "تقرير الإدارة والتحليل: MD&A", primary: "management discussion analysis MD&A financial results narrative" },
                { name: "تقرير مجلس الإدارة ولجان الحوكمة", primary: "board directors report governance committees compensation" },
                { name: "تقرير المدقق الخارجي: الشهادة المستقلة", primary: "external auditor report independent opinion financial statements" },
                { name: "التقارير الفصلية: المتابعة الدورية للأداء", primary: "quarterly reports Q1 Q2 Q3 interim financial statements" },
                { name: "إعلانات الأرباح: تأثيرها على أسعار الأسهم", primary: "earnings announcements market reaction stock price impact" },
                { name: "علاقات المستثمرين: التواصل المالي الاحترافي", primary: "investor relations IR communication financial transparency" },
                { name: "مقارنة التقارير بين الشركات الكبرى العالمية", primary: "comparing annual reports multinational companies best practices" }
              ]
            },
            {
              unit_index: 9, code: "1.3.9",
              name: "قراءة قوائم مالية حقيقية: تطبيق شامل",
              goal: "تحليل قوائم مالية لشركات حقيقية يمنية وخليجية وعالمية واستخراج الأفكار المالية منها",
              key_concepts: ["Real Companies","Financial Analysis","Cross-Company","Industry Context","Investment Decisions"],
              lessons: [
                { name: "تحليل قوائم شركة يمنية: فهم البيئة المحلية", primary: "Yemeni company financial statements analysis local context" },
                { name: "تحليل قوائم شركة خليجية: سوق الخليج والنفط", primary: "Gulf company financial statements oil sector analysis context" },
                { name: "تحليل قوائم شركة تقنية عالمية: Apple وMicrosoft", primary: "tech company Apple Microsoft financial statements analysis" },
                { name: "تحليل قوائم بنك: خصوصية القطاع المصرفي", primary: "bank financial statements analysis banking sector specific" },
                { name: "تحليل قوائم شركة تجزئة: دورة المخزون", primary: "retail company financial statements inventory cycle analysis" },
                { name: "مقارنة منافسَين: من الأقوى مالياً؟", primary: "competitor comparison financial strength analysis which better" },
                { name: "قراءة قوائم شركة مُفلسة: إشارات الخطر المبكر", primary: "bankrupt company financial statements early warning signs" },
                { name: "من الأرقام لقرار الاستثمار: التحليل المتكامل", primary: "financial analysis to investment decision integrated framework" },
                { name: "تقرير التحليل المالي الاحترافي: الكتابة والعرض", primary: "professional financial analysis report writing presentation" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "المحاسبة التجارية والمخزون والأصول",
          goal: "إتقان المحاسبة التجارية الكاملة من تقييم المخزون وإدارة الأصول الثابتة وتطبيق مبادئ التكلفة والمقابلة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.4.1",
              name: "المحاسبة التجارية: البيع والشراء",
              goal: "إتقان محاسبة العمليات التجارية من بيع وشراء وإرجاع وخصم تجاري ونقدي",
              key_concepts: ["Merchandising","Purchases","Sales","Trade Discount","Cash Discount","Returns"],
              lessons: [
                { name: "المنشأة التجارية: نموذج الأعمال والمحاسبة", primary: "merchandising business model accounting vs service entity" },
                { name: "الخصم التجاري: تخفيض الفاتورة من الأصل", primary: "trade discount invoice reduction not recorded accounting" },
                { name: "الخصم النقدي: حافز السداد المبكر", primary: "cash discount early payment incentive 2/10 n/30 recording" },
                { name: "عمليات الشراء: الآجل والنقد والمردود", primary: "purchases credit cash returns allowances accounting entries" },
                { name: "عمليات البيع: الإيراد وتكلفة البضاعة المباعة", primary: "sales revenue cost of goods sold gross profit recording" },
                { name: "مردودات البيع: إشعار الخصم وإعادة البضاعة", primary: "sales returns allowances credit note inventory reversal" },
                { name: "مردودات الشراء: إشعار الإضافة والتسوية", primary: "purchase returns allowances debit note vendor reconciliation" },
                { name: "حساب صافي المبيعات وصافي المشتريات", primary: "net sales net purchases calculation after discounts returns" },
                { name: "قائمة الدخل للمنشأة التجارية: الشكل الكامل", primary: "merchandising income statement complete format cost goods sold" }
              ]
            },
            {
              unit_index: 2, code: "1.4.2",
              name: "تقييم المخزون: الطرق والتأثيرات",
              goal: "إتقان طرق تقييم المخزون المختلفة وفهم أثرها على القوائم المالية وقرارات الأعمال",
              key_concepts: ["Inventory Valuation","FIFO","Weighted Average","Specific Identification","LCNRV","Inventory Errors"],
              lessons: [
                { name: "المخزون: الأصل الأكثر تعقيداً في التجارة", primary: "inventory complexity trading business balance sheet classification" },
                { name: "أنظمة الجرد: الدوري والدائم ومتى نستخدم كلاً", primary: "periodic perpetual inventory systems when to use each" },
                { name: "طريقة FIFO: الأول دخولاً أول خروجاً", primary: "FIFO first in first out inventory valuation method effect" },
                { name: "طريقة المتوسط المرجح: التوسط بين الأسعار", primary: "weighted average cost inventory method calculation effect" },
                { name: "طريقة التحديد المحدد: للسلع ذات القيمة العالية", primary: "specific identification method high value unique inventory" },
                { name: "مقارنة الطرق: أثرها على الربح والضريبة والمخزون", primary: "inventory methods comparison profit tax effect inflation" },
                { name: "قاعدة التكلفة أو صافي القيمة التحقق أيهما أقل", primary: "lower of cost net realizable value LCNRV inventory write-down" },
                { name: "أخطاء المخزون وأثرها على الفترتين المتتاليتين", primary: "inventory errors effect two periods income tax understatement" },
                { name: "المخزون التالف والهوالك والمخصصات", primary: "damaged inventory shrinkage allowances obsolescence provision" }
              ]
            },
            {
              unit_index: 3, code: "1.4.3",
              name: "الأصول الثابتة: الاقتناء والاعتراف",
              goal: "إتقان محاسبة الاقتناء الأولي للأصول الثابتة وتحديد تكلفتها وتسجيلها وفق المعايير",
              key_concepts: ["Fixed Assets","Cost Principle","Capitalization","Land","Buildings","Equipment","Intangibles"],
              lessons: [
                { name: "الأصول الثابتة: الاستثمار طويل الأمد في الأعمال", primary: "fixed assets long-term investment business operations definition" },
                { name: "تكلفة الأصل: ما يُرسمل وما يُصرف فوراً", primary: "asset cost capitalization vs expense revenue expenditure" },
                { name: "محاسبة الأرض: الأصل الذي لا يُستهلك", primary: "land accounting no depreciation cost components recording" },
                { name: "محاسبة المباني: الاقتناء والتشييد الذاتي", primary: "buildings accounting construction self-built cost borrowing" },
                { name: "محاسبة المعدات والآلات: المكونات والتكلفة", primary: "equipment machinery cost components installation freight setup" },
                { name: "الأصول غير الملموسة: البراءات والعلامات التجارية", primary: "intangible assets patents trademarks software licenses accounting" },
                { name: "الشهرة: كيف تنشأ وكيف تُعاشر في الميزانية", primary: "goodwill acquisition business combination recognition impairment" },
                { name: "تبادل الأصول: الأصل الجديد بأصل قديم", primary: "asset exchange trade-in gain loss recognition accounting" },
                { name: "الأصول المقتناة بدفعات آجلة: القيمة الزمنية", primary: "assets deferred payment installment present value accounting" }
              ]
            },
            {
              unit_index: 4, code: "1.4.4",
              name: "الاستهلاك وطرق احتسابه",
              goal: "إتقان طرق الاستهلاك المختلفة وأثرها على القوائم المالية وفهم الهدف الاقتصادي من الاستهلاك",
              key_concepts: ["Depreciation","Straight Line","Declining Balance","Sum of Years Digits","Units of Production","Amortization"],
              lessons: [
                { name: "الاستهلاك: توزيع التكلفة لا انخفاض القيمة السوقية", primary: "depreciation cost allocation not market value decline concept" },
                { name: "عوامل تحديد الاستهلاك: التكلفة والعمر والقيمة المتبقية", primary: "depreciation factors cost useful life residual salvage value" },
                { name: "طريقة القسط الثابت: التوزيع المتساوي على الأعوام", primary: "straight line depreciation equal annual charge simple method" },
                { name: "طريقة الرصيد المتناقص: أسرع في السنوات الأولى", primary: "declining balance accelerated depreciation double rate method" },
                { name: "طريقة مجموع أرقام السنوات: التسارع المعتدل", primary: "sum of years digits depreciation method calculation fraction" },
                { name: "طريقة وحدات الإنتاج: مبنية على الاستخدام الفعلي", primary: "units of production depreciation usage based method calculation" },
                { name: "مقارنة الطرق: الأثر على الربح والضريبة والأصل", primary: "depreciation methods comparison profit tax asset value effect" },
                { name: "الإطفاء: استهلاك الأصول غير الملموسة", primary: "amortization intangible assets software patent useful life" },
                { name: "إعادة تقييم الأصول: نموذج القيمة العادلة IFRS", primary: "asset revaluation fair value model IAS 16 IFRS alternative" }
              ]
            },
            {
              unit_index: 5, code: "1.4.5",
              name: "التخلص من الأصول والاستبدال",
              goal: "إتقان محاسبة التخلص من الأصول الثابتة ببيع أو خردة أو تبادل وحساب الأرباح والخسائر الناتجة",
              key_concepts: ["Asset Disposal","Sale of Assets","Scrapping","Gain on Sale","Loss on Sale","Trade-In"],
              lessons: [
                { name: "التخلص من الأصل: الخطوات قبل التسجيل المحاسبي", primary: "asset disposal steps before accounting authorization approval" },
                { name: "الاستهلاك الجزئي: حتى تاريخ التخلص", primary: "partial year depreciation up to disposal date prorating" },
                { name: "شطب القيمة الدفترية من السجلات", primary: "removing book value accumulated depreciation disposal entry" },
                { name: "بيع الأصل بأكثر من قيمته الدفترية: الربح", primary: "selling asset above book value gain on disposal calculation" },
                { name: "بيع الأصل بأقل من قيمته الدفترية: الخسارة", primary: "selling asset below book value loss on disposal recording" },
                { name: "خردة الأصل: القيمة الخردية والحذف التام", primary: "scrapping asset salvage value elimination no proceeds" },
                { name: "مبادلة الأصول التجارية والمالية وفق IFRS", primary: "asset exchange commercial financial substance IFRS gains" },
                { name: "اختبار انخفاض قيمة الأصول: IAS 36", primary: "impairment test IAS 36 recoverable amount carrying value CGU" },
                { name: "خطة التخلص من الأصول: الجانب الاستراتيجي", primary: "asset replacement planning capex strategy financial planning" }
              ]
            },
            {
              unit_index: 6, code: "1.4.6",
              name: "الاستثمارات قصيرة وطويلة الأجل",
              goal: "إتقان محاسبة الاستثمارات المالية بأنواعها وفق معيار IFRS 9 وأثرها على القوائم المالية",
              key_concepts: ["Investments","Trading Securities","Available for Sale","Equity Method","Consolidation","IFRS 9"],
              lessons: [
                { name: "أنواع الاستثمارات: المالية والاستراتيجية", primary: "investment types financial strategic portfolio equity method" },
                { name: "استثمارات المتاجرة: القيمة العادلة في الأرباح", primary: "trading securities fair value through profit loss FVTPL" },
                { name: "الاستثمارات المتاحة للبيع: التغيير في الدخل الشامل", primary: "available for sale FVTOCI other comprehensive income changes" },
                { name: "الاستثمارات بالتكلفة المطفأة: الأدوات الدينية", primary: "amortized cost debt instruments held to collect interest" },
                { name: "استثمارات الأسهم: حقوق الملكية وتصنيف الاستثمار", primary: "equity investments shareholding percentage classification method" },
                { name: "طريقة حقوق الملكية: 20%-50% من التأثير المهم", primary: "equity method significant influence 20-50 percent associate" },
                { name: "اختبار انخفاض قيمة الاستثمارات", primary: "investment impairment expected credit loss ECL IFRS 9" },
                { name: "الأرباح الموزعة من الاستثمارات: المعالجة المحاسبية", primary: "dividends received investments income equity method treatment" },
                { name: "التوحيد المالي: أسس الدمج عند الاستحواذ الكامل", primary: "consolidation full acquisition subsidiary control financial merge" }
              ]
            },
            {
              unit_index: 7, code: "1.4.7",
              name: "الذمم المدينة وإدارة الائتمان",
              goal: "إتقان محاسبة الذمم المدينة وأوراق القبض والديون المشكوك فيها وإدارة مخاطر الائتمان",
              key_concepts: ["Accounts Receivable","Notes Receivable","Bad Debts","Allowance Method","Direct Write-Off","Aging Schedule"],
              lessons: [
                { name: "الذمم المدينة: الأصل السائل الأكثر خطورة", primary: "accounts receivable liquidity credit risk management asset" },
                { name: "الاعتراف بالذمم المدينة: شروط البيع والتحصيل", primary: "receivables recognition sale conditions credit terms net30" },
                { name: "طريقة المخصص: الاحتياط الاحترازي للديون", primary: "allowance method doubtful accounts conservative prudent" },
                { name: "طريقة الشطب المباشر: المحظورة في IFRS", primary: "direct write-off method IFRS unacceptable only GAAP" },
                { name: "جدول أعمار الديون: تحليل التأخر والخطر", primary: "aging schedule receivables overdue risk analysis bad debt" },
                { name: "النسبة المئوية من المبيعات: تقدير الديون المشكوكة", primary: "percentage of sales method bad debt expense estimation" },
                { name: "أوراق القبض: الكمبيالات والسندات الإذنية", primary: "notes receivable promissory notes bills exchange interest" },
                { name: "تحصيل أوراق القبض والتنزيل في البنك", primary: "collecting notes receivable discounting bank endorsement" },
                { name: "إدارة مخاطر الائتمان: السياسة والمتابعة", primary: "credit risk management policy monitoring collection strategy" }
              ]
            },
            {
              unit_index: 8, code: "1.4.8",
              name: "الذمم الدائنة والمطلوبات المتداولة",
              goal: "إتقان محاسبة الذمم الدائنة والمطلوبات المتداولة المختلفة وإدارة علاقات الموردين",
              key_concepts: ["Accounts Payable","Notes Payable","Accrued Liabilities","Short-Term Debt","Supplier Management"],
              lessons: [
                { name: "الذمم الدائنة: الدين التجاري قصير الأجل", primary: "accounts payable trade credit short-term financing supplier" },
                { name: "إدارة الذمم الدائنة: التوقيت الاستراتيجي للسداد", primary: "payables management strategic timing cash flow optimization" },
                { name: "المصروفات المستحقة: ما استُهلك لم يُدفع بعد", primary: "accrued expenses liabilities recorded not yet paid payroll" },
                { name: "الإيرادات المقدمة: التزام الخدمة المستقبلية", primary: "unearned revenue deferred liability advance payment service" },
                { name: "ضرائب المبيعات والقيمة المضافة: التحصيل والسداد", primary: "sales tax VAT collection government remittance payable" },
                { name: "أوراق الدفع قصيرة الأجل: الاقتراض التجاري", primary: "notes payable short-term borrowing bank loans commercial paper" },
                { name: "المطلوبات الطارئة: الاعتراف والإفصاح وفق IAS 37", primary: "contingent liabilities IAS 37 provision disclosure recognition" },
                { name: "ضمانات المنتجات: مخصص الضمان وقياسه", primary: "warranty provisions estimate recording IAS 37 matching" },
                { name: "التسوية مع الموردين: مطابقة كشف الحساب", primary: "supplier statement reconciliation payables verification" }
              ]
            },
            {
              unit_index: 9, code: "1.4.9",
              name: "المحاسبة في قطاعات متخصصة: خدمات ومقاولات",
              goal: "تطبيق مبادئ المحاسبة على قطاعات الخدمات والمقاولات والتشييد ذات الخصائص الفريدة",
              key_concepts: ["Service Sector","Construction Contracts","Percentage Completion","Contract Revenue","Project Accounting"],
              lessons: [
                { name: "قطاع الخدمات: الإيراد بلا مخزون ملموس", primary: "service sector revenue recognition no physical inventory" },
                { name: "عقود المقاولات: الإيراد على مدى الزمن", primary: "construction contracts long-term revenue over time IFRS 15" },
                { name: "طريقة نسبة الاكتمال: الاعتراف التدريجي بالإيراد", primary: "percentage completion method revenue recognition IAS 11 IFRS 15" },
                { name: "الخسائر المتوقعة في العقود: الاعتراف الفوري", primary: "expected contract losses immediate recognition provision IAS 11" },
                { name: "تكاليف العقد: المباشرة وغير المباشرة والتوزيع", primary: "contract costs direct indirect allocation project accounting" },
                { name: "محاسبة مشاريع التشييد: المدفوعات والفواتير المرحلية", primary: "construction billing retention milestones project invoicing" },
                { name: "محاسبة تقنية المعلومات: الخدمات والبرمجيات", primary: "IT services software development capitalization vs expense" },
                { name: "المحاسبة في القطاع الصحي والتعليمي", primary: "healthcare education sector accounting revenue expenses" },
                { name: "مراجعة شاملة: تطبيق متعدد القطاعات", primary: "comprehensive review multi-sector application cases analysis" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "المحاسبة النقدية والرواتب والضرائب",
          goal: "إتقان محاسبة الأصول النقدية والتسوية البنكية وإدارة الرواتب والضرائب الأساسية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.5.1",
              name: "إدارة النقدية والتسوية البنكية",
              goal: "إتقان محاسبة الأصول النقدية وإجراء التسوية البنكية وضبط التدفقات النقدية",
              key_concepts: ["Cash Management","Bank Reconciliation","Petty Cash","Deposits in Transit","Outstanding Checks"],
              lessons: [
                { name: "الصندوق: أكثر الأصول حساسية وخطورة", primary: "cash control most sensitive asset internal controls fraud" },
                { name: "التسوية البنكية: مطابقة سجلاتنا مع البنك", primary: "bank reconciliation matching company records bank statement" },
                { name: "الودائع قيد التحصيل: النقد في الطريق للبنك", primary: "deposits in transit bank reconciliation timing difference" },
                { name: "الشيكات المعلقة: الشيكات الصادرة لم تُصرف بعد", primary: "outstanding checks bank reconciliation unreleased payment" },
                { name: "قيود التسوية البنكية: ماذا تُسجل في الدفاتر؟", primary: "bank reconciliation adjusting entries company books error" },
                { name: "صندوق المصروفات الصغيرة: العهدة النثرية", primary: "petty cash fund imprest system replenishment journal entry" },
                { name: "الودائع القابلة للسحب والاستثمارات قصيرة الأمد", primary: "demand deposits short-term investments cash equivalents" },
                { name: "بيان التدفقات النقدية: من أين تأتي وأين تذهب", primary: "cash flow statement sources uses management planning" },
                { name: "التخطيط النقدي: توقع العجز والفائض النقدي", primary: "cash planning forecasting surplus deficit working capital" }
              ]
            },
            {
              unit_index: 2, code: "1.5.2",
              name: "الرواتب والأجور والمزايا الوظيفية",
              goal: "إتقان محاسبة الرواتب من الحسابات الإجمالية إلى الاستقطاعات وصافي الراتب والتسجيل المحاسبي",
              key_concepts: ["Payroll","Gross Salary","Deductions","Net Pay","Social Security","End of Service"],
              lessons: [
                { name: "مكوّنات الراتب الإجمالي: كل ما يكسبه الموظف", primary: "gross salary components basic allowances overtime benefits" },
                { name: "الاستقطاعات الإلزامية: الضريبة والتأمينات", primary: "mandatory deductions income tax social security insurance" },
                { name: "الاستقطاعات الاختيارية: القروض والادخار", primary: "voluntary deductions loans savings pension health insurance" },
                { name: "صافي الراتب: ما يُصرف فعلاً للموظف", primary: "net pay take home calculation after all deductions" },
                { name: "قيود الرواتب: التسجيل الشامل للاستحقاق والصرف", primary: "payroll journal entries expense liability payment recording" },
                { name: "مكافأة نهاية الخدمة: الاستحقاق والمخصص السنوي", primary: "end of service gratuity provision annual accrual recording" },
                { name: "الإجازات المستحقة: مخصص الإجازة وتسجيله", primary: "annual leave provision accrual recording liability vacation" },
                { name: "المزايا الوظيفية الأخرى: السكن والمواصلات والعلاج", primary: "fringe benefits housing transport medical allowances tax" },
                { name: "نظام الرواتب الرقمي: الأتمتة والتقارير", primary: "digital payroll system automation reports compliance" }
              ]
            },
            {
              unit_index: 3, code: "1.5.3",
              name: "محاسبة الضريبة على الدخل الأساسية",
              goal: "فهم أساسيات الضريبة على الدخل للأفراد والشركات وكيفية احتسابها وتسجيلها محاسبياً",
              key_concepts: ["Income Tax","Taxable Income","Tax Brackets","Tax Rate","Deferred Tax","Tax Provision"],
              lessons: [
                { name: "نظام الضريبة على الدخل في اليمن والخليج", primary: "income tax system Yemen GCC countries rates brackets" },
                { name: "الوعاء الضريبي: من الربح المحاسبي للربح الضريبي", primary: "taxable income accounting income tax adjustments reconciliation" },
                { name: "الفروق الدائمة: مصروفات لا تُقبل ضريبياً أبداً", primary: "permanent differences non-deductible expenses entertainment fines" },
                { name: "الفروق الزمنية: التوقيت بين المحاسبة والضريبة", primary: "temporary timing differences deferred tax asset liability" },
                { name: "الضريبة المؤجلة: حاضر مقابل مستقبل", primary: "deferred tax liability asset IAS 12 recognition measurement" },
                { name: "مخصص الضريبة: التسجيل في نهاية الفترة", primary: "tax provision current deferred income statement balance sheet" },
                { name: "ضريبة القيمة المضافة: المدخلات والمخرجات", primary: "VAT input output tax calculation filing return payment" },
                { name: "الاستقطاع من المنبع: التزامات دفع الأجور", primary: "withholding tax payroll source deduction filing remittance" },
                { name: "الإقرار الضريبي: التحضير والتقديم والمراجعة", primary: "tax return preparation filing audit review documentation" }
              ]
            },
            {
              unit_index: 4, code: "1.5.4",
              name: "محاسبة الديون والأوراق المالية الأساسية",
              goal: "إتقان محاسبة القروض والسندات والتمويل المصرفي وأثرها على الميزانية والتكاليف",
              key_concepts: ["Loans","Bonds","Interest","Amortization Schedule","Debt Covenants","Finance Cost"],
              lessons: [
                { name: "القروض المصرفية: الاقتراض وشروط السداد", primary: "bank loans borrowing repayment terms interest accounting" },
                { name: "جدول إطفاء القرض: توزيع الأقساط والفائدة", primary: "loan amortization schedule installment interest principal split" },
                { name: "القروض بالعملة الأجنبية: خطر الصرف المحاسبي", primary: "foreign currency loans exchange risk translation accounting" },
                { name: "السندات: الإصدار والتسعير والاستهلاك", primary: "bonds issuance pricing discount premium amortization" },
                { name: "سندات بخصم: الإصدار بأقل من القيمة الاسمية", primary: "bonds issued at discount amortization effective interest method" },
                { name: "سندات بعلاوة: الإصدار بأكثر من القيمة الاسمية", primary: "bonds issued at premium amortization effective interest method" },
                { name: "تكاليف الاقتراض: الرسملة مقابل الصرف الفوري", primary: "borrowing costs capitalization qualifying asset IAS 23" },
                { name: "سندات الدين الإسلامية: الصكوك ومعالجتها", primary: "sukuk Islamic bonds accounting treatment AAOIFI standards" },
                { name: "إعادة هيكلة الديون: المفاوضة والمعالجة المحاسبية", primary: "debt restructuring negotiation accounting modification derecognition" }
              ]
            },
            {
              unit_index: 5, code: "1.5.5",
              name: "التأجير التشغيلي والتمويلي",
              goal: "إتقان محاسبة عقود الإيجار بنوعيها وفق معيار IFRS 16 وتأثيرها على المركز المالي",
              key_concepts: ["Operating Lease","Finance Lease","IFRS 16","Right of Use Asset","Lease Liability","Lessee"],
              lessons: [
                { name: "الإيجار: أداة تمويل شائعة في الأعمال", primary: "leasing common financing tool business assets liability" },
                { name: "IFRS 16: الثورة في محاسبة عقود الإيجار", primary: "IFRS 16 revolution leasing accounting on-balance sheet" },
                { name: "تعريف عقد الإيجار: هل الاتفاقية إيجار؟", primary: "lease definition identification right to use asset IFRS 16" },
                { name: "أصل حق الاستخدام: الاعتراف والقياس الأولي", primary: "right of use asset initial recognition measurement IFRS 16" },
                { name: "التزام الإيجار: التدفقات المستقبلية المخصومة", primary: "lease liability present value future payments discount rate" },
                { name: "استهلاك أصل حق الاستخدام وفائدة الالتزام", primary: "ROU depreciation lease liability interest expense unwinding" },
                { name: "الإعفاءات العملية: قصيرة الأجل وذات القيمة الصغيرة", primary: "practical expedients short-term low-value IFRS 16 exemptions" },
                { name: "تعديل الإيجار: المراجعة والتعديل والإنهاء", primary: "lease modification reassessment remeasurement termination" },
                { name: "إيجار التشغيل وفق المعيار القديم IAS 17: التاريخي", primary: "IAS 17 operating lease old treatment comparison IFRS 16" }
              ]
            },
            {
              unit_index: 6, code: "1.5.6",
              name: "محاسبة العملات الأجنبية الأساسية",
              goal: "فهم محاسبة العمليات بالعملة الأجنبية وتأثيرات أسعار الصرف على القوائم المالية",
              key_concepts: ["Foreign Currency","Exchange Rate","Transaction Risk","Translation","IAS 21","Functional Currency"],
              lessons: [
                { name: "العملة الوظيفية ومعاملتها محاسبياً", primary: "functional currency determination IAS 21 economic environment" },
                { name: "تحويل العمليات الأجنبية: سعر الصرف الفوري", primary: "foreign currency transactions spot rate initial recording" },
                { name: "الفروق في أسعار الصرف: كيف تُحسب وتُسجَّل", primary: "exchange differences gain loss calculation end period settlement" },
                { name: "بنود الميزانية بالعملة الأجنبية: النقدية والثابتة", primary: "monetary non-monetary items IAS 21 year end translation" },
                { name: "إعادة القياس عند نهاية الفترة: أثر التغيير في السعر", primary: "remeasurement year end exchange rate effect balance sheet" },
                { name: "الفروق الترجمية في الدخل الشامل الآخر", primary: "translation differences OCI statement comprehensive income" },
                { name: "التحوط من مخاطر العملة: مقدمة للأدوات", primary: "currency risk hedging forward contracts basic introduction" },
                { name: "تأثير أسعار الصرف على قوائم المنشآت اليمنية", primary: "Yemen exchange rate impact company financial statements" },
                { name: "الدولرة: تحديات المحاسبة في بيئة العملة المتعددة", primary: "dollarization multi-currency accounting challenges Yemen" }
              ]
            },
            {
              unit_index: 7, code: "1.5.7",
              name: "محاسبة الضمانات والمخصصات",
              goal: "إتقان محاسبة المخصصات والالتزامات الطارئة والأحداث ما بعد تاريخ الميزانية وفق IAS 37",
              key_concepts: ["Provisions","IAS 37","Contingent Liabilities","Warranty","Restructuring","Onerous Contracts"],
              lessons: [
                { name: "المخصص: الالتزام غير المحدد المبلغ أو الوقت", primary: "provision IAS 37 present obligation uncertain amount timing" },
                { name: "معايير الاعتراف بالمخصص: الشروط الثلاثة", primary: "provision recognition criteria three conditions IAS 37" },
                { name: "مخصص ضمان المنتجات: تقدير التكلفة المستقبلية", primary: "warranty provision product guarantee estimated future cost" },
                { name: "مخصص إعادة الهيكلة: متى يُعترف به؟", primary: "restructuring provision recognition constructive obligation" },
                { name: "العقود الخاسرة: الاعتراف المبكر بالخسارة", primary: "onerous contracts unavoidable losses provision recognition" },
                { name: "الالتزامات البيئية: المسؤولية الاجتماعية والمحاسبة", primary: "environmental liabilities restoration provision site cleanup" },
                { name: "الالتزامات الطارئة: الإفصاح لا التسجيل", primary: "contingent liabilities possible obligation disclose only" },
                { name: "الأصول الطارئة: لا تُسجّل، وإن كانت محتملة", primary: "contingent assets virtually certain disclosure only IAS 37" },
                { name: "مراجعة المخصصات وتعديلها وعكسها", primary: "provision review update reversal change estimate IAS 37" }
              ]
            },
            {
              unit_index: 8, code: "1.5.8",
              name: "محاسبة الحكومة المحلية والبلديات",
              goal: "فهم الخصائص المحاسبية للقطاع الحكومي المحلي وأسس إعداد ميزانياته وتقاريره",
              key_concepts: ["Government Accounting","Fund Accounting","Budgetary Control","Modified Accrual","IPSAS"],
              lessons: [
                { name: "المحاسبة الحكومية: أهدافها وفروقها عن التجارية", primary: "government accounting objectives differences commercial accountability" },
                { name: "نظام الصناديق: تخصيص الموارد وفق الغرض", primary: "fund accounting government resources allocation purpose restricted" },
                { name: "الرقابة الميزانية: الالتزام بالاعتمادات المعتمدة", primary: "budgetary control encumbrances appropriations government spending" },
                { name: "أساس الاستحقاق المعدَّل في القطاع الحكومي", primary: "modified accrual basis government accounting revenue expenditure" },
                { name: "معايير IPSAS: الإطار الدولي للمحاسبة الحكومية", primary: "IPSAS international public sector accounting standards overview" },
                { name: "ميزانية الدولة: التخطيط والتنفيذ والرقابة", primary: "state budget planning execution control government finance" },
                { name: "حسابات المشاريع الحكومية: التمويل والتنفيذ", primary: "government project accounts donor funding project execution" },
                { name: "الشفافية المالية الحكومية: التقارير للجمهور", primary: "government financial transparency public reporting accountability" },
                { name: "المحاسبة في البلديات والإدارات المحلية اليمنية", primary: "Yemen municipalities local government accounting practices" }
              ]
            },
            {
              unit_index: 9, code: "1.5.9",
              name: "مشاريع نهاية المستوى الأول: تطبيق متكامل",
              goal: "تطبيق كافة مفاهيم المستوى الأول في مشاريع حقيقية متكاملة تحاكي بيئة العمل الفعلية",
              key_concepts: ["Capstone Project","Complete Cycle","Professional Reports","Work Simulation","Financial Package"],
              lessons: [
                { name: "مشروع 1: المنشأة التجارية من الصفر لنهاية السنة", primary: "capstone project trading company full year accounting cycle" },
                { name: "مشروع 2: الشركة الخدمية بعقود متعددة وموظفين", primary: "service company multiple contracts payroll project accounting" },
                { name: "مشروع 3: المنشأة الصناعية بمخزون ومصانع", primary: "manufacturing company inventory fixed assets full simulation" },
                { name: "تحليل قوائم المنشأة الناتجة عن المشاريع", primary: "analyzing project financial statements interpretation ratios" },
                { name: "تقرير مهني شامل: الكتابة والتنسيق والعرض", primary: "professional comprehensive report writing formatting presentation" },
                { name: "محاكاة لجنة مراجعة الحسابات: الدفاع عن أرقامك", primary: "audit committee simulation defending financial figures" },
                { name: "التغذية الراجعة وتصحيح الأخطاء: الحل النموذجي", primary: "feedback error correction model solution learning improvement" },
                { name: "تقييم الكفاءات المكتسبة من المستوى الأول", primary: "competency assessment level one skills evaluation career" },
                { name: "التهيئة للمستوى الثاني: المهارات المتوقعة", primary: "preparation level two expected skills advanced accounting" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "الأنظمة المحاسبية الرقمية وERP",
          goal: "إتقان أنظمة المحاسبة الرقمية وERPوتطبيقاتها العملية وتحليل البيانات المالية رقمياً",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.6.1",
              name: "Excel المتقدم للمحاسبة والتحليل المالي",
              goal: "إتقان وظائف Excel المتقدمة لبناء نماذج محاسبية وتحليلية احترافية",
              key_concepts: ["VLOOKUP","SUMIFS","PivotTables","Financial Functions","Macros","Dashboard"],
              lessons: [
                { name: "الدوال المنطقية: IF وAND وOR في المحاسبة", primary: "IF AND OR logical functions accounting conditions Excel" },
                { name: "VLOOKUP وINDEX-MATCH: البحث في الجداول المالية", primary: "VLOOKUP INDEX MATCH lookups financial tables Excel" },
                { name: "SUMIF وSUMIFS: الجمع الشرطي للبيانات المالية", primary: "SUMIF SUMIFS conditional sum financial analysis criteria" },
                { name: "الجداول المحورية: تحليل بيانات المحاسبة الضخمة", primary: "pivot tables accounting data analysis summarization Excel" },
                { name: "الدوال المالية: NPV وIRR وPMT للقرارات المالية", primary: "NPV IRR PMT financial functions investment Excel" },
                { name: "بناء لوحة التحكم المالية: Dashboard الاحترافية", primary: "financial dashboard Excel professional KPI visualization" },
                { name: "الماكرو في Excel: أتمتة المهام المحاسبية المتكررة", primary: "Excel macros VBA automation repetitive accounting tasks" },
                { name: "Power Query: استيراد وتحويل البيانات المالية", primary: "Power Query financial data import transform ETL Excel" },
                { name: "Power BI مع Excel: التقارير التفاعلية المتقدمة", primary: "Power BI Excel integration interactive financial reports" }
              ]
            },
            {
              unit_index: 2, code: "1.6.2",
              name: "أنظمة ERP المحاسبية: SAP وOracle",
              goal: "فهم بنية أنظمة ERP وكيفية دعمها لوظائف المحاسبة وإعداد التقارير المالية التلقائية",
              key_concepts: ["SAP FI","Oracle Financials","Modules","Chart of Accounts","Period Close","Integration"],
              lessons: [
                { name: "نظام ERP: التكامل بين الوظائف والمحاسبة", primary: "ERP integration modules accounting financial management" },
                { name: "SAP FI: وحدة المحاسبة المالية في SAP", primary: "SAP FI financial accounting module overview transactions" },
                { name: "الدليل المحاسبي في ERP: تصميم التنظيم", primary: "chart of accounts ERP design organizational structure" },
                { name: "إدخال القيود والموافقات في بيئة ERP", primary: "journal entries approval workflow ERP accounting SAP" },
                { name: "الإقفال الشهري في ERP: الخطوات الآلية", primary: "monthly period close ERP automated steps reconciliation" },
                { name: "التقارير المالية من ERP: المرونة والتخصيص", primary: "ERP financial reports customization flexibility real-time" },
                { name: "وحدة AR وAP في ERP: الإدارة الآلية", primary: "accounts receivable payable ERP module automation management" },
                { name: "وحدة الأصول الثابتة في SAP: دورة الحياة الكاملة", primary: "SAP fixed assets module lifecycle depreciation ERP" },
                { name: "Oracle Financials: البديل الرائد في السوق", primary: "Oracle Financials Cloud ERP comparison SAP features" }
              ]
            },
            {
              unit_index: 3, code: "1.6.3",
              name: "برامج المحاسبة للشركات الصغيرة",
              goal: "إتقان استخدام برامج المحاسبة المتخصصة للشركات الصغيرة والمتوسطة في البيئة العربية",
              key_concepts: ["QuickBooks","Xero","Zoho Books","Arabic Accounting Software","Cloud Setup","Reports"],
              lessons: [
                { name: "QuickBooks: الإعداد الكامل من الصفر", primary: "QuickBooks setup company file chart of accounts initial" },
                { name: "إدارة العملاء والموردين في QuickBooks", primary: "QuickBooks customers vendors setup transactions invoicing" },
                { name: "القيود اليومية وتسجيل العمليات في QuickBooks", primary: "QuickBooks journal entries transactions recording daily" },
                { name: "الرواتب في QuickBooks: الإعداد والصرف والتقارير", primary: "QuickBooks payroll setup run reports compliance" },
                { name: "التقارير المالية في QuickBooks وتخصيصها", primary: "QuickBooks financial reports customization profit loss balance" },
                { name: "Xero: البديل السحابي الحديث", primary: "Xero cloud accounting bank feed automation features" },
                { name: "برامج المحاسبة العربية: الاعتبارات الخاصة", primary: "Arabic accounting software RTL local tax compliance" },
                { name: "ربط البرامج مع البنوك: التغذية البنكية الآلية", primary: "bank feed integration automatic reconciliation accounting software" },
                { name: "انتقال البيانات بين الأنظمة: الترحيل والنسخ الاحتياطي", primary: "data migration backup accounting system transition planning" }
              ]
            },
            {
              unit_index: 4, code: "1.6.4",
              name: "تحليل البيانات المالية بـPython",
              goal: "توظيف Python لأتمتة المهام المحاسبية وتحليل البيانات المالية وإنتاج تقارير تفاعلية",
              key_concepts: ["Pandas","Financial Data","Automation","Data Cleaning","Visualization","Reporting"],
              lessons: [
                { name: "Pandas للمحاسب: تحميل ومعالجة البيانات المالية", primary: "Pandas financial data loading cleaning accounting analysis" },
                { name: "تنظيف بيانات المحاسبة: الأخطاء والمكررات", primary: "data cleaning accounting duplicates missing values errors Python" },
                { name: "تجميع وتحليل كشوف الحسابات بـPandas", primary: "account statements aggregation groupby Pandas financial analysis" },
                { name: "حساب النسب المالية آلياً بـPython", primary: "financial ratios automation Python calculation income balance" },
                { name: "التصور البياني للبيانات المالية: Matplotlib وSeaborn", primary: "financial data visualization Matplotlib Seaborn charts accounting" },
                { name: "تقرير الميزانية الآلي: من Excel لـPython", primary: "automated budget report Python Excel integration scheduled" },
                { name: "كشف الشذوذات في البيانات المحاسبية بـPython", primary: "anomaly detection accounting data Python statistical analysis" },
                { name: "استخراج البيانات من PDFs وكشوف البنوك", primary: "PDF extraction bank statements OCR Python automation" },
                { name: "لوحة تحكم مالية تفاعلية بـPlotly وDash", primary: "interactive financial dashboard Plotly Dash Python deployment" }
              ]
            },
            {
              unit_index: 5, code: "1.6.5",
              name: "الأمن المعلوماتي والرقابة في الأنظمة الرقمية",
              goal: "فهم متطلبات الأمن المعلوماتي في الأنظمة المحاسبية وضوابط الرقابة الداخلية الرقمية",
              key_concepts: ["IT Controls","Access Management","Audit Trail","Cybersecurity","Data Backup","ITGC"],
              lessons: [
                { name: "ضوابط تقنية المعلومات العامة ITGC في المحاسبة", primary: "ITGC general IT controls accounting systems access security" },
                { name: "إدارة الصلاحيات: من يرى ماذا في النظام؟", primary: "access management roles permissions segregation of duties ERP" },
                { name: "مسار التدقيق الرقمي: تتبع كل عملية", primary: "audit trail digital tracking every transaction system log" },
                { name: "الأمن السيبراني في الأنظمة المالية", primary: "cybersecurity financial systems threats controls accounting" },
                { name: "النسخ الاحتياطي واستمرارية الأعمال", primary: "backup disaster recovery business continuity accounting data" },
                { name: "الاحتيال الرقمي: أشكاله والوقاية منه", primary: "digital fraud accounting cyber financial crime prevention" },
                { name: "ضوابط الموافقة الإلكترونية: التوقيع الرقمي", primary: "electronic approval digital signature workflow authorization" },
                { name: "مراقبة النظام: التنبيهات والأداء والمراجعة", primary: "system monitoring alerts performance review IT audit" },
                { name: "الامتثال للوائح حماية البيانات: GDPR وعربياً", primary: "data protection compliance GDPR Arab region regulations" }
              ]
            },
            {
              unit_index: 6, code: "1.6.6",
              name: "تحليلات الذكاء الاصطناعي في المحاسبة",
              goal: "فهم كيف تُوظَّف تقنيات الذكاء الاصطناعي لتحسين الكفاءة المحاسبية وتقليل الأخطاء",
              key_concepts: ["AI Accounting","RPA","Machine Learning Finance","Predictive Analytics","NLP Documents","Chatbots"],
              lessons: [
                { name: "أتمتة العمليات الروبوتية RPA في المحاسبة", primary: "RPA robotic process automation accounting tasks repetitive" },
                { name: "تصنيف المعاملات آلياً بالذكاء الاصطناعي", primary: "AI transaction classification automated categorization accounts" },
                { name: "استخراج البيانات من الفواتير بالذكاء الاصطناعي", primary: "AI invoice data extraction OCR NLP accounts payable" },
                { name: "كشف الاحتيال بالذكاء الاصطناعي: نماذج التنبؤ", primary: "AI fraud detection predictive models anomaly financial data" },
                { name: "التنبؤ المالي بالتعلم الآلي: ARIMA والشبكات", primary: "financial forecasting machine learning ARIMA neural networks" },
                { name: "المحادثات المحاسبية: ChatGPT وClaude للمحاسبين", primary: "AI chatbots accounting queries ChatGPT accounting use cases" },
                { name: "تقييم نماذج الذكاء الاصطناعي في المحاسبة", primary: "AI models evaluation accounting accuracy reliability bias" },
                { name: "الاعتبارات الأخلاقية للذكاء الاصطناعي في المحاسبة", primary: "ethical considerations AI accounting transparency accountability" },
                { name: "مستقبل المحاسبة مع الذكاء الاصطناعي: فرص لا تهديدات", primary: "future accounting AI opportunities not threats advisory role" }
              ]
            },
            {
              unit_index: 7, code: "1.6.7",
              name: "Blockchain والحسابات الموزعة",
              goal: "فهم تقنية Blockchain وتأثيرها على المحاسبة والتدقيق والشفافية المالية",
              key_concepts: ["Blockchain","Distributed Ledger","Smart Contracts","Crypto Accounting","Immutability","Triple Entry"],
              lessons: [
                { name: "Blockchain: الدفتر الموزع غير القابل للتغيير", primary: "blockchain distributed ledger immutable accounting trust" },
                { name: "المحاسبة الثلاثية القيود: ثورة بلوكتشين", primary: "triple entry bookkeeping blockchain transparency verification" },
                { name: "العقود الذكية: تنفيذ آلي للمعاملات التجارية", primary: "smart contracts automated transactions execution accounting" },
                { name: "محاسبة العملات الرقمية: Bitcoin وEthereum", primary: "cryptocurrency accounting Bitcoin Ethereum IFRS treatment" },
                { name: "تأثير Blockchain على التدقيق: فحص آني", primary: "blockchain impact audit real-time verification continuous" },
                { name: "NFTs والأصول الرقمية: معالجة محاسبية جديدة", primary: "NFT digital assets accounting treatment IFRS emerging" },
                { name: "مشاريع Blockchain في المحاسبة الحكومية", primary: "government blockchain accounting transparency corruption" },
                { name: "مخاطر Blockchain: الأمن والتنظيم والقانون", primary: "blockchain risks security regulatory legal accounting" },
                { name: "مستقبل دفاتر الأستاذ: من الورق للـBlockchain", primary: "future ledgers paper to blockchain evolution accounting" }
              ]
            },
            {
              unit_index: 8, code: "1.6.8",
              name: "التقارير المالية الآنية ولوحات المعلومات",
              goal: "بناء أنظمة تقارير مالية آنية ولوحات معلومات تفاعلية للإدارة وأصحاب المصلحة",
              key_concepts: ["Real-Time Reporting","Financial Dashboard","KPIs","Business Intelligence","Automated Reports","Visualization"],
              lessons: [
                { name: "التقارير المالية الآنية: ثورة البيانات الفورية", primary: "real-time financial reporting instant data business intelligence" },
                { name: "KPIs المالية: اختيار المقاييس الصحيحة", primary: "financial KPIs selection relevant metrics management reporting" },
                { name: "لوحة المعلومات التنفيذية: ما يريده CEO", primary: "executive dashboard CEO CFO metrics financial overview" },
                { name: "لوحة المعلومات التشغيلية: ما يريده المدير المالي", primary: "operational dashboard CFO controller detailed financial metrics" },
                { name: "Power BI للمحاسبة: بناء تقارير احترافية", primary: "Power BI accounting professional reports dashboard building" },
                { name: "Tableau في التحليل المالي: التصور الاحترافي", primary: "Tableau financial analysis visualization interactive reports" },
                { name: "أتمتة التقارير: الإرسال الآلي والجدولة", primary: "automated reports scheduling email distribution accounting" },
                { name: "تحليلات التنبؤ: من التاريخ للمستقبل", primary: "predictive analytics historical data financial forecasting" },
                { name: "تقييم جودة تقارير BI وتحسينها المستمر", primary: "BI reports quality evaluation continuous improvement feedback" }
              ]
            },
            {
              unit_index: 9, code: "1.6.9",
              name: "تكامل الأنظمة وإدارة التحول الرقمي",
              goal: "فهم كيفية تكامل الأنظمة المختلفة وإدارة مشاريع التحول الرقمي في الأقسام المحاسبية",
              key_concepts: ["System Integration","API","Digital Transformation","Change Management","Migration","Cloud"],
              lessons: [
                { name: "تكامل الأنظمة عبر API: ربط المحاسبة بالعمليات", primary: "API integration accounting systems operations real-time sync" },
                { name: "إدارة التحول الرقمي في قسم المحاسبة", primary: "digital transformation accounting department change management" },
                { name: "خطة الهجرة من النظام القديم للجديد", primary: "migration plan legacy to new system accounting data transfer" },
                { name: "إدارة التغيير: مقاومة الموظفين وحلولها", primary: "change management employee resistance training adoption" },
                { name: "المحاسبة السحابية: الأمان والامتثال والأداء", primary: "cloud accounting security compliance performance considerations" },
                { name: "SaaS مقابل On-Premise: اختيار النهج المناسب", primary: "SaaS on-premise comparison accounting software selection" },
                { name: "اختبار الأنظمة الجديدة: UAT وضمان الجودة", primary: "user acceptance testing UAT quality assurance new system" },
                { name: "التدريب وبناء القدرات الرقمية في الفريق", primary: "digital skills training team capacity building accounting" },
                { name: "الحوكمة الرقمية: السياسات والمعايير والرقابة", primary: "digital governance policies standards controls IT accounting" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "مراجعة شاملة وتطبيقات المستوى الأول",
          goal: "توحيد ومراجعة جميع مفاهيم المستوى الأول وتطبيقها في سيناريوهات متكاملة تُحاكي بيئة العمل الاحترافية",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.7.1",
              name: "مراجعة الأساسيات: تعزيز الركائز",
              goal: "مراجعة وتوحيد المفاهيم الأساسية للمستوى الأول وتشخيص نقاط الضعف وعلاجها",
              key_concepts: ["Review","Consolidation","Weak Points","Remediation","Self-Assessment","Practice"],
              lessons: [
                { name: "اختبار الكفاءة الذاتية: أين أقف الآن؟", primary: "self-assessment competency level accounting fundamentals" },
                { name: "مراجعة القيد المزدوج: التثبيت النهائي", primary: "double entry review reinforcement final consolidation" },
                { name: "مراجعة القوائم المالية: إعداد وتفسير", primary: "financial statements review preparation interpretation practice" },
                { name: "مراجعة الأصول والاستهلاك: الحسابات الدقيقة", primary: "assets depreciation review calculations accuracy practice" },
                { name: "مراجعة الرواتب والضرائب: الالتزام الكامل", primary: "payroll taxes compliance review comprehensive practice" },
                { name: "مراجعة التسوية البنكية والنقدية", primary: "bank reconciliation cash review complete practice" },
                { name: "مراجعة قيود التسوية والإقفال", primary: "adjusting closing entries review full accounting cycle" },
                { name: "اختبار تشخيصي شامل للمستوى الأول", primary: "comprehensive diagnostic test level one full assessment" },
                { name: "خطة العلاج الفردية: تقوية نقاط الضعف", primary: "individual remediation plan weak areas strengthening" }
              ]
            },
            {
              unit_index: 2, code: "1.7.2",
              name: "تطبيقات عملية: منشآت يمنية نموذجية",
              goal: "تطبيق مفاهيم المستوى الأول على نماذج منشآت يمنية حقيقية في قطاعات متنوعة",
              key_concepts: ["Yemeni Business Cases","Local Context","Practical Application","Multiple Sectors"],
              lessons: [
                { name: "محاسبة متجر الملابس اليمني: من الشراء للبيع", primary: "Yemeni clothing store accounting complete cycle practice" },
                { name: "محاسبة مكتب الاستشارات: منشأة خدمية محلية", primary: "Yemeni consulting office service firm accounting practice" },
                { name: "محاسبة مصنع قطاع صغير: التكاليف الأولية", primary: "small manufacturing Yemen basic cost accounting practice" },
                { name: "محاسبة شركة استيراد وتصدير يمنية", primary: "Yemen import export company accounting foreign currency" },
                { name: "محاسبة المطعم: المخزون والرواتب والإيرادات", primary: "restaurant accounting inventory payroll revenue daily" },
                { name: "محاسبة المقاول اليمني: العقود والمراحل", primary: "Yemeni contractor accounting contracts milestones billing" },
                { name: "محاسبة الصيدلية: الرخصة والمخزون الطبي", primary: "pharmacy accounting license medical inventory prescription" },
                { name: "محاسبة المدرسة الخاصة: الرسوم والرواتب", primary: "private school accounting tuition payroll expenses" },
                { name: "مقارنة وتحليل: أوجه التشابه والاختلاف بين القطاعات", primary: "sector comparison analysis similarities differences accounting" }
              ]
            },
            {
              unit_index: 3, code: "1.7.3",
              name: "الاختبارات المحاكية والتحضير المهني",
              goal: "التدرب على اختبارات المحاسبة المهنية وبناء الثقة والكفاءة في الإجابة تحت ضغط الوقت",
              key_concepts: ["Mock Exams","Time Management","Professional Exams","Strategy","Confidence","Review"],
              lessons: [
                { name: "استراتيجية الإجابة في الامتحانات المهنية", primary: "professional exam answering strategy time management tips" },
                { name: "اختبار محاكٍ 1: الجزء النظري والمفاهيمي", primary: "mock exam 1 theoretical conceptual questions practice" },
                { name: "اختبار محاكٍ 2: الجزء التطبيقي والحسابي", primary: "mock exam 2 practical computational exercises accounting" },
                { name: "اختبار محاكٍ 3: حالات عملية وقوائم مالية", primary: "mock exam 3 case studies financial statements comprehensive" },
                { name: "تحليل الإجابات الخاطئة: فهم سبب الخطأ", primary: "wrong answers analysis root cause understanding correction" },
                { name: "إعادة الاختبار في مناطق الضعف المكتشفة", primary: "retesting weak areas diagnosed retake improvement" },
                { name: "التحضير لامتحانات CPA وACCA وCMA وطنياً", primary: "CPA ACCA CMA exam preparation local national level" },
                { name: "بناء محفظة الأعمال: توثيق المهارات المكتسبة", primary: "portfolio building documenting acquired skills accounting" },
                { name: "الشهادات الدولية: الخطوات العملية للبدء", primary: "international certifications practical steps CPA ACCA enrollment" }
              ]
            },
            {
              unit_index: 4, code: "1.7.4",
              name: "التواصل المالي والعروض التقديمية",
              goal: "إتقان تقديم المعلومات المالية لجمهور متنوع بأسلوب واضح ومقنع ومهني",
              key_concepts: ["Financial Communication","Presentations","Non-Financial Audience","Storytelling","Visual Reports"],
              lessons: [
                { name: "ترجمة الأرقام لقصص: الرواية المالية", primary: "financial storytelling translating numbers to narratives business" },
                { name: "عرض القوائم المالية للإدارة العليا", primary: "presenting financial statements senior management executive" },
                { name: "تبسيط المفاهيم المحاسبية لغير المتخصصين", primary: "simplifying accounting concepts non-financial audience clear" },
                { name: "التقرير المكتوب: الوضوح والدقة والإيجاز", primary: "written report clarity accuracy conciseness financial writing" },
                { name: "الرسوم البيانية المالية: ما يُقنع وما يُشوّه", primary: "financial charts persuasion vs distortion best practices" },
                { name: "ورشة عمل: تقديم قوائم مالية في 10 دقائق", primary: "financial presentation workshop 10 minutes executive summary" },
                { name: "الأسئلة الصعبة: كيف تُجيب على لجنة المراجعة", primary: "tough questions audit committee answering professional confidence" },
                { name: "الإفصاح العلني: البيانات الصحفية المالية", primary: "public disclosure press releases financial results communication" },
                { name: "بناء مصداقيتك المهنية: السمعة والشبكة", primary: "professional credibility reputation network building accountant" }
              ]
            },
            {
              unit_index: 5, code: "1.7.5",
              name: "الانتقال للمستوى الثاني: المحاسبة المتقدمة",
              goal: "التهيؤ الكامل للانتقال للمستوى الثاني من خلال فهم ما سيُبنى على أساس المستوى الأول",
              key_concepts: ["Level Transition","Advanced Preview","Skill Bridge","Readiness Assessment","Planning"],
              lessons: [
                { name: "خريطة المستوى الثاني: ماذا سأتعلم؟", primary: "level two roadmap what to expect advanced accounting preview" },
                { name: "الأساس المطلوب: ما يجب أن أُتقنه قبل الانتقال", primary: "prerequisites mastery check level two transition readiness" },
                { name: "محاسبة التكاليف: لمحة أولى عن عالم جديد", primary: "cost accounting first glimpse new world level two preview" },
                { name: "IFRS المتقدمة: التعقيد القادم في المعايير", primary: "advanced IFRS complexity upcoming standards level two" },
                { name: "التحليل المالي: من الحساب للقرار الاستراتيجي", primary: "financial analysis from calculation to strategic decision" },
                { name: "التدقيق والرقابة: المستوى التالي من الضمان", primary: "auditing internal controls next level assurance quality" },
                { name: "خطتي الشخصية: تطوير مهاراتي في المستوى الثاني", primary: "personal development plan level two skills professional growth" },
                { name: "شبكة المعارف المهنية: بناء العلاقات في المجال", primary: "professional network building accounting career connections" },
                { name: "مشروع الخروج: عرض رحلتي المحاسبية في المستوى الأول", primary: "exit project presenting level one accounting journey portfolio" }
              ]
            },
            {
              unit_index: 6, code: "1.7.6",
              name: "دراسات حالة عالمية في المحاسبة",
              goal: "تحليل دراسات حالة من شركات عالمية كبرى لتعزيز الفهم العملي وربط النظرية بالتطبيق",
              key_concepts: ["Case Studies","Global Companies","Analysis","Lessons","Critical Thinking","Application"],
              lessons: [
                { name: "حالة Amazon: محاسبة التجارة الإلكترونية", primary: "Amazon accounting e-commerce revenue recognition scale" },
                { name: "حالة Aramco: محاسبة شركات النفط الكبرى", primary: "Aramco accounting oil company scale revenue assets" },
                { name: "حالة Tesla: الأصول ومحاسبة الشركات الناشئة", primary: "Tesla accounting startup growth assets revenue recognition" },
                { name: "حالة JP Morgan: محاسبة البنوك والمؤسسات المالية", primary: "JP Morgan banking accounting financial institutions specific" },
                { name: "حالة Walmart: محاسبة سلاسل التجزئة الضخمة", primary: "Walmart retail chain accounting inventory scale supply chain" },
                { name: "حالة Boeing: محاسبة العقود الكبرى والتصنيع", primary: "Boeing manufacturing contract accounting long-term projects" },
                { name: "مقارنة نهج المحاسبة: GAAP مقابل IFRS عالمياً", primary: "GAAP vs IFRS comparison global companies accounting" },
                { name: "الأزمات المالية ودور المحاسبة في الحل والوقاية", primary: "financial crises accounting role solution prevention lessons" },
                { name: "استخلاص الدروس: ما يُطبَّق محلياً من التجارب العالمية", primary: "lessons learned global experience local application Yemen Gulf" }
              ]
            },
            {
              unit_index: 7, code: "1.7.7",
              name: "التفكير النقدي والحكم المهني",
              goal: "تطوير مهارات التفكير النقدي والحكم المهني في المواقف المحاسبية الغامضة والمعقدة",
              key_concepts: ["Professional Judgment","Critical Thinking","Ambiguity","Ethics Dilemmas","Decision Framework"],
              lessons: [
                { name: "الحكم المهني: ما يُفرّق المحاسب الخبير عن المبتدئ", primary: "professional judgment experience distinction expert beginner" },
                { name: "مواجهة الغموض: حين لا يكون الجواب واضحاً", primary: "ambiguity accounting situations unclear answers professional" },
                { name: "المعضلات الأخلاقية: حين يتعارض الضغط مع المبادئ", primary: "ethical dilemmas pressure vs principles accountant decisions" },
                { name: "إطار القرار: خطوات التفكير المنهجي", primary: "decision framework systematic thinking accounting problems" },
                { name: "الخلافات المهنية: كيف تتعامل مع الرأي المخالف", primary: "professional disagreements handling differing opinions respect" },
                { name: "التوثيق كحماية: لماذا توثّق كل قرار؟", primary: "documentation protection why document every professional decision" },
                { name: "السيناريوهات التدريبية: مواقف حقيقية من المهنة", primary: "training scenarios real professional situations ethics judgment" },
                { name: "تطوير الحساسية المهنية: رؤية المخاطر مبكراً", primary: "professional sensitivity developing risk awareness early warning" },
                { name: "الثقة بالنفس المهنية: بناء رأي راسخ ومُبرَّر", primary: "professional confidence building well-reasoned justified opinion" }
              ]
            },
            {
              unit_index: 8, code: "1.7.8",
              name: "إدارة الوقت والإنتاجية في المحاسبة",
              goal: "إتقان مهارات إدارة الوقت والإنتاجية الخاصة بالمحاسبين في مواسم الإقفال والضغط",
              key_concepts: ["Time Management","Productivity","Closing Season","Priorities","Deadlines","Work-Life Balance"],
              lessons: [
                { name: "مواسم الضغط في المحاسبة: كيف تتجهز؟", primary: "accounting peak seasons year end closing preparation strategy" },
                { name: "تحديد الأولويات: ما يجب أن يتم أولاً دائماً", primary: "prioritization accounting tasks urgent important matrix" },
                { name: "أدوات إدارة المشاريع للمحاسبين: Trello وAsana", primary: "project management tools accountants Trello Asana planning" },
                { name: "التفويض الفعّال: متى تعمل ومتى تُفوّض؟", primary: "effective delegation accountant when to delegate team" },
                { name: "إدارة الاجتماعات المالية: الكفاءة والوقت", primary: "financial meetings management efficiency time productive" },
                { name: "التوازن بين العمل والحياة: استدامة المحاسب", primary: "work life balance accountant sustainability wellbeing career" },
                { name: "التطوير المستمر: وقت التعلم وسط الانشغال", primary: "continuous learning busy schedule time allocation development" },
                { name: "القائمة المرجعية للإقفال: لا شيء يُنسى", primary: "closing checklist nothing missed month end year end" },
                { name: "التعلم من الأخطاء: ثقافة التحسين المستمر", primary: "learning from mistakes continuous improvement culture accounting" }
              ]
            },
            {
              unit_index: 9, code: "1.7.9",
              name: "المشروع الختامي للمستوى الأول",
              goal: "تقديم مشروع محاسبي متكامل يُظهر إتقان جميع مهارات المستوى الأول بشكل احترافي",
              key_concepts: ["Capstone","Portfolio","Professional Presentation","Complete Package","Certification Ready"],
              lessons: [
                { name: "اختيار المشروع الختامي: المعايير والتوقعات", primary: "capstone project selection criteria expectations level one" },
                { name: "المرحلة الأولى: تحليل المنشأة وفهم البيئة", primary: "project phase one entity analysis environment understanding" },
                { name: "المرحلة الثانية: الدورة المحاسبية الكاملة", primary: "project phase two complete accounting cycle all entries" },
                { name: "المرحلة الثالثة: القوائم المالية والتحليل", primary: "project phase three financial statements analysis interpretation" },
                { name: "المرحلة الرابعة: التقرير الاحترافي الشامل", primary: "project phase four professional comprehensive report writing" },
                { name: "المرحلة الخامسة: العرض التقديمي الاحترافي", primary: "project phase five professional presentation delivery" },
                { name: "المراجعة النظيرة: التغذية الراجعة من الزملاء", primary: "peer review feedback colleagues professional growth" },
                { name: "التقييم النهائي: معايير المشروع الاحترافي", primary: "final assessment rubric professional project criteria level one" },
                { name: "الاحتفاء بالإنجاز والانطلاق نحو المستوى الثاني", primary: "celebrating achievement transition level two advanced accounting" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 2,
      name: "المحاسبة المتقدمة والتحليلية",
      goal: "الارتقاء بمهارات المحاسبة إلى مستوى التحليل المتقدم والتكاليف والتخطيط المالي والتدقيق ومعايير IFRS المتقدمة، بما يُؤهّل للعمل في بيئات الأعمال المعقدة",
      bloom_focus: "analyze",
      exam: { pass_threshold_percent: 70, time_limit_minutes: 80 },
      stages: [
        {
          stage_index: 1,
          name: "محاسبة التكاليف: من المفهوم للقرار",
          goal: "إتقان محاسبة التكاليف بأنظمتها المختلفة وتوظيفها في اتخاذ القرارات الإدارية وتحسين الربحية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.1.1",
              name: "أسس محاسبة التكاليف وتصنيفاتها",
              goal: "بناء فهم متكامل لمفهوم التكلفة وتصنيفاتها المختلفة وعلاقتها بالقرارات الإدارية",
              key_concepts: ["Cost Classification","Fixed Variable","Direct Indirect","Product Period","Relevant Irrelevant"],
              lessons: [
                { name: "محاسبة التكاليف: وظيفة الرقابة والقرار", primary: "cost accounting decision control planning management function" },
                { name: "التكاليف الثابتة والمتغيرة: سلوك التكلفة", primary: "fixed variable cost behavior activity level changes" },
                { name: "التكاليف المباشرة وغير المباشرة: التتبع والتوزيع", primary: "direct indirect costs tracing allocation product service" },
                { name: "تكاليف المنتج وتكاليف الفترة: ما يصير مخزوناً", primary: "product period costs inventory expense balance sheet income" },
                { name: "التكاليف الملائمة وغير الملائمة للقرار", primary: "relevant irrelevant costs decision making differential" },
                { name: "تكلفة الفرصة البديلة: ما تتخلى عنه لتحصله", primary: "opportunity cost trade-off decision making scarce resources" },
                { name: "التكاليف الغارقة: الماضي لا يؤثر على القرار", primary: "sunk costs past decisions ignore future decisions" },
                { name: "التكاليف الهامشية: آخر وحدة ماذا تُكلّف؟", primary: "marginal costs last unit additional cost variable" },
                { name: "التكاليف المعيارية: المعيار كأداة للرقابة", primary: "standard costs budgeted benchmark control variance" }
              ]
            },
            {
              unit_index: 2, code: "2.1.2",
              name: "نظام التكلفة بالأمر الإنتاجي",
              goal: "إتقان نظام التكلفة بالأمر لتتبع تكاليف كل وحدة أو طلبية منفصلة في بيئات الإنتاج المتنوعة",
              key_concepts: ["Job Order Costing","Job Cost Sheet","Direct Materials","Direct Labor","Overhead Rate","WIP"],
              lessons: [
                { name: "نظام الأمر الإنتاجي: منتج واحد تكلفة واحدة", primary: "job order costing single job unique product tracking" },
                { name: "بطاقة تكلفة الأمر: الملف المالي للطلبية", primary: "job cost sheet direct materials labor overhead accumulation" },
                { name: "تكلفة المواد المباشرة: من المخزن للأمر", primary: "direct materials requisition job materials cost tracking" },
                { name: "تكلفة العمالة المباشرة: من ساعة العمل للأمر", primary: "direct labor time sheets job hours cost allocation" },
                { name: "التحميل التقديري للتكاليف غير المباشرة", primary: "predetermined overhead rate applied overhead job costing" },
                { name: "فرق التحميل: الزيادة والنقص في التحميل التقديري", primary: "over under applied overhead variance disposition" },
                { name: "الأعمال تحت التنفيذ: رصيد المخزون الوسيط", primary: "work in process WIP balance inventory flow job costing" },
                { name: "الأمر المنتج مقابل الأمر المحتمل: التكلفة والسعر", primary: "job cost actual bid estimate pricing profitability" },
                { name: "تحليل ربحية الطلبيات: أيها نُكمل وأيها نرفض؟", primary: "job profitability analysis accept reject pricing decisions" }
              ]
            },
            {
              unit_index: 3, code: "2.1.3",
              name: "نظام التكاليف بالمرحلة الإنتاجية",
              goal: "إتقان نظام التكلفة بالمرحلة لتتبع التكاليف في بيئات الإنتاج المتسلسل للكميات الكبيرة",
              key_concepts: ["Process Costing","Equivalent Units","FIFO Process","Weighted Average Process","Cost per EUP","Transferred In"],
              lessons: [
                { name: "نظام المرحلة: حين الإنتاج متسلسل ومتجانس", primary: "process costing sequential production homogeneous mass" },
                { name: "وحدات المعادل: الجسر بين الكامل والناقص", primary: "equivalent units of production EUP calculation concept" },
                { name: "التقرير الإنتاجي: خطوات المحاسبة بالمرحلة", primary: "production report five steps process costing summary" },
                { name: "طريقة المتوسط المرجح في التكاليف بالمرحلة", primary: "weighted average method process costing EUP cost" },
                { name: "طريقة FIFO في التكاليف بالمرحلة", primary: "FIFO method process costing beginning WIP prior costs" },
                { name: "مقارنة FIFO والمتوسط: متى يهم الفرق؟", primary: "FIFO weighted average comparison process costing difference" },
                { name: "التكاليف المنقولة من مرحلة لمرحلة: التسلسل", primary: "transferred in costs previous department sequential process" },
                { name: "وحدات الهالك الطبيعي وغير الطبيعي", primary: "spoilage normal abnormal units process costing treatment" },
                { name: "مزج النظامين: متى نستخدم كلاً أو مزيجاً؟", primary: "hybrid costing systems when to use job process mix" }
              ]
            },
            {
              unit_index: 4, code: "2.1.4",
              name: "التكاليف غير المباشرة وتوزيعها",
              goal: "إتقان أساليب توزيع التكاليف غير المباشرة على مراكز التكلفة والمنتجات بدقة وعدالة",
              key_concepts: ["Overhead Allocation","Cost Pools","Cost Drivers","ABC Costing","Service Departments","Plant-Wide Rate"],
              lessons: [
                { name: "معدل التحميل النباتي: السرعة لا الدقة", primary: "plant-wide overhead rate simple fast less accurate" },
                { name: "معدلات الأقسام: دقة أعلى بمعدلات متعددة", primary: "departmental overhead rates multiple more accurate allocation" },
                { name: "مراكز التكلفة الخدمية: كيف توزّع تكاليفها؟", primary: "service department cost allocation direct reciprocal method" },
                { name: "طريقة الإسناد المباشر والتسلسلي والمتبادل", primary: "service costs direct step-down reciprocal allocation methods" },
                { name: "التكلفة المبنية على النشاط ABC: الدقة الحقيقية", primary: "activity based costing ABC drivers pools accurate" },
                { name: "تحديد محركات التكلفة: ما يُسبب التكلفة؟", primary: "cost drivers identification cause effect activity ABC" },
                { name: "مقارنة ABC بالتقليدية: متى تُبرر التكلفة؟", primary: "ABC vs traditional comparison when justified complexity" },
                { name: "إدارة التكاليف غير المباشرة: استراتيجيات التخفيض", primary: "overhead reduction management strategies lean efficiency" },
                { name: "ربحية العملاء والمنتجات بعد ABC: المفاجآت", primary: "customer product profitability ABC surprising results decisions" }
              ]
            },
            {
              unit_index: 5, code: "2.1.5",
              name: "تحليل CVP: الحجم والتكلفة والربح",
              goal: "إتقان تحليل CVP وحساب نقطة التعادل وهامش الأمان واتخاذ القرارات المبنية على التكلفة",
              key_concepts: ["CVP Analysis","Break-Even","Margin of Safety","Contribution Margin","Operating Leverage","Sales Mix"],
              lessons: [
                { name: "هامش المساهمة: الفرق الجوهري بين البيع والتكلفة المتغيرة", primary: "contribution margin unit total ratio CVP foundation" },
                { name: "نقطة التعادل: حين لا ربح ولا خسارة", primary: "break-even point calculation units sales fixed costs CM" },
                { name: "نقطة التعادل للمبيعات المتنوعة: مزيج المنتجات", primary: "break-even sales mix multiple products weighted average CM" },
                { name: "هامش الأمان: كم يمكننا أن نخسر قبل الخسارة؟", primary: "margin of safety actual expected sales break-even gap" },
                { name: "الرافعة التشغيلية: حساسية الربح لتغير المبيعات", primary: "operating leverage ratio sensitivity profit sales changes" },
                { name: "تحليل What-If: تأثير القرارات على النقطة", primary: "what-if analysis CVP price change cost effects breakeven" },
                { name: "الربح المستهدف: كم نبيع لتحقيق هدف محدد؟", primary: "target profit calculation required sales units revenue" },
                { name: "CVP مع ضرائب: تعديل المعادلة", primary: "CVP after tax target profit income tax adjustment" },
                { name: "محدودية CVP: الافتراضات والواقع", primary: "CVP limitations assumptions reality non-linear costs" }
              ]
            },
            {
              unit_index: 6, code: "2.1.6",
              name: "التكاليف المعيارية وتحليل الانحرافات",
              goal: "إتقان نظام التكاليف المعيارية وتحليل انحرافات المواد والعمالة والتكاليف غير المباشرة",
              key_concepts: ["Standard Costs","Variances","Material Price Usage","Labor Rate Efficiency","Overhead Variances"],
              lessons: [
                { name: "وضع المعايير: كيف نحدد الرقم المستهدف؟", primary: "standard setting ideal attainable practical methods" },
                { name: "انحراف سعر المواد: هل اشترينا بالسعر المخطط؟", primary: "material price variance purchase price vs standard favorable" },
                { name: "انحراف كمية المواد: هل استخدمنا الكمية المخطط؟", primary: "material usage quantity variance actual standard usage" },
                { name: "انحراف معدل العمالة: هل دفعنا السعر المخطط؟", primary: "labor rate variance actual pay vs standard rate" },
                { name: "انحراف كفاءة العمالة: هل عملنا بالوقت المخطط؟", primary: "labor efficiency variance actual standard hours used" },
                { name: "انحرافات التكاليف غير المباشرة الثابتة والمتغيرة", primary: "fixed variable overhead variances spending volume efficiency" },
                { name: "تفسير الانحرافات: الملائمة وغير الملائمة", primary: "variance interpretation favorable unfavorable significance" },
                { name: "تحقيق الانحرافات: أسبابها وعلاجها", primary: "investigating variances causes responsibility management control" },
                { name: "تقرير الانحرافات: التواصل الإداري الفعّال", primary: "variance report management communication accountability action" }
              ]
            },
            {
              unit_index: 7, code: "2.1.7",
              name: "التسعير والقرارات الإدارية الخاصة",
              goal: "توظيف بيانات التكاليف في اتخاذ القرارات الإدارية الحرجة كالتسعير وقبول الطلبيات الخاصة",
              key_concepts: ["Pricing Decisions","Special Orders","Make or Buy","Product Mix","Scarce Resources","Outsourcing"],
              lessons: [
                { name: "استراتيجيات التسعير: التكلفة والسوق والقيمة", primary: "pricing strategies cost-plus market value-based" },
                { name: "التسعير على أساس التكلفة الكاملة: المأخذ الكلاسيكي", primary: "full cost pricing markup traditional approach advantages" },
                { name: "الطلبية الخاصة: هل أقبل بسعر أقل من المعتاد؟", primary: "special orders accept reject below normal price decision" },
                { name: "صنع أم شراء: داخلي أم تعهيد للخارج؟", primary: "make or buy decision outsourcing relevant costs analysis" },
                { name: "التوقف عن خط منتجات: هل أكمل أم أوقف؟", primary: "discontinue product line segment relevant costs contribution" },
                { name: "التشغيل بطاقة محدودة: كيف تُعظّم الربح؟", primary: "scarce resources capacity constraints maximize contribution" },
                { name: "المعالجة الإضافية: هل نبيع الآن أم نُكمل؟", primary: "sell or process further joint costs split-off point" },
                { name: "نقطة الاختناق: نظرية القيود وتحسين التدفق", primary: "theory of constraints bottleneck throughput accounting" },
                { name: "إعداد تحليل الربحية التفصيلي لدعم القرار", primary: "profitability analysis decision support management accounting" }
              ]
            },
            {
              unit_index: 8, code: "2.1.8",
              name: "محاسبة الجودة والبيئة والاستدامة",
              goal: "دمج مفاهيم تكاليف الجودة والاستدامة البيئية في الإطار المحاسبي الشامل",
              key_concepts: ["Cost of Quality","Prevention Appraisal","Internal External Failure","Environmental Costs","Social Costs"],
              lessons: [
                { name: "تكاليف الجودة: ثمن الخطأ وثمن منعه", primary: "cost of quality prevention appraisal failure categories" },
                { name: "تكاليف الوقاية: الاستثمار في عدم الخطأ", primary: "prevention costs training testing design quality assurance" },
                { name: "تكاليف التقييم: اكتشاف المشكلة قبل العميل", primary: "appraisal costs inspection testing detection internal" },
                { name: "تكاليف الفشل الداخلي: الخردة وإعادة العمل", primary: "internal failure costs rework scrap before delivery" },
                { name: "تكاليف الفشل الخارجي: العميل يكتشف الخطأ", primary: "external failure costs warranty complaints returns reputation" },
                { name: "تقرير تكلفة الجودة: التوازن الأمثل", primary: "cost of quality report optimal balance trade-off" },
                { name: "التكاليف البيئية: الاستدامة في الميزانية", primary: "environmental costs sustainability accounting carbon footprint" },
                { name: "محاسبة رأس المال الطبيعي: تسعير البيئة", primary: "natural capital accounting environmental monetization valuation" },
                { name: "نشر الأداء البيئي: GRI وESG في التقارير", primary: "ESG GRI environmental reporting sustainability disclosure" }
              ]
            },
            {
              unit_index: 9, code: "2.1.9",
              name: "نظام التكاليف المبني على الوقت TDABC",
              goal: "فهم وتطبيق نظام TDABC كتطور متقدم لـABC يستخدم الوقت كمحرك أساسي للتكلفة",
              key_concepts: ["TDABC","Time-Driven","Capacity","Practical Capacity","Activity Time","Cost per Minute"],
              lessons: [
                { name: "محدودية ABC التقليدية: التعقيد والصيانة", primary: "traditional ABC limitations complexity maintenance survey" },
                { name: "TDABC: البساطة بمحرك واحد هو الوقت", primary: "TDABC time-driven simplification single driver minutes" },
                { name: "معدل تكلفة الطاقة: التكلفة لكل دقيقة", primary: "capacity cost rate calculation practical capacity cost minute" },
                { name: "معادلات الوقت: التكاليف للعمليات المتنوعة", primary: "time equations activities complexity multiple conditions" },
                { name: "الطاقة العملية مقابل الطاقة النظرية: الفجوة", primary: "practical theoretical capacity gap idle unused management" },
                { name: "تكلفة الطاقة غير المستخدمة: تحديد الهدر", primary: "unused capacity cost idle capacity waste identification" },
                { name: "تطبيق TDABC على شركة خدمات بالتفصيل", primary: "TDABC service company application detailed case study" },
                { name: "تطبيق TDABC على شركة تصنيع متعددة المنتجات", primary: "TDABC manufacturing company multiple products application" },
                { name: "مقارنة TDABC بـABC التقليدي: متى نختار أيّاً؟", primary: "TDABC vs traditional ABC comparison choice criteria" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "التحليل المالي وتقييم الأداء",
          goal: "إتقان التحليل المالي بأدواته المتقدمة وتقييم أداء المنشآت وبناء نماذج التقييم المالي",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.2.1",
              name: "النسب المالية وتفسيرها",
              goal: "إتقان حساب وتفسير مجموعات النسب المالية ودراستها في سياق الصناعة والمنافسين",
              key_concepts: ["Liquidity Ratios","Profitability Ratios","Activity Ratios","Leverage Ratios","Coverage Ratios"],
              lessons: [
                { name: "نسب السيولة: هل تستطيع المنشأة سداد ديونها؟", primary: "liquidity ratios current quick cash ratio ability pay" },
                { name: "نسب الربحية: ماذا تكسب المنشأة من نشاطها؟", primary: "profitability ratios ROA ROE margins net gross operating" },
                { name: "نسب النشاط: كم مرة تدور الأصول سنوياً؟", primary: "activity ratios asset turnover inventory receivables days" },
                { name: "نسب الهيكل المالي: كم نعتمد على الديون؟", primary: "leverage ratios debt equity gearing financial structure" },
                { name: "نسب التغطية: هل الإيرادات تكفي لخدمة الدين؟", primary: "coverage ratios interest EBITDA debt service ability" },
                { name: "دورة النقد التشغيلية: سرعة تحويل النقد", primary: "cash operating cycle CCC days inventory receivables payables" },
                { name: "تحليل DuPont الموسّع: تشريح العائد على الملكية", primary: "DuPont analysis extended ROE decomposition three five factor" },
                { name: "قراءة النسب في سياق الصناعة: لا تقيس بمعزل", primary: "industry context ratios benchmarking comparison interpretation" },
                { name: "النسب في شركات حقيقية: قراءة وتفسير واستنتاج", primary: "real companies ratios analysis reading interpretation conclusion" }
              ]
            },
            {
              unit_index: 2, code: "2.2.2",
              name: "التحليل الرأسي والأفقي والاتجاهي",
              goal: "إتقان أساليب التحليل المقارن للقوائم المالية عبر الزمن وداخل القائمة الواحدة",
              key_concepts: ["Horizontal Analysis","Vertical Analysis","Trend Analysis","Common Size","Index Numbers"],
              lessons: [
                { name: "التحليل الأفقي: التغيير عبر الزمن بالأرقام والنسب", primary: "horizontal analysis period over period change absolute percentage" },
                { name: "التحليل الرأسي: النسبة إلى الرقم الأساسي", primary: "vertical analysis common size base figure income balance sheet" },
                { name: "قوائم الحجم المشترك: مقارنة الهيكل لا الأرقام", primary: "common size statements structural comparison across companies" },
                { name: "تحليل الاتجاهات: القراءة على مدى سنوات", primary: "trend analysis multiple years index baseline pattern" },
                { name: "التحليل التنبؤي: الاتجاه كأساس للتوقع", primary: "predictive analysis trend extrapolation future projection" },
                { name: "التحليل المقاطعي: مقارنة شركات في نفس الوقت", primary: "cross-sectional analysis same period multiple companies" },
                { name: "الأسئلة الثلاثة: ماذا حدث؟ لماذا؟ ماذا بعد؟", primary: "three questions what happened why what next analysis" },
                { name: "مخاطر التحليل: المعلومات المضللة والاستنتاجات الخاطئة", primary: "analysis pitfalls misleading data wrong conclusions caution" },
                { name: "تقرير التحليل المالي الشامل: الكتابة الاحترافية", primary: "comprehensive financial analysis report professional writing" }
              ]
            },
            {
              unit_index: 3, code: "2.2.3",
              name: "تقييم الأداء ونماذج القيمة",
              goal: "إتقان نماذج تقييم الأداء المؤسسي من القيمة الاقتصادية المضافة إلى بطاقة الأداء المتوازن",
              key_concepts: ["EVA","Balanced Scorecard","ROI","RI","Performance Measurement","Value Creation"],
              lessons: [
                { name: "العائد على الاستثمار ROI: القياس الأقدم والأشهر", primary: "ROI return on investment calculation strengths weaknesses" },
                { name: "الدخل التبقي RI: تجاوز محدودية ROI", primary: "residual income RI required return opportunity cost better" },
                { name: "القيمة الاقتصادية المضافة EVA: خلق القيمة الحقيقي", primary: "EVA economic value added NOPAT WACC capital charge" },
                { name: "بطاقة الأداء المتوازن BSC: الأبعاد الأربعة", primary: "balanced scorecard four perspectives financial customer process" },
                { name: "تصميم KPIs ربطها بالاستراتيجية", primary: "KPI design strategy alignment leading lagging indicators" },
                { name: "مراكز التكلفة والإيراد والربح والاستثمار", primary: "responsibility centers cost revenue profit investment" },
                { name: "التسعير التحويلي: نقل الموارد داخل المجموعة", primary: "transfer pricing internal transactions group companies arm length" },
                { name: "EBITDA: الربح قبل كل شيء ومحدوديته", primary: "EBITDA calculation limitations proxy for cash flow" },
                { name: "توصيل الأداء للمساهمين: تقرير القيمة", primary: "shareholder value report performance communication investor" }
              ]
            },
            {
              unit_index: 4, code: "2.2.4",
              name: "التحليل الائتماني وتقييم المخاطر",
              goal: "إتقان التحليل الائتماني وتقييم مخاطر الإفلاس وتصنيف الجدارة الائتمانية للمنشآت",
              key_concepts: ["Credit Analysis","Altman Z-Score","Credit Rating","Debt Capacity","Default Risk","Distress"],
              lessons: [
                { name: "التحليل الائتماني: ما يريده البنك قبل الإقراض", primary: "credit analysis 5Cs character capacity capital conditions" },
                { name: "نموذج Altman Z-Score: التنبؤ بالإفلاس", primary: "Altman Z-Score bankruptcy prediction model calculation" },
                { name: "نسب الديون وخدمتها: قياس طاقة الاستيعاب", primary: "debt service coverage ratio capacity borrowing analysis" },
                { name: "التصنيف الائتماني: ما يقوله Moody's وS&P", primary: "credit rating agencies Moody S&P methodology implications" },
                { name: "الإفلاس والضائقة المالية: المؤشرات المبكرة", primary: "financial distress early warning signs bankruptcy prediction" },
                { name: "إعادة الهيكلة المالية: الحلول قبل الإفلاس", primary: "financial restructuring turnaround strategies before bankruptcy" },
                { name: "تحليل SWOT المالي: نقاط القوة والضعف", primary: "financial SWOT analysis strengths weaknesses opportunities threats" },
                { name: "العناية الواجبة: التحقق قبل الاستثمار أو الإقراض", primary: "due diligence investment lending verification financial analysis" },
                { name: "كتابة تقرير الائتمان الاحترافي: الهيكل والمحتوى", primary: "credit report professional writing structure content recommendation" }
              ]
            },
            {
              unit_index: 5, code: "2.2.5",
              name: "تقييم الأعمال والمنشآت",
              goal: "إتقان طرق تقييم الأعمال من التدفقات النقدية المخصومة إلى المقارنة بالمماثلين",
              key_concepts: ["Business Valuation","DCF","Comparable Companies","Precedent Transactions","EV/EBITDA","Terminal Value"],
              lessons: [
                { name: "التقييم: لماذا نُقدّر قيمة الأعمال؟", primary: "business valuation purposes M&A investment lending IPO" },
                { name: "التدفقات النقدية الحرة: مدخل DCF الأهم", primary: "free cash flows FCFF FCFE DCF valuation calculation" },
                { name: "معدل الخصم: تكلفة رأس المال WACC", primary: "WACC discount rate cost equity debt capital structure" },
                { name: "القيمة النهائية: ما بعد فترة التوقع", primary: "terminal value perpetuity Gordon growth model DCF" },
                { name: "طريقة المضاعفات: مقارنة بالمماثلين", primary: "comparable company analysis trading multiples EV EBITDA PE" },
                { name: "طريقة المعاملات السابقة: حالات الاستحواذ", primary: "precedent transactions M&A multiples control premium" },
                { name: "تقييم الأصول: صافي قيمة الأصول NAV", primary: "asset-based valuation NAV break-up value liquidation" },
                { name: "حساسية التقييم: نطاق القيمة لا رقم واحد", primary: "valuation sensitivity analysis range not single number" },
                { name: "تقرير التقييم الاحترافي: المنهجية والنتائج", primary: "valuation report professional methodology findings recommendation" }
              ]
            },
            {
              unit_index: 6, code: "2.2.6",
              name: "التحليل المالي القطاعي",
              goal: "تطبيق التحليل المالي المتخصص على قطاعات مختلفة مع مراعاة خصائص كل قطاع",
              key_concepts: ["Banking Analysis","Insurance Analysis","Real Estate","Oil Gas","Retail Metrics","Telecom"],
              lessons: [
                { name: "تحليل البنوك: NIM وNPL ونسبة الكفاءة", primary: "bank analysis NIM NPL efficiency ratio specific metrics" },
                { name: "تحليل التأمين: نسبة الخسائر والمجمّعة", primary: "insurance analysis loss combined ratio investment return" },
                { name: "تحليل العقارات: NOI والتشغيل والتقييم", primary: "real estate NOI cap rate NAV REIT analysis metrics" },
                { name: "تحليل النفط والغاز: الاحتياطيات والإنتاج", primary: "oil gas analysis reserves production EV/EBITDAX metrics" },
                { name: "تحليل التجزئة: مبيعات المتر والمخزون", primary: "retail analysis same store sales per sqm inventory turns" },
                { name: "تحليل الاتصالات: ARPU والمشتركون والشبكة", primary: "telecom ARPU subscribers churn network capex analysis" },
                { name: "تحليل التقنية: ARR وCAC وLTV والنمو", primary: "tech analysis ARR CAC LTV growth SaaS metrics" },
                { name: "التحليل المقارن بين الشركات في نفس القطاع", primary: "sector peer comparison analysis benchmarking best practice" },
                { name: "تقرير قطاعي متكامل: التحليل والتوصيات", primary: "sector report integrated analysis recommendations professional" }
              ]
            },
            {
              unit_index: 7, code: "2.2.7",
              name: "نماذج التنبؤ والتوقع المالي",
              goal: "بناء نماذج مالية للتنبؤ بالأداء المستقبلي بناءً على البيانات التاريخية والافتراضات المدروسة",
              key_concepts: ["Financial Modeling","Forecasting","Assumptions","Scenarios","Sensitivity","Rolling Forecast"],
              lessons: [
                { name: "النموذج المالي: الهيكل والمبادئ والأفضل ممارسات", primary: "financial model structure principles best practices Excel" },
                { name: "توقع الإيرادات: من التاريخ للمستقبل", primary: "revenue forecasting historical growth drivers market analysis" },
                { name: "توقع التكاليف: المتغيرة والثابتة والمختلطة", primary: "cost forecasting variable fixed mixed semi-variable projection" },
                { name: "توقع الميزانية العمومية: الأصول والتمويل", primary: "balance sheet forecasting assets funding plug equity" },
                { name: "توقع التدفقات النقدية: السيولة المستقبلية", primary: "cash flow forecasting liquidity future working capital" },
                { name: "تحليل السيناريوهات: الأساس والمتفائل والمتشائم", primary: "scenario analysis base optimistic pessimistic assumptions" },
                { name: "تحليل الحساسية: أهم الافتراضات وأثرها", primary: "sensitivity analysis key assumptions impact one-way two-way" },
                { name: "التوقع المتدحرج: النموذج الحي للقرارات", primary: "rolling forecast 12 months dynamic live model management" },
                { name: "التحقق من النموذج: الصحة والمصداقية والاختبار", primary: "model validation integrity testing audit trail review" }
              ]
            },
            {
              unit_index: 8, code: "2.2.8",
              name: "تقارير الأداء للإدارة والمستثمرين",
              goal: "إعداد تقارير أداء مالي احترافية تخدم قرارات الإدارة وتوقعات المستثمرين",
              key_concepts: ["Management Reporting","Investor Reporting","Board Pack","Variance Analysis","Narrative","Visuals"],
              lessons: [
                { name: "تقرير الإدارة الشهري: الهيكل والمحتوى المثالي", primary: "monthly management report structure content essential metrics" },
                { name: "تحليل الانحرافات في تقرير الإدارة: السبب والحل", primary: "management report variance analysis cause effect action" },
                { name: "حزمة مجلس الإدارة: ما يريد المدير غير التنفيذي رؤيته", primary: "board pack non-executive director essential financial information" },
                { name: "تقرير المستثمرين: الشفافية والإيجاز والمصداقية", primary: "investor report transparency brevity credibility quarterly" },
                { name: "الرواية المالية: الأرقام مع السياق والتفسير", primary: "financial narrative numbers context interpretation story" },
                { name: "الرسوم البيانية التي تقنع: الاختيار الصحيح", primary: "compelling charts right choice bar line waterfall viz" },
                { name: "إعلان الأرباح الفصلية: الهيكل والتسلسل", primary: "quarterly earnings release structure sequence key messages" },
                { name: "عروض يوم المستثمر: الاستراتيجية والأرقام", primary: "investor day presentation strategy financial projections" },
                { name: "إدارة توقعات السوق: التواصل الدقيق والمسؤول", primary: "market expectations management guidance cautious responsible" }
              ]
            },
            {
              unit_index: 9, code: "2.2.9",
              name: "الذكاء الاصطناعي في التحليل المالي",
              goal: "توظيف أدوات الذكاء الاصطناعي والتعلم الآلي لتسريع وتعميق التحليل المالي",
              key_concepts: ["AI Financial Analysis","NLP Statements","Automated Ratios","Predictive Models","Sentiment","ML Fraud"],
              lessons: [
                { name: "معالجة التقارير السنوية بـNLP: الفهم الآلي", primary: "NLP annual reports automatic understanding sentiment" },
                { name: "استخراج البيانات المالية آلياً من PDF والويب", primary: "automatic financial data extraction PDF web scraping AI" },
                { name: "حساب النسب المالية آلياً لآلاف الشركات", primary: "automated ratio calculation thousands companies database" },
                { name: "نماذج التنبؤ بالإفلاس بالتعلم الآلي", primary: "machine learning bankruptcy prediction models features" },
                { name: "تحليل المشاعر في التقارير: هل الإدارة متفائلة؟", primary: "sentiment analysis earnings calls MD&A management tone AI" },
                { name: "كشف التلاعب المالي بخوارزميات الذكاء الاصطناعي", primary: "financial manipulation detection AI algorithms Beneish Mscore" },
                { name: "ChatGPT في التحليل المالي: الفرص والحدود", primary: "ChatGPT financial analysis opportunities limitations accuracy" },
                { name: "الشاشة الكمية: اختيار الأسهم بالخوارزميات", primary: "quantitative screening stock selection algorithms criteria" },
                { name: "مستقبل المحلل المالي مع الذكاء الاصطناعي", primary: "future financial analyst AI augmentation not replacement" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "الموازنات التخطيطية وإدارة الأداء",
          goal: "إتقان إعداد المنظومة المتكاملة للموازنات التخطيطية وربطها بالرقابة والتخطيط الاستراتيجي",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.3.1",
              name: "المنظومة المتكاملة للموازنات",
              goal: "فهم الإطار الشامل للموازنات التخطيطية وأنواعها وعلاقاتها وكيف تُشكّل معاً منظومة متكاملة",
              key_concepts: ["Master Budget","Operating Budget","Financial Budget","Budget Process","Budget Calendar","Responsibility"],
              lessons: [
                { name: "الموازنة التخطيطية: أداة التخطيط والرقابة الأولى", primary: "master budget planning control tool comprehensive overview" },
                { name: "دورة إعداد الموازنة: من الاستراتيجية للتفاصيل", primary: "budget cycle process strategic planning to details timeline" },
                { name: "الموازنة التشغيلية: الإيرادات والمصروفات", primary: "operating budget revenues expenses income statement projection" },
                { name: "الموازنة الرأسمالية: استثمارات المستقبل", primary: "capital budget long-term investments NPV IRR approval" },
                { name: "الموازنة المالية: الميزانية والتدفقات المتوقعة", primary: "financial budget balance sheet cash flow projected statements" },
                { name: "الموازنة الصفرية ZBB: لا ميراث للأرقام السابقة", primary: "zero based budgeting ZBB start from zero justify all" },
                { name: "الموازنة المرنة: التعديل مع الواقع", primary: "flexible budget activity based adjustment actual output" },
                { name: "الموازنة المتدحرجة: التخطيط الدائم", primary: "rolling budget continuous 12 months forward planning dynamic" },
                { name: "Beyond Budgeting: نهج ما بعد الموازنة التقليدية", primary: "beyond budgeting alternative adaptive management planning" }
              ]
            },
            {
              unit_index: 2, code: "2.3.2",
              name: "موازنة المبيعات وخطة الإيراد",
              goal: "إعداد موازنة المبيعات الشاملة من توقعات الطلب إلى خطة الإيرادات التفصيلية",
              key_concepts: ["Sales Budget","Revenue Planning","Sales Forecast","Territory Planning","Product Mix","Seasonality"],
              lessons: [
                { name: "موازنة المبيعات: القاعدة التي تبنى عليها الموازنات", primary: "sales budget foundation all other budgets revenue forecast" },
                { name: "أساليب التنبؤ بالمبيعات: كمية وكيفية", primary: "sales forecasting methods quantitative qualitative regression" },
                { name: "تحليل السوق والمنافسة في توقع المبيعات", primary: "market analysis competition sales forecast adjustment" },
                { name: "الموسمية وتوزيع المبيعات على الفترات", primary: "seasonality sales distribution periods monthly quarterly" },
                { name: "موازنة المبيعات بالمنتج والمنطقة والعميل", primary: "sales budget product territory customer segment breakdown" },
                { name: "تحديد الأهداف: التحدي بلا استحالة", primary: "target setting challenging achievable stretch realistic" },
                { name: "التعاون في وضع الموازنة: الأعلى والأسفل", primary: "budget setting top down bottom up participative approaches" },
                { name: "تحفيز فريق المبيعات بالموازنة: الربط بالحوافز", primary: "sales team motivation budget incentives commission tie-in" },
                { name: "مراجعة موازنة المبيعات: الفجوات والمخاطر", primary: "sales budget review gaps risks assumptions sensitivity" }
              ]
            },
            {
              unit_index: 3, code: "2.3.3",
              name: "موازنة الإنتاج والمواد والعمالة",
              goal: "إعداد موازنات جانب التكاليف من إنتاج ومواد وعمالة وأعباء عامة مرتبطة بموازنة المبيعات",
              key_concepts: ["Production Budget","Materials Budget","Labor Budget","Overhead Budget","Ending Inventory","Production Plan"],
              lessons: [
                { name: "موازنة الإنتاج: كم نُنتج لتلبية المبيعات؟", primary: "production budget sales desired ending beginning inventory" },
                { name: "موازنة المواد المباشرة: الشراء والاستخدام", primary: "direct materials budget usage purchase beginning ending" },
                { name: "موازنة العمالة المباشرة: الساعات والتكلفة", primary: "direct labor budget hours rate calculation workforce" },
                { name: "موازنة التكاليف غير المباشرة الصناعية", primary: "manufacturing overhead budget variable fixed rates" },
                { name: "موازنة المشتريات: الربط مع سلسلة التوريد", primary: "purchasing budget supply chain coordination timing payment" },
                { name: "موازنة المخزون: الأصول بين الإنتاج والبيع", primary: "inventory budget finished goods raw materials WIP levels" },
                { name: "تكلفة البضاعة المباعة المتوقعة: التسلسل الكامل", primary: "budgeted COGS complete flow materials labor overhead" },
                { name: "تكاليف التوزيع والبيع والإدارة المتوقعة", primary: "SGA budget selling general administrative expenses projected" },
                { name: "قائمة الدخل المتوقعة: توحيد موازنات التشغيل", primary: "budgeted income statement consolidated operating budgets" }
              ]
            },
            {
              unit_index: 4, code: "2.3.4",
              name: "الموازنة النقدية والتخطيط المالي",
              goal: "إعداد الموازنة النقدية الشاملة لضمان السيولة الكافية وتمويل الخطة التشغيلية",
              key_concepts: ["Cash Budget","Receipts","Disbursements","Minimum Balance","Financing","Short-Term Borrowing"],
              lessons: [
                { name: "الموازنة النقدية: ضمان البقاء بلا أزمات سيولة", primary: "cash budget liquidity planning survival no shortage crisis" },
                { name: "توقع التحصيلات النقدية: متى يأتي النقد؟", primary: "cash receipts forecast collection pattern credit sales timing" },
                { name: "توقع المدفوعات النقدية: متى يذهب النقد؟", primary: "cash disbursements forecast payment timing payroll suppliers" },
                { name: "الرصيد النقدي المتاح والاحتياجات الإضافية", primary: "available cash surplus deficit additional financing needed" },
                { name: "الحد الأدنى للرصيد النقدي: هامش الأمان", primary: "minimum cash balance safety margin policy management" },
                { name: "خيارات التمويل قصير الأجل عند عجز النقد", primary: "short-term financing options credit line overdraft treasury" },
                { name: "توظيف الفائض النقدي: الاستثمار الآمن قصير الأمد", primary: "cash surplus investment short-term safe options return" },
                { name: "الموازنة النقدية الأسبوعية: دقة أعلى وتدخل أسرع", primary: "weekly cash budget higher accuracy faster intervention" },
                { name: "ربط الموازنة النقدية بالميزانية المتوقعة", primary: "cash budget link projected balance sheet reconciliation" }
              ]
            },
            {
              unit_index: 5, code: "2.3.5",
              name: "الرقابة بالموازنة وتحليل الانحرافات",
              goal: "توظيف الموازنات كأداة رقابة بتحليل الانحرافات وتحديد المسؤوليات واتخاذ الإجراءات التصحيحية",
              key_concepts: ["Budget Control","Variance Analysis","Responsibility Accounting","Corrective Action","Management Exception"],
              lessons: [
                { name: "الرقابة بالموازنة: المقارنة بين الفعلي والمخطط", primary: "budget control actual vs planned variance monitoring" },
                { name: "الموازنة المرنة: المعيار الصحيح للمقارنة", primary: "flexible budget correct benchmark actual output level" },
                { name: "تحليل انحراف المبيعات: السعر والحجم والمزيج", primary: "sales variance analysis price volume mix decomposition" },
                { name: "تحليل انحراف الإنتاج: الكمية والكفاءة والسعر", primary: "production variance analysis quantity efficiency price" },
                { name: "مبدأ الإدارة بالاستثناء: ركّز على الأهم", primary: "management by exception focus significant variances action" },
                { name: "إعداد تقرير الموازنة الشهري: الشكل والمحتوى", primary: "budget report monthly format content presentation management" },
                { name: "مراكز المسؤولية: من المساءل عن أي انحراف؟", primary: "responsibility centers accountability variance ownership" },
                { name: "الربط بين الحوافز والأداء الموازني: التحفيز الصحيح", primary: "incentives performance budget link motivation right behavior" },
                { name: "مراجعة الموازنة وتحديثها: استجابة للمستجدات", primary: "budget review update response changes forecast revision" }
              ]
            },
            {
              unit_index: 6, code: "2.3.6",
              name: "الموازنة الرأسمالية: اتخاذ قرارات الاستثمار",
              goal: "إتقان أساليب تقييم المشاريع الاستثمارية واتخاذ القرارات الرأسمالية المبنية على القيمة",
              key_concepts: ["Capital Budgeting","NPV","IRR","Payback Period","ARR","Real Options","Capital Rationing"],
              lessons: [
                { name: "قرارات الاستثمار الرأسمالي: الأهم والأطول أثراً", primary: "capital investment decisions long-term irreversible significance" },
                { name: "صافي القيمة الحالية NPV: المعيار الذهبي للتقييم", primary: "NPV net present value gold standard investment decision" },
                { name: "معدل العائد الداخلي IRR: ما يفهمه الجميع", primary: "IRR internal rate of return calculation limitation MIRR" },
                { name: "فترة الاسترداد: السرعة على حساب القيمة", primary: "payback period simplicity limitation ignores time value" },
                { name: "معدل العائد المحاسبي ARR: الربح المحاسبي", primary: "ARR accounting rate return average simple comparison" },
                { name: "ترتيب المشاريع عند قيود رأس المال", primary: "capital rationing project ranking profitability index NPV" },
                { name: "تكلفة رأس المال WACC: معدل الخصم الصحيح", primary: "WACC cost of capital discount rate calculation components" },
                { name: "مخاطر المشروع: التحليل والتعديل والاحتياط", primary: "project risk analysis risk-adjusted discount rate scenario" },
                { name: "خيارات الاستثمار الحقيقية: المرونة الاستراتيجية", primary: "real options investment flexibility expand abandon delay" }
              ]
            },
            {
              unit_index: 7, code: "2.3.7",
              name: "التخطيط المالي الاستراتيجي",
              goal: "ربط التخطيط المالي بالاستراتيجية العامة للمنشأة وبناء خطط مالية طويلة الأمد",
              key_concepts: ["Strategic Financial Planning","3-5 Year Plan","Scenario Planning","Growth Strategy","Funding Strategy"],
              lessons: [
                { name: "التخطيط المالي الاستراتيجي: ثلاث إلى خمس سنوات", primary: "strategic financial planning 3-5 years horizon long term" },
                { name: "ربط الاستراتيجية بالخطة المالية: من الأهداف للأرقام", primary: "strategy to financial plan objectives to numbers translation" },
                { name: "تخطيط السيناريو: مستقبلات محتملة ومتباينة", primary: "scenario planning multiple futures plausible different assumptions" },
                { name: "تحليل الفجوة الاستراتيجية: بين الواقع والطموح", primary: "strategic gap analysis current state aspirations financial" },
                { name: "استراتيجية التمويل: هيكل رأس المال المثالي", primary: "funding strategy optimal capital structure debt equity mix" },
                { name: "التخطيط لنمو المبيعات: العضوي والاستحواذ", primary: "growth planning organic acquisition M&A financial strategy" },
                { name: "تخطيط الخروج: المساهمون وعوائدهم المستهدفة", primary: "exit planning shareholders returns IPO trade sale strategy" },
                { name: "الخطة المالية كأداة تواصل: المستثمرون والممولون", primary: "financial plan communication tool investors lenders banks" },
                { name: "مراجعة الخطة المالية: هل نسير كما خططنا؟", primary: "financial plan review tracking actual vs strategic plan" }
              ]
            },
            {
              unit_index: 8, code: "2.3.8",
              name: "إدارة رأس المال العامل",
              goal: "إتقان إدارة مكوّنات رأس المال العامل لتحسين السيولة وتقليل تكلفة التمويل",
              key_concepts: ["Working Capital Management","Cash Conversion Cycle","Inventory Management","Receivables Management","Payables"],
              lessons: [
                { name: "رأس المال العامل: المال الذي يُدير العمليات اليومية", primary: "working capital operations daily management financing need" },
                { name: "دورة تحويل النقد: سرعة دوران الأموال", primary: "cash conversion cycle days receivables inventory payables" },
                { name: "إدارة المخزون: كمية الطلب الاقتصادية EOQ", primary: "inventory management EOQ economic order quantity optimization" },
                { name: "نقطة إعادة الطلب: متى نشتري من جديد؟", primary: "reorder point safety stock lead time calculation" },
                { name: "Just-in-Time: المخزون الصفري كهدف مثالي", primary: "JIT just in time lean inventory minimum waste Toyota" },
                { name: "إدارة الذمم المدينة: سياسة الائتمان والتحصيل", primary: "receivables management credit policy collection acceleration" },
                { name: "التخصيم وتحويل الذمم: التمويل من الأصول", primary: "factoring invoice financing receivables monetization cash flow" },
                { name: "إدارة الذمم الدائنة: الوقت الاستراتيجي للسداد", primary: "payables management strategic timing optimize cash flow" },
                { name: "التمويل التجاري: اعتمادات الاستيراد والتصدير", primary: "trade finance letters of credit import export financing" }
              ]
            },
            {
              unit_index: 9, code: "2.3.9",
              name: "إدارة المخاطر المالية الاستراتيجية",
              goal: "تحديد المخاطر المالية الاستراتيجية وقياسها والتعامل معها ضمن إطار شامل لإدارة المخاطر",
              key_concepts: ["Enterprise Risk Management","Financial Risk","Market Risk","Credit Risk","Operational Risk","ERM Framework"],
              lessons: [
                { name: "إدارة المخاطر المؤسسية ERM: الإطار الشامل", primary: "ERM enterprise risk management COSO framework comprehensive" },
                { name: "تحديد المخاطر المالية وتصنيفها", primary: "financial risk identification classification market credit" },
                { name: "قياس المخاطر: القيمة المعرضة للخطر VaR", primary: "risk measurement VaR value at risk financial exposure" },
                { name: "مخاطر سعر الفائدة: التأثير على الالتزامات والأصول", primary: "interest rate risk duration fixed floating liabilities assets" },
                { name: "مخاطر سعر الصرف: التأثير على العمليات", primary: "foreign exchange risk translation transaction economic" },
                { name: "التحوط بالمشتقات: العقود الآجلة والخيارات", primary: "hedging derivatives forwards futures options swaps basics" },
                { name: "المخاطر التشغيلية: الأعطال والاحتيال والبشر", primary: "operational risk people processes systems events fraud" },
                { name: "مصفوفة المخاطر: الأولوية والاستجابة", primary: "risk matrix probability impact response strategy mitigation" },
                { name: "تقرير المخاطر المالية: التواصل مع الحوكمة", primary: "risk reporting governance board communication financial" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "محاسبة الشركات والضرائب المتقدمة",
          goal: "إتقان محاسبة الشركات والمجموعات والضريبة على الشركات وإعداد التقارير المالية الموحدة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.4.1",
              name: "محاسبة الشركات المساهمة",
              goal: "إتقان محاسبة الشركات المساهمة من رأس المال والأسهم إلى توزيعات الأرباح والاحتياطيات",
              key_concepts: ["Common Stock","Preferred Stock","Par Value","Treasury Stock","Dividends","Legal Reserves"],
              lessons: [
                { name: "إصدار الأسهم العادية: بالقيمة الاسمية وبعلاوة", primary: "common stock issuance par value premium additional paid in" },
                { name: "الأسهم الممتازة: الحقوق والأولوية والمحاسبة", primary: "preferred stock rights priority dividends liquidation accounting" },
                { name: "الاكتتاب في الأسهم: القبول والتخصيص والسداد", primary: "stock subscription offer allotment payment installment" },
                { name: "إعادة شراء الأسهم: الخزينة والاستهلاك", primary: "treasury stock repurchase retirement cost par value method" },
                { name: "توزيعات الأرباح النقدية: الإعلان والسداد", primary: "cash dividends declaration payment date of record" },
                { name: "توزيعات الأرباح بالأسهم: التكبير وأثره", primary: "stock dividends small large stock splits effect" },
                { name: "الاحتياطيات القانونية والنظامية والاختيارية", primary: "reserves legal statutory voluntary appropriated retained" },
                { name: "حقوق الملكية في شركة المساهمة: القائمة الكاملة", primary: "shareholders equity complete statement comprehensive" },
                { name: "القيمة الدفترية للسهم وقيمتها في القرارات", primary: "book value per share calculation significance investment" }
              ]
            },
            {
              unit_index: 2, code: "2.4.2",
              name: "القوائم المالية الموحدة والمجموعات",
              goal: "إعداد القوائم المالية الموحدة للمجموعات من خلال الدمج والحذف وتسوية الأرصدة البينية",
              key_concepts: ["Consolidated Statements","Non-Controlling Interest","Intragroup Eliminations","Goodwill","IFRS 3","Control"],
              lessons: [
                { name: "السيطرة: متى تُوحَّد القوائم؟ معيار IFRS 10", primary: "control IFRS 10 consolidation when required power returns" },
                { name: "إجراءات التوحيد: جمع والحذف والتسوية", primary: "consolidation procedure aggregate eliminate adjust reconcile" },
                { name: "حذف العمليات البينية: البيع والشراء والأرباح", primary: "intragroup eliminations sales profits unrealized inventory" },
                { name: "الشهرة: حساب وتسجيل عند الاستحواذ", primary: "goodwill calculation acquisition IFRS 3 recognition" },
                { name: "حصص غير المسيطرة NCI: القياس والعرض", primary: "non-controlling interest NCI measurement presentation equity" },
                { name: "دمج الشركة الفرعية المكتسبة في المنتصف", primary: "mid-year acquisition subsidiary partial year consolidation" },
                { name: "التوحيد متعدد المستويات: المجموعة الكبيرة", primary: "multi-level consolidation complex group structure" },
                { name: "ضبط الشهرة: اختبار الانخفاض السنوي", primary: "goodwill impairment annual test CGU IFRS 3 IAS 36" },
                { name: "القوائم المالية الموحدة: العرض الشامل", primary: "consolidated financial statements complete presentation disclosure" }
              ]
            },
            {
              unit_index: 3, code: "2.4.3",
              name: "الاستثمارات في الكيانات المنفصلة",
              goal: "إتقان محاسبة الاستثمارات في الشركات الزميلة والمشاريع المشتركة وفق IFRS 11 وIAS 28",
              key_concepts: ["Associates","Joint Ventures","Equity Method","Significant Influence","IFRS 11","IAS 28"],
              lessons: [
                { name: "الشركة الزميلة: التأثير المهم دون السيطرة", primary: "associate significant influence 20-50 percent IAS 28" },
                { name: "طريقة حقوق الملكية: تبني نصيب الربح", primary: "equity method investment share profit OCI adjustments" },
                { name: "الإعتراف الأولي بالاستثمار في الشركة الزميلة", primary: "initial recognition associate investment cost goodwill" },
                { name: "المعالجة اللاحقة: الأرباح والتوزيعات والانخفاض", primary: "subsequent measurement profits dividends impairment equity" },
                { name: "المشروع المشترك: الاتفاق التعاقدي بين طرفين", primary: "joint venture contractual arrangement IFRS 11 shared control" },
                { name: "العملية المشتركة مقابل المشروع المشترك", primary: "joint operation vs joint venture IFRS 11 classification" },
                { name: "الإجراءات البينية في المشاريع المشتركة", primary: "joint venture intragroup transactions elimination downstream" },
                { name: "أثر تغيير نسبة الملكية على التصنيف المحاسبي", primary: "ownership change effect classification accounting method change" },
                { name: "الإفصاح عن الاستثمارات الجوهرية وطبيعتها", primary: "disclosure significant investments subsidiaries associates nature" }
              ]
            },
            {
              unit_index: 4, code: "2.4.4",
              name: "الضريبة على الشركات: المتقدمة",
              goal: "إتقان محاسبة ضريبة الدخل المتقدمة وفق IAS 12 مع التركيز على الضريبة المؤجلة والضريبة الدولية",
              key_concepts: ["Deferred Tax","Temporary Differences","IAS 12","Tax Provision","Uncertain Tax Positions","Pillar Two"],
              lessons: [
                { name: "مراجعة IAS 12: الأساس والهدف والنطاق", primary: "IAS 12 income taxes overview objective scope review" },
                { name: "الفروق المؤقتة: ماذا تُولّد أصول أم التزامات مؤجلة", primary: "temporary differences taxable deductible DTA DTL generation" },
                { name: "الفروق الدائمة: المعالجة وعدم الاعتراف بالأجيل", primary: "permanent differences no deferred tax treatment IAS 12" },
                { name: "معدل الضريبة المطبّق: الحالي أم المتوقع؟", primary: "applicable tax rate current enacted future rate IAS 12" },
                { name: "اختبار تعافي الأصل الضريبي المؤجل: الاحتمالية", primary: "DTA recoverability test probable future taxable income" },
                { name: "الضريبة على المعاملات المعقدة: إيجار وأدوات مالية", primary: "complex transactions tax treatment leases IFRS 9 IFRS 16" },
                { name: "ضريبة الحد الأدنى العالمية Pillar Two: 15%", primary: "Pillar Two global minimum tax 15% BEPS OECD compliance" },
                { name: "التحوط الضريبي والتخطيط المشروع وغير المشروع", primary: "tax planning legitimate aggressive evasion compliance" },
                { name: "الإفصاح عن ضريبة الدخل: ما يريده المستثمر", primary: "income tax disclosure reconciliation deferred note IFRS" }
              ]
            },
            {
              unit_index: 5, code: "2.4.5",
              name: "ضريبة القيمة المضافة المتقدمة",
              goal: "إتقان محاسبة ضريبة القيمة المضافة في الحالات المعقدة من توريدات مختلطة إلى التصدير والجمارك",
              key_concepts: ["VAT Advanced","Mixed Supplies","Input Tax Recovery","Export Zero-Rating","Customs","VAT Groups"],
              lessons: [
                { name: "VAT للمجموعات: الوحدة الضريبية والتخطيط", primary: "VAT group registration intragroup supplies simplification" },
                { name: "التوريدات المختلطة: الخاضعة والمعفاة وأثرها", primary: "mixed supplies partial exemption input VAT recovery" },
                { name: "حساب نسبة استرداد ضريبة المدخلات", primary: "input VAT partial recovery ratio calculation methods" },
                { name: "التوريدات الصفرية: التصدير والسلع المعفاة", primary: "zero-rated supplies exports exemptions VAT treatment" },
                { name: "ضريبة الاستيراد: الجمارك والقيمة الجمركية", primary: "import VAT customs duty valuation deferred accounting" },
                { name: "الفاتورة الضريبية المعيارية والمبسطة: المتطلبات", primary: "tax invoice standard simplified requirements compliance" },
                { name: "الإقرار الضريبي لـVAT: التحضير والتقديم", primary: "VAT return preparation filing submission payment" },
                { name: "التقصير الضريبي والغرامات وكيفية تجنبها", primary: "VAT non-compliance penalties avoidance tax authority" },
                { name: "التحوط الضريبي لـVAT: استراتيجيات مشروعة", primary: "VAT planning legitimate strategies optimization compliance" }
              ]
            },
            {
              unit_index: 6, code: "2.4.6",
              name: "اندماج الشركات والاستحواذ: المعالجة المحاسبية",
              goal: "إتقان المعالجة المحاسبية لعمليات الاندماج والاستحواذ وفق IFRS 3 من التقييم للتوحيد",
              key_concepts: ["IFRS 3","Business Combination","Purchase Method","Fair Value","Goodwill","NCI"],
              lessons: [
                { name: "الاستحواذ كتركيبة أعمال: تعريف IFRS 3 وشروطه", primary: "business combination definition IFRS 3 acquirer acquiree" },
                { name: "تحديد المُستحوِذ: من يسيطر في الاندماج؟", primary: "identifying acquirer reverse acquisition substance over form" },
                { name: "تاريخ الاستحواذ: الأهمية والتحديات القانونية", primary: "acquisition date determination legal economic significance" },
                { name: "القيمة العادلة للأصول والخصوم المكتسبة", primary: "fair value acquired assets liabilities measurement IFRS 3" },
                { name: "مقابل الاستحواذ: النقد والأسهم والمحتمل", primary: "consideration cash shares contingent deferred payment" },
                { name: "الشهرة المحاسبية وشهرة الحصص غير المسيطرة", primary: "goodwill full partial NCI method choice IFRS 3" },
                { name: "الشراء بسعر مميز: الشهرة السالبة والمعالجة", primary: "bargain purchase negative goodwill gain recognition IFRS 3" },
                { name: "تكاليف الاستحواذ: لا رسملة وفق IFRS 3", primary: "acquisition costs expensed income statement IFRS 3 change" },
                { name: "محاسبة ما بعد الاستحواذ: التوحيد والأداء", primary: "post-acquisition accounting integration performance monitoring" }
              ]
            },
            {
              unit_index: 7, code: "2.4.7",
              name: "الأدوات المالية وفق IFRS 9",
              goal: "إتقان تصنيف وقياس الأدوات المالية والخسائر الائتمانية المتوقعة وحسابات التحوط وفق IFRS 9",
              key_concepts: ["IFRS 9","Classification","Measurement","ECL","Hedging","Amortized Cost","FVTPL","FVTOCI"],
              lessons: [
                { name: "IFRS 9: البنية الثلاثية للتصنيف والقياس", primary: "IFRS 9 three pillars classification measurement ECL hedging" },
                { name: "تصنيف الأصول المالية: الأعمال والخصائص", primary: "financial assets classification business model SPPI test" },
                { name: "القياس بالتكلفة المطفأة: الأدوات الدينية", primary: "amortized cost effective interest method debt instruments" },
                { name: "القيمة العادلة عبر الدخل الشامل FVTOCI", primary: "FVTOCI fair value OCI debt equity instruments election" },
                { name: "القيمة العادلة عبر الأرباح والخسائر FVTPL", primary: "FVTPL fair value profit loss default catch-all classification" },
                { name: "نموذج الخسارة الائتمانية المتوقعة ECL: المراحل الثلاث", primary: "ECL expected credit loss three stages 12-month lifetime" },
                { name: "محاسبة التحوط: أنواعه ومعايير التأهل", primary: "hedge accounting fair value cash flow net investment types" },
                { name: "الإلغاء من الاعتراف: متى يخرج الأصل من الميزانية", primary: "derecognition financial assets transfer risks rewards" },
                { name: "إفصاحات IFRS 9: ما يريد المستثمر معرفته", primary: "IFRS 9 disclosures risk exposure ECL movement credit quality" }
              ]
            },
            {
              unit_index: 8, code: "2.4.8",
              name: "التسعير التحويلي في المجموعات",
              goal: "فهم التسعير التحويلي وأهميته الضريبية والمحاسبية في المجموعات متعددة الجنسيات",
              key_concepts: ["Transfer Pricing","Arm's Length","OECD Guidelines","TP Methods","Documentation","BEPS"],
              lessons: [
                { name: "التسعير التحويلي: لماذا يهم السلطات الضريبية؟", primary: "transfer pricing importance tax authorities income shifting" },
                { name: "مبدأ مسافة الذراع: معيار السوق الحر", primary: "arm's length principle independent parties comparable market" },
                { name: "طرق التسعير التحويلي: CUP وRPM وCPM", primary: "transfer pricing methods CUP resale price cost plus" },
                { name: "طريقة تقسيم الأرباح ومعادلة المعاملة الصافية", primary: "profit split TNMM transfer pricing complex transactions" },
                { name: "توثيق التسعير التحويلي: OECD ثلاثة مستويات", primary: "TP documentation OECD master file local country by country" },
                { name: "اتفاقيات التسعير المسبقة APAs: اليقين الضريبي", primary: "advance pricing agreements APAs certainty bilateral multilateral" },
                { name: "BEPS: مكافحة تآكل القاعدة الضريبية", primary: "BEPS base erosion profit shifting OECD actions pillars" },
                { name: "المخاطر الضريبية للتسعير التحويلي وإدارتها", primary: "transfer pricing risks management audit adjustment penalties" },
                { name: "التسعير التحويلي في الشركات اليمنية والخليجية", primary: "transfer pricing Yemen GCC companies local guidance" }
              ]
            },
            {
              unit_index: 9, code: "2.4.9",
              name: "إعداد حزمة القوائم المالية IFRS الكاملة",
              goal: "تطبيق شامل على إعداد حزمة القوائم المالية الكاملة وفق IFRS لمجموعة من الشركات",
              key_concepts: ["Complete IFRS Package","Group Statements","Notes","Disclosure Checklist","Filing"],
              lessons: [
                { name: "قائمة التدقيق لإفصاحات IFRS: ما يجب الإفصاح عنه", primary: "IFRS disclosure checklist completeness requirements review" },
                { name: "إعداد قائمة الدخل الشامل للمجموعة", primary: "group comprehensive income statement consolidated preparation" },
                { name: "إعداد الميزانية العمومية الموحدة للمجموعة", primary: "consolidated balance sheet preparation group intragroup" },
                { name: "إعداد قائمة التدفقات النقدية الموحدة", primary: "consolidated cash flow statement indirect group method" },
                { name: "إعداد قائمة حقوق الملكية الموحدة", primary: "consolidated equity statement NCI retained earnings changes" },
                { name: "الإيضاحات الجوهرية: من الشهرة للأدوات المالية", primary: "significant notes goodwill financial instruments tax equity" },
                { name: "مراجعة الاتساق بين القوائم والإيضاحات", primary: "consistency review financial statements notes cross-reference" },
                { name: "توقيع المدير المالي والمدقق: المسؤولية القانونية", primary: "CFO auditor signing legal responsibility financial package" },
                { name: "تقديم القوائم للجهات الرقابية: الإجراءات والمواعيد", primary: "filing financial statements regulators deadlines procedures" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "الرقابة الداخلية والتدقيق الأساسي",
          goal: "بناء فهم متكامل لأنظمة الرقابة الداخلية ومبادئ التدقيق وكيفية التحقق من سلامة المعلومات المالية",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.5.1",
              name: "إطار الرقابة الداخلية COSO",
              goal: "إتقان مكوّنات إطار COSO للرقابة الداخلية وكيفية تصميمه وتشغيله وتقييمه",
              key_concepts: ["COSO Framework","Control Environment","Risk Assessment","Control Activities","Information","Monitoring"],
              lessons: [
                { name: "الرقابة الداخلية: التعريف والأهداف الثلاثة", primary: "internal control definition operational reporting compliance objectives" },
                { name: "إطار COSO: الخمسة مكوّنات وتفاعلها", primary: "COSO five components interaction integrated framework" },
                { name: "بيئة الرقابة: الأسماك تتعفن من رأسها", primary: "control environment tone at top culture ethics governance" },
                { name: "تقييم المخاطر: ما قد يمنع تحقيق الأهداف", primary: "risk assessment inherent residual fraud risk identification" },
                { name: "أنشطة الرقابة: الضوابط التي تُدير المخاطر", primary: "control activities preventive detective corrective authorization" },
                { name: "المعلومات والتواصل: تدفق البيانات الصحيحة", primary: "information communication internal external relevant timely" },
                { name: "المراقبة: هل الرقابة تعمل كما صُممت؟", primary: "monitoring ongoing evaluations COSO assessment deficiencies" },
                { name: "إطار COSO لإدارة مخاطر المؤسسة: ERM", primary: "COSO ERM 2017 enterprise risk management strategy" },
                { name: "فجوات الرقابة الداخلية: التعرف والعلاج", primary: "control deficiencies significant material weakness remediation" }
              ]
            },
            {
              unit_index: 2, code: "2.5.2",
              name: "التدقيق الداخلي ووظيفته",
              goal: "فهم وظيفة التدقيق الداخلي وكيف تُضيف قيمة للمنشأة من خلال الضمان والاستشارة",
              key_concepts: ["Internal Audit","IIA Standards","Risk-Based Audit","Audit Plan","CAE","Independence"],
              lessons: [
                { name: "التدقيق الداخلي: أكثر من مجرد كشف الأخطاء", primary: "internal audit beyond errors assurance consulting value add" },
                { name: "معايير الممارسة المهنية IIA: الإطار الحاكم", primary: "IIA standards IPPF attributes performance advisory" },
                { name: "استقلالية المدقق الداخلي: شرط لا تنازل عنه", primary: "independence objectivity chief audit executive board reporting" },
                { name: "التخطيط القائم على المخاطر: ركّز حيث الخطر", primary: "risk-based audit planning universe annual plan prioritize" },
                { name: "برنامج التدقيق: خارطة العمل للمهمة", primary: "audit program work steps procedures evidence objectives" },
                { name: "جمع الأدلة: الأساليب والمصادر والكفاية", primary: "evidence gathering methods sources sufficiency reliability" },
                { name: "تقرير التدقيق الداخلي: الإيجاز والوضوح والأثر", primary: "internal audit report concise clear actionable findings" },
                { name: "متابعة توصيات التدقيق: هل نُفِّذ ما اتُّفق عليه؟", primary: "audit recommendations follow-up tracking implementation" },
                { name: "التدقيق الداخلي كشريك استراتيجي للإدارة", primary: "internal audit strategic partner management consulting advisory" }
              ]
            },
            {
              unit_index: 3, code: "2.5.3",
              name: "أساليب التدقيق الخارجي",
              goal: "فهم منهجية التدقيق الخارجي من تخطيط المهمة إلى إصدار رأي المدقق",
              key_concepts: ["External Audit","ISA","Audit Risk","Materiality","Audit Evidence","Audit Opinion"],
              lessons: [
                { name: "التدقيق الخارجي: الشاهد المستقل على القوائم", primary: "external audit independent assurance financial statements ISA" },
                { name: "معايير التدقيق الدولية ISA: الإطار المهني", primary: "ISA international standards auditing framework overview" },
                { name: "خطر التدقيق: الفطنة المهنية وعدم اليقين", primary: "audit risk model inherent control detection professional skepticism" },
                { name: "الأهمية النسبية في التدقيق: الحد وما دونه", primary: "materiality threshold planning performance clearing disclosure" },
                { name: "تقييم المخاطر في التدقيق: تحديد الحقول الجوهرية", primary: "risk assessment significant risks audit ISA 315" },
                { name: "استجابة المدقق للمخاطر المحددة: الإجراءات", primary: "auditor response identified risks ISA 330 substantive" },
                { name: "اختبارات الضوابط: هل تعمل الرقابة الداخلية؟", primary: "tests of controls reliance internal control effectiveness" },
                { name: "الإجراءات الجوهرية: التحقق من الأرقام مباشرة", primary: "substantive procedures analytical tests of details evidence" },
                { name: "رأي المدقق: غير المتحفظ والمتحفظ والسلبي", primary: "auditor opinion unqualified qualified adverse disclaimer ISA 700" }
              ]
            },
            {
              unit_index: 4, code: "2.5.4",
              name: "كشف الغش وتحليل التلاعب",
              goal: "إتقان أساليب كشف الغش المالي والتلاعب في الحسابات وتنفيذ التحقيقات الجنائية",
              key_concepts: ["Fraud Detection","Triangle of Fraud","Forensic Accounting","Benford's Law","Whistleblowing"],
              lessons: [
                { name: "مثلث الغش: الفرصة والضغط والتبرير", primary: "fraud triangle pressure opportunity rationalization Cressey" },
                { name: "أنواع الغش المالي في المنشآت: التصنيف الشامل", primary: "fraud types asset misappropriation corruption financial reporting" },
                { name: "قانون بنفورد: اكتشاف الغش بالأرقام الأولى", primary: "Benford's law leading digit detection accounting data" },
                { name: "التحليل الجنائي للحسابات: Forensic Accounting", primary: "forensic accounting investigations litigation support evidence" },
                { name: "التحقيق في المخالفات المالية: الخطوات والأدوات", primary: "financial investigation steps tools interviews documentation" },
                { name: "الإبلاغ عن المخالفات: Whistleblowing وحماية المبلّغ", primary: "whistleblowing protection hotline anonymous reporting" },
                { name: "الأحمر الرقمي: الغش في المحاسبة الإلكترونية", primary: "digital fraud electronic accounting systems cybercrime" },
                { name: "بناء ثقافة مكافحة الغش في المنشأة", primary: "anti-fraud culture preventive measures organization program" },
                { name: "التعاون مع الجهات القانونية في قضايا الغش", primary: "legal authorities cooperation fraud cases reporting evidence" }
              ]
            },
            {
              unit_index: 5, code: "2.5.5",
              name: "الفصل بين المهام وضوابط المعاملات",
              goal: "تصميم ضوابط الفصل بين المهام والتحقق من فعاليتها في منع الغش واكتشافه",
              key_concepts: ["Segregation of Duties","Authorization","Custody","Recording","Reconciliation","IT Controls"],
              lessons: [
                { name: "الفصل بين المهام: ثلاث وظائف لا تجتمع", primary: "segregation duties authorization custody recording three functions" },
                { name: "ضوابط التفويض والاعتماد: من يوافق على ماذا؟", primary: "authorization controls delegation levels approval hierarchy" },
                { name: "ضوابط حيازة الأصول: الحراسة المادية والرقمية", primary: "custody controls physical digital assets safeguarding" },
                { name: "ضوابط التسجيل: من يُسجّل العمليات ويراجعها؟", primary: "recording controls who inputs reviews accounting transactions" },
                { name: "ضوابط المطابقة والتسوية: المراجعة الدورية", primary: "reconciliation controls periodic review bank statements payroll" },
                { name: "الضوابط التعويضية: حين لا يمكن الفصل الكامل", primary: "compensating controls small teams limited resources alternatives" },
                { name: "ضوابط الأنظمة والرقابة التقنية في البيئة الرقمية", primary: "IT general application controls access segregation system" },
                { name: "اختبار فعالية ضوابط الفصل بين المهام", primary: "testing effectiveness SOD controls walkthrough testing" },
                { name: "الإطار المتكامل للضوابط الداخلية للمعاملات", primary: "integrated transaction controls framework comprehensive assessment" }
              ]
            },
            {
              unit_index: 6, code: "2.5.6",
              name: "الامتثال والتنظيم وإدارة المخاطر",
              goal: "بناء برنامج امتثال متكامل يضمن اتباع المتطلبات التنظيمية وإدارة مخاطر عدم الامتثال",
              key_concepts: ["Compliance Program","Regulatory Requirements","SOX","AML","KYC","Compliance Monitoring"],
              lessons: [
                { name: "برنامج الامتثال: الإطار والغرض والمسؤولية", primary: "compliance program framework purpose chief compliance officer" },
                { name: "قانون Sarbanes-Oxley: أثره على المحاسبة عالمياً", primary: "Sarbanes-Oxley SOX sections 302 404 impact accounting audit" },
                { name: "مكافحة غسل الأموال AML وتمويل الإرهاب", primary: "AML anti-money laundering CFT compliance banking transactions" },
                { name: "اعرف عميلك KYC: التحقق من الهوية والمخاطر", primary: "KYC know your customer due diligence risk classification" },
                { name: "الامتثال الضريبي: تجنب الغرامات والنزاعات", primary: "tax compliance filing accuracy penalties risk management" },
                { name: "الامتثال للخصوصية: GDPR والبيانات المالية", primary: "data privacy GDPR financial data personal information" },
                { name: "مراقبة الامتثال: الرصد الدائم والإشارات المبكرة", primary: "compliance monitoring continuous early warning indicators" },
                { name: "التحقيق في مخالفات الامتثال: منهجية ومسار", primary: "compliance violations investigation methodology reporting" },
                { name: "ثقافة الامتثال: من القواعد للقيم السلوكية", primary: "compliance culture rules to values behavior change sustainable" }
              ]
            },
            {
              unit_index: 7, code: "2.5.7",
              name: "حوكمة الشركات وأثرها على المحاسبة",
              goal: "فهم إطار حوكمة الشركات وتأثيره على الرقابة الداخلية وجودة التقارير المالية",
              key_concepts: ["Corporate Governance","Board Roles","Audit Committee","Remuneration","Transparency","Accountability"],
              lessons: [
                { name: "حوكمة الشركات: مبادئ OECD والإطار العام", primary: "corporate governance OECD principles framework overview" },
                { name: "مجلس الإدارة: التركيب والأدوار والمسؤوليات", primary: "board composition roles responsibilities executive non-executive" },
                { name: "لجنة التدقيق: الحارس الأول للتقارير المالية", primary: "audit committee financial reporting oversight role" },
                { name: "لجنة المكافآت: ربط الأجر بالأداء الفعلي", primary: "remuneration committee pay performance alignment governance" },
                { name: "المدير غير التنفيذي المستقل: قيمة الاستقلال", primary: "independent non-executive director governance independence value" },
                { name: "الشفافية والإفصاح: الجزء المرئي من الحوكمة", primary: "transparency disclosure governance visible accountability" },
                { name: "حوكمة المنشآت المدرجة: المتطلبات التنظيمية الخاصة", primary: "listed company governance exchange requirements disclosure" },
                { name: "تقرير الحوكمة في التقرير السنوي: ما يجب إفصاحه", primary: "governance report annual report disclosure requirements" },
                { name: "الحوكمة في اليمن والخليج: الواقع والتطلعات", primary: "governance Yemen GCC reality aspirations development" }
              ]
            },
            {
              unit_index: 8, code: "2.5.8",
              name: "تدقيق أنظمة المعلومات والتحول الرقمي",
              goal: "تدقيق الأنظمة المعلوماتية وضمان سلامة البيانات المالية في البيئات الرقمية المتطورة",
              key_concepts: ["IT Audit","Data Integrity","System Controls","Cloud Audit","Access Review","Log Analysis"],
              lessons: [
                { name: "تدقيق أنظمة المعلومات: أهميته في العصر الرقمي", primary: "IT audit importance digital era financial data integrity" },
                { name: "ضوابط التطبيق مقابل الضوابط العامة: الفرق", primary: "application vs general IT controls distinction scope" },
                { name: "مراجعة صلاحيات الوصول: من يستطيع فعل ماذا؟", primary: "access review user rights ERP SAP Oracle critical" },
                { name: "تحليل سجلات النظام: تتبع كل تغيير", primary: "log analysis system changes tracking audit trail review" },
                { name: "تدقيق البيئة السحابية: تحديات وأدوات جديدة", primary: "cloud audit challenges tools AWS Azure shared responsibility" },
                { name: "أدوات تدقيق أنظمة المعلومات: CAATS", primary: "CAATS computer assisted audit tools techniques ACL IDEA" },
                { name: "تدقيق نظام ERP: الإعداد والامتيازات والتغييرات", primary: "ERP audit configuration privileges change management SOX" },
                { name: "استمرارية الأعمال: التدقيق على الخطة", primary: "business continuity plan audit DR testing recovery" },
                { name: "تقرير تدقيق الأنظمة: المواضع الحرجة والتوصيات", primary: "IT audit report critical findings recommendations remediation" }
              ]
            },
            {
              unit_index: 9, code: "2.5.9",
              name: "الجودة في التدقيق وإدارة مهام المراجعة",
              goal: "إتقان جودة خدمات التدقيق وإدارة فرق المراجعة والتواصل الفعّال مع العملاء والمعنيين",
              key_concepts: ["Audit Quality","Quality Control","ISQC 1","Engagement Partner","Review Process","Client Communication"],
              lessons: [
                { name: "جودة التدقيق: المعنى الحقيقي وراء الأرقام", primary: "audit quality meaning beyond numbers public confidence" },
                { name: "معيار ISQC 1: ضوابط الجودة في مكاتب التدقيق", primary: "ISQC 1 quality control firm level policies procedures" },
                { name: "دور شريك المهمة: القيادة والمسؤولية والمراجعة", primary: "engagement partner role leadership responsibility review" },
                { name: "مراجعة جودة المهمة: الفحص المستقل الداخلي", primary: "engagement quality review EQCR independent partner review" },
                { name: "توثيق ملف التدقيق: متطلبات الاكتمال والوضوح", primary: "audit file documentation completeness clarity ISA 230" },
                { name: "التواصل مع الإدارة ولجنة التدقيق: المتطلبات", primary: "communication management audit committee ISA 260 265" },
                { name: "خطابات التعيين وإنهاء العلاقة مع العميل", primary: "engagement letter appointment termination client management" },
                { name: "اللجان المهنية والرقابة على جودة التدقيق", primary: "professional oversight PCAOB FRC inspection quality review" },
                { name: "تطوير مهارات التدقيق: المسيرة المهنية في المراجعة", primary: "auditing career development skills progression Big Four" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "معايير IFRS المتقدمة",
          goal: "إتقان المعايير الدولية للتقارير المالية المتقدمة وتطبيقها على المواقف المحاسبية المعقدة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.6.1",
              name: "الإيرادات وفق IFRS 15: الخمس خطوات",
              goal: "إتقان نموذج الاعتراف بالإيراد من خمس خطوات وفق IFRS 15 وتطبيقه على العقود المعقدة",
              key_concepts: ["IFRS 15","Contract Identification","Performance Obligations","Transaction Price","Recognition","Timing"],
              lessons: [
                { name: "IFRS 15: ثورة الاعتراف بالإيراد عالمياً", primary: "IFRS 15 revenue recognition revolution five step model" },
                { name: "الخطوة 1: تحديد العقد مع العميل وشروطه", primary: "IFRS 15 step 1 identify contract enforceable rights" },
                { name: "الخطوة 2: تحديد التزامات الأداء المنفصلة", primary: "IFRS 15 step 2 performance obligations distinct separate" },
                { name: "الخطوة 3: تحديد سعر المعاملة والتعقيدات", primary: "IFRS 15 step 3 transaction price variable consideration" },
                { name: "الخطوة 4: توزيع السعر على الالتزامات", primary: "IFRS 15 step 4 allocate transaction price standalone prices" },
                { name: "الخطوة 5: الاعتراف عند إيفاء الالتزام", primary: "IFRS 15 step 5 satisfy obligation over time at point" },
                { name: "مسائل IFRS 15 الصعبة: العقود بتعديلات وضمانات", primary: "IFRS 15 difficult issues modifications warranties principal agent" },
                { name: "الاعتراف بإيرادات عبر الزمن: الرياضيات والمنطق", primary: "revenue over time output input methods progress measurement" },
                { name: "إفصاحات IFRS 15: الشفافية الشاملة للإيرادات", primary: "IFRS 15 disclosures disaggregation contract assets liabilities" }
              ]
            },
            {
              unit_index: 2, code: "2.6.2",
              name: "مزايا الموظفين وفق IAS 19",
              goal: "إتقان محاسبة جميع أنواع مزايا الموظفين من رواتب ومكافآت ومعاشات وفق IAS 19",
              key_concepts: ["IAS 19","Short-Term Benefits","Post-Employment","Defined Benefit","Defined Contribution","Actuarial"],
              lessons: [
                { name: "IAS 19: تصنيف مزايا الموظفين الشامل", primary: "IAS 19 employee benefits classification short long post" },
                { name: "المزايا قصيرة الأجل: الرواتب والإجازات والمكافآت", primary: "short-term benefits salaries leave bonuses straightforward" },
                { name: "خطط المساهمات المحددة: الاعتراف والإفصاح", primary: "defined contribution plans employer fixed amount simple" },
                { name: "خطط المنافع المحددة: التعقيد الاكتواري", primary: "defined benefit plans actuarial valuation projected obligation" },
                { name: "تكلفة خدمات الفترة الحالية والماضية: المفهومان", primary: "current past service cost IAS 19 vested unvested" },
                { name: "الخسائر والمكاسب الاكتوارية: OCI أم الدخل؟", primary: "actuarial gains losses OCI remeasurement corridor IAS 19" },
                { name: "الفائدة الصافية على الالتزام والأصل: التكلفة المالية", primary: "net interest expense income defined benefit liability asset" },
                { name: "مكافأة نهاية الخدمة: الاحتساب والمخصص بدقة", primary: "end of service benefit provision actuarial calculation" },
                { name: "إفصاحات IAS 19: جدول حركة الالتزام والأصل", primary: "IAS 19 disclosures movement table actuarial assumptions" }
              ]
            },
            {
              unit_index: 3, code: "2.6.3",
              name: "انخفاض قيمة الأصول وفق IAS 36",
              goal: "إتقان اختبار الانخفاض في قيمة الأصول وتحديد القيمة القابلة للاسترداد وتسجيل خسارة الانخفاض",
              key_concepts: ["IAS 36","Impairment","Recoverable Amount","Value in Use","Fair Value Less Costs","CGU"],
              lessons: [
                { name: "IAS 36: متى نشك في قيمة الأصل؟ مؤشرات الانخفاض", primary: "IAS 36 impairment indicators internal external triggers" },
                { name: "وحدة توليد النقد CGU: تعريفها وتحديدها", primary: "cash generating unit CGU identification lowest independent level" },
                { name: "القيمة في الاستخدام: DCF داخل المنشأة", primary: "value in use DCF internal projections discount rate assumptions" },
                { name: "القيمة العادلة مطروحاً منها تكاليف البيع", primary: "fair value less costs to sell FVLCTS market evidence" },
                { name: "القيمة القابلة للاسترداد: الأعلى بين الخيارين", primary: "recoverable amount higher value in use FVLCTS comparison" },
                { name: "تسجيل خسارة الانخفاض: الأصل والشهرة", primary: "impairment loss recognition individual asset goodwill CGU" },
                { name: "توزيع خسارة الانخفاض على CGU وأصولها", primary: "impairment allocation CGU goodwill first then other assets" },
                { name: "عكس خسارة الانخفاض: الشروط والمبلغ الأقصى", primary: "reversal impairment conditions ceiling recoverable amount" },
                { name: "إفصاحات IAS 36: ما يجب الإفصاح عنه", primary: "IAS 36 disclosures assumptions CGU carrying recoverable" }
              ]
            },
            {
              unit_index: 4, code: "2.6.4",
              name: "الأصول الثابتة وفق IAS 16 وIAS 38",
              goal: "إتقان محاسبة الأصول الملموسة وغير الملموسة وفق المعايير الدولية المحدثة بما فيها نموذج إعادة التقييم",
              key_concepts: ["IAS 16","IAS 38","Revaluation Model","Cost Model","Intangibles","Useful Life","Residual Value"],
              lessons: [
                { name: "IAS 16: نموذج التكلفة ونموذج إعادة التقييم", primary: "IAS 16 cost revaluation model choice accounting policy" },
                { name: "نموذج إعادة التقييم: الفائض وعكسه", primary: "revaluation model surplus OCI reversal P&L sequence" },
                { name: "مكونات الأصل والإطفاء المكوّني: Component method", primary: "component depreciation significant separate parts IAS 16" },
                { name: "مراجعة الاستهلاك وقيمة المتبقية دورياً", primary: "residual value useful life review annual IAS 16 estimate" },
                { name: "نفقات الصيانة والإحلال: رسملة أم مصاريف؟", primary: "subsequent costs maintenance replacement capitalize expense IAS 16" },
                { name: "IAS 38: شروط الاعتراف بالأصل غير الملموس", primary: "IAS 38 recognition criteria identifiable control future benefits" },
                { name: "البحث مقابل التطوير: الاعتراف الحذر", primary: "research development costs IAS 38 expense capitalize criteria" },
                { name: "الأصول غير الملموسة ذات العمر المحدد وغير المحدد", primary: "indefinite finite useful life intangibles amortization test" },
                { name: "العلامات التجارية والبراءات: القياس والإطفاء", primary: "brand trademark patent accounting measurement amortization" }
              ]
            },
            {
              unit_index: 5, code: "2.6.5",
              name: "المخزون وفق IAS 2 والمواقف المعقدة",
              goal: "إتقان محاسبة المخزون في المواقف المعقدة من التصنيع متعدد المنتجات إلى المنتجات المشتركة",
              key_concepts: ["IAS 2","Net Realizable Value","Joint Products","By-Products","Agricultural Inventory","Write-Down"],
              lessons: [
                { name: "IAS 2: التكلفة التي يُحتسب بها المخزون", primary: "IAS 2 inventory cost what to include purchase conversion" },
                { name: "تكلفة تحويل المخزون: العمالة والأعباء الصناعية", primary: "conversion costs labor overhead allocation inventory IAS 2" },
                { name: "قاعدة الأدنى: التكلفة أم صافي قيمة التحقق", primary: "lower of cost NRV IAS 2 impairment write-down" },
                { name: "المنتجات المشتركة: كيف نُوزّع التكلفة المشتركة", primary: "joint products common cost allocation methods NRV physical" },
                { name: "المنتجات الثانوية: ما يُعامَل كبيع لا إنتاج", primary: "by-products treatment credit cost of production accounting" },
                { name: "مخزون الإنتاج الزراعي: IAS 41 كمدخل", primary: "agricultural inventory IAS 41 biological assets fair value" },
                { name: "شطب المخزون الراكد والتالف: التوقيت والمبلغ", primary: "obsolete inventory write-down timing amount reversal criteria" },
                { name: "المخزون المرهون والمحجوز: الإفصاح الخاص", primary: "pledged inventory collateral disclosure IAS 2 note" },
                { name: "مراجعة الجرد المادي: التوفيق بين العد والسجلات", primary: "physical count reconciliation stock-take procedures audit" }
              ]
            },
            {
              unit_index: 6, code: "2.6.6",
              name: "أحداث ما بعد تاريخ الميزانية وفق IAS 10",
              goal: "التمييز بين الأحداث المعدّلة وغير المعدّلة وفق IAS 10 واتخاذ القرار المحاسبي الصحيح",
              key_concepts: ["IAS 10","Adjusting Events","Non-Adjusting Events","Going Concern After Balance","Dividends","Disclosure"],
              lessons: [
                { name: "IAS 10: الأحداث اللاحقة لتاريخ الميزانية", primary: "IAS 10 events after reporting period scope definition" },
                { name: "الأحداث المعدّلة: تدل على الحال قبل تاريخ الميزانية", primary: "adjusting events evidence before balance sheet adjustment" },
                { name: "الأحداث غير المعدّلة: ظهرت بعد تاريخ الميزانية", primary: "non-adjusting events arise after balance sheet disclosure only" },
                { name: "أمثلة على الأحداث المعدّلة: إفلاس العميل وأحكام", primary: "adjusting examples customer bankruptcy settlement court judgment" },
                { name: "أمثلة على غير المعدّلة: الكوارث والاستحواذات", primary: "non-adjusting natural disaster major acquisition announcement" },
                { name: "توزيعات الأرباح بعد تاريخ الميزانية: لا التزام", primary: "dividends declared after balance sheet no liability IAS 10" },
                { name: "الاستمرارية بعد تاريخ الميزانية: الأثر الجذري", primary: "going concern after balance date massive impact restatement" },
                { name: "تحديد الفترة: من تاريخ الميزانية حتى الإصدار", primary: "period covered balance sheet date authorization date" },
                { name: "التطبيق العملي: تقييم 20 حدثاً في منشأة", primary: "practical application 20 events assessment adjusting or not" }
              ]
            },
            {
              unit_index: 7, code: "2.6.7",
              name: "تغيير السياسات والتقديرات والأخطاء: IAS 8",
              goal: "إتقان معالجة التغيير في السياسات المحاسبية والتقديرات وتصحيح الأخطاء وفق IAS 8",
              key_concepts: ["IAS 8","Accounting Policies","Estimates","Prior Period Errors","Retrospective","Prospective"],
              lessons: [
                { name: "IAS 8: الثالوث المحاسبي: سياسات وتقديرات وأخطاء", primary: "IAS 8 three elements policies estimates errors definitions" },
                { name: "اختيار السياسات المحاسبية: متى وكيف؟", primary: "accounting policies selection hierarchy IFRS IAS judgement" },
                { name: "تغيير السياسة المحاسبية: اختياري أم إلزامي؟", primary: "accounting policy change voluntary mandatory new standard" },
                { name: "المعالجة بأثر رجعي: إعادة بيان الأرقام السابقة", primary: "retrospective application restatement comparative periods" },
                { name: "التغيير في التقديرات المحاسبية: الأثر المستقبلي", primary: "change estimates prospective future effect no restatement" },
                { name: "أمثلة تغيير التقديرات: الإهلاك والديون المشكوكة", primary: "estimate changes depreciation useful life bad debt prospective" },
                { name: "الأخطاء الجوهرية في فترات سابقة: إعادة البيان", primary: "material prior period errors restatement comparative correction" },
                { name: "الأخطاء غير الجوهرية: المعالجة المبسّطة", primary: "immaterial errors practical expedient current period correction" },
                { name: "الإفصاح عن التغييرات: ما يريده مستخدم القوائم", primary: "disclosure changes policies estimates errors comparability" }
              ]
            },
            {
              unit_index: 8, code: "2.6.8",
              name: "إعداد التقارير القطاعية وفق IFRS 8",
              goal: "إتقان تحديد القطاعات التشغيلية وإعداد إفصاحاتها وفق IFRS 8 لتحسين شفافية المجموعات",
              key_concepts: ["IFRS 8","Operating Segments","Reportable Segments","CODM","Segment Profit","Reconciliation"],
              lessons: [
                { name: "IFRS 8: لماذا نحتاج تقارير قطاعية؟", primary: "IFRS 8 why segment reporting investor decision disaggregation" },
                { name: "صانع القرارات التشغيلية الرئيسي CODM: من هو؟", primary: "CODM chief operating decision maker identification role" },
                { name: "تحديد القطاعات التشغيلية: نهج الإدارة", primary: "operating segments management approach identification IFRS 8" },
                { name: "عتبات التقرير: متى يصبح القطاع جوهرياً؟", primary: "reportable segment thresholds 10% revenue profit assets" },
                { name: "دمج القطاعات المتشابهة: شروط وضوابط", primary: "segment aggregation similar characteristics criteria IFRS 8" },
                { name: "قياس ربحية القطاع: مقياس CODM المختار", primary: "segment profit measurement CODM chosen measure reconcile" },
                { name: "المعلومات الجغرافية: الإيرادات والأصول بالدولة", primary: "geographic information revenues non-current assets by country" },
                { name: "معلومات العملاء الرئيسيين: التركيز والمخاطر", primary: "major customer information concentration risk IFRS 8" },
                { name: "التوفيق بين القطاعات والإجماليات في القوائم", primary: "reconciliation segment totals consolidated amounts IFRS 8" }
              ]
            },
            {
              unit_index: 9, code: "2.6.9",
              name: "معايير IFRS الجديدة والمستقبلية",
              goal: "متابعة المستجدات في معايير IFRS وفهم المشاريع الجارية وتأثيرها المحتمل على المحاسبة",
              key_concepts: ["IASB Projects","IFRS 18","IFRS 17","Sustainability Standards","ISSB","Future Standards"],
              lessons: [
                { name: "IASB: من يضع قواعد المحاسبة الدولية؟", primary: "IASB structure process standard setting consultation" },
                { name: "IFRS 18: الجيل الجديد من قوائم الدخل", primary: "IFRS 18 new income statement structure categories" },
                { name: "IFRS 17: المعيار المعقد للعقود التأمينية", primary: "IFRS 17 insurance contracts measurement discounting" },
                { name: "معايير ISSB للاستدامة: IFRS S1 وS2", primary: "ISSB sustainability standards S1 S2 climate risk disclosure" },
                { name: "التقارير حول المناخ: TCFD ومتطلباتها", primary: "TCFD climate financial disclosures carbon accounting risk" },
                { name: "Digital Reporting: XBRL والتقارير الرقمية", primary: "XBRL digital reporting structured data automation" },
                { name: "مشاريع تحسين المعايير: ما الجاري في IASB؟", primary: "IASB improvement projects agenda consultation exposure drafts" },
                { name: "الفرق بين US GAAP وIFRS: دليل المقارنة", primary: "US GAAP vs IFRS major differences convergence current" },
                { name: "الاستعداد للتغييرات: كيف يواكب المحاسب المستجدات؟", primary: "staying current IFRS changes accountant continuous learning" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "مراجعة شاملة وتطبيق المستوى الثاني",
          goal: "توحيد مهارات المستوى الثاني وتطبيقها في حالات معقدة متكاملة تُحاكي بيئة العمل الاحترافي المتقدم",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 70 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.7.1",
              name: "حالات محاسبة التكاليف المتكاملة",
              goal: "تطبيق محاسبة التكاليف على حالات صناعية وخدمية معقدة تجمع عدة أنظمة وقرارات",
              key_concepts: ["Integrated Cases","Complex Costing","Decision Making","Multi-System","Real Industry"],
              lessons: [
                { name: "حالة مصنع صناعي: ABC وانحرافات المعيارية", primary: "industrial plant ABC standard costing variances integrated" },
                { name: "حالة شركة خدمات: TDABC وقرارات التسعير", primary: "service company TDABC pricing decisions profitability" },
                { name: "حالة مطعم: CVP والتشغيل في ظروف طاقة قصوى", primary: "restaurant CVP capacity constraints optimal menu pricing" },
                { name: "حالة مقاول: تكاليف المرحلة وقرار الطلبيات الخاصة", primary: "contractor process costing special order make or buy" },
                { name: "حالة متعددة المنتجات: المنتجات المشتركة وتقسيم الربح", primary: "multi-product joint costs split-off further processing decision" },
                { name: "حالة مجموعة شركات: التسعير التحويلي والربحية", primary: "group companies transfer pricing segment profitability" },
                { name: "حالة محاسبة الجودة: تكاليف الجودة والتحسين", primary: "quality cost analysis improvement lean sigma integrated" },
                { name: "تحليل مقارن: أي نظام تكاليف الأنسب لأي بيئة؟", primary: "cost system comparison which fits which environment analysis" },
                { name: "تقرير التكاليف الاستراتيجي: من الأرقام للقرار", primary: "strategic cost report numbers to decision management reporting" }
              ]
            },
            {
              unit_index: 2, code: "2.7.2",
              name: "حالات IFRS المتقدمة المركّبة",
              goal: "التعامل مع حالات IFRS المعقدة التي تجمع عدة معايير في موقف واحد",
              key_concepts: ["Complex IFRS","Multi-Standard","Judgment Cases","Gray Areas","Professional Application"],
              lessons: [
                { name: "حالة عقد مع مزايا متعددة: IFRS 15 المعقدة", primary: "complex contract IFRS 15 multiple elements variable consideration" },
                { name: "حالة الاستحواذ: IFRS 3 والتوحيد الأول", primary: "acquisition IFRS 3 first consolidation goodwill NCI" },
                { name: "حالة أدوات مالية مركّبة: IFRS 9 والتحوط", primary: "complex financial instruments IFRS 9 hedging ECL comprehensive" },
                { name: "حالة تغيير جوهري: IAS 8 والأثر المتشعب", primary: "material change IAS 8 retrospective comprehensive restatement" },
                { name: "حالة إيجار وعقار استثماري: IFRS 16 وIAS 40", primary: "lease investment property IFRS 16 IAS 40 combined" },
                { name: "حالة مزايا موظفين وانخفاض: IAS 19 وIAS 36", primary: "employee benefits impairment IAS 19 IAS 36 interaction" },
                { name: "حالة القطاعات والتوحيد: IFRS 8 وIFRS 10", primary: "segments consolidation IFRS 8 IFRS 10 group reporting" },
                { name: "حالة الإفصاح الكامل: ملاحظات شاملة ومتشابكة", primary: "comprehensive disclosure full notes interrelated complex entity" },
                { name: "الحكم المهني في مناطق الرمادية: الأدلة والاستنتاج", primary: "professional judgment gray areas evidence conclusion documentation" }
              ]
            },
            {
              unit_index: 3, code: "2.7.3",
              name: "نماذج القوائم المالية الموحدة الشاملة",
              goal: "إعداد قوائم مالية موحدة كاملة لمجموعة متعددة الطبقات مع كل الإيضاحات المطلوبة",
              key_concepts: ["Full Consolidation","Multi-Tier Group","Complete Statements","All Notes","Professional Quality"],
              lessons: [
                { name: "هيكل المجموعة: رسم الخريطة قبل التوحيد", primary: "group structure mapping parent subsidiaries associates JVs" },
                { name: "التوحيد الكامل: خطوات منهجية لمجموعة معقدة", primary: "full consolidation systematic steps complex group elimination" },
                { name: "الميزانية الموحدة: توحيد الأرقام وإزالة التشابكات", primary: "consolidated balance sheet aggregation eliminations NCI" },
                { name: "قائمة الدخل الشامل الموحدة مع NCI", primary: "consolidated comprehensive income NCI allocation attribution" },
                { name: "التدفقات النقدية الموحدة: الأكثر تعقيداً", primary: "consolidated cash flows indirect acquisitions disposals" },
                { name: "إيضاح الشهرة والقطاعات والشركات الزميلة", primary: "goodwill segments associates disclosure notes comprehensive" },
                { name: "مراجعة التوافق الداخلي: لا تناقضات في الحزمة", primary: "internal consistency review no contradictions complete package" },
                { name: "تقديم الحزمة كاملة: محاكاة تقديم احترافي", primary: "complete package presentation professional simulation review" },
                { name: "التغذية الراجعة وتحسين جودة القوائم الموحدة", primary: "feedback improvement consolidated statements quality review" }
              ]
            },
            {
              unit_index: 4, code: "2.7.4",
              name: "محاكاة التدقيق: من التخطيط للتقرير",
              goal: "تطبيق دورة التدقيق الكاملة على منشأة من تقييم المخاطر إلى إصدار رأي المدقق",
              key_concepts: ["Audit Simulation","Full Cycle","Risk Assessment","Evidence","Working Papers","Audit Opinion"],
              lessons: [
                { name: "قبول العميل: التقييم الأولي والمخاطر", primary: "client acceptance preliminary assessment risks engagement" },
                { name: "فهم المنشأة: تحليل العمليات والبيئة", primary: "entity understanding operations environment risk assessment" },
                { name: "تحديد المخاطر الجوهرية وتقييم الرقابة الداخلية", primary: "significant risks internal control assessment documentation" },
                { name: "خطة التدقيق: التخصيص وبرامج العمل", primary: "audit plan allocation work programs team structure" },
                { name: "تنفيذ اختبارات الضوابط والإجراءات الجوهرية", primary: "executing control tests substantive procedures evidence" },
                { name: "ملف أوراق العمل: التوثيق الكامل والمرجعية", primary: "working papers complete documentation cross-referencing" },
                { name: "قضايا التدقيق الحرجة: المناقشة والحل", primary: "critical audit matters discussion resolution communication" },
                { name: "مراجعة مسودة القوائم: الملاحظات والتعديلات", primary: "draft statements review observations adjustments clearance" },
                { name: "إصدار تقرير المدقق: الرأي والمسؤولية", primary: "auditor report issuance opinion responsibility professional" }
              ]
            },
            {
              unit_index: 5, code: "2.7.5",
              name: "الموازنة والتخطيط: نموذج مؤسسي متكامل",
              goal: "بناء نموذج موازنة متكامل لمؤسسة متعددة الأقسام من المبيعات إلى الميزانية المتوقعة",
              key_concepts: ["Integrated Budget Model","Multi-Division","Rolling Forecast","Performance Tracking","Variance"],
              lessons: [
                { name: "تصميم النموذج المالي المتكامل للمؤسسة", primary: "integrated financial model design architecture multi-division" },
                { name: "موازنة الإيرادات الموحدة: دمج أقسام متعددة", primary: "consolidated revenue budget multiple divisions integration" },
                { name: "موازنة التكاليف الموحدة: التوزيع والتخصيص", primary: "consolidated cost budget allocation shared services" },
                { name: "الموازنة الرأسمالية الشاملة: NPV لمشاريع متعددة", primary: "comprehensive capital budget NPV multiple projects ranking" },
                { name: "الموازنة النقدية الموحدة: التدفق والتمويل", primary: "consolidated cash budget liquidity financing gap identification" },
                { name: "القوائم المالية المتوقعة الكاملة للمؤسسة", primary: "complete projected financial statements consolidated entity" },
                { name: "نظام الرقابة والمتابعة: الأداء الفعلي مقابل المخطط", primary: "control system actual vs budget monitoring reporting" },
                { name: "تحليل الانحرافات على مستوى المؤسسة: الصورة الكبيرة", primary: "enterprise variance analysis big picture root cause" },
                { name: "مراجعة الموازنة وتحديثها: الاستجابة للمستجدات", primary: "budget review update mid-year adjustment rolling forecast" }
              ]
            },
            {
              unit_index: 6, code: "2.7.6",
              name: "دراسات حالة استراتيجية: قرارات عالية الأثر",
              goal: "تحليل قرارات استراتيجية مالية عالية الأثر في شركات حقيقية واستخلاص الدروس القابلة للتطبيق",
              key_concepts: ["Strategic Decisions","M&A Cases","Financial Crisis","Turnaround","IPO","Major Investment"],
              lessons: [
                { name: "حالة Amazon: القرار المالي الأشهر في التاريخ", primary: "Amazon financial strategy long-term investment profitability" },
                { name: "حالة دبي وأزمة الديون 2009: الدروس والمآلات", primary: "Dubai debt crisis 2009 lessons restructuring lessons" },
                { name: "حالة استحواذ Microsoft على Activision: التقييم", primary: "Microsoft Activision acquisition valuation regulatory financial" },
                { name: "حالة إفلاس Evergrande الصينية: التحذيرات المبكرة", primary: "Evergrande bankruptcy early warnings real estate China lessons" },
                { name: "حالة IPO Aramco: الأضخم في التاريخ ودروسه", primary: "Aramco IPO largest history valuation reporting governance" },
                { name: "حالة إعادة هيكلة شركة يمنية: مسيرة إنقاذ", primary: "Yemeni company restructuring turnaround financial recovery" },
                { name: "حالة اندماج بنكين: التوحيد والتحديات المحاسبية", primary: "bank merger consolidation accounting challenges cultural" },
                { name: "حالة تمويل مشروع البنية التحتية: Project Finance", primary: "project finance infrastructure debt equity structure accounting" },
                { name: "استخلاص الإطار: القرارات المالية الكبرى وأدواتها", primary: "framework major financial decisions tools criteria success" }
              ]
            },
            {
              unit_index: 7, code: "2.7.7",
              name: "التقرير المهني المتكامل: المهارة الفارقة",
              goal: "إتقان صياغة التقارير المالية المهنية المتكاملة التي تُدمج التحليل بالحكم بالتوصية",
              key_concepts: ["Professional Report","Executive Summary","Findings","Recommendations","Narrative","Visuals"],
              lessons: [
                { name: "هيكل التقرير المالي المهني: المكوّنات والتسلسل", primary: "professional financial report structure components sequence" },
                { name: "الملخص التنفيذي: جوهر التقرير في صفحة واحدة", primary: "executive summary one page key messages action oriented" },
                { name: "المنهجية: كيف وصلت لهذه النتائج؟", primary: "methodology explaining approach analysis data sources" },
                { name: "النتائج الجوهرية: ما تُظهره البيانات بوضوح", primary: "key findings data driven evidence clear significant" },
                { name: "التوصيات: من الأرقام للإجراءات العملية", primary: "recommendations actionable specific measurable practical" },
                { name: "المخاطر والقيود: الصدق الذي يبني المصداقية", primary: "risks limitations honest builds credibility professional" },
                { name: "الملاحق والتفاصيل الداعمة: العمق للمتخصصين", primary: "appendices supporting details specialists deeper dive" },
                { name: "لغة التقرير: الدقة والبساطة والإقناع", primary: "report language precision simplicity persuasion professional" },
                { name: "ورشة تقرير: من البيانات الخام للتقرير الكامل", primary: "report workshop raw data to complete professional report" }
              ]
            },
            {
              unit_index: 8, code: "2.7.8",
              name: "التفاوض المالي وإدارة أصحاب المصلحة",
              goal: "إتقان مهارات التفاوض المالي وإدارة توقعات أصحاب المصلحة المختلفين في الملفات المحاسبية",
              key_concepts: ["Financial Negotiation","Stakeholder Management","Auditors","Bankers","Regulators","Investors"],
              lessons: [
                { name: "التفاوض مع المدققين: حوار الرأي الموضوعي", primary: "negotiating auditors objective professional discussion disagreement" },
                { name: "التفاوض مع البنوك: الحصول على شروط أفضل", primary: "bank negotiation better terms financial covenants conditions" },
                { name: "إدارة توقعات المستثمرين: الشفافية والثقة", primary: "investor expectations transparency trust confidence management" },
                { name: "التعامل مع الجهات التنظيمية: الامتثال والعلاقة", primary: "regulatory relations compliance communication professional" },
                { name: "التفاوض الداخلي: الميزانية والتخصيص", primary: "internal negotiation budget allocation resources priorities" },
                { name: "إدارة أزمة مالية: التواصل في الظروف الصعبة", primary: "crisis communication financial difficulties stakeholders" },
                { name: "الوساطة في النزاعات المالية: الحلول التوافقية", primary: "financial disputes mediation compromise win-win solutions" },
                { name: "بناء الشراكات المالية: العلاقات طويلة الأمد", primary: "financial partnerships long-term relationships trust value" },
                { name: "الذكاء العاطفي للمحاسب: فهم ما وراء الأرقام", primary: "emotional intelligence accountant understanding beyond numbers" }
              ]
            },
            {
              unit_index: 9, code: "2.7.9",
              name: "المشروع الختامي للمستوى الثاني",
              goal: "تقديم مشروع محاسبي متكامل من المستوى الثاني يُظهر إتقان التحليل المتقدم واتخاذ القرار",
              key_concepts: ["Level Two Capstone","Advanced Analysis","Decision Framework","Professional Delivery","Portfolio"],
              lessons: [
                { name: "اختيار المشروع: المعايير والتحديات المتوقعة", primary: "project selection criteria expected challenges level two" },
                { name: "المرحلة الأولى: فهم المنشأة وبيئة الأعمال", primary: "phase one entity understanding business environment deep" },
                { name: "المرحلة الثانية: التحليل المالي المتعمق", primary: "phase two deep financial analysis ratios trends models" },
                { name: "المرحلة الثالثة: تطبيق IFRS والتكاليف والموازنات", primary: "phase three IFRS cost accounting budgets comprehensive" },
                { name: "المرحلة الرابعة: التدقيق والرقابة والامتثال", primary: "phase four audit controls compliance risk assessment" },
                { name: "المرحلة الخامسة: التوصيات الاستراتيجية", primary: "phase five strategic recommendations financial plan" },
                { name: "العرض التقديمي: محاكاة لجنة إدارة حقيقية", primary: "presentation real board simulation defend findings" },
                { name: "المراجعة النظيرة والتغذية الراجعة المتبادلة", primary: "peer review mutual feedback professional growth" },
                { name: "التهيئة للمستوى الثالث: المحاسبة الاحترافية", primary: "preparation level three professional accounting advanced" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 3,
      name: "المحاسبة الاحترافية والمتخصصة",
      goal: "الوصول إلى القمة في المهنة المحاسبية من خلال إتقان التدقيق المتقدم ومحاسبة الاستثمار وإدارة الأداء المؤسسي وإعداد التقارير المتكاملة وتقنيات المستقبل",
      bloom_focus: "evaluate",
      exam: { pass_threshold_percent: 75, time_limit_minutes: 90 },
      stages: [
        {
          stage_index: 1,
          name: "التدقيق المتقدم والمراجعة الجنائية",
          goal: "إتقان التدقيق المتقدم والتحقيقات الجنائية والمخاطر المعقدة والتكنولوجيا في خدمات الضمان",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "3.1.1",
              name: "التدقيق المبني على المخاطر المتقدم",
              goal: "إتقان تقييم المخاطر المتقدم واستجابات التدقيق للمخاطر الجوهرية في البيئات المعقدة",
              key_concepts: ["Advanced Risk Assessment","Strategic Risks","Fraud Risk","Complex Estimates","Group Audit","ISA 540"],
              lessons: [
                { name: "البيئة العمل المعقدة: مخاطر لا تظهر في الأرقام", primary: "complex business environment strategic operational risks hidden" },
                { name: "ISA 540: تدقيق التقديرات المحاسبية المعقدة", primary: "ISA 540 auditing accounting estimates complex fair value" },
                { name: "تدقيق القيمة العادلة: التحديات والإجراءات", primary: "fair value audit challenges specialists third party validation" },
                { name: "تدقيق الاستمرارية: التهديدات والإجراءات الإضافية", primary: "going concern audit threats additional procedures ISA 570" },
                { name: "مخاطر الاحتيال في التدقيق: إجراءات ISA 240", primary: "fraud risk auditing ISA 240 presumptions responses" },
                { name: "تدقيق المجموعة: تنسيق الفرق في دول متعددة", primary: "group audit ISA 600 component auditor coordination" },
                { name: "خدمات الضمان ما وراء التدقيق: ISAE 3000", primary: "assurance services beyond audit ISAE 3000 subject matter" },
                { name: "مراجعة المعلومات المالية الأولية: ISRE 2410", primary: "review interim financial statements ISRE 2410 limited assurance" },
                { name: "التدقيق المستمر: من السنوي للفوري", primary: "continuous audit real-time technology driven annual move" }
              ]
            },
            {
              unit_index: 2, code: "3.1.2",
              name: "المحاسبة والتدقيق الجنائي",
              goal: "إتقان أساليب المحاسبة الجنائية والتحقيقات في حالات الغش المالي المعقدة ودعم التقاضي",
              key_concepts: ["Forensic Accounting","Fraud Investigation","Litigation Support","Expert Witness","Tracing Funds","Digital Forensics"],
              lessons: [
                { name: "المحاسبة الجنائية: فن كشف الحقيقة المالية", primary: "forensic accounting truth discovery financial investigation art" },
                { name: "التحقيق في غسل الأموال: تتبع المال عبر الطبقات", primary: "money laundering investigation tracing funds layers complex" },
                { name: "التزوير والتلاعب في الوثائق: الاكتشاف الرقمي", primary: "document fraud forgery digital detection forensic analysis" },
                { name: "الجنائيات الرقمية: استرداد الأدلة الإلكترونية", primary: "digital forensics electronic evidence recovery accounting systems" },
                { name: "مقابلات التحقيق: فن استخراج المعلومات", primary: "investigative interviews techniques information extraction behavioral" },
                { name: "تقرير الخبرة: الشهادة أمام المحاكم", primary: "expert witness report court testimony forensic accounting" },
                { name: "حالات احتيال شهيرة: التشريح الجنائي الكامل", primary: "famous fraud cases forensic dissection Madoff Wirecard WorldCom" },
                { name: "غسل الأموال في القطاع المصرفي: الأنماط والكشف", primary: "banking money laundering patterns detection compliance AML" },
                { name: "استرداد الأصول المنهوبة: المسار القانوني والمالي", primary: "asset recovery stolen funds legal financial path international" }
              ]
            },
            {
              unit_index: 3, code: "3.1.3",
              name: "تدقيق التكنولوجيا والذكاء الاصطناعي",
              goal: "إتقان تدقيق البيئات التقنية المتقدمة وتوظيف الذكاء الاصطناعي في تحسين جودة التدقيق",
              key_concepts: ["AI Audit","Data Analytics Audit","Continuous Audit","Blockchain Audit","Algorithm Audit","Risk Technology"],
              lessons: [
                { name: "تحليلات البيانات في التدقيق: من العينات للكل", primary: "data analytics audit population full not sampling revolution" },
                { name: "تدقيق خوارزميات الذكاء الاصطناعي: التحيز والدقة", primary: "AI algorithm audit bias accuracy reliability accountability" },
                { name: "التدقيق المستمر: الأتمتة والكشف الفوري", primary: "continuous audit automation real-time detection exception" },
                { name: "تدقيق Blockchain: التحقق من الدفاتر الموزعة", primary: "blockchain audit verification distributed ledger smart contracts" },
                { name: "نماذج التدقيق التنبؤي: توقع مخاطر المستقبل", primary: "predictive audit models future risk anticipation machine learning" },
                { name: "تدقيق إجراءات الروبوت RPA: الرقابة على الأتمتة", primary: "RPA audit automated processes control exceptions monitoring" },
                { name: "الخصوصية وحماية البيانات في بيئة التدقيق الرقمي", primary: "privacy data protection digital audit environment compliance" },
                { name: "مهارات المدقق الرقمي: ما هو مطلوب الآن؟", primary: "digital auditor skills data analytics coding current demand" },
                { name: "مستقبل التدقيق: ما يبقى وما يتغير مع الذكاء الاصطناعي", primary: "future audit what remains what changes AI professional judgment" }
              ]
            },
            {
              unit_index: 4, code: "3.1.4",
              name: "خدمات الضمان والاستشارة المتخصصة",
              goal: "تقديم خدمات ضمان واستشارة متخصصة تتجاوز التدقيق التقليدي في مجالات متنوعة",
              key_concepts: ["Due Diligence","Financial Modelling Assurance","Regulatory Reporting","Valuations","Sustainability Assurance"],
              lessons: [
                { name: "العناية الواجبة المالية: التحقق قبل الاستحواذ", primary: "financial due diligence M&A verification pre-acquisition" },
                { name: "ضمان النماذج المالية: صحة الافتراضات والحسابات", primary: "financial model assurance assumptions calculations integrity" },
                { name: "تدقيق الامتثال التنظيمي: التحقق من الالتزامات", primary: "regulatory compliance audit verification adherence requirements" },
                { name: "تدقيق التقارير الضريبية: الدقة والامتثال الضريبي", primary: "tax reporting audit accuracy compliance transfer pricing" },
                { name: "ضمان تقارير الاستدامة: التحقق من ESG", primary: "sustainability assurance ESG data verification ISAE 3000" },
                { name: "خدمات التقييم المهنية: المعايير والمنهجية", primary: "valuation services professional standards methodology business" },
                { name: "ضمان تقارير السياسات والإجراءات", primary: "policies procedures assurance internal control testing" },
                { name: "خدمات الحوكمة: مراجعة الفعالية والهياكل", primary: "governance services effectiveness review board structures" },
                { name: "بناء ممارسة متخصصة: التميز والتسويق", primary: "specialist practice building differentiation marketing professional" }
              ]
            },
            {
              unit_index: 5, code: "3.1.5",
              name: "تدقيق القطاع المالي والبنوك",
              goal: "إتقان تدقيق البنوك والمؤسسات المالية مع مراعاة خصوصية قطاعها التنظيمية والمحاسبية",
              key_concepts: ["Bank Audit","IFRS 9 ECL","Regulatory Capital","Stress Testing","Liquidity Risk","Loan Portfolio"],
              lessons: [
                { name: "خصوصية تدقيق البنوك: ما يختلف عن الشركات", primary: "bank audit differences unique aspects regulatory complex" },
                { name: "تدقيق محفظة القروض: التصنيف والمخصصات", primary: "loan portfolio audit classification provisions ECL IFRS 9" },
                { name: "نموذج ECL في البنوك: التحقق من الافتراضات", primary: "bank ECL audit model assumptions validation staging" },
                { name: "رأس المال التنظيمي: Basel III ومتطلباته", primary: "regulatory capital Basel III requirements audit verification" },
                { name: "اختبارات الضغط: التحقق من صمود البنك", primary: "stress testing bank resilience verification scenario audit" },
                { name: "مخاطر السيولة: NSFR وLCR والامتثال", primary: "liquidity risk NSFR LCR compliance audit verification" },
                { name: "تدقيق العمليات المصرفية: الخزانة والاستثمارات", primary: "treasury investment operations audit bank financial instruments" },
                { name: "التحقيق في التلاعب البنكي: الحالات الكبرى", primary: "bank manipulation investigation major cases LIBOR Forex" },
                { name: "التنظيم المصرفي وأثره على التدقيق والتقارير", primary: "banking regulation impact audit reporting central bank oversight" }
              ]
            },
            {
              unit_index: 6, code: "3.1.6",
              name: "إدارة شريك التدقيق والمكتب المهني",
              goal: "إتقان الجوانب الإدارية والاستراتيجية لإدارة مكتب التدقيق وتطوير الشراكة المهنية",
              key_concepts: ["Practice Management","Partnership","Client Portfolio","Business Development","Quality Management","Profitability"],
              lessons: [
                { name: "إدارة محفظة العملاء: النمو والجودة والمخاطر", primary: "client portfolio management growth quality risk balance" },
                { name: "تسعير الخدمات المهنية: القيمة لا التكلفة", primary: "professional services pricing value based not cost hourly" },
                { name: "تطوير الأعمال في التدقيق: كيف تنمو بحكمة؟", primary: "audit business development growth strategies referrals" },
                { name: "إدارة الفرق المهنية: بناء المحاسبين القادة", primary: "team management professional accountants leaders development" },
                { name: "تجديد وإنهاء علاقات التدقيق: المعايير والقرار", primary: "audit rotation resignation hot review risk factors" },
                { name: "الجودة في مستوى المكتب: النظام والثقافة", primary: "firm quality culture system training inspection tone" },
                { name: "الربحية في الخدمات المهنية: الهامش والكفاءة", primary: "professional services profitability margin efficiency recovery" },
                { name: "الخلافات المهنية مع العملاء: الإدارة والحل", primary: "client disputes professional resolution communication" },
                { name: "نموذج أعمال مكتب التدقيق المستقبلي", primary: "future audit firm business model technology advisory mix" }
              ]
            },
            {
              unit_index: 7, code: "3.1.7",
              name: "معايير أخلاقيات التدقيق والاستقلالية المتقدمة",
              goal: "التعامل مع المعضلات الأخلاقية المعقدة والتهديدات للاستقلالية في بيئات التدقيق الحديثة",
              key_concepts: ["Independence Threats","Safeguards","Non-Audit Services","Long Association","Fee Dependence","IESBA"],
              lessons: [
                { name: "إطار IESBA: الأخلاقيات كمنظومة لا قواعد", primary: "IESBA code ethics framework threats safeguards approach" },
                { name: "التهديدات للاستقلالية: الأنواع الخمسة وتقييمها", primary: "independence threats self-interest familiarity advocacy identification" },
                { name: "الضمانات: كيف نُخفّف التهديدات ونحتفظ بالاستقلالية", primary: "safeguards reduce threats independence maintain objectivity" },
                { name: "خدمات ما عدا التدقيق: الحد الفاصل الصعب", primary: "non-audit services boundaries independence consultation" },
                { name: "الارتباط الطويل بالعميل: التعود وفقدان الحياد", primary: "long association familiarity threat partner rotation" },
                { name: "الاعتماد على رسوم عميل واحد: خطر التمركز", primary: "fee dependence single client concentration risk safeguards" },
                { name: "العلاقات الشخصية والتوظيف السابق والمستقبلي", primary: "personal relationships prior employment future revolving door" },
                { name: "الضغوط من الإدارة: كيف تُقاوم بحكمة وشجاعة؟", primary: "management pressure resist courage wisdom professional skepticism" },
                { name: "حالات أخلاقية حقيقية: التحليل والقرار والعبرة", primary: "real ethics cases analysis decision lesson ethics practical" }
              ]
            },
            {
              unit_index: 8, code: "3.1.8",
              name: "التدقيق في الشركات العائلية والمنشآت الصغيرة",
              goal: "إتقان تدقيق الشركات العائلية والمنشآت الصغيرة بمراعاة خصوصيتها وتحدياتها الفريدة",
              key_concepts: ["Family Business Audit","SME Audit","Owner Dominated","Concentration Risk","Succession","Governance"],
              lessons: [
                { name: "الشركة العائلية: الديناميكيات التي تُعقّد التدقيق", primary: "family business dynamics complexity audit unique challenges" },
                { name: "تركّز السلطة في يد مالك: خطر التحايل على الرقابة", primary: "owner dominated control risk override management fraud" },
                { name: "الحسابات بين الأطراف ذات العلاقة في الشركات العائلية", primary: "family company related party transactions scrutiny arm length" },
                { name: "التخطيط للخلافة: المخاطر المالية والمحاسبية", primary: "succession planning financial risks accounting implications" },
                { name: "الحوكمة في الشركات العائلية: البساطة الضرورية", primary: "family company governance necessary simplicity board role" },
                { name: "تدقيق المنشآت الصغيرة: الكفاءة والواقعية", primary: "SME audit efficiency practical approaches small budget" },
                { name: "مراجعة المعلومات المالية: خدمة أقل تكلفة", primary: "financial information review limited assurance SME alternative" },
                { name: "التقييم للأغراض الضريبية والخلافة في الشركات العائلية", primary: "valuation tax purposes succession family business estate" },
                { name: "بناء علاقة طويلة الأمد مع الشركة العائلية", primary: "long-term relationship family business trust advisor role" }
              ]
            },
            {
              unit_index: 9, code: "3.1.9",
              name: "تدقيق المشاريع الحكومية والمنظمات الدولية",
              goal: "إتقان تدقيق المشاريع الممولة دولياً والجهات الحكومية وفق معايير التدقيق الحكومي الدولية",
              key_concepts: ["Government Audit","World Bank","Donor Audits","INTOSAI","Public Sector ISAs","Performance Audit"],
              lessons: [
                { name: "تدقيق المشاريع الممولة دولياً: البنك الدولي والأمم المتحدة", primary: "internationally funded project audit World Bank UN requirements" },
                { name: "متطلبات المانح: المبادئ والشروط الخاصة", primary: "donor requirements special conditions financial auditor criteria" },
                { name: "INTOSAI: معايير التدقيق في القطاع العام الدولي", primary: "INTOSAI international standards supreme audit institutions" },
                { name: "تدقيق الأداء: هل حققت الجهة أهدافها؟", primary: "performance audit value for money 3Es economy efficiency" },
                { name: "تدقيق الامتثال في المشاريع الحكومية", primary: "compliance audit government projects procurement rules" },
                { name: "الاستفادة من موارد المشاريع: منع الهدر والغش", primary: "project resource utilization waste fraud prevention audit" },
                { name: "التقرير للجهات المانحة والحكومة: توقعات مختلفة", primary: "reporting donors government different expectations formats" },
                { name: "اليمن في سياق مشاريع إعادة الإعمار والتدقيق", primary: "Yemen reconstruction projects audit international donor" },
                { name: "بناء الطاقة المؤسسية: تدريب المدققين الحكوميين", primary: "capacity building government auditors training INTOSAI" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "محاسبة الاستثمار والتمويل المتقدم",
          goal: "إتقان محاسبة الاستثمارات المالية المعقدة وأدوات التمويل والمشتقات وتحليل أسواق رأس المال",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "3.2.1",
              name: "أسواق رأس المال والأوراق المالية",
              goal: "فهم أسواق رأس المال وأدواتها والقيمة الزمنية للنقود كأساس لقرارات الاستثمار",
              key_concepts: ["Capital Markets","Time Value of Money","Bonds","Stocks","Options","Futures"],
              lessons: [
                { name: "أسواق رأس المال: الأسواق الأولية والثانوية", primary: "capital markets primary secondary equity debt instruments" },
                { name: "القيمة الزمنية للنقود: الأساس الرياضي للتمويل", primary: "time value money PV FV annuity perpetuity calculations" },
                { name: "تسعير السندات: ما يؤثر في العائد والسعر؟", primary: "bond pricing yield maturity coupon duration convexity" },
                { name: "نماذج تسعير الأسهم: DDM وDCF وPE", primary: "equity valuation DDM DCF PE relative intrinsic models" },
                { name: "العقود الآجلة: الالتزام بتبادل مستقبلي", primary: "forward contracts future delivery obligation pricing" },
                { name: "عقود الخيارات: الحق بلا التزام والتسعير", primary: "options call put right no obligation Black-Scholes pricing" },
                { name: "عقود المبادلة: استبدال التدفقات المالية", primary: "swaps interest rate currency exchange cash flows" },
                { name: "المشتقات الائتمانية: نقل مخاطر الائتمان", primary: "credit derivatives CDS transfer credit risk protection" },
                { name: "الأسواق الناشئة: فرص وتحديات التمويل في اليمن", primary: "emerging markets Yemen finance challenges opportunities risk" }
              ]
            },
            {
              unit_index: 2, code: "3.2.2",
              name: "هيكل رأس المال وقرارات التمويل",
              goal: "إتقان تحليل هياكل رأس المال والوصول للهيكل الأمثل الموازن بين تكلفة الديون والملكية",
              key_concepts: ["Capital Structure","Optimal Structure","WACC","Modigliani Miller","Trade-off Theory","Pecking Order"],
              lessons: [
                { name: "هيكل رأس المال: الدين أم الملكية أم المزيج؟", primary: "capital structure debt equity mix choice implications" },
                { name: "WACC: متوسط تكلفة رأس المال المرجّح", primary: "WACC calculation components weights tax shield debt" },
                { name: "Modigliani-Miller: عالم مثالي بلا أهمية للهيكل", primary: "Modigliani Miller irrelevance theorem perfect markets" },
                { name: "نظرية التوازن Trade-off: فائدة الضريبة وتكلفة الضائقة", primary: "trade-off theory tax benefit financial distress cost" },
                { name: "نظرية الترتيب التفضيلي Pecking Order: التمويل الداخلي أولاً", primary: "pecking order internal external hierarchy equity last" },
                { name: "تكلفة حقوق الملكية: CAPM ونماذج العوامل", primary: "cost of equity CAPM beta risk free market premium" },
                { name: "الرافعة المالية: التضخيم في الاتجاهين", primary: "financial leverage amplification profit loss EPS effect" },
                { name: "الهيكل المثالي للشركات في القطاعات المختلفة", primary: "optimal capital structure industry sector comparison" },
                { name: "إعادة رسملة الشركة: تغيير الهيكل المالي", primary: "recapitalization changing capital structure buyback issuance" }
              ]
            },
            {
              unit_index: 3, code: "3.2.3",
              name: "محاسبة عمليات الاندماج والاستحواذ",
              goal: "إتقان الجوانب المحاسبية والمالية الكاملة لصفقات الاندماج والاستحواذ من التقييم للتكامل",
              key_concepts: ["M&A Accounting","Synergies","Deal Structures","Earn-Outs","Integration Costs","PPA"],
              lessons: [
                { name: "عملية الاستحواذ: المراحل من البداية للإغلاق", primary: "M&A process stages initial to closing due diligence" },
                { name: "توزيع سعر الشراء PPA: القيمة العادلة للأصول", primary: "purchase price allocation PPA fair value assets liabilities" },
                { name: "التآزر: الوعد الذي يُبرر العلاوة السعرية", primary: "synergies cost revenue quantification justification premium" },
                { name: "هياكل الصفقة: النقد والأسهم والمختلط", primary: "deal structure cash shares mixed consideration tax implications" },
                { name: "Earn-outs: الدفع المشروط بالأداء المستقبلي", primary: "earn-out contingent consideration performance future accounting" },
                { name: "تكاليف التكامل: الاعتراف وإدارة التوقعات", primary: "integration costs restructuring recognition management" },
                { name: "محاسبة ما بعد الاستحواذ: 100 يوم الأولى", primary: "post-acquisition accounting first 100 days integration" },
                { name: "التخارج والتجريد: بيع أو فصل جزء من العمليات", primary: "divestiture spin-off separation accounting exit strategy" },
                { name: "حالة استحواذ كاملة: من العرض للتوحيد", primary: "complete acquisition case offer to consolidation accounting" }
              ]
            },
            {
              unit_index: 4, code: "3.2.4",
              name: "محاسبة المشتقات المالية والتحوط المتقدم",
              goal: "إتقان محاسبة المشتقات المالية المعقدة واستراتيجيات التحوط وفق IFRS 9 في الحالات المتقدمة",
              key_concepts: ["Hedge Accounting","Fair Value Hedge","Cash Flow Hedge","Effectiveness Testing","Option Hedging","FX Hedging"],
              lessons: [
                { name: "منطق التحوط: الغرض الاقتصادي والتطبيق المحاسبي", primary: "hedging economic rationale accounting treatment IFRS 9" },
                { name: "تحوط القيمة العادلة: استقرار أصل أو التزام", primary: "fair value hedge fixed rate asset liability basis adjustment" },
                { name: "تحوط التدفق النقدي: تثبيت المستقبل غير المحدد", primary: "cash flow hedge uncertain future OCI recycling reclassification" },
                { name: "تحوط الاستثمار الصافي: الشركات الأجنبية", primary: "net investment hedge foreign subsidiary exchange OCI" },
                { name: "اختبار الفعالية: هل التحوط يعمل؟", primary: "hedge effectiveness testing prospective retrospective IFRS 9" },
                { name: "تحوط العملة الأجنبية: الخيارات والعقود الآجلة", primary: "FX hedging currency options forwards accounting designated" },
                { name: "تحوط أسعار الفائدة: المبادلة وتحوط القرض", primary: "interest rate hedging IRS swap loan hedge accounting" },
                { name: "تحوط أسعار السلع: النفط والذهب والقمح", primary: "commodity price hedging oil gold wheat accounting treatment" },
                { name: "الإفصاحات المتعلقة بالمشتقات والتحوط: IFRS 7", primary: "derivatives hedging disclosures IFRS 7 risk tables amounts" }
              ]
            },
            {
              unit_index: 5, code: "3.2.5",
              name: "الخيارات وأسهم الموظفين: IFRS 2",
              goal: "إتقان محاسبة المدفوعات المبنية على الأسهم وخيارات الموظفين وفق IFRS 2",
              key_concepts: ["IFRS 2","Share-Based Payment","Options Granted","Vesting","Fair Value Measurement","Equity Settled"],
              lessons: [
                { name: "IFRS 2: لماذا نُسعّر الخيارات في القوائم المالية؟", primary: "IFRS 2 share-based payment why expense cost recognition" },
                { name: "الخيارات المسددة بالأسهم: العلاج عند التخصيص", primary: "equity-settled options granted fair value vesting period charge" },
                { name: "نموذج Black-Scholes: تسعير خيار المدير", primary: "Black-Scholes option pricing model inputs fair value" },
                { name: "فترة الاستحقاق: نشر التكلفة عبر الزمن", primary: "vesting period cost spread straight-line service condition" },
                { name: "شروط الاستحقاق: الأداء والخدمة والسوق", primary: "vesting conditions performance service market conditions" },
                { name: "الخيارات المسددة نقداً: SARs والمطلوبات", primary: "cash-settled SARs liability remeasurement intrinsic value" },
                { name: "الاختيار بين التسوية نقداً وأسهماً: التصنيف", primary: "settlement choice equity liability classification IFRS 2" },
                { name: "التعديل والإلغاء والاستبدال في خطط الأسهم", primary: "modification cancellation replacement share scheme IFRS 2" },
                { name: "الإفصاحات المطلوبة لخطط الأسهم في التقارير", primary: "share-based payment disclosures scheme details fair value" }
              ]
            },
            {
              unit_index: 6, code: "3.2.6",
              name: "تمويل المشاريع والبنية التحتية",
              goal: "فهم تمويل المشاريع الكبرى كالبنية التحتية والطاقة والمعالجة المحاسبية الخاصة بها",
              key_concepts: ["Project Finance","SPV","Debt Equity Split","Concession","BOT","Revenue Waterfall"],
              lessons: [
                { name: "تمويل المشاريع: بُنية منفصلة لمشروع ضخم", primary: "project finance SPV separate structure ring-fenced" },
                { name: "شركة المشروع الخاصة SPV: الإنشاء والمحاسبة", primary: "SPV special purpose vehicle establishment accounting off balance" },
                { name: "هيكل الدين والملكية في مشاريع البنية التحتية", primary: "project finance debt equity split structure infrastructure" },
                { name: "عقود الامتياز BOT وPPP: المحاسبة والاعتراف", primary: "BOT PPP concession agreements IFRIC 12 service operator" },
                { name: "توزيع الإيرادات: Waterfall والأولويات", primary: "revenue waterfall priority payments senior subordinated equity" },
                { name: "مخاطر مشاريع البنية التحتية: التعرف والتوزيع", primary: "infrastructure risks allocation construction completion operation" },
                { name: "تمويل الطاقة المتجددة: الشمس والرياح في اليمن", primary: "renewable energy financing solar wind Yemen project" },
                { name: "التمويل الإسلامي للمشاريع: الصكوك والمشاركة", primary: "Islamic project finance sukuk musharaka AAOIFI" },
                { name: "اليمن ومشاريع إعادة الإعمار: التمويل المتاح", primary: "Yemen reconstruction projects available financing international" }
              ]
            },
            {
              unit_index: 7, code: "3.2.7",
              name: "المحاسبة في الأسواق الناشئة والاقتصادات النامية",
              goal: "فهم التحديات المحاسبية الخاصة بالأسواق الناشئة والاقتصادات النامية كاليمن",
              key_concepts: ["Emerging Markets","Hyperinflation","IAS 29","Currency Crisis","Dollarization","Informal Economy"],
              lessons: [
                { name: "التضخم المفرط: متى تنطبق IAS 29؟", primary: "hyperinflation IAS 29 definition 100% cumulative threshold" },
                { name: "إعادة القياس في ظل التضخم المفرط: كيف؟", primary: "remeasurement hyperinflation price level index historical cost" },
                { name: "أزمة العملة: التأثير على المحاسبة والتقارير", primary: "currency crisis exchange rate collapse accounting impact" },
                { name: "الدولرة الجزئية: الاعتبارات المحاسبية في اليمن", primary: "partial dollarization Yemen multi-currency accounting challenges" },
                { name: "الاقتصاد غير الرسمي: تحديات القياس والإفصاح", primary: "informal economy measurement challenges transparency" },
                { name: "التمويل الإسلامي في السياق اليمني والخليجي", primary: "Islamic finance Yemen GCC context accounting treatment" },
                { name: "الزكاة المحاسبية: الحساب والإفصاح في التقارير", primary: "zakat accounting calculation disclosure Islamic reporting" },
                { name: "التقارير المحاسبية في بيئة غير مستقرة", primary: "accounting reporting unstable environment assumptions" },
                { name: "بناء الطاقة المحاسبية في اليمن: التحديات والفرص", primary: "accounting capacity Yemen building challenges opportunities" }
              ]
            },
            {
              unit_index: 8, code: "3.2.8",
              name: "الاستثمار المسؤول وتمويل ESG",
              goal: "فهم الاستثمار المسؤول وتمويل ESG والأدوات المالية المرتبطة بالاستدامة",
              key_concepts: ["ESG Investing","Green Bonds","Social Impact","Sustainable Finance","SDGs","Taxonomy"],
              lessons: [
                { name: "الاستثمار المسؤول: ESG كعامل مخاطر ومرونة", primary: "responsible investing ESG risk resilience factor integration" },
                { name: "السندات الخضراء: التمويل لأغراض بيئية", primary: "green bonds financing environmental projects principles" },
                { name: "السندات الاجتماعية: التمويل للأهداف الاجتماعية", primary: "social bonds financing social projects outcomes measurement" },
                { name: "السندات المرتبطة بالاستدامة: الأهداف والغرامات", primary: "sustainability linked bonds targets penalties KPIs" },
                { name: "قياس تأثير الاستثمار الاجتماعي: الأدوات والمؤشرات", primary: "social impact measurement SROI tools indicators SDGs" },
                { name: "تصنيف التمويل المستدام: EU Taxonomy وغيرها", primary: "sustainable finance taxonomy EU classification criteria" },
                { name: "إعداد تقارير ESG: ما يريده المستثمر المسؤول", primary: "ESG reporting responsible investor expectations standards" },
                { name: "مخاطر المناخ المالية: TCFD والإفصاح", primary: "climate financial risks TCFD disclosure physical transition" },
                { name: "مستقبل التمويل المستدام: فرص للمحاسبين", primary: "future sustainable finance opportunities accountants advisory" }
              ]
            },
            {
              unit_index: 9, code: "3.2.9",
              name: "إدارة الخزينة وتمويل الشركات المتقدم",
              goal: "إتقان وظيفة إدارة الخزينة المتقدمة من إدارة المخاطر إلى تحسين هيكل رأس المال",
              key_concepts: ["Treasury Management","Liquidity Management","Cash Pooling","FX Risk","Interest Rate Management","Funding"],
              lessons: [
                { name: "وظيفة الخزينة: الحارس المالي للمنشأة", primary: "treasury function cash liquidity financial risk management" },
                { name: "إدارة السيولة المتقدمة: التوقع والتحسين", primary: "advanced liquidity management forecasting optimization pools" },
                { name: "تجميع النقد: Cash Pooling للمجموعات", primary: "cash pooling notional physical group treasury management" },
                { name: "إدارة مخاطر العملة: الاستراتيجية الكاملة", primary: "currency risk management strategy hedging policy group" },
                { name: "إدارة مخاطر أسعار الفائدة: الديون المتغيرة", primary: "interest rate risk management floating debt exposure swap" },
                { name: "برامج تمويل التجارة: LC وBG وSCF", primary: "trade finance programs LC guarantees supply chain finance" },
                { name: "تصنيف الخزينة: توظيف الفائض بأمان وعائد", primary: "treasury investment surplus safe return yield liquidity" },
                { name: "العلاقات مع البنوك: الاستفادة القصوى", primary: "banking relationships optimization negotiation RRWA" },
                { name: "التقرير الخزيني للإدارة: الوضع الحي للسيولة", primary: "treasury reporting management real-time liquidity position" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "إدارة الأداء المالي والقيمة المؤسسية",
          goal: "إتقان إدارة الأداء المالي المؤسسي وخلق القيمة وقيادة وظيفة المالية كشريك استراتيجي للإدارة",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "3.3.1",
              name: "نظام الأداء المتكامل وخلق القيمة",
              goal: "بناء نظام متكامل لقياس وإدارة الأداء المؤسسي ربطاً بخلق القيمة للمساهمين",
              key_concepts: ["Value Creation","VBM","Total Shareholder Return","EVA Plus","CFROI","Strategy Execution"],
              lessons: [
                { name: "خلق القيمة للمساهمين: المبدأ الحاكم", primary: "shareholder value creation principle TSR ROIC vs WACC" },
                { name: "إدارة القيمة VBM: الاستراتيجية والتنفيذ المالي", primary: "value based management strategy financial execution alignment" },
                { name: "CFROI: العائد على الاستثمار بالتدفق النقدي", primary: "CFROI cash flow return investment BCG HOLT framework" },
                { name: "التسعير الاستراتيجي: القيمة كأساس لا التكلفة", primary: "strategic pricing value based customer willingness to pay" },
                { name: "تحليل المحركات الحقيقية للقيمة في الصناعة", primary: "value drivers analysis industry specific McKinsey framework" },
                { name: "الخريطة الاستراتيجية: ربط BSC بخلق القيمة", primary: "strategy map BSC value creation link cause effect" },
                { name: "الأداء المالي في الشركات المتنوعة: Portfolio", primary: "diversified company financial performance portfolio management BCG" },
                { name: "مؤشرات الأداء المستقبلية: Leading Indicators", primary: "leading indicators future performance prediction non-financial" },
                { name: "التقرير المتكامل: ربط الاستراتيجية بالنتائج المالية", primary: "integrated report strategy financial outcomes link investors" }
              ]
            },
            {
              unit_index: 2, code: "3.3.2",
              name: "دور المدير المالي CFO الاستراتيجي",
              goal: "إتقان الدور الاستراتيجي للمدير المالي كشريك للرئيس التنفيذي في قيادة المنشأة",
              key_concepts: ["CFO Role","Business Partnering","Strategic Finance","Board Relationships","IR","M&A Leadership"],
              lessons: [
                { name: "تحوّل دور CFO: من الحارس للشريك الاستراتيجي", primary: "CFO role evolution guardian to strategic partner CEO" },
                { name: "الشراكة مع الأعمال: التواصل مع القسم الآخر", primary: "business partnering finance non-finance communication" },
                { name: "قيادة الأجندة الاستراتيجية: إدخال وجهة المالية", primary: "strategic agenda finance perspective value risk return" },
                { name: "علاقة CFO بمجلس الإدارة ولجنة التدقيق", primary: "CFO board audit committee relationship governance" },
                { name: "علاقات المستثمرين: قيادة الحوار مع السوق", primary: "investor relations IR leadership market communication" },
                { name: "قيادة صفقات الاندماج والاستحواذ: دور CFO", primary: "CFO M&A leadership due diligence integration oversight" },
                { name: "إدارة التحولات: تحديث وظيفة المالية", primary: "finance transformation CFO leadership technology automation" },
                { name: "بناء فريق المالية العالي الأداء", primary: "high performance finance team building talent development" },
                { name: "المسيرة للـCFO: المهارات والخبرات والتطوير", primary: "CFO career path skills experiences development journey" }
              ]
            },
            {
              unit_index: 3, code: "3.3.3",
              name: "إدارة التكاليف الاستراتيجية",
              goal: "توظيف إدارة التكاليف الاستراتيجية كأداة للميزة التنافسية وليس مجرد خفض للمصاريف",
              key_concepts: ["Strategic Cost Management","Value Chain","Competitive Cost","Lean","Kaizen","Target Costing"],
              lessons: [
                { name: "التكاليف الاستراتيجية: إدارة لا مجرد قياس", primary: "strategic cost management competitive advantage not just measurement" },
                { name: "تحليل سلسلة القيمة: أين تتركز التكاليف والقيمة؟", primary: "value chain analysis cost concentration value creation activities" },
                { name: "التكلفة المستهدفة: ابدأ بالسعر وانتهِ بالتكلفة", primary: "target costing price market back price down to target" },
                { name: "Kaizen Costing: التحسين المستمر في التكاليف", primary: "Kaizen costing continuous improvement small steps cumulative" },
                { name: "إنتاج Lean: القضاء على الهدر وتحسين التدفق", primary: "lean manufacturing waste elimination value stream mapping" },
                { name: "Six Sigma في تخفيض التكاليف: المنهج المعياري", primary: "Six Sigma DMAIC cost reduction quality improvement" },
                { name: "تكاليف الاستدامة كميزة تنافسية: الكفاءة البيئية", primary: "sustainability cost advantage energy efficiency environmental" },
                { name: "مقارنة تكاليف التوريد: التجميع داخلياً أم استيراد", primary: "supply cost benchmark internal manufacturing vs import" },
                { name: "تقرير إدارة التكاليف الاستراتيجي: الرؤية الكاملة", primary: "strategic cost management report comprehensive view insights" }
              ]
            },
            {
              unit_index: 4, code: "3.3.4",
              name: "التخطيط الاستراتيجي المالي طويل الأمد",
              goal: "إتقان إعداد الخطط المالية الاستراتيجية طويلة الأمد وربطها بالأهداف المؤسسية",
              key_concepts: ["Long-Range Planning","10-Year Financial Plan","Strategic Scenarios","Growth Capital","Dividend Policy"],
              lessons: [
                { name: "الخطة المالية طويلة الأمد: 5 إلى 10 سنوات", primary: "long-range financial plan 5-10 years strategic horizon" },
                { name: "افتراضات الكلي: النمو والتضخم وأسعار السوق", primary: "macro assumptions GDP inflation interest exchange rates" },
                { name: "نمذجة السيناريوهات: بناء مستقبلات متعددة", primary: "scenario modeling multiple futures planning uncertainty" },
                { name: "تمويل النمو: الهيكل المالي للتوسع طويل الأمد", primary: "growth financing optimal structure long-term expansion" },
                { name: "سياسة توزيع الأرباح: التوازن بين النمو والعوائد", primary: "dividend policy growth vs returns payout signals" },
                { name: "تخطيط رأس المال العامل مع النمو: تحدي التمويل", primary: "working capital planning growth challenge funding gap" },
                { name: "الميزانية الرأسمالية طويلة الأمد: الأولويات الكبرى", primary: "long-term capex budget major priorities investment roadmap" },
                { name: "الانتقال الأجياليّ: الخطة المالية للشركات العائلية", primary: "generational transition family company long-term financial" },
                { name: "مراجعة الخطة الاستراتيجية: السنوي والمتدحرج", primary: "strategic plan review annual rolling refresh update" }
              ]
            },
            {
              unit_index: 5, code: "3.3.5",
              name: "قياس العائد على رأس المال المستثمر",
              goal: "إتقان قياس وتحليل العائد على رأس المال المستثمر كمؤشر أساسي لخلق القيمة",
              key_concepts: ["ROIC","Invested Capital","NOPAT","Economic Spread","Value Drivers","ROIC Tree"],
              lessons: [
                { name: "ROIC: المعيار الذهبي لأداء رأس المال", primary: "ROIC gold standard capital performance calculation components" },
                { name: "NOPAT: الربح التشغيلي بعد الضريبة والتشوهات", primary: "NOPAT net operating profit after tax adjustments ROIC" },
                { name: "رأس المال المستثمر: ما يُستثمر فعلاً في الأعمال", primary: "invested capital operating assets definition exclusions" },
                { name: "الانتشار الاقتصادي: ROIC مقابل WACC", primary: "economic spread ROIC minus WACC positive negative value" },
                { name: "شجرة ROIC: تشريح المؤشر لمكوناته", primary: "ROIC tree decomposition margin turnover operating working" },
                { name: "ROIC بالقطاع: من تخفض تكاليف ومن تُعظّم إيراد", primary: "ROIC sector comparison asset light heavy margin turn" },
                { name: "تحسين ROIC: الاستراتيجيات الستة الأساسية", primary: "ROIC improvement six strategies pricing cost efficiency capital" },
                { name: "ROIC في التحليل وقرارات الاستثمار", primary: "ROIC investment analysis due diligence M&A screening" },
                { name: "تقرير ROIC للمساهمين: الشفافية والالتزام", primary: "ROIC shareholder report transparency commitment targets" }
              ]
            },
            {
              unit_index: 6, code: "3.3.6",
              name: "التمويل السلوكي وسلوكيات صانع القرار",
              goal: "فهم التمويل السلوكي وكيف تؤثر التحيزات المعرفية على القرارات المالية والمحاسبية",
              key_concepts: ["Behavioral Finance","Cognitive Biases","Overconfidence","Anchoring","Loss Aversion","Decision Making"],
              lessons: [
                { name: "التمويل السلوكي: الإنسان ليس عقلانياً دائماً", primary: "behavioral finance human irrationality Kahneman Thaler" },
                { name: "التحيز نحو الإفراط بالثقة: خطر المدير واثق جداً", primary: "overconfidence bias CEO management accounting implications" },
                { name: "التثبيت: الرقم الأول يُحكم قبضته على القرار", primary: "anchoring first number dominates subsequent decisions" },
                { name: "تجنب الخسارة: التمسك بالاستثمار الخاسر", primary: "loss aversion sunk cost fallacy bad investment continuation" },
                { name: "تأثير التأطير: نفس الأرقام رواية مختلفة", primary: "framing effect same numbers different presentation decisions" },
                { name: "القطيع في الأسواق المالية: موجات الجشع والخوف", primary: "herding financial markets greed fear bubbles crashes" },
                { name: "التحيز في التنبؤات المالية: التفاؤل المفرط", primary: "forecasting bias optimism management overestimate revenue" },
                { name: "كيف يتخذ المدقق قراراته؟ التحيز في التدقيق", primary: "auditor decision biases anchoring confirmatory information" },
                { name: "التغلب على التحيزات: العمليات والحوكمة كضمانات", primary: "overcoming biases processes governance safeguards systematic" }
              ]
            },
            {
              unit_index: 7, code: "3.3.7",
              name: "تحسين العمليات المالية ورشاقة الوظيفة",
              goal: "تطبيق منهجيات التحسين المستمر على وظيفة المالية لتحقيق الكفاءة والرشاقة",
              key_concepts: ["Finance Process Optimization","Lean Finance","Automation","Shared Services","Finance Agility","SLA"],
              lessons: [
                { name: "الوظيفة المالية الرشيقة: الكفاءة دون التنازل عن الجودة", primary: "lean finance efficiency quality agility cost reduction" },
                { name: "رسم خريطة العمليات المالية: تحديد الهدر", primary: "financial process mapping waste identification value stream" },
                { name: "مراكز الخدمات المشتركة: الإقتصاد في الحجم", primary: "shared service centers economies of scale finance efficiency" },
                { name: "أتمتة العمليات المالية: Robotic وAI", primary: "financial automation RPA AI reduce manual effort error" },
                { name: "اتفاقيات مستوى الخدمة: تعاقدية الجودة الداخلية", primary: "service level agreements internal quality contractual SLA" },
                { name: "قياس إنتاجية الفريق المالي: المقاييس الصحيحة", primary: "finance team productivity metrics right KPIs benchmarking" },
                { name: "التدريب المتقاطع وبناء المرونة في الفريق", primary: "cross-training resilience flexibility finance team backup" },
                { name: "إغلاق الفترة بسرعة: من أسبوعين ليومين", primary: "period close acceleration two weeks to two days process" },
                { name: "التحسين المستمر في المالية: ثقافة Kaizen", primary: "continuous improvement finance Kaizen culture feedback loop" }
              ]
            },
            {
              unit_index: 8, code: "3.3.8",
              name: "الشراكة المالية مع الأقسام غير المالية",
              goal: "إتقان أسلوب الشراكة المالية مع إدارات المبيعات والتشغيل والتقنية لدعم قراراتها",
              key_concepts: ["Business Partnering","Sales Finance","Operations Finance","Tech Finance","Decision Support","Translation"],
              lessons: [
                { name: "الشريك المالي: المترجم بين لغة الأرقام والعمليات", primary: "business partner translator numbers operations language bridge" },
                { name: "الشراكة مع المبيعات: تحليل الربحية والتسعير", primary: "sales partnership profitability pricing customer analysis" },
                { name: "الشراكة مع التشغيل: تكاليف الإنتاج والكفاءة", primary: "operations partnership production costs efficiency absorption" },
                { name: "الشراكة مع التقنية: ROI الاستثمار التقني", primary: "technology partnership IT ROI investment justification" },
                { name: "الشراكة مع التسويق: ربحية الحملات والقنوات", primary: "marketing partnership campaign profitability channel ROI" },
                { name: "الشراكة مع الموارد البشرية: تكلفة الإنتاجية", primary: "HR partnership cost per hire productivity turnover cost" },
                { name: "لغة التحليل للمدير غير المالي: التبسيط الذكي", primary: "non-financial manager analysis language simplification clarity" },
                { name: "قيادة ورش العمل المالية متعددة التخصصات", primary: "financial workshops cross-functional facilitation skills" },
                { name: "بناء الثقة: كيف يصبح المالي مستشاراً موثوقاً؟", primary: "building trust financial advisor trusted counselor influence" }
              ]
            },
            {
              unit_index: 9, code: "3.3.9",
              name: "قيادة التحول المالي الرقمي",
              goal: "قيادة مبادرات التحول الرقمي في وظيفة المالية من الرؤية إلى التنفيذ إلى القياس",
              key_concepts: ["Digital Transformation Finance","Technology Roadmap","Change Leadership","ROI of Finance Tech","Data Strategy"],
              lessons: [
                { name: "رؤية التحول الرقمي للوظيفة المالية", primary: "digital transformation finance vision future state roadmap" },
                { name: "خارطة الطريق التقنية: التسلسل والأولويات", primary: "technology roadmap sequencing priorities quick wins long-term" },
                { name: "قيادة التغيير: الناس قبل التقنية", primary: "change leadership people before technology culture adoption" },
                { name: "استراتيجية البيانات: من بيانات خاملة لأصول حية", primary: "data strategy dormant to active assets governance quality" },
                { name: "اختيار التقنيات: ERP وBI وAI وSaaS", primary: "technology selection ERP BI AI SaaS evaluation criteria" },
                { name: "عائد استثمار التحول الرقمي: الحالة التجارية", primary: "ROI digital transformation business case quantification" },
                { name: "قياس نجاح التحول: الأثر على الجودة والسرعة", primary: "transformation success measurement quality speed impact" },
                { name: "الاستدامة: كيف نُثبّت المكاسب ونمنع الارتداد؟", primary: "sustainability embedding gains preventing relapse behavior" },
                { name: "الوظيفة المالية للمستقبل: من أنا بعد 10 سنوات؟", primary: "future finance function accountant role 10 years ahead" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "إعداد التقارير المتكاملة والاستدامة",
          goal: "إتقان إعداد التقارير المتكاملة وقياس رأس المال الشامل وإدارة الإفصاح البيئي والاجتماعي والحوكمة",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "3.4.1",
              name: "الإطار الدولي للتقارير المتكاملة IIRC",
              goal: "إتقان الإطار الدولي للتقارير المتكاملة وتطبيق مفاهيمه في إعداد التقارير الشاملة",
              key_concepts: ["Integrated Reporting","Six Capitals","Value Creation Process","Connectivity","Materiality","IIRC"],
              lessons: [
                { name: "التقرير المتكامل: ما وراء القوائم المالية", primary: "integrated report beyond financial statements holistic view" },
                { name: "رؤوس الأموال الستة: أشكال القيمة المتعددة", primary: "six capitals financial manufactured human intellectual social natural" },
                { name: "عملية خلق القيمة: المدخلات والأنشطة والنتائج", primary: "value creation process inputs activities outputs outcomes" },
                { name: "الترابط: ربط كل عناصر التقرير ببعضها", primary: "connectivity linking all report elements to each other" },
                { name: "المادية في التقرير المتكامل: ما الجوهري؟", primary: "materiality integrated report significant issues stakeholders" },
                { name: "التفكير المتكامل: ثقافة قبل تقرير", primary: "integrated thinking culture before report management behavior" },
                { name: "المقارنة بين IIRC وGRI وSASB: أيٌّ نختار؟", primary: "IIRC GRI SASB comparison framework selection" },
                { name: "التقرير المتكامل في الممارسة: أمثلة عالمية", primary: "integrated reporting practice global examples analysis" },
                { name: "بناء تقرير متكامل أول: الخطوات والتحديات", primary: "first integrated report building steps challenges readiness" }
              ]
            },
            {
              unit_index: 2, code: "3.4.2",
              name: "قياس وإعداد تقارير ESG",
              goal: "إتقان قياس مؤشرات ESG وإعداد تقارير الاستدامة وفق المعايير الدولية الرائدة",
              key_concepts: ["ESG Metrics","GRI Standards","SASB","Carbon Accounting","Social Metrics","Governance Disclosure"],
              lessons: [
                { name: "معايير GRI: الإطار الأشمل لتقارير الاستدامة", primary: "GRI Global Reporting Initiative standards framework modules" },
                { name: "معايير SASB: الصناعية المتخصصة للمستثمرين", primary: "SASB industry-specific standards investor focused metrics" },
                { name: "قياس الكربون: النطاق 1 و2 و3 والوحدات", primary: "carbon measurement scope 1 2 3 emissions units reporting" },
                { name: "محاسبة الكربون: كيف تُسجّل الانبعاثات مالياً؟", primary: "carbon accounting recording emissions financial statements" },
                { name: "مؤشرات الاستدامة الاجتماعية: العمالة والمجتمع", primary: "social sustainability metrics labor community wellbeing" },
                { name: "مؤشرات الحوكمة: الشفافية والمساءلة والتنوع", primary: "governance metrics transparency accountability diversity board" },
                { name: "التحقق من تقارير ESG: ضمان المصداقية", primary: "ESG report assurance limited reasonable third party" },
                { name: "ربط ESG بالأداء المالي: هل تؤثر الاستدامة؟", primary: "ESG financial performance link sustainability premium" },
                { name: "التقرير المتكامل مع ESG: الدمج الشامل", primary: "ESG integrated report merging comprehensive disclosure" }
              ]
            },
            {
              unit_index: 3, code: "3.4.3",
              name: "المحاسبة البيئية وتسعير الطبيعة",
              goal: "فهم وتطبيق المحاسبة البيئية الشاملة من محاسبة الكربون إلى تقييم الخدمات البيئية",
              key_concepts: ["Environmental Accounting","Natural Capital","Ecosystem Services","Carbon Tax","Environmental Liabilities"],
              lessons: [
                { name: "المحاسبة البيئية: وضع قيمة على ما لا يُثمَّن", primary: "environmental accounting valuing natural priceless ecosystem" },
                { name: "رأس المال الطبيعي: الأصول البيئية في الميزانية", primary: "natural capital ecosystem services balance sheet accounting" },
                { name: "محاسبة الكربون الداخلية: سعر الكربون الداخلي", primary: "internal carbon accounting internal carbon price shadow" },
                { name: "ضريبة الكربون والتجارة بالانبعاثات: الأثر المحاسبي", primary: "carbon tax emissions trading ETS accounting treatment" },
                { name: "المسؤولية البيئية: التزامات الإزالة وإعادة التأهيل", primary: "environmental liability restoration rehabilitation provisions" },
                { name: "التنوع البيولوجي: المحاسبة عن الخسارة والاسترداد", primary: "biodiversity accounting loss mitigation recovery measurement" },
                { name: "تقرير رأس المال الطبيعي: الإطار والمنهجية", primary: "natural capital reporting framework methodology assessment" },
                { name: "نماذج تسعير الموارد الطبيعية في المشاريع", primary: "natural resource pricing models projects environmental impact" },
                { name: "التزامات المناخ في التقارير المالية: TCFD", primary: "climate commitments financial disclosures TCFD scenario" }
              ]
            },
            {
              unit_index: 4, code: "3.4.4",
              name: "رأس المال الاجتماعي والبشري",
              goal: "قياس رأس المال الاجتماعي والبشري وإدراجه في التقارير المتكاملة بشكل ذي معنى",
              key_concepts: ["Human Capital","Social Capital","Wellbeing","Diversity","Employee Value","Community Impact"],
              lessons: [
                { name: "رأس المال البشري: الأصل الذي يمشي على قدمين", primary: "human capital most valuable asset walking out door" },
                { name: "قياس رأس المال البشري: المؤشرات والأدوات", primary: "human capital measurement KPIs training retention engagement" },
                { name: "الإنتاجية الاجتماعية للموظف: القيمة المُضافة لكل فرد", primary: "revenue per employee productivity ratio human capital ROI" },
                { name: "تقييم تأثير التدريب: ROI التطوير البشري", primary: "training ROI learning development impact Kirkpatrick" },
                { name: "التنوع والشمول: الأثر على الأداء والابتكار", primary: "diversity inclusion performance innovation metrics reporting" },
                { name: "رأس المال الاجتماعي: شبكات الثقة والتعاون", primary: "social capital trust networks cooperation organizational" },
                { name: "تأثير المجتمع: قياس الأثر المحلي للمنشأة", primary: "community impact measurement local employment tax social" },
                { name: "سعادة الموظف كمؤشر قيادي للأداء المالي", primary: "employee wellbeing leading indicator financial performance" },
                { name: "إعداد تقرير رأس المال البشري والاجتماعي", primary: "human social capital reporting integrated disclosure" }
              ]
            },
            {
              unit_index: 5, code: "3.4.5",
              name: "رأس المال الفكري والتقنولوجي",
              goal: "قياس وإدارة رأس المال الفكري والتقني وعلاقته بالميزة التنافسية والقيمة المستقبلية",
              key_concepts: ["Intellectual Capital","Innovation Capital","Data Assets","Brand Value","IP Valuation","Knowledge Management"],
              lessons: [
                { name: "رأس المال الفكري: ما لا تُظهره الميزانية التقليدية", primary: "intellectual capital hidden balance sheet intangible drivers" },
                { name: "رأس مال الابتكار: قياس مدخلات ومخرجات البحث", primary: "innovation capital R&D input output patents products" },
                { name: "قيمة العلامة التجارية: الأصل غير المرئي الأكبر", primary: "brand value intangible asset measurement Interbrand Kantar" },
                { name: "بيانات المنشأة كأصل: التقييم والإدارة والحماية", primary: "data as asset valuation management protection strategy" },
                { name: "الملكية الفكرية: القيمة والإطفاء والحماية", primary: "intellectual property valuation amortization protection licensing" },
                { name: "إدارة المعرفة: التقاط المعرفة المؤسسية وتعزيزها", primary: "knowledge management organizational capture codify share" },
                { name: "رأس مال العلاقات: شبكة الموردين والعملاء والشركاء", primary: "relational capital supplier customer partner network value" },
                { name: "قياس رأس المال الفكري: طرق Skandia وIC-dVAL", primary: "IC measurement Skandia IC-dVAL methods frameworks" },
                { name: "إعداد تقرير رأس المال الفكري: الإفصاح والشفافية", primary: "intellectual capital report disclosure transparency investors" }
              ]
            },
            {
              unit_index: 6, code: "3.4.6",
              name: "قوانين الحوكمة وإعداد تقارير الالتزام",
              goal: "إتقان متطلبات الإفصاح عن الحوكمة وإعداد تقارير الامتثال للشركات المدرجة وغيرها",
              key_concepts: ["Governance Reporting","Comply or Explain","Directors Remuneration","Related Parties","Narrative Reporting"],
              lessons: [
                { name: "إعداد تقارير الحوكمة: ما يُطلبه المنظِّم", primary: "governance reporting regulatory requirements listed companies" },
                { name: "مبدأ الامتثال أو التفسير: المرونة والشفافية", primary: "comply or explain principle flexibility transparency governance" },
                { name: "الإفصاح عن مكافآت المديرين: الشفافية والعدالة", primary: "directors remuneration disclosure pay ratio transparency" },
                { name: "تقرير الأطراف ذات العلاقة: الصفقات والأسعار", primary: "related party transactions report arms length governance" },
                { name: "التقرير السردي: الربط بين الاستراتيجية والأداء", primary: "narrative reporting strategy performance link UK Companies Act" },
                { name: "بيان ممارسات الحوكمة: الإطار والمحتوى", primary: "corporate governance statement practices content framework" },
                { name: "إعداد تقرير حوكمة شركة اليمن والخليج: الواقع", primary: "Yemen Gulf governance report reality requirements local" },
                { name: "الرقابة الخارجية: دور هيئات الأوراق المالية", primary: "external oversight securities authorities role monitoring" },
                { name: "مستقبل إعداد تقارير الحوكمة: CSRD والمتطلبات الجديدة", primary: "future governance reporting CSRD European new requirements" }
              ]
            },
            {
              unit_index: 7, code: "3.4.7",
              name: "معايير الاستدامة ISSB: S1 وS2",
              goal: "إتقان متطلبات معيار ISSB للاستدامة S1 وS2 وتطبيقه في إعداد التقارير المالية المتعلقة بالمناخ",
              key_concepts: ["ISSB","IFRS S1","IFRS S2","Climate Risk","Scenario Analysis","Physical Transition Risk"],
              lessons: [
                { name: "ISSB: لماذا ظهر مجلس معايير الاستدامة الدولي؟", primary: "ISSB why established sustainability investor decision making" },
                { name: "IFRS S1: متطلبات الإفصاح العامة للاستدامة", primary: "IFRS S1 general sustainability disclosure requirements" },
                { name: "IFRS S2: متطلبات الإفصاح عن المناخ", primary: "IFRS S2 climate related disclosures risks opportunities" },
                { name: "مخاطر المناخ الفيزيائية والانتقالية: القياس", primary: "physical transition climate risks measurement quantification" },
                { name: "تحليل السيناريو المناخي: 1.5 و2 و3 درجات", primary: "climate scenario analysis 1.5 2 3 degrees warming" },
                { name: "فرص المناخ: كيف تستفيد المنشأة من التحول الأخضر", primary: "climate opportunities green transition benefits business" },
                { name: "دمج ISSB في التقارير الموجودة: مراحل التطبيق", primary: "ISSB integration existing reports phased implementation" },
                { name: "التحقق من تقارير ISSB: من يُصادق على البيانات؟", primary: "ISSB report verification who assures climate data" },
                { name: "ISSB في السياق العربي واليمني: التطبيق العملي", primary: "ISSB Arab Yemen context practical application challenges" }
              ]
            },
            {
              unit_index: 8, code: "3.4.8",
              name: "التقرير السنوي الشامل: الممارسة الاحترافية",
              goal: "إتقان إعداد التقرير السنوي الاحترافي الذي يجمع الأداء المالي والاستدامة والحوكمة والاستراتيجية",
              key_concepts: ["Annual Report Excellence","Story of Value","Design","Conciseness","Credibility","Award Quality"],
              lessons: [
                { name: "التقرير السنوي المتميز: الفائز بالجوائز الدولية", primary: "award winning annual report characteristics quality benchmark" },
                { name: "رواية القيمة: الخيط الجامع لكل التقرير", primary: "value story thread connecting all report sections coherent" },
                { name: "رسالة الرئيس التنفيذي: الصدق والطموح والمسؤولية", primary: "CEO letter honesty ambition accountability personal" },
                { name: "تقرير الإدارة MD&A: التعمق والتوازن", primary: "MD&A depth balance transparency challenges opportunities" },
                { name: "قسم الاستدامة المتكامل: ليس ملحقاً بل جزء", primary: "sustainability section integrated not appendix core part" },
                { name: "تصميم التقرير: الجماليات خدمة المحتوى", primary: "report design aesthetics serving content infographics" },
                { name: "الإيجاز: كيف تقول أكثر بكلمات أقل؟", primary: "conciseness say more fewer words clarity impact" },
                { name: "مراجعة التقرير: القانون والامتثال والدقة", primary: "report review legal compliance accuracy fact checking" },
                { name: "إصدار التقرير: القنوات والتوقيت وإدارة الانطباعات", primary: "report release channels timing impression management" }
              ]
            },
            {
              unit_index: 9, code: "3.4.9",
              name: "مستقبل إعداد التقارير المالية والاستدامة",
              goal: "استشراف مستقبل إعداد التقارير المالية في ضوء التطورات التنظيمية والتقنية المتسارعة",
              key_concepts: ["Future Reporting","Real-Time","Digital-First","AI Generation","Blockchain Verification","Integrated Data"],
              lessons: [
                { name: "التقارير الآنية: من السنوي للمستمر الفوري", primary: "real-time reporting annual to continuous live data" },
                { name: "XBRL والتقارير الهيكلية: القراءة الآلية", primary: "XBRL structured data machine readable automated analysis" },
                { name: "الذكاء الاصطناعي في توليد التقارير: الفرص والمخاطر", primary: "AI report generation opportunities risks quality control" },
                { name: "التحقق بـBlockchain: مصداقية لا تُطعن فيها", primary: "blockchain verification unquestionable credibility audit trail" },
                { name: "التقارير الرقمية أولاً: من ورق لتجربة تفاعلية", primary: "digital-first reports paper to interactive experience investor" },
                { name: "توحيد معايير الاستدامة: السباق نحو إطار واحد", primary: "sustainability standards convergence single framework global" },
                { name: "المشاركة التفاعلية للمستثمرين في التقارير", primary: "investor interactive engagement drill-down real-time data" },
                { name: "التقرير الذاتي المبسّط للمنشآت الصغيرة: XBRL-lite", primary: "small entity simplified digital reporting XBRL-lite SME" },
                { name: "دور المحاسب في عالم التقارير المتطور: التطور الضروري", primary: "accountant role evolving reporting world necessary adaptation" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "محاسبة القطاع العام والمنظمات",
          goal: "إتقان محاسبة القطاع العام والمنظمات غير الربحية وتطبيق معايير IPSAS والرقابة المالية الحكومية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "3.5.1",
              name: "معايير IPSAS وتطبيقاتها",
              goal: "إتقان معايير المحاسبة الدولية للقطاع العام IPSAS وتطبيقها في البيئات الحكومية",
              key_concepts: ["IPSAS","Government Accounting","Accrual Basis Public","IFRS Alignment","Public Entities"],
              lessons: [
                { name: "IPSAS: لماذا تختلف عن IFRS في الحكومة؟", primary: "IPSAS why different IFRS government public accountability" },
                { name: "IPSAS 1: عرض القوائم المالية للقطاع العام", primary: "IPSAS 1 presentation financial statements public sector" },
                { name: "IPSAS 17: الأصول الثابتة الحكومية ومعالجتها", primary: "IPSAS 17 property plant equipment government sector" },
                { name: "IPSAS 23: إيرادات غير التبادل: الضرائب والمنح", primary: "IPSAS 23 non-exchange revenue taxes grants transfers" },
                { name: "IPSAS 25: مزايا الموظفين في القطاع العام", primary: "IPSAS 25 employee benefits public sector pension" },
                { name: "IPSAS على أساس نقدي: للحكومات غير المستعدة", primary: "IPSAS cash basis starting point transition path" },
                { name: "التحول من النقدي للاستحقاق في القطاع العام", primary: "cash to accrual transition government challenges strategy" },
                { name: "تطبيق IPSAS في اليمن: الواقع والطموح", primary: "IPSAS Yemen application reality ambition challenges" },
                { name: "حوكمة القطاع العام: المساءلة والشفافية", primary: "public sector governance accountability transparency IPSAS" }
              ]
            },
            {
              unit_index: 2, code: "3.5.2",
              name: "ميزانية الدولة والتخطيط المالي الحكومي",
              goal: "فهم إعداد وتنفيذ ورقابة ميزانية الدولة كأداة رئيسية للسياسة المالية والاقتصادية",
              key_concepts: ["State Budget","MTEF","Budget Classification","Budget Execution","Fiscal Policy","Debt Management"],
              lessons: [
                { name: "السياسة المالية: الميزانية كأداة تدخل حكومي", primary: "fiscal policy budget government intervention stimulus" },
                { name: "دورة إعداد الميزانية الحكومية: المراحل والأطراف", primary: "budget cycle preparation phases parliament ministry finance" },
                { name: "الإطار المالي متوسط الأجل MTEF: التخطيط لثلاث سنوات", primary: "medium term expenditure framework MTEF three year plan" },
                { name: "تصنيف الميزانية: الاقتصادي والوظيفي والبرامجي", primary: "budget classification economic functional programmatic GFS" },
                { name: "تنفيذ الميزانية: من الاعتماد للصرف الفعلي", primary: "budget execution appropriation commitment payment cycle" },
                { name: "الرقابة على الميزانية: الديوان والبرلمان والداخلية", primary: "budget control audit court parliament internal review" },
                { name: "إدارة الدين العام: الاستدامة والمخاطر", primary: "public debt management sustainability risks debt indicators" },
                { name: "ميزانية يمن: التحديات في سياق الحرب", primary: "Yemen budget challenges conflict financing humanitarian" },
                { name: "التقارير المالية الحكومية: الشفافية والمساءلة", primary: "government financial reports transparency accountability IMF" }
              ]
            },
            {
              unit_index: 3, code: "3.5.3",
              name: "المحاسبة في المنظمات غير الربحية",
              goal: "إتقان المعالجة المحاسبية الخاصة بالمنظمات غير الربحية والجمعيات الخيرية والجمعيات التعاونية",
              key_concepts: ["Non-Profit Accounting","Restricted Funds","Donor Reporting","Charity Law","NPO Governance"],
              lessons: [
                { name: "المنظمات غير الربحية: الأهداف المختلفة والمحاسبة الخاصة", primary: "non-profit organizations different objectives special accounting" },
                { name: "تصنيف الموارد: المقيدة وغير المقيدة المؤقتة والدائمة", primary: "net assets classification restricted unrestricted permanently" },
                { name: "محاسبة التبرعات والمنح: الاعتراف والإبلاغ", primary: "donations grants accounting recognition reporting conditions" },
                { name: "إعداد تقارير الجهات المانحة: المتطلبات الخاصة", primary: "donor reporting requirements financial accountability NGO" },
                { name: "الكفاءة التشغيلية للمنظمات الخيرية: قياسها", primary: "charity operational efficiency program expense ratio" },
                { name: "حوكمة المنظمات غير الربحية: مجلس الأمناء", primary: "NPO governance board trustees fiduciary responsibility" },
                { name: "التدقيق في الجمعيات الخيرية: الاعتبارات الخاصة", primary: "charity audit special considerations compliance grant" },
                { name: "محاسبة المنظمات الدولية: الأمم المتحدة والبنك الدولي", primary: "international organizations UN World Bank accounting IPSAS" },
                { name: "المنظمات في اليمن: التحديات والمساءلة", primary: "Yemen NGO challenges accountability transparency donors" }
              ]
            },
            {
              unit_index: 4, code: "3.5.4",
              name: "الديوان العام للمحاسبة ورقابة الإنفاق",
              goal: "فهم دور الديوان العام للمحاسبة وأساليب الرقابة على الإنفاق الحكومي وتحقيق المساءلة",
              key_concepts: ["Supreme Audit Institution","Performance Audit","Compliance Audit","Public Accountability","SAI Independence"],
              lessons: [
                { name: "الديوان العام للمحاسبة: الحارس المستقل للمال العام", primary: "supreme audit institution SAI independent guardian public" },
                { name: "التدقيق على الأداء: الاقتصاد والكفاءة والفعالية 3Es", primary: "performance audit economy efficiency effectiveness 3Es government" },
                { name: "التدقيق على الامتثال: الالتزام بالقوانين واللوائح", primary: "compliance audit laws regulations rules government procurement" },
                { name: "المشتريات الحكومية: اللوائح ومكافحة الفساد", primary: "government procurement regulations anti-corruption transparency" },
                { name: "مكافحة الفساد المالي: الديوان كأداة وقائية", primary: "financial corruption prevention SAI oversight accountability" },
                { name: "استقلالية الديوان: الشرط الأساسي للفعالية", primary: "SAI independence essential effectiveness Mexico declaration" },
                { name: "التقرير للبرلمان: المساءلة السياسية والمالية", primary: "reporting parliament political financial accountability public" },
                { name: "الديوان في اليمن: الواقع والإصلاحات المطلوبة", primary: "Yemen supreme audit institution current state reforms needed" },
                { name: "التعاون الدولي بين الديوانات: INTOSAI والإقليمي", primary: "international SAI cooperation INTOSAI ARABOSAI regional" }
              ]
            },
            {
              unit_index: 5, code: "3.5.5",
              name: "الشراكة بين القطاعين العام والخاص PPP",
              goal: "فهم الجوانب المالية والمحاسبية للشراكات بين القطاعين العام والخاص وكيفية توزيع المخاطر",
              key_concepts: ["PPP","IFRIC 12","Concession","Risk Sharing","Value for Money","Financial Models"],
              lessons: [
                { name: "الشراكة العام والخاص: نموذج التمويل المختلط", primary: "PPP public private partnership mixed financing model" },
                { name: "أنواع الشراكة: BOT وDBFO وPFI وغيرها", primary: "PPP types BOT DBFO PFI concession management contract" },
                { name: "IFRIC 12: محاسبة عقود الامتياز", primary: "IFRIC 12 service concession arrangements accounting treatment" },
                { name: "توزيع المخاطر: من يتحمل ماذا في PPP", primary: "risk allocation construction operation demand technology" },
                { name: "تقييم القيمة مقابل المال: هل PPP أجدى؟", primary: "value for money assessment PPP vs traditional procurement" },
                { name: "النمذجة المالية لعقود PPP: المقاييس والمتطلبات", primary: "PPP financial model NPV IRR equity return bankability" },
                { name: "التمويل الحكومي في PPP: المنحة والضمانات", primary: "government support grant viability gap guarantee PPP" },
                { name: "الرصد والإدارة طوال عمر العقد: 25 إلى 30 سنة", primary: "PPP contract monitoring management 25-30 years lifecycle" },
                { name: "تجارب PPP في اليمن والخليج: الدروس المستفادة", primary: "PPP Yemen GCC experiences lessons utilities transport" }
              ]
            },
            {
              unit_index: 6, code: "3.5.6",
              name: "الزكاة والمالية الإسلامية في المحاسبة",
              goal: "إتقان الجوانب المحاسبية للتمويل الإسلامي وحساب الزكاة والإفصاح الشرعي في التقارير المالية",
              key_concepts: ["Zakat Accounting","AAOIFI","Islamic Finance Products","Murabaha","Sukuk Accounting","Sharia Disclosure"],
              lessons: [
                { name: "المحاسبة الإسلامية: الأهداف والفلسفة والمعايير", primary: "Islamic accounting objectives philosophy AAOIFI standards" },
                { name: "معيار AAOIFI 9: الزكاة وأسس الحساب", primary: "AAOIFI standard 9 zakat calculation basis zakatable assets" },
                { name: "الأموال الزكوية: كيف تُحسب وتُسجَّل؟", primary: "zakat funds calculation recording disclosure financial report" },
                { name: "المرابحة: بيع المؤجل وتسجيله وإفصاحه", primary: "murabaha deferred sale accounting recognition disclosure" },
                { name: "الإجارة الإسلامية: الإيجار وفق معايير AAOIFI", primary: "Islamic lease ijarah AAOIFI accounting vs IFRS 16" },
                { name: "المشاركة والمضاربة: الشراكة ومحاسبتها", primary: "musharaka mudaraba partnership profit loss sharing" },
                { name: "الصكوك: المحاسبة الكاملة عبر دورة حياتها", primary: "sukuk complete accounting lifecycle issuance redemption" },
                { name: "الرقابة الشرعية: دور هيئة الفتوى والرقابة", primary: "sharia supervisory board review role compliance disclosure" },
                { name: "تقارير البنوك الإسلامية: ما يختلف عن التقليدية", primary: "Islamic bank reports differences AAOIFI IFRS treatment" }
              ]
            },
            {
              unit_index: 7, code: "3.5.7",
              name: "محاسبة قطاع النفط والغاز والتعدين",
              goal: "إتقان الجوانب المحاسبية الخاصة بقطاع النفط والغاز والتعدين من الاستكشاف إلى الإنتاج",
              key_concepts: ["Oil Gas Accounting","IFRS 6","Exploration Costs","Reserves","Depletion","Decommissioning"],
              lessons: [
                { name: "خصوصية المحاسبة في النفط والغاز والتعدين", primary: "oil gas mining accounting unique characteristics upstream" },
                { name: "IFRS 6: تكاليف الاستكشاف والتقييم", primary: "IFRS 6 exploration evaluation assets accounting treatment" },
                { name: "طريقة المجهود الكامل مقابل الجهود الناجحة", primary: "full cost vs successful efforts method exploration costs" },
                { name: "احتياطيات النفط: التصنيف والأهمية المحاسبية", primary: "oil reserves classification proved probable possible significance" },
                { name: "الاستنزاف والإطفاء والاستهلاك: DD&A في القطاع", primary: "depletion depreciation amortization DD&A oil gas unit production" },
                { name: "مخصص التخلي من الموقع: تكلفة النهاية", primary: "decommissioning provision abandonment cost provision IAS 37" },
                { name: "عقود المشاركة في الإنتاج PSA: المحاسبة الخاصة", primary: "production sharing agreement PSA accounting cost recovery" },
                { name: "الإفصاح في شركات النفط: احتياطيات وتكاليف", primary: "oil company disclosure reserves cost finding financial" },
                { name: "قطاع النفط اليمني: خصائص ومحاسبة وتحديات", primary: "Yemen oil sector characteristics accounting challenges" }
              ]
            },
            {
              unit_index: 8, code: "3.5.8",
              name: "محاسبة البنوك والتأمين: المتقدمة",
              goal: "إتقان المعالجة المحاسبية المتقدمة لقطاعي البنوك والتأمين مع مراعاة التنظيم الخاص بهما",
              key_concepts: ["Advanced Bank Accounting","IFRS 17","Insurance Contracts","GMM","PAA","BBA"],
              lessons: [
                { name: "البنوك والتأمين: القطاعان الأكثر تعقيداً محاسبياً", primary: "banks insurance most complex accounting sectors regulation" },
                { name: "IFRS 17: الثورة في محاسبة عقود التأمين", primary: "IFRS 17 insurance contracts revolution accounting comprehensive" },
                { name: "نموذج القياس العام GMM: قلب IFRS 17", primary: "GMM general measurement model building block approach IFRS 17" },
                { name: "نهج تخصيص القسط PAA: المبسّط للتأمين القصير", primary: "PAA premium allocation approach short duration simplified" },
                { name: "نهج إعادة التأمين المتغير VFA: التأمين على الحياة", primary: "VFA variable fee approach life insurance participating" },
                { name: "هامش الخدمة التعاقدية CSM: الربح المستقبلي", primary: "CSM contractual service margin future profit recognition" },
                { name: "محاسبة رأس المال التنظيمي في البنوك: Basel III", primary: "bank regulatory capital Basel III Tier 1 2 CET1 accounting" },
                { name: "محاسبة الضمانات والأوراق المالية في البنوك", primary: "bank collateral securities repo reverse accounting treatment" },
                { name: "تقارير الاحترازية: ما يُقدَّم للبنك المركزي", primary: "prudential reporting central bank regulatory submission" }
              ]
            },
            {
              unit_index: 9, code: "3.5.9",
              name: "مشاريع نهاية المستوى الثالث: الذروة المهنية",
              goal: "تطبيق كل مهارات المستوى الثالث في مشروع متكامل يُحاكي عمل المحاسب الاحترافي المتمكن",
              key_concepts: ["Level Three Capstone","Professional Peak","Complex Cases","Integrated Skills","Career Readiness"],
              lessons: [
                { name: "مشروع 1: تدقيق مجموعة شركات معقدة", primary: "capstone 1 complex group audit complete cycle delivery" },
                { name: "مشروع 2: تقييم شركة للاستحواذ", primary: "capstone 2 company valuation acquisition due diligence" },
                { name: "مشروع 3: خطة تحول مالي لقطاع حكومي", primary: "capstone 3 government sector financial transformation plan" },
                { name: "مشروع 4: التقرير المتكامل الكامل لشركة", primary: "capstone 4 complete integrated report all capitals" },
                { name: "مشروع 5: نظام إدارة أداء مؤسسة", primary: "capstone 5 enterprise performance management system design" },
                { name: "عرض المشاريع أمام لجنة احترافية", primary: "projects presentation professional committee board simulation" },
                { name: "المراجعة النظيرة وتبادل الخبرات", primary: "peer review experience exchange professional learning" },
                { name: "توثيق المحفظة المهنية: المهارات والإنجازات", primary: "professional portfolio documentation skills achievements career" },
                { name: "الاحتفاء بالإنجاز وإطلاق المسيرة الاحترافية", primary: "celebrating achievement launching professional career CPA ACCA" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "الاستشارات المالية وبناء المشاريع",
          goal: "إتقان الاستشارات المالية وتأسيس المشاريع وقيادة التغيير وتطوير مهارات الأعمال للمحاسب الاحترافي",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "3.6.1",
              name: "الاستشارات المالية: منهجية وأسلوب",
              goal: "إتقان منهجية الاستشارات المالية من تشخيص المشكلة إلى تقديم الحلول وإدارة تنفيذها",
              key_concepts: ["Financial Consulting","Problem Diagnosis","Hypothesis","Data Analysis","Recommendations","Implementation"],
              lessons: [
                { name: "منهجية الاستشارات: المشكلة والفرضية والتحقق", primary: "consulting methodology problem hypothesis testing MECE" },
                { name: "تشخيص المشكلة المالية: من الأعراض للجذور", primary: "financial problem diagnosis symptoms root cause analysis" },
                { name: "إطار MECE: التفكير المنظم والشامل وغير المتداخل", primary: "MECE mutually exclusive collectively exhaustive thinking" },
                { name: "جمع البيانات وتحليلها في السياق الاستشاري", primary: "data gathering analysis consulting context primary secondary" },
                { name: "إعداد العرض التقديمي للعميل: الإقناع والوضوح", primary: "client presentation persuasion clarity executive decision" },
                { name: "تقديم التوصيات: الجرأة مع الواقعية", primary: "recommendations bold realistic balanced consultant" },
                { name: "إدارة التنفيذ: التحول من التوصية للواقع", primary: "implementation management recommendation to reality change" },
                { name: "بناء علاقة العميل: الثقة والمصداقية المستمرة", primary: "client relationship trust credibility long-term sustainability" },
                { name: "التسعير والتفاوض في الاستشارات المالية", primary: "consulting pricing negotiation value based fee structure" }
              ]
            },
            {
              unit_index: 2, code: "3.6.2",
              name: "إعادة الهيكلة المالية وتحويل الأعمال",
              goal: "إتقان إدارة عمليات إعادة الهيكلة المالية وإنقاذ المنشآت المتعثرة وتحويل مساراتها",
              key_concepts: ["Financial Restructuring","Turnaround","Creditor Negotiation","Cash Stabilization","Business Plan","Distressed"],
              lessons: [
                { name: "التعثر المالي: الأعراض والتشخيص المبكر", primary: "financial distress early symptoms diagnosis cash burn" },
                { name: "خطة التحويل: مئة يوم الأولى في المنشأة المتعثرة", primary: "turnaround plan first 100 days distressed company" },
                { name: "استقرار التدفق النقدي: الإنقاذ الفوري قبل التحول", primary: "cash stabilization immediate rescue before transformation" },
                { name: "التفاوض مع الدائنين: الحلول التفاوضية", primary: "creditor negotiation solutions rescheduling haircut swap" },
                { name: "خطة الأعمال للإنقاذ: الجدية والمصداقية", primary: "business plan rescue credibility banks investors lenders" },
                { name: "إعادة هيكلة الديون: الأدوات والتقنيات", primary: "debt restructuring tools DIP financing covenant waiver" },
                { name: "إعادة هيكلة العمليات: خفض التكاليف وبيع الأصول", primary: "operational restructuring cost reduction asset disposal" },
                { name: "الخروج من التعثر: مقاييس النجاح وإعادة التصنيف", primary: "exit distress success metrics credit rating recovery" },
                { name: "حالة إعادة هيكلة يمنية: التحليل والحلول", primary: "Yemen restructuring case analysis solutions local context" }
              ]
            },
            {
              unit_index: 3, code: "3.6.3",
              name: "تأسيس المشاريع والتخطيط المالي للريادة",
              goal: "بناء خطة مالية متكاملة للمشروع الريادي والحصول على التمويل وإدارة النمو المالي المبكر",
              key_concepts: ["Startup Finance","Business Plan","Burn Rate","Runway","Valuation Startup","Investor Pitch"],
              lessons: [
                { name: "المشروع الريادي: الخصائص المالية المختلفة عن القائمة", primary: "startup financial characteristics different established company" },
                { name: "الخطة المالية للمشروع: الإيرادات والتكاليف والتدفقات", primary: "startup financial plan revenue cost cash flow projections" },
                { name: "معدل الحرق ومدة التشغيل: الوقود قبل المطار", primary: "burn rate runway cash management startup survival" },
                { name: "تقييم المشاريع الريادية: الطرق والمضاعفات الخاصة", primary: "startup valuation methods Berkus scorecard VC method pre-money" },
                { name: "الحصول على التمويل: الملائكة وصناديق الاستثمار", primary: "startup funding angels VCs seed series A B rounds" },
                { name: "العروض أمام المستثمرين: Pitch Deck المالي", primary: "investor pitch deck financial slide unit economics key metrics" },
                { name: "إدارة المالية في مرحلة النمو: الحفاظ على السيولة", primary: "growth stage finance management cash unit economics scaling" },
                { name: "الخروج من الاستثمار: الاستحواذ أو الطرح العام", primary: "investor exit IPO trade sale M&A strategies timing" },
                { name: "المشاريع الريادية في اليمن: الفرص والعقبات المالية", primary: "Yemen startup opportunities financial obstacles ecosystem" }
              ]
            },
            {
              unit_index: 4, code: "3.6.4",
              name: "التحليل المالي للصناعة والقطاعات",
              goal: "إجراء تحليل مالي متخصص للصناعات المختلفة واستخراج الأفكار الاستراتيجية لدعم القرار",
              key_concepts: ["Industry Analysis","Porter Five Forces","Competitive Position","Market Sizing","Profitability Pool"],
              lessons: [
                { name: "قوى بورتر الخمس: الربحية في الصناعة", primary: "Porter five forces industry profitability competitive analysis" },
                { name: "مجمعات الربحية: أين تتمركز الأرباح في الصناعة؟", primary: "profitability pools where profit concentrates industry value chain" },
                { name: "الموقع التنافسي: كيف تُقيّم ميزة الشركة النسبية؟", primary: "competitive position relative advantage measurement financial" },
                { name: "تحديد حجم السوق: من الأعلى والأسفل", primary: "market sizing top-down bottom-up TAM SAM SOM" },
                { name: "تحليل الحصة السوقية والاتجاهات: النمو والانحدار", primary: "market share analysis trends growth decline strategic" },
                { name: "تحليل الكسر والمتطلبات المالية للتوسع القطاعي", primary: "sector expansion financial requirements threshold analysis" },
                { name: "تحليل الاتجاهات الكلية على القطاع: PESTLE", primary: "PESTLE macro trends sector impact financial implications" },
                { name: "التحليل التنافسي المالي المقارن: الخريطة الكاملة", primary: "competitive financial benchmarking complete map sector" },
                { name: "الاستنتاجات الاستراتيجية: من التحليل للتوصية", primary: "strategic conclusions analysis to recommendation professional" }
              ]
            },
            {
              unit_index: 5, code: "3.6.5",
              name: "الاستشارات الضريبية المتخصصة",
              goal: "إتقان تقديم الاستشارات الضريبية المتخصصة في التخطيط والامتثال والنزاعات الضريبية",
              key_concepts: ["Tax Advisory","Tax Planning","Dispute Resolution","Tax Restructuring","International Tax","APA"],
              lessons: [
                { name: "الاستشارة الضريبية: الحد الفاصل بين التخطيط والتهرب", primary: "tax advisory planning evasion avoidance line OECD" },
                { name: "التخطيط الضريبي المؤسسي: الاستراتيجيات المشروعة", primary: "corporate tax planning legitimate strategies structures" },
                { name: "إعادة الهيكلة الضريبية: تغيير الشكل القانوني", primary: "tax restructuring legal form change merger conversion" },
                { name: "الضريبة الدولية: التخطيط عبر الحدود", primary: "international tax cross-border planning transfer pricing" },
                { name: "النزاعات الضريبية: الاعتراض والطعن والتقاضي", primary: "tax disputes objection appeal litigation tax authority" },
                { name: "اتفاقيات التسعير المسبقة: إزالة الغموض الضريبي", primary: "advance pricing agreement APA certainty bilateral multilateral" },
                { name: "الامتثال الضريبي المعقد: الشركات متعددة الأقسام", primary: "complex tax compliance multi-division group consolidated" },
                { name: "مؤتمر العملاء الضريبي: كيف تُقدّم التوصيات؟", primary: "client tax conference recommendation presentation delivery" },
                { name: "بناء ممارسة استشارية ضريبية متخصصة", primary: "tax advisory practice building specialization marketing" }
              ]
            },
            {
              unit_index: 6, code: "3.6.6",
              name: "قيادة الفريق المالي وتطوير القدرات",
              goal: "إتقان قيادة وتطوير الفرق المالية وبناء بيئة عمل تحفّز الأداء والابتكار والتعلم المستمر",
              key_concepts: ["Finance Leadership","Team Development","Coaching","Culture","Succession","Talent"],
              lessons: [
                { name: "أنماط القيادة المالية: من المعالج للمعلم للمحفّز", primary: "financial leadership styles analyzer teacher motivator coach" },
                { name: "بناء الفريق المالي عالي الأداء: الاختيار والتطوير", primary: "high performance finance team selection development culture" },
                { name: "التدريب والإرشاد: الاستثمار في نمو الأعضاء", primary: "coaching mentoring team member growth investment CFO role" },
                { name: "تقييم الأداء الفردي: الموضوعية والتطوير", primary: "individual performance assessment objective development plan" },
                { name: "التخطيط للخلافة: من يقود بعدك؟", primary: "succession planning finance leadership development pipeline" },
                { name: "الاستبقاء والتحفيز: ما يُبقي المواهب المالية", primary: "retention motivation talent financial team what keeps them" },
                { name: "ثقافة الفريق المالي: المبادئ والقيم والسلوكيات", primary: "finance team culture principles values behaviors excellence" },
                { name: "إدارة الأداء الضعيف: الصراحة والمساندة", primary: "managing underperformance direct support conversation plan" },
                { name: "بناء شبكة المهنيين الماليين: الدور الاستراتيجي", primary: "professional network financial professionals strategic career" }
              ]
            },
            {
              unit_index: 7, code: "3.6.7",
              name: "أخلاقيات الاستشارة وإدارة المواقف المعقدة",
              goal: "إتقان التعامل مع المواقف الأخلاقية المعقدة في الاستشارات المالية والتدقيق وبيئة الأعمال",
              key_concepts: ["Advanced Ethics","Whistleblowing","Culture of Integrity","Professional Courage","Moral Framework"],
              lessons: [
                { name: "الشجاعة المهنية: قول الحق في وجه الضغط", primary: "professional courage speaking truth power pressure resist" },
                { name: "الإبلاغ عن المخالفات: القرار الأصعب", primary: "whistleblowing hardest decision protection consequences" },
                { name: "ثقافة النزاهة في المنشأة: من يبنيها؟", primary: "integrity culture organization building leadership role" },
                { name: "صنع القرار الأخلاقي في الغموض: الأطر والأدوات", primary: "ethical decision making ambiguity frameworks tools ethics" },
                { name: "المصلحة العامة مقابل مصلحة العميل: التوازن", primary: "public interest vs client interest balance professional duty" },
                { name: "الإفصاح عن الأخطاء: التصحيح الفوري والصادق", primary: "error disclosure immediate honest correction accountability" },
                { name: "الاحتيال الذي شاهدته: ما مسؤوليتك القانونية؟", primary: "witnessed fraud legal responsibility reporting duty accountant" },
                { name: "حالات من الحياة المهنية الحقيقية: الحلول الصعبة", primary: "real professional life cases difficult solutions ethical" },
                { name: "الإرث الأخلاقي: ما الذي ستُذكر به بعد مسيرتك؟", primary: "ethical legacy professional legacy remembered career values" }
              ]
            },
            {
              unit_index: 8, code: "3.6.8",
              name: "التواصل المهني وبناء السمعة الاحترافية",
              goal: "بناء الحضور المهني والسمعة المحاسبية في السوق من خلال التواصل الرقمي والشبكات المهنية",
              key_concepts: ["Personal Brand","LinkedIn","Thought Leadership","Writing","Speaking","Professional Network"],
              lessons: [
                { name: "العلامة الشخصية للمحاسب: ما يجعلك مختلفاً", primary: "personal brand accountant differentiation unique value" },
                { name: "LinkedIn للمحاسبين: بناء الحضور الرقمي المهني", primary: "LinkedIn accountants professional digital presence optimization" },
                { name: "قيادة الفكر: الكتابة عن المحاسبة للمتخصصين والعامة", primary: "thought leadership accounting writing specialists public" },
                { name: "التحدث أمام الجمهور: ورش العمل والمؤتمرات", primary: "public speaking workshops conferences accountant presence" },
                { name: "بناء الشبكة المهنية: الجودة لا الكمية", primary: "professional network quality relationships mutual value" },
                { name: "الوصاية المهنية: الإرشاد ورد الجميل للمهنة", primary: "professional mentoring giving back to accounting community" },
                { name: "المشاركة في الهيئات المهنية: الانتماء والتأثير", primary: "professional bodies participation membership influence" },
                { name: "البحث العلمي المحاسبي: كيف تُساهم في المعرفة؟", primary: "accounting research contribution knowledge publication academic" },
                { name: "السمعة الاحترافية طويلة الأمد: بناءها وحمايتها", primary: "long-term professional reputation building protecting digital" }
              ]
            },
            {
              unit_index: 9, code: "3.6.9",
              name: "رؤية المحاسب في العالم المتغيّر",
              goal: "تطوير رؤية استراتيجية شخصية للمحاسب في ضوء التغيرات الكبرى في المهنة والاقتصاد العالمي",
              key_concepts: ["Vision","Future Accounting","Global Trends","AI Partnership","Value Creation","Legacy"],
              lessons: [
                { name: "اتجاهات المهنة المحاسبية في العقد القادم", primary: "accounting profession trends next decade megatrends impact" },
                { name: "الذكاء الاصطناعي كشريك لا منافس: إعادة الصياغة", primary: "AI partner not competitor reframing augmentation value add" },
                { name: "المحاسب كصانع قرار لا مُسجّل: التحوّل الجذري", primary: "accountant decision maker not recorder fundamental shift" },
                { name: "الكفاءات المستقبلية: ما لا تفعله الآلة", primary: "future competencies human machine can't judgment creativity" },
                { name: "الاقتصاد اليمني والخليجي: فرص الخمس سنوات القادمة", primary: "Yemen Gulf economy opportunities next five years accounting" },
                { name: "بناء خارطة الطريق المهنية الشخصية للعشر سنوات", primary: "personal career roadmap 10 years steps certifications" },
                { name: "التعلم المستمر: الطريقة التي تبقى بها في المقدمة", primary: "continuous learning staying relevant ahead curve strategy" },
                { name: "القيادة في المهنة: التأثير خارج منشأتك", primary: "leadership in profession influence beyond organization contribution" },
                { name: "الرسالة المهنية: لماذا تختار المحاسبة كمسيرة حياة؟", primary: "professional mission why accounting career life vocation" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "مراجعة شاملة والمشروع الختامي المهني",
          goal: "التتويج الاحترافي لمسيرة المحاسبة بمشروع ختامي يُجمع كل المهارات في رؤية مهنية متكاملة",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 80, time_limit_minutes: 90 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "3.7.1",
              name: "مراجعة شاملة للمستويات الثلاثة",
              goal: "مراجعة وتوحيد المعرفة الشاملة عبر المستويات الثلاثة في جلسة تكاملية مكثفة",
              key_concepts: ["Comprehensive Review","Three Levels","Integration","Knowledge Map","Gap Analysis"],
              lessons: [
                { name: "خريطة المعرفة الشاملة: نظرة طائرة على المسار", primary: "comprehensive knowledge map bird-eye view entire curriculum" },
                { name: "تكامل المفاهيم: كيف يرتبط كل شيء ببعضه؟", primary: "concept integration how everything connects accounting web" },
                { name: "تشخيص الفجوات المتبقية: ما يحتاج تقوية", primary: "gaps diagnosis remaining weak areas final strengthening" },
                { name: "الإطار التفكيري الاحترافي: كيف يفكر المحاسب الخبير", primary: "professional thinking framework expert accountant approach" },
                { name: "مراجعة IFRS الشاملة: المعايير الأساسية في لمحة", primary: "comprehensive IFRS review key standards quick reference" },
                { name: "مراجعة التدقيق الشاملة: من التخطيط للتقرير", primary: "comprehensive audit review planning to opinion quick" },
                { name: "مراجعة التحليل المالي: الأدوات والتطبيق", primary: "comprehensive financial analysis tools application review" },
                { name: "مراجعة القطاعات المتخصصة: النفط والبنوك والحكومة", primary: "specialized sectors review oil banking government accounting" },
                { name: "التحضير النهائي: استراتيجية الإجابة والثقة", primary: "final preparation answering strategy confidence peak state" }
              ]
            },
            {
              unit_index: 2, code: "3.7.2",
              name: "اختبارات محاكية للشهادات الدولية",
              goal: "التدرب المكثف على اختبارات المحاسبة الدولية CPA وACCA وCMA بأسلوب واقعي",
              key_concepts: ["CPA Mock","ACCA Past Papers","CMA Practice","Exam Strategy","Time Management","Question Analysis"],
              lessons: [
                { name: "استراتيجية اختبار CPA: الأجزاء الأربعة والتخطيط", primary: "CPA exam strategy four parts REG AUD FAR BEC plan" },
                { name: "اختبار محاكٍ لـCPA: الجزء المالي FAR", primary: "CPA FAR mock exam financial accounting simulation" },
                { name: "استراتيجية اختبار ACCA: المستويات والأولويات", primary: "ACCA exam strategy levels F P strategic priority" },
                { name: "اختبار محاكٍ لـACCA: المستوى الاستراتيجي P7", primary: "ACCA P7 advanced audit assurance mock exam simulation" },
                { name: "استراتيجية اختبار CMA: الجزأان والتنظيم", primary: "CMA exam strategy two parts financial planning analysis" },
                { name: "اختبار محاكٍ لـCMA: الجزء الثاني", primary: "CMA part 2 financial decision making mock exam" },
                { name: "تحليل إجابات الاختبارات: فهم الخطأ والتعلم", primary: "mock exam answer analysis understanding errors learning" },
                { name: "إعادة الاختبار في نقاط الضعف: التحسين الموجّه", primary: "targeted improvement weak areas retesting improvement plan" },
                { name: "الإعداد النفسي لاختبار الشهادة الدولية", primary: "psychological preparation international exam peak performance" }
              ]
            },
            {
              unit_index: 3, code: "3.7.3",
              name: "محاكاة الحياة المهنية: السنة الأولى",
              goal: "محاكاة التحديات المالية الحقيقية للسنة الأولى في العمل المحاسبي الاحترافي",
              key_concepts: ["First Year Reality","Client Management","Deliverables","Teamwork","Learning on Job","Professional Shock"],
              lessons: [
                { name: "الشهر الأول في العمل: كيف تبدأ بالقدم الصحيحة؟", primary: "first month job starting right foot professional transition" },
                { name: "فهم ثقافة المنشأة: القواعد المكتوبة وغير المكتوبة", primary: "organizational culture written unwritten rules first year" },
                { name: "إدارة المهام الأولى: جودة لا تنفصل عن الموعد", primary: "first assignments quality meets deadline time management" },
                { name: "العمل ضمن فريق محاسبي: التعاون والإسهام", primary: "team collaboration accounting contribution adding value" },
                { name: "التعلم من الزملاء والمشرفين: السرعة المثلى", primary: "learning from colleagues supervisors optimal learning speed" },
                { name: "إدارة الأخطاء الأولى: الاعتراف والتعلم والتحسن", primary: "first mistakes acknowledging learning improving professional" },
                { name: "توقعات العملاء: كيف تديرها وتتجاوزها؟", primary: "client expectations management exceeding professional service" },
                { name: "الموازنة بين العمل والتطوير: وقت التعلم", primary: "work learning balance professional development time allocation" },
                { name: "نهاية السنة الأولى: تقييم النمو والخطوة التالية", primary: "first year end growth assessment next steps planning" }
              ]
            },
            {
              unit_index: 4, code: "3.7.4",
              name: "التفكير الاستراتيجي المالي: الصورة الكبيرة",
              goal: "تطوير التفكير الاستراتيجي المالي الذي يُميّز المحاسب الاستثنائي عن الجيد",
              key_concepts: ["Strategic Thinking","Big Picture","System View","Future Orientation","Innovation","Leadership"},
              lessons: [
                { name: "التفكير بالصورة الكبيرة: من المعادلة للاستراتيجية", primary: "big picture thinking journal entry to corporate strategy" },
                { name: "التفكير النظامي: رؤية الترابطات والأسباب البعيدة", primary: "systems thinking interconnections distant causes financial" },
                { name: "التوجه للمستقبل: بناء الأسئلة الصحيحة", primary: "future orientation right questions not just answers" },
                { name: "الابتكار في المحاسبة: تحدي الوضع الراهن", primary: "innovation accounting challenging status quo new approaches" },
                { name: "التفكير من منظور المستثمر: ماذا يريد السوق؟", primary: "investor perspective thinking what market wants pricing" },
                { name: "القراءة المالية بين السطور: ما لا يقوله التقرير", primary: "reading between financial lines what report doesn't say" },
                { name: "التوليف بين التحليل والحدس: متى تثق بحدسك؟", primary: "synthesis analysis intuition when to trust gut feeling" },
                { name: "الرؤية الاستراتيجية للمحاسب: عشر سنوات للأمام", primary: "strategic vision accountant 10 years forward planning" },
                { name: "من محاسب جيد لمحاسب استثنائي: الفرق الجوهري", primary: "good to exceptional accountant fundamental difference mindset" }
              ]
            },
            {
              unit_index: 5, code: "3.7.5",
              name: "بناء مكتب المحاسبة والاستشارات المستقل",
              goal: "الخطوات العملية لتأسيس مكتب محاسبة ومراجعة مستقل ناجح في السوق اليمني والخليجي",
              key_concepts: ["Practice Setup","Licensing","Client Acquisition","Service Lines","Pricing","Technology Stack"],
              lessons: [
                { name: "قرار الاستقلالية: هل الوقت مناسب؟ المعايير والمؤشرات", primary: "independence decision right time criteria indicators assessment" },
                { name: "التراخيص والعضويات المهنية: المتطلبات القانونية", primary: "licensing professional memberships legal requirements steps" },
                { name: "اختيار خدمات المكتب: التخصص أم التنوع؟", primary: "service lines selection specialization generalist decision" },
                { name: "اكتساب أول عملاء: من الشبكة الشخصية للسوق", primary: "first clients acquisition personal network market entry" },
                { name: "تسعير الخدمات: الساعة والمشروع والاشتراك", primary: "service pricing hourly project retainer model selection" },
                { name: "بناء الفريق الأول: التوظيف والتدريب والتوجيه", primary: "first team hiring training onboarding small practice" },
                { name: "تقنية المكتب: الأدوات الضرورية من البداية", primary: "practice technology stack essential tools from beginning" },
                { name: "تطوير المكتب: من الصغير للمتوسط والنمو", primary: "practice growth small to medium next level expansion" },
                { name: "رؤية المكتب لخمس سنوات: الخطة والأهداف", primary: "practice vision 5 years plan objectives milestones" }
              ]
            },
            {
              unit_index: 6, code: "3.7.6",
              name: "قضايا محاسبية معاصرة وأبحاث المجال",
              goal: "مناقشة القضايا المحاسبية المعاصرة والمستجدات الفكرية التي تُشكّل مستقبل المهنة",
              key_concepts: ["Contemporary Issues","Academic Research","Standards Debates","Emerging Topics","Policy","Future"],
              lessons: [
                { name: "الجدل حول القيمة العادلة: الملاءمة مقابل الموثوقية", primary: "fair value debate relevance reliability IFRS accounting" },
                { name: "تضخم التقارير: هل أكثر دائماً أفضل؟", primary: "disclosure overload more is not always better quality clarity" },
                { name: "IFRS لمجموعة G20: مسيرة التوحيد العالمي", primary: "IFRS G20 global convergence journey differences remaining" },
                { name: "محاسبة الانتقال الأخضر: تحديات القياس", primary: "green transition accounting measurement challenges innovation" },
                { name: "الذكاء الاصطناعي التوليدي والمحاسبة: حدود الثقة", primary: "generative AI accounting trust limits accuracy reliability" },
                { name: "البحث المحاسبي: كيف تقرأ الدراسات وتُقيّمها؟", primary: "accounting research reading evaluating studies evidence" },
                { name: "مستقبل GAAP الأمريكي: هل سيبقى مستقلاً؟", primary: "future US GAAP independence convergence question" },
                { name: "الاقتصاد الرقمي وتحديات المحاسبة التقليدية", primary: "digital economy accounting challenges platform gig crypto" },
                { name: "المحاسبة كأداة عدالة اجتماعية: الدور الأوسع", primary: "accounting social justice tool wider role distribution" }
              ]
            },
            {
              unit_index: 7, code: "3.7.7",
              name: "التخطيط المالي الشخصي للمحاسب",
              goal: "تطبيق مهارات المحاسبة على التخطيط المالي الشخصي وبناء الثروة والتقاعد المريح",
              key_concepts: ["Personal Finance","Budgeting Personal","Investment","Insurance","Estate Planning","Financial Independence"],
              lessons: [
                { name: "المحاسب ومالياته الشخصية: التناقض الشائع", primary: "accountant personal finance irony common oversight self" },
                { name: "الميزانية الشخصية: القيد المزدوج لحياتك", primary: "personal budget double entry your life income expenses" },
                { name: "بناء صندوق الطوارئ: الحماية الأولى قبل الاستثمار", primary: "emergency fund first protection before investment 6 months" },
                { name: "التخطيط للتقاعد: الوقت الذي يُحقق المعجزات", primary: "retirement planning time compound interest miracle early start" },
                { name: "الاستثمار للمحاسب: الأسهم والعقار والذهب والصكوك", primary: "accountant investment stocks real estate gold sukuk allocation" },
                { name: "التأمين: الواقي الضروري الذي يُهمله كثيرون", primary: "insurance essential protection life health property accountant" },
                { name: "التخطيط الضريبي الشخصي: الفروق المشروعة", primary: "personal tax planning legitimate opportunities savings" },
                { name: "التخطيط للثروة والإرث: تحويل ما بنيت للأجيال", primary: "wealth estate planning generational transfer family wealth" },
                { name: "الاستقلال المالي: كيف يبلغ المحاسب حريته المالية؟", primary: "financial independence accountant freedom FI FIRE strategy" }
              ]
            },
            {
              unit_index: 8, code: "3.7.8",
              name: "مشروع الختام النهائي: التاج الاحترافي",
              goal: "تقديم مشروع ختامي متكامل يُظهر كامل المهارات المكتسبة عبر المسار المحاسبي الكامل",
              key_concepts: ["Final Capstone","Masterpiece","Complete Demonstration","Professional Peak","Portfolio Crown"],
              lessons: [
                { name: "اختيار مشروع الختام: المعايير والمستوى المطلوب", primary: "capstone project selection criteria level required demonstration" },
                { name: "مرحلة التحليل: التشخيص الكامل للكيان المختار", primary: "analysis phase complete diagnosis selected entity comprehensive" },
                { name: "مرحلة التقييم والتدقيق: التطبيق المتكامل", primary: "evaluation audit phase integrated application standards" },
                { name: "مرحلة التخطيط المالي والاستراتيجي", primary: "financial strategic planning phase comprehensive roadmap" },
                { name: "مرحلة إعداد التقارير: المتكامل والاحترافي", primary: "reporting phase integrated professional complete package" },
                { name: "مرحلة العرض: المحاكاة الاحترافية الحقيقية", primary: "presentation phase professional simulation real board format" },
                { name: "المراجعة النظيرة المتقدمة: تغذية راجعة احترافية", primary: "advanced peer review professional-level feedback improvement" },
                { name: "توثيق الإنجاز: محفظة المهارات الكاملة", primary: "achievement documentation complete skills portfolio career" },
                { name: "الاحتفاء والإطلاق: بداية المسيرة المهنية الحقيقية", primary: "celebration launch real professional career begins accounting" }
              ]
            },
            {
              unit_index: 9, code: "3.7.9",
              name: "المحاسب كعامل تغيير في المجتمع",
              goal: "استلهام دور المحاسب كعامل تغيير اجتماعي وصانع أثر إيجابي في المجتمع والاقتصاد",
              key_concepts: ["Social Impact","Accountability","Economic Development","Youth Empowerment","Transparency Mission"],
              lessons: [
                { name: "المحاسبة كمهنة ذات رسالة: أكثر من أرقام", primary: "accounting profession with mission beyond numbers purpose" },
                { name: "الشفافية المالية كأساس للتنمية الاقتصادية", primary: "financial transparency economic development foundation trust" },
                { name: "محاسب التغيير في اليمن: ما الذي يمكن تحقيقه؟", primary: "change accountant Yemen what can be achieved development" },
                { name: "تعزيز الشباب في المهنة المحاسبية: نقل المشعل", primary: "youth empowerment accounting profession torch passing mentor" },
                { name: "مكافحة الفساد والفقر: دور المحاسبة الفعلي", primary: "fighting corruption poverty accounting actual role evidence" },
                { name: "التمويل الاجتماعي: المحاسبة في خدمة المجتمعات", primary: "social finance accounting community service microfinance" },
                { name: "المساهمة في رسم السياسات الاقتصادية: الدور الأوسع", primary: "economic policy contribution accountant wider role government" },
                { name: "الخطاب العام المالي: تبسيط الاقتصاد للناس", primary: "public financial literacy simplifying economics for people" },
                { name: "إرثك المهني: ما ستتركه بعد مسيرتك الطويلة", primary: "professional legacy what you leave after long career meaning" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

function makeGoal(lessonName, unitName) {
  return `يُتقن المتعلم ${lessonName} ويطبّقها عملياً في سياق ${unitName} بما يُمكّنه من اتخاذ قرارات محاسبية صحيحة ومهنية وذات أثر حقيقي.`;
}

function makeBridge(lessonName, lessonIndex, unitName) {
  if (lessonIndex === 0) return `نبدأ رحلتنا في ${unitName} بمفهوم ${lessonName} الذي يُشكّل الأساس الذي تُبنى عليه كل مهارات هذه الوحدة.`;
  if (lessonIndex === 8) return `نختتم ${unitName} بـ${lessonName} لتوحيد ما تعلمناه في تطبيق متكامل يُحكم البناء المحاسبي الكامل.`;
  return `انطلاقاً مما تعلمناه في ${unitName}، نعمّق الآن فهمنا بـ${lessonName} كخطوة جوهرية في المسار.`;
}

function makeConcepts(primary, lessonName) {
  const words = primary.split(" ");
  return [
    {
      name: words.slice(0, 2).join(" "),
      explanation: `المفهوم الجوهري في "${lessonName}" في سياق المحاسبة: ${primary}`,
      mastery_criterion: `يستطيع المتعلم شرح ${words.slice(0, 2).join(" ")} وتطبيقه في تسجيل العمليات المالية بدقة احترافية`,
      weight: 3,
      bloom_level: "understand"
    },
    {
      name: words.slice(2, 4).join(" ") || "التطبيق المهني",
      explanation: `التطبيق العملي الاحترافي لـ${primary} في بيئات العمل المحاسبي الحقيقية`,
      mastery_criterion: `يُطبّق المتعلم هذا المفهوم بصورة صحيحة على حالات عملية متعددة دون توجيه`,
      weight: 2,
      bloom_level: "apply"
    },
    {
      name: "التقييم النقدي",
      explanation: `تقييم ${primary} ومقارنته بالبدائل المحاسبية وفهم الحالات التي يُفضَّل فيها كل نهج`,
      mastery_criterion: `يُقيّم المتعلم الخيارات المحاسبية المتاحة ويختار الأنسب معللاً قراره بشكل احترافي`,
      weight: 1,
      bloom_level: "evaluate"
    }
  ];
}

function makeMistakes(primary, unitName) {
  return [
    {
      mistake: `الخلط بين المفهوم النظري والتطبيق العملي في ${primary}`,
      correction: `يجب ممارسة التطبيق العملي الفوري بعد كل مفهوم نظري في ${unitName} لترسيخ الفهم`,
      treatment: `إعادة قراءة الأمثلة العملية وتطبيق عمليات مشابهة على بيانات مختلفة حتى يتضح المفهوم`,
      severity: "major"
    },
    {
      mistake: `إهمال قراءة المتطلبات بعناية قبل تسجيل قيود ${primary}`,
      correction: `دائماً حدد طبيعة العملية وتأثيرها على المعادلة المحاسبية قبل الشروع في أي تسجيل`,
      treatment: `تطوير عادة التحليل المنهجي لكل عملية مالية قبل التسجيل باتباع خطوات محددة`,
      severity: "critical"
    },
    {
      mistake: `نسيان الإفصاح أو التسجيل الكامل لجميع جوانب ${primary}`,
      correction: `راجع متطلبات المعيار ذي الصلة وتأكد من اكتمال الإفصاح في كل قيد أو تقرير`,
      treatment: `استخدام قائمة مرجعية للتحقق من اكتمال التسجيل والإفصاح لكل نوع من العمليات`,
      severity: "major"
    }
  ];
}

function makeExamples(primary, unitName) {
  return [
    `تطبيق ${primary} في شركة استيراد وتصدير يمنية تتعامل بالدولار واليمني وتحتاج للتسجيل الدقيق`,
    `استخدام ${unitName} في مطعم يمني لتتبع الإيرادات والتكاليف اليومية وإعداد التقارير الشهرية`,
    `مقارنة نهج ${primary} بين منشأة تجارية ومنشأة خدمية في السياق اليمني لفهم الفروق العملية`
  ];
}

function makeExamQuestion(lessonName, primary) {
  return `كيف تُطبّق "${lessonName}" في حالة تجارية حقيقية يمنية وما الخطوات الأساسية للتسجيل والإفصاح؟`;
}

function makeLabForUnit(unitDef) {
  const kinds = ["diagnostic", "decision", "application", "analysis", "connection"];
  const questions = kinds.map((kind, i) => {
    const scenarios = {
      diagnostic: `كيف تُشخّص خطأ أو إشكالية محاسبية في ${unitDef.name} وتحدد سببها الجذري؟`,
      decision: `أمامك خياران محاسبيان في ${unitDef.name} — أيهما تختار وفق المعايير الدولية ولماذا؟`,
      application: `طبّق مبادئ ${unitDef.name} على حالة عملية وسجّل القيود الصحيحة مع المبررات`,
      analysis: `حلّل نتائج تطبيق ${unitDef.key_concepts[1] || unitDef.name} وقيّمها مقارنةً بالبدائل المحاسبية`,
      connection: `كيف يرتبط ${unitDef.name} بما تعلمته في وحدات سابقة وكيف يُمهّد لما يأتي؟`
    };
    const pts = [5, 4, 6, 4, 5][i];
    return {
      question_index: i + 1,
      kind,
      prompt: scenarios[kind],
      rubric: `يُقيَّم الجواب على الدقة المحاسبية والمنهجية الصحيحة والتطبيق العملي في سياق ${unitDef.name}`,
      solution_outline: `الإجابة المثلى تشمل: تحديد المفهوم المحاسبي المناسب، التطبيق الصحيح، التسجيل الدقيق، والإفصاح المطلوب`,
      points: Math.min(10, pts)
    };
  });

  return {
    lab_index: 1,
    title: `مختبر ${unitDef.name}: التطبيق المحاسبي الاحترافي`,
    name: `مختبر ${unitDef.name}: التطبيق المحاسبي الاحترافي`,
    goal: `تطبيق مبادئ ${unitDef.name} في سيناريو محاسبي واقعي وبناء الكفاءة المهنية العملية`,
    scenario: `أنت محاسب في شركة يمنية تواجه موقفاً يستدعي تطبيق ${unitDef.name}. المطلوب توظيف مفاهيم الوحدة للوصول إلى تسجيل دقيق وتقرير احترافي.`,
    completion_criterion: `يتمكن المتعلم من إكمال جميع مهام مختبر ${unitDef.name} بدقة محاسبية احترافية وتقديم مبررات واضحة`,
    pedagogical_sequence: "تشخيص → قرار → تطبيق → تحليل → توليف",
    prerequisite_lessons: [],
    allowed_tools: ["nukhba_ide_js"],
    questions,
    pass_threshold_percent: 70
  };
}

function makeUnitExamQuestions(unitCode, unitDef, passThreshold, timeLimit) {
  const c = unitDef.key_concepts;
  const questions = [
    {
      question: `ما المبدأ الجوهري الذي يُميّز ${c[0]} في المحاسبة الدولية؟`,
      options: [`التسجيل العشوائي حسب الظروف`, `${c[0]} يُطبَّق وفق المعيار الدولي المحدد بشروط واضحة`, `الاعتماد على التقدير الشخصي دائماً`, `تجاهل المعايير الدولية`],
      correctIndex: 1,
      explanation: `${c[0]} في ${unitDef.name} يُطبَّق وفق معايير دولية محددة تضمن الدقة والمقارنة والموثوقية`
    },
    {
      question: `في أي حالة يكون تطبيق ${c[1] || c[0]} في ${unitDef.name} أكثر أهمية؟`,
      options: [`عند التأكد التام من كل المعطيات`, `عند وجود تعقيد في العملية يتطلب حكماً مهنياً`, `في جميع الحالات دون تمييز`, `فقط في الشركات الكبرى`],
      correctIndex: 1,
      explanation: `${c[1] || c[0]} يكتسب أهمية خاصة في الحالات المعقدة التي تتطلب حكماً مهنياً في ${unitDef.name}`
    },
    {
      question: `ما الخطأ الأكثر شيوعاً عند تطبيق ${unitDef.name} لأول مرة؟`,
      options: [`الحرص الزائد على الدقة`, `إهمال متطلبات الإفصاح الكاملة وفق المعيار`, `استشارة الزملاء`, `قراءة المعيار بعناية`],
      correctIndex: 1,
      explanation: `إهمال متطلبات الإفصاح الكاملة هو أكثر الأخطاء شيوعاً في ${unitDef.name} ويؤثر على جودة التقارير`
    },
    {
      question: `كيف يُقيَّم صحة تطبيق ${c[2] || c[0]} في ${unitDef.name}؟`,
      options: [`بمدى سرعة التنفيذ فقط`, `بالتحقق من توافق التطبيق مع المعيار المحاسبي والمنطق الاقتصادي`, `بحجم القيود المسجّلة`, `برأي الإدارة حصراً`],
      correctIndex: 1,
      explanation: `التحقق من توافق التطبيق مع المعيار والمنطق الاقتصادي هو المقياس الصحيح لصحة تطبيق ${c[2] || c[0]}`
    },
    {
      question: `ما العلاقة بين ${c[0]} وباقي عناصر ${unitDef.name}؟`,
      options: [`لا علاقة بينهما`, `${c[0]} يُشكّل الأساس الذي تُبنى عليه بقية المفاهيم في الوحدة`, `هي عناصر متنافسة`, `يمكن استبدال أحدهما بالآخر`],
      correctIndex: 1,
      explanation: `${c[0]} هو الأساس الذي يُمكّن من فهم باقي عناصر ${unitDef.name} وتطبيقها بصورة صحيحة`
    },
    {
      question: `ما أول خطوة عند مواجهة إشكالية في تطبيق ${unitDef.name}؟`,
      options: [`تجاهل الإشكالية والمضي قدماً`, `قراءة المعيار ذي الصلة وتحليل الموقف منهجياً`, `الاعتماد على التجربة السابقة فقط`, `اتخاذ القرار بسرعة دون تحليل`],
      correctIndex: 1,
      explanation: `قراءة المعيار وتحليل الموقف منهجياً هي الخطوة الأولى والأهم عند مواجهة أي إشكالية في ${unitDef.name}`
    }
  ];
  return {
    unit_code: unitCode,
    pass_threshold_percent: passThreshold,
    time_limit_minutes: timeLimit,
    questions
  };
}

function makeStageExamQuestions(stageDef) {
  const uNames = stageDef.units.map(u => u.name);
  const questions = [];
  for (let i = 0; i < 10; i++) {
    const uName = uNames[i % uNames.length];
    const uName2 = uNames[(i + 1) % uNames.length];
    questions.push({
      question: `ما الفرق الجوهري بين تطبيق "${uName}" و"${uName2}" في إطار ${stageDef.name}؟`,
      options: [
        `لا فرق بينهما في المحاسبة`,
        `"${uName}" يُعالج الجانب الأساسي بينما "${uName2}" يُكمّله بعمق تطبيقي أو تحليلي مختلف`,
        `كلاهما يؤدي نفس الوظيفة تماماً`,
        `"${uName2}" أحدث وأفضل دائماً في كل الحالات`
      ],
      correctIndex: 1,
      explanation: `في ${stageDef.name}، كل وحدة تُكمّل الأخرى بعمق مختلف لبناء كفاءة محاسبية متكاملة`
    });
  }
  return {
    stage_name: stageDef.name,
    pass_threshold_percent: stageDef.exam.pass_threshold_percent,
    time_limit_minutes: stageDef.exam.time_limit_minutes,
    questions
  };
}

function makeLevelExamQuestions(levelDef) {
  const lName = levelDef.name;
  const stems = [
    `ما المبدأ المحاسبي الجوهري في ${lName} الذي يُطبَّق عبر كل مراحله؟`,
    `ما أهم تحدٍّ يواجه المحاسب عند الانتقال لمستوى متقدم في ${lName}؟`,
    `كيف يترابط ${lName} مع المستويات الأخرى في مسار المحاسبة المهني؟`,
    `ما الفرق بين فهم ${lName} نظرياً وتطبيقه احترافياً في بيئة العمل؟`,
    `ما أبرز مفهوم في ${lName} يُستخدم يومياً في المحاسبة الحديثة؟`,
    `كيف تُقيّم إتقانك لـ${lName} قبل الانتقال للمستوى التالي؟`,
    `ما المورد المهني الأنسب لتعميق ${lName} بعد إتمام هذا المستوى؟`,
    `ما السيناريو المهني الحقيقي الذي يتطلب الجمع بين مهارات متعددة من ${lName}؟`,
    `ما الطريقة المثلى للحفاظ على المهارات المكتسبة في ${lName} وتطويرها؟`,
    `ما الميزة التنافسية التي يمنحها إتقان ${lName} في سوق العمل المحاسبي؟`,
    `كيف يختلف تعامل المحاسب المبتدئ عن الخبير مع تحديات ${lName}؟`,
    `ما أول خطوة عملية بعد دراسة ${lName} لبناء كفاءة مهنية حقيقية؟`,
    `ما المشاريع والحالات التي تُثبت إتقان ${lName} في مسيرتك المهنية؟`
  ];

  const questions = [];
  for (let i = 0; i < 13; i++) {
    questions.push({
      question: stems[i],
      options: [
        `الاهتمام بالأدوات الرقمية على حساب الفهم المحاسبي العميق`,
        `دمج الفهم النظري المتين مع التطبيق العملي والحكم المهني المستمر`,
        `التركيز على السرعة في الإنجاز دون مراعاة جودة التقارير`,
        `التخصص الضيق جداً وتجاهل الجوانب المترابطة في المحاسبة`
      ],
      correctIndex: 1,
      explanation: `التميز في ${lName} يأتي من دمج الفهم النظري المتين مع التطبيق العملي والحكم المهني السليم`
    });
  }

  return {
    level_name: lName,
    pass_threshold_percent: levelDef.exam.pass_threshold_percent,
    time_limit_minutes: levelDef.exam.time_limit_minutes,
    questions
  };
}

function makePlacementTest() {
  const topics = [
    { q: "ما قاعدة المدين والدائن الأساسية في المحاسبة؟", a: 0, opts: ["الأصول تُدان والخصوم تُدَّان وحقوق الملكية تُدَّان", "الأصول تُدان والخصوم تُدَّن وحقوق الملكية تُدَّن", "كل الحسابات لها نفس القاعدة", "يختلف حسب نوع الشركة"] },
    { q: "ما الهدف الأساسي من قائمة التدفقات النقدية؟", a: 1, opts: ["إظهار الربح الصافي فقط", "إظهار التدفقات الفعلية للنقد من أنشطة التشغيل والاستثمار والتمويل", "استبدال قائمة الدخل", "إظهار أسعار الأسهم"] },
    { q: "ما الفرق بين الإيراد المستحق والمقدم؟", a: 2, opts: ["لا فرق بينهما", "المقدم هو ما تحصّلنا عليه مقدماً وهو أصل", "المستحق كُسب لكن لم يُحصَّل (أصل)، والمقدم حُصِّل لكن لم يُكسَب (خصم)", "كلاهما يُسجَّل في نهاية السنة فقط"] },
    { q: "ما طريقة تقييم المخزون التي تُعطي أعلى ربح في فترات التضخم؟", a: 0, opts: ["FIFO (أول دخولاً أول خروجاً)", "LIFO (آخر دخولاً أول خروجاً)", "المتوسط المرجح", "التحديد المحدد"] },
    { q: "ما المعنى الصحيح للاستهلاك المتناقص الرصيد؟", a: 3, opts: ["الأصل يُستهلك بنفس المعدل كل عام", "الأصل لا يُستهلك", "الاستهلاك يزداد مع الزمن", "معدل أعلى في السنوات الأولى يتناقص تدريجياً"] },
    { q: "ما وظيفة ميزان المراجعة في الدورة المحاسبية؟", a: 1, opts: ["إظهار صافي الربح النهائي مباشرة", "التحقق من المساواة بين إجمالي المدين وإجمالي الدائن", "استبدال دفتر اليومية", "إعداد قائمة التدفقات النقدية"] },
    { q: "وفق IFRS 15، متى يُعترف بالإيراد؟", a: 2, opts: ["عند تحصيل النقد دائماً", "عند توقيع العقد", "عند إيفاء التزام الأداء ونقل السيطرة للعميل", "في نهاية السنة المالية"] },
    { q: "ما الفرق بين التكاليف المباشرة وغير المباشرة؟", a: 0, opts: ["المباشرة تُتتبَّع مباشرة للمنتج وغير المباشرة تُوزَّع عبر أسس التوزيع", "المباشرة هي الثابتة وغير المباشرة هي المتغيرة", "لا فرق بينهما في نهاية المطاف", "غير المباشرة دائماً أكثر"] },
    { q: "ما هامش المساهمة ووظيفته في تحليل CVP؟", a: 3, opts: ["هو صافي الربح النهائي", "هو إجمالي الإيرادات", "هو الفرق بين السعر والتكلفة الثابتة", "الفرق بين سعر البيع والتكاليف المتغيرة ويُغطي التكاليف الثابتة"] },
    { q: "ما الفرق الجوهري بين التدقيق الداخلي والخارجي؟", a: 1, opts: ["لا فرق بينهما في الجوهر", "الداخلي يخدم الإدارة ويُحسّن العمليات، الخارجي مستقل يُصدر رأياً للأطراف الخارجية", "الخارجي يعمل داخل المنشأة", "الداخلي أكثر استقلالية"] },
    { q: "ما الغرض من اختبار انخفاض قيمة الأصول وفق IAS 36؟", a: 2, opts: ["زيادة قيمة الأصول", "بيع الأصول", "التحقق من أن القيمة الدفترية لا تتجاوز القيمة القابلة للاسترداد", "حساب الإهلاك فقط"] },
    { q: "ما وظيفة نسبة التداول (Current Ratio) في التحليل المالي؟", a: 0, opts: ["قياس قدرة المنشأة على سداد التزاماتها قصيرة الأجل من أصولها المتداولة", "قياس ربحية المنشأة على المدى البعيد", "قياس كفاءة استخدام الأصول الثابتة", "قياس هيكل تمويل الشركة"] },
    { q: "ما المقصود بالقيمة الاقتصادية المضافة EVA؟", a: 3, opts: ["هي نفس صافي الربح المحاسبي", "هي الإيرادات ناقص التكاليف المتغيرة", "هي معدل العائد على الاستثمار فقط", "الربح التشغيلي بعد الضريبة ناقص تكلفة رأس المال المستثمر"] },
    { q: "في تحليل CVP، ما معنى نقطة التعادل؟", a: 1, opts: ["النقطة التي يتجاوز فيها الربح الحد المستهدف", "النقطة التي تتساوى فيها الإيرادات الكلية مع التكاليف الكلية فلا ربح ولا خسارة", "النقطة التي تنعدم فيها التكاليف المتغيرة", "أقل مستوى مبيعات ممكن"] },
    { q: "ما الفرق بين التكاليف الثابتة والمتغيرة في سلوك التكاليف؟", a: 2, opts: ["لا فرق بينهما على المدى القصير", "الثابتة تتغير مع الإنتاج والمتغيرة ثابتة", "الثابتة لا تتغير مع تغير مستوى النشاط والمتغيرة تتناسب معه", "كلاهما ثابت في جميع الأحوال"] },
    { q: "ما المقصود بالأثر الرجعي في تغيير السياسة المحاسبية وفق IAS 8؟", a: 0, opts: ["إعادة بيان الأرقام المقارنة كما لو كانت السياسة الجديدة مطبقة دائماً", "تطبيق التغيير على المستقبل فقط", "إلغاء السنوات السابقة", "اعتبار التغيير كخطأ جوهري"] },
    { q: "وفق IFRS 16، ما الذي يجب أن تُسجّله الشركة المستأجرة؟", a: 3, opts: ["مصروف الإيجار فقط كما في النظام القديم", "لا شيء إن كان الإيجار تشغيلياً", "فقط التزام الإيجار دون أصل", "أصل حق الاستخدام والتزام الإيجار في الميزانية العمومية"] },
    { q: "ما الهدف الأساسي من إعداد التقرير المتكامل؟", a: 1, opts: ["استبدال القوائم المالية التقليدية", "إظهار كيف تخلق المنشأة قيمة على المدى القصير والمتوسط والطويل عبر رؤوس الأموال الستة", "تقليل حجم الإفصاح للمستثمرين", "تقديم معلومات ضريبية فقط"] }
  ];

  return topics.map((item, i) => ({
    target_level_index: Math.min(3, Math.floor(i / 6) + 1),
    kind: "mcq",
    prompt: item.q,
    choices: item.opts,
    correct_index: item.a,
    difficulty: 2,
    explanation: `هذا السؤال يقيس الكفاءة المحاسبية الأساسية في مستوى ${Math.min(3, Math.floor(i / 6) + 1)}`
  }));
}

function buildFullFile() {
  const levels = [];
  const unitExamBanks = {};
  const stageExamBanks = {};
  const levelExamBanks = {};

  for (const levelDef of CURRICULUM.levels) {
    const stages = [];

    for (const stageDef of levelDef.stages) {
      const units = [];

      for (const unitDef of stageDef.units) {
        const lessons = unitDef.lessons.map((lesson, lessonIndex) => {
          return {
            lesson_index: lessonIndex + 1,
            name: lesson.name,
            goal: makeGoal(lesson.name, unitDef.name),
            bridge_sentence: makeBridge(lesson.name, lessonIndex, unitDef.name),
            prerequisite_lessons: [],
            enables_lessons: [],
            concepts: makeConcepts(lesson.primary, lesson.name),
            common_mistakes: makeMistakes(lesson.primary, unitDef.name),
            yemeni_examples: makeExamples(lesson.primary, unitDef.name),
            final_check_question: makeExamQuestion(lesson.name, lesson.primary),
            session_complete_criterion: `يستطيع المتعلم شرح "${lesson.name}" وتطبيقه عملياً في حالة محاسبية حقيقية بدقة ومصداقية احترافية`,
            expected_duration_minutes: 50,
            motivation_hook: `إتقان "${lesson.name}" يفتح أمامك فرصاً مهنية حقيقية في سوق المحاسبة المحلي والدولي المتنامي`,
            learning_objectives: [
              { statement: `فهم ${lesson.primary.split(" ").slice(0, 3).join(" ")} من الناحية النظرية والتطبيقية وفق المعايير الدولية`, bloom_level: "understand" },
              { statement: `تطبيق ${lesson.primary.split(" ")[0]} في حالات محاسبية حقيقية وتقييم صحة التطبيق`, bloom_level: "apply" }
            ],
            solution_outline: `فهم ${lesson.primary}، التعرف على المعيار الدولي المنظِّم له، تطبيقه على الحالة، التحقق من صحة القيود والإفصاح`
          };
        });

        const lab = makeLabForUnit(unitDef);
        const exam = makeUnitExamQuestions(
          unitDef.code, unitDef,
          stageDef.unit_exam_defaults.pass_threshold_percent,
          stageDef.unit_exam_defaults.time_limit_minutes
        );

        unitExamBanks[unitDef.code] = exam;

        units.push({
          unit_index: unitDef.unit_index,
          name: unitDef.name,
          goal: unitDef.goal,
          key_concepts: unitDef.key_concepts,
          prerequisite_units: [],
          enables_units: [],
          exam: {
            pass_threshold_percent: stageDef.unit_exam_defaults.pass_threshold_percent,
            time_limit_minutes: stageDef.unit_exam_defaults.time_limit_minutes
          },
          lessons,
          labs: [lab]
        });
      }

      const stageCode = `${levelDef.level_index}.${stageDef.stage_index}`;
      stageExamBanks[stageCode] = makeStageExamQuestions(stageDef);

      stages.push({
        stage_index: stageDef.stage_index,
        name: stageDef.name,
        goal: stageDef.goal,
        bloom_focus: stageDef.bloom_focus,
        exam: stageDef.exam,
        units
      });
    }

    levelExamBanks[`${levelDef.level_index}`] = makeLevelExamQuestions(levelDef);

    levels.push({
      level_index: levelDef.level_index,
      name: levelDef.name,
      goal: levelDef.goal,
      bloom_focus: levelDef.bloom_focus,
      exam: levelDef.exam,
      stages
    });
  }

  const placementQuestions = makePlacementTest();

  const output = {
    schema_version: CURRICULUM.schema_version,
    specialty: {
      slug: CURRICULUM.slug,
      name: CURRICULUM.name,
      icon: CURRICULUM.icon,
      description: CURRICULUM.description,
      target_persona: CURRICULUM.target_persona,
      teacher_tone: CURRICULUM.teacher_tone,
      allowed_viz_templates: CURRICULUM.allowed_viz_templates,
      allowed_tools: CURRICULUM.allowed_tools
    },
    levels,
    exam_banks: {
      unit_banks: unitExamBanks,
      stage_banks: stageExamBanks,
      level_banks: levelExamBanks
    },
    placement_test_questions: placementQuestions
  };

  return output;
}

console.log("توليد ملف uni-accounting-instruction.json...");
const result = buildFullFile();
const json = JSON.stringify(result, null, 2);
writeFileSync("uni-accounting-instruction.json", json, "utf8");
const sizeKB = Math.round(json.length / 1024);

const totalLessons = result.levels.reduce((acc, l) =>
  acc + l.stages.reduce((a2, s) =>
    a2 + s.units.reduce((a3, u) => a3 + u.lessons.length, 0), 0), 0);
const totalUnits = result.levels.reduce((acc, l) =>
  acc + l.stages.reduce((a2, s) => a2 + s.units.length, 0), 0);
const totalStages = result.levels.reduce((acc, l) => acc + l.stages.length, 0);

console.log(`\n✅ تم التوليد بنجاح!`);
console.log(`📦 الحجم: ${sizeKB} KB`);
console.log(`📚 المستويات: ${result.levels.length}`);
console.log(`🎯 المراحل: ${totalStages}`);
console.log(`📖 الوحدات: ${totalUnits}`);
console.log(`📝 الدروس: ${totalLessons}`);
console.log(`🏦 وحدات بنك الأسئلة: ${Object.keys(result.exam_banks.unit_banks).length}`);
console.log(`🧪 أسئلة التصنيف: ${result.placement_test_questions.length}`);

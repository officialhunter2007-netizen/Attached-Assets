import { writeFileSync } from "fs";

const CURRICULUM = {
  schema_version: "v4.1",
  slug: "uni-it",
  name: "تقنية المعلومات",
  icon: "💻",
  description: "مسار احترافي شامل في تقنية المعلومات يغطي البنية التحتية والأمن السيبراني والسحابة وهندسة الأنظمة وفق أحدث معايير الصناعة",
  target_persona: "مهندس تقنية معلومات يسعى للتأهل المهني الكامل من الأساسيات حتى التخصص المتقدم في بيئات المؤسسات والسحابة",
  teacher_tone: "مدرب تقني متمرس يستخدم الأمثلة العملية من بيئات الإنتاج الحقيقية، يبدأ بالإشكالية قبل الحل، ويربط كل مفهوم بحالة استخدام واقعية في صناعة تقنية المعلومات",
  allowed_viz_templates: ["flowchart","network_diagram","timeline","comparison_table","architecture_diagram"],
  allowed_tools: ["nukhba_ide_python","nukhba_ide_bash","nukhba_ide_js","regex_playground"],
  levels: [
    {
      level_index: 1,
      name: "أساسيات تقنية المعلومات",
      goal: "بناء الأساس المتين في مكونات الحاسوب والشبكات وأنظمة التشغيل والأمن الرقمي اللازم لكل مهندس تقنية معلومات",
      bloom_focus: "understand",
      exam: { pass_threshold_percent: 60, time_limit_minutes: 60 },
      stages: [
        {
          stage_index: 1,
          name: "معمارية الحاسوب والأجهزة",
          goal: "فهم كيفية عمل الحاسوب على المستوى الصلب من الدوائر المنطقية إلى معمارية الخادم",
          bloom_focus: "remember",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.1.1",
              name: "المنطق الرقمي وأنظمة الترقيم",
              goal: "إتقان تحويل الأعداد بين الأنظمة وتحليل الدوائر المنطقية الأساسية",
              key_concepts: ["Binary","Hex","Octal","Boolean Algebra","Logic Gates","Truth Tables"],
              lessons: [
                { name: "نظام الترقيم الثنائي: أساس كل شيء رقمي", primary: "Binary representation and positional notation" },
                { name: "التحويل بين الأنظمة: ثنائي وعشري وست عشري", primary: "Number system conversions" },
                { name: "النظام الثماني والست عشري في الممارسة العملية", primary: "Octal and Hex in memory addresses" },
                { name: "الجبر البولياني: قوانين التبسيط المنطقي", primary: "Boolean laws: AND, OR, NOT, De Morgan" },
                { name: "البوابات المنطقية: اللبنات الأساسية للمعالج", primary: "NAND, NOR, XOR, XNOR gates" },
                { name: "جداول الحقيقة وتحليل الدوائر", primary: "Truth tables and circuit analysis" },
                { name: "خرائط كارنو وتبسيط الدوائر", primary: "Karnaugh maps for circuit simplification" },
                { name: "الدوائر التسلسلية والمتزامنة: العدّادات والسجلات", primary: "Sequential vs combinational circuits" },
                { name: "تطبيقات المنطق الرقمي في بنية الحاسوب", primary: "Digital logic in real CPU components" }
              ]
            },
            {
              unit_index: 2, code: "1.1.2",
              name: "معمارية المعالج CPU",
              goal: "فهم كيفية معالجة التعليمات داخل المعالج وأثر التصميم المعماري على الأداء",
              key_concepts: ["ALU","Control Unit","Registers","Clock Cycle","Pipeline","Cache Levels"],
              lessons: [
                { name: "مكونات المعالج: وحدة الحساب والمنطق", primary: "ALU operations and design" },
                { name: "وحدة التحكم ودورة التعليمة", primary: "Control unit and instruction cycle" },
                { name: "السجلات: ذاكرة المعالج الفورية", primary: "CPU registers and their roles" },
                { name: "دورة الساعة وتأثيرها على الأداء", primary: "Clock cycle, CPI, throughput" },
                { name: "خط الأنابيب Pipeline: معالجة متوازية للتعليمات", primary: "Pipeline stages and hazards" },
                { name: "ذاكرة التخزين المؤقت Cache: بين السرعة والسعة", primary: "Cache hierarchy and principles" },
                { name: "مشكلات خط الأنابيب: التعارضات والحلول", primary: "Data, control, and structural hazards" },
                { name: "معماريات RISC وCISC في المعالجات الحديثة", primary: "RISC vs CISC design philosophy" },
                { name: "المعالجات المتعددة النوى: التوازي على مستوى الشريحة", primary: "Multi-core and hyper-threading" }
              ]
            },
            {
              unit_index: 3, code: "1.1.3",
              name: "التسلسل الهرمي للذاكرة",
              goal: "فهم كيف تتعاون مستويات الذاكرة لتحقيق التوازن بين السرعة والسعة والتكلفة",
              key_concepts: ["Cache L1/L2/L3","RAM Types DDR4/DDR5","Virtual Memory","Paging","Swap"],
              lessons: [
                { name: "الهرمية في الذاكرة: لماذا لا نكتفي بنوع واحد", primary: "Memory hierarchy rationale" },
                { name: "ذاكرة Cache L1 وL2 وL3: الفروق والتأثير", primary: "Cache levels and latency" },
                { name: "أنواع RAM: DDR4 وDDR5 والفروق التقنية", primary: "RAM types, channels, bandwidth" },
                { name: "الذاكرة الافتراضية: توسيع الـRAM منطقياً", primary: "Virtual memory concept and purpose" },
                { name: "تقنية التصفيح Paging: كيف يُقسّم نظام التشغيل الذاكرة", primary: "Page tables and address translation" },
                { name: "TLB: تسريع ترجمة العناوين الافتراضية", primary: "Translation Lookaside Buffer" },
                { name: "ذاكرة Swap: التخزين كامتداد للـRAM", primary: "Swap space and page replacement" },
                { name: "مشكلات الذاكرة في الإنتاج: التسربات والاختناقات", primary: "Memory leaks, thrashing, OOM" },
                { name: "قياس أداء الذاكرة وتشخيص المشكلات", primary: "Memory profiling and monitoring tools" }
              ]
            },
            {
              unit_index: 4, code: "1.1.4",
              name: "تقنيات التخزين",
              goal: "مقارنة تقنيات التخزين المختلفة واختيار المناسب منها لكل بيئة إنتاج",
              key_concepts: ["HDD Mechanics","SSD NAND Flash","NVMe","RAID 0/1/5/6/10"],
              lessons: [
                { name: "الأقراص الصلبة التقليدية HDD: الميكانيكا والأداء", primary: "HDD mechanics, seek time, latency" },
                { name: "أقراص SSD: تقنية NAND Flash والأجيال المختلفة", primary: "NAND types: SLC/MLC/TLC/QLC" },
                { name: "NVMe وواجهة PCIe: تخزين بسرعة الذاكرة", primary: "NVMe protocol and PCIe lanes" },
                { name: "RAID 0 و1: الأداء مقابل التكرار", primary: "RAID 0 striping, RAID 1 mirroring" },
                { name: "RAID 5 وتعافي القرص الواحد", primary: "RAID 5 parity and rebuild time" },
                { name: "RAID 6 وحماية مزدوجة للبيانات", primary: "RAID 6 dual parity" },
                { name: "RAID 10: الأداء والحماية معاً", primary: "RAID 10 striped mirrors" },
                { name: "اختيار تقنية التخزين لأعباء العمل المختلفة", primary: "Workload-to-storage matching" },
                { name: "صيانة التخزين: SMART والتنبؤ بالأعطال", primary: "S.M.A.R.T monitoring and disk health" }
              ]
            },
            {
              unit_index: 5, code: "1.1.5",
              name: "اللوحة الأم وناقلات البيانات",
              goal: "فهم دور اللوحة الأم كنسيج ربط مكونات الحاسوب وتأثيرها على الأداء الكلي",
              key_concepts: ["Chipsets","PCIe Lanes","SATA","USB Standards","Form Factors ATX/ITX"],
              lessons: [
                { name: "اللوحة الأم: خريطة ربط مكونات النظام", primary: "Motherboard components overview" },
                { name: "الشرائح Chipset: منظم حركة البيانات", primary: "Northbridge/Southbridge, modern chipsets" },
                { name: "PCIe: الناقل العالي الأداء للبطاقات", primary: "PCIe lanes, slots, generations" },
                { name: "ناقل SATA وتوصيل أجهزة التخزين", primary: "SATA versions and connectors" },
                { name: "معايير USB: من 2.0 إلى 4.0 وThunderbolt", primary: "USB standards, speeds, connectors" },
                { name: "أشكال اللوحات ATX وMini-ITX في بيئات الخوادم", primary: "Form factors for servers vs desktops" },
                { name: "واجهات إضافية: M.2 وU.2 وOCuLink", primary: "Modern storage interfaces" },
                { name: "تخطيط PCIe في الخوادم وتعارض المسارات", primary: "PCIe bandwidth sharing and bifurcation" },
                { name: "اختبار اللوحة الأم وتشخيص أعطال الناقل", primary: "Motherboard diagnostics and POST" }
              ]
            },
            {
              unit_index: 6, code: "1.1.6",
              name: "أنظمة الطاقة والتبريد",
              goal: "تصميم بيئة طاقة وتبريد موثوقة تضمن استقرار النظام في بيئات الإنتاج",
              key_concepts: ["PSU Ratings","80 PLUS","Voltage Rails","TDP","Cooling types"],
              lessons: [
                { name: "وحدات الطاقة PSU: من الأوات إلى الكفاءة", primary: "PSU wattage, rail design, efficiency" },
                { name: "معيار 80 PLUS والكفاءة الطاقية", primary: "80 PLUS Bronze/Gold/Platinum/Titanium" },
                { name: "مسارات الجهد الكهربي: 12V و5V و3.3V", primary: "Voltage rails and power delivery" },
                { name: "حساب استهلاك الطاقة للخوادم", primary: "Power budgeting for server builds" },
                { name: "حرارة التصميم TDP وتأثيرها على التبريد", primary: "TDP definition and thermal design" },
                { name: "أنواع التبريد: هواء وسائل وغمر", primary: "Air, liquid, immersion cooling" },
                { name: "تبريد مراكز البيانات: PUE والكفاءة", primary: "Data center cooling and PUE metric" },
                { name: "إدارة الطاقة المتقطعة UPS وأنواعه", primary: "UPS types and runtime calculation" },
                { name: "مراقبة الطاقة والحرارة في الإنتاج", primary: "Power and thermal monitoring tools" }
              ]
            },
            {
              unit_index: 7, code: "1.1.7",
              name: "الأجهزة الطرفية والواجهات",
              goal: "فهم واجهات الإدخال والإخراج وتوصيلها وتشخيص مشكلاتها في بيئات العمل",
              key_concepts: ["USB/Thunderbolt","Display Standards HDMI/DP","KVM","I/O Interfaces"],
              lessons: [
                { name: "واجهات USB: الأنواع والسرعات والاستخدامات", primary: "USB Type-A/B/C, speeds, protocols" },
                { name: "Thunderbolt: الواجهة العالمية عالية الأداء", primary: "Thunderbolt protocol, daisy-chaining" },
                { name: "معايير الشاشة: HDMI وDisplayPort والفروق", primary: "HDMI vs DP: bandwidth, versions" },
                { name: "KVM Switches: إدارة خوادم متعددة بلوحة واحدة", primary: "KVM types and IP-KVM for remote" },
                { name: "واجهات الصوت والشبكة المدمجة في اللوحة", primary: "Integrated audio and NIC" },
                { name: "منافذ التسلسلي والتوازي في الأجهزة الصناعية", primary: "Serial (RS-232/485) in legacy systems" },
                { name: "إدارة الأجهزة عن بُعد: IPMI ووحدات iDRAC", primary: "Out-of-band management basics" },
                { name: "تشخيص مشكلات الأجهزة الطرفية", primary: "Device manager, driver issues, IRQ" },
                { name: "أتمتة اختبار الأجهزة الطرفية في بيئات المؤسسات", primary: "Automated hardware inventory" }
              ]
            },
            {
              unit_index: 8, code: "1.1.8",
              name: "تشخيص الأعطال وصيانة الأجهزة",
              goal: "تشخيص وإصلاح أعطال الأجهزة منهجياً باستخدام أدوات الاختبار المتخصصة",
              key_concepts: ["POST Process","BIOS/UEFI Diagnostics","Beep Codes","Hardware Testing Tools"],
              lessons: [
                { name: "عملية POST: ما يحدث قبل بدء نظام التشغيل", primary: "Power-On Self Test sequence" },
                { name: "BIOS وUEFI: الواجهة بين الأجهزة والبرامج", primary: "BIOS vs UEFI features and settings" },
                { name: "رموز التنبيه Beep Codes: رسائل الأخطاء الصوتية", primary: "POST beep codes interpretation" },
                { name: "أدوات اختبار الذاكرة: MemTest86 والبدائل", primary: "Memory testing methodologies" },
                { name: "اختبار الأقراص: SMART وأدوات التحقق من القطاعات", primary: "Disk health testing tools" },
                { name: "اختبار الطاقة: قياس الجهد والتحقق من الاستقرار", primary: "PSU testing with multimeter" },
                { name: "منهجية استكشاف الأخطاء الصلبة خطوة بخطوة", primary: "Systematic hardware troubleshooting" },
                { name: "التوثيق والإبلاغ عن الأعطال: نماذج المؤسسات", primary: "Hardware fault documentation" },
                { name: "إدارة قطع الغيار والمخزون في مراكز البيانات", primary: "Spare parts management" }
              ]
            },
            {
              unit_index: 9, code: "1.1.9",
              name: "معمارية خوادم المؤسسات",
              goal: "اختيار وتشغيل معمارية الخوادم المناسبة لمتطلبات المؤسسة من الأداء والتوفر",
              key_concepts: ["Rack vs Blade vs Tower","ECC RAM","Dual CPU","IPMI/iDRAC","Hot-swap"],
              lessons: [
                { name: "أنواع الخوادم: Rack وBlade وTower", primary: "Server form factors comparison" },
                { name: "ذاكرة ECC: حماية البيانات الحرجة من الأخطاء", primary: "ECC memory error correction" },
                { name: "الخوادم ثنائية المعالج: متى ولماذا", primary: "Dual-socket systems and NUMA" },
                { name: "إدارة الخوادم عن بُعد: IPMI وiDRAC وiLO", primary: "BMC and out-of-band management" },
                { name: "التبديل الساخن Hot-swap: استمرارية الخدمة", primary: "Hot-swap drives, PSUs, fans" },
                { name: "مصفوفات التخزين SAN وNAS في الخادم", primary: "SAN/NAS connectivity in servers" },
                { name: "تخطيط القفص Rack والكثافة الحرارية", primary: "Rack planning and power density" },
                { name: "الخوادم المدمجة HCI: البنية التحتية المتقاربة", primary: "Hyper-converged infrastructure" },
                { name: "المواصفات والشهادات: اختيار الخادم للإنتاج", primary: "Server specs, certifications, vendors" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "أنظمة التشغيل",
          goal: "إدارة وتأمين أنظمة التشغيل Windows وLinux في بيئات الخوادم المؤسسية",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.2.1",
              name: "مفاهيم نظام التشغيل ومعماريته",
              goal: "فهم البنية الداخلية لأنظمة التشغيل الحديثة وكيفية تنظيمها للموارد",
              key_concepts: ["Kernel Space/User Space","System Calls","Monolithic vs Microkernel","OS Layers"],
              lessons: [
                { name: "ما الذي يفعله نظام التشغيل فعلاً؟", primary: "OS role: abstraction and resource management" },
                { name: "النواة Kernel: القلب النابض للنظام", primary: "Kernel modes and responsibilities" },
                { name: "فضاء المستخدم وفضاء النواة: الحدود الصارمة", primary: "User space vs kernel space isolation" },
                { name: "استدعاءات النظام: الجسر بين التطبيقات والنواة", primary: "System calls interface and overhead" },
                { name: "النواة المتجانسة Monolithic: النواة القديمة والقوية", primary: "Monolithic kernel design" },
                { name: "النواة الصغيرة Microkernel: الأمان على حساب الأداء", primary: "Microkernel architecture" },
                { name: "النواة الهجينة: التوازن العملي", primary: "Hybrid kernel in Windows and macOS" },
                { name: "طبقات نظام التشغيل من الأجهزة للتطبيقات", primary: "OS layered architecture" },
                { name: "نظرة مقارنة: Linux وWindows Server وFreeBSD", primary: "OS comparison for servers" }
              ]
            },
            {
              unit_index: 2, code: "1.2.2",
              name: "إدارة العمليات والخيوط",
              goal: "إدارة دورة حياة العمليات والخيوط وتحسين جدولة المعالج في بيئات الإنتاج",
              key_concepts: ["Process States","PCB","Scheduling Algorithms FCFS/SJF/RR","Context Switch"],
              lessons: [
                { name: "العملية Process: المفهوم الأساسي للتنفيذ", primary: "Process definition and structure" },
                { name: "حالات العملية: من الإنشاء إلى الإنهاء", primary: "Process state machine" },
                { name: "كتلة التحكم في العملية PCB: هوية كل عملية", primary: "PCB contents and usage" },
                { name: "جدولة المعالج FCFS وSJF: الأساليب الكلاسيكية", primary: "FCFS and SJF algorithms" },
                { name: "الجدولة الدائرية Round Robin والأولويات", primary: "Round Robin and priority scheduling" },
                { name: "تبديل السياق Context Switch: التكلفة الخفية", primary: "Context switch overhead" },
                { name: "الخيوط Threads: التوازي داخل العملية الواحدة", primary: "Threads vs processes" },
                { name: "التزامن وحالة الجمود Deadlock: التشخيص والتعامل", primary: "Deadlock conditions and prevention" },
                { name: "مراقبة العمليات في بيئة الإنتاج", primary: "ps, top, htop in production" }
              ]
            },
            {
              unit_index: 3, code: "1.2.3",
              name: "إدارة الذاكرة",
              goal: "فهم وتطبيق آليات إدارة الذاكرة لضمان الاستقرار وتجنب الاختناقات",
              key_concepts: ["Segmentation","Paging","Page Table","TLB","Memory Allocation","Fragmentation"],
              lessons: [
                { name: "التجزئة Segmentation: تنظيم الذاكرة المنطقية", primary: "Memory segmentation concept" },
                { name: "الترقيم Paging: الذاكرة الافتراضية في التطبيق", primary: "Paging mechanism" },
                { name: "جدول الصفحات Page Table: خريطة العناوين", primary: "Page table structure" },
                { name: "TLB: ذاكرة التخزين المؤقت للعناوين", primary: "TLB operation and miss handling" },
                { name: "خوارزميات استبدال الصفحات: LRU وClock", primary: "Page replacement algorithms" },
                { name: "التجزئة الداخلية والخارجية: هدر الذاكرة", primary: "Fragmentation types and impact" },
                { name: "تخصيص الذاكرة: malloc وfree وGarbage Collection", primary: "Dynamic memory allocation" },
                { name: "تسرب الذاكرة Memory Leak: الكشف والإصلاح", primary: "Memory leak detection" },
                { name: "ضغط الذاكرة وتقليص الصفحات في Linux", primary: "Memory compression and swappiness" }
              ]
            },
            {
              unit_index: 4, code: "1.2.4",
              name: "أنظمة الملفات وإدارة التخزين",
              goal: "اختيار وإعداد نظام الملفات المناسب لكل حالة استخدام في بيئة الخوادم",
              key_concepts: ["FAT32/NTFS/ext4/XFS/ZFS","Inodes","Journaling","Mounting","Partitioning"],
              lessons: [
                { name: "أنظمة الملفات: التنظيم المنطقي للتخزين", primary: "Filesystem concepts and metadata" },
                { name: "FAT32 وNTFS: أنظمة ملفات Windows", primary: "FAT32 limitations, NTFS features" },
                { name: "ext4: نظام الملفات الافتراضي لـLinux", primary: "ext4 features: journaling, extents" },
                { name: "XFS وBtrfs وZFS: أنظمة الملفات المتقدمة", primary: "Advanced filesystems comparison" },
                { name: "العقد الكلية Inodes: بطاقة هوية كل ملف", primary: "Inode structure and limits" },
                { name: "التسجيل Journaling: الحماية من الأعطال المفاجئة", primary: "Journal modes: write-back, ordered, data" },
                { name: "التقسيم Partitioning: MBR وGPT", primary: "MBR vs GPT partitioning" },
                { name: "الوصل Mounting وملف fstab", primary: "Mount points, options, fstab" },
                { name: "مراقبة أنظمة الملفات وتشخيص الأخطاء", primary: "df, du, fsck, inode exhaustion" }
              ]
            },
            {
              unit_index: 5, code: "1.2.5",
              name: "إدارة الإدخال والإخراج والأجهزة",
              goal: "فهم آليات الإدخال والإخراج وكيفية التعامل مع برامج التشغيل في بيئات الإنتاج",
              key_concepts: ["Device Drivers","IRQ","DMA","Buffering","I/O Scheduling"],
              lessons: [
                { name: "برامج التشغيل Drivers: اللغة المشتركة بين النواة والأجهزة", primary: "Driver architecture" },
                { name: "طلبات الاقطاع IRQ: إشارات الأجهزة للمعالج", primary: "IRQ, interrupt handling" },
                { name: "الوصول المباشر للذاكرة DMA: نقل البيانات بلا معالج", primary: "DMA operation and benefits" },
                { name: "التخزين المؤقت I/O Buffering: تجانس الأداء", primary: "Buffering strategies" },
                { name: "جدولة الإدخال والإخراج: CFQ وDeadline وNoop وMQ-deadline", primary: "I/O schedulers" },
                { name: "أنواع الإدخال والإخراج: متزامن وغير متزامن ومباشر", primary: "Sync/async/direct I/O" },
                { name: "تشخيص مشكلات I/O باستخدام iostat وiotop", primary: "I/O monitoring tools" },
                { name: "إدارة برامج التشغيل في Linux: lsmod وmodprobe", primary: "Kernel module management" },
                { name: "الأجهزة الافتراضية وبرامج التشغيل في بيئات VMs", primary: "Virtio and paravirtual drivers" }
              ]
            },
            {
              unit_index: 6, code: "1.2.6",
              name: "إدارة Windows Server",
              goal: "إدارة Windows Server في بيئة المؤسسة من الإعداد الأولي إلى المراقبة المستمرة",
              key_concepts: ["Active Directory Basics","Group Policy","Event Viewer","Performance Monitor","Server Roles"],
              lessons: [
                { name: "Windows Server: الإصدارات والأدوار المدعومة", primary: "Windows Server editions and roles" },
                { name: "Active Directory: قلب إدارة المستخدمين في المؤسسة", primary: "AD DS fundamentals" },
                { name: "سياسات المجموعة GPO: التحكم المركزي في الإعدادات", primary: "Group Policy Objects" },
                { name: "مراقب الأحداث Event Viewer: قراءة سجلات النظام", primary: "Windows Event logs" },
                { name: "مراقب الأداء Performance Monitor: قياس الموارد", primary: "PerfMon counters and alerts" },
                { name: "PowerShell: أتمتة إدارة Windows Server", primary: "PowerShell cmdlets for admins" },
                { name: "إدارة الخدمات والأدوار في Windows Server", primary: "Server roles: DNS, DHCP, File Server" },
                { name: "Windows Update وإدارة التحديثات في المؤسسة", primary: "WSUS and patch management" },
                { name: "أمان Windows Server: BitLocker وWindows Firewall", primary: "Windows security hardening" }
              ]
            },
            {
              unit_index: 7, code: "1.2.7",
              name: "أساسيات Linux",
              goal: "التنقل والعمل بكفاءة في بيئة Linux الخادمية باستخدام الأوامر الأساسية",
              key_concepts: ["FHS","init vs systemd","Run Levels/Targets","Essential Commands"],
              lessons: [
                { name: "فلسفة Linux وUNIX: كل شيء ملف", primary: "Unix philosophy and FHS" },
                { name: "هيكل نظام الملفات FHS: الدليل الجذر والفروع", primary: "FHS directories and purposes" },
                { name: "init وsystemd: إدارة بدء التشغيل", primary: "SysV init vs systemd" },
                { name: "مستويات التشغيل وأهداف systemd", primary: "Run levels and systemd targets" },
                { name: "الأوامر الأساسية: ls وcp وmv وrm وmkdir", primary: "Essential file commands" },
                { name: "المستخدمون والمجموعات في Linux", primary: "User management basics" },
                { name: "الأذونات والحقوق: chmod وchown", primary: "Unix permissions model" },
                { name: "إدارة الحزم: apt وyum وdnf", primary: "Package managers" },
                { name: "systemctl وإدارة الخدمات", primary: "Service management with systemd" }
              ]
            },
            {
              unit_index: 8, code: "1.2.8",
              name: "تصليب وتأمين نظام التشغيل",
              goal: "تطبيق معايير CIS لتقليص سطح الهجوم وتأمين بيئة نظام التشغيل في الإنتاج",
              key_concepts: ["Least Privilege","Attack Surface Reduction","CIS Benchmarks","Patch Management"],
              lessons: [
                { name: "مبدأ أقل امتياز: لماذا لا نعمل كـroot دائماً", primary: "Principle of least privilege" },
                { name: "تقليص سطح الهجوم: تعطيل الخدمات غير الضرورية", primary: "Attack surface reduction" },
                { name: "معايير CIS: خريطة طريق التصليب", primary: "CIS Benchmarks overview" },
                { name: "إدارة التحديثات الأمنية ودورة رقع الثغرات", primary: "Patch management lifecycle" },
                { name: "ضبط SSH: تقوية البروتوكول الأكثر استخداماً", primary: "SSH hardening best practices" },
                { name: "أدوات التدقيق: Lynis وOpenSCAP", primary: "Security auditing tools" },
                { name: "إدارة كلمات المرور وسياسات الحسابات", primary: "Password policies and PAM" },
                { name: "Fail2Ban وحماية الخدمات من الهجمات التلقائية", primary: "Intrusion prevention basics" },
                { name: "التحقق من سلامة الملفات: AIDE وTripwire", primary: "File integrity monitoring" }
              ]
            },
            {
              unit_index: 9, code: "1.2.9",
              name: "مفاهيم الافتراضية على مستوى النظام",
              goal: "تقييم ونشر تقنيات الافتراضية المناسبة لكل حالة استخدام في بيئة المؤسسة",
              key_concepts: ["Hypervisor Type 1/2","VM vs Container","vCPU/vRAM Overhead","Snapshot/Checkpoint"],
              lessons: [
                { name: "الافتراضية: التقسيم المنطقي للموارد الصلبة", primary: "Virtualization concept and history" },
                { name: "المشرف Hypervisor النوع 1 والنوع 2", primary: "Type 1 vs Type 2 hypervisors" },
                { name: "آلة افتراضية VM مقابل الحاوية Container", primary: "VM vs container isolation" },
                { name: "تخصيص vCPU وvRAM: ما الذي يحدث داخل الـHost", primary: "Resource overcommit and overhead" },
                { name: "نقل VM بدون توقف: vMotion والبدائل", primary: "Live migration concepts" },
                { name: "اللقطات Snapshots: نقطة الارتداد الزمني", primary: "VM snapshots vs backups" },
                { name: "قوالب VM: التكرار السريع للبنية التحتية", primary: "VM templates and cloning" },
                { name: "الشبكات في الافتراضية: vSwitch وVLAN في الـVM", primary: "Virtual networking" },
                { name: "أداء الافتراضية: قياس الحمل الزائد وتحسينه", primary: "Virtualization performance tuning" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "أساسيات الشبكات",
          goal: "فهم كيفية عمل الشبكات من الطبقة المادية إلى طبقة التطبيقات وتشخيص مشكلاتها",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "1.3.1", name: "نموذج OSI وTCP/IP", goal: "تطبيق نموذجي OSI وTCP/IP لفهم وتشخيص مشكلات الشبكات بمنهجية", key_concepts: ["OSI 7 Layers","TCP/IP 4 Layers","Encapsulation","PDUs","Layer Functions"], lessons: [
              { name: "لماذا نحتاج نموذج طبقي للشبكات؟", primary: "Layered model motivation" },
              { name: "الطبقات السبع لنموذج OSI: الوظائف والمسؤوليات", primary: "OSI layers" },
              { name: "الطبقات الأربع لـTCP/IP: النموذج العملي", primary: "TCP/IP model" },
              { name: "التغليف Encapsulation: كيف تُضاف الترويسات", primary: "Data encapsulation" },
              { name: "وحدات بيانات البروتوكول PDU: Bit/Frame/Packet/Segment/Data", primary: "PDU at each layer" },
              { name: "الطبقة المادية وطبقة ربط البيانات", primary: "Layers 1 and 2" },
              { name: "طبقة الشبكة وطبقة النقل", primary: "Layers 3 and 4" },
              { name: "الطبقات العليا: جلسة وتقديم وتطبيقات", primary: "Layers 5, 6, 7" },
              { name: "تطبيق OSI في تشخيص الأعطال: Top-Down وBottom-Up", primary: "Troubleshooting with OSI" }
            ]},
            { unit_index: 2, code: "1.3.2", name: "الطبقة المادية وطبقة ربط البيانات", goal: "فهم كيفية نقل البيانات على الوسائط المادية وآليات التحكم في الوصول", key_concepts: ["Ethernet Frame","MAC Addressing","ARP","CSMA/CD","802.11 WiFi basics"], lessons: [
              { name: "وسائط الشبكة: نحاس وليف بصري وهواء", primary: "Network media types" },
              { name: "إيثرنت Ethernet: معيار الشبكة المحلية الأكثر انتشاراً", primary: "Ethernet standard" },
              { name: "الإطار Frame: بنية البيانات في الطبقة الثانية", primary: "Ethernet frame structure" },
              { name: "عناوين MAC: بطاقة الهوية الفيزيائية للأجهزة", primary: "MAC addressing" },
              { name: "بروتوكول ARP: من عنوان IP إلى عنوان MAC", primary: "ARP resolution" },
              { name: "CSMA/CD: إدارة الوصول المشترك للوسط", primary: "Collision detection" },
              { name: "أساسيات شبكات WiFi 802.11", primary: "Wireless standards basics" },
              { name: "السويتش Switch مقابل الهاب Hub: الفرق الجوهري", primary: "Hub vs switch" },
              { name: "جدول عناوين MAC وعملية إعادة التوجيه", primary: "MAC address table" }
            ]},
            { unit_index: 3, code: "1.3.3", name: "عناوين IP والـSubnetting", goal: "إتقان تخصيص عناوين IP وحساب الشبكات الفرعية لتصميم شبكات عملية", key_concepts: ["IPv4 Classes","CIDR Notation","Subnet Mask","Subnetting Math","Broadcast/Network/Host"], lessons: [
              { name: "عناوين IPv4: التمثيل والتصنيف", primary: "IPv4 addressing fundamentals" },
              { name: "فئات عناوين IP: A وB وC وD وE", primary: "IP address classes" },
              { name: "قناع الشبكة Subnet Mask: الفاصل بين الشبكة والمضيف", primary: "Subnet mask" },
              { name: "تدوين CIDR: كتابة مختصرة وأكثر مرونة", primary: "CIDR notation" },
              { name: "حساب الشبكات الفرعية: خطوات منهجية", primary: "Subnetting calculations" },
              { name: "عناوين الشبكة والبث والمضيفين المتاحين", primary: "Network/broadcast/host addresses" },
              { name: "تقسيم شبكة /24 إلى شبكات فرعية متعددة", primary: "Practical subnetting exercise" },
              { name: "IPv4 العام والخاص: RFC 1918", primary: "Private vs public addresses" },
              { name: "مقدمة إلى IPv6: لماذا ولماذا الآن", primary: "IPv6 introduction" }
            ]},
            { unit_index: 4, code: "1.3.4", name: "أساسيات التوجيه", goal: "فهم كيف تجد الحزم طريقها عبر الشبكات المترابطة", key_concepts: ["Routing Table","Default Gateway","Static vs Dynamic Routing","Metric","AD"], lessons: [
              { name: "التوجيه Routing: المفهوم الأساسي لتوصيل الشبكات", primary: "Routing fundamentals" },
              { name: "جدول التوجيه: خريطة الوجهات للموجّه", primary: "Routing table structure" },
              { name: "البوابة الافتراضية: المخرج من الشبكة المحلية", primary: "Default gateway concept" },
              { name: "التوجيه الثابت: التحكم اليدوي في المسارات", primary: "Static routing" },
              { name: "التوجيه الديناميكي: الشبكة التي تتعلم بنفسها", primary: "Dynamic routing overview" },
              { name: "المقياس Metric: كيف يختار الموجّه أفضل مسار", primary: "Routing metric" },
              { name: "المسافة الإدارية AD: الثقة في مصدر المسار", primary: "Administrative distance" },
              { name: "تشخيص مشكلات التوجيه: traceroute وping", primary: "Routing troubleshooting" },
              { name: "NAT: ترجمة عناوين الشبكة والعلاقة مع التوجيه", primary: "NAT basics" }
            ]},
            { unit_index: 5, code: "1.3.5", name: "التبديل والـVLAN", goal: "تصميم وتنفيذ بنية VLAN للفصل المنطقي لشبكات المؤسسة", key_concepts: ["Switch vs Hub","MAC Table","STP 802.1D","VLAN Tagging 802.1Q","Trunking"], lessons: [
              { name: "السويتش الذكي: لماذا تفوق على الهاب", primary: "Intelligent switching" },
              { name: "جدول عناوين MAC: كيف يتعلم السويتش", primary: "MAC learning process" },
              { name: "VLANs: الشبكات المحلية الافتراضية", primary: "VLAN concept and purpose" },
              { name: "802.1Q: الوسم الذي يميز الـVLANs", primary: "VLAN tagging standard" },
              { name: "Trunk Links: تمرير VLANs متعددة على رابط واحد", primary: "Trunking configuration" },
              { name: "STP 802.1D: منع الحلقات في الشبكة", primary: "Spanning Tree Protocol" },
              { name: "RSTP: تسريع تقارب STP", primary: "Rapid STP" },
              { name: "Port Security: منع الأجهزة غير المصرح بها", primary: "Port security features" },
              { name: "تصميم VLANs للمؤسسة: أفضل الممارسات", primary: "Enterprise VLAN design" }
            ]},
            { unit_index: 6, code: "1.3.6", name: "خدمات الشبكة الأساسية", goal: "إعداد وإدارة خدمات DNS وDHCP وNTP اللازمة لكل بنية تحتية", key_concepts: ["DNS Resolution Chain","DHCP DORA","NTP Stratum","RADIUS/TACACS+ intro"], lessons: [
              { name: "DNS: دليل الهاتف الرقمي للإنترنت", primary: "DNS purpose and structure" },
              { name: "سلسلة حل DNS: من المحلي إلى الجذر", primary: "DNS resolution chain" },
              { name: "سجلات DNS: A وAAAA وMX وCNAME وTXT", primary: "DNS record types" },
              { name: "DHCP: التخصيص التلقائي لعناوين IP", primary: "DHCP operation" },
              { name: "دورة DHCP DORA: Discover وOffer وRequest وAck", primary: "DHCP DORA process" },
              { name: "NTP: مزامنة الوقت عبر الشبكة", primary: "NTP hierarchy" },
              { name: "مقدمة إلى RADIUS وTACACS+: مصادقة الشبكة", primary: "Network authentication protocols" },
              { name: "تشخيص مشكلات DNS: nslookup وdig", primary: "DNS troubleshooting" },
              { name: "إعداد DHCP Server على Windows وLinux", primary: "DHCP server configuration" }
            ]},
            { unit_index: 7, code: "1.3.7", name: "بروتوكولات التطبيقات", goal: "فهم كيفية عمل بروتوكولات التطبيقات الشائعة وتأثيرها على تصميم البنية التحتية", key_concepts: ["HTTP/HTTPS","SMTP/POP3/IMAP","FTP/SFTP","SSH vs Telnet"], lessons: [
              { name: "HTTP: بروتوكول نقل النص التشعبي", primary: "HTTP request/response cycle" },
              { name: "HTTPS: HTTP الآمن بتشفير TLS", primary: "HTTPS and TLS handshake" },
              { name: "بروتوكولات البريد: SMTP وPOP3 وIMAP", primary: "Email protocols comparison" },
              { name: "FTP وSFTP وFTPS: نقل الملفات بأمان", primary: "File transfer protocols" },
              { name: "SSH: الوصول الآمن عن بُعد لأجهزة الخادم", primary: "SSH protocol" },
              { name: "Telnet: بروتوكول غير آمن لا يزال موجوداً", primary: "Telnet vs SSH" },
              { name: "SNMP: إدارة الأجهزة الشبكية عن بُعد", primary: "SNMP management" },
              { name: "بروتوكولات الوقت والمزامنة: NTP وSNTP", primary: "Time synchronization" },
              { name: "تحليل الحركة بـWireshark: رؤية البروتوكولات فعلياً", primary: "Protocol analysis" }
            ]},
            { unit_index: 8, code: "1.3.8", name: "الشبكات اللاسلكية", goal: "تصميم وتأمين وحل مشكلات شبكات WiFi في بيئات المؤسسات", key_concepts: ["802.11 Standards","Frequency Bands","SSID","WPA2/WPA3","MIMO"], lessons: [
              { name: "أساسيات الشبكات اللاسلكية: الترددات والقنوات", primary: "Wireless basics" },
              { name: "معايير 802.11: من a/b/g إلى ax (WiFi 6)", primary: "WiFi standards evolution" },
              { name: "نطاقات التردد 2.4GHz و5GHz و6GHz", primary: "Frequency bands comparison" },
              { name: "SSID وBSSID وESSID: هوية الشبكة اللاسلكية", primary: "Wireless identifiers" },
              { name: "أمان WiFi: WPA2 وWPA3 وEnterprise", primary: "Wireless security" },
              { name: "تقنية MIMO: أداء أعلى بأكثر من هوائي", primary: "MIMO technology" },
              { name: "نقاط الوصول Access Points وControllersها", primary: "WLAN infrastructure" },
              { name: "تداخل الإشارة وتحسين التغطية اللاسلكية", primary: "RF interference and site survey" },
              { name: "تشخيص مشكلات الاتصال اللاسلكي", primary: "WiFi troubleshooting" }
            ]},
            { unit_index: 9, code: "1.3.9", name: "استكشاف أخطاء الشبكة", goal: "تشخيص وحل مشكلات الشبكة بمنهجية باستخدام الأدوات المناسبة", key_concepts: ["OSI Troubleshooting approach","ping/traceroute/nslookup/netstat","Wireshark basics"], lessons: [
              { name: "منهجية استكشاف الأخطاء: من الأعلى للأسفل أو العكس", primary: "Troubleshooting methodology" },
              { name: "ping: أبسط اختبار للاتصال في الشبكة", primary: "ICMP ping" },
              { name: "traceroute وtracert: تتبع مسار الحزم", primary: "Traceroute analysis" },
              { name: "nslookup وdig: اختبار DNS", primary: "DNS testing tools" },
              { name: "netstat وss: حالة الاتصالات والمنافذ", primary: "Connection state tools" },
              { name: "arp -a: كشف جدول ARP المحلي", primary: "ARP table inspection" },
              { name: "Wireshark: تحليل الحزم الفعلي", primary: "Packet capture and analysis" },
              { name: "أعراض شائعة وتشخيصها: لا إنترنت رغم الاتصال", primary: "Common network symptoms" },
              { name: "توثيق الأعطال وإجراءات التصعيد", primary: "Escalation and documentation" }
            ]}
          ]
        },
        {
          stage_index: 4,
          name: "أساسيات Linux",
          goal: "إتقان العمل اليومي في Linux من سطر الأوامر وإدارة الموارد والنصوص البرمجية الأساسية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "1.4.1", name: "نظام الملفات والتنقل", goal: "التنقل الفعّال في هيكل نظام ملفات Linux والبحث عن الملفات بكفاءة", key_concepts: ["FHS","pwd/ls/cd/find","Absolute vs Relative paths","Hidden files"], lessons: [
              { name: "نظام ملفات Linux: كل شيء ملف", primary: "Everything is a file concept" },
              { name: "هيكل FHS: /bin و/etc و/var و/home و/usr", primary: "FHS directories" },
              { name: "التنقل: pwd وcd وls والمسارات المطلقة والنسبية", primary: "Navigation commands" },
              { name: "الملفات المخفية: نقطة في البداية تخفي الكثير", primary: "Hidden files" },
              { name: "أمر tree: رسم الهيكل الشجري", primary: "Directory tree visualization" },
              { name: "البحث بـfind: العثور على الملفات بمعايير دقيقة", primary: "find command" },
              { name: "locate وupdatedb: البحث بقاعدة بيانات", primary: "locate database" },
              { name: "أنواع الملفات في Linux: d وl وc وb وp وs", primary: "Linux file types" },
              { name: "الروابط الصلبة والرمزية: ln و-s", primary: "Hard and soft links" }
            ]},
            { unit_index: 2, code: "1.4.2", name: "عمليات الملفات وتحرير النصوص", goal: "إتقان إنشاء الملفات وتعديلها وتحريرها من سطر الأوامر بأدوات متعددة", key_concepts: ["cp/mv/rm/mkdir","cat/less/head/tail","nano/vim basics","file/stat/wc"], lessons: [
              { name: "إنشاء الملفات والمجلدات: touch وmkdir", primary: "File creation" },
              { name: "نسخ ونقل الملفات: cp وmv والخيارات المهمة", primary: "cp and mv" },
              { name: "حذف الملفات: rm وrmdir والحذف الآمن", primary: "File deletion" },
              { name: "قراءة محتوى الملفات: cat وless وmore", primary: "File viewing" },
              { name: "head وtail: أول وآخر سطور الملف", primary: "head and tail" },
              { name: "المحرر nano: بداية آمنة وسهلة", primary: "nano editor" },
              { name: "مقدمة إلى vim: الوضعيات والأوامر الأساسية", primary: "vim basics" },
              { name: "file وstat وwc: معلومات الملفات", primary: "File information commands" },
              { name: "تدفق النصوص: stdin وstdout وstderr والإعادة التوجيه", primary: "Standard streams" }
            ]},
            { unit_index: 3, code: "1.4.3", name: "المستخدمون والمجموعات والصلاحيات", goal: "إدارة المستخدمين والمجموعات وتطبيق نظام الصلاحيات بدقة في بيئات الإنتاج", key_concepts: ["useradd/usermod/groupadd","/etc/passwd/shadow","chmod octal/symbolic","chown","ACL","sudo"], lessons: [
              { name: "المستخدمون في Linux: مفهوم الهوية والملكية", primary: "User identity concept" },
              { name: "إنشاء وإدارة المستخدمين: useradd وusermod وuserdel", primary: "User management" },
              { name: "المجموعات: التجميع للتحكم في الوصول", primary: "Group management" },
              { name: "ملفات /etc/passwd و/etc/shadow و/etc/group", primary: "Password files" },
              { name: "نموذج الصلاحيات: قراءة وكتابة وتنفيذ", primary: "rwx permissions" },
              { name: "chmod: تغيير الصلاحيات رقمياً ورمزياً", primary: "chmod command" },
              { name: "chown وchgrp: تغيير الملكية", primary: "Ownership changes" },
              { name: "قوائم التحكم بالوصول ACL: صلاحيات أدق", primary: "ACL with setfacl" },
              { name: "sudo وsu: تصعيد الصلاحيات بأمان", primary: "sudo configuration" }
            ]},
            { unit_index: 4, code: "1.4.4", name: "إدارة العمليات", goal: "مراقبة وإدارة العمليات في نظام Linux للحفاظ على أداء واستقرار الخادم", key_concepts: ["ps/top/htop","kill/killall","nice/renice","jobs/fg/bg","nohup","systemctl"], lessons: [
              { name: "رؤية العمليات: ps والمعلومات المتاحة", primary: "Process inspection with ps" },
              { name: "top وhtop: مراقبة الموارد في الوقت الفعلي", primary: "Real-time monitoring" },
              { name: "إرسال الإشارات: kill وkillall والإشارات المختلفة", primary: "Process signals" },
              { name: "nice وrenice: تحديد أولوية المعالج", primary: "Process priority" },
              { name: "الخلفية والمقدمة: jobs وfg وbg و&", primary: "Job control" },
              { name: "nohup: استمرار العملية بعد إغلاق الجلسة", primary: "Process persistence" },
              { name: "systemctl: إدارة خدمات systemd", primary: "Service management" },
              { name: "pgrep وpkill: البحث عن العمليات وإيقافها", primary: "Process search and kill" },
              { name: "العمليات الزومبي والتيتم: ما يحدث بعد الانتهاء", primary: "Zombie and orphan processes" }
            ]},
            { unit_index: 5, code: "1.4.5", name: "إدارة الحزم والمستودعات", goal: "إدارة دورة حياة البرامج كاملة من التثبيت إلى الإزالة مع الحفاظ على استقرار النظام", key_concepts: ["apt/yum/dnf/zypper","dpkg/rpm","Repositories","GPG Keys","Dependency resolution"], lessons: [
              { name: "مديرو الحزم: لماذا هم ضروريون", primary: "Package manager concept" },
              { name: "apt وdpkg على Ubuntu وDebian", primary: "Debian package management" },
              { name: "yum وdnf وrpm على RHEL وFedora", primary: "RPM package management" },
              { name: "المستودعات Repositories: مصادر البرامج الموثوقة", primary: "Repository configuration" },
              { name: "مفاتيح GPG: التحقق من صحة الحزم", primary: "Package signing" },
              { name: "حل التبعيات Dependency Resolution", primary: "Dependency management" },
              { name: "تثبيت حزم من المصدر: ./configure && make && make install", primary: "Building from source" },
              { name: "Snap وFlatpak: التعبئة الحديثة", primary: "Modern packaging" },
              { name: "الحزم الخاصة بالمؤسسات: إنشاء مستودع داخلي", primary: "Private repositories" }
            ]},
            { unit_index: 6, code: "1.4.6", name: "الـShell والنصوص البرمجية الأساسية", goal: "كتابة نصوص Bash برمجية لأتمتة المهام الإدارية اليومية", key_concepts: ["Bash vs sh","Variables","Quoting","Pipes","Redirection","Globbing","Here-doc"], lessons: [
              { name: "Shell والـBash: بيئة عمل تفاعلية وبرمجية", primary: "Shell and Bash" },
              { name: "المتغيرات والمتغيرات البيئية في Bash", primary: "Variables and environment" },
              { name: "الاقتباس: الفرق بين ' و\" و`", primary: "Quoting rules" },
              { name: "الأنابيب Pipes: ربط الأوامر في تسلسل", primary: "Pipes and command chaining" },
              { name: "إعادة التوجيه: > و>> و< و2> و&>", primary: "I/O redirection" },
              { name: "Globbing: أنماط البحث عن الملفات", primary: "Glob patterns" },
              { name: "Here-doc: إدخال نص متعدد الأسطر", primary: "Heredoc syntax" },
              { name: "أول نص برمجي: shebang والأوامر المتسلسلة", primary: "First script" },
              { name: "التصحيح Debug: bash -x وset -e وset -u", primary: "Script debugging" }
            ]},
            { unit_index: 7, code: "1.4.7", name: "إعداد الشبكة في Linux", goal: "إعداد وإدارة الاتصالات الشبكية في Linux بالأدوات الحديثة", key_concepts: ["ip addr/route/link","nmcli","/etc/network/interfaces","DNS config","/etc/resolv.conf"], lessons: [
              { name: "الأوامر الشبكية القديمة والحديثة: ifconfig مقابل ip", primary: "Network tools evolution" },
              { name: "ip addr: عرض وإعداد عناوين الشبكة", primary: "ip addr command" },
              { name: "ip route: إدارة جدول التوجيه", primary: "Routing configuration" },
              { name: "ip link: إدارة واجهات الشبكة", primary: "Network interfaces" },
              { name: "NetworkManager وnmcli: الإعداد الدائم", primary: "NetworkManager" },
              { name: "ملف /etc/network/interfaces: الإعداد على Debian", primary: "Debian network config" },
              { name: "إعداد DNS: /etc/resolv.conf و/etc/nsswitch.conf", primary: "DNS client config" },
              { name: "ss وnetstat: مراقبة الاتصالات والمنافذ", primary: "Connection monitoring" },
              { name: "استكشاف أخطاء الشبكة في Linux", primary: "Linux network troubleshooting" }
            ]},
            { unit_index: 8, code: "1.4.8", name: "إدارة الأقراص في Linux", goal: "إدارة التقسيم والتهيئة والتركيب والمراقبة للأقراص في بيئات الخوادم", key_concepts: ["lsblk/fdisk/parted","mkfs","mount/umount/fstab","LVM","df/du"], lessons: [
              { name: "مخطط الأقراص: lsblk وfdisk -l وblkid", primary: "Disk listing tools" },
              { name: "التقسيم بـfdisk: MBR وGPT", primary: "Disk partitioning" },
              { name: "parted: التقسيم المتقدم للأقراص الكبيرة", primary: "GNU parted" },
              { name: "تهيئة الأقراص: mkfs وأنواع الأنظمة", primary: "Filesystem creation" },
              { name: "الوصل والفصل: mount وumount والخيارات", primary: "Mount operations" },
              { name: "ملف fstab: الوصل التلقائي عند بدء التشغيل", primary: "fstab configuration" },
              { name: "LVM: المرونة في إدارة التخزين", primary: "Logical Volume Manager" },
              { name: "df وdu: مراقبة استهلاك التخزين", primary: "Disk usage monitoring" },
              { name: "تشخيص مشكلات التخزين: قرص ممتلئ ونظام ملفات تالف", primary: "Storage troubleshooting" }
            ]},
            { unit_index: 9, code: "1.4.9", name: "إدارة السجلات والمراقبة", goal: "مراقبة صحة الخادم من خلال السجلات ومؤشرات الأداء في الوقت الفعلي", key_concepts: ["journalctl","/var/log structure","syslog/rsyslog","logrotate","uptime/vmstat/iostat/sar"], lessons: [
              { name: "أهمية السجلات في إدارة الأنظمة", primary: "Logging importance" },
              { name: "هيكل /var/log: أين تذهب السجلات في Linux", primary: "/var/log structure" },
              { name: "journalctl: قراءة سجلات systemd", primary: "journalctl usage" },
              { name: "syslog وrsyslog: البنية التحتية للسجلات", primary: "Syslog infrastructure" },
              { name: "logrotate: إدارة حجم السجلات ودورة حياتها", primary: "Log rotation" },
              { name: "uptime وwhoami وlast: معلومات أساسية عن النظام", primary: "System information" },
              { name: "vmstat: مراقبة الذاكرة والمعالج والإدخال/الإخراج", primary: "vmstat" },
              { name: "iostat وsar: تاريخ أداء النظام", primary: "Performance history" },
              { name: "إعداد التنبيهات من السجلات: egrep والأتمتة", primary: "Log alerting" }
            ]}
          ]
        },
        {
          stage_index: 5,
          name: "أساسيات الأمن الرقمي",
          goal: "بناء قاعدة متينة في مفاهيم الأمن السيبراني والتشفير وأساليب الحماية",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "1.5.1", name: "مفاهيم الأمن وثالوث CIA", goal: "فهم أسس أمن المعلومات وأُطر التقييم الأمني", key_concepts: ["CIA Triad","DAD Triad","Security Controls Types","Defense in Depth"], lessons: [
              { name: "ثالوث CIA: الأساس الذي يقوم عليه الأمن الرقمي", primary: "CIA Confidentiality/Integrity/Availability" },
              { name: "عكس CIA: DAD ثالوث الهجوم", primary: "DAD Triad" },
              { name: "ضوابط الأمن: وقائية وكاشفة ومصححة", primary: "Security control types" },
              { name: "الدفاع المتعمق: طبقات الحماية المتداخلة", primary: "Defense in depth" },
              { name: "المخاطر والتهديدات والثغرات: الثلاثي الأمني", primary: "Risk, threat, vulnerability" },
              { name: "مستويات تصنيف البيانات: سري ومقيد وعام", primary: "Data classification" },
              { name: "السياسة الأمنية: الأساس التنظيمي للحماية", primary: "Security policy" },
              { name: "ISMS: نظام إدارة أمن المعلومات", primary: "Information security management" },
              { name: "أخلاقيات أمن المعلومات: القانوني والأخلاقي والمهني", primary: "Security ethics" }
            ]},
            { unit_index: 2, code: "1.5.2", name: "استخبارات التهديدات وتصنيف الهجمات", goal: "تحديد أنواع التهديدات ومصادرها وتقييم خطورتها وفق أُطر معيارية", key_concepts: ["MITRE ATT&CK","Kill Chain","Threat Actors","APT","IOC/IOA","CVE/CVSS"], lessons: [
              { name: "أنواع الجهات الخصومة: من المبتدئ إلى الدولة القومية", primary: "Threat actor types" },
              { name: "APT: التهديدات الدائمة والمتقدمة", primary: "Advanced Persistent Threats" },
              { name: "سلسلة القتل Cyber Kill Chain: مراحل الهجوم", primary: "Kill chain model" },
              { name: "MITRE ATT&CK: مصفوفة التكتيكات والتقنيات", primary: "ATT&CK framework" },
              { name: "CVE: قاعدة بيانات الثغرات الشائعة", primary: "CVE system" },
              { name: "CVSS: قياس خطورة الثغرات بمعيار موحد", primary: "CVSS scoring" },
              { name: "مؤشرات الاختراق IOC ومؤشرات الهجوم IOA", primary: "IOC vs IOA" },
              { name: "مصادر استخبارات التهديدات: الحرة والتجارية", primary: "Threat intelligence sources" },
              { name: "تقرير استخبارات التهديدات: كيفية قراءته وتطبيقه", primary: "Threat intel application" }
            ]},
            { unit_index: 3, code: "1.5.3", name: "أساسيات التشفير", goal: "فهم آليات التشفير المختلفة وتطبيقاتها في حماية البيانات أثناء النقل والتخزين", key_concepts: ["Symmetric AES","Asymmetric RSA/ECC","Hashing SHA-256/MD5","PKI","Digital Signatures"], lessons: [
              { name: "لماذا نحتاج التشفير: من الكتابة المخفية إلى AES", primary: "Encryption history and need" },
              { name: "التشفير المتماثل Symmetric: مفتاح واحد للجميع", primary: "Symmetric encryption" },
              { name: "AES: المعيار الذهبي للتشفير المتماثل", primary: "AES algorithm" },
              { name: "التشفير غير المتماثل Asymmetric: المفتاح العام والخاص", primary: "Asymmetric encryption" },
              { name: "RSA وECC: المعايير الأكثر استخداماً", primary: "RSA and ECC" },
              { name: "التجزئة Hashing: بصمة رقمية لا تُعكس", primary: "Hash functions" },
              { name: "التوقيع الرقمي: المصادقة والسلامة معاً", primary: "Digital signatures" },
              { name: "PKI: البنية التحتية للمفتاح العام", primary: "Public Key Infrastructure" },
              { name: "TLS/SSL: التشفير في طبقة النقل", primary: "TLS in practice" }
            ]},
            { unit_index: 4, code: "1.5.4", name: "المصادقة والتحكم في الوصول", goal: "تصميم وتطبيق آليات مصادقة وتحكم في الوصول تتوافق مع متطلبات المؤسسة", key_concepts: ["Authentication Factors","MFA","RBAC/ABAC/MAC/DAC","OAuth2/OIDC basics","Zero Trust intro"], lessons: [
              { name: "المصادقة Authentication مقابل التفويض Authorization", primary: "AuthN vs AuthZ" },
              { name: "عوامل المصادقة: ما تعرفه وما تمتلكه وما أنت عليه", primary: "Authentication factors" },
              { name: "المصادقة متعددة العوامل MFA: الطبقة الإضافية", primary: "MFA implementation" },
              { name: "RBAC: التحكم القائم على الدور في المؤسسة", primary: "Role-based access control" },
              { name: "ABAC: التحكم بالسمات للسياسات المعقدة", primary: "Attribute-based access control" },
              { name: "MAC وDAC: النماذج الكلاسيكية للتحكم", primary: "MAC and DAC models" },
              { name: "OAuth2 وOIDC: التفويض الحديث للتطبيقات", primary: "OAuth2 and OIDC" },
              { name: "انعدام الثقة Zero Trust: لا ثقة بلا تحقق", primary: "Zero Trust model" },
              { name: "تدقيق الوصول وسجلات المصادقة", primary: "Access auditing" }
            ]},
            { unit_index: 5, code: "1.5.5", name: "أمن الشبكات الأساسي", goal: "تصميم بنية أمنية للشبكة تحمي الأصول من التهديدات الشائعة", key_concepts: ["Firewall Types","DMZ","IDS/IPS","Packet Filtering","Network Segmentation"], lessons: [
              { name: "جدران الحماية Firewalls: الحارس الأول للشبكة", primary: "Firewall types" },
              { name: "الفلترة بالحزم Packet Filtering: القواعد الأساسية", primary: "Packet filtering" },
              { name: "جدران الحماية الحاملة للحالة Stateful Firewalls", primary: "Stateful inspection" },
              { name: "المنطقة المجردة DMZ: عزل الخدمات العامة", primary: "DMZ architecture" },
              { name: "IDS: الكشف عن التطفل دون إيقافه", primary: "IDS systems" },
              { name: "IPS: الكشف والمنع المتكامل", primary: "IPS systems" },
              { name: "NGFW: جدار الحماية من الجيل التالي", primary: "Next-gen firewalls" },
              { name: "تجزئة الشبكة Network Segmentation: عزل المناطق", primary: "Network segmentation" },
              { name: "Honeypot: الفخ الذكي للمهاجمين", primary: "Honeypot concept" }
            ]},
            { unit_index: 6, code: "1.5.6", name: "أمن نقاط النهاية", goal: "حماية محطات العمل والخوادم من التهديدات المتقدمة باستخدام طبقات متعددة", key_concepts: ["Antivirus/EDR/XDR","Application Whitelisting","DLP","Patch Management","Sandboxing"], lessons: [
              { name: "تطور حماية نقاط النهاية: من الـAV إلى XDR", primary: "Endpoint protection evolution" },
              { name: "مكافحة الفيروسات: الأساليب القائمة على التوقيع والسلوك", primary: "Antivirus approaches" },
              { name: "EDR: الكشف والاستجابة عند نقطة النهاية", primary: "EDR capabilities" },
              { name: "XDR: الكشف والاستجابة الموسعة", primary: "XDR platform" },
              { name: "القائمة البيضاء للتطبيقات: ما يُسمح به فقط", primary: "Application whitelisting" },
              { name: "DLP: منع تسرب البيانات", primary: "Data Loss Prevention" },
              { name: "إدارة التحديثات والرقع: دورة Patch Management", primary: "Patch management" },
              { name: "Sandboxing: تشغيل الملفات المشبوهة في عزل", primary: "Sandboxing technology" },
              { name: "سياسات نقاط النهاية في بيئة المؤسسة", primary: "Endpoint policy management" }
            ]},
            { unit_index: 7, code: "1.5.7", name: "إدارة الثغرات", goal: "إدارة دورة حياة الثغرات الأمنية من الاكتشاف إلى المعالجة بطريقة منهجية", key_concepts: ["Vulnerability Lifecycle","CVSS Scoring","Scanning Nessus/OpenVAS","Remediation SLAs","Risk Acceptance"], lessons: [
              { name: "دورة حياة الثغرة: من الاكتشاف إلى الإصلاح", primary: "Vulnerability lifecycle" },
              { name: "فحص الثغرات: Nessus وOpenVAS", primary: "Vulnerability scanners" },
              { name: "تفسير نتائج الفحص وإزالة الإيجابيات الكاذبة", primary: "Results interpretation" },
              { name: "CVSS في التطبيق العملي: التقييم الكمي للخطر", primary: "CVSS application" },
              { name: "تحديد أولويات المعالجة: الحرجة أولاً", primary: "Remediation prioritization" },
              { name: "SLA للمعالجة: الجداول الزمنية المؤسسية", primary: "Remediation SLAs" },
              { name: "قبول الخطر Risk Acceptance: متى نقرر عدم المعالجة", primary: "Risk acceptance" },
              { name: "برامج الكشف عن الثغرات Bug Bounty", primary: "Bug bounty programs" },
              { name: "تقارير إدارة الثغرات للإدارة العليا", primary: "Executive vulnerability reports" }
            ]},
            { unit_index: 8, code: "1.5.8", name: "السياسات الأمنية والامتثال", goal: "تطوير وتطبيق السياسات الأمنية المتوافقة مع الأُطر والمعايير الدولية", key_concepts: ["ISO 27001","NIST CSF","Password Policy","Acceptable Use Policy","Security Awareness"], lessons: [
              { name: "السياسة الأمنية: من ورقة إلى ثقافة مؤسسية", primary: "Security policy development" },
              { name: "ISO 27001: المعيار الدولي لإدارة أمن المعلومات", primary: "ISO 27001 overview" },
              { name: "NIST CSF: إطار الأمن السيبراني الأمريكي", primary: "NIST Cybersecurity Framework" },
              { name: "سياسة كلمات المرور: المعايير الحديثة", primary: "Password policy standards" },
              { name: "سياسة الاستخدام المقبول AUP", primary: "Acceptable use policy" },
              { name: "التوعية الأمنية: بناء ثقافة وقاية", primary: "Security awareness training" },
              { name: "التدقيق والامتثال: كيف نثبت الالتزام", primary: "Audit and compliance" },
              { name: "GDPR وحماية البيانات: المتطلبات الأساسية", primary: "GDPR basics" },
              { name: "إدارة بائعي الطرف الثالث: مخاطر سلسلة التوريد", primary: "Third-party risk" }
            ]},
            { unit_index: 9, code: "1.5.9", name: "أساسيات الاستجابة للحوادث", goal: "تطبيق إجراءات الاستجابة للحوادث الأمنية وفق منهجية NIST المعيارية", key_concepts: ["NIST IR Lifecycle","Chain of Custody","Triage"], lessons: [
              { name: "دورة حياة الاستجابة للحوادث NIST: المراحل الست", primary: "NIST IR lifecycle" },
              { name: "مرحلة الإعداد Preparation: قبل وقوع الحادثة", primary: "Incident preparation" },
              { name: "الكشف والتحليل Detection: التعرف على الحادثة", primary: "Detection and analysis" },
              { name: "الاحتواء Containment: وقف الانتشار", primary: "Containment strategies" },
              { name: "الاستئصال Eradication: إزالة جذور الهجوم", primary: "Eradication phase" },
              { name: "التعافي Recovery: العودة للحالة الطبيعية", primary: "Recovery phase" },
              { name: "الدروس المستفادة Post-Incident Review", primary: "Lessons learned" },
              { name: "سلسلة الحضانة Chain of Custody: الأدلة الرقمية", primary: "Chain of custody" },
              { name: "Triage: ترتيب أولويات الاستجابة للحوادث المتزامنة", primary: "Incident triage" }
            ]}
          ]
        },
        {
          stage_index: 6,
          name: "البيانات والتخزين",
          goal: "إدارة وتنظيم البيانات بأنواعها وأنظمة التخزين المختلفة مع ضمان سلامتها",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "1.6.1", name: "أنواع البيانات والتمثيل", goal: "فهم كيفية تمثيل أنواع البيانات المختلفة رقمياً وتأثير ذلك على معالجتها", key_concepts: ["Structured/Semi-structured/Unstructured","Data Types","Encoding UTF-8/ASCII","Endianness"], lessons: [
              { name: "أنواع البيانات: منظمة وشبه منظمة وغير منظمة", primary: "Data types classification" },
              { name: "أنواع البيانات الأولية: int وfloat وstring وboolean", primary: "Primitive data types" },
              { name: "ترميز النصوص: ASCII وUnicode وUTF-8", primary: "Text encoding" },
              { name: "Endianness: ترتيب البايتات في الذاكرة", primary: "Big endian vs little endian" },
              { name: "الأعداد العشرية في الحاسوب: IEEE 754", primary: "Floating point representation" },
              { name: "التمثيل الثنائي للأعداد الصحيحة السالبة", primary: "Two's complement" },
              { name: "البيانات الهيكلية: الصفوف والسجلات", primary: "Structured data" },
              { name: "البيانات شبه المنظمة: JSON وXML وYAML", primary: "Semi-structured data" },
              { name: "البيانات غير المنظمة: الصور والصوت والنصوص الحرة", primary: "Unstructured data" }
            ]},
            { unit_index: 2, code: "1.6.2", name: "صيغ الملفات والترميز", goal: "فهم صيغ الملفات الشائعة والتعامل معها في سياق إدارة البيانات", key_concepts: ["JSON/XML/CSV/YAML/Protobuf","MIME Types","Base64","Binary vs Text formats"], lessons: [
              { name: "JSON: صيغة البيانات الأكثر استخداماً في APIs", primary: "JSON format" },
              { name: "XML: صيغة البيانات المنظمة القديمة", primary: "XML structure" },
              { name: "CSV: الجداول في أبسط صورة", primary: "CSV format" },
              { name: "YAML: التهيئة بأسلوب إنساني", primary: "YAML format" },
              { name: "Protocol Buffers: البيانات الثنائية عالية الكفاءة", primary: "Protobuf" },
              { name: "MIME Types: تعريف نوع المحتوى", primary: "MIME types" },
              { name: "Base64: ترميز البيانات الثنائية كنص", primary: "Base64 encoding" },
              { name: "الفرق بين صيغ النص والثنائية في الأداء", primary: "Binary vs text trade-offs" },
              { name: "تحليل الملفات: تحديد النوع والتحقق من البنية", primary: "File parsing" }
            ]},
            { unit_index: 3, code: "1.6.3", name: "مفاهيم قواعد البيانات العلائقية", goal: "فهم أسس التصميم العلائقي لبناء قواعد بيانات منظمة وقابلة للصيانة", key_concepts: ["RDBMS","Tables/Rows/Columns","Schema","Primary/Foreign Keys","Normalization 1NF-3NF"], lessons: [
              { name: "قواعد البيانات العلائقية: نموذج E.F. Codd", primary: "Relational model" },
              { name: "الجداول والصفوف والأعمدة: المفاهيم الأساسية", primary: "Table structure" },
              { name: "المفتاح الأساسي Primary Key: معرّف الصف الفريد", primary: "Primary key" },
              { name: "المفتاح الأجنبي Foreign Key: الربط بين الجداول", primary: "Foreign key" },
              { name: "المخطط Schema: خريطة قاعدة البيانات", primary: "Database schema" },
              { name: "الشكل الأول 1NF: تنظيم الأعمدة", primary: "First normal form" },
              { name: "الشكل الثاني والثالث 2NF وNF3: تقليل التكرار", primary: "2NF and 3NF" },
              { name: "القيود Constraints: ضمان سلامة البيانات", primary: "Database constraints" },
              { name: "فهارس الجداول: تسريع الاستعلامات", primary: "Basic indexing" }
            ]},
            { unit_index: 4, code: "1.6.4", name: "أساسيات SQL", goal: "كتابة استعلامات SQL فعّالة لاسترجاع وتعديل وتحليل البيانات", key_concepts: ["SELECT/WHERE/ORDER BY","INSERT/UPDATE/DELETE","JOIN types","Aggregate Functions"], lessons: [
              { name: "SELECT: استرجاع البيانات من الجدول", primary: "SELECT statement" },
              { name: "WHERE والتصفية: استرجاع ما نحتاجه فقط", primary: "WHERE clause" },
              { name: "ORDER BY وGROUP BY: ترتيب وتجميع النتائج", primary: "Sorting and grouping" },
              { name: "HAVING: تصفية النتائج المجمعة", primary: "HAVING clause" },
              { name: "INSERT وUPDATE وDELETE: تعديل البيانات", primary: "DML statements" },
              { name: "INNER JOIN: الدمج على الصفوف المتطابقة", primary: "Inner join" },
              { name: "LEFT JOIN وRIGHT JOIN: الدمج مع الحفاظ على كل الصفوف", primary: "Outer joins" },
              { name: "دوال التجميع: COUNT وSUM وAVG وMIN وMAX", primary: "Aggregate functions" },
              { name: "Subqueries: استعلامات داخل استعلامات", primary: "Basic subqueries" }
            ]},
            { unit_index: 5, code: "1.6.5", name: "شبكات التخزين SAN وNAS", goal: "تصميم واختيار بنية التخزين الشبكية المناسبة لمتطلبات المؤسسة", key_concepts: ["Block vs File vs Object Storage","SAN iSCSI/FC","NAS NFS/SMB/CIFS","Object Storage S3 API"], lessons: [
              { name: "نماذج التخزين: Block وFile وObject", primary: "Storage types comparison" },
              { name: "SAN: شبكة التخزين الفيبري عالية الأداء", primary: "Fiber Channel SAN" },
              { name: "iSCSI: SAN عبر شبكة IP التقليدية", primary: "iSCSI protocol" },
              { name: "NAS: التخزين المشترك عبر الشبكة", primary: "NAS storage" },
              { name: "NFS: مشاركة الملفات في عالم Linux/Unix", primary: "NFS protocol" },
              { name: "SMB/CIFS: مشاركة الملفات في بيئة Windows", primary: "SMB protocol" },
              { name: "التخزين الكائني Object Storage: S3 وبدائله", primary: "Object storage S3 API" },
              { name: "مقارنة نماذج التخزين للحالات العملية", primary: "Storage selection guide" },
              { name: "استقرار التخزين وإدارة الموارد في SAN/NAS", primary: "Storage management" }
            ]},
            { unit_index: 6, code: "1.6.6", name: "استراتيجيات النسخ الاحتياطي والاسترداد", goal: "تصميم وتطبيق استراتيجية نسخ احتياطي شاملة تضمن استمرارية الأعمال", key_concepts: ["3-2-1 Rule","Full/Incremental/Differential","RPO/RTO","Backup Rotation","Verification"], lessons: [
              { name: "النسخ الاحتياطي: ليس مجرد نسخ بل ضمان استمرارية", primary: "Backup purpose" },
              { name: "قاعدة 3-2-1: الذهب في عالم النسخ الاحتياطي", primary: "3-2-1 rule" },
              { name: "النسخ الاحتياطي الكامل: الأساس الموثوق", primary: "Full backup" },
              { name: "النسخ الزيادي Incremental: سرعة مع تعقيد الاسترداد", primary: "Incremental backup" },
              { name: "النسخ التفاضلي Differential: التوازن الذهبي", primary: "Differential backup" },
              { name: "RPO: كم بيانات يمكن أن نخسر؟", primary: "Recovery Point Objective" },
              { name: "RTO: كم وقتاً يمكن أن نتوقف؟", primary: "Recovery Time Objective" },
              { name: "التحقق من النسخ الاحتياطية: الاختبار الإلزامي", primary: "Backup verification" },
              { name: "سياسة الاحتفاظ Backup Retention والدورة الزمنية", primary: "Backup retention" }
            ]},
            { unit_index: 7, code: "1.6.7", name: "الضغط والأرشفة", goal: "تطبيق أدوات الضغط والأرشفة لتحسين استهلاك التخزين وتسريع النقل", key_concepts: ["gzip/bzip2/xz/zstd","tar","Compression Ratios","Lossless vs Lossy","archive formats"], lessons: [
              { name: "أساسيات الضغط: كيف يُقلص الخوارزمي الملف", primary: "Compression algorithms" },
              { name: "الضغط بلا خسائر Lossless مقابل المفقد Lossy", primary: "Lossy vs lossless" },
              { name: "gzip: الضغط الأسرع للاستخدام العام", primary: "gzip compression" },
              { name: "bzip2 وxz: الضغط الأقوى على حساب السرعة", primary: "bzip2 and xz" },
              { name: "zstd: الأداء الحديث في الضغط", primary: "Zstandard compression" },
              { name: "tar: الأرشفة قبل الضغط", primary: "tar archiving" },
              { name: "نسب الضغط: تحليل المقايضة مع الوقت", primary: "Compression ratios" },
              { name: "ضغط الشبكة: تسريع النقل بضغط HTTP", primary: "Network compression" },
              { name: "الأرشفة الطويلة المدى: صيغ مناسبة للحفظ", primary: "Long-term archival" }
            ]},
            { unit_index: 8, code: "1.6.8", name: "سلامة البيانات والتحقق", goal: "ضمان سلامة البيانات وكشف التلف باستخدام آليات التحقق المناسبة", key_concepts: ["Checksums MD5/SHA","CRC","RAID Parity","Data Deduplication","Bit Rot","Scrubbing"], lessons: [
              { name: "لماذا تتلف البيانات: العوامل والمخاطر", primary: "Data corruption causes" },
              { name: "Checksums: بصمة التحقق من سلامة البيانات", primary: "Checksum concept" },
              { name: "MD5 وSHA-1 وSHA-256: الفروق والاستخدامات", primary: "Hash algorithms for verification" },
              { name: "CRC: كشف الأخطاء في النقل", primary: "Cyclic Redundancy Check" },
              { name: "تكافؤ RAID Parity: الحماية من فشل القرص", primary: "RAID parity" },
              { name: "إزالة التكرار Deduplication: توفير التخزين", primary: "Data deduplication" },
              { name: "Bit Rot: التلف الصامت عبر الزمن", primary: "Bit rot phenomenon" },
              { name: "فحص الأنظمة Scrubbing: الكشف الاستباقي", primary: "Filesystem scrubbing" },
              { name: "التشفير وسلامة البيانات: AEAD وMAC", primary: "Authenticated encryption" }
            ]},
            { unit_index: 9, code: "1.6.9", name: "مفاهيم البيانات الضخمة", goal: "فهم تحديات وأُطر البيانات الضخمة وكيفية التعامل معها في بيئات المؤسسات", key_concepts: ["Volume/Velocity/Variety","HDFS","MapReduce concept","Data Lake vs Warehouse"], lessons: [
              { name: "البيانات الضخمة: الـ5Vs والتحديات الجوهرية", primary: "Big data characteristics" },
              { name: "HDFS: نظام الملفات الموزع لـHadoop", primary: "HDFS architecture" },
              { name: "MapReduce: معالجة البيانات الموزعة", primary: "MapReduce paradigm" },
              { name: "Apache Spark: المعالجة في الذاكرة للبيانات الضخمة", primary: "Spark introduction" },
              { name: "بحيرة البيانات Data Lake: البيانات الخام في مستودع موحد", primary: "Data lake concept" },
              { name: "مستودع البيانات Data Warehouse: البيانات المنظمة للتحليل", primary: "Data warehouse" },
              { name: "الفرق بين Data Lake وData Warehouse في التطبيق", primary: "Lake vs warehouse" },
              { name: "Apache Kafka: تدفق البيانات في الوقت الفعلي", primary: "Kafka streaming" },
              { name: "دور مهندس تقنية المعلومات في بيئات البيانات الضخمة", primary: "IT role in big data" }
            ]}
          ]
        },
        {
          stage_index: 7,
          name: "دعم تقنية المعلومات والاستكشاف",
          goal: "إتقان منهجية استكشاف الأخطاء وإدارة طلبات الدعم وفق أُطر ITIL",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "1.7.1", name: "مكاتب المساعدة وأنظمة التذاكر", goal: "إدارة دورة حياة تذاكر الدعم وتطبيق مصفوفة الأولوية في بيئة مؤسسية", key_concepts: ["ITIL Service Desk","Ticket Lifecycle","Priority Matrix","SLA Tracking","Escalation"], lessons: [
              { name: "مكتب الخدمة Service Desk: نقطة الاتصال الوحيدة", primary: "Service desk concept" },
              { name: "دورة حياة التذكرة: من الوصول إلى الإغلاق", primary: "Ticket lifecycle" },
              { name: "مصفوفة الأولوية: التأثير × الإلحاح", primary: "Priority matrix" },
              { name: "اتفاقيات مستوى الخدمة SLA: الالتزامات الرسمية", primary: "SLA management" },
              { name: "تتبع مستوى الخدمة وتقارير الأداء", primary: "SLA tracking" },
              { name: "مسارات التصعيد: متى ترفع التذكرة لمستوى أعلى", primary: "Escalation paths" },
              { name: "قواعد المعرفة Knowledge Base: حل المشكلات الشائعة", primary: "Knowledge management" },
              { name: "أدوات ITSM الشائعة: ServiceNow وJira Service Management", primary: "ITSM tools" },
              { name: "تقارير الدعم وتحليل الاتجاهات", primary: "Support metrics and trends" }
            ]},
            { unit_index: 2, code: "1.7.2", name: "منهجية استكشاف أخطاء الأجهزة", goal: "تشخيص وحل أعطال الأجهزة بمنهجية منظمة وموثقة", key_concepts: ["Troubleshooting Methodology","Hardware Fault Isolation"], lessons: [
              { name: "منهجية استكشاف الأخطاء: الخطوات الست", primary: "6-step troubleshooting" },
              { name: "تحديد المشكلة: الأسئلة الصحيحة للتشخيص", primary: "Problem definition" },
              { name: "وضع نظرية سببية: التخمين المنطقي", primary: "Cause theory" },
              { name: "اختبار النظرية: إثبات أو دحض الافتراض", primary: "Theory testing" },
              { name: "خطة العلاج: الإصلاح أو التصعيد", primary: "Action plan" },
              { name: "التنفيذ والتحقق: إصلاح المشكلة والتأكد", primary: "Fix and verify" },
              { name: "التوثيق: حفظ الحل للمستقبل", primary: "Documentation" },
              { name: "عزل الأعطال: ما المكوّن المعيوب؟", primary: "Fault isolation" },
              { name: "أدوات الاختبار الميداني للأجهزة", primary: "Field testing tools" }
            ]},
            { unit_index: 3, code: "1.7.3", name: "استكشاف أخطاء نظام التشغيل", goal: "تشخيص وحل مشكلات نظام التشغيل في بيئتي Windows وLinux", key_concepts: ["Safe Mode/Recovery","Blue Screen Analysis","Kernel Panic Linux","System Restore"], lessons: [
              { name: "النظام لا يقلع: التشخيص من قبل بدء التشغيل", primary: "Boot failure diagnosis" },
              { name: "الوضع الآمن Safe Mode في Windows", primary: "Windows Safe Mode" },
              { name: "تحليل شاشة الموت الزرقاء BSOD", primary: "BSOD analysis" },
              { name: "Kernel Panic في Linux: القراءة والتشخيص", primary: "Linux kernel panic" },
              { name: "استعادة النظام System Restore في Windows", primary: "System restore" },
              { name: "وحدة تعافي Windows Recovery Environment WRE", primary: "WRE tools" },
              { name: "وضع الإنقاذ Rescue Mode في Linux", primary: "Linux rescue mode" },
              { name: "تعافي GRUB: إصلاح محمّل الإقلاع", primary: "GRUB recovery" },
              { name: "النسخ الاحتياطي لنظام التشغيل والاستعادة السريعة", primary: "OS backup and restore" }
            ]},
            { unit_index: 4, code: "1.7.4", name: "استكشاف أخطاء الاتصال بالشبكة", goal: "تشخيص وحل مشكلات الاتصال الشبكي بمنهجية طبقية ممنهجة", key_concepts: ["OSI-Layer Approach","ping/traceroute/pathping","Name Resolution","DHCP Issues","MTU"], lessons: [
              { name: "المستخدم لا يستطيع الوصول إلى الإنترنت: من أين تبدأ؟", primary: "Network connectivity methodology" },
              { name: "تشخيص الطبقة المادية: الكابل والمنفذ والضوء", primary: "Physical layer check" },
              { name: "ping والردود: تفسير النتائج", primary: "Ping interpretation" },
              { name: "traceroute: تتبع انقطاع المسار", primary: "Traceroute analysis" },
              { name: "مشكلات DHCP: لا عنوان IP", primary: "DHCP troubleshooting" },
              { name: "مشكلات حل الأسماء DNS: الموقع لا يُوجد", primary: "DNS troubleshooting" },
              { name: "مشكلات MTU والتجزئة: صفحات الويب لا تُحمّل", primary: "MTU issues" },
              { name: "pathping وmtr: تحليل الخسارة عبر المسار", primary: "Advanced path analysis" },
              { name: "Wireshark لتشخيص مشكلات التطبيقات الشبكية", primary: "Application-layer diagnosis" }
            ]},
            { unit_index: 5, code: "1.7.5", name: "الدعم عن بُعد", goal: "توفير دعم تقني فعّال عن بُعد باستخدام الأدوات والبروتوكولات المناسبة", key_concepts: ["RDP/VNC/SSH Tunneling","Screen Sharing","Remote Desktop Gateway","Session Recording"], lessons: [
              { name: "بروتوكولات الوصول عن بُعد: مقارنة وتطبيق", primary: "Remote access protocols" },
              { name: "RDP: سطح مكتب عن بُعد في بيئة Windows", primary: "RDP configuration" },
              { name: "VNC: الوصول عبر البروتوكولات المفتوحة", primary: "VNC protocol" },
              { name: "SSH Tunneling: نقل الحركة بأمان", primary: "SSH tunneling" },
              { name: "Remote Desktop Gateway: الوصول الآمن من خارج الشبكة", primary: "RD Gateway" },
              { name: "تسجيل الجلسات: التوثيق والامتثال", primary: "Session recording" },
              { name: "أدوات الدعم عن بُعد: TeamViewer وAnyDesk وبدائلها", primary: "Remote support tools" },
              { name: "أمان الوصول عن بُعد: VPN وMFA والتدقيق", primary: "Remote access security" },
              { name: "سيناريوهات الدعم عن بُعد في بيئة الإنتاج", primary: "Remote support scenarios" }
            ]},
            { unit_index: 6, code: "1.7.6", name: "إدارة المستخدمين وActive Directory", goal: "إدارة المستخدمين والمجموعات في بيئة Active Directory بكفاءة واحترافية", key_concepts: ["AD Structure Forest/Domain/OU","User/Group Objects","GPO Application","LDAP queries"], lessons: [
              { name: "بنية Active Directory: من الغابة إلى وحدة التنظيم", primary: "AD structure" },
              { name: "مجال Domain والتحكم في النطاق Domain Controller", primary: "Domain controller" },
              { name: "إنشاء وإدارة المستخدمين في AD", primary: "AD user management" },
              { name: "المجموعات في AD: أنواعها ونطاقاتها", primary: "AD groups" },
              { name: "وحدات التنظيم OU: التنظيم الإداري في AD", primary: "Organizational units" },
              { name: "تطبيق GPO على المستخدمين والحواسيب", primary: "GPO application" },
              { name: "LDAP: استعلامات قاعدة بيانات AD", primary: "LDAP queries" },
              { name: "مشكلات تسجيل الدخول: التشخيص والإصلاح", primary: "Login troubleshooting" },
              { name: "تقارير AD: تدقيق المستخدمين والصلاحيات", primary: "AD auditing" }
            ]},
            { unit_index: 7, code: "1.7.7", name: "التوثيق وقواعد المعرفة", goal: "إنتاج توثيق تقني عالي الجودة يرفع كفاءة الفريق ويضمن استمرارية العمليات", key_concepts: ["Technical Writing","Runbook Design","CMDB","Diagram Conventions"], lessons: [
              { name: "أهمية التوثيق في تقنية المعلومات: لماذا كثيرون يتجنبونه", primary: "Documentation importance" },
              { name: "مبادئ الكتابة التقنية الاحترافية", primary: "Technical writing principles" },
              { name: "دليل التشغيل Runbook: خطوات قابلة للتنفيذ", primary: "Runbook writing" },
              { name: "قاعدة المعرفة: هيكل المقال التقني الفعّال", primary: "KB article structure" },
              { name: "رسوم تقنية المعلومات: معايير وأدوات الرسم", primary: "Technical diagrams" },
              { name: "CMDB: قاعدة بيانات إدارة الإعداد", primary: "Configuration management DB" },
              { name: "توثيق الحوادث والتغييرات", primary: "Incident and change docs" },
              { name: "إدارة الوثائق: نسخ واعتمادات وأرشفة", primary: "Document management" },
              { name: "أدوات التوثيق: Confluence وNotion وSharePoint", primary: "Documentation tools" }
            ]},
            { unit_index: 8, code: "1.7.8", name: "أساسيات ITIL", goal: "تطبيق مبادئ ITIL في الإدارة اليومية لخدمات تقنية المعلومات", key_concepts: ["Service Lifecycle","Change Management","Problem vs Incident","Configuration Management","CSI"], lessons: [
              { name: "ITIL: إطار إدارة خدمات تقنية المعلومات", primary: "ITIL overview" },
              { name: "دورة حياة الخدمة: من الاستراتيجية إلى التحسين", primary: "Service lifecycle" },
              { name: "إدارة الحوادث Incident Management: الاستجابة السريعة", primary: "Incident management" },
              { name: "إدارة المشكلات Problem Management: جذور الحوادث", primary: "Problem management" },
              { name: "إدارة التغييرات Change Management: التغيير بأمان", primary: "Change management" },
              { name: "إدارة الإعداد Configuration Management", primary: "Configuration management" },
              { name: "التحسين المستمر للخدمة CSI", primary: "Continual service improvement" },
              { name: "كتالوج الخدمات: ما نقدمه للمستخدمين", primary: "Service catalog" },
              { name: "ITIL 4: التطور نحو الرشاقة والقيمة", primary: "ITIL 4 updates" }
            ]},
            { unit_index: 9, code: "1.7.9", name: "مؤشرات الأداء وقياس الخدمة", goal: "قياس وتقييم أداء خدمات تقنية المعلومات بمؤشرات معيارية وتقارير للإدارة", key_concepts: ["KPIs MTTR/MTBF/FCR/CSAT","SLA vs OLA vs UC","Capacity Planning","Availability Formula"], lessons: [
              { name: "مؤشرات KPI في تقنية المعلومات: ما الذي نقيسه", primary: "IT KPIs" },
              { name: "MTTR: متوسط وقت الاسترداد", primary: "Mean Time To Repair" },
              { name: "MTBF: متوسط الوقت بين الأعطال", primary: "Mean Time Between Failures" },
              { name: "FCR: حل المشكلة من الاتصال الأول", primary: "First Contact Resolution" },
              { name: "CSAT: قياس رضا المستخدم", primary: "Customer Satisfaction" },
              { name: "SLA وOLA وUC: مستويات الاتفاقيات المختلفة", primary: "Service agreements" },
              { name: "معادلة التوفر Availability: التسعة التساعية", primary: "Availability calculation" },
              { name: "تخطيط الطاقة الاستيعابية Capacity Planning", primary: "Capacity planning" },
              { name: "لوحات التقارير للإدارة: تحويل البيانات لقرارات", primary: "Management dashboards" }
            ]}
          ]
        }
      ]
    },
    {
      level_index: 2,
      name: "المهارات التقنية الاحترافية",
      goal: "اكتساب المهارات التقنية المتقدمة في Linux والأتمتة وقواعد البيانات والسحابة والحاويات",
      bloom_focus: "apply",
      exam: { pass_threshold_percent: 65, time_limit_minutes: 60 },
      stages: [
        {
          stage_index: 1,
          name: "Linux المتقدم والـScripting",
          goal: "إتقان أدوات Linux المتقدمة وكتابة نصوص Bash احترافية لأتمتة مهام إدارة النظام",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "2.1.1", name: "عمليات الملفات المتقدمة وFind/Xargs", goal: "معالجة مجموعات الملفات الكبيرة وتحليلها باستخدام find وxargs وinotify", key_concepts: ["find with exec/xargs","locate/updatedb","inotifywait","rsync","lsof","fuser"], lessons: [
              { name: "find المتقدم: البحث بمعايير متعددة", primary: "Advanced find options" },
              { name: "find مع -exec: تنفيذ أوامر على كل نتيجة", primary: "find with exec" },
              { name: "xargs: تحويل النتائج إلى مدخلات أوامر أخرى", primary: "xargs usage" },
              { name: "inotifywait: مراقبة تغييرات الملفات في الوقت الفعلي", primary: "File watching" },
              { name: "rsync: المزامنة الفعّالة بين الأنظمة", primary: "rsync synchronization" },
              { name: "lsof: ما الملفات المفتوحة والعمليات التي فتحتها", primary: "Open file listing" },
              { name: "fuser: من يستخدم هذا الملف أو المنفذ؟", primary: "File user finding" },
              { name: "معالجة ملفات بالآلاف: الأداء ومعالجة الأخطاء", primary: "Bulk file processing" },
              { name: "أتمتة إدارة الملفات: نصوص آمنة وقابلة للتكرار", primary: "Automated file management" }
            ]},
            { unit_index: 2, code: "2.1.2", name: "التعابير النمطية ومعالجة النصوص", goal: "كتابة تعابير نمطية دقيقة ومعالجة ملفات النصوص بكفاءة باستخدام grep وsed وawk", key_concepts: ["Regex POSIX/PCRE","grep/egrep/fgrep","sed","awk","cut/tr/sort/uniq"], lessons: [
              { name: "التعابير النمطية Regex: لغة البحث الدقيق", primary: "Regex fundamentals" },
              { name: "POSIX وPCRE: الفروق العملية في Linux", primary: "POSIX vs PCRE regex" },
              { name: "grep وegrep وfgrep: البحث في الملفات", primary: "grep variants" },
              { name: "sed: تحرير النصوص من سطر الأوامر", primary: "Stream editor sed" },
              { name: "awk: معالجة الأعمدة والسجلات", primary: "awk text processing" },
              { name: "cut وtr: قطع وتحويل النصوص", primary: "cut and tr" },
              { name: "sort وuniq: ترتيب وإزالة التكرار", primary: "sort and uniq" },
              { name: "خطوط أنابيب معالجة النصوص المعقدة", primary: "Complex text pipelines" },
              { name: "تطبيقات عملية: تحليل السجلات واستخراج البيانات", primary: "Log analysis with text tools" }
            ]},
            { unit_index: 3, code: "2.1.3", name: "أساسيات Bash Scripting", goal: "كتابة نصوص Bash احترافية مع معالجة الأخطاء والمتغيرات والدوال", key_concepts: ["Shebang","Variables/Quoting/Arithmetic","read input","Exit Codes","Functions"], lessons: [
              { name: "هيكل النص البرمجي الاحترافي: من shebang إلى الخروج", primary: "Script structure" },
              { name: "المتغيرات: الإعلان والاستخدام والمتغيرات الخاصة", primary: "Bash variables" },
              { name: "الحسابات الحسابية: $(()) وexpr وbc", primary: "Arithmetic in bash" },
              { name: "قراءة المدخلات: read وأوامر سطر الأوامر", primary: "User input" },
              { name: "رموز الخروج Exit Codes: نجاح وفشل المهام", primary: "Exit codes" },
              { name: "الدوال Functions: تنظيم الكود وإعادة الاستخدام", primary: "Functions" },
              { name: "المتغيرات المحلية والعامة في الدوال", primary: "Variable scope" },
              { name: "الوسائط arguments: $1 و$@ و$# و$*", primary: "Script arguments" },
              { name: "نصوص إدارة الخادم: أمثلة واقعية", primary: "Real-world admin scripts" }
            ]},
            { unit_index: 4, code: "2.1.4", name: "التحكم في التدفق في Bash", goal: "بناء نصوص برمجية مرنة تتعامل مع الشروط والتكرار والبيانات المعقدة", key_concepts: ["if/elif/else","case statement","for/while/until loops","break/continue","Arrays"], lessons: [
              { name: "الشروط if/elif/else: اتخاذ القرارات في الكود", primary: "Conditionals" },
              { name: "اختبارات الشروط: test و[ ] و[[ ]]", primary: "Test operators" },
              { name: "case statement: بديل أنظف لـif متسلسل", primary: "Case statement" },
              { name: "حلقة for: التكرار على قوائم ومجالات", primary: "For loop" },
              { name: "حلقة while وuntil: التكرار المشروط", primary: "While and until" },
              { name: "break وcontinue: التحكم في مسار الحلقة", primary: "Loop control" },
              { name: "المصفوفات Arrays: قوائم القيم في Bash", primary: "Bash arrays" },
              { name: "المصفوفات الترابطية: مفاتيح نصية", primary: "Associative arrays" },
              { name: "نمط معالجة الملفات: قراءة سطراً سطراً", primary: "File processing pattern" }
            ]},
            { unit_index: 5, code: "2.1.5", name: "إدارة العمليات المتقدمة", goal: "التحكم في العمليات والإشارات وموارد النظام في سيناريوهات الإنتاج", key_concepts: ["Process Substitution","Subshells","Signal Handling trap","ulimit","/proc filesystem","strace/ltrace"], lessons: [
              { name: "استبدال العمليات Process Substitution", primary: "Process substitution" },
              { name: "الـSubshells: نطاق البيئة المنعزل", primary: "Subshells" },
              { name: "معالجة الإشارات trap: التنظيف عند الخروج", primary: "Signal trapping" },
              { name: "ulimit: تحديد موارد العمليات", primary: "Resource limits" },
              { name: "نظام الملفات /proc: نافذة للنواة", primary: "/proc filesystem" },
              { name: "strace: تتبع استدعاءات النظام", primary: "System call tracing" },
              { name: "ltrace: تتبع استدعاءات المكتبات", primary: "Library call tracing" },
              { name: "perf: أداء على مستوى الأجهزة", primary: "perf profiling" },
              { name: "تحليل الأداء المتقدم: ما يبطئ العملية حقاً", primary: "Performance bottleneck analysis" }
            ]},
            { unit_index: 6, code: "2.1.6", name: "ضبط أداء النظام", goal: "تحسين أداء نظام Linux في الإنتاج عبر ضبط المعالج والذاكرة والإدخال/الإخراج", key_concepts: ["CPU Affinity taskset/numactl","I/O Scheduler","Kernel Parameters sysctl","Hugepages","Swappiness"], lessons: [
              { name: "قياس الأداء: الأدوات والمقاييس الرئيسية", primary: "Performance measurement" },
              { name: "تقارب المعالج CPU Affinity وNUMA", primary: "CPU affinity" },
              { name: "ضبط جدولة الإدخال/الإخراج", primary: "I/O scheduler tuning" },
              { name: "معاملات النواة sysctl: التهيئة الدقيقة", primary: "sysctl parameters" },
              { name: "Huge Pages: تقليل عبء TLB في الذاكرة", primary: "Huge pages" },
              { name: "Swappiness: توازن الـRAM والـSwap", primary: "Swappiness tuning" },
              { name: "ضبط شبكة الخادم: TCP buffer وQueue Discipline", primary: "Network tuning" },
              { name: "ضبط نظام الملفات: noatime والخيارات الأخرى", primary: "Filesystem tuning" },
              { name: "مقارنة الأداء قبل وبعد الضبط: المنهجية الصحيحة", primary: "Benchmark comparison" }
            ]},
            { unit_index: 7, code: "2.1.7", name: "إدارة المستخدمين والصلاحيات المتقدمة", goal: "تطبيق آليات متقدمة للتحكم في الوصول والصلاحيات في بيئات Linux المؤسسية", key_concepts: ["PAM Modules","/etc/sudoers visudo","SELinux/AppArmor","Capabilities setcap","chroot Jails"], lessons: [
              { name: "PAM: الوحدات القابلة للإضافة للمصادقة", primary: "PAM architecture" },
              { name: "تهيئة PAM: سياسات مصادقة مخصصة", primary: "PAM configuration" },
              { name: "sudoers المتقدم: قواعد دقيقة للتحكم", primary: "Advanced sudoers" },
              { name: "SELinux: الأمن الإلزامي المعزّز في Linux", primary: "SELinux basics" },
              { name: "AppArmor: نهج ملفات التعريف للأمن الإلزامي", primary: "AppArmor" },
              { name: "Linux Capabilities: أقل امتياز ممكن", primary: "Linux capabilities" },
              { name: "chroot Jails: عزل العمليات في دليل وهمي", primary: "chroot jails" },
              { name: "Namespaces: عزل الموارد بعمق", primary: "Linux namespaces" },
              { name: "تدقيق صلاحيات المستخدمين: الكشف والإصلاح", primary: "Permission auditing" }
            ]},
            { unit_index: 8, code: "2.1.8", name: "Cron Jobs والأتمتة", goal: "بناء نظام أتمتة مهام موثوق وقابل للتدقيق في بيئات Linux", key_concepts: ["Crontab Syntax","Anacron","at/batch","Systemd Timers","Automation Patterns","Idempotency"], lessons: [
              { name: "Cron: المجدول الكلاسيكي في Linux", primary: "Cron daemon" },
              { name: "بناء جملة Crontab: خمسة حقول وعشرات الاحتمالات", primary: "Crontab syntax" },
              { name: "Anacron: Cron للأنظمة التي لا تعمل 24/7", primary: "Anacron" },
              { name: "at وbatch: الجدولة لمرة واحدة", primary: "at command" },
              { name: "Systemd Timers: بديل حديث لـCron", primary: "Systemd timers" },
              { name: "مبدأ الأتمتة الآمنة: التكامل Idempotency", primary: "Idempotent automation" },
              { name: "سجلات Cron وتشخيص الأخطاء", primary: "Cron logging" },
              { name: "التنبيهات والإشعارات من المهام المجدولة", primary: "Cron notifications" },
              { name: "مهام مجدولة في بيئات الحاويات والسحابة", primary: "Scheduled tasks in modern infra" }
            ]},
            { unit_index: 9, code: "2.1.9", name: "تصليب النظام والأمن", goal: "تطبيق معايير CIS وأدوات التصليب لرفع مستوى أمان Linux في الإنتاج", key_concepts: ["CIS Benchmark for Linux","SSH Hardening","Fail2Ban","auditd/ausearch","MAC","AIDE"], lessons: [
              { name: "منهجية التصليب: من الخام إلى المحصّن", primary: "Hardening methodology" },
              { name: "معايير CIS لـLinux: القائمة المرجعية", primary: "CIS Linux benchmarks" },
              { name: "تصليب SSH: إعداد الأمان الكامل", primary: "SSH hardening" },
              { name: "Fail2Ban: الحماية من هجمات Brute Force", primary: "Fail2Ban configuration" },
              { name: "auditd: تدقيق كل حدث أمني", primary: "Audit daemon" },
              { name: "ausearch وaureport: قراءة سجلات التدقيق", primary: "Audit log analysis" },
              { name: "SELinux للإنتاج: من Permissive إلى Enforcing", primary: "SELinux production" },
              { name: "AIDE: مراقبة سلامة الملفات", primary: "File integrity monitoring" },
              { name: "فحص التصليب: Lynis والتقارير التلقائية", primary: "Automated hardening scan" }
            ]}
          ]
        },
        {
          stage_index: 2,
          name: "Python لأتمتة تقنية المعلومات",
          goal: "كتابة نصوص Python احترافية لأتمتة مهام إدارة النظام والشبكات وتكامل APIs",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "2.2.1", name: "بناء جملة Python وهياكل البيانات", goal: "استخدام هياكل بيانات Python بكفاءة لحل مشكلات إدارة النظام", key_concepts: ["Lists/Tuples/Sets/Dicts","Comprehensions","Slicing","Generators","Iterators"], lessons: [
              { name: "لماذا Python لأتمتة تقنية المعلومات؟", primary: "Python for IT automation" },
              { name: "القوائم Lists: التجميعات المرتبة القابلة للتعديل", primary: "Python lists" },
              { name: "الصفوف Tuples والمجموعات Sets", primary: "Tuples and sets" },
              { name: "القواميس Dicts: هياكل البيانات المفضلة لـIT", primary: "Python dictionaries" },
              { name: "List Comprehensions: الكود الأنيق والفعّال", primary: "Comprehensions" },
              { name: "Slicing: استخراج البيانات بدقة", primary: "Sequence slicing" },
              { name: "Generators: معالجة البيانات الكبيرة بكفاءة", primary: "Generators" },
              { name: "Iterators: فهم بروتوكول التكرار", primary: "Iterators" },
              { name: "اختيار هيكل البيانات الأمثل لكل مشكلة", primary: "Data structure selection" }
            ]},
            { unit_index: 2, code: "2.2.2", name: "الدوال والوحدات والحزم", goal: "بناء كود Python معياري وقابل لإعادة الاستخدام باستخدام الدوال والوحدات والحزم", key_concepts: ["Decorators","*args/**kwargs","Module System","pip","Virtual Environments"], lessons: [
              { name: "الدوال المتقدمة: *args و**kwargs", primary: "Advanced function signatures" },
              { name: "Decorators: تعزيز الدوال بلا تعديل كودها", primary: "Python decorators" },
              { name: "نظام الوحدات Module System في Python", primary: "Module system" },
              { name: "الحزم Packages والـ__init__.py", primary: "Package structure" },
              { name: "pip وإدارة الحزم الخارجية", primary: "pip package manager" },
              { name: "البيئات الافتراضية venv: عزل المشاريع", primary: "Virtual environments" },
              { name: "requirements.txt وإعادة الإنتاج", primary: "Dependency management" },
              { name: "نشر مكتبة Python داخلية لفريق IT", primary: "Internal package publishing" },
              { name: "Python Packaging: بناء مكتبة احترافية", primary: "Package building" }
            ]},
            { unit_index: 3, code: "2.2.3", name: "عمليات الملفات ومعالجة البيانات", goal: "معالجة ملفات البيانات المختلفة وتحويلها برمجياً في سياق مهام IT", key_concepts: ["open() modes","pathlib","CSV/JSON/YAML parsing","xml.etree","Binary files","Context Managers"], lessons: [
              { name: "open() وأوضاع الملفات: قراءة وكتابة وإضافة", primary: "File operations" },
              { name: "pathlib: التعامل الحديث مع مسارات الملفات", primary: "pathlib library" },
              { name: "Context Managers: with وضمان إغلاق الموارد", primary: "Context managers" },
              { name: "معالجة CSV: بيانات الجداول برمجياً", primary: "CSV processing" },
              { name: "معالجة JSON: APIs وملفات التهيئة", primary: "JSON parsing" },
              { name: "معالجة YAML: ملفات التهيئة الإنسانية", primary: "YAML parsing" },
              { name: "معالجة XML: البنية الهرمية للبيانات", primary: "XML parsing" },
              { name: "الملفات الثنائية: قراءة وكتابة البيانات الخام", primary: "Binary file handling" },
              { name: "تحويل البيانات: من صيغة إلى أخرى برمجياً", primary: "Data transformation" }
            ]},
            { unit_index: 4, code: "2.2.4", name: "التعابير النمطية في Python", goal: "استخدام وحدة re لمعالجة وتحليل النصوص والسجلات في مهام IT", key_concepts: ["re module","search/match/findall/sub","Capture Groups","Non-greedy","Named Groups"], lessons: [
              { name: "وحدة re في Python: المدخل لـRegex", primary: "re module" },
              { name: "re.search vs re.match vs re.fullmatch", primary: "Search functions" },
              { name: "re.findall وre.finditer: البحث عن كل النتائج", primary: "Finding all matches" },
              { name: "re.sub: استبدال الأنماط في النصوص", primary: "Pattern substitution" },
              { name: "مجموعات التقاط Capture Groups", primary: "Capture groups" },
              { name: "Non-greedy: الالتقاط الأقصر", primary: "Non-greedy matching" },
              { name: "المجموعات المسماة Named Groups", primary: "Named groups" },
              { name: "re.compile: تجميع النمط للأداء العالي", primary: "Compiled regex" },
              { name: "تحليل سجلات الخادم بـRegex في Python", primary: "Log parsing with regex" }
            ]},
            { unit_index: 5, code: "2.2.5", name: "Python للشبكات", goal: "بناء أدوات شبكية وعملاء HTTP باستخدام Python لمهام أتمتة الشبكات", key_concepts: ["socket basics","requests library","urllib","httpx","Session management","Timeouts"], lessons: [
              { name: "مقدمة إلى برمجة الشبكات: Sockets", primary: "Socket programming" },
              { name: "TCP وUDP Sockets: المفاهيم والتطبيق", primary: "TCP/UDP sockets" },
              { name: "requests: العميل HTTP الأشهر في Python", primary: "requests library" },
              { name: "إدارة الجلسات HTTP Sessions: الكفاءة والمصادقة", primary: "HTTP sessions" },
              { name: "المصادقة في HTTP: Basic وBearer وAPI Key", primary: "HTTP authentication" },
              { name: "المهلات والمحاولات: Timeouts وRetry", primary: "Timeout and retry" },
              { name: "httpx: العميل HTTP غير المتزامن", primary: "httpx library" },
              { name: "بناء أداة مراقبة HTTP: فحص نقاط النهاية", primary: "HTTP monitoring tool" },
              { name: "urllib3 والتعامل المباشر مع HTTP", primary: "urllib3 usage" }
            ]},
            { unit_index: 6, code: "2.2.6", name: "Python لإدارة النظام", goal: "أتمتة مهام إدارة النظام وجمع معلومات الموارد باستخدام Python", key_concepts: ["os/shutil/subprocess","psutil","platform","sys","watchdog"], lessons: [
              { name: "وحدة os: عمليات نظام التشغيل من Python", primary: "os module" },
              { name: "shutil: نسخ ونقل وحذف الملفات بأمان", primary: "shutil module" },
              { name: "subprocess: تشغيل أوامر النظام من Python", primary: "subprocess module" },
              { name: "psutil: مراقبة موارد النظام", primary: "psutil library" },
              { name: "قياس CPU والذاكرة والأقراص بـpsutil", primary: "Resource monitoring" },
              { name: "مراقبة الشبكة بـpsutil: الاتصالات والإحصاءات", primary: "Network monitoring" },
              { name: "platform وsys: معلومات بيئة التشغيل", primary: "System information" },
              { name: "watchdog: مراقبة تغييرات الملفات", primary: "File system watching" },
              { name: "بناء أداة صحة الخادم: تقرير شامل تلقائي", primary: "Server health tool" }
            ]},
            { unit_index: 7, code: "2.2.7", name: "SSH والتنفيذ عن بُعد بـPython", goal: "أتمتة إدارة الخوادم عن بُعد عبر SSH باستخدام Paramiko وFabric", key_concepts: ["Paramiko SSHClient/SFTP","Fabric","Remote command execution","Key management","Multi-host"], lessons: [
              { name: "Paramiko: SSH في Python من الألف إلى الياء", primary: "Paramiko library" },
              { name: "SSHClient: الاتصال وتنفيذ الأوامر", primary: "SSH connections" },
              { name: "SFTP: نقل الملفات الآمن برمجياً", primary: "SFTP operations" },
              { name: "إدارة مفاتيح SSH برمجياً", primary: "SSH key management" },
              { name: "Fabric: أتمتة المهام على خوادم متعددة", primary: "Fabric framework" },
              { name: "تنفيذ مهام متوازية على عشرات الخوادم", primary: "Parallel execution" },
              { name: "معالجة أخطاء الاتصال والمهلات", primary: "Error handling" },
              { name: "SSH Jump Hosts: الوصول عبر خادم وسيط", primary: "SSH jump hosts" },
              { name: "بناء أداة نشر تحديثات على خوادم المؤسسة", primary: "Deployment automation" }
            ]},
            { unit_index: 8, code: "2.2.8", name: "تكامل APIs وعملاء REST", goal: "بناء عملاء APIs موثوقة تتعامل مع المصادقة والترقيم والأخطاء بشكل احترافي", key_concepts: ["REST Client patterns","Authentication types","Pagination","Rate Limiting","Error handling","Retry"], lessons: [
              { name: "نمط عميل REST: الهيكل الاحترافي", primary: "REST client architecture" },
              { name: "إدارة رموز الوصول Access Tokens", primary: "Token management" },
              { name: "معالجة ترقيم الصفحات Pagination", primary: "API pagination" },
              { name: "تحديد معدل الطلبات Rate Limiting وحدوده", primary: "Rate limit handling" },
              { name: "معالجة الأخطاء: HTTP status codes واستثناءات Python", primary: "Error handling" },
              { name: "نمط Retry مع Exponential Backoff", primary: "Retry pattern" },
              { name: "تخزين مؤقت لاستجابات API", primary: "API response caching" },
              { name: "توثيق عميل API: OpenAPI وSwagger", primary: "API documentation" },
              { name: "بناء عميل API لخدمة إدارة تقنية المعلومات", primary: "ITSM API client" }
            ]},
            { unit_index: 9, code: "2.2.9", name: "الاختبار والتعامل مع الأخطاء", goal: "بناء كود Python موثوق مع اختبارات شاملة ومعالجة أخطاء احترافية", key_concepts: ["try/except/finally","Custom Exceptions","logging module","unittest/pytest","Mock","Test Fixtures"], lessons: [
              { name: "فلسفة معالجة الأخطاء: الفشل بأمان", primary: "Error handling philosophy" },
              { name: "try/except/else/finally: الأنماط الأربعة", primary: "Exception handling" },
              { name: "الاستثناءات المخصصة Custom Exceptions", primary: "Custom exceptions" },
              { name: "وحدة logging: السجلات الاحترافية", primary: "Python logging" },
              { name: "مستويات السجلات وإعداد Handlers", primary: "Logging configuration" },
              { name: "unittest: إطار الاختبار المدمج", primary: "unittest framework" },
              { name: "pytest: الاختبار الحديث والمرن", primary: "pytest" },
              { name: "Mock وPatch: اختبار العزل", primary: "Mocking" },
              { name: "Test Fixtures: الإعداد والتنظيف للاختبارات", primary: "Test fixtures" }
            ]}
          ]
        },
        {
          stage_index: 3,
          name: "إدارة قواعد البيانات",
          goal: "إدارة قواعد البيانات العلائقية وغير العلائقية وتحسين أداءها في بيئات الإنتاج",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "2.3.1", name: "تصميم قواعد البيانات العلائقية", goal: "تصميم مخططات قواعد بيانات فعّالة ومنظّمة وفق معايير التطبيع", key_concepts: ["ER Diagrams","Normalization 1NF-BCNF","Denormalization","Cardinality","Index overview"], lessons: [
              { name: "مخططات ER: رسم متطلبات الأعمال كنموذج بيانات", primary: "Entity-Relationship modeling" },
              { name: "الكيانات والعلاقات والصفات في مخطط ER", primary: "ER components" },
              { name: "التطبيع 1NF: هيكل الجدول الأساسي", primary: "First Normal Form" },
              { name: "التطبيع 2NF: حل التبعية الجزئية", primary: "Second Normal Form" },
              { name: "التطبيع 3NF: حل التبعية الانتقالية", primary: "Third Normal Form" },
              { name: "BCNF: التطبيع الكامل لبويس-كود", primary: "Boyce-Codd Normal Form" },
              { name: "إلغاء التطبيع Denormalization: متى يكون مبرراً", primary: "When to denormalize" },
              { name: "العلاقات بأنواعها: 1:1 و1:N وN:M", primary: "Relationship types" },
              { name: "تحويل مخطط ER إلى جداول SQL", primary: "ER to SQL mapping" }
            ]},
            { unit_index: 2, code: "2.3.2", name: "SQL المتقدم", goal: "كتابة استعلامات SQL معقدة وتحليلية لمعالجة البيانات المؤسسية", key_concepts: ["Subqueries correlated","CTEs WITH clause","Window Functions ROW_NUMBER/RANK","EXPLAIN ANALYZE"], lessons: [
              { name: "الاستعلامات الفرعية Subqueries: متى وكيف", primary: "Subqueries" },
              { name: "الاستعلامات الفرعية المرتبطة Correlated Subqueries", primary: "Correlated subqueries" },
              { name: "CTEs: تنظيم الاستعلامات المعقدة", primary: "Common Table Expressions" },
              { name: "CTEs العودية Recursive: الهياكل الشجرية", primary: "Recursive CTEs" },
              { name: "دوال النوافذ Window Functions: التحليل بلا تجميع", primary: "Window functions" },
              { name: "ROW_NUMBER وRANK وDENSE_RANK", primary: "Ranking functions" },
              { name: "LAG وLEAD: مقارنة الصف بالسابق واللاحق", primary: "Lag and Lead" },
              { name: "EXPLAIN وEXPLAIN ANALYZE: قراءة خطة التنفيذ", primary: "Query execution plan" },
              { name: "تحسين الاستعلامات بناءً على خطة التنفيذ", primary: "Query optimization" }
            ]},
            { unit_index: 3, code: "2.3.3", name: "إدارة MySQL/PostgreSQL", goal: "إعداد وإدارة وتهيئة قواعد بيانات MySQL وPostgreSQL في بيئات الإنتاج", key_concepts: ["Installation","Configuration my.cnf/postgresql.conf","Buffer Pool","Connection Pool","Vacuum/Analyze"], lessons: [
              { name: "تثبيت وتهيئة MySQL في بيئة الإنتاج", primary: "MySQL production setup" },
              { name: "ملف my.cnf: معاملات MySQL المهمة", primary: "MySQL configuration" },
              { name: "Buffer Pool في MySQL: أهم معامل للأداء", primary: "InnoDB buffer pool" },
              { name: "تثبيت وتهيئة PostgreSQL", primary: "PostgreSQL setup" },
              { name: "postgresql.conf: معاملات الأداء المهمة", primary: "PostgreSQL configuration" },
              { name: "Connection Pooling: PgBouncer وHAProxy", primary: "Connection pooling" },
              { name: "VACUUM وANALYZE في PostgreSQL: الصيانة الدورية", primary: "PostgreSQL maintenance" },
              { name: "مراقبة قاعدة البيانات: الأدوات والمقاييس", primary: "Database monitoring" },
              { name: "أمان قاعدة البيانات: المستخدمون والأذونات", primary: "Database security basics" }
            ]},
            { unit_index: 4, code: "2.3.4", name: "الفهرسة وتحسين الاستعلامات", goal: "تصميم وتحسين الفهارس لتسريع الاستعلامات وتحسين أداء قاعدة البيانات", key_concepts: ["B-Tree/Hash/GIN/BRIN indexes","Query Planner","Index Selectivity","Covering Index","Partial Index"], lessons: [
              { name: "كيف تعمل الفهارس: B-Tree والمبدأ الأساسي", primary: "Index internals" },
              { name: "أنواع الفهارس: B-Tree وHash وGIN وBRIN", primary: "Index types" },
              { name: "انتقائية الفهرس Index Selectivity", primary: "Index selectivity" },
              { name: "Covering Index: الاستعلام بلا قراءة الجدول", primary: "Covering indexes" },
              { name: "Partial Index: الفهرس الجزئي للبيانات الحرجة", primary: "Partial indexes" },
              { name: "مخطط الاستعلام Query Planner: كيف يختار الفهرس", primary: "Query planner" },
              { name: "مشكلة الفهارس الزائدة: التأثير على الكتابة", primary: "Index overhead" },
              { name: "Composite Index: الترتيب الذي يهم", primary: "Composite indexes" },
              { name: "تشخيص الاستعلامات البطيئة في الإنتاج", primary: "Slow query diagnosis" }
            ]},
            { unit_index: 5, code: "2.3.5", name: "المعاملات وخصائص ACID", goal: "ضمان تكامل البيانات في بيئات التزامن العالي عبر فهم ACID ومستويات العزل", key_concepts: ["Atomicity/Consistency/Isolation/Durability","Isolation Levels","Deadlock detection"], lessons: [
              { name: "الأتمتة Atomicity: الكل أو لا شيء", primary: "Atomicity" },
              { name: "الاتساق Consistency: قواعد محمية دائماً", primary: "Consistency" },
              { name: "العزل Isolation: المعاملات المتوازية كأنها متسلسلة", primary: "Isolation" },
              { name: "الاستدامة Durability: البيانات الملتزمة لا تُفقد", primary: "Durability" },
              { name: "READ UNCOMMITTED: الخطر المرئي", primary: "Read uncommitted" },
              { name: "READ COMMITTED وREPEATABLE READ", primary: "Read committed and repeatable read" },
              { name: "SERIALIZABLE: أعلى مستوى من العزل", primary: "Serializable isolation" },
              { name: "الجمود Deadlock: الكشف والحل والوقاية", primary: "Deadlock management" },
              { name: "Row Locking وTable Locking: أداء الكتابة المتزامنة", primary: "Locking strategies" }
            ]},
            { unit_index: 6, code: "2.3.6", name: "النسخ المتماثل والتوافر العالي", goal: "بناء بنية قاعدة بيانات عالية التوفر باستخدام النسخ المتماثل والتبديل التلقائي", key_concepts: ["Replication Types Sync/Async","Master-Slave vs Master-Master","GTID","Failover","Read Replicas"], lessons: [
              { name: "لماذا نحتاج النسخ المتماثل Replication", primary: "Replication motivation" },
              { name: "النسخ المتماثل المتزامن وغير المتزامن", primary: "Sync vs async replication" },
              { name: "نموذج Master-Slave: القاعدة الأكثر شيوعاً", primary: "Master-slave replication" },
              { name: "نموذج Master-Master: الكتابة الموزعة", primary: "Master-master replication" },
              { name: "GTID في MySQL: تتبع المعاملات عبر الخوادم", primary: "GTID-based replication" },
              { name: "قراءة من النسخ Replicas: موازنة الأحمال", primary: "Read replicas" },
              { name: "Failover التلقائي: MHA وOrchestrator", primary: "Automatic failover" },
              { name: "اختبار Failover في بيئات الإنتاج", primary: "Failover testing" },
              { name: "مراقبة تأخر النسخ Replication Lag", primary: "Replication monitoring" }
            ]},
            { unit_index: 7, code: "2.3.7", name: "النسخ الاحتياطي والاسترداد لقواعد البيانات", goal: "تصميم وتنفيذ استراتيجية شاملة للنسخ الاحتياطي لقواعد البيانات مع اختبار منتظم", key_concepts: ["mysqldump/pg_dump","Binary Log/WAL","Point-in-Time Recovery","Continuous Archiving"], lessons: [
              { name: "استراتيجية النسخ الاحتياطي لقواعد البيانات", primary: "Database backup strategy" },
              { name: "mysqldump: النسخ المنطقي لـMySQL", primary: "mysqldump" },
              { name: "pg_dump وpg_dumpall: نسخ PostgreSQL", primary: "pg_dump" },
              { name: "السجل الثنائي Binary Log في MySQL", primary: "Binary logging" },
              { name: "WAL في PostgreSQL: سجل الكتابة المسبقة", primary: "Write-Ahead Log" },
              { name: "الاسترداد إلى نقطة زمنية PITR", primary: "Point-in-Time Recovery" },
              { name: "الأرشفة المستمرة Continuous Archiving", primary: "Continuous archiving" },
              { name: "اختبار الاسترداد: التحقق من النسخ الاحتياطية", primary: "Recovery testing" },
              { name: "أدوات النسخ الاحتياطي المتقدمة: Percona XtraBackup", primary: "Advanced backup tools" }
            ]},
            { unit_index: 8, code: "2.3.8", name: "مفاهيم قواعد البيانات غير العلائقية", goal: "اختيار قاعدة البيانات NoSQL المناسبة لكل حالة استخدام وفهم نماذجها المختلفة", key_concepts: ["Document MongoDB","Key-Value Redis","Column-Family Cassandra","Graph Neo4j","When NoSQL"], lessons: [
              { name: "لماذا NoSQL: متى تكسر النموذج العلائقي", primary: "NoSQL motivation" },
              { name: "قواعد البيانات الوثيقية: MongoDB والوثائق المرنة", primary: "Document databases" },
              { name: "قواعد البيانات المفتاح-القيمة: Redis والسرعة", primary: "Key-value stores" },
              { name: "Redis كقاعدة بيانات وتخزين مؤقت وقائمة انتظار", primary: "Redis use cases" },
              { name: "قواعد البيانات العمودية: Cassandra والحجم الهائل", primary: "Column-family databases" },
              { name: "قواعد البيانات الشبكية Graph: Neo4j والعلاقات", primary: "Graph databases" },
              { name: "نظرية CAP وتأثيرها على اختيار NoSQL", primary: "CAP theorem in NoSQL" },
              { name: "مقارنة بين نماذج NoSQL المختلفة", primary: "NoSQL comparison" },
              { name: "تكامل NoSQL مع تطبيقات تقنية المعلومات", primary: "NoSQL in IT applications" }
            ]},
            { unit_index: 9, code: "2.3.9", name: "أمن قواعد البيانات والتدقيق", goal: "تطبيق ضوابط أمنية شاملة لقواعد البيانات وفق مبادئ أقل امتياز والتدقيق المستمر", key_concepts: ["Least Privilege","Role-Based Access","Encrypted Connections TLS","Audit Logging","SQL Injection Prevention","Data Masking"], lessons: [
              { name: "مبدأ أقل امتياز في قواعد البيانات", primary: "Least privilege in databases" },
              { name: "إدارة المستخدمين والأدوار في MySQL وPostgreSQL", primary: "Database user management" },
              { name: "تشفير الاتصالات: TLS من/إلى قاعدة البيانات", primary: "Database TLS" },
              { name: "التدقيق Audit Logging: من تعامل مع البيانات؟", primary: "Database auditing" },
              { name: "SQL Injection: الهجوم وأساليب الوقاية", primary: "SQL injection prevention" },
              { name: "تشفير البيانات الحساسة في الجداول", primary: "Data encryption at rest" },
              { name: "إخفاء البيانات Data Masking للبيئات غير الإنتاجية", primary: "Data masking" },
              { name: "تصنيف البيانات الحساسة في قاعدة البيانات", primary: "Data classification" },
              { name: "امتثال GDPR وPCI-DSS لقواعد البيانات", primary: "Database compliance" }
            ]}
          ]
        },
        {
          stage_index: 4,
          name: "إدارة الشبكات",
          goal: "إدارة وتصميم وأتمتة الشبكات في بيئات المؤسسات باستخدام بروتوكولات التوجيه والأمن",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "2.4.1", name: "تخطيط IP وSubnetting المتقدم", goal: "تصميم خطة عنونة IP شاملة باستخدام VLSM والتلخيص لشبكات المؤسسة", key_concepts: ["VLSM Design","IP Allocation Planning","Supernetting/Route Summarization","IPv4 Exhaustion"], lessons: [
              { name: "تخطيط المساحة الإجمالية لعناوين IP", primary: "IP address planning" },
              { name: "VLSM: التقسيم المتغير لتحسين الاستخدام", primary: "Variable Length Subnet Masking" },
              { name: "تصميم خطة عنونة لشبكة مؤسسة من الصفر", primary: "Enterprise IP design" },
              { name: "Route Summarization: تلخيص المسارات للكفاءة", primary: "Route summarization" },
              { name: "Supernetting: دمج الشبكات الفرعية", primary: "Supernetting" },
              { name: "IPv4 Exhaustion: الوضع الحالي والبدائل", primary: "IPv4 exhaustion context" },
              { name: "NAT64 وDual-Stack: الانتقال نحو IPv6", primary: "IPv4 to IPv6 transition" },
              { name: "سياسة تخصيص العناوين: IANA وRIRs", primary: "IP allocation policy" },
              { name: "توثيق خطة العناوين: IPAM وأدواته", primary: "IPAM tools" }
            ]},
            { unit_index: 2, code: "2.4.2", name: "بروتوكولات التوجيه الديناميكي", goal: "إعداد وتشخيص بروتوكولات التوجيه الديناميكي OSPF وBGP في بيئات المؤسسات", key_concepts: ["OSPF LSA/SPF/Areas","BGP eBGP/iBGP","EIGRP basics","Route Redistribution"], lessons: [
              { name: "OSPF: بروتوكول التوجيه الأكثر انتشاراً داخلياً", primary: "OSPF overview" },
              { name: "الحالات وخوارزمية Dijkstra في OSPF", primary: "OSPF algorithm" },
              { name: "مناطق OSPF Areas: التقسيم الهرمي", primary: "OSPF areas" },
              { name: "أنواع LSA في OSPF: الإعلانات وحدودها", primary: "OSPF LSA types" },
              { name: "BGP: بروتوكول الإنترنت العالمي", primary: "BGP overview" },
              { name: "eBGP وiBGP: التوجيه الخارجي والداخلي", primary: "eBGP vs iBGP" },
              { name: "سمات BGP: الأوزان والتفضيلات والمسارات", primary: "BGP attributes" },
              { name: "EIGRP: التوجيه الهجين من Cisco", primary: "EIGRP basics" },
              { name: "Route Redistribution: نقل المسارات بين بروتوكولات", primary: "Route redistribution" }
            ]},
            { unit_index: 3, code: "2.4.3", name: "التبديل المتقدم", goal: "تصميم وإدارة بنية تبديل متقدمة مع PortFast وEtherChannel وPort Security", key_concepts: ["STP variants 802.1D/RSTP/MSTP","Port Roles/States","PortFast/BPDU Guard","EtherChannel LACP/PAgP","Port Security"], lessons: [
              { name: "مراجعة STP: الجذر والمنافذ والحالات", primary: "STP review" },
              { name: "RSTP: تسريع التقارب في الشبكة", primary: "Rapid STP" },
              { name: "MSTP: STP متعدد لشبكات VLAN كبيرة", primary: "Multiple STP" },
              { name: "PortFast وBPDU Guard: سرعة مع أمان", primary: "PortFast and BPDU Guard" },
              { name: "EtherChannel: دمج الروابط للأداء والتكرار", primary: "EtherChannel" },
              { name: "LACP وPAgP: التفاوض على EtherChannel", primary: "LACP vs PAgP" },
              { name: "Port Security: تحديد من يتصل بالسويتش", primary: "Port security" },
              { name: "Storm Control: التحكم في عواصف البث", primary: "Storm control" },
              { name: "Dynamic ARP Inspection: حماية من ARP Spoofing", primary: "DAI" }
            ]},
            { unit_index: 4, code: "2.4.4", name: "إعداد جدار الحماية", goal: "تصميم وإدارة جدار الحماية وقواعد NAT في بيئات المؤسسات", key_concepts: ["Stateful Inspection","iptables/nftables","NGFW policies","Zone-Based Firewall","NAT SNAT/DNAT/PAT"], lessons: [
              { name: "iptables: جدار الحماية الكلاسيكي في Linux", primary: "iptables architecture" },
              { name: "السلاسل والجداول في iptables: INPUT وOUTPUT وFORWARD", primary: "iptables chains" },
              { name: "قواعد iptables: الكتابة والترتيب والأولوية", primary: "iptables rules" },
              { name: "nftables: خليفة iptables الحديث", primary: "nftables" },
              { name: "NGFW: ما يتجاوز فلترة الحزم", primary: "Next-gen firewall" },
              { name: "جدار الحماية القائم على المناطق Zone-Based", primary: "Zone-based firewall" },
              { name: "SNAT وDNAT وPAT/Masquerade: ترجمة العناوين", primary: "NAT types" },
              { name: "أتمتة قواعد جدار الحماية: من الأوامر إلى الكود", primary: "Firewall automation" },
              { name: "تدقيق قواعد جدار الحماية والتحسين", primary: "Firewall rule audit" }
            ]},
            { unit_index: 5, code: "2.4.5", name: "تقنيات VPN", goal: "تصميم وتنفيذ حلول VPN آمنة للاتصال بين المواقع والوصول عن بُعد", key_concepts: ["IPSec IKEv1/IKEv2 AH/ESP","SSL/TLS VPN","WireGuard","Site-to-Site vs Remote Access"], lessons: [
              { name: "VPN: الشبكة الخاصة فوق الشبكة العامة", primary: "VPN fundamentals" },
              { name: "IPSec: بروتوكول حماية شبكة IP", primary: "IPSec protocol" },
              { name: "IKE وSA: التفاوض على معاملات التشفير", primary: "IKE key exchange" },
              { name: "AH وESP: رأسا IPSec وفرق التوفير", primary: "AH vs ESP" },
              { name: "VPN من موقع لموقع Site-to-Site", primary: "Site-to-site VPN" },
              { name: "VPN للوصول عن بُعد Remote Access VPN", primary: "Remote access VPN" },
              { name: "SSL/TLS VPN: VPN عبر متصفح الويب", primary: "SSL VPN" },
              { name: "WireGuard: VPN الجيل التالي", primary: "WireGuard protocol" },
              { name: "اختيار حل VPN لبيئة المؤسسة", primary: "VPN selection guide" }
            ]},
            { unit_index: 6, code: "2.4.6", name: "مراقبة الشبكة", goal: "بناء نظام مراقبة شبكي شامل يكشف الأعطال والشذوذات قبل أن يلاحظها المستخدم", key_concepts: ["SNMP v1/v2c/v3 OID/MIB","NetFlow/IPFIX","sFlow","Syslog","RMON","Monitoring Tools"], lessons: [
              { name: "SNMP: بروتوكول إدارة الشبكات المعياري", primary: "SNMP protocol" },
              { name: "OIDs وMIBs: هيكل بيانات SNMP", primary: "OID and MIB structure" },
              { name: "SNMPv3: الأمان في مراقبة الشبكة", primary: "SNMPv3 security" },
              { name: "NetFlow وIPFIX: تحليل حركة الشبكة", primary: "NetFlow analysis" },
              { name: "sFlow: المراقبة بالعينة", primary: "sFlow sampling" },
              { name: "Syslog: جمع السجلات المركزي", primary: "Syslog collection" },
              { name: "Zabbix: منصة مراقبة شاملة", primary: "Zabbix monitoring" },
              { name: "Nagios وNagios Core: المراقبة الكلاسيكية", primary: "Nagios" },
              { name: "لوحات المراقبة: Grafana وبيانات الشبكة", primary: "Network monitoring dashboards" }
            ]},
            { unit_index: 7, code: "2.4.7", name: "موازنة الأحمال والتوافر العالي", goal: "تصميم بنية شبكية عالية التوفر مع موازنة الأحمال والتعافي التلقائي", key_concepts: ["L4 vs L7 Load Balancing","Algorithms RR/Least Conn","Health Checks","VRRP/HSRP","Active/Passive vs Active/Active"], lessons: [
              { name: "موازنة الأحمال Load Balancing: لماذا وكيف", primary: "Load balancing concept" },
              { name: "موازنة الطبقة الرابعة L4: قرار الشبكة", primary: "Layer 4 load balancing" },
              { name: "موازنة الطبقة السابعة L7: قرار التطبيق", primary: "Layer 7 load balancing" },
              { name: "خوارزميات التوزيع: Round Robin وLeast Connections", primary: "Load balancing algorithms" },
              { name: "فحوصات الصحة Health Checks: الكشف عن الفشل", primary: "Health check configuration" },
              { name: "VRRP وHSRP: التوافر العالي لبوابات الشبكة", primary: "VRRP and HSRP" },
              { name: "نموذج Active/Passive مقابل Active/Active", primary: "HA models" },
              { name: "HAProxy وNginx كموازني أحمال", primary: "Software load balancers" },
              { name: "F5 وCitrix ADC: موازنة الأحمال المؤسسية", primary: "Enterprise load balancers" }
            ]},
            { unit_index: 8, code: "2.4.8", name: "إدارة DNS المتقدمة", goal: "إعداد وإدارة خوادم DNS مؤسسية مع تطبيق DNSSEC وأساليب الحماية", key_concepts: ["BIND9 named.conf/zones/records","DNSSEC","RPZ","Split-horizon DNS","DoT/DoH"], lessons: [
              { name: "BIND9: أشهر خادم DNS في العالم", primary: "BIND9 overview" },
              { name: "ملف named.conf: الهيكل والمناطق", primary: "BIND9 configuration" },
              { name: "ملفات المنطقة Zone Files: سجلات DNS كاملة", primary: "Zone file syntax" },
              { name: "DNSSEC: التوقيع الرقمي للسجلات", primary: "DNSSEC implementation" },
              { name: "سياسة استجابة DNS RPZ: تصفية المواقع الخبيثة", primary: "DNS RPZ" },
              { name: "Split-horizon DNS: إجابات مختلفة لجمهور مختلف", primary: "Split DNS" },
              { name: "DNS over TLS/HTTPS: تشفير استعلامات DNS", primary: "DoT and DoH" },
              { name: "مراقبة وأداء خادم DNS", primary: "DNS monitoring" },
              { name: "استكشاف أخطاء DNS المتقدم في الإنتاج", primary: "Advanced DNS troubleshooting" }
            ]},
            { unit_index: 9, code: "2.4.9", name: "أتمتة الشبكات", goal: "أتمتة إعداد وإدارة الشبكات باستخدام Ansible وNetmiko وواجهات NETCONF/RESTCONF", key_concepts: ["Ansible Networking","Netmiko","NAPALM","NETCONF/YANG/RESTCONF"], lessons: [
              { name: "لماذا أتمتة الشبكات: من الـCLI إلى الكود", primary: "Network automation motivation" },
              { name: "Ansible للشبكات: المخزون والوحدات والـPlaybooks", primary: "Ansible networking" },
              { name: "ios_command وios_config: إعداد Cisco عبر Ansible", primary: "Cisco automation with Ansible" },
              { name: "Netmiko: SSH متعدد المصنّعين في Python", primary: "Netmiko library" },
              { name: "NAPALM: API موحد للشبكات متعددة المصنّعين", primary: "NAPALM framework" },
              { name: "NETCONF: واجهة إدارة الشبكة القياسية", primary: "NETCONF protocol" },
              { name: "YANG: نمذجة بيانات الشبكة", primary: "YANG data modeling" },
              { name: "RESTCONF: NETCONF عبر HTTP", primary: "RESTCONF" },
              { name: "CI/CD لتغييرات إعداد الشبكة", primary: "Network CI/CD" }
            ]}
          ]
        },
        {
          stage_index: 5,
          name: "تقنيات الويب وAPIs",
          goal: "فهم وتشغيل وتأمين خوادم الويب وتصميم وتكامل REST APIs في البنية التحتية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "2.5.1", name: "بروتوكول HTTP بعمق", goal: "فهم آليات HTTP 1.1/2/3 وتطبيقاتها في إدارة البنية التحتية والأداء", key_concepts: ["HTTP/1.1 vs HTTP/2 vs HTTP/3","Methods/Status Codes/Headers","Cookies","CORS","Caching headers"], lessons: [
              { name: "HTTP: البروتوكول الذي يحرك الويب", primary: "HTTP fundamentals" },
              { name: "HTTP Methods: GET وPOST وPUT وDELETE وغيرها", primary: "HTTP methods" },
              { name: "رموز الحالة HTTP Status Codes: المعنى الكامل", primary: "HTTP status codes" },
              { name: "ترويسات HTTP Headers: تحكم في الطلب والاستجابة", primary: "HTTP headers" },
              { name: "HTTP/1.1 مقابل HTTP/2: التعددية والضغط", primary: "HTTP/1.1 vs HTTP/2" },
              { name: "HTTP/3 وQUIC: الجيل التالي فوق UDP", primary: "HTTP/3" },
              { name: "Cookies وSessions: إدارة الحالة في HTTP", primary: "Cookies" },
              { name: "CORS: التحكم في طلبات المصادر المتقاطعة", primary: "CORS" },
              { name: "ترويسات التخزين المؤقت: Cache-Control وETag", primary: "Caching headers" }
            ]},
            { unit_index: 2, code: "2.5.2", name: "إدارة خوادم الويب", goal: "إعداد وضبط وتحسين Nginx وApache في بيئات الإنتاج", key_concepts: ["Nginx server/location blocks upstream","Apache VirtualHost .htaccess","Process Models","Worker Tuning"], lessons: [
              { name: "Nginx مقابل Apache: الفلسفة والاستخدامات", primary: "Nginx vs Apache" },
              { name: "بنية Nginx: كتل server وlocation والـupstream", primary: "Nginx configuration" },
              { name: "Nginx كـReverse Proxy: التوجيه للخلف", primary: "Nginx reverse proxy" },
              { name: "Apache VirtualHosts: استضافة عدة مواقع", primary: "Apache VirtualHosts" },
              { name: "mod_rewrite في Apache: إعادة كتابة URLs", primary: "Apache URL rewriting" },
              { name: "نماذج العمليات في Nginx وApache", primary: "Process models" },
              { name: "ضبط عمال الـWorkers لأفضل أداء", primary: "Worker tuning" },
              { name: "سجلات خادم الويب: القراءة والتحليل", primary: "Web server logs" },
              { name: "مراقبة أداء خادم الويب في الإنتاج", primary: "Web server monitoring" }
            ]},
            { unit_index: 3, code: "2.5.3", name: "SSL/TLS وإدارة الشهادات", goal: "إعداد وإدارة دورة حياة شهادات TLS لضمان الاتصال الآمن في الإنتاج", key_concepts: ["TLS 1.2/1.3 Handshake","Certificate Chain","CSR/CRT","Let's Encrypt","OCSP Stapling","HSTS"], lessons: [
              { name: "TLS: التشفير في طبقة النقل", primary: "TLS fundamentals" },
              { name: "مصافحة TLS Handshake: التفاوض على الأمان", primary: "TLS handshake" },
              { name: "TLS 1.2 مقابل 1.3: الفروق والترقية", primary: "TLS 1.2 vs 1.3" },
              { name: "سلسلة الشهادات: Root وIntermediate وLeaf", primary: "Certificate chain" },
              { name: "CSR وCRT: إنشاء طلب الشهادة", primary: "CSR generation" },
              { name: "Let's Encrypt: شهادات مجانية ومؤتمتة", primary: "Let's Encrypt" },
              { name: "OCSP Stapling: تسريع التحقق من الشهادة", primary: "OCSP Stapling" },
              { name: "HSTS: إجبار HTTPS على المتصفح", primary: "HSTS" },
              { name: "إدارة تجديد الشهادات والتنبيه على انتهاء الصلاحية", primary: "Certificate renewal" }
            ]},
            { unit_index: 4, code: "2.5.4", name: "تصميم REST API", goal: "تصميم REST APIs متسقة وقابلة للصيانة وفق مبادئ Richardson Maturity", key_concepts: ["REST Constraints","Resource Naming","HTTP Verbs Semantics","Status Code Conventions","Versioning","HATEOAS"], lessons: [
              { name: "مبادئ REST: القيود الستة", primary: "REST constraints" },
              { name: "تسمية الموارد Resources: الأسماء لا الأفعال", primary: "Resource naming" },
              { name: "HTTP Verbs في REST: الدلالة الصحيحة", primary: "HTTP verbs semantics" },
              { name: "رموز الحالة في REST: الاستخدام الصحيح", primary: "REST status codes" },
              { name: "إصدار API Versioning: استراتيجيات مختلفة", primary: "API versioning" },
              { name: "HATEOAS: الـAPI التي تشرح نفسها", primary: "HATEOAS" },
              { name: "تصميم هيكل الاستجابة: JSON متسق", primary: "Response structure" },
              { name: "معالجة الأخطاء في REST: رسائل واضحة", primary: "Error handling in REST" },
              { name: "توثيق REST API: OpenAPI وSwagger UI", primary: "API documentation" }
            ]},
            { unit_index: 5, code: "2.5.5", name: "مصادقة API والتفويض", goal: "تنفيذ آليات مصادقة وتفويض آمنة لـAPIs في بيئات الإنتاج", key_concepts: ["Basic/Digest Auth","API Keys","JWT","OAuth2 Flows Code/Client Credentials/PKCE"], lessons: [
              { name: "أساليب مصادقة API: المقارنة والاختيار", primary: "API auth methods overview" },
              { name: "Basic Auth وDigest Auth: الأبسط ولكن محدود", primary: "Basic authentication" },
              { name: "مفاتيح API Keys: الأكثر شيوعاً في واجهات B2B", primary: "API keys" },
              { name: "JWT: رمز مصادقة ذاتي الاحتواء", primary: "JWT structure" },
              { name: "التحقق من JWT والإشكاليات الشائعة", primary: "JWT validation" },
              { name: "OAuth2: التفويض دون كشف بيانات اعتماد", primary: "OAuth2 flows" },
              { name: "Authorization Code Flow: أكثر تدفقات OAuth2 أماناً", primary: "Auth code flow" },
              { name: "Client Credentials Flow: للاتصال بين الخوادم", primary: "Client credentials" },
              { name: "PKCE: حماية التطبيقات العامة في OAuth2", primary: "PKCE" }
            ]},
            { unit_index: 6, code: "2.5.6", name: "معماريات تطبيقات الويب", goal: "تقييم واختيار معمارية تطبيقات الويب المناسبة لكل متطلب مؤسسي", key_concepts: ["Monolith vs SOA vs Microservices","3-Tier Architecture","Stateless Design","Session Management","CDN Patterns"], lessons: [
              { name: "الخادم المتجانس Monolith: البدء البسيط", primary: "Monolith architecture" },
              { name: "معمارية خدمات SOA: الوحدات المستقلة", primary: "SOA architecture" },
              { name: "الخدمات المصغرة Microservices: الاستقلالية الكاملة", primary: "Microservices" },
              { name: "معمارية ثلاثة طبقات 3-Tier: الأكثر شيوعاً", primary: "3-tier architecture" },
              { name: "التصميم عديم الحالة Stateless: قابلية التوسع", primary: "Stateless design" },
              { name: "إدارة الجلسات Session Management: التخزين والأمان", primary: "Session management" },
              { name: "CDN: توزيع المحتوى للأداء العالمي", primary: "CDN architecture" },
              { name: "أنماط تخزين الجلسات: Cookie وServer-side وJWT", primary: "Session storage patterns" },
              { name: "اختيار المعمارية: معايير قابلة للتطبيق", primary: "Architecture selection" }
            ]},
            { unit_index: 7, code: "2.5.7", name: "Reverse Proxy وCDN", goal: "إعداد وإدارة Reverse Proxy وCDN لتحسين الأداء والأمان", key_concepts: ["Nginx as Reverse Proxy","Proxy Headers","WebSocket Proxying","CDN Edge Caching","Cache Invalidation"], lessons: [
              { name: "Reverse Proxy: الوسيط بين المستخدم والخادم", primary: "Reverse proxy concept" },
              { name: "Nginx Reverse Proxy: الإعداد الكامل", primary: "Nginx reverse proxy setup" },
              { name: "ترويسات الـProxy: X-Forwarded-For وX-Real-IP", primary: "Proxy headers" },
              { name: "WebSocket عبر Reverse Proxy: الإعداد الصحيح", primary: "WebSocket proxying" },
              { name: "CDN: شبكة توصيل المحتوى", primary: "CDN fundamentals" },
              { name: "ذاكرة التخزين المؤقت لـEdge: قواعد الـCaching", primary: "Edge caching" },
              { name: "إبطال التخزين المؤقت Cache Invalidation", primary: "Cache invalidation" },
              { name: "Anycast DNS: التوجيه للأقرب جغرافياً", primary: "Anycast routing" },
              { name: "أمان CDN: DDoS والحماية من الهجمات", primary: "CDN security" }
            ]},
            { unit_index: 8, code: "2.5.8", name: "أداء الويب والتخزين المؤقت", goal: "تحسين أداء تطبيقات الويب عبر طبقات تخزين مؤقت متعددة وتقنيات الضغط", key_concepts: ["Cache-Control Directives","Redis as App Cache","Cache Stampede","Database Query Caching","HTTP/2 Push","Compression"], lessons: [
              { name: "توجيهات Cache-Control: التحكم الكامل في التخزين المؤقت", primary: "Cache-Control" },
              { name: "Redis كطبقة تخزين مؤقت للتطبيق", primary: "Application caching with Redis" },
              { name: "إستراتيجيات التخزين المؤقت: Cache-Aside وWrite-Through", primary: "Cache strategies" },
              { name: "Cache Stampede: وقوع الكارثة عند انتهاء الصلاحية", primary: "Cache stampede" },
              { name: "تخزين نتائج استعلامات قاعدة البيانات", primary: "Query result caching" },
              { name: "ضغط الاستجابة: gzip وBrotli", primary: "Response compression" },
              { name: "HTTP/2 Server Push: الإرسال قبل الطلب", primary: "HTTP/2 push" },
              { name: "أدوات قياس أداء الويب: Lighthouse وWebPageTest", primary: "Web performance tools" },
              { name: "تحسين الـWeb Vitals في البنية التحتية", primary: "Core Web Vitals" }
            ]},
            { unit_index: 9, code: "2.5.9", name: "أمن تطبيقات الويب", goal: "تطبيق ضوابط OWASP Top 10 وإعداد WAF لحماية تطبيقات الويب من الهجمات الشائعة", key_concepts: ["OWASP Top 10","WAF rules","CSP/CORS Security Headers","SAST/DAST","Threat Modeling"], lessons: [
              { name: "OWASP Top 10: المخاطر العشرة الأكثر شيوعاً", primary: "OWASP Top 10" },
              { name: "SQL Injection في تطبيقات الويب: الهجوم والدفاع", primary: "SQL injection" },
              { name: "XSS: حقن النصوص البرمجية والحماية منه", primary: "Cross-site scripting" },
              { name: "CSRF: الطلب المزوّر عبر المواقع", primary: "CSRF protection" },
              { name: "IDOR وSSRF: ثغرات التحكم في الوصول", primary: "IDOR and SSRF" },
              { name: "WAF: جدار الحماية لتطبيقات الويب", primary: "Web Application Firewall" },
              { name: "ترويسات الأمان: CSP وHSTS وX-Frame-Options", primary: "Security headers" },
              { name: "SAST وDAST: اختبار الأمان في دورة التطوير", primary: "Security testing" },
              { name: "نمذجة التهديدات للتطبيقات: STRIDE", primary: "Threat modeling" }
            ]}
          ]
        },
        {
          stage_index: 6,
          name: "الافتراضية والحاويات",
          goal: "إتقان تقنيات الافتراضية وDocker وKubernetes الأساسية لنشر التطبيقات",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "2.6.1", name: "مفاهيم الافتراضية وأنواع الـHypervisor", goal: "تقييم أنواع المشرفين Hypervisor ونماذج الافتراضية لاختيار المناسب لكل بيئة", key_concepts: ["Type 1 VMware ESXi/Hyper-V/KVM vs Type 2","Full vs Para-virtualization","VM Overhead","NUMA awareness"], lessons: [
              { name: "الافتراضية: مبدأ التجريد عن الأجهزة", primary: "Virtualization abstraction" },
              { name: "Hypervisor النوع الأول: مباشرة على الأجهزة", primary: "Type 1 hypervisors" },
              { name: "Hypervisor النوع الثاني: فوق نظام التشغيل", primary: "Type 2 hypervisors" },
              { name: "الافتراضية الكاملة Full مقابل شبه الافتراضية Para", primary: "Full vs para-virtualization" },
              { name: "VMware ESXi: المنصة المؤسسية الأكثر انتشاراً", primary: "VMware ESXi" },
              { name: "KVM: الافتراضية مفتوحة المصدر في Linux", primary: "KVM" },
              { name: "Microsoft Hyper-V: الافتراضية في بيئة Windows", primary: "Hyper-V" },
              { name: "الحمل الزائد VM Overhead: vCPU وvRAM وتأثيرهما", primary: "VM overhead" },
              { name: "NUMA في الافتراضية: التخصيص الأمثل", primary: "NUMA awareness" }
            ]},
            { unit_index: 2, code: "2.6.2", name: "إدارة VMware/KVM", goal: "إدارة دورة حياة الآلات الافتراضية وعملياتها في بيئات VMware وKVM", key_concepts: ["vSphere/vCenter basics","VM lifecycle","Snapshots","vMotion/Live Migration","Storage vMotion","VM Templates"], lessons: [
              { name: "vSphere وvCenter: إدارة مؤسسية للافتراضية", primary: "vSphere overview" },
              { name: "دورة حياة VM: الإنشاء والتشغيل والإيقاف والحذف", primary: "VM lifecycle" },
              { name: "اللقطات Snapshots في VMware: إدارة نقاط الاسترداد", primary: "VMware snapshots" },
              { name: "vMotion: نقل VM حي بلا توقف", primary: "vMotion" },
              { name: "Storage vMotion: نقل تخزين VM بلا توقف", primary: "Storage vMotion" },
              { name: "قوالب VM Templates: النسخ السريع", primary: "VM templates" },
              { name: "إدارة KVM بـvirsh: الأوامر الأساسية", primary: "KVM management" },
              { name: "Virt-Manager: واجهة رسومية لـKVM", primary: "Virt-Manager" },
              { name: "النسخ الاحتياطي للآلات الافتراضية", primary: "VM backup" }
            ]},
            { unit_index: 3, code: "2.6.3", name: "أساسيات Docker", goal: "بناء وإدارة حاويات Docker وفهم مبدأ العزل وعلاقتها بالآلات الافتراضية", key_concepts: ["Container vs VM","Image Layers Union Filesystem","Docker Daemon/CLI","Container Lifecycle","Namespaces/Cgroups"], lessons: [
              { name: "الحاويات Containers: ثورة في نشر التطبيقات", primary: "Container concept" },
              { name: "VM مقابل Container: متى تختار أيهما", primary: "VM vs container" },
              { name: "نظام ملفات الاتحاد UnionFS: طبقات الصورة", primary: "Image layers" },
              { name: "Docker Daemon وCLI: الهيكل المعماري", primary: "Docker architecture" },
              { name: "دورة حياة الحاوية: create وstart وstop وrm", primary: "Container lifecycle" },
              { name: "Namespaces: عزل pid وnet وmnt وuts", primary: "Linux namespaces" },
              { name: "cgroups: تحديد موارد الحاوية", primary: "Control groups" },
              { name: "حاويات vs عمليات عادية: الفرق من منظور النواة", primary: "Containers at OS level" },
              { name: "Docker Hub: سجل الصور العام", primary: "Docker Hub" }
            ]},
            { unit_index: 4, code: "2.6.4", name: "بناء Dockerfile وصور Docker", goal: "بناء صور Docker احترافية آمنة وصغيرة باستخدام أفضل ممارسات Dockerfile", key_concepts: ["Dockerfile Instructions FROM/RUN/COPY/ENTRYPOINT/CMD","Multi-stage Builds",".dockerignore","Layer Caching"], lessons: [
              { name: "Dockerfile: وصفة بناء الصورة", primary: "Dockerfile basics" },
              { name: "FROM وRUN وCOPY وADD: التعليمات الأساسية", primary: "Basic Dockerfile instructions" },
              { name: "ENTRYPOINT وCMD: الأمر الذي ينفذ عند التشغيل", primary: "ENTRYPOINT vs CMD" },
              { name: "ENV وARG وLABEL: متغيرات البناء والبيانات الوصفية", primary: "Environment and metadata" },
              { name: "HEALTHCHECK: مراقبة صحة الحاوية", primary: "Health check" },
              { name: "تخزين مؤقت للطبقات Layer Caching: تسريع البناء", primary: "Layer caching" },
              { name: "Multi-stage Builds: صور أصغر وأنظف", primary: "Multi-stage builds" },
              { name: ".dockerignore: ما لا يدخل الصورة", primary: ".dockerignore" },
              { name: "أفضل ممارسات Dockerfile للإنتاج", primary: "Dockerfile best practices" }
            ]},
            { unit_index: 5, code: "2.6.5", name: "شبكات وتخزين Docker", goal: "تصميم شبكات وتخزين Docker المناسبة للتطبيقات متعددة الحاويات", key_concepts: ["Bridge/Host/None/Overlay Networks","Port Mapping","Volume Types bind/volume/tmpfs","Volume Drivers"], lessons: [
              { name: "شبكة Bridge الافتراضية في Docker", primary: "Bridge network" },
              { name: "شبكة Host: الحاوية بعنوان الـHost مباشرة", primary: "Host network" },
              { name: "شبكة Overlay: التواصل بين الحاويات عبر Hosts متعددة", primary: "Overlay network" },
              { name: "تعيين المنافذ Port Mapping: -p وجدار الحماية", primary: "Port mapping" },
              { name: "وحدات التخزين Volumes: البيانات الدائمة", primary: "Docker volumes" },
              { name: "Bind Mounts: ربط مجلد Host بالحاوية", primary: "Bind mounts" },
              { name: "tmpfs Mounts: تخزين مؤقت في الذاكرة", primary: "tmpfs mounts" },
              { name: "Volume Drivers: التخزين الخارجي والسحابي", primary: "Volume drivers" },
              { name: "إدارة دورة حياة Volumes في الإنتاج", primary: "Volume lifecycle management" }
            ]},
            { unit_index: 6, code: "2.6.6", name: "Docker Compose", goal: "تعريف وإدارة تطبيقات متعددة الحاويات باستخدام Docker Compose", key_concepts: ["docker-compose.yml Schema","Services/Networks/Volumes","Depends-on/Healthcheck","Environment Variables","Override files"], lessons: [
              { name: "Docker Compose: أتمتة التطبيقات متعددة الحاويات", primary: "Docker Compose overview" },
              { name: "بنية docker-compose.yml: الخدمات والشبكات والـVolumes", primary: "Compose file structure" },
              { name: "depends_on وhealthcheck: ترتيب بدء الخدمات", primary: "Service dependencies" },
              { name: "متغيرات البيئة في Compose: ملف .env", primary: "Environment variables" },
              { name: "ملفات Override: تهيئات بيئات مختلفة", primary: "Compose override files" },
              { name: "أوامر Compose: up وdown وps ولogs", primary: "Compose commands" },
              { name: "ترقية الخدمات بلا توقف: Rolling updates", primary: "Service updates" },
              { name: "Compose في الإنتاج: الفرص والقيود", primary: "Compose in production" },
              { name: "الانتقال من Compose إلى Kubernetes", primary: "Compose to K8s" }
            ]},
            { unit_index: 7, code: "2.6.7", name: "سجلات الحاويات وإدارة الصور", goal: "إدارة دورة حياة صور الحاويات ونشرها بأمان عبر سجلات خاصة وعامة", key_concepts: ["Docker Hub vs Harbor","Image Tagging Strategy","Image Scanning Trivy","Registry Authentication"], lessons: [
              { name: "سجلات الصور Registry: أين تُخزّن الصور؟", primary: "Container registries" },
              { name: "Docker Hub: السجل العام وحدوده", primary: "Docker Hub" },
              { name: "Harbor: سجل خاص للمؤسسات", primary: "Harbor registry" },
              { name: "استراتيجية الوسم Tagging: latest ليست كافية", primary: "Image tagging" },
              { name: "فحص الصور بـTrivy: الثغرات في الحاوية", primary: "Image scanning with Trivy" },
              { name: "مصادقة السجل: docker login والبيانات الاعتمادية", primary: "Registry authentication" },
              { name: "إدارة الصور: حذف القديمة وتنظيف الـcache", primary: "Image cleanup" },
              { name: "نسخ الصور بين السجلات", primary: "Image replication" },
              { name: "سياسة الصور في المؤسسة: من يبني ومن يوافق", primary: "Image governance" }
            ]},
            { unit_index: 8, code: "2.6.8", name: "أمن الحاويات", goal: "تطبيق مبادئ أمن الحاويات للتشغيل بأقل امتياز وأقل تعرض لمخاطر الثغرات", key_concepts: ["Non-root Container","Read-only Filesystem","Seccomp/AppArmor","Capability Dropping","Image Provenance","Secret Management"], lessons: [
              { name: "الحاوية بدون root: لماذا هو الإلزامي", primary: "Non-root containers" },
              { name: "نظام ملفات للقراءة فقط: تثبيت الحاوية", primary: "Read-only filesystem" },
              { name: "Seccomp: تقييد استدعاءات النظام", primary: "Seccomp profiles" },
              { name: "AppArmor في Docker: ملفات التعريف الأمنية", primary: "AppArmor for containers" },
              { name: "إسقاط Capabilities: مبدأ أقل امتياز للحاوية", primary: "Capability dropping" },
              { name: "SBOM وImage Provenance: أصل الصورة وشجرة التبعيات", primary: "Image provenance" },
              { name: "إدارة الأسرار Secrets في بيئات الحاويات", primary: "Container secrets" },
              { name: "مسح الصور في خط CI/CD: الأمان تلقائياً", primary: "CI/CD security scanning" },
              { name: "أمن Runtime الحاوية: Falco والكشف السلوكي", primary: "Runtime security" }
            ]},
            { unit_index: 9, code: "2.6.9", name: "مقدمة إلى Kubernetes", goal: "فهم معمارية Kubernetes وإدارة أعباء العمل الأساسية باستخدام kubectl", key_concepts: ["K8s Architecture Control Plane/Worker","Pod/Node/Cluster","Deployment/Service/ConfigMap/Secret","kubectl basics"], lessons: [
              { name: "Kubernetes: منظومة تنسيق الحاويات", primary: "Kubernetes overview" },
              { name: "معمارية K8s: Control Plane والـWorker Nodes", primary: "K8s architecture" },
              { name: "الـPod: الوحدة الأساسية في Kubernetes", primary: "Kubernetes Pods" },
              { name: "Deployment: إدارة الـPods بمرونة", primary: "K8s Deployments" },
              { name: "Service: كيف تصل للـPods من داخل وخارج الكلاستر", primary: "K8s Services" },
              { name: "ConfigMap وSecret: البيانات والأسرار بدون إعادة بناء", primary: "ConfigMap and Secret" },
              { name: "kubectl: سطر أوامر Kubernetes", primary: "kubectl basics" },
              { name: "Namespace: عزل المشاريع في كلاستر واحد", primary: "Namespaces" },
              { name: "نشر أول تطبيق في Kubernetes: من صورة إلى خدمة", primary: "First K8s deployment" }
            ]}
          ]
        },
        {
          stage_index: 7,
          name: "الحوسبة السحابية",
          goal: "نشر وإدارة البنية التحتية السحابية على AWS وAzure مع تحسين التكاليف والأمان",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            { unit_index: 1, code: "2.7.1", name: "نماذج الحوسبة السحابية", goal: "تصنيف نماذج السحابة واتخاذ قرارات مدروسة حول اعتماد السحابة لحالات استخدام مختلفة", key_concepts: ["IaaS/PaaS/SaaS/FaaS/CaaS","Public/Private/Hybrid/Multi-Cloud","Shared Responsibility Model"], lessons: [
              { name: "السحابة: ما وراء الاستعارة", primary: "Cloud computing fundamentals" },
              { name: "IaaS وPaaS وSaaS: التدرج في المسؤولية", primary: "Cloud service models" },
              { name: "FaaS وCaaS: النماذج الحديثة", primary: "Modern cloud models" },
              { name: "السحابة العامة والخاصة والهجينة: المقارنة", primary: "Cloud deployment models" },
              { name: "نموذج المسؤولية المشتركة: من يؤمن ماذا", primary: "Shared responsibility" },
              { name: "Multi-Cloud: المزايا والتحديات", primary: "Multi-cloud strategy" },
              { name: "حالات عدم الانتقال للسحابة: القرار الصحيح", primary: "When not to cloud" },
              { name: "تقييم الاستعداد للسحابة Cloud Readiness", primary: "Cloud readiness assessment" },
              { name: "رحلة الانتقال للسحابة: المراحل الست لـGartner", primary: "Cloud migration journey" }
            ]},
            { unit_index: 2, code: "2.7.2", name: "خدمات AWS الأساسية", goal: "نشر وإدارة موارد AWS الأساسية من EC2 وS3 وVPC في بيئة منتجة", key_concepts: ["EC2 Instance Types/AMI/User Data","S3 Storage Classes/Versioning","VPC Subnets/Route Tables/IGW/NAT"], lessons: [
              { name: "AWS: النظرة العامة على نموذج الموارد", primary: "AWS global infrastructure" },
              { name: "EC2: الحساب المرن في السحابة", primary: "EC2 instances" },
              { name: "أنواع EC2 Instances: الاختيار الصحيح للحمل", primary: "EC2 instance types" },
              { name: "AMI وUser Data: قوالب وأتمتة بدء التشغيل", primary: "AMI and User Data" },
              { name: "S3: التخزين الكائني اللانهائي", primary: "S3 storage" },
              { name: "فئات تخزين S3: من Standard إلى Glacier", primary: "S3 storage classes" },
              { name: "S3 Versioning وLifecycle: إدارة دورة حياة البيانات", primary: "S3 versioning" },
              { name: "VPC: شبكتك الخاصة في السحابة", primary: "VPC basics" },
              { name: "Subnets وRoute Tables وInternet Gateway وNAT", primary: "VPC components" }
            ]},
            { unit_index: 3, code: "2.7.3", name: "إدارة الهوية والوصول في AWS", goal: "تصميم سياسات IAM صحيحة وفق مبدأ أقل امتياز لإدارة الوصول في AWS", key_concepts: ["IAM Users/Groups/Roles/Policies","STS/AssumeRole","Resource-based vs Identity-based","MFA","Access Analyzer"], lessons: [
              { name: "IAM: إدارة هوية AWS والصلاحيات", primary: "IAM overview" },
              { name: "مستخدمو IAM والمجموعات: الكيانات البشرية", primary: "IAM users and groups" },
              { name: "أدوار IAM Roles: الصلاحيات للخدمات", primary: "IAM roles" },
              { name: "سياسات IAM Policies: JSON يحدد ما يُسمح به", primary: "IAM policies" },
              { name: "السياسات القائمة على الهوية مقابل الموارد", primary: "Identity vs resource policies" },
              { name: "STS وAssumeRole: تصعيد الصلاحيات المؤقت", primary: "STS and AssumeRole" },
              { name: "MFA في AWS: الطبقة الإضافية لـRoot وAdmins", primary: "MFA in AWS" },
              { name: "IAM Access Analyzer: الكشف عن الوصول الزائد", primary: "Access Analyzer" },
              { name: "بدائل طويلة الأمد للمفاتيح: Roles وInstance Profiles", primary: "Key alternatives" }
            ]},
            { unit_index: 4, code: "2.7.4", name: "أساسيات Microsoft Azure", goal: "نشر وإدارة موارد Azure الأساسية ومعرفة الفروق مع AWS", key_concepts: ["Resource Groups/Subscriptions","Azure VMs","Azure Storage","VNet/NSG","Azure AD basics"], lessons: [
              { name: "Azure: منصة Microsoft السحابية", primary: "Azure overview" },
              { name: "الاشتراكات Subscriptions ومجموعات الموارد", primary: "Azure subscription model" },
              { name: "Azure Virtual Machines: الحساب في Azure", primary: "Azure VMs" },
              { name: "Azure Storage: Blob وFile وQueue وTable", primary: "Azure storage types" },
              { name: "Azure Virtual Networks VNet وNSG", primary: "Azure networking" },
              { name: "Azure Active Directory (Entra ID): الهوية في Azure", primary: "Azure AD" },
              { name: "Azure Resource Manager ARM: إدارة الموارد بالقوالب", primary: "ARM templates" },
              { name: "Azure CLI وPowerShell: إدارة من سطر الأوامر", primary: "Azure CLI" },
              { name: "مقارنة AWS وAzure: من أين تبدأ؟", primary: "AWS vs Azure comparison" }
            ]},
            { unit_index: 5, code: "2.7.5", name: "شبكات السحابة", goal: "تصميم وتنفيذ بنية شبكية سحابية آمنة وقابلة للتوسع", key_concepts: ["VPC/VNet Design","VPC Peering","Transit Gateway/VNet Gateway","Direct Connect/ExpressRoute","Security Groups/NSGs","NACLs"], lessons: [
              { name: "شبكات السحابة: ما يختلف عن الشبكات التقليدية", primary: "Cloud networking concepts" },
              { name: "تصميم VPC/VNet: الشبكات العامة والخاصة", primary: "VPC design" },
              { name: "مجموعات الأمان Security Groups: جدار الحماية السحابي", primary: "Security groups" },
              { name: "قوائم التحكم بالشبكة NACLs: الطبقة الثانية من الحماية", primary: "NACLs" },
              { name: "VPC Peering: ربط شبكتين سحابيتين", primary: "VPC peering" },
              { name: "Transit Gateway: المركز الشبكي لعدة VPCs", primary: "Transit Gateway" },
              { name: "Direct Connect وExpressRoute: الاتصال الخاص بالسحابة", primary: "Private connectivity" },
              { name: "DNS في السحابة: Route 53 وAzure DNS", primary: "Cloud DNS" },
              { name: "الشبكة المتعددة Hybrid: ربط المركز البيانات بالسحابة", primary: "Hybrid networking" }
            ]},
            { unit_index: 6, code: "2.7.6", name: "حلول التخزين السحابي", goal: "اختيار وإدارة حلول التخزين السحابية المناسبة لكل نوع من البيانات والأحمال", key_concepts: ["Object/Block/File Storage","EBS/EFS/S3","Azure Blob/Disk/Files","Storage Tiers","Replication","Encryption at rest"], lessons: [
              { name: "نماذج التخزين السحابية: Block وFile وObject", primary: "Cloud storage models" },
              { name: "EBS في AWS: التخزين الكتلي المُدار", primary: "EBS storage" },
              { name: "EFS في AWS: نظام ملفات مشارك في السحابة", primary: "EFS storage" },
              { name: "S3 للتطبيقات: التخزين الكائني اللانهائي", primary: "S3 for applications" },
              { name: "Azure Blob Storage: التخزين الكائني في Azure", primary: "Azure Blob" },
              { name: "طبقات التخزين السحابي: التكلفة مقابل الوصول", primary: "Storage tiers" },
              { name: "النسخ المتماثل والتكرار: HA في التخزين السحابي", primary: "Storage replication" },
              { name: "تشفير البيانات في السكون Encryption at Rest", primary: "Encryption at rest" },
              { name: "تحسين تكاليف التخزين السحابي", primary: "Storage cost optimization" }
            ]},
            { unit_index: 7, code: "2.7.7", name: "إدارة تكاليف السحابة", goal: "تطبيق مبادئ FinOps لتحسين الإنفاق السحابي وتحقيق القيمة الأفضل من الاستثمار", key_concepts: ["Cost Explorer","Reserved vs On-Demand vs Spot","Rightsizing","Tagging Strategy","Budgets/Alerts","FinOps"], lessons: [
              { name: "FinOps: مسؤولية التكاليف في ثقافة السحابة", primary: "FinOps culture" },
              { name: "AWS Cost Explorer وAzure Cost Analysis", primary: "Cost visibility tools" },
              { name: "On-Demand وReserved وSpot: نماذج التسعير", primary: "Pricing models" },
              { name: "Reserved Instances وSavings Plans: الالتزام مقابل الخصم", primary: "Reserved capacity" },
              { name: "Spot وPreemptible: العمل على أسعار منخفضة", primary: "Spot instances" },
              { name: "Rightsizing: المورد الصحيح بلا إسراف", primary: "Resource rightsizing" },
              { name: "استراتيجية الوسوم Tagging: تخصيص التكاليف", primary: "Cost tagging" },
              { name: "الميزانيات والتنبيهات: الحماية من المفاجآت", primary: "Budgets and alerts" },
              { name: "تقارير تكاليف السحابة للإدارة", primary: "Cloud cost reporting" }
            ]},
            { unit_index: 8, code: "2.7.8", name: "مراقبة السحابة والسجلات", goal: "بناء نظام مراقبة شامل للبنية التحتية السحابية بسجلات وتنبيهات ولوحات متكاملة", key_concepts: ["CloudWatch/Azure Monitor","Metrics vs Logs vs Traces","CloudTrail/Activity Log","Alerting","Dashboards"], lessons: [
              { name: "المراقبة في السحابة: ما يختلف عن المراقبة التقليدية", primary: "Cloud monitoring challenges" },
              { name: "CloudWatch في AWS: المقاييس والسجلات والتنبيهات", primary: "CloudWatch" },
              { name: "Azure Monitor: نظير AWS CloudWatch في Azure", primary: "Azure Monitor" },
              { name: "Metrics وLogs وTraces: ثلاثية المراقبة", primary: "Observability pillars" },
              { name: "CloudTrail: من فعل ماذا في AWS؟", primary: "AWS CloudTrail" },
              { name: "Azure Activity Log: تدقيق عمليات Azure", primary: "Azure Activity Log" },
              { name: "التنبيهات الذكية: الإشعار في الوقت الصحيح", primary: "Intelligent alerting" },
              { name: "لوحات CloudWatch Dashboards: الرؤية الموحدة", primary: "Monitoring dashboards" },
              { name: "مراقبة التطبيقات: APM في السحابة", primary: "Application monitoring" }
            ]},
            { unit_index: 9, code: "2.7.9", name: "استراتيجيات متعددة السحاب", goal: "تصميم استراتيجية Multi-Cloud تحقق التوفر العالي والمرونة وتجنب الارتباط بمورد واحد", key_concepts: ["Multi-Cloud Drivers","Vendor Lock-in Mitigation","Terraform/Kubernetes","Data Gravity","Cost vs Resilience"], lessons: [
              { name: "لماذا Multi-Cloud: الدوافع الحقيقية", primary: "Multi-cloud motivations" },
              { name: "الارتباط بالمورد Vendor Lock-in: الخطر الخفي", primary: "Vendor lock-in" },
              { name: "تقليل الارتباط: Terraform وKubernetes كمحررين", primary: "Lock-in mitigation" },
              { name: "ثقل البيانات Data Gravity: قيود النقل", primary: "Data gravity" },
              { name: "أنماط Multi-Cloud: Active-Active وActive-Passive", primary: "Multi-cloud patterns" },
              { name: "إدارة الهوية عبر سحابات متعددة", primary: "Cross-cloud identity" },
              { name: "تكاليف البيانات عبر السحابات: Egress والتكاليف الخفية", primary: "Cross-cloud costs" },
              { name: "أدوات إدارة Multi-Cloud: Crossplane وArgo", primary: "Multi-cloud tools" },
              { name: "دراسة حالة: بنية Multi-Cloud للمؤسسة الكبيرة", primary: "Enterprise multi-cloud case study" }
            ]}
          ]
        }
      ]
    },
    {
      level_index: 3,
      name: "البنية التحتية المتقدمة والتخصص",
      goal: "إتقان الشبكات المتقدمة والأمن السيبراني والسحابة وDevOps وSRE والحوكمة للتأهل كمهندس تقنية معلومات متكامل",
      bloom_focus: "analyze",
      exam: { pass_threshold_percent: 70, time_limit_minutes: 70 },
      stages: [
        {
          stage_index: 1,
          name: "الشبكات المتقدمة",
          goal: "تصميم وتحليل وتأمين الشبكات المعقدة على مستوى مزودي الخدمة والمؤسسات الكبرى",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 80, time_limit_minutes: 30 },
          units: [
            { unit_index: 1, code: "3.1.1", name: "BGP المتقدم", goal: "إعداد وتحسين BGP مع السياسات والمجتمعات والحماية في بيئات مزودي الخدمة", key_concepts: ["BGP Attributes LOCAL_PREF/MED/AS_PATH/COMMUNITY","Route Policies","Route Reflectors","RPKI"], lessons: [
              { name: "BGP المتقدم: ما وراء بروتوكول البوابة الأساسي", primary: "Advanced BGP" },
              { name: "سمة LOCAL_PREF: التفضيل داخل النظام المستقل", primary: "LOCAL_PREF attribute" },
              { name: "سمة MED: التأثير على حركة الدخول", primary: "MED attribute" },
              { name: "سمة AS_PATH: منع الحلقات والسيطرة على المسار", primary: "AS_PATH manipulation" },
              { name: "مجتمعات BGP Communities: السياسات عابرة الحدود", primary: "BGP communities" },
              { name: "سياسات التوجيه Route Policies: Route Maps وPrefix Lists", primary: "Route policies" },
              { name: "عاكسات المسارات Route Reflectors: تبسيط iBGP", primary: "Route Reflectors" },
              { name: "RPKI: أمان BGP وحماية البادئات", primary: "RPKI BGP security" },
              { name: "استكشاف أخطاء BGP المتقدمة في الإنتاج", primary: "BGP troubleshooting" }
            ]},
            { unit_index: 2, code: "3.1.2", name: "MPLS وهندسة حركة المرور", goal: "فهم وتحليل شبكات MPLS وتطبيقاتها في هندسة حركة المرور وVPN", key_concepts: ["MPLS Labels","LDP/RSVP","L2/L3 VPN VPLS/VPRN","Traffic Engineering RSVP-TE","Fast Reroute"], lessons: [
              { name: "MPLS: التبديل بالبطاقات أسرع من التوجيه التقليدي", primary: "MPLS fundamentals" },
              { name: "بنية MPLS: Label Stack والـLSR", primary: "MPLS label stack" },
              { name: "LDP: توزيع بطاقات MPLS تلقائياً", primary: "LDP protocol" },
              { name: "RSVP-TE: الحجز الحراري لمسارات MPLS", primary: "RSVP-TE" },
              { name: "L3 VPN على MPLS: المزود وخدمة VPN للمؤسسة", primary: "MPLS L3 VPN" },
              { name: "VPLS: خدمة Ethernet LAN على الشبكة الواسعة", primary: "VPLS" },
              { name: "هندسة حركة المرور TE: أداء بدون ازدحام", primary: "Traffic engineering" },
              { name: "Fast Reroute: التعافي في أجزاء من الثانية", primary: "Fast reroute" },
              { name: "تشخيص أعطال MPLS: Ping وTraceroute عبر LSP", primary: "MPLS troubleshooting" }
            ]},
            { unit_index: 3, code: "3.1.3", name: "نشر IPv6", goal: "تخطيط ونشر IPv6 في بيئات المؤسسات مع الحفاظ على التوافق مع IPv4", key_concepts: ["IPv6 Address Types/Notation","NDP","DHCPv6 vs SLAAC","Dual-Stack","Tunneling"], lessons: [
              { name: "IPv6: لماذا أصبح ضرورة لا خياراً", primary: "IPv6 necessity" },
              { name: "بنية عنوان IPv6: 128 بت وأنواع العناوين", primary: "IPv6 address types" },
              { name: "تدوين IPv6 والاختصارات المسموح بها", primary: "IPv6 notation" },
              { name: "NDP: بروتوكول اكتشاف الجيران بديلاً عن ARP", primary: "Neighbor Discovery Protocol" },
              { name: "SLAAC: الإعداد التلقائي بدون DHCP", primary: "SLAAC" },
              { name: "DHCPv6: الإعداد المُدار في بيئات المؤسسات", primary: "DHCPv6" },
              { name: "Dual-Stack: تشغيل IPv4 وIPv6 معاً", primary: "Dual-stack deployment" },
              { name: "النفق Tunneling: 6in4 وTeredo للانتقال", primary: "Tunneling mechanisms" },
              { name: "خطة نشر IPv6 للمؤسسة: الخطوات العملية", primary: "Enterprise IPv6 deployment" }
            ]},
            { unit_index: 4, code: "3.1.4", name: "معمارية SD-WAN", goal: "تقييم وتصميم حلول SD-WAN لاستبدال أو تحسين الشبكات الواسعة التقليدية", key_concepts: ["SD-WAN Components Controller/Edge/Orchestrator","Underlay vs Overlay","Application-Aware Routing","Zero-Touch Provisioning"], lessons: [
              { name: "SD-WAN: الشبكة الواسعة المُعرَّفة بالبرمجيات", primary: "SD-WAN concept" },
              { name: "الأجزاء المعمارية: Controller وEdge وOrchestrator", primary: "SD-WAN components" },
              { name: "الشبكة التحتية Underlay مقابل التراكبية Overlay", primary: "Underlay vs overlay" },
              { name: "التوجيه المدرك للتطبيقات Application-Aware Routing", primary: "App-aware routing" },
              { name: "Zero-Touch Provisioning: نشر فروع بدون تدخل", primary: "ZTP in SD-WAN" },
              { name: "نماذج SD-WAN التجارية: Cisco Viptela وVMware VeloCloud", primary: "SD-WAN vendors" },
              { name: "أمان SD-WAN: التشفير والأمان الموزع", primary: "SD-WAN security" },
              { name: "SD-WAN مقابل MPLS: تحليل ROI", primary: "SD-WAN vs MPLS" },
              { name: "هجرة من MPLS إلى SD-WAN: المنهجية", primary: "Migration to SD-WAN" }
            ]},
            { unit_index: 5, code: "3.1.5", name: "افتراضية وظائف الشبكة NFV", goal: "فهم NFV وتطبيقها في بيئات مزودي الخدمة والمؤسسات", key_concepts: ["NFV vs SDN","ETSI NFV Architecture","VNF Lifecycle","Service Function Chaining","vRouter/vFirewall"], lessons: [
              { name: "NFV: برمجة أجهزة الشبكة على خوادم عامة", primary: "NFV concept" },
              { name: "NFV مقابل SDN: مفهومان متكاملان لا متطابقان", primary: "NFV vs SDN" },
              { name: "معمارية ETSI NFV: NFVi وVNFM وOrchestrator", primary: "ETSI NFV architecture" },
              { name: "وظائف الشبكة الافتراضية VNFs وأنواعها", primary: "VNF types" },
              { name: "دورة حياة VNF: النشر والتوسع والإزالة", primary: "VNF lifecycle" },
              { name: "سلسلة وظائف الخدمة Service Function Chaining", primary: "SFC" },
              { name: "vRouter وvFirewall: أمثلة على VNFs الأكثر شيوعاً", primary: "Common VNFs" },
              { name: "OpenStack في NFV: البنية التحتية الافتراضية", primary: "OpenStack for NFV" },
              { name: "أداء NFV: التحديات والحلول", primary: "NFV performance" }
            ]},
            { unit_index: 6, code: "3.1.6", name: "جودة الخدمة QoS وتشكيل الحركة", goal: "تصميم وتطبيق QoS لضمان أداء التطبيقات الحرجة في الشبكات المزدحمة", key_concepts: ["DiffServ/DSCP Marking","Traffic Classification","Policing vs Shaping","FIFO/WFQ/CBWFQ/LLQ","Congestion Avoidance"], lessons: [
              { name: "QoS: لماذا لا يكفي عرض النطاق الترددي وحده", primary: "QoS motivation" },
              { name: "DiffServ وDSCP: تصنيف الحركة بترويسات IP", primary: "DiffServ model" },
              { name: "تصنيف الحركة Classification وسياسات المطابقة", primary: "Traffic classification" },
              { name: "Policing: تحديد الحد الأقصى وقطع الزائد", primary: "Traffic policing" },
              { name: "Shaping: تجانس البيانات بتأخير مُحسوب", primary: "Traffic shaping" },
              { name: "خوارزميات قائمة الانتظار: FIFO وWFQ وCBWFQ", primary: "Queuing algorithms" },
              { name: "LLQ: قائمة انتظار منخفضة الكمون للصوت", primary: "Low Latency Queuing" },
              { name: "تجنب الازدحام: WRED وRED", primary: "Congestion avoidance" },
              { name: "QoS من طرف إلى طرف End-to-End: التناسق", primary: "End-to-end QoS" }
            ]},
            { unit_index: 7, code: "3.1.7", name: "أنماط تصميم الشبكات", goal: "تطبيق أنماط تصميم الشبكات المثبتة لبناء بنى تحتية موثوقة وقابلة للتوسع", key_concepts: ["3-Tier Core/Dist/Access","Spine-Leaf Data Center","Campus Network Design","Redundancy Patterns","Network Segmentation Design"], lessons: [
              { name: "معمارية الثلاث طبقات: الكلاسيكي الذي لا يموت", primary: "3-tier architecture" },
              { name: "Spine-Leaf: معمارية مراكز البيانات الحديثة", primary: "Spine-leaf topology" },
              { name: "تصميم شبكة الحرم الجامعي Campus: توسع بمرونة", primary: "Campus design" },
              { name: "أنماط التكرار Redundancy: الروابط والأجهزة", primary: "Redundancy patterns" },
              { name: "تصميم تجزئة الشبكة في المؤسسة", primary: "Network segmentation design" },
              { name: "DMZ المتقدمة: الفصل الدقيق لمناطق الثقة", primary: "Advanced DMZ design" },
              { name: "معمارية شبكة مركز البيانات: EVPN وVXLAN", primary: "Data center networking" },
              { name: "تصميم الشبكة للأعباء السحابية الهجينة", primary: "Hybrid cloud network design" },
              { name: "مراجعة التصميم Network Design Review: منهجية", primary: "Design review methodology" }
            ]},
            { unit_index: 8, code: "3.1.8", name: "شبكات مستوى الناقل", goal: "فهم بنية وتقنيات شبكات مزودي الخدمة على مستوى الناقل", key_concepts: ["Carrier Ethernet","DWDM/OTN","Metro Ethernet","Peering vs Transit","IX Points","Telco-Grade Redundancy"], lessons: [
              { name: "شبكات مزودي الخدمة: ما وراء شبكة الشركة", primary: "Carrier networks" },
              { name: "Carrier Ethernet: إيثرنت على مستوى الناقل", primary: "Carrier Ethernet" },
              { name: "DWDM: تعدد الإرسال الضوئي للسعة الهائلة", primary: "DWDM technology" },
              { name: "OTN: الشبكة البصرية النقلية", primary: "OTN" },
              { name: "Metro Ethernet: الشبكة الحضرية عالية الأداء", primary: "Metro Ethernet" },
              { name: "Peering وTransit: كيف يتبادل مزودو الإنترنت الحركة", primary: "Peering vs transit" },
              { name: "نقاط التبادل الإنترنتي IX Points", primary: "Internet exchange points" },
              { name: "التكرار على مستوى الناقل: الاستمرارية المطلقة", primary: "Telco-grade redundancy" },
              { name: "اتفاقيات مستوى الخدمة SLA لمزودي الشبكة", primary: "Carrier SLAs" }
            ]},
            { unit_index: 9, code: "3.1.9", name: "أتمتة الشبكات بـAnsible/Netmiko", goal: "بناء خط أنابيب أتمتة شبكية كامل من الجرد إلى النشر إلى التحقق", key_concepts: ["Ansible Network Modules","Inventory for Network Devices","Jinja2 Templates","Netmiko Multi-Vendor","Testing Automation"], lessons: [
              { name: "أتمتة الشبكة المتقدمة: البنية الكاملة", primary: "Advanced network automation" },
              { name: "وحدات Ansible الشبكية: ios_command وnxos_config", primary: "Network modules" },
              { name: "جرد الأجهزة الشبكية في Ansible", primary: "Network inventory" },
              { name: "قوالب Jinja2 لملفات إعداد الشبكة", primary: "Jinja2 templates" },
              { name: "Netmiko مع أجهزة متعددة المصنّعين", primary: "Multi-vendor Netmiko" },
              { name: "اختبار أتمتة الشبكة: pytest وGNS3", primary: "Network automation testing" },
              { name: "التحقق من الإعداد: ما نشرناه ما زال صحيحاً", primary: "Configuration drift detection" },
              { name: "خط CI/CD للشبكة: الكود يُعدّل الشبكة", primary: "Network CI/CD" },
              { name: "وثيقة Golden Config: الإعداد الأساسي المرجعي", primary: "Golden config" }
            ]}
          ]
        },
        {
          stage_index: 2,
          name: "الأمن السيبراني والاختراق الأخلاقي",
          goal: "إجراء اختبارات اختراق منهجية وتحليل المخاطر الأمنية وكتابة التقارير الاحترافية",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 80, time_limit_minutes: 30 },
          units: [
            { unit_index: 1, code: "3.2.1", name: "الاستطلاع وOSINT", goal: "جمع معلومات شاملة عن الهدف باستخدام تقنيات OSINT السلبية والنشطة", key_concepts: ["Passive vs Active Recon","WHOIS/Shodan/Censys","Google Dorks","LinkedIn/GitHub OSINT","Maltego","Recon-ng"], lessons: [
              { name: "الاستطلاع: الأساس الذي يُحدد نجاح الاختراق", primary: "Reconnaissance importance" },
              { name: "الاستطلاع السلبي: جمع بلا تفاعل مع الهدف", primary: "Passive reconnaissance" },
              { name: "WHOIS وshodan وCensys: أدوات الاستطلاع السلبي", primary: "Passive recon tools" },
              { name: "Google Dorks: محرك بحث كأداة اختراق", primary: "Google Dorks" },
              { name: "OSINT على LinkedIn وGitHub", primary: "Social media OSINT" },
              { name: "Maltego: ربط المعلومات بصرياً", primary: "Maltego" },
              { name: "Recon-ng: إطار الاستطلاع الأوتوماتيكي", primary: "Recon-ng" },
              { name: "الاستطلاع النشط: ما يُرسله للهدف", primary: "Active reconnaissance" },
              { name: "توثيق الاستطلاع وتنظيم المعلومات", primary: "Recon documentation" }
            ]},
            { unit_index: 2, code: "3.2.2", name: "فحص الثغرات", goal: "إجراء فحوصات ثغرات شاملة وتفسير النتائج بدقة للتمييز بين الإيجابيات الحقيقية والكاذبة", key_concepts: ["Nmap NSE Scripts/OS Detection","Nessus/OpenVAS Policy","Vulnerability Prioritization","False Positive Triage"], lessons: [
              { name: "Nmap: أشهر أداة مسح في تاريخ الشبكات", primary: "Nmap scanning" },
              { name: "Nmap NSE Scripts: الفحص الذكي", primary: "NSE scripts" },
              { name: "كشف نظام التشغيل وإصدار الخدمات", primary: "OS and service detection" },
              { name: "Nessus: الماسح التجاري الأكثر استخداماً", primary: "Nessus scanner" },
              { name: "OpenVAS: البديل مفتوح المصدر القوي", primary: "OpenVAS" },
              { name: "سياسات الفحص: الشامل مقابل المستهدف", primary: "Scan policies" },
              { name: "تفسير نتائج الفحص: قراءة التقرير الكامل", primary: "Results interpretation" },
              { name: "الإيجابيات الكاذبة: التمييز والتحقق اليدوي", primary: "False positive triage" },
              { name: "أتمتة الفحص في خط CI/CD", primary: "Automated vulnerability scanning" }
            ]},
            { unit_index: 3, code: "3.2.3", name: "أساسيات الاستغلال", goal: "فهم آليات الاستغلال باستخدام Metasploit في إطار بيئات مخبرية مُرخّصة", key_concepts: ["Metasploit Modules/Payloads/Handlers","Meterpreter","Common Exploits EternalBlue/Log4Shell"], lessons: [
              { name: "Metasploit: إطار الاستغلال المرجعي", primary: "Metasploit framework" },
              { name: "المكونات: Exploit وPayload وModule وHandler", primary: "Metasploit components" },
              { name: "خيارات Payloads: Bind وReverse وMeterpreter", primary: "Payload types" },
              { name: "Meterpreter: Shell التحكم المتقدم بعد الاستغلال", primary: "Meterpreter" },
              { name: "EternalBlue: استغلال SMBv1 الشهير", primary: "EternalBlue context" },
              { name: "Log4Shell: الثغرة التي هزّت العالم", primary: "Log4Shell context" },
              { name: "استغلال تطبيقات الويب: from Vuln to Shell", primary: "Web exploitation" },
              { name: "تطوير Exploit بسيط: فهم الآلية", primary: "Basic exploit development" },
              { name: "الحماية من الاستغلال: دروس من الهجمات الشائعة", primary: "Exploit mitigation" }
            ]},
            { unit_index: 4, code: "3.2.4", name: "اختبار اختراق تطبيقات الويب", goal: "تنفيذ اختبار اختراق شامل لتطبيقات الويب وفق دليل OWASP Testing Guide", key_concepts: ["Burp Suite Proxy/Scanner/Repeater/Intruder","OWASP Testing Guide","SQLi/XSS/CSRF/IDOR/SSRF hands-on","JWT attacks"], lessons: [
              { name: "منهجية اختبار اختراق الويب: OWASP Testing Guide", primary: "Web pentest methodology" },
              { name: "Burp Suite: السلاح الرئيسي لاختبار الويب", primary: "Burp Suite" },
              { name: "Proxy وInterceptor: التقاط وتعديل الطلبات", primary: "HTTP interception" },
              { name: "Repeater وIntruder: تكرار واستغلال الطلبات", primary: "Burp repeater and intruder" },
              { name: "SQL Injection: الكشف والاستغلال والوقاية", primary: "SQLi testing" },
              { name: "XSS: Reflected وStored وDOM-based", primary: "XSS testing" },
              { name: "IDOR وBroken Access Control: الوصول غير المصرح", primary: "IDOR testing" },
              { name: "SSRF: الطلبات من الخادم إلى الداخل", primary: "SSRF testing" },
              { name: "هجمات JWT: التلاعب بالرموز المميزة", primary: "JWT attacks" }
            ]},
            { unit_index: 5, code: "3.2.5", name: "اختبار اختراق الشبكات", goal: "تنفيذ اختبار اختراق الشبكة من الاستطلاع إلى الحصول على موطئ قدم", key_concepts: ["Scanning Phase","Enumeration SMB/SNMP/LDAP","Exploitation Credential Attacks","Pivoting/Port Forwarding","Network Sniffing"], lessons: [
              { name: "منهجية اختبار اختراق الشبكة", primary: "Network pentest methodology" },
              { name: "مرحلة الفحص: خريطة الشبكة بالكامل", primary: "Network scanning" },
              { name: "حصر SMB: البيانات المخفية في مشاركة Windows", primary: "SMB enumeration" },
              { name: "حصر SNMP: معلومات الأجهزة بالـStrings المنسية", primary: "SNMP enumeration" },
              { name: "حصر LDAP: كنز المعلومات في Active Directory", primary: "LDAP enumeration" },
              { name: "هجمات بيانات الاعتماد: Spray وBrute Force", primary: "Credential attacks" },
              { name: "Pivoting: التحرك من شبكة إلى أخرى", primary: "Pivoting techniques" },
              { name: "Port Forwarding: إعادة توجيه الحركة", primary: "Port forwarding" },
              { name: "التجسس على الشبكة Network Sniffing: الأدوات والدفاع", primary: "Network sniffing" }
            ]},
            { unit_index: 6, code: "3.2.6", name: "هجمات كلمات المرور والبيانات الاعتمادية", goal: "تحليل أساليب هجمات كلمات المرور وأنواع التجزئات وتطبيق الدفاعات المناسبة", key_concepts: ["Hash Types NTLM/NetNTLMv2/Kerberos","Hashcat/JohnTheRipper","Pass-the-Hash/Pass-the-Ticket","Credential Stuffing"], lessons: [
              { name: "كيف تُخزّن كلمات المرور: التجزئة والملح", primary: "Password storage" },
              { name: "أنواع التجزئات: NTLM وNetNTLMv2 وKerberos", primary: "Windows hash types" },
              { name: "Hashcat: كسر كلمات المرور بالمعالج الرسومي", primary: "Hashcat cracking" },
              { name: "John the Ripper: كسر كلمات المرور الكلاسيكي", primary: "JohnTheRipper" },
              { name: "Pass-the-Hash: لا تحتاج كلمة المرور النصية", primary: "Pass-the-Hash" },
              { name: "Pass-the-Ticket: تذاكر Kerberos مسروقة", primary: "Pass-the-Ticket" },
              { name: "Credential Stuffing: قوائم من خروقات سابقة", primary: "Credential stuffing" },
              { name: "الدفاع: تكلفة عالية لمهاجم كلمات المرور", primary: "Password attack defense" },
              { name: "مديرو كلمات المرور في المؤسسات: BeyondTrust وHashicorp", primary: "Enterprise password management" }
            ]},
            { unit_index: 7, code: "3.2.7", name: "ما بعد الاستغلال والحركة الجانبية", goal: "تحليل تقنيات ما بعد الاستغلال وتصعيد الامتيازات والحركة الجانبية لفهم أعمق للتهديدات", key_concepts: ["Privilege Escalation Linux/Windows","Persistence Mechanisms","Lateral Movement WMI/PsExec/WinRM","LOLBAS/LOTL","Evasion"], lessons: [
              { name: "ما بعد الاستغلال: ما يفعله المهاجم بعد الدخول", primary: "Post-exploitation phases" },
              { name: "تصعيد الامتيازات في Linux: من user إلى root", primary: "Linux privesc" },
              { name: "تصعيد الامتيازات في Windows: التقنيات الشائعة", primary: "Windows privesc" },
              { name: "آليات الاستمرارية Persistence: البقاء بعد إعادة التشغيل", primary: "Persistence mechanisms" },
              { name: "الحركة الجانبية بـWMI: إدارة Windows عن بُعد", primary: "WMI lateral movement" },
              { name: "PsExec وWinRM: تنفيذ أوامر عن بُعد", primary: "Remote execution" },
              { name: "LOLBAS وLiving off the Land: الأدوات الشرعية سلاحاً", primary: "LOLBAS techniques" },
              { name: "التهرب Evasion: تجاوز الحلول الأمنية", primary: "AV evasion basics" },
              { name: "محاكاة المهاجم الداخلي: تقييم الانكشاف الداخلي", primary: "Internal threat simulation" }
            ]},
            { unit_index: 8, code: "3.2.8", name: "مركز عمليات الأمن SOC", goal: "بناء وإدارة قدرات SOC فعّالة من تطوير حالات الاستخدام إلى الصيد الاستباقي عن التهديدات", key_concepts: ["SOC Tiers L1/L2/L3","SIEM Splunk/ELK","Use Case Development","Alert Triage","Threat Hunting","SOAR"], lessons: [
              { name: "SOC: مركز عمليات الأمن وهيكله التنظيمي", primary: "SOC structure" },
              { name: "مستويات SOC: L1 وL2 وL3 والمهام والصلاحيات", primary: "SOC tiers" },
              { name: "SIEM: إدارة معلومات وأحداث الأمن", primary: "SIEM fundamentals" },
              { name: "Splunk للـSOC: البحث وإنشاء التنبيهات", primary: "Splunk for SOC" },
              { name: "ELK Stack للـSOC: الحل مفتوح المصدر", primary: "ELK Stack" },
              { name: "تطوير حالات الاستخدام Use Cases: ما نبحث عنه", primary: "Use case development" },
              { name: "فرز التنبيهات Alert Triage: إيجابي حقيقي أم كاذب؟", primary: "Alert triage" },
              { name: "الصيد الاستباقي Threat Hunting: البحث الاستباقي عن التهديدات", primary: "Threat hunting" },
              { name: "SOAR: أتمتة الاستجابة للحوادث", primary: "SOAR platforms" }
            ]},
            { unit_index: 9, code: "3.2.9", name: "كتابة تقارير الاختراق", goal: "إنتاج تقارير اختراق احترافية ذات قيمة عملية للمديرين التنفيذيين والفرق التقنية", key_concepts: ["Executive Summary vs Technical Detail","CVSS in Context","Risk Rating","Remediation Guidance","Retesting","Responsible Disclosure"], lessons: [
              { name: "هيكل تقرير الاختراق الاحترافي", primary: "Pentest report structure" },
              { name: "الملخص التنفيذي: للمديرين بلا لغة تقنية", primary: "Executive summary" },
              { name: "التفاصيل التقنية: للفريق الذي سيُصلح", primary: "Technical findings" },
              { name: "CVSS في السياق: لماذا الدرجة لا تكفي وحدها", primary: "Risk contextualization" },
              { name: "تقييم المخاطر: Critical وHigh وMedium وLow وInfo", primary: "Risk rating" },
              { name: "توصيات المعالجة: القابلة للتنفيذ الفعلي", primary: "Remediation guidance" },
              { name: "إعادة الاختبار Retesting: التحقق من الإصلاح", primary: "Retesting methodology" },
              { name: "الإفصاح المسؤول: الإبلاغ عن الثغرات بمسؤولية", primary: "Responsible disclosure" },
              { name: "قوالب التقارير وأدوات التوثيق", primary: "Report templates" }
            ]}
          ]
        },
        {
          stage_index: 3,
          name: "معمارية السحابة",
          goal: "تصميم وتقييم معمارية سحابية متقدمة للتوافر العالي والاسترداد من الكوارث والتكامل",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 80, time_limit_minutes: 30 },
          units: [
            { unit_index: 1, code: "3.3.1", name: "معمارية حلول AWS", goal: "تطبيق إطار Well-Architected لتصميم حلول AWS المثلى بتوازن بين الخمسة أعمدة", key_concepts: ["Well-Architected Framework 5 Pillars","Solutions Architect Patterns","Multi-AZ vs Multi-Region","Service Limits","Design Trade-offs"], lessons: [
              { name: "AWS Well-Architected Framework: الأعمدة الخمسة", primary: "Well-Architected Framework" },
              { name: "عمود التميز التشغيلي: الأتمتة والمراقبة", primary: "Operational Excellence" },
              { name: "عمود الأمن: الهوية والكشف والحماية", primary: "Security pillar" },
              { name: "عمود الموثوقية: التعافي والتكرار", primary: "Reliability pillar" },
              { name: "عمود الأداء: اختيار الموارد المثلى", primary: "Performance pillar" },
              { name: "عمود تحسين التكلفة: الإنفاق الواعي", primary: "Cost optimization pillar" },
              { name: "Multi-AZ مقابل Multi-Region: متى كل منهما", primary: "Multi-AZ vs Multi-Region" },
              { name: "حدود الخدمة Service Limits وكيف تؤثر على التصميم", primary: "Service limits" },
              { name: "مقايضات التصميم Trade-offs: كيف تتخذ القرار الصحيح", primary: "Design trade-offs" }
            ]},
            { unit_index: 2, code: "3.3.2", name: "التوافر العالي والتعافي من الكوارث", goal: "تصميم وتنفيذ واختبار استراتيجيات HA وDR تلبي متطلبات RTO وRPO الصارمة", key_concepts: ["RTO/RPO in Practice","Pilot Light/Warm Standby/Hot Standby/Active-Active","DNS Failover Route53","Database Failover"], lessons: [
              { name: "التوافر العالي مقابل التعافي من الكوارث: الفرق الجوهري", primary: "HA vs DR" },
              { name: "RTO وRPO في الإنتاج الفعلي: الأرقام الحقيقية", primary: "RTO and RPO" },
              { name: "Pilot Light: البنية المُحضَّرة للتشغيل السريع", primary: "Pilot Light strategy" },
              { name: "Warm Standby: النسخة الأصغر دائماً تعمل", primary: "Warm Standby" },
              { name: "Hot Standby: المرآة الكاملة دائماً جاهزة", primary: "Hot Standby" },
              { name: "Active-Active: كلا الموقعين يخدمان", primary: "Active-Active DR" },
              { name: "DNS Failover بـRoute 53: التحويل التلقائي", primary: "DNS-based failover" },
              { name: "Failover قاعدة البيانات: RDS Multi-AZ وRead Replica", primary: "Database failover" },
              { name: "اختبار DR: GameDay والتأكد من صحة الخطة", primary: "DR testing" }
            ]},
            { unit_index: 3, code: "3.3.3", name: "الحوسبة بدون خوادم", goal: "تصميم وتحسين تطبيقات Serverless عالية الأداء وفعّالة التكلفة", key_concepts: ["Lambda Triggers/Runtimes/Layers/Concurrency","API Gateway","Step Functions","EventBridge","Cold Start Optimization"], lessons: [
              { name: "Serverless: الحوسبة التي تُدار بدون تفكير في الخوادم", primary: "Serverless concept" },
              { name: "AWS Lambda: الدالة كخدمة", primary: "Lambda fundamentals" },
              { name: "محفزات Lambda Triggers: من يستدعي الدالة", primary: "Lambda triggers" },
              { name: "Lambda Runtimes وLayers: تخصيص البيئة", primary: "Lambda runtimes" },
              { name: "التزامن Concurrency في Lambda: التحديد والحجز", primary: "Lambda concurrency" },
              { name: "API Gateway: المدخل لـLambda من HTTP", primary: "API Gateway" },
              { name: "Step Functions: سيمفونية الدوال المتسلسلة", primary: "Step Functions" },
              { name: "EventBridge: ناقل الأحداث في السحابة", primary: "EventBridge" },
              { name: "تحسين Cold Start: التقنيات العملية", primary: "Cold start optimization" }
            ]},
            { unit_index: 4, code: "3.3.4", name: "معمارية الخدمات المصغرة", goal: "تصميم وتقييم أنماط الخدمات المصغرة وإدارة التحديات المصاحبة", key_concepts: ["Microservice Decomposition","Service Mesh Istio/Linkerd","API Gateway Pattern","Circuit Breaker","Saga Pattern"], lessons: [
              { name: "الخدمات المصغرة: من الوحدة إلى الموزع", primary: "Microservices decomposition" },
              { name: "تحديد حدود الخدمة: Bounded Context", primary: "Service boundaries" },
              { name: "Service Mesh: الشبكة الذكية بين الخدمات", primary: "Service mesh" },
              { name: "Istio: تطبيق Service Mesh الأكثر شيوعاً", primary: "Istio" },
              { name: "نمط API Gateway: البوابة الموحدة", primary: "API Gateway pattern" },
              { name: "Circuit Breaker: قاطع الدائرة عند الفشل", primary: "Circuit breaker" },
              { name: "نمط Saga: المعاملات الموزعة بدون 2PC", primary: "Saga pattern" },
              { name: "تشخيص الخدمات المصغرة: التتبع الموزع", primary: "Distributed tracing" },
              { name: "متى لا تختار الخدمات المصغرة: الحجم والنضج", primary: "When not microservices" }
            ]},
            { unit_index: 5, code: "3.3.5", name: "المعمارية المدفوعة بالأحداث", goal: "تصميم أنظمة مدفوعة بالأحداث تحقق اللامركزية والمرونة عبر ناقلات الرسائل", key_concepts: ["Event Sourcing","CQRS","Message Brokers SQS/Kafka/RabbitMQ","Fan-out Pattern","Exactly-once Delivery"], lessons: [
              { name: "المعمارية المدفوعة بالأحداث: الأنظمة التفاعلية", primary: "Event-driven architecture" },
              { name: "Event Sourcing: تاريخ كامل لا حالة فقط", primary: "Event sourcing" },
              { name: "CQRS: فصل القراءة عن الكتابة", primary: "CQRS pattern" },
              { name: "ناقلات الرسائل: SQS وKafka وRabbitMQ", primary: "Message brokers" },
              { name: "SQS وSNS في AWS: قوائم انتظار وإشعارات", primary: "SQS and SNS" },
              { name: "Kafka: الـEvent Stream الأكثر قدرة", primary: "Apache Kafka" },
              { name: "نمط Fan-out: حدث واحد يُطلق عمليات متعددة", primary: "Fan-out pattern" },
              { name: "At-least-once وExactly-once: ضمانات التسليم", primary: "Delivery guarantees" },
              { name: "اختبار الأنظمة المدفوعة بالأحداث", primary: "Event-driven testing" }
            ]},
            { unit_index: 6, code: "3.3.6", name: "معمارية خطوط أنابيب البيانات", goal: "تصميم خطوط أنابيب بيانات قادرة على معالجة الدُفعات والبيانات الفورية", key_concepts: ["Batch vs Stream Processing","Kinesis/Kafka Streams","ETL/ELT","Data Warehouse Redshift/BigQuery","Lambda Architecture"], lessons: [
              { name: "خطوط أنابيب البيانات: من المصدر إلى الرؤية", primary: "Data pipelines" },
              { name: "معالجة الدُفعات Batch Processing: الكلاسيكي الموثوق", primary: "Batch processing" },
              { name: "معالجة التدفق Stream Processing: الحدث في لحظته", primary: "Stream processing" },
              { name: "AWS Kinesis: تدفق البيانات في السحابة", primary: "Kinesis" },
              { name: "Kafka Streams: معالجة التدفق فوق Kafka", primary: "Kafka Streams" },
              { name: "ETL مقابل ELT: أين يحدث التحويل؟", primary: "ETL vs ELT" },
              { name: "Redshift وBigQuery: مستودعات البيانات السحابية", primary: "Cloud data warehouses" },
              { name: "Lambda Architecture: المعالجة المزدوجة", primary: "Lambda architecture" },
              { name: "تحديات خطوط الأنابيب: الاتساق والمراقبة والإصلاح", primary: "Pipeline challenges" }
            ]},
            { unit_index: 7, code: "3.3.7", name: "معمارية أمن السحابة", goal: "تصميم بنية أمنية سحابية شاملة تغطي الوضع الأمني والبيانات والهوية", key_concepts: ["CSPM","CWPP","Secrets Management Vault/AWS Secrets Manager","Service Control Policies"], lessons: [
              { name: "أمن السحابة: المسؤولية المشتركة في التطبيق", primary: "Cloud security model" },
              { name: "CSPM: إدارة الوضع الأمني للسحابة", primary: "Cloud Security Posture Management" },
              { name: "CWPP: حماية أعباء العمل السحابية", primary: "CWPP" },
              { name: "إدارة الأسرار Secrets Management: Vault وAWS Secrets Manager", primary: "Secrets management" },
              { name: "Service Control Policies SCPs: حوكمة على مستوى المنظمة", primary: "Service control policies" },
              { name: "تشفير البيانات في السحابة: KMS وHSM", primary: "Cloud key management" },
              { name: "Zero Trust في السحابة: التطبيق العملي", primary: "Cloud Zero Trust" },
              { name: "الامتثال في السحابة: SOC2 وPCI-DSS وGDPR", primary: "Cloud compliance" },
              { name: "مراقبة الأمن السحابي: GuardDuty وSecurity Hub", primary: "Cloud security monitoring" }
            ]},
            { unit_index: 8, code: "3.3.8", name: "أنماط التصميم السحابية الأصيلة", goal: "تطبيق أنماط التصميم السحابية لحل مشكلات التوافر والأداء والمرونة", key_concepts: ["Sidecar/Ambassador/Adapter","Bulkhead","Throttling","Retry with Backoff","Health Endpoint","Strangler Fig"], lessons: [
              { name: "أنماط التصميم السحابية: لغة مشتركة للمعماريين", primary: "Cloud design patterns" },
              { name: "نمط Sidecar: المساعد المصاحب للخدمة", primary: "Sidecar pattern" },
              { name: "نمط Ambassador: الوسيط الذكي", primary: "Ambassador pattern" },
              { name: "Bulkhead: حواجز عزل الفشل", primary: "Bulkhead pattern" },
              { name: "Throttling: تقييد المعدل لحماية الخدمات", primary: "Throttling pattern" },
              { name: "Retry مع Exponential Backoff: الإعادة الذكية", primary: "Retry with backoff" },
              { name: "Health Endpoint: نبضة الخدمة الحية", primary: "Health endpoint" },
              { name: "Strangler Fig: الهجرة التدريجية من Legacy", primary: "Strangler Fig pattern" },
              { name: "اختيار النمط المناسب: معايير القرار", primary: "Pattern selection" }
            ]},
            { unit_index: 9, code: "3.3.9", name: "FinOps واقتصاديات السحابة", goal: "تطبيق مبادئ FinOps لتحسين الإنفاق السحابي وتحقيق قيمة العمل الحقيقية", key_concepts: ["Unit Economics","Chargeback/Showback","Reserved Capacity Strategy","Spot Optimization","Cost Anomaly Detection","ROI Analysis"], lessons: [
              { name: "اقتصاديات الوحدة Unit Economics: التكلفة لكل قيمة", primary: "Unit economics" },
              { name: "ثقافة FinOps: المسؤولية الموزعة للتكلفة", primary: "FinOps culture" },
              { name: "Chargeback وShowback: تخصيص التكاليف للفرق", primary: "Cost allocation" },
              { name: "استراتيجية الطاقة الاحتياطية Reserved: متى والحجم", primary: "Reserved capacity strategy" },
              { name: "تحسين Spot/Preemptible: أحمال العمل المرنة", primary: "Spot optimization" },
              { name: "كشف شذوذات التكلفة Cost Anomaly Detection", primary: "Cost anomaly detection" },
              { name: "تحليل ROI للانتقال السحابي", primary: "Cloud ROI analysis" },
              { name: "لوحات FinOps: الشفافية لكل الفرق", primary: "FinOps dashboards" },
              { name: "برنامج FinOps ناضج: المراحل والنضج", primary: "FinOps maturity model" }
            ]}
          ]
        },
        {
          stage_index: 4,
          name: "DevOps وCI/CD",
          goal: "بناء ثقافة DevOps وخطوط أنابيب CI/CD كاملة وإدارة البنية التحتية ككود",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 80, time_limit_minutes: 30 },
          units: [
            { unit_index: 1, code: "3.4.1", name: "ثقافة DevOps ومبادئها", goal: "قيادة تحول DevOps تنظيمي وقياس تأثيره على سرعة التسليم وموثوقية النظام", key_concepts: ["CALMS Framework","Three Ways Flow/Feedback/Learning","DevOps vs SRE vs Platform Engineering","Org Patterns"], lessons: [
              { name: "DevOps: ثقافة قبل أن تكون أدوات", primary: "DevOps culture" },
              { name: "إطار CALMS: الأعمدة الخمسة للتحول", primary: "CALMS framework" },
              { name: "الطريق الأول: تسريع تدفق التسليم", primary: "Flow optimization" },
              { name: "الطريق الثاني: حلقات التغذية الراجعة السريعة", primary: "Feedback loops" },
              { name: "الطريق الثالث: ثقافة التجريب والتعلم", primary: "Continuous learning" },
              { name: "DevOps مقابل SRE: الفروق في المسؤوليات", primary: "DevOps vs SRE" },
              { name: "Platform Engineering: الفريق الذي يخدم الفرق", primary: "Platform engineering" },
              { name: "قياس نجاح DevOps: DORA Metrics", primary: "DORA metrics" },
              { name: "عقبات التحول الثقافي: كيف تتجاوزها", primary: "DevOps transformation obstacles" }
            ]},
            { unit_index: 2, code: "3.4.2", name: "Git المتقدم", goal: "إتقان استراتيجيات Git المتقدمة وأنماط التعاون في فرق تقنية المعلومات الكبيرة", key_concepts: ["Branching Strategies GitFlow/Trunk-Based","Hooks pre-commit/post-receive","Submodules","Bisect","Reflog","Cherry-pick"], lessons: [
              { name: "استراتيجيات التفرع: GitFlow وTrunk-Based وGitHub Flow", primary: "Branching strategies" },
              { name: "GitFlow: التفرع المُنظَّم لإصدارات منتظمة", primary: "GitFlow workflow" },
              { name: "Trunk-Based Development: التكامل المستمر فعلاً", primary: "Trunk-based development" },
              { name: "Git Hooks: أتمتة في نقاط حرجة", primary: "Git hooks" },
              { name: "pre-commit: جودة الكود قبل الحفظ", primary: "pre-commit hooks" },
              { name: "Git Submodules: المكتبات المشتركة بين المستودعات", primary: "Git submodules" },
              { name: "git bisect: البحث الثنائي عن الـcommit المعيوب", primary: "Git bisect" },
              { name: "git reflog: الشبكة الأمانية لـGit", primary: "Git reflog" },
              { name: "cherry-pick وrebase المتقدم: نقل التغييرات", primary: "Cherry-pick and rebase" }
            ]},
            { unit_index: 3, code: "3.4.3", name: "تصميم خطوط أنابيب CI/CD", goal: "تصميم خطوط أنابيب CI/CD آمنة وسريعة ومتكاملة مع اختبارات وفحص أمان", key_concepts: ["Pipeline Design Principles","Stages Build/Test/Security/Deploy","Parallelism","Artifact Management","Pipeline as Code"], lessons: [
              { name: "مبادئ تصميم خط الأنابيب الجيد", primary: "Pipeline design principles" },
              { name: "مرحلة البناء Build: من الكود إلى القطعة الأثرية", primary: "Build stage" },
              { name: "مرحلة الاختبار Test: الاختبارات التلقائية المتدرجة", primary: "Test stages" },
              { name: "فحص الأمان في CI/CD: SAST وSCA وDAST", primary: "Security in pipelines" },
              { name: "مرحلة النشر Deploy: الاستراتيجيات وأمان التراجع", primary: "Deploy stage" },
              { name: "التوازي في الأنابيب: تسريع خط الأنابيب", primary: "Pipeline parallelism" },
              { name: "إدارة القطع الأثرية Artifacts: التخزين والإصدار", primary: "Artifact management" },
              { name: "Pipeline as Code: الأنابيب في مستودع الكود", primary: "Pipeline as code" },
              { name: "مقاييس خط الأنابيب: الوقت والنجاح والإخفاق", primary: "Pipeline metrics" }
            ]},
            { unit_index: 4, code: "3.4.4", name: "Jenkins وGitLab CI", goal: "بناء وإدارة خطوط أنابيب CI/CD كاملة باستخدام Jenkins وGitLab CI في بيئات الإنتاج", key_concepts: ["Jenkinsfile Declarative/Scripted","Shared Libraries","GitLab CI .gitlab-ci.yml","Stages/Jobs/Artifacts/Caching","Runners"], lessons: [
              { name: "Jenkins: العمود الفقري لـCI/CD في كثير من المؤسسات", primary: "Jenkins overview" },
              { name: "Jenkinsfile إعلاني Declarative: الكود النظيف", primary: "Declarative pipeline" },
              { name: "Jenkinsfile برمجي Scripted: المرونة الكاملة", primary: "Scripted pipeline" },
              { name: "المكتبات المشتركة Shared Libraries: لا تكرار في Jenkinsfiles", primary: "Jenkins shared libraries" },
              { name: "GitLab CI: الأكثر تكاملاً مع Git", primary: "GitLab CI overview" },
              { name: ".gitlab-ci.yml: هيكل المراحل والوظائف", primary: "GitLab CI syntax" },
              { name: "Artifacts وCache في GitLab CI", primary: "GitLab artifacts and cache" },
              { name: "GitLab Runners: الأنواع والتشغيل المنظومي", primary: "GitLab runners" },
              { name: "مقارنة Jenkins وGitLab CI: متى تختار كل منهما", primary: "Jenkins vs GitLab CI" }
            ]},
            { unit_index: 5, code: "3.4.5", name: "البنية التحتية ككود Terraform", goal: "بناء وإدارة بنية تحتية سحابية قابلة للتكرار والمراجعة باستخدام Terraform", key_concepts: ["HCL Syntax","Provider/Resource/Data/Variable/Output","State Management Remote Backend","Modules","Workspace"], lessons: [
              { name: "Infrastructure as Code: الثورة في إدارة الموارد", primary: "IaC concept" },
              { name: "Terraform: IaC الأكثر انتشاراً وحيادية السحابة", primary: "Terraform overview" },
              { name: "HCL: لغة Terraform القابلة للقراءة", primary: "HCL syntax" },
              { name: "Provider وResource وData Source", primary: "Terraform blocks" },
              { name: "Variables وOutputs: إدخالات ومخرجات Terraform", primary: "Variables and outputs" },
              { name: "State: ذاكرة Terraform عن العالم الحقيقي", primary: "Terraform state" },
              { name: "Remote Backend: الحالة المشتركة والمؤمنة", primary: "Remote state backend" },
              { name: "Modules: قطع البناء القابلة للإعادة", primary: "Terraform modules" },
              { name: "Workspaces: بيئات متعددة من كود واحد", primary: "Terraform workspaces" }
            ]},
            { unit_index: 6, code: "3.4.6", name: "إدارة الإعداد بـAnsible", goal: "إدارة إعداد الخوادم والتطبيقات بطريقة متكاملة ومتكررة باستخدام Ansible", key_concepts: ["Inventory","Playbooks/Tasks/Roles","Variables/Templates Jinja2","Handlers","Vault Secrets","Galaxy","Idempotency"], lessons: [
              { name: "Ansible: أتمتة بلا أعوان", primary: "Ansible agentless" },
              { name: "المخزون Inventory: تعريف الأجهزة المُدارة", primary: "Ansible inventory" },
              { name: "Playbooks وTasks: الوصفة التنفيذية", primary: "Playbooks" },
              { name: "Roles: تنظيم Playbooks القابل للإعادة", primary: "Ansible roles" },
              { name: "المتغيرات وقوالب Jinja2 في Ansible", primary: "Variables and templates" },
              { name: "Handlers: التفعيل عند التغيير فقط", primary: "Handlers" },
              { name: "Ansible Vault: تشفير الأسرار في الكود", primary: "Ansible Vault" },
              { name: "Ansible Galaxy: مجتمع Roles الجاهزة", primary: "Ansible Galaxy" },
              { name: "ضمان التطابق Idempotency: تشغيل آمن للتكرار", primary: "Idempotency" }
            ]},
            { unit_index: 7, code: "3.4.7", name: "Kubernetes للإنتاج", goal: "تشغيل وإدارة أعباء العمل في Kubernetes الإنتاجي مع الأمان والموارد والمرونة", key_concepts: ["Deployment Strategies RollingUpdate/Blue-Green/Canary","HPA/VPA","Resource Requests/Limits","NetworkPolicy","RBAC","Namespaces"], lessons: [
              { name: "Kubernetes للإنتاج: ما يختلف عن بيئة التطوير", primary: "Production K8s" },
              { name: "استراتيجية Rolling Update: التحديث بلا توقف", primary: "Rolling updates" },
              { name: "Blue-Green Deployment: التبديل الفوري الآمن", primary: "Blue-green deployment" },
              { name: "Canary Release: النشر التدريجي للمخاطرة الأقل", primary: "Canary deployment" },
              { name: "HPA: توسع تلقائي بناءً على الحمل", primary: "Horizontal Pod Autoscaler" },
              { name: "طلبات الموارد والحدود: ضمان الأداء والاستقرار", primary: "Resource requests and limits" },
              { name: "NetworkPolicy: الجدار الناري بين الـPods", primary: "NetworkPolicy" },
              { name: "RBAC في Kubernetes: الصلاحيات الدقيقة", primary: "K8s RBAC" },
              { name: "Namespaces في الإنتاج: عزل المشاريع والفرق", primary: "Production namespaces" }
            ]},
            { unit_index: 8, code: "3.4.8", name: "Helm وإدارة حزم Kubernetes", goal: "تعبئة ونشر وإدارة تطبيقات Kubernetes باستخدام Helm", key_concepts: ["Chart Structure templates/values","Templating","Releases/Revisions","Repositories","Helmfile","Chart Testing"], lessons: [
              { name: "Helm: مدير حزم Kubernetes", primary: "Helm overview" },
              { name: "هيكل Chart: templates وvalues وChart.yaml", primary: "Chart structure" },
              { name: "القوالب Templating: المرونة في التهيئة", primary: "Helm templating" },
              { name: "ملف values.yaml: التخصيص دون تعديل القوالب", primary: "values.yaml" },
              { name: "Releases وRevisions: تاريخ النشر والتراجع", primary: "Helm releases" },
              { name: "مستودعات Helm: الرسمية والخاصة", primary: "Helm repositories" },
              { name: "Helmfile: إدارة مجموعة Charts معاً", primary: "Helmfile" },
              { name: "اختبار Chart: helm test وChart testing", primary: "Chart testing" },
              { name: "أفضل ممارسات Charts: قابلية الإعادة والأمان", primary: "Chart best practices" }
            ]},
            { unit_index: 9, code: "3.4.9", name: "الرصد والمراقبة الشاملة", goal: "بناء نظام مراقبة ورصد شامل باستخدام ثلاثية Prometheus وGrafana وJaeger", key_concepts: ["Prometheus Metrics/Labels/PromQL","Grafana Dashboards","Alertmanager","Loki Logs","Jaeger Traces","Golden Signals"], lessons: [
              { name: "ثلاثية المراقبة: Metrics وLogs وTraces", primary: "Observability pillars" },
              { name: "Prometheus: جمع المقاييس بالسحب", primary: "Prometheus" },
              { name: "PromQL: لغة استعلام المقاييس", primary: "PromQL" },
              { name: "Exporters: كيف تُشَارك التطبيقات مقاييسها", primary: "Prometheus exporters" },
              { name: "Grafana: تصور المقاييس باحترافية", primary: "Grafana dashboards" },
              { name: "Alertmanager: التنبيه والتجميع والتوجيه", primary: "Alertmanager" },
              { name: "Loki: السجلات المنظمة بأسلوب Prometheus", primary: "Loki logging" },
              { name: "Jaeger: تتبع الطلبات عبر الخدمات الموزعة", primary: "Distributed tracing with Jaeger" },
              { name: "الإشارات الذهبية الأربع: قياس الصحة الحقيقية", primary: "Golden signals" }
            ]}
          ]
        },
        {
          stage_index: 5,
          name: "هندسة موثوقية المواقع SRE",
          goal: "تطبيق مبادئ SRE لبناء أنظمة موثوقة وقابلة للتوسع مع إدارة احترافية للحوادث",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 80, time_limit_minutes: 30 },
          units: [
            { unit_index: 1, code: "3.5.1", name: "مبادئ SRE وميزانيات الأخطاء", goal: "تطبيق فلسفة SRE وحساب ميزانيات الأخطاء لتحقيق توازن بين الموثوقية وسرعة التسليم", key_concepts: ["SRE vs Ops","Toil Definition","Error Budget Policy","Reliability vs Feature Velocity","SRE Team Topologies"], lessons: [
              { name: "SRE: هندسة الموثوقية بعين مهندس البرمجيات", primary: "SRE philosophy" },
              { name: "SRE مقابل Ops التقليدي: الفروق الجوهرية", primary: "SRE vs Ops" },
              { name: "الجهد Toil: ما يُقتل إنتاجية فريق SRE", primary: "Toil definition" },
              { name: "ميزانية الأخطاء Error Budget: رصيد المخاطرة المسموح بها", primary: "Error budget" },
              { name: "سياسة ميزانية الأخطاء: ماذا يحدث عند الاستنفاد", primary: "Error budget policy" },
              { name: "الموثوقية مقابل سرعة الميزات: المفاضلة الحقيقية", primary: "Reliability vs velocity" },
              { name: "هياكل فرق SRE: مدمج وإنبثاقي ومركزي", primary: "SRE team topologies" },
              { name: "مبادئ Google SRE: من الكتاب إلى التطبيق", primary: "Google SRE principles" },
              { name: "بدء رحلة SRE في المؤسسة: الخطوات العملية", primary: "Starting SRE journey" }
            ]},
            { unit_index: 2, code: "3.5.2", name: "مؤشرات مستوى الخدمة", goal: "تعريف وقياس وإنفاذ SLIs وSLOs بطريقة تعكس تجربة المستخدم الحقيقية", key_concepts: ["SLI Definitions","SLO Setting","SLA Legal Implications","Burn Rate Alerts"], lessons: [
              { name: "SLI: القياس الذي يعكس تجربة المستخدم", primary: "Service Level Indicators" },
              { name: "أنواع SLIs: التوفر والكمون والإنتاجية والأخطاء", primary: "SLI types" },
              { name: "SLO: الهدف القابل للقياس والإنفاذ", primary: "Service Level Objectives" },
              { name: "كيف تضع SLO دقيقاً وواقعياً", primary: "Setting SLOs" },
              { name: "SLA: التزام قانوني وعواقب الإخلال", primary: "SLA implications" },
              { name: "معدل الاحتراق Burn Rate Alerts: التنبيه المبكر", primary: "Burn rate alerting" },
              { name: "نافذة الخطأ Error Budget Window: الحساب الصحيح", primary: "Error window calculation" },
              { name: "مراجعة SLO: التحديث المستمر للأهداف", primary: "SLO review process" },
              { name: "SLO لمزودي الطرف الثالث: الاعتماد على خارجي", primary: "Third-party SLOs" }
            ]},
            { unit_index: 3, code: "3.5.3", name: "مفاهيم الأنظمة الموزعة", goal: "تحليل وتصميم الأنظمة الموزعة مع فهم حدود نظرية CAP والمقايضات الحتمية", key_concepts: ["CAP Theorem","Fallacies of Distributed Computing","Consistency Models","Consensus Raft/Paxos","Clock Skew","Partition Tolerance"], lessons: [
              { name: "الأنظمة الموزعة: التحدي الأعمق في الهندسة", primary: "Distributed systems challenges" },
              { name: "نظرية CAP: الثلاثي المستحيل", primary: "CAP theorem" },
              { name: "مغالطات الحوسبة الموزعة: الافتراضات الخاطئة", primary: "Fallacies of distributed computing" },
              { name: "نماذج الاتساق: من القوي إلى الأخير", primary: "Consistency models" },
              { name: "Eventual Consistency: الواقع العملي للنظم الكبرى", primary: "Eventual consistency" },
              { name: "Raft: التوافق الموزع بأسلوب مفهوم", primary: "Raft consensus" },
              { name: "Paxos: الخوارزمية الأصل للتوافق", primary: "Paxos algorithm" },
              { name: "انحراف الساعة Clock Skew: الوقت في الأنظمة الموزعة", primary: "Clock skew" },
              { name: "تحمل التقسيم Partition Tolerance: كيف يتصرف النظام", primary: "Partition handling" }
            ]},
            { unit_index: 4, code: "3.5.4", name: "هندسة الفوضى", goal: "تطبيق مبادئ Chaos Engineering لاكتشاف نقاط الضعف وتحسين المرونة", key_concepts: ["Chaos Engineering Principles","GameDays","Fault Injection Chaos Monkey/Gremlin","Blast Radius","Hypothesis-Driven"], lessons: [
              { name: "هندسة الفوضى: الفشل المُتحكَّم به قبل الفشل غير المتوقع", primary: "Chaos engineering" },
              { name: "مبادئ Chaos Engineering: ما يميزها عن الاختبار العشوائي", primary: "Chaos principles" },
              { name: "الفرضية Hypothesis: الأساس العلمي لكل تجربة", primary: "Hypothesis-driven chaos" },
              { name: "Blast Radius: تحديد نطاق التأثير قبل البدء", primary: "Blast radius" },
              { name: "GameDays: يوم الكارثة المُحضَّرة", primary: "GameDay exercises" },
              { name: "Chaos Monkey: العشوائية المُصمَّمة من Netflix", primary: "Chaos Monkey" },
              { name: "Gremlin: منصة هندسة الفوضى الاحترافية", primary: "Gremlin platform" },
              { name: "حقن الأخطاء: الشبكة والتأخير وفشل التبعية", primary: "Fault injection types" },
              { name: "بناء برنامج Chaos Engineering: من التجريب إلى الممارسة", primary: "Chaos program" }
            ]},
            { unit_index: 5, code: "3.5.5", name: "إدارة الحوادث والمناوبة", goal: "إدارة الحوادث الحرجة باحترافية وبناء نظام مناوبة فعّال ومستدام", key_concepts: ["Incident Severity Classification","On-Call Rotations","ICS Incident Command","War Room Management"], lessons: [
              { name: "تصنيف خطورة الحوادث: من P0 إلى P4", primary: "Incident severity" },
              { name: "إعلان الحادثة: الاعتراف والتعبئة السريعة", primary: "Incident declaration" },
              { name: "هيكل قيادة الحادثة ICS: الأدوار والمسؤوليات", primary: "Incident command" },
              { name: "غرفة الحرب War Room: التنسيق تحت الضغط", primary: "War room management" },
              { name: "قاعدة 5 دقائق: التصعيد قبل التأخر", primary: "Escalation rules" },
              { name: "أنظمة المناوبة On-Call: PagerDuty وOpsGenie", primary: "On-call systems" },
              { name: "التناوب الصحي: منع الإرهاق في فريق SRE", primary: "Healthy on-call" },
              { name: "التواصل خلال الحادثة: الداخلي والخارجي", primary: "Incident communication" },
              { name: "معالجة الحوادث الحرجة P0: الإجراءات الخاصة", primary: "P0 incident handling" }
            ]},
            { unit_index: 6, code: "3.5.6", name: "هندسة الأداء", goal: "قياس وتشخيص وتحسين أداء الأنظمة باستخدام أدوات التحليل المتقدمة", key_concepts: ["Profiling CPU/Memory/I/O","Benchmarking wrk/ab/k6","Latency Percentiles p50/p95/p99","Flame Graphs","Bottleneck Analysis"], lessons: [
              { name: "هندسة الأداء: ما وراء الـRequests per Second", primary: "Performance engineering" },
              { name: "قياس الأداء: الأدوات والمقاييس المعنية", primary: "Performance measurement" },
              { name: "الاختبار التحملي Benchmarking: wrk وab وk6", primary: "Benchmarking tools" },
              { name: "مئينيات الكمون: p50 وp95 وp99", primary: "Latency percentiles" },
              { name: "التوصيف Profiling: CPU والذاكرة والـI/O", primary: "Profiling techniques" },
              { name: "Flame Graphs: تصور وقت المعالج بذكاء", primary: "Flame graphs" },
              { name: "تحليل الاختناق Bottleneck: الكشف والتأكيد", primary: "Bottleneck analysis" },
              { name: "تحليل الذاكرة: Heap Dumps وMemory Profilers", primary: "Memory profiling" },
              { name: "تحسين الأداء التكراري: القياس والتحسين والتحقق", primary: "Iterative optimization" }
            ]},
            { unit_index: 7, code: "3.5.7", name: "تخطيط الطاقة الاستيعابية", goal: "التنبؤ بالطلب وتخطيط طاقة النظام الاستيعابية لضمان الأداء في ذروة الحمل", key_concepts: ["Traffic Forecasting","Load Testing for Capacity","Headroom Planning","Auto-scaling Policies","Capacity Review"], lessons: [
              { name: "تخطيط الطاقة: ليس الإفراط ولا القصور", primary: "Capacity planning" },
              { name: "التنبؤ بحركة المرور: النماذج والبيانات التاريخية", primary: "Traffic forecasting" },
              { name: "اختبار الأحمال Load Testing لتخطيط الطاقة", primary: "Load testing for capacity" },
              { name: "هامش الأمان Headroom: كم نحتفظ للطوارئ", primary: "Capacity headroom" },
              { name: "سياسات Auto-scaling: متى وكيف يتوسع النظام", primary: "Auto-scaling policies" },
              { name: "مراجعة الطاقة الدورية Capacity Review", primary: "Capacity review process" },
              { name: "نمذجة الطاقة: Little's Law والتطبيق", primary: "Capacity modeling" },
              { name: "فشل تخطيط الطاقة: دراسات حالة من الإنتاج", primary: "Capacity planning failures" },
              { name: "تخطيط الطاقة في السحابة: التوسع الديناميكي", primary: "Cloud capacity planning" }
            ]},
            { unit_index: 8, code: "3.5.8", name: "تقليل العمل الروتيني والأتمتة", goal: "تحديد وقياس وأتمتة الأعمال الروتينية لرفع كفاءة فريق SRE", key_concepts: ["Toil Identification","Automation ROI","Runbook Automation","Self-Healing Systems","Event-Driven Remediation"], lessons: [
              { name: "قياس الجهد Toil: كيف تكتشف الإسراف في الوقت", primary: "Toil measurement" },
              { name: "تحديد أولويات الأتمتة: ROI على وقت SRE", primary: "Automation ROI" },
              { name: "أتمتة الـRunbooks: من خطوات يدوية إلى برمجة", primary: "Runbook automation" },
              { name: "الأنظمة ذاتية الشفاء Self-Healing: الاستجابة التلقائية", primary: "Self-healing systems" },
              { name: "العلاج المدفوع بالأحداث: من التنبيه إلى الحل", primary: "Event-driven remediation" },
              { name: "أتمتة الموارد: الإيقاف والتوسع والتقليص", primary: "Resource automation" },
              { name: "منع تراكم التوتر التقني Technical Debt في الأتمتة", primary: "Automation debt" },
              { name: "أتمتة اختبار الأتمتة: الثقة الكاملة", primary: "Testing automation" },
              { name: "نشر ثقافة الأتمتة في الفريق", primary: "Automation culture" }
            ]},
            { unit_index: 9, code: "3.5.9", name: "ثقافة ما بعد الحوادث", goal: "قيادة مراجعات ما بعد الحوادث بلا لوم لاستخراج الدروس وبناء الأنظمة الأكثر موثوقية", key_concepts: ["Blameless Post-Mortem","Five Whys Analysis","Action Items Tracking","Learning Reviews","Near-Miss Reporting"], lessons: [
              { name: "Post-Mortem بلا لوم: الثقافة الأساس", primary: "Blameless culture" },
              { name: "هيكل Post-Mortem الاحترافي: القالب والمحتوى", primary: "Post-mortem structure" },
              { name: "خمسة لماذا Five Whys: الوصول للسبب الجذري", primary: "5 Whys analysis" },
              { name: "الإجراءات القابلة للتطبيق Action Items: SMART وتتبع منظم", primary: "Action item tracking" },
              { name: "مراجعة التعلم Learning Review: ما استخلصناه فعلاً", primary: "Learning reviews" },
              { name: "الإبلاغ عن الأحداث المقاربة Near-Miss Reporting", primary: "Near-miss reporting" },
              { name: "قاعدة بيانات الحوادث: التاريخ الذي يمنع التكرار", primary: "Incident database" },
              { name: "مشاركة Post-Mortems مع المجتمع: الشفافية", primary: "Public post-mortems" },
              { name: "قياس تحسن الموثوقية عبر الزمن", primary: "Reliability improvement measurement" }
            ]}
          ]
        },
        {
          stage_index: 6,
          name: "حوكمة وإدارة تقنية المعلومات",
          goal: "تطبيق أُطر الحوكمة وإدارة المخاطر والامتثال في المؤسسات وفق المعايير الدولية",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 80, time_limit_minutes: 30 },
          units: [
            { unit_index: 1, code: "3.6.1", name: "أطر حوكمة تقنية المعلومات", goal: "تقييم وتطبيق أُطر حوكمة COBIT وITIL في المؤسسات بناءً على نضجها التشغيلي", key_concepts: ["COBIT 2019","ITIL 4 Service Value System","ISO 20000","Governance Maturity Models"], lessons: [
              { name: "حوكمة تقنية المعلومات: الإشراف الاستراتيجي", primary: "IT governance" },
              { name: "COBIT 2019: الفصل بين الحوكمة والإدارة", primary: "COBIT 2019" },
              { name: "مجالات COBIT: التقييم والإرشاد والرقابة", primary: "COBIT domains" },
              { name: "ITIL 4: نظام القيمة للخدمة", primary: "ITIL 4 SVS" },
              { name: "ISO 20000: معيار إدارة خدمات تقنية المعلومات", primary: "ISO 20000" },
              { name: "نماذج نضج الحوكمة: تقييم مستوى المؤسسة", primary: "Governance maturity" },
              { name: "لجان حوكمة تقنية المعلومات: الهيكل والصلاحيات", primary: "IT governance committee" },
              { name: "KPIs حوكمة تقنية المعلومات: القياس والرفع", primary: "Governance KPIs" },
              { name: "دمج COBIT وITIL في المؤسسة: التكامل لا التعارض", primary: "COBIT and ITIL integration" }
            ]},
            { unit_index: 2, code: "3.6.2", name: "إدارة المخاطر", goal: "تقييم وإدارة مخاطر تقنية المعلومات منهجياً وفق ISO 27005 وأُطر NIST", key_concepts: ["ISO 27005","Risk Assessment Methodology","Risk Register","Qualitative vs Quantitative Risk","Risk Treatment Accept/Mitigate/Transfer/Avoid"], lessons: [
              { name: "إدارة المخاطر: منظومة القرار تحت الغموض", primary: "Risk management" },
              { name: "ISO 27005: إطار إدارة مخاطر أمن المعلومات", primary: "ISO 27005" },
              { name: "منهجية تقييم المخاطر: التحديد والتحليل والتقييم", primary: "Risk assessment" },
              { name: "سجل المخاطر Risk Register: توثيق شامل", primary: "Risk register" },
              { name: "التقييم النوعي Qualitative مقابل الكمي Quantitative", primary: "Risk assessment types" },
              { name: "معالجة المخاطر: قبول وتخفيف ونقل وتجنب", primary: "Risk treatment" },
              { name: "مراقبة المخاطر والتقارير الدورية للإدارة", primary: "Risk monitoring" },
              { name: "تحليل التأثير على الأعمال BIA: الأصول الحرجة", primary: "Business Impact Analysis" },
              { name: "توليف إدارة المخاطر مع قرارات الأعمال", primary: "Risk-informed decisions" }
            ]},
            { unit_index: 3, code: "3.6.3", name: "استمرارية الأعمال والتعافي من الكوارث", goal: "تصميم واختبار وصون خطط استمرارية الأعمال والتعافي وفق المعايير الدولية", key_concepts: ["BIA Business Impact Analysis","BCP/DRP Development","Testing Types Tabletop/Simulation/Full-Scale","RTO/RPO Achievement"], lessons: [
              { name: "استمرارية الأعمال: ما وراء التقنية", primary: "Business continuity" },
              { name: "تحليل التأثير على الأعمال BIA: الأولويات الحقيقية", primary: "BIA methodology" },
              { name: "خطة استمرارية الأعمال BCP: الهيكل والمحتوى", primary: "BCP development" },
              { name: "خطة التعافي من الكوارث DRP: التفاصيل التقنية", primary: "DRP development" },
              { name: "تحقيق RTO وRPO: الهندسة والعمليات", primary: "RTO/RPO achievement" },
              { name: "اختبار المكتب الجدولي Tabletop: التمرين بلا تكلفة", primary: "Tabletop testing" },
              { name: "محاكاة الكارثة Simulation: الواقع المحكوم", primary: "Simulation testing" },
              { name: "الاختبار الكامل Full-Scale: التحقق الكامل", primary: "Full-scale testing" },
              { name: "صيانة الخطط: الدورة السنوية للمراجعة", primary: "Plan maintenance" }
            ]},
            { unit_index: 4, code: "3.6.4", name: "الامتثال التنظيمي", goal: "تطبيق متطلبات GDPR وPCI-DSS وSOC2 وHIPAA في بيئات تقنية المعلومات", key_concepts: ["GDPR Data Controller/Processor","PCI-DSS 12 Requirements","SOC2 Trust Service Criteria","HIPAA basics"], lessons: [
              { name: "منظومة الامتثال: القانوني والتنظيمي والتعاقدي", primary: "Compliance landscape" },
              { name: "GDPR: حماية البيانات الشخصية في الاتحاد الأوروبي", primary: "GDPR fundamentals" },
              { name: "مراقب البيانات ومعالجها: المسؤولية القانونية", primary: "Data controller vs processor" },
              { name: "حقوق أصحاب البيانات: الوصول والنسيان", primary: "Data subject rights" },
              { name: "PCI-DSS: أمن بيانات بطاقات الدفع", primary: "PCI-DSS requirements" },
              { name: "المتطلبات الاثنا عشر لـPCI-DSS: الخريطة الكاملة", primary: "PCI-DSS 12 requirements" },
              { name: "SOC2: معيار الثقة لمزودي الخدمة", primary: "SOC2 overview" },
              { name: "HIPAA: أمن البيانات الصحية الإلكترونية", primary: "HIPAA basics" },
              { name: "برنامج الامتثال المتكامل: التقاطعات والكفاءة", primary: "Integrated compliance" }
            ]},
            { unit_index: 5, code: "3.6.5", name: "Active Directory وLDAP للمؤسسات", goal: "تصميم وإدارة بنية Active Directory مؤسسية معقدة مع أمان متقدم", key_concepts: ["AD Forest/Domain/Trust Architecture","Sites and Services","AD Replication","LDAP Schema","Kerberos Authentication","AD Security"], lessons: [
              { name: "Active Directory المؤسسي: الغابة والمجالات والثقة", primary: "AD enterprise architecture" },
              { name: "ثقة المجالات Trust: الأنواع والأمان والاستخدام", primary: "Domain trusts" },
              { name: "المواقع والخدمات Sites and Services: التحسين الجغرافي", primary: "AD Sites and Services" },
              { name: "التكرار AD Replication: التزامن وحل التعارضات", primary: "AD replication" },
              { name: "مخطط LDAP: بنية بيانات Directory", primary: "LDAP schema" },
              { name: "Kerberos في العمق: التذاكر ومراحل المصادقة", primary: "Kerberos deep dive" },
              { name: "أمن Active Directory: المواطن الضعيفة الشائعة", primary: "AD security" },
              { name: "هجمات AD: Golden Ticket وPass-the-Hash وDCSync", primary: "AD attack techniques" },
              { name: "تصليب Active Directory: المعايير وأدوات التدقيق", primary: "AD hardening" }
            ]},
            { unit_index: 6, code: "3.6.6", name: "إدارة الهوية والوصول المتميز", goal: "تصميم وتطبيق حل PAM شامل لحماية الحسابات المتميزة في المؤسسات", key_concepts: ["IAM vs PAM","CyberArk/BeyondTrust concepts","Just-in-Time Privileged Access","Session Recording","Password Vaulting","MFA for Admins"], lessons: [
              { name: "IAM مقابل PAM: ما يشتركان وما يختلفان", primary: "IAM vs PAM" },
              { name: "الحسابات المتميزة: المخاطر وجاذبية الاستهداف", primary: "Privileged accounts" },
              { name: "CyberArk: المنصة الرائدة لـPAM المؤسسي", primary: "CyberArk overview" },
              { name: "BeyondTrust: بديل PAM الشامل", primary: "BeyondTrust" },
              { name: "Just-in-Time Access: الامتياز لوقت محدود فقط", primary: "JIT access" },
              { name: "تسجيل الجلسات Session Recording: التدقيق الكامل", primary: "Session recording" },
              { name: "Password Vaulting: كلمات المرور في خزنة آمنة", primary: "Password vaulting" },
              { name: "MFA للحسابات الإدارية: طبقة لا تُتجاوز", primary: "Admin MFA" },
              { name: "Privileged Access Workstations PAW: بيئة الإدارة الآمنة", primary: "PAW" }
            ]},
            { unit_index: 7, code: "3.6.7", name: "معمارية الثقة الصفرية", goal: "تصميم وتطبيق معمارية Zero Trust تدريجياً في المؤسسة", key_concepts: ["Zero Trust Principles","NIST SP 800-207","Micro-Segmentation","Device Posture","Continuous Validation"], lessons: [
              { name: "Zero Trust: لماذا انتهى عهد محيط الشبكة", primary: "Zero Trust philosophy" },
              { name: "مبادئ Zero Trust: لا ثقة ولا استثناء ودائم التحقق", primary: "Zero Trust principles" },
              { name: "NIST SP 800-207: المرجع المعياري لـZero Trust", primary: "NIST ZTA" },
              { name: "التجزئة الدقيقة Micro-Segmentation: الفصل الداخلي", primary: "Micro-segmentation" },
              { name: "وضع الجهاز Device Posture: الثقة المشروطة بصحة الجهاز", primary: "Device posture" },
              { name: "التحقق المستمر Continuous Validation: ليس مرة واحدة", primary: "Continuous validation" },
              { name: "هوية المستخدم في Zero Trust: مركز القرار", primary: "Identity-centric ZT" },
              { name: "تطبيق Zero Trust تدريجياً: خارطة طريق عملية", primary: "ZT implementation roadmap" },
              { name: "أدوات Zero Trust: ZTNA وSASE والبدائل", primary: "ZT tools" }
            ]},
            { unit_index: 8, code: "3.6.8", name: "المشتريات وإدارة البائعين", goal: "إدارة دورة حياة العقود والبائعين لضمان القيمة وتقليل مخاطر الطرف الثالث", key_concepts: ["RFP/RFQ/RFI Process","Vendor Evaluation Framework","SLA Negotiation","Contract Management","Vendor Risk Assessment","Exit Strategy"], lessons: [
              { name: "دورة مشتريات تقنية المعلومات: من الحاجة إلى العقد", primary: "IT procurement cycle" },
              { name: "RFI وRFQ وRFP: الأدوات الصحيحة لكل مرحلة", primary: "RFx documents" },
              { name: "إطار تقييم البائعين: المعايير والأوزان", primary: "Vendor evaluation" },
              { name: "التفاوض على SLA: الأرقام القابلة للإنفاذ", primary: "SLA negotiation" },
              { name: "إدارة العقود: الالتزام والمتابعة والتجديد", primary: "Contract management" },
              { name: "تقييم مخاطر البائعين: سلسلة التوريد الرقمية", primary: "Vendor risk" },
              { name: "استراتيجية الخروج Exit Strategy: التخطيط للنهاية قبل البداية", primary: "Exit strategy" },
              { name: "إدارة البائع الحيوي: الاعتماد المفرط ومخاطره", primary: "Critical vendor management" },
              { name: "لوحة أداء البائعين: المراجعة الدورية والعلاقة المتطورة", primary: "Vendor performance" }
            ]},
            { unit_index: 9, code: "3.6.9", name: "استراتيجية تقنية المعلومات والقيادة", goal: "صياغة وتنفيذ استراتيجية تقنية المعلومات المنبثقة من أهداف الأعمال وقيادة التحول الرقمي", key_concepts: ["IT Strategy Development","Digital Transformation","IT Roadmap","Technology Governance Board","Business-IT Alignment"], lessons: [
              { name: "التوافق بين تقنية المعلومات والأعمال: من يقود من؟", primary: "IT-business alignment" },
              { name: "تطوير استراتيجية تقنية المعلومات: الإطار والمراحل", primary: "IT strategy development" },
              { name: "التحول الرقمي: ما يعنيه حقاً بعيداً عن البزبزة", primary: "Digital transformation" },
              { name: "خارطة طريق تقنية المعلومات IT Roadmap", primary: "IT roadmap" },
              { name: "مجلس حوكمة التقنية Technology Governance Board", primary: "Technology governance board" },
              { name: "قيادة فرق تقنية المعلومات: القائد التقني والمدير", primary: "IT leadership" },
              { name: "ميزانية تقنية المعلومات: CapEx وOpEx والتبرير", primary: "IT budgeting" },
              { name: "قياس قيمة تقنية المعلومات للأعمال", primary: "IT value measurement" },
              { name: "مستقبل تقنية المعلومات: الاتجاهات التي تعيد التشكيل", primary: "Future of IT" }
            ]}
          ]
        },
        {
          stage_index: 7,
          name: "التخصص والمشاريع المتكاملة",
          goal: "تطبيق الكفاءات التراكمية في مشاريع تكاملية واقعية تُعدّ لسوق العمل",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 80, time_limit_minutes: 30 },
          units: [
            { unit_index: 1, code: "3.7.1", name: "تصميم مركز البيانات المتكامل", goal: "تصميم مركز بيانات حديث يدمج التخزين والشبكة والأمان والطاقة والتبريد", key_concepts: ["Data Center Tiers Uptime Institute","Power Distribution","Cooling Architecture","Physical Security","Cable Management"], lessons: [
              { name: "معمارية مراكز البيانات: من التفكير إلى التشغيل", primary: "Data center architecture" },
              { name: "مستويات Uptime Institute: Tier I إلى Tier IV", primary: "Data center tiers" },
              { name: "توزيع الطاقة: من الشبكة إلى الرف", primary: "Power distribution" },
              { name: "معمارية التبريد: الدقيق والاقتصادي", primary: "Cooling architecture" },
              { name: "الأمان المادي: المناطق والتحكم في الدخول", primary: "Physical security" },
              { name: "إدارة الكابلات: الهيكلية والتنظيم", primary: "Cable management" },
              { name: "شبكة مركز البيانات: Spine-Leaf والـTop-of-Rack", primary: "DC networking" },
              { name: "مراقبة مركز البيانات: DCIM والمؤشرات الحرجة", primary: "DCIM" },
              { name: "مستقبل مراكز البيانات: Edge Computing وHCI", primary: "Future data centers" }
            ]},
            { unit_index: 2, code: "3.7.2", name: "مشروع البنية التحتية الكاملة", goal: "بناء بنية تحتية إنتاجية كاملة من الصفر باستخدام IaC وCI/CD والمراقبة", key_concepts: ["Full Stack Infrastructure","Terraform + Ansible","CI/CD Pipeline","Monitoring Stack","Security Layers","Documentation"], lessons: [
              { name: "المشروع التكاملي: من المتطلبات إلى الإنتاج", primary: "Integration project" },
              { name: "تصميم البنية التحتية: الرسم قبل البناء", primary: "Infrastructure design" },
              { name: "IaC بـTerraform: البنية التحتية ككود", primary: "IaC implementation" },
              { name: "إدارة الإعداد بـAnsible: من خادم إلى مجموعة", primary: "Configuration management" },
              { name: "خط CI/CD الكامل: من Commit إلى Production", primary: "Full CI/CD" },
              { name: "مكدس المراقبة: Prometheus وGrafana وLoki", primary: "Monitoring stack" },
              { name: "طبقات الأمان: جدار الحماية وIDS والتحديثات", primary: "Security layers" },
              { name: "التوثيق الكامل: الرسوم والـRunbooks والـWikis", primary: "Full documentation" },
              { name: "مراجعة البنية التحتية: التقييم والتحسين", primary: "Infrastructure review" }
            ]},
            { unit_index: 3, code: "3.7.3", name: "خط أنابيب الأمن الكامل", goal: "دمج الأمن في كل مرحلة من مراحل دورة التطوير والتشغيل DevSecOps", key_concepts: ["DevSecOps Pipeline","SAST/DAST/SCA","Container Security Scanning","Secret Detection","Compliance as Code","Threat Modeling in SDLC"], lessons: [
              { name: "DevSecOps: الأمن في كل خطوة", primary: "DevSecOps" },
              { name: "SAST: اختبار الكود الثابت في الـCI", primary: "SAST integration" },
              { name: "SCA: تحليل التبعيات للمكتبات مفتوحة المصدر", primary: "Software composition analysis" },
              { name: "DAST: الاختبار الديناميكي في بيئة التشغيل", primary: "DAST integration" },
              { name: "فحص أمان الحاويات في خط الأنابيب", primary: "Container security" },
              { name: "كشف الأسرار Secret Detection: المفاتيح في الكود", primary: "Secret detection" },
              { name: "الامتثال ككود Compliance as Code: OPA وConftest", primary: "Compliance as code" },
              { name: "نمذجة التهديدات في دورة التطوير SDLC", primary: "SDLC threat modeling" },
              { name: "مقاييس أمن DevSecOps: قياس النضج", primary: "DevSecOps metrics" }
            ]},
            { unit_index: 4, code: "3.7.4", name: "مشروع هجرة السحابة", goal: "تخطيط وتنفيذ هجرة بنية تحتية من مركز البيانات التقليدي إلى السحابة", key_concepts: ["Cloud Migration Strategies 6Rs","Assessment Phase","Migration Waves","Cutover Planning","Post-Migration Optimization"], lessons: [
              { name: "استراتيجيات الهجرة: الـ6Rs لـGartner", primary: "Migration strategies" },
              { name: "Rehost: الرفع والإزاحة بأقل تعديل", primary: "Lift and shift" },
              { name: "Replatform: التحسين أثناء الهجرة", primary: "Replatforming" },
              { name: "Refactor: إعادة البناء للاستفادة الكاملة من السحابة", primary: "Cloud-native refactor" },
              { name: "مرحلة التقييم Assessment: اكتشاف وتصنيف الأصول", primary: "Migration assessment" },
              { name: "موجات الهجرة Migration Waves: التسلسل والأولويات", primary: "Migration waves" },
              { name: "تخطيط الإطلاق Cutover Planning: الانتقال بلا ألم", primary: "Cutover planning" },
              { name: "التحقق بعد الهجرة: الأداء والأمان والتكلفة", primary: "Post-migration validation" },
              { name: "تحسين ما بعد الهجرة: السحابة لم تنتهِ بالنقل", primary: "Post-migration optimization" }
            ]},
            { unit_index: 5, code: "3.7.5", name: "اختبار الاختراق الكامل", goal: "إجراء اختبار اختراق كامل لبيئة مؤسسية والإبلاغ عن النتائج احترافياً", key_concepts: ["Full Pentest Methodology","Scoping and Rules of Engagement","Automated and Manual Testing","Evidence Collection","Final Report Delivery"], lessons: [
              { name: "منهجية الاختراق الكامل: الإطار والمراحل", primary: "Full pentest methodology" },
              { name: "تحديد النطاق وقواعد التعامل RoE", primary: "Scoping and RoE" },
              { name: "الاستطلاع الشامل: السلبي والنشط", primary: "Comprehensive recon" },
              { name: "الفحص المنهجي: الآلي والتحقق اليدوي", primary: "Systematic scanning" },
              { name: "الاستغلال: الوصول والتوثيق والتوسع", primary: "Exploitation phase" },
              { name: "ما بعد الاستغلال: التأثير الكامل للوصول", primary: "Post-exploitation" },
              { name: "جمع الأدلة Evidence Collection: قانوني ودقيق", primary: "Evidence collection" },
              { name: "صياغة التقرير الكامل: الاحترافية في التوثيق", primary: "Full report" },
              { name: "تسليم النتائج للعميل: العرض والمتابعة", primary: "Finding delivery" }
            ]},
            { unit_index: 6, code: "3.7.6", name: "منصة مراقبة مؤسسية متكاملة", goal: "بناء منصة مراقبة شاملة تجمع المقاييس والسجلات والتتبع والتنبيه في نظام واحد", key_concepts: ["Unified Observability Platform","Metrics/Logs/Traces Integration","On-Call Workflow Integration","SLO Monitoring","Custom Dashboards"], lessons: [
              { name: "مفهوم المراقبة الشاملة Unified Observability", primary: "Unified observability" },
              { name: "دمج المقاييس والسجلات والتتبع في منصة واحدة", primary: "Metrics logs traces" },
              { name: "بناء مجموعة تنبيهات منسجمة ومدروسة", primary: "Alert engineering" },
              { name: "تكامل منظومة المناوبة مع نظام التنبيه", primary: "On-call integration" },
              { name: "مراقبة SLO: قياس الأداء مقابل الهدف", primary: "SLO monitoring" },
              { name: "لوحات مراقبة مخصصة للإدارة والفنيين", primary: "Custom dashboards" },
              { name: "مراقبة تكاليف الإنتاج: الموارد والإنفاق", primary: "Cost monitoring" },
              { name: "تطور المراقبة: من Events إلى AIOps", primary: "AIOps evolution" },
              { name: "توثيق منصة المراقبة: Runbooks وPlaybooks", primary: "Observability documentation" }
            ]},
            { unit_index: 7, code: "3.7.7", name: "برنامج حوكمة تقنية المعلومات الكامل", goal: "بناء برنامج حوكمة تقنية معلومات ناضج يشمل المخاطر والامتثال والسياسات والمقاييس", key_concepts: ["IT Governance Program","Policy Framework","Risk Management Integration","Compliance Calendar","Governance Metrics","Board Reporting"], lessons: [
              { name: "برنامج الحوكمة: من الإطار إلى الممارسة اليومية", primary: "Governance program" },
              { name: "إطار السياسات Policy Framework: الهرم التوثيقي", primary: "Policy hierarchy" },
              { name: "تكامل إدارة المخاطر مع حوكمة تقنية المعلومات", primary: "Risk integration" },
              { name: "التقويم السنوي للامتثال: المراجعات والاختبارات", primary: "Compliance calendar" },
              { name: "مقاييس الحوكمة: ما تُرفع للمجلس", primary: "Governance metrics" },
              { name: "تقرير مجلس الإدارة: ما يُريد المدير التنفيذي رؤيته", primary: "Board reporting" },
              { name: "الثقافة الحوكمية: من الإلزام إلى الاختيار", primary: "Governance culture" },
              { name: "التدقيق الداخلي لتقنية المعلومات: المنهجية والمتابعة", primary: "IT internal audit" },
              { name: "نضج الحوكمة: خارطة طريق من مستوى 1 إلى 5", primary: "Governance maturity roadmap" }
            ]},
            { unit_index: 8, code: "3.7.8", name: "استعداد سوق العمل والشهادات", goal: "التهيؤ الشامل لسوق العمل في تقنية المعلومات وتحديد مسار الشهادات المهنية المناسب", key_concepts: ["IT Certifications Roadmap","Resume for IT","Technical Interview Preparation","Portfolio Projects","Professional Networking","Salary Negotiation"], lessons: [
              { name: "خارطة شهادات تقنية المعلومات: المسارات المختلفة", primary: "IT certifications landscape" },
              { name: "شهادات CompTIA: A+ وNetwork+ وSecurity+ وCySA+", primary: "CompTIA certifications" },
              { name: "شهادات Cisco: CCNA وCCNP والمتخصصة", primary: "Cisco certifications" },
              { name: "شهادات السحابة: AWS وAzure وGCP", primary: "Cloud certifications" },
              { name: "بناء السيرة الذاتية لمهندس تقنية المعلومات", primary: "IT resume" },
              { name: "مقابلات تقنية المعلومات: التقني والسلوكي", primary: "Technical interviews" },
              { name: "محفظة المشاريع Portfolio: إثبات الكفاءة بالممارسة", primary: "Project portfolio" },
              { name: "بناء الشبكة المهنية: LinkedIn والمجتمعات التقنية", primary: "Professional network" },
              { name: "التفاوض على الراتب في تقنية المعلومات: الأرقام والتكتيك", primary: "Salary negotiation" }
            ]},
            { unit_index: 9, code: "3.7.9", name: "الابتكار وتقنيات المستقبل", goal: "تقييم التقنيات الناشئة وأثرها على مهنة تقنية المعلومات والاستعداد للتكيف", key_concepts: ["AI in IT Operations AIOps","Edge Computing","Quantum Computing Impact","5G Network Implications","Green IT","Career Adaptation"], lessons: [
              { name: "الذكاء الاصطناعي في العمليات AIOps: الثورة القادمة", primary: "AIOps" },
              { name: "الحوسبة الحافة Edge Computing: الذكاء قرب المصدر", primary: "Edge computing" },
              { name: "الحوسبة الكمومية: الأثر المحتمل على أمن المعلومات", primary: "Quantum computing impact" },
              { name: "شبكات 5G وتأثيرها على البنية التحتية", primary: "5G implications" },
              { name: "تقنية المعلومات الخضراء Green IT: الاستدامة إلزام", primary: "Green IT" },
              { name: "Platform Engineering: الاتجاه المستقبلي لـDevOps", primary: "Platform engineering" },
              { name: "Infrastructure as Data: التوجه نحو التعريف الكامل", primary: "Infrastructure as data" },
              { name: "التكيف المهني: التعلم المستمر في وادي التسارع", primary: "Career adaptation" },
              { name: "رحلة مهندس تقنية المعلومات: الرؤية والالتزام", primary: "IT career vision" }
            ]}
          ]
        }
      ]
    }
  ]
};

function makeGoal(name, domain) {
  return `تمكين المتعلم من فهم وتطبيق ${name} في سياق ${domain} المهني`;
}

function makeBridge(lessonName, lessonIdx, unitName) {
  const bridges = [
    `بعد أن أتقنت الأساس النظري، ننتقل الآن إلى ${lessonName} الذي يمثّل حجر الزاوية في فهم ${unitName} على أرض الواقع.`,
    `عمل أي مهندس تقنية معلومات احترافي يعتمد يومياً على ${lessonName}؛ هذا الدرس يُجسّر الفجوة بين المفهوم والتطبيق في بيئات الإنتاج الحقيقية.`,
    `ما شاهدته في الدرس السابق كان مقدمة؛ ${lessonName} هو المكان الذي تُترجم فيه تلك المعرفة إلى قرارات تقنية فعلية.`,
    `في الشركات والمؤسسات الكبرى، يُفرّق ${lessonName} بين المهندس المبتدئ والمحترف؛ هذا ما نبنيه اليوم.`,
    `كل إعداد خاطئ في ${unitName} يمكن تتبّع سببه إلى ضعف في ${lessonName}؛ لنبنِ هذه الأساس بمتانة الآن.`,
    `في بيئات الإنتاج عالية الأهمية، يختلف التعامل مع ${lessonName} عن بيئات التطوير اختلافاً جوهرياً يُغيّر النتائج.`,
    `سيجد كل مهندس تقنية معلومات نفسه مرات عديدة أمام قرار مرتبط بـ${lessonName}؛ هذا الدرس يُعدّك لتلك اللحظات.`,
    `المتخصص الذي يستوعب ${lessonName} بعمق يُقدّم حلولاً أكثر كفاءةً وأماناً من نظيره الذي يكتفي بالسطح.`,
    `ثمة نمط يتكرر في الحوادث التقنية الكبرى؛ غالباً ما يعود إلى سوء فهم ${lessonName} الذي ندرسه الآن بعمق.`,
  ];
  return bridges[(lessonIdx - 1) % bridges.length];
}

function makeConcepts(primary, lessonName) {
  return [
    {
      name: `المبدأ الجوهري في ${primary.split(':')[0]}`,
      explanation: `يُشير هذا المفهوم إلى ${primary} وهو أحد المحاور التقنية الأساسية التي يعتمد عليها كل مهندس تقنية معلومات في بيئات الإنتاج. فهمه الصحيح يمنع فئة كاملة من الأخطاء الشائعة.`,
      mastery_criterion: `يستطيع المتعلم توضيح ${primary.split(':')[0]} بمثال عملي من بيئة إنتاجية ويُحدد الفرق بين التطبيق الصحيح والخاطئ.`,
      weight: 2
    },
    {
      name: `الجانب التطبيقي لـ${lessonName.substring(0, 20)}`,
      explanation: `التطبيق العملي لهذا الدرس يتطلب فهماً دقيقاً للإعدادات والمعاملات ذات الصلة بـ${primary}، إذ تنعكس أي معلومة ناقصة مباشرةً على الاستقرار والأمان في الإنتاج.`,
      mastery_criterion: `يُنفّذ المتعلم ${primary.split(':')[0]} بدقة في بيئة محاكاة ويوثّق نتائجه وقراراته التقنية.`,
      weight: 2
    },
    {
      name: `اعتبارات الإنتاج والأمان`,
      explanation: `لكل تقنية محور نقدي في بيئة الإنتاج يتعلق بالأمان والأداء والتوفر. هنا يظهر الفرق بين من تعلّم نظرياً ومن اكتسب خبرة ميدانية في التعامل مع ${primary}.`,
      mastery_criterion: `يُحدد المتعلم على الأقل ثلاثة اعتبارات إنتاجية حرجة ذات صلة بهذا الدرس ويربطها بحالات استخدام فعلية.`,
      weight: 1
    }
  ];
}

function makeMistakes(primary, unitName) {
  return [
    {
      mistake: `الخلط بين الإعداد الأمثل في بيئة الاختبار وإعداد الإنتاج عند تطبيق ${primary.split(':')[0]}`,
      correction: `بيئة الاختبار مصممة للتجريب؛ الإنتاج يتطلب صرامة في الضبط والتوثيق والتحقق من كل تغيير مع احتمالات الرجوع.`,
      treatment: `اطلب من المتعلم تمييز على الأقل ثلاثة إعدادات تختلف بين البيئتين في سياق ${unitName} ويشرح لماذا لكل منها منطقه.`,
      severity: "major"
    },
    {
      mistake: `تجاهل جانب الأمان أو التوثيق عند تطبيق ${primary.split(':')[0]} في عجالة لحل مشكلة فورية`,
      correction: `الحلول السريعة بدون توثيق أو اعتبارات أمنية تُنشئ ديناً تقنياً يظهر في أسوأ الأوقات؛ التوثيق الفوري واجب حتى في ظروف الطوارئ.`,
      treatment: `قدّم سيناريو حادثة أمنية نتجت عن حل سريع بدون توثيق، واطلب تحليل العواقب وصياغة ما كان يجب فعله.`,
      severity: "critical"
    },
    {
      mistake: `افتراض أن المفهوم يعمل بنفس الطريقة عبر كل المنصات والأنظمة دون التحقق من التوثيق الرسمي`,
      correction: `كل منصة لها خصوصياتها في تطبيق المفاهيم المشتركة؛ التحقق من التوثيق الرسمي للمنصة المستهدفة قبل التطبيق عادة مهنية لا خيار.`,
      treatment: `اعرض حالة تعطّل في بيئة إنتاجية نتجت عن افتراض التوافق، واطلب تحديد نقطة الفشل وكيف كان يمكن تفاديها.`,
      severity: "major"
    }
  ];
}

function makeExamples(primary, unitName) {
  return [
    `في مركز بيانات شركة خدمات مالية تُعالج مئات الآلاف من المعاملات يومياً، يظهر ${primary.split(':')[0]} كعامل حاسم في أوقات الذروة؛ أي ضعف في إعداده يُترجَم مباشرة إلى تأخير في المعاملات وخسائر تشغيلية.`,
    `في بيئة سحابية متعددة الطبقات لشركة تقنية تقدم خدمات بـSLA صارمة، يتعامل فريق البنية التحتية يومياً مع ${unitName} ضمن سياق ${primary.split(':')[0]}؛ اتخاذ القرار الصحيح هنا يحمي التزامات الشركة تجاه عملائها.`
  ];
}

function makeExamQuestion(lessonName, primary) {
  return `في بيئة إنتاجية تواجه ارتفاعاً مفاجئاً في الأعطال المرتبطة بـ${primary.split(':')[0]}، طُلب منك تشخيص المشكلة. ما هي المؤشرات التي ستفحصها أولاً، وما الأسباب الجذرية المحتملة، وكيف ستُثبت فرضيتك قبل تطبيق أي تعديل على بيئة الإنتاج؟`;
}

function makeLabForUnit(unit) {
  const unitName = unit.name;
  const code = unit.code;
  const topic = unit.key_concepts[0];
  return {
    lab_index: 1,
    title: `مختبر تطبيقي: ${unitName} في بيئة إنتاجية`,
    scenario: `أنت مهندس تقنية معلومات في شركة تُشغّل بيئة إنتاجية حرجة. تواجه الفريق مجموعة من التحديات المرتبطة بـ${unitName} (${code}). عليك تشخيص الوضع واتخاذ قرارات تقنية مبنية على تحليل دقيق وتطبيق منهجي يضمن الاستقرار والأمان.`,
    pedagogical_sequence: `يبدأ المختبر بسبر المعرفة المسبقة (تشخيص)، ثم يُجبر المتعلم على اتخاذ قرار بين أسلوبين (قرار)، ثم ينتقل إلى التطبيق الفعلي (تطبيق)، ثم تحليل النتائج وتفسير السلوك (تحليل)، وأخيراً الربط بالسياق الأوسع والنظم المرتبطة (ربط). يتصاعد التحدي المعرفي تدريجياً لضمان أعلى عمق في التعلم.`,
    questions: [
      {
        kind: "diagnostic",
        prompt: `قبل البدء في العمل على ${unitName}، وصف بإيجاز ما تعرفه عن ${topic}: كيف يعمل، ومتى يُستخدم، وما الأخطاء الشائعة التي رأيتها أو سمعت عنها في بيئات الإنتاج؟`,
        rubric: `1 نقطة كاملة إذا أظهر المتعلم فهماً لـ${topic} مع ذكر استخدام واحد على الأقل وتحدٍّ واحد. نصف نقطة إذا ذكر التعريف دون سياق تطبيقي.`,
        solution_outline: `المتعلم يُوضح مفهوم ${topic} ويربطه بسياق ${unitName} مع ذكر تحدٍّ واحد على الأقل من تجربته أو معرفته المسبقة.`,
        points: 1
      },
      {
        kind: "decision",
        prompt: `قُدّم لك خياران لتنفيذ ${unitName} في بيئة إنتاجية: الأول أسرع في التطبيق لكنه يتطلب صيانة دورية أعلى، والثاني أكثر تعقيداً في الإعداد لكنه أكثر استدامة. مع وجود ضغط زمني وفريق محدود، أيهما تختار ولماذا؟ ما العوامل التي تُرجّح قرارك؟`,
        rubric: `2 نقطة كاملة إذا ذكر المتعلم 3 عوامل على الأقل تُبرر اختياره مع تقييم المخاطر. نقطة واحدة إذا اختار مع ذكر عاملين. صفر إذا اختار دون تبرير.`,
        solution_outline: `لا يوجد جواب مطلق. المتعلم يُظهر تفكيراً نقدياً: يُقيّم السرعة مقابل الاستدامة، يذكر الضغط الزمني، قدرة الفريق، أثر الخيار على SLA، وإمكانية التراجع إذا فشل.`,
        points: 2
      },
      {
        kind: "application",
        prompt: `اكتب الأوامر/الكود/الإعداد اللازم لتطبيق ${unitName} في سيناريو محدد: خادم Linux جديد يحتاج إعداداً متعلقاً بـ${topic} ضمن متطلبات: الأمان أولاً، التوثيق التلقائي، وإمكانية المراجعة لاحقاً. وضّح كل خطوة وسببها.`,
        rubric: `3 نقاط: الكمال التقني (أوامر صحيحة وآمنة) + التوثيق (شرح كل خطوة) + الأمان (مراعاة المتطلبات). نقطتان إذا كان التطبيق صحيحاً لكن بدون توثيق واضح. نقطة واحدة إذا أظهر فهماً جزئياً.`,
        solution_outline: `أوامر صحيحة لتطبيق ${topic} مع شرح لكل خطوة ومنطقها الأمني، بالإضافة إلى التحقق من النتيجة وتوثيقها.`,
        points: 3
      },
      {
        kind: "analysis",
        prompt: `بعد تطبيق الإعداد المتعلق بـ${unitName}، لاحظت السجلات التالية (خطأ أو سلوك غير متوقع مرتبط بـ${topic}). حلّل ما تراه: ما الجزء الخاطئ بالضبط؟ لماذا حدث هذا؟ وما التأثير المحتمل إذا تُرك دون معالجة؟`,
        rubric: `2 نقطة كاملة إذا حدّد الجزء الخاطئ بدقة مع تفسير السبب الجذري وذكر التأثير. نقطة واحدة إذا حدّد الخطأ دون تفسير أو تأثير. صفر إذا لم يتعرف على المشكلة.`,
        solution_outline: `تحديد الخطأ بدقة، شرح لماذا يحدث (السبب الجذري المرتبط بـ${topic})، والتأثير على الاستقرار والأمان، مع اقتراح خطوة تصحيحية.`,
        points: 2
      },
      {
        kind: "connection",
        prompt: `كيف يتكامل ${unitName} مع المكونات الأخرى في البنية التحتية؟ ما الذي يحدث للنظام ككل إذا أُعطيت ${topic} قيمة خاطئة أو لم تُعدّ أصلاً؟ اذكر سيناريو عملياً رأيت فيه كيف يؤثر ${unitName} على خدمة أو نظام آخر.`,
        rubric: `2 نقطة كاملة إذا ذكر ربطاً واضحاً بمكون آخر + سيناريو + أثر متسلسل. نقطة واحدة إذا ذكر الربط دون سيناريو أو أثر. صفر إذا لم يُظهر فهم التكامل.`,
        solution_outline: `ربط ${unitName} بمكونين على الأقل في البنية التحتية (مثلاً: الشبكة والأمان)، مع شرح الأثر المتسلسل عند فشله، وسيناريو من بيئة إنتاجية حقيقية أو مُحاكاة.`,
        points: 2
      }
    ],
    completion_criterion: `أكمل المتعلم جميع الأسئلة الخمسة بمجموع لا يقل عن 60% (6 نقاط من 10) مع الحصول على نقطة كاملة في السؤال التطبيقي على الأقل.`
  };
}

function makeUnitExamQuestions(unitCode, unit, passThreshold, timeLimit) {
  const topic1 = unit.key_concepts[0] || unit.name;
  const topic2 = unit.key_concepts[1] || unit.name;
  const topic3 = unit.key_concepts[2] || unit.name;
  return {
    pass_threshold_percent: passThreshold,
    time_limit_minutes: timeLimit,
    variants: [[
      {
        kind: "mcq",
        prompt: `في بيئة إنتاجية تُدار فيها خوادم تعتمد على ${unit.name}، أي من الآتي يُمثّل الممارسة الأصح وفق معايير الصناعة؟`,
        choices: [
          `تطبيق ${topic1} مع توثيق كامل ومراجعة دورية`,
          `تجاهل ${topic1} لتوفير وقت الإعداد`,
          `تطبيق ${topic1} مرة واحدة دون متابعة`,
          `الاعتماد على الإعدادات الافتراضية دائماً`
        ],
        correct_index: 0,
        explanation: `التطبيق الصحيح لـ${topic1} يستلزم توثيقاً كاملاً ومراجعة دورية؛ الإعدادات الافتراضية نادراً ما تكون مناسبة للإنتاج، والتجاهل يُنشئ مخاطر تشغيلية.`,
        difficulty: 2
      },
      {
        kind: "mcq",
        prompt: `عند تحليل حادثة تقنية ناجمة عن إعداد خاطئ في ${unit.name}، ما أول ما تتحقق منه؟`,
        choices: [
          `سجلات النظام والأحداث المرتبطة بـ${topic2}`,
          `إعادة تشغيل الخادم فوراً لحل المشكلة`,
          `حذف الإعداد الحالي والبدء من جديد`,
          `إغلاق الخدمة وانتظار المختصين`
        ],
        correct_index: 0,
        explanation: `السجلات هي المصدر الأول لتشخيص أي حادثة؛ إعادة التشغيل قد تُتلف الأدلة، والحذف الفوري خطأ منهجي.`,
        difficulty: 2
      },
      {
        kind: "mcq",
        prompt: `ما التعريف الأدق لـ${topic2} في سياق ${unit.name}؟`,
        choices: [
          `مكوّن تقني يُوفر وظيفة محددة ضمن بنية ${unit.name} مع اعتبارات أداء وأمان`,
          `إعداد اختياري لا يؤثر على الأداء الكلي`,
          `ميزة مخصصة لبيئات الاختبار فقط`,
          `عتاد مادي ضروري لتشغيل الخدمة`
        ],
        correct_index: 0,
        explanation: `${topic2} هو مكوّن تقني أساسي يتكامل مع بنية ${unit.name} الأشمل وله أثر مباشر على الأداء والأمان.`,
        difficulty: 1
      },
      {
        kind: "mcq",
        prompt: `مهندس يُعدّ بيئة ${unit.name} للمرة الأولى. أيٌّ من الأخطاء التالية الأكثر شيوعاً وخطورة؟`,
        choices: [
          `افتراض أن الإعدادات الافتراضية كافية دون التحقق من متطلبات البيئة`,
          `قراءة التوثيق الرسمي قبل البدء`,
          `اختبار الإعداد في بيئة منفصلة أولاً`,
          `استشارة زملاء ذوي خبرة`
        ],
        correct_index: 0,
        explanation: `الافتراضات الخاطئة عن الإعدادات الافتراضية هي من أكثر أسباب الحوادث شيوعاً؛ القراءة والاختبار والاستشارة كلها ممارسات صحيحة.`,
        difficulty: 2
      },
      {
        kind: "mcq",
        prompt: `في سياق ${unit.name}، ما الذي يُميّز بيئة الإنتاج عن بيئة الاختبار من ناحية ${topic3}؟`,
        choices: [
          `يُطبَّق ${topic3} في الإنتاج بصرامة أعلى مع مراقبة مستمرة وإجراءات تغيير رسمية`,
          `بيئة الاختبار تتطلب إعداداً أكثر تفصيلاً من الإنتاج`,
          `${topic3} متطابق في البيئتين دون فروق`,
          `يُعطَّل ${topic3} في الإنتاج لتحسين الأداء`
        ],
        correct_index: 0,
        explanation: `الإنتاج يتطلب صرامة أعلى في كل جانب من جوانب ${topic3} مع مراقبة ورقابة تغيير؛ التطابق التام بين البيئتين نادر وغير مُوصى به.`,
        difficulty: 3
      },
      {
        kind: "mcq",
        prompt: `عند كتابة وثيقة Runbook لـ${unit.name}، أي العناصر التالية الأهم للتضمين أولاً؟`,
        choices: [
          `خطوات استكشاف الأعطال مع معايير القرار الواضحة لكل سيناريو`,
          `قائمة بأسماء المبرمجين الذين بنوا النظام`,
          `تاريخ التثبيت الأولي للنظام`,
          `قائمة بالأجهزة المُستخدمة في الشركة`
        ],
        correct_index: 0,
        explanation: `الـRunbook الفعّال يُركّز على خطوات العمل القابلة للتنفيذ مع معايير قرار واضحة تُمكّن أي مهندس من التعامل مع الحادثة بسرعة.`,
        difficulty: 2
      }
    ]]
  };
}

function makeStageExamQuestions(stageInfo) {
  const stageUnits = stageInfo.units;
  const stageName = stageInfo.name;
  return {
    pass_threshold_percent: stageInfo.exam.pass_threshold_percent,
    time_limit_minutes: stageInfo.exam.time_limit_minutes,
    variants: [[
      ...stageUnits.slice(0, 5).map((unit, i) => ({
        kind: "mcq",
        prompt: `في سياق ${stageName}، ما الممارسة الصحيحة المتعلقة بـ${unit.name}؟`,
        choices: [
          `تطبيق أفضل ممارسات الصناعة مع توثيق ومراجعة دورية`,
          `الاكتفاء بالحد الأدنى من الإعداد`,
          `تجاهل المتطلبات غير الملحّة`,
          `الاعتماد على الإعدادات الافتراضية`
        ],
        correct_index: 0,
        explanation: `${unit.name} يتطلب تطبيقاً منهجياً وفق معايير الصناعة مع توثيق كامل لضمان الاستقرار والأمان.`,
        difficulty: 2
      })),
      ...stageUnits.slice(5, 9).map((unit, i) => ({
        kind: "mcq",
        prompt: `ما العلاقة بين ${unit.name} والمكونات الأخرى في ${stageName}؟`,
        choices: [
          `${unit.name} يتكامل مع المكونات الأخرى ويؤثر على الأداء والأمان الكلي`,
          `${unit.name} مستقل تماماً ولا يؤثر على غيره`,
          `يمكن تجاهل ${unit.name} دون تأثير على النظام`,
          `${unit.name} مطلوب في الاختبار فقط`
        ],
        correct_index: 0,
        explanation: `في بنية ${stageName}، كل مكوّن يتكامل مع الآخر؛ ${unit.name} له أثر مباشر على الأداء والأمان والموثوقية الكلية.`,
        difficulty: 3
      })),
      {
        kind: "mcq",
        prompt: `عند التخطيط لتنفيذ ${stageName} في بيئة مؤسسية، ما أهم مرحلة يجب إتقانها أولاً؟`,
        choices: [
          `التحليل والتخطيط مع فهم متطلبات الأعمال قبل أي تطبيق`,
          `التطبيق الفوري لاختبار ما يعمل`,
          `شراء الأجهزة أولاً ثم التخطيط`,
          `تكليف فريق خارجي بكل العمل`
        ],
        correct_index: 0,
        explanation: `التحليل والتخطيط المدروس وفهم متطلبات الأعمال هو الأساس الذي يمنع الإعادة المكلفة وضمان ملاءمة الحل.`,
        difficulty: 2
      }
    ]]
  };
}

function makeLevelExamQuestions(levelInfo) {
  const levelName = levelInfo.name;
  const allUnits = levelInfo.stages.flatMap(s => s.units);
  const sample = allUnits.filter((_, i) => i % Math.ceil(allUnits.length / 10) === 0).slice(0, 10);
  return {
    pass_threshold_percent: levelInfo.exam.pass_threshold_percent,
    time_limit_minutes: levelInfo.exam.time_limit_minutes,
    variants: [[
      ...sample.map((unit, i) => ({
        kind: "mcq",
        prompt: `في مستوى "${levelName}"، ما العلاقة الجوهرية التي يُقدمها ${unit.name} للبنية التحتية الأشمل؟`,
        choices: [
          `${unit.name} يُوفّر أساساً تقنياً حرجاً يدعم المكونات المعتمدة عليه ويرفع من موثوقية النظام كلّه`,
          `${unit.name} مكوّن ثانوي يمكن تأجيله`,
          `${unit.name} مخصص لبيئات الاختبار فقط`,
          `${unit.name} يعمل بصورة مستقلة كلياً دون تأثير على غيره`
        ],
        correct_index: 0,
        explanation: `في سياق ${levelName}، كل مكوّن—بما فيه ${unit.name}—يُؤدي دوراً محورياً؛ استيعابه بعمق ضروري لبناء بنية تحتية متكاملة.`,
        difficulty: i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 3
      })),
      ...[
        { prompt: `ما المقياس الأساسي الذي يُستخدم لقياس نجاح إدارة ${levelName}؟`, choices: [`مؤشرات الأداء الكمية المرتبطة بالأهداف التشغيلية والأمنية`, `عدد الأجهزة المثبتة`, `حجم ميزانية تقنية المعلومات`, `طول فترة عمل المهندسين`], correct_index: 0, explanation: `قياس النجاح في ${levelName} يرتبط بمؤشرات أداء كمية قابلة للقياس وترتبط بأهداف الأعمال الفعلية.`, difficulty: 2 },
        { prompt: `لماذا يُعدّ الارتباط بين مكونات ${levelName} المختلفة نقطة مخاطرة رئيسية؟`, choices: [`لأن فشل مكوّن واحد قد يؤثر على المكونات المعتمدة عليه وإصلاح أثره يتطلب فهم التكامل`, `لأن كل مكوّن يعمل باستقلالية تامة`, `لأن الارتباط يحسّن الأداء دائماً`, `لأن المكونات المنفصلة أكثر تعقيداً`], correct_index: 0, explanation: `في أنظمة ${levelName}، الاعتماد المتبادل يعني أن خللاً في طبقة واحدة ينعكس على طبقات أخرى؛ فهم هذا التكامل ضروري للتشخيص الصحيح.`, difficulty: 3 },
        { prompt: `أي من الآتي يُعبّر بدقة أكبر عن التطبيق الناضج لـ${levelName} في مؤسسة كبيرة؟`, choices: [`اتباع إطار عمل موثّق مع مراجعة دورية وقياس مستمر لمؤشرات الأداء`, `تطبيق كل ما هو متاح من أدوات`, `الاعتماد على الخبرة الشخصية دون توثيق`, `تبنّي أحدث التقنيات فور ظهورها`], correct_index: 0, explanation: `النضج في ${levelName} يتجلى في اتباع إطار عمل محدد مع قياس مستمر ومراجعة دورية—وليس في اعتماد كل الأدوات الجديدة.`, difficulty: 3 }
      ]
    ]]
  };
}

function makePlacementTest(levels) {
  const questions = [];
  for (const level of levels) {
    const stagesForLevel = level.stages;
    const pickedStages = stagesForLevel.filter((_, i) => i < 3);
    for (const stage of pickedStages) {
      const unit = stage.units[Math.floor(stage.units.length / 2)];
      const topic = unit.key_concepts[0];
      questions.push({
        target_level_index: level.level_index,
        target_stage_code: `${level.level_index}.${stage.stage_index}`,
        target_unit_code: unit.code,
        kind: "mcq",
        prompt: `في سياق ${unit.name}، أي من الآتي يُعبّر عن الممارسة الصحيحة عند العمل مع ${topic}؟`,
        choices: [
          `تطبيق ${topic} بشكل منهجي مع توثيق كامل والتحقق في بيئة اختبار أولاً`,
          `تجاهل ${topic} وإعداد الخدمة بالإعدادات الافتراضية`,
          `تطبيق ${topic} مباشرة على الإنتاج دون اختبار`,
          `الانتظار حتى تظهر مشكلة قبل معالجة ${topic}`
        ],
        correct_index: 0,
        difficulty: level.level_index
      });
    }
  }
  return questions.slice(0, 18);
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
        const lessons = unitDef.lessons.map((lesson, idx) => {
          const lessonIndex = idx + 1;
          return {
            lesson_index: lessonIndex,
            name: lesson.name,
            goal: makeGoal(lesson.name, unitDef.name),
            bridge_sentence: makeBridge(lesson.name, lessonIndex, unitDef.name),
            prerequisite_lessons: [],
            enables_lessons: [],
            concepts: makeConcepts(lesson.primary, lesson.name),
            common_mistakes: makeMistakes(lesson.primary, unitDef.name),
            yemeni_examples: makeExamples(lesson.primary, unitDef.name),
            final_check_question: makeExamQuestion(lesson.name, lesson.primary),
            session_complete_criterion: `يستطيع المتعلم شرح ${lesson.primary} وتطبيقه في سيناريو واقعي مع تمييز الإعداد الصحيح من الخاطئ.`,
            expected_duration_minutes: 45,
            motivation_hook: `إتقان ${lesson.name} يؤهلك لأدوار مهنية متقدمة وعطاء فعلي في فرق تقنية المعلومات الاحترافية.`,
            learning_objectives: [
              { statement: `شرح مفهوم ${lesson.primary.split(':')[0]} وآلية عمله`, bloom_level: "understand" },
              { statement: `تطبيق ${lesson.primary.split(':')[0]} في سيناريو بيئة إنتاجية مُحددة`, bloom_level: "apply" }
            ],
            solution_outline: `فهم ${lesson.primary}، التطبيق الصحيح مع توثيق، التحقق من النتيجة، ومعالجة أي خطأ بمنهجية.`
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

  const placementQuestions = makePlacementTest(CURRICULUM.levels);

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

console.log("توليد ملف uni-it-instruction.json...");
const result = buildFullFile();
const json = JSON.stringify(result, null, 2);
writeFileSync("uni-it-instruction.json", json, "utf8");
const sizeKB = Math.round(json.length / 1024);
console.log(`تم الانتهاء. حجم الملف: ${sizeKB} KB`);
console.log(`عدد المستويات: ${result.levels.length}`);
console.log(`عدد المراحل الكلي: ${result.levels.reduce((a,l) => a + l.stages.length, 0)}`);
console.log(`عدد الوحدات الكلي: ${result.levels.reduce((a,l) => a + l.stages.reduce((b,s) => b + s.units.length, 0), 0)}`);
console.log(`عدد الدروس الكلي: ${result.levels.reduce((a,l) => a + l.stages.reduce((b,s) => b + s.units.reduce((c,u) => c + u.lessons.length, 0), 0), 0)}`);

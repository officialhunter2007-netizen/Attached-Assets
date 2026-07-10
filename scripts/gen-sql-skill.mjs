import { writeFileSync } from "fs";

const CURRICULUM = {
  schema_version: "v4.1",
  slug: "skill-sql",
  name: "SQL وقواعد البيانات",
  icon: "🗄️",
  description: "مسار متكامل لتعلم SQL وقواعد البيانات العلائقية من الصفر حتى الاحتراف — يبدأ بتصميم الجداول وكتابة الاستعلامات ويصل إلى دوال النافذة والفهارس والمعاملات وبناء أنظمة تحليلية حقيقية، بتسلسل منطقي مريح يبني الفهم العميق لكيفية تخزين البيانات وتحليلها",
  target_persona: "محلل بيانات أو مطور يريد إتقان SQL وقواعد البيانات من أسسها، سواء كان مبتدئاً يريد فهم كيفية تنظيم البيانات أو متوسطاً يسعى للتحكم الكامل في PostgreSQL وكتابة استعلامات تحليلية متقدمة",
  teacher_tone: "خبير قواعد بيانات يشرح SQL بأسلوب مباشر عملي، يبدأ كل مفهوم بمشكلة حقيقية تحتاج حلاً، يربط كل استعلام بالنتيجة الفعلية التي تظهر على الشاشة، ويحفّز الطالب بتحديات 'توقّع النتيجة ثم نفّذ'",
  allowed_viz_templates: ["comparison_table", "flowchart", "architecture_diagram", "timeline", "memory_diagram"],
  allowed_tools: ["nukhba_ide_js"],
  levels: [
    {
      level_index: 1,
      name: "أساسيات SQL وقواعد البيانات العلائقية",
      goal: "بناء قاعدة صلبة في SQL تشمل تصميم قواعد البيانات وكتابة استعلامات SELECT والفلترة والترتيب والـ JOINs والتجميع وإنشاء الجداول وإدارة البيانات، بما يُمكّن المتعلم من بناء قاعدة بيانات كاملة لمشروع حقيقي",
      bloom_focus: "apply",
      exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
      stages: [
        {
          stage_index: 1,
          name: "مقدمة إلى قواعد البيانات",
          goal: "فهم لماذا توجد قواعد البيانات ومشكلات التخزين التي تحلّها، وتعلّم النموذج العلائقي وكيفية تنظيم البيانات في جداول وصفوف وأعمدة، وإعداد بيئة PostgreSQL جاهزة للعمل",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.1.1",
              name: "لماذا قواعد البيانات؟",
              goal: "فهم المشكلات الحقيقية التي تحلّها قواعد البيانات ولماذا تفشل الجداول والملفات في إدارة البيانات المعقدة",
              key_concepts: ["Database", "Spreadsheet Limitations", "Data Integrity", "Concurrency", "Persistence"],
              lessons: [
                { name: "مشكلة التخزين: لماذا Excel لا يكفي", primary: "database vs spreadsheet limitations real problems" },
                { name: "ما هي قاعدة البيانات وما دورها الحقيقي", primary: "database definition role data management system" },
                { name: "قواعد البيانات في حياتنا اليومية", primary: "database real world examples everyday applications" },
                { name: "البيانات المتزامنة: مشكلة الكتابة المتعددة", primary: "concurrency data integrity multiple users conflict" },
                { name: "استمرارية البيانات: لماذا لا تضيع بعد الإغلاق", primary: "data persistence storage disk reliability" },
                { name: "قواعد البيانات مقابل الملفات: متى تختار ماذا", primary: "database vs files trade-offs use cases decision" },
                { name: "أنواع قواعد البيانات: علائقية ووثائقية ورسومية", primary: "relational NoSQL document graph database types" },
                { name: "DBMS: برنامج إدارة قاعدة البيانات ودوره", primary: "DBMS PostgreSQL MySQL SQLite database management system" },
                { name: "SQL: لغة التواصل مع قاعدة البيانات", primary: "SQL language declarative query database communication" },
                { name: "نظرة عامة على رحلتنا: ماذا ستبني بنهاية المسار", primary: "SQL journey roadmap learning path overview goals" }
              ]
            },
            {
              unit_index: 2, code: "1.1.2",
              name: "النموذج العلائقي",
              goal: "فهم النموذج العلائقي وكيف تُنظَّم البيانات في جداول وصفوف وأعمدة وكيف تمثّل الجداول كيانات العالم الحقيقي",
              key_concepts: ["Table", "Row", "Column", "Schema", "Relation"],
              lessons: [
                { name: "الجدول كتمثيل للكيان: من الفكرة للبنية", primary: "table entity rows columns relational model concept" },
                { name: "الصف: سجل واحد بكل خصائصه", primary: "row record tuple entity instance relational" },
                { name: "العمود: خاصية واحدة ونوع بياناتها", primary: "column attribute data type domain relational" },
                { name: "المخطط (Schema): وصف بنية قاعدة البيانات", primary: "schema database structure definition metadata catalog" },
                { name: "العلاقات: كيف تتحدث الجداول مع بعضها", primary: "relations tables foreign key relationships relational" },
                { name: "القيمة الفارغة NULL: المجهول في عالم البيانات", primary: "NULL unknown missing value relational model three-valued" },
                { name: "الـ Tuple: الوحدة الأساسية في النموذج العلائقي", primary: "tuple relation set theory relational algebra" },
                { name: "من الواقع للجدول: تحويل ورقة الطلاب لقاعدة بيانات", primary: "real world modeling students data table design" },
                { name: "قراءة جدول بيانات: ماذا تعني كل خلية", primary: "table reading data interpretation column meaning" },
                { name: "التكرار في البيانات: المشكلة وبذرة الحل", primary: "data redundancy duplication problem normalization preview" }
              ]
            },
            {
              unit_index: 3, code: "1.1.3",
              name: "المفتاح الأساسي والخارجي",
              goal: "فهم المفاتيح وكيف تُعرِّف كل سجل بشكل فريد وكيف تربط الجداول ببعضها بعلاقات منطقية محكمة",
              key_concepts: ["Primary Key", "Foreign Key", "Unique", "Referential Integrity", "Surrogate Key"],
              lessons: [
                { name: "المفتاح الأساسي: الهوية الفريدة لكل صف", primary: "primary key unique identifier row identity constraint" },
                { name: "اختيار المفتاح الأساسي: طبيعي أم بديل؟", primary: "natural key surrogate key auto-increment serial choice" },
                { name: "SERIAL و IDENTITY: مفاتيح تولّدها قاعدة البيانات", primary: "SERIAL IDENTITY auto-increment generated primary key" },
                { name: "المفتاح الخارجي: ربط جدولين بعلاقة منطقية", primary: "foreign key reference parent child relationship link" },
                { name: "الـ Referential Integrity: قاعدة البيانات تحمي نفسها", primary: "referential integrity constraint violation orphan delete" },
                { name: "ON DELETE CASCADE وON DELETE SET NULL", primary: "ON DELETE CASCADE SET NULL RESTRICT referential action" },
                { name: "المفتاح المركّب (Composite Key): متى يكون ضرورياً", primary: "composite key multiple columns primary key junction table" },
                { name: "فهرسة المفتاح الأساسي: لماذا هو سريع دائماً", primary: "primary key index automatic B-tree fast lookup" },
                { name: "أخطاء المفاتيح الشائعة وكيف تتجنبها", primary: "primary key mistakes NULL non-unique foreign key error" },
                { name: "تصميم علاقات: one-to-many وmany-to-many", primary: "one-to-many many-to-many relationship junction table design" }
              ]
            },
            {
              unit_index: 4, code: "1.1.4",
              name: "أنواع البيانات في SQL",
              goal: "إتقان أنواع البيانات الأساسية في PostgreSQL واختيار النوع الصحيح لكل عمود لضمان الكفاءة والصحة",
              key_concepts: ["INTEGER", "TEXT", "NUMERIC", "BOOLEAN", "TIMESTAMP"],
              lessons: [
                { name: "أنواع البيانات: لماذا يهم اختيار النوع الصحيح", primary: "data types storage efficiency validation type choice" },
                { name: "الأعداد الصحيحة: SMALLINT, INTEGER, BIGINT", primary: "integer SMALLINT BIGINT size range storage numeric" },
                { name: "الأعداد العشرية: NUMERIC وREAL وDOUBLE PRECISION", primary: "NUMERIC DECIMAL REAL floating point precision money" },
                { name: "النصوص: CHAR وVARCHAR وTEXT وأيها تختار", primary: "TEXT VARCHAR CHAR string storage length limit choice" },
                { name: "BOOLEAN: القيم المنطقية TRUE/FALSE/NULL", primary: "BOOLEAN true false null three-valued logic storage" },
                { name: "DATE وTIME وTIMESTAMP: إدارة التواريخ والأوقات", primary: "DATE TIME TIMESTAMP timezone datetime storage format" },
                { name: "TIMESTAMPTZ مقابل TIMESTAMP: فخ المناطق الزمنية", primary: "TIMESTAMPTZ timezone aware timestamp UTC offset pitfall" },
                { name: "UUID: معرّف فريد عالمي ومتى تستخدمه", primary: "UUID unique identifier global distributed system primary key" },
                { name: "تحويل الأنواع (Casting): CAST وعامل ::", primary: "CAST type conversion casting :: PostgreSQL implicit explicit" },
                { name: "أنواع PostgreSQL الخاصة: JSONB وARRAY نظرة أولى", primary: "JSONB ARRAY PostgreSQL special types overview preview" }
              ]
            },
            {
              unit_index: 5, code: "1.1.5",
              name: "تثبيت PostgreSQL وإعداد البيئة",
              goal: "إعداد بيئة PostgreSQL احترافية كاملة قابلة للاستخدام في مشاريع حقيقية مع فهم كيفية إنشاء قواعد بيانات والمستخدمين",
              key_concepts: ["PostgreSQL", "Installation", "Database", "User", "Connection"],
              lessons: [
                { name: "لماذا PostgreSQL؟ مقارنة مع MySQL وSQLite", primary: "PostgreSQL MySQL SQLite comparison features choice production" },
                { name: "تثبيت PostgreSQL على Linux/Mac/Windows", primary: "PostgreSQL installation setup operating system configure" },
                { name: "إنشاء أول قاعدة بيانات بـ createdb", primary: "createdb CREATE DATABASE PostgreSQL initialize database" },
                { name: "إنشاء مستخدم وتحديد صلاحياته", primary: "CREATE USER ROLE password GRANT privileges PostgreSQL" },
                { name: "الاتصال بقاعدة البيانات: psql وparameters", primary: "psql connection host port database user password connect" },
                { name: "أوامر psql الأساسية: \\l, \\d, \\dt, \\c", primary: "psql meta-commands list tables describe connect database" },
                { name: "pgAdmin: واجهة رسومية لإدارة قاعدة البيانات", primary: "pgAdmin GUI graphical interface database management visual" },
                { name: "تشغيل SQL من ملف: psql -f script.sql", primary: "psql file execute SQL script batch automation" },
                { name: "pg_dump: نسخ قاعدة البيانات احتياطياً", primary: "pg_dump backup export database SQL dump file" },
                { name: "إعداد مشروعك الأول: قاعدة بيانات طلاب مدرسة", primary: "project setup students database first schema create tables" }
              ]
            },
            {
              unit_index: 6, code: "1.1.6",
              name: "قراءة مخطط ERD وتصميم الجداول",
              goal: "تعلّم قراءة مخططات ERD وتحويل متطلبات الواقع إلى تصميم جداول منطقي قبل كتابة سطر SQL واحد",
              key_concepts: ["ERD", "Entity", "Attribute", "Relationship", "Cardinality"],
              lessons: [
                { name: "ERD: الخريطة قبل البناء", primary: "ERD entity relationship diagram design before code" },
                { name: "الكيانات (Entities) في ERD: ما الذي نُخزّنه", primary: "entity ERD real world object database representation" },
                { name: "الخصائص (Attributes): تفاصيل كل كيان", primary: "attributes entity properties ERD diagram design" },
                { name: "أنواع العلاقات: one-to-one وone-to-many وmany-to-many", primary: "relationship cardinality one-to-one one-to-many many-to-many ERD" },
                { name: "رسم ERD لمحل بقالة يمني: خطوة بخطوة", primary: "ERD design grocery store Yemen entities relationships diagram" },
                { name: "تحويل ERD لـ SQL: من المستطيل للجدول", primary: "ERD to SQL conversion entity table mapping columns" },
                { name: "جدول الوسيط (Junction Table) لـ many-to-many", primary: "junction table many-to-many bridge association composite key" },
                { name: "التطبيع الأول (1NF): لا تكرار في الأعمدة", primary: "first normal form 1NF normalization atomic values no repeat" },
                { name: "التطبيع الثاني (2NF): كل عمود يعتمد على المفتاح كاملاً", primary: "second normal form 2NF partial dependency primary key" },
                { name: "التطبيع الثالث (3NF): إزالة الاعتماد الانتقالي", primary: "third normal form 3NF transitive dependency normalization" }
              ]
            },
            {
              unit_index: 7, code: "1.1.7",
              name: "أدوات العمل مع SQL",
              goal: "إتقان الأدوات والبيئات التي يستخدمها محترفو قواعد البيانات يومياً لكتابة الاستعلامات وتصحيح الأخطاء",
              key_concepts: ["DBeaver", "VS Code Extension", "SQL Editor", "Connection String", "Snippet"],
              lessons: [
                { name: "DBeaver: أداة الاتصال الشاملة بأي قاعدة بيانات", primary: "DBeaver database client universal connection tool GUI" },
                { name: "امتداد SQLTools في VS Code", primary: "VS Code SQLTools extension SQL editor query runner" },
                { name: "كيفية ربط أداتك بـ PostgreSQL", primary: "connection string host port database user password configure" },
                { name: "تاريخ الاستعلامات وإعادة تشغيلها", primary: "query history recall rerun previous SQL commands" },
                { name: "شرح خطة التنفيذ بصرياً في DBeaver", primary: "execution plan visual explain DBeaver PostgreSQL graphical" },
                { name: "تصدير النتائج: CSV وJSON وExcel", primary: "export results CSV JSON Excel data download SQL query" },
                { name: "الـ SQL Snippets: حفظ الاستعلامات المتكررة", primary: "SQL snippets templates saved queries reuse productivity" },
                { name: "تعدد علامات التبويب: إدارة استعلامات متعددة معاً", primary: "multiple tabs SQL editor workflow query management" },
                { name: "التوثيق التلقائي: إنشاء diagram من قاعدة بيانات موجودة", primary: "auto documentation reverse engineer schema diagram existing database" },
                { name: "احترافية العمل: كتابة SQL نظيف ومنسق", primary: "SQL formatting style guide readable professional clean code" }
              ]
            },
            {
              unit_index: 8, code: "1.1.8",
              name: "فهم بنية قاعدة البيانات",
              goal: "إتقان استكشاف قاعدة بيانات موجودة وفهم بنيتها والتعامل مع catalog قاعدة البيانات لاكتشاف الجداول والأعمدة",
              key_concepts: ["information_schema", "pg_catalog", "Metadata", "Describe", "Catalog"],
              lessons: [
                { name: "information_schema: فهرس قاعدة البيانات", primary: "information_schema tables columns metadata catalog SQL standard" },
                { name: "استعلام عن قائمة الجداول الموجودة", primary: "information_schema.tables SELECT table_name schema query" },
                { name: "استعلام عن أعمدة جدول محدد", primary: "information_schema.columns column_name data_type ordinal_position" },
                { name: "pg_catalog: الفهرس الداخلي لـ PostgreSQL", primary: "pg_catalog pg_tables pg_class PostgreSQL system catalog" },
                { name: "\\d في psql: وصف كامل لبنية الجدول", primary: "psql \\d describe table columns constraints indexes" },
                { name: "استعراض القيود والفهارس على جدول", primary: "constraints indexes foreign keys describe information_schema" },
                { name: "pg_stat_user_tables: إحصاءات استخدام الجداول", primary: "pg_stat_user_tables row count size activity monitoring" },
                { name: "كيف تكتشف قاعدة بيانات مجهولة لأول مرة", primary: "explore unknown database schema discovery methodology approach" },
                { name: "توثيق قاعدة البيانات: تعليقات على الجداول والأعمدة", primary: "COMMENT ON table column documentation metadata PostgreSQL" },
                { name: "مراجعة: تحليل قاعدة بيانات إنتاجية حقيقية", primary: "production database analysis schema review audit real world" }
              ]
            },
            {
              unit_index: 9, code: "1.1.9",
              name: "مشروع تعريفي: تصميم قاعدة بيانات نظام حجوزات",
              goal: "تطبيق كل مفاهيم المقدمة على مشروع حقيقي بتصميم قاعدة بيانات نظام حجوزات فندق يمني من الصفر",
              key_concepts: ["Project Design", "Requirements", "ERD", "Tables", "Relationships"],
              lessons: [
                { name: "تحليل المتطلبات: ماذا يحتاج نظام الحجوزات", primary: "requirements analysis hotel reservation system entities attributes" },
                { name: "تحديد الكيانات الرئيسية: غرف، ضيوف، حجوزات", primary: "entities rooms guests reservations hotel system design" },
                { name: "رسم ERD كامل للنظام", primary: "ERD diagram hotel reservation complete entity relationship" },
                { name: "تصميم جدول الغرف مع كل خصائصه", primary: "rooms table design columns types constraints hotel" },
                { name: "تصميم جدول الضيوف والمعلومات الشخصية", primary: "guests table personal information design columns types" },
                { name: "تصميم جدول الحجوزات وعلاقاته", primary: "reservations table foreign keys dates status relationships" },
                { name: "قرارات التصميم: ماذا خزّنا وماذا احتسبنا", primary: "design decisions calculated derived columns what to store" },
                { name: "التحقق من التصميم: هل يجيب على أسئلة الأعمال", primary: "design validation business questions can answer ERD review" },
                { name: "توثيق التصميم: Data Dictionary للمشروع", primary: "data dictionary documentation column description data types" },
                { name: "تهيئة قاعدة البيانات: إنشاء schema المشروع", primary: "create schema database initialization project setup SQL" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "SELECT والاستعلام الأساسي",
          goal: "إتقان كتابة استعلامات SELECT من الأبسط للأكثر تعقيداً، مع الأسماء المستعارة والترتيب والتحديد وإزالة المكررات",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.2.1",
              name: "بنية SELECT الأساسية",
              goal: "كتابة أول استعلام SELECT وفهم تسلسل تنفيذ SQL وكيف تُعالج قاعدة البيانات الأوامر",
              key_concepts: ["SELECT", "FROM", "Execution Order", "Statement", "Result Set"],
              lessons: [
                { name: "أول استعلام SQL: SELECT 1+1", primary: "SELECT expression literal first query SQL hello world" },
                { name: "SELECT col FROM table: الصيغة الأساسية", primary: "SELECT FROM table column basic query structure syntax" },
                { name: "ترتيب تنفيذ SQL: من أين تبدأ قاعدة البيانات", primary: "SQL execution order FROM WHERE SELECT processing sequence" },
                { name: "اختيار عمود واحد: استعلام بسيط وواضح", primary: "single column SELECT table query result set rows" },
                { name: "اختيار أعمدة متعددة بفصلها بفاصلة", primary: "multiple columns SELECT comma separated list query" },
                { name: "SELECT * : عرض كل الأعمدة ومتى تتجنبه", primary: "SELECT star all columns asterisk performance anti-pattern" },
                { name: "حساب تعبيرات في SELECT: SELECT price * 1.15", primary: "SELECT expression calculation arithmetic column formula" },
                { name: "دمج النصوص في SELECT: CONCAT والعامل ||", primary: "CONCAT string concatenation || operator SELECT column" },
                { name: "الثوابت في SELECT: إضافة قيم ثابتة للنتائج", primary: "SELECT literal constant value string number result set" },
                { name: "قراءة نتائج الاستعلام: فهم Result Set", primary: "result set rows columns query output reading understanding" }
              ]
            },
            {
              unit_index: 2, code: "1.2.2",
              name: "الأسماء المستعارة - Aliases",
              goal: "إتقان استخدام الأسماء المستعارة للأعمدة والجداول لكتابة استعلامات أكثر وضوحاً وقابلية للقراءة",
              key_concepts: ["AS", "Column Alias", "Table Alias", "Readability", "Expression"],
              lessons: [
                { name: "لماذا نحتاج Aliases؟ مشكلة أسماء التعبيرات", primary: "alias column expression naming readability SQL output" },
                { name: "AS keyword: إعطاء عمود اسماً مستعاراً", primary: "AS alias column rename result set label output" },
                { name: "Alias بدون AS: الطريقة المختصرة", primary: "alias without AS space shorthand column naming SQL" },
                { name: "Alias للتعبيرات الحسابية: total_price AS 'السعر الكلي'", primary: "alias expression calculation formula rename SQL readable" },
                { name: "Alias مع مسافات أو أحرف عربية: استخدام التنصيص", primary: "alias double quotes spaces special characters Arabic naming" },
                { name: "Table Alias: اختصار اسم الجدول في الاستعلام", primary: "table alias abbreviation short name JOIN reference clarity" },
                { name: "Table Alias في الاستعلامات المعقدة", primary: "table alias complex query multiple tables disambiguation" },
                { name: "Alias في SELECT مقابل WHERE: الفرق المهم", primary: "alias scope WHERE ORDER BY GROUP BY reference limitation" },
                { name: "اصطلاحات تسمية Aliases في الشركات", primary: "naming conventions alias standards team SQL style guide" },
                { name: "تطبيق: استعلام فاتورة بأسماء مستعارة عربية", primary: "invoice query Arabic aliases readable professional output" }
              ]
            },
            {
              unit_index: 3, code: "1.2.3",
              name: "ORDER BY والترتيب",
              goal: "إتقان ترتيب نتائج الاستعلام تصاعداً وتنازلاً وعلى أعمدة متعددة بأولويات مختلفة",
              key_concepts: ["ORDER BY", "ASC", "DESC", "NULLS FIRST", "Sort Priority"],
              lessons: [
                { name: "ORDER BY: لماذا ترتيب النتائج ضروري", primary: "ORDER BY sorting results deterministic output SQL necessity" },
                { name: "ASC و DESC: الترتيب التصاعدي والتنازلي", primary: "ASC DESC ascending descending ORDER BY direction" },
                { name: "الترتيب على عمود نصي: أبجدي وترتيب Unicode", primary: "text ORDER BY alphabetical Unicode collation Arabic sort" },
                { name: "الترتيب على عمود رقمي وعلى تاريخ", primary: "numeric date ORDER BY temporal numeric sort comparison" },
                { name: "الترتيب على أعمدة متعددة بأولويات", primary: "multiple columns ORDER BY priority secondary sort compound" },
                { name: "NULLS FIRST وNULLS LAST: تحكم في موضع NULL", primary: "NULLS FIRST LAST ORDER BY null handling position sort" },
                { name: "الترتيب على تعبير حسابي أو Alias", primary: "ORDER BY expression calculation alias column formula sort" },
                { name: "الترتيب على رقم العمود: SELECT col1 ORDER BY 2", primary: "ORDER BY ordinal column number position reference" },
                { name: "أداء ORDER BY: تأثير الترتيب على الأداء", primary: "ORDER BY performance sort cost index benefit query" },
                { name: "تطبيق: ترتيب قائمة منتجات بسعر وتاريخ", primary: "products list ORDER BY price date multiple columns" }
              ]
            },
            {
              unit_index: 4, code: "1.2.4",
              name: "LIMIT وOFFSET والصفحات",
              goal: "إتقان تحديد عدد النتائج وتصفح البيانات بـ LIMIT وOFFSET لبناء ميزة pagination في التطبيقات",
              key_concepts: ["LIMIT", "OFFSET", "Pagination", "TOP N", "Cursor"],
              lessons: [
                { name: "LIMIT: استرجاع أول N صف فقط", primary: "LIMIT top N rows first results performance sample" },
                { name: "FETCH FIRST N ROWS ONLY: معيار SQL لـ LIMIT", primary: "FETCH FIRST ROWS ONLY SQL standard equivalent LIMIT" },
                { name: "أفضل 5 منتجات مبيعاً: LIMIT مع ORDER BY", primary: "TOP N LIMIT ORDER BY best sellers ranked results" },
                { name: "OFFSET: تخطي N صف والبدء من صف محدد", primary: "OFFSET skip rows page pagination start position" },
                { name: "Pagination بـ LIMIT وOFFSET: صفحة صفحة", primary: "pagination LIMIT OFFSET page size page number calculation" },
                { name: "مشكلة OFFSET الكبير: لماذا يبطئ مع الكميات الضخمة", primary: "OFFSET performance problem large datasets slow pagination" },
                { name: "Keyset Pagination: البديل الأسرع من OFFSET", primary: "keyset cursor pagination WHERE id > last_id performance" },
                { name: "LIMIT 1: استرجاع صف واحد فقط للتحقق السريع", primary: "LIMIT 1 single row quick check existence sample" },
                { name: "LIMIT بدون ORDER BY: نتائج غير حتمية، لا تفعل هذا", primary: "LIMIT without ORDER BY non-deterministic unpredictable results" },
                { name: "تطبيق: API endpoint تعيد صفحة من النتائج", primary: "API pagination endpoint LIMIT OFFSET page query backend" }
              ]
            },
            {
              unit_index: 5, code: "1.2.5",
              name: "DISTINCT وإزالة المكررات",
              goal: "فهم DISTINCT وكيفية استخدامه للحصول على قيم فريدة مع الوعي بتأثيره على الأداء",
              key_concepts: ["DISTINCT", "Unique Values", "Deduplication", "DISTINCT ON", "Count Distinct"],
              lessons: [
                { name: "مشكلة التكرار في النتائج: متى يظهر", primary: "duplicates results query JOIN DISTINCT problem need" },
                { name: "SELECT DISTINCT: استرجاع القيم الفريدة فقط", primary: "DISTINCT unique values deduplication SELECT query" },
                { name: "DISTINCT على عمود واحد: قائمة المدن المتاحة", primary: "DISTINCT single column unique list cities categories" },
                { name: "DISTINCT على أعمدة متعددة: التركيبة الفريدة", primary: "DISTINCT multiple columns combination unique tuple result" },
                { name: "DISTINCT vs GROUP BY: متى تستخدم أيهما", primary: "DISTINCT vs GROUP BY comparison performance use case" },
                { name: "COUNT(DISTINCT col): عد القيم الفريدة", primary: "COUNT DISTINCT aggregate unique values count combination" },
                { name: "DISTINCT ON: ميزة PostgreSQL للاحتفاظ بصف واحد لكل مجموعة", primary: "DISTINCT ON PostgreSQL keep first row group partition" },
                { name: "أداء DISTINCT: تكلفة إزالة المكررات", primary: "DISTINCT performance cost sort deduplication large data" },
                { name: "متى لا تستخدم DISTINCT: أعراض مشكلة في البنية", primary: "DISTINCT smell bad join data model problem indicator" },
                { name: "تطبيق: قائمة تصنيفات وعلامات تجارية فريدة", primary: "unique categories brands DISTINCT product catalog listing" }
              ]
            },
            {
              unit_index: 6, code: "1.2.6",
              name: "الحسابات والتعبيرات في SELECT",
              goal: "كتابة تعبيرات حسابية ونصية في SELECT لاشتقاق بيانات جديدة من البيانات المخزنة مباشرةً",
              key_concepts: ["Expression", "Arithmetic", "Concatenation", "Derived Column", "CASE"],
              lessons: [
                { name: "العمليات الحسابية الأساسية في SELECT", primary: "arithmetic SELECT addition subtraction multiplication division" },
                { name: "حساب السعر بعد الضريبة: price * 1.15", primary: "calculated column price tax discount formula derived" },
                { name: "دمج الاسم الأول والثاني: CONCAT أو ||", primary: "concatenation first last name CONCAT || string combine" },
                { name: "COALESCE: استبدال NULL بقيمة افتراضية", primary: "COALESCE NULL replacement default value fallback expression" },
                { name: "NULLIF: إرجاع NULL عند تساوي قيمتين", primary: "NULLIF null if equal values expression division zero" },
                { name: "CASE WHEN THEN ELSE END: الشرط في SELECT", primary: "CASE WHEN THEN ELSE conditional expression SELECT label" },
                { name: "CASE لتصنيف القيم: أرخص/متوسط/فاخر", primary: "CASE classification price range category label binning" },
                { name: "ABS وSIGN وMOD: دوال رياضية مفيدة", primary: "ABS absolute SIGN MOD modulo mathematical functions SQL" },
                { name: "GREATEST وLEAST: أكبر وأصغر قيمة من مجموعة", primary: "GREATEST LEAST maximum minimum multiple values comparison" },
                { name: "تطبيق: فاتورة كاملة بالحسابات والتصنيفات", primary: "invoice calculation total discount tax status CASE SELECT" }
              ]
            },
            {
              unit_index: 7, code: "1.2.7",
              name: "قراءة وفهم خطة التنفيذ البسيطة",
              goal: "فهم كيف تُنفَّذ استعلامات SELECT داخل قاعدة البيانات وقراءة EXPLAIN للاستعلامات البسيطة",
              key_concepts: ["EXPLAIN", "Sequential Scan", "Cost", "Rows", "Planning"],
              lessons: [
                { name: "ما هي خطة التنفيذ وكيف تعمل قاعدة البيانات", primary: "query execution plan optimizer PostgreSQL steps processing" },
                { name: "EXPLAIN: عرض خطة التنفيذ بدون تنفيذ", primary: "EXPLAIN query plan cost rows width estimate without run" },
                { name: "قراءة Seq Scan: فحص كل صفوف الجدول", primary: "sequential scan Seq Scan full table scan cost rows" },
                { name: "فهم Cost: التكلفة التقديرية لخطوة التنفيذ", primary: "cost estimate startup total cost planner statistics" },
                { name: "فهم Rows وWidth في EXPLAIN", primary: "rows estimate width bytes output EXPLAIN planner stats" },
                { name: "EXPLAIN ANALYZE: تنفيذ فعلي وقياس الوقت", primary: "EXPLAIN ANALYZE actual time rows execution real measurement" },
                { name: "متى يكون Seq Scan مقبولاً وغير مشكلة", primary: "sequential scan acceptable small table no index needed" },
                { name: "مقارنة خطط استعلامين بنفس النتيجة", primary: "compare execution plans two queries same result different cost" },
                { name: "تأثير LIMIT على خطة التنفيذ", primary: "LIMIT execution plan early termination optimization rows" },
                { name: "تطبيق: قراءة وتفسير EXPLAIN لاستعلام حقيقي", primary: "EXPLAIN practical reading interpretation simple query analysis" }
              ]
            },
            {
              unit_index: 8, code: "1.2.8",
              name: "الـ Comments ومعايير كتابة SQL",
              goal: "كتابة SQL احترافي ومقروء بالتعليقات واصطلاحات التسمية وتنسيق الاستعلامات بأسلوب الفرق المحترفة",
              key_concepts: ["Comment", "Formatting", "Naming Convention", "Readability", "Style"],
              lessons: [
                { name: "تعليق سطر واحد في SQL: -- comment", primary: "single line comment -- SQL documentation inline" },
                { name: "تعليق متعدد الأسطر: /* comment */", primary: "multi-line block comment /* */ SQL documentation" },
                { name: "تنسيق الاستعلامات: المسافات وأسطر الإعادة", primary: "SQL formatting indentation whitespace line breaks readability" },
                { name: "الكلمات المحجوزة بحروف كبيرة: لماذا وكيف", primary: "SQL keywords uppercase convention SELECT FROM WHERE style" },
                { name: "تسمية الجداول: جمع أم مفرد؟ وsnake_case", primary: "table naming convention snake_case plural singular style" },
                { name: "تسمية الأعمدة: وضوح بدون اختصار غامض", primary: "column naming clear descriptive snake_case no abbreviation" },
                { name: "توثيق الاستعلام: شرح الهدف وليس الكيفية", primary: "query documentation comment why not how purpose explain" },
                { name: "فاصلة في البداية أم النهاية: جدل أسلوب SQL", primary: "comma leading trailing style SQL formatting team preference" },
                { name: "أدوات تنسيق SQL: pgFormatter وprettier-plugin-sql", primary: "SQL formatter tools automatic formatting style consistency" },
                { name: "تطبيق: إعادة كتابة استعلام فوضوي بأسلوب احترافي", primary: "refactor messy SQL professional readable formatting style" }
              ]
            },
            {
              unit_index: 9, code: "1.2.9",
              name: "مشروع تطبيقي: استعلامات متكاملة على قاعدة متجر",
              goal: "تطبيق كل مفاهيم SELECT على قاعدة بيانات متجر حقيقية وبناء استعلامات متعددة لأغراض تجارية مختلفة",
              key_concepts: ["Store Database", "Product Queries", "Sales Reports", "Customer Data", "Integrated"],
              lessons: [
                { name: "إعداد قاعدة بيانات المتجر: الجداول والبيانات", primary: "store database setup tables products customers orders seed" },
                { name: "استعلام قائمة المنتجات مع الأسعار والتصنيفات", primary: "products list price category SELECT columns formatted" },
                { name: "استعلام أغلى 10 منتجات", primary: "top 10 expensive products ORDER BY price LIMIT query" },
                { name: "استعلام التصنيفات المتاحة بدون تكرار", primary: "DISTINCT categories available products unique list" },
                { name: "استعلام المنتجات مع السعر بعد الخصم", primary: "price after discount calculation SELECT derived column" },
                { name: "استعلام تصنيف المنتجات: رخيص/متوسط/فاخر", primary: "CASE price range category classification products" },
                { name: "استعلام المنتجات المضافة في آخر 30 يوم", primary: "recent products added last 30 days date filter query" },
                { name: "استعلام إحصاءات سريعة بـ SELECT", primary: "quick statistics count sum min max single SELECT expression" },
                { name: "استعلام صفحة منتجات: pagination كاملة", primary: "pagination products page LIMIT OFFSET sorted results" },
                { name: "مراجعة وتنقيح: كيف أُحسّن هذه الاستعلامات", primary: "review improve queries readability performance SELECT stage" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "التصفية والدوال المدمجة",
          goal: "إتقان WHERE وكل مشغلاته والدوال المدمجة للنصوص والأرقام والتواريخ لكتابة استعلامات دقيقة وقوية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.3.1",
              name: "WHERE والمشغلات الأساسية",
              goal: "إتقان WHERE وجميع مشغلات المقارنة وتركيب شروط متعددة بـ AND وOR وNOT",
              key_concepts: ["WHERE", "AND", "OR", "NOT", "Comparison Operators"],
              lessons: [
                { name: "WHERE: فلترة الصفوف بشرط محدد", primary: "WHERE clause filter rows condition predicate SQL" },
                { name: "مشغلات المقارنة: = و<> و< و> و<= و>=", primary: "comparison operators equal not-equal less greater than WHERE" },
                { name: "AND: كل الشروط يجب أن تتحقق", primary: "AND logical operator both conditions true filter rows" },
                { name: "OR: كفاية شرط واحد يتحقق", primary: "OR logical operator either condition true filter rows" },
                { name: "NOT: عكس الشرط", primary: "NOT logical operator negate condition inverse filter" },
                { name: "أولوية العمليات: AND قبل OR ودور الأقواس", primary: "operator precedence AND OR parentheses grouping order" },
                { name: "WHERE مع TEXT: المطابقة التامة حساسة لحالة الأحرف", primary: "WHERE text equality case sensitive exact match string" },
                { name: "WHERE مع DATE: فلترة بتاريخ ونطاق زمني", primary: "WHERE date comparison temporal filter range datetime" },
                { name: "WHERE مع تعبير حسابي: WHERE price * 0.9 > 100", primary: "WHERE expression calculated condition arithmetic filter" },
                { name: "تطبيق: فلترة طلبات بحالة وتاريخ ومبلغ", primary: "orders filter WHERE status date amount multiple conditions" }
              ]
            },
            {
              unit_index: 2, code: "1.3.2",
              name: "BETWEEN وIN وNOT IN",
              goal: "كتابة فلاتر نطاق وقائمة بطريقة أكثر وضوحاً وإيجازاً من AND وOR المتكررة",
              key_concepts: ["BETWEEN", "IN", "NOT IN", "Range", "List Filter"],
              lessons: [
                { name: "BETWEEN: فلترة نطاق شامل للحدين", primary: "BETWEEN range inclusive boundary numeric date filter" },
                { name: "BETWEEN مع الأرقام: price BETWEEN 100 AND 500", primary: "BETWEEN numeric range price salary filter inclusive" },
                { name: "BETWEEN مع التواريخ: فلترة فترة زمنية", primary: "BETWEEN dates range time period filter timestamp" },
                { name: "NOT BETWEEN: خارج النطاق", primary: "NOT BETWEEN outside range exclude numeric date filter" },
                { name: "IN: مطابقة قيمة مع قائمة محددة", primary: "IN list values match filter multiple values OR equivalent" },
                { name: "IN مع القيم النصية: status IN ('active','pending')", primary: "IN string values status category list text filter" },
                { name: "NOT IN: استبعاد قائمة من القيم", primary: "NOT IN exclude list values filter rows outside" },
                { name: "خطر NOT IN مع NULL: الفخ الشائع", primary: "NOT IN NULL trap pitfall unexpected results empty set" },
                { name: "IN مقابل OR المتكرر: أيهما أسرع وأوضح", primary: "IN vs OR performance readability equivalence comparison" },
                { name: "تطبيق: فلترة منتجات بتصنيف ونطاق سعري", primary: "filter products category IN price BETWEEN range query" }
              ]
            },
            {
              unit_index: 3, code: "1.3.3",
              name: "LIKE والبحث النصي الأساسي",
              goal: "إتقان البحث النصي بـ LIKE والـ wildcards لإيجاد نصوص تطابق نمطاً معيناً",
              key_concepts: ["LIKE", "ILIKE", "Wildcard", "Pattern Matching", "SIMILAR TO"],
              lessons: [
                { name: "LIKE: البحث بنمط نصي وعلامات الـ wildcard", primary: "LIKE pattern matching % underscore wildcard text search" },
                { name: "علامة %: يمثل أي عدد من الأحرف", primary: "percent wildcard any characters LIKE pattern matching" },
                { name: "علامة _: يمثل حرفاً واحداً بالضبط", primary: "underscore wildcard single character LIKE exact position" },
                { name: "LIKE في البداية: 'أحمد%' للأسماء التي تبدأ بـ", primary: "LIKE prefix starts with pattern name search beginning" },
                { name: "LIKE في النهاية: '%gmail.com' للإيميلات", primary: "LIKE suffix ends with pattern email domain search" },
                { name: "LIKE في الوسط: '%يمن%' للنص الذي يحتوي على", primary: "LIKE contains substring middle pattern search text" },
                { name: "ILIKE: البحث بغض النظر عن حالة الأحرف", primary: "ILIKE case-insensitive search PostgreSQL pattern matching" },
                { name: "ESCAPE: البحث عن علامة % أو _ حرفياً", primary: "LIKE ESCAPE character literal percent underscore search" },
                { name: "أداء LIKE: متى يستخدم الفهرس ومتى لا", primary: "LIKE performance index leading wildcard prefix scan" },
                { name: "تطبيق: محرك بحث بسيط عن المنتجات والعملاء", primary: "search engine LIKE ILIKE products customers name query" }
              ]
            },
            {
              unit_index: 4, code: "1.3.4",
              name: "NULL: التعامل مع القيم المفقودة",
              goal: "فهم NULL بعمق والتعامل معه بصواب في كل مواقف SQL لتجنب الأخطاء المنطقية الصامتة",
              key_concepts: ["NULL", "IS NULL", "IS NOT NULL", "COALESCE", "Three-valued Logic"],
              lessons: [
                { name: "NULL: المجهول في عالم البيانات (ليس صفراً ولا فارغاً)", primary: "NULL unknown missing not zero empty string concept" },
                { name: "المنطق الثلاثي: TRUE/FALSE/NULL في الشروط", primary: "three-valued logic TRUE FALSE NULL condition evaluation" },
                { name: "IS NULL: التحقق من قيمة مجهولة", primary: "IS NULL check test missing value WHERE condition" },
                { name: "IS NOT NULL: التحقق من وجود قيمة", primary: "IS NOT NULL check exists value present WHERE filter" },
                { name: "خطأ شائع: WHERE col = NULL (لا يعمل أبداً)", primary: "NULL comparison equal wrong IS NULL correct pitfall" },
                { name: "NULL في AND وOR: جدول الحقيقة الكامل", primary: "NULL AND OR logic truth table evaluation expression" },
                { name: "NULL في COUNT: COUNT(*) مقابل COUNT(col)", primary: "NULL COUNT star column difference counting null rows" },
                { name: "COALESCE: أول قيمة غير NULL من قائمة", primary: "COALESCE first non-null value fallback default expression" },
                { name: "NULLIF: إرجاع NULL عند تحقق شرط معين", primary: "NULLIF null when equal expression conditional null" },
                { name: "تطبيق: تقرير عملاء بعناوين بريدية مفقودة", primary: "NULL customers missing email address IS NULL report" }
              ]
            },
            {
              unit_index: 5, code: "1.3.5",
              name: "دوال النصوص",
              goal: "إتقان دوال النصوص الأكثر استخداماً لتنظيف البيانات وتحويلها وتحليلها مباشرة في SQL",
              key_concepts: ["UPPER", "LOWER", "LENGTH", "SUBSTRING", "TRIM"],
              lessons: [
                { name: "UPPER وLOWER: تحويل حالة الأحرف", primary: "UPPER LOWER case conversion string function text" },
                { name: "LENGTH: طول النص بعدد الأحرف", primary: "LENGTH string length characters count function SQL" },
                { name: "TRIM وLTRIM وRTRIM: حذف المسافات", primary: "TRIM LTRIM RTRIM whitespace remove space string clean" },
                { name: "SUBSTRING: استخراج جزء من النص", primary: "SUBSTRING extract part string position length SQL" },
                { name: "LEFT وRIGHT: أول/آخر N حرف من النص", primary: "LEFT RIGHT first last characters string extract function" },
                { name: "POSITION وSTRPOS: موضع نص داخل نص", primary: "POSITION STRPOS find index location substring text" },
                { name: "REPLACE: استبدال نص بنص آخر", primary: "REPLACE string substitution old new text function" },
                { name: "SPLIT_PART: تقسيم نص بفاصل وأخذ جزء", primary: "SPLIT_PART delimiter split extract part email domain" },
                { name: "LPAD وRPAD: ملء النص بأحرف لطول محدد", primary: "LPAD RPAD padding string fill character length" },
                { name: "تطبيق: تنظيف وتوحيد بيانات عملاء متسخة", primary: "clean normalize customer data TRIM LOWER UPPER REPLACE" }
              ]
            },
            {
              unit_index: 6, code: "1.3.6",
              name: "دوال الأرقام والحسابات",
              goal: "إتقان الدوال الرياضية الأساسية في SQL لإجراء حسابات دقيقة على البيانات الرقمية",
              key_concepts: ["ROUND", "FLOOR", "CEIL", "ABS", "MOD"],
              lessons: [
                { name: "ROUND: تقريب الأرقام لعدد محدد من الخانات", primary: "ROUND decimal places rounding function numeric precision" },
                { name: "FLOOR وCEIL: تقريب للأدنى أو الأعلى", primary: "FLOOR ceiling CEIL floor rounding direction numeric" },
                { name: "TRUNC: قطع الخانات العشرية بدون تقريب", primary: "TRUNC truncate decimal no rounding numeric cut digits" },
                { name: "ABS: القيمة المطلقة", primary: "ABS absolute value negative positive number function" },
                { name: "MOD: باقي القسمة وتطبيقاته", primary: "MOD modulo remainder division even odd calculation" },
                { name: "POWER: الأس والقوى", primary: "POWER exponent power function base exponential SQL" },
                { name: "SQRT: الجذر التربيعي", primary: "SQRT square root function numeric mathematical SQL" },
                { name: "DIV: قسمة صحيحة بدون كسر", primary: "DIV integer division truncated no fraction quotient" },
                { name: "RANDOM: رقم عشوائي وتطبيقاته", primary: "RANDOM random number generation sampling testing seed" },
                { name: "تطبيق: تقرير ربحية مع تقريب وإحصاءات", primary: "profit report ROUND calculations percentage financial SQL" }
              ]
            },
            {
              unit_index: 7, code: "1.3.7",
              name: "دوال التواريخ والأوقات",
              goal: "إتقان التعامل مع التواريخ والأوقات في SQL للفلترة الزمنية والحسابات والاستخراج من timestamps",
              key_concepts: ["NOW", "CURRENT_DATE", "EXTRACT", "DATE_TRUNC", "AGE"],
              lessons: [
                { name: "NOW وCURRENT_TIMESTAMP: الوقت الحالي بدقة", primary: "NOW CURRENT_TIMESTAMP current time SQL real-time function" },
                { name: "CURRENT_DATE وCURRENT_TIME: التاريخ والوقت فقط", primary: "CURRENT_DATE CURRENT_TIME date time separate today now" },
                { name: "EXTRACT: استخراج جزء من التاريخ", primary: "EXTRACT year month day hour minute second from timestamp" },
                { name: "DATE_TRUNC: تقليم التاريخ لدقة محددة", primary: "DATE_TRUNC truncate month year day precision timestamp" },
                { name: "حساب الفارق الزمني: timestamp - timestamp", primary: "date difference interval subtraction timestamp duration" },
                { name: "AGE: عمر دقيق بالسنوات والأشهر والأيام", primary: "AGE function date difference human readable interval" },
                { name: "INTERVAL: إضافة أو طرح مدة زمنية", primary: "INTERVAL add subtract time period days months years" },
                { name: "DATE_PART: مشابه لEXTRACT بصياغة مختلفة", primary: "DATE_PART extract year month day alternative function" },
                { name: "TO_CHAR: تنسيق التاريخ كنص قابل للقراءة", primary: "TO_CHAR format date timestamp string display Arabic" },
                { name: "تطبيق: تقرير مبيعات شهرية وسنوية بالتواريخ", primary: "monthly yearly sales report DATE_TRUNC EXTRACT timestamp" }
              ]
            },
            {
              unit_index: 8, code: "1.3.8",
              name: "CASE WHEN وتصنيف البيانات",
              goal: "إتقان CASE WHEN لبناء تعبيرات شرطية داخل الاستعلام لتصنيف البيانات وتحويلها",
              key_concepts: ["CASE WHEN", "THEN", "ELSE", "Conditional", "Classification"],
              lessons: [
                { name: "CASE WHEN THEN ELSE END: بنية الشرط الكاملة", primary: "CASE WHEN THEN ELSE END conditional expression SQL syntax" },
                { name: "CASE البسيط: مقارنة عمود بقيم محددة", primary: "simple CASE column value comparison multiple WHEN SQL" },
                { name: "CASE المبحوث: تعبيرات شرطية معقدة", primary: "searched CASE expression condition boolean multiple WHEN" },
                { name: "تصنيف الطلاب: ممتاز/جيد/مقبول/راسب", primary: "CASE student grade classification excellent good pass fail" },
                { name: "تصنيف الأسعار: رخيص/متوسط/فاخر", primary: "CASE price range cheap mid luxury label category" },
                { name: "CASE مع NULL: التعامل مع القيم المجهولة", primary: "CASE NULL WHEN IS NULL handling conditional expression" },
                { name: "CASE في ORDER BY: ترتيب بأولوية مخصصة", primary: "CASE ORDER BY custom priority sort expression conditional" },
                { name: "CASE في GROUP BY: تجميع بتصنيف ديناميكي", primary: "CASE GROUP BY classification aggregate dynamic bucket" },
                { name: "CASE داخل دوال التجميع: SUM(CASE WHEN ... END)", primary: "CASE aggregate SUM COUNT conditional pivot calculation" },
                { name: "تطبيق: تقرير أداء موظفين بتصنيف ديناميكي", primary: "employee performance CASE classification report dynamic label" }
              ]
            },
            {
              unit_index: 9, code: "1.3.9",
              name: "مشروع تطبيقي: تحليل بيانات طلاب جامعة يمنية",
              goal: "تطبيق كل أدوات التصفية والدوال على قاعدة بيانات طلاب حقيقية لإنتاج تقارير أكاديمية متنوعة",
              key_concepts: ["Student Analysis", "Academic Report", "Filter Combine", "Functions Applied", "Real Data"],
              lessons: [
                { name: "إعداد قاعدة بيانات الطلاب والمقررات والدرجات", primary: "students courses grades database setup seed real data" },
                { name: "تصفية الطلاب بالكلية والسنة الدراسية", primary: "filter students faculty year WHERE AND conditions" },
                { name: "البحث عن طلاب بالاسم مع LIKE وILIKE", primary: "student name search LIKE ILIKE pattern Arabic names" },
                { name: "تصنيف الطلاب بالمعدل: CASE تقدير", primary: "CASE GPA grade classification excellent good student" },
                { name: "إيجاد الطلاب الغائبة بياناتهم مع IS NULL", primary: "missing data NULL students email phone IS NULL filter" },
                { name: "تقرير التسجيلات في آخر فصل دراسي", primary: "registrations last semester DATE filter current term" },
                { name: "حساب عمر الطالب من تاريخ الميلاد", primary: "AGE student birthdate age calculation years months" },
                { name: "تنظيف أسماء الطلاب: TRIM وUPPER وLOWER", primary: "clean student names TRIM UPPER LOWER normalize data" },
                { name: "تقرير الطلاب المتميزين: شروط متعددة مركّبة", primary: "honor students complex WHERE multiple conditions combined" },
                { name: "مراجعة: أي الاستعلامات أبطأ وكيف نُسرّعها", primary: "review slow queries performance WHERE functions index hint" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "الجداول المتعددة والـ JOINs",
          goal: "إتقان ربط الجداول بأنواع JOIN المختلفة لاسترجاع بيانات مترابطة من جداول متعددة في استعلام واحد",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.4.1",
              name: "لماذا نُقسّم البيانات في جداول منفصلة",
              goal: "فهم دوافع تطبيع البيانات وتوزيعها على جداول منفصلة وكيف يحل الـ JOIN مشكلة استرجاعها معاً",
              key_concepts: ["Normalization", "Redundancy", "Foreign Key", "Join Motivation", "Anomaly"],
              lessons: [
                { name: "ثمن التكرار: ماذا يحدث حين لا نُطبّع", primary: "redundancy anomaly update delete insert normalization problem" },
                { name: "Update Anomaly: تحديث في مكان ونسيان آخر", primary: "update anomaly redundant data inconsistency normalization" },
                { name: "Insert Anomaly: بيانات لا يمكن إضافتها", primary: "insert anomaly incomplete data dependency normalization issue" },
                { name: "Delete Anomaly: حذف يُضيّع معلومة نريدها", primary: "delete anomaly data loss normalization dependency problem" },
                { name: "تقسيم البيانات: جدول العملاء وجدول الطلبات", primary: "split tables customers orders separation normalization" },
                { name: "المفتاح الخارجي يربط ما فرّقه التطبيع", primary: "foreign key link tables join normalization relationship" },
                { name: "JOIN كالترجمة: استعادة البيانات من جداولها", primary: "JOIN reconstruct data multiple tables read query select" },
                { name: "تصور JOIN: مجموعات متداخلة وVenn diagram", primary: "JOIN Venn diagram visualization sets intersection union" },
                { name: "التكلفة والفائدة: متى التطبيع الكامل ليس مثالياً", primary: "denormalization trade-off performance warehouse analytics" },
                { name: "مراجعة: من جدول واحد ضخم لجداول متعددة ذكية", primary: "normalize table split customers orders products foreign keys" }
              ]
            },
            {
              unit_index: 2, code: "1.4.2",
              name: "INNER JOIN",
              goal: "إتقان INNER JOIN لاسترجاع الصفوف المتطابقة في جدولين بشرط محدد",
              key_concepts: ["INNER JOIN", "ON", "Join Condition", "Matching Rows", "Intersection"],
              lessons: [
                { name: "INNER JOIN: فقط الصفوف الموجودة في الجدولين", primary: "INNER JOIN matching rows intersection ON condition" },
                { name: "بنية JOIN: SELECT ... FROM a JOIN b ON a.id = b.a_id", primary: "INNER JOIN syntax FROM ON equality condition column match" },
                { name: "JOIN مع Alias للجداول: قراءة أسهل", primary: "JOIN table alias short name readability query clarity" },
                { name: "اختيار أعمدة من جدولين: التأهيل بالاسم", primary: "qualified column name table.column ambiguity resolution SELECT" },
                { name: "INNER JOIN عميلين وطلباتهم: مثال عملي", primary: "INNER JOIN customers orders matching data retrieval" },
                { name: "JOIN مع WHERE: فلترة نتيجة الدمج", primary: "INNER JOIN WHERE filter combined result condition apply" },
                { name: "JOIN مع ORDER BY: ترتيب نتيجة مدمجة", primary: "INNER JOIN ORDER BY sort joined result multiple tables" },
                { name: "JOIN مع LIMIT: أفضل N نتيجة من جدولين", primary: "JOIN LIMIT top N combined results sorted filtered" },
                { name: "ماذا يحدث حين لا يوجد تطابق: الصفوف تختفي", primary: "INNER JOIN no match missing rows excluded result" },
                { name: "تطبيق: فاتورة مفصّلة بدمج طلبات ومنتجات وعملاء", primary: "invoice JOIN orders products customers detailed report" }
              ]
            },
            {
              unit_index: 3, code: "1.4.3",
              name: "LEFT JOIN وRIGHT JOIN",
              goal: "إتقان LEFT وRIGHT JOIN للاحتفاظ بكل صفوف جانب محدد حتى لو لم يكن له تطابق في الجانب الآخر",
              key_concepts: ["LEFT JOIN", "RIGHT JOIN", "NULL Padding", "Outer Join", "Preserve All"],
              lessons: [
                { name: "مشكلة INNER JOIN: نفقد عملاء بلا طلبات", primary: "INNER JOIN missing customers no orders problem LEFT JOIN" },
                { name: "LEFT JOIN: الاحتفاظ بكل صفوف الجدول الأيسر", primary: "LEFT JOIN preserve left table all rows NULL right" },
                { name: "NULL في LEFT JOIN: أعمدة الجانب الأيمن الغائب", primary: "LEFT JOIN NULL right side no match padding result" },
                { name: "إيجاد العملاء الذين لم يطلبوا شيئاً", primary: "LEFT JOIN WHERE right IS NULL no match anti-join" },
                { name: "RIGHT JOIN: ليس LEFT JOIN معكوساً تماماً", primary: "RIGHT JOIN right table preserved equivalent LEFT reorder" },
                { name: "تحويل RIGHT JOIN لـ LEFT JOIN: الطريقة المفضلة", primary: "RIGHT JOIN convert LEFT JOIN table order swap clarity" },
                { name: "LEFT JOIN مع فلتر WHERE: تأثير على النتيجة", primary: "LEFT JOIN WHERE filter NULL right condition placement" },
                { name: "LEFT JOIN على أكثر من جدول: سلسلة دمج", primary: "LEFT JOIN chain multiple tables three four tables" },
                { name: "متى LEFT JOIN مقابل INNER JOIN: القرار الصحيح", primary: "LEFT vs INNER JOIN decision optional required relationship" },
                { name: "تطبيق: تقرير المنتجات بدون مبيعات", primary: "products no sales LEFT JOIN IS NULL unsold inventory" }
              ]
            },
            {
              unit_index: 4, code: "1.4.4",
              name: "FULL OUTER JOIN وCROSS JOIN",
              goal: "فهم واستخدام FULL OUTER JOIN وCROSS JOIN في حالاتهما المناسبة",
              key_concepts: ["FULL OUTER JOIN", "CROSS JOIN", "Cartesian Product", "Union Both Sides", "Combination"],
              lessons: [
                { name: "FULL OUTER JOIN: صفوف الجانبين حتى بدون تطابق", primary: "FULL OUTER JOIN both sides preserved NULL missing match" },
                { name: "متى يكون FULL OUTER JOIN مفيداً: موازنة جدولين", primary: "FULL OUTER JOIN reconcile compare two tables difference" },
                { name: "إيجاد الفروقات بين جدولين: اليمين والشمال بلا تطابق", primary: "FULL OUTER JOIN difference WHERE IS NULL both sides" },
                { name: "CROSS JOIN: الضرب الديكارتي لكل الصفوف", primary: "CROSS JOIN Cartesian product all combinations every row" },
                { name: "متى يكون CROSS JOIN مفيداً: جدول مواعيد ومنتجات", primary: "CROSS JOIN calendar dates products combinations use case" },
                { name: "CROSS JOIN لتوليد بيانات اختبار", primary: "CROSS JOIN test data generation combinations permutations" },
                { name: "حجم نتيجة CROSS JOIN: m * n صف", primary: "CROSS JOIN result size multiplication rows danger performance" },
                { name: "CROSS JOIN العرضي: نسيان شرط ON في JOIN", primary: "accidental cross join missing ON condition full scan" },
                { name: "LATERAL JOIN: نظرة أولى على الاستعلام المترابط", primary: "LATERAL JOIN correlated dependent subquery PostgreSQL" },
                { name: "تطبيق: إنشاء جدول توافر المنتجات في المستودعات", primary: "CROSS JOIN product warehouse availability matrix table" }
              ]
            },
            {
              unit_index: 5, code: "1.4.5",
              name: "دمج أكثر من جدولين",
              goal: "إتقان كتابة استعلامات تدمج 3 جداول أو أكثر في استعلام واحد مع إدارة الأسماء والأداء",
              key_concepts: ["Multi-table JOIN", "Chain JOIN", "Three Tables", "Alias Management", "Join Order"],
              lessons: [
                { name: "دمج 3 جداول: طلب + عميل + منتج في استعلام واحد", primary: "three tables JOIN orders customers products single query" },
                { name: "ترتيب الجداول في JOIN: هل يؤثر على النتيجة", primary: "JOIN table order result correctness optimizer reorder" },
                { name: "Alias إجباري عند تكرار الجدول نفسه", primary: "alias required duplicate table self join disambiguation" },
                { name: "دمج 4 جداول: طلبيات بالكامل مع تفاصيل الشحن", primary: "four tables JOIN orders customers products shipping complete" },
                { name: "مزج LEFT JOIN وINNER JOIN في استعلام واحد", primary: "mixed LEFT INNER JOIN same query different tables careful" },
                { name: "أعمدة الغموض (Ambiguous Column): الخطأ وحله", primary: "ambiguous column error qualified name table.column join" },
                { name: "قراءة استعلام JOIN معقد: كيف تحلله خطوة خطوة", primary: "read complex JOIN query analyze step by step decompose" },
                { name: "أداء multi-table JOIN: ترتيب البدء وأثر الفهارس", primary: "multi-table JOIN performance order indexes optimizer cost" },
                { name: "CTE لتبسيط JOIN المعقد: كل خطوة باسم", primary: "CTE WITH simplify complex JOIN readable step named" },
                { name: "تطبيق: تقرير مبيعات شامل بخمسة جداول", primary: "sales report five tables JOIN complete detailed query" }
              ]
            },
            {
              unit_index: 6, code: "1.4.6",
              name: "Self JOIN وربط الجدول بنفسه",
              goal: "فهم Self JOIN وتطبيقه في قراءة البيانات الهرمية كالموظفين ومدرائهم والتصنيفات المتداخلة",
              key_concepts: ["Self JOIN", "Hierarchy", "Manager", "Parent Child", "Recursive Structure"],
              lessons: [
                { name: "Self JOIN: جدول يرتبط بنفسه", primary: "self JOIN same table two aliases hierarchy parent child" },
                { name: "مثال الموظف والمدير في جدول واحد", primary: "employee manager same table foreign key self-referencing" },
                { name: "كتابة Self JOIN مع Alias ضروري", primary: "self JOIN alias e1 e2 same table disambiguation" },
                { name: "استرجاع الموظف مع اسم مديره", primary: "employee manager name self JOIN LEFT JOIN result" },
                { name: "التصنيفات الهرمية: تصنيف رئيسي وفرعي", primary: "categories hierarchy parent child self-referencing table" },
                { name: "إيجاد الموظفين بلا مدراء: القيادة العليا", primary: "self JOIN NULL manager top level no parent LEFT JOIN" },
                { name: "قراءة هيكل الشركة بالكامل بـ Self JOIN", primary: "company structure all levels self JOIN organization chart" },
                { name: "حدود Self JOIN: ثلاثة مستويات هرمية أو أكثر", primary: "self JOIN limitations depth three levels recursive CTE better" },
                { name: "الحل الأفضل: Recursive CTE للهياكل الهرمية العميقة", primary: "recursive CTE hierarchy deep tree self JOIN alternative" },
                { name: "تطبيق: بناء شجرة تصنيفات متجر بـ Self JOIN", primary: "category tree self JOIN store taxonomy parent child" }
              ]
            },
            {
              unit_index: 7, code: "1.4.7",
              name: "UNION وUNION ALL وINTERSECT وEXCEPT",
              goal: "إتقان عمليات دمج نتائج استعلامات متعددة بـ UNION وإيجاد التقاطعات والفروقات بينها",
              key_concepts: ["UNION", "UNION ALL", "INTERSECT", "EXCEPT", "Set Operations"],
              lessons: [
                { name: "UNION: دمج نتيجتين في قائمة واحدة بلا تكرار", primary: "UNION combine two queries result set remove duplicates" },
                { name: "شروط UNION: نفس عدد الأعمدة ونفس الأنواع", primary: "UNION requirements same columns types compatible structure" },
                { name: "UNION ALL: دمج مع الاحتفاظ بالتكرارات وأداء أفضل", primary: "UNION ALL keep duplicates faster no dedup performance" },
                { name: "متى UNION وليس JOIN: مصادر مختلفة لنفس البنية", primary: "UNION vs JOIN use case different sources same structure" },
                { name: "INTERSECT: الصفوف المشتركة في كلا الاستعلامين", primary: "INTERSECT intersection common rows both queries" },
                { name: "EXCEPT: الصفوف في الأول ليست في الثاني", primary: "EXCEPT difference subtraction first not second rows" },
                { name: "ORDER BY في UNION: يطبق على النتيجة الكاملة", primary: "ORDER BY UNION final result sort placement at end" },
                { name: "UNION لتوحيد بيانات من جداول تاريخية وحالية", primary: "UNION archive current tables combine historical data" },
                { name: "أداء UNION مقابل OR: متى يكون أسرع", primary: "UNION performance vs OR comparison use case index scan" },
                { name: "تطبيق: تقرير موحّد من جداول مبيعات متعددة الفروع", primary: "UNION branches sales tables unified report combined" }
              ]
            },
            {
              unit_index: 8, code: "1.4.8",
              name: "استعلامات فرعية بسيطة في WHERE",
              goal: "كتابة واستخدام الاستعلامات الفرعية (Subqueries) داخل WHERE لاستعلامات أكثر ديناميكية",
              key_concepts: ["Subquery", "IN Subquery", "Correlated", "EXISTS Preview", "Nested Query"],
              lessons: [
                { name: "الاستعلام الفرعي (Subquery): استعلام داخل استعلام", primary: "subquery nested query inner outer parentheses WHERE" },
                { name: "Subquery يعيد قيمة واحدة: Scalar Subquery", primary: "scalar subquery single value comparison WHERE equal" },
                { name: "Subquery مع IN: WHERE id IN (SELECT id...)", primary: "subquery IN list WHERE filter nested query result" },
                { name: "Subquery لإيجاد المنتجات فوق متوسط السعر", primary: "subquery average price above AVG comparison WHERE" },
                { name: "Subquery في SELECT: عمود محسوب من جدول آخر", primary: "subquery SELECT column correlated calculation outer" },
                { name: "Subquery في FROM: جدول مؤقت (Derived Table)", primary: "subquery FROM derived table inline view nested result" },
                { name: "Correlated Subquery: يتغير مع كل صف في الاستعلام الخارجي", primary: "correlated subquery outer row dependent repeated execution" },
                { name: "EXISTS: هل توجد نتيجة للاستعلام الداخلي", primary: "EXISTS subquery boolean check any row match correlated" },
                { name: "Subquery مقابل JOIN: متى تختار أيهما", primary: "subquery vs JOIN readability performance use case comparison" },
                { name: "تطبيق: تقرير العملاء الأعلى إنفاقاً بـ Subquery", primary: "top spending customers subquery comparison threshold report" }
              ]
            },
            {
              unit_index: 9, code: "1.4.9",
              name: "مشروع تطبيقي: نظام تقارير متكامل بـ JOINs",
              goal: "بناء مجموعة من تقارير الأعمال الحقيقية لنظام متجر إلكتروني باستخدام JOINs بمستويات مختلفة",
              key_concepts: ["Business Reports", "JOIN Combined", "Project Application", "Multi-table", "Real Queries"],
              lessons: [
                { name: "إعداد قاعدة بيانات متجر إلكتروني كاملة", primary: "ecommerce database customers orders items products categories" },
                { name: "تقرير الطلبيات المفصّل: العميل والمنتجات والسعر", primary: "detailed orders report customers products price JOIN" },
                { name: "تقرير العملاء النشطين وآخر طلباتهم", primary: "active customers last order LEFT JOIN recent activity" },
                { name: "تقرير المنتجات بدون طلبيات (مخزون ميت)", primary: "dead stock products no orders LEFT JOIN IS NULL" },
                { name: "تقرير أكثر المنتجات مبيعاً", primary: "best selling products JOIN orders items count group" },
                { name: "تقرير إيرادات كل تصنيف", primary: "category revenue JOIN orders items products categories" },
                { name: "تقرير الموظفين والطلبيات التي عالجوها", primary: "employees orders processed self JOIN management report" },
                { name: "تقرير المقارنة بين فرعين بـ UNION", primary: "branch comparison UNION two stores sales report unified" },
                { name: "تقرير العملاء الجدد الذين اشتروا فعلاً", primary: "new customers made purchase INNER JOIN recent registered" },
                { name: "مراجعة وتحسين: قياس أداء كل استعلام", primary: "EXPLAIN ANALYZE JOIN performance review optimization" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "التجميع والتحليل - GROUP BY",
          goal: "إتقان دوال التجميع وGROUP BY وHAVING لتحويل البيانات الخام إلى تقارير تحليلية ذات معنى",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.5.1",
              name: "دوال التجميع الأساسية",
              goal: "إتقان دوال COUNT وSUM وAVG وMIN وMAX لتلخيص مجموعات من البيانات بقيمة واحدة",
              key_concepts: ["COUNT", "SUM", "AVG", "MIN", "MAX"],
              lessons: [
                { name: "دوال التجميع: تلخيص مجموعة في قيمة واحدة", primary: "aggregate functions summary reduce rows single value" },
                { name: "COUNT(*): عد كل الصفوف بما فيها NULL", primary: "COUNT star all rows including NULL count aggregate" },
                { name: "COUNT(col): عد القيم غير الفارغة فقط", primary: "COUNT column non-null values count aggregate difference" },
                { name: "SUM: جمع القيم الرقمية", primary: "SUM total sum aggregate numeric column add all" },
                { name: "AVG: المتوسط الحسابي للقيم", primary: "AVG average mean aggregate numeric NULL exclusion" },
                { name: "MIN وMAX: الحد الأدنى والأقصى", primary: "MIN MAX minimum maximum aggregate all types comparison" },
                { name: "دوال التجميع مع DISTINCT: SUM(DISTINCT col)", primary: "aggregate DISTINCT unique values SUM COUNT distinct" },
                { name: "دوال التجميع مع NULL: ماذا يحدث", primary: "aggregate NULL exclusion COUNT SUM AVG behavior" },
                { name: "تجميع بدون GROUP BY: نتيجة واحدة للكل", primary: "aggregate without GROUP BY single result whole table" },
                { name: "تطبيق: إحصاءات عامة لقاعدة بيانات المتجر", primary: "store statistics aggregate total count average min max" }
              ]
            },
            {
              unit_index: 2, code: "1.5.2",
              name: "GROUP BY: التجميع حسب قيمة",
              goal: "إتقان GROUP BY لتجميع الصفوف وحساب إحصاءات لكل مجموعة بشكل منفصل",
              key_concepts: ["GROUP BY", "Grouping", "Aggregate Per Group", "Bucket", "Non-aggregate"],
              lessons: [
                { name: "GROUP BY: تقسيم الجدول لمجموعات حسب قيمة", primary: "GROUP BY grouping partition aggregate separate calculation" },
                { name: "قاعدة SELECT مع GROUP BY: كل عمود يجب أن يكون...", primary: "GROUP BY rule SELECT non-aggregate column must appear" },
                { name: "GROUP BY على عمود نصي: مبيعات لكل فئة", primary: "GROUP BY text column sales per category aggregate" },
                { name: "GROUP BY على عمود رقمي: توزيع حسب قيمة", primary: "GROUP BY numeric column distribution price range count" },
                { name: "GROUP BY على تاريخ: مبيعات يومية", primary: "GROUP BY date daily sales aggregate timeline report" },
                { name: "GROUP BY على أعمدة متعددة: مجموعات مركبة", primary: "GROUP BY multiple columns compound grouping combined key" },
                { name: "GROUP BY مع ORDER BY: ترتيب نتيجة التجميع", primary: "GROUP BY ORDER BY aggregate sort total count result" },
                { name: "GROUP BY مع LIMIT: أعلى/أدنى N مجموعة", primary: "GROUP BY LIMIT ORDER BY top bottom N groups" },
                { name: "GROUP BY مع JOIN: إحصاءات من جداول متعددة", primary: "GROUP BY JOIN aggregate multi-table group result" },
                { name: "تطبيق: تقرير مبيعات شهرية لكل فرع", primary: "monthly sales report GROUP BY branch month aggregate" }
              ]
            },
            {
              unit_index: 3, code: "1.5.3",
              name: "HAVING: فلترة المجموعات",
              goal: "إتقان HAVING لتصفية نتائج GROUP BY وفهم الفرق بينه وبين WHERE",
              key_concepts: ["HAVING", "Filter Groups", "Post-aggregate", "WHERE vs HAVING", "Aggregate Condition"],
              lessons: [
                { name: "مشكلة WHERE مع دوال التجميع: لماذا لا تعمل", primary: "WHERE aggregate function error GROUP BY HAVING need" },
                { name: "HAVING: فلترة المجموعات بعد التجميع", primary: "HAVING filter groups aggregate condition post GROUP BY" },
                { name: "HAVING COUNT > N: مجموعات تجاوزت حد معين", primary: "HAVING COUNT threshold minimum group size filter" },
                { name: "HAVING SUM > N: مجموعات تجاوزت مبلغاً", primary: "HAVING SUM revenue threshold filter group condition" },
                { name: "HAVING مع AVG: التصنيف فوق/دون المتوسط", primary: "HAVING AVG average above below threshold group filter" },
                { name: "HAVING مقابل WHERE: الاثنان معاً في استعلام", primary: "WHERE HAVING both filter timing order rows groups" },
                { name: "HAVING بدون GROUP BY: فلترة التجميع الكلي", primary: "HAVING without GROUP BY whole table aggregate condition" },
                { name: "ترتيب تنفيذ SQL الكامل مع HAVING", primary: "SQL execution order FROM WHERE GROUP BY HAVING SELECT" },
                { name: "HAVING مع تعبيرات معقدة: HAVING COUNT > AVG", primary: "HAVING complex expression subquery aggregate condition" },
                { name: "تطبيق: إيجاد العملاء VIP (أكثر من 10 طلبات و5000 ريال)", primary: "VIP customers HAVING COUNT SUM threshold high value" }
              ]
            },
            {
              unit_index: 4, code: "1.5.4",
              name: "GROUP BY مع JOIN: التحليل متعدد الجداول",
              goal: "إتقان دمج GROUP BY مع JOIN لبناء تقارير تحليلية تسحب بيانات من جداول متعددة وتجمّعها",
              key_concepts: ["GROUP BY JOIN", "Multi-table Aggregate", "Analytics", "Report Builder", "Combined"],
              lessons: [
                { name: "GROUP BY مع INNER JOIN: إحصاءات من جدولين", primary: "GROUP BY INNER JOIN aggregate two tables report" },
                { name: "مبيعات كل عميل: JOIN + GROUP BY + SUM", primary: "customer sales JOIN orders GROUP BY SUM revenue report" },
                { name: "عدد طلبات كل منتج: JOIN + GROUP BY + COUNT", primary: "product orders count JOIN GROUP BY COUNT frequency" },
                { name: "GROUP BY مع LEFT JOIN: بما فيها الصفر", primary: "LEFT JOIN GROUP BY zero count NULL customers no orders" },
                { name: "متوسط سعر كل تصنيف: JOIN categories + AVG", primary: "category average price JOIN products GROUP BY AVG" },
                { name: "أفضل 5 عملاء بمجموع المشتريات", primary: "top customers GROUP BY SUM ORDER BY LIMIT five" },
                { name: "تقرير شهري بالإيرادات لكل فرع", primary: "monthly revenue branch GROUP BY DATE_TRUNC JOIN report" },
                { name: "ROLLUP: إجماليات فرعية وكلية تلقائياً", primary: "ROLLUP subtotals totals GROUP BY extension automatic" },
                { name: "GROUPING SETS: مجموعات متعددة في استعلام واحد", primary: "GROUPING SETS multiple GROUP BY combinations single query" },
                { name: "تطبيق: لوحة تحكم مبيعات بمؤشرات متعددة", primary: "sales dashboard KPI GROUP BY JOIN aggregate metrics" }
              ]
            },
            {
              unit_index: 5, code: "1.5.5",
              name: "CASE داخل دوال التجميع",
              goal: "إتقان تقنية CASE داخل SUM وCOUNT لبناء pivot tables وإحصاءات شرطية في SQL",
              key_concepts: ["Conditional Aggregate", "CASE SUM", "Pivot", "COUNT CASE", "Conditional Count"],
              lessons: [
                { name: "SUM(CASE WHEN ... END): جمع شرطي لتصنيفات", primary: "SUM CASE WHEN conditional aggregate selective sum" },
                { name: "COUNT(CASE WHEN ... END): عد شرطي", primary: "COUNT CASE WHEN conditional count selective NULL" },
                { name: "بناء Pivot Table في SQL بـ CASE", primary: "pivot table SQL CASE SUM GROUP BY rows to columns" },
                { name: "إحصاءات نجاح/فشل في استعلام واحد", primary: "success failure statistics CASE SUM single query pivot" },
                { name: "مبيعات كل فصل في صف واحد", primary: "quarterly sales pivot CASE SUM GROUP BY product row" },
                { name: "نسبة مئوية بـ CASE وSUM وCOUNT", primary: "percentage CASE SUM COUNT ratio aggregate calculation" },
                { name: "AVG(CASE WHEN): متوسط شرطي", primary: "AVG CASE WHEN conditional average selective aggregate" },
                { name: "تجنّب أخطاء CASE في التجميع: NULL وELSE", primary: "CASE aggregate NULL ELSE zero mistake result wrong" },
                { name: "FILTER clause: بديل CASE الأكثر أناقة في PostgreSQL", primary: "FILTER clause PostgreSQL conditional aggregate elegant" },
                { name: "تطبيق: تقرير أداء موظفين بعمود لكل شهر", primary: "employee performance report pivot CASE SUM monthly" }
              ]
            },
            {
              unit_index: 6, code: "1.5.6",
              name: "التجميع الزمني وتحليل السلاسل",
              goal: "إتقان التجميع الزمني لتحليل الاتجاهات والأنماط عبر الزمن في السلاسل البيانية",
              key_concepts: ["Time Series", "DATE_TRUNC GROUP BY", "Trend", "Temporal Aggregate", "Monthly"],
              lessons: [
                { name: "مبيعات يومية: GROUP BY تاريخ بدقة اليوم", primary: "daily sales GROUP BY DATE_TRUNC day aggregate revenue" },
                { name: "مبيعات أسبوعية: تجميع على أسبوع", primary: "weekly sales GROUP BY week DATE_TRUNC aggregate trend" },
                { name: "مبيعات شهرية: أكثر تقارير الأعمال شيوعاً", primary: "monthly sales DATE_TRUNC month GROUP BY revenue report" },
                { name: "مبيعات سنوية: نظرة على النمو طويل المدى", primary: "annual sales yearly GROUP BY EXTRACT year revenue growth" },
                { name: "مقارنة شهر بشهر السابق في نفس الاستعلام", primary: "month over month comparison GROUP BY CASE year month" },
                { name: "ملء الفجوات الزمنية: الأيام بلا مبيعات", primary: "fill time gaps generate dates series no sales zero" },
                { name: "generate_series: توليد نطاق تواريخ في PostgreSQL", primary: "generate_series date range fill gaps LEFT JOIN time series" },
                { name: "Moving Average: المتوسط المتحرك خطوة أولى", primary: "moving average rolling window aggregate time series trend" },
                { name: "Running Total: الإجمالي التراكمي مع الوقت", primary: "running total cumulative sum time series aggregate growth" },
                { name: "تطبيق: لوحة نمو المستخدمين الشهري", primary: "user growth monthly cohort aggregate DATE_TRUNC report" }
              ]
            },
            {
              unit_index: 7, code: "1.5.7",
              name: "STRING_AGG وARRAY_AGG وتجميع النصوص",
              goal: "تجميع قيم متعددة من صفوف عديدة في قيمة واحدة (نص أو مصفوفة) في صف واحد",
              key_concepts: ["STRING_AGG", "ARRAY_AGG", "Concatenate Aggregate", "List per Group", "JSON_AGG"],
              lessons: [
                { name: "STRING_AGG: دمج قيم نصية متعددة بفاصل", primary: "STRING_AGG aggregate text values delimiter concat group" },
                { name: "قائمة منتجات كل طلبية في خلية واحدة", primary: "STRING_AGG products per order single cell list comma" },
                { name: "STRING_AGG مع ORDER BY: ترتيب القيم المجمّعة", primary: "STRING_AGG ORDER BY sorted concatenation aggregate within" },
                { name: "ARRAY_AGG: تجميع قيم في مصفوفة PostgreSQL", primary: "ARRAY_AGG aggregate array values collect list PostgreSQL" },
                { name: "ARRAY_AGG مع DISTINCT: بدون تكرار في المصفوفة", primary: "ARRAY_AGG DISTINCT unique values array aggregate group" },
                { name: "JSON_AGG: تجميع صفوف كقائمة JSON", primary: "JSON_AGG aggregate rows JSON array PostgreSQL objects" },
                { name: "JSONB_AGG وJSONB_OBJECT_AGG: بنى JSON أغنى", primary: "JSONB_OBJECT_AGG key value aggregate JSON object group" },
                { name: "تحويل نتيجة STRING_AGG لمصفوفة بـ string_to_array", primary: "string_to_array split parse STRING_AGG reverse convert" },
                { name: "متى تجمّع في SQL ومتى في التطبيق", primary: "aggregate SQL vs application layer trade-off decision" },
                { name: "تطبيق: API endpoint يعيد طلبية بقائمة منتجاتها", primary: "API order with products STRING_AGG JSON_AGG response" }
              ]
            },
            {
              unit_index: 8, code: "1.5.8",
              name: "ترتيب التنفيذ الكامل وفهم خطوات SQL",
              goal: "فهم ترتيب التنفيذ الكامل لـ SQL خطوة بخطوة وكيف يؤثر على كتابة الاستعلامات الصحيحة",
              key_concepts: ["Execution Order", "Logical Processing", "FROM WHERE GROUP HAVING SELECT ORDER", "Scope", "Alias"],
              lessons: [
                { name: "ترتيب الكتابة مقابل ترتيب التنفيذ: الفرق الجوهري", primary: "SQL writing order vs execution order logical processing" },
                { name: "الخطوة 1: FROM وJOINs — بناء مجموعة البيانات", primary: "FROM JOIN first step execution build row set" },
                { name: "الخطوة 2: WHERE — تصفية الصفوف الفردية", primary: "WHERE step two filter individual rows before aggregate" },
                { name: "الخطوة 3: GROUP BY — تجميع الصفوف المتبقية", primary: "GROUP BY step three partition rows groups aggregate" },
                { name: "الخطوة 4: HAVING — تصفية المجموعات", primary: "HAVING step four filter groups post aggregate condition" },
                { name: "الخطوة 5: SELECT — حساب الأعمدة واختيارها", primary: "SELECT step five calculate columns expressions aliases" },
                { name: "الخطوة 6: DISTINCT — إزالة المكررات", primary: "DISTINCT step six deduplication after SELECT output" },
                { name: "الخطوة 7: ORDER BY — ترتيب النتيجة النهائية", primary: "ORDER BY step seven sort final result set output" },
                { name: "الخطوة 8: LIMIT وOFFSET — تحديد حجم النتيجة", primary: "LIMIT OFFSET step eight restrict paginate result rows" },
                { name: "تطبيق: تشخيص أخطاء شائعة بفهم ترتيب التنفيذ", primary: "debug SQL errors execution order diagnosis fix correct" }
              ]
            },
            {
              unit_index: 9, code: "1.5.9",
              name: "مشروع تحليلي: تقارير أعمال لمتجر إلكتروني",
              goal: "بناء مجموعة تقارير أعمال حقيقية تحليلية متكاملة تشمل مؤشرات KPI وتوجهات زمنية وتصنيفات",
              key_concepts: ["Analytics Project", "KPI", "Business Reports", "Aggregate Combined", "Dashboard"],
              lessons: [
                { name: "تحديد مؤشرات الأداء: ماذا يريد أن يعرف صاحب العمل", primary: "KPI business metrics sales revenue customers orders define" },
                { name: "إجمالي المبيعات اليومية والشهرية والسنوية", primary: "total sales daily monthly yearly GROUP BY DATE_TRUNC" },
                { name: "أفضل 10 منتجات مبيعاً بعدد وإيرادات", primary: "top 10 products sales revenue COUNT SUM GROUP BY" },
                { name: "تقرير تصنيفات: أي الأقسام تجلب أكثر إيرادات", primary: "category revenue GROUP BY JOIN aggregate top ranking" },
                { name: "متوسط قيمة الطلبية وتوزيعها", primary: "average order value AVG distribution CASE GROUP BY" },
                { name: "العملاء الأكثر إنفاقاً: تقرير VIP", primary: "VIP customers top spenders SUM GROUP BY ORDER BY" },
                { name: "معدل الاحتفاظ: كم عميل عاد لشراء ثاني", primary: "retention rate returning customers GROUP BY COUNT repeat" },
                { name: "تقرير Pivot: مبيعات كل فصل في عمود", primary: "pivot quarterly sales CASE SUM GROUP BY product" },
                { name: "تقرير موحّد: كل المؤشرات في لوحة واحدة", primary: "dashboard combined report UNION aggregate multiple KPI" },
                { name: "مراجعة: أداء استعلامات التحليل وتحسينها", primary: "analytics queries performance EXPLAIN GROUP BY index" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "DDL وDML - بناء وإدارة الجداول",
          goal: "إتقان إنشاء الجداول وتعديلها وحذفها وإدارة البيانات بـ INSERT وUPDATE وDELETE مع ضمانات سلامة البيانات",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.6.1",
              name: "CREATE TABLE: بناء جدول من الصفر",
              goal: "إتقان بنية CREATE TABLE وإضافة الأعمدة بأنواعها وقيودها الأساسية",
              key_concepts: ["CREATE TABLE", "Column Definition", "Data Type", "Constraint", "Schema"],
              lessons: [
                { name: "CREATE TABLE: بنية الأمر الكاملة", primary: "CREATE TABLE syntax column definition type constraint" },
                { name: "اختيار أسماء الجداول والأعمدة: اصطلاح snake_case", primary: "table column naming snake_case convention PostgreSQL style" },
                { name: "تحديد نوع كل عمود بدقة", primary: "column data type INTEGER TEXT BOOLEAN DATE precise choice" },
                { name: "NOT NULL: إجبار وجود قيمة في كل صف", primary: "NOT NULL constraint required field cannot empty null" },
                { name: "DEFAULT: قيمة افتراضية لعمود", primary: "DEFAULT value column automatic fill missing insert" },
                { name: "UNIQUE: ضمان عدم تكرار قيمة في العمود", primary: "UNIQUE constraint no duplicate value column enforce" },
                { name: "PRIMARY KEY: تعريف المفتاح الأساسي عند الإنشاء", primary: "PRIMARY KEY constraint table creation column definition" },
                { name: "GENERATED ALWAYS AS IDENTITY: مفتاح تلقائي حديث", primary: "GENERATED IDENTITY auto-increment modern primary key" },
                { name: "تعريف PRIMARY KEY على مستوى الجدول مقابل العمود", primary: "table-level column-level PRIMARY KEY definition composite" },
                { name: "تطبيق: إنشاء كل جداول نظام مكتبة يمنية", primary: "library books authors members loans CREATE TABLE complete" }
              ]
            },
            {
              unit_index: 2, code: "1.6.2",
              name: "القيود المتقدمة: FOREIGN KEY وCHECK",
              goal: "إتقان القيود المتقدمة لضمان سلامة البيانات وصحة قيمها على مستوى قاعدة البيانات نفسها",
              key_concepts: ["FOREIGN KEY", "CHECK", "Referential Integrity", "Constraint Violation", "DEFERRABLE"],
              lessons: [
                { name: "FOREIGN KEY: ربط جدول بجدول آخر عند الإنشاء", primary: "FOREIGN KEY REFERENCES constraint table relationship" },
                { name: "ON DELETE CASCADE: حذف متتالي يتبع المفتاح", primary: "ON DELETE CASCADE referential action cascading delete" },
                { name: "ON DELETE SET NULL: تفريغ المرجع عند الحذف", primary: "ON DELETE SET NULL reference null on parent delete" },
                { name: "ON DELETE RESTRICT: منع الحذف إذا توجد مراجع", primary: "ON DELETE RESTRICT block delete child exists error" },
                { name: "CHECK: التحقق من شرط منطقي على قيمة العمود", primary: "CHECK constraint condition validation domain rule SQL" },
                { name: "CHECK للتحقق من النطاق: price > 0", primary: "CHECK price positive range validation constraint rule" },
                { name: "CHECK للتحقق من القيم المسموحة: status IN (...)", primary: "CHECK ENUM alternative status allowed values constraint" },
                { name: "CHECK على مستوى الجدول: شروط تشمل أعمدة متعددة", primary: "table-level CHECK multiple columns condition comparison" },
                { name: "DEFERRABLE INITIALLY DEFERRED: تأجيل التحقق", primary: "DEFERRABLE constraint deferred transaction end flexibility" },
                { name: "تطبيق: قاعدة بيانات بكل القيود المطلوبة لنظام آمن", primary: "complete constraints FOREIGN KEY CHECK NOT NULL secure" }
              ]
            },
            {
              unit_index: 3, code: "1.6.3",
              name: "INSERT INTO: إدراج البيانات",
              goal: "إتقان إدراج البيانات بطرق مختلفة من صف واحد لإدراج الجملة من نتيجة استعلام",
              key_concepts: ["INSERT INTO", "VALUES", "Bulk Insert", "INSERT SELECT", "RETURNING"],
              lessons: [
                { name: "INSERT INTO VALUES: إدراج صف واحد", primary: "INSERT INTO table VALUES single row column data" },
                { name: "تحديد الأعمدة في INSERT: أمان وقابلية للصيانة", primary: "INSERT column list explicit safety maintenance schema change" },
                { name: "INSERT متعدد الصفوف: VALUES (...), (...), (...)", primary: "INSERT multiple rows VALUES list batch single statement" },
                { name: "INSERT ... SELECT: إدراج من نتيجة استعلام", primary: "INSERT SELECT from query result bulk copy migrate data" },
                { name: "RETURNING: استعادة القيم بعد INSERT", primary: "RETURNING inserted row values id generated primary key" },
                { name: "ON CONFLICT DO NOTHING: تجاهل التكرار", primary: "ON CONFLICT DO NOTHING unique constraint violation ignore" },
                { name: "ON CONFLICT DO UPDATE (UPSERT): تحديث إذا وُجد", primary: "UPSERT ON CONFLICT UPDATE existing row insert or update" },
                { name: "INSERT مع DEFAULT: الاعتماد على القيم الافتراضية", primary: "INSERT DEFAULT values automatic generated timestamp" },
                { name: "أداء INSERT الجملة: لماذا COPY أسرع من INSERT كثير", primary: "bulk INSERT COPY performance comparison large dataset" },
                { name: "تطبيق: تحميل بيانات طلاب من ملف CSV", primary: "CSV data load INSERT bulk students import populate" }
              ]
            },
            {
              unit_index: 4, code: "1.6.4",
              name: "UPDATE: تحديث البيانات",
              goal: "إتقان تحديث البيانات بدقة وأمان مع الشروط الصحيحة لتجنب التحديثات الخاطئة الواسعة",
              key_concepts: ["UPDATE", "SET", "WHERE Condition", "RETURNING", "Update From"],
              lessons: [
                { name: "UPDATE SET: بنية تحديث قيمة عمود", primary: "UPDATE SET column value WHERE condition basic syntax" },
                { name: "UPDATE بدون WHERE: الكارثة التي يجب تجنبها", primary: "UPDATE without WHERE all rows danger mistake best practice" },
                { name: "UPDATE شروط متعددة: AND وOR في WHERE", primary: "UPDATE WHERE multiple conditions AND OR filter precise" },
                { name: "UPDATE بناءً على قيمة العمود نفسه: price = price * 1.1", primary: "UPDATE self reference column expression calculation" },
                { name: "UPDATE أعمدة متعددة في أمر واحد", primary: "UPDATE multiple columns SET comma separated single statement" },
                { name: "RETURNING في UPDATE: استعادة القيم بعد التحديث", primary: "RETURNING UPDATE old new values result after change" },
                { name: "UPDATE ... FROM: التحديث من جدول آخر", primary: "UPDATE FROM join another table source values change" },
                { name: "UPDATE الآمن: اختبر SELECT قبل UPDATE", primary: "safe UPDATE test SELECT first WHERE condition verify" },
                { name: "UPDATE مع CASE: تحديث قيم مختلفة بشروط مختلفة", primary: "UPDATE CASE SET conditional different values rows" },
                { name: "تطبيق: تحديث أسعار المنتجات بخصومات موسمية", primary: "UPDATE product prices seasonal discount CASE WHERE" }
              ]
            },
            {
              unit_index: 5, code: "1.6.5",
              name: "DELETE: حذف البيانات بأمان",
              goal: "إتقان حذف البيانات بدقة وأمان مع فهم أثر القيود والحذف المتتالي وتقنيات الأمان",
              key_concepts: ["DELETE", "WHERE", "TRUNCATE", "Soft Delete", "Cascade"],
              lessons: [
                { name: "DELETE FROM: بنية أمر الحذف", primary: "DELETE FROM WHERE condition basic syntax rows remove" },
                { name: "DELETE بدون WHERE: حذف كل الجدول (خطير)", primary: "DELETE without WHERE all rows danger mistake warning" },
                { name: "الفرق بين DELETE وTRUNCATE وDROP", primary: "DELETE TRUNCATE DROP difference rows table schema remove" },
                { name: "TRUNCATE: تفريغ الجدول بسرعة وكفاءة", primary: "TRUNCATE fast empty table reset identity sequence" },
                { name: "DELETE مع RETURNING: معرفة ما تم حذفه", primary: "DELETE RETURNING rows deleted result what removed" },
                { name: "DELETE ... USING: حذف بناءً على جدول آخر", primary: "DELETE USING FROM join condition other table source" },
                { name: "أثر FOREIGN KEY على DELETE: Restrict مقابل Cascade", primary: "DELETE FOREIGN KEY constraint restrict cascade referential" },
                { name: "Soft Delete: لا تحذف، اجعله غير نشط", primary: "soft delete is_deleted flag active boolean approach audit" },
                { name: "الحذف المنطقي والأداء: index على is_deleted", primary: "soft delete performance WHERE is_deleted=false index filter" },
                { name: "تطبيق: حذف آمن للطلبيات الملغية بتأكيد", primary: "safe DELETE cancelled orders WHERE condition verify" }
              ]
            },
            {
              unit_index: 6, code: "1.6.6",
              name: "ALTER TABLE: تعديل بنية الجدول",
              goal: "إتقان تعديل بنية الجداول الموجودة بإضافة وحذف وتعديل الأعمدة والقيود دون فقدان البيانات",
              key_concepts: ["ALTER TABLE", "ADD COLUMN", "DROP COLUMN", "RENAME", "MODIFY"],
              lessons: [
                { name: "ALTER TABLE: تعديل جدول موجود بأمان", primary: "ALTER TABLE modify existing schema production live data" },
                { name: "ADD COLUMN: إضافة عمود جديد للجدول", primary: "ALTER TABLE ADD COLUMN new field existing table default" },
                { name: "DROP COLUMN: حذف عمود وبياناته بشكل نهائي", primary: "ALTER TABLE DROP COLUMN remove data permanent careful" },
                { name: "RENAME COLUMN: تغيير اسم عمود", primary: "ALTER TABLE RENAME COLUMN name change refactor" },
                { name: "RENAME TABLE: تغيير اسم الجدول", primary: "ALTER TABLE RENAME TO new name change table refactor" },
                { name: "ALTER COLUMN TYPE: تغيير نوع عمود", primary: "ALTER TABLE ALTER COLUMN TYPE change conversion cast" },
                { name: "SET/DROP DEFAULT: إضافة أو إزالة قيمة افتراضية", primary: "ALTER TABLE SET DEFAULT DROP DEFAULT column change" },
                { name: "SET/DROP NOT NULL: تعديل قيد الإلزامية", primary: "ALTER TABLE SET NOT NULL DROP NOT NULL constraint change" },
                { name: "ADD/DROP CONSTRAINT: إضافة أو إزالة قيد", primary: "ALTER TABLE ADD CONSTRAINT DROP CONSTRAINT named check" },
                { name: "تطبيق: ترحيل Schema إنتاجي بأمان خطوة بخطوة", primary: "production schema migration ALTER TABLE safe steps zero" }
              ]
            },
            {
              unit_index: 7, code: "1.6.7",
              name: "SEQUENCES والمعرّفات التلقائية",
              goal: "فهم Sequences وكيف تولّد معرّفات فريدة ومتسلسلة وكيف تتحكم فيها في مشاريع SQL",
              key_concepts: ["SEQUENCE", "SERIAL", "NEXTVAL", "CURRVAL", "Auto-increment"],
              lessons: [
                { name: "SEQUENCE: مولّد أرقام متسلسل في PostgreSQL", primary: "SEQUENCE auto-increment number generator independent object" },
                { name: "CREATE SEQUENCE: إنشاء sequence مخصص", primary: "CREATE SEQUENCE start increment minvalue maxvalue cycle" },
                { name: "NEXTVAL وCURRVAL: استدعاء الـ sequence", primary: "NEXTVAL CURRVAL sequence next current value function" },
                { name: "SERIAL: اختصار SEQUENCE + DEFAULT NEXTVAL", primary: "SERIAL shorthand sequence auto-increment column simple" },
                { name: "BIGSERIAL لأعداد كبيرة: متى تحتاجه", primary: "BIGSERIAL large numbers big integer auto-increment overflow" },
                { name: "IDENTITY columns: المعيار الحديث بديل SERIAL", primary: "IDENTITY GENERATED ALWAYS BY DEFAULT modern standard" },
                { name: "UUID كمعرّف بديل: مزايا وعيوب", primary: "UUID random primary key distributed global unique pros cons" },
                { name: "إعادة تعيين Sequence: RESTART ومشكلاتها", primary: "SEQUENCE RESTART reset value restart with careful" },
                { name: "الفجوات في Sequence: طبيعية أم مشكلة", primary: "sequence gaps normal rollback concurrent non-sequential" },
                { name: "تطبيق: نظام ترقيم فواتير متسلسل ولا يقبل الفجوات", primary: "invoice number sequence gapless serial proper design" }
              ]
            },
            {
              unit_index: 8, code: "1.6.8",
              name: "VIEWs: الاستعلامات المحفوظة كجداول افتراضية",
              goal: "إنشاء وإدارة Views لتبسيط الاستعلامات المعقدة وإخفاء تفاصيل التنفيذ وتأمين الوصول للبيانات",
              key_concepts: ["VIEW", "CREATE VIEW", "Virtual Table", "Security", "Reusable Query"],
              lessons: [
                { name: "VIEW: استعلام له اسم يتصرف كجدول", primary: "VIEW virtual table named query reusable abstraction" },
                { name: "CREATE VIEW: حفظ استعلام معقد باسم بسيط", primary: "CREATE VIEW AS SELECT complex query simple access" },
                { name: "الاستعلام على View كأنه جدول عادي", primary: "SELECT FROM view query virtual table transparent" },
                { name: "OR REPLACE: تحديث View بدون حذفه", primary: "CREATE OR REPLACE VIEW update definition without drop" },
                { name: "View للأمان: إخفاء الأعمدة الحساسة", primary: "VIEW security hide columns sensitive data access control" },
                { name: "View لتبسيط JOINs المعقدة: واجهة مريحة", primary: "VIEW simplify complex JOIN abstraction interface reuse" },
                { name: "قيود View: لماذا لا يمكن تحديث كل View", primary: "updatable VIEW limitations INSERT UPDATE rules conditions" },
                { name: "INSTEAD OF Trigger: VIEW قابل للتحديث", primary: "INSTEAD OF trigger updatable VIEW INSERT UPDATE workaround" },
                { name: "DROP VIEW وتأثيره على الاستعلامات التي تعتمد عليه", primary: "DROP VIEW dependency cascade restrict error reference" },
                { name: "تطبيق: مجموعة Views لـ API قاعدة بيانات نظيفة", primary: "API views set abstraction clean interface secure business" }
              ]
            },
            {
              unit_index: 9, code: "1.6.9",
              name: "مشروع المستوى الأول: نظام إدارة مكتبة كاملة",
              goal: "بناء قاعدة بيانات نظام مكتبة يمنية كاملة من الصفر بكل الجداول والقيود والاستعلامات والتقارير",
              key_concepts: ["Library System", "Complete Project", "DDL DML", "Full Database", "L1 Capstone"],
              lessons: [
                { name: "تحليل متطلبات نظام المكتبة وتصميم ERD", primary: "library ERD books authors members loans categories design" },
                { name: "بناء كل الجداول بالقيود الكاملة", primary: "CREATE TABLE books authors members loans full constraints" },
                { name: "إدراج بيانات حقيقية: كتب ومؤلفين وأعضاء", primary: "INSERT seed data books authors members Yemen realistic" },
                { name: "استعلامات الكتالوج: البحث والتصفية", primary: "catalog search filter LIKE WHERE books available query" },
                { name: "استعلامات الاستعارة: من استعار ماذا ومتى", primary: "loans borrowing JOIN members books date query" },
                { name: "تقرير الكتب المتأخرة وحساب الغرامة", primary: "overdue books late fee calculation CASE date AGE report" },
                { name: "تقرير أكثر الكتب استعارة وأكثر الأعضاء نشاطاً", primary: "popular books active members GROUP BY COUNT ORDER BY" },
                { name: "Views للواجهات المختلفة: عضو/أمين مكتبة/مدير", primary: "views roles member librarian admin interface security" },
                { name: "صيانة قاعدة البيانات: تحديث وحذف آمن", primary: "maintenance UPDATE DELETE soft delete archive library" },
                { name: "توثيق المشروع وإعداده للإنتاج", primary: "documentation schema comments data dictionary production ready" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "مشروع المستوى الأول: نظام متكامل",
          goal: "توحيد كل مهارات المستوى الأول في مشروع نظام إدارة مدرسة يمنية كاملة من التصميم للتقارير",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.7.1",
              name: "تحليل المتطلبات وتصميم النظام",
              goal: "تحليل متطلبات نظام مدرسي حقيقي وتحويلها لتصميم قاعدة بيانات محكم قبل كتابة أي كود",
              key_concepts: ["Requirements Analysis", "Stakeholders", "User Stories", "Data Entities", "Design First"],
              lessons: [
                { name: "جمع المتطلبات: ماذا يحتاج مدير المدرسة", primary: "requirements school system principal teacher students needs" },
                { name: "تحديد الكيانات الرئيسية وعلاقاتها", primary: "entities students teachers classes subjects grades relations" },
                { name: "قصص المستخدم: من يفعل ماذا في النظام", primary: "user stories teacher view grades student enrollment system" },
                { name: "قرارات التصميم: ما نخزّنه وما نحسبه", primary: "design decisions stored computed calculated derived fields" },
                { name: "رسم ERD شامل للنظام المدرسي", primary: "school ERD complete diagram students classes teachers" },
                { name: "التطبيع: التحقق من 1NF و2NF و3NF", primary: "normalization check 1NF 2NF 3NF school schema validate" },
                { name: "Data Dictionary: توثيق كل جدول وعمود", primary: "data dictionary documentation every table column type rule" },
                { name: "تحديد الـ Indexes المطلوبة مسبقاً", primary: "indexes planning needed columns WHERE JOIN performance" },
                { name: "مراجعة التصميم: هل يجيب على كل أسئلة الأعمال", primary: "design review business questions answer all queries" },
                { name: "الموافقة على التصميم: جاهزون للبناء", primary: "design approval finalize schema ready implementation" }
              ]
            },
            {
              unit_index: 2, code: "1.7.2",
              name: "بناء قاعدة البيانات: الجداول والقيود",
              goal: "ترجمة تصميم ERD لـ SQL كامل مع كل الجداول والقيود والمفاتيح والعلاقات",
              key_concepts: ["CREATE TABLE", "Constraints", "Foreign Keys", "Schema Build", "Implementation"],
              lessons: [
                { name: "إنشاء جداول الكيانات الأساسية", primary: "CREATE TABLE students teachers subjects core entities" },
                { name: "إنشاء جداول العلاقات والوسائط", primary: "CREATE junction tables enrollments grades assignments" },
                { name: "إضافة كل القيود والمفاتيح الخارجية", primary: "FOREIGN KEY NOT NULL UNIQUE CHECK constraints complete" },
                { name: "إضافة أعمدة الـ Audit: created_at وupdated_at", primary: "audit columns created_at updated_at timestamp automatic" },
                { name: "إنشاء الـ Sequences والمعرّفات التلقائية", primary: "SEQUENCE IDENTITY auto-increment all tables primary keys" },
                { name: "اختبار القيود: هل تمنع البيانات الخاطئة", primary: "test constraints insert invalid data rejection CHECK FK" },
                { name: "إنشاء الـ Indexes المخططة للأعمدة المهمة", primary: "CREATE INDEX planned columns WHERE JOIN performance" },
                { name: "Views الأساسية لتبسيط الاستعلامات", primary: "CREATE VIEW basic simplification student info grades" },
                { name: "script.sql: ملف بناء قاعدة البيانات الكاملة", primary: "SQL script complete build file reproducible schema" },
                { name: "التحقق من اكتمال البناء وقراءة DESCRIBE", primary: "verify build \\d DESCRIBE all tables constraints check" }
              ]
            },
            {
              unit_index: 3, code: "1.7.3",
              name: "تحميل البيانات الأولية",
              goal: "تحميل بيانات واقعية تعكس بيئة مدرسية يمنية حقيقية لاختبار كل السيناريوهات المطلوبة",
              key_concepts: ["Seed Data", "INSERT", "Realistic Data", "Test Cases", "Data Quality"],
              lessons: [
                { name: "تصميم بيانات الاختبار: ماذا نحتاج تغطيته", primary: "test data design scenarios cover edge cases complete" },
                { name: "إدراج بيانات المعلمين والمواد والصفوف", primary: "INSERT teachers subjects classes seed realistic Yemen" },
                { name: "إدراج بيانات الطلاب والتسجيلات", primary: "INSERT students enrollments classes grade year Yemen" },
                { name: "إدراج درجات وواجبات متنوعة الحالات", primary: "INSERT grades assignments diverse scores NULL missing" },
                { name: "إدراج بيانات حضور وغياب", primary: "INSERT attendance present absent excuse date records" },
                { name: "التحقق من سلامة البيانات المدرجة", primary: "verify data integrity FK counts NULL expected correct" },
                { name: "حالات الاختبار الحدية: NULL وقيم متطرفة", primary: "edge cases NULL zero maximum NULL fields test boundary" },
                { name: "seed.sql: ملف تحميل البيانات الكاملة", primary: "seed SQL file complete data loading reproducible" },
                { name: "إعادة التحميل: كيف تنظف وتبدأ من جديد", primary: "reset TRUNCATE seed reload clean start over database" },
                { name: "فحص نهائي: عد الصفوف في كل جدول", primary: "final check COUNT rows all tables verify seed complete" }
              ]
            },
            {
              unit_index: 4, code: "1.7.4",
              name: "استعلامات الطلاب والأداء الأكاديمي",
              goal: "بناء مجموعة استعلامات متكاملة لاسترجاع وتحليل أداء الطلاب الأكاديمي",
              key_concepts: ["Student Queries", "Academic Performance", "Grade Analysis", "Attendance", "Reports"],
              lessons: [
                { name: "استعلام ملف الطالب الكامل", primary: "student profile complete data JOIN all related tables" },
                { name: "معدل الطالب: حساب GPA من جدول الدرجات", primary: "GPA average grade calculation AVG GROUP BY student" },
                { name: "ترتيب الطلاب على مستوى الصف", primary: "student ranking ORDER BY GPA class rank position" },
                { name: "تحليل الغياب: نسبة حضور كل طالب", primary: "attendance analysis percentage present absent student" },
                { name: "الطلاب المتفوقون: شروط متعددة للتميز", primary: "top students GPA attendance participation combined WHERE" },
                { name: "الطلاب في خطر: أداء ضعيف ويحتاج تدخل", primary: "at-risk students low GPA high absence intervention" },
                { name: "تقرير مادة بمادة: أداء الطالب في كل مادة", primary: "per-subject student performance CASE grade level report" },
                { name: "مقارنة طالب بمتوسط صفه", primary: "compare student class average subquery HAVING benchmark" },
                { name: "تاريخ تطور درجات الطالب عبر الزمن", primary: "grade history timeline student progression DATE ORDER BY" },
                { name: "تطبيق: إنتاج تقرير الطالب الشامل لولي الأمر", primary: "parent report student full performance attendance output" }
              ]
            },
            {
              unit_index: 5, code: "1.7.5",
              name: "استعلامات المعلمين والمناهج",
              goal: "بناء استعلامات إدارة المعلمين وتحميل المناهج وأداء الفصول الدراسية",
              key_concepts: ["Teacher Queries", "Class Performance", "Curriculum", "Workload", "Section"],
              lessons: [
                { name: "استعلام قائمة مواد كل معلم وعبء التدريس", primary: "teacher subjects workload count classes assigned query" },
                { name: "أداء صف المعلم: متوسط درجات طلابه", primary: "teacher class performance AVG student grades comparison" },
                { name: "أفضل المعلمين بناءً على نتائج الطلاب", primary: "best teachers student grades ranking AVG ORDER BY" },
                { name: "جدول الحصص: من يدرّس ماذا ومتى", primary: "schedule timetable teacher subject time slot query JOIN" },
                { name: "المعلمون الغائبون وساعات الغياب", primary: "absent teachers hours count attendance substitute class" },
                { name: "تغطية المنهج: كم درساً أنجز كل صف", primary: "curriculum coverage completed lessons percentage class" },
                { name: "مقارنة أداء فصلين دراسيين للمادة نفسها", primary: "class section comparison same subject different teachers" },
                { name: "تقرير المعلم لمديره: إنجازاته وتحدياته", primary: "teacher report principal achievements challenges grades" },
                { name: "توزيع الدرجات: Bell Curve للصف الدراسي", primary: "grade distribution histogram CASE NTILE count frequency" },
                { name: "تقرير شهري لأداء الفصل الدراسي", primary: "monthly class performance report GROUP BY DATE trend" }
              ]
            },
            {
              unit_index: 6, code: "1.7.6",
              name: "التقارير الإدارية والإحصاءات المدرسية",
              goal: "بناء تقارير إدارية شاملة للمدير والإدارة العليا لاتخاذ قرارات مدرسية مبنية على بيانات",
              key_concepts: ["Administrative Reports", "School Statistics", "Management Dashboard", "KPI", "Decision Support"],
              lessons: [
                { name: "إجمالي الطلاب: توزيع بالصف والجنس والعام", primary: "total students distribution grade gender year GROUP BY" },
                { name: "نسبة النجاح والرسوب لكل مادة وصف", primary: "pass fail rate subject class percentage CASE GROUP BY" },
                { name: "مقارنة الفصل الدراسي الحالي بالسابق", primary: "current vs previous semester comparison GROUP BY CASE" },
                { name: "الطلاب المنقولين والمستجدين والمتسربين", primary: "enrolled withdrawn transferred students status tracking" },
                { name: "تقرير المالية: الرسوم المدفوعة والمتأخرة", primary: "finance fees paid pending overdue students report" },
                { name: "تقرير الموارد: استخدام القاعات والمعامل", primary: "resources classrooms labs utilization schedule report" },
                { name: "مؤشرات الأداء الرئيسية: KPIs المدرسية", primary: "school KPI pass rate attendance teacher ratio metrics" },
                { name: "تقرير مجلس الأولياء: ملخص شامل للمدرسة", primary: "parents board report school summary performance year" },
                { name: "تقرير لوزارة التعليم: إحصاءات رسمية", primary: "ministry education official statistics report format" },
                { name: "أتمتة التقارير: Views وجداول محسوبة", primary: "automate reports views materialized pre-computed summary" }
              ]
            },
            {
              unit_index: 7, code: "1.7.7",
              name: "الصيانة والتطوير المستمر لقاعدة البيانات",
              goal: "إتقان عمليات الصيانة الدورية وتطوير قاعدة البيانات بأمان لاستيعاب متطلبات جديدة",
              key_concepts: ["Maintenance", "Migration", "ALTER TABLE", "Backup", "Version Control"],
              lessons: [
                { name: "إضافة ميزة جديدة: عمود تقييم السلوك للطالب", primary: "new feature ADD COLUMN behavior rating ALTER TABLE" },
                { name: "إضافة جدول جديد: نظام الأنشطة اللاصفية", primary: "new table extracurricular activities ALTER schema add" },
                { name: "تعديل قيد موجود بدون فقدان بيانات", primary: "modify constraint ALTER TABLE production safe migration" },
                { name: "النسخ الاحتياطية: pg_dump وجدول زمني", primary: "pg_dump backup schedule daily weekly restore strategy" },
                { name: "استعادة قاعدة البيانات من نسخة احتياطية", primary: "pg_restore restore backup point-in-time recovery" },
                { name: "Migration files: ترقيم وتتبع تغييرات Schema", primary: "migration files version numbered SQL changes tracking" },
                { name: "تنظيف البيانات القديمة: Archiving الآمن", primary: "archive old data move separate table safe cleanup" },
                { name: "VACUUM وANALYZE: صيانة دورية ضرورية", primary: "VACUUM ANALYZE bloat statistics performance maintenance" },
                { name: "Monitoring: مراقبة أداء قاعدة البيانات", primary: "monitoring pg_stat slow queries performance alerts" },
                { name: "توثيق التغييرات: Changelog لقاعدة البيانات", primary: "changelog documentation schema changes history version" }
              ]
            },
            {
              unit_index: 8, code: "1.7.8",
              name: "مراجعة المستوى الأول وتحضير للمتقدم",
              goal: "مراجعة شاملة لكل مفاهيم المستوى الأول واختبار الاستعداد للمستوى المتقدم",
              key_concepts: ["L1 Review", "Consolidation", "Self-assessment", "Gaps", "L2 Preview"],
              lessons: [
                { name: "مراجعة DDL: هل أنت مرتاح في بناء الجداول", primary: "DDL review CREATE TABLE ALTER constraints confident" },
                { name: "مراجعة SELECT والتصفية والترتيب", primary: "SELECT WHERE ORDER BY LIMIT DISTINCT review consolidate" },
                { name: "مراجعة دوال النصوص والأرقام والتواريخ", primary: "functions text numeric date review practice consolidate" },
                { name: "مراجعة JOINs: INNER وLEFT وأكثر من جدول", primary: "JOIN review INNER LEFT multi-table consolidate practice" },
                { name: "مراجعة GROUP BY وHAVING والتجميع", primary: "GROUP BY HAVING aggregate review practice consolidate" },
                { name: "مراجعة DML: INSERT وUPDATE وDELETE بأمان", primary: "DML review INSERT UPDATE DELETE safe practice" },
                { name: "الاستعلامات الفرعية البسيطة: مراجعة وتمارين", primary: "subquery simple review WHERE IN SELECT practice" },
                { name: "ماذا يأتي في المستوى الثاني: نظرة مشوّقة", primary: "L2 preview window functions CTEs indexes transactions" },
                { name: "أكثر أخطاء المبتدئين في SQL: تجنبها الآن", primary: "common beginner SQL mistakes avoid pitfalls list" },
                { name: "موارد لمواصلة التعلم والتعمق في SQL", primary: "SQL resources books practice platforms continued learning" }
              ]
            },
            {
              unit_index: 9, code: "1.7.9",
              name: "مشروع L1 النهائي: تسليم كامل ومراجعة",
              goal: "إتمام المشروع المدرسي بكامل متطلباته وتسليمه كمشروع احترافي موثق جاهز للإنتاج",
              key_concepts: ["Final Project", "Deliverable", "Documentation", "Code Review", "Production Ready"],
              lessons: [
                { name: "مراجعة المشروع: هل استوفينا كل المتطلبات", primary: "project review checklist requirements complete school system" },
                { name: "تحسين الاستعلامات: الأبطأ يحصل على فهرس", primary: "query optimization slowest EXPLAIN INDEX add improve" },
                { name: "اكتمال القيود: لا ثغرة في سلامة البيانات", primary: "constraints completeness no gap integrity check review" },
                { name: "Views النهائية: واجهة نظيفة للتطبيق", primary: "final views clean API interface application layer" },
                { name: "script التثبيت الكامل: من صفر للإنتاج", primary: "install script complete from zero production schema data" },
                { name: "توثيق المشروع: README وData Dictionary", primary: "project README data dictionary documentation complete" },
                { name: "اختبار نهائي شامل: كل السيناريوهات تعمل", primary: "final testing all scenarios working complete system" },
                { name: "عرض المشروع: كيف تشرح قاعدة بياناتك لآخرين", primary: "project presentation explain database design decisions" },
                { name: "تقييم ذاتي: ما الذي أتقنته وما يحتاج تعمق", primary: "self assessment mastered needs improvement L1 complete" },
                { name: "الاحتفال والانتقال: مبروك، أنت جاهز للمتقدم", primary: "L1 complete celebration transition L2 advanced ready" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 2,
      name: "SQL المتقدم والاحترافي",
      goal: "إتقان أدوات SQL المتقدمة من دوال النافذة والاستعلامات الهرمية والفهارس والمعاملات والإجراءات المخزنة وميزات PostgreSQL الحديثة لبناء أنظمة بيانات احترافية عالية الأداء",
      bloom_focus: "evaluate",
      exam: { pass_threshold_percent: 75, time_limit_minutes: 75 },
      stages: [
        {
          stage_index: 1,
          name: "الاستعلامات الفرعية المتقدمة والـ CTEs",
          goal: "إتقان الاستعلامات الفرعية المترابطة والـ CTEs البسيطة والمتكررة لبناء استعلامات معقدة قابلة للقراءة والصيانة",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.1.1",
              name: "الاستعلامات الفرعية العميقة",
              goal: "إتقان أنواع الاستعلامات الفرعية في كل مواقع SQL وفهم متى تكون أفضل من JOIN",
              key_concepts: ["Scalar Subquery", "Row Subquery", "Table Subquery", "Correlated", "Performance"],
              lessons: [
                { name: "Scalar Subquery: عمود واحد وصف واحد", primary: "scalar subquery single value row column WHERE SELECT" },
                { name: "Row Subquery: مقارنة صف كامل بتعبير واحد", primary: "row subquery compare multiple columns tuple match" },
                { name: "Table Subquery في FROM: جدول مؤقت حي", primary: "table subquery FROM derived inline view results" },
                { name: "Correlated Subquery: يعاد تنفيذها لكل صف", primary: "correlated subquery outer reference per-row execution" },
                { name: "أداء Correlated Subquery: متى هي كارثة", primary: "correlated subquery performance O(n) slow alternative" },
                { name: "EXISTS: أسرع من IN في حالات كثيرة", primary: "EXISTS correlated subquery performance short-circuit" },
                { name: "NOT EXISTS: بديل أمن لـ NOT IN مع NULL", primary: "NOT EXISTS NULL safe alternative NOT IN subquery" },
                { name: "Subquery في SELECT: إضافة حساب من جدول آخر", primary: "SELECT subquery computed column correlated calculation" },
                { name: "LATERAL: Subquery تستطيع رؤية الصف الأيسر", primary: "LATERAL subquery FROM cross reference left table row" },
                { name: "تطبيق: إيجاد أفضل منتج في كل تصنيف بـ Subquery", primary: "best product per category correlated subquery EXISTS" }
              ]
            },
            {
              unit_index: 2, code: "2.1.2",
              name: "WITH CTEs: الاستعلامات المشتركة",
              goal: "إتقان WITH clause لتقسيم الاستعلامات المعقدة لخطوات مسماة أكثر وضوحاً وقابلية للصيانة",
              key_concepts: ["WITH", "CTE", "Named Query", "Readability", "Multiple CTEs"],
              lessons: [
                { name: "WITH ... AS: تسمية استعلام فرعي لإعادة استخدامه", primary: "WITH CTE AS named subquery reusable readability" },
                { name: "CTE في SELECT: استبدال الجدول الفرعي المتداخل", primary: "CTE replace derived table nested subquery readable" },
                { name: "CTEs متعددة: سلسلة خطوات كل منها تبني على السابق", primary: "multiple CTEs chain steps build upon previous result" },
                { name: "CTE مع JOIN: قراءة استعلام معقد خطوة خطوة", primary: "CTE JOIN complex query step by step readable" },
                { name: "CTE مع GROUP BY: تجميع ثم تصفية ببساطة", primary: "CTE GROUP BY aggregate then filter WHERE readable" },
                { name: "الإشارة لنفس CTE أكثر من مرة في الاستعلام", primary: "CTE reference multiple times self-join performance" },
                { name: "CTE مقابل Subquery: متى تختار أيهما", primary: "CTE vs subquery readability performance choice criteria" },
                { name: "CTE مقابل VIEW: مؤقت لاستعلام أم دائم", primary: "CTE vs VIEW temporary permanent scope comparison" },
                { name: "MATERIALIZED CTE في PostgreSQL: قرار التنفيذ", primary: "MATERIALIZED CTE force evaluate once PostgreSQL hint" },
                { name: "تطبيق: تقرير مبيعات معقد مكتوب بـ CTEs واضحة", primary: "sales report complex CTE readable multiple steps" }
              ]
            },
            {
              unit_index: 3, code: "2.1.3",
              name: "Recursive CTE: قراءة البيانات الهرمية",
              goal: "إتقان Recursive CTE لقراءة الهياكل الهرمية كشجرة التصنيفات والموظفين والتقارير الهرمية",
              key_concepts: ["Recursive CTE", "Hierarchy", "Tree", "Anchor Member", "Recursive Member"],
              lessons: [
                { name: "لماذا Recursive CTE؟ الهرميات ذات العمق الغير محدود", primary: "recursive CTE hierarchy unlimited depth tree self-join" },
                { name: "بنية Recursive CTE: الأساس والخطوة التكرارية", primary: "recursive CTE anchor member recursive union all" },
                { name: "قراءة شجرة الموظفين بكل مستوياتها", primary: "employees hierarchy tree recursive CTE all levels path" },
                { name: "إضافة عمود المستوى (depth) لمعرفة عمق كل عقدة", primary: "depth level counter recursive CTE column track" },
                { name: "إضافة عمود المسار (path) من الجذر للعقدة", primary: "path string recursive CTE root to node full breadcrumb" },
                { name: "حماية من الحلقات اللانهائية في Recursive CTE", primary: "infinite loop protection cycle detection recursive CTE" },
                { name: "LIMIT على Recursive CTE: السيطرة على العمق", primary: "depth limit recursive CTE LIMIT WHERE depth guard" },
                { name: "Recursive CTE للمجموع الهرمي: إجمالي كل فرع", primary: "recursive CTE aggregate hierarchy sum branch total" },
                { name: "BREADTH FIRST وDEPTH FIRST: اتجاه التكرار", primary: "breadth first depth first recursive CTE PostgreSQL" },
                { name: "تطبيق: عرض شجرة تصنيفات المتجر بالكامل", primary: "store category tree recursive CTE all levels display" }
              ]
            },
            {
              unit_index: 4, code: "2.1.4",
              name: "EXISTS وIN المتقدمة: أنماط تصفية قوية",
              goal: "إتقان EXISTS وNOT EXISTS وIN الديناميكية كأنماط احترافية لتصفية البيانات المترابطة",
              key_concepts: ["EXISTS", "NOT EXISTS", "IN Subquery", "Semi-join", "Anti-join"],
              lessons: [
                { name: "Semi-join: إيجاد الصفوف التي لها مطابقة", primary: "semi-join EXISTS IN correlated matching filter pattern" },
                { name: "Anti-join: إيجاد الصفوف التي ليس لها مطابقة", primary: "anti-join NOT EXISTS NOT IN difference exclude pattern" },
                { name: "EXISTS مقابل IN: فرق الأداء في الجداول الكبيرة", primary: "EXISTS vs IN performance large tables optimization" },
                { name: "NOT EXISTS مقابل NOT IN: أيهما أكثر أمانا مع NULL", primary: "NOT EXISTS NOT IN NULL safety behavior difference" },
                { name: "EXISTS في UPDATE: تحديث بناءً على وجود شرط", primary: "UPDATE EXISTS WHERE condition subquery related table" },
                { name: "EXISTS في DELETE: حذف بناءً على شرط في جدول آخر", primary: "DELETE WHERE EXISTS subquery related condition" },
                { name: "Multiple EXISTS: شروط متعددة للوجود", primary: "multiple EXISTS AND OR combined conditions filter" },
                { name: "ALL وANY وSOME: مقارنة مع نتيجة استعلام", primary: "ALL ANY SOME comparison subquery all values match" },
                { name: "IN مع Composite Key: مقارنة عدة أعمدة معاً", primary: "IN tuple composite key multiple columns comparison" },
                { name: "تطبيق: تقرير المنتجات التي لم تُطلَب أبداً", primary: "never ordered products NOT EXISTS report inventory" }
              ]
            },
            {
              unit_index: 5, code: "2.1.5",
              name: "Subqueries في INSERT وUPDATE وDELETE",
              goal: "استخدام الاستعلامات الفرعية في DML لتعديل بيانات مبني على بيانات جداول أخرى",
              key_concepts: ["DML Subquery", "INSERT SELECT", "UPDATE FROM", "DELETE WHERE EXISTS", "Derived Data"],
              lessons: [
                { name: "INSERT ... SELECT من استعلام معقد", primary: "INSERT SELECT subquery complex aggregated data migration" },
                { name: "نسخ بيانات بين جداول بـ INSERT SELECT", primary: "INSERT SELECT copy migrate data tables schema match" },
                { name: "INSERT نتيجة CTE: أناقة في الكتابة", primary: "INSERT CTE WITH result clean readable complex data" },
                { name: "UPDATE ... FROM: تحديث بناءً على جدول آخر", primary: "UPDATE FROM join table source values change PostgreSQL" },
                { name: "UPDATE ... WHERE EXISTS: تحديث شرطي بجدول آخر", primary: "UPDATE WHERE EXISTS correlated condition related table" },
                { name: "UPDATE بناءً على Subquery في SET", primary: "UPDATE SET subquery derived value calculate column" },
                { name: "DELETE ... WHERE EXISTS: حذف مرتبط بشرط", primary: "DELETE WHERE EXISTS correlated subquery related condition" },
                { name: "DELETE ... USING: حذف مع JOIN لجدول آخر", primary: "DELETE USING table JOIN condition PostgreSQL" },
                { name: "CTE + DML: تعديل بيانات بخطوات واضحة", primary: "CTE WITH DML INSERT UPDATE DELETE readable steps" },
                { name: "تطبيق: ترحيل بيانات من مخطط قديم لجديد", primary: "data migration old new schema INSERT SELECT CTE" }
              ]
            },
            {
              unit_index: 6, code: "2.1.6",
              name: "تحسين أداء الاستعلامات الفرعية",
              goal: "تشخيص وإصلاح استعلامات فرعية بطيئة وفهم متى يكون JOIN أفضل من Subquery",
              key_concepts: ["Subquery Performance", "N+1 Problem", "JOIN vs Subquery", "EXPLAIN", "Optimization"],
              lessons: [
                { name: "مشكلة N+1: Correlated Subquery البطيئة جداً", primary: "N+1 correlated subquery per-row execution performance" },
                { name: "تشخيص Subquery البطيء بـ EXPLAIN ANALYZE", primary: "EXPLAIN ANALYZE slow subquery diagnosis nested loops" },
                { name: "تحويل Correlated Subquery لـ JOIN: الحل", primary: "correlated to JOIN conversion performance improvement" },
                { name: "Subquery في FROM: هل PostgreSQL تحوّله تلقائياً", primary: "derived table FROM subquery flatten optimization PostgreSQL" },
                { name: "CTE كـ Optimization Fence: يمنع تحسين معين", primary: "CTE fence optimization barrier force evaluate materialize" },
                { name: "متى CTE أبطأ من Subquery المباشر", primary: "CTE slower than inline subquery optimization fence case" },
                { name: "LATERAL JOIN: بديل عالي الأداء لبعض Subqueries", primary: "LATERAL JOIN performance correlated subquery replace" },
                { name: "إعادة كتابة استعلام بطيء: خطوات منهجية", primary: "slow query rewrite systematic steps EXPLAIN JOIN CTE" },
                { name: "مراقبة وتحديد أبطأ الاستعلامات في النظام", primary: "pg_stat_statements slow queries monitoring identify" },
                { name: "تطبيق: تحويل تقرير N+1 لاستعلام سريع واحد", primary: "N+1 report to single query JOIN performance fix" }
              ]
            },
            {
              unit_index: 7, code: "2.1.7",
              name: "Pivoting وUNPIVOT في SQL",
              goal: "إتقان تقنيات تحويل صفوف لأعمدة وأعمدة لصفوف (pivot/unpivot) في استعلامات تحليلية",
              key_concepts: ["Pivot", "Unpivot", "CASE SUM", "crosstab", "Transpose"],
              lessons: [
                { name: "ما هو Pivot وأين يظهر في التقارير الحقيقية", primary: "pivot table rows to columns cross tabulation report" },
                { name: "Pivot يدوي بـ CASE في GROUP BY", primary: "pivot manual CASE SUM GROUP BY static columns" },
                { name: "Pivot ديناميكي: توليد الأعمدة آلياً", primary: "dynamic pivot generate_series crosstab dynamic columns" },
                { name: "crosstab في PostgreSQL: tablefunc extension", primary: "crosstab tablefunc extension PostgreSQL pivot function" },
                { name: "UNPIVOT: تحويل أعمدة لصفوف مع UNNEST", primary: "unpivot columns to rows UNNEST LATERAL PostgreSQL" },
                { name: "Pivot مع CTEs: قراءة أوضح لبيانات الأقسام", primary: "CTE pivot monthly quarterly department data columns" },
                { name: "مقارنة Pivot في SQL مقابل في التطبيق", primary: "pivot SQL vs application layer trade-off performance" },
                { name: "JSON لتوليد Pivot ديناميكي من PostgreSQL", primary: "JSON jsonb_object_agg pivot dynamic flexible output" },
                { name: "تطبيق Pivot في Power BI وExcel مقابل SQL", primary: "pivot BI tools Excel SQL comparison which better" },
                { name: "تطبيق: تقرير مبيعات شهرية في عمود لكل شهر", primary: "monthly sales pivot 12 columns CASE SUM GROUP BY" }
              ]
            },
            {
              unit_index: 8, code: "2.1.8",
              name: "الاستعلامات الاحترافية: أنماط متكررة في العمل",
              goal: "إتقان أنماط الاستعلام الاحترافية التي تتكرر في أغلب مشاريع البيانات الحقيقية",
              key_concepts: ["Top N Per Group", "Deduplication", "Running Total", "Gap Fill", "Median"],
              lessons: [
                { name: "Top N Per Group: أفضل N لكل تصنيف", primary: "top N per group subquery ROW_NUMBER partition category" },
                { name: "Latest Record Per Group: آخر صف لكل كيان", primary: "latest record per entity MAX subquery or window join" },
                { name: "Deduplication: إزالة التكرارات الفعلية من الجداول", primary: "deduplication remove duplicates ROW_NUMBER keep one" },
                { name: "Gap and Island: إيجاد التسلسلات المنقطعة", primary: "gaps islands consecutive sequences missing dates rows" },
                { name: "Running Total: الإجمالي التراكمي متصاعداً", primary: "running total cumulative sum window ORDER BY SUM" },
                { name: "Median: الوسيط الإحصائي في SQL", primary: "median PERCENTILE_CONT 0.5 PostgreSQL statistical" },
                { name: "Percentile: النسب المئوية التوزيعية", primary: "percentile PERCENTILE_CONT PERCENTILE_DISC distribution" },
                { name: "Histogram: توزيع البيانات في مجموعات", primary: "histogram bucket WIDTH_BUCKET frequency distribution" },
                { name: "Date Series Fill: ملء الأيام الفارغة", primary: "generate_series date gap fill left join zero missing" },
                { name: "تطبيق: مجموعة استعلامات تحليلية جاهزة للنسخ", primary: "analytical query library reusable patterns template" }
              ]
            },
            {
              unit_index: 9, code: "2.1.9",
              name: "مشروع: نظام تتبع أداء موظفين بـ CTEs وSubqueries",
              goal: "بناء نظام تحليلي لتتبع أداء الموظفين باستخدام CTEs والاستعلامات الفرعية المتقدمة",
              key_concepts: ["Employee Tracking", "Performance Analytics", "CTE Applied", "Hierarchical", "Reports"],
              lessons: [
                { name: "تصميم قاعدة بيانات أداء الموظفين", primary: "employee performance database design hierarchy KPI" },
                { name: "شجرة التنظيم الهرمية بـ Recursive CTE", primary: "org chart recursive CTE hierarchy all levels reporting" },
                { name: "تقرير أداء كل موظف بالنسبة لفريقه", primary: "employee performance relative team average CTE compare" },
                { name: "تقرير Top N موظف في كل قسم", primary: "top N employee per department CTE subquery ranking" },
                { name: "تتبع تطور الأداء عبر الربع السنوي", primary: "quarterly performance progression CTE time series trend" },
                { name: "إيجاد الفجوات في تقييمات الأداء المفقودة", primary: "missing evaluations gaps employees NOT EXISTS find" },
                { name: "تقرير المدير: أداء كل فريق مقارنة بالأهداف", primary: "manager report team performance vs target CTE compare" },
                { name: "الموظفون المرشحون للترقية: شروط مركبة", primary: "promotion candidates multiple conditions CTE combined" },
                { name: "تقرير التوزيع الإحصائي للأداء", primary: "statistical distribution performance histogram percentile" },
                { name: "تصدير التقرير: JSON_AGG لـ API مباشر", primary: "export report JSON_AGG API response format CTE" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "دوال النافذة - Window Functions",
          goal: "إتقان Window Functions من ROW_NUMBER وRANK للتحليل المتقدم وLEAD وLAG والمتوسطات المتحركة والإجماليات التراكمية",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.2.1",
              name: "مفهوم دوال النافذة وOVER()",
              goal: "فهم ما تُحلّه دوال النافذة ومتى تكون ضرورية ولا يمكن الاستغناء عنها",
              key_concepts: ["Window Function", "OVER", "Partition", "Frame", "Analytic"],
              lessons: [
                { name: "المشكلة التي تحلّها دوال النافذة", primary: "window function problem solve GROUP BY loses rows" },
                { name: "دالة النافذة مقابل دالة التجميع: الفرق الجوهري", primary: "window vs aggregate function rows preserved per-row" },
                { name: "OVER(): النافذة الكاملة بدون تقسيم", primary: "OVER empty parentheses full table window function" },
                { name: "دوال النافذة في SELECT: نتيجة لكل صف", primary: "window function SELECT per row result keep all rows" },
                { name: "PARTITION BY داخل OVER: تقسيم النافذة", primary: "PARTITION BY window group subset per category" },
                { name: "ORDER BY داخل OVER: ترتيب الحساب", primary: "ORDER BY OVER window function sort calculation running" },
                { name: "Frame: نطاق الصفوف في الحساب", primary: "frame ROWS RANGE BETWEEN window function scope" },
                { name: "ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW", primary: "ROWS BETWEEN frame unbounded preceding current cumulative" },
                { name: "أسماء النوافذ: WINDOW clause لإعادة الاستخدام", primary: "WINDOW clause named window reuse definition multiple" },
                { name: "تطبيق: مقارنة مبيعات كل موظف بإجمالي الفريق", primary: "employee sales team total window OVER PARTITION BY" }
              ]
            },
            {
              unit_index: 2, code: "2.2.2",
              name: "ROW_NUMBER وRANK وDENSE_RANK",
              goal: "إتقان دوال الترتيب والترقيم لأغراض تحليلية متنوعة من التصنيف للتصفية الذكية",
              key_concepts: ["ROW_NUMBER", "RANK", "DENSE_RANK", "Tie Handling", "Top N"],
              lessons: [
                { name: "ROW_NUMBER: رقم تسلسلي فريد لكل صف", primary: "ROW_NUMBER sequential unique number per row partition" },
                { name: "ROW_NUMBER لإزالة التكرارات: احتفظ بالأول", primary: "ROW_NUMBER deduplication keep first row CTE WHERE" },
                { name: "RANK: ترتيب مع قفز عند التعادل", primary: "RANK tie skip gaps 1 2 2 4 equal values" },
                { name: "DENSE_RANK: ترتيب متصل بدون قفز", primary: "DENSE_RANK no gaps 1 2 2 3 consecutive ties" },
                { name: "متى RANK ومتى DENSE_RANK: قرار التحليل", primary: "RANK vs DENSE_RANK choice analytic ranking decision" },
                { name: "Top N per Group بـ ROW_NUMBER في CTE", primary: "top N per group ROW_NUMBER CTE WHERE row_num <= N" },
                { name: "الحصول على المنتج الأرخص في كل تصنيف", primary: "cheapest product per category ROW_NUMBER PARTITION BY" },
                { name: "ترقيم الصفوف بترتيبين مختلفين معاً", primary: "multiple ROW_NUMBER different ORDER BY two rankings" },
                { name: "PERCENT_RANK وCUME_DIST: الرتبة النسبية", primary: "PERCENT_RANK CUME_DIST relative rank percentage position" },
                { name: "تطبيق: تقرير ترتيب المبيعات بكل قسم", primary: "sales ranking DENSE_RANK department partition report" }
              ]
            },
            {
              unit_index: 3, code: "2.2.3",
              name: "LEAD وLAG: الوصول لصفوف مجاورة",
              goal: "إتقان LEAD وLAG للمقارنة بين الصف الحالي والصف السابق/التالي لتحليل التغيرات والاتجاهات",
              key_concepts: ["LEAD", "LAG", "Previous Row", "Next Row", "Period Comparison"],
              lessons: [
                { name: "LAG: قيمة الصف السابق في نفس النافذة", primary: "LAG previous row value offset default window" },
                { name: "LEAD: قيمة الصف التالي في نفس النافذة", primary: "LEAD next row value look ahead window offset" },
                { name: "LAG للمقارنة بالشهر السابق: month over month", primary: "LAG month over month comparison previous value delta" },
                { name: "حساب التغير المطلق والنسبي بـ LAG", primary: "LAG absolute percent change growth rate calculation" },
                { name: "LAG بـ offset أكبر من 1: قبل N صف", primary: "LAG offset N rows back previous period year ago" },
                { name: "LEAD للتوقع: متى ينتهي الحدث التالي", primary: "LEAD next event end date prediction session time" },
                { name: "LAG/LEAD مع PARTITION BY: مقارنة داخل المجموعة", primary: "LAG LEAD PARTITION BY category group comparison" },
                { name: "القيمة الافتراضية في LAG/LEAD: معالجة الحدود", primary: "LAG LEAD default value first last row NULL boundary" },
                { name: "تحليل السلاسل الزمنية: اكتشاف الشذوذات", primary: "time series LAG anomaly detection spike drop analysis" },
                { name: "تطبيق: تقرير نمو المبيعات الأسبوعي", primary: "weekly sales growth LAG percent change trend report" }
              ]
            },
            {
              unit_index: 4, code: "2.2.4",
              name: "FIRST_VALUE وLAST_VALUE وNTH_VALUE",
              goal: "إتقان دوال الوصول لقيم محددة من النافذة لأغراض تحليلية متخصصة",
              key_concepts: ["FIRST_VALUE", "LAST_VALUE", "NTH_VALUE", "Frame Boundary", "Reference Value"],
              lessons: [
                { name: "FIRST_VALUE: أول قيمة في النافذة/المجموعة", primary: "FIRST_VALUE first in window partition reference value" },
                { name: "LAST_VALUE والفخ الشهير: الـ Frame الافتراضي", primary: "LAST_VALUE frame default CURRENT ROW wrong result fix" },
                { name: "LAST_VALUE الصحيح: ROWS BETWEEN ... UNBOUNDED", primary: "LAST_VALUE ROWS BETWEEN UNBOUNDED FOLLOWING correct frame" },
                { name: "NTH_VALUE: قيمة الصف N في النافذة", primary: "NTH_VALUE specific position N window partition" },
                { name: "FIRST_VALUE لمقارنة كل صف بالأول في مجموعته", primary: "FIRST_VALUE compare every row first value benchmark" },
                { name: "LAST_VALUE لمقارنة بالحالة الأخيرة", primary: "LAST_VALUE compare current state latest value" },
                { name: "مقارنة السعر الحالي بأول سعر في التاريخ", primary: "FIRST_VALUE initial price comparison current change" },
                { name: "تطبيق FIRST_VALUE في تحليل Cohort", primary: "FIRST_VALUE cohort analysis first purchase date" },
                { name: "الفرق بين FIRST_VALUE وMIN في OVER: حالة بحالة", primary: "FIRST_VALUE vs MIN OVER ORDER BY different results" },
                { name: "تطبيق: تقرير أداء منذ بداية السنة مقابل الآن", primary: "YTD performance FIRST_VALUE beginning year comparison" }
              ]
            },
            {
              unit_index: 5, code: "2.2.5",
              name: "SUM وAVG المتراكمة والمتحركة",
              goal: "بناء إجماليات تراكمية ومتوسطات متحركة لتحليل الاتجاهات في البيانات الزمنية",
              key_concepts: ["Running Total", "Moving Average", "Cumulative", "Rolling Window", "Frame"],
              lessons: [
                { name: "Running Total: الإجمالي التراكمي لكل صف", primary: "running total SUM OVER ORDER BY cumulative rows" },
                { name: "Running Total بـ PARTITION BY: تراكم داخل مجموعة", primary: "running total partition category group cumulative sum" },
                { name: "المتوسط المتحرك ذو الإطار الثابت: آخر N صف", primary: "moving average rolling window N rows BETWEEN preceding" },
                { name: "ROWS BETWEEN: تحديد نطاق إطار النافذة بالصفوف", primary: "ROWS BETWEEN N PRECEDING CURRENT ROW frame exact" },
                { name: "RANGE BETWEEN: تحديد نطاق بالقيمة لا الصفوف", primary: "RANGE BETWEEN value-based frame window different rows" },
                { name: "7-day Moving Average للمبيعات اليومية", primary: "7 day moving average daily sales smooth trend window" },
                { name: "30-day Rolling Sum: الإجمالي المتحرك", primary: "30 day rolling sum window SUM BETWEEN preceding" },
                { name: "الفرق بين Running وRolling: نقطة البداية", primary: "running cumulative vs rolling moving window difference" },
                { name: "Running Percentage: نسبة كل صف من الإجمالي", primary: "running percentage share each row total cumulative" },
                { name: "تطبيق: لوحة مبيعات بإجماليات ومتوسطات متحركة", primary: "sales dashboard running total moving average chart data" }
              ]
            },
            {
              unit_index: 6, code: "2.2.6",
              name: "NTILE والتوزيع في مجموعات",
              goal: "إتقان NTILE لتقسيم البيانات لمجموعات متساوية وتطبيقه في تحليل الشرائح والشرائح المئوية",
              key_concepts: ["NTILE", "Quartile", "Decile", "Percentile Bucket", "Segment"],
              lessons: [
                { name: "NTILE(N): تقسيم الصفوف لـ N مجموعة متساوية", primary: "NTILE N buckets equal groups partition distribution" },
                { name: "Quartile: تقسيم لـ 4 مجموعات (NTILE(4))", primary: "quartile NTILE 4 Q1 Q2 Q3 Q4 distribution analysis" },
                { name: "Decile: تقسيم لـ 10 مجموعات (NTILE(10))", primary: "decile NTILE 10 segments distribution ten equal groups" },
                { name: "تقسيم العملاء لشرائح بناءً على الإنفاق", primary: "customer segments NTILE spending quintile classification" },
                { name: "NTILE مقابل PERCENT_RANK: الفرق التطبيقي", primary: "NTILE vs PERCENT_RANK bucket vs relative position" },
                { name: "الشريحة العليا: من هم أفضل 25% عملاء", primary: "top quartile NTILE WHERE bucket = 1 best customers" },
                { name: "تحليل RFM: Recency Frequency Monetary بـ NTILE", primary: "RFM analysis NTILE recency frequency monetary segments" },
                { name: "Winsorization: قطع الشذوذات بـ Percentile", primary: "winsorize outlier PERCENTILE_CONT cap limit extreme" },
                { name: "تصور توزيع البيانات: Histogram بـ NTILE", primary: "histogram distribution NTILE WIDTH_BUCKET count visual" },
                { name: "تطبيق: تحليل شرائح عملاء لقرار تسويقي", primary: "customer segmentation NTILE RFM marketing decision" }
              ]
            },
            {
              unit_index: 7, code: "2.2.7",
              name: "Window Functions متقدمة وأنماط عملية",
              goal: "إتقان الأنماط المتقدمة لدوال النافذة في تحليل البيانات الحقيقية المعقدة",
              key_concepts: ["Advanced Patterns", "Session Analysis", "Funnel", "Retention", "Sequence"],
              lessons: [
                { name: "Session Analysis: تحديد جلسات المستخدم بـ LAG", primary: "session analysis LAG gap idle timeout window function" },
                { name: "Funnel Analysis: نسبة التحويل بين خطوات", primary: "funnel analysis step conversion rate window COUNT" },
                { name: "Retention Analysis: هل عاد المستخدم في الشهر التالي", primary: "retention cohort month return LAG window analysis" },
                { name: "تحليل التسلسل: من أين جاء الطلب بعد أي خطوة", primary: "sequence analysis LAG LEAD path user journey tracking" },
                { name: "Streak Analysis: أيام متتالية نشط فيها المستخدم", primary: "streak consecutive active days GAP ISLAND window" },
                { name: "Last Active: آخر نشاط لكل مستخدم بـ Window", primary: "last active MAX OVER PARTITION BY user latest" },
                { name: "Market Basket: المنتجات التي تُشترى معاً", primary: "market basket co-purchase window analysis pairs" },
                { name: "Pivoting بـ Window Functions بدون GROUP BY", primary: "pivot window function CASE MAX PARTITION BY row" },
                { name: "نقل نتيجة Window Function لاستعلام WHERE", primary: "CTE window function WHERE filter on result" },
                { name: "تطبيق: تحليل سلوك مستخدمي تطبيق يمني", primary: "user behavior Yemeni app analysis window funnel session" }
              ]
            },
            {
              unit_index: 8, code: "2.2.8",
              name: "أداء دوال النافذة وتحسينها",
              goal: "فهم تأثير دوال النافذة على الأداء وكيفية تحسين الاستعلامات التي تستخدمها",
              key_concepts: ["Window Performance", "Sort Cost", "PARTITION BY Index", "CTE vs Inline", "Optimization"],
              lessons: [
                { name: "تكلفة دوال النافذة: Sort + Aggregate", primary: "window function cost sort aggregate operations EXPLAIN" },
                { name: "أثر PARTITION BY على الذاكرة والأداء", primary: "PARTITION BY memory sort segments performance cost" },
                { name: "ORDER BY في Window: يحتاج Sort دائماً", primary: "ORDER BY OVER sort operation cost index benefit" },
                { name: "هل يستفيد Window Function من الفهارس؟", primary: "index window function benefit PARTITION ORDER cover" },
                { name: "EXPLAIN لاستعلام Window Function: ماذا تقرأ", primary: "EXPLAIN window function WindowAgg Sort node reading" },
                { name: "متى يكون Window أبطأ من GROUP BY + JOIN", primary: "window slower GROUP BY JOIN comparison benchmark" },
                { name: "تقليل حجم النافذة: WHERE قبل Window أسرع", primary: "filter before window CTE reduce rows partition cost" },
                { name: "نوافذ متعددة: هل أحسب مرة أم أكثر", primary: "multiple windows reuse computation CTE performance" },
                { name: "Parallel execution لدوال النافذة في PostgreSQL", primary: "parallel window function PostgreSQL concurrent execution" },
                { name: "تطبيق: تحسين تقرير Window بطيء 10x", primary: "optimize slow window report 10x faster CTE filter index" }
              ]
            },
            {
              unit_index: 9, code: "2.2.9",
              name: "مشروع تحليلي: تقارير مالية متقدمة بـ Window Functions",
              goal: "بناء مجموعة تقارير مالية تحليلية احترافية تستخدم دوال النافذة في بيانات مالية يمنية",
              key_concepts: ["Financial Analytics", "Window Applied", "Revenue Analysis", "Trend", "Complete Project"],
              lessons: [
                { name: "إعداد قاعدة بيانات المعاملات المالية", primary: "financial transactions database setup seed Yemen data" },
                { name: "الإجمالي التراكمي للإيرادات الشهري", primary: "monthly revenue running total window cumulative report" },
                { name: "متوسط الإيرادات المتحرك (30 يوم)", primary: "30 day moving average revenue smooth trend window" },
                { name: "ترتيب الفروع بالإيرادات مع RANK", primary: "branch ranking RANK DENSE_RANK revenue period report" },
                { name: "مقارنة كل شهر بالشهر السابق: LAG", primary: "month over month comparison LAG growth decline" },
                { name: "تقرير Cohort: إيرادات العملاء بالشهر الأول", primary: "cohort revenue FIRST_VALUE customer acquisition month" },
                { name: "تقسيم العملاء لشرائح بـ NTILE", primary: "NTILE customer segments revenue distribution quartile" },
                { name: "اكتشاف شهور الذروة والهبوط الموسمي", primary: "peak trough detection window LAG seasonal analysis" },
                { name: "تقرير نمو YTD مقارنة بنفس الفترة من العام الماضي", primary: "YTD year over year comparison LAG window growth" },
                { name: "تصدير التقرير الشامل لـ API بـ JSON_AGG", primary: "export complete financial report JSON API window CTE" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "تحسين الأداء والفهارس",
          goal: "إتقان قراءة خطط التنفيذ وإنشاء الفهارس الصحيحة وتشخيص الاستعلامات البطيئة وتطبيق استراتيجيات تحسين الأداء",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.3.1",
              name: "EXPLAIN ANALYZE: قراءة خطة التنفيذ",
              goal: "إتقان قراءة وتفسير خطة التنفيذ بكل عقدها وقيمها لتشخيص مشاكل الأداء",
              key_concepts: ["EXPLAIN ANALYZE", "Query Plan", "Cost", "Actual Time", "Nodes"],
              lessons: [
                { name: "EXPLAIN مقابل EXPLAIN ANALYZE: متى تستخدم أيهما", primary: "EXPLAIN ANALYZE estimate actual difference timing" },
                { name: "هيكل خطة التنفيذ: شجرة العقد", primary: "execution plan tree nodes nested structure reading" },
                { name: "Cost: startup وtotal وماذا تعنيان", primary: "startup total cost estimate planner PostgreSQL units" },
                { name: "Actual Time: الوقت الفعلي للعقدة", primary: "actual time rows loops execution ANALYZE measurement" },
                { name: "Seq Scan: فحص متسلسل ومتى يكون صحيحاً", primary: "sequential scan Seq Scan full table performance cost" },
                { name: "Index Scan: استخدام الفهرس للوصول المباشر", primary: "index scan B-tree lookup condition fast selective" },
                { name: "Index Only Scan: قراءة الفهرس فقط دون الجدول", primary: "index only scan covering index heap no access" },
                { name: "Bitmap Heap Scan: مزيج بين Index وSeq", primary: "bitmap heap scan bitmap index scan combination batch" },
                { name: "Hash Join وNested Loop وMerge Join", primary: "join algorithm hash loop merge join type choose" },
                { name: "تطبيق: تشخيص استعلام بطيء خطوة بخطوة", primary: "slow query EXPLAIN ANALYZE diagnosis step by step fix" }
              ]
            },
            {
              unit_index: 2, code: "2.3.2",
              name: "إنشاء الفهارس B-Tree وتأثيرها",
              goal: "إتقان إنشاء الفهارس وفهم كيف تعمل وكيف تُسرّع الاستعلامات الشائعة",
              key_concepts: ["B-tree Index", "CREATE INDEX", "Index Scan", "Selectivity", "Index Cost"],
              lessons: [
                { name: "كيف يعمل الفهرس B-tree: البنية الداخلية", primary: "B-tree index structure internal pages leaves balance" },
                { name: "CREATE INDEX: إنشاء فهرس على عمود", primary: "CREATE INDEX column basic B-tree table performance" },
                { name: "Selectivity: لماذا الفهرس مفيد فقط على عمود انتقائي", primary: "selectivity high low cardinality index useful not" },
                { name: "متى يختار Postgres الفهرس ومتى يتجاهله", primary: "planner choose index vs seq scan threshold statistics" },
                { name: "Concurrent Index: إنشاء فهرس دون تأثير الإنتاج", primary: "CREATE INDEX CONCURRENTLY production no lock build" },
                { name: "تأثير الفهرس على INSERT وUPDATE وDELETE", primary: "index write overhead INSERT UPDATE DELETE maintenance" },
                { name: "الفهارس الزائدة: تكلفة مرتفعة وفائدة صفرية", primary: "redundant indexes cost overhead low selectivity waste" },
                { name: "REINDEX: إعادة بناء فهرس تالف أو منتفخ", primary: "REINDEX rebuild index bloat corruption fix" },
                { name: "pg_stat_user_indexes: هل يُستخدم الفهرس فعلاً", primary: "pg_stat_user_indexes usage scan miss hit monitor" },
                { name: "تطبيق: إضافة فهارس لقاعدة بيانات بطيئة وقياس التحسن", primary: "add indexes slow database measure improvement before after" }
              ]
            },
            {
              unit_index: 3, code: "2.3.3",
              name: "الفهارس المركبة والجزئية والمخصصة",
              goal: "إتقان أنواع الفهارس المتقدمة لحالات استخدام متخصصة تتجاوز الفهرس البسيط",
              key_concepts: ["Composite Index", "Partial Index", "Covering Index", "Expression Index", "Hash Index"],
              lessons: [
                { name: "Composite Index: فهرس على أعمدة متعددة", primary: "composite index multiple columns column order matters" },
                { name: "ترتيب الأعمدة في الفهرس المركب: القاعدة الذهبية", primary: "column order composite index leading column WHERE AND" },
                { name: "Partial Index: فهرس على جزء من البيانات", primary: "partial index WHERE condition active status less rows" },
                { name: "Partial Index لـ Soft Delete: فهرس السجلات النشطة", primary: "partial index WHERE is_deleted=false active records" },
                { name: "Expression Index: فهرس على تعبير أو دالة", primary: "expression index LOWER function immutable fast search" },
                { name: "Covering Index: تضمين أعمدة إضافية في الفهرس", primary: "covering index INCLUDE columns index only scan no heap" },
                { name: "Hash Index: متى أسرع من B-tree", primary: "hash index equality only faster than B-tree specific" },
                { name: "GIN Index للبحث النصي والـ JSONB", primary: "GIN index full text search JSONB array containment" },
                { name: "BRIN Index لبيانات مرتبة طبيعياً كالتواريخ", primary: "BRIN index large sorted timestamp append-only fast" },
                { name: "تطبيق: بناء استراتيجية فهرسة كاملة لتطبيق", primary: "indexing strategy complete application queries coverage" }
              ]
            },
            {
              unit_index: 4, code: "2.3.4",
              name: "إحصاءات قاعدة البيانات وأداء المُخطّط",
              goal: "فهم كيف تستخدم PostgreSQL الإحصاءات لاتخاذ قرارات التنفيذ وكيف تُصحّح قرارات خاطئة",
              key_concepts: ["Statistics", "ANALYZE", "Planner", "Row Estimate", "autovacuum"],
              lessons: [
                { name: "الإحصاءات: كيف يقدّر Postgres عدد الصفوف", primary: "statistics row estimate planner catalog pg_statistics" },
                { name: "ANALYZE: تحديث إحصاءات الجداول يدوياً", primary: "ANALYZE update statistics planner accuracy table" },
                { name: "autovacuum: من يجري ANALYZE تلقائياً", primary: "autovacuum automatic ANALYZE statistics update threshold" },
                { name: "default_statistics_target: دقة إحصاءات أعلى", primary: "statistics_target ALTER COLUMN SET histogram planner" },
                { name: "pg_stats: قراءة الإحصاءات المخزنة", primary: "pg_stats histogram most_common_values correlation read" },
                { name: "سوء تقدير الصفوف: كيف يُدمّر الأداء", primary: "row estimate bad wrong plan nested loop seq scan" },
                { name: "Correlation: مدى ارتباط قيم العمود بترتيب الجدول", primary: "correlation physical order column index scan benefit" },
                { name: "Extended Statistics: إحصاءات على أعمدة متعددة", primary: "CREATE STATISTICS extended multi-column correlation" },
                { name: "تجاهل الإحصاءات: متى تُجبر خطة بعينها", primary: "force plan enable_seqscan enable_indexscan GUC hint" },
                { name: "تطبيق: تشخيص وإصلاح خطة تنفيذ خاطئة", primary: "wrong plan diagnosis ANALYZE statistics fix correct" }
              ]
            },
            {
              unit_index: 5, code: "2.3.5",
              name: "أنماط تُفسد أداء الاستعلامات",
              goal: "تعلّم أكثر أنماط SQL ضرراً على الأداء والبدائل الأسرع لكل منها",
              key_concepts: ["Anti-patterns", "N+1", "SELECT STAR", "Function in WHERE", "LIKE Leading Wildcard"],
              lessons: [
                { name: "SELECT * في الإنتاج: لماذا تُعيق الأداء", primary: "SELECT star performance over-fetch columns bandwidth" },
                { name: "دوال في WHERE على عمود غير محسوب: يُعطّل الفهرس", primary: "function WHERE column LOWER YEAR index unusable scan" },
                { name: "LIKE '%text%': نمط يمنع الفهرس دائماً", primary: "LIKE leading wildcard index unusable full scan always" },
                { name: "OR على أعمدة مختلفة: يُعقّد التحسين", primary: "OR multiple columns index union alternative rewrite" },
                { name: "Implicit Conversion: تحويل نوع يُعطّل الفهرس", primary: "implicit cast type mismatch index unusable WHERE" },
                { name: "NOT IN مع NULL: نتائج غير متوقعة وبطيئة", primary: "NOT IN NULL empty result unexpected performance anti" },
                { name: "N+1 في الكود: استعلام لكل صف في حلقة", primary: "N+1 loop query per row application code batch fix" },
                { name: "DISTINCT غير الضروري: مؤشر مشكلة تصميم", primary: "unnecessary DISTINCT wrong join smell redesign" },
                { name: "ORDER BY في Subquery: بلا تأثير وتكلفة إضافية", primary: "ORDER BY inner subquery pointless wasteful remove" },
                { name: "تطبيق: مراجعة كود SQL موروث وإصلاح 5 أنماط", primary: "legacy SQL review 5 anti-patterns fix performance improve" }
              ]
            },
            {
              unit_index: 6, code: "2.3.6",
              name: "pg_stat_statements وتحديد الاستعلامات البطيئة",
              goal: "استخدام pg_stat_statements ومؤشرات الأداء لتحديد أبطأ الاستعلامات في النظام وإصلاحها",
              key_concepts: ["pg_stat_statements", "Slow Log", "Query Monitoring", "Performance Dashboard", "Profiling"],
              lessons: [
                { name: "تفعيل pg_stat_statements: ضبط الإعدادات", primary: "pg_stat_statements enable shared_preload_libraries config" },
                { name: "الاستعلام عن أبطأ 10 استعلامات في النظام", primary: "pg_stat_statements top 10 slow queries total time mean" },
                { name: "التمييز بين الاستعلام البطيء والمتكرر البطيء", primary: "slow query frequent slow total time mean stddev" },
                { name: "EXPLAIN ANALYZE على استعلام مباشر من الإنتاج", primary: "production EXPLAIN ANALYZE direct query live profiling" },
                { name: "pg_stat_activity: ما يجري الآن في قاعدة البيانات", primary: "pg_stat_activity current queries running lock wait" },
                { name: "Log Slow Queries: ضبط log_min_duration_statement", primary: "slow query log log_min_duration_statement log file" },
                { name: "auto_explain: EXPLAIN تلقائي للبطيئة فقط", primary: "auto_explain extension automatic EXPLAIN slow queries" },
                { name: "Connection Pooling وأثره على الاستعلامات", primary: "connection pooling PgBouncer pgPool performance overhead" },
                { name: "Bloat: الجداول والفهارس المنتفخة وتأثيرها", primary: "bloat table index dead rows VACUUM performance metric" },
                { name: "تطبيق: تقرير صحة شامل لقاعدة بيانات إنتاجية", primary: "health check production database comprehensive report" }
              ]
            },
            {
              unit_index: 7, code: "2.3.7",
              name: "VACUUM وصيانة قاعدة البيانات",
              goal: "إتقان عمليات الصيانة الدورية لضمان أداء قاعدة البيانات وتجنب مشاكل الـ Bloat والـ XID Wraparound",
              key_concepts: ["VACUUM", "AUTOVACUUM", "Bloat", "ANALYZE", "Maintenance"],
              lessons: [
                { name: "MVCC: لماذا تنشأ الصفوف الميتة (Dead Tuples)", primary: "MVCC dead tuples UPDATE DELETE versioning PostgreSQL" },
                { name: "Table Bloat: حين تنتفخ الجداول ببيانات ميتة", primary: "table bloat dead tuples wasted space performance" },
                { name: "VACUUM: تنظيف الصفوف الميتة وإعادة الفضاء", primary: "VACUUM clean dead tuples free space reuse PostgreSQL" },
                { name: "VACUUM FULL: إعادة بناء الجدول بالكامل", primary: "VACUUM FULL rewrite table lock exclusive bloat fix" },
                { name: "autovacuum: الصيانة التلقائية وإعداداتها", primary: "autovacuum settings threshold scale_factor configure" },
                { name: "XID Wraparound: الخطر المخفي وكيف تتجنبه", primary: "XID wraparound freeze vacuum prevent 32-bit limit" },
                { name: "Index Bloat: الفهارس أيضاً تنتفخ", primary: "index bloat dead entries reindex pgstattuple monitor" },
                { name: "CLUSTER: إعادة ترتيب الجدول بترتيب الفهرس", primary: "CLUSTER table physical order index correlation improve" },
                { name: "pg_repack: VACUUM FULL بدون قفل الجدول", primary: "pg_repack online defrag no lock production alternative" },
                { name: "تطبيق: جدول صيانة دورية لقاعدة البيانات", primary: "maintenance schedule VACUUM ANALYZE plan periodic run" }
              ]
            },
            {
              unit_index: 8, code: "2.3.8",
              name: "قواعد بيانات ضخمة: الـ Partitioning",
              goal: "فهم Table Partitioning كاستراتيجية لإدارة الجداول الضخمة وتحسين أداء الاستعلامات الزمنية",
              key_concepts: ["Partitioning", "Range Partition", "Hash Partition", "List Partition", "Partition Pruning"],
              lessons: [
                { name: "لماذا Partitioning؟ جدول مئات الملايين صف", primary: "partitioning huge table performance management scale" },
                { name: "Range Partitioning: تقسيم حسب نطاق (التاريخ)", primary: "range partition date monthly yearly automated PostgreSQL" },
                { name: "List Partitioning: تقسيم حسب قيمة (الدولة)", primary: "list partition country region category value partition" },
                { name: "Hash Partitioning: توزيع متوازن بالـ Hash", primary: "hash partition even distribution load balance key" },
                { name: "Partition Pruning: الاستعلام يقرأ قسم واحد فقط", primary: "partition pruning WHERE clause skip partition performance" },
                { name: "إنشاء Partitioned Table وإضافة الأقسام", primary: "CREATE TABLE PARTITION BY RANGE LIST add partition" },
                { name: "إدارة الأقسام: إضافة شهر جديد وحذف قسم قديم", primary: "manage partitions ADD DETACH DROP archive old data" },
                { name: "Foreign Keys والـ Partitioned Tables: القيود", primary: "partitioned table foreign key limitation workaround" },
                { name: "Global Indexes والـ Local Indexes في Partitioning", primary: "partition index local global scope each parent" },
                { name: "تطبيق: تقسيم جدول أحداث ضخم بالشهر", primary: "partition events table monthly range archive query" }
              ]
            },
            {
              unit_index: 9, code: "2.3.9",
              name: "مشروع: تحسين أداء تطبيق بيانات حقيقي",
              goal: "تطبيق كل استراتيجيات تحسين الأداء على تطبيق بيانات بطيء لتحقيق تحسين مقيس وموثق",
              key_concepts: ["Performance Project", "Before After", "Measure Impact", "Indexing Strategy", "Optimization Complete"],
              lessons: [
                { name: "تقييم قاعدة البيانات المبدئية: قياس الأداء الحالي", primary: "baseline performance measurement EXPLAIN queries timing" },
                { name: "تحديد أبطأ 5 استعلامات بـ pg_stat_statements", primary: "identify top 5 slow pg_stat_statements production" },
                { name: "تشخيص الاستعلام الأبطأ: قراءة EXPLAIN ANALYZE", primary: "slowest query EXPLAIN ANALYZE diagnosis bottleneck" },
                { name: "إضافة فهارس مستهدفة وقياس الأثر", primary: "targeted indexes add measure improvement EXPLAIN before" },
                { name: "إعادة كتابة استعلام غير فعال", primary: "rewrite inefficient query JOIN CTE subquery better" },
                { name: "تحسين استعلام Window Function بطيء", primary: "optimize slow window function CTE filter index" },
                { name: "VACUUM وANALYZE وتأثيرهما الفعلي", primary: "VACUUM ANALYZE run measure bloat statistics improve" },
                { name: "تقرير قبل وبعد: توثيق كل التحسينات", primary: "before after report document improvements timing speedup" },
                { name: "مراقبة مستمرة: ضبط التنبيهات التلقائية", primary: "continuous monitoring alerts slow queries threshold setup" },
                { name: "تسليم تقرير الأداء: نتائج مقيسة وموثقة", primary: "deliver performance report measured documented results" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "المعاملات والموثوقية - ACID",
          goal: "إتقان نظام المعاملات وخصائص ACID ومستويات العزل والأقفال وآليات MVCC لضمان سلامة البيانات",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.4.1",
              name: "لماذا نحتاج المعاملات؟",
              goal: "فهم المشكلات الحقيقية التي تحلّها المعاملات من عدم اتساق البيانات وبيانات جزئية",
              key_concepts: ["Transaction", "Atomicity", "Data Integrity", "Concurrent Access", "Failure Scenario"],
              lessons: [
                { name: "مشكلة تحويل الأموال بلا معاملة: الكارثة", primary: "bank transfer without transaction partial failure problem" },
                { name: "الذرية (Atomicity): إما الكل أو لا شيء", primary: "atomicity all or nothing transaction commit rollback" },
                { name: "مشكلة البيانات الجزئية: INSERT في جدولين", primary: "partial data two tables INSERT only one committed" },
                { name: "مشكلة القراءة المتزامنة: قرأت بيانات تتغير", primary: "concurrent read dirty data changing transaction isolation" },
                { name: "BEGIN/COMMIT/ROLLBACK: دورة المعاملة", primary: "BEGIN COMMIT ROLLBACK transaction lifecycle SQL" },
                { name: "Autocommit: كل أمر معاملة مستقلة", primary: "autocommit implicit transaction each statement mode" },
                { name: "DDL في معاملة: يمكن Rollback في PostgreSQL", primary: "DDL CREATE TABLE inside transaction rollback revert" },
                { name: "طول المعاملة: لماذا القصيرة أفضل دائماً", primary: "short transaction better long held locks performance" },
                { name: "المعاملة المخفقة: ROLLBACK تلقائي عند الخطأ", primary: "failed transaction error ROLLBACK automatic abort state" },
                { name: "تطبيق: تحويل مالي آمن بمعاملة صحيحة", primary: "bank transfer transaction BEGIN COMMIT safe atomic" }
              ]
            },
            {
              unit_index: 2, code: "2.4.2",
              name: "خصائص ACID الأربع",
              goal: "فهم عميق لكل خاصية من خصائص ACID وكيف تضمن PostgreSQL كل منها",
              key_concepts: ["Atomicity", "Consistency", "Isolation", "Durability", "WAL"],
              lessons: [
                { name: "Atomicity: كيف يضمنها PostgreSQL بالـ WAL", primary: "atomicity WAL write ahead log commit rollback guarantee" },
                { name: "Consistency: القيود تبقى صحيحة دائماً", primary: "consistency constraints check FK NOT NULL always valid" },
                { name: "Isolation: المعاملات مستقلة عن بعضها", primary: "isolation transactions independent concurrent don't see" },
                { name: "Durability: البيانات تبقى بعد الكتابة حتى بعد انهيار", primary: "durability WAL disk persist crash recovery guarantee" },
                { name: "WAL: Write-Ahead Log وكيف يعمل", primary: "WAL write ahead log segments redo durability mechanism" },
                { name: "Checkpoint: نقطة التحقق لضمان الديمومة", primary: "checkpoint WAL flush disk durability recovery point" },
                { name: "الـ ACID في قواعد البيانات الحديثة مقابل القديمة", primary: "ACID modern legacy databases BASE NoSQL comparison" },
                { name: "ACID وقواعد NoSQL: ما الذي تتنازل عنه", primary: "NoSQL BASE eventual consistency ACID trade-off" },
                { name: "PostgreSQL وACID: الضمانات الحقيقية والحدود", primary: "PostgreSQL ACID guarantees limits real world production" },
                { name: "تطبيق: اختبار ACID بسيناريوهات إخفاق حقيقية", primary: "ACID test failure scenarios rollback constraint violation" }
              ]
            },
            {
              unit_index: 3, code: "2.4.3",
              name: "SAVEPOINT والمعاملات المتداخلة",
              goal: "إتقان SAVEPOINT للتراجع الجزئي داخل معاملة دون إلغائها كاملاً",
              key_concepts: ["SAVEPOINT", "ROLLBACK TO", "Nested Transaction", "Partial Rollback", "Error Recovery"],
              lessons: [
                { name: "SAVEPOINT: نقطة حفظ داخل المعاملة", primary: "SAVEPOINT name checkpoint inside transaction rollback" },
                { name: "ROLLBACK TO SAVEPOINT: التراجع لنقطة محددة", primary: "ROLLBACK TO SAVEPOINT partial undo keep before point" },
                { name: "RELEASE SAVEPOINT: إلغاء نقطة الحفظ", primary: "RELEASE SAVEPOINT remove no longer needed cleanup" },
                { name: "متى يكون SAVEPOINT مفيداً: معالجة أخطاء جزئية", primary: "SAVEPOINT use case partial error recovery batch insert" },
                { name: "Autonomous Transactions: المعاملة المستقلة (محدود)", primary: "autonomous transaction dblink workaround PostgreSQL limit" },
                { name: "Nested BEGIN في psql: لا توجد معاملات متداخلة حقيقية", primary: "nested BEGIN warning PostgreSQL no real nested support" },
                { name: "المعاملة في كود التطبيق: try/catch مع rollback", primary: "application transaction try catch error rollback code" },
                { name: "Batch Processing بـ SAVEPOINT: معالجة أخطاء فردية", primary: "batch SAVEPOINT per-item rollback continue on error" },
                { name: "PL/pgSQL والمعالجة الاستثنائية: EXCEPTION WHEN", primary: "PL/pgSQL EXCEPTION WHEN subtransaction SAVEPOINT" },
                { name: "تطبيق: استيراد ملف CSV مع معالجة أخطاء جزئية", primary: "CSV import SAVEPOINT batch error recovery partial" }
              ]
            },
            {
              unit_index: 4, code: "2.4.4",
              name: "مستويات العزل وأنواع مشاكل التزامن",
              goal: "فهم مستويات العزل الأربعة وأنواع مشاكل التزامن التي تحلّها وتأثيرها على الأداء",
              key_concepts: ["Isolation Level", "Dirty Read", "Non-repeatable Read", "Phantom Read", "Serializable"],
              lessons: [
                { name: "Dirty Read: قراءة بيانات معاملة لم تُكتمل", primary: "dirty read uncommitted data isolation problem level" },
                { name: "Non-repeatable Read: قيمة تتغير بين قراءتين", primary: "non-repeatable read changed value two reads isolation" },
                { name: "Phantom Read: صفوف تظهر أو تختفي بين قراءتين", primary: "phantom read new rows appear disappear isolation" },
                { name: "READ UNCOMMITTED: المستوى الأقل عزلاً (غير موجود فعلاً في Postgres)", primary: "READ UNCOMMITTED isolation level PostgreSQL treated as READ COMMITTED" },
                { name: "READ COMMITTED: المستوى الافتراضي في PostgreSQL", primary: "READ COMMITTED default isolation level PostgreSQL each statement" },
                { name: "REPEATABLE READ: نفس النتيجة في كل قراءة", primary: "REPEATABLE READ same data consistent snapshot transaction" },
                { name: "SERIALIZABLE: معاملات كأنها تنفذ تسلسلياً", primary: "SERIALIZABLE full isolation sequential equivalent expensive" },
                { name: "اختيار مستوى العزل: الأداء مقابل الأمان", primary: "isolation level choice performance safety trade-off" },
                { name: "SET TRANSACTION ISOLATION LEVEL: كيف تضبطه", primary: "SET TRANSACTION ISOLATION LEVEL BEGIN session config" },
                { name: "تطبيق: اختبار كل مستوى عزل بسيناريو تزامن", primary: "isolation level test concurrent scenario demonstrate" }
              ]
            },
            {
              unit_index: 5, code: "2.4.5",
              name: "Locking: الأقفال وإدارة التزامن",
              goal: "فهم أنظمة الأقفال في PostgreSQL وكيفية استخدامها لحماية البيانات من التعديلات المتزامنة",
              key_concepts: ["Row Lock", "Table Lock", "SELECT FOR UPDATE", "SHARE Lock", "Lock Modes"],
              lessons: [
                { name: "Row Locking: قفل صف واحد للتعديل الحصري", primary: "row lock exclusive concurrent modify protection PostgreSQL" },
                { name: "SELECT FOR UPDATE: قفل الصف أثناء القراءة", primary: "SELECT FOR UPDATE lock row read intent update" },
                { name: "SELECT FOR SHARE: قراءة مشتركة لا تمنع أخرى", primary: "SELECT FOR SHARE allow other readers block writers" },
                { name: "SKIP LOCKED: تخطي الصفوف المقفولة", primary: "SKIP LOCKED queue work skip taken jobs concurrent" },
                { name: "NOWAIT: فشل فوري بدل الانتظار على القفل", primary: "NOWAIT immediate fail locked row no wait error" },
                { name: "Table Locks: أقفال على مستوى الجدول", primary: "table lock LOCK TABLE AccessExclusive modes levels" },
                { name: "Advisory Locks: أقفال تطبيقية مخصصة", primary: "advisory lock pg_try_advisory_lock application level" },
                { name: "Lock Queues: الاستعلامات تنتظر على الأقفال", primary: "lock queue waiting pg_locks pg_stat_activity block" },
                { name: "مراقبة الأقفال: pg_locks وكيف تقرأها", primary: "pg_locks monitor granted waiting mode relation" },
                { name: "تطبيق: نظام Queue آمن للمهام بـ SELECT FOR UPDATE", primary: "job queue SELECT FOR UPDATE SKIP LOCKED concurrent safe" }
              ]
            },
            {
              unit_index: 6, code: "2.4.6",
              name: "الـ Deadlock: الجمود وكيف تتجنبه",
              goal: "فهم كيف ينشأ الـ Deadlock وكيف يكتشفه PostgreSQL وكيف تكتب كوداً يتجنبه",
              key_concepts: ["Deadlock", "Cycle Detection", "Lock Order", "Retry Logic", "Prevention"],
              lessons: [
                { name: "Deadlock: حلقة انتظار لا تنتهي بين معاملتين", primary: "deadlock cycle waiting mutual lock two transactions" },
                { name: "كيف يكتشف PostgreSQL الـ Deadlock ويُنهيه", primary: "deadlock detection cycle abort victim rollback error" },
                { name: "سيناريو Deadlock كلاسيكي: A ينتظر B وB ينتظر A", primary: "classic deadlock A waits B B waits A scenario" },
                { name: "قاعدة ترتيب الأقفال: الحل الأكثر موثوقية", primary: "lock ordering same order always prevent deadlock" },
                { name: "SELECT FOR UPDATE ORDER BY: ترتيب ثابت للأقفال", primary: "SELECT FOR UPDATE ORDER BY consistent lock order" },
                { name: "تصغير نطاق المعاملة: تقليل وقت القفل", primary: "short transaction narrow scope lock time reduce risk" },
                { name: "Retry Logic: إعادة المحاولة بعد Deadlock", primary: "retry deadlock exception application code loop try" },
                { name: "Deadlock vs Live Lock: الفرق والحلول", primary: "deadlock vs livelock both blocked difference retry" },
                { name: "log_lock_waits: تسجيل الانتظار الطويل على الأقفال", primary: "log_lock_waits timeout logging detection production" },
                { name: "تطبيق: تصميم نظام يضمن عدم حدوث Deadlock", primary: "deadlock-free design ordering lock scope retry system" }
              ]
            },
            {
              unit_index: 7, code: "2.4.7",
              name: "MVCC: كيف تدير PostgreSQL الإصدارات المتزامنة",
              goal: "فهم MVCC بعمق كآلية أساسية تمكّن PostgreSQL من دعم القراءات والكتابات المتزامنة بكفاءة",
              key_concepts: ["MVCC", "Snapshot", "Visibility", "xmin xmax", "Dead Tuples"],
              lessons: [
                { name: "MVCC: إصدارات متعددة لكل صف في نفس الوقت", primary: "MVCC multi-version concurrency control row versions" },
                { name: "Snapshot: كل معاملة ترى نسخة ثابتة من البيانات", primary: "snapshot consistent view transaction isolation MVCC" },
                { name: "xmin وxmax: كيف يعرف Postgres من يرى ماذا", primary: "xmin xmax transaction id visibility MVCC system columns" },
                { name: "الكتابة لا تحجب القراءة: ميزة MVCC الكبرى", primary: "MVCC reads never blocked by writes concurrency benefit" },
                { name: "Dead Tuples: الصفوف القديمة التي لا أحد يراها", primary: "dead tuples old versions invisible MVCC accumulate" },
                { name: "VACUUM وMVCC: تنظيف الصفوف التي انتهى دورها", primary: "VACUUM MVCC dead tuples cleanup visibility oldest xmin" },
                { name: "Snapshot too old: خطأ عند MVCC تحت ضغط شديد", primary: "snapshot too old error old_snapshot_threshold setting" },
                { name: "Hot Update: تحسين MVCC للتحديثات السريعة", primary: "HOT update heap only tuple same page index no update" },
                { name: "MVCC وقواعد البيانات الأخرى: مقارنة المقاربات", primary: "MVCC locking comparison Oracle SQL Server approaches" },
                { name: "تطبيق: مشاهدة MVCC يعمل بجلستين متزامنتين", primary: "MVCC live demo two sessions concurrent update visibility" }
              ]
            },
            {
              unit_index: 8, code: "2.4.8",
              name: "الأنماط الآمنة للمعاملات في التطبيقات",
              goal: "إتقان أنماط كتابة المعاملات الصحيحة في التطبيقات الحقيقية مع معالجة الأخطاء والتزامن",
              key_concepts: ["Transaction Pattern", "Optimistic Locking", "Pessimistic Locking", "Idempotency", "Retry"],
              lessons: [
                { name: "Pessimistic Locking: اقفل ثم عدّل", primary: "pessimistic locking SELECT FOR UPDATE then modify safe" },
                { name: "Optimistic Locking: حاول وتحقق من التغيير", primary: "optimistic locking version column check update conflict" },
                { name: "Version Column للـ Optimistic Locking", primary: "version column increment check WHERE version=old" },
                { name: "Idempotency: نفس العملية مرتين = نفس النتيجة", primary: "idempotency safe retry operation idempotent key" },
                { name: "Upsert الآمن: ON CONFLICT لمنع Race Condition", primary: "UPSERT ON CONFLICT safe concurrent insert update" },
                { name: "Two-Phase Commit: معاملة على قاعدتي بيانات", primary: "two-phase commit distributed transaction PREPARE XA" },
                { name: "Long Running Transactions: متى هي خطر", primary: "long transaction held locks bloat WAL accumulate risk" },
                { name: "Connection Pooling والمعاملات: اتركها قصيرة", primary: "connection pool transaction short fast return pool" },
                { name: "Compensating Transactions: الإلغاء بدل الـ Rollback", primary: "compensating transaction undo logical reversal saga" },
                { name: "تطبيق: نظام حجز مقاعد آمن من Race Condition", primary: "seat reservation no race condition FOR UPDATE safe" }
              ]
            },
            {
              unit_index: 9, code: "2.4.9",
              name: "مشروع: نظام دفع مالي موثوق بالكامل",
              goal: "بناء نظام دفع مالي يضمن اتساق البيانات تحت ضغط التزامن العالي باستخدام المعاملات والأقفال",
              key_concepts: ["Payment System", "Transaction Applied", "ACID Complete", "Concurrent Safe", "Reliable"],
              lessons: [
                { name: "تصميم قاعدة بيانات نظام الدفع", primary: "payment database design accounts transactions ledger" },
                { name: "تحويل رصيد آمن بين حسابين", primary: "balance transfer safe BEGIN COMMIT ROLLBACK atomic" },
                { name: "منع الرصيد السالب: قيد CHECK والتحقق في المعاملة", primary: "negative balance prevent CHECK FOR UPDATE verify" },
                { name: "Idempotent Payment: منع الدفع المزدوج", primary: "idempotent payment duplicate prevention unique key" },
                { name: "تسجيل كل عملية في Audit Ledger", primary: "audit ledger append-only payment log INSERT" },
                { name: "اختبار التزامن: 100 دفعة متزامنة بدون تعارض", primary: "concurrency test 100 concurrent payments no conflict" },
                { name: "Recovery: استعادة الحالة بعد انهيار مباغت", primary: "recovery crash restart WAL COMMIT incomplete transaction" },
                { name: "تقرير المعاملات المالية مع الأقفال الصحيحة", primary: "financial transaction report locking correct isolation" },
                { name: "Monitoring: مراقبة القفل والانتظار في الإنتاج", primary: "monitoring lock wait deadlock payment system production" },
                { name: "تسليم النظام: اختبارات ACID كاملة موثقة", primary: "ACID complete tests documented payment system delivery" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "Views والإجراءات المخزنة والمشغلات",
          goal: "إتقان Materialized Views والإجراءات المخزنة ودوال PL/pgSQL والمشغلات لبناء منطق أعمال داخل قاعدة البيانات",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.5.1",
              name: "Materialized Views: التخزين المؤقت للاستعلامات الثقيلة",
              goal: "إنشاء وإدارة Materialized Views لتسريع الاستعلامات التحليلية الثقيلة بتخزين نتائجها",
              key_concepts: ["Materialized View", "REFRESH", "Stale Data", "Performance", "Trade-off"],
              lessons: [
                { name: "Materialized View مقابل View العادي: الفرق الجوهري", primary: "materialized view vs regular view stored data refresh" },
                { name: "CREATE MATERIALIZED VIEW: بناء أول Materialized View", primary: "CREATE MATERIALIZED VIEW AS SELECT store result" },
                { name: "REFRESH MATERIALIZED VIEW: تحديث البيانات المخزنة", primary: "REFRESH MATERIALIZED VIEW update stale data latest" },
                { name: "CONCURRENTLY REFRESH: تحديث بدون قفل القراءة", primary: "REFRESH CONCURRENTLY no lock readers concurrent update" },
                { name: "البيانات القديمة (Stale Data): متى مقبول ومتى لا", primary: "stale data acceptable analytics dashboards not real-time" },
                { name: "أتمتة التحديث: pg_cron أو Scheduled Jobs", primary: "automate refresh pg_cron schedule materialized view" },
                { name: "فهرسة Materialized View: اجعلها أسرع", primary: "index materialized view CREATE INDEX columns query" },
                { name: "متى تختار Materialized View مقابل Summary Table", primary: "materialized view vs summary table manual trade-off" },
                { name: "Incremental Refresh: تحديث جزئي (ليس native في Postgres)", primary: "incremental refresh workaround delta update pattern" },
                { name: "تطبيق: Materialized View لتقرير مبيعات ثقيل", primary: "sales report materialized view heavy query fast response" }
              ]
            },
            {
              unit_index: 2, code: "2.5.2",
              name: "دوال SQL البسيطة",
              goal: "كتابة دوال SQL قابلة لإعادة الاستخدام لتجميع المنطق المتكرر وتبسيط الاستعلامات",
              key_concepts: ["SQL Function", "CREATE FUNCTION", "RETURNS", "VOLATILE STABLE IMMUTABLE", "Parameters"],
              lessons: [
                { name: "CREATE FUNCTION: تعريف دالة SQL بسيطة", primary: "CREATE FUNCTION SQL returns parameter basic definition" },
                { name: "RETURNS: تحديد نوع البيانات المُعادة", primary: "RETURNS type SQL function integer text table setof" },
                { name: "LANGUAGE SQL: أبسط أنواع الدوال", primary: "LANGUAGE SQL function body inline query expression" },
                { name: "STABLE وVOLATILE وIMMUTABLE: نوع الدالة وأثره", primary: "STABLE VOLATILE IMMUTABLE optimization hint function" },
                { name: "دالة تحسب خصم المنتج: منطق مركزي", primary: "SQL function calculate discount centralize logic reuse" },
                { name: "RETURNS TABLE: دالة تعيد مجموعة صفوف", primary: "RETURNS TABLE function multiple rows setof SQL" },
                { name: "RETURNS SETOF: استخدام نوع موجود", primary: "RETURNS SETOF existing type row function SQL" },
                { name: "DEFAULT Parameters: قيم افتراضية للمعاملات", primary: "DEFAULT parameters optional function call flexible" },
                { name: "تعدد الأشكال (Overloading): نفس الاسم بمعاملات مختلفة", primary: "overloading same function name different parameters" },
                { name: "تطبيق: مكتبة دوال SQL لحسابات الأعمال", primary: "SQL functions library business calculations discount tax" }
              ]
            },
            {
              unit_index: 3, code: "2.5.3",
              name: "PL/pgSQL: البرمجة الإجرائية في PostgreSQL",
              goal: "كتابة دوال PL/pgSQL بمتغيرات وشروط وحلقات وإدارة استثناءات للمنطق الإجرائي المعقد",
              key_concepts: ["PL/pgSQL", "DECLARE", "IF THEN", "LOOP", "EXCEPTION"],
              lessons: [
                { name: "PL/pgSQL: لغة إجرائية داخل PostgreSQL", primary: "PL/pgSQL procedural language variables conditions loops" },
                { name: "DECLARE: تعريف المتغيرات المحلية", primary: "DECLARE variables local types assign BEGIN" },
                { name: "IF THEN ELSIF ELSE: منطق شرطي", primary: "IF THEN ELSIF ELSE conditional logic PL/pgSQL" },
                { name: "LOOP وEXIT: حلقة بسيطة مع خروج", primary: "LOOP EXIT WHEN condition iteration PL/pgSQL" },
                { name: "FOR LOOP: حلقة بنطاق عددي", primary: "FOR i IN range LOOP numeric iteration PL/pgSQL" },
                { name: "FOR LOOP على نتيجة استعلام", primary: "FOR record IN SELECT LOOP cursor iteration query" },
                { name: "WHILE LOOP: حلقة بشرط استمرار", primary: "WHILE condition LOOP iteration PL/pgSQL" },
                { name: "EXCEPTION WHEN: معالجة الأخطاء في PL/pgSQL", primary: "EXCEPTION WHEN error handling SQLSTATE message" },
                { name: "RAISE NOTICE/WARNING/EXCEPTION: رسائل ومشاكل", primary: "RAISE NOTICE WARNING EXCEPTION message debug log" },
                { name: "تطبيق: دالة PL/pgSQL لمعالجة دفعة من الدفعات", primary: "PL/pgSQL batch processing payments loop exception" }
              ]
            },
            {
              unit_index: 4, code: "2.5.4",
              name: "Stored Procedures: إجراءات مخزنة قابلة للتعديل",
              goal: "إنشاء Stored Procedures تختلف عن Functions في دعمها للمعاملات واستدعائها بـ CALL",
              key_concepts: ["Stored Procedure", "CREATE PROCEDURE", "CALL", "COMMIT IN PROCEDURE", "vs Function"],
              lessons: [
                { name: "Procedure مقابل Function: الاختلاف الجوهري", primary: "procedure vs function transaction CALL RETURN difference" },
                { name: "CREATE PROCEDURE: تعريف إجراء مخزن", primary: "CREATE PROCEDURE LANGUAGE body no return statement" },
                { name: "CALL: استدعاء الإجراء المخزن", primary: "CALL procedure name parameters execute stored" },
                { name: "COMMIT وROLLBACK داخل Procedure", primary: "COMMIT ROLLBACK inside procedure transaction control" },
                { name: "معاملات متعددة في Procedure واحدة", primary: "multiple transactions procedure COMMIT partial atomic" },
                { name: "OUT Parameters: إعادة قيم من Procedure", primary: "OUT INOUT parameters procedure return multiple values" },
                { name: "متى Procedure ومتى Function: قرار الاستخدام", primary: "procedure function when use transaction return choice" },
                { name: "Procedure لعملية ETL: استيراد وتحويل وتسجيل", primary: "ETL procedure import transform log transaction" },
                { name: "استدعاء Procedure من تطبيق: Python/Node", primary: "CALL procedure application driver Python Node.js" },
                { name: "تطبيق: Procedure لإغلاق الشهر المالي", primary: "month close procedure aggregate archive reset financial" }
              ]
            },
            {
              unit_index: 5, code: "2.5.5",
              name: "Triggers: إجراءات تلقائية على الأحداث",
              goal: "إنشاء Triggers للاستجابة التلقائية لأحداث INSERT وUPDATE وDELETE لتطبيق منطق لا مركزي",
              key_concepts: ["Trigger", "BEFORE AFTER", "FOR EACH ROW", "NEW OLD", "Trigger Function"],
              lessons: [
                { name: "Trigger: حدث يُشغّل دالة تلقائياً", primary: "trigger event automatic function execute INSERT UPDATE" },
                { name: "CREATE TRIGGER: ربط الحدث بالدالة", primary: "CREATE TRIGGER event table timing function EXECUTE" },
                { name: "BEFORE Trigger: تعديل البيانات قبل الكتابة", primary: "BEFORE trigger modify NEW values before commit" },
                { name: "AFTER Trigger: تسجيل بعد إتمام العملية", primary: "AFTER trigger log audit trail after commit" },
                { name: "FOR EACH ROW مقابل FOR EACH STATEMENT", primary: "FOR EACH ROW STATEMENT trigger granularity difference" },
                { name: "NEW وOLD: الصف الجديد والقديم في Trigger", primary: "NEW OLD record before after INSERT UPDATE DELETE" },
                { name: "Audit Trigger: تسجيل كل تغيير تلقائياً", primary: "audit trigger INSERT log changes old new timestamp" },
                { name: "Trigger لحساب عمود تلقائياً: updated_at", primary: "trigger auto update updated_at timestamp column" },
                { name: "مشاكل Triggers: يصعب اكتشافها وقد تُسبب حلقات", primary: "trigger problems hidden side effects loops debug" },
                { name: "تطبيق: Audit Trail كامل لجدول المعاملات المالية", primary: "audit trail trigger financial table log all changes" }
              ]
            },
            {
              unit_index: 6, code: "2.5.6",
              name: "Event Triggers والـ DDL Events",
              goal: "استخدام Event Triggers للاستجابة لأحداث DDL كإنشاء الجداول وتعديلها لأغراض المراقبة والحماية",
              key_concepts: ["Event Trigger", "DDL Event", "ddl_command_end", "pg_event_trigger_ddl_commands", "Audit DDL"],
              lessons: [
                { name: "Event Trigger: مراقبة أوامر DDL نفسها", primary: "event trigger DDL CREATE ALTER DROP automatic response" },
                { name: "ddl_command_start وddl_command_end: توقيتان", primary: "ddl_command_start end event trigger timing DDL intercept" },
                { name: "pg_event_trigger_ddl_commands: ما الذي تغيّر", primary: "pg_event_trigger_ddl_commands function DDL changes detail" },
                { name: "تسجيل كل CREATE TABLE تلقائياً في سجل", primary: "log CREATE TABLE event trigger DDL audit schema change" },
                { name: "منع DROP TABLE بدون تصريح: حماية الإنتاج", primary: "prevent DROP TABLE event trigger check permission deny" },
                { name: "sql_drop Event: التقاط كل DROP command", primary: "sql_drop event trigger capture all drop commands" },
                { name: "Event Trigger للتوثيق التلقائي للـ Schema", primary: "auto documentation event trigger schema changes record" },
                { name: "table_rewrite Event: التقاط إعادة بناء الجدول", primary: "table_rewrite event trigger ALTER TYPE CLUSTER detect" },
                { name: "تعطيل وتفعيل Event Trigger مؤقتاً", primary: "DISABLE ENABLE event trigger temporary session bypass" },
                { name: "تطبيق: نظام حماية Schema يمنع الأخطاء المدمرة", primary: "schema protection event trigger DROP block production" }
              ]
            },
            {
              unit_index: 7, code: "2.5.7",
              name: "Security في قواعد البيانات",
              goal: "إتقان منظومة الأمان في PostgreSQL من المستخدمين والصلاحيات وRow-Level Security",
              key_concepts: ["GRANT", "REVOKE", "Role", "Row Level Security", "Least Privilege"],
              lessons: [
                { name: "مبدأ أقل الامتيازات: لا أكثر مما يحتاج", primary: "least privilege security principle minimal access control" },
                { name: "ROLE: إنشاء مستخدمين ومجموعات", primary: "CREATE ROLE USER LOGIN GROUP INHERIT PostgreSQL" },
                { name: "GRANT: منح صلاحيات محددة", primary: "GRANT SELECT INSERT UPDATE DELETE privilege table" },
                { name: "REVOKE: سحب الصلاحيات", primary: "REVOKE privilege table role user access remove" },
                { name: "GRANT على Schema: تنظيم الصلاحيات", primary: "GRANT USAGE SCHEMA objects permissions organization" },
                { name: "DEFAULT PRIVILEGES: صلاحيات للجداول المستقبلية", primary: "ALTER DEFAULT PRIVILEGES future tables automatic grant" },
                { name: "Row Level Security (RLS): فلترة على مستوى الصف", primary: "RLS Row Level Security tenant isolation per-user filter" },
                { name: "CREATE POLICY: سياسة الوصول للصفوف", primary: "CREATE POLICY RLS SELECT INSERT UPDATE user_id filter" },
                { name: "Security Definer Functions: تنفيذ بصلاحية المُنشئ", primary: "SECURITY DEFINER function elevated privilege controlled" },
                { name: "تطبيق: Multi-tenant Database بـ RLS", primary: "multi-tenant RLS policy per-tenant data isolation" }
              ]
            },
            {
              unit_index: 8, code: "2.5.8",
              name: "دوال المشغلات والأدوات المتقدمة",
              goal: "إتقان الدوال المتقدمة كالمؤشرات (Cursors) والدوال الديناميكية والأدوات الاحترافية",
              key_concepts: ["Cursor", "Dynamic SQL", "EXECUTE", "RETURNING", "Advanced Tools"],
              lessons: [
                { name: "Cursor: قراءة نتائج كبيرة صفاً صفاً", primary: "cursor DECLARE OPEN FETCH CLOSE large result set" },
                { name: "REFCURSOR: تمرير Cursor بين الدوال", primary: "REFCURSOR pass cursor function reference PostgreSQL" },
                { name: "EXECUTE: SQL ديناميكي في PL/pgSQL", primary: "EXECUTE dynamic SQL string format USING parameters" },
                { name: "أمان Dynamic SQL: منع SQL Injection", primary: "dynamic SQL injection format quote_ident quote_literal" },
                { name: "RETURNING في INSERT/UPDATE داخل PL/pgSQL", primary: "RETURNING INTO variable PL/pgSQL capture result" },
                { name: "GET DIAGNOSTICS: نتائج العملية في PL/pgSQL", primary: "GET DIAGNOSTICS ROW_COUNT affected INSERT UPDATE" },
                { name: "Table Functions: دوال تعيد جداول كاملة", primary: "table function RETURNS TABLE setof row type query" },
                { name: "Polymorphic Functions: دوال تقبل أي نوع", primary: "polymorphic anyelement anyarray flexible type function" },
                { name: "dblink وPostgres_fdw: استعلامات على قواعد خارجية", primary: "dblink postgres_fdw foreign data wrapper cross database" },
                { name: "تطبيق: دالة تقارير ديناميكية تقبل أي جدول", primary: "dynamic report function any table generic polymorphic" }
              ]
            },
            {
              unit_index: 9, code: "2.5.9",
              name: "مشروع: نظام حسابات متكامل بـ Functions وTriggers",
              goal: "بناء نظام محاسبة يمني متكامل يستخدم Functions وTriggers وViews وRLS للأمان والموثوقية",
              key_concepts: ["Accounting System", "Business Logic DB", "Triggers Applied", "Security Applied", "Complete"],
              lessons: [
                { name: "تصميم قاعدة بيانات نظام المحاسبة", primary: "accounting system design chart accounts journal ledger" },
                { name: "دوال حساب الأرصدة والتحقق منها", primary: "balance calculation function check debit credit account" },
                { name: "Trigger لتحديث الأرصدة تلقائياً", primary: "trigger balance update automatic transaction insert" },
                { name: "Materialized View لتقارير المحاسبة الثقيلة", primary: "materialized view accounting reports heavy monthly" },
                { name: "RLS: كل مستخدم يرى حساباته فقط", primary: "RLS policy accounts user_id filter isolation security" },
                { name: "Procedure لإغلاق الفترة المحاسبية", primary: "period close procedure aggregate check lock archive" },
                { name: "Audit Trail كامل لكل تعديل", primary: "audit trigger all changes log timestamp who what" },
                { name: "تقارير الميزانية بـ Window Functions وCTEs", primary: "balance sheet CTE window function financial report" },
                { name: "اختبار شامل: سيناريوهات المعاملات الحقيقية", primary: "complete test real transaction scenarios accounting" },
                { name: "توثيق وتسليم النظام المحاسبي", primary: "documentation delivery accounting system complete final" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "ميزات PostgreSQL المتقدمة",
          goal: "إتقان ميزات PostgreSQL الحديثة من JSONB والبحث النصي وتأمين البيانات والنسخ الاحتياطي والمقارنة مع NoSQL",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.6.1",
              name: "JSONB: قاعدة بيانات مرنة داخل قاعدة بيانات",
              goal: "إتقان تخزين واستعلام ومعالجة JSONB في PostgreSQL للبيانات شبه البنيوية",
              key_concepts: ["JSONB", "JSON operators", "GIN Index", "jsonb_set", "Semi-structured"],
              lessons: [
                { name: "JSON مقابل JSONB في PostgreSQL: أيهما تستخدم", primary: "JSON JSONB difference binary storage indexed faster" },
                { name: "تخزين JSONB: إدراج والتحقق من صحة البنية", primary: "INSERT JSONB valid JSON parse error storage" },
                { name: "مشغّل ->: الوصول لمفتاح JSON", primary: "-> operator key access JSONB object result" },
                { name: "مشغّل ->>: الوصول لقيمة نصية من JSON", primary: "->> operator text value key JSONB cast result" },
                { name: "الاستعلام في عمق JSONB: path أعمق", primary: "#> #>> path nested JSONB deep key access" },
                { name: "WHERE على JSONB: فلترة بمحتوى JSON", primary: "WHERE JSONB ->> value filter condition column" },
                { name: "GIN Index للبحث في JSONB: سريع جداً", primary: "GIN index JSONB containment fast search indexed" },
                { name: "@>: containment operator للبحث في JSONB", primary: "@> JSONB containment operator search nested key value" },
                { name: "jsonb_set: تحديث قيمة داخل JSONB", primary: "jsonb_set update modify nested JSONB key value" },
                { name: "تطبيق: تخزين واستعلام بيانات منتجات مرنة", primary: "flexible product attributes JSONB store query search" }
              ]
            },
            {
              unit_index: 2, code: "2.6.2",
              name: "Full-Text Search: البحث النصي الكامل",
              goal: "بناء نظام بحث نصي احترافي في PostgreSQL يدعم البحث بالكلمات ومعالجة اللغات",
              key_concepts: ["tsvector", "tsquery", "GIN Index FTS", "to_tsvector", "ts_rank"],
              lessons: [
                { name: "لماذا LIKE لا يكفي: ضعف البحث الجزئي", primary: "LIKE insufficient full text search need ranking stemming" },
                { name: "tsvector: تحويل النص لكيان قابل للبحث", primary: "tsvector to_tsvector lexemes stemming text search document" },
                { name: "tsquery: استعلام البحث النصي", primary: "tsquery to_tsquery plainto_tsquery websearch query" },
                { name: "مشغّل @@: مطابقة tsvector مع tsquery", primary: "@@ match operator tsvector tsquery full text search" },
                { name: "GIN Index على tsvector: بحث سريع", primary: "GIN index tsvector fast full text search indexed column" },
                { name: "عمود tsvector محسوب: يتحدث تلقائياً", primary: "generated tsvector column automatic TRIGGER update" },
                { name: "ts_rank: ترتيب نتائج البحث بالأهمية", primary: "ts_rank ranking relevance order search results score" },
                { name: "ts_headline: تمييز الكلمات في النص", primary: "ts_headline highlight matched words excerpt display" },
                { name: "دعم اللغة العربية في Full-Text Search", primary: "Arabic full text search language stemmer unaccent" },
                { name: "تطبيق: محرك بحث عن المنتجات بالكلمات", primary: "product search engine tsvector tsquery ranked results" }
              ]
            },
            {
              unit_index: 3, code: "2.6.3",
              name: "ARRAYs والأنواع المتقدمة",
              goal: "إتقان نوع ARRAY والأنواع المتخصصة في PostgreSQL للبيانات التي تحتاج مرونة هيكلية",
              key_concepts: ["ARRAY", "UNNEST", "array_agg", "Range Types", "Composite Types"],
              lessons: [
                { name: "ARRAY في PostgreSQL: قائمة قيم في خلية واحدة", primary: "ARRAY type values list single column PostgreSQL" },
                { name: "الاستعلام عن قيمة في ARRAY: مشغّل @>", primary: "ARRAY @> contains ANY = operator search value" },
                { name: "UNNEST: تفكيك ARRAY لصفوف", primary: "UNNEST array rows expand flatten lateral join" },
                { name: "array_agg: جمع صفوف في ARRAY", primary: "array_agg aggregate collect rows array GROUP BY" },
                { name: "GIN Index على ARRAY: بحث سريع في القوائم", primary: "GIN index ARRAY containment search fast indexed" },
                { name: "Range Types: نطاقات أعداد وتواريخ", primary: "range types tsrange numrange daterange overlap contain" },
                { name: "Composite Types: نوع مخصص من عدة حقول", primary: "composite type CREATE TYPE multiple fields custom row" },
                { name: "ENUM Type: قيم ثابتة من قائمة محددة", primary: "ENUM type CREATE TYPE limited values status category" },
                { name: "hstore: key-value بسيط قبل JSONB", primary: "hstore key value pairs simple extension PostgreSQL" },
                { name: "تطبيق: منتجات بعلامات تصنيفية متعددة بـ ARRAY", primary: "product tags ARRAY multi-label search filter query" }
              ]
            },
            {
              unit_index: 4, code: "2.6.4",
              name: "Backup والاسترداد وReplication",
              goal: "إتقان استراتيجيات النسخ الاحتياطي والاسترداد واعتماد PostgreSQL في بيئة إنتاجية",
              key_concepts: ["pg_dump", "pg_restore", "WAL Archive", "Replication", "Point-in-time Recovery"],
              lessons: [
                { name: "استراتيجيات النسخ الاحتياطي: أنواع ومقايضات", primary: "backup strategies logical physical full incremental" },
                { name: "pg_dump: تصدير قاعدة البيانات بأشكال مختلفة", primary: "pg_dump plain custom directory tar format options" },
                { name: "pg_restore: استعادة من نسخة احتياطية", primary: "pg_restore restore database plain custom format" },
                { name: "pg_dumpall: نسخ كل قواعد البيانات والـ Roles", primary: "pg_dumpall all databases globals roles cluster" },
                { name: "WAL Archiving: نسخ احتياطي مستمر", primary: "WAL archive_mode continuous backup point-in-time" },
                { name: "Point-in-Time Recovery: استعادة لأي لحظة", primary: "PITR restore specific time WAL replay recovery" },
                { name: "Streaming Replication: نسخة حية للإنتاج", primary: "streaming replication primary standby real-time sync" },
                { name: "Logical Replication: نسخ انتقائي للجداول", primary: "logical replication publication subscription table select" },
                { name: "جدول النسخ الاحتياطي: يومي وأسبوعي وشهري", primary: "backup schedule retention daily weekly monthly strategy" },
                { name: "تطبيق: اختبار استعادة كاملة من نسخة احتياطية", primary: "restore test drill full recovery backup verify complete" }
              ]
            },
            {
              unit_index: 5, code: "2.6.5",
              name: "PostgreSQL وNoSQL: مقارنة وقرار",
              goal: "فهم متى تختار PostgreSQL ومتى NoSQL وكيف تستخدم PostgreSQL بمرونة NoSQL",
              key_concepts: ["NoSQL", "MongoDB", "Redis", "CAP Theorem", "When to Use"],
              lessons: [
                { name: "NoSQL: أنواعه ومتى ظهر ولماذا", primary: "NoSQL types document key-value graph columnar history" },
                { name: "CAP Theorem: التوافر مقابل الاتساق", primary: "CAP consistency availability partition tolerance theorem" },
                { name: "MongoDB مقابل PostgreSQL: قرار البنية", primary: "MongoDB PostgreSQL comparison schema flexibility ACID" },
                { name: "Redis مقابل PostgreSQL: cache وسرعة", primary: "Redis cache in-memory PostgreSQL persistent durability" },
                { name: "PostgreSQL كـ Document Store بـ JSONB", primary: "PostgreSQL JSONB document store NoSQL features SQL" },
                { name: "متى تبقى مع SQL: البيانات العلائقية واضحة", primary: "relational data clear structure SQL ACID JOINS keep" },
                { name: "متى تختار NoSQL: حجم هائل وبنية متغيرة", primary: "NoSQL when massive scale flexible schema unstructured" },
                { name: "Polyglot Persistence: قاعدتا بيانات في نظام واحد", primary: "polyglot persistence multiple databases one application" },
                { name: "PostgreSQL Extensions: pgvector وPostGIS وغيرها", primary: "PostgreSQL extensions pgvector PostGIS timescaledb" },
                { name: "تطبيق: قرار معماري لنظام حقيقي متعدد المتطلبات", primary: "architecture decision SQL NoSQL mixed system trade-off" }
              ]
            },
            {
              unit_index: 6, code: "2.6.6",
              name: "تحسين الكتابة: Bulk Operations وCOPY",
              goal: "إتقان تقنيات تحميل البيانات الضخمة بأعلى أداء ممكن باستخدام COPY والعمليات الجملة",
              key_concepts: ["COPY", "Bulk Insert", "UPSERT", "Batch DML", "Performance Load"],
              lessons: [
                { name: "COPY من ملف: أسرع طريقة لتحميل البيانات", primary: "COPY FROM file CSV fastest bulk load PostgreSQL" },
                { name: "COPY TO: تصدير قاعدة البيانات لـ CSV بسرعة", primary: "COPY TO file CSV export fast dump query result" },
                { name: "\\copy في psql: COPY بدون صلاحيات root", primary: "\\copy psql client side COPY no superuser needed" },
                { name: "COPY مقابل INSERT: متى يكون COPY 10x أسرع", primary: "COPY vs INSERT bulk performance comparison 10x faster" },
                { name: "Batch INSERT: دفعات من 1000 صف مثلاً", primary: "batch INSERT chunk size optimal performance bulk" },
                { name: "تعطيل الفهارس والقيود أثناء التحميل الجملة", primary: "disable indexes constraints bulk load re-enable after" },
                { name: "UNLOGGED TABLE: جدول بدون WAL للتحميل السريع", primary: "UNLOGGED TABLE no WAL fast load risk no durability" },
                { name: "Parallel COPY: تحميل متوازٍ لأسرع أداء", primary: "parallel COPY multiple processes chunks concurrent load" },
                { name: "ETL في PostgreSQL: تحويل وتحميل البيانات", primary: "ETL PostgreSQL transform load aggregate migrate clean" },
                { name: "تطبيق: تحميل مليون صف بأسرع طريقة", primary: "load million rows COPY fast bulk ETL benchmark" }
              ]
            },
            {
              unit_index: 7, code: "2.6.7",
              name: "Connection Management وPooling",
              goal: "فهم إدارة الاتصالات في PostgreSQL وكيف تؤثر على الأداء وكيف تستخدم Connection Pooling",
              key_concepts: ["Connection Pool", "PgBouncer", "max_connections", "Connection State", "Serverless"],
              lessons: [
                { name: "كيف يعمل الاتصال بـ PostgreSQL: عملية لكل اتصال", primary: "PostgreSQL connection process fork overhead max_connections" },
                { name: "max_connections: الحد الأقصى وتأثير تجاوزه", primary: "max_connections limit too many connections error" },
                { name: "Connection Overhead: لماذا الاتصالات مكلفة", primary: "connection overhead memory CPU process fork cost" },
                { name: "PgBouncer: Connection Pooler الأكثر استخداماً", primary: "PgBouncer pool connections reuse lightweight proxy" },
                { name: "أوضاع PgBouncer: Session وTransaction وStatement", primary: "PgBouncer session transaction statement pooling mode" },
                { name: "pgPool-II: موازنة الحمل والـ Replication", primary: "pgPool load balancing replication connection pooling" },
                { name: "Serverless والاتصالات: مشكلة Lambda وPgBouncer", primary: "serverless Lambda cold start connections pgBouncer" },
                { name: "Connection Strings والأمان: SSL وpassword", primary: "connection string SSL sslmode password secure URI" },
                { name: "مراقبة الاتصالات: pg_stat_activity وpg_stat_bgwriter", primary: "monitor connections pg_stat_activity idle active wait" },
                { name: "تطبيق: ضبط PgBouncer لتطبيق ويب حقيقي", primary: "PgBouncer configure web app pool size mode tune" }
              ]
            },
            {
              unit_index: 8, code: "2.6.8",
              name: "Database Design Patterns المتقدمة",
              goal: "إتقان أنماط تصميم قواعد البيانات المتقدمة للمشاكل الشائعة في أنظمة الإنتاج",
              key_concepts: ["Audit Table", "Soft Delete", "Multi-tenant", "Event Sourcing", "CQRS"],
              lessons: [
                { name: "Audit Table: تتبع كل تغيير تاريخياً", primary: "audit table history log changes all operations tracking" },
                { name: "Temporal Tables: البيانات عبر الزمن (AS OF)", primary: "temporal table time travel history valid_from valid_to" },
                { name: "Soft Delete: حذف منطقي لا فيزيائي", primary: "soft delete is_deleted deleted_at filter performance" },
                { name: "Multi-tenant: مشاركة قاعدة بيانات بين عملاء", primary: "multi-tenant schema isolation RLS tenant_id patterns" },
                { name: "Event Sourcing: تخزين الأحداث لا الحالة", primary: "event sourcing immutable events state rebuild audit" },
                { name: "CQRS: فصل القراءة عن الكتابة", primary: "CQRS read write separation optimization pattern" },
                { name: "Polymorphic Associations: جدول يرتبط بعدة جداول", primary: "polymorphic association entity_type entity_id pattern" },
                { name: "EAV: Attribute-Value Pattern ومشاكله", primary: "EAV entity attribute value anti-pattern JSONB better" },
                { name: "Outbox Pattern: ضمان إرسال الرسائل مع المعاملة", primary: "outbox pattern transactional message guarantee event" },
                { name: "تطبيق: تحويل نظام موجود لنمط أفضل", primary: "refactor existing system better pattern temporal audit" }
              ]
            },
            {
              unit_index: 9, code: "2.6.9",
              name: "مشروع: قاعدة بيانات إنتاجية متكاملة",
              goal: "بناء قاعدة بيانات إنتاجية كاملة بكل الميزات المتقدمة: أمان وبحث وJSON وأداء وصيانة",
              key_concepts: ["Production Database", "All Features", "Security Complete", "Performance Tuned", "Final"],
              lessons: [
                { name: "تصميم قاعدة بيانات منصة تعليمية يمنية", primary: "Yemen educational platform database design complete" },
                { name: "JSONB لمحتوى الدروس المرن", primary: "JSONB lesson content flexible structure store query" },
                { name: "Full-Text Search للمحتوى التعليمي", primary: "FTS search courses lessons tsvector tsquery rank" },
                { name: "RLS: طالب يرى محتواه فقط", primary: "RLS student sees own data policy isolation security" },
                { name: "Materialized Views للإحصاءات الثقيلة", primary: "materialized view statistics enrollment progress heavy" },
                { name: "Triggers للتحديث التلقائي للتقدم", primary: "trigger auto update progress lesson completion track" },
                { name: "Partitioning لجدول أحداث النشاط الضخم", primary: "partition activity events table monthly range huge" },
                { name: "فهارس مدروسة لكل حالة استخدام", primary: "indexes strategic all use cases coverage composite partial" },
                { name: "Backup استراتيجية وأتمتة", primary: "backup strategy automated pg_dump schedule retention" },
                { name: "تسليم قاعدة البيانات: موثقة ومحسّنة ومؤمّنة", primary: "database delivery documented optimized secured production" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "مشروع المستوى الثاني: نظام تحليل بيانات شامل",
          goal: "بناء نظام تحليل بيانات مبيعات يمني كامل يستخدم كل أدوات SQL المتقدمة من التصميم للتحليل والأداء والأمان",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 75 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.7.1",
              name: "تصميم Data Warehouse بسيط",
              goal: "تصميم مستودع بيانات Star Schema لنظام تحليل مبيعات يمني يدعم الاستعلامات التحليلية",
              key_concepts: ["Data Warehouse", "Star Schema", "Fact Table", "Dimension", "Grain"],
              lessons: [
                { name: "ما هو Data Warehouse وكيف يختلف عن OLTP", primary: "data warehouse OLTP OLAP read optimized analytics" },
                { name: "Star Schema: الجدول الحقيقي والأبعاد", primary: "star schema fact table dimension denormalized analytics" },
                { name: "Grain: مستوى تفاصيل الجدول الحقيقي", primary: "grain fact table row level detail transaction day" },
                { name: "Slowly Changing Dimensions: كيف تتغير الأبعاد", primary: "SCD slowly changing dimension type 1 2 3 history" },
                { name: "تصميم Fact Table للمبيعات اليمنية", primary: "sales fact table Yemen granularity keys measures" },
                { name: "تصميم Dimension Tables: وقت ومنتج وعميل", primary: "time product customer dimension tables attributes" },
                { name: "Date Dimension: البنية التامة لتحليل الوقت", primary: "date dimension year quarter month week day holiday" },
                { name: "Denormalization في Data Warehouse: مقبول هنا", primary: "denormalization data warehouse performance read optimize" },
                { name: "فهارس Data Warehouse: Bitmap وPartial", primary: "data warehouse indexes bitmap partial column analytics" },
                { name: "تحضير بنية قاعدة بيانات المستودع", primary: "create warehouse schema fact dimensions ready build" }
              ]
            },
            {
              unit_index: 2, code: "2.7.2",
              name: "ETL: استخراج وتحويل وتحميل البيانات",
              goal: "بناء pipeline ETL يستخرج بيانات من قاعدة OLTP ويحولها ويحملها لمستودع البيانات",
              key_concepts: ["ETL", "Extract", "Transform", "Load", "Incremental"],
              lessons: [
                { name: "مفهوم ETL: من مصدر البيانات لمستودعها", primary: "ETL extract transform load pipeline data movement" },
                { name: "استخراج البيانات من OLTP بـ SQL", primary: "extract OLTP source SELECT timestamp incremental delta" },
                { name: "التحويل: تنظيف وتطبيع ودمج البيانات", primary: "transform clean normalize combine data quality SQL" },
                { name: "تحميل البيانات بـ INSERT SELECT وCOPY", primary: "load INSERT SELECT COPY fact table dimension populate" },
                { name: "Incremental Load: تحميل التغييرات فقط", primary: "incremental load delta timestamp new rows since last" },
                { name: "Data Quality Checks: التحقق من جودة البيانات", primary: "data quality check null count duplicate constraint" },
                { name: "تتبع آخر تحديث: High Water Mark", primary: "high water mark last loaded timestamp ETL incremental" },
                { name: "معالجة أخطاء ETL: تسجيل وإعادة المحاولة", primary: "ETL error handling log retry failed rows exception" },
                { name: "أتمتة ETL: pg_cron وجدول التشغيل", primary: "automate ETL pg_cron schedule periodic run" },
                { name: "تطبيق: ETL كامل من OLTP للـ Warehouse", primary: "complete ETL OLTP to warehouse incremental automated" }
              ]
            },
            {
              unit_index: 3, code: "2.7.3",
              name: "الاستعلامات التحليلية المتقدمة",
              goal: "كتابة استعلامات تحليلية متقدمة تستخدم Window Functions وCTEs والتجميع الهرمي",
              key_concepts: ["Analytical Queries", "Advanced Analysis", "Multidimensional", "Drill Down", "Slicing"],
              lessons: [
                { name: "استعلامات الـ OLAP: Slice وDice وDrill", primary: "OLAP slice dice drill down roll up analytical queries" },
                { name: "مبيعات متعددة الأبعاد: منتج × وقت × منطقة", primary: "multidimensional sales product time region GROUP BY" },
                { name: "ROLLUP للإجماليات الهرمية التلقائية", primary: "ROLLUP automatic subtotals totals hierarchical GROUP" },
                { name: "CUBE: كل التقاطعات الممكنة لإجماليات شاملة", primary: "CUBE all combinations cross tab automatic GROUP BY" },
                { name: "GROUPING SETS: مجموعات مخصصة بمرونة", primary: "GROUPING SETS custom combination GROUP BY flexible" },
                { name: "Window Functions في التحليل الزمني المتقدم", primary: "window function time series advanced LAG LEAD trend" },
                { name: "CTE لتحليل Cohort معقد متعدد الخطوات", primary: "CTE cohort analysis complex multi-step chain" },
                { name: "Funnel Analysis كامل بـ SQL", primary: "funnel conversion complete analysis window CTE steps" },
                { name: "Market Basket Analysis بـ Self Join", primary: "market basket co-purchase self join pair analysis" },
                { name: "تطبيق: لوحة تحكم تحليلية من 10 استعلامات", primary: "10 analytical queries dashboard complete KPI report" }
              ]
            },
            {
              unit_index: 4, code: "2.7.4",
              name: "تحسين أداء نظام التحليل",
              goal: "تطبيق كل أدوات تحسين الأداء على نظام التحليل لضمان استجابة سريعة للاستعلامات الثقيلة",
              key_concepts: ["Warehouse Performance", "Materialized Views", "Partitioning", "Columnar", "Pre-aggregate"],
              lessons: [
                { name: "قياس أداء استعلامات OLAP الحالية", primary: "measure OLAP queries performance baseline EXPLAIN" },
                { name: "Materialized Views للإجماليات المسبقة الحساب", primary: "materialized views pre-computed aggregates fast response" },
                { name: "Partitioning جدول الـ Fact بالتاريخ", primary: "fact table partition date monthly pruning fast scan" },
                { name: "Partial Indexes للاستعلامات الشائعة جداً", primary: "partial indexes common queries WHERE active recent" },
                { name: "Summary Tables: جداول ملخص محسوبة مسبقاً", primary: "summary tables daily monthly aggregate pre-compute" },
                { name: "Columnar Storage: TimescaleDB وغيرها", primary: "columnar storage extension analytics fast OLAP scan" },
                { name: "Query Caching: تخزين النتائج في التطبيق", primary: "query cache application Redis TTL expensive result" },
                { name: "أداء Window Functions بالفهارس الصحيحة", primary: "window function performance PARTITION ORDER index cover" },
                { name: "قياس التحسين: قبل وبعد بأرقام حقيقية", primary: "measure improvement before after timing benchmark" },
                { name: "تطبيق: تحسين استعلام Dashboard من 10s لـ 200ms", primary: "optimize dashboard query 10 seconds 200ms speedup" }
              ]
            },
            {
              unit_index: 5, code: "2.7.5",
              name: "تأمين نظام التحليل",
              goal: "تأمين نظام التحليل بمستخدمين وصلاحيات وRLS وتشفير وسجلات وصول",
              key_concepts: ["Analytics Security", "RLS", "Column Security", "Audit Access", "Encryption"],
              lessons: [
                { name: "نموذج الأمان: من يرى ماذا في نظام التحليل", primary: "security model roles analysts managers executives data" },
                { name: "مستخدم القراءة فقط: GRANT SELECT المحدود", primary: "read only user GRANT SELECT limited tables analytics" },
                { name: "Column Level Security: إخفاء أعمدة حساسة", primary: "column security VIEW hide salary personal data" },
                { name: "RLS في نظام التحليل: كل مدير يرى قسمه", primary: "RLS analytics manager department filter region data" },
                { name: "تسجيل الوصول: من قرأ ماذا ومتى", primary: "access log audit who read what when pg_audit" },
                { name: "pg_audit: تسجيل مفصل لكل عملية", primary: "pg_audit extension detailed logging SELECT operation" },
                { name: "تشفير البيانات الحساسة في قاعدة البيانات", primary: "encryption pgcrypto sensitive data at rest column" },
                { name: "SSL/TLS: تشفير الاتصال بقاعدة البيانات", primary: "SSL TLS connection encryption certificate verify" },
                { name: "Security Audit: فحص ثغرات أمان قاعدة البيانات", primary: "security audit scan vulnerabilities permissions roles" },
                { name: "تطبيق: نموذج أمان كامل لنظام التحليل", primary: "complete security model analytics multi-role RLS audit" }
              ]
            },
            {
              unit_index: 6, code: "2.7.6",
              name: "توصيل نظام التحليل بالتطبيقات",
              goal: "توصيل نظام التحليل بتطبيقات خارجية وAPI وأدوات BI وضمان أداء الاتصال",
              key_concepts: ["API Integration", "BI Tools", "psycopg2", "node-postgres", "REST API"],
              lessons: [
                { name: "الاستعلام من Python: psycopg2 وSQLAlchemy", primary: "Python psycopg2 SQLAlchemy connect query PostgreSQL" },
                { name: "الاستعلام من Node.js: node-postgres وPrisma", primary: "Node.js node-postgres pg Prisma connect query" },
                { name: "بناء REST API فوق قاعدة بيانات SQL", primary: "REST API Express Node PostgreSQL SQL backend" },
                { name: "PostgREST: API تلقائية من قاعدة البيانات", primary: "PostgREST automatic REST API PostgreSQL schema" },
                { name: "توصيل Metabase بـ PostgreSQL: BI مجاني", primary: "Metabase PostgreSQL BI dashboards charts connect" },
                { name: "Google Data Studio / Looker Studio", primary: "Looker Studio Google Data Studio PostgreSQL connector" },
                { name: "GraphQL من PostgreSQL: Hasura", primary: "Hasura GraphQL PostgreSQL automatic API schema" },
                { name: "Connection Pooling في التطبيق: PgBouncer", primary: "PgBouncer application pool connection management" },
                { name: "أداء الاستعلامات من التطبيق: batch وcache", primary: "application queries batch cache performance N+1 avoid" },
                { name: "تطبيق: REST API تحليلي فوق قاعدة بيانات الـ Warehouse", primary: "analytics REST API warehouse PostgreSQL endpoints" }
              ]
            },
            {
              unit_index: 7, code: "2.7.7",
              name: "PostgreSQL في الإنتاج: التهيئة والمراقبة",
              goal: "إعداد PostgreSQL للإنتاج بتهيئة محكمة ومراقبة مستمرة واستجابة للحوادث",
              key_concepts: ["Production Config", "postgresql.conf", "Monitoring", "Alerting", "Ops"],
              lessons: [
                { name: "postgresql.conf: الإعدادات الحيوية للإنتاج", primary: "postgresql.conf memory work_mem shared_buffers production" },
                { name: "shared_buffers وeffective_cache_size: الذاكرة", primary: "shared_buffers effective_cache_size memory tuning" },
                { name: "work_mem: ذاكرة عمليات الفرز والـ Hash", primary: "work_mem sort hash join operations per-query memory" },
                { name: "max_connections وautovacuum_workers", primary: "max_connections autovacuum workers tune production" },
                { name: "pg_stat_* views: لوحة مراقبة كاملة", primary: "pg_stat_activity statements bgwriter database monitor" },
                { name: "Prometheus وGrafana لمراقبة PostgreSQL", primary: "Prometheus Grafana postgres_exporter dashboard metrics" },
                { name: "Alerting: متى ترسل تنبيهاً لفريق العمليات", primary: "alerting thresholds slow query lock wait disk full" },
                { name: "Incident Response: خطوات استجابة الحوادث", primary: "incident response runbook PostgreSQL down slow steps" },
                { name: "Upgrade PostgreSQL: ترقية بدون توقف طويل", primary: "upgrade PostgreSQL version zero downtime pg_upgrade" },
                { name: "تطبيق: إعداد PostgreSQL إنتاجي من الصفر", primary: "production PostgreSQL setup config monitor from zero" }
              ]
            },
            {
              unit_index: 8, code: "2.7.8",
              name: "مراجعة المستوى الثاني والمهارات المتقدمة",
              goal: "مراجعة شاملة لكل مفاهيم المستوى الثاني وتقييم الجاهزية لسوق العمل كمحترف قواعد بيانات",
              key_concepts: ["L2 Review", "Career Readiness", "Portfolio", "Senior Skills", "Next Steps"],
              lessons: [
                { name: "مراجعة CTEs والاستعلامات الهرمية", primary: "CTE recursive hierarchy review consolidate practice" },
                { name: "مراجعة Window Functions: كل الحالات", primary: "window functions all cases review practice consolidate" },
                { name: "مراجعة الأداء والفهارس", primary: "performance indexes EXPLAIN review practice optimize" },
                { name: "مراجعة المعاملات والأمان", primary: "transactions ACID security RLS review consolidate" },
                { name: "مراجعة Stored Procedures والـ Triggers", primary: "stored procedures triggers PL/pgSQL review practice" },
                { name: "مراجعة JSONB والـ Full-Text Search", primary: "JSONB FTS advanced features review practice" },
                { name: "مشاريع محفظتك: ماذا تُعرض لصاحب العمل", primary: "portfolio projects showcase database skills career" },
                { name: "مؤهلات وشهادات SQL: أيها تستهدف", primary: "certifications AWS Azure Oracle PostgreSQL career path" },
                { name: "مسار مهني: DBA وData Engineer وBackend", primary: "career path DBA data engineer backend analyst choices" },
                { name: "الخطوات القادمة: ما بعد SQL الاحترافي", primary: "next steps advanced SQL career distributed systems" }
              ]
            },
            {
              unit_index: 9, code: "2.7.9",
              name: "المشروع النهائي: تسليم نظام تحليل شامل",
              goal: "تسليم نظام تحليل البيانات الكامل بوثائقه وتقارير الأداء والأمان كمشروع احترافي جاهز",
              key_concepts: ["Final Delivery", "Complete System", "Documentation", "Performance Report", "L2 Capstone"],
              lessons: [
                { name: "مراجعة نهائية: هل اكتملت كل متطلبات المشروع", primary: "final review checklist all requirements complete project" },
                { name: "تقرير الأداء: قبل التحسين وبعده بأرقام", primary: "performance report before after numbers improvement documented" },
                { name: "تقرير الأمان: كل سياسات الوصول موثقة", primary: "security report access policies RLS documentation complete" },
                { name: "Data Dictionary كاملة للمشروع", primary: "data dictionary all tables columns types documentation" },
                { name: "script التثبيت: من صفر لإنتاج كامل", primary: "install script zero to production complete reproducible" },
                { name: "اختبار النظام: سيناريوهات واقعية تعمل", primary: "system test realistic scenarios complete all working" },
                { name: "عرض المشروع: شرح القرارات المعمارية", primary: "project presentation architectural decisions explain why" },
                { name: "GitHub Repository: كود نظيف ومنظم وموثق", primary: "GitHub repository clean organized documented SQL project" },
                { name: "خطاب المشروع: ما الذي تعلمته وما الأثر", primary: "reflection letter learned impact skills acquired SQL" },
                { name: "الاحتفال والمستقبل: أنت الآن محترف SQL", primary: "celebration SQL professional career ready next chapter" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

function makeGoal(stageIndex, stageName, unitIndex, unitName, levelName) {
  const goals = [
    `فهم "${unitName}" كأساس لا غنى عنه في "${stageName}" وبناء قاعدة مفاهيمية متينة`,
    `تطبيق "${unitName}" على مسائل SQL حقيقية في سياق "${stageName}"`,
    `ربط "${unitName}" بما سبق في "${levelName}" وتعميق الفهم التطبيقي`,
    `إتقان "${unitName}" إتقاناً يُمكّن من كتابة SQL احترافي في "${stageName}"`,
    `تحليل حالات استخدام "${unitName}" في مشاريع قواعد البيانات الحقيقية`,
    `بناء قاعدة راسخة في "${unitName}" ضمن مسار "${stageName}" الشامل`,
    `تطبيق مبادئ "${unitName}" في سيناريوهات SQL معقدة`,
    `استخدام "${unitName}" بكفاءة في استعلامات "${stageName}" الاحترافية`,
    `تجميع فهم "${unitName}" ضمن الصورة الكبيرة لـ "${levelName}"`
  ];
  return goals[(stageIndex * 3 + unitIndex) % goals.length];
}

function makeBridge(lessonIndex, lessonName, unitName) {
  if (lessonIndex === 0) return `نبدأ وحدة "${unitName}" بـ"${lessonName}" الذي يُرسي الأساس لكل ما يليه`;
  if (lessonIndex === 9) return `نختتم وحدة "${unitName}" بـ"${lessonName}" الذي يجمع ما تعلمناه في تطبيق SQL حقيقي`;
  return `بعد فهم ما سبق، ننتقل لـ"${lessonName}" الذي يُعمّق كفاءتنا في "${unitName}" ويُقرّبنا من الاستخدام الاحترافي`;
}

function makeConcepts(primary, lessonName) {
  const seen = new Set();
  const terms = primary.split(" ").filter(t => t.length > 2).filter(t => {
    const key = `${t} في SQL`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
  return terms.map((term, i) => ({
    name: `${term} في SQL`,
    explanation: `${term} هو مفهوم جوهري في "${lessonName}" يُستخدم يومياً في مشاريع قواعد البيانات الحقيقية لكتابة SQL صحيح وفعّال`,
    mastery_criterion: `يستطيع المتعلم شرح ${term} بكلماته وكتابة استعلام SQL يوضّحه يعمل فعلاً دون مساعدة خارجية`,
    weight: Math.max(1, 3 - Math.floor(i / 2))
  }));
}

function makeMistakes(primary, unitName) {
  const terms = primary.split(" ").filter(t => t.length > 2).slice(0, 3);
  return [
    {
      mistake: `الخلط في استخدام "${terms[0] || "المفهوم"}" بدون فهم السياق الصحيح في SQL`,
      correction: `يجب فهم متى وكيف يُستخدم "${terms[0] || "المفهوم"}" في SQL بشكل مناسب`,
      treatment: `تدرّب على أمثلة متنوعة وابدأ باستعلامات بسيطة ثم تدرّج`,
      severity: "major"
    },
    {
      mistake: `إهمال أثر NULL على نتيجة "${terms[1] || "العملية"}" في SQL`,
      correction: `دائماً فكّر في حالة NULL قبل كتابة أي استعلام يتعامل مع البيانات`,
      treatment: `اختبر استعلاماتك بصفوف تحتوي NULL وتأكد من النتيجة المتوقعة`,
      severity: "major"
    },
    {
      mistake: `كتابة "${terms[2] || "الاستعلام"}" بدون فهم تأثيره على الأداء`,
      correction: `استخدم EXPLAIN ANALYZE لفهم تأثير كل استعلام قبل نشره في الإنتاج`,
      treatment: `اقرأ خطة التنفيذ لكل استعلام تكتبه وابحث عن Sequential Scan غير ضروري`,
      severity: "minor"
    }
  ];
}

function makeExamples(primary, unitName) {
  return [
    `في مشروع SQL حقيقي لنظام يمني، يُستخدم "${primary.split(" ")[0]}" لحل مشكلة البيانات بكفاءة واحترافية`,
    `مطور قواعد بيانات يستخدم "${primary.split(" ").slice(0, 2).join(" ")}" يومياً في تحليل بيانات المشاريع الحقيقية`
  ];
}

function makeExamQuestion(lessonName, primary) {
  const key = primary.split(" ")[0];
  return `كيف تطبق "${key}" في سياق "${lessonName}"؟ اكتب استعلام SQL يوضّح الفكرة مع شرح النتيجة المتوقعة`;
}

function makeLabForUnit(unitDef) {
  const c = unitDef.key_concepts;
  const kinds = ["diagnostic", "decision", "application", "analysis", "connection"];
  const questions = kinds.map((kind, i) => {
    const concept = c[i % c.length];
    return {
      kind,
      prompt: kind === "diagnostic"
        ? `وصف مشكلة SQL في "${unitDef.name}": لديك ${concept} لا يعطي النتيجة المتوقعة. كيف تشخّص السبب وتُحدد الخطوة الأولى للإصلاح؟`
        : kind === "decision"
        ? `متى تختار استخدام ${concept} بدلاً من البديل المشابه في استعلامات SQL؟ اشرح قرارك بمثال استعلام`
        : kind === "application"
        ? `طُلب منك كتابة استعلام يستخدم ${concept} لحل مشكلة تحليل بيانات حقيقية في نظام يمني. اكتب الحل خطوة بخطوة`
        : kind === "analysis"
        ? `حلّل الاستعلام التالي الذي يستخدم ${concept}: ما نقاط قوته؟ ما ثغراته؟ كيف تُحسّنه؟`
        : `كيف يرتبط ${concept} بالمفاهيم الأخرى التي تعلمتها في "${unitDef.name}"؟ أعطِ مثالاً يجمع بينها في استعلام واحد`,
      answer_type: "text",
      min_words: 40,
      rubric: `التشخيص دقيق وخطوات الحل منطقية ويظهر فهم ${concept} في السياق العملي لاستعلامات SQL`,
      solution_outline: `الجواب يتضمن: تحديد السبب الجذري، استعلام SQL مناسب يعالج المشكلة، وتوضيح النتيجة المتوقعة`
    };
  });
  return {
    scenario: `أنت محلل بيانات في شركة يمنية ومطلوب منك كتابة وتحسين استعلامات SQL تتعلق بـ"${unitDef.name}" لتحليل بيانات الأعمال وإنتاج تقارير قابلة للاعتماد عليها`,
    completion_criterion: `تُوضّح قدرتك على تطبيق ${c[0]} وتشخيص مشاكل SQL الشائعة وكتابة استعلامات صحيحة وفعّالة`,
    questions
  };
}

function makeUnitExamQuestions(unitCode, unitDef, passThreshold, timeLimit) {
  const c = unitDef.key_concepts;
  const questions = [
    {
      prompt: `ما الاستخدام الصحيح لـ "${c[0]}" في استعلامات SQL؟`,
      choices: [
        `استخدامه في كل استعلام بغض النظر عن السياق`,
        `استخدامه عندما يناسب متطلبات الاستعلام وفق أفضل ممارسات SQL`,
        `تجنبه دائماً لصالح البدائل الأحدث`,
        `استخدامه فقط في الاستعلامات الكبيرة`
      ],
      correct_index: 1,
      explanation: `"${c[0]}" يُستخدم في SQL عندما يتناسب مع متطلبات الاستعلام وأفضل ممارسات قواعد البيانات`
    },
    {
      prompt: `ما الفرق الجوهري بين "${c[0]}" و "${c[1] || c[0]}" في SQL؟`,
      choices: [
        `لا فرق بينهما عملياً`,
        `"${c[0]}" و"${c[1] || c[0]}" يخدمان أغراضاً مختلفة والاختيار يعتمد على السياق`,
        `"${c[1] || c[0]}" دائماً أحدث وأفضل`,
        `كلاهما مهمل في SQL الحديث`
      ],
      correct_index: 1,
      explanation: `الاختيار الصحيح بين "${c[0]}" و"${c[1] || c[0]}" يعتمد على متطلبات الاستعلام والسياق`
    },
    {
      prompt: `ما الخطأ الأكثر شيوعاً عند استخدام "${c[0]}" في استعلامات SQL؟`,
      choices: [
        `استخدامه في الاستعلامات الكبيرة`,
        `تجاهل التوثيق الرسمي`,
        `تطبيقه دون التحقق من النتيجة وأثر NULL عليها`,
        `استخدامه مع PostgreSQL فقط`
      ],
      correct_index: 2,
      explanation: `الخطأ الأكثر شيوعاً هو تطبيق "${c[0]}" دون مراعاة NULL والتحقق من النتيجة الفعلية`
    },
    {
      prompt: `في أي حالة يكون "${c[c.length > 2 ? 2 : 0]}" الخيار الأمثل في SQL؟`,
      choices: [
        `في كل الحالات دون استثناء`,
        `عندما نحتاج أداءً سريعاً فقط`,
        `عندما يكون الوضوح هو الأولوية الوحيدة`,
        `عندما يتوافق مع متطلبات الاستعلام وقواعد تصميم قاعدة البيانات`
      ],
      correct_index: 3,
      explanation: `"${c[c.length > 2 ? 2 : 0]}" هو الخيار الأمثل عندما يتوافق مع متطلبات الاستعلام وقواعد SQL الصحيحة`
    },
    {
      prompt: `كيف تتحقق من صحة استعلام SQL يستخدم "${c[0]}"؟`,
      choices: [
        `تشغيل الاستعلام مرة واحدة والافتراض بأنه يعمل`,
        `قراءة الكود بصرياً فقط دون تشغيله`,
        `كتابة اختبار يغطي الحالات الطبيعية والحدية بما فيها NULL`,
        `الاعتماد على قاعدة البيانات في اكتشاف كل الأخطاء`
      ],
      correct_index: 2,
      explanation: `الاختبار الشامل بما يشمل NULL والحالات الحدية يضمن صحة "${c[0]}" في كل السيناريوهات`
    },
    {
      prompt: `ما أفضل طريقة لتنظيم استعلامات SQL لـ"${unitDef.name}" في مشروع حقيقي؟`,
      choices: [
        `كتابة كل الاستعلامات في مكان واحد بدون توثيق`,
        `فصل الاستعلامات لوحدات منطقية مع تعليقات واضحة تشرح الهدف`,
        `تجنب التنظيم والتركيز على الأداء فقط`,
        `استخدام أسماء متغيرات قصيرة وغامضة لتوفير المساحة`
      ],
      correct_index: 1,
      explanation: `تنظيم استعلامات "${unitDef.name}" في وحدات منطقية موثقة يُحسّن الصيانة والقراءة`
    }
  ];
  return { unit_code: unitCode, pass_threshold_percent: passThreshold, time_limit_minutes: timeLimit, questions };
}

function makeStageExamQuestions(stageDef) {
  const uNames = stageDef.units.map(u => u.name);
  const questions = [];
  for (let i = 0; i < 10; i++) {
    const uName = uNames[i % uNames.length];
    const uName2 = uNames[(i + 3) % uNames.length];
    questions.push({
      prompt: `كيف تجمع بين "${uName}" و"${uName2}" لكتابة استعلام SQL احترافي في "${stageDef.name}"؟`,
      choices: [
        `يُعالَجان بشكل منفصل دائماً في استعلامات مختلفة`,
        `"${uName}" يُوفّر الأساس بينما "${uName2}" يُكمله بعمق تطبيقي في "${stageDef.name}"`,
        `كلاهما يؤديان نفس الوظيفة تماماً`,
        `يُستخدم أحدهما فقط في كل استعلام`
      ],
      correct_index: 1,
      explanation: `في "${stageDef.name}"، الجمع بين "${uName}" و"${uName2}" يبني كفاءة SQL متكاملة وعملية`
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
    `ما المبدأ الأساسي الذي يميز مطور SQL المحترف في "${lName}"؟`,
    `كيف تُثبت إتقانك لـ"${lName}" في مقابلة عمل حقيقية؟`,
    `ما أكثر تحدٍّ يواجهك عند الانتقال من "${lName}" لمستوى أعلى؟`,
    `ما المشروع الذي يُثبت قدرتك على "${lName}" بشكل لا يقبل الجدل؟`,
    `كيف يختلف كود SQL المبتدئ عن كود المحترف في "${lName}"؟`,
    `ما المورد الأهم لتعميق "${lName}" بعد إتمام هذا المستوى؟`,
    `كيف تُطبّق "${lName}" في سوق العمل اليمني والعالمي؟`,
    `ما الخطأ الجوهري الذي يمنع معظم المتعلمين من إتقان "${lName}"؟`,
    `كيف تحافظ على مهاراتك في "${lName}" وتطورها باستمرار؟`,
    `ما الميزة التنافسية التي يمنحها إتقان "${lName}" في سوق البيانات؟`,
    `كيف تُقيّم جودة استعلاماتك في "${lName}" بشكل موضوعي؟`,
    `ما أول مشروع حقيقي تبنيه بعد إتقان "${lName}"؟`,
    `كيف تُساهم في مجتمع SQL بعد إتقان "${lName}"؟`
  ];
  const questions = stems.map(stem => ({
    prompt: stem,
    choices: [
      `حفظ الاستعلامات والأوامر دون فهم كيف تعمل قاعدة البيانات`,
      `بناء فهم متين للأسس مع تطبيق عملي مستمر وكتابة SQL صحيح ومحسّن`,
      `التخصص الضيق جداً في جانب واحد فقط من SQL`,
      `الانتقال السريع لأدوات البيانات الأخرى دون إتقان SQL أولاً`
    ],
    correct_index: 1,
    explanation: `التميز في "${lName}" يأتي من فهم عميق لقواعد البيانات والتطبيق المستمر على مشاريع حقيقية`
  }));
  return {
    level_name: lName,
    pass_threshold_percent: levelDef.exam.pass_threshold_percent,
    time_limit_minutes: levelDef.exam.time_limit_minutes,
    questions
  };
}

function makePlacementTest() {
  const topics = [
    { q: "ما الناتج الصحيح للاستعلام: SELECT 5 / 2 في PostgreSQL؟", a: 1, opts: ["2.5", "2", "3", "خطأ في التشغيل"], d: 1 },
    { q: "ما الفرق بين DELETE وTRUNCATE في SQL؟", a: 2, opts: ["لا فرق", "TRUNCATE أبطأ ويُسجّل كل حذف", "DELETE يمكن عكسه بـ ROLLBACK وTRUNCATE أسرع وقد يُصعّب الرجوع", "كلاهما يحذفان الجدول نفسه"], d: 2 },
    { q: "ما ناتج COUNT(*) على جدول فيه 5 صفوف واحد منها فيه NULL في عمود الاسم؟", a: 0, opts: ["5", "4", "1", "يعتمد على الاستعلام"], d: 1 },
    { q: "ما الخطأ في: SELECT * FROM orders WHERE customer_id = NULL;", a: 2, opts: ["لا خطأ وسيعمل", "customer_id لا يقبل NULL", "يجب استخدام IS NULL بدلاً من = NULL", "WHERE لا يعمل مع NULL أبداً"], d: 1 },
    { q: "ما الفرق بين INNER JOIN وLEFT JOIN؟", a: 1, opts: ["لا فرق في النتيجة", "INNER JOIN يعيد الصفوف المتطابقة فقط بينما LEFT JOIN يحتفظ بكل صفوف الجدول الأيسر", "LEFT JOIN أبطأ دائماً", "INNER JOIN يعيد أعمدة أكثر"], d: 2 },
    { q: "متى تُستخدم HAVING بدلاً من WHERE؟", a: 2, opts: ["دائماً يمكن استبدال WHERE بـ HAVING", "HAVING للفلترة قبل GROUP BY", "HAVING لفلترة نتائج دوال التجميع بعد GROUP BY", "WHERE وHAVING متطابقان في الوظيفة"], d: 2 },
    { q: "ما الاستعلام الصحيح لإيجاد أعلى متوسط إجمالي للطلبات لكل عميل؟", a: 1, opts: ["SELECT MAX(AVG(total)) FROM orders", "SELECT customer_id, AVG(total) FROM orders GROUP BY customer_id ORDER BY AVG(total) DESC LIMIT 1", "SELECT customer_id WHERE AVG(total) = MAX", "SELECT TOP(1) AVG FROM orders GROUP customer_id"], d: 3 },
    { q: "ما دوال النافذة (Window Functions) وما يميزها عن دوال التجميع؟", a: 3, opts: ["دوال النافذة أسرع دائماً", "دوال النافذة تُجمّع كل الصفوف في صف واحد", "دوال النافذة تعمل فقط مع ORDER BY", "دوال النافذة تُحسب لكل صف مع إبقاء كل الصفوف في النتيجة"], d: 3 },
    { q: "ما الاستعلام الأنسب لإيجاد أغلى منتج في كل تصنيف؟", a: 2, opts: ["SELECT MAX(price) FROM products GROUP BY category", "SELECT category, MAX(price) FROM products", "SELECT * FROM products WHERE price = (SELECT MAX(price) FROM products p2 WHERE p2.category=products.category)", "SELECT category, price FROM products ORDER BY price"], d: 3 },
    { q: "ما خاصية ACID التي تضمن أن التغييرات تبقى بعد كتابتها حتى في حالة انهيار الخادم؟", a: 3, opts: ["Atomicity الذرية", "Consistency الاتساق", "Isolation العزل", "Durability الديمومة"], d: 2 },
    { q: "ما الفرق بين Primary Key وUnique Constraint؟", a: 1, opts: ["لا فرق", "Primary Key لا يقبل NULL ويكون واحداً بينما Unique يقبل NULL واحداً ويمكن تعدده", "Unique أسرع من Primary Key", "Primary Key لا يحتاج فهرساً"], d: 2 },
    { q: "ما الهدف من EXPLAIN ANALYZE في PostgreSQL؟", a: 2, opts: ["توليد شرح للاستعلام باللغة الطبيعية", "عرض الاستعلام بصياغة مختلفة", "تنفيذ الاستعلام وعرض خطة التنفيذ الفعلية مع أوقات التشغيل", "التحقق من صحة الصياغة دون تنفيذ"], d: 3 },
    { q: "ما CTE (Common Table Expression) وما فائدتها الرئيسية؟", a: 1, opts: ["هي فهرس مؤقت يُنشأ داخل الاستعلام", "هي استعلام مُسمّى مؤقت يُكتب قبل الاستعلام الرئيسي يُحسّن القراءة والصيانة", "هي View دائمة في قاعدة البيانات", "هي نوع خاص من دوال التجميع"], d: 2 },
    { q: "ما ROW_NUMBER() OVER(PARTITION BY category ORDER BY price DESC)؟", a: 2, opts: ["تعيد عدد الصفوف في كل تصنيف", "ترتّب كل التصنيفات بالسعر", "تعيد رقماً تسلسلياً لكل صف داخل تصنيفه مرتباً بالسعر تنازلياً", "تحذف الصفوف المكررة"], d: 3 },
    { q: "ما FOREIGN KEY وما تأثير ON DELETE CASCADE؟", a: 1, opts: ["يمنع الحذف من الجدول الفرعي", "يربط جدولين وعند حذف صف الجدول الأصل يُحذف تلقائياً الصفوف المرتبطة", "يُضيّف عمود CASCADE للجدول", "يسمح بتكرار قيم المفتاح"], d: 2 },
    { q: "متى يستخدم PostgreSQL Index Scan بدلاً من Sequential Scan؟", a: 2, opts: ["دائماً عند وجود فهرس", "عندما يكون الجدول صغيراً", "عندما يكون الاستعلام انتقائياً ويسترجع نسبة صغيرة من الصفوف", "فقط مع PRIMARY KEY"], d: 3 },
    { q: "ما الفرق بين UNION وUNION ALL؟", a: 1, opts: ["UNION ALL أبطأ دائماً", "UNION يُزيل المكررات ويكون أبطأ بينما UNION ALL يحتفظ بالمكررات وأسرع", "UNION يدمج أعمدة وUNION ALL يدمج صفوف", "لا فرق في النتيجة النهائية"], d: 1 },
    { q: "ما المقصود بـ Normalization في تصميم قواعد البيانات؟", a: 3, opts: ["زيادة سرعة الاستعلامات بتكرار البيانات", "تقليل حجم قاعدة البيانات بضغط البيانات", "استخدام فهارس على كل الأعمدة", "تنظيم البيانات لتقليل التكرار وضمان سلامة البيانات وفق قواعد التطبيع"], d: 2 },
  ];
  return topics.map(t => ({
    prompt: t.q,
    choices: t.opts,
    correct_index: t.a,
    explanation: `الجواب الصحيح يعكس فهماً صحيحاً لمبادئ SQL وقواعد البيانات العلائقية`,
    difficulty: t.d
  }));
}

function buildFullFile() {
  const result = { ...CURRICULUM };
  let totalLessons = 0;
  let totalLabs = 0;
  const unitExamBanks = {};
  const stageExamBanks = {};
  const levelExamBanks = {};

  result.levels = CURRICULUM.levels.map(levelDef => {
    const levelResult = { ...levelDef };
    levelResult.stages = levelDef.stages.map((stageDef, stageIdx) => {
      const stageResult = { ...stageDef };
      const defaults = stageDef.unit_exam_defaults || { pass_threshold_percent: 70, time_limit_minutes: 20 };
      stageResult.units = stageDef.units.map((unitDef, unitIdx) => {
        const unitResult = { ...unitDef };
        unitResult.goal = makeGoal(stageIdx, stageDef.name, unitIdx, unitDef.name, levelDef.name);

        unitResult.lessons = unitDef.lessons.map((lesson, lessonIndex) => ({
          lesson_index: lessonIndex + 1,
          name: lesson.name,
          bridge_sentence: makeBridge(lessonIndex, lesson.name, unitDef.name),
          final_check_question: makeExamQuestion(lesson.name, lesson.primary),
          concepts: makeConcepts(lesson.primary, lesson.name),
          common_mistakes: lessonIndex === 0 ? makeMistakes(lesson.primary, unitDef.name) : [],
          real_world_examples: lessonIndex === 9 ? makeExamples(lesson.primary, unitDef.name) : []
        }));
        totalLessons += unitResult.lessons.length;

        unitResult.lab = makeLabForUnit(unitDef);
        totalLabs++;

        const exam = makeUnitExamQuestions(
          unitDef.code,
          unitDef,
          defaults.pass_threshold_percent,
          defaults.time_limit_minutes
        );
        unitExamBanks[unitDef.code] = { variants: [exam.questions] };

        return unitResult;
      });

      const stageExam = makeStageExamQuestions(stageDef);
      const stageCode = `${levelDef.level_index}.${stageDef.stage_index}`;
      stageExamBanks[stageCode] = { variants: [stageExam.questions] };

      return stageResult;
    });

    const levelExam = makeLevelExamQuestions(levelDef);
    levelExamBanks[`${levelDef.level_index}`] = { variants: [levelExam.questions] };

    return levelResult;
  });

  result.exam_banks = {
    unit_banks: unitExamBanks,
    stage_banks: stageExamBanks,
    level_banks: levelExamBanks
  };

  result.placement_test_questions = makePlacementTest();

  return result;
}

console.log("توليد ملف sql-instruction.json...\n");
const result = buildFullFile();
writeFileSync("sql-instruction.json", JSON.stringify(result, null, 2));

const totalLessons = CURRICULUM.levels.reduce((a, l) => a + l.stages.reduce((b, s) => b + s.units.reduce((c, u) => c + u.lessons.length, 0), 0), 0);
const totalLabs = CURRICULUM.levels.reduce((a, l) => a + l.stages.reduce((b, s) => b + s.units.length, 0), 0);

const stat = (await import("fs")).statSync("sql-instruction.json");
console.log("✅ تم التوليد بنجاح!");
console.log(`📦 الحجم: ${Math.round(stat.size / 1024)} KB`);
console.log(`📚 المستويات: ${result.levels.length}`);
console.log(`🗂️  المراحل: ${result.levels.reduce((a, l) => a + l.stages.length, 0)}`);
console.log(`📁 الوحدات: ${result.levels.reduce((a, l) => a + l.stages.reduce((b, s) => b + s.units.length, 0), 0)}`);
console.log(`📖 الدروس: ${totalLessons}`);
console.log(`🧪 المعامل: ${totalLabs}`);
console.log(`📊 الدروس + المعامل: ${totalLessons + totalLabs}`);
console.log(`📝 أسئلة Placement: ${result.placement_test_questions.length}`);

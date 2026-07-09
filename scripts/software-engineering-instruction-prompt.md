# Prompt: توليد ملف تعليمات هندسة البرمجيات v4.1 لمنصة نُخبة

---

## دورك

أنت مهندس منهج خبير في تعليم هندسة البرمجيات. مهمتك إنشاء **ملف تعليمات v4.1 كامل لتخصص هندسة البرمجيات** يُنشر على منصة تعليمية ذكية يمنية.

### شروط النجاح الصارمة
1. الملف JSON صالح — يُحقَّق بـ `JSON.parse()` بدون استثناء.
2. لا خطأ واحد يمنع النشر في المدقق.
3. كل كود في prerequisites/enables يشير لكود موجود فعلاً.
4. كل معمل: **بالضبط 5 أسئلة** (diagnostic, decision, application, analysis, connection — كل نوع مرة).
5. كل MCQ: choices (≥2) وcorrect_index صالح.
6. لا دورات في الـ prerequisites.
7. **جميع أسماء المتغيرات والدوال والكلاسات في الكود بالإنجليزية** — النصوص المُطبَعة للمستخدم عربية.

---

## هيكل الملف

```
3 مستويات × 7 مراحل × 9 وحدات × 10 دروس = 1,890 درس
لكل وحدة: معمل واحد (5 أسئلة)
بنوك أسئلة: unit_banks + stage_banks + level_banks
اختبار تحديد مستوى: 18 سؤالاً
```

---

## مخطط المنهج الكامل

### المستوى الأول: أساسيات هندسة البرمجيات

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 1.1 | مدخل لهندسة البرمجيات | SDLC، الفرق بين البرمجة والهندسة، أخلاقيات المهندس، IEEE Standards، مقياس الجودة |
| 1.2 | هندسة المتطلبات | Functional/Non-Functional Requirements، Use Cases، User Stories، Elicitation Techniques، Requirements Validation |
| 1.3 | تصميم البرمجيات | نماذج UML (Class/Sequence/Activity/State)، مبادئ SOLID، التصميم الكائني المتقدم، Cohesion وCoupling |
| 1.4 | أنماط التصميم (Design Patterns) | Creational (Singleton/Factory/Builder)، Structural (Adapter/Decorator/Facade)، Behavioral (Observer/Strategy/Command) |
| 1.5 | اختبار البرمجيات | Unit Testing، Integration Testing، TDD، Code Coverage، Test Doubles، Mutation Testing |
| 1.6 | إدارة الكود والنسخ | Git المتقدم، Branching Strategies، Code Review، Refactoring، Clean Code، Technical Debt |
| 1.7 | مشروع شامل للمستوى الأول | نظام إدارة متكامل: متطلبات + تصميم UML + تطبيق بـ Design Patterns + اختبارات |

### المستوى الثاني: الهندسة التطبيقية المتقدمة

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 2.1 | معمارية البرمجيات | Architectural Styles (Layered/MVC/Event-Driven)، Microservices مقدمة، REST API Design، API Versioning |
| 2.2 | قواعد البيانات للمهندس | Relational Design (3NF/BCNF)، Query Optimization، NoSQL مقدمة، Transactions وACID، Database Migration |
| 2.3 | DevOps وCI/CD | Docker أساسيات، GitHub Actions/GitLab CI، الاختبار الآلي في Pipeline، Infrastructure as Code مقدمة |
| 2.4 | أمن التطبيقات | OWASP Top 10، Authentication وAuthorization، Input Validation، Secure Coding Practices، Threat Modeling |
| 2.5 | قياس جودة البرمجيات | Software Metrics (LOC/Cyclomatic/Maintainability)، SonarQube، Code Smells، Static Analysis، Technical Debt |
| 2.6 | Agile وإدارة المشاريع البرمجية | Scrum عميق، Kanban، SAFe مقدمة، Estimation Techniques، Velocity وBurndown، Retrospectives |
| 2.7 | مشروع تطبيقي متكامل | تطبيق ويب كامل: Architecture + DB + API + Tests + CI/CD Pipeline + Security Review |

### المستوى الثالث: الهندسة المتقدمة والقيادة

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 3.1 | الأنظمة الموزعة | CAP Theorem، Distributed Consensus، Event Sourcing، CQRS، Saga Pattern، Circuit Breaker |
| 3.2 | معمارية الأنظمة الكبيرة | Microservices عميق، Service Mesh، API Gateway، Domain-Driven Design (DDD)، Bounded Contexts |
| 3.3 | الأداء وقابلية التوسع | Load Balancing، Caching Strategies، Database Sharding، Message Queues (Kafka/RabbitMQ)، Performance Profiling |
| 3.4 | هندسة الموثوقية (SRE) | SLI/SLO/SLA، Error Budget، Incident Management، Chaos Engineering، Observability (Metrics/Logs/Traces) |
| 3.5 | الذكاء الاصطناعي في هندسة البرمجيات | LLM-assisted Development، AI Code Review، Automated Testing بـ AI، MLOps مقدمة، Ethical AI في البرمجيات |
| 3.6 | القيادة الهندسية | Technical Leadership، Architectural Decision Records (ADR)، Code Reviews كقائد، Mentoring، Engineering Culture |
| 3.7 | مشروع التخرج الشامل | نظام موزع إنتاجي: Microservices + Kubernetes + Observability + Security + Load Testing + Documentation |

---

## المخطط التفصيلي — المستوى 1

### المرحلة 1.1 — مدخل لهندسة البرمجيات (9 وحدات)

| الوحدة | الاسم | الدروس الـ10 |
|---|---|---|
| 1.1.1 | البرمجة مقابل هندسة البرمجيات | الفرق الجوهري بين Coding وEngineering، تكلفة الكود السيئ في الإنتاج، تاريخ حوادث برمجية تسببت في كوارث، دور المهندس في فريق متكامل، Software Crisis وكيف أُدركت، الأبعاد الأربعة للجودة: Functionality/Reliability/Usability/Efficiency، IEEE 730 معيار الجودة، مفهوم Technical Excellence، ما يُميّز Senior Engineer عن Junior، أخلاقيات المهندس: ACM Code of Ethics |
| 1.1.2 | دورة حياة تطوير البرمجيات (SDLC) | نماذج SDLC: Waterfall وV-Model وSpiral، Iterative وIncremental Development، Agile كفلسفة لا مجرد أداة، DevOps كامتداد للـ Agile، متى يُناسب كل نموذج؟، مرحلة Requirements وأهميتها الحاسمة، مرحلة Design والقرارات الجوهرية، مرحلة Implementation وأفضل الممارسات، مرحلة Testing ومستوياتها، مرحلة Maintenance: التكلفة الخفية |
| 1.1.3 | تكلفة الجودة | Cost of Quality: Prevention/Appraisal/Failure، Technical Debt: كيف يتراكم وكيف يُقاس، الكود النظيف كاستثمار لا ترف، Broken Windows Theory في البرمجيات، Refactoring المستمر كممارسة احترافية، Boyscout Rule: اترك الكود أفضل مما وجدته، قياس Technical Debt بـ SonarQube، جدولة سداد الدين التقني، الحجة التجارية لرفع الجودة، حالات: شركات أعادت كتابة نظامها من الصفر وفشلت |
| 1.1.4 | نمذجة الأنظمة: مقدمة | ما هي النمذجة ولماذا نحتاجها، UML كلغة موحدة للتصميم، الفرق بين الرسم التوضيحي والنموذج الرسمي، Structural Diagrams مقابل Behavioral Diagrams، Class Diagram كنموذج مركزي، Sequence Diagram لتتبع التفاعلات، Use Case Diagram لتوثيق المتطلبات، State Machine لسلوك الكائنات، Activity Diagram للعمليات، Enterprise Architect وdraw.io أدوات |
| 1.1.5 | أدوات المهندس الحديث | IDE متقدم: IntelliJ/VS Code plugins، Git hooks وpre-commit أدوات، Linters وFormatters للكود، Documentation as Code، Diagrams as Code (Mermaid/PlantUML)، Issue Tracking: Jira وLinear، Code Search: ripgrep وast-grep، Profiling أدوات أساسية، API Testing: Postman وInsomnia، المهندس الفضولي: كيف تبقى محدّثاً |
| 1.1.6 | التواصل الهندسي | كتابة تقارير هندسية فعّالة، ADR: Architectural Decision Records، الـ RFC (Request for Comments) في الفرق، تقديم المقترحات الفنية للإدارة، توثيق الـ API بـ OpenAPI/Swagger، تقديم Postmortems احترافية، التواصل عبر Code Comments و Documentation، Drawing Diagrams للشرح، Demos الفعّالة، كيف تقنع زميلك بتغيير نهجه |
| 1.1.7 | أخلاقيات هندسة البرمجيات | ACM وIEEE Code of Ethics، Privacy by Design، Accessibility كمسؤولية هندسية، Algorithmic Bias والعدالة، Open Source Ethics، ملكية الكود وحقوق المطور، رفض مهام غير أخلاقية، الشفافية مع الإدارة حول المشاكل التقنية، Whistleblowing في البرمجيات، الوعي بالأثر الاجتماعي للبرمجيات |
| 1.1.8 | البيئة والسياق العربي | مشهد التطوير البرمجي في المنطقة العربية، التعليم الذاتي كثقافة: كيف تبني مسيرتك، المجتمعات التقنية العربية: منتديات وفعاليات، المساهمة في مشاريع Open Source، المقابلات التقنية: ما يُطلب فعلاً، Competitive Programming كأداة لصقل التفكير، دور الشهادات: CKAD وAWS وGoogle Cloud، بناء Portfolio احترافي، الشبكة المهنية (LinkedIn/GitHub)، الفرص في شركات التقنية الدولية |
| 1.1.9 | البداية العملية: أدوات وبيئة | إعداد Ubuntu/WSL كبيئة تطوير، Vim/Emacs مقدمة سريعة، Git من الخوف للإتقان، Terminal Productivity: zsh وOh My Zsh، tmux للمحطات المتعددة، SSH وإدارة Servers، ربط كل أدوات الفريق: Git+CI+Issue Tracker، إعداد Home Lab للتعلم، الـ dotfiles وكيف تحفظ إعداداتك، عادات المهندس الإنتاجي |

### المرحلة 1.2 — هندسة المتطلبات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.2.1 | أنواع المتطلبات: الوظيفية وغير الوظيفية |
| 1.2.2 | استخلاص المتطلبات: المقابلات والملاحظة والعصف الذهني |
| 1.2.3 | User Stories وJob Stories وEpics |
| 1.2.4 | Use Cases: الكتابة والتوثيق |
| 1.2.5 | Non-Functional Requirements: الأداء والأمان والموثوقية |
| 1.2.6 | التحقق من المتطلبات (Validation وVerification) |
| 1.2.7 | إدارة المتطلبات وتتبع التغييرات |
| 1.2.8 | Prototyping للتحقق من الفهم |
| 1.2.9 | مشاكل المتطلبات الشائعة وكيف تتجنبها |

### المرحلة 1.3 — تصميم البرمجيات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.3.1 | مبادئ SOLID: Single Responsibility |
| 1.3.2 | مبادئ SOLID: Open/Closed وLiskov |
| 1.3.3 | مبادئ SOLID: Interface Segregation وDependency Inversion |
| 1.3.4 | Cohesion وCoupling: الأهداف والقياس |
| 1.3.5 | UML Class Diagram: التصميم الكائني |
| 1.3.6 | UML Sequence Diagram: تتبع التفاعلات |
| 1.3.7 | UML State Machine: نمذجة السلوك |
| 1.3.8 | تصميم الـ API: REST الصحيح |
| 1.3.9 | التوثيق التصميمي: ADR وDesign Docs |

### المرحلة 1.4 — أنماط التصميم (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.4.1 | Creational: Singleton وFlyweight |
| 1.4.2 | Creational: Factory Method وAbstract Factory |
| 1.4.3 | Creational: Builder وPrototype |
| 1.4.4 | Structural: Adapter وBridge |
| 1.4.5 | Structural: Decorator وComposite |
| 1.4.6 | Structural: Facade وProxy |
| 1.4.7 | Behavioral: Observer وMediator |
| 1.4.8 | Behavioral: Strategy وCommand وState |
| 1.4.9 | Anti-Patterns: ما يجب تجنبه |

### المرحلة 1.5 — اختبار البرمجيات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.5.1 | فلسفة الاختبار: لماذا والأنواع والأهرام |
| 1.5.2 | Unit Testing: الكتابة والتسمية والتنظيم |
| 1.5.3 | Test-Driven Development (TDD): Red-Green-Refactor |
| 1.5.4 | Test Doubles: Mocks وStubs وFakes وSpies |
| 1.5.5 | Integration Testing: الاستراتيجيات والأدوات |
| 1.5.6 | End-to-End Testing: Playwright وCypress |
| 1.5.7 | Code Coverage: القياس والحدود والمزالق |
| 1.5.8 | Property-Based Testing وMutation Testing |
| 1.5.9 | اختبار الأنظمة اللاتزامنية والمعقدة |

### المرحلة 1.6 — إدارة الكود والنسخ (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.6.1 | Git المتقدم: Rebase وCherry-pick وBisect |
| 1.6.2 | Branching Strategies: GitFlow وTrunk-Based |
| 1.6.3 | Code Review: الفن والعلم |
| 1.6.4 | Refactoring: التقنيات والأمان |
| 1.6.5 | Clean Code: التسمية والدوال والتعليقات |
| 1.6.6 | Technical Debt: القياس والإدارة |
| 1.6.7 | Monorepo مقابل Polyrepo |
| 1.6.8 | Semantic Versioning وChangelogs |
| 1.6.9 | Open Source المساهمة والقيادة |

---

### المستوى 2 — المرحلة 2.1: معمارية البرمجيات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.1.1 | Architectural Styles: Layered وHexagonal وClean Architecture |
| 2.1.2 | MVC وMVVM وMVP: متى وكيف |
| 2.1.3 | Event-Driven Architecture |
| 2.1.4 | REST API تصميم متقدم: Versioning وHATEOAS |
| 2.1.5 | GraphQL وgRPC مقارنة وتطبيق |
| 2.1.6 | Microservices مقدمة: الفوائد والتحديات |
| 2.1.7 | Monolith First: متى تبدأ بالـ Monolith؟ |
| 2.1.8 | Service Discovery وLoad Balancing مقدمة |
| 2.1.9 | Quality Attributes: Scalability/Availability/Maintainability |

### المستوى 2 — المرحلة 2.2: قواعد البيانات للمهندس (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.2.1 | Relational Design المتقدم: 3NF وBCNF |
| 2.2.2 | Query Optimization: EXPLAIN وIndexes |
| 2.2.3 | Transactions وACID وIsolation Levels |
| 2.2.4 | Stored Procedures وTriggers: متى وكيف |
| 2.2.5 | NoSQL: Document (MongoDB) وKey-Value (Redis) |
| 2.2.6 | NoSQL: Column-Family وGraph Databases |
| 2.2.7 | Database Migration Strategies |
| 2.2.8 | Connection Pooling وDatabase Patterns |
| 2.2.9 | Multi-Tenancy Database Design |

### المستوى 2 — المرحلة 2.3: DevOps وCI/CD (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.3.1 | Docker: Build وRun وCompose |
| 2.3.2 | Docker في الإنتاج: Best Practices |
| 2.3.3 | GitHub Actions: بناء Pipeline |
| 2.3.4 | GitLab CI/CD: بديل احترافي |
| 2.3.5 | Automated Testing في Pipeline |
| 2.3.6 | Infrastructure as Code: Terraform مقدمة |
| 2.3.7 | Kubernetes مقدمة: Pods وServices |
| 2.3.8 | Monitoring وAlerting في Pipeline |
| 2.3.9 | Deployment Strategies: Blue/Green وCanary |

### المستوى 2 — المرحلة 2.4: أمن التطبيقات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.4.1 | OWASP Top 10: الفهرس الكامل |
| 2.4.2 | SQL Injection وNoSQL Injection |
| 2.4.3 | XSS وCSRF: الهجوم والدفاع |
| 2.4.4 | Authentication: JWT وOAuth2 وOIDC |
| 2.4.5 | Authorization: RBAC وABAC |
| 2.4.6 | Cryptography للمطور: Hashing وEncryption |
| 2.4.7 | Secure Coding Practices: فحص المدخلات |
| 2.4.8 | Threat Modeling: STRIDE وDREAD |
| 2.4.9 | Security Testing: SAST وDASTو Penetration Test |

### المستوى 2 — المرحلة 2.5: قياس جودة البرمجيات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.5.1 | Software Metrics: LOC وFunction Points |
| 2.5.2 | Cyclomatic Complexity وCognitive Complexity |
| 2.5.3 | Maintainability Index وCode Churn |
| 2.5.4 | SonarQube: الإعداد والقراءة |
| 2.5.5 | Code Smells الأكثر شيوعاً |
| 2.5.6 | DORA Metrics: مقاييس أداء الفرق |
| 2.5.7 | Technical Debt Quantification |
| 2.5.8 | Code Quality Gates في CI/CD |
| 2.5.9 | بناء ثقافة الجودة في الفريق |

### المستوى 2 — المرحلة 2.6: Agile وإدارة المشاريع البرمجية (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.6.1 | Agile Manifesto: المبادئ والقيم |
| 2.6.2 | Scrum: الأدوار والأحداث والـ Artifacts |
| 2.6.3 | Sprint Planning وEstimation Techniques |
| 2.6.4 | Daily Standup وSpring Review وRetrospective |
| 2.6.5 | Kanban: Visualize وLimit WIP وManage Flow |
| 2.6.6 | Velocity وBurndown وBurnup |
| 2.6.7 | SAFe وScaling Agile: مقدمة |
| 2.6.8 | المنتج والمطور: تعاون فعّال |
| 2.6.9 | Agile في الثقافة العربية: التحديات والحلول |

---

### المستوى 3 — المرحلة 3.1: الأنظمة الموزعة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.1.1 | Distributed Systems: الخصائص والتحديات |
| 3.1.2 | CAP Theorem وPACELC |
| 3.1.3 | Consistency Patterns: Strong وEventual |
| 3.1.4 | Distributed Consensus: Raft وPaxos مفهوم |
| 3.1.5 | Event Sourcing وCQRS |
| 3.1.6 | Saga Pattern لإدارة Transactions الموزعة |
| 3.1.7 | Idempotency والـ At-Least-Once Delivery |
| 3.1.8 | Two-Phase Commit والبدائل |
| 3.1.9 | Distributed Tracing: Jaeger وZipkin |

### المستوى 3 — المرحلة 3.2: معمارية الأنظمة الكبيرة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.2.1 | Domain-Driven Design (DDD): المفاهيم الأساسية |
| 3.2.2 | Bounded Contexts وContext Mapping |
| 3.2.3 | Microservices عميق: التفكيك والحجم |
| 3.2.4 | API Gateway: Kong وEnvoy |
| 3.2.5 | Service Mesh: Istio وLinkerd |
| 3.2.6 | Strangler Fig Pattern: الهجرة من Monolith |
| 3.2.7 | Data Management في Microservices |
| 3.2.8 | Testing Microservices: Contract Testing |
| 3.2.9 | Microservices Security: Zero Trust |

### المستوى 3 — المرحلة 3.3: الأداء وقابلية التوسع (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.3.1 | Caching Strategies: Client/Server/CDN |
| 3.3.2 | Redis عميق: Patterns وAnti-Patterns |
| 3.3.3 | Database Scaling: Read Replicas وSharding |
| 3.3.4 | Message Queues: Kafka مقدمة |
| 3.3.5 | RabbitMQ وNATS للـ Messaging |
| 3.3.6 | Load Balancing: Algorithms والأدوات |
| 3.3.7 | Performance Profiling: كيف تجد الاختناق |
| 3.3.8 | Performance Testing: k6 وGatling |
| 3.3.9 | Cost-Performance Trade-offs |

### المستوى 3 — المرحلة 3.4: هندسة الموثوقية (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.4.1 | SRE: فلسفة وممارسات Google |
| 3.4.2 | SLI وSLO وSLA: التعريف والقياس |
| 3.4.3 | Error Budget: الإطار العملي |
| 3.4.4 | Incident Management: دورة الحياة |
| 3.4.5 | Postmortem: كيف تكتب وتقود |
| 3.4.6 | Chaos Engineering: Principles وTools |
| 3.4.7 | Observability: Metrics وLogs وTraces |
| 3.4.8 | On-Call: البنية والثقافة |
| 3.4.9 | High Availability: Patterns وتصميم |

### المستوى 3 — المرحلة 3.5: الذكاء الاصطناعي في الهندسة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.5.1 | LLM-Assisted Development: الأدوات والحدود |
| 3.5.2 | GitHub Copilot وCursor: الاستخدام الفعّال |
| 3.5.3 | AI Code Review: الإمكانات والمخاطر |
| 3.5.4 | AI-Powered Testing وTest Generation |
| 3.5.5 | MLOps: نشر نماذج ML في الإنتاج |
| 3.5.6 | دمج LLMs في التطبيقات: RAG وFunction Calling |
| 3.5.7 | Ethical AI: تحيز البيانات والشفافية |
| 3.5.8 | AI Security: Prompt Injection والدفاع |
| 3.5.9 | مستقبل هندسة البرمجيات مع الذكاء الاصطناعي |

### المستوى 3 — المرحلة 3.6: القيادة الهندسية (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.6.1 | مسار القيادة: IC Track مقابل Management Track |
| 3.6.2 | Staff Engineer: الدور والمسؤوليات |
| 3.6.3 | Technical Leadership بدون سلطة رسمية |
| 3.6.4 | كتابة RFC وDesign Documents مؤثرة |
| 3.6.5 | Mentoring وCoaching المطورين |
| 3.6.6 | Engineering Culture البناء والصون |
| 3.6.7 | Hiring: المقابلات الفنية وتقييم المرشحين |
| 3.6.8 | التواصل مع الإدارة والمنتج |
| 3.6.9 | إدارة Burnout وصحة الفريق |

---

## اختبار تحديد المستوى (18 سؤالاً)

| # | target_level_index | target_unit_code | الموضوع |
|---|---|---|---|
| 1 | 1 | 1.1.2 | SDLC والنماذج |
| 2 | 1 | 1.2.1 | أنواع المتطلبات |
| 3 | 1 | 1.3.1 | Single Responsibility Principle |
| 4 | 1 | 1.4.1 | Singleton Pattern |
| 5 | 1 | 1.4.7 | Observer Pattern |
| 6 | 1 | 1.5.3 | TDD: الدورة |
| 7 | 1 | 1.6.2 | Git Branching Strategies |
| 8 | 1 | 1.6.3 | Code Review أفضل الممارسات |
| 9 | 1 | 1.6.4 | Refactoring الآمن |
| 10 | 2 | 2.1.1 | Architectural Styles |
| 11 | 2 | 2.3.1 | Docker أساسيات |
| 12 | 2 | 2.4.1 | OWASP Top 10 |
| 13 | 2 | 2.4.4 | JWT وAuthentication |
| 14 | 2 | 2.6.2 | Scrum الأدوار |
| 15 | 3 | 3.1.2 | CAP Theorem |
| 16 | 3 | 3.2.1 | DDD المفاهيم |
| 17 | 3 | 3.4.2 | SLI/SLO/SLA |
| 18 | 3 | 3.3.1 | Caching Strategies |

---

## هيكل JSON المطلوب

```json
{
  "schema_version": "v4.1",
  "specialty": {
    "slug": "software-engineering",
    "name": "هندسة البرمجيات",
    "icon": "🏗️",
    "description": "مسار شامل من أساسيات الهندسة البرمجية حتى قيادة الأنظمة الموزعة الكبيرة — يُخرج مهندساً يُصمّم ويبني ويقود بنيان أنظمة برمجية عالية الجودة والموثوقية",
    "target_persona": "مطور برمجيات يريد الانتقال من كتابة الكود إلى التفكير الهندسي وبناء أنظمة قابلة للنمو والصيانة",
    "teacher_tone": "مهندس خبير يمزج النظرية بأمثلة من الإنتاج الحقيقي ويشارك دروس مؤلمة تعلّمها عن طريق الأخطاء",
    "allowed_viz_templates": ["flowchart", "architecture_diagram", "sequence_diagram", "comparison_table", "tree_diagram"],
    "allowed_tools": ["nukhba_ide_js", "nukhba_ide_html"],
    "glossary": []
  },
  "levels": [],
  "exam_banks": { "unit_banks": {}, "stage_banks": {}, "level_banks": {} },
  "placement_test_questions": []
}
```

---

## قواعد التحقق الصارمة

```
level_index:  1, 2, 3
stage_index:  1..7 داخل كل مستوى
unit_index:   1..9 داخل كل مرحلة
lesson_index: 1..10 داخل كل وحدة
كود الوحدة:  "L.S.U"   مثل "1.1.1"
كود الدرس:   "L.S.U.N" مثل "1.1.1.1"
```

- كل معمل: 5 أسئلة بالضبط — diagnostic, decision, application, analysis, connection (كل واحد مرة).
- كل MCQ: choices ≥ 2 وcorrect_index صالح.
- كل bridge_sentence ≥ 10 كلمات.
- كل درس: concepts ≥ 1، common_mistakes ≥ 1، yemeni_examples ≥ 1.
- لا دورات في prerequisites.

---

## قائمة التحقق النهائية

- [ ] JSON.parse() بدون استثناء
- [ ] slug = "software-engineering"
- [ ] 3 × 7 × 9 × 10 = 1,890 درس
- [ ] كل معمل: بالضبط 5 أسئلة من 5 أنواع مختلفة
- [ ] كل كود في prerequisites موجود فعلاً في الملف
- [ ] لا دورات في الروابط
- [ ] جميع identifiers في الكود بالإنجليزية
- [ ] exam_banks: unit + stage + level
- [ ] 18 سؤال placement وكل target_unit_code موجود

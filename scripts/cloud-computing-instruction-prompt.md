# Prompt: توليد ملف تعليمات الحوسبة السحابية v4.1 لمنصة نُخبة

---

## دورك

أنت مهندس منهج خبير في الحوسبة السحابية وبنية الأنظمة. مهمتك إنشاء **ملف تعليمات v4.1 كامل لتخصص الحوسبة السحابية** يُنشر على منصة تعليمية ذكية.

### شروط النجاح الصارمة
1. JSON صالح — `JSON.parse()` بدون استثناء.
2. لا خطأ يمنع النشر في المدقق.
3. كل كود في prerequisites/enables موجود فعلاً.
4. كل معمل: **بالضبط 5 أسئلة** (diagnostic, decision, application, analysis, connection).
5. كل MCQ: choices ≥ 2 وcorrect_index صالح.
6. لا دورات في الـ prerequisites.
7. **جميع أسماء الموارد السحابية والمتغيرات والسكريبتات بالإنجليزية**.

---

## هيكل الملف

```
3 مستويات × 7 مراحل × 9 وحدات × 10 دروس = 1,890 درس
لكل وحدة: معمل واحد (5 أسئلة)
بنوك أسئلة: unit_banks + stage_banks + level_banks
اختبار تحديد مستوى: 18 سؤالاً
```

**منصة مرجعية:** AWS كمنصة رئيسية، مع إشارات لـ Azure وGCP للمقارنة في المستوى الثالث.

---

## مخطط المنهج الكامل

### المستوى الأول: أساسيات الحوسبة السحابية

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 1.1 | مفاهيم السحابة الأساسية | IaaS/PaaS/SaaS، Public/Private/Hybrid، مزايا السحابة، نماذج المسؤولية المشتركة |
| 1.2 | AWS: البداية والـ IAM | AWS Console، IAM Users/Groups/Roles/Policies، MFA، Billing Dashboard، Free Tier |
| 1.3 | الحوسبة السحابية (Compute) | EC2: أنواع الـ Instances، AMIs، Security Groups، Key Pairs، Elastic IPs، Auto Scaling مقدمة |
| 1.4 | التخزين السحابي | S3: Buckets وObjects وPolicies، EBS وEFS، S3 Storage Classes، Lifecycle Policies |
| 1.5 | الشبكات السحابية الأساسية | VPC، Subnets (Public/Private)، Internet Gateway، Route Tables، NAT Gateway |
| 1.6 | قواعد البيانات السحابية | RDS: MySQL/PostgreSQL على السحابة، DynamoDB مقدمة، Database Snapshots، Read Replicas |
| 1.7 | مشروع شامل للمستوى الأول | نشر تطبيق ويب ثلاثي الطبقات على AWS: EC2 + RDS + S3 + VPC كامل |

### المستوى الثاني: الخدمات السحابية المتقدمة

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 2.1 | الحاويات والـ Kubernetes | Docker متقدم، ECR، ECS، EKS، Kubernetes: Pods/Services/Deployments/Ingress |
| 2.2 | Serverless Computing | Lambda: Functions وTriggers وLayers، API Gateway + Lambda، Step Functions، EventBridge |
| 2.3 | الأمن السحابي المتقدم | KMS، Secrets Manager، WAF، Shield، GuardDuty، Security Hub، CloudTrail |
| 2.4 | المراقبة والسجلات | CloudWatch Metrics وLogs وAlarms، X-Ray، CloudTrail، AWS Config، Dashboards |
| 2.5 | CI/CD على السحابة | CodeCommit وCodeBuild وCodeDeploy وCodePipeline، GitHub Actions مع AWS |
| 2.6 | Infrastructure as Code | CloudFormation، Terraform على AWS، CDK (TypeScript)، Pulumi مقدمة |
| 2.7 | مشروع تطبيقي متكامل | Serverless API مع Lambda + DynamoDB + API Gateway + Cognito + CI/CD كامل |

### المستوى الثالث: هندسة السحابة المتقدمة

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 3.1 | معمارية السحابة متعددة المنطقة | Multi-AZ وMulti-Region، Route53 Failover، Global Accelerator، CloudFront عميق |
| 3.2 | Microservices على السحابة | Service Mesh بـ App Mesh، API Gateway متقدم، Event-Driven على SQS/SNS/Kafka |
| 3.3 | تحسين التكاليف | AWS Cost Explorer، Savings Plans وReserved Instances، Spot Instances، Right-Sizing |
| 3.4 | الموثوقية والتعافي | Disaster Recovery Strategies (RPO/RTO)، Chaos Engineering بـ AWS FIS، Runbooks |
| 3.5 | MLOps وAI على السحابة | SageMaker: Training وDeployment، Bedrock، Rekognition وComprehend، MLflow |
| 3.6 | حوكمة السحابة والامتثال | AWS Organizations، Service Control Policies، Compliance Frameworks (SOC2/ISO27001) |
| 3.7 | مشروع التخرج | معمارية سحابية كاملة: Multi-Region + Serverless + Kubernetes + Observability + Cost |

---

## المخطط التفصيلي — المستوى 1

### المرحلة 1.1 — مفاهيم السحابة الأساسية (9 وحدات)

| الوحدة | الاسم | الدروس الـ10 |
|---|---|---|
| 1.1.1 | لماذا الحوسبة السحابية؟ | قبل السحابة: مراكز البيانات التقليدية وتكاليفها، تعريف الحوسبة السحابية NIST، 5 خصائص السحابة: On-Demand/Broad Access/Resource Pooling/Elasticity/Measured, نماذج الخدمة IaaS/PaaS/SaaS: من يدير ماذا؟، نماذج النشر: Public/Private/Hybrid/Community، حالات استخدام حقيقية: Netflix وAirbnb على AWS، تكلفة السحابة مقابل الـ On-Premise: TCO Analysis، المخاوف الشائعة: الأمان والاعتماد والتكلفة، الحوسبة السحابية في المنطقة العربية: الفرص والواقع، المهن السحابية: Cloud Architect وDevOps وSRE |
| 1.1.2 | نموذج المسؤولية المشتركة | مبدأ Shared Responsibility Model، مسؤولية AWS "of the Cloud"، مسؤولية العميل "in the Cloud"، الفرق حسب نموذج الخدمة (IaaS/PaaS/SaaS)، ما يتحكم فيه العميل دائماً: البيانات والهوية، ما تتحكم فيه AWS دائماً: البنية الفيزيائية، التطبيق العملي: من يؤمّن قاعدة البيانات؟، حالة: خرق بيانات Capital One 2019 وسببه، أثر النموذج على الامتثال والتدقيق، Well-Architected Framework مقدمة |
| 1.1.3 | البنية التحتية AWS العالمية | Regions وAvailability Zones وEdge Locations، كيف تختار الـ Region المناسبة؟، Latency والقرب الجغرافي، Data Residency والقوانين المحلية، منطقة الشرق الأوسط في AWS (UAE/Bahrain)، الأسعار تختلف بين Regions، بناء متعدد الـ AZ للموثوقية، CloudFront وEdge Locations، AWS Local Zones وOutposts، خريطة نمو AWS العالمية |
| 1.1.4 | نماذج التسعير السحابي | Pay-As-You-Go الأساس، On-Demand مقابل Reserved مقابل Spot، Savings Plans: المرونة والتوفير، Free Tier: ما المتاح فعلاً؟، AWS Pricing Calculator، حساب تكلفة مشروع قبل البناء، Cost Allocation Tags، Billing Alerts، FinOps كثقافة وممارسة، مقارنة تسعير AWS/Azure/GCP |
| 1.1.5 | السحابة والأعمال | TCO Analysis: التحليل الكامل للتكلفة الفعلية، Capital vs Operational Expenditure، قرارات Build vs Buy vs Cloud، الـ Business Case للتحول السحابي، Cloud Migration Journey: 6Rs، مخاطر الـ Vendor Lock-in، السحابة المتعددة (Multi-Cloud) كاستراتيجية، Cloud-Native vs Lift-and-Shift، قياس قيمة السحابة: ROI وTime-to-Market، دور السحابة في الشركات الناشئة |
| 1.1.6 | أمان السحابة: المفاهيم الأساسية | Defense in Depth: الطبقات الأمنية، CIA Triad في السحابة، Zero Trust: لا ثقة افتراضية، Principle of Least Privilege، Encryption at Rest وIn Transit، Key Management: المفاهيم، Identity كأول خط دفاع، شهادات الأمن السحابي: CCSP وAWSA Security, Compliance Frameworks: SOC2/ISO27001/PCI-DSS، الأمان كاستثمار لا تكلفة |
| 1.1.7 | SLA والموثوقية | مفهوم SLA وما يُعنى به عملياً، 99.9% Uptime: كم ساعة توقف؟، AWS SLAs لكل خدمة، مفهوم RPO وRTO، Availability Zones والتوزيع، Auto Scaling للموثوقية، Health Checks والـ Failover، Chaos Engineering: الاختبار باستفزاز الفشل، Incident Response في السحابة، قراءة AWS Service Health Dashboard |
| 1.1.8 | Cloud Native: الفلسفة | Cloud-Native vs Traditional Applications، 12-Factor App Methodology، Immutable Infrastructure، Cattle vs Pets Philosophy، GitOps: البنية التحتية ككود، Stateless vs Stateful Services، Containers كوحدة نشر، API-First Design، Observability as a Requirement، الطريق من Monolith لـ Cloud-Native |
| 1.1.9 | بيئة التطوير والمحاكاة | AWS CLI: التثبيت والإعداد والاستخدام، AWS SDK في Python (boto3) مقدمة، LocalStack لمحاكاة AWS محلياً، AWS CloudShell: Shell في المتصفح، Terraform محلياً مع LocalStack، aws-vault لإدارة Credentials بأمان، AWS Profiles للبيئات المختلفة، Cost Control في التجارب والتعلم، تنظيف الموارد بعد كل تجربة، Best Practices لحساب AWS التعليمي |

### المرحلة 1.2 — AWS: البداية والـ IAM (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.2.1 | إنشاء حساب AWS وإعداده الآمن |
| 1.2.2 | IAM Users وGroups والـ Permissions |
| 1.2.3 | IAM Policies: JSON Syntax والمنطق |
| 1.2.4 | IAM Roles: Service Roles وCross-Account |
| 1.2.5 | MFA والأمان الأساسي للحساب |
| 1.2.6 | AWS Organizations وMulti-Account |
| 1.2.7 | Billing وCost Management |
| 1.2.8 | AWS CLI: الإعداد والأوامر الأساسية |
| 1.2.9 | Free Tier: الاستخدام الذكي والحدود |

### المرحلة 1.3 — الحوسبة (Compute) (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.3.1 | EC2: أنواع الـ Instances والاختيار |
| 1.3.2 | Launching EC2: AMI وKey Pairs |
| 1.3.3 | Security Groups: Inbound وOutbound |
| 1.3.4 | Elastic IP وUser Data |
| 1.3.5 | EC2 Instance Connect وSSH |
| 1.3.6 | EC2 Pricing: On-Demand وSpot وReserved |
| 1.3.7 | AMIs المخصصة وSnapshot |
| 1.3.8 | Auto Scaling: Launch Template |
| 1.3.9 | Elastic Load Balancer: ALB وNLB |

### المرحلة 1.4 — التخزين السحابي (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.4.1 | S3: المفهوم والـ Buckets والـ Objects |
| 1.4.2 | S3 Permissions والـ Bucket Policies |
| 1.4.3 | S3 Storage Classes: Standard وIA وGlacier |
| 1.4.4 | S3 Lifecycle وVersioning |
| 1.4.5 | Static Website Hosting بـ S3 |
| 1.4.6 | EBS: Block Storage للـ EC2 |
| 1.4.7 | EFS: Shared File System |
| 1.4.8 | AWS Backup وتغطية الكوارث |
| 1.4.9 | CloudFront + S3: CDN احترافي |

### المرحلة 1.5 — الشبكات السحابية (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.5.1 | VPC: المفهوم والبنية |
| 1.5.2 | Subnets: Public وPrivate |
| 1.5.3 | Internet Gateway والـ Routing |
| 1.5.4 | NAT Gateway وNAT Instance |
| 1.5.5 | Network ACLs مقابل Security Groups |
| 1.5.6 | VPC Peering وTransit Gateway |
| 1.5.7 | VPN وDirect Connect |
| 1.5.8 | Route53: DNS على AWS |
| 1.5.9 | VPC Flow Logs والمراقبة |

### المرحلة 1.6 — قواعد البيانات السحابية (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.6.1 | RDS: إعداد وربط وإدارة |
| 1.6.2 | RDS: Multi-AZ وRead Replicas |
| 1.6.3 | RDS: Backup وRestore |
| 1.6.4 | Aurora: الـ Serverless Option |
| 1.6.5 | DynamoDB: NoSQL مُدار |
| 1.6.6 | DynamoDB: Queries وIndexes |
| 1.6.7 | ElastiCache: Redis وMemcached |
| 1.6.8 | Database Migration Service (DMS) |
| 1.6.9 | اختيار قاعدة البيانات الصحيحة |

---

### المستوى 2 — المرحلة 2.1: الحاويات والـ Kubernetes (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.1.1 | Docker المتقدم: Multi-Stage وBest Practices |
| 2.1.2 | ECR: Elastic Container Registry |
| 2.1.3 | ECS: Fargate وEC2 Launch Types |
| 2.1.4 | Kubernetes: Architecture وCore Concepts |
| 2.1.5 | EKS: Managed Kubernetes على AWS |
| 2.1.6 | Kubernetes: Deployments وServices |
| 2.1.7 | Kubernetes: ConfigMaps وSecrets |
| 2.1.8 | Kubernetes: HPA وVPA |
| 2.1.9 | Helm: Package Manager لـ Kubernetes |

### المستوى 2 — المرحلة 2.2: Serverless (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.2.1 | Lambda: المفهوم والـ Execution Model |
| 2.2.2 | Lambda: Triggers وEvent Sources |
| 2.2.3 | Lambda: Layers وDependencies |
| 2.2.4 | Lambda: Cold Start وOptimization |
| 2.2.5 | API Gateway + Lambda: REST API |
| 2.2.6 | Step Functions: Orchestration |
| 2.2.7 | EventBridge: Event-Driven Architecture |
| 2.2.8 | SQS وSNS: Messaging |
| 2.2.9 | Serverless Framework وSAM |

### المستوى 2 — المرحلة 2.3: الأمن السحابي المتقدم (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.3.1 | KMS: Key Management |
| 2.3.2 | Secrets Manager وParameter Store |
| 2.3.3 | WAF: Web Application Firewall |
| 2.3.4 | Shield: DDoS Protection |
| 2.3.5 | GuardDuty: Threat Detection |
| 2.3.6 | Inspector وMacie |
| 2.3.7 | Security Hub: CSPM |
| 2.3.8 | Incident Response في AWS |
| 2.3.9 | Penetration Testing على AWS |

### المستوى 2 — المرحلة 2.4: المراقبة والسجلات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.4.1 | CloudWatch Metrics: الأساس |
| 2.4.2 | CloudWatch Logs وLog Groups |
| 2.4.3 | CloudWatch Alarms وSNS |
| 2.4.4 | CloudWatch Dashboards |
| 2.4.5 | X-Ray: Distributed Tracing |
| 2.4.6 | AWS CloudTrail: API Logging |
| 2.4.7 | AWS Config: Resource Compliance |
| 2.4.8 | Amazon Managed Grafana |
| 2.4.9 | Observability Strategy: Metrics/Logs/Traces |

### المستوى 2 — المرحلة 2.5: CI/CD على السحابة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.5.1 | CodeCommit: Git على AWS |
| 2.5.2 | CodeBuild: Build Automation |
| 2.5.3 | CodeDeploy: Blue/Green وIn-Place |
| 2.5.4 | CodePipeline: Pipeline الشامل |
| 2.5.5 | GitHub Actions مع AWS OIDC |
| 2.5.6 | Docker CI/CD: Build وPush وDeploy |
| 2.5.7 | ECS Deployments في Pipeline |
| 2.5.8 | Lambda Deployments وAliases |
| 2.5.9 | Pipeline Security وSecrets |

### المستوى 2 — المرحلة 2.6: Infrastructure as Code (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.6.1 | CloudFormation: Templates وStacks |
| 2.6.2 | CloudFormation: Parameters وOutputs |
| 2.6.3 | CloudFormation: Nested Stacks |
| 2.6.4 | Terraform: الأساسيات وProvider |
| 2.6.5 | Terraform: State وBackend |
| 2.6.6 | Terraform: Modules وReuse |
| 2.6.7 | AWS CDK: TypeScript |
| 2.6.8 | Drift Detection وGitOps |
| 2.6.9 | IaC Security: Checkov وTFSec |

---

### المستوى 3 — المرحلة 3.1: معمارية متعددة المناطق (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.1.1 | Multi-AZ vs Multi-Region: الفرق والتكلفة |
| 3.1.2 | Route53: Routing Policies المتقدمة |
| 3.1.3 | Global Accelerator وعملها |
| 3.1.4 | CloudFront عميق: Behaviors وCache |
| 3.1.5 | RDS Global Database |
| 3.1.6 | DynamoDB Global Tables |
| 3.1.7 | S3 Cross-Region Replication |
| 3.1.8 | Disaster Recovery Tiers |
| 3.1.9 | Chaos Engineering بـ AWS FIS |

### المستوى 3 — المرحلة 3.2: Microservices على السحابة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.2.1 | Event-Driven على SQS/SNS/EventBridge |
| 3.2.2 | Amazon Kafka (MSK) |
| 3.2.3 | API Gateway: Advanced Patterns |
| 3.2.4 | AWS App Mesh: Service Mesh |
| 3.2.5 | Service Discovery بـ Cloud Map |
| 3.2.6 | Saga Pattern بـ Step Functions |
| 3.2.7 | Outbox Pattern على AWS |
| 3.2.8 | Contract Testing في Microservices |
| 3.2.9 | Observability في Microservices |

### المستوى 3 — المرحلة 3.3: تحسين التكاليف (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.3.1 | AWS Cost Explorer: قراءة عميقة |
| 3.3.2 | Reserved Instances وSavings Plans |
| 3.3.3 | Spot Instances: الاستراتيجيات الآمنة |
| 3.3.4 | Right-Sizing: التحجيم الصحيح |
| 3.3.5 | Storage Cost Optimization |
| 3.3.6 | Data Transfer Costs |
| 3.3.7 | FinOps: الثقافة والممارسات |
| 3.3.8 | AWS Compute Optimizer |
| 3.3.9 | Tagging Strategy للمحاسبة |

### المستوى 3 — المرحلة 3.4: الموثوقية والتعافي (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.4.1 | Well-Architected: Reliability Pillar |
| 3.4.2 | Disaster Recovery: Strategies الأربعة |
| 3.4.3 | RPO وRTO: الحساب والتصميم |
| 3.4.4 | AWS Backup: تغطية شاملة |
| 3.4.5 | Chaos Engineering: الفلسفة والتطبيق |
| 3.4.6 | AWS Fault Injection Simulator |
| 3.4.7 | Runbooks وPlaybooks |
| 3.4.8 | Game Days: محاكاة الحوادث |
| 3.4.9 | SRE على AWS: البنية والممارسات |

### المستوى 3 — المرحلة 3.5: MLOps وAI على السحابة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.5.1 | SageMaker: نظرة شاملة |
| 3.5.2 | SageMaker: Training Jobs |
| 3.5.3 | SageMaker: Model Deployment |
| 3.5.4 | Amazon Bedrock: Generative AI |
| 3.5.5 | Rekognition وComprehend وTextract |
| 3.5.6 | MLflow على AWS |
| 3.5.7 | Feature Store وData Prep |
| 3.5.8 | MLOps Pipeline بـ SageMaker Pipelines |
| 3.5.9 | AI على السحابة: اعتبارات التكلفة والأمان |

### المستوى 3 — المرحلة 3.6: حوكمة السحابة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.6.1 | AWS Organizations: الهيكل الكامل |
| 3.6.2 | Service Control Policies (SCPs) |
| 3.6.3 | AWS Control Tower: Landing Zone |
| 3.6.4 | Compliance: SOC2 وISO27001 |
| 3.6.5 | PCI-DSS على AWS |
| 3.6.6 | Data Governance وData Privacy |
| 3.6.7 | GDPR وPrivacy على السحابة |
| 3.6.8 | Cloud Security Posture Management |
| 3.6.9 | الشهادات السحابية: خارطة طريق |

---

## اختبار تحديد المستوى (18 سؤالاً)

| # | target_level_index | target_unit_code | الموضوع |
|---|---|---|---|
| 1 | 1 | 1.1.1 | IaaS/PaaS/SaaS الفروق |
| 2 | 1 | 1.1.2 | نموذج المسؤولية المشتركة |
| 3 | 1 | 1.2.2 | IAM Users وGroups |
| 4 | 1 | 1.2.3 | IAM Policies |
| 5 | 1 | 1.3.3 | Security Groups |
| 6 | 1 | 1.4.1 | S3 المفهوم |
| 7 | 1 | 1.5.1 | VPC |
| 8 | 1 | 1.5.2 | Public vs Private Subnet |
| 9 | 1 | 1.6.2 | RDS Multi-AZ |
| 10 | 2 | 2.1.4 | Kubernetes Architecture |
| 11 | 2 | 2.2.1 | Lambda Execution Model |
| 12 | 2 | 2.2.5 | API Gateway + Lambda |
| 13 | 2 | 2.3.1 | KMS |
| 14 | 2 | 2.6.4 | Terraform Basics |
| 15 | 3 | 3.1.2 | Route53 Routing Policies |
| 16 | 3 | 3.3.2 | Reserved Instances |
| 17 | 3 | 3.4.2 | DR Strategies |
| 18 | 3 | 3.6.2 | SCPs |

---

## هيكل JSON المطلوب

```json
{
  "schema_version": "v4.1",
  "specialty": {
    "slug": "cloud-computing",
    "name": "الحوسبة السحابية",
    "icon": "☁️",
    "description": "مسار شامل من مفاهيم السحابة الأساسية حتى هندسة الأنظمة الموزعة متعددة المناطق — يُخرج مهندساً سحابياً قادراً على تصميم ونشر وتأمين بنى تحتية سحابية إنتاجية",
    "target_persona": "مهندس برمجيات أو شبكات يريد التخصص في البنية التحتية السحابية والحصول على شهادات AWS",
    "teacher_tone": "مهندس سحابي محترف يشارك دروساً من بيئات الإنتاج الحقيقية ويشرح التكاليف والمخاطر بوضوح",
    "allowed_viz_templates": ["architecture_diagram", "flowchart", "comparison_table", "timeline"],
    "allowed_tools": [],
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
كود الوحدة:  "L.S.U"
كود الدرس:   "L.S.U.N"
```

- كل معمل: 5 أسئلة بالضبط — diagnostic, decision, application, analysis, connection.
- كل MCQ: choices ≥ 2 وcorrect_index صالح.
- كل bridge_sentence ≥ 10 كلمات.

## قائمة التحقق النهائية

- [ ] JSON.parse() بدون استثناء
- [ ] slug = "cloud-computing"
- [ ] 3 × 7 × 9 × 10 = 1,890 درس
- [ ] كل معمل: 5 أسئلة من 5 أنواع مختلفة
- [ ] كل كود في prerequisites موجود فعلاً
- [ ] لا دورات في الروابط
- [ ] exam_banks: unit + stage + level
- [ ] 18 سؤال placement وكل target_unit_code موجود

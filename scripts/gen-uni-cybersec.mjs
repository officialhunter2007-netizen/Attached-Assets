import { writeFileSync } from "fs";

const CURRICULUM = {
  schema_version: "v4.1",
  slug: "uni-cybersec",
  name: "الأمن السيبراني",
  icon: "🛡️",
  description: "مسار احترافي متكامل في الأمن السيبراني يبدأ من بروتوكولات الشبكات والتشفير ويصل إلى عمليات Red Team المتقدمة واستخبارات التهديدات وقيادة الأمن المؤسسي، وفق أحدث معايير NIST وISO 27001 وMITRE ATT&CK",
  target_persona: "محترف أمن سيبراني يسعى للتأهل الكامل من الأسس التقنية إلى الاختراق المتقدم والدفاع والقيادة الأمنية، مع قدرة على العمل في فرق SOC وRed Team وBlue Team وقيادة برامج الأمن المؤسسية",
  teacher_tone: "خبير أمن سيبراني يجمع بين عقلية المهاجم وانضباط المدافع، يبدأ كل مفهوم بسيناريو هجوم حقيقي ثم يبني الدفاع طبقة طبقة، يربط كل تقنية بحوادث موثّقة ويدفع المتعلم للتفكير كمهاجم ليُحسن دفاعه",
  allowed_viz_templates: ["flowchart", "network_diagram", "timeline", "comparison_table", "architecture_diagram", "attack_tree"],
  allowed_tools: ["nukhba_ide_python", "nukhba_ide_bash", "nukhba_ide_js", "regex_playground"],
  levels: [
    {
      level_index: 1,
      name: "أساسيات الأمن السيبراني",
      goal: "بناء أساس تقني متين في الشبكات والتشفير وأنظمة التشغيل وإدارة الهوية والحوكمة، بما يُهيّئ المتعلم للتعامل مع بيئات الأمن الحقيقية",
      bloom_focus: "understand",
      exam: { pass_threshold_percent: 65, time_limit_minutes: 70 },
      stages: [
        {
          stage_index: 1,
          name: "الشبكات من منظور أمني",
          goal: "فهم كيف تعمل الشبكات وكيف تُستغل، من البروتوكولات إلى التحليل الحي للحزم",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.1.1",
              name: "نموذج OSI وTCP/IP من زاوية المهاجم",
              goal: "تحليل كل طبقة من طبقات الشبكة لفهم ما يمكن مهاجمته وما يمكن حمايته",
              key_concepts: ["OSI Layers","TCP Three-Way Handshake","IP Fragmentation","Protocol Encapsulation","Attack Surface per Layer"],
              lessons: [
                { name: "طبقات OSI السبع: ما يراه المهاجم في كل طبقة", primary: "OSI model from attacker perspective" },
                { name: "نموذج TCP/IP العملي مقارنةً بـOSI", primary: "TCP/IP model vs OSI in practice" },
                { name: "المصافحة الثلاثية TCP وثغرات SYN Flood", primary: "TCP handshake and SYN flood attacks" },
                { name: "IP Fragmentation وهجمات إعادة التجميع", primary: "IP fragmentation and reassembly attacks" },
                { name: "التغليف وفك التغليف: كيف تنتقل البيانات عبر الطبقات", primary: "Encapsulation and decapsulation flow" },
                { name: "UDP وبروتوكولات Connectionless: نقاط الضعف", primary: "UDP attacks and connectionless protocols" },
                { name: "ICMP: أداة التشخيص أو التهديد", primary: "ICMP usage in attacks: ping sweep, tunneling" },
                { name: "تحديد سطح الهجوم لكل طبقة شبكية", primary: "Attack surface mapping per OSI layer" },
                { name: "قراءة حزم الشبكة الخام بـPython", primary: "Raw socket packet reading with Python" }
              ]
            },
            {
              unit_index: 2, code: "1.1.2",
              name: "بروتوكولات طبقة التطبيق وثغراتها",
              goal: "تحليل بروتوكولات HTTP وDNS وSMTP وFTP وSNMP واستيعاب نقاط ضعفها الأصيلة",
              key_concepts: ["HTTP Headers","DNS Query Types","SMTP Relay","FTP Passive Mode","SNMP Community Strings"],
              lessons: [
                { name: "HTTP/1.1 وHTTPS: هيكل الطلب والاستجابة", primary: "HTTP request/response structure and security headers" },
                { name: "HTTP/2 وHTTP/3: ما الجديد أمنياً", primary: "HTTP/2 multiplexing and HTTP/3 QUIC security" },
                { name: "DNS: الاستعلامات والأنواع واستغلال الكاش", primary: "DNS query types and DNS cache poisoning" },
                { name: "SMTP وPOP3 وIMAP: أمن البريد الإلكتروني", primary: "Email protocols and security: SPF, DKIM, DMARC" },
                { name: "FTP وSFTP وSCP: نقل الملفات الآمن وغير الآمن", primary: "FTP vs SFTP security comparison" },
                { name: "SNMP: إدارة الشبكة وخطورة Community Strings", primary: "SNMP community strings exploitation" },
                { name: "SMB وNFS: مشاركة الملفات ونقاط الضعف", primary: "SMB vulnerabilities: EternalBlue, null sessions" },
                { name: "LDAP وثغرات دليل الخدمة", primary: "LDAP queries and injection attacks" },
                { name: "RDP وVNC: بروتوكولات سطح المكتب البعيد", primary: "RDP BlueKeep and brute force attacks" }
              ]
            },
            {
              unit_index: 3, code: "1.1.3",
              name: "العنونة IP وتقسيم الشبكات",
              goal: "احتراف حساب الشبكات الفرعية وفهم كيف يستخدمها المهاجم لرسم خريطة الهدف",
              key_concepts: ["CIDR Notation","Subnetting","IPv6","Private Ranges","NAT Traversal"],
              lessons: [
                { name: "عناوين IPv4 والفئات والنطاقات الخاصة", primary: "IPv4 addressing and private ranges" },
                { name: "CIDR وحساب الشبكات الفرعية بسرعة", primary: "CIDR subnetting calculations" },
                { name: "IPv6: البنية والمميزات والثغرات الجديدة", primary: "IPv6 addressing and unique attack vectors" },
                { name: "NAT وكيف يُعقّد الاستطلاع على المهاجم", primary: "NAT traversal techniques" },
                { name: "ARP: بروتوكول التحليل وهجمات الانتحال", primary: "ARP spoofing and Man-in-the-Middle" },
                { name: "DHCP: توزيع العناوين وهجوم Starvation", primary: "DHCP starvation and rogue DHCP attacks" },
                { name: "VLAN ومفهوم تقسيم الشبكة أمنياً", primary: "VLAN segmentation and VLAN hopping" },
                { name: "رسم خريطة الشبكة بأدوات Nmap وfping", primary: "Network mapping with Nmap and fping" },
                { name: "قراءة مخططات الشبكة وفهم التوبولوجيا", primary: "Network topology analysis and documentation" }
              ]
            },
            {
              unit_index: 4, code: "1.1.4",
              name: "تحليل الحزم مع Wireshark وtcpdump",
              goal: "اكتساب مهارة قراءة حركة الشبكة الحية وتحليل الحوادث من خلال الـPCAP",
              key_concepts: ["PCAP Files","Display Filters","Follow TCP Stream","Statistics","Decryption"],
              lessons: [
                { name: "واجهة Wireshark: الالتقاط والتصفية الأساسية", primary: "Wireshark interface and basic capture filters" },
                { name: "فلاتر العرض المتقدمة: بناء استعلامات دقيقة", primary: "Wireshark display filter syntax and operators" },
                { name: "تتبع تدفق TCP وHTTP: قراءة المحادثة كاملة", primary: "Follow TCP/HTTP stream in Wireshark" },
                { name: "tcpdump في سطر الأوامر: الالتقاط والتحليل", primary: "tcpdump command-line packet capture" },
                { name: "تحليل هجوم ARP Spoofing في PCAP", primary: "Analyzing ARP spoofing in captured traffic" },
                { name: "كشف مسح Nmap من خلال الحزم", primary: "Detecting Nmap scans in network traffic" },
                { name: "استخراج الملفات والبيانات من حركة HTTP", primary: "File extraction from HTTP traffic in Wireshark" },
                { name: "تحليل اتصالات TLS: ما يُرى وما يُخفى", primary: "TLS traffic analysis and metadata" },
                { name: "بناء تقرير تحليل شبكي من PCAP", primary: "Creating network analysis report from PCAP" }
              ]
            },
            {
              unit_index: 5, code: "1.1.5",
              name: "البروتوكولات الآمنة TLS وSSH وVPN",
              goal: "فهم آليات التشفير في الشبكة وتكوينها بشكل صحيح وكشف إعداداتها الخاطئة",
              key_concepts: ["TLS Handshake","Certificate Validation","SSH Key Auth","IPSec","OpenVPN"],
              lessons: [
                { name: "TLS 1.3: المصافحة والتشفير والتحقق من الهوية", primary: "TLS 1.3 handshake and security improvements" },
                { name: "شهادات SSL/TLS: الهيكل والتحقق والانتهاء", primary: "X.509 certificates and validation chain" },
                { name: "ثغرات TLS القديمة: POODLE وBEAST وHEARTBLEED", primary: "Historic TLS vulnerabilities and mitigations" },
                { name: "SSH: المصادقة بالمفاتيح والإعداد الآمن", primary: "SSH key-based authentication and hardening" },
                { name: "إعادة توجيه منافذ SSH: Port Forwarding وTunneling", primary: "SSH tunneling and port forwarding techniques" },
                { name: "IPSec: بروتوكولات AH وESP والأوضاع", primary: "IPSec tunnel vs transport mode" },
                { name: "OpenVPN وWireGuard: المقارنة والإعداد الآمن", primary: "OpenVPN vs WireGuard security comparison" },
                { name: "HTTPS Everywhere: HSTS وCertificate Pinning", primary: "HSTS and certificate pinning implementation" },
                { name: "اختبار إعداد TLS بأدوات SSLyze وtestssl.sh", primary: "TLS configuration testing with automated tools" }
              ]
            },
            {
              unit_index: 6, code: "1.1.6",
              name: "جدران الحماية وقوائم التحكم بالوصول",
              goal: "تصميم قواعد جدار الحماية بشكل صحيح وتجنّب الثغرات الشائعة في الإعداد",
              key_concepts: ["Stateful Inspection","ACL Rules","UFW/iptables","WAF","Firewall Evasion"],
              lessons: [
                { name: "أنواع جدران الحماية: Packet Filter وStateful وNGFW", primary: "Firewall types and inspection levels" },
                { name: "iptables وnftables: كتابة قواعد دقيقة", primary: "iptables/nftables rule writing" },
                { name: "UFW: واجهة بسيطة لإدارة الجدار الناري", primary: "UFW firewall management" },
                { name: "قوائم التحكم بالوصول ACL في الشبكات", primary: "Network ACL design and best practices" },
                { name: "NGFW وميزات Deep Packet Inspection", primary: "Next-gen firewall DPI capabilities" },
                { name: "WAF: حماية تطبيقات الويب وقواعده", primary: "Web Application Firewall rules and evasion" },
                { name: "تقنيات التحايل على جدار الحماية", primary: "Firewall evasion techniques: fragmentation, tunneling" },
                { name: "اختبار فعالية جدار الحماية وتدقيق قواعده", primary: "Firewall rule auditing and effectiveness testing" },
                { name: "المناطق الأمنية DMZ والمعمارية متعددة الطبقات", primary: "DMZ architecture and security zones" }
              ]
            },
            {
              unit_index: 7, code: "1.1.7",
              name: "أمن الشبكات اللاسلكية Wi-Fi",
              goal: "فهم بروتوكولات الأمن اللاسلكي وكيف تُختبر وكيف تُحمى",
              key_concepts: ["WPA2 4-Way Handshake","WPA3 SAE","Evil Twin","Deauth Attack","Rogue AP"],
              lessons: [
                { name: "بروتوكولات أمن Wi-Fi: WEP وWPA وWPA2 وWPA3", primary: "Wi-Fi security evolution: WEP to WPA3" },
                { name: "WPA2 4-Way Handshake والقبض عليه", primary: "WPA2 handshake capture and offline cracking" },
                { name: "هجوم Deauthentication: طرد المستخدمين", primary: "802.11 deauth attack mechanics" },
                { name: "Evil Twin وRogue AP: شبكات وهمية", primary: "Evil twin and rogue AP attacks" },
                { name: "WPA3 SAE: مقاومة هجمات القاموس", primary: "WPA3 Simultaneous Authentication of Equals" },
                { name: "اختبار اختراق Wi-Fi مع Aircrack-ng", primary: "Wi-Fi penetration testing methodology" },
                { name: "Captive Portals: التحايل والحماية", primary: "Captive portal bypass and security" },
                { name: "شبكات الضيوف والعزل الصحيح", primary: "Guest network isolation and segmentation" },
                { name: "مراقبة الشبكة اللاسلكية وكشف الأجهزة المارقة", primary: "Wireless IDS and rogue device detection" }
              ]
            },
            {
              unit_index: 8, code: "1.1.8",
              name: "DNS وARP: بروتوكولات التحليل وهجماتها",
              goal: "فهم كيف يُستغل DNS وARP في الهجمات وكيف تُقام الحماية المناسبة",
              key_concepts: ["DNS Spoofing","Cache Poisoning","ARP Poisoning","MITM","DNSSEC"],
              lessons: [
                { name: "DNS من الداخل: التسلسل الهرمي والتخزين المؤقت", primary: "DNS hierarchy, recursion, and caching" },
                { name: "تسميم كاش DNS: هجوم كامينسكي الشهير", primary: "DNS cache poisoning: Kaminsky attack" },
                { name: "DNS Hijacking وتحويل الأهداف", primary: "DNS hijacking via registrar and MITM" },
                { name: "DNS Tunneling: نقل البيانات عبر DNS", primary: "DNS tunneling for C2 and data exfiltration" },
                { name: "DNSSEC: التوقيع الرقمي لسجلات DNS", primary: "DNSSEC implementation and validation chain" },
                { name: "ARP Poisoning وهجوم Man-in-the-Middle", primary: "ARP poisoning MITM with arpspoof/ettercap" },
                { name: "مراقبة ARP وكشف التغييرات غير المصرح بها", primary: "ARP monitoring and anomaly detection" },
                { name: "DoH وDoT: DNS المشفّر", primary: "DNS over HTTPS and DNS over TLS" },
                { name: "دمج ملفات HOSTS وDNS في الاستطلاع", primary: "DNS enumeration for reconnaissance" }
              ]
            },
            {
              unit_index: 9, code: "1.1.9",
              name: "VPN والشبكات الخاصة الافتراضية",
              goal: "تصميم وإعداد وتقييم حلول VPN من منظور الأمن والأداء والامتثال",
              key_concepts: ["Site-to-Site VPN","Remote Access VPN","Split Tunneling","Zero Trust vs VPN","VPN Vulnerabilities"],
              lessons: [
                { name: "أنواع VPN: Site-to-Site وRemote Access وSD-WAN", primary: "VPN types and use cases" },
                { name: "OpenVPN: الإعداد والتوثيق والأمان", primary: "OpenVPN setup with certificates" },
                { name: "WireGuard: البساطة والأداء والأمان العصري", primary: "WireGuard protocol and security model" },
                { name: "IPSec VPN: IKEv1 وIKEv2 والإعداد المؤسسي", primary: "IPSec IKEv2 enterprise configuration" },
                { name: "Split Tunneling: خطر التحايل على السياسات", primary: "Split tunneling risks and policy enforcement" },
                { name: "ثغرات VPN المؤسسية: CVEs والاستغلال", primary: "Enterprise VPN CVEs: Pulse, Fortinet, Citrix" },
                { name: "Zero Trust vs VPN التقليدي", primary: "Zero Trust Network Access vs traditional VPN" },
                { name: "مراقبة VPN والكشف عن الاستخدام المشبوه", primary: "VPN log monitoring and anomaly detection" },
                { name: "نموذج الوصول الأمثل للعاملين عن بعد", primary: "Secure remote access architecture design" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "أنظمة التشغيل للأمن السيبراني",
          goal: "إتقان Linux وWindows من منظور المهاجم والمدافع، مع أتمتة المهام الأمنية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.2.1",
              name: "Linux للأمن السيبراني: الأساس والأوامر",
              goal: "إتقان بيئة Linux التي تشغّل أغلب أدوات الأمن السيبراني وخوادم الإنتاج",
              key_concepts: ["File Permissions","sudo","Process Management","crontab","/proc Filesystem"],
              lessons: [
                { name: "فلسفة Linux وبنية نظام الملفات الأمنية", primary: "Linux filesystem hierarchy and security implications" },
                { name: "الأذونات: chmod وchown ورموز SUID/SGID", primary: "Linux permissions, SUID, SGID, sticky bit" },
                { name: "sudo والتصعيد المشروع وغير المشروع", primary: "sudo abuse and privilege escalation" },
                { name: "إدارة العمليات: ps وkill وlsof وstrace", primary: "Process management and monitoring tools" },
                { name: "cron والمهام المجدولة: التحليل والتعديل الخبيث", primary: "Cron job abuse for persistence" },
                { name: "نظام ملفات /proc و/sys: معلومات النظام الحية", primary: "/proc filesystem for security analysis" },
                { name: "إدارة الخدمات systemd وkillchain", primary: "Systemd service analysis and manipulation" },
                { name: "الشبكة في Linux: ip وss وnetstat", primary: "Linux networking tools for security" },
                { name: "Bash Scripting الأمني: أتمتة المهام", primary: "Security-focused bash scripting" }
              ]
            },
            {
              unit_index: 2, code: "1.2.2",
              name: "نموذج أمن Windows وActive Directory",
              goal: "فهم نموذج الأمن في Windows وكيف يُستغل في هجمات الشبكات الداخلية",
              key_concepts: ["Windows Security Model","SAM Database","NTLM","Kerberos","Active Directory"],
              lessons: [
                { name: "نموذج الأمن في Windows: SID وACL وToken", primary: "Windows security model: SID, ACL, access token" },
                { name: "سجل Windows: مفاتيح حرجة للمهاجم والمدافع", primary: "Windows registry security keys" },
                { name: "قاعدة SAM وكلمات المرور المُخزّنة", primary: "SAM database and NTLM hash storage" },
                { name: "Active Directory: الهيكل والكائنات والثقة", primary: "Active Directory structure, OU, and trusts" },
                { name: "Group Policy: تطبيق السياسات والتحليل الأمني", primary: "GPO security configuration and analysis" },
                { name: "Windows Defender وEvent Viewer للمدافع", primary: "Windows Defender and security event analysis" },
                { name: "PowerShell للأمن: الأوامر والإمكانيات", primary: "PowerShell security scripting and analysis" },
                { name: "Windows Firewall وAdvanced Security", primary: "Windows Firewall with Advanced Security rules" },
                { name: "UAC ونموذج الامتيازات في Windows الحديثة", primary: "UAC bypass techniques and protection" }
              ]
            },
            {
              unit_index: 3, code: "1.2.3",
              name: "سجلات النظام وأدوات المراقبة",
              goal: "قراءة سجلات النظام وتحليلها لكشف الأنشطة المشبوهة والهجمات المحتملة",
              key_concepts: ["Event IDs","Syslog","Auditd","Windows Event Log","Log Forwarding"],
              lessons: [
                { name: "Windows Event Log: البنية والأحداث الحرجة", primary: "Critical Windows Event IDs for security" },
                { name: "Syslog في Linux: الإعداد والتحليل", primary: "Linux syslog configuration and analysis" },
                { name: "Auditd: التدقيق الشامل لنظام Linux", primary: "Auditd for comprehensive Linux auditing" },
                { name: "Event IDs المهمة: 4624 و4625 و4688 وغيرها", primary: "Critical Windows security Event IDs" },
                { name: "إعادة توجيه السجلات مركزياً: rsyslog وNXLog", primary: "Log forwarding and centralization" },
                { name: "Sysmon: تسجيل متقدم لـWindows", primary: "Sysmon configuration for enhanced logging" },
                { name: "تحليل سجلات التصيّد والتنفيذ الضار", primary: "Log analysis for phishing and malware execution" },
                { name: "PowerShell Logging: Script Block وModule", primary: "PowerShell logging and detection" },
                { name: "بناء بيئة تجميع سجلات مبسّطة بـElastic", primary: "Basic ELK stack for log collection" }
              ]
            },
            {
              unit_index: 4, code: "1.2.4",
              name: "تقسية نظام التشغيل Hardening",
              goal: "تطبيق ضوابط التقسية على Linux وWindows لتقليص سطح الهجوم",
              key_concepts: ["CIS Benchmarks","AppArmor/SELinux","Minimal Install","Service Reduction","Baseline"],
              lessons: [
                { name: "مفهوم Attack Surface Reduction والمبادئ", primary: "Attack surface reduction principles" },
                { name: "CIS Benchmarks: معايير التقسية الصناعية", primary: "CIS Benchmark application for hardening" },
                { name: "تقسية Linux: الخدمات والمنافذ والأذونات", primary: "Linux hardening: services, ports, permissions" },
                { name: "SELinux وAppArmor: التحكم الإلزامي بالوصول", primary: "SELinux and AppArmor mandatory access control" },
                { name: "تقسية Windows Server: الإعدادات الأساسية", primary: "Windows Server hardening baseline" },
                { name: "إدارة التحديثات والرقع الأمنية المنتظمة", primary: "Patch management and update automation" },
                { name: "تعطيل الخدمات غير الضرورية وتقليص النواة", primary: "Unnecessary service removal and minimal install" },
                { name: "قياس وضع الأمان بأدوات Lynis وOpenSCAP", primary: "Security posture assessment with Lynis/OpenSCAP" },
                { name: "توثيق خط الأساس الأمني Baseline", primary: "Security baseline documentation and drift detection" }
              ]
            },
            {
              unit_index: 5, code: "1.2.5",
              name: "إدارة المستخدمين والمجموعات أمنياً",
              goal: "تطبيق مبادئ أقل امتياز وفصل الواجبات في إدارة حسابات النظام",
              key_concepts: ["Principle of Least Privilege","Separation of Duties","Privileged Accounts","Password Policy","Account Audit"],
              lessons: [
                { name: "مبدأ أقل امتياز: التطبيق العملي", primary: "Least privilege principle in user management" },
                { name: "فصل الواجبات: التصميم والتطبيق", primary: "Separation of duties in system administration" },
                { name: "حسابات الخدمة وحسابات المشرف: الإدارة الآمنة", primary: "Service accounts and admin account security" },
                { name: "سياسات كلمات المرور: التعقيد والانتهاء والتاريخ", primary: "Password policy configuration and enforcement" },
                { name: "مراجعة الحسابات: كشف الحسابات المهجورة", primary: "Account audit and dormant account detection" },
                { name: "مجموعات Linux و Windows وأذونات الموارد", primary: "Group management and resource permission assignment" },
                { name: "حسابات الطوارئ Break-Glass والإجراءات", primary: "Break-glass account procedures" },
                { name: "تدقيق الامتيازات وإزالة الزيادات", primary: "Privilege audit and remediation" },
                { name: "حماية حسابات المشرف من هجمات Credential Theft", primary: "Admin account protection from credential theft" }
              ]
            },
            {
              unit_index: 6, code: "1.2.6",
              name: "Python للأمن السيبراني: الأسلحة والأدوات",
              goal: "كتابة سكريبتات Python للمهام الأمنية من المسح إلى التحليل إلى الأتمتة",
              key_concepts: ["socket","subprocess","scapy","requests","hashlib"],
              lessons: [
                { name: "Python للأمن: البيئة والمكتبات الجوهرية", primary: "Python security environment and key libraries" },
                { name: "بناء ماسح منافذ بسيط مع socket", primary: "Port scanner with Python socket" },
                { name: "التعامل مع HTTP والأتمتة مع requests", primary: "HTTP automation with Python requests" },
                { name: "معالجة الحزم مع Scapy: الأساس", primary: "Packet crafting and analysis with Scapy" },
                { name: "التشفير وdefiniteلها مع hashlib وcryptography", primary: "Cryptography with Python hashlib and cryptography" },
                { name: "تحليل ملفات السجل بـ Regex في Python", primary: "Log file parsing with Python regex" },
                { name: "أتمتة الفحص مع subprocess وos", primary: "Security automation with subprocess" },
                { name: "بناء أداة استطلاع DNS بسيطة", primary: "DNS reconnaissance tool with Python" },
                { name: "كتابة Exploit مبسّط للتدريب بيئة معزولة", primary: "Simple exploit PoC in isolated lab" }
              ]
            },
            {
              unit_index: 7, code: "1.2.7",
              name: "PowerShell وأتمتة أمن Windows",
              goal: "توظيف PowerShell في المهام الأمنية الهجومية والدفاعية في بيئات Windows",
              key_concepts: ["PowerShell Remoting","WMI","AMSI","Constrained Language","Script Analysis"],
              lessons: [
                { name: "PowerShell أساسيات: Cmdlets والبنية", primary: "PowerShell cmdlets and pipeline" },
                { name: "أوامر الاستطلاع في PowerShell", primary: "PowerShell reconnaissance commands" },
                { name: "WMI وCIM: الاستعلام عن النظام والأتمتة", primary: "WMI/CIM for system queries and automation" },
                { name: "PowerShell Remoting وWinRM", primary: "PowerShell remoting security configuration" },
                { name: "AMSI: آلية الكشف ومحاولات التحايل", primary: "AMSI bypass techniques and detection" },
                { name: "Constrained Language Mode: الحماية والقيود", primary: "PowerShell Constrained Language Mode" },
                { name: "تحليل سكريبتات PowerShell المشبوهة", primary: "Malicious PowerShell script analysis" },
                { name: "أدوات BloodHound وSharpHound لـAD", primary: "BloodHound for Active Directory analysis" },
                { name: "بناء Runbook أمني بـPowerShell", primary: "Security runbook automation with PowerShell" }
              ]
            },
            {
              unit_index: 8, code: "1.2.8",
              name: "الأجهزة الافتراضية وبيئات الاختبار",
              goal: "بناء مختبر الأمن السيبراني الشخصي لإجراء التجارب بأمان وواقعية",
              key_concepts: ["VirtualBox","VMware","Kali Linux","Vulnerable VMs","Network Isolation"],
              lessons: [
                { name: "تصميم مختبر الأمن: المتطلبات والهيكل", primary: "Security lab design and architecture" },
                { name: "VirtualBox وVMware: الإعداد والشبكات", primary: "Hypervisor setup for security labs" },
                { name: "Kali Linux: أداة المخترق الرسمية", primary: "Kali Linux installation and tool overview" },
                { name: "VMs الضعيفة: Metasploitable وDVWA وVulnHub", primary: "Intentionally vulnerable VMs for practice" },
                { name: "عزل الشبكة: الشبكات الداخلية فقط", primary: "Network isolation in lab environments" },
                { name: "Snapshots والتراجع بعد التجارب", primary: "VM snapshots for lab management" },
                { name: "Docker للتجارب السريعة والمعزولة", primary: "Docker containers for security testing" },
                { name: "Proxmox: مختبر أمن متقدم مفتوح المصدر", primary: "Proxmox homelab for advanced security practice" },
                { name: "توثيق التجارب وبناء Portfolio تقني", primary: "Lab documentation and portfolio building" }
              ]
            },
            {
              unit_index: 9, code: "1.2.9",
              name: "بروتوكولات المصادقة وSSO",
              goal: "فهم آليات المصادقة الحديثة ونقاط ضعفها الشائعة في بيئات المؤسسات",
              key_concepts: ["Kerberos","NTLM","LDAP Bind","SAML","OAuth 2.0"],
              lessons: [
                { name: "NTLM: آلية المصادقة القديمة وثغراتها", primary: "NTLM authentication and relay attacks" },
                { name: "Kerberos: التذاكر والتشفير والثقة", primary: "Kerberos tickets, TGT, and TGS" },
                { name: "Pass-the-Hash وPass-the-Ticket", primary: "PtH and PtT attack techniques" },
                { name: "Kerberoasting وASREP Roasting", primary: "Kerberoasting and AS-REP roasting attacks" },
                { name: "LDAP وBind Authentication وإعداداته الأمنية", primary: "LDAP authentication security" },
                { name: "SAML وSSO: التدفق وثغرات XML Signature", primary: "SAML SSO flow and XML signature vulnerabilities" },
                { name: "OAuth 2.0 وOpenID Connect: التفويض والهوية", primary: "OAuth 2.0 flows and common vulnerabilities" },
                { name: "Multi-Factor Authentication: الأنواع والكسر", primary: "MFA types and bypass techniques" },
                { name: "Passwordless Authentication والمستقبل", primary: "FIDO2, WebAuthn, and passwordless security" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "التشفير والبروتوكولات الآمنة",
          goal: "إتقان أسس التشفير الرياضي والعملي وبناء أنظمة اتصال آمنة فعلياً",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.3.1",
              name: "أسس رياضيات التشفير",
              goal: "فهم الأساس الرياضي الذي يقوم عليه التشفير الحديث",
              key_concepts: ["Prime Numbers","Modular Arithmetic","XOR","Entropy","Random Number Generation"],
              lessons: [
                { name: "الأعداد الأولية ودورها في التشفير", primary: "Prime numbers in cryptography" },
                { name: "الحسابات المودولية: أساس RSA والتشفير", primary: "Modular arithmetic foundations" },
                { name: "XOR: عملية التشفير الأبسط والأقوى", primary: "XOR operation in cryptography" },
                { name: "الإنتروبيا وعشوائية مفاتيح التشفير", primary: "Entropy and cryptographic randomness" },
                { name: "مولّدات الأرقام العشوائية الآمنة CSPRNG", primary: "Cryptographically secure random number generators" },
                { name: "نظرية المعلومات والسرية المثالية", primary: "Information theory and perfect secrecy" },
                { name: "المفاهيم الأساسية: السرية والتكامل والتحقق", primary: "CIA in cryptography: confidentiality, integrity, auth" },
                { name: "تحليل التشفير الكلاسيكي: قيصر ووينيام", primary: "Classical cipher cryptanalysis" },
                { name: "الفرق بين التشفير والترميز والتجزئة", primary: "Encryption vs encoding vs hashing" }
              ]
            },
            {
              unit_index: 2, code: "1.3.2",
              name: "التشفير المتماثل: AES والأوضاع",
              goal: "فهم AES وأوضاع تشغيله وكيف يُستخدم بشكل صحيح أو خاطئ",
              key_concepts: ["AES Rounds","ECB Mode","CBC Mode","GCM Mode","Padding Attacks"],
              lessons: [
                { name: "AES: الخوارزمية والجولات والحالة الداخلية", primary: "AES algorithm rounds and internal state" },
                { name: "ECB Mode: لماذا هو خطير رغم تشفيره", primary: "ECB mode weakness and penguin illustration" },
                { name: "CBC Mode: المتجهات الابتدائية والـPadding Oracle", primary: "CBC mode and padding oracle attacks" },
                { name: "CTR Mode: تدفق عشوائي من مشفّر كتلي", primary: "CTR mode and stream-like encryption" },
                { name: "GCM Mode: التشفير والمصادقة معاً", primary: "AES-GCM authenticated encryption" },
                { name: "ChaCha20-Poly1305: بديل AES-GCM", primary: "ChaCha20-Poly1305 as AES alternative" },
                { name: "إدارة المفاتيح المتماثلة: التوزيع والدوران", primary: "Symmetric key management and rotation" },
                { name: "هجوم Padding Oracle عملياً", primary: "Padding oracle attack demonstration" },
                { name: "اختيار الوضع المناسب حسب السيناريو", primary: "Cipher mode selection criteria" }
              ]
            },
            {
              unit_index: 3, code: "1.3.3",
              name: "التشفير غير المتماثل: RSA وECC",
              goal: "فهم كيف يحل التشفير غير المتماثل مشكلة تبادل المفاتيح ونقاط ضعف التطبيق",
              key_concepts: ["RSA Key Generation","Diffie-Hellman","ECC","ECDSA","Forward Secrecy"],
              lessons: [
                { name: "RSA: توليد المفاتيح والتشفير والفك رياضياً", primary: "RSA key generation and operations" },
                { name: "ثغرات RSA الشائعة: المفاتيح الصغيرة والـPadding", primary: "RSA vulnerabilities: small keys, PKCS#1 v1.5" },
                { name: "Diffie-Hellman: تبادل المفاتيح عبر قناة عامة", primary: "Diffie-Hellman key exchange" },
                { name: "ECC: تشفير المنحنيات الإهليجية والكفاءة", primary: "Elliptic Curve Cryptography principles" },
                { name: "ECDSA: التوقيع الرقمي بالمنحنيات الإهليجية", primary: "ECDSA signing and verification" },
                { name: "ECDH: تبادل المفاتيح بالمنحنيات الإهليجية", primary: "ECDH key exchange" },
                { name: "Perfect Forward Secrecy: التشفير الذي لا يُشترى", primary: "Perfect forward secrecy in TLS" },
                { name: "Post-Quantum Cryptography: التحضير للمستقبل", primary: "Post-quantum cryptography algorithms" },
                { name: "التوقيع الرقمي في العمل: GPG وSignatures", primary: "Digital signatures with GPG" }
              ]
            },
            {
              unit_index: 4, code: "1.3.4",
              name: "دوال الهاش والتوقيع الرقمي",
              goal: "توظيف دوال الهاش بشكل صحيح لضمان تكامل البيانات والتحقق من الهوية",
              key_concepts: ["SHA-256","MD5 Weaknesses","HMAC","Birthday Attack","Rainbow Tables"],
              lessons: [
                { name: "SHA-2 وSHA-3: البنية والتطبيقات", primary: "SHA-2 and SHA-3 hash functions" },
                { name: "MD5 وSHA-1: لماذا لا تصلح للأمن اليوم", primary: "MD5 and SHA-1 weaknesses and collisions" },
                { name: "HMAC: المصادقة على الرسائل بالمفتاح", primary: "HMAC construction and use cases" },
                { name: "هجوم عيد الميلاد Birthday Attack: الرياضيات", primary: "Birthday attack probability and implications" },
                { name: "Rainbow Tables وكسر الهاش بكفاءة", primary: "Rainbow tables and precomputed hash attacks" },
                { name: "bcrypt وArgon2 وPBKDF2: هاش كلمات المرور", primary: "Password hashing with bcrypt, Argon2, PBKDF2" },
                { name: "التحقق من سلامة الملفات بالهاش", primary: "File integrity verification with hashing" },
                { name: "Merkle Trees وBlock Chains: هاش متسلسل", primary: "Merkle trees and blockchain hashing" },
                { name: "تطبيق HMAC بـPython لحماية API", primary: "HMAC implementation for API authentication" }
              ]
            },
            {
              unit_index: 5, code: "1.3.5",
              name: "البنية التحتية للمفاتيح العامة PKI",
              goal: "فهم كيف تعمل PKI وكيف تُصدر الشهادات وتُدار في بيئات المؤسسات",
              key_concepts: ["CA Hierarchy","X.509 Certificates","CRL","OCSP","Certificate Transparency"],
              lessons: [
                { name: "PKI: الهيكل والمكونات والثقة", primary: "PKI hierarchy: Root CA, Intermediate CA, Leaf" },
                { name: "شهادة X.509: الحقول والامتدادات", primary: "X.509 certificate structure and extensions" },
                { name: "إصدار الشهادات: CSR والتوقيع والتسليم", primary: "Certificate issuance flow: CSR to signed cert" },
                { name: "إلغاء الشهادات: CRL وOCSP", primary: "Certificate revocation: CRL and OCSP" },
                { name: "Certificate Transparency: الشفافية والمراقبة", primary: "Certificate Transparency logs" },
                { name: "Let's Encrypt وإصدار الشهادات المجاني", primary: "Let's Encrypt ACME protocol" },
                { name: "إعداد CA داخلية بـopenssl في المختبر", primary: "Internal CA setup with OpenSSL" },
                { name: "الشهادات الموقّعة ذاتياً: متى تُقبل ومتى لا", primary: "Self-signed certificates: risks and use cases" },
                { name: "Certificate Pinning في التطبيقات المحمولة", primary: "Certificate pinning implementation" }
              ]
            },
            {
              unit_index: 6, code: "1.3.6",
              name: "TLS/SSL: المصافحة والإعداد والثغرات",
              goal: "تطبيق TLS بشكل صحيح وكشف الإعدادات الضعيفة في بيئات الإنتاج",
              key_concepts: ["TLS 1.3 Handshake","Cipher Suites","Certificate Validation","HSTS","SNI"],
              lessons: [
                { name: "مصافحة TLS 1.2 vs TLS 1.3: ما الجديد", primary: "TLS 1.2 vs TLS 1.3 handshake comparison" },
                { name: "Cipher Suites: اختيار المجموعات الآمنة", primary: "Cipher suite selection and weak ciphers" },
                { name: "ثغرات TLS التاريخية: POODLE وBEAST وLOGJAM", primary: "Historic TLS vulnerabilities overview" },
                { name: "HEARTBLEED: الثغرة التي هزّت الإنترنت", primary: "Heartbleed vulnerability analysis" },
                { name: "التحقق من الشهادات وهجوم MITM", primary: "Certificate validation and MITM attacks" },
                { name: "HSTS وHPKP: إجبار المتصفح على الأمان", primary: "HSTS and HPKP headers" },
                { name: "SNI: مشاركة IP مع شهادات متعددة", primary: "Server Name Indication and privacy" },
                { name: "فحص TLS بـSSLyze وtestssl.sh وNmap", primary: "TLS scanning and analysis tools" },
                { name: "إعداد Nginx وApache بـTLS صحيح", primary: "Secure TLS configuration for web servers" }
              ]
            },
            {
              unit_index: 7, code: "1.3.7",
              name: "إدارة المفاتيح والسرّ",
              goal: "تصميم وتطبيق حلول إدارة المفاتيح والأسرار في البيئات المؤسسية والسحابية",
              key_concepts: ["KMS","HSM","Vault","Key Rotation","Secret Zero"],
              lessons: [
                { name: "دورة حياة المفتاح: الإنشاء والتوزيع والدوران والإتلاف", primary: "Cryptographic key lifecycle" },
                { name: "HashiCorp Vault: إدارة الأسرار المؤسسية", primary: "HashiCorp Vault fundamentals" },
                { name: "AWS KMS وAzure Key Vault وGCP KMS", primary: "Cloud KMS services comparison" },
                { name: "HSM: وحدات أمن الأجهزة", primary: "Hardware Security Modules in enterprise" },
                { name: "مشكلة Secret Zero وحلولها", primary: "Secret zero problem and bootstrap solutions" },
                { name: "دوران المفاتيح والأسرار دون توقف الخدمة", primary: "Zero-downtime key rotation strategies" },
                { name: "تشفير المفاتيح بمفاتيح: Key Encryption Keys", primary: "Key wrapping and envelope encryption" },
                { name: "إدارة أسرار CI/CD وPipelines", primary: "Secrets in CI/CD pipelines" },
                { name: "منع تسرّب الأسرار في الكود والسجلات", primary: "Secret leak prevention in code and logs" }
              ]
            },
            {
              unit_index: 8, code: "1.3.8",
              name: "التشفير في الراحة وأثناء النقل",
              goal: "تطبيق التشفير على بيانات التخزين والنقل وفهم الفجوات الشائعة",
              key_concepts: ["Encryption at Rest","Encryption in Transit","Full Disk Encryption","Database Encryption","TDE"],
              lessons: [
                { name: "تشفير القرص الكامل: BitLocker وLUKS", primary: "Full disk encryption with BitLocker and LUKS" },
                { name: "تشفير قاعدة البيانات: TDE وColumn-Level", primary: "Database encryption at rest" },
                { name: "تشفير النسخ الاحتياطية: ممارسات وأدوات", primary: "Backup encryption practices" },
                { name: "التشفير من طرف لطرف E2EE: المبادئ", primary: "End-to-end encryption principles" },
                { name: "تشفير البريد الإلكتروني: S/MIME وPGP", primary: "Email encryption with S/MIME and PGP" },
                { name: "تشفير التطبيق: متى وكيف وأين", primary: "Application-layer encryption patterns" },
                { name: "نماذج التهديد للتشفير: من يحتاج أكثر حماية", primary: "Encryption threat modeling" },
                { name: "تشفير الحاويات والـPod في Kubernetes", primary: "Container and pod encryption at rest" },
                { name: "BYOK وHYOK: التحكم في مفاتيح السحابة", primary: "Bring/Hold your own key in cloud encryption" }
              ]
            },
            {
              unit_index: 9, code: "1.3.9",
              name: "تحليل التشفير وكسر الضعيف منه",
              goal: "فهم كيف يُكسر التشفير الضعيف وكيف يُتجنّب استخدامه",
              key_concepts: ["Frequency Analysis","Chosen Plaintext Attack","Timing Attack","Length Extension","Weak IV"],
              lessons: [
                { name: "تحليل التردد: كسر الشيفرة الكلاسيكية", primary: "Frequency analysis against classical ciphers" },
                { name: "هجوم النص المُختار Chosen Plaintext Attack", primary: "Chosen plaintext attack explained" },
                { name: "هجوم التوقيت Timing Attack: التشفير والوقت", primary: "Timing side-channel attacks on crypto" },
                { name: "هجوم Hash Length Extension", primary: "Hash length extension attacks" },
                { name: "IV ثابت في CBC: كشف الأنماط", primary: "Weak IV in CBC mode detection" },
                { name: "هجوم PKCS#7 Padding Oracle عملياً بـPython", primary: "Padding oracle attack Python implementation" },
                { name: "تحليل الشهادات الضعيفة وإعادة استخدام المفاتيح", primary: "Weak certificate and key reuse detection" },
                { name: "أدوات تحليل التشفير: Cryptool وHashcat", primary: "Cryptanalysis tools: Cryptool and Hashcat" },
                { name: "اختيار خوارزميات التشفير للمشاريع الجديدة", primary: "Algorithm selection guide for modern projects" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "الاستطلاع وإدارة الثغرات",
          goal: "إتقان جمع المعلومات وقياس الثغرات وترتيب أولويات الإصلاح",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.4.1",
              name: "OSINT: استخبارات المصادر المفتوحة",
              goal: "استخدام مصادر مفتوحة لبناء ملف استخباراتي شامل عن الهدف قبل أي اتصال مباشر",
              key_concepts: ["OSINT Framework","Maltego","theHarvester","Shodan","Google Dorks"],
              lessons: [
                { name: "OSINT: التعريف والمنهجية والأخلاقيات", primary: "OSINT methodology and ethics" },
                { name: "OSINT Framework: المصادر والأدوات", primary: "OSINT Framework tools overview" },
                { name: "Maltego: رسم خرائط العلاقات الرقمية", primary: "Maltego graph analysis for OSINT" },
                { name: "theHarvester: حصاد النطاقات والبريد", primary: "theHarvester for domain/email enumeration" },
                { name: "LinkedIn وSocial Media لاستطلاع الموظفين", primary: "Social media OSINT for target profiling" },
                { name: "Wayback Machine وتحليل الأرشيف", primary: "Archive.org for historical OSINT" },
                { name: "بحث WHOIS وتسجيلات النطاقات", primary: "WHOIS lookup and domain registration analysis" },
                { name: "تحليل البيانات الوصفية من الملفات", primary: "Metadata extraction from documents" },
                { name: "بناء تقرير OSINT منظّم ومحكم", primary: "Structured OSINT report writing" }
              ]
            },
            {
              unit_index: 2, code: "1.4.2",
              name: "Nmap: فن المسح والاستطلاع",
              goal: "إتقان Nmap لمسح الشبكات بدقة وفهم كيف يظهر المسح في سجلات الدفاع",
              key_concepts: ["SYN Scan","Service Detection","OS Detection","NSE Scripts","Timing Templates"],
              lessons: [
                { name: "Nmap 101: أنواع المسح وتقنيات التحايل", primary: "Nmap scan types and evasion" },
                { name: "SYN Scan (-sS) مقارنةً بـConnect Scan", primary: "SYN vs Connect scan comparison" },
                { name: "اكتشاف الخدمات (-sV) ونسخ البرمجيات", primary: "Service version detection with Nmap" },
                { name: "تحديد نظام التشغيل (-O) والدقة", primary: "OS detection accuracy and limitations" },
                { name: "NSE Scripts: مكتبة ضخمة للفحص الأمني", primary: "Nmap NSE scripts for security scanning" },
                { name: "قوالب التوقيت: السرعة مقابل الخفاء", primary: "Nmap timing templates and stealth" },
                { name: "Nmap XML Output وتحليله برمجياً", primary: "Nmap XML output and automated parsing" },
                { name: "Masscan: المسح السريع للإنترنت كله", primary: "Masscan for large-scale port scanning" },
                { name: "قراءة سجلات الدفاع لمسح Nmap", primary: "Detecting Nmap scans in firewall logs" }
              ]
            },
            {
              unit_index: 3, code: "1.4.3",
              name: "استطلاع DNS والنطاقات الفرعية",
              goal: "استخراج أقصى معلومات ممكنة من DNS لرسم البنية التحتية للهدف",
              key_concepts: ["Zone Transfer","Subdomain Enumeration","DNS Brute Force","Certificate Transparency","DNSSEC Walk"],
              lessons: [
                { name: "سجلات DNS الحرجة: A وMX وTXT وNS وSRV", primary: "DNS record types for reconnaissance" },
                { name: "Zone Transfer (AXFR): الثروة عندما تفشل الحماية", primary: "DNS zone transfer attack" },
                { name: "تعداد النطاقات الفرعية بـSubfinder وAmass", primary: "Subdomain enumeration with modern tools" },
                { name: "القوة الغاشمة للنطاقات الفرعية", primary: "DNS brute force subdomain discovery" },
                { name: "Certificate Transparency لاكتشاف النطاقات", primary: "CT logs for subdomain discovery" },
                { name: "Reverse DNS: من IP إلى اسم النطاق", primary: "Reverse DNS lookup and PTR records" },
                { name: "مزوّدو DNS والكشف عن البنية التحتية", primary: "DNS provider identification" },
                { name: "Virtual Hosts: عدة مواقع على IP واحد", primary: "Virtual host enumeration" },
                { name: "أتمتة استطلاع DNS بـPython", primary: "Automated DNS reconnaissance with Python" }
              ]
            },
            {
              unit_index: 4, code: "1.4.4",
              name: "Shodan ومحركات بحث الثغرات",
              goal: "توظيف محركات البحث التقنية لرؤية ما يمكن للمهاجم أن يجده في الإنترنت",
              key_concepts: ["Shodan Queries","Censys","BinaryEdge","ZoomEye","IoT Vulnerabilities"],
              lessons: [
                { name: "Shodan: اكتشاف كل جهاز متصل بالإنترنت", primary: "Shodan search engine fundamentals" },
                { name: "بناء استعلامات Shodan متقدمة", primary: "Advanced Shodan search queries" },
                { name: "Censys وBinaryEdge: بدائل وإضافات", primary: "Censys and BinaryEdge comparison" },
                { name: "ZoomEye: نسخة صينية لاكتشاف الأجهزة", primary: "ZoomEye for IoT device discovery" },
                { name: "اكتشاف الأجهزة الصناعية SCADA وICS", primary: "SCADA/ICS device discovery on internet" },
                { name: "كاميرات وأجهزة IoT المكشوفة", primary: "Exposed IoT devices and cameras" },
                { name: "Google Dorks: استخبارات من محرك البحث", primary: "Google dorks for security reconnaissance" },
                { name: "GitHub وGitLab لاكتشاف تسرّب البيانات", primary: "Code repository secrets and data leaks" },
                { name: "بناء خريطة تعرّض كاملة للمؤسسة", primary: "Complete exposure mapping for organization" }
              ]
            },
            {
              unit_index: 5, code: "1.4.5",
              name: "CVE وNVD وتصنيف الثغرات",
              goal: "قراءة الثغرات وتصنيفها وفهم تأثيرها الحقيقي على المؤسسة",
              key_concepts: ["CVE Numbering","CVSS v3","CWE","MITRE ATT&CK","KEV Catalog"],
              lessons: [
                { name: "CVE: النظام العالمي لترقيم الثغرات", primary: "CVE numbering system and NVD" },
                { name: "CVSS v3: قياس الخطورة بدقة", primary: "CVSS v3 scoring system explained" },
                { name: "قراءة تقرير CVE: ما يعنيه لبيئتك", primary: "CVE advisory reading and impact assessment" },
                { name: "CWE: تصنيف أسباب الثغرات", primary: "CWE weakness classification" },
                { name: "MITRE ATT&CK Framework: خريطة الهجمات", primary: "MITRE ATT&CK tactics and techniques" },
                { name: "KEV Catalog: الثغرات المستغلّة فعلاً", primary: "CISA KEV catalog and urgency" },
                { name: "Exploit-DB: قاعدة بيانات الاستغلال", primary: "Exploit-DB and proof-of-concept research" },
                { name: "NVD وVulnDB: مقارنة قواعد البيانات", primary: "Vulnerability database comparison" },
                { name: "متابعة الثغرات: RSS وApis والإشعارات", primary: "Vulnerability feed subscription and monitoring" }
              ]
            },
            {
              unit_index: 6, code: "1.4.6",
              name: "أدوات فحص الثغرات",
              goal: "توظيف أدوات فحص الثغرات الاحترافية وقراءة نتائجها بدقة",
              key_concepts: ["Nessus","OpenVAS","Qualys","Nuclei","False Positives"],
              lessons: [
                { name: "Nessus Essentials: الإعداد والمسح الأول", primary: "Nessus setup and first vulnerability scan" },
                { name: "OpenVAS: البديل مفتوح المصدر القوي", primary: "OpenVAS/GVM vulnerability scanning" },
                { name: "Qualys وRapid7 Nexpose: الفئة المؤسسية", primary: "Enterprise vulnerability scanners comparison" },
                { name: "Nuclei: القوالب والفحص السريع الشامل", primary: "Nuclei template-based vulnerability scanning" },
                { name: "تفسير نتائج الفحص: الإيجابيات الكاذبة", primary: "Vulnerability scan result interpretation" },
                { name: "ترتيب أولويات الثغرات للإصلاح", primary: "Vulnerability prioritization frameworks" },
                { name: "جدولة الفحص المنتظم وإدارة النتائج", primary: "Scheduled scanning and result management" },
                { name: "Authenticated vs Unauthenticated Scans", primary: "Authenticated scanning for better coverage" },
                { name: "دمج فحص الثغرات في دورة التطوير", primary: "Vulnerability scanning in DevSecOps pipeline" }
              ]
            },
            {
              unit_index: 7, code: "1.4.7",
              name: "Patch Management وإدارة التحديثات",
              goal: "بناء برنامج منهجي لإدارة الرقع الأمنية يوازن بين السرعة والاستقرار",
              key_concepts: ["Patch Tuesday","Patch Testing","Risk-Based Patching","WSUS","Unattended Upgrades"],
              lessons: [
                { name: "دورة حياة الرقعة الأمنية من المصدر للإنتاج", primary: "Security patch lifecycle management" },
                { name: "Patch Tuesday: إدارة الثغرات الشهرية", primary: "Microsoft Patch Tuesday management" },
                { name: "اختبار الرقع: الاختبار قبل النشر على الإنتاج", primary: "Patch testing in staging environment" },
                { name: "Patch Windows وإدارة وقت التوقف", primary: "Patch windows and downtime management" },
                { name: "WSUS وSystem Center: إدارة Windows Updates", primary: "WSUS and SCCM patch management" },
                { name: "Unattended Upgrades في Linux", primary: "Linux automated security updates" },
                { name: "تصحيح الأنظمة الحرجة: بدون إيقاف", primary: "Live patching for critical systems" },
                { name: "قياس معدل الامتثال بالرقع", primary: "Patch compliance metrics and reporting" },
                { name: "إدارة الثغرات التي لا يوجد لها رقعة", primary: "Zero-day and no-patch vulnerability mitigation" }
              ]
            },
            {
              unit_index: 8, code: "1.4.8",
              name: "تقييم المخاطر وترتيب الأولويات",
              goal: "تطبيق أطر تقييم المخاطر لترجمة الثغرات التقنية إلى قرارات أعمال",
              key_concepts: ["Risk Assessment","Threat Modeling","DREAD","FAIR Model","Risk Register"],
              lessons: [
                { name: "المخاطر = الاحتمالية × التأثير: أساس التقييم", primary: "Risk calculation: probability times impact" },
                { name: "نمذجة التهديدات STRIDE وDREAD", primary: "STRIDE and DREAD threat modeling" },
                { name: "FAIR Model: تحليل المخاطر بالأرقام", primary: "FAIR quantitative risk analysis" },
                { name: "بناء سجل المخاطر Risk Register", primary: "Risk register creation and maintenance" },
                { name: "ترتيب الأولويات بالخطورة والاستغلالية", primary: "Risk-based vulnerability prioritization" },
                { name: "قبول المخاطر ومتى يكون مناسباً", primary: "Risk acceptance decisions and criteria" },
                { name: "تواصل المخاطر مع الإدارة التنفيذية", primary: "Risk communication to executives" },
                { name: "مراجعة المخاطر الدورية وإعادة التقييم", primary: "Periodic risk review process" },
                { name: "أدوات إدارة المخاطر: Archer وServiceNow", primary: "GRC tools for risk management" }
              ]
            },
            {
              unit_index: 9, code: "1.4.9",
              name: "برامج مكافآت الثغرات Bug Bounty",
              goal: "فهم نظام Bug Bounty والمشاركة الفعّالة فيه وبناء سمعة مهنية",
              key_concepts: ["Responsible Disclosure","HackerOne","Bugcrowd","Scope Definition","PoC Writing"],
              lessons: [
                { name: "الإفصاح المسؤول: الأخلاقيات والإجراءات", primary: "Responsible vulnerability disclosure" },
                { name: "HackerOne وBugcrowd: المنصات والبرامج", primary: "Bug bounty platforms overview" },
                { name: "قراءة نطاق البرنامج: ما هو مسموح وممنوع", primary: "Bug bounty scope and rules of engagement" },
                { name: "تحديد الثغرات ذات القيمة العالية", primary: "High-value vulnerability selection strategy" },
                { name: "كتابة تقرير Bug Bounty احترافي", primary: "Professional bug bounty report writing" },
                { name: "كتابة Proof of Concept آمن وموثّق", primary: "Safe PoC writing and documentation" },
                { name: "التعامل مع ردود الفعل وتتبع الحالة", primary: "Managing bug bounty report lifecycle" },
                { name: "بناء سمعة على HackerOne وشارات الجودة", primary: "Building bug bounty reputation" },
                { name: "من Bug Bounty إلى مسار مهني في الأمن", primary: "Bug bounty to security career path" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "إدارة الهوية والوصول IAM",
          goal: "تطبيق ضوابط المصادقة والتفويض بشكل صحيح ومنهجي في البيئات الحديثة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.5.1",
              name: "مبادئ المصادقة والتفويض",
              goal: "تمييز المصادقة من التفويض وتطبيق النماذج الصحيحة في كل سيناريو",
              key_concepts: ["Authentication Factors","Authorization Models","Identity vs Authentication","Token vs Session","SSO"],
              lessons: [
                { name: "المصادقة: إثبات الهوية من أنت", primary: "Authentication factors and methods" },
                { name: "التفويض: ما الذي مسموح لك فعله", primary: "Authorization models and enforcement" },
                { name: "عوامل المصادقة: ما تعرفه وتملكه وتكونه", primary: "Three authentication factors explained" },
                { name: "الجلسات والرموز: Session vs Token auth", primary: "Session vs token-based authentication" },
                { name: "SSO: تسجيل دخول واحد لكل الخدمات", primary: "Single Sign-On architecture" },
                { name: "هجمات المصادقة: Brute Force وCredential Stuffing", primary: "Authentication attacks and mitigations" },
                { name: "Account Lockout والحماية من القوة الغاشمة", primary: "Account lockout policies" },
                { name: "مبدأ Zero Trust في المصادقة", primary: "Zero trust authentication model" },
                { name: "تدقيق الوصول: من دخل متى وإلى أين", primary: "Access audit logging and review" }
              ]
            },
            {
              unit_index: 2, code: "1.5.2",
              name: "هجمات كلمات المرور والدفاع",
              goal: "فهم كيف تُكسر كلمات المرور وكيف تُبنى سياسات كلمات مرور فعّالة",
              key_concepts: ["Dictionary Attack","Password Spray","Hashcat","Credential Stuffing","Password Manager"],
              lessons: [
                { name: "هجوم القاموس: قوائم الكلمات وHashcat", primary: "Dictionary attacks with Hashcat" },
                { name: "Password Spraying: هجوم البطيء الفتّاك", primary: "Password spray attack technique" },
                { name: "Credential Stuffing: قوائم البيانات المسرّبة", primary: "Credential stuffing with breach data" },
                { name: "NTLM Hash Cracking في الشبكة الداخلية", primary: "NTLM hash cracking techniques" },
                { name: "HaveIBeenPwned: استعلام التسريبات", primary: "HaveIBeenPwned API and data breach lookup" },
                { name: "بناء سياسة كلمة مرور فعّالة وقابلة للتطبيق", primary: "Effective password policy design" },
                { name: "مدراء كلمات المرور: الأنواع والأمان", primary: "Password manager evaluation and deployment" },
                { name: "Passphrase بدلاً من Password: الأمان والسهولة", primary: "Passphrase security advantages" },
                { name: "هاش كلمات مرور الجديد: Argon2 في التطبيقات", primary: "Argon2 password hashing implementation" }
              ]
            },
            {
              unit_index: 3, code: "1.5.3",
              name: "المصادقة متعددة العوامل MFA",
              goal: "تصميم ونشر MFA المناسب لكل بيئة مع فهم تقنيات تجاوزه",
              key_concepts: ["TOTP","FIDO2/WebAuthn","SMS OTP Risks","Authenticator Apps","MFA Fatigue"],
              lessons: [
                { name: "TOTP: كيف تعمل تطبيقات المصادقة", primary: "TOTP algorithm and authenticator apps" },
                { name: "SMS OTP: الضعيف بسبب SIM Swapping", primary: "SMS OTP vulnerabilities and SIM swapping" },
                { name: "FIDO2 وWebAuthn: معيار المصادقة بدون كلمات مرور", primary: "FIDO2/WebAuthn implementation" },
                { name: "Hardware Keys: YubiKey وGoogle Titan", primary: "Hardware security key usage" },
                { name: "MFA Fatigue: هجوم الإرهاق من الطلبات", primary: "MFA fatigue attack and mitigations" },
                { name: "هجوم MITM Evilginx2 لتجاوز MFA", primary: "Evilginx2 MFA bypass attack" },
                { name: "نشر MFA على مستوى المؤسسة", primary: "Enterprise MFA rollout strategy" },
                { name: "Recovery Codes وإجراءات الإغاثة", primary: "MFA recovery code management" },
                { name: "تقييم متطلبات MFA حسب حساسية النظام", primary: "MFA requirement risk-based decision" }
              ]
            },
            {
              unit_index: 4, code: "1.5.4",
              name: "Active Directory الأمن والهجمات",
              goal: "فهم Active Directory من منظور المهاجم لتقوية الدفاع بشكل فعّال",
              key_concepts: ["Domain Controller","AD Trusts","Kerberoasting","DCSync","BloodHound"],
              lessons: [
                { name: "بنية Active Directory: Forest وDomain وOU", primary: "Active Directory structure and terminology" },
                { name: "Domain Controller: القلب وهدف المهاجم", primary: "Domain Controller as high-value target" },
                { name: "علاقات الثقة: Trust Relationships والاستغلال", primary: "AD trust relationships and attacks" },
                { name: "Kerberoasting: استخراج هاشات Service Accounts", primary: "Kerberoasting attack technique" },
                { name: "AS-REP Roasting: المستخدمون بدون Preauth", primary: "AS-REP roasting attack" },
                { name: "DCSync: محاكاة Domain Controller بـMimikatz", primary: "DCSync attack with Mimikatz" },
                { name: "BloodHound: خريطة هجوم Active Directory", primary: "BloodHound for AD attack path analysis" },
                { name: "تقوية Active Directory: أفضل الممارسات", primary: "Active Directory hardening best practices" },
                { name: "Microsoft Tier Model لحسابات المشرفين", primary: "AD administrative tier model" }
              ]
            },
            {
              unit_index: 5, code: "1.5.5",
              name: "OAuth 2.0 وOpenID Connect أمنياً",
              goal: "تطبيق OAuth 2.0 وOIDC بشكل صحيح وكشف ثغرات التطبيقات الشائعة",
              key_concepts: ["Authorization Code Flow","PKCE","State Parameter","Token Leakage","JWT Attacks"],
              lessons: [
                { name: "OAuth 2.0: التدفقات الأربعة والاختيار الصحيح", primary: "OAuth 2.0 flows and selection criteria" },
                { name: "Authorization Code + PKCE: المعيار الآمن", primary: "PKCE flow for secure OAuth" },
                { name: "Implicit Flow: لماذا أصبح خطيراً", primary: "Implicit flow deprecation and risks" },
                { name: "CSRF في OAuth: دور State Parameter", primary: "OAuth CSRF via state parameter" },
                { name: "Open Redirect في OAuth: اختطاف Authorization Code", primary: "Open redirect in OAuth attack" },
                { name: "JWT: الهيكل والتوقيع وهجوم None Algorithm", primary: "JWT attacks: none algorithm and key confusion" },
                { name: "Token Leakage في Referrer Headers", primary: "OAuth token leakage via HTTP Referer" },
                { name: "OIDC: طبقة الهوية فوق OAuth 2.0", primary: "OpenID Connect identity layer" },
                { name: "اختبار تطبيقات OAuth مع Burp Suite", primary: "OAuth testing with Burp Suite" }
              ]
            },
            {
              unit_index: 6, code: "1.5.6",
              name: "إدارة الهويات المميزة PAM",
              goal: "بناء برنامج إدارة الهويات المميزة للحد من مخاطر الحسابات ذات الصلاحيات العالية",
              key_concepts: ["PAM Solutions","Just-in-Time Access","Session Recording","Vault Password","Credential Checkout"],
              lessons: [
                { name: "تعريف الهويات المميزة وخطورتها", primary: "Privileged identity risks and definition" },
                { name: "حلول PAM: CyberArk وHashiCorp وBeyondTrust", primary: "PAM solutions comparison" },
                { name: "Just-in-Time Access: امتياز فقط عند الحاجة", primary: "Just-in-time privileged access" },
                { name: "تسجيل الجلسات المميزة للتدقيق", primary: "Privileged session recording" },
                { name: "Credential Vault: خزينة كلمات المرور", primary: "Password vaulting for privileged accounts" },
                { name: "Credential Checkout: إصدار بيانات مؤقتة", primary: "Credential checkout mechanism" },
                { name: "إدارة حسابات الخدمة وكلمات مرورها", primary: "Service account password management" },
                { name: "Break-Glass وإجراءات الطوارئ", primary: "Emergency break-glass procedures" },
                { name: "تدقيق استخدام الحسابات المميزة", primary: "Privileged access audit and review" }
              ]
            },
            {
              unit_index: 7, code: "1.5.7",
              name: "Zero Trust Identity: الثقة المعدومة",
              goal: "تطبيق نموذج Zero Trust Identity في البيئات الحديثة الموزّعة",
              key_concepts: ["Never Trust Always Verify","Conditional Access","Device Posture","Identity Context","Microsegmentation"],
              lessons: [
                { name: "Zero Trust: المفهوم والمبادئ السبعة", primary: "Zero trust principles and pillars" },
                { name: "Identity as the New Perimeter", primary: "Identity-centric security model" },
                { name: "Conditional Access: المصادقة بالسياق", primary: "Conditional access policies" },
                { name: "Device Posture وامتثال الجهاز", primary: "Device compliance in zero trust" },
                { name: "Continuous Authentication: التحقق المستمر", primary: "Continuous authentication patterns" },
                { name: "ZTNA مقابل VPN التقليدي", primary: "ZTNA vs traditional VPN comparison" },
                { name: "Microsegmentation في شبكة Zero Trust", primary: "Microsegmentation for zero trust networking" },
                { name: "تطبيق Zero Trust على AWS وAzure", primary: "Zero trust in cloud environments" },
                { name: "قياس نضج تطبيق Zero Trust", primary: "Zero trust maturity assessment" }
              ]
            },
            {
              unit_index: 8, code: "1.5.8",
              name: "أمن الحوسبة السحابية: IAM في السحابة",
              goal: "تطبيق إدارة الهوية والوصول في AWS وAzure وGCP بشكل آمن وقابل للمراجعة",
              key_concepts: ["AWS IAM Policies","Azure RBAC","GCP IAM","Service Accounts","Least Privilege Cloud"],
              lessons: [
                { name: "AWS IAM: المستخدمون والأدوار والسياسات", primary: "AWS IAM users, roles, and policies" },
                { name: "AWS IAM Policy Language: البنية والمبادئ", primary: "AWS IAM policy JSON structure" },
                { name: "Azure RBAC: أدوار مدمجة ومخصصة", primary: "Azure RBAC built-in and custom roles" },
                { name: "GCP IAM: إدارة موارد Google Cloud", primary: "GCP IAM permissions and bindings" },
                { name: "حسابات الخدمة السحابية: المخاطر والأفضل الممارسات", primary: "Cloud service account security" },
                { name: "STS وAssuming Roles: تفويض مؤقت وآمن", primary: "AWS STS and role assumption" },
                { name: "أخطاء IAM الشائعة في السحابة وكيفية اكتشافها", primary: "Common IAM misconfigurations" },
                { name: "IAM Access Analyzer: الكشف التلقائي", primary: "AWS IAM Access Analyzer usage" },
                { name: "أدوات CSPM لفحص سياسات IAM السحابية", primary: "CSPM tools for IAM policy review" }
              ]
            },
            {
              unit_index: 9, code: "1.5.9",
              name: "RBAC وABAC: نماذج التحكم في الوصول",
              goal: "تصميم نموذج التحكم في الوصول المناسب لكل منظومة وتطبيقه بدقة",
              key_concepts: ["RBAC Design","ABAC Policies","PBAC","Access Reviews","Role Mining"],
              lessons: [
                { name: "RBAC: تصميم الأدوار والتحقيق الأدني للأذونات", primary: "RBAC design and least privilege" },
                { name: "ABAC: السياق والصفات كمعايير وصول", primary: "ABAC attribute-based access control" },
                { name: "PBAC: التحكم بالسياسات في IAM الحديثة", primary: "Policy-based access control" },
                { name: "Role Explosion: تضخّم الأدوار وإدارته", primary: "Role explosion problem and management" },
                { name: "Role Mining: اكتشاف الأدوار من بيانات الوصول", primary: "Role mining from access data" },
                { name: "مراجعة الوصول الدورية Access Reviews", primary: "Periodic access review process" },
                { name: "Toxic Combinations: أذونات خطيرة معاً", primary: "Segregation of duties and toxic combinations" },
                { name: "Entitlement Management في Azure وOkta", primary: "Entitlement management platforms" },
                { name: "رسم خريطة أذونات المؤسسة وتحليلها", primary: "Enterprise permission mapping and analysis" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "أمن التطبيقات: الأساسيات",
          goal: "فهم الثغرات الشائعة في تطبيقات الويب والكود وكيف تُكتشف وتُصلح",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.6.1",
              name: "OWASP Top 10: أخطر ثغرات الويب",
              goal: "فهم ثغرات OWASP Top 10 والتمييز بين السيناريوهات الهجومية ومتطلبات الدفاع",
              key_concepts: ["Injection","Broken Auth","IDOR","Misconfig","Insecure Design"],
              lessons: [
                { name: "OWASP Top 10 2021: القائمة والترتيب", primary: "OWASP Top 10 2021 overview" },
                { name: "A01 Broken Access Control: التحكم المكسور", primary: "Broken access control and IDOR" },
                { name: "A02 Cryptographic Failures: التشفير الفاشل", primary: "Cryptographic failures in web apps" },
                { name: "A03 Injection: حقن SQL وCode", primary: "Injection vulnerabilities overview" },
                { name: "A04 Insecure Design: فشل التصميم من الأساس", primary: "Insecure design threat modeling" },
                { name: "A05 Security Misconfiguration: الإعداد الخاطئ", primary: "Security misconfiguration examples" },
                { name: "A06-A10: المجموعة الثانية من الثغرات الحرجة", primary: "OWASP A06-A10 overview" },
                { name: "OWASP API Security Top 10: خصائص APIs", primary: "OWASP API Security Top 10" },
                { name: "استخدام OWASP Testing Guide منهجياً", primary: "OWASP Testing Guide methodology" }
              ]
            },
            {
              unit_index: 2, code: "1.6.2",
              name: "SQL Injection: الاستغلال والوقاية",
              goal: "إتقان أنواع حقن SQL واستغلالها وتطبيق ضوابط وقاية قوية",
              key_concepts: ["Union-Based SQLi","Blind SQLi","Time-Based SQLi","SQLmap","Prepared Statements"],
              lessons: [
                { name: "SQL Injection 101: أصل المشكلة", primary: "SQL injection root cause and mechanics" },
                { name: "Union-Based SQLi: استخراج البيانات مباشرة", primary: "Union-based SQL injection" },
                { name: "Error-Based SQLi: استخراج من رسائل الخطأ", primary: "Error-based SQL injection" },
                { name: "Blind SQLi: استخراج دون إخراج", primary: "Blind SQL injection techniques" },
                { name: "Time-Based Blind SQLi: بالتوقيت", primary: "Time-based blind SQL injection" },
                { name: "SQLmap: أتمتة حقن SQL", primary: "SQLmap automated SQL injection" },
                { name: "Second-Order SQLi: الحقن المؤجّل", primary: "Second-order SQL injection" },
                { name: "Prepared Statements وParameterized Queries", primary: "Parameterized queries prevention" },
                { name: "WAF Bypass لـSQL Injection", primary: "WAF bypass techniques for SQLi" }
              ]
            },
            {
              unit_index: 3, code: "1.6.3",
              name: "Cross-Site Scripting XSS",
              goal: "تحليل أنواع XSS وتأثيرها وتطبيق تقنيات الدفاع الصحيحة",
              key_concepts: ["Reflected XSS","Stored XSS","DOM-based XSS","CSP","BeEF"],
              lessons: [
                { name: "XSS: ما هو وكيف يسرق الجلسة", primary: "XSS mechanics and session hijacking" },
                { name: "Reflected XSS: الانعكاس الفوري للبيانات", primary: "Reflected XSS attack and detection" },
                { name: "Stored XSS: الشيفرة تنتظر في قاعدة البيانات", primary: "Stored XSS attack and impact" },
                { name: "DOM-based XSS: الهجوم في المتصفح نفسه", primary: "DOM-based XSS and client-side vulnerabilities" },
                { name: "XSS للسرقة: Cookie وToken وCredentials", primary: "XSS payload for credential theft" },
                { name: "BeEF: Browser Exploitation Framework", primary: "BeEF for browser exploitation" },
                { name: "Content Security Policy CSP: الدرع الرئيسي", primary: "CSP header implementation" },
                { name: "Output Encoding: الوقاية عند الإخراج", primary: "Output encoding for XSS prevention" },
                { name: "مسح XSS مع Dalfox وBurp Suite", primary: "XSS scanning with automated tools" }
              ]
            },
            {
              unit_index: 4, code: "1.6.4",
              name: "CSRF وSSRF وثغرات الطلبات",
              goal: "فهم ثغرات تزوير الطلبات واستغلالها والدفاع عنها",
              key_concepts: ["CSRF Tokens","SameSite Cookie","SSRF Impact","SSRF Cloud Metadata","Request Forgery"],
              lessons: [
                { name: "CSRF: تزوير طلبات المستخدم على الخادم", primary: "CSRF attack mechanics" },
                { name: "CSRF Token: الحماية التقليدية", primary: "CSRF token implementation" },
                { name: "SameSite Cookie: الحماية الحديثة من CSRF", primary: "SameSite cookie attribute" },
                { name: "SSRF: جعل الخادم يطلب نيابةً عنك", primary: "SSRF server-side request forgery" },
                { name: "SSRF وCloud Metadata: AWS/Azure", primary: "SSRF to cloud metadata exfiltration" },
                { name: "Blind SSRF: الكشف بدون استجابة مباشرة", primary: "Blind SSRF detection techniques" },
                { name: "SSRF Filter Bypass: التحايل على الفلاتر", primary: "SSRF filter bypass methods" },
                { name: "وقاية SSRF: قوائم السماح والتحقق", primary: "SSRF prevention with allowlists" },
                { name: "Open Redirect وتأثيره على الأمن", primary: "Open redirect exploitation" }
              ]
            },
            {
              unit_index: 5, code: "1.6.5",
              name: "Broken Access Control وIDOR",
              goal: "اكتشاف ثغرات التحكم المكسور في الوصول وبناء دفاع فعّال",
              key_concepts: ["IDOR","Horizontal Privilege Escalation","Vertical Privilege Escalation","Force Browse","JWT Claims"],
              lessons: [
                { name: "IDOR: الوصول المباشر لموارد الآخرين", primary: "Insecure direct object reference" },
                { name: "تصعيد الامتياز الأفقي والعمودي", primary: "Horizontal and vertical privilege escalation" },
                { name: "Force Browsing: الوصول لمسارات مخفية", primary: "Forced browsing attack technique" },
                { name: "Access Control في JWT Claims", primary: "JWT claims-based access control flaws" },
                { name: "API Endpoints بلا تحقق من الصلاحية", primary: "Unauthenticated API endpoint discovery" },
                { name: "Mass Assignment: تعيين خصائص غير مقصودة", primary: "Mass assignment vulnerability" },
                { name: "Path Traversal: الوصول لملفات خارج الجذر", primary: "Path traversal attacks" },
                { name: "File Inclusion: LFI وRFI", primary: "Local and remote file inclusion" },
                { name: "اختبار Access Control منهجياً", primary: "Systematic access control testing" }
              ]
            },
            {
              unit_index: 6, code: "1.6.6",
              name: "أمن APIs وRESTful Services",
              goal: "تطبيق أفضل ممارسات أمن APIs وإجراء اختبار شامل للواجهات البرمجية",
              key_concepts: ["API Authentication","Rate Limiting","BOLA","Mass Assignment","GraphQL Security"],
              lessons: [
                { name: "OWASP API Security Top 10: المخاطر المحددة للـAPI", primary: "OWASP API Security Top 10" },
                { name: "BOLA: كسر التفويض على مستوى الكائن", primary: "Broken Object Level Authorization" },
                { name: "Broken Function Level Auth في APIs", primary: "Function-level authorization bypass" },
                { name: "Rate Limiting: الحماية من الإساءة والقوة", primary: "API rate limiting implementation" },
                { name: "REST API Security: HTTP Methods والـHeaders", primary: "REST API security best practices" },
                { name: "GraphQL Security: الاستعلامات الخطيرة", primary: "GraphQL introspection and injection" },
                { name: "API Key Management وحمايتها", primary: "API key security and rotation" },
                { name: "اختبار APIs مع Postman وBurp Suite", primary: "API testing with Postman and Burp" },
                { name: "API Documentation لاكتشاف Endpoints", primary: "Swagger/OpenAPI for attack surface discovery" }
              ]
            },
            {
              unit_index: 7, code: "1.6.7",
              name: "Burp Suite: أداة محترف ويب",
              goal: "إتقان Burp Suite لاختبار اختراق تطبيقات الويب من البداية للنهاية",
              key_concepts: ["Proxy Intercept","Repeater","Intruder","Scanner","Extensions"],
              lessons: [
                { name: "Burp Suite Professional: الإعداد والواجهة", primary: "Burp Suite Professional setup" },
                { name: "Proxy Intercept: التقاط وتعديل الطلبات", primary: "Burp proxy interception" },
                { name: "Repeater: إعادة إرسال وتعديل الطلبات", primary: "Burp Repeater for manual testing" },
                { name: "Intruder: هجمات القوة الغاشمة والحقن", primary: "Burp Intruder attack types" },
                { name: "Scanner: الكشف التلقائي عن الثغرات", primary: "Burp Scanner active scanning" },
                { name: "Decoder وComparer: تحليل البيانات", primary: "Burp Decoder and Comparer tools" },
                { name: "Extensions وBApp Store", primary: "Burp extensions and BApp Store" },
                { name: "بناء سكريبتات Burp للأتمتة", primary: "Burp Suite automation with macros" },
                { name: "OWASP ZAP: البديل مفتوح المصدر", primary: "OWASP ZAP comparison and usage" }
              ]
            },
            {
              unit_index: 8, code: "1.6.8",
              name: "أمن الكود والمراجعة الثابتة",
              goal: "مراجعة الكود المصدري لاكتشاف الثغرات الأمنية قبل النشر",
              key_concepts: ["SAST","Semgrep","CodeQL","Secret Scanning","Dependency Check"],
              lessons: [
                { name: "مراجعة الكود الأمنية: المنهجية والتركيز", primary: "Security code review methodology" },
                { name: "أنماط الثغرات الشائعة في الكود", primary: "Common vulnerable code patterns" },
                { name: "Semgrep: قواعد قابلة للتخصيص للتحليل", primary: "Semgrep SAST tool usage" },
                { name: "CodeQL: تحليل الكود كقاعدة بيانات", primary: "CodeQL database querying" },
                { name: "OWASP Dependency-Check للمكتبات الخطرة", primary: "Dependency vulnerability scanning" },
                { name: "Git Secret Scanning: منع تسرّب الأسرار", primary: "Git secret scanning and prevention" },
                { name: "مراجعة كود Python وNode.js أمنياً", primary: "Security review for Python and Node.js" },
                { name: "دمج SAST في GitHub Actions وGitLab CI", primary: "SAST integration in CI/CD pipeline" },
                { name: "تقرير نتائج مراجعة الكود وترتيب الأولويات", primary: "Code review findings report" }
              ]
            },
            {
              unit_index: 9, code: "1.6.9",
              name: "Secure Development Lifecycle SDL",
              goal: "دمج الأمان في كل مرحلة من مراحل تطوير البرمجيات",
              key_concepts: ["Security Requirements","Threat Modeling","Security Testing in SDLC","Security Champions","DevSecOps"],
              lessons: [
                { name: "SSDLC: من متطلبات الأمن إلى النشر", primary: "Secure SDLC phases and activities" },
                { name: "متطلبات الأمن: كيف تُكتب وتُقاس", primary: "Security requirements specification" },
                { name: "نمذجة التهديدات في مرحلة التصميم", primary: "Threat modeling in design phase" },
                { name: "Security in Agile: كيف يتلاءمان", primary: "Security integration in agile sprints" },
                { name: "Security Champions: المُدافعون داخل الفرق", primary: "Security champion program" },
                { name: "Security Gates في CI/CD Pipeline", primary: "Security gates in deployment pipeline" },
                { name: "Bug Bounty كامتداد للـSDLC", primary: "Bug bounty as SDLC complement" },
                { name: "DevSecOps: الثقافة والأدوات والعمليات", primary: "DevSecOps culture and toolchain" },
                { name: "قياس نضج أمن التطوير بـOWASP SAMM", primary: "OWASP SAMM maturity assessment" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "الحوكمة والامتثال والأطر الأمنية",
          goal: "تطبيق أطر الأمن الدولية وإدارة الامتثال والحوكمة في المؤسسات",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.7.1",
              name: "NIST Cybersecurity Framework",
              goal: "تطبيق NIST CSF كإطار شامل لإدارة المخاطر السيبرانية في المؤسسة",
              key_concepts: ["Identify","Protect","Detect","Respond","Recover","NIST 2.0"],
              lessons: [
                { name: "NIST CSF: الهيكل والوظائف الخمس", primary: "NIST CSF five functions overview" },
                { name: "Identify: معرفة أصولك قبل حمايتها", primary: "NIST CSF Identify function" },
                { name: "Protect: بناء ضوابط الحماية المناسبة", primary: "NIST CSF Protect function" },
                { name: "Detect: بناء قدرات الكشف المبكر", primary: "NIST CSF Detect function" },
                { name: "Respond: خطة الاستجابة للحوادث", primary: "NIST CSF Respond function" },
                { name: "Recover: الاسترداد والتعلم من الحوادث", primary: "NIST CSF Recover function" },
                { name: "NIST CSF 2.0: المستجدات والـGovern", primary: "NIST CSF 2.0 updates and Govern" },
                { name: "تطبيق NIST CSF بالأمثلة العملية", primary: "NIST CSF practical application" },
                { name: "قياس النضج بـTier Levels في NIST", primary: "NIST CSF tier maturity assessment" }
              ]
            },
            {
              unit_index: 2, code: "1.7.2",
              name: "ISO 27001: نظام إدارة أمن المعلومات",
              goal: "فهم متطلبات ISO 27001 والتخطيط لتطبيقها والحصول على الاعتماد",
              key_concepts: ["ISMS","Annex A Controls","Risk Treatment","PDCA Cycle","Certification Audit"],
              lessons: [
                { name: "ISO 27001: البنية ومجالات التطبيق", primary: "ISO 27001 structure and scope" },
                { name: "ISMS: نظام إدارة أمن المعلومات", primary: "Information Security Management System" },
                { name: "ISO 27001 Annex A: الضوابط التقنية والتنظيمية", primary: "ISO 27001 Annex A controls" },
                { name: "تقييم المخاطر في سياق ISO 27001", primary: "ISO 27001 risk assessment process" },
                { name: "Statement of Applicability: اختيار الضوابط", primary: "ISO 27001 Statement of Applicability" },
                { name: "دورة PDCA في إدارة الأمن", primary: "PDCA cycle in ISMS" },
                { name: "التدقيق الداخلي لـISO 27001", primary: "ISO 27001 internal audit" },
                { name: "تدقيق الاعتماد: التحضير والإجراء", primary: "ISO 27001 certification audit preparation" },
                { name: "ISO 27002 وISO 27017 وISO 27018", primary: "ISO 27000 series complementary standards" }
              ]
            },
            {
              unit_index: 3, code: "1.7.3",
              name: "GDPR وقوانين الخصوصية",
              goal: "تطبيق متطلبات GDPR والتشريعات المماثلة لحماية البيانات الشخصية",
              key_concepts: ["Data Controller","Data Processor","DPIA","Breach Notification","Privacy by Design"],
              lessons: [
                { name: "GDPR: المبادئ السبعة الجوهرية", primary: "GDPR seven principles of data protection" },
                { name: "بيانات شخصية ومعالجة قانونية: الأسس", primary: "GDPR lawful bases for processing" },
                { name: "Data Controller وData Processor: الفرق", primary: "Controller vs processor distinction" },
                { name: "DPIA: تقييم أثر خصوصية البيانات", primary: "Data Protection Impact Assessment" },
                { name: "إشعار الاختراق: 72 ساعة للإبلاغ", primary: "GDPR breach notification requirement" },
                { name: "Privacy by Design: الخصوصية في التصميم", primary: "Privacy by design principles" },
                { name: "حقوق الأفراد: الوصول والنسيان والنقل", primary: "Data subject rights in GDPR" },
                { name: "تشريعات مماثلة: CCPA وPIPEDA وUAE PDPL", primary: "Global privacy law comparison" },
                { name: "بناء برنامج امتثال GDPR", primary: "GDPR compliance program implementation" }
              ]
            },
            {
              unit_index: 4, code: "1.7.4",
              name: "PCI-DSS وأمن بيانات بطاقات الدفع",
              goal: "فهم متطلبات PCI-DSS وتطبيقها في بيئات معالجة المدفوعات",
              key_concepts: ["Cardholder Data Environment","Scoping","Network Segmentation","QSA","SAQ"],
              lessons: [
                { name: "PCI-DSS: أهميته ومن يخضع له", primary: "PCI-DSS applicability and requirements overview" },
                { name: "Cardholder Data Environment: تحديد النطاق", primary: "CDE scoping and environment definition" },
                { name: "الـ12 متطلباً لـPCI-DSS 4.0", primary: "PCI-DSS 4.0 requirements overview" },
                { name: "Network Segmentation لتقليص النطاق", primary: "Network segmentation for PCI scope reduction" },
                { name: "QSA وSAQ: مسارات الامتثال", primary: "QSA assessors and SAQ types" },
                { name: "Penetration Testing في PCI-DSS", primary: "PCI-DSS penetration testing requirements" },
                { name: "Log Review وFIM في PCI-DSS", primary: "PCI-DSS logging and file integrity" },
                { name: "Tokenization وEncryption لحماية البطاقات", primary: "Tokenization and encryption for card data" },
                { name: "تحضير تقرير امتثال PCI-DSS", primary: "PCI-DSS compliance report preparation" }
              ]
            },
            {
              unit_index: 5, code: "1.7.5",
              name: "إدارة مخاطر تقنية المعلومات",
              goal: "بناء برنامج إدارة مخاطر تقنية المعلومات متكامل وقابل للقياس",
              key_concepts: ["Risk Framework","ISO 31000","COBIT","Asset Inventory","Risk Appetite"],
              lessons: [
                { name: "إطار إدارة المخاطر: المفاهيم والعمليات", primary: "Risk management framework fundamentals" },
                { name: "ISO 31000: إطار إدارة المخاطر العالمي", primary: "ISO 31000 risk management" },
                { name: "COBIT: حوكمة تقنية المعلومات والمخاطر", primary: "COBIT governance framework" },
                { name: "جرد الأصول: المعرفة قبل الحماية", primary: "Asset inventory and classification" },
                { name: "شهية المخاطر Risk Appetite: التعريف والقياس", primary: "Risk appetite definition and communication" },
                { name: "Risk Treatment Plans: الخطط والمالكون", primary: "Risk treatment plan development" },
                { name: "Third-Party Risk Management: المخاطر الخارجية", primary: "Third-party risk management" },
                { name: "التقارير والمؤشرات لمجلس الإدارة", primary: "Risk reporting to board and executives" },
                { name: "أدوات GRC: ServiceNow وArcher وMetricStream", primary: "GRC tool evaluation and selection" }
              ]
            },
            {
              unit_index: 6, code: "1.7.6",
              name: "استمرارية الأعمال والتعافي من الكوارث",
              goal: "تصميم وتطبيق خطط استمرارية الأعمال والتعافي من الكوارث الإلكترونية",
              key_concepts: ["BCP","DRP","RTO","RPO","Tabletop Exercise"],
              lessons: [
                { name: "BCP وDRP: الفرق والعلاقة", primary: "BCP vs DRP difference and relationship" },
                { name: "RTO وRPO: تحديد أهداف التعافي", primary: "RTO and RPO definition and calculation" },
                { name: "تحليل أثر الأعمال BIA", primary: "Business Impact Analysis" },
                { name: "خطة الاستمرارية: المكونات والتطوير", primary: "Business continuity plan components" },
                { name: "استراتيجيات النسخ الاحتياطي والتعافي", primary: "Backup strategies and recovery planning" },
                { name: "Tabletop Exercises: اختبار الخطة بالسيناريوهات", primary: "Tabletop exercise planning and execution" },
                { name: "Failover وFailback: الانتقال والعودة", primary: "Failover and failback procedures" },
                { name: "خطط الاستمرارية للحوادث السيبرانية", primary: "Cyber-specific business continuity" },
                { name: "درسات الحالة: استعادة المؤسسات من الكوارث", primary: "Real-world disaster recovery case studies" }
              ]
            },
            {
              unit_index: 7, code: "1.7.7",
              name: "سياسات الأمن وإجراءاته",
              goal: "كتابة سياسات أمن فعّالة وواقعية تُطبَّق وتُطبَّق فعلاً",
              key_concepts: ["Information Security Policy","Acceptable Use Policy","Incident Response Policy","Policy Hierarchy","Policy Enforcement"],
              lessons: [
                { name: "هرمية السياسات: Policy وStandard وProcedure", primary: "Policy, standard, procedure hierarchy" },
                { name: "سياسة أمن المعلومات: الهيكل والمحتوى", primary: "Information security policy writing" },
                { name: "Acceptable Use Policy: ما يجوز وما لا يجوز", primary: "Acceptable use policy elements" },
                { name: "Incident Response Policy: الإطار القانوني", primary: "Incident response policy framework" },
                { name: "Remote Work Policy: أمن العمل عن بعد", primary: "Remote work security policy" },
                { name: "BYOD Policy: الأجهزة الشخصية في العمل", primary: "BYOD security policy" },
                { name: "تنفيذ السياسات والاعتراف بها", primary: "Policy enforcement and acknowledgment" },
                { name: "مراجعة السياسات: الدورية والحوادث", primary: "Policy review cycles and incident triggers" },
                { name: "أخطاء شائعة في كتابة السياسات", primary: "Common policy writing mistakes" }
              ]
            },
            {
              unit_index: 8, code: "1.7.8",
              name: "التدريب على الوعي الأمني",
              goal: "بناء وتشغيل برنامج وعي أمني فعّال يغيّر السلوك البشري فعلياً",
              key_concepts: ["Security Awareness Program","Phishing Simulation","Social Engineering","Human Firewall","Metrics"],
              lessons: [
                { name: "الهندسة الاجتماعية: الإنسان هو الثغرة", primary: "Social engineering and human vulnerability" },
                { name: "التصيّد الاحتيالي Phishing: الأنواع والتكتيكات", primary: "Phishing types and tactics" },
                { name: "محاكاة التصيّد: قياس الوعي وتحسينه", primary: "Phishing simulation programs" },
                { name: "برنامج الوعي الأمني: التصميم والتنفيذ", primary: "Security awareness program design" },
                { name: "Vishing وSmishing: الاحتيال الصوتي والنصي", primary: "Vishing and smishing attacks" },
                { name: "Pretexting وImpersonation في البيئات", primary: "Pretexting and impersonation attacks" },
                { name: "قياس فعالية الوعي الأمني", primary: "Security awareness effectiveness metrics" },
                { name: "Gamification في التدريب الأمني", primary: "Gamification for security training" },
                { name: "بناء ثقافة الأمن في المؤسسة", primary: "Security culture building strategies" }
              ]
            },
            {
              unit_index: 9, code: "1.7.9",
              name: "التدقيق الأمني والامتثال",
              goal: "إجراء التدقيق الأمني الداخلي والخارجي وإعداد تقارير الامتثال الاحترافية",
              key_concepts: ["Security Audit","Control Testing","Audit Evidence","Findings Report","Remediation Tracking"],
              lessons: [
                { name: "التدقيق الأمني: الداخلي مقابل الخارجي", primary: "Internal vs external security audit" },
                { name: "تخطيط التدقيق: النطاق والمنهجية", primary: "Audit planning: scope and methodology" },
                { name: "اختبار الضوابط: التقنية والإدارية", primary: "Control testing: technical and administrative" },
                { name: "جمع الأدلة وتوثيقها", primary: "Audit evidence collection and documentation" },
                { name: "تقييم الإيجابيات والسلبيات في التدقيق", primary: "Finding classification and risk rating" },
                { name: "تقرير التدقيق: الهيكل والوضوح", primary: "Audit report structure and clarity" },
                { name: "تتبع الإجراءات التصحيحية", primary: "Remediation tracking and follow-up" },
                { name: "SOC 2 وSOC 3: تقارير الثقة للخدمات", primary: "SOC 2 Type I and II audit" },
                { name: "التدقيق المستمر بالأدوات الآلية", primary: "Continuous compliance monitoring" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 2,
      name: "الأمن الهجومي والدفاعي المتقدم",
      goal: "إتقان اختبار الاختراق المتقدم وتحليل البرمجيات الخبيثة وأمن السحابة والطب الشرعي الرقمي وعمليات مركز الأمن",
      bloom_focus: "apply",
      exam: { pass_threshold_percent: 65, time_limit_minutes: 90 },
      stages: [
        {
          stage_index: 1,
          name: "اختبار الاختراق المنهجي",
          goal: "إتقان منهجية اختبار الاختراق الكاملة من الاستطلاع إلى التقرير",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.1.1",
              name: "منهجية اختبار الاختراق الاحترافية",
              goal: "اتباع منهجية محددة لاختبار الاختراق تُنتج نتائج موثوقة وتقارير ذات قيمة",
              key_concepts: ["PTES","OWASP Testing Guide","OSSTMM","Scoping","Rules of Engagement"],
              lessons: [
                { name: "PTES: المعيار المهني لاختبار الاختراق", primary: "Penetration Testing Execution Standard" },
                { name: "Rules of Engagement: الإطار القانوني والأخلاقي", primary: "Penetration testing legal framework" },
                { name: "تحديد النطاق Scoping: ما يُختبر وما لا يُختبر", primary: "Pentest scoping and kickoff" },
                { name: "Black Box وWhite Box وGray Box Testing", primary: "Pentest approach types comparison" },
                { name: "مراحل اختبار الاختراق بالتفصيل", primary: "Penetration testing phases detailed" },
                { name: "إدارة وقت الاختبار والإنجازات", primary: "Pentest time management and milestones" },
                { name: "التواصل أثناء الاختبار والإبلاغ الفوري", primary: "Communication during penetration test" },
                { name: "الأدوات والبيئة المهنية لاختبار الاختراق", primary: "Professional pentest toolkit setup" },
                { name: "توثيق النتائج في الوقت الحقيقي", primary: "Real-time finding documentation" }
              ]
            },
            {
              unit_index: 2, code: "2.1.2",
              name: "Metasploit Framework: الاستغلال المنهجي",
              goal: "إتقان Metasploit للاستغلال المنهجي والتحرك بعد الاختراق في البيئات المُصرّح بها",
              key_concepts: ["msfconsole","Exploits","Payloads","Meterpreter","Post-Exploitation Modules"],
              lessons: [
                { name: "Metasploit Architecture: المكونات والبنية", primary: "Metasploit framework architecture" },
                { name: "msfconsole: سطر أوامر Metasploit", primary: "msfconsole commands and navigation" },
                { name: "Exploits وPayloads: الاختيار الصحيح", primary: "Exploit and payload selection" },
                { name: "Meterpreter: الشل المتقدم بعد الاختراق", primary: "Meterpreter shell capabilities" },
                { name: "Pivoting مع Metasploit: القفز للشبكات الداخلية", primary: "Metasploit pivoting techniques" },
                { name: "Post Modules: جمع المعلومات بعد الدخول", primary: "Metasploit post-exploitation modules" },
                { name: "Metasploit وAV Evasion: تعديل الـPayloads", primary: "Metasploit AV evasion" },
                { name: "Armitage: الواجهة الرسومية لـMetasploit", primary: "Armitage graphical interface" },
                { name: "كتابة Metasploit Module مخصص", primary: "Custom Metasploit module development" }
              ]
            },
            {
              unit_index: 3, code: "2.1.3",
              name: "Post-Exploitation: الحركة والتصعيد",
              goal: "تطبيق تقنيات ما بعد الاختراق للحركة الجانبية وتصعيد الامتيازات في البيئات المُصرّح بها",
              key_concepts: ["Privilege Escalation Linux","Windows Privesc","Lateral Movement","Living off the Land","LOLBins"],
              lessons: [
                { name: "Local Privilege Escalation في Linux", primary: "Linux privilege escalation techniques" },
                { name: "تصعيد الامتيازات في Windows", primary: "Windows privilege escalation methods" },
                { name: "Living off the Land: LOLBins وLOLBAS", primary: "Living off the land attack techniques" },
                { name: "Credential Dumping: Mimikatz وSecretsDump", primary: "Credential dumping with Mimikatz" },
                { name: "Lateral Movement: Pass-the-Hash وPtT", primary: "Lateral movement techniques" },
                { name: "WMI وPSExec للتنفيذ الجانبي عن بعد", primary: "WMI and PSExec for lateral movement" },
                { name: "Domain Privilege Escalation: DCSync", primary: "Domain privilege escalation attacks" },
                { name: "الثبات Persistence: Autostart والـCron", primary: "Persistence mechanisms in post-exploitation" },
                { name: "أدوات أتمتة ما بعد الاختراق: Empire وC2", primary: "Post-exploitation frameworks comparison" }
              ]
            },
            {
              unit_index: 4, code: "2.1.4",
              name: "اختراق Active Directory المتوسط",
              goal: "تنفيذ هجمات Active Directory المتوسطة في البيئات المُصرّح بها لفهم نقاط الضعف",
              key_concepts: ["Kerberoasting","DCSync","Golden Ticket","Silver Ticket","AD CS Attacks"],
              lessons: [
                { name: "تعداد Active Directory: PowerView وSharpHound", primary: "AD enumeration with PowerView" },
                { name: "ACL Abuse: استغلال قوائم التحكم في AD", primary: "AD ACL abuse techniques" },
                { name: "Kerberoasting التفصيلي وكسر الهاش", primary: "Kerberoasting detailed attack" },
                { name: "Golden Ticket: تزوير TGT للإمبراطور", primary: "Golden ticket attack" },
                { name: "Silver Ticket: تزوير TGS لخدمة محددة", primary: "Silver ticket attack" },
                { name: "AD CS (Certificate Services) Attacks", primary: "Active Directory certificate services attacks" },
                { name: "PrintNightmare وثغرات طباعة الـWindowsه", primary: "PrintNightmare and print spooler attacks" },
                { name: "Forest و Domain Trust Attacks", primary: "Cross-forest trust attacks" },
                { name: "تقوية Active Directory من الهجمات", primary: "Active Directory defense techniques" }
              ]
            },
            {
              unit_index: 5, code: "2.1.5",
              name: "اختبار اختراق التطبيقات المتقدم",
              goal: "تطبيق تقنيات اختبار الاختراق المتقدمة على التطبيقات والـAPIs",
              key_concepts: ["Business Logic Flaws","XXE","Deserialization","Template Injection","OAuth Testing"],
              lessons: [
                { name: "Business Logic Vulnerabilities: العيوب المنطقية", primary: "Business logic vulnerability testing" },
                { name: "XXE: XML External Entity Injection", primary: "XXE injection attacks" },
                { name: "Insecure Deserialization: استغلال التسلسل", primary: "Insecure deserialization attacks" },
                { name: "Server-Side Template Injection SSTI", primary: "SSTI attack and exploitation" },
                { name: "HTTP Request Smuggling: التهريب", primary: "HTTP request smuggling attacks" },
                { name: "WebSocket Security Testing", primary: "WebSocket security testing" },
                { name: "GraphQL Security Testing المتقدم", primary: "Advanced GraphQL security testing" },
                { name: "Race Condition في التطبيقات", primary: "Race condition exploitation in web apps" },
                { name: "Cache Poisoning وويب كاش هجمات", primary: "Web cache poisoning attacks" }
              ]
            },
            {
              unit_index: 6, code: "2.1.6",
              name: "اختبار اختراق الشبكة اللاسلكية المتقدم",
              goal: "إجراء اختبار شامل لأمن الشبكات اللاسلكية المؤسسية في البيئات المُصرّح بها",
              key_concepts: ["WPA2 Enterprise","PMKID Attack","KARMA Attack","Hostapd-WPE","EAP Attacks"],
              lessons: [
                { name: "WPA2 Enterprise (802.1X) وهجماته", primary: "WPA2 Enterprise attacks" },
                { name: "PMKID Attack: بلا عميل للهاندشيك", primary: "PMKID clientless WPA2 attack" },
                { name: "KARMA Attack: استغلال Probing", primary: "KARMA attack against probe requests" },
                { name: "hostapd-wpe: التقاط بيانات EAP", primary: "EAP credential capture with hostapd-wpe" },
                { name: "الهجوم على WPA3 SAE: Dragonblood", primary: "Dragonblood attacks against WPA3" },
                { name: "802.11 Frame Injection والتلاعب", primary: "802.11 frame injection" },
                { name: "BSSID Spoofing والهجمات على المحطة", primary: "BSSID spoofing attacks" },
                { name: "اختبار شبكات الضيوف والعزل", primary: "Guest network isolation testing" },
                { name: "أدوات Wi-Fi: Alpha Adapter وaircrack-ng", primary: "Wireless penetration testing tools" }
              ]
            },
            {
              unit_index: 7, code: "2.1.7",
              name: "تجاوز دفاعات الشبكة وAV",
              goal: "فهم تقنيات تجاوز الكشف لبناء دفاعات أقوى ضدها",
              key_concepts: ["AV Evasion","AMSI Bypass","EDR Evasion","LOLBins","C2 Infrastructure"],
              lessons: [
                { name: "كيف يعمل Antivirus وEDR: الآليات", primary: "AV and EDR detection mechanisms" },
                { name: "Signature-Based Evasion: تعديل الكود", primary: "Signature-based AV evasion" },
                { name: "Behavioral Evasion: تجاوز تحليل السلوك", primary: "Behavioral evasion techniques" },
                { name: "Process Injection: DLL وProcess Hollowing", primary: "Process injection techniques" },
                { name: "AMSI Bypass: تعطيل فحص PowerShell", primary: "AMSI bypass methods" },
                { name: "LOLBins: الأسلحة الموجودة مسبقاً على الجهاز", primary: "Living off the land with LOLBins" },
                { name: "Custom C2 Infrastructure للاختباء", primary: "Custom C2 infrastructure setup" },
                { name: "DNS/HTTP C2: التواصل عبر البروتوكولات المسموحة", primary: "DNS and HTTP C2 communication" },
                { name: "كيف يكشف EDR عن هجمات Evasion", primary: "EDR detection of evasion techniques" }
              ]
            },
            {
              unit_index: 8, code: "2.1.8",
              name: "كتابة تقرير اختبار الاختراق",
              goal: "كتابة تقارير اختبار اختراق احترافية تُحوّل النتائج التقنية إلى قيمة قابلة للتنفيذ",
              key_concepts: ["Executive Summary","Technical Findings","CVSS Scoring","Remediation Recommendations","Report Structure"],
              lessons: [
                { name: "بنية تقرير اختبار الاختراق الاحترافي", primary: "Penetration test report structure" },
                { name: "الملخص التنفيذي: للإدارة غير التقنية", primary: "Executive summary writing" },
                { name: "توثيق النتائج التقنية بدقة", primary: "Technical finding documentation" },
                { name: "تقييم الخطورة: CVSS وDREAD والسياق", primary: "Vulnerability severity rating" },
                { name: "توصيات الإصلاح: القابلة للتنفيذ", primary: "Actionable remediation recommendations" },
                { name: "PoC Screenshots وأدلة الاستغلال", primary: "PoC documentation with screenshots" },
                { name: "Attack Narrative: قصة الاختراق", primary: "Attack narrative and kill chain" },
                { name: "Risk Scoring وترتيب الأولويات", primary: "Risk-based finding prioritization" },
                { name: "تقديم النتائج للعميل بفعالية", primary: "Client presentation of findings" }
              ]
            },
            {
              unit_index: 9, code: "2.1.9",
              name: "TryHackMe وHackTheBox: التدريب العملي",
              goal: "استخدام منصات التدريب لإتقان مهارات اختبار الاختراق بالممارسة المستمرة",
              key_concepts: ["TryHackMe Rooms","HTB Machines","CTF Methodology","Writeups","Skill Paths"],
              lessons: [
                { name: "TryHackMe: المسارات التعليمية للمبتدئين والمتقدمين", primary: "TryHackMe learning paths" },
                { name: "HackTheBox: الآلات والتحديات", primary: "HackTheBox machines methodology" },
                { name: "منهجية حل CTF: الاستطلاع والاستغلال", primary: "CTF solving methodology" },
                { name: "VulnHub: التدريب المحلي على الأجهزة الضعيفة", primary: "VulnHub local practice machines" },
                { name: "كتابة Writeup جيد ومدروس", primary: "CTF writeup writing methodology" },
                { name: "PentesterLab: دورات مكثّفة بالتطبيق", primary: "PentesterLab structured courses" },
                { name: "CRTP وCPPT وOSCP: مسارات الشهادات", primary: "Penetration testing certifications" },
                { name: "بناء Portfolio من Writeups وCTFs", primary: "Security portfolio from CTF writeups" },
                { name: "المجتمعات والموارد المستمرة للتطوير", primary: "Security community resources" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "تحليل البرمجيات الخبيثة",
          goal: "إتقان تحليل البرمجيات الخبيثة ثابتاً وديناميكياً وعكسياً لفهم التهديدات وبناء الدفاع",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.2.1",
              name: "تصنيفات البرمجيات الخبيثة وتطورها",
              goal: "فهم التصنيفات الرئيسية للبرمجيات الخبيثة وتطورها التاريخي والحديث",
              key_concepts: ["Virus","Worm","Trojan","Ransomware","APT Malware"],
              lessons: [
                { name: "الفيروسات والديدان: الفارق التاريخي والتقني", primary: "Viruses vs worms: differences" },
                { name: "أحصنة طروادة: الاستغلال بالخداع", primary: "Trojan horse malware types" },
                { name: "Ransomware: تطور الابتزاز الرقمي", primary: "Ransomware evolution and mechanics" },
                { name: "Spyware وKeylogger: المراقبة الصامتة", primary: "Spyware and keylogger techniques" },
                { name: "Rootkit: الاختباء العميق في النظام", primary: "Rootkit types and evasion" },
                { name: "Botnet: شبكات الأجهزة المخترقة", primary: "Botnet architecture and uses" },
                { name: "APT Malware: أسلحة الدول والمجموعات المتقدمة", primary: "APT malware sophistication" },
                { name: "Fileless Malware: الهجوم بلا ملف", primary: "Fileless malware techniques" },
                { name: "أدوات تصنيف البرمجيات الخبيثة: AV وYARA", primary: "Malware classification with AV and YARA" }
              ]
            },
            {
              unit_index: 2, code: "2.2.2",
              name: "التحليل الثابت Static Analysis",
              goal: "إجراء تحليل ثابت شامل للبرمجيات الخبيثة دون تشغيلها",
              key_concepts: ["File Hashing","PE Format","Strings Analysis","Import Table","YARA Rules"],
              lessons: [
                { name: "بيئة التحليل الآمنة: الإعداد والعزل", primary: "Safe malware analysis environment setup" },
                { name: "فحص الملف: الهاش والنوع والحجم", primary: "File identification: hash, type, size" },
                { name: "بنية PE: Portable Executable من الداخل", primary: "PE file format analysis" },
                { name: "Strings Analysis: النصوص الواضحة في الثنائيات", primary: "Strings extraction from binaries" },
                { name: "Import Table: الوظائف المستخدمة تكشف النوايا", primary: "Import table analysis for malware behavior" },
                { name: "PEiD وDIE: كشف Packer وProtector", primary: "Packer and protector detection" },
                { name: "ExifTool: البيانات الوصفية وآثار المطوّر", primary: "Metadata extraction from malware samples" },
                { name: "YARA: كتابة قواعد الكشف المخصصة", primary: "YARA rule writing for malware detection" },
                { name: "VirusTotal وHybrid-Analysis: الاستعانة بالمجتمع", primary: "Online sandbox and community analysis" }
              ]
            },
            {
              unit_index: 3, code: "2.2.3",
              name: "التحليل الديناميكي Dynamic Analysis",
              goal: "مراقبة سلوك البرمجيات الخبيثة أثناء التشغيل في بيئة معزولة",
              key_concepts: ["Process Monitor","Wireshark","Regshot","Cuckoo Sandbox","API Monitor"],
              lessons: [
                { name: "Sandbox التحليل: Cuckoo وAny.run وJoeSandbox", primary: "Sandbox analysis platforms" },
                { name: "Process Monitor: مراقبة نشاط الملفات والسجل", primary: "Process Monitor for behavior analysis" },
                { name: "Process Explorer: تحليل العمليات الجارية", primary: "Process Explorer for process analysis" },
                { name: "Regshot: تغييرات السجل قبل وبعد", primary: "Registry change analysis with Regshot" },
                { name: "Wireshark في التحليل الديناميكي: حركة الشبكة", primary: "Network traffic analysis of malware" },
                { name: "API Monitor: استدعاءات Windows API", primary: "Windows API call monitoring" },
                { name: "تحليل نشاط الملفات والمجلدات", primary: "File system activity analysis" },
                { name: "اكتشاف C2 Communication وProtocol", primary: "C2 communication identification" },
                { name: "كتابة تقرير التحليل الديناميكي", primary: "Dynamic analysis report writing" }
              ]
            },
            {
              unit_index: 4, code: "2.2.4",
              name: "الهندسة العكسية مع Ghidra وIDA",
              goal: "قراءة كود الـAssembly وتحليل وظائف البرمجيات الخبيثة بالهندسة العكسية",
              key_concepts: ["Assembly Language","x86/x64","Ghidra Decompiler","Control Flow","Crypto Identification"],
              lessons: [
                { name: "لغة Assembly: المفاهيم الأساسية لمحلل البرمجيات", primary: "Assembly basics for malware analysts" },
                { name: "بنية x86/x64: السجلات والمكدس والكومة", primary: "x86/x64 architecture for reverse engineering" },
                { name: "Ghidra: الإعداد والتنقل والمكوّن البرمجي", primary: "Ghidra setup and navigation" },
                { name: "Decompiler في Ghidra: من Assembly للـC", primary: "Ghidra decompiler usage" },
                { name: "IDA Free: التحليل المتقدم والـGraph View", primary: "IDA Free for reverse engineering" },
                { name: "تحليل دوال التشفير في البرمجيات الخبيثة", primary: "Cryptographic function identification" },
                { name: "Anti-Analysis Techniques: العقبات والتحايل", primary: "Anti-analysis and anti-debug techniques" },
                { name: "تحليل Ransomware بالهندسة العكسية", primary: "Ransomware reverse engineering" },
                { name: "استخراج Configuration من البرمجيات الخبيثة", primary: "Malware configuration extraction" }
              ]
            },
            {
              unit_index: 5, code: "2.2.5",
              name: "تحليل Ransomware والتعافي",
              goal: "تحليل آليات Ransomware وتطوير استراتيجيات التعافي والوقاية",
              key_concepts: ["Ransomware Kill Chain","Encryption Analysis","Decryptor Development","Backup Strategy","Incident Response"],
              lessons: [
                { name: "Kill Chain الـRansomware: من الوصول للتشفير", primary: "Ransomware kill chain analysis" },
                { name: "تحليل آلية التشفير: مفاتيح وخوارزميات", primary: "Ransomware encryption mechanism" },
                { name: "WannaCry وNotPetya: دراسات حالة تفصيلية", primary: "WannaCry and NotPetya case studies" },
                { name: "REvil وConti وLockBit: الجيل الحديث", primary: "Modern ransomware-as-a-service analysis" },
                { name: "استعادة الملفات: إمكانية بناء Decryptor", primary: "Decryptor development feasibility" },
                { name: "الاستجابة لحادثة Ransomware", primary: "Ransomware incident response" },
                { name: "استراتيجية النسخ الاحتياطي لمقاومة Ransomware", primary: "Backup strategy against ransomware" },
                { name: "Double Extortion: التشفير والتسريب معاً", primary: "Double extortion ransomware tactics" },
                { name: "مفاوضات Ransomware: القرارات والاعتبارات", primary: "Ransomware negotiation considerations" }
              ]
            },
            {
              unit_index: 6, code: "2.2.6",
              name: "Rootkits والبرمجيات الخبيثة المتقدمة",
              goal: "فهم آليات Rootkits والبرمجيات الخبيثة الكرنل-لفيل وكيف تُكشف",
              key_concepts: ["User-mode Rootkit","Kernel Rootkit","Bootkits","DKOM","TDL"],
              lessons: [
                { name: "Rootkits User-mode: الاختباء في الفضاء المستخدم", primary: "User-mode rootkit techniques" },
                { name: "Kernel Rootkits: الاختباء في قلب النظام", primary: "Kernel rootkit mechanisms" },
                { name: "Bootkits: الإصابة قبل بدء التشغيل", primary: "Bootkit and MBR/UEFI malware" },
                { name: "DKOM: التلاعب بكائنات الكرنل", primary: "Direct kernel object manipulation" },
                { name: "Secure Boot وحمايته من Bootkits", primary: "Secure boot against bootkits" },
                { name: "أدوات كشف Rootkits: GMER وChkrootkit", primary: "Rootkit detection tools" },
                { name: "Persistence عميقة: UEFI وFirmware Implants", primary: "UEFI and firmware persistence" },
                { name: "Memory Forensics للكشف عن Rootkits", primary: "Memory forensics for rootkit detection" },
                { name: "حالات APT حقيقية استخدمت Rootkits", primary: "APT rootkit case studies" }
              ]
            },
            {
              unit_index: 7, code: "2.2.7",
              name: "بنية C2 والاتصالات الخبيثة",
              goal: "فهم بنية Command & Control وكيف تعمل وكيف تُكشف وتُحلَّل",
              key_concepts: ["C2 Beaconing","Domain Generation Algorithm","Fast Flux","Cobalt Strike Beacon","C2 Detection"],
              lessons: [
                { name: "C2 Architecture: الهيكل والمكونات", primary: "Command and control architecture" },
                { name: "Beaconing: نبضات الاتصال الدورية", primary: "C2 beaconing patterns and detection" },
                { name: "Domain Generation Algorithm DGA", primary: "DGA for C2 resilience" },
                { name: "Fast Flux DNS: الشبكة المتحركة", primary: "Fast flux DNS infrastructure" },
                { name: "Cobalt Strike Beacon: الأشهر والأكثر تحليلاً", primary: "Cobalt Strike beacon analysis" },
                { name: "HTTP/HTTPS C2: الاختباء في الترافيك الشرعي", primary: "HTTP C2 traffic analysis" },
                { name: "DNS Tunneling C2: تهريب البيانات", primary: "DNS tunneling C2 detection" },
                { name: "كشف C2 في SIEM ومراقبة الشبكة", primary: "C2 detection in SIEM" },
                { name: "Threat Intelligence وقوائم C2 الحظر", primary: "Threat intel feeds for C2 blocking" }
              ]
            },
            {
              unit_index: 8, code: "2.2.8",
              name: "YARA وقواعد الكشف",
              goal: "كتابة قواعد YARA فعّالة وصيانتها للكشف عن البرمجيات الخبيثة",
              key_concepts: ["YARA Syntax","String Patterns","Condition Logic","Performance","YARA Integration"],
              lessons: [
                { name: "YARA: لغة وصف البرمجيات الخبيثة", primary: "YARA rule language fundamentals" },
                { name: "بنية قاعدة YARA: Metadata وStrings وCondition", primary: "YARA rule structure components" },
                { name: "String Patterns: النص والـHex والـRegex", primary: "YARA string pattern types" },
                { name: "Conditions المتقدمة: للتصفية الدقيقة", primary: "Advanced YARA condition logic" },
                { name: "قياس أداء قواعد YARA وتحسينها", primary: "YARA rule performance optimization" },
                { name: "YARA في الـSandbox والـEDR", primary: "YARA integration in security tools" },
                { name: "مجتمع YARA: قواعد Florian Roth وTransfer", primary: "Community YARA rules and resources" },
                { name: "تحديث القواعد مع تطور البرمجيات الخبيثة", primary: "YARA rule maintenance lifecycle" },
                { name: "اختبار قواعد YARA وتجنّب Bypasses", primary: "YARA rule testing and evasion" }
              ]
            },
            {
              unit_index: 9, code: "2.2.9",
              name: "Threat Intelligence وعائلات البرمجيات الخبيثة",
              goal: "ربط البرمجيات الخبيثة بجهات التهديد وبناء استخبارات لتعزيز الدفاع",
              key_concepts: ["Attribution","TTPs","Malware Families","Diamond Model","Threat Actor Profiles"],
              lessons: [
                { name: "نسب الهجوم Attribution: الأدلة والتحديات", primary: "Threat attribution challenges" },
                { name: "Diamond Model لتحليل الحوادث", primary: "Diamond model of intrusion analysis" },
                { name: "عائلات البرمجيات الخبيثة: التصنيف والتتبع", primary: "Malware family tracking and classification" },
                { name: "TTPs: التكتيكات والتقنيات والإجراءات", primary: "TTPs and MITRE ATT&CK mapping" },
                { name: "APT28 وAPT29 وLazarus: تحليل مجموعات", primary: "APT group analysis case studies" },
                { name: "ربط IOCs بالعائلات والمجموعات", primary: "IOC to malware family correlation" },
                { name: "MalwareBazaar وAny.run وVT Graph", primary: "Malware intelligence platforms" },
                { name: "كتابة تقرير تحليل البرمجيات الخبيثة", primary: "Malware analysis report writing" },
                { name: "بناء Threat Intelligence من تحليل البرمجيات", primary: "TI building from malware analysis" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "الطب الشرعي الرقمي والاستجابة للحوادث",
          goal: "إتقان DFIR لجمع الأدلة الرقمية وإعادة بناء الحوادث والاستجابة الفعّالة",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.3.1",
              name: "منهجية DFIR وسلسلة الحفظ",
              goal: "تطبيق المنهجية الصحيحة لجمع الأدلة الرقمية وحفظها للمحاكمات",
              key_concepts: ["Chain of Custody","Evidence Integrity","Forensic Imaging","Triage","Write Blockers"],
              lessons: [
                { name: "DFIR: التعريف والمنهجية والأخلاقيات المهنية", primary: "DFIR methodology and professional ethics" },
                { name: "سلسلة الحفظ: الأدلة من الجريمة للمحكمة", primary: "Chain of custody for digital evidence" },
                { name: "Write Blockers: جمع الأدلة دون تلويثها", primary: "Write blockers in forensic acquisition" },
                { name: "Forensic Imaging: نسخ طبق الأصل", primary: "Forensic disk imaging with dd and FTK" },
                { name: "Triage: الفرز السريع للحوادث", primary: "Forensic triage methodology" },
                { name: "Live vs Dead Forensics: المتاح والحالة", primary: "Live vs dead box forensics" },
                { name: "Volatile Data: الذاكرة والشبكة أولاً", primary: "Volatile data collection priority" },
                { name: "الترتيب وفق Order of Volatility", primary: "Order of volatility in evidence collection" },
                { name: "أدوات جمع الأدلة: FTK Imager وAutopsy", primary: "Forensic acquisition tools" }
              ]
            },
            {
              unit_index: 2, code: "2.3.2",
              name: "تحليل الذاكرة مع Volatility",
              goal: "استخراج الأدلة الجنائية من لقطات الذاكرة الحية باستخدام Volatility",
              key_concepts: ["Memory Dump","Process List","Network Connections","DLL Injection","Volatility Plugins"],
              lessons: [
                { name: "كيف تعمل الذاكرة: هيكلها وأهميتها جنائياً", primary: "Memory structure and forensic value" },
                { name: "Volatility 3: الإعداد والملفات الأساسية", primary: "Volatility 3 setup and profiles" },
                { name: "pslist وpstree: تحليل العمليات النشطة", primary: "Process analysis with Volatility" },
                { name: "netscan وnetstat: الاتصالات في الذاكرة", primary: "Network connections in memory" },
                { name: "dlllist وldrmodules: الـDLLs المحملة", primary: "DLL analysis in memory" },
                { name: "malfind: كشف الحقن والكود الخبيث", primary: "Malicious code detection with malfind" },
                { name: "cmdscan وconsoles: أوامر المهاجم", primary: "Command history in memory" },
                { name: "Hivelist وprintkey: تحليل السجل من الذاكرة", primary: "Registry analysis from memory" },
                { name: "ربط نتائج الذاكرة بخط الهجوم الزمني", primary: "Memory analysis to attack timeline" }
              ]
            },
            {
              unit_index: 3, code: "2.3.3",
              name: "تحليل نظام الملفات والقرص",
              goal: "إجراء تحليل جنائي شامل لأنظمة الملفات واسترداد البيانات المحذوفة",
              key_concepts: ["MFT","NTFS","Inode","Timeline Analysis","File Recovery","Autopsy"],
              lessons: [
                { name: "NTFS وMFT: بنية نظام الملفات جنائياً", primary: "NTFS and MFT forensic analysis" },
                { name: "File Metadata: أوقات الإنشاء والوصول والتعديل", primary: "File timestamps and metadata" },
                { name: "استرداد الملفات المحذوفة", primary: "Deleted file recovery techniques" },
                { name: "Autopsy: إطار العمل الجنائي المتكامل", primary: "Autopsy forensic framework usage" },
                { name: "Recycle Bin والملفات المحذوفة في Windows", primary: "Windows Recycle Bin forensics" },
                { name: "يونكس Inode وExt4 جنائياً", primary: "Linux ext4 filesystem forensics" },
                { name: "تحليل Pagefile وHibernation", primary: "Windows pagefile and hibernation forensics" },
                { name: "تحليل Prefetch وShimCache", primary: "Windows execution evidence analysis" },
                { name: "Timeline Analysis: إعادة بناء تسلسل الأحداث", primary: "Timeline analysis with Plaso/log2timeline" }
              ]
            },
            {
              unit_index: 4, code: "2.3.4",
              name: "تحليل سجلات Windows للطب الشرعي",
              goal: "استخراج الأدلة الحرجة من سجلات Windows لإعادة بناء مسار الهجوم",
              key_concepts: ["Security Log","System Log","Evtx Files","Event Parsing","Lateral Movement Traces"],
              lessons: [
                { name: "سجلات Windows الجنائية: أين وماذا", primary: "Windows forensic log locations" },
                { name: "Event IDs الجنائية الحرجة: تسجيل دخول ونشاط", primary: "Critical forensic Event IDs" },
                { name: "تحليل .evtx بـGet-WinEvent وChainsaw", primary: "EVTX analysis tools" },
                { name: "Sysmon Logs: الأدلة الأثرى للتحليل", primary: "Sysmon log forensic value" },
                { name: "Lateral Movement في السجلات", primary: "Lateral movement traces in logs" },
                { name: "PowerShell Logs وScriptBlock", primary: "PowerShell forensic evidence" },
                { name: "RDP وRemote Access في السجلات", primary: "RDP session forensics" },
                { name: "Log Tampering: اكتشاف التلاعب بالسجلات", primary: "Log tampering detection" },
                { name: "بناء Timeline من سجلات متعددة", primary: "Multi-source log timeline construction" }
              ]
            },
            {
              unit_index: 5, code: "2.3.5",
              name: "تحليل حركة الشبكة في الحوادث",
              goal: "استخدام حركة الشبكة الملتقطة لإعادة بناء الحوادث وتحديد نقاط الاختراق",
              key_concepts: ["PCAP Analysis","Zeek","Suricata","NetFlow","C2 Detection in Traffic"],
              lessons: [
                { name: "PCAP كدليل جنائي: الجمع والتحليل", primary: "PCAP forensic collection and analysis" },
                { name: "Zeek: تحليل الشبكة بالـLogs", primary: "Zeek network analysis logs" },
                { name: "Suricata: كشف التهديدات وتوليد الأدلة", primary: "Suricata IDS for evidence generation" },
                { name: "NetFlow وIPFIX: تحليل الترافيك بالملخصات", primary: "NetFlow analysis for incident response" },
                { name: "كشف Data Exfiltration في الترافيك", primary: "Data exfiltration detection in network traffic" },
                { name: "C2 Beaconing في PCAP: الأنماط والكشف", primary: "C2 traffic analysis in PCAP" },
                { name: "DNS Forensics: تحليل استعلامات DNS", primary: "DNS log forensics" },
                { name: "TLS SNI وCertificate Analysis جنائياً", primary: "TLS forensics without decryption" },
                { name: "بناء Timeline شبكي للحادثة", primary: "Network timeline reconstruction" }
              ]
            },
            {
              unit_index: 6, code: "2.3.6",
              name: "الاستجابة للحوادث: الاحتواء والاستئصال",
              goal: "تنفيذ دورة الاستجابة الكاملة للحوادث من الاكتشاف حتى الاسترداد",
              key_concepts: ["Incident Classification","Containment Strategy","Eradication","Recovery","Lessons Learned"],
              lessons: [
                { name: "دورة NIST للاستجابة للحوادث: المراحل الست", primary: "NIST incident response lifecycle" },
                { name: "تصنيف الحوادث: الأولويات والتصعيد", primary: "Incident classification and severity" },
                { name: "الاحتواء: الفوري والمتطوّر", primary: "Short-term and long-term containment" },
                { name: "جمع الأدلة أثناء الاستجابة الحية", primary: "Evidence collection during live response" },
                { name: "استئصال المهاجم من البيئة", primary: "Threat eradication and cleanup" },
                { name: "الاسترداد وإعادة الخدمات بأمان", primary: "Recovery and safe service restoration" },
                { name: "التواصل أثناء الحادثة: الداخلي والخارجي", primary: "Incident communication management" },
                { name: "تقرير ما بعد الحادثة PIR", primary: "Post-incident review and lessons learned" },
                { name: "Runbooks جاهزة للحوادث الشائعة", primary: "Incident response playbooks" }
              ]
            },
            {
              unit_index: 7, code: "2.3.7",
              name: "Threat Hunting: الصيد قبل الاكتشاف",
              goal: "تطبيق منهجية Threat Hunting الاستباقية للكشف عن التهديدات الكامنة",
              key_concepts: ["Hunting Hypothesis","MITRE ATT&CK Hunt","Behavioral Analytics","Anomaly Detection","Hunt Cycle"],
              lessons: [
                { name: "Threat Hunting vs Detection: الفارق الجوهري", primary: "Proactive vs reactive threat detection" },
                { name: "بناء فرضية الصيد من TI وATT&CK", primary: "Hunt hypothesis building" },
                { name: "Hunt Cycle: التخطيط والبحث والنتائج", primary: "Threat hunting cycle execution" },
                { name: "Hunting بالـSIEM: استعلامات Splunk وElastic", primary: "SIEM-based threat hunting" },
                { name: "Hunting للـLateral Movement في السجلات", primary: "Lateral movement threat hunting" },
                { name: "Hunting لـPersistence Mechanisms", primary: "Persistence mechanism hunting" },
                { name: "Hunting لـC2 Communication في الشبكة", primary: "C2 communication threat hunting" },
                { name: "UEBA: تحليل سلوك المستخدمات والكيانات", primary: "User and entity behavior analytics" },
                { name: "توثيق نتائج الصيد وتطوير قواعد الكشف", primary: "Hunt findings to detection rules" }
              ]
            },
            {
              unit_index: 8, code: "2.3.8",
              name: "الطب الشرعي السحابي وAWS/Azure",
              goal: "إجراء التحليل الجنائي في بيئات السحابة مع خصائصها المختلفة",
              key_concepts: ["CloudTrail","Azure Monitor","Cloud Forensics Challenges","Container Forensics","Serverless Forensics"],
              lessons: [
                { name: "تحديات الطب الشرعي في السحابة", primary: "Cloud forensics unique challenges" },
                { name: "AWS CloudTrail: سجل كل API Call", primary: "AWS CloudTrail forensic analysis" },
                { name: "AWS CloudWatch وVPC Flow Logs", primary: "AWS security log analysis" },
                { name: "Azure Monitor وActivity Log جنائياً", primary: "Azure Monitor forensic investigation" },
                { name: "GCP Audit Logs وCloud Logging", primary: "GCP forensic logging" },
                { name: "Container Forensics: Docker وKubernetes", primary: "Container forensics methodology" },
                { name: "Serverless Forensics: Lambda وFunctions", primary: "Serverless function forensics" },
                { name: "Cloud Incident Response: الأدوار والأدوات", primary: "Cloud-specific incident response" },
                { name: "Digital Forensics في بيئات Kubernetes", primary: "Kubernetes cluster forensics" }
              ]
            },
            {
              unit_index: 9, code: "2.3.9",
              name: "تقرير الطب الشرعي القانوني",
              goal: "كتابة تقارير طب شرعي رقمي قابلة للاستخدام قانونياً وتقنياً",
              key_concepts: ["Forensic Report Structure","Expert Witness","Evidence Presentation","Chain of Custody Report","Technical vs Legal"],
              lessons: [
                { name: "الفارق بين التقرير التقني والقانوني", primary: "Technical vs legal forensic reports" },
                { name: "بنية تقرير الطب الشرعي الشامل", primary: "Forensic report structure" },
                { name: "Expert Witness: تقديم الأدلة للمحكمة", primary: "Expert witness testimony preparation" },
                { name: "تقرير سلسلة الحفظ ووثائقه", primary: "Chain of custody documentation" },
                { name: "تقديم النتائج للإدارة والمستشارين القانونيين", primary: "Findings presentation to legal teams" },
                { name: "دقة اللغة في التقارير الجنائية", primary: "Precise language in forensic reports" },
                { name: "أدوات إنشاء التقارير: Autopsy وCaseNote", primary: "Forensic report generation tools" },
                { name: "درسات حالة: تقارير حقيقية موثقة", primary: "Real-world forensic report case studies" },
                { name: "تخزين الأدلة وإدارتها طويل الأمد", primary: "Evidence storage and long-term management" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "أمن السحابة",
          goal: "تطبيق أمن السحابة في AWS وAzure وGCP وأوعية الحاويات ومنصات DevSecOps",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.4.1",
              name: "نماذج السحابة ومسؤولية الأمن",
              goal: "فهم توزيع المسؤولية الأمنية بين العميل والمزوّد في كل نموذج سحابي",
              key_concepts: ["Shared Responsibility Model","IaaS vs PaaS vs SaaS","Cloud Threat Model","CSA CCM","Well-Architected"],
              lessons: [
                { name: "نماذج الخدمة السحابية: IaaS وPaaS وSaaS", primary: "Cloud service models security responsibilities" },
                { name: "Shared Responsibility Model: من يحمي ماذا", primary: "Shared responsibility security model" },
                { name: "نموذج التهديدات في السحابة", primary: "Cloud-specific threat modeling" },
                { name: "CSA Cloud Controls Matrix", primary: "CSA CCM cloud security controls" },
                { name: "AWS Well-Architected Security Pillar", primary: "AWS security best practices framework" },
                { name: "أكثر ثغرات السحابة شيوعاً: تقرير CISA", primary: "Top cloud security misconfigurations" },
                { name: "Cloud Security Posture Management CSPM", primary: "CSPM tools and methodology" },
                { name: "أمن الشبكة في السحابة: VPC وSecurity Groups", primary: "Cloud network security fundamentals" },
                { name: "بناء Landing Zone آمن", primary: "Secure cloud landing zone design" }
              ]
            },
            {
              unit_index: 2, code: "2.4.2",
              name: "أمن AWS من الداخل",
              goal: "تطبيق ضوابط الأمن المتقدمة في AWS من IAM إلى Detection",
              key_concepts: ["AWS Security Hub","GuardDuty","CloudTrail","Macie","Config"],
              lessons: [
                { name: "AWS Security Hub: مركز التحكم الأمني", primary: "AWS Security Hub centralized security" },
                { name: "GuardDuty: الكشف الذكي عن التهديدات", primary: "AWS GuardDuty threat detection" },
                { name: "AWS CloudTrail: كل API Call محفوظ", primary: "CloudTrail security monitoring" },
                { name: "Amazon Macie: حماية البيانات الحساسة في S3", primary: "Macie sensitive data discovery" },
                { name: "AWS Config: الامتثال المستمر للإعدادات", primary: "AWS Config compliance rules" },
                { name: "VPC Security: Security Groups وNACLs", primary: "VPC network security controls" },
                { name: "AWS WAF وShield: حماية التطبيقات", primary: "AWS WAF and Shield protection" },
                { name: "اختبار اختراق AWS: القواعد والأدوات", primary: "AWS penetration testing guidelines" },
                { name: "حوادث AWS شائعة: أخطاء حقيقية ودروس", primary: "AWS security incident case studies" }
              ]
            },
            {
              unit_index: 3, code: "2.4.3",
              name: "أمن Azure وMicrosoft Defender",
              goal: "تطبيق ضوابط أمن Azure من Entra ID إلى Defender XDR",
              key_concepts: ["Entra ID","Microsoft Defender for Cloud","Sentinel","Azure Policy","Conditional Access"],
              lessons: [
                { name: "Microsoft Entra ID: الهوية في مركز الأمن", primary: "Entra ID security features" },
                { name: "Microsoft Defender for Cloud: حماية المصنع", primary: "Defender for Cloud architecture" },
                { name: "Microsoft Sentinel: SIEM وSOAR في السحابة", primary: "Microsoft Sentinel deployment" },
                { name: "Azure Policy: إنفاذ المعايير تلقائياً", primary: "Azure Policy for compliance" },
                { name: "Conditional Access في Azure: الوصول السياقي", primary: "Azure conditional access policies" },
                { name: "Azure Defender for Servers وContainers", primary: "Azure Defender workload protection" },
                { name: "Azure Private Link وFirewall والشبكة", primary: "Azure network security" },
                { name: "اختبار اختراق Azure وقواعده", primary: "Azure penetration testing guidelines" },
                { name: "Microsoft SIEM Hunting بـKQL", primary: "KQL queries for threat hunting in Sentinel" }
              ]
            },
            {
              unit_index: 4, code: "2.4.4",
              name: "أمن الحاويات وKubernetes",
              goal: "تأمين بيئات Docker وKubernetes وضبط سياسات الأمن الصحيحة",
              key_concepts: ["Container Security Model","Docker Bench","Pod Security","RBAC Kubernetes","Network Policies"],
              lessons: [
                { name: "نموذج أمن الحاويات: العزل والمشاركة", primary: "Container security model and isolation" },
                { name: "Docker Security: Bench وBest Practices", primary: "Docker security hardening" },
                { name: "Container Image Scanning بـTrivy وClair", primary: "Container image vulnerability scanning" },
                { name: "Kubernetes RBAC: أذونات دقيقة للـPods", primary: "Kubernetes RBAC configuration" },
                { name: "Pod Security Standards: الاستبدال الحديث لـPSP", primary: "Kubernetes Pod Security Standards" },
                { name: "Kubernetes Network Policies: عزل الـPods", primary: "Kubernetes network policy implementation" },
                { name: "Secrets في Kubernetes: الحلول الآمنة", primary: "Kubernetes secrets management" },
                { name: "Runtime Security مع Falco: الكشف الحي", primary: "Falco runtime security monitoring" },
                { name: "اختبار اختراق Kubernetes", primary: "Kubernetes penetration testing" }
              ]
            },
            {
              unit_index: 5, code: "2.4.5",
              name: "DevSecOps: الأمن في خط التطوير",
              goal: "دمج أدوات ومبادئ الأمن في كل مرحلة من مراحل CI/CD Pipeline",
              key_concepts: ["Security as Code","Shift Left","SAST/DAST in CI","IaC Security","Supply Chain Security"],
              lessons: [
                { name: "Shift Left: الأمن من أول يوم تطوير", primary: "Shift left security approach" },
                { name: "Security as Code: الأمن بالكود والأتمتة", primary: "Security as code principles" },
                { name: "SAST في GitHub Actions وGitLab CI", primary: "SAST integration in CI pipelines" },
                { name: "DAST في Pipeline: ZAP وBurp في السحابة", primary: "DAST in CD pipeline" },
                { name: "IaC Security: Terraform وCloudFormation", primary: "Infrastructure as code security scanning" },
                { name: "Supply Chain Security: SBOM وsigstore", primary: "Software supply chain security" },
                { name: "Container Signing وVerification", primary: "Container image signing with Cosign" },
                { name: "Secret Detection في الكود والـGit", primary: "Secret detection in pipelines" },
                { name: "قياس فعالية DevSecOps بالمؤشرات", primary: "DevSecOps metrics and measurement" }
              ]
            },
            {
              unit_index: 6, code: "2.4.6",
              name: "Cloud Penetration Testing",
              goal: "إجراء اختبار اختراق السحابة المنهجي وفق القواعد المعتمدة من المزوّدين",
              key_concepts: ["Cloud Pentest Methodology","Pacu AWS","AADInternals","Scout Suite","Privilege Escalation Cloud"],
              lessons: [
                { name: "قواعد اختبار اختراق السحابة لدى AWS وAzure وGCP", primary: "Cloud provider penetration testing rules" },
                { name: "Scout Suite: فحص آمن وشامل للسحابة", primary: "Scout Suite multi-cloud security assessment" },
                { name: "Pacu: إطار اختبار اختراق AWS", primary: "Pacu AWS exploitation framework" },
                { name: "AADInternals: اختبار Azure AD", primary: "AADInternals for Azure AD testing" },
                { name: "تصعيد الامتياز في بيئات السحابة", primary: "Cloud privilege escalation techniques" },
                { name: "IAM Exploitation: الأدوار والسياسات الضعيفة", primary: "IAM misconfiguration exploitation" },
                { name: "Metadata Service Attacks", primary: "Cloud metadata service exploitation" },
                { name: "تقرير اختبار اختراق السحابة", primary: "Cloud penetration test report" },
                { name: "حالات حقيقية: اختراقات سحابية موثقة", primary: "Real cloud breach case studies" }
              ]
            },
            {
              unit_index: 7, code: "2.4.7",
              name: "أمن Serverless وFunctions",
              goal: "تأمين وظائف Serverless وفهم نقاط ضعفها الخاصة",
              key_concepts: ["Lambda Security","Function IAM","Cold Start","Injection in Functions","Serverless Pentest"],
              lessons: [
                { name: "نموذج Serverless وسطح الهجوم الجديد", primary: "Serverless security model and attack surface" },
                { name: "Lambda IAM: الدور الأدنى للوظيفة", primary: "Lambda least privilege IAM" },
                { name: "حقن البيانات في Serverless Functions", primary: "Injection attacks in serverless" },
                { name: "Dependency Security في Lambda Layers", primary: "Lambda layer dependency security" },
                { name: "Secrets في Serverless: الحلول الآمنة", primary: "Serverless secrets management" },
                { name: "Serverless Pentest: الأدوات والمنهجية", primary: "Serverless penetration testing" },
                { name: "Event Injection وTrigger Abuse", primary: "Event source injection attacks" },
                { name: "Monitoring وAlerting في Serverless", primary: "Serverless security monitoring" },
                { name: "OWASP Serverless Top 10", primary: "OWASP Serverless security risks" }
              ]
            },
            {
              unit_index: 8, code: "2.4.8",
              name: "Cloud Security Posture Management CSPM",
              goal: "نشر وإدارة أدوات CSPM للكشف التلقائي عن الإعدادات غير الآمنة",
              key_concepts: ["Wiz","Prisma Cloud","AWS Security Hub","Misconfiguration Detection","Compliance Scoring"],
              lessons: [
                { name: "CSPM: ما تفعله وما لا تفعله", primary: "CSPM scope and limitations" },
                { name: "Wiz: الفحص بدون Agent", primary: "Wiz agentless cloud security" },
                { name: "Prisma Cloud: الحماية الشاملة للسحابة", primary: "Prisma Cloud CSPM capabilities" },
                { name: "AWS Security Hub بالمعايير التلقائية", primary: "AWS Security Hub standards and scoring" },
                { name: "اكتشاف Public S3 وExposed Resources", primary: "Public resource detection in cloud" },
                { name: "Compliance Scoring: مقارنة مع NIST وCIS", primary: "Cloud compliance scoring" },
                { name: "Remediation Automation: إصلاح تلقائي", primary: "Automated cloud misconfiguration remediation" },
                { name: "Integration مع Ticketing وSIEM", primary: "CSPM integration with ITSM and SIEM" },
                { name: "قياس تحسّن وضع الأمان بمرور الوقت", primary: "Security posture improvement tracking" }
              ]
            },
            {
              unit_index: 9, code: "2.4.9",
              name: "Multi-Cloud Security وHybrid",
              goal: "إدارة الأمن في بيئات Multi-Cloud وHybrid بسياسات موحّدة",
              key_concepts: ["Multi-Cloud Strategy","Hybrid Identity","CNAPP","Data Residency","Cross-Cloud Attacks"],
              lessons: [
                { name: "استراتيجية Multi-Cloud ومخاطرها الأمنية", primary: "Multi-cloud security strategy" },
                { name: "Hybrid Identity: هوية موحّدة بين السحابة والـOn-Prem", primary: "Hybrid identity management" },
                { name: "CNAPP: حماية شاملة للتطبيقات السحابية", primary: "CNAPP platform capabilities" },
                { name: "Data Residency وSovereignty", primary: "Data residency compliance in multi-cloud" },
                { name: "Cross-Cloud Attacks: القفز بين المزوّدين", primary: "Cross-cloud attack vectors" },
                { name: "Policy as Code للبيئات المتعددة", primary: "Policy as code for multi-cloud" },
                { name: "مركزية Log Collection من Multi-Cloud", primary: "Centralized logging in multi-cloud" },
                { name: "Zero Trust في بيئات Hybrid Complex", primary: "Zero trust in hybrid complex environments" },
                { name: "TCO لأمن Multi-Cloud وتكاليف الأدوات", primary: "Multi-cloud security tool cost optimization" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "مركز عمليات الأمن SOC",
          goal: "بناء وتشغيل قدرات SOC من SIEM إلى Threat Hunting إلى تحسين مستمر",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.5.1",
              name: "بنية SOC وأدوار الفريق",
              goal: "فهم هيكل SOC الحديث وأدوار المحللين والعمليات اليومية",
              key_concepts: ["SOC Tiers","Analyst Roles","Alert Triage","SLA","SOC KPIs"],
              lessons: [
                { name: "أنواع SOC: داخلي وخارجي وهجين", primary: "SOC models: internal, MSSP, hybrid" },
                { name: "مستويات المحللين: Tier 1 و2 و3", primary: "SOC analyst tiers and responsibilities" },
                { name: "عمليات SOC اليومية: الروتين والطوارئ", primary: "Daily SOC operations workflow" },
                { name: "Alert Triage: الفرز السريع والتصنيف", primary: "Alert triage methodology" },
                { name: "SLA وأوقات الاستجابة المستهدفة", primary: "SOC SLA and response time targets" },
                { name: "SOC KPIs: قياس فعالية العمليات", primary: "SOC performance metrics" },
                { name: "التحويل بين التحليلين وعدم فقدان السياق", primary: "SOC shift handover procedures" },
                { name: "الحوادث الكبرى: تصعيد وتنسيق", primary: "Major incident escalation" },
                { name: "استرداد العمل والتعلم من الحوادث", primary: "Post-incident improvement cycle" }
              ]
            },
            {
              unit_index: 2, code: "2.5.2",
              name: "SIEM: Splunk وElastic Security",
              goal: "بناء واستخدام SIEM لاكتشاف التهديدات والتحقيق في الحوادث",
              key_concepts: ["SIEM Architecture","SPL","KQL","Correlation Rules","Log Ingestion"],
              lessons: [
                { name: "SIEM Architecture: Ingestion وCorrelation وVisualization", primary: "SIEM architecture components" },
                { name: "Splunk: SPL للاستعلام والكشف", primary: "Splunk SPL query language" },
                { name: "Elastic Security: KQL وEQL لاكتشاف التهديدات", primary: "Elastic SIEM with KQL and EQL" },
                { name: "قواعد الارتباط: كتابة Detection Rules", primary: "SIEM correlation rule writing" },
                { name: "Normalization وParsing للسجلات", primary: "Log normalization and parsing" },
                { name: "MITRE ATT&CK Mapping في SIEM", primary: "ATT&CK technique mapping in SIEM" },
                { name: "أداء SIEM: EPS والسعة والتكلفة", primary: "SIEM performance and scaling" },
                { name: "تقليل False Positives بالـTuning", primary: "SIEM tuning to reduce false positives" },
                { name: "Microsoft Sentinel كـCloud-Native SIEM", primary: "Microsoft Sentinel architecture" }
              ]
            },
            {
              unit_index: 3, code: "2.5.3",
              name: "EDR وXDR: الكشف على النقطة النهائية",
              goal: "نشر وإدارة واستخدام أدوات EDR وXDR للكشف المتقدم والاستجابة",
              key_concepts: ["CrowdStrike","SentinelOne","Microsoft Defender XDR","Behavioral Detection","Response Actions"],
              lessons: [
                { name: "EDR vs AV التقليدي: الفارق الجوهري", primary: "EDR vs traditional antivirus" },
                { name: "CrowdStrike Falcon: الإعداد والاستخدام", primary: "CrowdStrike Falcon platform" },
                { name: "SentinelOne: الاستجابة التلقائية والـ1-Click", primary: "SentinelOne autonomous response" },
                { name: "Microsoft Defender XDR: التكامل الكامل", primary: "Microsoft Defender XDR capabilities" },
                { name: "Behavioral Detection: الكشف عن السلوك الخبيث", primary: "Behavioral detection engines" },
                { name: "إجراءات الاستجابة في EDR: Isolate وContain", primary: "EDR response actions" },
                { name: "Threat Hunting بـEDR من القيادة المركزية", primary: "EDR-based threat hunting" },
                { name: "تحليل Detections وتقليل الضوضاء", primary: "EDR detection analysis and tuning" },
                { name: "XDR: تكامل Endpoint وEmail وIdentity", primary: "XDR cross-platform detection" }
              ]
            },
            {
              unit_index: 4, code: "2.5.4",
              name: "SOAR: أتمتة الاستجابة للحوادث",
              goal: "بناء Playbooks تلقائية لتسريع الاستجابة للحوادث وتقليل الجهد البشري",
              key_concepts: ["SOAR Platforms","Playbook Design","Automation Triggers","XSOAR","Swimlane"],
              lessons: [
                { name: "SOAR: ما تفعله وكيف تكمل SIEM", primary: "SOAR complement to SIEM" },
                { name: "Palo Alto XSOAR: القدرات والتكاملات", primary: "XSOAR platform capabilities" },
                { name: "Swimlane وSplunk SOAR: بدائل XSOAR", primary: "Alternative SOAR platforms" },
                { name: "تصميم Playbook: من الحادثة للحل", primary: "Security playbook design methodology" },
                { name: "Triggers والأحداث التي تُطلق الأتمتة", primary: "Playbook trigger configuration" },
                { name: "Case Management: تتبع الحوادث منهجياً", primary: "Incident case management" },
                { name: "تكامل SOAR مع Threat Intelligence", primary: "SOAR and TI platform integration" },
                { name: "قياس فعالية SOAR: MTTR والأتمتة %", primary: "SOAR effectiveness metrics" },
                { name: "أتمتة Phishing Response كاملاً", primary: "Full phishing response automation" }
              ]
            },
            {
              unit_index: 5, code: "2.5.5",
              name: "Threat Intelligence في SOC",
              goal: "دمج Threat Intelligence في عمليات SOC لتحسين الكشف وتسريع التحقيق",
              key_concepts: ["IOC","TTP","Threat Feeds","MISP","TI Platforms"],
              lessons: [
                { name: "أنواع Threat Intelligence: Strategic وOperational وTactical", primary: "Threat intelligence types" },
                { name: "IOCs: الهاش والـIP والنطاقات وURL", primary: "Indicator of compromise types" },
                { name: "Threat Feeds: المجانية والمدفوعة", primary: "Threat intelligence feeds" },
                { name: "MISP: منصة مشاركة TI مفتوحة المصدر", primary: "MISP threat sharing platform" },
                { name: "OpenCTI: إدارة استخبارات التهديدات", primary: "OpenCTI platform usage" },
                { name: "دمج TI في SIEM: Enrichment تلقائي", primary: "TI enrichment in SIEM" },
                { name: "STIX/TAXII: معيار تبادل البيانات", primary: "STIX/TAXII data exchange" },
                { name: "قياس جودة Threat Intelligence", primary: "TI quality metrics" },
                { name: "بناء TI داخلي من حوادث الشركة", primary: "Internal TI from incident history" }
              ]
            },
            {
              unit_index: 6, code: "2.5.6",
              name: "Detection Engineering: بناء قواعد الكشف",
              goal: "كتابة وصيانة قواعد كشف فعّالة مرتبطة بـMITRE ATT&CK",
              key_concepts: ["Sigma Rules","ATT&CK Coverage","Detection Coverage","FP Rate","Purple Team"],
              lessons: [
                { name: "Detection Engineering: المهنة والمسؤوليات", primary: "Detection engineering role and responsibilities" },
                { name: "Sigma: قواعد كشف Generic قابلة للتحويل", primary: "Sigma rule format and conversion" },
                { name: "كتابة Sigma Rule من هجوم موثّق", primary: "Sigma rule writing from ATT&CK technique" },
                { name: "ATT&CK Coverage: ما الذي نكشفه وما يغيب", primary: "ATT&CK detection coverage analysis" },
                { name: "قياس جودة القواعد: FP Rate وTP Rate", primary: "Detection rule quality metrics" },
                { name: "Purple Team: اختبار القواعد بالهجوم الفعلي", primary: "Purple team validation of detection rules" },
                { name: "تحسين القواعد وتقليص الضوضاء", primary: "Detection rule tuning and maintenance" },
                { name: "Detection As Code: إدارة القواعد في Git", primary: "Detection as code in version control" },
                { name: "قياس نضج Detection Engineering", primary: "Detection maturity assessment" }
              ]
            },
            {
              unit_index: 7, code: "2.5.7",
              name: "Incident Response في SOC",
              goal: "تنفيذ دورة استجابة حوادث منهجية فعّالة من داخل SOC",
              key_concepts: ["Alert to Incident","Playbook Execution","Evidence Collection","Communication","Closure"],
              lessons: [
                { name: "من التنبيه للحادثة: متى يرتقي المستوى", primary: "Alert to incident escalation criteria" },
                { name: "تنفيذ Playbook: الاتباع والتكيّف", primary: "Playbook execution in real incidents" },
                { name: "جمع الأدلة أثناء الاستجابة الحية", primary: "Live response evidence collection" },
                { name: "التواصل الداخلي: قائمة اتصال الطوارئ", primary: "Internal incident communication" },
                { name: "التواصل الخارجي: الجهات والمتطلبات القانونية", primary: "External notification requirements" },
                { name: "رفع الحادثة: متى تستدعي الخبراء الخارجيين", primary: "Incident escalation to external experts" },
                { name: "إغلاق الحادثة: التوثيق الكامل", primary: "Incident closure documentation" },
                { name: "Lessons Learned: تحسين لا توبيخ", primary: "Blameless incident post-mortem" },
                { name: "متابعة تنفيذ الإجراءات التصحيحية", primary: "Corrective action follow-up" }
              ]
            },
            {
              unit_index: 8, code: "2.5.8",
              name: "قياس أداء SOC وتحسينه",
              goal: "تطبيق مؤشرات أداء SOC لقياس الفعالية وتوجيه التحسين المستمر",
              key_concepts: ["MTTD","MTTR","False Positive Rate","Detection Coverage","SOC Maturity Model"],
              lessons: [
                { name: "MTTD وMTTR: المقياسان الأساسيان", primary: "MTTD and MTTR metrics" },
                { name: "False Positive Rate: تأثيره على الفريق", primary: "False positive burden on SOC analysts" },
                { name: "Detection Coverage: ما نرى وما نفوّت", primary: "Detection gap analysis" },
                { name: "SOC Metrics Dashboard: بناء لوحة القيادة", primary: "SOC metrics dashboard" },
                { name: "مقارنة SOC مع أفضل ممارسات الصناعة", primary: "SOC benchmarking" },
                { name: "SOC Maturity Models: قياس النضج", primary: "SOC maturity model assessment" },
                { name: "تحسين مستمر: الدورات والأولويات", primary: "Continuous SOC improvement cycle" },
                { name: "أتمتة المهام المتكررة لتحرير المحللين", primary: "SOC automation for analyst relief" },
                { name: "Purple Team الدوري لتحديث الدفاع", primary: "Regular purple team exercises" }
              ]
            },
            {
              unit_index: 9, code: "2.5.9",
              name: "أدوات وتقنيات SOC الحديثة",
              goal: "التعرف على التقنيات الناشئة في SOC من AI/ML إلى UEBA إلى XDR",
              key_concepts: ["AI in SOC","UEBA","TDR","NDR","Attack Simulation"],
              lessons: [
                { name: "AI وML في SOC: الواقع والادعاءات", primary: "AI/ML applications in SOC" },
                { name: "UEBA: تحليل سلوك غير طبيعي", primary: "User and entity behavior analytics" },
                { name: "NDR: كشف التهديدات في حركة الشبكة", primary: "Network Detection and Response" },
                { name: "TDR: اكتشاف التهديدات والاستجابة المتكاملة", primary: "Threat Detection and Response platforms" },
                { name: "Attack Simulation: Atomic Red Team وCaldera", primary: "Automated attack simulation tools" },
                { name: "Breach & Attack Simulation BAS", primary: "BAS platforms for continuous testing" },
                { name: "Deception Technology في SOC", primary: "Deception technology for threat detection" },
                { name: "SOC في السحابة: Cloud-Native SOC", primary: "Cloud-native SOC architecture" },
                { name: "مستقبل SOC: الأتمتة والمحلل السيبراني", primary: "Future of SOC and analyst evolution" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "أمن التطبيقات المتقدم",
          goal: "إتقان تقنيات اختبار الاختراق المتقدمة للتطبيقات وبناء برامج AppSec مؤسسية",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.6.1",
              name: "Buffer Overflow وثغرات الذاكرة",
              goal: "فهم هجمات تجاوز المخزن المؤقت ومقاومتها وبناء Exploits أساسية للتدريب",
              key_concepts: ["Stack Overflow","Heap Overflow","Return Address","NX Bit","ASLR"],
              lessons: [
                { name: "Stack Buffer Overflow: الأساس والآلية", primary: "Stack buffer overflow mechanics" },
                { name: "Heap Buffer Overflow: أكثر تعقيداً", primary: "Heap buffer overflow concepts" },
                { name: "استبدال عنوان العودة Return Address", primary: "Return address overwrite exploit" },
                { name: "Shellcode: الكود الذي يُنفَّذ بعد الاختراق", primary: "Shellcode basics" },
                { name: "NX/DEP: منع تنفيذ الكومة والمكدس", primary: "NX bit and DEP protection" },
                { name: "ASLR: عشوائية عناوين الذاكرة", primary: "ASLR address space randomization" },
                { name: "Stack Canaries: الحارس بين البيانات والعنوان", primary: "Stack canary protection" },
                { name: "ROP Chains مقدمة: التحايل على DEP+ASLR", primary: "Return-oriented programming introduction" },
                { name: "Safe Coding Practices لمنع ثغرات الذاكرة", primary: "Memory-safe coding practices" }
              ]
            },
            {
              unit_index: 2, code: "2.6.2",
              name: "Race Conditions وInjection المتقدم",
              goal: "استغلال ثغرات التسابق الزمني وحقن القوالب والتسلسل",
              key_concepts: ["TOCTOU","Concurrency Bugs","SSTI","Deserialization","Prototype Pollution"],
              lessons: [
                { name: "Race Conditions: التسابق على الموارد", primary: "Race condition vulnerability mechanics" },
                { name: "TOCTOU: بين الفحص والاستخدام", primary: "Time-of-check time-of-use attacks" },
                { name: "استغلال Race Conditions في الويب", primary: "Web race condition exploitation" },
                { name: "SSTI Server-Side Template Injection بالعمق", primary: "SSTI exploitation across frameworks" },
                { name: "Java Deserialization: الاستغلال الناضج", primary: "Java deserialization exploitation" },
                { name: "Python Pickle Deserialization", primary: "Python pickle insecure deserialization" },
                { name: "Prototype Pollution في JavaScript", primary: "JavaScript prototype pollution" },
                { name: "Command Injection: المسار إلى RCE", primary: "Command injection to RCE" },
                { name: "Log4Shell: CVE-2021-44228 دراسة تفصيلية", primary: "Log4Shell vulnerability analysis" }
              ]
            },
            {
              unit_index: 3, code: "2.6.3",
              name: "Mobile Application Security",
              goal: "اختبار أمان تطبيقات Android وiOS بشكل منهجي",
              key_concepts: ["OWASP Mobile Top 10","Android Pentest","iOS Pentest","Frida","MobSF"],
              lessons: [
                { name: "OWASP Mobile Top 10: المخاطر الخاصة بالمحمول", primary: "OWASP Mobile Top 10 overview" },
                { name: "Android Security Model: Sandbox والأذونات", primary: "Android security model" },
                { name: "iOS Security Model: Sandbox وEntitlements", primary: "iOS security model" },
                { name: "Static Analysis لتطبيقات Android بـMobSF", primary: "Android static analysis with MobSF" },
                { name: "Dynamic Analysis لتطبيقات المحمول", primary: "Mobile app dynamic analysis" },
                { name: "Frida: Dynamic Instrumentation للتطبيقات", primary: "Frida for mobile app instrumentation" },
                { name: "Certificate Pinning Bypass في المحمول", primary: "Mobile certificate pinning bypass" },
                { name: "Insecure Data Storage في التطبيقات", primary: "Insecure local data storage" },
                { name: "API Security Testing من المحمول", primary: "Mobile API security testing" }
              ]
            },
            {
              unit_index: 4, code: "2.6.4",
              name: "اختبار اختراق شبكات OT/ICS",
              goal: "فهم خصائص البيئات الصناعية وكيف تختلف عن اختبار IT التقليدي",
              key_concepts: ["OT vs IT","Purdue Model","Modbus","DNP3","ICS Vulnerabilities"],
              lessons: [
                { name: "OT vs IT Security: الفلسفة تختلف", primary: "OT and IT security differences" },
                { name: "Purdue Model: هرمية الشبكات الصناعية", primary: "Purdue model for ICS networks" },
                { name: "بروتوكولات SCADA: Modbus وDNP3 وProfinet", primary: "Industrial protocol security" },
                { name: "HMI وEngineering Workstations: نقاط الضعف", primary: "HMI and workstation security" },
                { name: "Air Gap: حقيقة أم أسطورة في OT", primary: "Air gap myth in OT environments" },
                { name: "Stuxnet: أول سلاح سيبراني إلكتروني", primary: "Stuxnet malware analysis" },
                { name: "اختبار اختراق ICS: القيود والمنهجية", primary: "ICS penetration testing constraints" },
                { name: "حماية البنية التحتية الحرجة", primary: "Critical infrastructure protection" },
                { name: "الاستجابة للحوادث في بيئات OT", primary: "OT incident response" }
              ]
            },
            {
              unit_index: 5, code: "2.6.5",
              name: "Cryptographic Implementation Attacks",
              goal: "كشف أخطاء تطبيق التشفير في البرامج الحقيقية وتصحيحها",
              key_concepts: ["Padding Oracle","CBC Bit Flipping","ECB Oracle","Timing Attacks","Crypto Mistakes"],
              lessons: [
                { name: "أخطاء تطبيق التشفير الشائعة في الإنتاج", primary: "Common cryptographic implementation mistakes" },
                { name: "Padding Oracle بالتفصيل: التطبيق العملي", primary: "Practical padding oracle attack" },
                { name: "CBC Bit Flipping Attack", primary: "CBC bit flipping exploitation" },
                { name: "ECB Oracle Attack: هجوم اكتشاف النص", primary: "ECB encryption oracle attack" },
                { name: "Timing Attacks على التوقيع والمقارنة", primary: "Timing attack on comparison functions" },
                { name: "Weak Random Number Generation في التطبيقات", primary: "Weak RNG exploitation" },
                { name: "JWT Algorithm Confusion Attacks", primary: "JWT alg:none and key confusion" },
                { name: "اكتشاف ثغرات التشفير في Code Review", primary: "Cryptographic bug finding in code" },
                { name: "أدوات اختبار التشفير: testssl وssl-checker", primary: "Cryptographic testing tools" }
              ]
            },
            {
              unit_index: 6, code: "2.6.6",
              name: "Secure Code Review المتقدم",
              goal: "إجراء مراجعة أمنية شاملة للكود المصدري بمنهجية محكمة",
              key_concepts: ["Threat Modeling Code Review","Data Flow Analysis","Sink and Source","CodeQL Queries","Review Methodology"],
              lessons: [
                { name: "منهجية مراجعة الكود الأمنية المتقدمة", primary: "Advanced security code review methodology" },
                { name: "Source وSink Analysis: تتبع البيانات", primary: "Data flow source and sink analysis" },
                { name: "Taint Analysis: تلوث البيانات غير الموثوقة", primary: "Taint analysis in code review" },
                { name: "CodeQL Queries المتقدمة للثغرات الصعبة", primary: "Advanced CodeQL for vulnerability research" },
                { name: "Business Logic Review: ما لا تكشفه الأدوات", primary: "Manual business logic review" },
                { name: "مراجعة تطبيقات Node.js: النقاط الحرجة", primary: "Node.js security code review" },
                { name: "مراجعة تطبيقات Python/Django", primary: "Python/Django security review" },
                { name: "مراجعة كود Go من منظور أمني", primary: "Go security code review" },
                { name: "دمج Code Review في دورة التطوير", primary: "Code review integration in development" }
              ]
            },
            {
              unit_index: 7, code: "2.6.7",
              name: "Bug Bounty المتقدم وHigh-Impact Findings",
              goal: "العثور على ثغرات حرجة وعالية القيمة في برامج Bug Bounty الكبرى",
              key_concepts: ["Chaining Vulnerabilities","High Impact Findings","Recon Automation","Account Takeover","RCE Chains"],
              lessons: [
                { name: "ربط الثغرات Chaining لتضخيم التأثير", primary: "Vulnerability chaining for maximum impact" },
                { name: "Account Takeover: سيناريوهات وتقنيات", primary: "Account takeover attack chains" },
                { name: "RCE من Bugs صغيرة: بناء السلسلة", primary: "RCE chain building from low-impact bugs" },
                { name: "أتمتة الاستطلاع في Bug Bounty", primary: "Automated recon for bug bounty" },
                { name: "SSRF إلى RCE: البنية السحابية", primary: "SSRF to cloud RCE chain" },
                { name: "الاستهداف الذكي: برامج ذات عائد عالٍ", primary: "High-value program targeting strategy" },
                { name: "Duplicate بديل: الأبحاث الأصيلة", primary: "Original research vs duplicate bugs" },
                { name: "P1 Bug: ما الذي يجعل الثغرة حرجة", primary: "P1 critical vulnerability characteristics" },
                { name: "بناء سمعة على Hacker One Top Hackers", primary: "Building bug bounty reputation to top 100" }
              ]
            },
            {
              unit_index: 8, code: "2.6.8",
              name: "AppSec Program: البناء المؤسسي",
              goal: "بناء برنامج أمن التطبيقات المؤسسي من الصفر إلى النضج",
              key_concepts: ["AppSec Maturity","OWASP SAMM","Secure By Default","AppSec Champions","Metrics"],
              lessons: [
                { name: "OWASP SAMM: نموذج نضج أمن البرمجيات", primary: "OWASP SAMM maturity model" },
                { name: "تقييم الوضع الحالي لبرنامج AppSec", primary: "AppSec current state assessment" },
                { name: "Secure By Default: التصميم الآمن من البداية", primary: "Secure by default development" },
                { name: "AppSec Champions Program في الفرق", primary: "Application security champions" },
                { name: "Threat Modeling في AppSec Program", primary: "Threat modeling at scale" },
                { name: "قياس AppSec: مؤشرات الأداء الرئيسية", primary: "AppSec KPIs and metrics" },
                { name: "Developer Security Training المتخصص", primary: "Targeted developer security training" },
                { name: "دمج AppSec في Agile وDevOps", primary: "AppSec in agile and DevOps" },
                { name: "تقرير الوضع الأمني للإدارة", primary: "AppSec status reporting to management" }
              ]
            },
            {
              unit_index: 9, code: "2.6.9",
              name: "Application Architecture Security Review",
              goal: "إجراء مراجعة أمنية للمعمارية قبل البناء لتجنب الإعادة المكلفة",
              key_concepts: ["Architecture Review","Threat Modeling at Design","Security Patterns","Attack Surface Review","STRIDE at Architecture"],
              lessons: [
                { name: "Architecture Security Review: المتى والكيف", primary: "Security architecture review process" },
                { name: "STRIDE على مستوى المعمارية", primary: "STRIDE threat modeling at architecture level" },
                { name: "Data Flow Diagrams للمراجعة الأمنية", primary: "Data flow diagrams for security review" },
                { name: "Security Patterns: الحلول المعتمدة للمشاكل المتكررة", primary: "Security design patterns" },
                { name: "API Gateway Security في المعمارية", primary: "API gateway security patterns" },
                { name: "Microservices Security: التحديات الخاصة", primary: "Microservices security architecture" },
                { name: "Event-Driven Architecture Security", primary: "Event-driven security considerations" },
                { name: "Attack Surface Reduction في التصميم", primary: "Attack surface reduction at design phase" },
                { name: "توثيق قرارات الأمن في ADRs", primary: "Security Architecture Decision Records" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "أمن البنية التحتية والشبكات المتقدم",
          goal: "تأمين البنية التحتية المعقدة من شبكات المؤسسات إلى الأنظمة الصناعية",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.7.1",
              name: "Zero Trust Network Architecture",
              goal: "تصميم وتطبيق معمارية Zero Trust كاملة في بيئة مؤسسية حقيقية",
              key_concepts: ["Zero Trust Principles","Microsegmentation","ZTNA","SDP","BeyondCorp"],
              lessons: [
                { name: "Zero Trust: من BeyondCorp Google إلى NIST SP 800-207", primary: "Zero trust evolution and NIST framework" },
                { name: "خطة هجرة Zero Trust: المراحل والأولويات", primary: "Zero trust migration planning" },
                { name: "Identity in Zero Trust: الجسر الأول", primary: "Identity as zero trust foundation" },
                { name: "Device Trust: امتثال الجهاز في Zero Trust", primary: "Device compliance in zero trust" },
                { name: "Network Microsegmentation التطبيق الكامل", primary: "Full microsegmentation implementation" },
                { name: "Application Access: ZTNA بدلاً من VPN", primary: "ZTNA for application access" },
                { name: "Data-centric Zero Trust", primary: "Data protection in zero trust" },
                { name: "Monitoring في Zero Trust: الرؤية الكاملة", primary: "Zero trust visibility and monitoring" },
                { name: "قياس نجاح Zero Trust Implementation", primary: "Zero trust success measurement" }
              ]
            },
            {
              unit_index: 2, code: "2.7.2",
              name: "SD-WAN وSASE Security",
              goal: "تطبيق أمان SD-WAN وSASE في شبكات المؤسسات الموزّعة",
              key_concepts: ["SD-WAN Security","SASE Architecture","CASB","FWaaS","Zero Trust Edge"],
              lessons: [
                { name: "SD-WAN: الفوائد ومخاطر الأمن الجديدة", primary: "SD-WAN security challenges" },
                { name: "SASE: دمج الشبكة والأمن في السحابة", primary: "SASE architecture explained" },
                { name: "CASB: Cloud Access Security Broker", primary: "CASB for cloud security" },
                { name: "FWaaS: جدار الحماية كخدمة سحابية", primary: "Firewall as a Service" },
                { name: "Zero Trust Edge: ZTNA في SASE", primary: "ZTNA component in SASE" },
                { name: "تطبيق SASE مع Zscaler وCisco وPalo Alto", primary: "SASE vendor implementation" },
                { name: "Data Loss Prevention DLP في SASE", primary: "DLP in SASE framework" },
                { name: "مراقبة وتسجيل حركة SASE", primary: "SASE traffic monitoring" },
                { name: "بناء حالة ROI لـSASE في المؤسسة", primary: "SASE business case development" }
              ]
            },
            {
              unit_index: 3, code: "2.7.3",
              name: "BGP Security وأمن توجيه الإنترنت",
              goal: "فهم مخاطر BGP وتطبيق ضوابط RPKI وRoute Filtering",
              key_concepts: ["BGP Hijacking","RPKI","Route Filtering","AS Path","Prefix Hijacking"],
              lessons: [
                { name: "BGP: بروتوكول الإنترنت الأشمل وثغراته", primary: "BGP vulnerabilities and hijacking" },
                { name: "حوادث BGP Hijacking الكبرى: الدروس", primary: "BGP hijacking incident case studies" },
                { name: "RPKI: التحقق من صحة الإعلانات", primary: "RPKI route origin validation" },
                { name: "Route Filtering وPrefix Lists", primary: "BGP route filtering best practices" },
                { name: "BGPSEC: مستقبل أمن BGP", primary: "BGPSEC protocol introduction" },
                { name: "AS Path Filtering: التحقق من المسار", primary: "BGP AS path filtering" },
                { name: "Monitoring BGP بـBGPmon وRIPEstat", primary: "BGP monitoring tools" },
                { name: "أمن توجيه IPv6", primary: "IPv6 routing security" },
                { name: "بناء NOC/SOC Routing Security", primary: "Network routing security operations" }
              ]
            },
            {
              unit_index: 4, code: "2.7.4",
              name: "DNS Security المتقدم",
              goal: "تطبيق DNSSEC وDoH وDoT وحماية الـDNS من الهجمات المتقدمة",
              key_concepts: ["DNSSEC Deployment","DNS over HTTPS","RPZ","DNS Firewall","Passive DNS"],
              lessons: [
                { name: "DNSSEC: التوقيع والتحقق والقيود", primary: "DNSSEC implementation and limitations" },
                { name: "DNS Firewall وRPZ: الحظر والتحويل", primary: "DNS firewall response policy zones" },
                { name: "DNS over HTTPS وDNS over TLS", primary: "Encrypted DNS protocols" },
                { name: "Passive DNS Intelligence: بناء قاعدة بيانات", primary: "Passive DNS for threat intelligence" },
                { name: "DNS Sinkholes: إعادة توجيه الـC2", primary: "DNS sinkhole for malware control" },
                { name: "DGA Detection في حركة DNS", primary: "DGA detection in DNS traffic" },
                { name: "DNS Exfiltration Detection", primary: "DNS data exfiltration detection" },
                { name: "نشر DNS Security في المؤسسة", primary: "Enterprise DNS security deployment" },
                { name: "اختبار DNS Security وتدقيق الإعدادات", primary: "DNS security testing and audit" }
              ]
            },
            {
              unit_index: 5, code: "2.7.5",
              name: "DDoS: الهجوم والدفاع المتقدم",
              goal: "فهم تقنيات DDoS الحديثة وبناء استراتيجيات دفاع متعددة الطبقات",
              key_concepts: ["Volumetric DDoS","Protocol Attacks","Application Layer DDoS","Amplification","DDoS Mitigation"],
              lessons: [
                { name: "أنواع DDoS: الحجمي والبروتوكولي والتطبيقي", primary: "DDoS attack types classification" },
                { name: "Amplification Attacks: DNS وNTP وMemcached", primary: "DDoS amplification techniques" },
                { name: "Slowloris وHTTP Flood: Layer 7 DDoS", primary: "Application layer DDoS attacks" },
                { name: "Botnet DDoS: الجيوش الرقمية", primary: "Botnet-based DDoS operations" },
                { name: "DDoS Mitigation: BGP Blackhole وScrubbing", primary: "DDoS mitigation techniques" },
                { name: "Cloudflare وAkamai وAWS Shield", primary: "DDoS protection services" },
                { name: "خطة استجابة DDoS: الدقائق الأولى", primary: "DDoS incident response plan" },
                { name: "Testing DDoS Resilience: مشروع", primary: "DDoS resilience testing" },
                { name: "تحليل حوادث DDoS الكبرى: GitHub وDyn", primary: "Major DDoS incident post-mortems" }
              ]
            },
            {
              unit_index: 6, code: "2.7.6",
              name: "Network Traffic Analysis المتقدم",
              goal: "إجراء تحليل عميق لحركة الشبكة لاكتشاف التهديدات المتقدمة المتخفية",
              key_concepts: ["Behavioral Baselining","Anomaly Detection","ML in NTA","Encrypted Traffic Analysis","JA3"],
              lessons: [
                { name: "Behavioral Baselining: ما هو الطبيعي في الشبكة", primary: "Network behavioral baseline" },
                { name: "Anomaly Detection في حركة الشبكة", primary: "Network anomaly detection" },
                { name: "ML في Network Traffic Analysis", primary: "Machine learning for NTA" },
                { name: "Encrypted Traffic Analysis بدون فك التشفير", primary: "ETA without decryption" },
                { name: "JA3/JA3S: بصمة TLS للكشف عن C2", primary: "JA3 TLS fingerprinting" },
                { name: "Zeek Scripting للكشف المخصص", primary: "Custom Zeek scripts for detection" },
                { name: "NetFlow v9 وIPFIX لتحليل الترافيك الضخم", primary: "NetFlow analysis at scale" },
                { name: "تحديد Lateral Movement في الشبكة الداخلية", primary: "Lateral movement detection in NTA" },
                { name: "بناء لوحة مراقبة الشبكة في الوقت الحقيقي", primary: "Real-time network monitoring dashboard" }
              ]
            },
            {
              unit_index: 7, code: "2.7.7",
              name: "IDS/IPS المتقدم والكشف عن الشذوذ",
              goal: "نشر وإدارة IDS/IPS متقدم مع قواعد مخصصة وتحليل شذوذ",
              key_concepts: ["Snort Rules","Suricata Rules","Inline vs Passive","Rule Tuning","Bypass Techniques"],
              lessons: [
                { name: "IDS vs IPS: الوضع وتأثيره على الكشف", primary: "IDS vs IPS mode comparison" },
                { name: "Snort 3: قواعد الكشف وبنيتها", primary: "Snort 3 rule writing" },
                { name: "Suricata: القواعد والـPCAP Replay", primary: "Suricata rules and testing" },
                { name: "تقليص الإيجابيات الكاذبة: Tuning المحكم", primary: "IDS/IPS tuning methodology" },
                { name: "Network Behavior Analysis لـIPS", primary: "Behavioral IPS signatures" },
                { name: "IPS Bypass Techniques: التحايل الكلاسيكي", primary: "IPS evasion techniques" },
                { name: "طبقات الدفاع: IPS مع NGFW وEDR", primary: "Defense in depth with IPS" },
                { name: "نشر IDS/IPS في بيئة موزعة", primary: "Distributed IDS deployment" },
                { name: "اختبار فعالية IDS/IPS بـAtomic Red Team", primary: "IDS effectiveness testing" }
              ]
            },
            {
              unit_index: 8, code: "2.7.8",
              name: "Network Segmentation المتقدم",
              goal: "تصميم وتطبيق تقسيم شبكي محكم يحدّ من حركة المهاجم",
              key_concepts: ["DMZ Design","VLAN Isolation","East-West Traffic","Micro-segmentation","SDN Security"],
              lessons: [
                { name: "مبادئ تقسيم الشبكة الدفاعي", primary: "Network segmentation defense principles" },
                { name: "DMZ Architecture المتقدمة: طبقات متعددة", primary: "Multi-tier DMZ design" },
                { name: "VLAN وانتقال الحزم بين الطبقات", primary: "VLAN security and inter-VLAN routing" },
                { name: "East-West Traffic: الحركة الداخلية الخطرة", primary: "East-west traffic monitoring" },
                { name: "Microsegmentation بـVMware NSX وCisco ACI", primary: "Software-defined microsegmentation" },
                { name: "تصميم شبكة لمنع Lateral Movement", primary: "Anti-lateral-movement network design" },
                { name: "SDN Security: فرص وتحديات", primary: "Software-defined networking security" },
                { name: "Zero Trust Network Segmentation", primary: "Zero trust-based segmentation" },
                { name: "اختبار فعالية التقسيم الشبكي", primary: "Network segmentation testing" }
              ]
            },
            {
              unit_index: 9, code: "2.7.9",
              name: "Email Security المتقدم",
              goal: "بناء دفاع متكامل لأمن البريد الإلكتروني ضد التصيّد والانتحال وBEC",
              key_concepts: ["SPF/DKIM/DMARC","Email Gateway","BEC Prevention","Phishing Defense","Header Analysis"],
              lessons: [
                { name: "SPF وDKIM وDMARC: الثالوث المقدس لأمن البريد", primary: "SPF, DKIM, DMARC implementation" },
                { name: "Email Security Gateway: Mimecast وProofpoint", primary: "Email security gateway products" },
                { name: "Business Email Compromise BEC: تكتيكات وحماية", primary: "BEC attack prevention" },
                { name: "تحليل Header البريد الإلكتروني جنائياً", primary: "Email header forensic analysis" },
                { name: "Anti-Phishing Technology: الكشف والحجب", primary: "Anti-phishing technology layers" },
                { name: "Email Encryption: S/MIME وTLS", primary: "Email transport and content encryption" },
                { name: "Email DLP: منع تسرب البيانات", primary: "Email data loss prevention" },
                { name: "Phishing Simulation مؤسسي للتدريب", primary: "Enterprise phishing simulation program" },
                { name: "قياس فعالية منظومة أمن البريد", primary: "Email security effectiveness metrics" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 3,
      name: "الأمن السيبراني المتقدم والقيادة",
      goal: "قيادة عمليات Red Team المتقدمة واستخبارات التهديدات والبحث الأمني وبناء برامج الأمن المؤسسية",
      bloom_focus: "create",
      exam: { pass_threshold_percent: 70, time_limit_minutes: 120 },
      stages: [
        {
          stage_index: 1,
          name: "Red Team Operations المتقدمة",
          goal: "تخطيط وتنفيذ عمليات Red Team واسعة النطاق تحاكي التهديدات الحقيقية",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 35 },
          units: [
            {
              unit_index: 1, code: "3.1.1",
              name: "Red Team vs Penetration Test: الفلسفة",
              goal: "فهم الفارق الجوهري بين Red Team وPentest وبناء عملية Red Team نظامية",
              key_concepts: ["Red Team Objectives","Assumed Breach","Adversary Emulation","TIBER-EU","Exercise Types"],
              lessons: [
                { name: "Red Team: محاكاة المهاجم الحقيقي", primary: "Red team adversary emulation" },
                { name: "Assumed Breach: افتراض الاختراق كبداية", primary: "Assumed breach starting point" },
                { name: "TIBER-EU: الإطار الأوروبي لـRed Team المالي", primary: "TIBER-EU red team framework" },
                { name: "Full Scope vs Partial Red Team", primary: "Red team scope variations" },
                { name: "Threat Intelligence-Led Red Teaming", primary: "TI-led adversary simulation" },
                { name: "Blue Team دون علم: تدريب حقيقي", primary: "Blind red team exercises" },
                { name: "Purple Team: التعاون لتحسين الدفاع", primary: "Purple team collaboration" },
                { name: "تقرير Red Team: أكثر من مجرد ثغرات", primary: "Red team report beyond vulnerabilities" },
                { name: "معايير أخلاقيات Red Team", primary: "Red team ethics and rules" }
              ]
            },
            {
              unit_index: 2, code: "3.1.2",
              name: "C2 Frameworks المتقدمة: Cobalt Strike وSliver",
              goal: "استخدام وبناء بنية تحتية C2 متقدمة تحاكي مهاجمي APT",
              key_concepts: ["Cobalt Strike Profiles","Malleable C2","Sliver Framework","C2 Redirectors","OPSEC"],
              lessons: [
                { name: "Cobalt Strike: المعيار الصناعي لـRed Team", primary: "Cobalt Strike architecture" },
                { name: "Malleable C2 Profiles: محاكاة حركة أي برنامج", primary: "Malleable C2 profile customization" },
                { name: "Sliver: البديل مفتوح المصدر الحديث", primary: "Sliver C2 framework" },
                { name: "Brute Ratel C4: البديل المتجنّب للـEDR", primary: "Brute Ratel C4 framework" },
                { name: "Redirectors: إخفاء بنية C2 الحقيقية", primary: "C2 redirector setup" },
                { name: "Domain Fronting لإخفاء C2", primary: "Domain fronting C2 evasion" },
                { name: "HTTPS C2 بشهادات حقيقية وجديرة بالثقة", primary: "Trusted certificate C2 infrastructure" },
                { name: "OPSEC في بنية C2: عدم الكشف", primary: "C2 OPSEC best practices" },
                { name: "Takedown: كيف تُكشف بنى C2 وتُغلق", primary: "C2 infrastructure takedown" }
              ]
            },
            {
              unit_index: 3, code: "3.1.3",
              name: "Initial Access Techniques المتقدمة",
              goal: "إتقان تقنيات الوصول الأولي المتقدمة المستخدمة في هجمات APT",
              key_concepts: ["Spearphishing","Watering Hole","Supply Chain Compromise","0-day Weaponization","Initial Access Brokers"],
              lessons: [
                { name: "Spearphishing المتقدم: الصياغة والاستهداف", primary: "Advanced spearphishing techniques" },
                { name: "Watering Hole Attack: استهداف المجتمع", primary: "Watering hole attack methodology" },
                { name: "Supply Chain Compromise: SolarWinds وما أشبه", primary: "Supply chain attack vectors" },
                { name: "Drive-by Compromise وExploit Kits", primary: "Browser-based initial access" },
                { name: "Initial Access Brokers: سوق الدخول الأول", primary: "IAB ecosystem and risks" },
                { name: "Phishing Infrastructure Building", primary: "Phishing infrastructure setup" },
                { name: "HTML Smuggling للتحايل على Email Gateway", primary: "HTML smuggling technique" },
                { name: "USB Drop Attack وPhysical Social Engineering", primary: "Physical social engineering methods" },
                { name: "الاستجابة لتقنيات Initial Access من جانب الدفاع", primary: "Defending against initial access" }
              ]
            },
            {
              unit_index: 4, code: "3.1.4",
              name: "Defense Evasion المتقدمة",
              goal: "تطبيق تقنيات التحايل على EDR وAV والدفاعات الحديثة المتقدمة",
              key_concepts: ["Syscall Abuse","PPL Bypass","ETW Patching","APC Injection","Reflective Loading"],
              lessons: [
                { name: "Syscall المباشرة لتجاوز EDR Hooks", primary: "Direct syscall for EDR bypass" },
                { name: "PPL Bypass: التحايل على حماية العملية", primary: "Protected Process Light bypass" },
                { name: "ETW Patching: تعطيل تسجيل الأحداث", primary: "ETW patching for evasion" },
                { name: "APC Injection: الحقن عبر قائمة انتظار الـAPC", primary: "APC injection technique" },
                { name: "Reflective DLL Loading: تحميل DLL من الذاكرة", primary: "Reflective DLL loading" },
                { name: "Process Hollowing وProcess Doppelganging", primary: "Process hollowing and doppelganging" },
                { name: "Kernel Driver Exploitation لـEDR Bypass", primary: "Kernel driver for security tool bypass" },
                { name: "Anti-Forensics: محو آثار المهاجم", primary: "Anti-forensics and evidence erasure" },
                { name: "كيف يتطور الدفاع استجابةً للـEvasion", primary: "Detection engineering response to evasion" }
              ]
            },
            {
              unit_index: 5, code: "3.1.5",
              name: "Active Directory Red Team المتقدم",
              goal: "تنفيذ هجمات متقدمة على Active Directory بما يحاكي مهاجمي APT الحقيقيين",
              key_concepts: ["LAPS Abuse","GPO Abuse","ACL Persistence","Forest Compromise","Shadow Credentials"],
              lessons: [
                { name: "LAPS: الاستهداف والاستغلال", primary: "LAPS targeting and exploitation" },
                { name: "GPO Abuse: التحكم بكل مستخدم في النطاق", primary: "GPO abuse for domain control" },
                { name: "ACL Persistence: الثبات عبر قوائم التحكم", primary: "ACL-based AD persistence" },
                { name: "Shadow Credentials: بديل Mimikatz الجديد", primary: "Shadow credentials attack" },
                { name: "Certificate Abuse (ESC1-ESC8): كل الطرق", primary: "AD CS ESC vulnerability classes" },
                { name: "Forest Takeover: من Domain إلى الغابة كلها", primary: "Cross-forest compromise" },
                { name: "Azure AD Connect Abuse", primary: "Azure AD Connect exploitation" },
                { name: "الثبات المتقدم: AdminSDHolder وSDProp", primary: "AdminSDHolder persistence technique" },
                { name: "محاكاة APT كاملة على AD في المختبر", primary: "Full APT simulation on Active Directory" }
              ]
            },
            {
              unit_index: 6, code: "3.1.6",
              name: "Data Exfiltration وتقنياته",
              goal: "فهم تقنيات سرقة البيانات المتقدمة وكيف تُكشف وتُمنع",
              key_concepts: ["Exfil Channels","DNS Exfil","HTTPS Exfil","Cloud Storage Exfil","DLP Bypass"],
              lessons: [
                { name: "قنوات Exfiltration: الكلاسيكية والمبتكرة", primary: "Data exfiltration channel overview" },
                { name: "DNS Exfiltration: نقل البيانات خرفة خرفة", primary: "DNS-based data exfiltration" },
                { name: "HTTPS Exfiltration للـC2 المقنّع", primary: "HTTPS covert data exfiltration" },
                { name: "رفع البيانات إلى Cloud Storage المشروع", primary: "Cloud storage exfiltration" },
                { name: "Steganography: إخفاء البيانات في الصور", primary: "Steganography for data hiding" },
                { name: "DLP Bypass: التحايل على أنظمة منع التسرب", primary: "DLP bypass techniques" },
                { name: "Time-based Exfiltration: البطء يُحقق الخفاء", primary: "Low-and-slow exfiltration" },
                { name: "كشف Exfiltration في SIEM وNTA", primary: "Exfiltration detection techniques" },
                { name: "خطط الاستجابة لحوادث تسرب البيانات", primary: "Data exfiltration incident response" }
              ]
            },
            {
              unit_index: 7, code: "3.1.7",
              name: "Physical Security Assessments",
              goal: "إجراء تقييمات الأمن المادي كجزء من تقييم الأمن الشامل",
              key_concepts: ["Physical Penetration Test","Lock Picking","Badge Cloning","Tailgating","Insider Threat"],
              lessons: [
                { name: "الأمن المادي كجزء من سطح الهجوم", primary: "Physical security as attack surface" },
                { name: "اختبار الأقفال: Lock Picking والأنواع", primary: "Lock picking techniques and types" },
                { name: "Badge Cloning وRFID Attacks", primary: "Access card cloning attacks" },
                { name: "Tailgating وPiggybacking: الدخول بالمرافقة", primary: "Tailgating physical intrusion" },
                { name: "USB Drop وPhysical Implants", primary: "Physical device implantation" },
                { name: "Insider Threat: خطر من الداخل", primary: "Insider threat assessment" },
                { name: "Social Engineering المادي في الشركات", primary: "Physical social engineering" },
                { name: "تقرير اختبار الأمن المادي", primary: "Physical security assessment report" },
                { name: "منظومة الأمن المادي الدفاعية", primary: "Physical security defense layers" }
              ]
            },
            {
              unit_index: 8, code: "3.1.8",
              name: "Adversary Emulation والمحاكاة",
              goal: "تطبيق محاكاة التهديدات الحقيقية بناءً على مجموعات APT موثّقة",
              key_concepts: ["Adversary Emulation Plans","CTID Emulation","ATT&CK Emulation","CALDERA","Atomic Red Team"],
              lessons: [
                { name: "Adversary Emulation: محاكاة دقيقة للعدو الحقيقي", primary: "Adversary emulation methodology" },
                { name: "CTID Emulation Plans للمجموعات الكبرى", primary: "CTID adversary emulation plans" },
                { name: "MITRE CALDERA: أتمتة المحاكاة", primary: "CALDERA automated adversary simulation" },
                { name: "Atomic Red Team: وحدات هجوم صغيرة دقيقة", primary: "Atomic Red Team tests" },
                { name: "محاكاة APT29 Cozy Bear بالكامل", primary: "APT29 emulation exercise" },
                { name: "Purple Team Exercise من تخطيط لتنفيذ", primary: "Full purple team exercise planning" },
                { name: "قياس نتائج المحاكاة وتحسين الدفاع", primary: "Emulation results and defense improvement" },
                { name: "Threat-Informed Defense: المنهج الكامل", primary: "Threat-informed defense methodology" },
                { name: "نشر نتائج Purple Team للفريق التقني", primary: "Purple team results communication" }
              ]
            },
            {
              unit_index: 9, code: "3.1.9",
              name: "Red Team Program: بناء فريق متكامل",
              goal: "تأسيس وإدارة برنامج Red Team مؤسسي مستدام",
              key_concepts: ["Red Team Charter","Staffing","Tool Budget","Program Maturity","Metrics"],
              lessons: [
                { name: "Red Team Charter: التفويض والحدود", primary: "Red team charter and authorization" },
                { name: "تجنيد Red Team: المهارات والشخصيات", primary: "Red team staffing and skills" },
                { name: "الأدوات والبنية التحتية: الميزانية والاختيار", primary: "Red team tool budget and selection" },
                { name: "نضج برنامج Red Team: المراحل والتطور", primary: "Red team program maturity levels" },
                { name: "مؤشرات أداء Red Team الفعّالة", primary: "Red team performance metrics" },
                { name: "الإبلاغ للقيادة: ترجمة النتائج التقنية", primary: "Red team executive reporting" },
                { name: "التكامل مع برنامج Vulnerability Management", primary: "Red team and vulnerability management integration" },
                { name: "حالات Red Team Enterprise من الواقع", primary: "Enterprise red team case studies" },
                { name: "مستقبل Red Team: AI وأتمتة", primary: "Future of red teaming with AI" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "Blue Team المتقدم والدفاع النشط",
          goal: "بناء دفاع متقدم يجمع Zero Trust وDeception وUEBA والتحليل السلوكي المتقدم",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 35 },
          units: [
            {
              unit_index: 1, code: "3.2.1",
              name: "Active Defense وDeception Technology",
              goal: "نشر تقنيات الخداع الإلكتروني لاكتشاف المهاجمين وإبطاء تقدمهم",
              key_concepts: ["Honeypots","Honeytokens","Canary Tokens","Deception Grid","Threat Deception"],
              lessons: [
                { name: "Active Defense: الدفاع النشط والمشروع", primary: "Active defense concepts and legality" },
                { name: "Honeypots: الفخاخ عالية التفاعل ومنخفضتها", primary: "Honeypot types and deployment" },
                { name: "Honeytokens: بيانات مزيفة كالشَّرَك", primary: "Honeytoken deployment strategies" },
                { name: "Canarytokens: التطبيق العملي المجاني", primary: "Canary tokens practical deployment" },
                { name: "Deception Grid: شبكة خداع متكاملة", primary: "Deception grid architecture" },
                { name: "Active Directory Decoys: حسابات وأجهزة مزيفة", primary: "AD decoy objects for deception" },
                { name: "قياس ROI لتقنية الخداع", primary: "Deception technology ROI measurement" },
                { name: "Attacker-facing Intelligence من الـHoneypots", primary: "TI collection from honeypots" },
                { name: "حالات حقيقية: كيف كشف الخداع المهاجمين", primary: "Deception technology case studies" }
              ]
            },
            {
              unit_index: 2, code: "3.2.2",
              name: "UEBA: تحليل سلوك المستخدمين والكيانات",
              goal: "نشر وإدارة نظام UEBA لكشف السلوك الشاذ وسرقة الهوية المتقدمة",
              key_concepts: ["Behavioral Baseline","Peer Grouping","Risk Scoring","Insider Threat Detection","Exfiltration Detection"],
              lessons: [
                { name: "UEBA: مبادئ الكشف القائم على السلوك", primary: "UEBA behavioral detection principles" },
                { name: "Behavioral Baseline: ما هو سلوك المستخدم الطبيعي", primary: "User behavioral baseline building" },
                { name: "Peer Group Analysis: مقارنة المستخدم بنظرائه", primary: "Peer group behavioral analysis" },
                { name: "Risk Scoring Algorithms: الأوزان والنماذج", primary: "UEBA risk scoring models" },
                { name: "Insider Threat Detection بـUEBA", primary: "Insider threat detection patterns" },
                { name: "Compromised Account Detection بـUEBA", primary: "Account takeover detection via UEBA" },
                { name: "Exfiltration Pattern Detection", primary: "Data exfiltration behavioral detection" },
                { name: "Splunk UBA وExabeam وVectra AI", primary: "UEBA platform comparison" },
                { name: "قياس دقة UEBA وتقليص الإيجابيات", primary: "UEBA accuracy tuning" }
              ]
            },
            {
              unit_index: 3, code: "3.2.3",
              name: "تقوية Active Directory المتقدمة",
              goal: "تطبيق أعلى مستويات تقوية Active Directory المعتمدة من Microsoft وNSA",
              key_concepts: ["AD Tiering","Credential Guard","Protected Users","PAW","Privileged Access Workstation"],
              lessons: [
                { name: "Microsoft AD Tiering Model: الفلسفة والتطبيق", primary: "AD administrative tiering" },
                { name: "Credential Guard: حماية الهاش في الذاكرة", primary: "Windows Credential Guard" },
                { name: "Protected Users Group: حماية إضافية للمميزين", primary: "Protected Users security group" },
                { name: "Privileged Access Workstation PAW: نهائية", primary: "PAW implementation guide" },
                { name: "Microsoft ESAE / Red Forest Architecture", primary: "ESAE enhanced security architecture" },
                { name: "إزالة NTLM وتقليص استخدامه", primary: "NTLM removal strategy" },
                { name: "SMB Signing ورفض LLMNR وNBT-NS", primary: "Network protocol security controls" },
                { name: "Windows Defender Credential Guard وDevice Guard", primary: "Windows security features" },
                { name: "قياس تقوية AD وتتبع التراجع", primary: "AD hardening measurement and drift detection" }
              ]
            },
            {
              unit_index: 4, code: "3.2.4",
              name: "Endpoint Hardening المتقدم",
              goal: "تطبيق أقصى درجات تقسية نقاط النهاية في بيئات مؤسسية",
              key_concepts: ["Attack Surface Reduction","Application Control","WDAC","Exploit Protection","AV Hardening"],
              lessons: [
                { name: "Attack Surface Reduction Rules في Defender", primary: "Windows Defender ASR rules" },
                { name: "Application Control: AppLocker وWDAC", primary: "Windows application control" },
                { name: "Windows Defender Application Control WDAC", primary: "WDAC policy creation" },
                { name: "Exploit Protection: SEHOP وCFG وCIG", primary: "Windows exploit protection features" },
                { name: "Memory Integrity (HVCI) في الأنظمة الحديثة", primary: "Hypervisor-protected code integrity" },
                { name: "Script-based Attack Prevention", primary: "Script-based attack mitigation" },
                { name: "Sysmon Hardening للتسجيل المثالي", primary: "Sysmon optimal configuration" },
                { name: "CIS Benchmark Level 2 للـWindows", primary: "CIS Level 2 Windows hardening" },
                { name: "تقوية Linux Server للبيئة المؤسسية", primary: "Enterprise Linux server hardening" }
              ]
            },
            {
              unit_index: 5, code: "3.2.5",
              name: "Security Operations Automation المتقدم",
              goal: "بناء منظومة أتمتة أمنية متقدمة تخفض التعب التشغيلي وتُسرّع الاستجابة",
              key_concepts: ["Ansible Security","Python Automation","API Integration","Automated Remediation","AI Triage"],
              lessons: [
                { name: "Ansible للأمن: أتمتة Hardening وإدارة التغيير", primary: "Ansible security automation" },
                { name: "Python Security Automation: بناء Tooling خاص", primary: "Python security tool development" },
                { name: "API Integration: ربط أدوات SOC برمجياً", primary: "Security tool API integration" },
                { name: "Automated Remediation: الإصلاح بلا تدخل", primary: "Automated security remediation" },
                { name: "AI في فرز التنبيهات: تجربة OpenAI وغيرها", primary: "AI-assisted alert triage" },
                { name: "بناء Security Data Lake", primary: "Security data lake architecture" },
                { name: "Workflow Automation: Tines وN8N للأمن", primary: "No-code security workflow automation" },
                { name: "SOAR Advanced: بناء Playbooks معقدة", primary: "Advanced SOAR playbook development" },
                { name: "قياس عائد الاستثمار في أتمتة SOC", primary: "SOC automation ROI measurement" }
              ]
            },
            {
              unit_index: 6, code: "3.2.6",
              name: "Cloud Security Architecture المتقدمة",
              goal: "تصميم معمارية أمان سحابية متكاملة للبيئات الهجينة والمتعددة",
              key_concepts: ["Cloud Security Reference Architecture","CNAPP","Data Security Posture","Cloud Workload Protection","Identity in Cloud"],
              lessons: [
                { name: "Cloud Security Reference Architecture لكل مزوّد", primary: "Cloud security reference architectures" },
                { name: "CNAPP: دمج CSPM وCWPP وCIEM", primary: "CNAPP unified cloud security" },
                { name: "Data Security Posture Management DSPM", primary: "DSPM data-centric cloud security" },
                { name: "Cloud Workload Protection Platform CWPP", primary: "CWPP capabilities and deployment" },
                { name: "Cloud Infrastructure Entitlement Management CIEM", primary: "CIEM for cloud permissions" },
                { name: "Network Detection في السحابة بدون Agent", primary: "Agentless cloud network detection" },
                { name: "Security for Serverless at Scale", primary: "Serverless security at enterprise scale" },
                { name: "Multi-Cloud Security Architecture", primary: "Consistent multi-cloud security" },
                { name: "التعريف المستمر للأصول السحابية CAASM", primary: "CAASM asset attack surface management" }
              ]
            },
            {
              unit_index: 7, code: "3.2.7",
              name: "Vulnerability Management Program المتقدم",
              goal: "بناء وإدارة برنامج إدارة ثغرات مؤسسي متكامل ومقيس",
              key_concepts: ["Risk-Based VM","SLA Management","Patch Orchestration","CVSS Contextualization","VM Metrics"],
              lessons: [
                { name: "Risk-Based Vulnerability Management", primary: "Risk-based VM vs CVSS-only approach" },
                { name: "Asset Criticality في ترتيب الثغرات", primary: "Asset criticality in vulnerability prioritization" },
                { name: "SLA Management في برنامج الثغرات", primary: "Vulnerability SLA tracking" },
                { name: "Exploit Prediction Scoring EPSS", primary: "EPSS for exploitation likelihood" },
                { name: "CVSS Contextualization: السياق أهم من الرقم", primary: "Contextual CVSS scoring" },
                { name: "Patch Orchestration عبر الـOrgs الكبيرة", primary: "Enterprise patch orchestration" },
                { name: "Exception Handling ووثائق القبول", primary: "Vulnerability exception management" },
                { name: "VM Metrics وBoard-Level Reporting", primary: "Vulnerability management reporting" },
                { name: "Attack Surface Management ASM", primary: "External attack surface management" }
              ]
            },
            {
              unit_index: 8, code: "3.2.8",
              name: "Security Architecture Review المتقدم",
              goal: "إجراء مراجعات معمارية أمنية عميقة للأنظمة المعقدة",
              key_concepts: ["Architecture Security Review","SABSA","TOGAF Security","Attack Trees","Security Patterns"],
              lessons: [
                { name: "SABSA: إطار معمارية الأمن الشامل", primary: "SABSA security architecture framework" },
                { name: "TOGAF Security Architecture Domain", primary: "TOGAF security considerations" },
                { name: "Attack Trees: نمذجة هجومية للمعمارية", primary: "Attack tree modeling" },
                { name: "مراجعة معمارية الخدمات المصغّرة", primary: "Microservices security architecture review" },
                { name: "مراجعة معمارية API Management", primary: "API management security review" },
                { name: "Data Architecture Security Review", primary: "Data layer security review" },
                { name: "مراجعة معمارية ML وAI Systems", primary: "ML/AI security architecture review" },
                { name: "Security Patterns المعتمدة والمكتبة", primary: "Reusable security patterns library" },
                { name: "توثيق قرارات الأمن للأجيال القادمة", primary: "Security decision documentation" }
              ]
            },
            {
              unit_index: 9, code: "3.2.9",
              name: "Resilience Engineering والتعافي",
              goal: "بناء منظومة مرونة سيبرانية تمكّن المؤسسة من الاستمرار رغم الاختراق",
              key_concepts: ["Cyber Resilience","Incident Recovery","Assume Breach Mindset","Resilience Testing","Business Continuity Cyber"],
              lessons: [
                { name: "Cyber Resilience: أبعد من الأمن التقليدي", primary: "Cyber resilience vs cybersecurity" },
                { name: "Assume Breach: تصميم البنية للاختراق", primary: "Assume breach architecture design" },
                { name: "Segment and Limit Blast Radius", primary: "Blast radius limitation strategy" },
                { name: "Rapid Detection وتقليص MTTD", primary: "Rapid detection capability building" },
                { name: "Business Continuity Cyber-Specific Plans", primary: "Cyber-specific BCP development" },
                { name: "Recovery Testing: التعافي الحقيقي لا النظري", primary: "Recovery capability testing" },
                { name: "Communication Templates للأزمات السيبرانية", primary: "Crisis communication playbooks" },
                { name: "قياس المرونة السيبرانية: مؤشرات", primary: "Cyber resilience metrics" },
                { name: "Cyber Insurance وعلاقتها بالمرونة", primary: "Cyber insurance and resilience" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "استخبارات التهديدات السيبرانية",
          goal: "بناء وتشغيل برنامج استخبارات تهديدات كامل من جمع البيانات إلى التأثير التشغيلي",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 35 },
          units: [
            {
              unit_index: 1, code: "3.3.1",
              name: "دورة حياة Threat Intelligence",
              goal: "تطبيق دورة حياة TI كاملة من متطلبات الاستخبارات إلى الإجراءات",
              key_concepts: ["Intelligence Requirements","Collection","Processing","Analysis","Dissemination"],
              lessons: [
                { name: "دورة الاستخبارات: IRs إلى التوصيات", primary: "Intelligence cycle from IRs to action" },
                { name: "PIRs: تحديد أولويات الاستخبارات", primary: "Priority intelligence requirements" },
                { name: "مصادر الجمع: تقنية وبشرية", primary: "Intelligence collection sources" },
                { name: "Processing وNormalization للبيانات الخام", primary: "Raw intelligence processing" },
                { name: "Analysis: من البيانات إلى الفهم", primary: "Intelligence analysis methodology" },
                { name: "Finished Intelligence: التقرير المكتمل", primary: "Finished intelligence products" },
                { name: "RFI: طلبات الاستخبارات من الفريق", primary: "Request for information handling" },
                { name: "قياس جودة وتأثير TI", primary: "TI quality and impact measurement" },
                { name: "بناء TI Team: المهارات والأدوار", primary: "TI team building and skills" }
              ]
            },
            {
              unit_index: 2, code: "3.3.2",
              name: "تحليل جهات التهديد APT",
              goal: "إجراء تحليل عميق لمجموعات APT الرئيسية وتكتيكاتها",
              key_concepts: ["APT Classification","Nation-State Actors","Financial Groups","Hacktivists","Attribution"],
              lessons: [
                { name: "تصنيف جهات التهديد: الدوافع والقدرات", primary: "Threat actor classification and motivation" },
                { name: "APT الصيني: المجموعات والاستهداف", primary: "Chinese APT groups analysis" },
                { name: "APT الروسي: Cozy Bear وFancy Bear وغيرهم", primary: "Russian APT groups analysis" },
                { name: "APT الكوري الشمالي: Lazarus وBluenoroff", primary: "DPRK APT groups analysis" },
                { name: "مجموعات الجريمة المنظمة الإلكترونية", primary: "Cybercriminal organization analysis" },
                { name: "Hacktivism والمجموعات الآيديولوجية", primary: "Hacktivist group analysis" },
                { name: "تحليل TTP لمجموعة بعينها بعمق", primary: "Deep dive TTP analysis" },
                { name: "نسب الهجوم: الأدوات والحدود", primary: "Attribution tools and limitations" },
                { name: "تقرير Threat Actor Profile احترافي", primary: "Threat actor profile report" }
              ]
            },
            {
              unit_index: 3, code: "3.3.3",
              name: "MISP وتبادل Threat Intelligence",
              goal: "نشر وإدارة MISP لتبادل TI والتكامل مع أدوات الأمن",
              key_concepts: ["MISP Events","Taxonomies","Galaxies","Feeds","API Integration"],
              lessons: [
                { name: "MISP Architecture: الهيكل والمكونات", primary: "MISP platform architecture" },
                { name: "Events وAttributes: هيكل البيانات في MISP", primary: "MISP data model" },
                { name: "Taxonomies وTags: تصنيف منهجي", primary: "MISP taxonomies and tagging" },
                { name: "MISP Galaxies: جهات التهديد والـAttack Patterns", primary: "MISP galaxies usage" },
                { name: "Feeds: استيراد وتصدير TI خارجية", primary: "MISP feed management" },
                { name: "MISP API: التكامل مع SIEM وSOAR", primary: "MISP API integration" },
                { name: "مجتمعات MISP: التشارك بالقطاعات", primary: "MISP sharing communities" },
                { name: "OpenCTI: البديل المنظّم لـMISP", primary: "OpenCTI vs MISP comparison" },
                { name: "بناء عملية TI Sharing مؤسسية", primary: "Institutional TI sharing program" }
              ]
            },
            {
              unit_index: 4, code: "3.3.4",
              name: "استخبارات الـDark Web",
              goal: "جمع وتحليل المعلومات من شبكات Tor والمنتديات السرية بشكل قانوني",
              key_concepts: ["Tor Network","Dark Web Monitoring","Criminal Forums","Data Leak Sites","OSINT Dark Web"],
              lessons: [
                { name: "Dark Web وDeep Web: الفارق والمخاطر", primary: "Dark web vs deep web distinction" },
                { name: "Tor Network: البنية والأمن", primary: "Tor network and operational security" },
                { name: "Dark Web Monitoring: الأدوات التجارية", primary: "Dark web monitoring services" },
                { name: "مراقبة مواقع تسريب Ransomware", primary: "Ransomware leak site monitoring" },
                { name: "منتديات الجريمة الإلكترونية ومراقبتها", primary: "Criminal forum intelligence" },
                { name: "OSINT على Dark Web: الإجراءات والأخلاقيات", primary: "Dark web OSINT methodology" },
                { name: "Credential Leak Monitoring للمؤسسة", primary: "Enterprise credential leak monitoring" },
                { name: "بناء تقرير Dark Web Intelligence", primary: "Dark web intelligence report" },
                { name: "القانوني والمحظور في جمع Dark Web TI", primary: "Legal boundaries in dark web collection" }
              ]
            },
            {
              unit_index: 5, code: "3.3.5",
              name: "بناء بنية تحتية تهديد للمهاجم",
              goal: "تحليل وتفكيك البنية التحتية للمهاجم لتشويشها أو الكشف المبكر",
              key_concepts: ["Infrastructure Analysis","Passive DNS","WHOIS History","ASN Tracking","Bullet-Proof Hosting"],
              lessons: [
                { name: "تحليل بنية تحتية المهاجم: المنهجية", primary: "Attacker infrastructure analysis" },
                { name: "Passive DNS: تتبع النطاقات عبر الزمن", primary: "Passive DNS for infrastructure tracking" },
                { name: "WHOIS History وتاريخ تسجيل النطاقات", primary: "WHOIS history analysis" },
                { name: "ASN Tracking: مراقبة مزودي الخدمة الخبيثين", primary: "Malicious ASN tracking" },
                { name: "Bullet-Proof Hosting: الخوادم المحصّنة", primary: "Bullet-proof hosting ecosystem" },
                { name: "Certificate Analysis للبنية التحتية", primary: "TLS certificate analysis for attribution" },
                { name: "تفكيك البنية التحتية وتعقّب الفاعل", primary: "Infrastructure takedown methodology" },
                { name: "Diamond Model للتحليل البنيوي", primary: "Diamond model infrastructure analysis" },
                { name: "أتمتة تحليل البنية التحتية", primary: "Automated infrastructure analysis" }
              ]
            },
            {
              unit_index: 6, code: "3.3.6",
              name: "Strategic Threat Intelligence",
              goal: "إنتاج تقارير استخبارات استراتيجية لدعم قرارات القيادة التنفيذية",
              key_concepts: ["Strategic Intelligence","Trend Analysis","Geopolitical Context","Industry Threat Reports","Board Reporting"],
              lessons: [
                { name: "الاستخبارات الاستراتيجية: ما تعنيه للقيادة", primary: "Strategic intelligence for executives" },
                { name: "تحليل الاتجاهات وتوقع التهديدات", primary: "Threat trend analysis and forecasting" },
                { name: "السياق الجيوسياسي للتهديدات السيبرانية", primary: "Geopolitical context in cyber threats" },
                { name: "Threat Landscape للقطاع المالي والطاقة", primary: "Industry-specific threat landscape" },
                { name: "تقرير Board-Level TI: اللغة والمحتوى", primary: "Board-level TI report writing" },
                { name: "Vendor Intelligence Reports: القراءة النقدية", primary: "Critical reading of vendor intelligence" },
                { name: "بناء Annual Threat Report للمؤسسة", primary: "Annual organizational threat report" },
                { name: "مؤشرات الإنذار المبكر للتهديدات", primary: "Early warning indicators for threats" },
                { name: "CI Intelligence: ما هو سري وما يُشارك", primary: "Intelligence classification and sharing" }
              ]
            },
            {
              unit_index: 7, code: "3.3.7",
              name: "Malware Intelligence وتتبع العائلات",
              goal: "بناء منظومة تتبع عائلات البرمجيات الخبيثة لدعم عمليات الكشف",
              key_concepts: ["Malware Families","Clustering","Behavior Signatures","Code Similarity","Sandbox Intelligence"],
              lessons: [
                { name: "تصنيف عائلات البرمجيات الخبيثة: المنهجية", primary: "Malware family classification" },
                { name: "Clustering بالتشابه: أي Malware من أين", primary: "Malware clustering techniques" },
                { name: "Code Similarity Analysis: العلاقات الخفية", primary: "Code similarity for family tracking" },
                { name: "Behavior Signatures: ما يفعله لا ما يبدو عليه", primary: "Behavioral signatures for detection" },
                { name: "Sandbox Intelligence: تشغيل آلاف العينات", primary: "Large-scale sandbox analysis" },
                { name: "VirusTotal Graph وMalwoverview", primary: "Malware intelligence visualization tools" },
                { name: "تغذية Malware Intelligence في SIEM وEDR", primary: "Malware TI operationalization" },
                { name: "تقرير تحديث عائلة برمجيات خبيثة", primary: "Malware family update intelligence report" },
                { name: "بناء قاعدة بيانات Malware Intelligence داخلية", primary: "Internal malware intelligence database" }
              ]
            },
            {
              unit_index: 8, code: "3.3.8",
              name: "Tactical Intelligence وعمليات الاكتشاف",
              goal: "توظيف الاستخبارات التكتيكية مباشرةً في تحسين قدرات الكشف والاستجابة",
              key_concepts: ["IOC Lifecycle","TTP Operationalization","Hunt Development","Detection Rules from TI","TI-SOC Loop"],
              lessons: [
                { name: "IOC Lifecycle: من الجمع إلى الانتهاء", primary: "IOC lifecycle management" },
                { name: "تحويل TTPs إلى قواعد كشف", primary: "TTP to detection rule conversion" },
                { name: "TI-Driven Hunt: الصيد بناءً على استخبارات", primary: "TI-driven threat hunting" },
                { name: "IOC Enrichment: إثراء التنبيهات تلقائياً", primary: "Automated IOC enrichment" },
                { name: "TI Feedback Loop: التعلم من التشغيل", primary: "TI feedback loop from operations" },
                { name: "Real-Time Blocking من TI Feeds", primary: "Real-time blocking from threat feeds" },
                { name: "TI Scoring: أي IOC يستحق الاهتمام", primary: "IOC scoring and prioritization" },
                { name: "Case Study: TI أوقفت هجوماً فعلياً", primary: "TI preventing real attack case study" },
                { name: "دمج TI في SOC Workflow بالكامل", primary: "Full TI-SOC workflow integration" }
              ]
            },
            {
              unit_index: 9, code: "3.3.9",
              name: "TI Program Building وQuality",
              goal: "بناء وقياس وتحسين برنامج Threat Intelligence مؤسسي كامل",
              key_concepts: ["TI Program Maturity","Team Structure","Tool Stack","Metrics","Partnerships"],
              lessons: [
                { name: "TI Program Maturity Model: المراحل", primary: "TI program maturity assessment" },
                { name: "TI Team Structure: الأدوار والمهارات", primary: "TI team building and roles" },
                { name: "TI Tool Stack: الاختيار والتكامل", primary: "TI tooling selection" },
                { name: "TI Metrics: قياس التأثير الحقيقي", primary: "TI program metrics" },
                { name: "ISAC وشراكات تبادل TI القطاعية", primary: "ISAC and sector TI sharing" },
                { name: "الشراكة مع الحكومة وFBI وCISA", primary: "Government TI partnerships" },
                { name: "TI برنامج بالميزانية المحدودة: الأولويات", primary: "Budget-constrained TI program" },
                { name: "أتمتة TI: تقليص العمل اليدوي", primary: "TI automation and workflow" },
                { name: "مستقبل TI: AI وAutomated Analysis", primary: "Future of threat intelligence" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "أمن الأجهزة والأنظمة المدمجة والـIoT",
          goal: "تحليل وتقييم أمان الأجهزة المادية والأنظمة المدمجة والـFirmware",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 35 },
          units: [
            {
              unit_index: 1, code: "3.4.1",
              name: "أمن IoT: التحديات والمنهجيات",
              goal: "فهم سطح هجوم IoT وتطبيق منهجية اختبار شاملة للأجهزة المتصلة",
              key_concepts: ["IoT Attack Surface","OWASP IoT Top 10","Firmware Extraction","RF Protocols","IoT Pen Test"],
              lessons: [
                { name: "OWASP IoT Top 10: أبرز مخاطر الأجهزة", primary: "OWASP IoT Top 10 vulnerabilities" },
                { name: "سطح هجوم IoT: من الجهاز للسحابة", primary: "IoT attack surface mapping" },
                { name: "استخراج Firmware: الطرق والتحديات", primary: "Firmware extraction methods" },
                { name: "Binwalk وFirmwalker: تحليل Firmware", primary: "Firmware analysis with Binwalk" },
                { name: "بروتوكولات IoT: MQTT وCoAP وZigbee", primary: "IoT protocol security analysis" },
                { name: "Physical Interfaces: UART وJTAG وI2C وSPI", primary: "Hardware debug interfaces" },
                { name: "Hardcoded Credentials: الكلمات المدمجة", primary: "Hardcoded credential extraction" },
                { name: "اختبار اختراق IoT منهجياً", primary: "IoT penetration testing methodology" },
                { name: "تأمين IoT في المؤسسات والمنازل", primary: "Enterprise and home IoT security" }
              ]
            },
            {
              unit_index: 2, code: "3.4.2",
              name: "Firmware Analysis وHardware Hacking",
              goal: "إجراء تحليل عميق للـFirmware وهجمات على الأجهزة المادية",
              key_concepts: ["Firmware Unpacking","Filesystem Analysis","Shell Access","Emulation","Vulnerability Discovery"],
              lessons: [
                { name: "استخراج Filesystem من Firmware", primary: "Firmware filesystem extraction" },
                { name: "تحليل ثابت للـFirmware: البحث عن الكنوز", primary: "Static firmware analysis" },
                { name: "مضاهاة Firmware بـQEMU للتحليل", primary: "QEMU firmware emulation" },
                { name: "UART Shell: دخول المسؤول بسلك واحد", primary: "UART console access" },
                { name: "JTAG: التصحيح عند مستوى الشريحة", primary: "JTAG debugging interface" },
                { name: "Hardcoded Keys وCertificates في الذاكرة", primary: "Hardcoded secrets in firmware" },
                { name: "Buffer Overflows في Embedded C", primary: "Embedded C buffer overflow exploitation" },
                { name: "Bootloader Security وSecure Boot للـIoT", primary: "IoT bootloader security" },
                { name: "تقرير اختبار Firmware احترافي", primary: "Firmware security assessment report" }
              ]
            },
            {
              unit_index: 3, code: "3.4.3",
              name: "RF Security: Bluetooth وZigbee وLTE",
              goal: "اختبار أمان بروتوколات الراديو اللاسلكي القصيرة والمتوسطة المدى",
              key_concepts: ["Bluetooth Attacks","Zigbee Sniffing","SDR","LTE Security","RF Pentesting"],
              lessons: [
                { name: "Bluetooth Security: BLE وBluetooth Classic", primary: "Bluetooth attack vectors" },
                { name: "Bluesnarfing وBluejacking وBLURtooth", primary: "Bluetooth attack types" },
                { name: "Zigbee: بروتوكول المنازل الذكية وثغراته", primary: "Zigbee security vulnerabilities" },
                { name: "Software Defined Radio SDR: فتح RF للجميع", primary: "SDR for RF security research" },
                { name: "RTL-SDR وHackRF للاستطلاع اللاسلكي", primary: "SDR hardware for security research" },
                { name: "Z-Wave وEnOcean: بروتوكولات أقل شهرة", primary: "Z-Wave and EnOcean security" },
                { name: "LTE وNB-IoT: أمن شبكات الجيل الرابع", primary: "LTE security for IoT" },
                { name: "IMSI Catcher وهجمات FakeGSM", primary: "IMSI catcher attacks" },
                { name: "حماية RF في المنشآت الحساسة", primary: "RF security in sensitive facilities" }
              ]
            },
            {
              unit_index: 4, code: "3.4.4",
              name: "Side-Channel Attacks والأجهزة المادية",
              goal: "فهم هجمات القنوات الجانبية وتطبيقها وحماية الأجهزة منها",
              key_concepts: ["Timing Attacks","Power Analysis","EM Side Channel","Fault Injection","Countermeasures"],
              lessons: [
                { name: "Side-Channel Attacks: الهجوم بالقياس لا الاختراق", primary: "Side-channel attack principles" },
                { name: "Timing Attacks على التشفير الحقيقي", primary: "Timing attack implementation" },
                { name: "Power Analysis: SPA وDPA", primary: "Simple and differential power analysis" },
                { name: "EM Side-Channel: التنصت بالكهرومغناطيسية", primary: "Electromagnetic side-channel attacks" },
                { name: "Fault Injection: إفساد الحسابات", primary: "Fault injection attacks" },
                { name: "Spectre وMeltdown: Side-Channel في CPU", primary: "CPU side-channel vulnerabilities" },
                { name: "Hardware Countermeasures: الدفاع في السيليكون", primary: "Hardware-level countermeasures" },
                { name: "ChipWhisperer: منصة Side-Channel التعليمية", primary: "ChipWhisperer for side-channel research" },
                { name: "تطبيق دفاعات Side-Channel في الكود", primary: "Software countermeasures for side-channels" }
              ]
            },
            {
              unit_index: 5, code: "3.4.5",
              name: "HSM وTPM وSecure Enclave",
              goal: "فهم وتوظيف وحدات الأمن الأجهزية في البنية التحتية الأمنية",
              key_concepts: ["HSM Architecture","TPM 2.0","SGX","Secure Element","Key Ceremony"],
              lessons: [
                { name: "HSM: الصندوق الحديدي للمفاتيح الحرجة", primary: "HSM architecture and use cases" },
                { name: "TPM 2.0: الشريحة الأمنية في كل جهاز", primary: "TPM 2.0 capabilities" },
                { name: "Secure Boot وTPM: التحقق من سلسلة التشغيل", primary: "Secure boot with TPM attestation" },
                { name: "Intel SGX: الحوسبة في بيئة معزولة", primary: "Intel SGX secure enclave" },
                { name: "ARM TrustZone: الأمن في معالجات ARM", primary: "ARM TrustZone secure world" },
                { name: "Secure Element في بطاقات الدفع والهواتف", primary: "Secure element in payment and mobile" },
                { name: "Key Ceremony: إجراءات توليد مفاتيح جذرية", primary: "Cryptographic key ceremony" },
                { name: "Cloud HSMs: AWS CloudHSM وAzure Managed HSM", primary: "Cloud HSM services" },
                { name: "FIPS 140-2 وFIPS 140-3: معايير التحقق", primary: "FIPS 140 certification levels" }
              ]
            },
            {
              unit_index: 6, code: "3.4.6",
              name: "Supply Chain Hardware Attacks",
              goal: "فهم هجمات سلسلة التوريد المادية ومنها البرمجية وبناء الحماية",
              key_concepts: ["Hardware Implants","Component Substitution","Counterfeit Hardware","SBOM","Supply Chain Risk"],
              lessons: [
                { name: "Hardware Implants: التلاعب في المصنع", primary: "Hardware implant attacks" },
                { name: "Bloomberg Chip Case: الإشاعات والحقائق", primary: "Hardware supply chain attack cases" },
                { name: "Counterfeit Components: قطع مزيفة في الإنتاج", primary: "Counterfeit hardware risks" },
                { name: "Software Bill of Materials SBOM", primary: "SBOM for supply chain visibility" },
                { name: "Trusted Platform Module للتحقق عند البدء", primary: "TPM for hardware verification" },
                { name: "SCRM: إدارة مخاطر سلسلة التوريد", primary: "Supply chain risk management" },
                { name: "Vendor Security Assessment للأجهزة", primary: "Hardware vendor security assessment" },
                { name: "XZ Utils وSolarWinds: دروس Supply Chain", primary: "Software supply chain attack case studies" },
                { name: "بناء برنامج Supply Chain Security", primary: "Supply chain security program" }
              ]
            },
            {
              unit_index: 7, code: "3.4.7",
              name: "SCADA وICS Security المتقدم",
              goal: "تطبيق ضوابط أمن متقدمة على أنظمة التحكم الصناعية والـSCADA",
              key_concepts: ["ICS Security Framework","Network Segmentation OT","Historian Security","ICS Monitoring","Incident Response OT"],
              lessons: [
                { name: "أطر ICS Security: NERC CIP وIEC 62443", primary: "ICS security standards" },
                { name: "تقسيم الشبكة في بيئات OT/IT", primary: "OT/IT network segmentation" },
                { name: "Historian Servers: الهدف الأكثر قيمة في ICS", primary: "Historian server security" },
                { name: "مراقبة بروتوكولات ICS: Modbus وDNP3", primary: "ICS protocol monitoring" },
                { name: "Remote Access الآمن لبيئات OT", primary: "Secure remote access for OT" },
                { name: "Passive Monitoring بدون تدخل في OT", primary: "Passive OT network monitoring" },
                { name: "الاستجابة للحوادث في بيئات ICS", primary: "ICS incident response" },
                { name: "Triton/TRISIS: هجوم السلامة الأكثر خطورة", primary: "TRITON malware case study" },
                { name: "بناء SOC متخصص لـOT", primary: "OT-specific SOC development" }
              ]
            },
            {
              unit_index: 8, code: "3.4.8",
              name: "البحث الأمني في الأجهزة المنزلية",
              goal: "إجراء بحث أمني على الأجهزة الذكية المنزلية ونشر النتائج مسؤولاً",
              key_concepts: ["Smart Home Research","Camera Vulnerabilities","Router Vulnerabilities","Disclosure","CVE Filing"],
              lessons: [
                { name: "منهجية البحث على الأجهزة المنزلية", primary: "Consumer device security research" },
                { name: "اختبار أمان كاميرات المراقبة IP", primary: "IP camera security testing" },
                { name: "اختبار أمان الراوترات المنزلية", primary: "Home router penetration testing" },
                { name: "Smart TV وAssistants: التجسس والأمن", primary: "Smart TV and assistant security" },
                { name: "التسجيل للـCVE وإجراءاته", primary: "CVE filing and assignment process" },
                { name: "Responsible Disclosure للشركات المصنّعة", primary: "Vendor responsible disclosure" },
                { name: "بناء Lab اختبار الأجهزة المنزلية", primary: "Consumer device testing lab setup" },
                { name: "نشر البحث: المؤتمرات والمدونات", primary: "Research publication for IoT findings" },
                { name: "من بحث الأجهزة إلى Bug Bounty IoT", primary: "IoT bug bounty programs" }
              ]
            },
            {
              unit_index: 9, code: "3.4.9",
              name: "Post-Quantum Cryptography والمستقبل",
              goal: "فهم تأثير الحوسبة الكمومية على الأمن والتحضير للانتقال",
              key_concepts: ["Quantum Computing Threat","NIST PQC Standards","CRYSTALS-Kyber","Harvest Now Decrypt Later","Migration Strategy"],
              lessons: [
                { name: "الحوسبة الكمومية: ما يعنيه للأمن", primary: "Quantum computing impact on cryptography" },
                { name: "Shor's Algorithm وكسر RSA/ECC", primary: "Shor's algorithm threat to public key crypto" },
                { name: "Grover's Algorithm وتأثيره على الهاش", primary: "Grover's algorithm on symmetric crypto" },
                { name: "NIST PQC Standards: المنتخبون الأربعة", primary: "NIST post-quantum standards" },
                { name: "CRYSTALS-Kyber: التشفير ما بعد الكم", primary: "Kyber key encapsulation" },
                { name: "CRYSTALS-Dilithium: التوقيع ما بعد الكم", primary: "Dilithium digital signatures" },
                { name: "Harvest Now Decrypt Later: الخطر الآني", primary: "Store now decrypt later attack" },
                { name: "خطة الانتقال لـPost-Quantum في المؤسسة", primary: "PQC migration planning" },
                { name: "Crypto Agility: التصميم للتغيير", primary: "Cryptographic agility design" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "البحث الأمني واكتشاف الثغرات",
          goal: "ممارسة البحث الأمني الأصيل من اكتشاف الثغرات إلى الإفصاح ونشر البحث",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 35 },
          units: [
            {
              unit_index: 1, code: "3.5.1",
              name: "منهجية البحث الأمني",
              goal: "اتباع منهجية بحث أمني صارمة تُنتج نتائج قابلة للتحقق والنشر",
              key_concepts: ["Research Methodology","Hypothesis Testing","Literature Review","Responsible Research","IRB/Ethics"],
              lessons: [
                { name: "البحث الأمني: الأنواع والمناهج", primary: "Security research types and methodologies" },
                { name: "فرضية البحث: صياغة دقيقة وقابلة للاختبار", primary: "Research hypothesis formulation" },
                { name: "مراجعة الأدبيات: ما سبق من البحث", primary: "Security research literature review" },
                { name: "أخلاقيات البحث: الخط بين الاختبار والضرر", primary: "Security research ethics" },
                { name: "IRB وموافقة أخلاقيات البحث الجامعي", primary: "IRB and ethical research approval" },
                { name: "تصميم التجربة وتكرار النتائج", primary: "Experiment design and repeatability" },
                { name: "التوثيق المنهجي لعملية البحث", primary: "Research documentation methodology" },
                { name: "ملكية الثغرات والإشكاليات القانونية", primary: "Vulnerability ownership and legal issues" },
                { name: "بناء مسار بحث أمني طويل الأمد", primary: "Long-term security research career" }
              ]
            },
            {
              unit_index: 2, code: "3.5.2",
              name: "Fuzzing: اكتشاف الثغرات بالقوة",
              goal: "تطبيق تقنيات Fuzzing المتقدمة لاكتشاف ثغرات في البرامج الحقيقية",
              key_concepts: ["Coverage-Guided Fuzzing","AFL++","LibFuzzer","Mutation Strategies","Crash Triage"],
              lessons: [
                { name: "Fuzzing: المفهوم والأنواع والتطور", primary: "Fuzzing types and evolution" },
                { name: "AFL++: الـFuzzer الأكثر استخداماً", primary: "AFL++ setup and usage" },
                { name: "Coverage-Guided Fuzzing: التوجيه بالتغطية", primary: "Coverage-guided fuzzing technique" },
                { name: "LibFuzzer وOSS-Fuzz للمشاريع الكبرى", primary: "LibFuzzer and OSS-Fuzz" },
                { name: "استراتيجيات Mutation: التلاعب الذكي", primary: "Fuzzing mutation strategies" },
                { name: "تجميع وتشغيل Harness لأي مكتبة", primary: "Fuzzing harness development" },
                { name: "Crash Triage: من الـCrash إلى الثغرة", primary: "Crash analysis and triage" },
                { name: "Structured Fuzzing: للبروتوكولات والملفات", primary: "Structured fuzzing for formats" },
                { name: "نشر ثغرات مكتشفة بـFuzzing", primary: "Publishing fuzzing discoveries" }
              ]
            },
            {
              unit_index: 3, code: "3.5.3",
              name: "Exploit Development المتوسط",
              goal: "تطوير Exploits للثغرات الموثّقة في بيئة تدريبية لفهم الآليات",
              key_concepts: ["Stack Overflow Exploit","ROP Gadgets","ret2libc","Format String","Heap Exploitation"],
              lessons: [
                { name: "بيئة Exploit Development: الإعداد والأدوات", primary: "Exploit development environment setup" },
                { name: "Stack Buffer Overflow Exploit كامل", primary: "Complete stack overflow exploit" },
                { name: "ret2libc: التحايل على No Execute", primary: "ret2libc technique" },
                { name: "ROP Gadgets: الكود المتفرق كسلاح", primary: "ROP gadget chaining" },
                { name: "Format String Vulnerabilities وExploitation", primary: "Format string vulnerability exploitation" },
                { name: "Heap Exploitation: Use-After-Free وDouble-Free", primary: "Heap exploitation techniques" },
                { name: "GDB-Peda وPwndbg للتحليل والتطوير", primary: "GDB extensions for exploit development" },
                { name: "pwntools: مكتبة Python لـExploit Dev", primary: "pwntools for exploit development" },
                { name: "الاختلاف بين CTF وReal-World Exploits", primary: "CTF vs real-world exploitation" }
              ]
            },
            {
              unit_index: 4, code: "3.5.4",
              name: "Kernel Exploitation: المستوى العميق",
              goal: "فهم مبادئ Kernel Exploitation وتطبيق Exploits بسيطة على أنوية للتدريب",
              key_concepts: ["Linux Kernel Modules","Race Conditions in Kernel","LPE via Kernel","Kernel Mitigations","SMEP/SMAP"],
              lessons: [
                { name: "بنية Linux Kernel: مناطق الاستغلال", primary: "Linux kernel exploitation areas" },
                { name: "وحدات Kernel ونقاط الضعف الشائعة", primary: "Kernel module vulnerabilities" },
                { name: "Race Conditions في الـKernel", primary: "Kernel-level race conditions" },
                { name: "Use-After-Free في الكرنل", primary: "Kernel UAF exploitation" },
                { name: "تصعيد الامتياز عبر الكرنل: الهدف الأسمى", primary: "Kernel LPE techniques" },
                { name: "SMEP وSMAP وKASLR: دفاعات الكرنل", primary: "Kernel protection mechanisms" },
                { name: "Kernel CTF Challenges كبيئة تدريب", primary: "Kernel CTF for learning" },
                { name: "Windows Kernel Exploitation: المختلف والمشترك", primary: "Windows kernel exploitation concepts" },
                { name: "الانتقال من LPE إلى Container Escape", primary: "LPE to container escape" }
              ]
            },
            {
              unit_index: 5, code: "3.5.5",
              name: "Browser Security Research",
              goal: "فهم أمن المتصفح وأساسيات البحث في ثغرات JavaScript Engines",
              key_concepts: ["Browser Architecture","JavaScript Engine","V8 Vulnerabilities","Sandbox Escapes","Browser Exploits"],
              lessons: [
                { name: "معمارية المتصفح الحديث ونماذج الأمن", primary: "Browser security architecture" },
                { name: "JavaScript Engine Internals: V8 وSpiderMonkey", primary: "JavaScript engine internals" },
                { name: "JIT Compilation وثغراته", primary: "JIT compilation vulnerabilities" },
                { name: "Type Confusion في JavaScript Engines", primary: "Type confusion vulnerabilities" },
                { name: "Browser Sandbox والتحايل عليه", primary: "Browser sandbox escape" },
                { name: "Pwn2Own Browser Exploits: حالات دراسية", primary: "Pwn2Own browser exploitation" },
                { name: "WebAssembly Security Considerations", primary: "WebAssembly security research" },
                { name: "Bug Bounty للمتصفحات: الكروم وFirefox", primary: "Browser bug bounty programs" },
                { name: "أدوات بحث أمن المتصفح", primary: "Browser security research tools" }
              ]
            },
            {
              unit_index: 6, code: "3.5.6",
              name: "CVE Discovery وResponsible Disclosure",
              goal: "اتباع إجراءات الإفصاح المسؤول الصحيحة من اكتشاف الثغرة إلى النشر",
              key_concepts: ["CVE Assignment","PSIRT","Coordinated Disclosure","Embargo Period","CVE Credits"],
              lessons: [
                { name: "من الاكتشاف إلى CVE: الرحلة الكاملة", primary: "CVE discovery to publication journey" },
                { name: "التواصل مع PSIRT الشركة المُصنّعة", primary: "Vendor PSIRT communication" },
                { name: "Coordinated Vulnerability Disclosure CVD", primary: "Coordinated disclosure process" },
                { name: "Embargo Period: وقت الانتظار حتى النشر", primary: "Embargo period management" },
                { name: "CVE Assignment بـMITRE وCNA", primary: "CVE number assignment process" },
                { name: "الشركات التي لا تستجيب: CERT وCISA", primary: "Reporting to CERT and CISA" },
                { name: "0-Day Brokers والسوق السرية", primary: "Zero-day brokerage market ethics" },
                { name: "Bug Bounty vs CVE: المسارات المختلفة", primary: "Bug bounty vs CVE publication choice" },
                { name: "السمعة المهنية من Responsible Disclosure", primary: "Professional reputation from disclosure" }
              ]
            },
            {
              unit_index: 7, code: "3.5.7",
              name: "Security Research Publication",
              goal: "كتابة وتقديم ورقة بحثية أو عرض تقني في المؤتمرات الأمنية",
              key_concepts: ["Security Paper Writing","Conference CFP","DEF CON","Black Hat","Academic Security"],
              lessons: [
                { name: "أنواع مخرجات البحث الأمني: ورقة ومنشور وأداة", primary: "Security research output types" },
                { name: "كتابة ورقة بحثية أمنية: الهيكل", primary: "Security research paper structure" },
                { name: "DEF CON وBlack Hat: CFP والقبول", primary: "Security conference CFP submission" },
                { name: "Academic Security: IEEE وACM وUsenix", primary: "Academic security conference publication" },
                { name: "PoC || GTFO: ثقافة النشر في الأمن", primary: "Proof of concept publication culture" },
                { name: "التقديم التقني: إعداد Demo وSlides", primary: "Technical presentation preparation" },
                { name: "GitHub Releases للأدوات الأمنية البحثية", primary: "Open source security tool release" },
                { name: "Blog Posts كبديل للنشر الأكاديمي", primary: "Technical blog as research publication" },
                { name: "بناء سمعة بحثية في مجتمع الأمن", primary: "Security research reputation building" }
              ]
            },
            {
              unit_index: 8, code: "3.5.8",
              name: "AI Security Research",
              goal: "فهم ثغرات أنظمة الذكاء الاصطناعي وتطبيق مبادئ Adversarial ML",
              key_concepts: ["Adversarial Examples","Model Extraction","Data Poisoning","Prompt Injection","AI Red Teaming"],
              lessons: [
                { name: "AI Security: التهديدات الخاصة بأنظمة الذكاء", primary: "AI-specific security threats" },
                { name: "Adversarial Examples: خداع النماذج", primary: "Adversarial examples in ML" },
                { name: "Model Extraction: سرقة النموذج", primary: "Model extraction attacks" },
                { name: "Data Poisoning: التلاعب في التدريب", primary: "Data poisoning attacks" },
                { name: "Prompt Injection في LLMs", primary: "Prompt injection in large language models" },
                { name: "AI Red Teaming للـLLMs", primary: "LLM red teaming methodology" },
                { name: "Membership Inference Attacks", primary: "Membership inference privacy attacks" },
                { name: "أمن نماذج AI في الإنتاج", primary: "Production AI model security" },
                { name: "OWASP LLM Top 10: المخاطر العشرة", primary: "OWASP LLM Top 10 vulnerabilities" }
              ]
            },
            {
              unit_index: 9, code: "3.5.9",
              name: "Zero-Day Discovery والبحث المتقدم",
              goal: "فهم منهجية اكتشاف الثغرات 0-Day وأخلاقياتها في عالم حقيقي",
              key_concepts: ["0-Day Research","Variant Analysis","Target Selection","Weaponization Ethics","Disclosure Dilemmas"],
              lessons: [
                { name: "0-Day: التعريف والقيمة والأثر", primary: "Zero-day definition and market value" },
                { name: "Variant Analysis: ثغرة واحدة = عائلة", primary: "Variant analysis from known vulnerabilities" },
                { name: "Target Selection في البحث: أين تبدأ", primary: "Research target selection strategy" },
                { name: "Code Audit لاكتشاف 0-Day المنهجي", primary: "Systematic code audit for zero-days" },
                { name: "Weaponization Ethics: الخط الأحمر", primary: "0-day weaponization ethics" },
                { name: "حالة Log4Shell: من اكتشاف إلى عالمي", primary: "Log4Shell discovery case study" },
                { name: "حالة ProxyLogon: Exchange 0-Day سلسلة", primary: "ProxyLogon 0-day chain case study" },
                { name: "0-Day Bug Bounty Programs الكبرى", primary: "High-value bug bounty programs for 0-day" },
                { name: "من 0-Day إلى الشهرة في مجتمع الأمن", primary: "0-day research career impact" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "القيادة الأمنية والاستراتيجية المؤسسية",
          goal: "قيادة برامج الأمن المؤسسية واتخاذ قرارات الأمن الاستراتيجية على مستوى تنفيذي",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 35 },
          units: [
            {
              unit_index: 1, code: "3.6.1",
              name: "دور CISO ومسؤولياته",
              goal: "فهم أدوار CISO ومسؤولياته وكيف يُوازن بين التقنية والأعمال",
              key_concepts: ["CISO Responsibilities","Security Strategy","Board Reporting","CISO Types","Career Path"],
              lessons: [
                { name: "CISO: التطور من Techie إلى Executive", primary: "CISO role evolution" },
                { name: "أنواع CISOs: التقني والاستراتيجي والمحرّك", primary: "CISO personas and styles" },
                { name: "مسؤوليات CISO: الأمن والامتثال والمخاطر", primary: "CISO core responsibilities" },
                { name: "CISO وعلاقته بالـCEO وCFO وLegal", primary: "CISO C-suite relationships" },
                { name: "التقارير للمجلس: ترجمة التقنية للأعمال", primary: "CISO board reporting" },
                { name: "مساءلة CISO والمسؤولية القانونية", primary: "CISO accountability and legal liability" },
                { name: "SolarWinds ولماذا يهم CISOs الآن أكثر", primary: "CISO liability after SolarWinds" },
                { name: "بناء مسار مهني نحو CISO", primary: "CISO career path building" },
                { name: "Fractional CISO: خيار للشركات الصغيرة", primary: "Fractional CISO model" }
              ]
            },
            {
              unit_index: 2, code: "3.6.2",
              name: "استراتيجية الأمن السيبراني",
              goal: "بناء استراتيجية أمن سيبراني متوافقة مع أهداف الأعمال وقابلة للتنفيذ",
              key_concepts: ["Security Strategy","3-Year Roadmap","Business Alignment","Threat-Informed Strategy","Security Vision"],
              lessons: [
                { name: "الاستراتيجية الأمنية: من الرؤية للتنفيذ", primary: "Security strategy development" },
                { name: "التوافق مع الأعمال: الأمن خادم للغاية", primary: "Security-business alignment" },
                { name: "Threat-Informed Strategy: العدو يُشكّل الخطة", primary: "Threat-informed security strategy" },
                { name: "خارطة طريق 3 سنوات لبرنامج الأمن", primary: "3-year security roadmap" },
                { name: "Security Principles: المبادئ الموجّهة", primary: "Security guiding principles" },
                { name: "Capabilities Model: ما تفعله ولا تفعله", primary: "Security capabilities model" },
                { name: "تحديد الأولويات في قيود الميزانية", primary: "Security prioritization with limited budget" },
                { name: "قياس تنفيذ الاستراتيجية والانحراف", primary: "Strategy execution measurement" },
                { name: "مراجعة الاستراتيجية السنوية وتحديثها", primary: "Annual strategy review" }
              ]
            },
            {
              unit_index: 3, code: "3.6.3",
              name: "ميزانية الأمن وحجة الاستثمار",
              goal: "بناء حالة عمل قوية للاستثمار الأمني وإدارة ميزانية الأمن بكفاءة",
              key_concepts: ["Security ROI","Budget Justification","Risk Quantification","FAIR","Security Spending Benchmarks"],
              lessons: [
                { name: "ROI للأمن السيبراني: هل يمكن قياسه", primary: "Security ROI measurement" },
                { name: "FAIR: تحديد التكلفة المتوقعة للاختراق", primary: "FAIR for budget justification" },
                { name: "بناء حالة عمل Business Case لـSIEM وEDR", primary: "Security tool business case" },
                { name: "Cyber Insurance: العلاقة بالميزانية الأمنية", primary: "Cyber insurance in security budget" },
                { name: "Security Spending Benchmarks بالصناعة", primary: "Industry security spending benchmarks" },
                { name: "إدارة ميزانية الأمن: الثابت والمتغير", primary: "Security budget management" },
                { name: "الوفورات من الأتمتة والأدوات الموحّدة", primary: "Cost savings through security automation" },
                { name: "Breach Cost Calculation: تكلفة الاختراق", primary: "Security breach cost calculation" },
                { name: "مراجعة الإنفاق الأمني وتحسين الكفاءة", primary: "Security spend optimization" }
              ]
            },
            {
              unit_index: 4, code: "3.6.4",
              name: "إدارة الأزمات السيبرانية",
              goal: "قيادة المؤسسة خلال أزمة سيبرانية كبرى بفعالية واتزان",
              key_concepts: ["Crisis Management","War Room","Communication Strategy","Regulatory Notification","Recovery Leadership"],
              lessons: [
                { name: "Crisis Management في الحوادث السيبرانية", primary: "Cyber crisis management leadership" },
                { name: "War Room: الإعداد والقيادة والتنسيق", primary: "Cyber war room operations" },
                { name: "استراتيجية التواصل أثناء الأزمة", primary: "Crisis communication strategy" },
                { name: "التواصل مع الصحافة في حوادث البيانات", primary: "Media communication during data breaches" },
                { name: "متطلبات الإشعار التنظيمي بالاختراقات", primary: "Regulatory breach notification requirements" },
                { name: "الإدارة العليا في الأزمة: الأدوار والحدود", primary: "Executive roles in cyber crisis" },
                { name: "قرارات الدفع أو عدم الدفع للـRansomware", primary: "Ransomware payment decision framework" },
                { name: "التعافي من الأزمة: العودة والثقة", primary: "Post-crisis recovery and trust rebuild" },
                { name: "حالات أزمات حقيقية: Target وEquifax وSolarWinds", primary: "Major cyber crisis case studies" }
              ]
            },
            {
              unit_index: 5, code: "3.6.5",
              name: "بناء فريق الأمن السيبراني",
              goal: "تجنيد وتطوير والاحتفاظ بفريق الأمن السيبراني في بيئة تنافسية",
              key_concepts: ["Team Structure","Talent Acquisition","Skills Development","Retention","Culture"],
              lessons: [
                { name: "هيكل فريق الأمن: الأدوار والمسارات", primary: "Security team structure design" },
                { name: "تجنيد مهنيي الأمن في سوق شحيح", primary: "Security talent acquisition" },
                { name: "Upskilling وReskilling للفريق الحالي", primary: "Security team upskilling" },
                { name: "الاحتفاظ بالمواهب الأمنية: ما يرضيهم", primary: "Security talent retention" },
                { name: "ثقافة الفريق الأمني وبيئة العمل", primary: "Security team culture building" },
                { name: "Burnout في SOC: الظاهرة والحلول", primary: "SOC analyst burnout prevention" },
                { name: "Diversity في مجال الأمن السيبراني", primary: "Diversity and inclusion in cybersecurity" },
                { name: "MSSPs مقابل الفريق الداخلي: القرار", primary: "In-house vs MSSP decision" },
                { name: "قياس أداء فريق الأمن وتطوره", primary: "Security team performance measurement" }
              ]
            },
            {
              unit_index: 6, code: "3.6.6",
              name: "Cyber Insurance وإدارة المخاطر المالية",
              goal: "التفاوض على تأمين إلكتروني مناسب وإدارة المخاطر المالية السيبرانية",
              key_concepts: ["Cyber Insurance Coverage","Underwriting","Policy Exclusions","Loss Prevention","Premium Reduction"],
              lessons: [
                { name: "Cyber Insurance: ما يغطيه وما لا يغطيه", primary: "Cyber insurance coverage and exclusions" },
                { name: "Underwriting Process: كيف تُقيّمك شركة التأمين", primary: "Cyber insurance underwriting" },
                { name: "تحسين الوضع الأمني لتخفيض القسط", primary: "Security controls for premium reduction" },
                { name: "استثناءات السياسة: الفخاخ التي تُباغتك", primary: "Common cyber policy exclusions" },
                { name: "الادعاء بالتأمين بعد حادثة: الإجراءات", primary: "Cyber insurance claims process" },
                { name: "War Exclusions: أحداث الدولة القومية", primary: "Cyber insurance war exclusion" },
                { name: "Risk Quantification للتأمين بـFAIR", primary: "FAIR for insurance risk quantification" },
                { name: "Captive Insurance للمؤسسات الكبرى", primary: "Captive insurance for cyber risk" },
                { name: "مستقبل التأمين الإلكتروني: تغيير جذري", primary: "Future of cyber insurance" }
              ]
            },
            {
              unit_index: 7, code: "3.6.7",
              name: "تحقيق الامتثال التنظيمي العالمي",
              goal: "إدارة متطلبات الامتثال المتعددة في بيئات عالمية ومعقدة",
              key_concepts: ["Multi-Jurisdiction Compliance","DORA","NIS2","Compliance Fatigue","Unified Controls"],
              lessons: [
                { name: "DORA: اللائحة الأوروبية لمرونة القطاع المالي", primary: "DORA digital operational resilience" },
                { name: "NIS2: الشبكات والمعلومات في أوروبا", primary: "NIS2 directive requirements" },
                { name: "CCPA وCPRA: خصوصية المستهلك في كاليفورنيا", primary: "CCPA/CPRA compliance" },
                { name: "إدارة Compliance متعددة التشريعات", primary: "Multi-jurisdiction compliance management" },
                { name: "Unified Control Framework: إطار موحّد", primary: "Unified controls for multiple frameworks" },
                { name: "Compliance Fatigue: الإرهاق وكيف يُحل", primary: "Compliance fatigue management" },
                { name: "GRC Platforms لإدارة Compliance المركزية", primary: "GRC platform for compliance management" },
                { name: "التدقيق الخارجي: الإعداد والإدارة", primary: "External audit preparation" },
                { name: "قياس مستوى الامتثال وتقاريره للمجلس", primary: "Compliance scoring and board reporting" }
              ]
            },
            {
              unit_index: 8, code: "3.6.8",
              name: "Security Culture والتغيير التنظيمي",
              goal: "بناء ثقافة أمن حقيقية تتجاوز الامتثال إلى التبنّي الفعلي",
              key_concepts: ["Security Culture Framework","Change Management","Nudge Theory","Gamification","Culture Metrics"],
              lessons: [
                { name: "Security Culture: ما هي وكيف تُقاس", primary: "Security culture definition and measurement" },
                { name: "Change Management في برامج الأمن", primary: "Change management for security programs" },
                { name: "Nudge Theory: دفع الناس للسلوك الآمن", primary: "Behavioral nudge theory in security" },
                { name: "Gamification لتحسين التفاعل الأمني", primary: "Gamification in security culture" },
                { name: "Security Champions Program في المؤسسة", primary: "Security champions cultural program" },
                { name: "Communication Campaigns للوعي الأمني", primary: "Security awareness campaigns" },
                { name: "قياس تحوّل ثقافة الأمن بالمؤشرات", primary: "Security culture metrics" },
                { name: "مقاومة التغيير وكيف تُتجاوز", primary: "Overcoming security change resistance" },
                { name: "Security Culture في بيئات العمل عن بُعد", primary: "Remote work security culture" }
              ]
            },
            {
              unit_index: 9, code: "3.6.9",
              name: "مستقبل الأمن السيبراني والتأهب",
              goal: "الاستعداد لتحديات الأمن السيبراني في السنوات القادمة وتوجيه المسار المهني",
              key_concepts: ["AI in Cybersecurity","Quantum Computing","5G Security","Space Cybersecurity","Career Evolution"],
              lessons: [
                { name: "AI كسلاح وكدرع: المعركة المزدوجة", primary: "AI as offensive and defensive tool" },
                { name: "AI SOC: الكشف والاستجابة بالذكاء الاصطناعي", primary: "AI-powered SOC future" },
                { name: "الحوسبة الكمومية والتأثير الأمني طويل الأمد", primary: "Quantum computing long-term security impact" },
                { name: "5G Security: التهديدات والفرص", primary: "5G network security implications" },
                { name: "Space Cybersecurity: الحدود الجديدة", primary: "Satellite and space security" },
                { name: "AI-Generated Attacks: التزييف وHyper-Targeted Phishing", primary: "AI-generated cyber attacks" },
                { name: "Deepfake وBEC المدعوم بالذكاء الاصطناعي", primary: "AI deepfake in social engineering" },
                { name: "المسار المهني في الأمن: الشهادات والتخصصات", primary: "Cybersecurity career path planning" },
                { name: "رسالة لمحترف الأمن: اترك أثراً دائماً", primary: "Cybersecurity professional legacy" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "التميز التقني والمشاريع الشاملة",
          goal: "توليف جميع مهارات الأمن السيبراني في مشاريع متكاملة وشهادات دولية",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 35 },
          units: [
            {
              unit_index: 1, code: "3.7.1",
              name: "مسارات الشهادات الدولية",
              goal: "التخطيط للحصول على الشهادات الدولية الصحيحة لكل مسار مهني",
              key_concepts: ["OSCP","CISSP","CEH","CISM","CompTIA Security+"],
              lessons: [
                { name: "خريطة شهادات الأمن: من المبتدئ للخبير", primary: "Cybersecurity certification roadmap" },
                { name: "CompTIA Security+: شهادة الدخول الشاملة", primary: "CompTIA Security+ overview" },
                { name: "CEH: القبعة الأخلاقية الأشهر والأكثر جدلاً", primary: "CEH certification overview" },
                { name: "OSCP: الشهادة العملية الأصعب والأقيم", primary: "OSCP certification preparation" },
                { name: "CISSP: شهادة الـ(ISC)² لخبراء الأمن", primary: "CISSP certification overview" },
                { name: "CISM وCRISC: للقيادة وإدارة المخاطر", primary: "CISM and CRISC certifications" },
                { name: "Cloud Security: CCSP وAWS Security", primary: "Cloud security certifications" },
                { name: "شهادات المسار الدفاعي: GCIH وGCFA", primary: "Defensive security certifications" },
                { name: "CPE والحفاظ على الشهادات وتجديدها", primary: "Certification maintenance and CPE" }
              ]
            },
            {
              unit_index: 2, code: "3.7.2",
              name: "مشروع تكاملي: تقييم أمني شامل",
              goal: "تنفيذ تقييم أمني شامل من الاستطلاع إلى التقرير في مختبر كامل",
              key_concepts: ["Full Assessment","Scoping","Methodology","Findings Report","Presentation"],
              lessons: [
                { name: "تصميم بيئة الاختبار الشاملة في المختبر", primary: "Comprehensive lab environment design" },
                { name: "الاستطلاع الكامل: OSINT وفحص الشبكة", primary: "Full reconnaissance phase execution" },
                { name: "استغلال الثغرات وما بعد الاختراق في المختبر", primary: "Exploitation and post-exploitation lab" },
                { name: "تصعيد الامتياز في Windows وLinux", primary: "Privilege escalation in practice" },
                { name: "Active Directory Compromise كامل", primary: "Complete AD compromise scenario" },
                { name: "جمع الأدلة وتوثيق كل خطوة", primary: "Evidence collection and documentation" },
                { name: "كتابة التقرير الشامل بالأدلة والتوصيات", primary: "Full assessment report writing" },
                { name: "تقديم النتائج لـ\"العميل\" المحاكي", primary: "Simulated client presentation" },
                { name: "المقارنة مع معايير الصناعة وتقييم الجودة", primary: "Assessment quality self-evaluation" }
              ]
            },
            {
              unit_index: 3, code: "3.7.3",
              name: "مشروع تكاملي: بناء SOC من الصفر",
              goal: "بناء SOC وظيفي كامل في بيئة مختبرية مع كل مكوناته الأساسية",
              key_concepts: ["SOC Lab","SIEM Deployment","EDR Integration","TI Integration","Playbook Testing"],
              lessons: [
                { name: "تصميم SOC Lab: المتطلبات والهيكل", primary: "SOC lab design and requirements" },
                { name: "نشر Elastic Stack كـSIEM للمختبر", primary: "Elastic Stack SIEM deployment" },
                { name: "تكوين Log Sources: Windows وLinux وSysmon", primary: "Log source configuration" },
                { name: "نشر Wazuh كـEDR للمختبر", primary: "Wazuh EDR deployment" },
                { name: "تكامل MISP كـThreat Intelligence", primary: "MISP TI integration in SOC lab" },
                { name: "كتابة أول 10 قواعد كشف للـSIEM", primary: "First 10 SIEM detection rules" },
                { name: "محاكاة هجوم وتتبعه في SOC", primary: "Attack simulation and SOC tracking" },
                { name: "بناء Playbook للاستجابة للـPhishing", primary: "Phishing response playbook" },
                { name: "قياس أداء SOC Lab وتطويره", primary: "SOC lab performance measurement" }
              ]
            },
            {
              unit_index: 4, code: "3.7.4",
              name: "مشروع تكاملي: تطبيق ISMS بـISO 27001",
              goal: "تطبيق نظام إدارة أمن المعلومات الكامل على مؤسسة محاكاة",
              key_concepts: ["ISMS Implementation","Risk Register","SoA","Policy Framework","Internal Audit"],
              lessons: [
                { name: "تحديد نطاق ISMS للمؤسسة المحاكاة", primary: "ISMS scope definition" },
                { name: "جرد الأصول وتصنيفها وفق ISO 27001", primary: "Asset inventory for ISO 27001" },
                { name: "تقييم المخاطر بالمنهجية المختارة", primary: "Risk assessment methodology" },
                { name: "Statement of Applicability: اختيار الضوابط", primary: "SoA creation and justification" },
                { name: "كتابة حزمة السياسات الأساسية للـISMS", primary: "Core ISMS policy package" },
                { name: "Risk Treatment Plan وملاك المخاطر", primary: "Risk treatment plan development" },
                { name: "Internal Audit Plan وتنفيذه", primary: "ISMS internal audit execution" },
                { name: "تقرير Management Review للـISMS", primary: "ISMS management review report" },
                { name: "محاكاة جلسة تدقيق الاعتماد", primary: "ISO 27001 certification audit simulation" }
              ]
            },
            {
              unit_index: 5, code: "3.7.5",
              name: "المسار المهني في الأمن السيبراني",
              goal: "بناء مسار مهني واضح ومتسق في الأمن السيبراني مع خطة تطوير ذاتي",
              key_concepts: ["Career Specializations","Portfolio Building","Networking","Continuous Learning","Mentoring"],
              lessons: [
                { name: "تخصصات الأمن السيبراني: 8 مسارات مميزة", primary: "Cybersecurity career specialization paths" },
                { name: "بناء Portfolio تقني حقيقي ومقنع", primary: "Technical portfolio building" },
                { name: "GitHub والـBlog التقني كـPersonal Brand", primary: "Technical blogging and GitHub presence" },
                { name: "LinkedIn للأمن السيبراني: التعامل المهني", primary: "LinkedIn for cybersecurity professionals" },
                { name: "Networking في مؤتمرات الأمن المحلية والدولية", primary: "Security conference networking" },
                { name: "Mentoring وMentorship: العطاء والأخذ", primary: "Mentoring in cybersecurity" },
                { name: "التعلم المستمر: الموارد والمجتمعات", primary: "Continuous learning resources" },
                { name: "Consulting مقابل Employment: الأوزان والموازين", primary: "Security consulting vs employment" },
                { name: "الأثر الاجتماعي لمحترف الأمن السيبراني", primary: "Social impact of cybersecurity work" }
              ]
            },
            {
              unit_index: 6, code: "3.7.6",
              name: "Security Automation وAI-Assisted Defense",
              goal: "بناء منظومة أتمتة أمنية تستخدم الذكاء الاصطناعي لتعزيز الدفاع",
              key_concepts: ["LLM Security Tools","AI-Assisted Triage","Automated Analysis","CoPilot for Security","Defense Augmentation"],
              lessons: [
                { name: "AI في الأمن: الحالة الحقيقية لعام 2025", primary: "AI in cybersecurity current state" },
                { name: "Microsoft Security Copilot: المساعد الأمني", primary: "Microsoft Security Copilot capabilities" },
                { name: "LLM لتحليل الثغرات والكود الخبيث", primary: "LLM for vulnerability and malware analysis" },
                { name: "AI-Assisted Alert Triage: الفرز بالذكاء", primary: "AI-assisted SOC triage" },
                { name: "بناء Security Chatbot مخصص للـSOC", primary: "Custom security chatbot development" },
                { name: "حدود AI في الأمن: لا تعتمد عليه كلياً", primary: "AI limitations in security" },
                { name: "Adversarial AI: استخدام الذكاء ضد الذكاء", primary: "Adversarial AI in cybersecurity" },
                { name: "بناء Automated Threat Report Generator", primary: "Automated threat report generation" },
                { name: "مستقبل المحلل الأمني في عصر الذكاء", primary: "Security analyst evolution with AI" }
              ]
            },
            {
              unit_index: 7, code: "3.7.7",
              name: "Cybersecurity في الدول النامية والبيئات المحدودة",
              goal: "تطبيق الأمن السيبراني الفعّال في البيئات ذات الموارد المحدودة",
              key_concepts: ["Open Source Security","Budget Security","Community Resources","Local Threat Landscape","Capacity Building"],
              lessons: [
                { name: "الأمن السيبراني بالموارد المحدودة: الممكن", primary: "Security with limited resources" },
                { name: "Open Source Security Stack الكامل", primary: "Full open source security toolstack" },
                { name: "مجتمعات الأمن المحلية وبناءها", primary: "Local security community building" },
                { name: "التهديدات المحلية: ما يستهدف المنطقة", primary: "Regional threat landscape analysis" },
                { name: "Capacity Building للمؤسسات الحكومية", primary: "Government cybersecurity capacity" },
                { name: "Cybersecurity للشركات الصغيرة والمتوسطة", primary: "SMB cybersecurity approach" },
                { name: "NIST Cybersecurity Framework للمنظمات الصغيرة", primary: "NIST CSF for small organizations" },
                { name: "تدريب الكوادر الوطنية في الأمن السيبراني", primary: "National cybersecurity workforce training" },
                { name: "مستقبل الأمن السيبراني في المنطقة العربية", primary: "Arab region cybersecurity future" }
              ]
            },
            {
              unit_index: 8, code: "3.7.8",
              name: "مشروع تكاملي نهائي: Red vs Blue",
              goal: "تنفيذ تمرين Red Team كامل مع محاكاة Blue Team وإنتاج التقارير الكاملة",
              key_concepts: ["Full Exercise","Red Team Report","Blue Team Report","Purple Team Findings","Lessons Learned"],
              lessons: [
                { name: "تصميم التمرين: السيناريو والأدوار والمختبر", primary: "Red vs blue exercise design" },
                { name: "مرحلة Red Team: الاستطلاع والاختراق", primary: "Red team execution phase" },
                { name: "مرحلة Red Team: التصعيد وAD Compromise", primary: "Red team privilege escalation phase" },
                { name: "مرحلة Blue Team: الكشف والتحقيق", primary: "Blue team detection and investigation" },
                { name: "مرحلة Blue Team: الاحتواء والاستئصال", primary: "Blue team containment phase" },
                { name: "Debrief: مراجعة ما حدث بشفافية", primary: "Exercise debrief and transparency" },
                { name: "تقرير Red Team: الكامل والشامل", primary: "Full red team report writing" },
                { name: "تقرير Blue Team: الكشف والاستجابة", primary: "Blue team detection report" },
                { name: "توصيات Purple Team: تحسين مشترك", primary: "Joint purple team recommendations" }
              ]
            },
            {
              unit_index: 9, code: "3.7.9",
              name: "الإرث المهني وتطوير المجتمع",
              goal: "بناء إرث مهني مستدام والمساهمة في تطوير مجتمع الأمن السيبراني",
              key_concepts: ["Open Source Contribution","Teaching","Writing","Mentoring Next Gen","Community Impact"],
              lessons: [
                { name: "المساهمة في أدوات الأمن مفتوحة المصدر", primary: "Open source security contribution" },
                { name: "تدريس الأمن السيبراني: المسؤولية والمتعة", primary: "Teaching cybersecurity" },
                { name: "الكتابة التقنية: من مقالة إلى كتاب", primary: "Technical writing in security" },
                { name: "تأسيس مجتمع أمن محلي", primary: "Local security community founding" },
                { name: "تطوير أدوات CTF وتحديات تعليمية", primary: "CTF challenge development" },
                { name: "إرشاد الجيل القادم من محترفي الأمن", primary: "Mentoring next generation" },
                { name: "الأثر السياسي: الاستشارة الحكومية في الأمن", primary: "Policy advisory in cybersecurity" },
                { name: "بناء شركة أمن سيبراني ناشئة", primary: "Cybersecurity startup founding" },
                { name: "رسالة ختامية: حارس العالم الرقمي", primary: "Cybersecurity professional's mission" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

function makeGoal(lessonName, unitName) {
  return `يستطيع المتعلم تطبيق ${lessonName} في سيناريوهات هجومية ودفاعية حقيقية ضمن سياق ${unitName}، ويُميّز بين الإعداد الآمن والثغرات الشائعة.`;
}

function makeBridge(lessonName, idx, unitName) {
  if (idx === 1) return `هذا الدرس يُؤسّس فهمك لـ${unitName} من الصفر—كل درس بعده يبني على ما ستتعلمه هنا.`;
  return `بعد ما تعلمناه، يُكمل ${lessonName} الصورة ويمنحك القدرة على التطبيق العملي المتكامل في ${unitName}.`;
}

function makeConcepts(primary, lessonName) {
  const parts = primary.split(" ");
  return [
    {
      name: `${parts.slice(0, 3).join(" ")}`,
      explanation: `المفهوم الجوهري الذي يتناوله درس "${lessonName}" من منظور الهجوم والدفاع`,
      weight: 3
    },
    {
      name: `التطبيق العملي: ${parts.slice(0, 2).join(" ")}`,
      explanation: `كيف يُوظَّف هذا المفهوم في سيناريوهات أمن سيبراني حقيقية وما أدواته الشائعة`,
      weight: 2
    },
    {
      name: `الدفاع والمواجهة`,
      explanation: `الضوابط الأمنية والتقنيات الدفاعية التي تُحيّد أو تُقلص المخاطر المرتبطة بهذا المفهوم`,
      weight: 2
    }
  ];
}

function makeMistakes(primary, unitName) {
  return [
    {
      mistake: `استخدام ${primary.split(" ")[0]} في الإنتاج دون اختبار مسبق في بيئة معزولة`,
      correction: `دائماً اختبر في بيئة Staging أو Lab معزولة أولاً قبل أي تطبيق على أنظمة إنتاجية`,
      severity: "critical"
    },
    {
      mistake: `الاعتماد على إعدادات ${unitName} الافتراضية دون مراجعة أمنية`,
      correction: `راجع دائماً الإعدادات الافتراضية وطبّق مبدأ أقل امتياز وقيّمها وفق CIS Benchmarks`,
      severity: "major"
    },
    {
      mistake: `تجاهل توثيق النتائج والتغييرات في أثناء التدريب والاختبار`,
      correction: `وثّق كل خطوة ونتيجة ولقطة شاشة أثناء الاختبار—الذاكرة خادعة في بيئات الأمن المكثّفة`,
      severity: "minor"
    }
  ];
}

function makeExamples(primary, unitName) {
  return [
    `تخيّل أن بنك يمني يريد حماية ${unitName}: كيف يطبق ${primary.split(":")[0]} بعد حادثة تسريب بيانات؟`,
    `شركة اتصالات تعمل 24/7 محتاجة ضمان أن ${primary.split(":")[0]} لا يُعطّل الخدمة—ما الإجراء الصحيح؟`
  ];
}

function makeExamQuestion(lessonName, primary) {
  return `سيناريو: مهاجم استغل ثغرة في بيئة تُشبه "${lessonName}"—وصف خطواته وكيف كنت ستكشفه وتوقفه إذا كنت مسؤول الأمن؟`;
}

function makeLabForUnit(unitDef) {
  const c = unitDef.key_concepts;
  const t = (i) => c[i] || unitDef.name;
  return {
    lab_index: 1,
    name: `مختبر ${unitDef.name}`,
    scenario: `أنت محلل أمن سيبراني في مؤسسة مالية. تلقّيت تنبيهاً بنشاط مشبوه يتصل بـ${unitDef.name}. مهمتك: تحليل الموقف واتخاذ الإجراءات المناسبة.`,
    questions: [
      {
        kind: "diagnostic",
        prompt: `قبل البدء بالتحليل، ما المعلومات الأولى التي تحتاجها لفهم طبيعة الحادثة المتعلقة بـ${t(0)}؟`,
        rubric: "التحديد المنهجي لمتطلبات جمع المعلومات الأولية، مع ترتيب بحسب الأولوية",
        solution_outline: `تحديد نوع الحادثة → جمع سجلات ${t(0)} → تحليل الوقت والمصدر → توثيق الحالة الأولية`,
        points: 2
      },
      {
        kind: "decision",
        prompt: `اكتشفت أن ${t(1)} تم إعداده بشكل خاطئ في بيئة الإنتاج. ما قرارك الفوري وما الخطوات المتتالية؟`,
        rubric: "قرار احتواء فوري، متوازن بين تقليص الخطر واستمرارية الخدمة، مع خطة إصلاح",
        solution_outline: `تقييم الخطورة الفورية → قرار Isolate أو Patch → إشعار الأطراف المعنية → تطبيق الإصلاح الطارئ`,
        points: 2
      },
      {
        kind: "application",
        prompt: `طبّق مبادئ ${t(2)} لتقوية الإعداد وتقليص سطح الهجوم. صف الخطوات التقنية التفصيلية.`,
        rubric: "خطوات تقنية قابلة للتطبيق الفعلي، تغطي least privilege + monitoring + documentation",
        solution_outline: `مراجعة الإعدادات الحالية → تطبيق أقل امتياز → إعداد مراقبة مستمرة → توثيق التغييرات`,
        points: 2
      },
      {
        kind: "analysis",
        prompt: `حلّل السجلات الافتراضية وحدد مؤشرات الاختراق IOC المرتبطة بـ${unitDef.name}. ما الأنماط الشاذة؟`,
        rubric: "تحديد IOC محددة، ربطها بتقنيات MITRE ATT&CK، وتمييز الإيجابيات الكاذبة",
        solution_outline: `قراءة السجلات منهجياً → تحديد الأنماط الشاذة → تصنيف وفق ATT&CK → توثيق IOC`,
        points: 2
      },
      {
        kind: "connection",
        prompt: `كيف ترتبط ثغرة ${unitDef.name} بمتجه هجوم أوسع في Kill Chain؟ رسم كامل للسيناريو.`,
        rubric: "فهم Kill Chain كاملاً، تحديد موقع الثغرة في السلسلة، اقتراح ضوابط دفاعية متعددة الطبقات",
        solution_outline: `تحديد مرحلة Kill Chain → استغلال ${unitDef.name} → Lateral Movement المحتمل → Defense in Depth`,
        points: 2
      }
    ],
    completion_criterion: `أكمل المتعلم تحليلاً أمنياً منهجياً لسيناريو ${unitDef.name}، وأثبت قدرته على ربط الثغرات التقنية بالاستجابة العملية المناسبة.`
  };
}

function makeUnitExamQuestions(unitCode, unit, passThreshold, timeLimit) {
  const t = (i) => unit.key_concepts[i] || unit.name;
  return {
    pass_threshold_percent: passThreshold,
    time_limit_minutes: timeLimit,
    variants: [[
      {
        kind: "mcq",
        prompt: `في بيئة إنتاجية تعرّضت لهجوم يستغل ${unit.name}، أي من الإجراءات الأمنية الآتية هو الأصح منهجياً؟`,
        choices: [
          `احتواء الحادثة أولاً ثم جمع الأدلة مع تطبيق ${t(0)} وفق إجراءات موثّقة`,
          `إعادة تشغيل الخادم فوراً لإزالة أي كود خبيث`,
          `حذف السجلات لمنع الهاجم من معرفة ما اكتشفته`,
          `الانتظار حتى تنتهي الهجمة دون تدخل`
        ],
        correct_index: 0,
        explanation: `في حوادث ${unit.name}، ترتيب العمليات جوهري: الاحتواء يمنع التمدد، والأدلة تمكّن من التحليل اللاحق، والتوثيق ضروري للتعلم والامتثال.`,
        difficulty: 2
      },
      {
        kind: "mcq",
        prompt: `مهاجم استخدم ${t(1)} كجزء من هجومه. ما المؤشر الأكثر موثوقية لاكتشافه في سجلات الأمن؟`,
        choices: [
          `نمط شاذ في استخدام ${t(1)} مقارنةً بخط أساس سلوكي موثّق`,
          `وجود أي حركة على المنفذ 80 أو 443`,
          `استخدام المستخدمين لأي بروتوكول مشفّر`,
          `تشغيل أي برنامج خارج ساعات العمل`
        ],
        correct_index: 0,
        explanation: `الكشف الفعّال يعتمد على الانحراف عن خط الأساس المعروف—ليس مجرد وجود نشاط، بل تغيير في النمط المعهود يُعدّ مؤشراً أقوى.`,
        difficulty: 2
      },
      {
        kind: "mcq",
        prompt: `ما التعريف الأدق لـ${t(2)} من منظور الهجوم والدفاع معاً في سياق ${unit.name}؟`,
        choices: [
          `تقنية ثنائية الاستخدام: يُوظّفها المهاجم للاختراق والمدافع للكشف والتقسية`,
          `ثغرة حصرية في الأنظمة القديمة فقط`,
          `بروتوكول اتصال مُختص بالمؤسسات الكبرى`,
          `أداة مراقبة لا علاقة لها بالهجمات`
        ],
        correct_index: 0,
        explanation: `${t(2)} في الأمن السيبراني يُفهم بشكل كامل فقط من كلا الجهتين—المهاجم يراه فرصة والمدافع يُحوّله إلى ضابط كشف.`,
        difficulty: 1
      },
      {
        kind: "mcq",
        prompt: `مهندس أمن يُعدّ ضابط دفاع ضد هجمات ${unit.name}. أي الأخطاء التالية الأكثر شيوعاً وأثراً؟`,
        choices: [
          `الاكتفاء بأداة دفاع واحدة دون تطبيق Defense in Depth`,
          `استخدام أكثر من أداة أمنية معاً`,
          `تطبيق مبدأ أقل امتياز على الحسابات`,
          `توثيق كل الإعدادات والتغييرات`
        ],
        correct_index: 0,
        explanation: `نقطة فشل واحدة كافية لاختراق كامل—Defense in Depth يضمن أن فشل طبقة واحدة لا يكشف النظام بأكمله.`,
        difficulty: 2
      },
      {
        kind: "mcq",
        prompt: `ما الفارق الجوهري بين بيئة Staging وبيئة الإنتاج من منظور اختبار ${unit.name}؟`,
        choices: [
          `الإنتاج يتطلب إجراءات تغيير رسمية ومراقبة أشد، بينما Staging مساحة آمنة للاختبار الحر`,
          `Staging أكثر تأمناً من الإنتاج دائماً`,
          `لا فارق أمنياً بين البيئتين`,
          `الإنتاج أقل تقييداً من Staging للتطوير`
        ],
        correct_index: 0,
        explanation: `Staging هي مرحلة الاختبار الحر بلا خوف—الإنتاج يتطلب صرامة وأذونات رسمية، أي تغيير بدون إجراء صحيح خطر.`,
        difficulty: 3
      },
      {
        kind: "mcq",
        prompt: `عند كتابة Runbook لمعالجة حوادث ${unit.name}، أي العناصر الأولى للإدراج؟`,
        choices: [
          `معايير التصنيف وخطوات الاحتواء مع نقاط قرار واضحة لكل سيناريو`,
          `قائمة بأسماء الفريق وأيامهم المعتادة`,
          `تاريخ أول نشر للنظام المعني`,
          `مواصفات الخوادم الفيزيائية`
        ],
        correct_index: 0,
        explanation: `Runbook الأمني الفعّال يُمكّن أي محلل من اتخاذ قرار صحيح في ثوانٍ—بدون معايير تصنيف وخطوات احتواء واضحة، الـRunbook مجرد وثيقة تاريخية.`,
        difficulty: 2
      }
    ]]
  };
}

function makeStageExamQuestions(stageInfo) {
  const stageName = stageInfo.name;
  const stageUnits = stageInfo.units;
  return {
    pass_threshold_percent: stageInfo.exam.pass_threshold_percent,
    time_limit_minutes: stageInfo.exam.time_limit_minutes,
    variants: [[
      ...stageUnits.slice(0, 5).map((unit, i) => ({
        kind: "mcq",
        prompt: `في إطار ${stageName}، ما أهم ممارسة أمنية عند التعامل مع ${unit.name}؟`,
        choices: [
          `تطبيق Defense in Depth مع توثيق كامل ومراجعة دورية وفق معايير الصناعة`,
          `الاكتفاء بأداة أمن واحدة شاملة`,
          `تأجيل المراجعة الأمنية لما بعد النشر`,
          `الاعتماد على الإعدادات الافتراضية لتوفير الوقت`
        ],
        correct_index: 0,
        explanation: `${unit.name} في سياق ${stageName} يتطلب نهجاً متعدد الطبقات مع توثيق—أي اختصار يخلق ثغرة قابلة للاستغلال.`,
        difficulty: 2
      })),
      ...stageUnits.slice(5, 9).map((unit, i) => ({
        kind: "mcq",
        prompt: `ما العلاقة بين ${unit.name} والمكونات الأخرى في ${stageName} من منظور Kill Chain؟`,
        choices: [
          `${unit.name} قد يُشكّل ثغرة في Kill Chain تمكّن المهاجم من التقدم إذا لم يُعالَج`,
          `${unit.name} معزول تماماً ولا يؤثر على المكونات الأخرى`,
          `${unit.name} يحسّن الأداء فقط دون تأثير أمني`,
          `${unit.name} مخصص للاستخدام الداخلي وليس سطح هجوم`
        ],
        correct_index: 0,
        explanation: `في سلسلة ${stageName}، كل حلقة—بما فيها ${unit.name}—قد تُشكّل نقطة دخول. فهم الترابط ضروري للدفاع الفعّال.`,
        difficulty: 3
      })),
      {
        kind: "mcq",
        prompt: `بعد حادثة أمنية في ${stageName}، ما الخطوة الأهم في مرحلة التعلم لتجنّب التكرار؟`,
        choices: [
          `تحليل الجذر الحقيقي للحادثة وتطوير Playbook لمنعها ودمجه في عمليات SOC`,
          `إلقاء اللوم على المهندس المسؤول`,
          `تبديل جميع الأدوات الأمنية`,
          `توقف الخدمة حتى ضمان الأمان الكامل`
        ],
        correct_index: 0,
        explanation: `التعلم الحقيقي يعني Root Cause Analysis + Playbook جديد + تحديث الكشف—اللوم وتبديل الأدوات لا يمنعان الحادثة التالية.`,
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
        prompt: `في مستوى "${levelName}"، كيف يندمج ${unit.name} في استراتيجية الأمن الدفاعية الشاملة؟`,
        choices: [
          `${unit.name} يُشكّل طبقة دفاعية متكاملة تتفاعل مع بقية الضوابط لتقليص سطح الهجوم الكلي`,
          `${unit.name} يعمل بمعزل تام ولا يؤثر على الطبقات الأخرى`,
          `${unit.name} اختياري ولا يؤثر على مستوى الأمان العام`,
          `${unit.name} مخصص لفريق الـRed Team فقط`
        ],
        correct_index: 0,
        explanation: `في ${levelName}، Defense in Depth يعني أن كل مكوّن—بما فيه ${unit.name}—يعزّز الآخر؛ ضعف أي طبقة ينعكس على الصورة الكاملة.`,
        difficulty: i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 3
      })),
      ...[
        {
          prompt: `ما المقياس الأساسي لنضج برنامج الأمن في مستوى "${levelName}"؟`,
          choices: [
            `قدرة المؤسسة على الكشف عن الهجمات والتعافي منها بسرعة مع تحسّن مستمر في MTTD وMTTR`,
            `عدد الأدوات الأمنية المثبّتة`,
            `حجم ميزانية الأمن مقارنةً بالصناعة`,
            `غياب الحوادث الأمنية للسنوات الماضية`
          ],
          correct_index: 0,
          explanation: `النضج الأمني يُقاس بالكشف والاستجابة لا بالغياب الوهمي للحوادث—MTTD وMTTR هما المعياران الحقيقيان.`,
          difficulty: 2
        },
        {
          prompt: `لماذا يُعدّ الارتباط بين ${levelName} وأهداف الأعمال نقطة إستراتيجية حرجة؟`,
          choices: [
            `لأن برامج الأمن غير المتوافقة مع الأعمال تفقد الدعم التنفيذي وتصبح غير فعّالة على المدى البعيد`,
            `لأن الأمن يجب أن يُوقف الأعمال عند الحاجة`,
            `لأن الميزانية الأمنية مستقلة عن أهداف الأعمال`,
            `لأن القرارات الأمنية يجب أن تتجاهل احتياجات الأعمال`
          ],
          correct_index: 0,
          explanation: `الأمن بدون توافق مع الأعمال يتحوّل لعائق—والأعمال بدون أمن تُواجه مخاطر وجودية. التوافق هو أساس الاستدامة.`,
          difficulty: 3
        },
        {
          prompt: `أي من الآتي يُعبّر بدقة عن التطبيق الناضج لـ"${levelName}" في مؤسسة عالمية؟`,
          choices: [
            `إطار عمل موثّق مع مراجعة دورية ومحاكاة هجوم منتظمة وقياس مستمر للمؤشرات`,
            `تطبيق كل أداة أمنية متاحة بصرف النظر عن الحاجة`,
            `الاعتماد على خبرة الفريق دون توثيق أو إطار عمل`,
            `تبنّي كل تقنية جديدة فور ظهورها`
          ],
          correct_index: 0,
          explanation: `النضج في "${levelName}" = إطار + توثيق + اختبار مستمر + قياس. الأدوات وحدها أو الخبرة وحدها غير كافيتين.`,
          difficulty: 3
        }
      ]
    ]]
  };
}

function makePlacementTest(levels) {
  const questions = [];
  for (const level of levels) {
    const pickedStages = level.stages.filter((_, i) => i < 3);
    for (const stage of pickedStages) {
      const unit = stage.units[Math.floor(stage.units.length / 2)];
      const topic = unit.key_concepts[0];
      questions.push({
        target_level_index: level.level_index,
        target_stage_code: `${level.level_index}.${stage.stage_index}`,
        target_unit_code: unit.code,
        kind: "mcq",
        prompt: `سيناريو أمني: تعرّض نظام يعتمد على ${unit.name} لهجوم. كيف تتعامل مع ${topic} بشكل صحيح في الاستجابة؟`,
        choices: [
          `تطبيق ${topic} بمنهجية محكمة مع احتواء الحادثة وجمع الأدلة وتوثيق كل خطوة`,
          `تجاهل ${topic} وإعادة بناء النظام من الصفر فوراً`,
          `تطبيق ${topic} مباشرة على الإنتاج دون اختبار أو توثيق`,
          `الانتظار حتى تنتهي الهجمة قبل أي تدخل`
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
            session_complete_criterion: `يستطيع المتعلم شرح ${lesson.primary} وتطبيقه في سيناريو أمني حقيقي مع تمييز الإعداد الصحيح من الثغرة القابلة للاستغلال.`,
            expected_duration_minutes: 45,
            motivation_hook: `إتقان "${lesson.name}" يُفتح لك أبواباً مهنية حقيقية في الأمن السيبراني العالمي—كل فريق أمن يبحث عمن يُتقن هذه المهارة.`,
            learning_objectives: [
              { statement: `شرح آلية عمل ${lesson.primary.split(":")[0]} من منظور هجومي ودفاعي`, bloom_level: "understand" },
              { statement: `تطبيق ${lesson.primary.split(":")[0]} في سيناريو أمني محاكي ببيئة مختبرية`, bloom_level: "apply" }
            ],
            solution_outline: `فهم ${lesson.primary}، التطبيق الصحيح في المختبر، التحقق من النتيجة، ربطها بـMITRE ATT&CK، وتوثيق الإجراء.`
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

console.log("توليد ملف uni-cybersec-instruction.json...");
const result = buildFullFile();
const json = JSON.stringify(result, null, 2);
writeFileSync("uni-cybersec-instruction.json", json, "utf8");
const sizeKB = Math.round(json.length / 1024);
console.log(`تم الانتهاء. حجم الملف: ${sizeKB} KB`);
console.log(`عدد المستويات: ${result.levels.length}`);
console.log(`عدد المراحل الكلي: ${result.levels.reduce((a, l) => a + l.stages.length, 0)}`);
console.log(`عدد الوحدات الكلي: ${result.levels.reduce((a, l) => a + l.stages.reduce((b, s) => b + s.units.length, 0), 0)}`);
console.log(`عدد الدروس الكلي: ${result.levels.reduce((a, l) => a + l.stages.reduce((b, s) => b + s.units.reduce((c, u) => c + u.lessons.length, 0), 0), 0)}`);

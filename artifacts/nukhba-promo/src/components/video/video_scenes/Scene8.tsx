import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BrowserFrame, AppHeader, ChatBubble, TypewriterText, MousePointer } from '../Shared';

export const Scene8 = () => {
  const [showLab, setShowLab] = useState(false);
  const [labStep, setLabStep] = useState(0);

  useEffect(() => {
    setTimeout(() => setShowLab(true), 4000);
    setTimeout(() => setLabStep(1), 7000); // typing debit
    setTimeout(() => setLabStep(2), 9000); // typing credit
    setTimeout(() => setLabStep(3), 11000); // balanced
    setTimeout(() => setLabStep(4), 14000); // click t-account
  }, []);

  return (
    <motion.div
      key="scene8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center relative"
    >
      <BrowserFrame url="nukhba.app/subject/accounting">
        <AppHeader title="المحاسبة" />
        
        <div className="flex w-full h-full">
          {/* Chat Area (shrinks when lab opens) */}
          <motion.div 
            animate={{ width: showLab ? '30%' : '100%' }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="flex flex-col p-8 border-l border-white/5 h-full overflow-hidden shrink-0"
          >
            <ChatBubble isStudent>
              كيف أُسجّل قيد شراء بضاعة بـ ١٠٠٠ ريال نقداً؟
            </ChatBubble>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <ChatBubble>
                <TypewriterText text="ممتاز! دعنا نطبّقها في المختبر مباشرةً..." delay={1.2} />
                <br/>
                <motion.button 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 3 }}
                  className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg"
                >
                  افتح مختبر المحاسبة
                </motion.button>
              </ChatBubble>
            </motion.div>
          </motion.div>

          {/* Lab Area */}
          <AnimatePresence>
            {showLab && (
              <motion.div 
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="flex-1 bg-[#0d0d14] flex"
              >
                {/* Lab Sidebar */}
                <div className="w-56 border-l border-white/5 p-4 flex flex-col gap-2 shrink-0 bg-[#11111a]">
                  <div className="text-amber-400 text-xs font-bold mb-4 flex items-center gap-2">
                    <span className="text-xl">🎓</span> مختبر المحاسبة
                  </div>
                  {['المعادلة', 'دفتر اليومية', 'حسابات T', 'قائمة الدخل'].map((item, i) => (
                    <div 
                      key={item} 
                      className={`p-3 rounded-xl text-sm font-bold ${
                        (item === 'دفتر اليومية' && labStep < 4) || (item === 'حسابات T' && labStep >= 4)
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' 
                        : 'text-white/50 hover:bg-white/5'
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                {/* Lab Content */}
                <div className="flex-1 p-8 flex flex-col">
                  {labStep < 4 ? (
                    // Journal Entry UI
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-3xl mx-auto">
                      <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-white">دفتر القيود اليومية</h2>
                        {labStep >= 3 && (
                          <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }} 
                            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-bold border border-emerald-500/30"
                          >
                            ✓ القيد متوازن
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="bg-slate-900/80 rounded-2xl border border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-4 bg-slate-800 p-4 text-slate-300 font-bold text-center">
                          <div>التاريخ</div>
                          <div>البيان (الحساب)</div>
                          <div>مدين</div>
                          <div>دائن</div>
                        </div>
                        
                        <div className="p-4 space-y-2">
                          {/* Row 1: Debit */}
                          <div className="grid grid-cols-4 gap-4 items-center">
                            <div className="text-center text-slate-400">2023-10-01</div>
                            <div className="bg-slate-800 rounded p-2 text-white">المخزون (بضاعة)</div>
                            <div className="bg-slate-800 rounded p-2 text-center text-amber-400 font-mono text-lg">
                              {labStep >= 1 ? <TypewriterText text="1000" speed={0.1} /> : ""}
                            </div>
                            <div className="bg-slate-800 rounded p-2 text-center text-slate-500 font-mono">0</div>
                          </div>
                          
                          {/* Row 2: Credit */}
                          <div className="grid grid-cols-4 gap-4 items-center">
                            <div className="text-center text-slate-400"></div>
                            <div className="bg-slate-800 rounded p-2 text-white pr-8">الصندوق (نقدية)</div>
                            <div className="bg-slate-800 rounded p-2 text-center text-slate-500 font-mono">0</div>
                            <div className="bg-slate-800 rounded p-2 text-center text-emerald-400 font-mono text-lg">
                              {labStep >= 2 ? <TypewriterText text="1000" speed={0.1} /> : ""}
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end">
                          <motion.button 
                            animate={labStep >= 3 ? { backgroundColor: ['#10b981', '#059669', '#10b981'] } : {}}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className={`px-8 py-2 rounded-xl font-bold ${labStep >= 3 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                          >
                            ترحيل
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    // T-Account UI
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl mx-auto">
                      <h2 className="text-2xl font-bold text-white mb-10 text-center">حساب: الصندوق (1100)</h2>
                      
                      <div className="relative pt-10 px-10">
                        {/* The "T" Shape */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-slate-600 rounded-full" />
                        <div className="absolute top-0 left-1/2 bottom-0 w-2 -ml-1 bg-slate-600 rounded-full h-[400px]" />
                        
                        <div className="flex justify-between w-full relative z-10 text-xl font-bold text-slate-400 mb-8">
                          <div className="w-1/2 text-center">مدين (منه)</div>
                          <div className="w-1/2 text-center">دائن (له)</div>
                        </div>
                        
                        <div className="flex w-full">
                          <div className="w-1/2 pr-8 space-y-4">
                            <div className="flex justify-between text-lg text-slate-300">
                              <span>رصيد افتتاحي</span>
                              <span className="font-mono text-amber-400">50,000</span>
                            </div>
                          </div>
                          <div className="w-1/2 pl-8 space-y-4">
                            <motion.div 
                              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                              className="flex justify-between text-lg text-emerald-400 bg-emerald-500/10 p-2 rounded"
                            >
                              <span>شراء بضاعة</span>
                              <span className="font-mono">1,000</span>
                            </motion.div>
                          </div>
                        </div>
                        
                        <div className="mt-20 border-t-2 border-slate-500 pt-4 flex w-full">
                          <div className="w-1/2 pr-8 text-left text-2xl font-bold text-amber-500 font-mono">
                            49,000
                          </div>
                          <div className="w-1/2 pl-8 text-slate-500 text-sm">الرصيد المرحل</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BrowserFrame>

      {/* Mouse movements */}
      {!showLab && (
        <MousePointer animate={{ x: ["60vw", "35vw"], y: ["60vh", "55vh"], scale: [1, 0.8] }} />
      )}
      {showLab && labStep < 4 && (
        <MousePointer animate={{ x: ["35vw", "55vw", "65vw", "65vw"], y: ["55vh", "45vh", "55vh", "75vh"], scale: [0.8, 1, 1, 0.8] }} />
      )}
      {showLab && labStep >= 3 && labStep < 4 && (
        <MousePointer animate={{ x: ["65vw", "72vw", "72vw", "30vw"], y: ["75vh", "70vh", "70vh", "45vh"], scale: [0.8, 1, 0.8, 1] }} />
      )}
    </motion.div>
  );
};

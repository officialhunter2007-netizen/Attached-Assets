import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BrowserFrame, AppHeader, MousePointer } from '../Shared';

export const Scene6 = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const sequence = async () => {
      await new Promise(r => setTimeout(r, 2000)); // Loading
      setStep(1); // Q1
      await new Promise(r => setTimeout(r, 2500));
      setStep(2); // Q2
      await new Promise(r => setTimeout(r, 2000));
      setStep(3); // Result/Choice
    };
    sequence();
  }, []);

  return (
    <motion.div
      key="scene6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center relative"
    >
      <BrowserFrame url="nukhba.app/subject/web-dev">
        <AppHeader title="تطوير الويب" />
        
        <div className="flex-1 relative bg-[#0a0b10] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-8" />
                <h2 className="text-3xl font-bold text-white mb-4">جارٍ بناء بيئتك التطبيقية</h2>
                <p className="text-amber-400 text-xl animate-pulse">نُحلّل مستواك...</p>
              </motion.div>
            )}

            {(step === 1 || step === 2) && (
              <motion.div 
                key="question"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="w-full max-w-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-10"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-white">تشخيص في ٤ أسئلة</h3>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(dot => (
                      <div key={dot} className={`w-3 h-3 rounded-full ${dot <= (step === 1 ? 1 : 2) ? 'bg-amber-500' : 'bg-slate-700'}`} />
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-6 mb-10">
                  <p className="text-2xl text-indigo-100">
                    {step === 1 ? "ما مدى معرفتك بلغة HTML؟" : "هل سبق لك استخدام CSS لتنسيق الصفحات؟"}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {step === 1 ? (
                    <>
                      <div className="p-5 rounded-xl border border-slate-700 text-slate-300 text-xl">مبتدئ تماماً</div>
                      <motion.div 
                        animate={{ borderColor: ['#334155', '#f59e0b'], backgroundColor: ['transparent', 'rgba(245,158,11,0.1)'] }}
                        transition={{ delay: 1, duration: 0.2 }}
                        className="p-5 rounded-xl border-2 border-slate-700 text-white font-bold text-xl"
                      >
                        أعرف الأساسيات
                      </motion.div>
                      <div className="p-5 rounded-xl border border-slate-700 text-slate-300 text-xl">محترف</div>
                    </>
                  ) : (
                    <>
                      <div className="p-5 rounded-xl border border-slate-700 text-slate-300 text-xl">لا أبداً</div>
                      <div className="p-5 rounded-xl border border-slate-700 text-slate-300 text-xl">قليلاً جداً</div>
                      <motion.div 
                        animate={{ borderColor: ['#334155', '#f59e0b'], backgroundColor: ['transparent', 'rgba(245,158,11,0.1)'] }}
                        transition={{ delay: 1, duration: 0.2 }}
                        className="p-5 rounded-xl border-2 border-slate-700 text-white font-bold text-xl"
                      >
                        نعم، أستطيع بناء تخطيط كامل
                      </motion.div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="choice"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-4xl"
              >
                <h2 className="text-4xl font-bold text-white text-center mb-12">كيف تفضّل أن تتعلّم؟</h2>
                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-slate-900/60 border border-slate-700 rounded-3xl p-10 flex flex-col items-center text-center">
                    <span className="text-6xl mb-6">✨</span>
                    <h3 className="text-2xl font-bold text-amber-500 mb-4">المسار المخصص</h3>
                    <p className="text-slate-400 text-lg">مسار مبني خصيصاً لمستواك لتعلم المهارات بشكل أسرع.</p>
                  </div>
                  <motion.div 
                    animate={{ borderColor: ['#334155', '#8b5cf6'], boxShadow: ['none', '0 0 30px rgba(139,92,246,0.3)'] }}
                    transition={{ delay: 1, duration: 0.3 }}
                    className="bg-indigo-900/20 border-4 border-slate-700 rounded-3xl p-10 flex flex-col items-center text-center cursor-pointer"
                  >
                    <span className="text-6xl mb-6">📚</span>
                    <h3 className="text-2xl font-bold text-indigo-400 mb-4">منهج أستاذي</h3>
                    <p className="text-indigo-200/70 text-lg">ارفع كتابك أو ملزمتك الجامعية وسنشرحها لك خطوة بخطوة.</p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BrowserFrame>

      {step === 3 && (
        <MousePointer 
          animate={{ 
            x: ["50vw", "65vw", "65vw"], 
            y: ["80vh", "55vh", "55vh"], 
            scale: [1, 1, 0.8] 
          }} 
        />
      )}
    </motion.div>
  );
};

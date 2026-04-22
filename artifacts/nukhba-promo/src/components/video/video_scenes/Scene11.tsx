import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BrowserFrame, AppHeader, MousePointer } from '../Shared';

export const Scene11 = () => {
  const [part, setPart] = useState(1); // 1: Dashboard, 2: Quiz
  const [quizStep, setQuizStep] = useState(0);

  useEffect(() => {
    setTimeout(() => setPart(2), 10000);
    setTimeout(() => setQuizStep(1), 13000); // hover option B
    setTimeout(() => setQuizStep(2), 14000); // click option B (correct)
    setTimeout(() => setQuizStep(3), 16000); // final result
  }, []);

  return (
    <motion.div
      key="scene11"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center relative"
    >
      <BrowserFrame url={part === 1 ? "nukhba.app/dashboard" : "nukhba.app/quiz/final"}>
        <AppHeader title="لوحة التحكم" />
        
        <div className="flex-1 w-full h-full relative overflow-hidden p-8">
          <AnimatePresence mode="wait">
            {part === 1 && (
              <motion.div 
                key="dashboard"
                exit={{ scale: 1.1, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col h-full gap-8"
              >
                <h1 className="text-4xl font-bold text-white">أهلاً، أحمد 👋</h1>
                
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-6 flex items-center gap-4">
                    <div className="text-5xl">🏆</div>
                    <div>
                      <div className="text-slate-400 text-sm font-bold mb-1">نقاط النخبة</div>
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-4xl font-bold text-amber-400 font-mono"
                      >
                        1,250
                      </motion.div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 flex items-center gap-4">
                    <div className="text-5xl">🔥</div>
                    <div>
                      <div className="text-slate-400 text-sm font-bold mb-1">أيام متتالية</div>
                      <div className="text-4xl font-bold text-white font-mono mb-1">14</div>
                      <div className="text-orange-400 text-xs font-bold">سلسلتك مشتعلة!</div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-2">
                      <div className="text-slate-400 text-sm font-bold">نسبة التقدم الكلي</div>
                      <div className="text-emerald-400 text-xl font-bold font-mono">65%</div>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: "65%" }} 
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Courses */}
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">فصول تدرسها الآن</h2>
                  <div className="flex gap-4">
                    {['المحاسبة المالية 1', 'مقدمة في البرمجة', 'الشبكات والأمن'].map((c, i) => (
                      <div key={i} className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:bg-slate-800 transition-colors cursor-pointer">
                        <h3 className="text-lg font-bold text-white mb-2">{c}</h3>
                        <div className="text-amber-400 text-sm font-bold">متابعة التعلم ←</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lab Reports */}
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">تقارير المختبر الأخيرة</h2>
                  <div className="flex gap-4">
                    {['تقرير مختبر المحاسبة', 'تقرير المعمل السيبراني', 'تقرير معمل البرمجة'].map((r, i) => (
                      <div key={i} className="flex-1 bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                        <div className="text-2xl">🧪</div>
                        <div className="text-emerald-100 font-bold text-sm">{r}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {part === 2 && (
              <motion.div 
                key="quiz"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="absolute inset-0 bg-[#0a0b10] flex flex-col items-center justify-center p-12"
              >
                {quizStep < 3 ? (
                  <div className="w-full max-w-3xl bg-slate-900/80 border border-white/10 rounded-3xl p-10">
                    <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
                      <h2 className="text-2xl font-bold text-white">اختبار الفصل الأول — ١٠ أسئلة</h2>
                      <div className="text-amber-400 font-mono font-bold text-xl">السؤال 7/10</div>
                    </div>
                    
                    <h3 className="text-3xl text-white leading-relaxed mb-10 text-center">
                      أي من الحسابات التالية يعتبر من حسابات الأصول ويطبيعته مدين؟
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {['رأس المال', 'الصندوق (النقدية)', 'الدائنون', 'المبيعات'].map((opt, i) => {
                        const isCorrect = i === 1;
                        const isSelected = isCorrect && quizStep >= 2;
                        const isHovered = isCorrect && quizStep === 1;
                        
                        return (
                          <motion.div 
                            key={i}
                            animate={{ 
                              backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.2)' : isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                              borderColor: isSelected ? '#10b981' : isHovered ? '#334155' : '#1e293b'
                            }}
                            className="p-6 rounded-2xl border-2 flex items-center gap-4 text-xl text-white cursor-pointer"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                              {isSelected ? '✓' : ['أ', 'ب', 'ج', 'د'][i]}
                            </div>
                            {opt}
                          </motion.div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-10 flex justify-between items-center text-slate-400">
                      <span>النتيجة الحالية: ٨٥٪</span>
                      <div className="w-1/2 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: '70%' }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="text-9xl mb-8">🏆</div>
                    <h2 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600 mb-6">
                      ممتاز!
                    </h2>
                    <p className="text-3xl text-white mb-12">اجتزتَ الامتحان النهائي بـ <span className="text-emerald-400 font-bold text-5xl">٩٢٪</span></p>
                    <div className="px-10 py-4 bg-white text-slate-900 font-bold rounded-xl text-xl">
                      استلام الشهادة
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BrowserFrame>

      {part === 2 && quizStep >= 1 && quizStep < 3 && (
        <MousePointer animate={{ x: ["50vw", "45vw", "45vw"], y: ["60vh", "50vh", "50vh"], scale: [1, 1, 0.8] }} />
      )}
    </motion.div>
  );
};

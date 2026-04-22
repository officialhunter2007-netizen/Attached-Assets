import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BrowserFrame, AppHeader, TypewriterText, MousePointer } from '../Shared';

export const Scene12 = () => {
  const [step, setStep] = useState(1);

  useEffect(() => {
    setTimeout(() => setStep(2), 6000); // checkout
    setTimeout(() => setStep(3), 8000); // type code
    setTimeout(() => setStep(4), 11000); // apply code
    setTimeout(() => setStep(5), 15000); // outro
  }, []);

  return (
    <motion.div
      key="scene12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center relative"
    >
      <AnimatePresence mode="wait">
        {step < 5 ? (
          <motion.div 
            key="browser"
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8 }}
            className="w-full h-full flex items-center justify-center"
          >
            <BrowserFrame url="nukhba.app/pricing">
              <AppHeader title="الاشتراكات" />
              
              <div className="flex-1 w-full h-full overflow-hidden bg-[#0a0b10] flex flex-col items-center p-8">
                
                <motion.div 
                  animate={{ y: step >= 2 ? -300 : 0, opacity: step >= 2 ? 0.2 : 1 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="flex justify-center gap-8 w-full max-w-6xl mt-10"
                >
                  {/* Bronze */}
                  <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex flex-col">
                    <h3 className="text-2xl text-white font-bold mb-2">الباقة الأساسية</h3>
                    <div className="text-4xl font-bold text-white mb-6 font-mono">15,000 <span className="text-lg text-slate-500">ريال/شهر</span></div>
                    <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center gap-2 text-slate-300"><span className="text-amber-500">✓</span> مسار تعليمي واحد</li>
                      <li className="flex items-center gap-2 text-slate-300"><span className="text-amber-500">✓</span> مختبرات تفاعلية</li>
                    </ul>
                  </div>

                  {/* Silver (Featured) */}
                  <div className="flex-1 bg-amber-500/10 border-2 border-amber-500 rounded-3xl p-8 flex flex-col relative transform scale-105 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                      الأكثر طلباً
                    </div>
                    <h3 className="text-2xl text-amber-400 font-bold mb-2">باقة النخبة</h3>
                    <div className="text-4xl font-bold text-white mb-6 font-mono">25,000 <span className="text-lg text-slate-500">ريال/شهر</span></div>
                    <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center gap-2 text-white"><span className="text-amber-500">✓</span> كل المسارات التعليمية</li>
                      <li className="flex items-center gap-2 text-white"><span className="text-amber-500">✓</span> منهج أستاذي (غير محدود)</li>
                      <li className="flex items-center gap-2 text-white"><span className="text-amber-500">✓</span> جميع المختبرات المتقدمة</li>
                      <li className="flex items-center gap-2 text-white"><span className="text-amber-500">✓</span> شهادات معتمدة</li>
                    </ul>
                    <div className="w-full py-3 bg-amber-500 text-slate-900 font-bold rounded-xl text-center">
                      اختر هذه الباقة
                    </div>
                  </div>

                  {/* Gold */}
                  <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex flex-col">
                    <h3 className="text-2xl text-white font-bold mb-2">الباقة السنوية</h3>
                    <div className="text-4xl font-bold text-white mb-6 font-mono">200,000 <span className="text-lg text-slate-500">ريال/سنة</span></div>
                    <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-center gap-2 text-slate-300"><span className="text-amber-500">✓</span> كل ميزات باقة النخبة</li>
                      <li className="flex items-center gap-2 text-slate-300"><span className="text-amber-500">✓</span> توفير شهرين مجاناً</li>
                    </ul>
                  </div>
                </motion.div>

                {/* Checkout Form */}
                <motion.div 
                  initial={{ y: 500, opacity: 0 }}
                  animate={{ y: step >= 2 ? -350 : 500, opacity: step >= 2 ? 1 : 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative z-10"
                >
                  <h2 className="text-2xl font-bold text-white mb-6">إتمام الاشتراك — باقة النخبة</h2>
                  
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="text-slate-400 text-sm mb-2 block">اسم صاحب الحساب</label>
                      <div className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-white">أحمد محمد</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-sm mb-2 block">كود الخصم (اختياري)</label>
                        <div className="flex gap-2">
                          <div className="flex-1 p-3 bg-slate-800 rounded-xl border border-slate-700 text-amber-400 font-mono font-bold tracking-widest flex items-center">
                            {step >= 3 && <TypewriterText text="NUKHBA20" speed={0.1} />}
                          </div>
                          <motion.div 
                            animate={step >= 4 ? { backgroundColor: '#10b981', color: '#fff' } : {}}
                            className="px-6 py-3 bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center"
                          >
                            {step === 4 ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : step > 4 ? '✓' : 'تطبيق'}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {step > 4 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, mb: 0 }}
                        animate={{ opacity: 1, height: 'auto', mb: 24 }}
                        className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl font-bold flex items-center gap-2"
                      >
                        <span>✓</span> تم تطبيق الخصم بنجاح — وفّرت 5,000 ريال
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="border-t border-slate-800 pt-6 flex justify-between items-center">
                    <div className="text-white font-bold text-xl">الإجمالي:</div>
                    <div className="text-4xl font-bold text-amber-400 font-mono">
                      {step > 4 ? '20,000' : '25,000'} <span className="text-lg text-amber-500/50">ريال</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </BrowserFrame>
          </motion.div>
        ) : (
          <motion.div 
            key="outro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 flex flex-col items-center justify-center z-50"
          >
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15, delay: 0.5 }}
              className="w-48 h-48 rounded-full bg-white flex items-center justify-center mb-8 shadow-2xl"
            >
              <span className="text-amber-500 text-8xl font-bold">ن</span>
            </motion.div>
            
            <motion.h1 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-8xl font-bold text-white mb-6 drop-shadow-lg"
            >
              نُخبة
            </motion.h1>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-4xl text-white/90 font-bold mb-4 drop-shadow-md"
            >
              ابدأ رحلتك مع معلّمك الشخصي
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              className="px-6 py-2 bg-black/20 rounded-full text-amber-200 text-xl font-bold border border-white/20 backdrop-blur-sm"
            >
              الدرس الأول مجّاني في كل مادة
            </motion.div>
            
            {/* Ambient background particles */}
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              animate={{ backgroundPosition: ["0px 0px", "100px 100px"] }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 2px, transparent 2px)', backgroundSize: '50px 50px' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {step >= 3 && step < 5 && (
        <MousePointer animate={{ x: ["50vw", "45vw", "45vw"], y: ["60vh", "65vh", "65vh"], scale: [1, 1, 0.8] }} />
      )}
      {step === 4 && (
        <MousePointer animate={{ x: ["45vw", "55vw", "55vw"], y: ["65vh", "65vh", "65vh"], scale: [0.8, 1, 0.8] }} />
      )}
    </motion.div>
  );
};

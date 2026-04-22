import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BrowserFrame, AppHeader, TypewriterText, MousePointer } from '../Shared';

export const Scene12 = () => {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const t = [
      setTimeout(() => setStep(2), 5000),  // checkout slides up
      setTimeout(() => setStep(3), 7500),  // type discount code
      setTimeout(() => setStep(4), 10500), // press apply (spinner)
      setTimeout(() => setStep(5), 12500), // success banner + price drop
      setTimeout(() => setStep(6), 18000), // transition to outro
    ];
    return () => t.forEach(clearTimeout);
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
        {step < 6 ? (
          <motion.div
            key="browser"
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8 }}
            className="w-full h-full flex items-center justify-center"
          >
            <BrowserFrame url="nukhba.app/subscription">
              <AppHeader title="الاشتراكات" />

              <div className="flex-1 w-full h-full overflow-hidden bg-[#0a0b10] flex flex-col items-center p-8">

                <motion.div
                  animate={{ y: step >= 2 ? -300 : 0, opacity: step >= 2 ? 0.2 : 1 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="flex justify-center gap-6 w-full max-w-6xl mt-8"
                >
                  {/* البرونزية (Bronze) */}
                  <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex flex-col">
                    <div className="text-amber-700/80 text-sm font-bold mb-1">شهري</div>
                    <h3 className="text-2xl text-white font-bold mb-3">البرونزية</h3>
                    <div className="text-4xl font-bold text-white mb-6 font-mono">8,000 <span className="text-base text-slate-500">ريال/شهر</span></div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm">
                      <li className="flex items-center gap-2 text-slate-300"><span className="text-amber-500">✓</span> مادة واحدة من اختيارك</li>
                      <li className="flex items-center gap-2 text-slate-300"><span className="text-amber-500">✓</span> المعلّم الذكي + المختبرات</li>
                      <li className="flex items-center gap-2 text-slate-300"><span className="text-amber-500">✓</span> الاختبارات والملخصات</li>
                    </ul>
                  </div>

                  {/* الفضية (Silver — featured) */}
                  <div className="flex-1 bg-amber-500/10 border-2 border-amber-500 rounded-3xl p-8 flex flex-col relative transform scale-105 shadow-[0_0_30px_rgba(245,158,11,0.18)]">
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                      الأكثر طلباً
                    </div>
                    <div className="text-amber-300 text-sm font-bold mb-1">فصلي</div>
                    <h3 className="text-2xl text-amber-400 font-bold mb-3">الفضية</h3>
                    <div className="text-4xl font-bold text-white mb-6 font-mono">25,000 <span className="text-base text-slate-500">ريال/فصل</span></div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm">
                      <li className="flex items-center gap-2 text-white"><span className="text-amber-500">✓</span> ٣ مواد كاملة</li>
                      <li className="flex items-center gap-2 text-white"><span className="text-amber-500">✓</span> منهج أستاذي (PDF غير محدود)</li>
                      <li className="flex items-center gap-2 text-white"><span className="text-amber-500">✓</span> جميع المختبرات المتقدّمة</li>
                      <li className="flex items-center gap-2 text-white"><span className="text-amber-500">✓</span> دعم أولوية + شهادات</li>
                    </ul>
                  </div>

                  {/* الذهبية (Gold) */}
                  <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex flex-col">
                    <div className="text-yellow-500/80 text-sm font-bold mb-1">سنوي</div>
                    <h3 className="text-2xl text-white font-bold mb-3">الذهبية</h3>
                    <div className="text-4xl font-bold text-white mb-6 font-mono">75,000 <span className="text-base text-slate-500">ريال/سنة</span></div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm">
                      <li className="flex items-center gap-2 text-slate-300"><span className="text-amber-500">✓</span> كل ميزات الفضية</li>
                      <li className="flex items-center gap-2 text-slate-300"><span className="text-amber-500">✓</span> وصول لكل المسارات</li>
                      <li className="flex items-center gap-2 text-slate-300"><span className="text-amber-500">✓</span> توفير ٢٥٪ مقابل الشهري</li>
                    </ul>
                  </div>
                </motion.div>

                {/* Checkout Form */}
                <motion.div
                  initial={{ y: 500, opacity: 0 }}
                  animate={{ y: step >= 2 ? -320 : 500, opacity: step >= 2 ? 1 : 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative z-10"
                >
                  <h2 className="text-2xl font-bold text-white mb-6">إتمام الاشتراك — الباقة الفضية</h2>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-slate-400 text-sm mb-2 block">اسم صاحب الحساب</label>
                      <div className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-white">أحمد محمد</div>
                    </div>

                    <div>
                      <label className="text-slate-400 text-sm mb-2 block">كود الخصم (اختياري)</label>
                      <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-slate-800 rounded-xl border border-slate-700 text-amber-400 font-mono font-bold tracking-widest flex items-center min-h-[52px]">
                          {step >= 3 && <TypewriterText text="NUKHBA20" speed={0.1} />}
                        </div>
                        <motion.div
                          animate={step >= 5 ? { backgroundColor: '#10b981', color: '#fff' } : {}}
                          transition={{ duration: 0.4 }}
                          className="px-6 py-3 bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center min-w-[100px]"
                        >
                          {step === 4 ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : step >= 5 ? '✓' : 'تطبيق'}
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {step >= 5 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 p-4 rounded-xl font-bold flex items-center gap-3 overflow-hidden"
                      >
                        <span className="text-2xl">✓</span>
                        <div>
                          <div>تم تطبيق الخصم بنجاح</div>
                          <div className="text-emerald-300/90 text-sm font-normal mt-0.5">وفّرت <span className="font-bold text-emerald-300">5,000 ريال</span> على اشتراكك</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="border-t border-slate-800 pt-6 flex justify-between items-center">
                    <div className="text-white font-bold text-xl">الإجمالي:</div>
                    <div className="flex items-baseline gap-3">
                      <AnimatePresence>
                        {step >= 5 && (
                          <motion.span
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-xl text-slate-500 line-through font-mono"
                          >
                            25,000
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <motion.div
                        key={step >= 5 ? 'discounted' : 'full'}
                        initial={{ scale: 1.2, color: '#10b981' }}
                        animate={{ scale: 1, color: step >= 5 ? '#10b981' : '#fbbf24' }}
                        transition={{ duration: 0.5, type: 'spring' }}
                        className="text-4xl font-bold font-mono"
                      >
                        {step >= 5 ? '20,000' : '25,000'}
                      </motion.div>
                      <span className="text-lg text-amber-500/60">ريال</span>
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
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 flex flex-col items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15, delay: 0.2 }}
              className="w-44 h-44 rounded-3xl bg-white flex items-center justify-center mb-8 shadow-2xl"
            >
              <span className="text-amber-500 text-8xl font-bold">ن</span>
            </motion.div>

            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-7xl font-bold text-white mb-5 drop-shadow-lg"
            >
              نُخبة
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-3xl text-white/95 font-bold mb-4 drop-shadow-md text-center px-8"
            >
              ابدأ رحلتك مع معلّمك الشخصي
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
              className="px-6 py-2 bg-black/20 rounded-full text-amber-100 text-lg font-bold border border-white/30 backdrop-blur-sm"
            >
              الدرس الأول مجّاني في كل مادة
            </motion.div>

            {/* Ambient drift to keep frames moving until loop */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ backgroundPosition: ["0px 0px", "100px 100px"] }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
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

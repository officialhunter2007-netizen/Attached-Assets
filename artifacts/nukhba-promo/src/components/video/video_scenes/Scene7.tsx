import { motion } from 'framer-motion';
import { BrowserFrame, AppHeader, ChatBubble, TypewriterText, CitationChip, MousePointer } from '../Shared';

export const Scene7 = () => {
  return (
    <motion.div
      key="scene7"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center relative"
    >
      <BrowserFrame url="nukhba.app/lesson/statistics/normal-distribution">
        <AppHeader title="منهج أستاذي — أساسيات الإحصاء" />

        {/* Lesson page intro (z-30, fades at 3s) */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ delay: 3, duration: 0.5 }}
          className="absolute inset-0 top-[60px] z-30 bg-[#0a0b10] flex"
        >
          {/* Chapters sidebar */}
          <div className="w-72 border-l border-white/5 bg-slate-900/40 p-5 overflow-hidden">
            <div className="text-slate-400 text-xs font-bold mb-4">فهرس الفصول</div>
            <div className="space-y-2">
              {[
                { n: '١', t: 'مقدمة في الإحصاء', done: true },
                { n: '٢', t: 'مقاييس النزعة المركزية', done: true },
                { n: '٣', t: 'التوزيع الطبيعي', active: true },
                { n: '٤', t: 'الانحراف المعياري', done: false },
                { n: '٥', t: 'الاحتمالات', done: false },
              ].map((c, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl text-sm ${c.active ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300' : 'text-slate-300'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${c.active ? 'bg-amber-500 text-slate-900' : c.done ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                    {c.done ? '✓' : c.n}
                  </div>
                  <span className="flex-1">{c.t}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Lesson content */}
          <div className="flex-1 p-10 overflow-hidden">
            <div className="text-amber-400 text-sm font-bold mb-2">الفصل الثالث</div>
            <h1 className="text-4xl font-bold text-white mb-4">التوزيع الطبيعي</h1>
            <div className="flex items-center gap-4 text-slate-400 text-sm mb-8">
              <span>⏱ ١٢ دقيقة</span>
              <span>•</span>
              <span>📚 ٤ تمارين</span>
              <span>•</span>
              <span>التقدّم ٤٢٪</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-6">
              <p className="text-slate-200 leading-loose text-lg">
                التوزيع الطبيعي هو أحد أهم التوزيعات في الإحصاء، ويُعرف بشكله الجرسي المتماثل حول المتوسط الحسابي. يُستخدم لوصف ظواهر طبيعية كثيرة مثل الأطوال والأوزان والدرجات.
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="flex items-center gap-3"
            >
              <div className="px-5 py-3 bg-amber-500 text-slate-900 rounded-xl font-bold flex items-center gap-2">
                <span>💬</span> اسأل المعلّم الذكي
              </div>
              <div className="px-5 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold border border-slate-700">
                التالي ←
              </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="flex w-full h-full">
          {/* Chat Area */}
          <div className="flex-[2] flex flex-col p-8 relative">
            {/* Upload Overlay Animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ delay: 3, duration: 3, times: [0, 0.05, 0.85, 1] }}
              style={{ pointerEvents: 'none' }}
              className="absolute inset-0 bg-[#0a0b10] z-20 flex flex-col items-center justify-center"
            >
              <div className="w-full max-w-lg border-2 border-dashed border-indigo-500/50 rounded-3xl p-12 flex flex-col items-center bg-indigo-900/10">
                <motion.div 
                  initial={{ y: -100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-24 h-32 bg-red-500/20 border-2 border-red-500/50 rounded-xl flex items-center justify-center mb-8 relative"
                >
                  <span className="text-red-400 font-bold text-xl">PDF</span>
                  <div className="absolute -bottom-4 bg-slate-800 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap">
                    كتاب أساسيات الإحصاء — د. محمد
                  </div>
                </motion.div>
                
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "linear" }}
                    className="h-full bg-emerald-500"
                  />
                </div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="text-emerald-400 font-bold"
                >
                  ✓ تم الفهرسة: ١٤٢ صفحة، ١٢ فصلاً
                </motion.p>
              </div>
            </motion.div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden flex flex-col gap-5 pt-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 6 }}>
                <ChatBubble isStudent>
                  لم أفهم التوزيع الطبيعي في هذا المقرر، هل يمكن تبسيطه؟
                </ChatBubble>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 7 }}>
                <ChatBubble>
                  <TypewriterText
                    text="التوزيع الطبيعي يعني أن أغلب البيانات تتجمّع حول المتوسط، ويأخذ شكل الجرس. في كتابك المنهجي، يذكر الدكتور أن المساحة تحت المنحنى دائماً تساوي ١."
                    delay={7.2}
                    speed={0.02}
                  />
                  <br/>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 11 }}>
                    <CitationChip text="📄 ص ٤٢ — كتابك" />
                  </motion.div>
                </ChatBubble>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 12 }}>
                <ChatBubble isStudent>
                  وما الفرق بينه وبين التوزيع المنتظم؟
                </ChatBubble>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 13 }}>
                <ChatBubble>
                  <TypewriterText
                    text="في التوزيع المنتظم، كل القيم لها نفس احتمالية الحدوث (شكل مستطيل)، بينما الطبيعي تتركز القيم في المنتصف."
                    delay={13.2}
                    speed={0.02}
                  />
                  <br/>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 15.5 }}>
                    <CitationChip text="📄 ص ٤٧" />
                  </motion.div>
                </ChatBubble>
              </motion.div>

              {/* Session summary card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 17.5, duration: 0.6 }}
                className="mt-2 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/40 rounded-2xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.12)]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-400 text-lg">📌</span>
                  <span className="text-amber-300 font-bold text-sm">ملخّص الجلسة</span>
                  <span className="text-slate-500 text-xs mr-auto">٣ نقاط مفتاحية</span>
                </div>
                <ul className="space-y-2 text-slate-200 text-sm leading-relaxed">
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> التوزيع الطبيعي شكله جرسي ومتماثل حول المتوسط.</li>
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> المساحة الكلية تحت المنحنى تساوي ١.</li>
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> التوزيع المنتظم مستطيل الشكل، بينما الطبيعي تتركّز قيمه في المنتصف.</li>
                </ul>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-500/20 text-xs">
                  <span className="text-amber-400 font-bold">💾 احفظ في دفتر الملاحظات</span>
                  <span className="text-slate-500 mr-auto">المراجع: ص ٤٢، ص ٤٧</span>
                </div>
              </motion.div>
            </div>
            
            <div className="h-16 mt-4 border border-slate-700/50 bg-slate-900/50 rounded-2xl flex items-center px-4">
              <span className="text-slate-500">اكتب رسالتك هنا...</span>
            </div>
          </div>

          {/* PDF Panel */}
          <div className="flex-[1.2] border-r border-white/5 bg-[#11131a] flex flex-col">
            <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-slate-900/30">
              <span className="text-slate-300 text-sm font-bold truncate">أساسيات الإحصاء.pdf</span>
              <span className="text-slate-500 text-sm">ص ٤٢</span>
            </div>
            <div className="flex-1 p-8 flex justify-center bg-white/5">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 8 }}
                className="w-full bg-white rounded-lg shadow-xl p-8 overflow-hidden relative"
              >
                <div className="w-1/2 h-4 bg-slate-200 mb-6 rounded" />
                <div className="w-full h-3 bg-slate-100 mb-3 rounded" />
                <div className="w-5/6 h-3 bg-slate-100 mb-10 rounded" />
                
                {/* Bell Curve Chart */}
                <div className="w-full h-40 border-b-2 border-slate-300 relative flex items-end justify-center mb-10">
                  <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                    <motion.path 
                      d="M 0,50 Q 25,50 40,20 T 50,0 T 60,20 T 100,50" 
                      fill="rgba(59, 130, 246, 0.2)" 
                      stroke="#3b82f6" 
                      strokeWidth="2"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 8.5, duration: 1.5 }}
                    />
                    <motion.line 
                      x1="50" y1="0" x2="50" y2="50" 
                      stroke="#ef4444" strokeWidth="1" strokeDasharray="2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 10 }}
                    />
                  </svg>
                </div>
                
                <div className="w-full h-3 bg-slate-100 mb-3 rounded" />
                <div className="w-3/4 h-3 bg-slate-100 rounded" />
              </motion.div>
            </div>
          </div>
        </div>
      </BrowserFrame>
    </motion.div>
  );
};

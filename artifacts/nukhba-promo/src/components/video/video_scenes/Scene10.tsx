import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BrowserFrame, AppHeader, TypewriterText, MousePointer } from '../Shared';

export const Scene10 = () => {
  const [part, setPart] = useState(1); // 1: Code, 2: YemenSoft
  const [codeStep, setCodeStep] = useState(0);

  useEffect(() => {
    setTimeout(() => setCodeStep(1), 1000); // start typing
    setTimeout(() => setCodeStep(2), 6000); // run
    setTimeout(() => setPart(2), 10000); // switch to yemensoft
  }, []);

  return (
    <motion.div
      key="scene10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center relative"
    >
      <BrowserFrame url={part === 1 ? "nukhba.app/lab/python" : "nukhba.app/lab/yemensoft"}>
        <AppHeader title={part === 1 ? "مختبر البرمجة (Python)" : "مختبر الأنظمة — يمن سوفت"} />
        
        <div className="flex-1 w-full h-full relative bg-[#1e1e1e] overflow-hidden">
          <AnimatePresence mode="wait">
            {part === 1 && (
              <motion.div 
                key="vscode"
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 flex"
              >
                {/* VS Code Sidebar */}
                <div className="w-64 bg-[#252526] border-l border-[#333] flex flex-col text-[#cccccc] text-sm">
                  <div className="px-4 py-2 uppercase text-xs tracking-wider border-b border-[#333]">مستكشف الملفات</div>
                  <div className="p-2">
                    <div className="flex items-center gap-2 py-1 px-2 hover:bg-[#2a2d2e] cursor-default">
                      <span>📂</span> src
                    </div>
                    <div className="flex items-center gap-2 py-1 px-4 bg-[#37373d] text-white cursor-default">
                      <span className="text-blue-400">🐍</span> main.py
                    </div>
                    <div className="flex items-center gap-2 py-1 px-4 hover:bg-[#2a2d2e] cursor-default">
                      <span className="text-blue-400">🐍</span> utils.py
                    </div>
                  </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col bg-[#1e1e1e]">
                  {/* Tabs */}
                  <div className="h-10 bg-[#2d2d2d] flex items-center">
                    <div className="px-4 h-full bg-[#1e1e1e] border-t-2 border-blue-500 text-white flex items-center gap-2">
                      <span className="text-blue-400">🐍</span> main.py
                    </div>
                    <div className="px-4 h-full text-[#969696] flex items-center gap-2">
                      <span className="text-blue-400">🐍</span> utils.py
                    </div>
                    <div className="flex-1" />
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="ml-4 px-4 py-1 bg-emerald-600 text-white rounded text-sm flex items-center gap-1 cursor-pointer mr-4"
                    >
                      ▶ تشغيل
                    </motion.div>
                  </div>

                  {/* Code */}
                  <div className="flex-1 p-4 font-mono text-lg text-[#d4d4d4] leading-loose flex">
                    <div className="text-[#858585] pr-4 text-right select-none border-l border-[#404040] ml-4">
                      1<br/>2<br/>3<br/>4
                    </div>
                    <div>
                      {codeStep >= 1 && (
                        <TypewriterText 
                          text={`def calculate_total(prices):\n    return sum(prices)\n\nprint(calculate_total([100, 250, 75]))`} 
                          speed={0.03} 
                        />
                      )}
                    </div>
                  </div>

                  {/* Terminal */}
                  <div className="h-48 border-t border-[#333] bg-[#1e1e1e] flex flex-col">
                    <div className="h-8 border-b border-[#333] px-4 flex items-center text-xs text-[#e7e7e7]">
                      TERMINAL
                    </div>
                    <div className="p-4 font-mono text-sm">
                      <div className="text-green-400 mb-2">nukhba@python-lab:~/src$ python main.py</div>
                      {codeStep >= 2 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <span className="text-white text-lg">425</span>
                          <span className="text-emerald-500 mr-2">✓ 실행 ناجح</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
                
                {codeStep >= 1 && codeStep < 2 && (
                  <MousePointer animate={{ x: ["50vw", "75vw", "75vw"], y: ["60vh", "35vh", "35vh"], scale: [1, 1, 0.8] }} />
                )}
              </motion.div>
            )}

            {part === 2 && (
              <motion.div 
                key="yemensoft"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 flex flex-col bg-slate-100"
              >
                {/* ERP Header */}
                <div className="h-14 bg-teal-800 flex items-center px-6 shadow-md z-10">
                  <div className="text-white font-bold text-xl flex items-center gap-2">
                    <span>🏢</span> المتكامل برو — بيئة التدريب
                  </div>
                  <div className="mr-auto flex gap-4 text-teal-100">
                    <div className="hover:text-white pb-1 border-b-2 border-amber-400 font-bold">الفواتير</div>
                    <div className="hover:text-white pb-1 border-b-2 border-transparent">القيود</div>
                    <div className="hover:text-white pb-1 border-b-2 border-transparent">الحسابات</div>
                    <div className="hover:text-white pb-1 border-b-2 border-transparent">المخزون</div>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="h-12 bg-white border-b border-slate-300 flex items-center px-4 gap-2">
                  <div className="px-4 py-1.5 bg-teal-600 text-white rounded shadow-sm text-sm font-bold flex items-center gap-1">
                    <span>+</span> إضافة فاتورة مبيعات
                  </div>
                  <div className="w-px h-6 bg-slate-300 mx-2" />
                  <div className="px-4 py-1.5 text-slate-600 rounded border border-slate-300 text-sm">بحث...</div>
                </div>

                {/* Data Grid */}
                <div className="flex-1 p-6">
                  <div className="bg-white border border-slate-300 rounded shadow-sm">
                    <div className="grid grid-cols-5 bg-slate-200 p-3 font-bold text-slate-700 border-b border-slate-300">
                      <div>رقم الفاتورة</div>
                      <div className="col-span-2">العميل</div>
                      <div>المبلغ (ريال)</div>
                      <div>الحالة</div>
                    </div>
                    {[
                      { id: 'INV-2023-001', name: 'شركة الأفق للتجارة', amount: '150,000', status: 'مرحل', color: 'text-green-600' },
                      { id: 'INV-2023-002', name: 'محلات السعادة', amount: '45,500', status: 'مرحل', color: 'text-green-600' },
                      { id: 'INV-2023-003', name: 'مؤسسة البناء', amount: '320,000', status: 'مسودة', color: 'text-amber-600' },
                    ].map((row, i) => (
                      <div key={i} className="grid grid-cols-5 p-3 border-b border-slate-200 text-slate-800">
                        <div className="font-mono">{row.id}</div>
                        <div className="col-span-2">{row.name}</div>
                        <div className="font-mono">{row.amount}</div>
                        <div className={`font-bold ${row.color}`}>{row.status}</div>
                      </div>
                    ))}
                  </div>

                  {/* Add Modal Pop-up animation */}
                  <motion.div 
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1, duration: 0.4 }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] bg-white rounded-lg shadow-2xl border border-slate-300 overflow-hidden"
                    style={{ translateX: "-50%", translateY: "-50%" }}
                  >
                    <div className="bg-teal-700 text-white p-3 font-bold flex justify-between">
                      <span>فاتورة مبيعات جديدة</span>
                      <span>✕</span>
                    </div>
                    <div className="p-6 space-y-4 text-slate-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">العميل</label>
                          <div className="border border-teal-500 rounded p-2 text-sm bg-teal-50">عميل نقدي</div>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">التاريخ</label>
                          <div className="border border-slate-300 rounded p-2 text-sm">2023-10-25</div>
                        </div>
                      </div>
                      <div className="border border-slate-300 rounded overflow-hidden">
                        <div className="bg-slate-100 p-2 text-xs font-bold text-slate-600 border-b border-slate-300">تفاصيل الأصناف</div>
                        <div className="p-2 flex gap-2">
                          <div className="flex-1 border border-teal-500 rounded p-1 text-sm bg-teal-50">لابتوب Dell</div>
                          <div className="w-16 border border-slate-300 rounded p-1 text-sm text-center">1</div>
                          <div className="w-24 border border-slate-300 rounded p-1 text-sm text-center">150000</div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <div className="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm font-bold">إلغاء</div>
                        <div className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-bold">حفظ وترحيل</div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Status bar */}
                <div className="h-8 bg-teal-900 text-teal-100 text-xs flex items-center px-4">
                  بيئة يمن سوفت التطبيقية — متّصل <span className="ml-2 w-2 h-2 rounded-full bg-green-400 inline-block" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BrowserFrame>

      {part === 2 && (
        <MousePointer animate={{ x: ["50vw", "40vw", "40vw"], y: ["50vh", "65vh", "65vh"], scale: [1, 1, 0.8] }} />
      )}
    </motion.div>
  );
};

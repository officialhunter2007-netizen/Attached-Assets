import { motion } from 'framer-motion';
import { BrowserFrame, AppHeader, MousePointer } from '../Shared';

export const Scene5 = () => {
  return (
    <motion.div
      key="scene5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center relative"
    >
      <BrowserFrame url="nukhba.app/learn">
        <AppHeader />
        
        <div className="p-12 w-full h-full flex flex-col">
          <h1 className="text-4xl font-bold text-white mb-10 text-center">مسارات التعلم</h1>
          
          {/* Tabs */}
          <div className="flex justify-center mb-12">
            <div className="bg-slate-900/80 p-2 rounded-2xl flex gap-2 border border-slate-700/50">
              <motion.div 
                animate={{ backgroundColor: ['#059669', '#1e293b'], color: ['#ffffff', '#94a3b8'] }}
                transition={{ delay: 2, duration: 0.3 }}
                className="px-10 py-3 rounded-xl font-bold text-xl"
              >
                الجامعي
              </motion.div>
              <motion.div 
                animate={{ backgroundColor: ['transparent', '#2563eb'], color: ['#94a3b8', '#ffffff'] }}
                transition={{ delay: 2, duration: 0.3 }}
                className="px-10 py-3 rounded-xl font-bold text-xl"
              >
                المهارات
              </motion.div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="relative flex-1">
            {/* University Cards */}
            <motion.div 
              animate={{ opacity: [1, 0], pointerEvents: ['auto', 'none'] }}
              transition={{ delay: 2.1, duration: 0.3 }}
              className="absolute inset-0 grid grid-cols-3 gap-8"
            >
              {[
                { title: 'المحاسبة', emoji: '📊', progress: '30%' },
                { title: 'تكنولوجيا المعلومات', emoji: '💻', progress: '0%' },
                { title: 'إدارة الأعمال', emoji: '📈', progress: '15%' },
                { title: 'الهندسة', emoji: '⚙️', progress: '0%' },
                { title: 'الإحصاء', emoji: '📉', progress: '0%' },
              ].map((subject, i) => (
                <div key={i} className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-amber-500/50 transition-colors">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center text-4xl mb-6 border border-amber-500/20">
                    {subject.emoji}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-6">{subject.title}</h3>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: subject.progress }} />
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Skills Cards */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1] }}
              transition={{ delay: 2.2, duration: 0.4 }}
              className="absolute inset-0 grid grid-cols-3 gap-8"
            >
              {[
                { title: 'البرمجة', emoji: '🧑‍💻', tile: 'bg-blue-500/20 border-blue-500/30' },
                { title: 'تطوير الويب', emoji: '🌐', tile: 'bg-sky-500/20 border-sky-500/30' },
                { title: 'الأمن السيبراني', emoji: '🛡️', tile: 'bg-red-500/20 border-red-500/30' },
                { title: 'تحليل البيانات', emoji: '📊', tile: 'bg-emerald-500/20 border-emerald-500/30' },
                { title: 'تصميم UX', emoji: '🎨', tile: 'bg-purple-500/20 border-purple-500/30' },
              ].map((skill, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  animate={i === 1 ? { borderColor: ['#334155', '#f59e0b', '#f59e0b'] } : {}}
                  transition={{ delay: 4, duration: 0.3 }}
                  className={`bg-slate-900/60 backdrop-blur-xl border ${i===1?'border-amber-500':'border-slate-700/50'} rounded-2xl p-6 flex flex-col items-center justify-center`}
                >
                  <div className={`w-20 h-20 rounded-2xl ${skill.tile} flex items-center justify-center text-4xl mb-6 border`}>
                    {skill.emoji}
                  </div>
                  <h3 className="text-2xl font-bold text-white">{skill.title}</h3>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </BrowserFrame>

      <MousePointer 
        animate={{ 
          x: ["60vw", "48vw", "48vw", "52vw", "52vw"], 
          y: ["80vh", "33vh", "33vh", "65vh", "65vh"], 
          scale: [1, 1, 0.8, 1, 0.8] 
        }} 
      />
    </motion.div>
  );
};

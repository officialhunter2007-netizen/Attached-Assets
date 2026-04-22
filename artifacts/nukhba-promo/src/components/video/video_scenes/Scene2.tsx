import { motion } from 'framer-motion';
import { BrowserFrame, AppHeader, MousePointer } from '../Shared';

export const Scene2 = () => {
  return (
    <motion.div
      key="scene2"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.2, opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center relative"
    >
      <BrowserFrame url="nukhba.app/home">
        <AppHeader />
        
        <div className="flex flex-col items-center pt-24 px-12 text-center">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600 mb-8 leading-tight"
          >
            تعلّم بطريقة مختلفة تماماً
          </motion.h1>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex gap-6 mb-20"
          >
            <div className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xl cursor-pointer relative overflow-hidden group">
              <motion.div 
                className="absolute inset-0 bg-white/20"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, delay: 2 }}
              />
              انضم للنخبة الآن
            </div>
            <div className="px-8 py-4 rounded-xl border-2 border-amber-500/50 text-amber-400 font-bold text-xl cursor-pointer">
              عرض الباقات
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2 }}
            className="flex justify-center gap-12 w-full"
          >
            {[
              { value: '12K+', label: 'طالب', color: 'text-emerald-400' },
              { value: '5K+', label: 'درس', color: 'text-indigo-400' },
              { value: '8', label: 'مسارات', color: 'text-amber-400' }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 min-w-[200px]">
                <span className={`text-5xl font-bold mb-2 ${stat.color}`}>{stat.value}</span>
                <span className="text-white/60 text-lg">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </BrowserFrame>

      <MousePointer 
        animate={{ 
          x: ["50vw", "42vw"], 
          y: ["50vh", "40vh"], 
          scale: [1, 0.9, 1] 
        }} 
      />
    </motion.div>
  );
};

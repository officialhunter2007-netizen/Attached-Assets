import { motion } from 'framer-motion';
import { MousePointer } from '../Shared';

export const Scene3 = () => {
  return (
    <motion.div
      key="scene3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center relative bg-[#0a0b10]"
    >
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-10 flex flex-col items-center relative"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-8 -mt-16 border border-white/10">
          <span className="text-white text-3xl font-bold">ن</span>
        </div>

        <h2 className="text-3xl font-bold text-white mb-3">أهلاً بعودتك</h2>
        <p className="text-white/60 mb-10 text-center">سجل دخولك لمتابعة رحلة تعلمك</p>

        <motion.div 
          className="w-full bg-white rounded-xl p-4 flex items-center justify-center gap-4 cursor-pointer relative overflow-hidden"
          whileHover={{ scale: 1.02 }}
          animate={{ scale: [1, 1, 0.95, 1], backgroundColor: ['#ffffff', '#ffffff', '#f1f5f9', '#ffffff'] }}
          transition={{ duration: 0.5, delay: 3, times: [0, 0.8, 0.9, 1] }}
        >
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"/>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"/>
            <div className="w-3 h-3 bg-green-500 rounded-full"/>
            <div className="w-3 h-3 bg-blue-500 rounded-full"/>
          </div>
          <span className="text-slate-800 font-bold text-lg">تسجيل الدخول بـ Google</span>
        </motion.div>

        <p className="text-white/40 mt-8 text-sm">ليس لديك حساب؟ <span className="text-amber-400 font-bold">سجل الآن</span></p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 4 }}
          className="absolute inset-0 bg-emerald-500/90 rounded-3xl flex flex-col items-center justify-center z-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 4.2, type: 'spring' }}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4"
          >
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <span className="text-white font-bold text-2xl">تم الدخول بنجاح!</span>
        </motion.div>
      </motion.div>

      <MousePointer 
        animate={{ 
          x: ["50vw", "49vw", "49vw"], 
          y: ["60vh", "54vh", "54vh"], 
          scale: [1, 1, 0.8, 1] 
        }} 
      />
    </motion.div>
  );
};

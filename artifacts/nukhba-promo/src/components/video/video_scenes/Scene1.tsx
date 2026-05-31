import { motion } from 'framer-motion';

export const Scene1 = () => {
  return (
    <motion.div
      key="scene1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex flex-col items-center justify-center relative"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: [0, 10, 0] }}
        transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.5 }}
        className="w-40 h-40 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_100px_rgba(245,158,11,0.5)] mb-12"
      >
        <span className="text-white text-8xl font-bold">ن</span>
      </motion.div>
      
      <motion.h1
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600 mb-8"
      >
        نُخبة
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="text-4xl text-white/80"
      >
        تعلّم بطريقة{' '}
        <motion.span
          animate={{ 
            color: ['#ffffff', '#f59e0b', '#f59e0b'],
            textShadow: ['0 0 0px #000', '0 0 20px #f59e0b', '0 0 10px #f59e0b']
          }}
          transition={{ delay: 3.5, duration: 1, ease: "easeOut" }}
          className="font-bold inline-block"
        >
          مختلفة تماماً
        </motion.span>
      </motion.div>
    </motion.div>
  );
};

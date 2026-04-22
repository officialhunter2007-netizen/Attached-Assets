import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transitionWait, ChatBubble } from '../Shared';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 5000),
      setTimeout(() => setPhase(3), 12000),
      setTimeout(() => setPhase(4), 18000),
      setTimeout(() => setPhase(5), 24000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...transitionWait}>
      <motion.div className="w-[70vw] h-[80vh] bg-slate-900 rounded-[3rem] border-8 border-slate-800 p-8 overflow-hidden relative shadow-2xl flex flex-row gap-8 justify-between">
        
        {/* Chat Section */}
        <div className="flex-1 flex flex-col justify-end relative z-10">
          <div className="absolute top-0 left-0 right-0 bg-slate-800/80 backdrop-blur-md p-6 z-20 text-center border-b border-slate-700 rounded-t-[2rem]">
            <h2 className="text-2xl font-bold text-white">تطبيقات الويب</h2>
          </div>
          
          <div className="w-full flex flex-col justify-end pb-8 pt-24">
            <ChatBubble text="ممكن تشرح لي الفرق بين Frontend و Backend؟" isStudent={true} delay={1} visible={phase >= 1} />
            <ChatBubble text="واجهة المستخدم (Frontend) هي كل ما يراه المستخدم ويتفاعل معه، مثل الأزرار والألوان والنصوص." delay={4} visible={phase >= 2} />
            <ChatBubble text="وما هو الـ Backend إذن؟" isStudent={true} delay={10} visible={phase >= 3} />
            <ChatBubble text="الـ Backend هو الخادم (Server) وقاعدة البيانات (Database) حيث تتم معالجة وتخزين البيانات خلف الكواليس." delay={14} visible={phase >= 4} />
          </div>
        </div>

        {/* Diagram Section */}
        <div className="w-[30%] border-r border-slate-700 pr-8 flex flex-col items-center justify-center gap-8 relative z-10">
          <motion.div 
            className="w-full bg-slate-800 border-2 border-amber-500/50 p-6 rounded-xl flex items-center justify-center"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <span className="text-amber-400 font-bold text-2xl">Frontend</span>
          </motion.div>

          <motion.div 
            className="flex flex-col items-center justify-center h-20"
            initial={{ opacity: 0, scale: 0 }}
            animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-full w-1 bg-gradient-to-b from-amber-500 to-indigo-500 relative">
              <motion.div 
                className="absolute w-4 h-4 bg-white rounded-full -left-1.5"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <span className="bg-slate-900 px-2 py-1 rounded text-xs text-slate-400 mt-2">API</span>
          </motion.div>

          <motion.div 
            className="w-full bg-slate-800 border-2 border-indigo-500/50 p-6 rounded-xl flex items-center justify-center"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <span className="text-indigo-400 font-bold text-2xl">Backend</span>
          </motion.div>
        </div>

      </motion.div>
    </motion.div>
  );
}

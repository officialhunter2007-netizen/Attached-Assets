import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transitionWait, ChatBubble, PDFUploadCard, CitationChip } from '../Shared';

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // PDF reveals
      setTimeout(() => setPhase(2), 5000), // Chat opens
      setTimeout(() => setPhase(3), 10000), // Student asks
      setTimeout(() => setPhase(4), 16000), // Tutor responds
      setTimeout(() => setPhase(5), 20000), // Citation highlights
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...transitionWait}>
      
      {/* Intro PDF Morph */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
        initial={{ scale: 1.5, opacity: 0, y: '-50%', x: '-50%' }}
        animate={phase === 1 ? { opacity: 1, scale: 1.5, y: '-50%', x: '-50%' } : phase >= 2 ? { opacity: 1, scale: 0.8, y: '-35vh', x: '0%' } : { opacity: 0, scale: 1.5, y: '-50%', x: '-50%' }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <PDFUploadCard title='كتاب "أساسيات الإحصاء"' author="د. محمد الشميري" visible={phase >= 1} />
      </motion.div>

      {/* Chat Container */}
      <motion.div 
        className="w-[60vw] h-[70vh] mt-[10vh] bg-slate-900 rounded-[3rem] border-8 border-slate-800 p-8 overflow-hidden relative shadow-2xl flex flex-col justify-end"
        initial={{ opacity: 0, y: 100 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
      >
        <div className="absolute top-0 left-0 right-0 bg-slate-800/80 backdrop-blur-md p-6 z-20 text-center border-b border-slate-700 flex justify-between items-center px-12">
          <h2 className="text-2xl font-bold text-white">منهج أستاذي</h2>
        </div>

        <div className="w-full flex flex-col justify-end pb-8">
          <ChatBubble text="لم أفهم التوزيع الطبيعي في هذا المقرر، هل يمكن تبسيطه؟" isStudent={true} delay={0} visible={phase >= 3} />
          
          <motion.div 
            className="flex w-full justify-end mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0 }}
          >
            <div className="flex max-w-[80%] flex-row-reverse items-end gap-4">
              <div className="w-12 h-12 rounded-full flex-shrink-0 border-2 bg-amber-500 border-amber-300" />
              <div className="p-5 rounded-2xl text-[1.8vw] leading-relaxed bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-bl-none shadow-lg shadow-amber-900/20">
                <span>التوزيع الطبيعي هو ببساطة أن أغلب البيانات تتجمع حول المتوسط. </span>
                <br/>
                <motion.span
                  animate={phase >= 5 ? { scale: [1, 1.1, 1], color: ['#fcd34d', '#ffffff', '#fcd34d'] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block"
                >
                  <CitationChip text="كما ذكر الدكتور في ص ٤٢..." visible={phase >= 4} />
                </motion.span>
                <span> عندما يمثل التوزيع بشكل جرس، الأغلبية في المنتصف.</span>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </motion.div>
  );
}

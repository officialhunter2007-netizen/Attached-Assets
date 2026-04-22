import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transitionWait, ChatBubble } from '../Shared';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 5000),
      setTimeout(() => setPhase(3), 12000),
      setTimeout(() => setPhase(4), 22000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...transitionWait}>
      <motion.div className="w-[60vw] h-[80vh] bg-slate-900 rounded-[3rem] border-8 border-slate-800 p-8 overflow-hidden relative shadow-2xl flex flex-col justify-end">
        <div className="absolute top-0 left-0 right-0 bg-slate-800/80 backdrop-blur-md p-6 z-20 text-center border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">المحاسبة</h2>
        </div>

        <div className="w-full flex flex-col justify-end pb-8">
          <ChatBubble text="ممكن تشرح لي الفرق بين الأصول والخصوم؟" isStudent={true} delay={1} visible={phase >= 1} />
          <ChatBubble text="بالتأكيد! الأصول هي كل ما تملكه الشركة (مثل النقد والمعدات)، بينما الخصوم هي ما تدين به الشركة للغير (مثل القروض)." delay={4} visible={phase >= 2} />
          <ChatBubble text="ممتاز! وكيف يؤثر ذلك على المعادلة المحاسبية؟" isStudent={true} delay={10} visible={phase >= 3} />
          <ChatBubble text="المعادلة هي: الأصول = الخصوم + حقوق الملكية. أي زيادة في الأصول يجب أن تقابلها زيادة في الجانب الآخر لتبقى المعادلة متوازنة." delay={14} visible={phase >= 4} />
        </div>
      </motion.div>
    </motion.div>
  );
}

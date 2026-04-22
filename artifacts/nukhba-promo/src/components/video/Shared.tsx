import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export const ChatBubble = ({ 
  text, 
  isStudent = false, 
  delay = 0, 
  visible = true 
}: { 
  text: string, 
  isStudent?: boolean, 
  delay?: number, 
  visible?: boolean 
}) => {
  return (
    <motion.div 
      className={`flex w-full ${isStudent ? 'justify-start' : 'justify-end'} mb-6`}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
      transition={{ duration: 0.5, delay, type: 'spring', stiffness: 200, damping: 20 }}
    >
      <div className={`flex max-w-[80%] ${isStudent ? 'flex-row' : 'flex-row-reverse'} items-end gap-4`}>
        <div className={`w-12 h-12 rounded-full flex-shrink-0 border-2 ${isStudent ? 'bg-slate-700 border-slate-500' : 'bg-amber-500 border-amber-300'}`} />
        <div className={`p-5 rounded-2xl text-[1.8vw] leading-relaxed ${isStudent ? 'bg-slate-800 text-white rounded-br-none' : 'bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-bl-none shadow-lg shadow-amber-900/20'}`}>
          <TypewriterText text={text} startDelay={delay + 0.3} visible={visible} />
        </div>
      </div>
    </motion.div>
  );
};

export const TypewriterText = ({ text, startDelay = 0, visible = true }: { text: string, startDelay?: number, visible?: boolean }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (!visible) {
      setDisplayedText('');
      return;
    }
    
    let timeout: NodeJS.Timeout;
    const run = () => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedText(text.substring(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(interval);
      }, 40); // ms per char
      
      return () => clearInterval(interval);
    };
    
    timeout = setTimeout(run, startDelay * 1000);
    return () => clearTimeout(timeout);
  }, [text, startDelay, visible]);

  return <span>{displayedText}</span>;
};

export const CitationChip = ({ text, delay = 0, visible = true }: { text: string, delay?: number, visible?: boolean }) => (
  <motion.div 
    className="inline-block mt-2 mr-2 px-3 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded-full text-sm cursor-default"
    initial={{ opacity: 0, scale: 0.5 }}
    animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
    transition={{ delay, duration: 0.3, type: "spring" }}
  >
    {text}
  </motion.div>
);

export const PDFUploadCard = ({ title, author, delay = 0, visible = true }: { title: string, author: string, delay?: number, visible?: boolean }) => (
  <motion.div 
    className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6"
    initial={{ opacity: 0, y: 20 }}
    animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
    transition={{ delay, duration: 0.5 }}
  >
    <div className="w-12 h-16 bg-red-500/20 rounded flex items-center justify-center border border-red-500/50">
      <span className="text-red-400 font-bold text-xs">PDF</span>
    </div>
    <div>
      <div className="text-white font-bold text-lg">{title}</div>
      <div className="text-slate-400 text-sm">{author}</div>
    </div>
  </motion.div>
);

export const transitionWait = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.05 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

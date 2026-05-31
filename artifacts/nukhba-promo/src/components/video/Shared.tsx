import React, { useEffect, useState } from 'react';
import { motion, type TargetAndTransition, type VariantLabels } from 'framer-motion';

export const BrowserFrame = ({ children, url = "nukhba.app" }: { children: React.ReactNode, url?: string }) => (
  <motion.div 
    className="w-[85vw] h-[80vh] rounded-3xl border border-slate-700/50 bg-[#0d0e15]/95 shadow-2xl flex flex-col overflow-hidden relative"
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 1.05, opacity: 0 }}
    transition={{ duration: 0.5, ease: "easeInOut" }}
  >
    <div className="h-12 bg-[#1a1b26]/80 backdrop-blur-md border-b border-white/5 flex items-center px-4 shrink-0">
      <div className="flex gap-2 mr-4">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
      </div>
      <div className="mx-auto bg-black/40 px-32 py-1.5 rounded-lg text-xs text-white/50 font-mono tracking-wide border border-white/5">
        {url}
      </div>
    </div>
    <div className="flex-1 relative overflow-hidden bg-[#0a0b10] flex flex-col">
      {children}
    </div>
  </motion.div>
);

export const AppHeader = ({ title = "نُخبة" }: { title?: string }) => (
  <div className="h-16 border-b border-white/5 bg-slate-900/60 backdrop-blur-xl flex items-center px-6 shrink-0 relative z-10">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg shadow-amber-500/20">
        ن
      </div>
      <span className="font-bold text-white text-lg">{title}</span>
    </div>
    <div className="ml-auto flex items-center gap-6 text-white/70 text-sm font-bold">
      <span className="text-amber-400 cursor-default">الرئيسية</span>
      <span className="hover:text-white transition-colors cursor-default">المسارات</span>
      <span className="hover:text-white transition-colors cursor-default">الباقات</span>
    </div>
  </div>
);

export const MousePointer = ({ animate }: { animate: TargetAndTransition | VariantLabels }) => (
  <motion.div
    initial={{ x: "50vw", y: "50vh", opacity: 0 }}
    animate={animate}
    className="absolute z-[9999] pointer-events-none drop-shadow-md"
    style={{ filter: "drop-shadow(0 4px 3px rgb(0 0 0 / 0.5))" }}
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L6.35 3.35a.5.5 0 0 0-.85.35Z" fill="white" stroke="black" strokeWidth="1.5"/>
    </svg>
  </motion.div>
);

export const ChatBubble = ({ isStudent = false, children }: { isStudent?: boolean, children: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className={`flex gap-3 max-w-[85%] ${isStudent ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
  >
    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${isStudent ? 'bg-slate-700 text-white' : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'}`}>
      {isStudent ? 'أ' : 'ن'}
    </div>
    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${isStudent ? 'bg-indigo-600/20 text-indigo-100 rounded-tl-sm border border-indigo-500/20' : 'bg-slate-800/80 text-slate-200 rounded-tr-sm border border-slate-700/50'}`}>
      {children}
    </div>
  </motion.div>
);

export const TypewriterText = ({ text, delay = 0, speed = 0.03, className = "" }: { text: string, delay?: number, speed?: number, className?: string }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.substring(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(interval);
      }, speed * 1000);
      return () => clearInterval(interval);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [text, delay, speed]);
  return <span className={className}>{displayed}</span>;
};

export const CitationChip = ({ text }: { text: string }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.05 }}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs mt-2 cursor-pointer"
  >
    {text}
  </motion.div>
);

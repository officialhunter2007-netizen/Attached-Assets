import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';
import { Scene8 } from './video_scenes/Scene8';
import { Scene9 } from './video_scenes/Scene9';
import { Scene10 } from './video_scenes/Scene10';

const SCENE_DURATIONS = { 
  intro: 16000, 
  problem: 20000, 
  diagnostic: 24000, 
  accounting: 34000, 
  it: 34000, 
  web: 34000, 
  professor: 40000, 
  progress: 28000, 
  quizzes: 30000, 
  outro: 20000 
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#080a11] text-white" dir="rtl" style={{ fontFamily: '"Cairo", sans-serif' }}>
      
      {/* Persistent Background */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
        <motion.div 
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.15) 0%, transparent 70%)' }}
          animate={{ 
            x: ['-20%', '20%', '-10%', '-20%'], 
            y: ['-10%', '30%', '10%', '-10%'],
            scale: [1, 1.2, 0.9, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div 
          className="absolute right-0 bottom-0 w-[90vw] h-[90vw] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 60%)' }}
          animate={{ 
            x: ['10%', '-30%', '0%', '10%'], 
            y: ['20%', '-10%', '-20%', '20%'],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <AnimatePresence initial={false} mode="wait">
        {currentScene === 0 && <Scene1 key="intro" />}
        {currentScene === 1 && <Scene2 key="problem" />}
        {currentScene === 2 && <Scene3 key="diagnostic" />}
        {currentScene === 3 && <Scene4 key="accounting" />}
        {currentScene === 4 && <Scene5 key="it" />}
        {currentScene === 5 && <Scene6 key="web" />}
        {currentScene === 6 && <Scene7 key="professor" />}
        {currentScene === 7 && <Scene8 key="progress" />}
        {currentScene === 8 && <Scene9 key="quizzes" />}
        {currentScene === 9 && <Scene10 key="outro" />}
      </AnimatePresence>
    </div>
  );
}

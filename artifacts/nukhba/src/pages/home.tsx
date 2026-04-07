import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Terminal, Sparkles, Zap, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-gold/30">
      <header className="fixed top-0 w-full z-50 glass">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center text-primary-foreground font-black text-2xl shadow-lg shadow-gold/20">ن</div>
            <span className="text-2xl font-bold text-gold tracking-tight">نُخبة</span>
          </div>
          <Link href="/login">
            <Button className="gradient-gold text-primary-foreground font-bold hover:opacity-90 shadow-lg shadow-gold/20 transition-all rounded-full px-8">ابدأ مجاناً</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-32 pb-20">
        <section className="container mx-auto px-4 text-center mb-32 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              تعلّم بطريقة <span className="text-transparent bg-clip-text gradient-gold">مختلفة تماماً</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed">
              منصة نُخبة توفر لك مسارات تعليمية مخصصة بالذكاء الاصطناعي لتناسب مستواك وطموحك. كأن لديك معلم خاص من النخبة.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto gradient-gold text-primary-foreground font-bold text-lg h-14 px-10 rounded-full shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)] transition-all">
                  انضم للنخبة الآن
                </Button>
              </Link>
              <Link href="#pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-10 rounded-full border-gold/50 text-gold hover:bg-gold/10 font-bold text-lg transition-all">
                  عرض الباقات
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto border-t border-white/10 pt-10">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-emerald mb-2">١٠٠٠+</div>
                <div className="text-sm text-muted-foreground">طالب مستفيد</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gold mb-2">٥٠٠+</div>
                <div className="text-sm text-muted-foreground">درس تفاعلي</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">٣</div>
                <div className="text-sm text-muted-foreground">أقسام رئيسية</div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="container mx-auto px-4 mb-32">
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div whileHover={{ y: -5 }} className="glass-gold p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/20 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500" />
              <BookOpen className="w-12 h-12 text-gold mb-6" />
              <h3 className="text-2xl font-bold mb-4">الثانوية</h3>
              <p className="text-muted-foreground">شروحات مبسطة، ملخصات ذكية، واختبارات تفاعلية لجميع مواد المرحلة الثانوية.</p>
            </motion.div>
            
            <motion.div whileHover={{ y: -5 }} className="glass-emerald p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald/20 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500" />
              <GraduationCap className="w-12 h-12 text-emerald mb-6" />
              <h3 className="text-2xl font-bold mb-4">الجامعي</h3>
              <p className="text-muted-foreground">مسارات مخصصة لتخصصات تقنية المعلومات، الهندسة، وإدارة الأعمال.</p>
            </motion.div>
            
            <motion.div whileHover={{ y: -5 }} className="glass p-8 rounded-3xl border-blue-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500" />
              <Terminal className="w-12 h-12 text-blue-400 mb-6" />
              <h3 className="text-2xl font-bold mb-4">المهارات</h3>
              <p className="text-muted-foreground">تعلم البرمجة، تطوير الويب، والأمن السيبراني مع بيئة تطبيق عملية مدمجة.</p>
            </motion.div>
          </div>
        </section>

        <section className="bg-card/50 py-32 border-y border-white/5">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">لماذا <span className="text-gold">نُخبة</span>؟</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">نستخدم أحدث تقنيات الذكاء الاصطناعي لتقديم تجربة تعليمية لا مثيل لها</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl glass-gold flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-gold" />
                </div>
                <h4 className="text-xl font-bold mb-3">خطة مخصصة لك</h4>
                <p className="text-muted-foreground">يبني الذكاء الاصطناعي خطة دراسية تناسب مستواك وسرعة تعلمك بدقة متناهية.</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl glass flex border-white/10 items-center justify-center mb-6">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h4 className="text-xl font-bold mb-3">تعلم تفاعلي</h4>
                <p className="text-muted-foreground">لست مستمعاً فقط. ناقش، اسأل، وحل التحديات مع معلمك الذكي في أي وقت.</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl glass flex border-blue-500/20 items-center justify-center mb-6">
                  <Terminal className="w-10 h-10 text-blue-400" />
                </div>
                <h4 className="text-xl font-bold mb-3">بيئة تطبيق مدمجة</h4>
                <p className="text-muted-foreground">طبق ما تعلمته في البرمجة مباشرة داخل المنصة دون الحاجة لإعداد أي برامج.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="container mx-auto px-4 py-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">باقات الاشتراك</h2>
            <p className="text-muted-foreground">استثمر في مستقبلك بأقل التكاليف</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Free */}
            <div className="glass p-8 rounded-3xl border-white/10 flex flex-col">
              <h3 className="text-xl font-bold mb-2">مجاني</h3>
              <div className="text-3xl font-bold mb-6">٠ <span className="text-lg text-muted-foreground font-normal">ريال</span></div>
              <ul className="space-y-4 mb-8 flex-1 text-sm">
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald" /> درسان مجانيان للاختبار</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald" /> تصفح المنهج</li>
              </ul>
              <Link href="/register" className="w-full">
                <Button className="w-full" variant="outline">جرب الآن</Button>
              </Link>
            </div>
            
            {/* Influencer */}
            <div className="glass p-8 rounded-3xl border-purple-500/30 flex flex-col relative overflow-hidden">
              <div className="absolute top-4 left-4 bg-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full">سفير نُخبة</div>
              <h3 className="text-xl font-bold mb-2 text-purple-400">مؤثر</h3>
              <div className="text-3xl font-bold mb-6">شهر مجاني</div>
              <ul className="space-y-4 mb-8 flex-1 text-sm">
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-purple-400" /> دعوة ١٠ أصدقاء</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-purple-400" /> وصول كامل للمنصة</li>
              </ul>
              <Link href="/register" className="w-full">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">انسخ الرابط</Button>
              </Link>
            </div>
            
            {/* Silver */}
            <div className="glass p-8 rounded-3xl border-zinc-400/30 flex flex-col">
              <h3 className="text-xl font-bold mb-2 text-zinc-300">الفضية</h3>
              <div className="text-3xl font-bold mb-6 text-zinc-100">٢٠٠٠ <span className="text-lg text-muted-foreground font-normal">ريال / شهر</span></div>
              <ul className="space-y-4 mb-8 flex-1 text-sm">
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-zinc-400" /> وصول كامل للمنصة</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-zinc-400" /> مسارات ذكية لا محدودة</li>
              </ul>
              <Link href="/register" className="w-full">
                <Button className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">اشترك الآن</Button>
              </Link>
            </div>
            
            {/* Gold */}
            <div className="glass-gold p-8 rounded-3xl flex flex-col relative scale-105 z-10 shadow-2xl shadow-gold/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-foreground font-bold text-xs px-4 py-1 rounded-full w-max">الأكثر طلباً</div>
              <h3 className="text-xl font-bold mb-2 text-gold">الذهبية</h3>
              <div className="text-3xl font-bold mb-6">٥٠٠٠ <span className="text-lg text-gold/60 font-normal">ريال / ٣ أشهر</span></div>
              <ul className="space-y-4 mb-8 flex-1 text-sm">
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-gold" /> كل ميزات الفضية</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-gold" /> توفير ٢٠٪</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-gold" /> أولوية الدعم الفني</li>
              </ul>
              <Link href="/register" className="w-full">
                <Button className="w-full gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20">اشترك الذهبية</Button>
              </Link>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">تبحث عن التميز المطلق؟ باقة <span className="text-emerald font-bold">نُخبة</span> السنوية بـ ١٥,٠٠٠ ريال فقط</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-12 bg-black/40">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-6 opacity-50">
             <div className="w-8 h-8 rounded-md gradient-gold flex items-center justify-center text-primary-foreground font-bold">ن</div>
             <span className="font-bold text-xl text-gold">نُخبة</span>
          </div>
          <p className="text-muted-foreground text-sm">صُنع بشغف لطلاب اليمن. جميع الحقوق محفوظة {new Date().getFullYear()} ©</p>
        </div>
      </footer>
    </div>
  );
}

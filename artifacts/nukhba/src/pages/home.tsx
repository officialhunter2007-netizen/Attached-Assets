import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Terminal, Sparkles, Zap, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-gold/30">
      <header className="fixed top-0 w-full z-50 glass">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg gradient-gold flex items-center justify-center text-primary-foreground font-black text-xl md:text-2xl shadow-lg shadow-gold/20">ن</div>
            <span className="text-xl md:text-2xl font-bold text-gold tracking-tight">نُخبة</span>
          </div>
        </div>
      </header>
      <main className="flex-1 pt-24 md:pt-32 pb-12 md:pb-20">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-16 md:mb-32 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-gold/10 rounded-full blur-[80px] md:blur-[120px] -z-10 pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 md:mb-6 leading-tight">
              تعلّم بطريقة{" "}
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-300 via-yellow-400 to-orange-400 animate-pulse drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]">
                  مختلفة تماماً
                </span>
                <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-l from-amber-300 via-yellow-400 to-orange-400 blur-sm opacity-60 select-none" aria-hidden="true">
                  مختلفة تماماً
                </span>
              </span>
            </h1>
            <p className="text-base md:text-xl lg:text-2xl text-muted-foreground mb-8 md:mb-10 leading-relaxed max-w-2xl mx-auto">
              منصة نُخبة توفر لك مسارات تعليمية مخصصة بالذكاء الاصطناعي لتناسب مستواك وطموحك.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-12 md:mb-16">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gradient-gold text-primary-foreground font-bold text-base md:text-lg h-12 md:h-14 px-8 md:px-10 rounded-full shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)] transition-all">
                  انضم للنخبة الآن
                </Button>
              </Link>
              <Link href="#pricing" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 rounded-full border-gold/50 text-gold hover:bg-gold/10 font-bold text-base md:text-lg transition-all">
                  عرض الباقات
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-8 max-w-3xl mx-auto border-t border-white/10 pt-8 md:pt-10">
              <div>
                <div className="text-2xl md:text-4xl font-bold text-emerald mb-1 md:mb-2">١٠٠٠+</div>
                <div className="text-xs md:text-sm text-muted-foreground">طالب مستفيد</div>
              </div>
              <div>
                <div className="text-2xl md:text-4xl font-bold text-gold mb-1 md:mb-2">٥٠٠+</div>
                <div className="text-xs md:text-sm text-muted-foreground">درس تفاعلي</div>
              </div>
              <div>
                <div className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">2
</div>
                <div className="text-xs md:text-sm text-muted-foreground">أقسام رئيسية</div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Sections */}
        <section className="container mx-auto px-4 mb-16 md:mb-32">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <motion.div whileHover={{ y: -5 }} className="glass-gold p-6 md:p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-gold/20 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500" />
              <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-gold mb-4 md:mb-6" />
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">الثانوية</h3>
              <p className="text-sm md:text-base text-muted-foreground">شروحات مبسطة، ملخصات ذكية، واختبارات تفاعلية لجميع مواد المرحلة الثانوية.</p>
            </motion.div>
            
            <motion.div whileHover={{ y: -5 }} className="glass-emerald p-6 md:p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-emerald/20 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500" />
              <GraduationCap className="w-10 h-10 md:w-12 md:h-12 text-emerald mb-4 md:mb-6" />
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">الجامعي</h3>
              <p className="text-sm md:text-base text-muted-foreground">مسارات مخصصة لتخصصات تقنية المعلومات، الهندسة، وإدارة الأعمال.</p>
            </motion.div>
            
            <motion.div whileHover={{ y: -5 }} className="glass p-6 md:p-8 rounded-3xl border-blue-500/20 relative overflow-hidden group sm:col-span-2 md:col-span-1">
              <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-blue-500/20 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500" />
              <Terminal className="w-10 h-10 md:w-12 md:h-12 text-blue-400 mb-4 md:mb-6" />
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">المهارات</h3>
              <p className="text-sm md:text-base text-muted-foreground">تعلم البرمجة، تطوير الويب، والأمن السيبراني مع بيئة تطبيق عملية مدمجة.</p>
            </motion.div>
          </div>
        </section>

        {/* Why Nukhba */}
        <section className="bg-card/50 py-16 md:py-32 border-y border-white/5">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4">لماذا <span className="text-gold">نُخبة</span>؟</h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">نستخدم أحدث تقنيات الذكاء الاصطناعي لتقديم تجربة تعليمية لا مثيل لها</p>
            </div>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl glass-gold flex items-center justify-center mb-4 md:mb-6">
                  <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-gold" />
                </div>
                <h4 className="text-lg md:text-xl font-bold mb-2 md:mb-3">خطة مخصصة لك</h4>
                <p className="text-sm text-muted-foreground">يبني الذكاء الاصطناعي خطة دراسية تناسب مستواك وسرعة تعلمك بدقة متناهية.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl glass flex border-white/10 items-center justify-center mb-4 md:mb-6">
                  <Zap className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <h4 className="text-lg md:text-xl font-bold mb-2 md:mb-3">تعلم تفاعلي</h4>
                <p className="text-sm text-muted-foreground">لست مستمعاً فقط. ناقش، اسأل، وحل التحديات مع معلمك الذكي في أي وقت.</p>
              </div>
              <div className="text-center sm:col-span-2 md:col-span-1">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl glass flex border-blue-500/20 items-center justify-center mb-4 md:mb-6">
                  <Terminal className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
                </div>
                <h4 className="text-lg md:text-xl font-bold mb-2 md:mb-3">بيئة تطبيق مدمجة</h4>
                <p className="text-sm text-muted-foreground">طبق ما تعلمته في البرمجة مباشرة داخل المنصة دون الحاجة لإعداد أي برامج.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container mx-auto px-4 py-16 md:py-32">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4">باقات الاشتراك</h2>
            <p className="text-sm md:text-base text-muted-foreground">الدفع عبر محفظة كريمي — اختر ما يناسبك</p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {/* Free */}
            <div className="glass p-6 md:p-8 rounded-3xl border-white/10 flex flex-col">
              <h3 className="text-lg md:text-xl font-bold mb-2">مجاني</h3>
              <div className="text-2xl md:text-3xl font-bold mb-1">٠ <span className="text-base text-muted-foreground font-normal">ريال</span></div>
              <p className="text-xs text-muted-foreground mb-5">للبداية</p>
              <ul className="space-y-3 mb-6 flex-1 text-sm">
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald flex-shrink-0" /> درس واحد مجاني للتجربة</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald flex-shrink-0" /> تصفح المنهج الدراسي</li>
              </ul>
              <Link href="/register" className="w-full">
                <Button className="w-full" variant="outline">جرب الآن</Button>
              </Link>
            </div>
            
            {/* Referral */}
            <div className="glass p-6 md:p-8 rounded-3xl border-purple-500/30 flex flex-col relative overflow-hidden">
              <div className="absolute top-4 left-4 bg-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full">مجاناً</div>
              <h3 className="text-lg md:text-xl font-bold mb-2 text-purple-400">الإحالة</h3>
              <div className="text-2xl font-bold mb-1">٣ دروس</div>
              <p className="text-xs text-muted-foreground mb-5">مقابل كل ٥ إحالات</p>
              <ul className="space-y-3 mb-6 flex-1 text-sm">
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-purple-400 flex-shrink-0" /> ادعُ ٥ أصدقاء عبر رابطك</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-purple-400 flex-shrink-0" /> احصل على ٣ دروس برونزية</li>
              </ul>
              <Link href="/register" className="w-full">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">احصل على رابطك</Button>
              </Link>
            </div>
            
            {/* Silver */}
            <div className="glass p-6 md:p-8 rounded-3xl border-zinc-400/30 flex flex-col">
              <h3 className="text-lg md:text-xl font-bold mb-2 text-zinc-300">الفضية</h3>
              <div className="text-2xl md:text-3xl font-bold mb-1 text-zinc-100">٦٠ <span className="text-base text-muted-foreground font-normal">رسالة</span></div>
              <p className="text-xs text-muted-foreground mb-5">كل ١٤ يوم • عبر كريمي</p>
              <ul className="space-y-3 mb-6 flex-1 text-sm">
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-zinc-400 flex-shrink-0" /> ٦٠ رسالة مع المعلم الذكي</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-zinc-400 flex-shrink-0" /> ملخصات الدروس التلقائية</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-zinc-400 flex-shrink-0" /> جميع المواد والمسارات</li>
              </ul>
              <Link href="/register" className="w-full">
                <Button className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">اشترك الآن</Button>
              </Link>
            </div>
            
            {/* Gold */}
            <div className="glass-gold p-6 md:p-8 rounded-3xl flex flex-col relative md:scale-105 z-10 shadow-2xl shadow-gold/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-foreground font-bold text-xs px-4 py-1 rounded-full w-max">الأكثر طلباً</div>
              <h3 className="text-lg md:text-xl font-bold mb-2 text-gold">الذهبية</h3>
              <div className="text-2xl md:text-3xl font-bold mb-1">١٠٠ <span className="text-base text-gold/60 font-normal">رسالة</span></div>
              <p className="text-xs text-gold/60 mb-5">كل ١٤ يوم • عبر كريمي</p>
              <ul className="space-y-3 mb-6 flex-1 text-sm">
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-gold flex-shrink-0" /> ١٠٠ رسالة مع المعلم الذكي</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-gold flex-shrink-0" /> ملخصات الدروس التلقائية</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-gold flex-shrink-0" /> جميع المواد والمسارات</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-gold flex-shrink-0" /> أولوية الدعم الفني</li>
              </ul>
              <Link href="/register" className="w-full">
                <Button className="w-full gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20">اشترك الذهبية</Button>
              </Link>
            </div>
          </div>

          {/* Bronze note */}
          <div className="mt-8 max-w-2xl mx-auto glass p-5 rounded-2xl border-amber-700/30 text-center">
            <p className="text-sm text-muted-foreground">
              هل تريد البداية بتكلفة أقل؟ باقة{" "}
              <span className="text-amber-600 font-bold">البرونزية</span>{" "}
              تمنحك ٣٠ رسالة كل ١٤ يوم عبر محفظة كريمي.{" "}
              <Link href="/register" className="text-gold underline underline-offset-2">سجّل واطلب الاشتراك</Link>
            </p>
          </div>
        </section>
      </main>
      <footer className="border-t border-white/10 py-8 md:py-12 bg-black/40">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-4 md:mb-6 opacity-50">
             <div className="w-7 h-7 md:w-8 md:h-8 rounded-md gradient-gold flex items-center justify-center text-primary-foreground font-bold">ن</div>
             <span className="font-bold text-lg md:text-xl text-gold">نُخبة</span>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm text-center">صُنع بشغف لطلاب اليمن. جميع الحقوق محفوظة {new Date().getFullYear()} ©</p>
        </div>
      </footer>
    </div>
  );
}

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Terminal, Sparkles, Zap, Shield, Crown, Check, X } from "lucide-react";
import { NukhbaLogo } from "@/components/nukhba-logo";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-gold/30">
      <header className="fixed top-0 w-full z-50 glass">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <NukhbaLogo size="md" />
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

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mb-8 md:mb-10 text-center text-sm text-muted-foreground"
            >
              يمكنك تصفح المنصة من الهاتف أو الكمبيوتر
            </motion.div>

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
          <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
            <motion.div whileHover={{ y: -5 }} className="glass-emerald p-6 md:p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-emerald/20 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500" />
              <GraduationCap className="w-10 h-10 md:w-12 md:h-12 text-emerald mb-4 md:mb-6" />
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">الجامعي</h3>
              <p className="text-sm md:text-base text-muted-foreground">مسارات مخصصة لتخصصات تقنية المعلومات، الهندسة، وإدارة الأعمال وغيره.</p>
            </motion.div>
            
            <motion.div whileHover={{ y: -5 }} className="glass p-6 md:p-8 rounded-3xl border-blue-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-blue-500/20 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500" />
              <Terminal className="w-10 h-10 md:w-12 md:h-12 text-blue-400 mb-4 md:mb-6" />
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">المهارات</h3>
              <p className="text-sm md:text-base text-muted-foreground">تعلم البرمجة، تطوير الويب، والأمن السيبراني وغيره مع بيئة تطبيق عملية مدمجة.</p>
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

        {/* Comparison vs ChatGPT/DeepSeek */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black flex items-center justify-center gap-3 mb-3">
              <Sparkles className="w-7 h-7 text-gold" />
              لماذا نُخبة وليس <span className="text-gold">ChatGPT</span> أو <span className="text-gold">DeepSeek</span>؟
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              المساعدات العامة ممتازة للأسئلة العابرة، لكنها لا تعرفك ولا تتذكر تقدّمك. نُخبة بُنيت لتكون <span className="text-gold font-bold">معلّمك المتخصّص</span>.
            </p>
          </div>

          <div className="max-w-3xl mx-auto glass rounded-3xl border-2 border-gold/20 overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full text-right" dir="rtl">
                <thead>
                  <tr className="border-b border-white/10 bg-gradient-to-l from-gold/10 via-gold/5 to-transparent">
                    <th className="p-3 sm:p-4 text-sm sm:text-base font-bold text-foreground/80 w-[46%]">الميزة</th>
                    <th className="p-3 sm:p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Crown className="w-5 h-5 text-gold" />
                        <span className="text-sm sm:text-base font-black text-gold">نُخبة</span>
                      </div>
                    </th>
                    <th className="p-3 sm:p-4 text-center">
                      <span className="text-xs sm:text-sm font-bold text-muted-foreground">ChatGPT</span>
                    </th>
                    <th className="p-3 sm:p-4 text-center">
                      <span className="text-xs sm:text-sm font-bold text-muted-foreground">DeepSeek</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    { feature: "يتذكّر تقدّمك ونقاط ضعفك بين الجلسات", n: true, c: false, d: false },
                    { feature: "خطة تعلّم شخصية لمادتك", n: true, c: false, d: false },
                    { feature: "مختبرات تطبيقية تفاعلية داخل المنصة", n: true, c: false, d: false },
                    { feature: "محتوى مبني على المنهج اليمني والجامعي المحلي", n: true, c: false, d: false },
                  ].map((row, i) => (
                    <tr key={i} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "bg-white/[0.015]" : ""} hover:bg-gold/[0.03] transition-colors`}>
                      <td className="p-3 sm:p-4 font-medium text-foreground/90 text-xs sm:text-sm leading-relaxed">{row.feature}</td>
                      <td className="p-3 sm:p-4 text-center">
                        {row.n ? (
                          <div className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gold/15 border border-gold/30">
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gold" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500/10 border border-red-500/20">
                            <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" strokeWidth={3} />
                          </div>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        {row.c ? (
                          <Check className="w-5 h-5 text-emerald-400/80 mx-auto" strokeWidth={2.5} />
                        ) : (
                          <X className="w-5 h-5 text-red-400/60 mx-auto" strokeWidth={2.5} />
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        {row.d ? (
                          <Check className="w-5 h-5 text-emerald-400/80 mx-auto" strokeWidth={2.5} />
                        ) : (
                          <X className="w-5 h-5 text-red-400/60 mx-auto" strokeWidth={2.5} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 sm:p-5 bg-gradient-to-l from-gold/10 to-transparent border-t border-gold/15">
              <p className="text-xs sm:text-sm text-center text-foreground/80 leading-relaxed">
                <span className="text-gold font-bold">الخلاصة:</span> أنت لا تشترك في "محادثة" — أنت تشترك في معلّم متخصّص يرافقك خطوة بخطوة.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container mx-auto px-4 py-16 md:py-32">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4">باقات الاشتراك</h2>
            <p className="text-sm md:text-base text-muted-foreground">الدفع عبر محفظة كريمي — اختر ما يناسبك</p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <div className="glass p-6 md:p-8 rounded-3xl border-white/10 flex flex-col">
              <h3 className="text-lg md:text-xl font-bold mb-2">مجاني</h3>
              <div className="text-2xl md:text-3xl font-bold mb-1">٠ <span className="text-base text-muted-foreground font-normal">ريال</span></div>
              <p className="text-xs text-muted-foreground mb-5">للبداية</p>
              <ul className="space-y-3 mb-6 flex-1 text-sm">
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald flex-shrink-0" /> درس واحد مجاني للتجربة</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald flex-shrink-0" /> تصفح المنهج الدراسي</li>
              </ul>
              <Link href="/learn" className="w-full">
                <Button className="w-full" variant="outline">جرب الآن</Button>
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
              <Link href="/subscription" className="w-full">
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
              <Link href="/subscription" className="w-full">
                <Button className="w-full gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20">اشترك الذهبية</Button>
              </Link>
            </div>
          </div>

          {/* Bronze note */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-10 max-w-2xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden border border-amber-700/40 bg-amber-950/20 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-l from-amber-900/10 to-transparent pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-center gap-5 px-6 py-5">
                <div className="w-12 h-12 rounded-xl bg-amber-700/20 border border-amber-700/40 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 text-center sm:text-right">
                  <p className="text-sm font-bold text-amber-400 mb-0.5">ابدأ بأقل تكلفة — الباقة البرونزية</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ٣٠ رسالة مع المعلم الذكي كل ١٤ يوم، عبر محفظة كريمي مباشرةً. مثالية للبداية.
                  </p>
                </div>
                <Link href="/subscription" className="shrink-0">
                  <Button size="sm" className="bg-amber-700/80 hover:bg-amber-700 text-white font-bold px-5 h-9 rounded-xl border border-amber-600/40 shadow-lg shadow-amber-900/20 whitespace-nowrap">
                    اشترك الآن
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      <footer className="border-t border-white/10 py-8 md:py-12 bg-black/40">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center">
          <div className="mb-4 md:mb-6 opacity-60">
            <NukhbaLogo size="sm" />
          </div>
          <p className="text-muted-foreground text-xs md:text-sm text-center">صُنع بشغف لطلاب اليمن. جميع الحقوق محفوظة {new Date().getFullYear()} ©</p>
        </div>
      </footer>
    </div>
  );
}

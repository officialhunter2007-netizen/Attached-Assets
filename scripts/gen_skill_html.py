#!/usr/bin/env python3
"""skill-html — HTML — 3 مستويات"""
import json; from pathlib import Path; import random
random.seed(42)
def h(s): return sum(ord(c)*(i+1) for i,c in enumerate(str(s)))
OUT = Path("out/skill-html"); OUT.mkdir(parents=True, exist_ok=True)
def U(n,*l): return (n,list(l))
def S(n,g,*u): return (n,g,list(u))
def L(n,g,b,*s): return (n,g,b,list(s))

CURRICULUM = [
L("المستوى الأول: أساسيات HTML","إتقان الوسوم، النصوص، الروابط، الصور، القوائم، الجداول","apply",
S("أساسيات HTML","هيكل الصفحة والوسوم الأساسية",
U("مقدمة HTML","ما هو HTML؟","هيكل الصفحة: DOCTYPE, html, head, body","أول صفحة HTML","المتصفح والمفسر","أدوات التطوير DevTools","تعليقات HTML","مشروع: صفحتك الأولى"),
U("العناوين والفقرات","h1-h6","p","br و hr","pre","تنسيق النص: b, i, u, strong, em","small, mark, del, ins","مشروع: مقال منسق"),
U("الروابط Links","a tag","href","target=_blank","روابط داخلية وخارجية","روابط بريد وهاتف","anchor navigation","مشروع: قائمة روابط"),
U("الصور Images","img tag","src, alt","width, height","صيغ الصور","figure و figcaption","الصور المتجاوبة","مشروع: معرض صور"),
U("القوائم Lists","ul, ol, li","قوائم متداخلة","قوائم التعريف dl, dt, dd","تخصيص القوائم","مشروع: قائمة متعددة"),
U("الجداول Tables","table, tr, td, th","caption","thead, tbody, tfoot","colspan, rowspan","تنسيق الجداول","مشروع: جدول بيانات"),
U("التعليقات والكيانات","HTML Comments","HTML Entities","non-breaking space","رموز خاصة","Character encoding","مشروع: توثيق"),
U("Block vs Inline","div و span","Block elements","Inline elements","HTML5 structure","مشروع: تخطيط صفحة"),
U("مشروع: صفحة تعريفية","تخطيط","هيكل","محتوى","تنسيق","عرض"),
),
S("النماذج والإدخال","جمع بيانات المستخدم",
U("النماذج الأساسية","form tag","action, method","input types","labels","submit button","مشروع: نموذج اتصال"),
U("حقول الإدخال","text, password","email, tel, url","number, range","date, time","color, file","مشروع: استمارة"),
U("عناصر الاختيار","radio buttons","checkboxes","select, option","optgroup","datalist","مشروع: استبيان"),
U("textarea و buttons","textarea","button types","reset","image button","مشروع: تعليقات"),
U("Form Validation","required","pattern","min, max, step","input validation attributes","مشروع: نموذج محقق"),
U("fieldset و legend","fieldset","legend","تجميع الحقول","disabled fieldset","مشروع: نموذج منظم"),
U("Form Accessibility","labels","aria attributes","tabindex","focus management","مشروع: نموذج متاح"),
U("إرسال النماذج","GET vs POST","FormData","enctype","multipart","مشروع: إرسال"),
U("مشروع: نظام تسجيل","تخطيط","بناء","تحقق","تنسيق","عرض"),
),
S("الوسائط المتعددة","الصوت والفيديو والرسوم",
U("الصور المتقدمة","srcset, sizes","picture element","WebP, AVIF","lazy loading","LQIP","مشروع: صور متجاوبة"),
U("الفيديو","video tag","controls, autoplay","source","poster","tracks/subtitles","مشروع: مشغل فيديو"),
U("الصوت","audio tag","controls","source","loop","preload","مشروع: مشغل صوت"),
U("iframe","iframe tag","sandbox","allow","security","مشروع: تضمين محتوى"),
U("SVG في HTML","svg element","basic shapes","inline SVG","SVG sprites","مشروع: SVG"),
U("Canvas","canvas element","2D context","drawing basics","animation","مشروع: Canvas"),
U("Object و Embed","object","embed","param","fallback","مشروع: تضمين"),
U("Web Components","customElements","shadow DOM","HTML templates","slots","مشروع: Components"),
U("مشروع: صفحة وسائط","تخطيط","فيديو","صوت","صور","عرض"),
),
S("HTML5 Semantics","العناصر الدلالية",
U("هيكل الصفحة الدلالي","header","nav","main","footer","article","section","aside","مشروع: هيكل دلالي"),
U("time و address","time tag","datetime attribute","address tag","blockquote و cite","abbr","مشروع: تنسيق"),
U("figure و details","figure","figcaption","details","summary","dialog","مشروع: عناصر"),
U("Data Attributes","data-*","dataset","استخدامات","مشروع: Data"),
U("progress و meter","progress","meter","optimum, low, high","مشروع: مؤشرات"),
U("HTML Outlines","heading hierarchy","sectioning elements","outline algorithm","مشروع: هيكل"),
U("Microdata","itemscope, itemtype","itemprop","Schema.org","مشروع: Microdata"),
U("HTML Validation","W3C Validator","common errors","best practices","مشروع: Validation"),
U("مشروع: صفحة دلالية","تخطيط","هيكل","محتوى","تحقق","عرض"),
),
S("HTML و CSS","الربط بين الهيكل والتنسيق",
U("ربط CSS","link tag","style tag","inline styles","@import","CSS specificity","مشروع: ربط"),
U("Classes و IDs","class attribute","id attribute","naming conventions","BEM","مشروع: تسمية"),
U("CSS Selectors","element, class, id","attribute selectors","pseudo-classes","pseudo-elements","مشروع: Selectors"),
U("Box Model في HTML","display property","block, inline, inline-block","visibility","overflow","مشروع: Box"),
U("Flexbox مع HTML","flex container","flex items","alignment","order","مشروع: Flexbox"),
U("Grid مع HTML","grid container","grid items","template areas","responsive grid","مشروع: Grid"),
U("Responsive HTML","viewport meta","media queries","mobile-first","breakpoints","مشروع: Responsive"),
U("CSS Variables","--custom-property","var()","scope","themes","مشروع: Variables"),
U("مشروع: صفحة منسقة","تخطيط","HTML","CSS","Responsive","عرض"),
),
S("SEO وإمكانية الوصول","تحسين محركات البحث والوصول",
U("SEO أساسيات","title tag","meta description","heading structure","alt text","URL structure","مشروع: SEO"),
U("Meta Tags","viewport","charset","robots","og tags","twitter cards","مشروع: Meta"),
U("Structured Data","JSON-LD","Schema types","Rich Results","testing tool","مشروع: Structured"),
U("Sitemap و Robots","sitemap.xml","robots.txt","canonical","hreflang","مشروع: Sitemap"),
U("Accessibility أساسيات","ARIA roles","aria-label","aria-describedby","landmarks","مشروع: ARIA"),
U("Keyboard Navigation","tabindex","focus styles","skip links","keyboard traps","مشروع: Keyboard"),
U("Screen Readers","alt text","aria-live","status messages","reading order","مشروع: ScreenReader"),
U("Color و Contrast","color blindness","contrast ratio","text sizing","focus indicators","مشروع: Accessibility"),
U("مشروع: تدقيق SEO/A11y","فحص","تحسين","تحقق","تقرير","عرض"),
),
S("مشروع المستوى: موقع متكامل","تطبيق جميع مهارات HTML",
U("تخطيط","الفكرة","الصفحات","الهيكل","خطة"),
U("الهيكل","DOCTYPE","head","هيكل الصفحات","تنظيم"),
U("المحتوى","نصوص","صور","وسائط","نماذج"),
U("التنسيق","CSS","Responsive","طباعة","Dark Mode"),
U("SEO","Meta","Structured Data","Sitemap","تحسين"),
U("Accessibility","ARIA","Keyboard","Contrast","ScreenReader"),
U("اختبار","Validation","Cross-browser","Performance","Lighthouse"),
U("عرض","Demo","شرح","تحديات","دروس"),
),
),
L("المستوى الثاني: HTML متقدم","APIs, Performance, Advanced Forms","apply",
S("HTML5 APIs","Web Storage, Geolocation, Workers",
U("Web Storage","localStorage","sessionStorage","storage events","quota","مشروع: تخزين"),
U("Geolocation","getCurrentPosition","watchPosition","options","error handling","مشروع: موقع"),
U("Web Workers","Dedicated Workers","Shared Workers","postMessage","offloading","مشروع: Workers"),
U("History API","pushState","replaceState","popstate","SPA routing","مشروع: History"),
U("Drag and Drop","draggable","drag events","drop zone","files","مشروع: DragDrop"),
U("Notifications","Notification API","permission","service workers","مشروع: Notifications"),
U("Fullscreen API","requestFullscreen","exitFullscreen","fullscreenchange","مشروع: Fullscreen"),
U("Page Visibility","visibilitychange","document.hidden","use cases","مشروع: Visibility"),
U("مشروع: Web API App","تخطيط","APIs","تفاعل","عرض"),
),
S("نماذج متقدمة","Advanced Form Techniques",
U("Custom Form Controls","styled checkboxes","custom selects","toggle switches","مشروع: Custom"),
U("Form Validation API","setCustomValidity","validity","checkValidity","reportValidity","مشروع: Validation"),
U("Multi-step Forms","wizard pattern","state management","progress","validation per step","مشروع: Multi-step"),
U("Autocomplete","autocomplete attribute","datalist","suggestions","مشروع: Autocomplete"),
U("File Upload Advanced","multiple","accept","preview","drag and drop","مشروع: Upload"),
U("Form Accessibility","labels","error messages","live regions","focus management","مشروع: A11y"),
U("Payment Forms","autofill","inputmode","pattern","security","مشروع: Payment"),
U("Form Design Patterns","inline validation","floating labels","progressive disclosure","مشروع: Patterns"),
U("مشروع: نموذج متقدم","تصميم","بناء","تحقق","Accessibility","عرض"),
),
S("Performance Optimization","تحسين أداء HTML",
U("Critical Rendering Path","DOM construction","CSSOM","render tree","layout, paint","مشروع: CRP"),
U("Resource Hints","preload","prefetch","preconnect","dns-prefetch","مشروع: Hints"),
U("Lazy Loading","loading=lazy","Intersection Observer","LQIP","blur-up","مشروع: Lazy"),
U("Image Optimization","responsive images","WebP/AVIF","compression","CDN","مشروع: Images"),
U("Font Optimization","font-display","subsetting","variable fonts","system fonts","مشروع: Fonts"),
U("Script Loading","async vs defer","module","ES modules","dynamic imports","مشروع: Scripts"),
U("CSS Delivery","critical CSS","media queries","print styles","unused CSS","مشروع: CSS"),
U("Performance Metrics","Core Web Vitals","LCP, FID, CLS","Lighthouse","WebPageTest","مشروع: Metrics"),
U("مشروع: تحسين أداء","قياس","تحسين","تحقق","عرض"),
),
S("HTML Emails","تصميم بريد إلكتروني",
U("Email HTML Basics","table-based layout","inline styles","DOCTYPE","مشروع: أول بريد"),
U("Email Clients","Outlook","Gmail","Apple Mail","differences","مشروع: Testing"),
U("Responsive Email","media queries","fluid images","mobile-first","مشروع: Responsive"),
U("Email Accessibility","semantic structure","alt text","language","reading order","مشروع: A11y"),
U("Email Testing","Litmus","Email on Acid","preview","spam testing","مشروع: Testing"),
U("Email Best Practices","width limits","font stacks","background images","buttons","مشروع: Best"),
U("Dark Mode Email","prefers-color-scheme","image handling","color adjustments","مشروع: Dark"),
U("Email Automation","templates","merge tags","personalization","A/B testing","مشروع: Automation"),
U("مشروع: قالب بريد","تصميم","تطوير","اختبار","عرض"),
),
S("HTML و JavaScript","Scripting and Dynamic Content",
U("script Tag","placement","async, defer","type=module","nomodule","مشروع: Script"),
U("DOM Manipulation","querySelector","createElement","appendChild","remove","مشروع: DOM"),
U("Event Handling","addEventListener","event delegation","custom events","مشروع: Events"),
U("Template Tag","template element","content","cloneNode","use cases","مشروع: Template"),
U("data-* مع JavaScript","dataset API","data binding","observers","مشروع: Data"),
U("Mutation Observer","observe","disconnect","options","use cases","مشروع: Observer"),
U("Intersection Observer","threshold","rootMargin","lazy loading","scroll spy","مشروع: Intersection"),
U("Resize Observer","observe","content box","responsive","مشروع: Resize"),
U("مشروع: Dynamic Page","تخطيط","JS","DOM","تفاعل","عرض"),
),
S("PWA و Service Workers","Progressive Web Apps",
U("Service Workers","register","install","activate","fetch","lifecycle","مشروع: SW"),
U("Caching Strategies","cache-first","network-first","stale-while-revalidate","مشروع: Cache"),
U("Web App Manifest","manifest.json","icons","theme_color","display","مشروع: Manifest"),
U("Offline Support","offline page","background sync","periodic sync","مشروع: Offline"),
U("Push Notifications","subscription","push event","notificationclick","مشروع: Push"),
U("App Install","beforeinstallprompt","appinstalled","standalone","مشروع: Install"),
U("PWA Testing","Lighthouse PWA","Chrome DevTools","Workbox","مشروع: Testing"),
U("Advanced PWA","Background Fetch","Web Share","Contact Picker","مشروع: Advanced"),
U("مشروع: PWA","تخطيط","SW","Manifest","Offline","عرض"),
),
S("مشروع المستوى: موقع متقدم","تطبيق HTML متقدم",
U("تخطيط","المتطلبات","الصفحات","الهيكل","تقنيات"),
U("HTML Structure","Semantic","Forms","APIs","Templates"),
U("Performance","Images","Lazy","Hints","Critical CSS"),
U("JavaScript","DOM","Events","Observers","Workers"),
U("Service Worker","Cache","Offline","Push","Update"),
U("Accessibility","ARIA","Keyboard","ScreenReader","Testing"),
U("Testing","Validation","Performance","A11y","Cross-browser"),
U("عرض","Demo","Architecture","Metrics","Learnings"),
),
),
L("المستوى الثالث: مشاريع HTML","Web Components, Static Sites, Integration","create",
S("Web Components","Custom Elements, Shadow DOM",
U("Custom Elements","define","lifecycle callbacks","attributes","مشروع: Custom"),
U("Shadow DOM","attachShadow","mode","slots","styling","مشروع: Shadow"),
U("HTML Templates","template","clone","slots","مشروع: Template"),
U("CSS Shadow Parts","::part","::theme","exportparts","مشروع: Parts"),
U("Web Components Libraries","Lit","Stencil","FAST","Shoelace","مشروع: Library"),
U("Component Design","composition","events","properties","accessibility","مشروع: Design"),
U("Testing Web Components","unit tests","visual tests","a11y tests","مشروع: Testing"),
U("Web Components Ecosystem","custom-elements-everywhere","frameworks","interop","مشروع: Ecosystem"),
U("مشروع: Component Library","تصميم","تطوير","توثيق","نشر","عرض"),
),
S("Static Site Generation","SSG, Jamstack",
U("Jamstack","architecture","benefits","tools","مشروع: Jamstack"),
U("Eleventy (11ty)","setup","templates","data","collections","مشروع: 11ty"),
U("Hugo","setup","content","themes","shortcodes","مشروع: Hugo"),
U("Astro","islands","components","Markdown","deployment","مشروع: Astro"),
U("Jekyll","setup","Liquid templates","collections","plugins","مشروع: Jekyll"),
U("Headless CMS","Contentful","Strapi","Sanity","Git-based","مشروع: CMS"),
U("Deployment","Netlify","Vercel","GitHub Pages","Cloudflare","مشروع: Deploy"),
U("Static Site Patterns","blogs","docs","landing pages","ecommerce","مشروع: Patterns"),
U("مشروع: موقع SSG","تخطيط","بناء","نشر","تحسين","عرض"),
),
S("HTML Emails Professional","بريد إلكتروني احترافي",
U("Email Standards","Can I Email","client support","progressive enhancement","مشروع: Standards"),
U("MJML Framework","setup","components","responsive","build","مشروع: MJML"),
U("Foundation for Emails","setup","grid","components","inky","مشروع: Foundation"),
U("Email Design System","typography","colors","spacing","components","مشروع: Design"),
U("Transactional Emails","welcome","password reset","invoice","notification","مشروع: Transactional"),
U("Newsletter Design","digest","promotional","curated","sections","مشروع: Newsletter"),
U("Email Analytics","tracking","opens, clicks","heatmaps","A/B","مشروع: Analytics"),
U("Email Deliverability","SPF, DKIM, DMARC","reputation","spam","warming","مشروع: Deliverability"),
U("مشروع: Email System","تصميم","قوالب","أتمتة","تحليل","عرض"),
),
S("HTML Integration","Working with Frameworks",
U("HTML in React","JSX","components","fragments","portals","مشروع: React"),
U("HTML in Vue","templates","directives","slots","components","مشروع: Vue"),
U("HTML in Angular","templates","bindings","pipes","directives","مشروع: Angular"),
U("HTML in Svelte","templates","reactivity","stores","transitions","مشروع: Svelte"),
U("Template Engines","Handlebars","Nunjucks","EJS","Pug","مشروع: Engines"),
U("Server-Side Rendering","SSR benefits","hydration","streaming","frameworks","مشروع: SSR"),
U("Micro-Frontends","architecture","integration","communication","مشروع: Micro"),
U("Design Systems","Storybook","documentation","tokens","testing","مشروع: Design"),
U("مشروع: Integration","تخطيط","تطوير","اختبار","عرض"),
),
S("HTML Best Practices","Professional HTML Development",
U("Code Organization","file structure","naming","comments","sections","مشروع: Code"),
U("HTML Linting","HTMLHint","htmllint","rules","configuration","مشروع: Linting"),
U("Version Control","Git","commits","branches","code review","GitHub","مشروع: Git"),
U("Build Tools","Gulp","Grunt","npm scripts","automation","مشروع: Build"),
U("CSS Architecture","BEM","SMACSS","ITCSS","utility-first","مشروع: CSS"),
U("Testing HTML","visual regression","accessibility testing","cross-browser","مشروع: Testing"),
U("Documentation","style guides","component docs","README","wiki","مشروع: Docs"),
U("Accessibility Testing","axe","WAVE","Lighthouse","screen readers","manual testing","مشروع: A11y"),
U("مشروع: Workflow Setup","تخطيط","أدوات","أتمتة","توثيق","عرض"),
),
S("HTML Security","Web Security Basics",
U("XSS Prevention","output encoding","CSP headers","sanitization","مشروع: XSS"),
U("Content Security Policy","default-src","script-src","style-src","reporting","مشروع: CSP"),
U("iframe Security","sandbox","allow","frame-ancestors","X-Frame-Options","مشروع: iframe"),
U("Form Security","CSRF tokens","autocomplete","input validation","HTTPS","مشروع: Form"),
U("Clickjacking","X-Frame-Options","CSP frame-ancestors","framebusting","مشروع: Clickjack"),
U("CORS","Access-Control-Allow-Origin","credentials","preflight","مشروع: CORS"),
U("Subresource Integrity","integrity attribute","hash generation","crossorigin","مشروع: SRI"),
U("Security Headers","HSTS","X-Content-Type-Options","Referrer-Policy","Permissions-Policy","مشروع: Headers"),
U("مشروع: تدقيق أمني","فحص","تحليل","تحسين","تقرير","عرض"),
),
S("المشروع الختامي","تطبيق HTML احترافي",
U("اختيار الفكرة","تحليل","جدوى","نطاق","خطة"),
U("التصميم","Wireframes","Mockups","Design System","Style Guide"),
U("التطوير","Structure","Components","Features","Integration"),
U("Performance","Measure","Images","Caching","Critical Path"),
U("Accessibility","Audit","ARIA","Keyboard","Testing"),
U("SEO","Meta","Structured","Sitemap","Analytics"),
U("النشر","Build","Deploy","Domain","SSL","Monitoring"),
U("العرض","Demo","Architecture","Metrics","Learnings"),
),
),
]

MISTAKES = [
("Overfitting","دقة تدريب 99%، اختبار 65%. النموذج حفظ ولم يتعلم.","تبسيط، Regularization، CV، EarlyStopping.","افحص الفجوة بين train و test.","critical"),
("Data Leakage","Scaler قبل التقسيم = اختبار يتسرب.","اقسم أولاً. scaler.fit(X_train). scaler.transform(X_test).","Pipeline يمنع Data Leakage.","critical"),
("نسيان alt للصور","صورة بدون alt = inaccessible.","أضف alt يصف الصورة. alt='' للصور التزيينية.","alt ضروري لـ accessibility و SEO.","major"),
("عدم استخدام Semantic HTML","div soup يصعب قراءته.","استخدم header, nav, main, article, section, footer.","Semantic HTML يحسن SEO و accessibility.","major"),
("نسيان closing tags","وسم غير مغلق قد يحطم التخطيط.","أغلق كل الوسوم. اختبر بـ HTML validator.","بعض الوسوم self-closing مثل img و br.","minor"),
("عدم توحيد encoding","ملف بترميز مختلف عن charset = تشوه النصوص.","استخدم UTF-8. حدد <meta charset='UTF-8'>.","UTF-8 يدعم كل اللغات.","minor"),
("إهمال form validation","نموذج بدون تحقق = بيانات غير صالحة.","استخدم HTML5 validation attributes. أضف JS validation.","لا تثق بمدخلات المستخدم أبداً.","major"),
("عدم تحسين الصور","صورة 5MB على موبايل = بطء شديد.","استخدم srcset و sizes. ضغط الصور. استخدم WebP.","الصور المحسنة = موقع أسرع = تجربة أفضل.","major"),
]

def mb(p,c):return[f"الآن أتقنتَ {p}، نرتقي إلى {c}.",f"في الدرس السابق فككنا {p}. اليوم نبني عليه بـ {c}.",f"بعد {p}، {c} يسد الفجوة التالية.",f"{p} كان الأساس. {c} هو الطابق التالي.",][h(p+c)%4]

def gl(uc,lt,sn):
 ls=[];pv="المفاهيم الأساسية"
 for li,t in enumerate(lt,1):
  nm=2+(h(f"{uc}_{li}")%2);lm=[{"mistake":f"{m[0]}\n{m[1]}","correction":m[2],"treatment":m[3],"severity":m[4]} for m in [MISTAKES[(h(f"{uc}_{li}_{mi}"))%len(MISTAKES)] for mi in range(nm)]]
  ls.append({"lesson_index":li,"name":t,"goal":f"فهم وتطبيق {t}","bridge_sentence":mb(pv,t),"prerequisite_lessons":[] if li==1 else [f"{uc}.{li-1}"],"enables_lessons":[] if li==len(lt) else [f"{uc}.{li+1}"],"final_check_question":f"اشرح {t} بكلماتك. خطوات تطبيقه؟ أشهر خطأ؟","session_complete_criterion":f"يشرح {t} ويطبقه","yemeni_examples":[f"تطبيق عملي: {t}."],"expected_duration_minutes":30,"estimated_gem_cost":90,"solution_outline":f"خطوات {t}:\n1. فهم\n2. تطبيق\n3. تجربة\n4. تحليل\n5. توثيق","motivation_hook":f"{t} — مهارة أساسية في HTML.","learning_objectives":[{"statement":f"يفهم {t}","bloom_level":"understand"},{"statement":f"يطبق {t}","bloom_level":"apply"}],"glossary":[],"concepts":[{"name":t,"explanation":f"شرح وتطبيق عملي لـ {t}.","mastery_criterion":f"يشرح {t} ويطبقه","weight":1}],"common_mistakes":lm});pv=t
 return ls

def glab(uc,un,nl):
 return[{"lab_index":li,"title":f"معمل {un}: {'التشخيص' if li==1 else 'التطبيق'}","scenario":f"مشكلة تقنية في {un} تحتاج إلى تحليل وحل عملي.","completion_criterion":f"تحليل وحل","pedagogical_sequence":"diagnostic -> decision -> application -> analysis -> connection","prerequisite_lessons":[f"{uc}.{max(1,nl//2)}"],"allowed_tools":["text","code"],"questions":[{"kind":"diagnostic","prompt":f"خطوات تشخيص مشكلة في {un}؟","rubric":"ذكر 4 خطوات منطقية مع شرح","solution_outline":"جمع وتحليل وتحديد واقتراح","points":1},{"kind":"decision","prompt":f"خياران لحل في {un}. معاييرك؟","rubric":"ذكر معيارين مع تبرير","solution_outline":"الدقة والسرعة والتعقيد","points":1},{"kind":"application","prompt":f"اكتب كوداً يطبق {un}.","rubric":"كود صحيح يعمل","solution_outline":"استيراد وتطبيق","points":2},{"kind":"analysis","prompt":f"كود لـ {un} فيه 3 أخطاء.","rubric":"3 أخطاء مع تصحيح","solution_outline":"تحليل وتصحيح","points":1},{"kind":"connection","prompt":f"اربط {un} بمهارات سابقة.","rubric":"رابطان مع فكرة","solution_outline":"الربط وخطة","points":1}]} for li in range(1,3)]

def ge(c,s,n=10):
 q=[("HTML:",["HyperText Markup Language","بروتوكول","خادم","لغة برمجة"],0,1,"لغة ترميز."),("alt في img:",["نص بديل","لون","حجم","رابط"],0,1,"للوصف و accessibility."),("Semantic HTML:",["يحسن SEO","يبطئ","للتزيين","غير مهم"],0,1,"يحسن المعنى."),("Overfitting:",["يحفظ ولا يعمم","بسيط","سريع","قليل"],0,2,"فشل على بيانات جديدة."),("Cross-Validation:",["تقييم موثوق","تسريع","زيادة","تغيير"],0,2,"k-fold."),("df.describe():",["إحصائيات","حذف","رسم","تغيير"],0,1,"وصف إحصائي."),("Data Leakage:",["تسرب الاختبار","فقدان","تسرب ذاكرة","توقف"],0,2,"أخطر خطأ."),("StandardScaler:",["توحيد مقياس","زيادة","تسريع","تغيير"],0,1,"mean=0, std=1.")]
 vv=[]
 for v in range(3):vv.append([{"question_index":qi+1,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {ch}" for ci,ch in enumerate(c)],"correct_index":ci,"explanation":e,"difficulty":d,"points":1,"time_limit_seconds":60+d*30} for qi,(p,c,ci,d,e) in enumerate([q[(h(f"{s}_{v}_{qi}"))%len(q)] for qi in range(n)])])
 return{"code":s,"scope":c,"variants":vv}

def gp():
 q=[(1,"HTML:",["لغة ترميز","لغة برمجة","قاعدة بيانات","نظام تشغيل"],0,1),(1,"img tag:",["لإدراج الصور","للروابط","للجداول","للقوائم"],0,1),(2,"Semantic HTML:",["يحسن SEO","للألعاب","للخوادم","للبيانات"],0,2),(3,"Web Components:",["عناصر مخصصة","خادم","قاعدة","بروتوكول"],0,2)]
 return[{"target_level_index":l,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {c}" for ci,c in enumerate(c)],"correct_index":ci,"difficulty":d,"explanation":f"مستوى {l}"} for l,p,c,ci,d in q]*3

def main():
 print(f"\n{'='*60}\n  skill-html — HTML\n{'='*60}\n")
 mt={"slug":"skill-html","name":"HTML","icon":"🌐","desc":"منهج متكامل: من الوسوم الأساسية إلى Web Components.","scope":"professional_track","language":"ar","region":"YE","target_persona":"مطور واجهات أمامية.","teacher_tone":"عملية ومباشرة.","viz":["wireframe","html_skeleton","web_page_preview"],"tools":["text","code","image"],"glossary":[{"term":"HTML","definition":"HyperText Markup Language"}]}
 rl=[];au=[];asc=[]
 for li,(ln,lg,lb,ss) in enumerate(CURRICULUM):
  lv=li+1;rs=[]
  for si,(sn,sg,us) in enumerate(ss):
   sv=si+1;sc=f"{lv}.{sv}";asc.append(sc);ru=[]
   for ui,(un,lt) in enumerate(us):
    lt=[t for t in lt if t and len(t)>=3];uv=ui+1;uc=f"{sc}.{uv}";au.append(uc)
    ls=gl(uc,lt,sn);la=glab(uc,un,len(ls))
    pr=[f"{sc}.{ui}"] if ui>0 else[];en=[f"{sc}.{ui+2}"] if ui<len(us)-1 else[]
    g=f"إتقان {un}";g=g if len(g)>=10 else f"إتقان {un} بشكل متقن"
    ru.append({"unit_index":uv,"name":un,"goal":g,"prerequisite_units":pr,"enables_units":en,"key_concepts":[lt[0][:20]],"motivation_hook":f"وحدة {un} — خطوتك نحو الاحتراف.","learning_objectives":[{"statement":f"يتقن {un}","bloom_level":"apply"}],"lessons":ls,"labs":la,"exam":{"pass_threshold_percent":60,"points":10,"time_limit_minutes":30}})
    print(f"  {uc}: {un[:50]} ({len(lt)} دروس)")
   rs.append({"stage_index":sv,"name":sn,"goal":sg,"bloom_focus":lb,"units":ru,"exam":{"pass_threshold_percent":60,"points":20,"time_limit_minutes":45}})
  rl.append({"level_index":lv,"name":ln,"goal":lg,"bloom_focus":lb,"stages":rs,"exam":{"pass_threshold_percent":60,"points":50,"time_limit_minutes":90}})
 print("\n  بنوك الامتحانات...")
 ub={c:ge(c,"unit",10) for c in au}
 sb={c:ge(c,"stage",15) for c in asc}
 lb={str(i):ge(str(i),"level",20) for i in range(1,len(rl)+1)}
 fn={"schema_version":"v4.1","specialty":{**mt,"yemeni_examples":["تطبيق عملي"]},"levels":rl,"exam_banks":{"unit_banks":ub,"stage_banks":sb,"level_banks":lb},"placement_test_questions":gp(),"publish_notes":"skill-html — تسلسل منطقي"}
 fp=OUT/"final.json"
 with open(fp,'w',encoding='utf-8') as f:json.dump(fn,f,ensure_ascii=False,indent=2)
 sz=fp.stat().st_size/(1024*1024);tl=sum(1 for l in rl for s in l['stages'] for u in s['units'] for _ in u['lessons'])
 print(f"\n  ✅ {sz:.1f} MB | {len(rl)} مستويات | {tl} درس\n")
if __name__=="__main__":main()

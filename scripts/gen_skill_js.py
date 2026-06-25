#!/usr/bin/env python3
"""skill-js — JavaScript — 3 مستويات"""
import json; from pathlib import Path; import random
random.seed(42)
def h(s): return sum(ord(c)*(i+1) for i,c in enumerate(str(s)))
OUT = Path("out/skill-js"); OUT.mkdir(parents=True, exist_ok=True)
def U(n,*l): return (n,list(l))
def S(n,g,*u): return (n,g,list(u))
def L(n,g,b,*s): return (n,g,b,list(s))

CURRICULUM = [
L("المستوى الأول: أساسيات JavaScript","إتقان المتغيرات، الشروط، الحلقات، الدوال، DOM","apply",
S("أساسيات اللغة","المتغيرات، الأنواع، العمليات",
U("مقدمة JavaScript","ما هو JavaScript؟","إضافة JS لـ HTML","console.log()","المتغيرات: let, const","var ولماذا نتجنبه","التعليقات","أول برنامج","مشروع: Hello World"),
U("أنواع البيانات","string","number","boolean","null و undefined","symbol","typeof","التحويلات","مشروع: مدقق أنواع"),
U("العمليات","الحسابية + - * / % **","المقارنة == === != !==","المنطقية && || !","string concatenation","Template Literals","أولوية العمليات","مشروع: حاسبة"),
U("السلاسل النصية","length","indexOf, includes","slice, substring","toUpperCase, toLowerCase","replace, split, join","trim","مشروع: معالج نصوص"),
U("المصفوفات Arrays","إنشاء","الفهرسة","push, pop","shift, unshift","splice, slice","forEach","مشروع: قائمة مهام"),
U("طرق المصفوفات","map()","filter()","reduce()","find, findIndex","sort","some, every","مشروع: تحليل بيانات"),
U("الكائنات Objects","إنشاء","dot notation","bracket notation","إضافة/حذف خصائص","Object.keys/values/entries","Spread Operator","مشروع: قاموس"),
U("الجمل الشرطية","if/else","else if","Ternary Operator","switch/case","truthy/falsy","Nullish Coalescing","مشروع: لعبة"),
U("مشروع: تطبيق تفاعلي","تخطيط","بناء","تفاعل","اختبار","عرض"),
),
S("الحلقات والدوال","التكرار والمنطق القابل لإعادة الاستخدام",
U("الحلقات for","for","for...of","for...in","forEach","break, continue","حلقات متداخلة","مشروع: جدول"),
U("الحلقات while","while","do...while","avoid infinite","when to use","مشروع: تخمين"),
U("الدوال الأساسية","function declaration","parameters","return","default parameters","hoisting","مشروع: دوال رياضية"),
U("الدوال المتقدمة","Arrow Functions","Rest Parameters","Spread in functions","Callback Functions","Closures","مشروع: معالج"),
U("نطاق المتغيرات","global","function scope","block scope","let vs var","Hoisting","Temporal Dead Zone","مشروع: نطاق"),
U("التكرار الذاتي Recursion","Base Case","Recursive Case","factorial","fibonacci","tree traversal","مشروع: Fibonacci"),
U("معالجة الأخطاء","try/catch","throw","finally","Error types","debugging","مشروع: تطبيق آمن"),
U("Higher-Order Functions","functions as arguments","returning functions","compose","curry","مشروع: HOF"),
U("مشروع: مكتبة دوال","تخطيط","تنفيذ","اختبار","توثيق","عرض"),
),
S("DOM Manipulation","التعامل مع واجهة المستند",
U("مقدمة DOM","ما هو DOM؟","document object","querySelector","querySelectorAll","getElementById","مشروع: استكشاف"),
U("تعديل المحتوى","textContent","innerHTML","createElement","appendChild","remove","replaceChild","مشروع: قائمة ديناميكية"),
U("الخصائص Attributes","setAttribute","getAttribute","classList.add/remove/toggle","style property","data attributes","مشروع: مفتاح ليلي"),
U("التنقل في DOM","parentNode","children","firstChild","nextSibling","closest","matches","مشروع: تنقل"),
U("Events","addEventListener","click, keydown, submit","event object","preventDefault","stopPropagation","مشروع: أحداث"),
U("Event Delegation","Bubbling","Capturing","target vs currentTarget","delegation pattern","مشروع: تفويض"),
U("Forms","FormData","validation","submit event","input/change events","reset","مشروع: نموذج"),
U("Animations","setTimeout","setInterval","requestAnimationFrame","CSS transitions + JS","مشروع: حركة"),
U("مشروع: لعبة DOM","تخطيط","بناء","تفاعل","اختبار","عرض"),
),
S("العمل مع البيانات","JSON, APIs, Async",
U("JSON","JSON.parse","JSON.stringify","JSON structure","validating","deep clone","مشروع: معالج JSON"),
U("Fetch API","fetch()","GET requests","response.json()","Error handling","loading states","مشروع: جالب بيانات"),
U("Async/Await","async function","await","try/catch with async","Promise.all","sequential vs parallel","مشروع: Async"),
U("Promises","new Promise","resolve, reject",".then, .catch",".finally","Promise Chaining","مشروع: Promises"),
U("LocalStorage","setItem, getItem","removeItem","JSON storage","sessionStorage","storage limits","مشروع: تخزين"),
U("Cookies","document.cookie","setting cookies","reading cookies","cookie attributes","مشروع: تفضيلات"),
U("Timers","setTimeout","setInterval","clearTimeout","clearInterval","debounce","throttle","مشروع: Debounce"),
U("Error Handling","try/catch with async","global error handler","user-friendly errors","logging","مشروع: أخطاء"),
U("مشروع: تطبيق بيانات","تخطيط","API","تخزين","عرض"),
),
S("ES6+ والميزات الحديثة","JavaScript الحديث",
U("Destructuring","Array destructuring","Object destructuring","Default values","Nested destructuring","Rest in destructuring","مشروع: Destructure"),
U("Spread و Rest","Spread in arrays","Spread in objects","Rest parameters","Shallow copy","Merge","مشروع: Spread"),
U("Template Literals","Basic usage","Expressions","Tagged templates","Multi-line","مشروع: Templates"),
U("Modules","export","import","default export","named export","dynamic import","مشروع: Modules"),
U("Classes","class syntax","constructor","methods","getters/setters","static methods","مشروع: Classes"),
U("Inheritance","extends","super","method override","instanceof","مشروع: وراثة"),
U("Optional Chaining","?. operator","Nullish Coalescing ??","Logical Assignment","مشروع: Chaining"),
U("Sets و Maps","Set: unique values","Map: key-value","WeakSet, WeakMap","use cases","مشروع: Collections"),
U("مشروع: تطبيق ES6+","تخطيط","تطوير","مراجعة","عرض"),
),
S("مكتبات وأدوات JavaScript","npm, Webpack, Testing",
U("npm","package.json","npm init","npm install","dependencies vs devDependencies","scripts","مشروع: npm"),
U("Webpack","bundling","loaders","plugins","dev server","production build","مشروع: Webpack"),
U("Babel","transpilation","presets","plugins","browser compatibility","مشروع: Babel"),
U("ESLint","rules","configuration","plugins","auto-fix","مشروع: ESLint"),
U("Prettier","formatting","configuration","integration","مشروع: Prettier"),
U("Jest","unit testing","assertions","mocks","coverage","مشروع: Jest"),
U("Git","git init","add, commit","branch, merge","GitHub","مشروع: Git"),
U("Debugging","Chrome DevTools","breakpoints","console methods","Network tab","مشروع: Debugging"),
U("مشروع: إعداد مشروع","تخطيط","npm","Webpack","ESLint","Git","عرض"),
),
S("مشروع المستوى: تطبيق ويب","تطبيق شامل",
U("تخطيط","فكرة","متطلبات","تصميم","خطة"),
U("HTML/CSS","هيكل","تنسيق","Responsive","Components"),
U("JavaScript Logic","State","Functions","Events","Data"),
U("API Integration","Fetch","Async/Await","Error","Loading"),
U("Data Storage","LocalStorage","Session","Cache","Sync"),
U("Testing","Unit","Integration","Manual","Fixes"),
U("Deployment","Build","Static Host","Domain","SSL"),
U("عرض","Demo","شرح","تحديات","دروس"),
),
),
L("المستوى الثاني: JavaScript المتقدم","OOP, Async, Performance, APIs","apply",
S("Object-Oriented JavaScript","Classes, Prototypes, Design Patterns",
U("Constructor Functions","new keyword","this binding","prototype","__proto__","مشروع: Constructor"),
U("Prototypal Inheritance","Prototype Chain","Object.create","hasOwnProperty","مشروع: Prototype"),
U("ES6 Classes بعمق","Private Fields #","Static","Getters/Setters","instanceof","مشروع: Classes"),
U("Mixins","Object.assign","Functional Mixins","Composition","مشروع: Mixins"),
U("Factory Functions","closures for privacy","Object.freeze","advantages","مشروع: Factory"),
U("Design Patterns","Singleton","Observer","Module Pattern","Factory Pattern","مشروع: Patterns"),
U("SOLID Principles","Single Responsibility","Open/Closed","Liskov","Interface Segregation","Dependency Inversion","مشروع: SOLID"),
U("this binding","call, apply, bind","Arrow functions this","Event handlers","setTimeout this","مشروع: this"),
U("مشروع: نظام OOP","تصميم","تنفيذ","اختبار","عرض"),
),
S("Async JavaScript بعمق","Promises, Async/Await, Event Loop",
U("Event Loop","Call Stack","Task Queue","Microtasks","Macrotasks","مشروع: Event Loop"),
U("Promises بعمق","Promise States","Chaining","Error Propagation","Promise.allSettled","Promise.any","مشروع: Promises"),
U("Async/Await بعمق","Error Handling","Sequential vs Parallel","for-await-of","Top-level await","مشروع: Async"),
U("Generators","function*","yield","next()","Generator as Iterator","Async Generators","مشروع: Generators"),
U("Web Workers","Dedicated Workers","postMessage","Shared Workers","offloading","مشروع: Workers"),
U("AbortController","AbortSignal","fetch abort","timeout pattern","race condition","مشروع: Abort"),
U("Observables","RxJS basics","Observable creation","Operators","Subscription","مشروع: RxJS"),
U("Concurrency Patterns","Semaphore","Mutex","Queue","Rate Limiter","مشروع: Concurrency"),
U("مشروع: Async App","تخطيط","تنفيذ","تحسين","عرض"),
),
S("Performance Optimization","تحسين أداء JavaScript",
U("Measuring Performance","Performance API","console.time","Lighthouse","Web Vitals","مشروع: قياس"),
U("Rendering Performance","Reflow/Repaint","requestAnimationFrame","will-change","contain","مشروع: Rendering"),
U("Memory Management","Garbage Collection","Memory Leaks","Heap Snapshots","WeakRef","مشروع: Memory"),
U("Code Splitting","Dynamic imports","lazy loading","Tree Shaking","Bundle Analysis","مشروع: Splitting"),
U("Caching Strategies","Memoization","Service Worker Cache","HTTP Cache","ETags","مشروع: Cache"),
U("DOM Performance","Batch DOM updates","DocumentFragment","Virtual Scrolling","Event Delegation","مشروع: DOM"),
U("Network Performance","Minification","Compression","CDN","Resource Hints","مشروع: Network"),
U("Web Workers for Performance","Offloading computation","Transferable objects","SharedArrayBuffer","مشروع: Workers"),
U("مشروع: تحسين أداء","تحليل","تحسين","قياس","عرض"),
),
S("Web APIs","Canvas, WebGL, WebRTC, Sensors",
U("Canvas API","context","drawing shapes","paths","text","transformations","مشروع: Canvas"),
U("Canvas Advanced","images","animations","pixel manipulation","filters","مشروع: متقدم"),
U("WebGL Basics","Three.js","scene, camera, renderer","geometries","materials","lighting","مشروع: WebGL"),
U("Web Audio API","AudioContext","oscillators","filters","visualization","مشروع: Audio"),
U("WebRTC","PeerConnection","MediaStream","DataChannel","Signaling","مشروع: WebRTC"),
U("Geolocation","getCurrentPosition","watchPosition","options","error handling","مشروع: Geo"),
U("Notifications","Notification API","permission","Push API","Service Workers","مشروع: Notifications"),
U("Device Sensors","DeviceOrientation","DeviceMotion","AmbientLight","Battery Status","مشروع: Sensors"),
U("مشروع: Web API App","تخطيط","API","تفاعل","عرض"),
),
S("TypeScript","JavaScript مع أنواع",
U("TypeScript Basics","types","interfaces","type inference","compilation","tsconfig","مشروع: TS"),
U("Advanced Types","Union, Intersection","Generics","Conditional Types","Mapped Types","Template Literal Types","مشروع: Types"),
U("Classes in TS","access modifiers","abstract","implements","decorators","مشروع: Classes"),
U("Modules in TS","ES Modules","namespaces","declaration files","paths","مشروع: Modules"),
U("TypeScript with React","FC, Props","useState, useRef","Event types","Generic Components","مشروع: TS React"),
U("TypeScript with Node","Express types","database types","environment types","middleware types","مشروع: TS Node"),
U("Utility Types","Partial, Required","Pick, Omit","Record, Readonly","ReturnType","مشروع: Utility"),
U("Migration to TS","gradual adoption","allowJs","strict mode","linting","مشروع: Migration"),
U("مشروع: TS App","تخطيط","تطوير","Type-safe","عرض"),
),
S("Testing JavaScript","Unit, Integration, E2E Testing",
U("Jest بعمق","describe/it","expect matchers","async tests","setup/teardown","مشروع: Jest"),
U("Mocking","jest.fn()","jest.mock()","manual mocks","spies","مشروع: Mocking"),
U("React Testing Library","render","queries","userEvent","fireEvent","act","مشروع: RTL"),
U("Cypress","E2E testing","visit, get, click","assertions","fixtures","مشروع: Cypress"),
U("Playwright","cross-browser","auto-wait","trace viewer","API testing","مشروع: Playwright"),
U("Integration Testing","API tests","Database tests","Test doubles","مشروع: Integration"),
U("Snapshot Testing","toMatchSnapshot","inline snapshots","update","مشروع: Snapshot"),
U("CI/CD Testing","GitHub Actions","parallel testing","coverage reports","flaky tests","مشروع: CI"),
U("مشروع: Test Suite","تخطيط","كتابة","تشغيل","تغطية","عرض"),
),
S("مشروع المستوى: تطبيق SPA","Single Page Application",
U("تخطيط","فكرة","Features","Mockups","Architecture"),
U("Routing","History API","Hash Router","Route params","Guards"),
U("State Management","Custom Store","Observer Pattern","Reducers","Immutability"),
U("UI Components","Custom Elements","Templates","Styling","Responsive"),
U("Backend Integration","REST API","Authentication","WebSockets","Error Handling"),
U("Testing","Jest","RTL","Cypress","Coverage"),
U("Deployment","Build","CDN","Domain","SSL"),
U("عرض","Demo","Architecture","Challenges","Learnings"),
),
),
L("المستوى الثالث: تطبيقات ومشاريع JavaScript","Node.js, Frameworks, Full-Stack","create",
S("Node.js","JavaScript على الخادم",
U("مقدمة Node.js","ما هو Node.js؟","Event Loop","npm init","CommonJS vs ES Modules","__dirname","مشروع: أول خادم"),
U("File System","fs.readFile","fs.writeFile","fs promises","streams","مشروع: ملفات"),
U("HTTP Module","createServer","request, response","routing","query strings","مشروع: خادم"),
U("Express.js","Routes","Middleware","Request/Response","Error Handling","مشروع: Express"),
U("Express متقدم","Router","Static Files","Template Engines","CORS","Security","مشروع: متقدم"),
U("Authentication","JWT","bcrypt","sessions","OAuth 2.0","مشروع: Auth"),
U("Database Integration","MongoDB/Mongoose","PostgreSQL","Sequelize/Prisma","Migrations","مشروع: DB"),
U("REST API Design","Resources","Methods","Status Codes","Validation","Pagination","مشروع: API"),
U("مشروع: Backend API","تخطيط","تطوير","توثيق","نشر","عرض"),
),
S("React","مكتبة الواجهات الأمامية",
U("مقدمة React","JSX","Components","Props","Rendering","create-react-app","Vite","مشروع: أول مكون"),
U("State و Events","useState","Event Handling","Forms","Lifting State","useReducer","مشروع: State"),
U("useEffect","Side Effects","Cleanup","Dependencies","Data Fetching","مشروع: Effect"),
U("Hooks","useContext","useRef","useMemo","useCallback","Custom Hooks","مشروع: Hooks"),
U("React Router","BrowserRouter","Route","Link","useParams","useNavigate","مشروع: Router"),
U("State Management","Context API","Redux","Zustand","React Query","مشروع: State"),
U("Styling","CSS Modules","Styled Components","Tailwind CSS","CSS-in-JS","مشروع: Styling"),
U("Testing React","Jest","React Testing Library","Cypress","Storybook","مشروع: Testing"),
U("مشروع: React App","تخطيط","تطوير","Styling","نشر","عرض"),
),
S("Vue.js","إطار العمل التقدمي",
U("مقدمة Vue","Reactivity","Template Syntax","Components","Vue CLI","Vite","مشروع: أول مكون"),
U("Directives","v-bind","v-model","v-if/v-show","v-for","v-on","Custom Directives","مشروع: Directives"),
U("Composition API","ref, reactive","computed","watch","lifecycle hooks","مشروع: Composition"),
U("Vue Router","routes","navigation","guards","lazy loading","مشروع: Router"),
U("State Management","Pinia","Store","Actions","Getters","مشروع: Pinia"),
U("Vue Ecosystem","VueUse","VeeValidate","vue-i18n","Nuxt.js intro","مشروع: Ecosystem"),
U("Testing Vue","Vitest","Vue Test Utils","Cypress","مشروع: Testing"),
U("Vue vs React","Philosophy","Learning Curve","Performance","Ecosystem","مشروع: مقارنة"),
U("مشروع: Vue App","تخطيط","تطوير","نشر","عرض"),
),
S("Next.js","React للإنتاج",
U("مقدمة Next.js","Pages Router","App Router","File-based Routing","Layouts","مشروع: أول صفحة"),
U("Rendering","SSR","SSG","ISR","CSR","مشروع: Rendering"),
U("Data Fetching","getServerSideProps","getStaticProps","fetch in Components","React Query","مشروع: Data"),
U("API Routes","Route Handlers","Middleware","Edge Functions","مشروع: API"),
U("Authentication","NextAuth.js","Credentials","OAuth","Session","مشروع: Auth"),
U("Styling","CSS Modules","Tailwind","Styled JSX","Global CSS","مشروع: Styling"),
U("Deployment","Vercel","Docker","Environment Variables","Analytics","مشروع: Deployment"),
U("Advanced","Middleware","ISR revalidation","Image Optimization","Internationalization","مشروع: Advanced"),
U("مشروع: Next.js App","تخطيط","تطوير","SEO","نشر","عرض"),
),
S("Full-Stack Development","Frontend + Backend",
U("Architecture","Monolith vs Microservices","API Design","Database Design","مشروع: Architecture"),
U("Git Workflow","Feature Branches","Pull Requests","Code Review","CI/CD","مشروع: Git"),
U("Environment","dev, staging, production",".env","Docker","Docker Compose","مشروع: Environment"),
U("API Design","RESTful","GraphQL","tRPC","WebSockets","مشروع: API"),
U("Database","Relational","Document","Graph","Time Series","مشروع: DB"),
U("Testing","Unit","Integration","E2E","Performance","مشروع: Testing"),
U("Monitoring","Logging","Error Tracking","Performance Monitoring","Alerting","مشروع: Monitoring"),
U("Security","OWASP","Helmet","CORS","Rate Limiting","Input Validation","مشروع: Security"),
U("مشروع: Full-Stack","تخطيط","تطوير","اختبار","نشر","عرض"),
),
S("Mobile و Desktop Apps","تطبيقات متعددة المنصات",
U("React Native","Components","Navigation","Native APIs","مشروع: RN"),
U("Electron","Main/Renderer Process","IPC","Native Menus","مشروع: Electron"),
U("Progressive Web Apps","Service Workers","Manifest","Offline","Install","مشروع: PWA"),
U("Capacitor/Cordova","Web to Native","Plugins","Native Bridge","مشروع: Hybrid"),
U("Expo","Managed Workflow","EAS Build","OTA Updates","مشروع: Expo"),
U("Performance in Mobile","60fps","Image Optimization","Lazy Loading","مشروع: Perf"),
U("Publishing","App Store","Google Play","Microsoft Store","مشروع: Publish"),
U("Cross-platform Strategy","Web vs Native vs Hybrid","When to use what","مشروع: Strategy"),
U("مشروع: Mobile App","تخطيط","تطوير","اختبار","نشر","عرض"),
),
S("المشروع الختامي","تطبيق JavaScript احترافي",
U("اختيار الفكرة","تحليل","جدوى","نطاق","خطة"),
U("تصميم","Architecture","UI/UX","Database","API"),
U("تطوير Frontend","Components","State","Routing","Styling"),
U("تطوير Backend","API","Database","Auth","Validation"),
U("تكامل","Frontend-Backend","Error Handling","Loading","Edge Cases"),
U("اختبار","Unit","Integration","E2E","Performance"),
U("نشر","Build","Docker","CI/CD","Cloud"),
U("عرض","Demo","Architecture","Challenges","Learnings"),
),
),
]

MISTAKES = [
("Overfitting","دقة تدريب 99%، اختبار 65%. النموذج حفظ ولم يتعلم.","تبسيط، Regularization، CV، EarlyStopping.","افحص الفجوة بين train و test.","critical"),
("عدم توحيد المقياس","متغير 1-1000 يسيطر على المسافات.","StandardScaler قبل K-Means, KNN, SVM, NN.","Trees لا تحتاج scaling.","major"),
("Data Leakage","Scaler قبل التقسيم = اختبار يتسرب.","اقسم أولاً. scaler.fit(X_train). scaler.transform(X_test).","Pipeline يمنع Data Leakage.","critical"),
("var vs let/const","var له function scope ويسبب hoisting غير متوقع.","استخدم const دائماً، و let فقط عند الحاجة للتغيير.","var يعتبر outdated. استخدم const/let.","major"),
("== vs ===","== يقارن القيم مع type coercion, === يقارن النوع والقيمة.","استخدم === دائماً. فقط استخدم == عندما تريد coercion مقصوداً.","الـ type coercion سبب رئيسي للأخطاء الغامضة.","major"),
("نسيان return في map","map بدون return يعيد [undefined, undefined, ...].","تأكد من return في map callback. أو استخدم forEach إذا لم ترد قيمة راجعة.","إذا رأيت undefined في نتائج map، فأنت نسيت return.","minor"),
("تعديل state مباشرة في React","state.push() لا يشغل re-render.","استخدم setState مع نسخة جديدة: setState([...old, new]).","React يعتمد على immutability لاكتشاف التغييرات.","major"),
("callback hell","تداخل callbacks يصعب قراءته.","استخدم Promises و async/await.","كلما تعمقت callbacks، صعب debugging.","minor"),
]

def mb(p,c):return[f"الآن أتقنتَ {p}، نرتقي إلى {c}.",f"في الدرس السابق فككنا {p}. اليوم نبني عليه بـ {c}.",f"بعد {p}، {c} يسد الفجوة التالية.",f"{p} كان الأساس. {c} هو الطابق التالي.",][h(p+c)%4]

def gl(uc,lt,sn):
 ls=[];pv="المفاهيم الأساسية"
 for li,t in enumerate(lt,1):
  nm=2+(h(f"{uc}_{li}")%2);lm=[{"mistake":f"{m[0]}\n{m[1]}","correction":m[2],"treatment":m[3],"severity":m[4]} for m in [MISTAKES[(h(f"{uc}_{li}_{mi}"))%len(MISTAKES)] for mi in range(nm)]]
  ls.append({"lesson_index":li,"name":t,"goal":f"فهم وتطبيق {t}","bridge_sentence":mb(pv,t),"prerequisite_lessons":[] if li==1 else [f"{uc}.{li-1}"],"enables_lessons":[] if li==len(lt) else [f"{uc}.{li+1}"],"final_check_question":f"اشرح {t} بكلماتك. خطوات تطبيقه؟ أشهر خطأ؟","session_complete_criterion":f"يشرح {t} ويطبقه","yemeni_examples":[f"تطبيق عملي: {t}."],"expected_duration_minutes":30,"estimated_gem_cost":90,"solution_outline":f"خطوات {t}:\n1. فهم الأساس\n2. تطبيق\n3. تجربة\n4. تحليل\n5. توثيق","motivation_hook":f"{t} — مهارة أساسية في JavaScript.","learning_objectives":[{"statement":f"يفهم {t}","bloom_level":"understand"},{"statement":f"يطبق {t}","bloom_level":"apply"}],"glossary":[],"concepts":[{"name":t,"explanation":f"شرح وتطبيق عملي لـ {t}.","mastery_criterion":f"يشرح {t} ويطبقه","weight":1}],"common_mistakes":lm});pv=t
 return ls

def glab(uc,un,nl):
 return[{"lab_index":li,"title":f"معمل {un}: {'التشخيص' if li==1 else 'التطبيق'}","scenario":f"مشكلة تقنية في {un} تحتاج إلى تحليل وحل عملي.","completion_criterion":f"تحليل وحل","pedagogical_sequence":"diagnostic -> decision -> application -> analysis -> connection","prerequisite_lessons":[f"{uc}.{max(1,nl//2)}"],"allowed_tools":["text","code"],"questions":[{"kind":"diagnostic","prompt":f"خطوات تشخيص مشكلة في {un}؟","rubric":"ذكر 4 خطوات منطقية مع شرح","solution_outline":"جمع وتحليل وتحديد واقتراح","points":1},{"kind":"decision","prompt":f"خياران لحل في {un}. معاييرك؟","rubric":"ذكر معيارين مع تبرير","solution_outline":"الدقة والسرعة والتعقيد","points":1},{"kind":"application","prompt":f"اكتب كوداً يطبق {un}.","rubric":"كود صحيح يعمل","solution_outline":"استيراد وتطبيق","points":2},{"kind":"analysis","prompt":f"كود لـ {un} فيه 3 أخطاء.","rubric":"3 أخطاء مع تصحيح","solution_outline":"تحليل وتصحيح","points":1},{"kind":"connection","prompt":f"اربط {un} بمهارات سابقة.","rubric":"رابطان مع فكرة","solution_outline":"الربط وخطة","points":1}]} for li in range(1,3)]

def ge(c,s,n=10):
 q=[("JavaScript نوع:",["مفسرة","مترجمة","Assembly","Bytecode"],0,1,"JS لغة مفسرة."),("let vs var:",["let block-scoped","لا فرق","var أسرع","let أقدم"],0,1,"let له block scope."),("=== vs ==:",["=== صارم","== صارم","لا فرق","=== أضعف"],0,1,"=== يقارن النوع والقيمة."),("Overfitting:",["يحفظ ولا يعمم","بسيط","سريع","قليل بيانات"],0,2,"أداء تدريب ممتاز، فشل على جديدة."),("Cross-Validation:",["تقييم موثوق","تسريع","زيادة","تغيير"],0,2,"يقسم لـ k أجزاء."),("ReLU:",["ReLU","Sigmoid","Softmax","Linear"],0,2,"تحل Vanishing Gradient."),("df.describe():",["إحصائيات","حذف","رسم","تغيير"],0,1,"وصف إحصائي."),("Data Leakage:",["تسرب الاختبار","فقدان","تسرب ذاكرة","توقف"],0,2,"أخطر خطأ.")]
 vv=[]
 for v in range(3):vv.append([{"question_index":qi+1,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {ch}" for ci,ch in enumerate(c)],"correct_index":ci,"explanation":e,"difficulty":d,"points":1,"time_limit_seconds":60+d*30} for qi,(p,c,ci,d,e) in enumerate([q[(h(f"{s}_{v}_{qi}"))%len(q)] for qi in range(n)])])
 return{"code":s,"scope":c,"variants":vv}

def gp():
 q=[(1,"console.log(typeof 42):",["number","string","int","float"],0,1),(1,"المقارنة الثلاثية ===:",["مقارنة صارمة","مقارنة ضعيفة","إسناد","لا شيء"],0,1),(2,"Promise:",["غير متزامن","متزامن","متغير","دالة"],0,1),(2,"React:",["مكتبة واجهات","لغة","قاعدة بيانات","خادم"],0,1),(3,"Node.js:",["JS على الخادم","لغة جديدة","متصفح","مكتبة"],0,2)]
 return[{"target_level_index":l,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {c}" for ci,c in enumerate(c)],"correct_index":ci,"difficulty":d,"explanation":f"مستوى {l}"} for l,p,c,ci,d in q]*2

def main():
 print(f"\n{'='*60}\n  skill-js — JavaScript\n{'='*60}\n")
 mt={"slug":"skill-js","name":"JavaScript","icon":"⚡","desc":"منهج متكامل: من الأساسيات إلى Full-Stack.","scope":"professional_track","language":"ar","region":"YE","target_persona":"طالب يريد إتقان JavaScript.","teacher_tone":"عملية ومباشرة.","viz":["flowchart","dom_tree","event_diagram"],"tools":["text","code","image"],"glossary":[{"term":"DOM","definition":"Document Object Model"}]}
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
 fn={"schema_version":"v4.1","specialty":{**mt,"yemeni_examples":["تطبيق عملي"]},"levels":rl,"exam_banks":{"unit_banks":ub,"stage_banks":sb,"level_banks":lb},"placement_test_questions":gp(),"publish_notes":"skill-js — تسلسل منطقي"}
 fp=OUT/"final.json"
 with open(fp,'w',encoding='utf-8') as f:json.dump(fn,f,ensure_ascii=False,indent=2)
 sz=fp.stat().st_size/(1024*1024);tl=sum(1 for l in rl for s in l['stages'] for u in s['units'] for _ in u['lessons'])
 print(f"\n  ✅ {sz:.1f} MB | {len(rl)} مستويات | {tl} درس\n")
if __name__=="__main__":main()

#!/usr/bin/env python3
"""skill-cpp — C++ — 3 مستويات"""
import json; from pathlib import Path; import random
random.seed(42)
def h(s): return sum(ord(c)*(i+1) for i,c in enumerate(str(s)))
OUT = Path("out/skill-cpp"); OUT.mkdir(parents=True, exist_ok=True)
def U(n,*l): return (n,list(l))
def S(n,g,*u): return (n,g,list(u))
def L(n,g,b,*s): return (n,g,b,list(s))

CURRICULUM = [
L("المستوى الأول: أساسيات C++","إتقان المتغيرات، الجمل، الحلقات، الدوال، المصفوفات","apply",
S("أساسيات اللغة","المتغيرات، العمليات، الإدخال والإخراج",
U("أول برنامج C++","هيكل البرنامج: main","#include","using namespace std","cout","return 0","تجميع وتشغيل","مشروع: Hello World"),
U("المتغيرات والأنواع","int, float, double","char, bool","void","const","auto","sizeof","مشروع: أنواع"),
U("العمليات","الحسابية","المقارنة","المنطقية","Bitwise","أولوية العمليات","Type Casting","مشروع: حاسبة"),
U("الإدخال والإخراج","cin","cout","getline","تنسيق الإخراج","iomanip","أخطاء الإدخال","مشروع: إدخال"),
U("الجمل الشرطية","if, else","else if","Ternary Operator","switch/case","default","التداخل","مشروع: قائمة"),
U("السلاسل النصية","string class","length, size","find, substr","compare","concatenation","تحويلات","مشروع: نصوص"),
U("المصفوفات Arrays","إعلان وتهيئة","الوصول","التكرار","مصفوفات متعددة الأبعاد","sizeof array","حدود المصفوفة","مشروع: مصفوفات"),
U("Vectors","vector<T>","push_back","size, capacity","iterators","range-based for","مقارنة مع arrays","مشروع: Vector"),
U("مشروع: نظام إدارة","تخطيط","قوائم","إدخال","بحث","عرض"),
),
S("الحلقات والدوال","التكرار والمنطق القابل لإعادة الاستخدام",
U("الحلقات for","for loop","range-based for","nested loops","break, continue","infinite loop","مشروع: جدول"),
U("الحلقات while","while","do-while","loop conditions","when to use","مشروع: تخمين"),
U("الدوال الأساسية","declaration vs definition","parameters","return","default arguments","مشروع: دوال"),
U("Overloading","function overloading","operator overloading","rules","use cases","مشروع: Overloading"),
U("Pass by Reference","& reference","const reference","pointer vs reference","swap example","مشروع: Reference"),
U("Recursion","Base Case","Recursive Case","factorial","fibonacci","stack overflow","مشروع: Recursion"),
U("Function Templates","template <typename T>","type deduction","multiple types","specialization","مشروع: Templates"),
U("Lambda Expressions","[capture](params){body}","auto lambda","capture modes","use with STL","مشروع: Lambda"),
U("مشروع: مكتبة دوال","تخطيط","تنفيذ","اختبار","توثيق","عرض"),
),
S("المؤشرات والذاكرة","Pointers, Dynamic Memory, References",
U("المؤشرات الأساسية","declaration: int*","& address-of","* dereference","nullptr","pointer arithmetic","مشروع: مؤشرات"),
U("Dynamic Memory","new","delete","new[]","delete[]","memory leak","dangling pointer","مشروع: Dynamic"),
U("Pointers و Arrays","array name as pointer","pointer arithmetic","pointer vs array","array of pointers","مشروع: Arrays"),
U("Pointers و Functions","pass by pointer","returning pointer","pointer to function","callback pattern","مشروع: Pointers"),
U("Smart Pointers","unique_ptr","shared_ptr","weak_ptr","make_unique","RAII","مشروع: Smart"),
U("References","lvalue reference","rvalue reference","move semantics intro","const&","مشروع: References"),
U("Memory Management","stack vs heap","memory layout","memory leaks detection","valgrind","best practices","مشروع: Memory"),
U("C-Style Strings","char arrays","strcpy, strcat","strlen, strcmp","strtok","stringstream","مشروع: C Strings"),
U("مشروع: Memory Manager","تخطيط","تطبيق","اختبار","توثيق","عرض"),
),
S("Object-Oriented Programming","Classes, Inheritance, Polymorphism",
U("Classes و Objects","class definition","public/private","constructors","destructor","this pointer","مشروع: أول Class"),
U("Constructors","default","parameterized","copy","move","initializer list","delegating","مشروع: Constructors"),
U("Encapsulation","getters/setters","const member functions","mutable","friend","مشروع: Encapsulation"),
U("Inheritance","public, protected, private","virtual destructor","override","final","مشروع: Inheritance"),
U("Polymorphism","virtual functions","pure virtual","abstract class","vtable","dynamic_cast","مشروع: Polymorphism"),
U("Operator Overloading","arithmetic","comparison","stream << >>","assignment","type conversion","مشروع: Operators"),
U("Static Members","static variables","static functions","constexpr","member initialization","مشروع: Static"),
U("Design Patterns","Singleton","Factory","Observer","Strategy","مشروع: Patterns"),
U("مشروع: نظام OOP","تصميم","كلاسات","علاقات","اختبار","عرض"),
),
S("هياكل البيانات","Data Structures in C++",
U("Linked List","singly linked","doubly linked","insert, delete","traverse","STL list","مشروع: Linked List"),
U("Stack و Queue","stack<T>","queue<T>","priority_queue","deque","تطبيقات","مشروع: Stack/Queue"),
U("Trees","binary tree","BST","insert, search, delete","traversals","مشروع: BST"),
U("Hash Tables","unordered_map","unordered_set","hash function","collision","load factor","مشروع: Hash"),
U("Graphs","adjacency list","adjacency matrix","BFS","DFS","STL representations","مشروع: Graph"),
U("Heap","make_heap","push_heap","pop_heap","priority_queue","heap sort","مشروع: Heap"),
U("Iterators","iterator types","begin/end","range-based for","custom iterator","مشروع: Iterators"),
U("Algorithms with STL","sort, find, binary_search","for_each, transform","copy, remove","min, max","مشروع: STL"),
U("مشروع: Data Structures","تخطيط","تنفيذ","اختبار","مقارنة أداء","عرض"),
),
S("الملفات والاستثناءات","File I/O, Exception Handling",
U("File Streams","ifstream","ofstream","fstream","open modes","close","مشروع: ملفات"),
U("قراءة الملفات","getline",">> operator","read","eof check","مشروع: قراءة"),
U("كتابة الملفات","<< operator","write","flush","append mode","مشروع: كتابة"),
U("Binary Files","binary mode","read, write","struct to binary","serialization","مشروع: Binary"),
U("File Positioning","seekg, seekp","tellg, tellp","random access","مشروع: Positioning"),
U("Error Handling","try, catch, throw","standard exceptions","custom exceptions","noexcept","مشروع: Errors"),
U("RAII","Resource Acquisition Is Initialization","scope-based","file handles","locks","مشروع: RAII"),
U("Stringstreams","istringstream","ostringstream","stringstream","parsing","formatting","مشروع: Stringstream"),
U("مشروع: File Manager","تخطيط","تنفيذ","اختبار","توثيق","عرض"),
),
S("مشروع المستوى: تطبيق C++","تطبيق شامل",
U("تخطيط","متطلبات","تصميم","كلاسات","خطة"),
U("هيكل البرنامج","Header files","Source files","Makefile","CMake","تنظيم"),
U("Core Logic","كلاسات","خوارزميات","Data Structures","معالجة"),
U("File I/O","حفظ","تحميل","تنسيق","تحقق"),
U("User Interface","قوائم","مدخلات","عرض","تفاعل"),
U("Testing","Unit tests","Edge cases","Memory leaks","Performance"),
U("Documentation","Doxygen","README","Comments","Diagrams"),
U("عرض","Demo","شرح","تحديات","دروس"),
),
),
L("المستوى الثاني: C++ المتقدم","Templates, STL, Multithreading, Advanced OOP","apply",
S("Templates بعمق","Generic Programming",
U("Function Templates","syntax","type deduction","overloading","specialization","مشروع: Templates"),
U("Class Templates","template class","member functions","static members","friends","مشروع: Class Templates"),
U("Template Specialization","full specialization","partial specialization","traits","SFINAE","مشروع: Specialization"),
U("Variadic Templates","parameter pack","recursion","fold expressions","tuple","مشروع: Variadic"),
U("Template Metaprogramming","compile-time computation","constexpr","type traits","enable_if","مشروع: Meta"),
U("Concepts (C++20)","requires clause","concepts definition","constrained auto","مشروع: Concepts"),
U("CRTP","Curiously Recurring Template","static polymorphism","mixins","مشروع: CRTP"),
U("Template Best Practices","include model","compilation time","error messages","readability","مشروع: Best"),
U("مشروع: Generic Library","تصميم","Templates","اختبار","توثيق","عرض"),
),
S("STL بعمق","Standard Template Library",
U("Containers Overview","Sequence","Associative","Unordered","Adaptors","اختيار","مشروع: Containers"),
U("Algorithms","Non-modifying","Modifying","Sorting","Binary Search","Numeric","مشروع: Algorithms"),
U("Iterators","categories","adaptors","stream iterators","insert iterators","مشروع: Iterators"),
U("Function Objects","functors","std::function","std::bind","placeholders","مشروع: Functors"),
U("Allocators","default allocator","custom allocator","memory pools","pmr","مشروع: Allocators"),
U("String Processing","string_view","regex","charconv","format (C++20)","مشروع: Strings"),
U("Date and Time","chrono","duration","time_point","clocks","calendar","مشروع: Chrono"),
U("Filesystem","std::filesystem","path","directory_iterator","file operations","مشروع: Filesystem"),
U("مشروع: STL Application","تخطيط","تطبيق","تحسين","توثيق","عرض"),
),
S("Move Semantics و Rvalue References","Modern C++ Performance",
U("Lvalue vs Rvalue","lvalue definition","rvalue definition","examples","مشروع: Values"),
U("Move Constructor","syntax","noexcept","resource transfer","compiler generated","مشروع: Move"),
U("Move Assignment","syntax","self-assignment","noexcept","rule of 5","مشروع: Assignment"),
U("std::move","what it does","use cases","common mistakes","مشروع: Move"),
U("Perfect Forwarding","std::forward","forwarding reference","universal reference","مشروع: Forward"),
U("Copy Elision","RVO","NRVO","guaranteed copy elision","مشروع: Elision"),
U("Rule of 0/3/5","Rule of 0","Rule of 3","Rule of 5","modern approach","مشروع: Rules"),
U("Performance Impact","benchmarks","avoid copies","move vs copy","real examples","مشروع: Performance"),
U("مشروع: Optimize","قياس","تطبيق Move","مقارنة","عرض"),
),
S("Multithreading و Concurrency","Threads, Mutex, Atomics",
U("Threads","std::thread","join, detach","thread_local","hardware_concurrency","مشروع: Threads"),
U("Mutexes","std::mutex","lock_guard","unique_lock","deadlock","recursive_mutex","مشروع: Mutex"),
U("Condition Variables","wait, notify_one","notify_all","producer-consumer","مشروع: CV"),
U("Atomic Operations","std::atomic","memory order","lock-free","compare_exchange","مشروع: Atomic"),
U("Futures و Promises","std::future","std::promise","std::async","packaged_task","مشروع: Future"),
U("Parallel Algorithms","execution policies","par, par_unseq","C++17 parallel STL","مشروع: Parallel"),
U("Thread Safety","shared_mutex","call_once","thread-safe containers","patterns","مشروع: Safety"),
U("Coroutines (C++20)","co_await, co_yield","co_return","generator","task","مشروع: Coroutines"),
U("مشروع: Multi-threaded","تخطيط","تطبيق","اختبار","قياس","عرض"),
),
S("Advanced OOP","Inheritance, Virtual, Design",
U("Virtual Functions Deep","vtable","vptr","overhead","pure virtual","مشروع: Virtual"),
U("Multiple Inheritance","diamond problem","virtual base","MI best practices","مشروع: MI"),
U("Type Casting","static_cast","dynamic_cast","const_cast","reinterpret_cast","مشروع: Casting"),
U("RTTI","typeid","type_info","dynamic_cast","use cases","مشروع: RTTI"),
U("Nested Classes","definition","access","use cases","PIMPL idiom","مشروع: Nested"),
U("Object Lifetimes","construction order","destruction order","temporary objects","مشروع: Lifetimes"),
U("SOLID in C++","Single Responsibility","Open/Closed","Liskov","Interface Segregation","Dependency Inversion","مشروع: SOLID"),
U("Design Patterns in C++","Factory Method","Builder","Adapter","Decorator","Observer","مشروع: Patterns"),
U("مشروع: Advanced OOP","تصميم","تنفيذ","مراجعة","عرض"),
),
S("Modern C++ Features","C++14/17/20/23",
U("C++14 Features","generic lambdas","return type deduction","deprecated","مشروع: C++14"),
U("C++17 Features","structured bindings","if constexpr","inline variables","fold expressions","مشروع: C++17"),
U("C++17 Library","optional","variant","any","string_view","مشروع: Library"),
U("C++20 Features","concepts","ranges","coroutines","modules","مشروع: C++20"),
U("C++20 Library","span","format","source_location","jthread","مشروع: C++20 Lib"),
U("Ranges","range adaptors","views","range algorithms","projections","مشروع: Ranges"),
U("Modules","import/export","module partitions","header units","build speed","مشروع: Modules"),
U("C++23 Preview","expected","mdspan","generator","print","مشروع: C++23"),
U("مشروع: Modernize","تحديث كود","C++17/20","قياس","عرض"),
),
S("مشروع المستوى: مكتبة C++","Library Development",
U("تخطيط","Scope","API Design","Dependencies","Roadmap"),
U("Core Implementation","Templates","Classes","Algorithms","Data Structures"),
U("Testing","Unit Tests","Edge Cases","Performance","Sanitizers"),
U("Documentation","Doxygen","Examples","API Reference","Tutorials"),
U("Packaging","CMake","vcpkg","Conan","find_package"),
U("CI/CD","GitHub Actions","Testing Matrix","Sanitizers","Coverage"),
U("Release","Versioning","Changelog","Distribution","Announcement"),
U("عرض","Demo","Design","Challenges","Future"),
),
),
L("المستوى الثالث: تطبيقات ومشاريع C++","Systems, Game Dev, Embedded, Performance","create",
S("إدارة الذاكرة المتقدمة","Custom Allocators, Memory Pools",
U("Memory Arenas","Arena allocator","bump allocation","reset","use cases","مشروع: Arena"),
U("Pool Allocators","fixed-size pool","free list","fragmentation","std::pmr","مشروع: Pool"),
U("Stack Allocator","LIFO allocation","scope-based","marker","مشروع: Stack"),
U("Custom new/delete","overloading","placement new","alignment","مشروع: Custom"),
U("Memory Mapping","mmap","shared memory","file mapping","large data","مشروع: MMap"),
U("Garbage Collection","Boehm GC","reference counting","weak pointers","مشروع: GC"),
U("Profiling Memory","heaptrack","massif","valgrind","address sanitizer","مشروع: Profile"),
U("Cache-friendly Data","cache lines","SOA vs AOS","data-oriented design","مشروع: Cache"),
U("مشروع: Allocator","تصميم","تطبيق","Benchmark","عرض"),
),
S("Network Programming","Sockets, HTTP, Protocols",
U("Berkeley Sockets","socket, bind","listen, accept","connect","close","مشروع: Sockets"),
U("TCP Server/Client","stream sockets","send/recv","buffering","protocol","مشروع: TCP"),
U("UDP","datagram sockets","sendto/recvfrom","reliability","multicast","مشروع: UDP"),
U("Asynchronous I/O","select/poll","epoll","io_uring","Boost.Asio","مشروع: Async"),
U("HTTP Client","libcurl","cpp-httplib","REST API","JSON parsing","مشروع: HTTP"),
U("HTTP Server","simple server","routing","middleware","static files","مشروع: Server"),
U("WebSocket","upgrade","frames","ping/pong","use cases","مشروع: WebSocket"),
U("Protocol Design","binary protocols","text protocols","serialization","versioning","مشروع: Protocol"),
U("مشروع: Network App","تخطيط","تطوير","اختبار","نشر","عرض"),
),
S("Game Development","Graphics, Physics, Input",
U("Game Loop","fixed timestep","variable timestep","delta time","frame rate","مشروع: Loop"),
U("SFML","window","graphics","sprites","text","مشروع: SFML"),
U("SDL2","initialization","rendering","textures","events","مشروع: SDL2"),
U("Input Handling","keyboard","mouse","joystick","touch","مشروع: Input"),
U("2D Graphics","sprites","animations","tilemaps","parallax","مشروع: 2D"),
U("Physics","collision detection","AABB","SAT","resolution","مشروع: Physics"),
U("Audio","sound effects","music","spatial audio","مشروع: Audio"),
U("Game Architecture","ECS","game objects","scenes","state machine","مشروع: Architecture"),
U("مشروع: لعبة 2D","تصميم","تطوير","رسوم","نشر","عرض"),
),
S("Systems Programming","OS Interaction, Processes, IPC",
U("Process Management","fork, exec","wait, waitpid","exit status","signals","مشروع: Processes"),
U("Inter-Process Communication","pipes","FIFO","message queues","shared memory","مشروع: IPC"),
U("File System Operations","stat, chmod","directory traversal","inotify","file locking","مشروع: FS"),
U("Daemon Processes","fork, setsid","signal handling","logging","pid file","مشروع: Daemon"),
U("System Calls","open, read, write","mmap, munmap","ioctl","syscall overhead","مشروع: Syscalls"),
U("Process Scheduling","nice, renice","sched_setscheduler","affinity","priorities","مشروع: Scheduling"),
U("Resource Limits","ulimit, setrlimit","cgroups","quotas","monitoring","مشروع: Limits"),
U("Linux Kernel Modules","LKM basics","insmod, rmmod","proc filesystem","character device","مشروع: LKM"),
U("مشروع: System Tool","تخطيط","تطوير","اختبار","توثيق","عرض"),
),
S("Embedded Systems","Microcontrollers, RTOS, IoT",
U("Embedded C++","no exceptions","no RTTI","memory constraints","startup","مشروع: Embedded"),
U("Arduino","setup, loop","digital I/O","analog","Serial","مشروع: Arduino"),
U("ESP32","WiFi","Bluetooth","FreeRTOS","sensors","مشروع: ESP32"),
U("STM32","HAL","CubeMX","peripherals","interrupts","مشروع: STM32"),
U("RTOS Concepts","tasks","scheduler","queues","semaphores","مشروع: RTOS"),
U("Communication Protocols","I2C","SPI","UART","CAN","مشروع: Protocols"),
U("Sensors and Actuators","temperature","motion","display","motor control","مشروع: Sensors"),
U("IoT Architecture","MQTT","CoAP","edge computing","cloud","مشروع: IoT"),
U("مشروع: IoT Device","تصميم","Hardware","Firmware","Cloud","عرض"),
),
S("Performance Optimization","Profiling, Optimization, SIMD",
U("Profiling Tools","perf","gprof","VTune","flame graphs","مشروع: Profile"),
U("Compiler Optimizations","-O2, -O3","-march=native","LTO","PGO","مشروع: Compiler"),
U("Algorithmic Optimization","Big O","cache efficiency","data structures","trade-offs","مشروع: Algorithms"),
U("SIMD","SSE, AVX","intrinsics","auto-vectorization","alignment","مشروع: SIMD"),
U("Branch Prediction","likely/unlikely","branchless programming","profile-guided","مشروع: Branch"),
U("Memory Optimizations","cache lines","prefetch","alignment","false sharing","مشروع: Memory"),
U("Lock-free Programming","CAS loops","RCU","hazard pointers","ABA problem","مشروع: Lock-free"),
U("Benchmarking","Google Benchmark","micro-benchmarks","statistics","regression","مشروع: Benchmark"),
U("مشروع: تحسين أداء","Profile","Identify","Optimize","Measure","عرض"),
),
S("المشروع الختامي","تطبيق C++ احترافي",
U("اختيار الفكرة","تحليل","جدوى","نطاق","خطة"),
U("تصميم","Architecture","Components","Interfaces","Data Flow"),
U("Core Development","Implementation","Templates","Performance","Testing"),
U("Advanced Features","Multithreading","Networking","Files","Database"),
U("UI/UX","Terminal GUI","ImGUI","Qt","Interaction"),
U("Testing","Unit","Integration","Stress","Profiling"),
U("Packaging","CMake","Dependencies","Install","Documentation"),
U("عرض","Demo","Architecture","Challenges","Learnings"),
),
),
]

MISTAKES = [
("Overfitting","دقة تدريب 99%، اختبار 65%. النموذج حفظ ولم يتعلم.","تبسيط، Regularization، CV، EarlyStopping.","افحص الفجوة بين train و test.","critical"),
("Data Leakage","Scaler قبل التقسيم = اختبار يتسرب.","اقسم أولاً. scaler.fit(X_train). scaler.transform(X_test).","Pipeline يمنع Data Leakage.","critical"),
("Memory Leak","new بدون delete = تسرب ذاكرة.","استخدم smart pointers. unique_ptr/shared_ptr.","كل new يحتاج delete. الأفضل: استخدم RAII.","critical"),
("Dangling Pointer","استخدام مؤشر بعد delete.","اجعل المؤشر nullptr بعد delete. استخدم smart pointers.","المؤشر المتدلي سبب رئيسي للـ crashes.","major"),
("نسيان virtual destructor","حذف كائن مشتق عبر مؤشر أساس بدون virtual destructor.","دائماً اجعل destructor الأساس virtual عندما يكون هناك inheritance.","سلوك غير معرف = undefined behavior.","major"),
("مقارنة signed/unsigned","int مع size_t في حلقة = تحذير أو خطأ منطقي.","استخدم size_t لحجوم المصفوفات. أو static_cast.","مقارنة signed و unsigned خطأ شائع في C++.","minor"),
("pass by value بدل const&","نسخ كائن كبير في كل استدعاء دالة.","استخدم const T& للمعاملات الكبيرة.","النسخ غير الضروري يبطئ الأداء.","minor"),
("عدم استخدام const","دالة لا تغير الكائن لكن غير موسومة بـ const.","أضف const للدوال التي لا تعدل. وللمعاملات.","const يحسن readability ويمنع bugs.","minor"),
]

def mb(p,c):return[f"الآن أتقنتَ {p}، نرتقي إلى {c}.",f"في الدرس السابق فككنا {p}. اليوم نبني عليه بـ {c}.",f"بعد {p}، {c} يسد الفجوة التالية.",f"{p} كان الأساس. {c} هو الطابق التالي.",][h(p+c)%4]

def gl(uc,lt,sn):
 ls=[];pv="المفاهيم الأساسية"
 for li,t in enumerate(lt,1):
  nm=2+(h(f"{uc}_{li}")%2);lm=[{"mistake":f"{m[0]}\n{m[1]}","correction":m[2],"treatment":m[3],"severity":m[4]} for m in [MISTAKES[(h(f"{uc}_{li}_{mi}"))%len(MISTAKES)] for mi in range(nm)]]
  ls.append({"lesson_index":li,"name":t,"goal":f"فهم وتطبيق {t}","bridge_sentence":mb(pv,t),"prerequisite_lessons":[] if li==1 else [f"{uc}.{li-1}"],"enables_lessons":[] if li==len(lt) else [f"{uc}.{li+1}"],"final_check_question":f"اشرح {t} بكلماتك. خطوات تطبيقه؟ أشهر خطأ؟","session_complete_criterion":f"يشرح {t} ويطبقه","yemeni_examples":[f"تطبيق عملي: {t}."],"expected_duration_minutes":30,"estimated_gem_cost":90,"solution_outline":f"خطوات {t}:\n1. فهم الأساس\n2. تطبيق\n3. تجربة\n4. تحليل\n5. توثيق","motivation_hook":f"{t} — مهارة أساسية في C++.","learning_objectives":[{"statement":f"يفهم {t}","bloom_level":"understand"},{"statement":f"يطبق {t}","bloom_level":"apply"}],"glossary":[],"concepts":[{"name":t,"explanation":f"شرح وتطبيق عملي لـ {t}.","mastery_criterion":f"يشرح {t} ويطبقه","weight":1}],"common_mistakes":lm});pv=t
 return ls

def glab(uc,un,nl):
 return[{"lab_index":li,"title":f"معمل {un}: {'التشخيص' if li==1 else 'التطبيق'}","scenario":f"مشكلة تقنية في {un} تحتاج إلى تحليل وحل عملي باستخدام C++.","completion_criterion":f"تحليل وحل","pedagogical_sequence":"diagnostic -> decision -> application -> analysis -> connection","prerequisite_lessons":[f"{uc}.{max(1,nl//2)}"],"allowed_tools":["text","code"],"questions":[{"kind":"diagnostic","prompt":f"خطوات تشخيص مشكلة في {un}؟","rubric":"ذكر 4 خطوات منطقية مع شرح","solution_outline":"جمع وتحليل وتحديد واقتراح","points":1},{"kind":"decision","prompt":f"خياران لحل في {un}. معاييرك؟","rubric":"ذكر معيارين مع تبرير","solution_outline":"الدقة والسرعة والتعقيد","points":1},{"kind":"application","prompt":f"اكتب كوداً يطبق {un}.","rubric":"كود صحيح يعمل","solution_outline":"include وتطبيق","points":2},{"kind":"analysis","prompt":f"كود لـ {un} فيه 3 أخطاء.","rubric":"3 أخطاء مع تصحيح","solution_outline":"تحليل وتصحيح","points":1},{"kind":"connection","prompt":f"اربط {un} بمهارات سابقة.","rubric":"رابطان مع فكرة","solution_outline":"الربط وخطة","points":1}]} for li in range(1,3)]

def ge(c,s,n=10):
 q=[("C++ مقارنة بـ C:",["OOP وتوسعات","نفس اللغة","أبطأ","للويب فقط"],0,1,"C++ أضافت OOP و templates."),("Overfitting:",["يحفظ ولا يعمم","بسيط","سريع","قليل بيانات"],0,2,"أداء تدريب ممتاز، فشل على جديدة."),("Smart Pointer:",["يدير الذاكرة تلقائياً","مؤشر عادي","أسرع","للـ arrays فقط"],0,1,"unique_ptr/shared_ptr."),("virtual function:",["للتعدد","خاصة","ثابتة","للملفات"],0,1,"تحقق polymorphism."),("مكتبة STL:",["مكتبة قوالب قياسية","مترجم","نظام تشغيل","لغة"],0,1,"Containers, algorithms."),("RAII:",["ربط الموارد بالكائنات","نمط تصميم","مؤشر","حلقة"],0,1,"Resource Acquisition Is Initialization."),("Cross-Validation:",["تقييم موثوق","تسريع","زيادة","تغيير"],0,2,"يقسم لـ k أجزاء."),("Data Leakage:",["تسرب الاختبار","فقدان","تسرب ذاكرة","توقف"],0,2,"أخطر خطأ.")]
 vv=[]
 for v in range(3):vv.append([{"question_index":qi+1,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {ch}" for ci,ch in enumerate(c)],"correct_index":ci,"explanation":e,"difficulty":d,"points":1,"time_limit_seconds":60+d*30} for qi,(p,c,ci,d,e) in enumerate([q[(h(f"{s}_{v}_{qi}"))%len(q)] for qi in range(n)])])
 return{"code":s,"scope":c,"variants":vv}

def gp():
 q=[(1,"cout:",["مخرج قياسي","مدخل","دالة","class"],0,1),(1,"C++ امتداد لـ:",["C","Java","Python","Assembly"],0,1),(2,"unique_ptr:",["ملكية حصرية","ملكية مشتركة","مؤشر عادي","مرجع"],0,1),(2,"template:",["برمجة عامة","وراثة","حلقة","مؤشر"],0,1),(3,"std::thread:",["خيط تنفيذ","مصفوفة","ملف","مؤشر"],0,2)]
 return[{"target_level_index":l,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {c}" for ci,c in enumerate(c)],"correct_index":ci,"difficulty":d,"explanation":f"مستوى {l}"} for l,p,c,ci,d in q]*2

def main():
 print(f"\n{'='*60}\n  skill-cpp — C++\n{'='*60}\n")
 mt={"slug":"skill-cpp","name":"C++","icon":"⚙️","desc":"منهج متكامل: من الأساسيات إلى الأنظمة والألعاب.","scope":"professional_track","language":"ar","region":"YE","target_persona":"طالب يريد إتقان C++.","teacher_tone":"عملية وتقنية.","viz":["flowchart","memory_diagram","class_diagram"],"tools":["text","code","image"],"glossary":[{"term":"RAII","definition":"Resource Acquisition Is Initialization"}]}
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
 fn={"schema_version":"v4.1","specialty":{**mt,"yemeni_examples":["تطبيق عملي"]},"levels":rl,"exam_banks":{"unit_banks":ub,"stage_banks":sb,"level_banks":lb},"placement_test_questions":gp(),"publish_notes":"skill-cpp — تسلسل منطقي"}
 fp=OUT/"final.json"
 with open(fp,'w',encoding='utf-8') as f:json.dump(fn,f,ensure_ascii=False,indent=2)
 sz=fp.stat().st_size/(1024*1024);tl=sum(1 for l in rl for s in l['stages'] for u in s['units'] for _ in u['lessons'])
 print(f"\n  ✅ {sz:.1f} MB | {len(rl)} مستويات | {tl} درس\n")
if __name__=="__main__":main()

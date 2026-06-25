#!/usr/bin/env python3
"""skill-c — لغة C — 3 مستويات"""
import json; from pathlib import Path; import random
random.seed(42)
def h(s): return sum(ord(c)*(i+1) for i,c in enumerate(str(s)))
OUT = Path("out/skill-c"); OUT.mkdir(parents=True, exist_ok=True)
def U(n,*l): return (n,list(l))
def S(n,g,*u): return (n,g,list(u))
def L(n,g,b,*s): return (n,g,b,list(s))

CURRICULUM = [
L("المستوى الأول: أساسيات لغة C","المتغيرات، الجمل، الحلقات، الدوال، المصفوفات","apply",
S("أساسيات لغة C","الهيكل، المتغيرات، العمليات",
U("أول برنامج C","هيكل البرنامج","#include","main()","printf()","scanf()","return","تجميع: gcc","مشروع: Hello World","تنسيق الإخراج"),
U("المتغيرات والأنواع","int, float, double","char","void","signed/unsigned","short/long","sizeof","const","مشروع: متغيرات"),
U("العمليات","حسابية","مقارنة","منطقية","Bitwise","Assignment","أولوية","Type Casting","مشروع: حاسبة"),
U("الإدخال والإخراج","printf تنسيق","scanf","getchar, putchar","gets, puts","fgets","sprintf","مشروع: إدخال"),
U("الجمل الشرطية","if, else","else if","Ternary","switch/case","break, default","التداخل","مشروع: قائمة"),
U("الحلقات for","for","nested for","break, continue","infinite loop","loop patterns","مشروع: جدول"),
U("الحلقات while","while","do-while","loop control","when to use","مشروع: تخمين"),
U("Jump Statements","break","continue","goto","return","exit()","مشروع: تحكم"),
U("مشروع: نظام بسيط","تخطيط","قوائم","إدخال","حسابات","عرض"),
),
S("المصفوفات والسلاسل","Arrays, Strings",
U("المصفوفات 1D","تعريف","تهيئة","الوصول","sizeof","حدود","مشروع: مصفوفات"),
U("المصفوفات 2D","تعريف 2D","الوصول","matrix operations","تهيئة","مشروع: جداول"),
U("السلاسل Characters","char array","strlen","strcpy","strcat","strcmp","strchr, strstr","مشروع: نصوص"),
U("string.h","strncpy","strncat","strncmp","strtok","strdup","مشروع: دوال النصوص"),
U("stdio.h سلاسل","gets/fgets","puts/fputs","scanf strings","printf strings","sprintf","مشروع: إدخال نصوص"),
U("ctype.h","isalpha","isdigit","islower, isupper","toupper, tolower","مشروع: فحص"),
U("المصفوفات والدوال","pass array","return array","array size","const arrays","مشروع: دوال"),
U("Multi-dim Arrays","3D arrays","initialization","memory layout","access pattern","مشروع: 3D"),
U("مشروع: معالج نصوص","تخطيط","قراءة","تحليل","إخراج","عرض"),
),
S("الدوال والنطاق","Functions, Scope, Recursion",
U("تعريف الدوال","declaration","definition","parameters","return","void functions","مشروع: دوال رياضية"),
U("Call by Value/Reference","call by value","call by reference","pointers as params","swap example","مشروع: Reference"),
U("نطاق المتغيرات","local","global","static","extern","register","scope rules","مشروع: Scope"),
U("Recursion","Base Case","factorial","fibonacci","tower of Hanoi","الفرق مع iteration","مشروع: Recursion"),
U("Function Pointers","declaration","assignment","callback","array of func ptrs","مشروع: Callbacks"),
U("Variadic Functions","stdarg.h","va_list","va_start","va_arg","va_end","printf-like","مشروع: Variadic"),
U("Inline Functions","inline keyword","when to use","macros vs inline","compiler hint","مشروع: Inline"),
U("Header Files","#include","guards","declaration vs definition","multi-file","مشروع: Headers"),
U("مشروع: مكتبة دوال","تخطيط","كتابة","Headers","اختبار","توثيق"),
),
S("المؤشرات","Pointers and Memory",
U("المؤشرات الأساسية","declaration: int*","& address","* dereference","NULL pointer","void*","مشروع: مؤشرات"),
U("Pointer Arithmetic","ptr++, ptr--","ptr + n","ptr difference","array vs pointer","مشروع: Arithmetic"),
U("المؤشرات والمصفوفات","array as pointer","pointer as array","pointer notation","2D arrays","مشروع: Arrays"),
U("المؤشرات والدوال","pass by pointer","return pointer","pointer to pointer","modify caller var","مشروع: Functions"),
U("المؤشرات والسلاسل","char* strings","string manipulation","argv","const char*","مشروع: Strings"),
U("Function Pointers","callback pattern","qsort example","state machine","مشروع: Callbacks"),
U("void Pointers","void*","casting","generic functions","limitations","مشروع: Generic"),
U("Common Pitfalls","dangling pointer","NULL dereference","buffer overflow","memory leak","مشروع: Pitfalls"),
U("مشروع: Pointer Mastery","تخطيط","تطبيق","اختبار","تحليل","عرض"),
),
S("الـ Preprocessor والـ Macros","Preprocessor Directives",
U("#define","constants","macros","function-like","multi-line","مشروع: Define"),
U("#include","angle vs quotes","guards","#pragma once","مشروع: Include"),
U("Conditional Compilation","#ifdef, #ifndef","#if, #else, #elif","#endif","debug macros","مشروع: Conditional"),
U("Predefined Macros","__FILE__","__LINE__","__DATE__","__TIME__","__STDC__","مشروع: Debug"),
U("Macro Pitfalls","side effects","parentheses","multiple evaluation","stringification","مشروع: Macros"),
U("#error و #pragma","#error","#pragma","compile-time checks","مشروع: Directives"),
U("assert","assert.h","assert macro","NDEBUG","static_assert","مشروع: Assert"),
U("Macros vs Functions","comparison","when to use","debug macros","inline alternative","مشروع: Comparison"),
U("مشروع: Debug System","تخطيط","Macros","Assert","Conditional","عرض"),
),
S("Structs و Unions","Data Structures in C",
U("Structs","definition","members","access: .","sizeof struct","مشروع: أول struct"),
U("Struct Operations","assignment","pass to function","return struct","array of structs","مشروع: Operations"),
U("Struct Pointers","-> operator","dynamic allocation","linked list node","self-referential","مشروع: Pointers"),
U("Typedef","typedef keyword","naming conventions","typedef struct","code clarity","مشروع: Typedef"),
U("Unions","union definition","memory sharing","union vs struct","use cases","مشروع: Union"),
U("Enums","enum definition","values","enum vs #define","switch with enum","مشروع: Enum"),
U("Bit Fields","bit field syntax","packing","alignment","use cases","مشروع: Bitfields"),
U("Packing and Alignment","#pragma pack","__attribute__","sizeof struct","padding","مشروع: Memory"),
U("مشروع: نظام بيانات","تخطيط","Structs","علاقات","معالجة","عرض"),
),
S("مشروع المستوى: تطبيق C","تطبيق شامل",
U("تخطيط","متطلبات","تصميم","هيكل","خطة"),
U("Core Logic","Structs","Functions","Arrays","خوارزميات"),
U("File I/O","قراءة","كتابة","تنسيق","تحقق"),
U("Menu System","قوائم","مدخلات","تنقل","تفاعل"),
U("Error Handling","Validation","Error codes","Messages","Recovery"),
U("Testing","Edge Cases","Memory","Valgrind","Fixes"),
U("Documentation","Comments","README","Flowcharts","Doxygen"),
U("عرض","Demo","شرح","تحديات","دروس"),
),
),
L("المستوى الثاني: C المتقدم","Dynamic Memory, File I/O, Data Structures","apply",
S("الذاكرة الديناميكية","malloc, calloc, realloc, free",
U("malloc","syntax","sizeof","NULL check","casting","مشروع: malloc"),
U("calloc و realloc","calloc","realloc","shrink/grow","common patterns","مشروع: Dynamic"),
U("free","when to free","double free","use after free","dangling pointer","مشروع: free"),
U("Memory Leaks","detection","valgrind","AddressSanitizer","prevention","مشروع: Leaks"),
U("Dynamic Arrays","growable array","capacity","realloc pattern","vector in C","مشروع: Vector"),
U("Dynamic Strings","char* allocation","strdup","dynamic concat","string builder","مشروع: Strings"),
U("2D Dynamic Arrays","array of pointers","contiguous 2D","jagged arrays","free pattern","مشروع: 2D"),
U("Custom Allocators","arena allocator","pool allocator","bump allocator","free list","مشروع: Allocator"),
U("مشروع: Memory Manager","تخطيط","تطبيق","اختبار","Valgrind","عرض"),
),
S("الملفات والإدخال والإخراج","File I/O in Depth",
U("File Basics","FILE*","fopen modes","fclose","ferror","feof","مشروع: أساسيات"),
U("Text Files","fprintf, fscanf","fgets, fputs","fgetc, fputc","line processing","مشروع: Text"),
U("Binary Files","fread, fwrite","binary mode","struct to binary","serialization","مشروع: Binary"),
U("File Positioning","fseek","ftell","rewind","random access","مشروع: Seek"),
U("Error Handling","ferror","clearerr","perror","errno","strerror","مشروع: Errors"),
U("Buffering","setvbuf","setbuf","fflush","unbuffered I/O","مشروع: Buffer"),
U("Formatted I/O","scanf family","printf family","conversion specifiers","pitfalls","مشروع: Format"),
U("Temporary Files","tmpfile","tmpnam","mkstemp","cleanup","مشروع: Temp"),
U("مشروع: File Manager","تخطيط","عمليات","تحقق","أخطاء","عرض"),
),
S("Linked Lists","Singly, Doubly, Circular",
U("Singly Linked List","node struct","insert at head","insert at tail","delete","traverse","مشروع: Singly"),
U("Singly Operations","search","reverse","merge sorted","detect cycle","مشروع: Operations"),
U("Doubly Linked List","prev pointer","insert","delete","bidirectional","مشروع: Doubly"),
U("Circular Linked List","circular","insert","delete","Josephus problem","مشروع: Circular"),
U("Sorted List","insert sorted","duplicates","priority queue","مشروع: Sorted"),
U("Generic List","void* data","function pointers","generic operations","مشروع: Generic"),
U("List Applications","polynomial","sparse matrix","memory allocator","LRU cache","مشروع: Applications"),
U("Performance","array vs list","cache locality","when to use","benchmarks","مشروع: Performance"),
U("مشروع: List Library","تخطيط","كتابة","اختبار","توثيق","عرض"),
),
S("Stacks و Queues","Stack, Queue, Deque",
U("Stack Implementation","array-based","push, pop, peek","isFull, isEmpty","مشروع: Array Stack"),
U("Stack Applications","parenthesis matching","postfix eval","undo/redo","backtracking","مشروع: Applications"),
U("Queue Implementation","array-based","circular queue","enqueue, dequeue","مشروع: Array Queue"),
U("Linked Queue","linked list queue","dynamic","no overflow","مشروع: Linked Queue"),
U("Deque","double-ended queue","operations","sliding window","مشروع: Deque"),
U("Priority Queue","concept","binary heap","array-based heap","مشروع: Priority"),
U("Stack vs Queue","use cases","performance","trade-offs","مشروع: Comparison"),
U("Advanced Topics","thread-safe","lock-free","bounded queue","مشروع: Advanced"),
U("مشروع: Queue System","تخطيط","بناء","اختبار","تطبيق","عرض"),
),
S("Trees","Binary Trees, BST, AVL",
U("Binary Trees","node struct","recursive definition","traversals: pre, in, post, level","مشروع: Binary Tree"),
U("Binary Search Tree","insert","search","delete","min, max","successor","مشروع: BST"),
U("BST Operations","isValid","LCA","diameter","balanced check","مشروع: Operations"),
U("AVL Tree","balance factor","rotations: LL,RR,LR,RL","insert","delete","مشروع: AVL"),
U("Heap","max heap, min heap","insert, extract","heapify","heap sort","مشروع: Heap"),
U("Tree Applications","expression tree","Huffman coding","file system","trie intro","مشروع: Applications"),
U("Tree Traversals","iterative inorder","Morris traversal","threaded trees","مشروع: Traversals"),
U("N-ary Trees","child-sibling","BFS","DFS","applications","مشروع: N-ary"),
U("مشروع: Tree Library","تخطيط","تنفيذ","اختبار","عرض"),
),
S("Bit Manipulation","Bitwise Operations",
U("Bitwise Operators","&, |, ^, ~","<<, >>","truth tables","precedence","مشروع: Operators"),
U("Bit Masking","set bit","clear bit","toggle bit","check bit","مشروع: Masking"),
U("Bit Counting","popcount","builtins","Brian Kernighan","lookup table","مشروع: Counting"),
U("Endianness","big vs little","detection","conversion","network byte order","مشروع: Endian"),
U("Bit Fields in Practice","flags","permissions","color encoding","compression","مشروع: Practice"),
U("Bit Hacks","swap without temp","power of 2 check","absolute value","min/max","مشروع: Hacks"),
U("Shift Operations","logical vs arithmetic","undefined behavior","safe patterns","مشروع: Shifts"),
U("Applications","cryptography basics","checksums","compression","embedded","مشروع: Applications"),
U("مشروع: Bit Utils","تخطيط","تطبيق","اختبار","توثيق","عرض"),
),
S("مشروع المستوى: مكتبة C","مكتبة قابلة لإعادة الاستخدام",
U("تخطيط","Scope","API Design","Modules","Roadmap"),
U("Core Structures","Dynamic Array","Linked List","Stack/Queue","Hash Table"),
U("Algorithms","Sorting","Searching","String","Math"),
U("File I/O","Readers","Writers","Parsers","Serializers"),
U("Testing","Unit Tests","Edge Cases","Valgrind","Coverage"),
U("Documentation","Doxygen","Examples","API Reference","Install"),
U("Build System","Makefile","CMake","Headers","Static/Dynamic Lib"),
U("عرض","Demo","Design","Challenges","Future"),
),
),
L("المستوى الثالث: برمجة النظم والتطبيقات","Systems, Network, Embedded, Algorithms","create",
S("برمجة النظم","Processes, Signals, IPC",
U("Processes","fork","exec family","wait","exit status","مشروع: Processes"),
U("Signals","signal, sigaction","SIGINT, SIGTERM","signal handlers","sigprocmask","مشروع: Signals"),
U("Pipes","anonymous pipe","named pipe FIFO","pipe between processes","مشروع: Pipes"),
U("Message Queues","msgget, msgsnd, msgrcv","System V MQ","POSIX MQ","مشروع: MQ"),
U("Shared Memory","shmget, shmat","mmap","synchronization","مشروع: Shared Mem"),
U("Semaphores","semget, semop","System V sem","POSIX sem","مشروع: Semaphores"),
U("Daemon Processes","fork, setsid","chdir, umask","syslog","pid file","مشروع: Daemon"),
U("File Locking","fcntl","lockf","advisory vs mandatory","مشروع: Locking"),
U("مشروع: System Tool","تخطيط","تطوير","اختبار","توثيق","عرض"),
),
S("Network Programming","Sockets, TCP/UDP",
U("Socket Basics","socket, AF_INET","SOCK_STREAM, DGRAM","bind, listen, accept","مشروع: Sockets"),
U("TCP Client/Server","connect","send, recv","read, write","close","مشروع: TCP"),
U("UDP","sendto, recvfrom","datagram","broadcast","multicast","مشروع: UDP"),
U("I/O Multiplexing","select","poll","epoll","non-blocking","مشروع: Multiplex"),
U("HTTP Simple","HTTP request/response","simple server","parse headers","مشروع: HTTP"),
U("Socket Options","setsockopt","SO_REUSEADDR","keepalive","timeout","مشروع: Options"),
U("DNS Resolution","getaddrinfo","gethostbyname","getnameinfo","IPv4/IPv6","مشروع: DNS"),
U("Network Security","SSL/TLS intro","certificates","authentication","مشروع: Security"),
U("مشروع: Network App","تخطيط","تطوير","اختبار","نشر","عرض"),
),
S("Multithreading","pthreads, Concurrency",
U("Thread Basics","pthread_create","pthread_join","pthread_exit","thread IDs","مشروع: Threads"),
U("Mutex","pthread_mutex","init, lock, unlock","destroy","deadlock","مشروع: Mutex"),
U("Condition Variables","pthread_cond","wait, signal, broadcast","producer-consumer","مشروع: CV"),
U("Read-Write Locks","pthread_rwlock","read lock","write lock","مشروع: RWLock"),
U("Thread-Safe Data","atomic operations","thread-local","reentrant functions","مشروع: Safe"),
U("Thread Pools","design","task queue","worker threads","graceful shutdown","مشروع: Pool"),
U("Barriers و Spinlocks","pthread_barrier","spinlock","pthread_spin","use cases","مشروع: Sync"),
U("Debugging Threads","race conditions","helgrind","ThreadSanitizer","deadlock detection","مشروع: Debug"),
U("مشروع: Thread Library","تصميم","تطبيق","اختبار","Benchmark","عرض"),
),
S("الخوارزميات المتقدمة","Sorting, Searching, Graph",
U("Merge Sort","divide & conquer","implementation","complexity","مشروع: Merge Sort"),
U("Quick Sort","pivot selection","partition","worst case","randomized","مشروع: Quick Sort"),
U("Heap Sort","build heap","sort","in-place","complexity","مشروع: Heap Sort"),
U("Counting/Radix Sort","counting sort","radix sort","LSD, MSD","linear time","مشروع: Linear Sort"),
U("Graph Algorithms","DFS, BFS","shortest path: Dijkstra","MST: Prim, Kruskal","topological sort","مشروع: Graph"),
U("Dynamic Programming","memoization","tabulation","LCS","knapsack","edit distance","مشروع: DP"),
U("String Algorithms","KMP","Rabin-Karp","Boyer-Moore","trie","مشروع: String"),
U("Algorithm Design","divide & conquer","greedy","backtracking","branch & bound","مشروع: Design"),
U("مشروع: Algorithm Library","تخطيط","تنفيذ","Benchmark","توثيق","عرض"),
),
S("Compilation و Build","Make, CMake, GCC",
U("GCC بعمق","compilation stages","-E, -S, -c","optimization flags","warnings","مشروع: GCC"),
U("Make","targets, dependencies","variables","patterns","functions","مشروع: Make"),
U("Makefile Advanced","phony targets","automatic vars","conditionals","include","مشروع: Advanced"),
U("CMake","CMakeLists.txt","add_executable","target_link","find_package","مشروع: CMake"),
U("Static Libraries","ar","ranlib","creating .a","linking static","مشروع: Static"),
U("Shared Libraries","-fPIC","-shared","ldconfig","soname","مشروع: Shared"),
U("Debugging","gdb basics","breakpoints","watch","backtrace","core dumps","مشروع: GDB"),
U("Profiling","gprof","perf","callgrind","optimization","مشروع: Profiling"),
U("مشروع: Build System","تخطيط","Make/CMake","Libs","Debug","عرض"),
),
S("Embedded C","Microcontrollers, RTOS, Bare Metal",
U("Embedded Basics","cross-compilation","memory constraints","startup","مشروع: Embedded"),
U("Register Programming","memory-mapped I/O","GPIO","bit manipulation","datasheet","مشروع: Registers"),
U("Interrupts","ISR","vector table","priority","debouncing","مشروع: Interrupts"),
U("Timers و PWM","timer peripheral","PWM generation","servo control","LED dimming","مشروع: Timers"),
U("ADC و DAC","analog read","ADC resolution","sampling","DAC output","مشروع: ADC"),
U("Communication Protocols","UART","SPI","I2C","implementation","مشروع: Protocols"),
U("RTOS Concepts","FreeRTOS","tasks, scheduler","queues","semaphores","مشروع: RTOS"),
U("Low Power","sleep modes","power optimization","battery life","مشروع: LowPower"),
U("مشروع: Embedded Project","تخطيط","Hardware","Firmware","اختبار","عرض"),
),
S("المشروع الختامي","تطبيق C احترافي",
U("اختيار الفكرة","تحليل","جدوى","نطاق","خطة"),
U("تصميم","Architecture","Modules","Interfaces","Data Flow"),
U("Core Development","Implementation","Performance","Memory","Testing"),
U("Advanced Features","Multithreading","Networking","Files","Database"),
U("واجهة المستخدم","CLI","TUI (ncurses)","Menus","Interaction"),
U("Build و Test","CMake","Unit Tests","CI","Valgrind"),
U("Documentation","Doxygen","README","API Docs","Examples"),
U("عرض","Demo","Architecture","Challenges","Learnings"),
),
),
]

MISTAKES = [
("Overfitting","دقة تدريب 99%، اختبار 65%. النموذج حفظ ولم يتعلم.","تبسيط، Regularization، CV، EarlyStopping.","افحص الفجوة بين train و test.","critical"),
("Data Leakage","Scaler قبل التقسيم = اختبار يتسرب.","اقسم أولاً. scaler.fit(X_train). scaler.transform(X_test).","Pipeline يمنع Data Leakage.","critical"),
("Memory Leak","malloc بدون free = تسرب ذاكرة.","كل malloc يحتاج free. استخدم valgrind.","تسرب الذاكرة يتراكم ويقتل البرنامج.","critical"),
("Buffer Overflow","كتابة خارج حدود المصفوفة.","استخدم strncpy بدل strcpy. fgets بدل gets.","Buffer overflow ثغرة أمنية خطيرة.","critical"),
("NULL dereference","استخدام مؤشر بدون التحقق من NULL.","دائماً افحص المؤشر قبل استخدامه. if (ptr != NULL).","segmentation fault هو النتيجة.","major"),
("نسيان & في scanf","scanf('%d', x) بدل scanf('%d', &x).","دائماً مرر عنوان المتغير لـ scanf.","Garbage value أو crash.","minor"),
("استخدام = بدل ==","if (x = 5) ينجح دائماً.","استخدم if (x == 5). أو ضع الثابت أولاً: if (5 == x).","الـ compiler يحذر: suggest parentheses.","minor"),
("عدم غلق الملفات","fopen بدون fclose يهدر الموارد.","دائماً fclose. استخدم نمط open-check-use-close.","handle leak قد يمنع فتح ملفات جديدة.","major"),
]

def mb(p,c):return[f"الآن أتقنتَ {p}، نرتقي إلى {c}.",f"في الدرس السابق فككنا {p}. اليوم نبني عليه بـ {c}.",f"بعد {p}، {c} يسد الفجوة التالية.",f"{p} كان الأساس. {c} هو الطابق التالي.",][h(p+c)%4]

def gl(uc,lt,sn):
 ls=[];pv="المفاهيم الأساسية"
 for li,t in enumerate(lt,1):
  nm=2+(h(f"{uc}_{li}")%2);lm=[{"mistake":f"{m[0]}\n{m[1]}","correction":m[2],"treatment":m[3],"severity":m[4]} for m in [MISTAKES[(h(f"{uc}_{li}_{mi}"))%len(MISTAKES)] for mi in range(nm)]]
  ls.append({"lesson_index":li,"name":t,"goal":f"فهم وتطبيق {t}","bridge_sentence":mb(pv,t),"prerequisite_lessons":[] if li==1 else [f"{uc}.{li-1}"],"enables_lessons":[] if li==len(lt) else [f"{uc}.{li+1}"],"final_check_question":f"اشرح {t} بكلماتك. خطوات تطبيقه؟ أشهر خطأ؟","session_complete_criterion":f"يشرح {t} ويطبقه","yemeni_examples":[f"تطبيق عملي: {t}."],"expected_duration_minutes":30,"estimated_gem_cost":90,"solution_outline":f"خطوات {t}:\n1. فهم\n2. تطبيق\n3. تجربة\n4. تحليل\n5. توثيق","motivation_hook":f"{t} — مهارة أساسية في C.","learning_objectives":[{"statement":f"يفهم {t}","bloom_level":"understand"},{"statement":f"يطبق {t}","bloom_level":"apply"}],"glossary":[],"concepts":[{"name":t,"explanation":f"شرح وتطبيق عملي لـ {t}.","mastery_criterion":f"يشرح {t} ويطبقه","weight":1}],"common_mistakes":lm});pv=t
 return ls

def glab(uc,un,nl):
 return[{"lab_index":li,"title":f"معمل {un}: {'التشخيص' if li==1 else 'التطبيق'}","scenario":f"مشكلة تقنية في {un} تحتاج إلى تحليل وحل عملي باستخدام C.","completion_criterion":f"تحليل وحل","pedagogical_sequence":"diagnostic -> decision -> application -> analysis -> connection","prerequisite_lessons":[f"{uc}.{max(1,nl//2)}"],"allowed_tools":["text","code"],"questions":[{"kind":"diagnostic","prompt":f"خطوات تشخيص مشكلة في {un}؟","rubric":"ذكر 4 خطوات منطقية مع شرح","solution_outline":"جمع وتحليل وتحديد واقتراح","points":1},{"kind":"decision","prompt":f"خياران لحل في {un}. معاييرك؟","rubric":"ذكر معيارين مع تبرير","solution_outline":"الدقة والسرعة والتعقيد","points":1},{"kind":"application","prompt":f"اكتب كوداً يطبق {un}.","rubric":"كود صحيح يعمل","solution_outline":"include وتطبيق","points":2},{"kind":"analysis","prompt":f"كود لـ {un} فيه 3 أخطاء.","rubric":"3 أخطاء مع تصحيح","solution_outline":"تحليل وتصحيح","points":1},{"kind":"connection","prompt":f"اربط {un} بمهارات سابقة.","rubric":"رابطان مع فكرة","solution_outline":"الربط وخطة","points":1}]} for li in range(1,3)]

def ge(c,s,n=10):
 q=[("لغة C:",["مترجمة","مفسرة","JIT","Bytecode"],0,1,"C لغة مترجمة."),("malloc:",["تخصيص ذاكرة","طباعة","قراءة ملف","حلقة"],0,1,"تخصص ذاكرة."),("Overfitting:",["يحفظ ولا يعمم","بسيط","سريع","قليل"],0,2,"فشل على بيانات جديدة."),("Cross-Validation:",["تقييم موثوق","تسريع","زيادة","تغيير"],0,2,"k-fold."),("Data Leakage:",["تسرب الاختبار","فقدان","تسرب ذاكرة","توقف"],0,2,"أخطر خطأ."),("StandardScaler:",["توحيد مقياس","زيادة","تسريع","تغيير"],0,1,"mean=0, std=1."),("df.describe():",["إحصائيات","حذف","رسم","تغيير"],0,1,"وصف إحصائي."),("ReLU:",["ReLU","Sigmoid","Softmax","Linear"],0,2,"تحل Vanishing Gradient.")]
 vv=[]
 for v in range(3):vv.append([{"question_index":qi+1,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {ch}" for ci,ch in enumerate(c)],"correct_index":ci,"explanation":e,"difficulty":d,"points":1,"time_limit_seconds":60+d*30} for qi,(p,c,ci,d,e) in enumerate([q[(h(f"{s}_{v}_{qi}"))%len(q)] for qi in range(n)])])
 return{"code":s,"scope":c,"variants":vv}

def gp():
 q=[(1,"لغة C:",["مترجمة","مفسرة","JIT","Bytecode"],0,1),(1,"printf:",["طباعة","قراءة","ملف","حلقة"],0,1),(2,"malloc:",["تخصيص ذاكرة","طباعة","نوم","حلقة"],0,1),(2,"struct:",["تجميع بيانات","دالة","حلقة","ملف"],0,1),(3,"pthread:",["خيوط","ملفات","طباعة","حلقات"],0,2)]
 return[{"target_level_index":l,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {c}" for ci,c in enumerate(c)],"correct_index":ci,"difficulty":d,"explanation":f"مستوى {l}"} for l,p,c,ci,d in q]*2

def main():
 print(f"\n{'='*60}\n  skill-c — لغة C\n{'='*60}\n")
 mt={"slug":"skill-c","name":"لغة C","icon":"🔧","desc":"منهج متكامل: من الأساسيات إلى برمجة النظم.","scope":"professional_track","language":"ar","region":"YE","target_persona":"طالب يريد إتقان C.","teacher_tone":"تقنية ودقيقة.","viz":["flowchart","memory_diagram"],"tools":["text","code","image"],"glossary":[{"term":"Pointer","definition":"متغير يخزن عنواناً في الذاكرة"}]}
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
 fn={"schema_version":"v4.1","specialty":{**mt,"yemeni_examples":["تطبيق عملي"]},"levels":rl,"exam_banks":{"unit_banks":ub,"stage_banks":sb,"level_banks":lb},"placement_test_questions":gp(),"publish_notes":"skill-c — تسلسل منطقي"}
 fp=OUT/"final.json"
 with open(fp,'w',encoding='utf-8') as f:json.dump(fn,f,ensure_ascii=False,indent=2)
 sz=fp.stat().st_size/(1024*1024);tl=sum(1 for l in rl for s in l['stages'] for u in s['units'] for _ in u['lessons'])
 print(f"\n  ✅ {sz:.1f} MB | {len(rl)} مستويات | {tl} درس\n")
if __name__=="__main__":main()

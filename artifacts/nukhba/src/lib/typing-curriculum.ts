export type FingerColor = "red" | "green" | "blue" | "yellow" | "gray";

export const keyFingerMap: Record<string, FingerColor> = {
  "`": "red", "1": "red", "q": "red", "a": "red", "z": "red",
  "~": "red", "!": "red", "Q": "red", "A": "red", "Z": "red",
  "2": "green", "w": "green", "s": "green", "x": "green",
  "@": "green", "W": "green", "S": "green", "X": "green",
  "3": "blue", "e": "blue", "d": "blue", "c": "blue",
  "#": "blue", "E": "blue", "D": "blue", "C": "blue",
  "4": "yellow", "5": "yellow", "r": "yellow", "t": "yellow",
  "f": "yellow", "g": "yellow", "v": "yellow", "b": "yellow",
  "$": "yellow", "%": "yellow", "R": "yellow", "T": "yellow",
  "F": "yellow", "G": "yellow", "V": "yellow", "B": "yellow",
  "6": "yellow", "7": "yellow", "y": "yellow", "u": "yellow",
  "h": "yellow", "j": "yellow", "n": "yellow", "m": "yellow",
  "^": "yellow", "&": "yellow", "Y": "yellow", "U": "yellow",
  "H": "yellow", "J": "yellow", "N": "yellow", "M": "yellow",
  "8": "blue", "i": "blue", "k": "blue", ",": "blue",
  "*": "blue", "I": "blue", "K": "blue", "<": "blue",
  "9": "green", "o": "green", "l": "green", ".": "green",
  "(": "green", "O": "green", "L": "green", ">": "green",
  "0": "red", "-": "red", "=": "red", "p": "red",
  "[": "red", "]": "red", "\\": "red", ";": "red", "'": "red", "/": "red",
  ")": "red", "_": "red", "+": "red", "P": "red",
  "{": "red", "}": "red", "|": "red", ":": "red", '"': "red", "?": "red",
  " ": "gray",
};

export type Lesson = {
  id: number;
  sectionIndex: number;
  lessonIndex: number;
  title: string;
  text: string;
  targetWpm: number;
  targetAccuracy: number;
};

export type Section = {
  index: number;
  title: string;
  subtitle: string;
  newKeys: string[];
  color: string;
  bgColor: string;
  emoji: string;
  lessons: Lesson[];
};

type RawLesson = [string, string, number?];

function buildSection(
  index: number,
  title: string,
  subtitle: string,
  newKeys: string[],
  color: string,
  bgColor: string,
  emoji: string,
  rawLessons: RawLesson[],
): Section {
  const lessons: Lesson[] = rawLessons.map(([t, text, wpm], li) => ({
    id: 0,
    sectionIndex: index,
    lessonIndex: li,
    title: t,
    text,
    targetWpm: wpm ?? 20 + index * 2,
    targetAccuracy: 90,
  }));
  return { index, title, subtitle, newKeys, color, bgColor, emoji, lessons };
}

const rawSections: Section[] = [

  buildSection(0, "Home Row", "الصف الرئيسي: A S D F G H J K L ;", ["f","j","d","k","s","l","a",";","g","h"], "#F59E0B", "rgba(245,158,11,0.12)", "🏠", [
    ["F and J — anchor keys", "fff jjj fff jjj fjf jfj ffj jjf fjfj jfjf", 15],
    ["F and J pairs", "fj jf ff jj fj jf fj jf ffjj jjff fjf jfj", 15],
    ["D and K", "ddd kkk ddd kkk dkd kdk ddk kkd dkdk kdkd", 16],
    ["D and K pairs", "dk kd dd kk dk kd dk kd dkdk kdkd ddk kkd", 16],
    ["F D with J K", "fd jk fd jk df kj fd jk fdjk kjdf df kj", 17],
    ["S and L", "sss lll sss lll sls lsl ssl lls slsl lsls", 17],
    ["S and L pairs", "sl ls ss ll sl ls sl ls slsl lsls ssl lls", 17],
    ["F S D with J L K", "fsd jlk fsd jlk sdf lkj fds jkl sdf lkj", 18],
    ["A and semicolon", "aaa ;;; aaa ;;; a;a ;a; aa;; ;;aa a;a; ;a;a", 18],
    ["Home row — left hand", "fdsa fdsa asdf asdf dfas sadf fdas asdf", 18],
    ["Home row — right hand", "jkl; ;lkj jkl; ;lkj kl;j j;lk jkl; ;lkj", 18],
    ["G and H — index extends", "ggg hhh ggg hhh ghg hgh ggh hhg ghgh hghg", 19],
    ["G and H reach", "fg gh hj fgh ghj jgh fg gh fgh jhg gfh", 19],
    ["Full home row", "asdfghjkl; ;lkjhgfdsa asdfghjkl; ;lkjhgfdsa", 19],
    ["Home row review A", "fdsa jkl; ghj fds jkl; asdf ;lkj gh fj", 19],
    ["Home row review B", "asdfjkl; ;lkjfdsa asdfjkl; ghj gfh jgh", 20],
    ["Word: lad fad sad", "lad lad fad fad sad sad all all dad dad", 20],
    ["Word: ask lass flask", "ask ask lass lass flask flask dad dads ads", 20],
    ["Word: glad flash half", "glad glad flash flash half half fall falls", 20],
    ["Words mix — home row", "lad fad glad flask half lash flash hall flag", 21],
    ["Speed drill — home row", "all flags fall; glad lads; half a flask; ask", 22],
  ]),

  buildSection(1, "E and I", "الحروف E و I", ["e","i"], "#10B981", "rgba(16,185,129,0.12)", "✌️", [
    ["E drill", "eee eee ee ee eel eel fee fee see see led", 22],
    ["E words", "feel heel seal deal feed led eel flee knee", 22],
    ["I drill", "iii iii ii ii lid lid fig fig did did dig", 23],
    ["I words", "idea aide side silk disk kids jade said laid", 23],
    ["E and I together", "feel like file idea side said fail sail isle", 24],
    ["E and I words", "ideal silk deals files feel slide aside eels", 24],
    ["Words: file dial fail", "file dial fail silk disk kids jade slide idea", 25],
    ["Sentence: feel silk", "feel a silk; a jade idea; slide aside; ideal", 26],
    ["Sentence: seal a deal", "seal a deal; a kid slides; ideal silk; she fled", 26],
    ["Sentence: she fled", "she fled; kids slide; jade eels; ideal silk", 27],
    ["Speed: feel silk side", "feel silk side ideal jade disk file dial slide", 28],
    ["Speed challenge", "jaded kids flee; silk fails; ideal seals; slide", 30],
  ]),

  buildSection(2, "R and U", "الحروف R و U", ["r","u"], "#8B5CF6", "rgba(139,92,246,0.12)", "🎯", [
    ["R drill", "rrr rrr rr rr red red rid rid rule rule fur", 28],
    ["R words", "rule rude ruse rush dark lark fir fur far her", 29],
    ["U drill", "uuu uuu uu uu rug rug fur fur rush rush lure", 29],
    ["U words", "rule lure sure fuel duel surf flush rusk dusk", 30],
    ["R and U together", "rule ruler rude rush rural ruse sure lure surf", 31],
    ["Words: fire hire dear", "fire hire dear fear her fur rush rule fuel", 32],
    ["Sentence: rule a ruse", "rule a ruse; a dark lark; fear her; sure fire", 33],
    ["Sentence: rush a rule", "rush a rule; sure lads; flush a desk; fuel fire", 33],
    ["Speed challenge", "sure dark lads; a rural girl; fuel a fire; rush", 36],
  ]),

  buildSection(3, "T and Y", "الحروف T و Y", ["t","y"], "#EF4444", "rgba(239,68,68,0.12)", "⚡", [
    ["T drill", "ttt ttt tt tt try try try the the test test", 34],
    ["T words", "test trail steel start still trust trail the", 35],
    ["Y drill", "yyy yyy yy yy yes yes yet yet sky sky dry", 35],
    ["Y words", "style study dirty daily truly dusty rusty", 36],
    ["T and Y together", "dirty thirty rusty dusty truly style trust", 37],
    ["Words: try yet third", "try yet yes sky third their there three style", 38],
    ["Sentence: try the trail", "try the trail; a dirty lad; three girls; style", 39],
    ["Sentence: their style", "their style is truly dirty; trust skill; try", 39],
    ["Speed challenge", "study their style; start a dirty trail; thirty", 43],
  ]),

  buildSection(4, "O and W", "الحروف O و W", ["o","w"], "#06B6D4", "rgba(6,182,212,0.12)", "🌊", [
    ["O drill", "ooo ooo oo oo old old old told told fold fold", 40],
    ["O words", "old told sold fold hold gold role sole does goes", 40],
    ["W drill", "www www ww ww was word word will wolf work", 41],
    ["W words", "wolf flow glow show slow grow throw word work", 42],
    ["O and W together", "word world work lower older other order offer", 43],
    ["Words: old told fold", "old told fold gold role sole does goes word", 43],
    ["Sentence: the wolf shows", "the wolf shows gold; old folk hold; flow slow", 45],
    ["Sentence: work the story", "work the old story; fold the world; show; grow", 45],
    ["Speed challenge", "the wolf grows old; throw a show; world offers", 49],
  ]),

  buildSection(5, "Q and P", "الحروف Q و P", ["q","p"], "#F97316", "rgba(249,115,22,0.12)", "🎪", [
    ["P drill", "ppp ppp pp pp paid pale park part past path", 46],
    ["P words", "paid pale park part past path port post peel", 47],
    ["Q drill", "qqq qqq qq qq query quiet quote quest quit", 47],
    ["Q words", "quite quest quote queasy quit quality queries", 48],
    ["Q and P together", "quite a poet; prior quest; pour spirit; sport", 48],
    ["Words: tip hip lip sip", "tip hip lip sip rip dip flip slip drip strip", 49],
    ["Sentence: sport a quest", "sport a prior quest; quite the poet; power", 50],
    ["Speed challenge", "quite the prior sport; spirit quest; paid power", 54],
  ]),

  buildSection(6, "B and N", "الحروف B و N", ["b","n"], "#EC4899", "rgba(236,72,153,0.12)", "🌟", [
    ["N drill", "nnn nnn nn nn need need note note night north", 52],
    ["N words", "need note night north noble noise nurse nerd", 53],
    ["B drill", "bbb bbb bb bb born burn band bond bind bend", 53],
    ["B words", "born burn band bond bind bend bird blue blur", 54],
    ["B and N together", "blend blind blood bring born night nurse noble", 55],
    ["Words: born burn blue", "born burn blue best blend blind blood bring", 56],
    ["Sentence: bird burns bright", "the bird burns bright; blend all four; blood", 57],
    ["Sentence: blue bond night", "bring the blue bond; night north birds; born", 57],
    ["Speed challenge", "the night nurse blends blue; burn noble bond", 61],
  ]),

  buildSection(7, "V and M", "الحروف V و M", ["v","m"], "#6366F1", "rgba(99,102,241,0.12)", "💎", [
    ["M drill", "mmm mmm mm mm men men mind mind more most", 58],
    ["M words", "mind mine milk mild many make mark meet more", 59],
    ["V drill", "vvv vvv vv vv very view void vote live five", 59],
    ["V words", "very view void vote live drive give dive five", 60],
    ["V and M together", "move mind video movie major member memory novel", 61],
    ["Words: men mind mine", "men mind mine milk make mark meet more move", 61],
    ["Sentence: move the valve", "move the valve; memory of video; novel; major", 63],
    ["Speed challenge", "seven minor moves; give major value; movie love", 67],
  ]),

  buildSection(8, "C", "الحرف C", ["c"], "#14B8A6", "rgba(20,184,166,0.12)", "🌙", [
    ["C drill", "ccc ccc cc cc can can car car cap cap code", 64],
    ["C words", "can car cap care card core cool cord cold come", 65],
    ["C blends: cl, cr", "cl cl cr cr clean crack close crown city code", 65],
    ["C words: clean clear", "clean clear close cloud count court cycle claim", 66],
    ["Sentence: cool car", "cool car; clean code; black cloud; count cycle", 67],
    ["Sentence: civil court", "count the clock; civil court; clear code; clean", 67],
    ["Challenge: cold clean", "cold clean code; city civil court; clock count", 69],
    ["Speed challenge", "count civil courts; clean cold code; track cycle", 70],
    ["Final drill", "can car cap care cold clean close code civil", 71],
  ]),

  buildSection(9, "X", "الحرف X", ["x"], "#84CC16", "rgba(132,204,22,0.12)", "✖️", [
    ["X drill", "xxx xxx xx xx exit exit next next text text", 68],
    ["X words", "exit next text flex flux fox box hex vex fix", 69],
    ["X words: exact extra", "exact extra exist expect export excel relax", 69],
    ["X blends: ex, ox, ax", "ex ex ex fox fox box box fix fix mix mix wax", 70],
    ["Sentence: exit next", "exit next; exact text; flex the fox; fix six", 70],
    ["Sentence: excel at next", "excel at the next text; fix exact exit; relax", 71],
    ["Speed challenge", "the next export expert is quite flexible; exit", 74],
    ["Final drill", "exit next text expert exact expand relax fox", 75],
  ]),

  buildSection(10, "Z", "الحرف Z", ["z"], "#A78BFA", "rgba(167,139,250,0.12)", "⚡", [
    ["Z drill", "zzz zzz zz zz zip zip zero zero zone zone", 72],
    ["Z words", "zero zone zoom zeal zip zap zest fizz buzz", 73],
    ["Z words: pizza quiz", "fizz fuzz buzz jazz pizza quiz prize freeze", 73],
    ["Z words: blaze glaze", "freeze graze blaze glaze haze maze gaze daze", 74],
    ["Sentence: zero zone", "zero zone; buzz jazz; fizz pizza; zoom in; zeal", 75],
    ["Sentence: jazz and pizza", "jazz and pizza; crazy maze; glaze a prize; zero", 75],
    ["Speed challenge", "zoom the crazy prize; fuzzy jazz pizza; blaze", 78],
    ["Final drill", "zero zone fizz buzz jazz pizza crazy frozen", 79],
  ]),

  buildSection(11, "Numbers", "الأرقام 0-9", ["0","1","2","3","4","5","6","7","8","9"], "#F59E0B", "rgba(245,158,11,0.12)", "🔢", [
    ["1 and 2", "111 222 111 222 12 21 12 21 112 221 12 21", 20],
    ["3 and 4", "333 444 333 444 34 43 34 43 334 443 34 43", 20],
    ["5 and 6", "555 666 555 666 56 65 56 65 556 665 56 65", 20],
    ["7 and 8", "777 888 777 888 78 87 78 87 778 887 78 87", 20],
    ["9 and 0", "999 000 999 000 90 09 90 09 990 009 90 09", 21],
    ["1 through 5", "12345 54321 12345 54321 135 246 135 246 12345", 21],
    ["6 through 0", "67890 09876 67890 09876 680 790 680 790 67890", 21],
    ["All 10 digits", "1234567890 0987654321 12345 67890 13579 24680", 22],
    ["Phone numbers", "1234 5678 9012 3456 7890 1234 5678 9012 3456", 23],
    ["Sentence: 5 cats", "the 5 cats drink 10 cups of milk daily at noon", 24],
    ["Math: addition", "3+4=7 15+25=40 100+200=300 9+9=18 50+50=100", 27],
    ["Math: subtraction", "10-3=7 50-25=25 100-37=63 99-11=88 8-5=3", 28],
    ["Sentence: score 98", "my score is 98 out of 100 in the final test now", 29],
    ["Speed: all 10 digits", "1234567890 0987654321 11223344 55667788 9900", 32],
    ["Number mastery", "room 204 floor 7; 3 items at $25 each; 9am done", 35],
  ]),

  buildSection(12, "Shift and Symbols", "Shift والرموز", ["Shift","!","@","#","$","%"], "#EC4899", "rgba(236,72,153,0.12)", "🔡", [
    ["Capital letters", "The For All And But Nor Yet So Or If As Now", 24],
    ["Shift: names", "Fred Jack Sara Lisa Dave Kate John Jane Bob", 25],
    ["! exclamation", "Stop! Go! Run! Jump! Fly! Quick! Yes! No! Wow!", 26],
    ["@ at sign", "user@mail.com send@web.net admin@site.org", 27],
    ["# and $ symbols", "note #1 buy for $5 $10 $100 $500 save $25 #top", 27],
    ["% and ^ symbols", "25% off 50% done 75% ready x^2 y^3 power^of", 28],
    ["& and * symbols", "fish & chips 5*5=25 10*10=100 a*b rate*time", 29],
    ["( ) - _ = + symbols", "(1) (abc) first-class user_id 1+1=2 x=a+b", 30],
    ["[ ] { } symbols", "[1] [abc] { a=1; b=2; } code {x=5; y=6;}", 33],
    ["| \\ : ; ' \" symbols", "path|grep C:\\Users key: value; it's \"hello\"", 34],
    ["< > ? / symbols", "<html> <body> who? http://site.com/ why?", 35],
    ["Classic capital sentence", "The Quick Brown Fox Jumps Over The Lazy Dog!", 35],
    ["Mixed: email and price", "Email: test@mail.com; Price: $99.99; 50% off!", 37],
    ["Code pattern", "if (x > 0) { y = x * 2; } else { y = -1; }", 38],
    ["URL pattern", "https://www.site.com/path?id=1&key=abc#top", 39],
    ["Symbol mastery", "user@site.com; $100; 99%; #top; (done); {end}!", 40],
  ]),

  buildSection(13, "Words and Speed", "الكلمات والجُمل المتقدمة", [], "#10B981", "rgba(16,185,129,0.12)", "🚀", [
    ["Function words", "the and of to in is it that for on with from as", 40],
    ["Common verbs", "have has do does did will would should could can", 40],
    ["Common nouns", "time year people way day man woman child life world", 41],
    ["Classic pangram", "the quick brown fox jumps over the lazy dog", 43],
    ["Tongue twister", "she sells sea shells by the seashore at low tide", 43],
    ["Famous quote A", "to be or not to be that is the question of life", 44],
    ["Proverb A", "practice makes perfect every single day you try", 45],
    ["Proverb B", "the early bird catches the worm every single day", 45],
    ["Sentence: time flies", "time flies when you are having a very good time", 46],
    ["Sentence: journey begins", "every journey begins with a single step forward", 46],
    ["Tech words", "server client network database query index table", 52],
    ["Speed sentence A", "hard work beats talent when talent does not work", 50],
    ["Speed sentence B", "in the middle of every difficulty lies opportunity", 51],
    ["Master sentence", "to type well you must train your fingers and mind", 62],
    ["Grand finale", "you have mastered the keyboard; type with pride!", 65],
  ]),
];

let globalId = 1;
for (const section of rawSections) {
  for (const lesson of section.lessons) {
    lesson.id = globalId++;
  }
}

export const sections: Section[] = rawSections;

export const allLessons: Lesson[] = rawSections.flatMap(s => s.lessons);

export const totalLessons = allLessons.length;

export function getLessonById(id: number): Lesson | undefined {
  return allLessons.find(l => l.id === id);
}

export function getNextLesson(lesson: Lesson): Lesson | undefined {
  const idx = allLessons.findIndex(l => l.id === lesson.id);
  return allLessons[idx + 1];
}

export function computeStars(wpm: number, accuracy: number): 1 | 2 | 3 {
  if (wpm >= 50 && accuracy >= 95) return 3;
  if (wpm >= 30 && accuracy >= 90) return 2;
  return 1;
}

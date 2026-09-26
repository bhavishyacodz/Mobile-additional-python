import type { CareerDef, CareerId, ChapterDef, LevelDef, RewardDef } from "./types.ts";
import { LEVELS } from "./levels.ts";

export { LEVELS };

export const STARTING_COINS = 500;

export const CHAPTERS: ChapterDef[] = [
  { id: "foundations", title: "Track 1 · Foundations", blurb: "Print, store, decide, loop, ship a function." },
  { id: "strings", title: "Track 2 · Strings", blurb: "Text, case, characters, and joining words." },
  { id: "logic", title: "Track 3 · Logic", blurb: "Booleans, comparisons, and branching paths." },
  { id: "loops", title: "Track 4 · Loops", blurb: "while, range, nested repetition." },
  { id: "structures", title: "Track 5 · Data", blurb: "Indexes, slices, dictionaries, live records." },
  { id: "mastery", title: "Track 6 · Mastery", blurb: "Functions, reports, and the mid-course championship." },
  { id: "algorithms", title: "Track 7 · Algorithms", blurb: "Remainders, membership, reverse, and counting tricks." },
  { id: "fluency", title: "Track 8 · Fluency", blurb: "Methods, unpacking, nested data, and range steps." },
  { id: "studio", title: "Track 9 · Studio", blurb: "Helpers, reports, and the Grandmaster checkpoint." },
  { id: "patterns", title: "Track 10 · Patterns", blurb: "zip, any/all, ternary, swap, FizzBuzz, palindrome." },
  { id: "craft", title: "Track 11 · Craft", blurb: "Classic algorithms: factorial, search, primes, GCD." },
  { id: "legend", title: "Track 12 · Legend", blurb: "Ciphers, inventories, pipelines, and the Immortal championship." },
];

export const CAREERS: CareerDef[] = [
  { id: "rookie", title: "Rookie", rank: 0, blurb: "You just walked in. Learn how Python talks." },
  { id: "trainee", title: "Trainee", rank: 1, blurb: "Hired. You can print and store values." },
  { id: "junior", title: "Junior Associate", rank: 2, blurb: "You make decisions with data." },
  { id: "specialist", title: "Specialist", rank: 3, blurb: "You write conditions under pressure." },
  { id: "manager", title: "Manager", rank: 4, blurb: "You command lists and loops." },
  { id: "elite", title: "Elite Professional", rank: 5, blurb: "You ship functions. Mid-career championship cleared." },
  { id: "senior", title: "Senior Engineer", rank: 6, blurb: "Strings and text pipelines are second nature." },
  { id: "staff", title: "Staff Engineer", rank: 7, blurb: "You design branching logic that holds." },
  { id: "lead", title: "Lead Engineer", rank: 8, blurb: "You keep loops honest under a clock." },
  { id: "principal", title: "Principal Engineer", rank: 9, blurb: "Lists, indexes, and slices live in your hands." },
  { id: "architect", title: "Architect", rank: 10, blurb: "You model records with dictionaries." },
  { id: "distinguished", title: "Distinguished Engineer", rank: 11, blurb: "You query nested data without flinching." },
  { id: "fellow", title: "Fellow", rank: 12, blurb: "You compose functions into tools." },
  { id: "master", title: "Python Master", rank: 13, blurb: "Mid-course crown. The next tracks go deeper." },
  { id: "legend", title: "Legend", rank: 14, blurb: "You see patterns in operators and membership." },
  { id: "oracle", title: "Oracle", rank: 15, blurb: "String and list methods answer on command." },
  { id: "sage", title: "Sage", rank: 16, blurb: "You unpack pairs and walk nested structure." },
  { id: "director", title: "Director", rank: 17, blurb: "You compose helpers into a studio pipeline." },
  { id: "grandmaster", title: "Grandmaster", rank: 18, blurb: "Grandmaster checkpoint. The next tracks go deeper." },
  { id: "virtuoso", title: "Virtuoso", rank: 19, blurb: "You pair sequences and test truth in bulk." },
  { id: "artisan", title: "Artisan", rank: 20, blurb: "Ternary, swap, reverse — tools that fit in one line." },
  { id: "titan", title: "Titan", rank: 21, blurb: "You write the classic loops: factorial, search, flatten." },
  { id: "sovereign", title: "Sovereign", rank: 22, blurb: "Craft championship cleared. Numbers yield to you." },
  { id: "sentinel", title: "Sentinel", rank: 23, blurb: "Characters, ciphers, and frequency tables." },
  { id: "mythic", title: "Mythic", rank: 24, blurb: "You compose helpers into a living pipeline." },
  { id: "immortal", title: "Immortal", rank: 25, blurb: "Full Python career cleared. You teach the language by writing it." },
];

export const REWARDS: RewardDef[] = [
  { id: "trainee-badge", name: "Trainee Badge", levelId: 1, blurb: "Proof you shipped your first program." },
  { id: "junior-desk", name: "Junior Desk", levelId: 2, blurb: "A real workstation. Variables live here." },
  { id: "specialist-outfit", name: "Specialist Outfit", levelId: 3, blurb: "Kit for timed missions." },
  { id: "executive-office", name: "Executive Office", levelId: 4, blurb: "Corner office. Lists on the glass." },
  {
    id: "m8-apex",
    name: "M8 Apex",
    levelId: 5,
    blurb: "In-game championship grand tourer. Not a real-world prize.",
    featured: true,
  },
  { id: "string-keys", name: "String Keys", levelId: 6, blurb: "Access badge for the text lab." },
  { id: "case-file", name: "Case File", levelId: 7, blurb: "upper, lower, and strip — filed." },
  { id: "char-lens", name: "Character Lens", levelId: 8, blurb: "See every letter. Indexes start at 0." },
  { id: "logic-core", name: "Logic Core", levelId: 9, blurb: "True, False, and, or, not." },
  { id: "branch-map", name: "Branch Map", levelId: 10, blurb: "elif chains under a ticking clock." },
  { id: "while-engine", name: "While Engine", levelId: 11, blurb: "Loops that know when to stop." },
  { id: "range-rail", name: "Range Rail", levelId: 12, blurb: "0, 1, 2… counted without a handwritten list." },
  { id: "nest-grid", name: "Nest Grid", levelId: 13, blurb: "Loops inside loops. A grid of answers." },
  { id: "index-badge", name: "Index Badge", levelId: 14, blurb: "Replace the item at a position." },
  { id: "append-bay", name: "Append Bay", levelId: 15, blurb: "Grow a list. append returns None." },
  { id: "slice-glass", name: "Slice Glass", levelId: 16, blurb: "Take a window: start:end." },
  { id: "break-seal", name: "Break Seal", levelId: 17, blurb: "Leave a loop early. Skip with continue." },
  { id: "record-vault", name: "Record Vault", levelId: 18, blurb: "Key → value. Your first dictionary." },
  { id: "key-walk", name: "Key Walk", levelId: 19, blurb: "Walk keys. .get never explodes." },
  { id: "roster-intel", name: "Roster Intel", levelId: 20, blurb: "Filter a living record of people." },
  { id: "dual-params", name: "Dual Params", levelId: 21, blurb: "Functions that take more than one input." },
  { id: "return-path", name: "Return Path", levelId: 22, blurb: "Two returns. One function. Clean exits." },
  { id: "join-forge", name: "Join Forge", levelId: 23, blurb: "split and join — text as structure." },
  { id: "sort-engine", name: "Sort Engine", levelId: 24, blurb: "Order, min, max, and a mean you wrote." },
  {
    id: "master-apex",
    name: "Master's Apex",
    levelId: 25,
    blurb: "In-game mastery crown. Not a real-world prize.",
    featured: true,
  },
  { id: "remainder-seal", name: "Remainder Seal", levelId: 26, blurb: "% tells you what is left after dividing." },
  { id: "power-cell", name: "Power Cell", levelId: 27, blurb: "** raises. // divides and drops the decimal." },
  { id: "repeat-tape", name: "Repeat Tape", levelId: 28, blurb: "A string times a number repeats the signal." },
  { id: "member-pass", name: "Member Pass", levelId: 29, blurb: "in and not in — present or absent." },
  { id: "chain-gate", name: "Chain Gate", levelId: 30, blurb: "1 < x < 10 reads like math class." },
  { id: "none-watch", name: "None Watch", levelId: 31, blurb: "None is the value that means no value." },
  { id: "truth-lens", name: "Truth Lens", levelId: 32, blurb: "Empty lists and empty strings are False." },
  { id: "swap-file", name: "Swap File", levelId: 33, blurb: "replace rewrites. find locates." },
  { id: "prefix-badge", name: "Prefix Badge", levelId: 34, blurb: "startswith and endswith check the edges." },
  { id: "digit-gate", name: "Digit Gate", levelId: 35, blurb: "isdigit and isalpha classify characters." },
  { id: "pop-stack", name: "Pop Stack", levelId: 36, blurb: "pop takes the last. insert places anywhere." },
  { id: "mutate-rack", name: "Mutate Rack", levelId: 37, blurb: "sort and reverse change the list in place." },
  { id: "count-desk", name: "Count Desk", levelId: 38, blurb: "count tells you how many times it appears." },
  { id: "enum-walk", name: "Enum Walk", levelId: 39, blurb: "enumerate hands you the index and the item." },
  { id: "pair-unpack", name: "Pair Unpack", levelId: 40, blurb: "for k, v in items() — two names, one pair." },
  { id: "grid-key", name: "Grid Key", levelId: 41, blurb: "grid[row][col] — a list inside a list." },
  { id: "nested-vault", name: "Nested Vault", levelId: 42, blurb: "A dictionary that holds dictionaries." },
  { id: "step-rail", name: "Step Rail", levelId: 43, blurb: "range can skip: 0, 2, 4, 6." },
  { id: "mirror-glass", name: "Mirror Glass", levelId: 44, blurb: "[::-1] reverses a string or a list." },
  { id: "accum-forge", name: "Accum Forge", levelId: 45, blurb: "Build a string one piece at a time." },
  { id: "helper-link", name: "Helper Link", levelId: 46, blurb: "One function calls another." },
  { id: "studio-report", name: "Studio Report", levelId: 47, blurb: "A function that reads a roster and writes a line." },
  { id: "even-filter", name: "Even Filter", levelId: 48, blurb: "Keep the evens. Discard the odds." },
  { id: "default-key", name: "Default Key", levelId: 49, blurb: "get(key, fallback) never crashes." },
  {
    id: "grandmaster-crown",
    name: "Grandmaster Crown",
    levelId: 50,
    blurb: "In-game grandmaster seal. The course continues after this.",
    featured: true,
  },
  { id: "zip-rail", name: "Zip Rail", levelId: 51, blurb: "Walk two lists in lockstep." },
  { id: "truth-bulk", name: "Truth Bulk", levelId: 52, blurb: "any and all — one question for a whole list." },
  { id: "round-dial", name: "Round Dial", levelId: 53, blurb: "round and float — numbers that were text." },
  { id: "bool-gate", name: "Bool Gate", levelId: 54, blurb: "bool() names the truth you already felt." },
  { id: "none-is", name: "None Identity", levelId: 55, blurb: "is None — identity, not equality." },
  { id: "ternary-key", name: "Ternary Key", levelId: 56, blurb: "A one-line if that returns a value." },
  { id: "swap-hands", name: "Swap Hands", levelId: 57, blurb: "a, b = b, a — no third box required." },
  { id: "repeat-rack", name: "Repeat Rack", levelId: 58, blurb: "A list times a number fills the rack." },
  { id: "reverse-walk", name: "Reverse Walk", levelId: 59, blurb: "reversed() walks backwards without mutating." },
  { id: "fizz-seal", name: "Fizz Seal", levelId: 60, blurb: "The classic remainder song: Fizz, Buzz." },
  { id: "clamp-band", name: "Clamp Band", levelId: 61, blurb: "Keep a number inside a band." },
  { id: "mirror-test", name: "Mirror Test", levelId: 62, blurb: "A palindrome reads the same backwards." },
  { id: "fact-forge", name: "Fact Forge", levelId: 63, blurb: "Multiply down from n. Factorial." },
  { id: "fib-spiral", name: "Fib Spiral", levelId: 64, blurb: "Each number is the two before it, added." },
  { id: "digit-well", name: "Digit Well", levelId: 65, blurb: "% 10 peels a digit. // 10 shortens the number." },
  { id: "vowel-net", name: "Vowel Net", levelId: 66, blurb: "Count the letters that sing." },
  { id: "search-pin", name: "Search Pin", levelId: 67, blurb: "Walk until you find it. Return the index." },
  { id: "unique-press", name: "Unique Press", levelId: 68, blurb: "Keep the first of each. Drop repeats." },
  { id: "flat-grid", name: "Flat Grid", levelId: 69, blurb: "A list of lists becomes one list." },
  { id: "min-hand", name: "Min Hand", levelId: 70, blurb: "The smallest, found with a loop — no min()." },
  { id: "run-total", name: "Run Total", levelId: 71, blurb: "Print the sum after every step." },
  { id: "prime-gate", name: "Prime Gate", levelId: 72, blurb: "Only divisible by 1 and itself." },
  { id: "gcd-lock", name: "GCD Lock", levelId: 73, blurb: "Euclid's remainder loop." },
  { id: "leap-dial", name: "Leap Dial", levelId: 74, blurb: "400, 100, 4 — the calendar rules." },
  {
    id: "sovereign-seal",
    name: "Sovereign Seal",
    levelId: 75,
    blurb: "In-game craft championship. Not a real-world prize.",
    featured: true,
  },
  { id: "collatz-path", name: "Collatz Path", levelId: 76, blurb: "Halve evens. 3n+1 odds. Count the steps." },
  { id: "power-loop", name: "Power Loop", levelId: 77, blurb: "Raise without **. Multiply in a loop." },
  { id: "odd-bin", name: "Odd Bin", levelId: 78, blurb: "Keep the odds. A new list, not a mutation." },
  { id: "word-span", name: "Word Span", levelId: 79, blurb: "len of every word in a line-up." },
  { id: "title-press", name: "Title Press", levelId: 80, blurb: "strip then title — a two-method press." },
  { id: "ord-key", name: "Ord Key", levelId: 81, blurb: "ord and chr — letters as numbers." },
  { id: "caesar-shift", name: "Caesar Shift", levelId: 82, blurb: "Move every letter one place forward." },
  { id: "case-gate", name: "Case Gate", levelId: 83, blurb: "isupper, islower, isspace — classify a character." },
  { id: "freq-table", name: "Freq Table", levelId: 84, blurb: "How many times each letter appears." },
  { id: "anagram-seal", name: "Anagram Seal", levelId: 85, blurb: "Same letters, new order. sorted decides." },
  { id: "merge-unique", name: "Merge Unique", levelId: 86, blurb: "Two lists. One sequence. No duplicates." },
  { id: "stock-ledger", name: "Stock Ledger", levelId: 87, blurb: "Add to a key. Create a missing one." },
  { id: "update-kit", name: "Update Kit", levelId: 88, blurb: "update merges. setdefault plants a default." },
  { id: "mean-desk", name: "Mean Desk", levelId: 89, blurb: "A mean you wrote with // and len." },
  { id: "nested-pass", name: "Nested Pass", levelId: 90, blurb: "Walk records. Print the ones that pass." },
  { id: "pair-sheet", name: "Pair Sheet", levelId: 91, blurb: "zip keys to values and print a sheet." },
  { id: "histo-bar", name: "Histo Bar", levelId: 92, blurb: "Stars for counts. A tiny chart." },
  { id: "rotate-ring", name: "Rotate Ring", levelId: 93, blurb: "pop the front. append it. The ring turns." },
  { id: "window-sum", name: "Window Sum", levelId: 94, blurb: "Add each neighbor pair as you walk." },
  { id: "clock-mod", name: "Clock Mod", levelId: 95, blurb: "% 24 wraps the hours." },
  { id: "temp-forge", name: "Temp Forge", levelId: 96, blurb: "C to F with integer math." },
  { id: "bit-tape", name: "Bit Tape", levelId: 97, blurb: "Odd is 1. Even is 0. A tape of bits." },
  { id: "ticket-bay", name: "Ticket Bay", levelId: 98, blurb: "Filter open tickets from a list of records." },
  { id: "pipe-link", name: "Pipe Link", levelId: 99, blurb: "One helper feeds another." },
  {
    id: "immortal-crown",
    name: "Immortal Crown",
    levelId: 100,
    blurb: "In-game career finale. Not a real-world prize.",
    featured: true,
  },
];

export function careerById(id: CareerId): CareerDef {
  return CAREERS.find((c) => c.id === id) ?? CAREERS[0];
}

export function nextCareer(id: CareerId): CareerDef | null {
  const cur = careerById(id);
  return CAREERS.find((c) => c.rank === cur.rank + 1) ?? null;
}

export function rewardById(id: string) {
  return REWARDS.find((r) => r.id === id);
}

/** Cumulative XP required to sit at a player level. Level 1 starts at 0. */
export const XP_THRESHOLDS = [
  0, 100, 250, 500, 900, 1650, 2500, 3600, 5000, 6800, 9000, 11600, 14800, 18600, 23000, 28000, 34000, 41000, 49000,
  58000, 68000, 79000, 91000, 104000, 118000, 133000,
];

export function playerLevelFromXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const last = XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  if (xp >= last) {
    level = XP_THRESHOLDS.length + Math.floor((xp - last) / 1200);
  }
  return level;
}

export function xpProgress(xp: number): { level: number; current: number; needed: number; ratio: number } {
  const level = playerLevelFromXp(xp);
  const lastIdx = XP_THRESHOLDS.length - 1;
  if (level <= lastIdx) {
    const start = XP_THRESHOLDS[level - 1] ?? 0;
    const next = XP_THRESHOLDS[level] ?? start + 1000;
    const current = xp - start;
    const needed = next - start;
    return { level, current, needed, ratio: needed === 0 ? 1 : Math.min(1, current / needed) };
  }
  const overflow = xp - XP_THRESHOLDS[lastIdx];
  const into = overflow % 1200;
  return { level, current: into, needed: 1200, ratio: into / 1200 };
}

export function levelById(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function nextLevelId(completed: number[]): number {
  for (const l of LEVELS) {
    if (!completed.includes(l.id)) return l.id;
  }
  return LEVELS[LEVELS.length - 1].id;
}

export function isLevelUnlocked(id: number, completed: number[]) {
  if (id <= 1) return true;
  return completed.includes(id - 1);
}

export function codeStepCount(level: LevelDef) {
  return level.steps.filter((s) => s.type === "code").length;
}

export function totalLevels() {
  return LEVELS.length;
}

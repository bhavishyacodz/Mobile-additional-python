export type CareerId =
  | "rookie"
  | "trainee"
  | "junior"
  | "specialist"
  | "manager"
  | "elite"
  | "senior"
  | "staff"
  | "lead"
  | "principal"
  | "architect"
  | "distinguished"
  | "fellow"
  | "master"
  | "legend"
  | "oracle"
  | "sage"
  | "director"
  | "grandmaster"
  | "virtuoso"
  | "artisan"
  | "titan"
  | "sovereign"
  | "sentinel"
  | "mythic"
  | "immortal";

export type Difficulty = "Easy" | "Easy / Medium" | "Medium" | "Medium / Hard" | "Hard" | "Expert";

export type ChapterId =
  | "foundations"
  | "strings"
  | "logic"
  | "loops"
  | "structures"
  | "mastery"
  | "algorithms"
  | "fluency"
  | "studio"
  | "patterns"
  | "craft"
  | "legend";

export type ChoiceOption = {
  id: string;
  label: string;
  correct: boolean;
  explain: string;
};

export type CodeChallenge = {
  id: string;
  title: string;
  prompt: string;
  briefing: string;
  example: string;
  starter: string;
  expected: string;
  solution: string;
  hints: string[];
  concept: string;
};

export type Step =
  | { type: "brief"; title: string; body: string; example?: string }
  | { type: "reaction"; title: string; body: string }
  | { type: "choice"; question: string; concept: string; options: ChoiceOption[] }
  | { type: "code"; challenge: CodeChallenge };

export type LevelDef = {
  id: number;
  title: string;
  job: string;
  difficulty: Difficulty;
  description: string;
  objective: string;
  rewardCoins: number;
  rewardXp: number;
  unlockRewardId: string;
  unlockReward: string;
  careerUnlock: CareerId;
  chapter: ChapterId;
  timeLimitSec?: number;
  championship?: boolean;
  finale?: boolean;
  steps: Step[];
};

export type RewardDef = {
  id: string;
  name: string;
  levelId: number;
  blurb: string;
  featured?: boolean;
};

export type CareerDef = {
  id: CareerId;
  title: string;
  rank: number;
  blurb: string;
};

export type ChapterDef = {
  id: ChapterId;
  title: string;
  blurb: string;
};

export const SAVE_VERSION = 2;

export type CodeRunStats = {
  attempts: number;
  hintsUsed: number;
  showedSolution: boolean;
  elapsedMs: number;
};

export type FreelanceCategory = "bugfix" | "utility" | "game" | "data" | "automation" | "api" | "report";

export type GigLaneId =
  | "starter"
  | "numbers"
  | "logic"
  | "text"
  | "loops"
  | "lists"
  | "records"
  | "methods"
  | "studio"
  | "craft";

export type FreelanceJob = {
  id: string;
  title: string;
  client: string;
  company: string;
  category: FreelanceCategory;
  lane: GigLaneId;
  unlockAfter: number;
  difficulty: Difficulty;
  pay: number;
  xp: number;
  skills: string[];
  summary: string;
  brief: string;
  challenge: CodeChallenge;
};

export type GigRecord = {
  jobId: string;
  completedAt: number;
  stars: number;
  review: string;
  skills: string[];
  difficulty: Difficulty;
  pay: number;
  bonus: number;
  xp: number;
  attempts: number;
  hintsUsed: number;
  showedSolution: boolean;
  durationSec: number;
  practice: boolean;
};

export type LedgerEntry = {
  id: string;
  at: number;
  amount: number;
  label: string;
  kind: "gig" | "bonus";
};

export type PhoneMessage = {
  id: string;
  from: string;
  company: string;
  body: string;
  at: number;
  kind: "offer" | "thanks" | "system";
  jobId?: string;
  read: boolean;
};

export type PhoneAppId = "home" | "messages" | "freelance" | "portfolio" | "wallet" | "reviews" | "learn" | "settings";

export type SaveState = {
  version: number;
  playerName: string;
  hasStarted: boolean;
  coins: number;
  xp: number;
  completedLevels: number[];
  unlockedRewards: string[];
  career: CareerId;
  highestLevel: number;
  muted: boolean;
  gigCompletions: GigRecord[];
  walletLedger: LedgerEntry[];
  phoneMessages: PhoneMessage[];
  unreadGigIds: string[];
};

export type Screen =
  | { id: "boot" }
  | { id: "welcome" }
  | { id: "home" }
  | { id: "career" }
  | { id: "rewards" }
  | { id: "profile" }
  | { id: "intro"; levelId: number }
  | { id: "play"; levelId: number }
  | {
      id: "complete";
      levelId: number;
      firstClear: boolean;
      coins: number;
      xp: number;
      score?: number;
    }
  | { id: "levelup"; from: number; to: number }
  | { id: "hired"; career: CareerId }
  | { id: "claim"; levelId: number }
  | { id: "claimed" }
  | { id: "gig-intro"; jobId: string }
  | { id: "gig-play"; jobId: string }
  | {
      id: "gig-complete";
      jobId: string;
      firstClear: boolean;
      stars: number;
      pay: number;
      bonus: number;
      xp: number;
      review: string;
    };

export type TabId = "home" | "career" | "rewards" | "profile";

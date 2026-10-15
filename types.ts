export interface SecondPoint {
  second: number;
  wpm: number;
  rawWpm: number;
  errors: number;
  accuracy: number;
  burst?: number;
}

export interface CharStats {
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
}

export interface TestResult {
  id: string;
  wpm: number;
  accuracy: number;
  rawWpm: number;
  timestamp: string;
  duration: number;
  mode: TestMode;
  subMode?: string | number;
  mistakes: number;
  correctChars: number;
  characters?: CharStats;
  consistency?: number;
  chartTimeline?: SecondPoint[];
  textSample?: string;
  missedWords?: string[];
}

export type TestMode = 'time' | 'words' | 'quote' | 'zen';
export type QuoteLength = 'short' | 'medium' | 'long' | 'all';
export type TextViewMode = 'full' | 'compact';

export type ThemeId =
  | 'velocity-amber'
  | 'midnight-dark'
  | 'neon-racer'
  | 'emerald-track'
  | 'nordic-frost'
  | 'carbon-stealth'
  | 'monokai-drift'
  | 'matrix-overdrive';

export type SoundTheme = 'off' | 'clicky' | 'thock' | 'tactile' | 'typewriter';
export type CaretStyle = 'line' | 'underline' | 'block' | 'box';

export interface TestConfig {
  mode: TestMode;
  timeDuration: number;
  wordCount: number;
  quoteLength: QuoteLength;
  includePunctuation: boolean;
  includeNumbers: boolean;
  showLiveWpm: boolean;
  showLiveAcc: boolean;
  showLiveGraph: boolean;
  textViewMode: TextViewMode;
  caretStyle: CaretStyle;
  soundTheme: SoundTheme;
  theme: ThemeId;
}

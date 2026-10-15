import { ThemeId } from './types';

export const COMMON_WORDS = [
  "the", "be", "of", "and", "a", "to", "in", "he", "have", "it",
  "that", "for", "they", "I", "with", "as", "not", "on", "she", "at",
  "by", "this", "we", "you", "do", "but", "from", "or", "which", "one",
  "would", "all", "will", "there", "say", "who", "make", "when", "can", "more",
  "if", "no", "man", "out", "other", "so", "what", "time", "up", "go",
  "about", "than", "into", "could", "state", "only", "new", "year", "some", "take",
  "come", "these", "know", "see", "use", "get", "like", "then", "first", "any",
  "work", "now", "may", "such", "give", "over", "think", "most", "even", "find",
  "day", "also", "after", "way", "many", "must", "look", "before", "great", "back",
  "through", "long", "where", "much", "should", "well", "people", "down", "own", "just",
  "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place",
  "little", "world", "very", "still", "nation", "hand", "old", "life", "tell", "write",
  "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop",
  "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another",
  "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point",
  "form", "child", "few", "small", "since", "against", "ask", "late", "home", "interest",
  "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again",
  "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem", "however",
  "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact",
  "group", "play", "stand", "increase", "early", "course", "change", "help", "line"
];

export const QUOTES = [
  {
    text: "The only way to do great work is to love what you do.",
    source: "Steve Jobs",
    length: "short" as const
  },
  {
    text: "Simplicity is the ultimate sophistication.",
    source: "Leonardo da Vinci",
    length: "short" as const
  },
  {
    text: "Believe you can and you're halfway there.",
    source: "Theodore Roosevelt",
    length: "short" as const
  },
  {
    text: "Life is what happens when you're busy making other plans.",
    source: "John Lennon",
    length: "medium" as const
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    source: "Eleanor Roosevelt",
    length: "medium" as const
  },
  {
    text: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
    source: "Winston Churchill",
    length: "medium" as const
  },
  {
    text: "Two roads diverged in a wood, and I took the one less traveled by, and that has made all the difference.",
    source: "Robert Frost",
    length: "long" as const
  },
  {
    text: "The only impossible journey is the one you never begin. What you get by achieving your goals is not as important as what you become.",
    source: "Zig Ziglar",
    length: "long" as const
  }
];

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  bg: string;
  subtle: string;
  text: string;
  primary: string;
  active: string;
  error: string;
  chartLine: string;
  chartRaw: string;
  chartError: string;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'velocity-amber': {
    id: 'velocity-amber',
    name: 'Velocity Amber',
    bg: '#141416',
    subtle: '#222226',
    text: '#a1a1aa',
    primary: '#f59e0b',
    active: '#ffffff',
    error: '#ef4444',
    chartLine: '#f59e0b',
    chartRaw: '#a1a1aa',
    chartError: '#ef4444'
  },
  'midnight-dark': {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    bg: '#08090d',
    subtle: '#131622',
    text: '#94a3b8',
    primary: '#00f0ff',
    active: '#ffffff',
    error: '#ff3366',
    chartLine: '#00f0ff',
    chartRaw: '#94a3b8',
    chartError: '#ff3366'
  },
  'neon-racer': {
    id: 'neon-racer',
    name: 'Neon Racer',
    bg: '#0c0a17',
    subtle: '#1b172e',
    text: '#a89fcb',
    primary: '#ff007f',
    active: '#ffffff',
    error: '#ff3b30',
    chartLine: '#ff007f',
    chartRaw: '#a89fcb',
    chartError: '#ff3b30'
  },
  'emerald-track': {
    id: 'emerald-track',
    name: 'Emerald Track',
    bg: '#06130d',
    subtle: '#102419',
    text: '#86bca0',
    primary: '#10b981',
    active: '#ffffff',
    error: '#f43f5e',
    chartLine: '#10b981',
    chartRaw: '#86bca0',
    chartError: '#f43f5e'
  },
  'nordic-frost': {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    bg: '#181f2a',
    subtle: '#242e3d',
    text: '#94a3b8',
    primary: '#38bdf8',
    active: '#ffffff',
    error: '#f87171',
    chartLine: '#38bdf8',
    chartRaw: '#94a3b8',
    chartError: '#f87171'
  },
  'carbon-stealth': {
    id: 'carbon-stealth',
    name: 'Carbon Stealth',
    bg: '#111113',
    subtle: '#1c1c20',
    text: '#8f9099',
    primary: '#ff4444',
    active: '#f4f4f6',
    error: '#ff2222',
    chartLine: '#ff4444',
    chartRaw: '#8f9099',
    chartError: '#ff2222'
  },
  'monokai-drift': {
    id: 'monokai-drift',
    name: 'Monokai Drift',
    bg: '#17181c',
    subtle: '#25262c',
    text: '#9fa1a8',
    primary: '#a6e22e',
    active: '#f8f8f2',
    error: '#f92672',
    chartLine: '#a6e22e',
    chartRaw: '#9fa1a8',
    chartError: '#f92672'
  },
  'matrix-overdrive': {
    id: 'matrix-overdrive',
    name: 'Matrix Overdrive',
    bg: '#040905',
    subtle: '#0c1a0e',
    text: '#5fa86c',
    primary: '#00ff66',
    active: '#e2ffe8',
    error: '#ff3344',
    chartLine: '#00ff66',
    chartRaw: '#5fa86c',
    chartError: '#ff3344'
  }
};

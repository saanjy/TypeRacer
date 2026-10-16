import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  TrendingUp,
  Copy,
  Check,
  Eye,
  EyeOff,
  Flame,
  Activity,
  Maximize2,
  Minimize2,
  Terminal,
  Smartphone
} from 'lucide-react';
import { TestResult, TestMode, QuoteLength, SecondPoint, ThemeId, SoundTheme, CaretStyle, TextViewMode, TestConfig } from '../types';
import { COMMON_WORDS, QUOTES, THEMES } from '../constants';
import { storageService } from '../services/storageService';
import { soundService } from '../services/soundService';
import { WpmChart } from './WpmChart';

// Levenshtein distance for minimal edit distance (insertions, deletions, substitutions)
const getLevenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }

  return dp[n];
};

// Calculate actual uncorrected mistakes across the entire test state
const getCurrentTotalMistakes = (
  history: string[],
  input: string,
  wordIdx: number,
  targets: string[]
): number => {
  let mistakes = 0;

  // Mistakes in completed words in history
  for (let i = 0; i < history.length; i++) {
    const typed = history[i] || '';
    const target = targets[i] || '';
    if (typed !== target) {
      mistakes += getLevenshteinDistance(typed, target);
    }
  }

  // Mistakes in current input being typed
  if (input.length > 0) {
    const target = targets[wordIdx] || '';
    const targetPrefix = target.slice(0, input.length);
    const prefixMistakes = getLevenshteinDistance(input, targetPrefix);
    const extraLen = Math.max(0, input.length - target.length);
    mistakes += Math.max(prefixMistakes, extraLen);
  }

  return mistakes;
};

// Reconcile timeline error points so errors reflect only actual uncorrected mistakes
// If user edited/removed a mistake, the error count is removed from timeline points
const reconcileTimelineErrors = (timelineData: SecondPoint[], totalMistakes: number): SecondPoint[] => {
  if (timelineData.length === 0) return timelineData;
  const recorded = timelineData.reduce((sum, p) => sum + (p.errors || 0), 0);
  if (recorded === totalMistakes) return timelineData;

  if (totalMistakes === 0) {
    return timelineData.map(p => (p.errors ? { ...p, errors: 0 } : p));
  }

  if (recorded > totalMistakes) {
    let toReduce = recorded - totalMistakes;
    const next = [...timelineData];
    for (let i = next.length - 1; i >= 0 && toReduce > 0; i--) {
      const err = next[i].errors || 0;
      if (err > 0) {
        const take = Math.min(err, toReduce);
        next[i] = { ...next[i], errors: err - take };
        toReduce -= take;
      }
    }
    return next;
  }

  const diff = totalMistakes - recorded;
  const next = [...timelineData];
  const lastIdx = next.length - 1;
  next[lastIdx] = {
    ...next[lastIdx],
    errors: (next[lastIdx].errors || 0) + diff
  };
  return next;
};

// Initial word list generator so words are instantly visible on page load
const createInitialWordList = () => {
  const list: string[] = [];
  for (let i = 0; i < 70; i++) {
    list.push(COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)]);
  }
  return list;
};

export const TypingTest: React.FC = () => {
  // Config loaded from storage
  const [config, setConfig] = useState(() => storageService.getConfig());
  const activeTheme = THEMES[config.theme] || THEMES['velocity-amber'];

  // Test Configurations
  const [mode, setMode] = useState<TestMode>(config.mode);
  const [timeConfig, setTimeConfig] = useState<number>(config.timeDuration);
  const [wordConfig, setWordConfig] = useState<number>(config.wordCount);
  const [quoteLength, setQuoteLength] = useState<QuoteLength>(config.quoteLength);
  const [includePunctuation, setIncludePunctuation] = useState<boolean>(config.includePunctuation);
  const [includeNumbers, setIncludeNumbers] = useState<boolean>(config.includeNumbers);
  
  // Real-time Display options
  const [showLiveGraph, setShowLiveGraph] = useState<boolean>(config.showLiveGraph);
  const [showLiveWpm, setShowLiveWpm] = useState<boolean>(config.showLiveWpm);
  const [showLiveAcc, setShowLiveAcc] = useState<boolean>(config.showLiveAcc);
  const [textViewMode, setTextViewMode] = useState<TextViewMode>(config.textViewMode || 'full');

  // Sound and Caret
  const [sound, setSound] = useState<SoundTheme>(config.soundTheme);
  const [caretStyle, setCaretStyle] = useState<CaretStyle>(config.caretStyle);

  // Core Word State
  const [targetWords, setTargetWords] = useState<string[]>(createInitialWordList);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [wordHistory, setWordHistory] = useState<string[]>([]);

  // Running State
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(true);

  // Responsive device detection
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  // Real-Time Progression Data (Second-by-second)
  const [timeline, setTimeline] = useState<SecondPoint[]>([]);
  const [recentKeyCount, setRecentKeyCount] = useState(0);

  // Final Stats
  const [stats, setStats] = useState<TestResult | null>(null);

  // Current Live Metrics
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveRawWpm, setLiveRawWpm] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastWholeSecRef = useRef<number>(0);
  const lastTimelineSecRef = useRef<number>(0);
  const recentKeyCountRef = useRef<number>(0);

  // Sync refs to avoid stale closure issues in high-frequency timer intervals
  const wordHistoryRef = useRef(wordHistory);
  wordHistoryRef.current = wordHistory;
  const currentInputRef = useRef(currentInput);
  currentInputRef.current = currentInput;
  const currentWordIndexRef = useRef(currentWordIndex);
  currentWordIndexRef.current = currentWordIndex;
  const targetWordsRef = useRef(targetWords);
  targetWordsRef.current = targetWords;
  const isFinishedRef = useRef(isFinished);
  isFinishedRef.current = isFinished;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const timeConfigRef = useRef(timeConfig);
  timeConfigRef.current = timeConfig;

  // Window resize handler for mobile screen adaptation
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Synchronize sound theme
  useEffect(() => {
    soundService.setTheme(sound);
  }, [sound]);

  // Synchronize with external config changes (same-tab and cross-tab)
  useEffect(() => {
    const handleStorageChange = (e?: Event) => {
      const customEvent = e as CustomEvent<TestConfig> | undefined;
      const fresh = customEvent?.detail || storageService.getConfig();
      setConfig(fresh);
      setSound(fresh.soundTheme);
      setTextViewMode(fresh.textViewMode || 'full');
    };
    window.addEventListener('app:config-changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('app:config-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save config whenever changed
  useEffect(() => {
    storageService.saveConfig({
      mode,
      timeDuration: timeConfig,
      wordCount: wordConfig,
      quoteLength,
      includePunctuation,
      includeNumbers,
      showLiveGraph,
      showLiveWpm,
      showLiveAcc,
      textViewMode,
      soundTheme: sound,
      caretStyle
    });
  }, [mode, timeConfig, wordConfig, quoteLength, includePunctuation, includeNumbers, showLiveGraph, showLiveWpm, showLiveAcc, textViewMode, sound, caretStyle]);

  // Helper to format text with punctuation or numbers
  const formatWordList = useCallback((rawWords: string[], withPunct: boolean, withNum: boolean) => {
    const punctuations = [',', '.', '!', '?', ';', ':', '"', '-'];
    return rawWords.map((word, i) => {
      let w = word;
      if (withNum && Math.random() < 0.15) {
        w = `${Math.floor(Math.random() * 100)}`;
      }
      if (withPunct) {
        if (i === 0 || Math.random() < 0.12) {
          w = w.charAt(0).toUpperCase() + w.slice(1);
        }
        if (Math.random() < 0.25) {
          const p = punctuations[Math.floor(Math.random() * punctuations.length)];
          if (p === '"') {
            w = `"${w}"`;
          } else {
            w = `${w}${p}`;
          }
        }
      }
      return w;
    });
  }, []);

  // Text Generation Logic
  const generateNewWords = useCallback((practiceList?: string[]) => {
    if (practiceList && practiceList.length > 0) {
      const repeated: string[] = [];
      while (repeated.length < Math.max(practiceList.length * 2, 25)) {
        repeated.push(...practiceList);
      }
      setTargetWords(repeated.slice(0, 30));
      return;
    }

    if (mode === 'quote') {
      let filteredQuotes = QUOTES;
      if (quoteLength !== 'all') {
        filteredQuotes = QUOTES.filter(q => q.length === quoteLength);
      }
      const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)] || QUOTES[0];
      setTargetWords(randomQuote.text.split(' '));
      return;
    }

    let count = wordConfig;
    if (mode === 'time') {
      count = Math.max(timeConfig * 5, 80);
    } else if (mode === 'zen') {
      count = 150;
    }

    const raw: string[] = [];
    for (let i = 0; i < count; i++) {
      raw.push(COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)]);
    }

    const formatted = formatWordList(raw, includePunctuation, includeNumbers);
    setTargetWords(formatted);
  }, [mode, timeConfig, wordConfig, quoteLength, includePunctuation, includeNumbers, formatWordList]);

  // Reset Test
  const resetTest = useCallback((preserveWords: boolean = false, practiceList?: string[]) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    startTimeRef.current = null;
    lastWholeSecRef.current = 0;
    lastTimelineSecRef.current = 0;
    recentKeyCountRef.current = 0;

    setIsRunning(false);
    setIsFinished(false);
    setStartTime(null);
    setTimeElapsed(0);
    setCurrentWordIndex(0);
    setCurrentInput('');
    setWordHistory([]);
    setStats(null);
    setTimeline([]);
    setRecentKeyCount(0);
    setLiveWpm(0);
    setLiveRawWpm(0);
    setLiveAcc(100);

    if (practiceList) {
      generateNewWords(practiceList);
    } else if (!preserveWords) {
      generateNewWords();
    }

    setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 50);
  }, [generateNewWords]);

  // Listen for seamless global reset event (e.g. from clicking tr logo)
  useEffect(() => {
    const handleGlobalReset = () => {
      resetTest(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 20);
    };
    window.addEventListener('app:reset-test', handleGlobalReset);
    return () => window.removeEventListener('app:reset-test', handleGlobalReset);
  }, [resetTest]);

  // Regenerate when configuration controls change
  useEffect(() => {
    resetTest();
  }, [mode, timeConfig, wordConfig, quoteLength, includePunctuation, includeNumbers]);

  // Pure snapshot calculator for instantaneous real-time WPM & Accuracy with zero lag
  const calculateStatsSnapshot = useCallback((
    history: string[],
    input: string,
    wordIdx: number,
    targets: string[],
    elapsedSec: number
  ) => {
    if (elapsedSec <= 0) return { wpm: 0, rawWpm: 0, accuracy: 100, correctChars: 0, errors: 0, totalTyped: 0 };

    let correctChars = 0;
    let errorChars = 0;
    let totalTyped = 0;

    // Past completed words
    for (let idx = 0; idx < history.length; idx++) {
      const typed = history[idx] || '';
      const target = targets[idx] || '';
      totalTyped += typed.length + 1; // includes space separator

      if (typed === target) {
        correctChars += target.length + 1;
      } else {
        const wordMistakes = getLevenshteinDistance(typed, target);
        errorChars += wordMistakes;
        correctChars += Math.max(0, target.length - wordMistakes) + 1;
      }
    }

    // Current word being typed
    const currentTarget = targets[wordIdx] || '';
    totalTyped += input.length;
    if (input.length > 0) {
      const targetPrefix = currentTarget.slice(0, input.length);
      const currentMistakes = getLevenshteinDistance(input, targetPrefix);
      errorChars += currentMistakes;
      correctChars += Math.max(0, input.length - currentMistakes);
    }

    // Smooth initial ramp: damp the initial fraction of a second (first 0.35s)
    // to prevent unrealistic divide-by-zero spikes while showing live WPM immediately from key 1
    const effectiveSec = Math.max(elapsedSec, 0.35);
    const minutes = effectiveSec / 60;
    const wpm = minutes > 0 ? Math.max(0, Math.round((correctChars / 5) / minutes)) : 0;
    const rawWpm = minutes > 0 ? Math.max(0, Math.round((totalTyped / 5) / minutes)) : 0;
    const totalChars = correctChars + errorChars;
    const accuracy = totalChars > 0 ? Math.max(0, Math.min(100, Math.round((correctChars / totalChars) * 100))) : 100;

    return { wpm, rawWpm, accuracy, correctChars, errors: errorChars, totalTyped };
  }, []);

  // Finalize test and calculate stats
  const finishTest = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(true);

    const effectiveDuration = Math.max(
      1,
      mode === 'time'
        ? timeConfig
        : startTimeRef.current
        ? Math.round((performance.now() - startTimeRef.current) / 1000)
        : timeElapsed
    );
    const minutes = effectiveDuration / 60;

    let correctChars = 0;
    let incorrectChars = 0;
    let extraChars = 0;
    let missedChars = 0;
    let totalTyped = 0;
    let totalMistakes = 0;
    const missedWords: string[] = [];

    // Analyze completed words
    wordHistory.forEach((typed, idx) => {
      const target = targetWords[idx] || '';
      totalTyped += typed.length + 1;

      if (typed === target) {
        correctChars += target.length + 1; // All letters and space are correct
      } else {
        const wordMistakes = getLevenshteinDistance(typed, target);
        totalMistakes += wordMistakes;
        missedWords.push(target);

        // Accurate character-level category attribution
        if (typed.length > target.length) {
          extraChars += (typed.length - target.length);
        } else if (typed.length < target.length) {
          missedChars += (target.length - typed.length);
        }
        const substitutions = Math.max(0, wordMistakes - Math.abs(typed.length - target.length));
        incorrectChars += Math.max(substitutions, wordMistakes > 0 && extraChars === 0 && missedChars === 0 ? wordMistakes : 0);
        correctChars += Math.max(0, target.length - wordMistakes) + 1;
      }
    });

    // Check last word if in progress
    if (currentInput.length > 0) {
      const currentTarget = targetWords[currentWordIndex] || '';
      totalTyped += currentInput.length;

      if (mode === 'time') {
        // In time mode, user stopped because timer hit 0
        // Only evaluate characters actually typed against the prefix of the target word
        const targetPrefix = currentTarget.slice(0, currentInput.length);
        const lastWordMistakes = getLevenshteinDistance(currentInput, targetPrefix);
        totalMistakes += lastWordMistakes;

        if (lastWordMistakes > 0) {
          incorrectChars += lastWordMistakes;
          missedWords.push(currentTarget);
        }
        correctChars += Math.max(0, currentInput.length - lastWordMistakes);
        // Do NOT count untyped remaining letters as missed when timer expired!
      } else {
        // In words or quote mode, if test ended while word was incomplete
        const lastWordMistakes = getLevenshteinDistance(currentInput, currentTarget);
        totalMistakes += lastWordMistakes;
        if (lastWordMistakes > 0) {
          missedWords.push(currentTarget);
        }
        if (currentInput.length < currentTarget.length) {
          missedChars += (currentTarget.length - currentInput.length);
        } else if (currentInput.length > currentTarget.length) {
          extraChars += (currentInput.length - currentTarget.length);
        }
        const substitutions = Math.max(0, lastWordMistakes - Math.abs(currentInput.length - currentTarget.length));
        incorrectChars += substitutions;
        correctChars += Math.max(0, currentTarget.length - lastWordMistakes);
      }
    }

    const finalWpm = Math.max(0, Math.round((correctChars / 5) / minutes));
    const finalRaw = Math.max(0, Math.round((totalTyped / 5) / minutes));
    const totalCharsCount = correctChars + totalMistakes;
    const finalAcc = totalCharsCount > 0 ? Math.max(0, Math.min(100, Math.round((correctChars / totalCharsCount) * 100))) : 100;

    // Consistency %
    let consistency = 82;
    if (timeline.length > 2) {
      const wpms = timeline.map(p => p.wpm).filter(w => w > 0);
      if (wpms.length > 1) {
        const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
        const variance = wpms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpms.length;
        const stdDev = Math.sqrt(variance);
        consistency = Math.max(0, Math.min(100, Math.round(100 * (1 - (stdDev / (mean || 1))))));
      }
    }

    // Ensure chart timeline points accurately reflect mistakes per second and reconcile with totalMistakes
    let finalTimeline = [...timeline];
    if (finalTimeline.length === 0) {
      finalTimeline = [
        {
          second: effectiveDuration,
          wpm: finalWpm,
          rawWpm: finalRaw,
          errors: totalMistakes,
          accuracy: finalAcc,
          burst: finalWpm
        }
      ];
    } else {
      finalTimeline = reconcileTimelineErrors(finalTimeline, totalMistakes);
    }

    const resultObj: TestResult = {
      id: crypto.randomUUID(),
      wpm: finalWpm,
      rawWpm: finalRaw,
      accuracy: finalAcc,
      consistency,
      timestamp: new Date().toISOString(),
      duration: effectiveDuration,
      mode,
      subMode: mode === 'time' ? timeConfig : mode === 'words' ? wordConfig : quoteLength,
      mistakes: totalMistakes,
      correctChars,
      characters: {
        correct: correctChars,
        incorrect: incorrectChars,
        extra: extraChars,
        missed: missedChars
      },
      chartTimeline: finalTimeline,
      missedWords: Array.from(new Set(missedWords))
    };

    setStats(resultObj);
    storageService.saveResult(resultObj);

    if (finalWpm >= 80 && finalAcc >= 95) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: [activeTheme.primary, activeTheme.active, '#ffffff']
      });
    }
  }, [mode, timeConfig, timeElapsed, wordHistory, targetWords, currentInput, currentWordIndex, timeline, activeTheme]);

  const finishTestRef = useRef(finishTest);
  finishTestRef.current = finishTest;

  // High-frequency 100ms interval for smooth, ultra-responsive live WPM updates
  useEffect(() => {
    if (isRunning && !isFinished) {
      timerIntervalRef.current = window.setInterval(() => {
        if (!startTimeRef.current || isFinishedRef.current) return;

        const now = performance.now();
        const elapsedSec = Math.max(0.001, (now - startTimeRef.current) / 1000);
        const wholeSec = Math.floor(elapsedSec);

        // Update countdown/elapsed seconds on whole second transitions
        if (wholeSec !== lastWholeSecRef.current) {
          lastWholeSecRef.current = wholeSec;
          setTimeElapsed(wholeSec);
        }

        // Live calculation continuously refreshes so WPM naturally decays if typing pauses
        const currentStats = calculateStatsSnapshot(
          wordHistoryRef.current,
          currentInputRef.current,
          currentWordIndexRef.current,
          targetWordsRef.current,
          elapsedSec
        );

        setLiveWpm(currentStats.wpm);
        setLiveRawWpm(currentStats.rawWpm);
        setLiveAcc(currentStats.accuracy);

        // Append real-time data point to chart timeline each second with delta errors only
        if (wholeSec > lastTimelineSecRef.current) {
          lastTimelineSecRef.current = wholeSec;

          const currentMistakes = getCurrentTotalMistakes(
            wordHistoryRef.current,
            currentInputRef.current,
            currentWordIndexRef.current,
            targetWordsRef.current
          );

          setTimeline(currTimeline => {
            const recordedSoFar = currTimeline.reduce((sum, p) => sum + (p.errors || 0), 0);
            const deltaErrors = Math.max(0, currentMistakes - recordedSoFar);

            const nextTimeline = [
              ...currTimeline,
              {
                second: wholeSec,
                wpm: currentStats.wpm,
                rawWpm: currentStats.rawWpm,
                errors: deltaErrors,
                accuracy: currentStats.accuracy,
                burst: recentKeyCountRef.current * 12
              }
            ];

            return reconcileTimelineErrors(nextTimeline, currentMistakes);
          });
          recentKeyCountRef.current = 0;
          setRecentKeyCount(0);
        }

        if (modeRef.current === 'time' && elapsedSec >= timeConfigRef.current) {
          finishTestRef.current();
        }
      }, 100);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isRunning, isFinished, calculateStatsSnapshot]);

  // Submit current word (shared between physical spacebar and mobile soft space)
  const submitCurrentWord = useCallback((inputWord: string) => {
    if (inputWord.trim().length === 0) return;

    soundService.playKey(false, true);

    const newHistory = [...wordHistory, inputWord];
    setWordHistory(newHistory);
    setCurrentInput('');
    const nextWordIdx = currentWordIndex + 1;
    setCurrentWordIndex(nextWordIdx);

    // Immediately recalculate live stats and reconcile errors
    if (startTimeRef.current) {
      const elapsedSec = Math.max(0.001, (performance.now() - startTimeRef.current) / 1000);
      const liveStats = calculateStatsSnapshot(
        newHistory,
        '',
        nextWordIdx,
        targetWords,
        elapsedSec
      );
      setLiveWpm(liveStats.wpm);
      setLiveRawWpm(liveStats.rawWpm);
      setLiveAcc(liveStats.accuracy);

      const currentMistakes = getCurrentTotalMistakes(
        newHistory,
        '',
        nextWordIdx,
        targetWords
      );
      setTimeline(curr => reconcileTimelineErrors(curr, currentMistakes));
    }

    if ((mode === 'words' || mode === 'quote') && nextWordIdx >= targetWords.length) {
      finishTest();
    }
  }, [wordHistory, currentWordIndex, mode, targetWords, finishTest, calculateStatsSnapshot]);

  // Jump to a past word to edit/fix mistakes
  const jumpToWord = useCallback((wordIdx: number) => {
    if (isFinished || wordIdx >= currentWordIndex) return;
    const targetTyped = wordHistory[wordIdx] || '';
    const nextHistory = wordHistory.slice(0, wordIdx);
    setCurrentInput(targetTyped);
    setCurrentWordIndex(wordIdx);
    setWordHistory(nextHistory);
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
      setIsInputFocused(true);
    }

    if (startTimeRef.current) {
      const elapsedSec = Math.max(0.001, (performance.now() - startTimeRef.current) / 1000);
      const liveStats = calculateStatsSnapshot(
        nextHistory,
        targetTyped,
        wordIdx,
        targetWords,
        elapsedSec
      );
      setLiveWpm(liveStats.wpm);
      setLiveRawWpm(liveStats.rawWpm);
      setLiveAcc(liveStats.accuracy);

      const currentMistakes = getCurrentTotalMistakes(
        nextHistory,
        targetTyped,
        wordIdx,
        targetWords
      );
      setTimeline(curr => reconcileTimelineErrors(curr, currentMistakes));
    }
  }, [isFinished, currentWordIndex, wordHistory, calculateStatsSnapshot, targetWords]);

  // Handle Keystrokes in Input (Desktop / Hardware Keyboards)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      resetTest();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      resetTest();
      return;
    }

    if (isFinished) return;

    if (e.key === ' ') {
      e.preventDefault();
      submitCurrentWord(currentInput);
      return;
    }

    if (e.key === 'Backspace') {
      // Ctrl+Backspace or Alt+Backspace: clear current input immediately
      if (e.ctrlKey || e.altKey) {
        if (currentInput.length > 0) {
          e.preventDefault();
          setCurrentInput('');
          soundService.playKey(false, false);

          if (startTimeRef.current) {
            const elapsedSec = Math.max(0.001, (performance.now() - startTimeRef.current) / 1000);
            const liveStats = calculateStatsSnapshot(
              wordHistory,
              '',
              currentWordIndex,
              targetWords,
              elapsedSec
            );
            setLiveWpm(liveStats.wpm);
            setLiveRawWpm(liveStats.rawWpm);
            setLiveAcc(liveStats.accuracy);

            const currentMistakes = getCurrentTotalMistakes(
              wordHistory,
              '',
              currentWordIndex,
              targetWords
            );
            setTimeline(curr => reconcileTimelineErrors(curr, currentMistakes));
          }
          return;
        }
      }

      // If at start of word and can backspace to previous word to edit it
      if (currentInput.length === 0 && currentWordIndex > 0) {
        e.preventDefault();
        const prevIdx = currentWordIndex - 1;
        const prevTyped = wordHistory[prevIdx] || '';

        const nextHistory = wordHistory.slice(0, prevIdx);
        setCurrentInput(prevTyped);
        setCurrentWordIndex(prevIdx);
        setWordHistory(nextHistory);

        soundService.playKey(false, false);

        if (startTimeRef.current) {
          const elapsedSec = Math.max(0.001, (performance.now() - startTimeRef.current) / 1000);
          const liveStats = calculateStatsSnapshot(
            nextHistory,
            prevTyped,
            prevIdx,
            targetWords,
            elapsedSec
          );
          setLiveWpm(liveStats.wpm);
          setLiveRawWpm(liveStats.rawWpm);
          setLiveAcc(liveStats.accuracy);

          const currentMistakes = getCurrentTotalMistakes(
            nextHistory,
            prevTyped,
            prevIdx,
            targetWords
          );
          setTimeline(curr => reconcileTimelineErrors(curr, currentMistakes));
        }
      }
    }
  };

  // Handle Input Changes (Crucial for Mobile & Tablet On-Screen Virtual Keyboards!)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinished) return;

    let val = e.target.value;

    // Mobile / Tablet soft-keyboard support:
    if (val.endsWith(' ')) {
      const trimmed = val.slice(0, -1);
      submitCurrentWord(trimmed || currentInput);
      return;
    }

    const now = performance.now();
    let currentStart = startTimeRef.current;
    if (!currentStart && val.length > 0) {
      currentStart = now;
      startTimeRef.current = now;
      lastWholeSecRef.current = 0;
      lastTimelineSecRef.current = 0;
      setIsRunning(true);
      setStartTime(Date.now());
      setTimeline([{ second: 0, wpm: 0, rawWpm: 0, errors: 0, accuracy: 100, burst: 0 }]);
    }

    const targetWord = targetWords[currentWordIndex] || '';

    // Play feedback sound and update keycount
    if (val.length > currentInput.length) {
      // User typed a new character
      const addedCharIndex = val.length - 1;
      const isError = addedCharIndex >= targetWord.length || val[addedCharIndex] !== targetWord[addedCharIndex];
      soundService.playKey(isError, false);
      recentKeyCountRef.current += 1;
      setRecentKeyCount(prev => prev + 1);
    } else {
      // User deleted characters (Backspace/edit) - never count deletion as an error!
      soundService.playKey(false, false);
    }

    setCurrentInput(val);

    // Instant real-time live WPM update on every single keystroke
    if (currentStart) {
      const elapsedSec = Math.max(0.001, (now - currentStart) / 1000);
      const liveStats = calculateStatsSnapshot(
        wordHistory,
        val,
        currentWordIndex,
        targetWords,
        elapsedSec
      );
      setLiveWpm(liveStats.wpm);
      setLiveRawWpm(liveStats.rawWpm);
      setLiveAcc(liveStats.accuracy);

      // Reconcile timeline errors in real-time: if user edited the mistake, remove it!
      const currentMistakes = getCurrentTotalMistakes(
        wordHistory,
        val,
        currentWordIndex,
        targetWords
      );
      setTimeline(curr => reconcileTimelineErrors(curr, currentMistakes));
    }

    // Auto-finish on last word in words or quote mode ONLY if the word is completely correct!
    // If there is a mistake, allow the user to backspace and edit their mistake!
    if ((mode === 'words' || mode === 'quote') && currentWordIndex === targetWords.length - 1) {
      if (val === targetWord) {
        setTimeout(() => {
          finishTest();
        }, 10);
      }
    }
  };

  // Keep hidden input focused and summon on-screen keyboard on touch
  const focusInput = useCallback(() => {
    if (!isFinished && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
      setIsInputFocused(true);
    }
  }, [isFinished]);

  useEffect(() => {
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, [focusInput]);

  // Copy result summary
  const handleCopyResult = () => {
    if (!stats) return;
    const summary = `TypeRacer (${stats.mode} ${stats.subMode})
WPM: ${stats.wpm} | Raw: ${stats.rawWpm} | Acc: ${stats.accuracy}% | Time: ${stats.duration}s
Consistency: ${stats.consistency || 82}%`;
    navigator.clipboard.writeText(summary);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Smooth scroll logic for compact view mode
  useEffect(() => {
    if (textViewMode === 'compact' && activeWordRef.current && wordsContainerRef.current) {
      const container = wordsContainerRef.current;
      const word = activeWordRef.current;
      const wordOffsetTop = word.offsetTop;
      const containerHeight = container.clientHeight;

      if (wordOffsetTop > containerHeight / 2) {
        container.scrollTo({
          top: wordOffsetTop - containerHeight / 2 + 20,
          behavior: 'smooth'
        });
      } else {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentWordIndex, textViewMode]);

  // Caret element helper
  const renderCaret = () => {
    switch (caretStyle) {
      case 'underline':
        return <div className="caret-underline" />;
      case 'block':
        return <div className="caret-block" />;
      case 'box':
        return <div className="caret-box" />;
      case 'line':
      default:
        return <div className="caret-line" style={{ left: '-1px' }} />;
    }
  };

  // Render Target Words with high-contrast text and visible caret
  const renderedWords = useMemo(() => {
    return targetWords.map((word, wordIdx) => {
      const isPastWord = wordIdx < currentWordIndex;
      const isCurrentWord = wordIdx === currentWordIndex;
      const typedForThisWord = isPastWord ? (wordHistory[wordIdx] || '') : (isCurrentWord ? currentInput : '');
      const isWordHasError = isPastWord && typedForThisWord !== word;

      const wordChars = word.split('');
      const typedChars = typedForThisWord.split('');

      const extraCharsCount = Math.max(0, typedChars.length - wordChars.length);
      const extraCharsList = typedChars.slice(wordChars.length);

      return (
        <div
          key={`word-${wordIdx}`}
          ref={isCurrentWord ? activeWordRef : null}
          onClick={(e) => {
            if (isPastWord) {
              e.stopPropagation();
              jumpToWord(wordIdx);
            }
          }}
          className={`typing-word ${isWordHasError ? 'word-has-error cursor-pointer' : isPastWord ? 'cursor-pointer hover:opacity-80' : ''}`}
          title={isPastWord ? (isWordHasError ? 'Click to edit and fix mistake' : 'Click to edit word') : undefined}
        >
          {wordChars.map((targetChar, charIdx) => {
            const hasTyped = charIdx < typedChars.length;
            const isCharCorrect = hasTyped && typedChars[charIdx] === targetChar;
            const isCurrentChar = isCurrentWord && charIdx === typedChars.length;

            let charClass = "char-default";
            if (hasTyped) {
              charClass = isCharCorrect ? "char-correct" : "char-incorrect";
            } else if (isPastWord && isWordHasError) {
              charClass = "char-missed";
            }

            return (
              <span key={`char-${charIdx}`} className={`relative inline-block ${charClass}`}>
                {isCurrentChar && renderCaret()}
                {targetChar}
              </span>
            );
          })}

          {extraCharsList.map((extraChar, extraIdx) => (
            <span key={`extra-${extraIdx}`} className="char-extra relative inline-block">
              {isCurrentWord && (wordChars.length + extraIdx === typedChars.length) && renderCaret()}
              {extraChar}
            </span>
          ))}

          {isCurrentWord && typedChars.length >= wordChars.length && extraCharsCount === 0 && (
            <span className="relative inline-block w-0">
              {renderCaret()}
            </span>
          )}
        </div>
      );
    });
  }, [targetWords, currentWordIndex, wordHistory, currentInput, caretStyle, jumpToWord]);

  return (
    <div className="flex flex-col items-center w-full px-1 sm:px-2 max-w-4xl mx-auto py-1 sm:py-2">
      {/* ===================== ORGANIZED RESPONSIVE TOP TOOLBAR ===================== */}
      {!isRunning && !isFinished && (
        <div className="w-full flex flex-col items-center gap-2 mb-4 sm:mb-8 select-none">
          {/* Scrollable pill container on mobile, centered pill on desktop */}
          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar py-1">
            <div className="inline-flex items-center min-w-max mx-auto bg-black/25 dark:bg-white/5 backdrop-blur-md rounded-2xl p-1 sm:p-1.5 border border-white/10 text-xs font-mono shadow-sm">
              {/* Group 1: Modifiers (@ punctuation, # numbers) */}
              <div className="flex items-center gap-0.5 sm:gap-1 px-1">
                <button
                  onClick={() => { setIncludePunctuation(!includePunctuation); resetTest(); }}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl transition-all ${
                    includePunctuation
                      ? 'text-brand-primary font-bold bg-white/10'
                      : 'text-brand-text hover:text-brand-active'
                  }`}
                  title="Include punctuation"
                >
                  <span>@</span>
                  <span className="hidden xs:inline">punctuation</span>
                </button>
                <button
                  onClick={() => { setIncludeNumbers(!includeNumbers); resetTest(); }}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl transition-all ${
                    includeNumbers
                      ? 'text-brand-primary font-bold bg-white/10'
                      : 'text-brand-text hover:text-brand-active'
                  }`}
                  title="Include numbers"
                >
                  <span>#</span>
                  <span className="hidden xs:inline">numbers</span>
                </button>
              </div>

              {/* Vertical Divider */}
              <div className="w-[1px] h-4 bg-white/15 mx-1" />

              {/* Group 2: Core Modes (time, words, quote, zen) - AI text completely removed */}
              <div className="flex items-center gap-0.5 sm:gap-1 px-1">
                {(['time', 'words', 'quote', 'zen'] as TestMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); resetTest(); }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl capitalize transition-all ${
                      mode === m
                        ? 'text-brand-primary font-bold bg-white/10 shadow-sm'
                        : 'text-brand-text hover:text-brand-active'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Vertical Divider */}
              <div className="w-[1px] h-4 bg-white/15 mx-1" />

              {/* Group 3: Sub-mode configuration */}
              <div className="flex items-center gap-0.5 sm:gap-1 px-1">
                {mode === 'time' && (
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {[15, 30, 60, 120].map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTimeConfig(t); resetTest(); }}
                        className={`px-2 sm:px-2.5 py-1.5 rounded-xl transition-all ${
                          timeConfig === t
                            ? 'text-brand-primary font-bold bg-white/10'
                            : 'text-brand-text hover:text-brand-active'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {mode === 'words' && (
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {[10, 25, 50, 100].map((w) => (
                      <button
                        key={w}
                        onClick={() => { setWordConfig(w); resetTest(); }}
                        className={`px-2 sm:px-2.5 py-1.5 rounded-xl transition-all ${
                          wordConfig === w
                            ? 'text-brand-primary font-bold bg-white/10'
                            : 'text-brand-text hover:text-brand-active'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                )}

                {mode === 'quote' && (
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {(['all', 'short', 'medium', 'long'] as QuoteLength[]).map((ql) => (
                      <button
                        key={ql}
                        onClick={() => { setQuoteLength(ql); resetTest(); }}
                        className={`px-2 sm:px-2.5 py-1.5 rounded-xl capitalize transition-all ${
                          quoteLength === ql
                            ? 'text-brand-primary font-bold bg-white/10'
                            : 'text-brand-text hover:text-brand-active'
                        }`}
                      >
                        {ql}
                      </button>
                    ))}
                  </div>
                )}

                {mode === 'zen' && (
                  <span className="text-brand-text px-2 text-[11px]">free typing</span>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Utility Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono text-brand-text">
            {/* View Mode Toggle */}
            <button
              onClick={() => {
                const nextView: TextViewMode = textViewMode === 'full' ? 'compact' : 'full';
                setTextViewMode(nextView);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/15 hover:bg-black/25 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
              title="Toggle Full View vs 3-Line Focus View"
            >
              {textViewMode === 'full' ? <Maximize2 className="w-3.5 h-3.5 text-brand-primary" /> : <Minimize2 className="w-3.5 h-3.5" />}
              <span>{textViewMode === 'full' ? 'full view' : '3 lines'}</span>
            </button>

            {/* Live Graph Toggle */}
            <button
              onClick={() => setShowLiveGraph(!showLiveGraph)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                showLiveGraph
                  ? 'text-brand-primary bg-black/15 dark:bg-white/5 font-medium'
                  : 'text-brand-text hover:text-brand-active bg-black/15 dark:bg-white/5'
              }`}
              title="Toggle Live Real-Time WPM Graph"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>graph: {showLiveGraph ? 'on' : 'off'}</span>
            </button>

            {/* Caret Style Switcher */}
            <button
              onClick={() => {
                const carets: CaretStyle[] = ['line', 'underline', 'block', 'box'];
                const next = carets[(carets.indexOf(caretStyle) + 1) % carets.length];
                setCaretStyle(next);
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/15 hover:bg-black/25 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
              title="Cycle Caret Style"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>caret: {caretStyle}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Keyboard Focus Helper Pill (Shows if keyboard loses focus on mobile) */}
      {!isInputFocused && !isFinished && (
        <div
          onClick={focusInput}
          className="sm:hidden mb-3 px-3 py-1.5 rounded-full bg-brand-primary/15 border border-brand-primary/30 flex items-center gap-1.5 text-xs text-brand-primary cursor-pointer active:scale-95 transition-transform"
        >
          <Smartphone className="w-3.5 h-3.5 animate-pulse" />
          <span>Tap to focus keyboard</span>
        </div>
      )}

      {/* Heads-Up Display: Live Countdown Timer & Instant WPM / Accuracy Counters */}
      <div className="w-full flex items-center justify-between h-8 sm:h-9 px-2 mb-2 sm:mb-3 select-none font-mono">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-brand-primary" style={{ color: 'var(--primary-color)' }}>
            {mode === 'time' ? (
              isRunning ? Math.max(0, timeConfig - timeElapsed) : timeConfig
            ) : (
              isRunning ? `${timeElapsed}s` : '0s'
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm">
            {showLiveWpm && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Flame className={`w-3.5 h-3.5 transition-colors ${isRunning ? 'text-brand-primary' : 'text-brand-text/40'}`} />
                <span className="text-brand-text text-[11px] sm:text-xs">wpm:</span>
                <span className="text-brand-active font-bold text-sm sm:text-base font-mono min-w-[2ch]">
                  {isRunning ? liveWpm : '—'}
                </span>
              </div>
            )}
            {showLiveAcc && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Activity className={`w-3.5 h-3.5 transition-colors ${isRunning ? 'text-brand-text' : 'text-brand-text/40'}`} />
                <span className="text-brand-text text-[11px] sm:text-xs">acc:</span>
                <span className="text-brand-active font-bold text-sm sm:text-base font-mono min-w-[3ch]">
                  {isRunning ? `${liveAcc}%` : '—'}
                </span>
              </div>
            )}
          </div>
        </div>

        {isRunning && (
          <button
            onClick={() => setShowLiveGraph(!showLiveGraph)}
            className="text-xs flex items-center gap-1 sm:gap-1.5 text-brand-text hover:text-brand-primary transition-colors bg-black/20 px-2 sm:px-2.5 py-1 rounded-lg border border-white/5"
          >
            {showLiveGraph ? <Eye className="w-3.5 h-3.5 text-brand-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline">live graph</span>
          </button>
        )}
      </div>

      {/* Real-time Recharts WPM Progression Line Graph (Active Test Feature) */}
      {showLiveGraph && isRunning && !isFinished && (
        <div className="w-full mb-4 sm:mb-6 p-2.5 sm:p-4 rounded-2xl bg-black/25 dark:bg-black/40 border border-white/10 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <WpmChart
            data={timeline}
            theme={config.theme}
            isLive={true}
            height={isMobileScreen ? 100 : 130}
            showAverage={true}
            showRaw={true}
            showErrors={true}
            currentSecond={timeElapsed}
          />
        </div>
      )}

      {/* Main Typing Area or Finished Results Display */}
      {isFinished && stats ? (
        /* ======================== RESULTS SCREEN (FULLY RESPONSIVE) ======================== */
        <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-black/20 border border-white/10 mb-4 sm:mb-6">
            <div className="flex flex-col items-start pl-1 sm:pl-2">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-brand-text font-semibold">wpm</span>
              <span className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight text-brand-primary" style={{ color: 'var(--primary-color)' }}>
                {stats.wpm}
              </span>
              <span className="text-[10px] sm:text-xs text-brand-text mt-0.5 sm:mt-1">raw: {stats.rawWpm}</span>
            </div>

            <div className="flex flex-col items-start pl-1 sm:pl-2">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-brand-text font-semibold">acc</span>
              <span className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight text-brand-active" style={{ color: 'var(--active-color)' }}>
                {stats.accuracy}%
              </span>
              <div className="flex flex-col items-start mt-0.5 sm:mt-1">
                <span className="text-[11px] sm:text-xs font-semibold" style={{ color: stats.mistakes > 0 ? (activeTheme.error || 'var(--error-color)') : 'var(--text-color)' }}>
                  {stats.mistakes === 0 ? '0 mistakes' : `${stats.mistakes} ${stats.mistakes === 1 ? 'mistake' : 'mistakes'}`}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono text-brand-text/75 mt-0.5" title="correct / incorrect / extra / missed">
                  <span className="text-green-400 font-semibold">{stats.characters?.correct ?? stats.correctChars}</span>
                  <span className="text-white/20">/</span>
                  <span className="text-red-400 font-semibold">{stats.characters?.incorrect ?? 0}</span>
                  <span className="text-white/20">/</span>
                  <span className="text-amber-400 font-semibold">{stats.characters?.extra ?? 0}</span>
                  <span className="text-white/20">/</span>
                  <span className="text-purple-400 font-semibold">{stats.characters?.missed ?? 0}</span>
                  <span className="ml-1 text-[8px] text-white/40 uppercase">cor/inc/ext/mis</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start pl-1 sm:pl-2">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-brand-text font-semibold">consistency</span>
              <span className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono tracking-tight text-brand-active">
                {stats.consistency}%
              </span>
              <span className="text-[10px] sm:text-xs text-brand-text mt-0.5 sm:mt-1">pace stability</span>
            </div>

            <div className="flex flex-col items-start pl-1 sm:pl-2">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-brand-text font-semibold">test type</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-bold font-mono tracking-tight text-brand-active capitalize">
                {stats.mode}
              </span>
              <span className="text-[10px] sm:text-xs text-brand-text mt-0.5 sm:mt-1">{stats.subMode} • {stats.duration}s</span>
            </div>
          </div>

          {/* Full-Width Interactive Post-Test Progression Graph */}
          <div className="w-full p-3 sm:p-6 rounded-2xl bg-black/20 border border-white/10 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-brand-primary flex items-center gap-1.5 sm:gap-2">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>WPM PROGRESSION TIMELINE</span>
              </span>
              <span className="text-[10px] sm:text-xs text-brand-text font-mono">
                Duration: {stats.duration}s • Peak: {Math.max(...(stats.chartTimeline?.map(p => p.wpm) || [stats.wpm]))} WPM
              </span>
            </div>

            <WpmChart
              data={stats.chartTimeline || []}
              theme={config.theme}
              isLive={false}
              height={isMobileScreen ? 180 : 250}
              showAverage={true}
              showRaw={true}
              showErrors={true}
            />
          </div>

          {stats.missedWords && stats.missedWords.length > 0 && (
            <div className="w-full p-3 sm:p-4 mb-4 sm:mb-6 rounded-xl bg-red-950/20 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-2 text-brand-text text-center sm:text-left">
                <span className="text-red-400 font-semibold">Missed Words:</span>
                <span className="font-mono text-brand-active">{stats.missedWords.slice(0, 6).join(', ')}</span>
              </div>
              <button
                onClick={() => resetTest(false, stats.missedWords)}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium transition-colors text-xs"
              >
                Practice Missed Words
              </button>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center w-full">
            <button
              onClick={() => resetTest(false)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl text-black font-bold text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg"
              style={{ backgroundColor: activeTheme.primary }}
              title="Next Test (Tab)"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Next Test</span>
            </button>

            <button
              onClick={() => resetTest(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-brand-active text-xs sm:text-sm font-medium transition-colors border border-white/5"
              title="Repeat exact test text"
            >
              <span>Repeat</span>
            </button>

            <button
              onClick={handleCopyResult}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-brand-text hover:text-brand-active text-xs sm:text-sm font-medium transition-colors border border-white/5"
              title="Copy result summary"
            >
              {copiedNotification ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedNotification ? 'Copied!' : 'Copy Summary'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* ======================== ACTIVE TYPING TEXT AREA ======================== */
        /* Responsive font size and touch focus handling */
        <div
          className={`relative w-full font-mono leading-relaxed select-none cursor-text px-2 py-2 sm:py-4 ${
            textViewMode === 'compact'
              ? 'h-[135px] sm:h-[156px] overflow-hidden'
              : 'min-h-[140px] overflow-visible'
          } text-lg sm:text-2xl md:text-3xl`}
          onClick={focusInput}
          onTouchStart={focusInput}
          ref={wordsContainerRef}
        >
          <div className="transition-opacity duration-150 opacity-100">
            {renderedWords}
          </div>

          {/* Hidden Input capturing desktop physical keys and mobile soft virtual keyboards */}
          {/* Note: font-size 16px (text-base) prevents iOS Safari from automatically zooming into the page */}
          <input
            ref={inputRef}
            type="text"
            className="absolute inset-0 opacity-0 cursor-default text-base -z-10 pointer-events-none"
            value={currentInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            inputMode="text"
            enterKeyHint="next"
            autoFocus
          />
        </div>
      )}

      {/* Restart Button & Mobile/Desktop Shortcut Hints */}
      {!isFinished && (
        <div className="mt-4 sm:mt-8 flex flex-col items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => resetTest()}
            className="p-3 text-brand-text hover:text-brand-active transition-all hover:rotate-180 duration-300 rounded-full hover:bg-white/10 active:scale-95"
            aria-label="Restart Test"
            title="Restart test (Tab)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <div className="text-[11px] sm:text-xs text-brand-text flex items-center gap-2 font-mono">
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span className="bg-white/10 px-1.5 py-0.5 rounded text-brand-active">Tab</span>
              <span>restart</span>
              <span className="text-white/20">•</span>
              <span className="bg-white/10 px-1.5 py-0.5 rounded text-brand-active">Esc</span>
              <span>reset</span>
            </span>
            <span className="sm:hidden text-brand-text">
              tap text area to type • tap restart above
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

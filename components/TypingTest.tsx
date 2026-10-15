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
import { TestResult, TestMode, QuoteLength, SecondPoint, ThemeId, SoundTheme, CaretStyle, TextViewMode } from '../types';
import { COMMON_WORDS, QUOTES, THEMES } from '../constants';
import { storageService } from '../services/storageService';
import { soundService } from '../services/soundService';
import { WpmChart } from './WpmChart';

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

  // Synchronize with external config changes
  useEffect(() => {
    const handleStorageChange = () => {
      const fresh = storageService.getConfig();
      setConfig(fresh);
      setSound(fresh.soundTheme);
      setTextViewMode(fresh.textViewMode || 'full');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

  // Calculate live statistics
  const computeLiveStats = useCallback((elapsedSec: number) => {
    if (elapsedSec <= 0) return { wpm: 0, rawWpm: 0, accuracy: 100, correctChars: 0, errors: 0 };

    let correctChars = 0;
    let errorChars = 0;
    let totalTyped = 0;

    // Past completed words
    wordHistory.forEach((typed, idx) => {
      const target = targetWords[idx] || '';
      totalTyped += typed.length + 1;
      for (let c = 0; c < typed.length; c++) {
        if (c < target.length && typed[c] === target[c]) {
          correctChars++;
        } else {
          errorChars++;
        }
      }
      if (typed.length < target.length) {
        errorChars += (target.length - typed.length);
      }
      correctChars++;
    });

    // Current word being typed
    const currentTarget = targetWords[currentWordIndex] || '';
    totalTyped += currentInput.length;
    for (let c = 0; c < currentInput.length; c++) {
      if (c < currentTarget.length && currentInput[c] === currentTarget[c]) {
        correctChars++;
      } else {
        errorChars++;
      }
    }

    const minutes = elapsedSec / 60;
    const wpm = minutes > 0 ? Math.max(0, Math.round((correctChars / 5) / minutes)) : 0;
    const rawWpm = minutes > 0 ? Math.max(0, Math.round((totalTyped / 5) / minutes)) : 0;
    const totalChars = correctChars + errorChars;
    const accuracy = totalChars > 0 ? Math.max(0, Math.min(100, Math.round((correctChars / totalChars) * 100))) : 100;

    return { wpm, rawWpm, accuracy, correctChars, errors: errorChars, totalTyped };
  }, [wordHistory, targetWords, currentWordIndex, currentInput]);

  // Finalize test and calculate stats
  const finishTest = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(true);

    const effectiveDuration = Math.max(1, mode === 'time' ? timeConfig : timeElapsed);
    const minutes = effectiveDuration / 60;

    let correctChars = 0;
    let incorrectChars = 0;
    let extraChars = 0;
    let missedChars = 0;
    let totalTyped = 0;
    const missedWords: string[] = [];

    // Analyze completed words
    wordHistory.forEach((typed, idx) => {
      const target = targetWords[idx] || '';
      let wordHasError = false;
      totalTyped += typed.length + 1;

      for (let c = 0; c < typed.length; c++) {
        if (c < target.length) {
          if (typed[c] === target[c]) {
            correctChars++;
          } else {
            incorrectChars++;
            wordHasError = true;
          }
        } else {
          extraChars++;
          wordHasError = true;
        }
      }

      if (typed.length < target.length) {
        missedChars += (target.length - typed.length);
        wordHasError = true;
      }

      correctChars++;

      if (wordHasError) {
        missedWords.push(target);
      }
    });

    // Check last word if in progress
    if (currentInput.length > 0) {
      const currentTarget = targetWords[currentWordIndex] || '';
      let wordHasError = false;
      totalTyped += currentInput.length;

      for (let c = 0; c < currentInput.length; c++) {
        if (c < currentTarget.length) {
          if (currentInput[c] === currentTarget[c]) {
            correctChars++;
          } else {
            incorrectChars++;
            wordHasError = true;
          }
        } else {
          extraChars++;
          wordHasError = true;
        }
      }
      if (currentInput.length < currentTarget.length) {
        missedChars += (currentTarget.length - currentInput.length);
        wordHasError = true;
      }
      if (wordHasError) {
        missedWords.push(currentTarget);
      }
    }

    const finalWpm = Math.max(0, Math.round((correctChars / 5) / minutes));
    const finalRaw = Math.max(0, Math.round((totalTyped / 5) / minutes));
    const totalConsidered = correctChars + incorrectChars + extraChars;
    const finalAcc = totalConsidered > 0 ? Math.max(0, Math.min(100, Math.round((correctChars / totalConsidered) * 100))) : 100;

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
      mistakes: incorrectChars + extraChars,
      correctChars,
      characters: {
        correct: correctChars,
        incorrect: incorrectChars,
        extra: extraChars,
        missed: missedChars
      },
      chartTimeline: timeline.length > 0 ? timeline : [
        { second: effectiveDuration, wpm: finalWpm, rawWpm: finalRaw, errors: incorrectChars, accuracy: finalAcc, burst: finalWpm }
      ],
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

  // Main 1-Second Timer for real-time Recharts line graph progression
  useEffect(() => {
    if (isRunning && !isFinished) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeElapsed(prev => {
          const nextSec = prev + 1;

          const currentStats = computeLiveStats(nextSec);
          setLiveWpm(currentStats.wpm);
          setLiveRawWpm(currentStats.rawWpm);
          setLiveAcc(currentStats.accuracy);

          // Append real-time data point
          setTimeline(currTimeline => [
            ...currTimeline,
            {
              second: nextSec,
              wpm: currentStats.wpm,
              rawWpm: currentStats.rawWpm,
              errors: currentStats.errors,
              accuracy: currentStats.accuracy,
              burst: recentKeyCount * 12
            }
          ]);
          setRecentKeyCount(0);

          if (mode === 'time' && nextSec >= timeConfig) {
            finishTest();
            return timeConfig;
          }
          return nextSec;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning, isFinished, mode, timeConfig, computeLiveStats, finishTest, recentKeyCount]);

  // Submit current word (shared between physical spacebar and mobile soft space)
  const submitCurrentWord = useCallback((inputWord: string) => {
    if (inputWord.trim().length === 0) return;

    soundService.playKey(false, true);

    const newHistory = [...wordHistory, inputWord];
    setWordHistory(newHistory);
    setCurrentInput('');
    const nextWordIdx = currentWordIndex + 1;
    setCurrentWordIndex(nextWordIdx);

    if ((mode === 'words' || mode === 'quote') && nextWordIdx >= targetWords.length) {
      finishTest();
    }
  }, [wordHistory, currentWordIndex, mode, targetWords.length, finishTest]);

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
      if (currentInput.length === 0 && currentWordIndex > 0) {
        e.preventDefault();
        const prevIdx = currentWordIndex - 1;
        const prevTyped = wordHistory[prevIdx] || '';
        const prevTarget = targetWords[prevIdx] || '';

        if (prevTyped !== prevTarget) {
          setCurrentInput(prevTyped);
          setCurrentWordIndex(prevIdx);
          setWordHistory(wordHistory.slice(0, prevIdx));
        }
      }
    }
  };

  // Handle Input Changes (Crucial for Mobile & Tablet On-Screen Virtual Keyboards!)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinished) return;

    let val = e.target.value;

    // Mobile / Tablet soft-keyboard support:
    // Many mobile keyboards (Gboard, iOS, Samsung) send a space inside `onChange` rather than `onKeyDown`.
    if (val.endsWith(' ')) {
      const trimmed = val.slice(0, -1);
      submitCurrentWord(trimmed || currentInput);
      return;
    }

    if (!isRunning && val.length > 0) {
      setIsRunning(true);
      setStartTime(Date.now());
      setTimeline([{ second: 0, wpm: 0, rawWpm: 0, errors: 0, accuracy: 100, burst: 0 }]);
    }

    const targetWord = targetWords[currentWordIndex] || '';
    const charIndex = val.length - 1;
    let isError = false;
    if (charIndex >= 0) {
      if (charIndex < targetWord.length) {
        isError = val[charIndex] !== targetWord[charIndex];
      } else {
        isError = true;
      }
      soundService.playKey(isError, false);
      setRecentKeyCount(prev => prev + 1);
    }

    setCurrentInput(val);

    if ((mode === 'words' || mode === 'quote') && currentWordIndex === targetWords.length - 1) {
      if (val.length === targetWord.length) {
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

      const wordChars = word.split('');
      const typedChars = typedForThisWord.split('');

      const extraCharsCount = Math.max(0, typedChars.length - wordChars.length);
      const extraCharsList = typedChars.slice(wordChars.length);

      return (
        <div
          key={`word-${wordIdx}`}
          ref={isCurrentWord ? activeWordRef : null}
          className="typing-word"
        >
          {wordChars.map((targetChar, charIdx) => {
            const hasTyped = charIdx < typedChars.length;
            const isCharCorrect = hasTyped && typedChars[charIdx] === targetChar;
            const isCurrentChar = isCurrentWord && charIdx === typedChars.length;

            let charClass = "char-default";
            if (hasTyped) {
              charClass = isCharCorrect ? "char-correct" : "char-incorrect";
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
  }, [targetWords, currentWordIndex, wordHistory, currentInput, caretStyle]);

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
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight" style={{ color: activeTheme.primary }}>
            {isRunning ? (
              mode === 'time' ? Math.max(0, timeConfig - timeElapsed) : `${timeElapsed}s`
            ) : (
              <span className="opacity-0">0</span>
            )}
          </div>

          {isRunning && (
            <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm animate-fade-in">
              {showLiveWpm && (
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="text-brand-text text-[11px] sm:text-xs">wpm:</span>
                  <span className="text-brand-active font-bold text-sm sm:text-base">{liveWpm}</span>
                </div>
              )}
              {showLiveAcc && (
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-brand-text" />
                  <span className="text-brand-text text-[11px] sm:text-xs">acc:</span>
                  <span className="text-brand-active font-bold text-sm sm:text-base">{liveAcc}%</span>
                </div>
              )}
            </div>
          )}
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
              <span className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight" style={{ color: activeTheme.primary }}>
                {stats.wpm}
              </span>
              <span className="text-[10px] sm:text-xs text-brand-text mt-0.5 sm:mt-1">raw: {stats.rawWpm}</span>
            </div>

            <div className="flex flex-col items-start pl-1 sm:pl-2">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-brand-text font-semibold">acc</span>
              <span className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight" style={{ color: activeTheme.active }}>
                {stats.accuracy}%
              </span>
              <span className="text-[10px] sm:text-xs text-brand-text mt-0.5 sm:mt-1">
                {stats.characters ? `${stats.characters.correct}/${stats.characters.incorrect}/${stats.characters.extra}/${stats.characters.missed}` : `${stats.mistakes} mistakes`}
              </span>
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

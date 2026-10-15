import { TestResult, TestConfig, ThemeId } from '../types';
import { THEMES } from '../constants';

const RESULTS_KEY = 'typeracer_results_v3';
const CONFIG_KEY = 'typeracer_config_v3';

export const DEFAULT_CONFIG: TestConfig = {
  mode: 'time',
  timeDuration: 30,
  wordCount: 25,
  quoteLength: 'medium',
  includePunctuation: false,
  includeNumbers: false,
  showLiveWpm: true,
  showLiveAcc: true,
  showLiveGraph: true,
  textViewMode: 'full',
  caretStyle: 'line',
  soundTheme: 'clicky',
  theme: 'velocity-amber'
};

export const storageService = {
  saveResult: (result: Omit<TestResult, 'id'>): TestResult => {
    const results: TestResult[] = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    const newResult: TestResult = {
      ...result,
      id: crypto.randomUUID(),
    };
    results.unshift(newResult);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results.slice(0, 100)));
    return newResult;
  },

  getResults: (): TestResult[] => {
    const results = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    return results.sort((a: TestResult, b: TestResult) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  clearResults: (): void => {
    localStorage.removeItem(RESULTS_KEY);
  },

  getConfig: (): TestConfig => {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const parsed: TestConfig = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
        // Validate theme exists in dark theme registry
        if (!THEMES[parsed.theme as ThemeId]) {
          parsed.theme = 'velocity-amber';
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_CONFIG;
  },

  saveConfig: (config: Partial<TestConfig>): TestConfig => {
    try {
      const current = storageService.getConfig();
      const updated = { ...current, ...config };
      if (!THEMES[updated.theme as ThemeId]) {
        updated.theme = 'velocity-amber';
      }
      localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return DEFAULT_CONFIG;
    }
  }
};

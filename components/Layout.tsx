import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Palette,
  Volume2,
  VolumeX,
  Check,
  X
} from 'lucide-react';
import { THEMES } from '../constants';
import { ThemeId, SoundTheme } from '../types';
import { storageService } from '../services/storageService';
import { soundService } from '../services/soundService';
import { TRLogo } from './TRLogo';

export const Layout: React.FC = () => {
  const [config, setConfig] = useState(() => storageService.getConfig());
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Apply theme colors to CSS variables and body
  useEffect(() => {
    const themeDef = THEMES[config.theme] || THEMES['velocity-amber'];
    document.documentElement.style.setProperty('--bg-color', themeDef.bg);
    document.documentElement.style.setProperty('--subtle-color', themeDef.subtle);
    document.documentElement.style.setProperty('--text-color', themeDef.text);
    document.documentElement.style.setProperty('--primary-color', themeDef.primary);
    document.documentElement.style.setProperty('--active-color', themeDef.active);
    document.documentElement.style.setProperty('--error-color', themeDef.error);
    document.body.style.backgroundColor = themeDef.bg;
    document.body.style.color = themeDef.text;
    // Dynamically update favicon with identical outline-free 'tr' logo in active theme primary color
    const favicon = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (favicon) {
      const pColor = encodeURIComponent(themeDef.primary);
      favicon.href = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 28'%3E%3Cpath d='M 11 5 V 18.5 C 11 20.6 12.4 22 14.5 22 H 16' stroke='${pColor}' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='6.5' y1='11' x2='15.5' y2='11' stroke='${pColor}' stroke-width='2.8' stroke-linecap='round'/%3E%3Cpath d='M 20.5 11 V 22' stroke='${pColor}' stroke-width='2.8' stroke-linecap='round'/%3E%3Cpath d='M 20.5 14.5 C 21.8 11.8 24.2 11 27 11.5' stroke='${pColor}' stroke-width='2.8' stroke-linecap='round'/%3E%3C/svg%3E`;
    }
  }, [config.theme]);

  const activeTheme = THEMES[config.theme] || THEMES['velocity-amber'];

  const handleSelectTheme = (themeId: ThemeId) => {
    const updated = storageService.saveConfig({ theme: themeId });
    setConfig(updated);
    setShowThemeModal(false);
  };

  const handleCycleSound = () => {
    const sounds: SoundTheme[] = ['clicky', 'thock', 'tactile', 'typewriter', 'off'];
    const nextIdx = (sounds.indexOf(config.soundTheme) + 1) % sounds.length;
    const nextSound = sounds[nextIdx];
    soundService.setTheme(nextSound);
    const updated = storageService.saveConfig({ soundTheme: nextSound });
    setConfig(updated);
  };

  return (
    <div className="min-h-screen flex flex-col font-mono text-sm selection:bg-brand-primary selection:text-black antialiased">
      {/* Top Header - Fully responsive across Mobile, Tablet, and Desktop */}
      <header className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-5 flex items-center justify-between gap-2 border-b border-white/5 sm:border-transparent">
        {/* Just 'tr' in logo, removed other text */}
        <a
          href="#/"
          onClick={(e) => {
            if (window.location.hash === '#/' || window.location.hash === '') {
              // Trigger quick restart if already on home
              const restartBtn = document.querySelector<HTMLButtonElement>('button[title*="Restart"], button[aria-label*="restart"]');
              if (restartBtn) {
                e.preventDefault();
                restartBtn.click();
              }
            }
          }}
          className="flex items-center select-none hover:opacity-85 active:scale-95 transition-all focus:outline-none"
          title="tr"
          aria-label="tr logo"
        >
          <TRLogo className="h-8 sm:h-9 w-auto text-[var(--primary-color)]" />
        </a>

        {/* Right Tools (Theme Picker, Sound Theme) - Light mode removed */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Palette Modal Button */}
          <button
            onClick={() => setShowThemeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/25 hover:bg-black/40 border border-white/10 text-xs transition-colors font-medium active:scale-95 shadow-sm"
            style={{ color: 'var(--active-color)' }}
            title="Choose Dark Themes"
            aria-label="Theme Picker"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: 'var(--primary-color)' }} />
            <span>{activeTheme.name}</span>
          </button>

          {/* Keyboard Sound Toggle */}
          <button
            onClick={handleCycleSound}
            className="p-2 rounded-xl bg-black/25 hover:bg-black/40 border border-white/10 text-brand-text hover:text-brand-active transition-colors active:scale-95"
            title={`Keyboard Sound: ${config.soundTheme}`}
            aria-label="Toggle Sound"
          >
            {config.soundTheme === 'off' ? (
              <VolumeX className="w-4 h-4 text-brand-text" />
            ) : (
              <Volume2 className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-3 sm:px-6 py-2 sm:py-4">
        <Outlet />
      </main>

      {/* Responsive Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-brand-text border-t border-white/10 mt-auto gap-2">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-center">
          <span className="font-bold flex items-center gap-1" style={{ color: 'var(--primary-color)' }}>
            TypeRacer
          </span>
          <span className="opacity-30">•</span>
          <span>Theme: <span style={{ color: 'var(--active-color)' }} className="font-semibold">{activeTheme.name}</span></span>
          <span className="opacity-30">•</span>
          <span>Sound: <span style={{ color: 'var(--active-color)' }} className="font-semibold">{config.soundTheme}</span></span>
        </div>

        <div className="text-xs text-brand-text text-center">
          Real-time WPM • Dark Performance Engine
        </div>
      </footer>

      {/* Dark Theme Picker Modal (Light themes removed) */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            className="rounded-2xl border p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 bg-[#181920] border-white/15 text-[#f8fafc]"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5" style={{ color: activeTheme.primary }} />
                <h3 className="text-base sm:text-lg font-bold text-white">Select Dark Theme</h3>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-all text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Curated Dark Themes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.values(THEMES).map((th) => {
                const isSelected = config.theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => handleSelectTheme(th.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                      isSelected
                        ? 'border-2 shadow-lg'
                        : 'border-white/10 hover:border-white/25 bg-black/40 hover:bg-black/60'
                    }`}
                    style={{
                      borderColor: isSelected ? th.primary : undefined,
                      backgroundColor: isSelected ? `${th.primary}20` : undefined
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white tracking-wide">{th.name}</span>
                      {isSelected && (
                        <Check className="w-4 h-4" style={{ color: th.primary }} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: th.bg }} title="Background" />
                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: th.primary }} title="Primary Accent" />
                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: th.active }} title="Active Text" />
                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: th.text }} title="Muted Text" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

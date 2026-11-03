import React, { useState } from 'react';

interface ChristmasThemeDecorationsProps {
  greetingText?: string;
  showBanner?: boolean;
  soundEnabled?: boolean;
}

// Gentle Web Audio API Holiday Jingle Synth (No external audio file dependencies)
export function playChristmasJingle() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Notes for "Jingle Bells" opening phrase
    const notes = [
      { f: 659.25, d: 0.22, delay: 0 },    // E5
      { f: 659.25, d: 0.22, delay: 0.25 }, // E5
      { f: 659.25, d: 0.44, delay: 0.50 }, // E5 (long)
      { f: 659.25, d: 0.22, delay: 1.00 }, // E5
      { f: 659.25, d: 0.22, delay: 1.25 }, // E5
      { f: 659.25, d: 0.44, delay: 1.50 }, // E5 (long)
      { f: 659.25, d: 0.22, delay: 2.00 }, // E5
      { f: 783.99, d: 0.22, delay: 2.25 }, // G5
      { f: 523.25, d: 0.28, delay: 2.50 }, // C5
      { f: 587.33, d: 0.18, delay: 2.80 }, // D5
      { f: 659.25, d: 0.65, delay: 3.00 }, // E5 (finale)
    ];

    notes.forEach(({ f, d, delay }) => {
      const startTime = ctx.currentTime + delay;
      // Main chime oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sleigh bell shimmer overtone oscillator
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(f * 2, startTime);

      // Gentle bell envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      overtoneGain.gain.setValueAtTime(0, startTime);
      overtoneGain.gain.linearRampToValueAtTime(0.05, startTime + 0.02);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, startTime + d * 0.7);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(ctx.destination);
      overtoneGain.connect(ctx.destination);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + d);
      overtone.stop(startTime + d);
    });
  } catch (err) {
    console.warn('[Audio] Holiday jingle playback notice:', err);
  }
}

export const ChristmasThemeDecorations: React.FC<ChristmasThemeDecorationsProps> = ({
  greetingText = '🎄 Merry Christmas & Happy Mining Season! 🎅 10X Turbo Hashrate & Holiday Mining Bonanza Active 🎁',
  showBanner = true,
  soundEnabled = true,
}) => {
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  const handlePlaySound = () => {
    setIsPlayingMusic(true);
    playChristmasJingle();
    setTimeout(() => setIsPlayingMusic(false), 3800);
  };

  return (
    <>
      {/* Top Ambient Frosted Snow Icicles / Glistening Header Trim */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500/80 via-emerald-400 to-[#00F0FF] shadow-[0_0_15px_rgba(16,185,129,0.7)] z-50 pointer-events-none" />

      {/* Holiday Festive Banner for User Viewport */}
      {showBanner && !isBannerDismissed && (
        <div className="relative z-40 bg-gradient-to-r from-[#990000] via-[#103b22] to-[#0d2a45] border-b border-[#D4AF37]/50 text-white shadow-[0_4px_25px_rgba(212,175,55,0.25)] select-none">
          <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-headline">
            {/* Left Holiday Sparkle Tag */}
            <div className="flex items-center gap-2 overflow-hidden truncate">
              <span className="text-lg animate-bounce select-none">🎅</span>
              <span className="font-extrabold tracking-wide text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] truncate">
                {greetingText}
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#D4AF37]/25 text-[#ffe088] border border-[#D4AF37]/50 shrink-0 font-bold">
                <span>⭐ HOLIDAY SPECIAL</span>
              </span>
            </div>

            {/* Right Quick Controls: Jingle Bells Sound & Close */}
            <div className="flex items-center gap-2 shrink-0">
              {soundEnabled && (
                <button
                  onClick={handlePlaySound}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    isPlayingMusic
                      ? 'bg-[#D4AF37] text-[#0A0F1D] animate-pulse scale-105 shadow-[0_0_15px_rgba(212,175,55,0.7)]'
                      : 'bg-black/30 hover:bg-black/50 text-[#ffe088] border border-[#D4AF37]/40 hover:scale-102'
                  }`}
                  title="Play Christmas Sleigh Bells & Holiday Chime"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isPlayingMusic ? 'music_note' : 'notifications_active'}
                  </span>
                  <span className="hidden sm:inline">
                    {isPlayingMusic ? 'Playing Chime...' : 'Jingle Chime'}
                  </span>
                </button>
              )}

              <button
                onClick={() => setIsBannerDismissed(true)}
                className="w-6 h-6 rounded-lg bg-black/25 hover:bg-black/45 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Dismiss Holiday Banner"
                aria-label="Dismiss Holiday Banner"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { SPIKE_LOGO_URL } from '../data/mockData';

export const BlockchainBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Subtle Atmospheric Light Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00F0FF]/[0.035] rounded-full blur-[140px]" />
      <div className="absolute bottom-1/3 right-10 w-[700px] h-[700px] bg-[#D4AF37]/[0.03] rounded-full blur-[160px]" />
      <div className="absolute -bottom-20 left-10 w-[500px] h-[500px] bg-[#00F0FF]/[0.025] rounded-full blur-[130px]" />

      {/* SVG Blockchain Nodes & Connecting Geometric Lattice Mesh */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.22]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cyberLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.05" />
          </linearGradient>
          <pattern id="dotGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#1c2b3b" opacity="0.6" />
          </pattern>
        </defs>

        {/* Global Micro-grid */}
        <rect width="100%" height="100%" fill="url(#dotGrid)" />

        {/* Constellation Nodes & Interconnecting Hash Links */}
        <g stroke="url(#cyberLineGrad)" strokeWidth="1" fill="none">
          {/* Constellation Cluster A (Top Left) */}
          <line x1="8%" y1="14%" x2="18%" y2="22%" />
          <line x1="18%" y1="22%" x2="12%" y2="35%" />
          <line x1="18%" y1="22%" x2="26%" y2="16%" />
          <line x1="26%" y1="16%" x2="35%" y2="28%" />
          <line x1="12%" y1="35%" x2="22%" y2="44%" />
          <line x1="22%" y1="44%" x2="35%" y2="28%" />

          {/* Constellation Cluster B (Center Right) */}
          <line x1="68%" y1="18%" x2="82%" y2="12%" />
          <line x1="82%" y1="12%" x2="92%" y2="26%" />
          <line x1="68%" y1="18%" x2="74%" y2="34%" />
          <line x1="74%" y1="34%" x2="88%" y2="40%" />
          <line x1="92%" y1="26%" x2="88%" y2="40%" />
          <line x1="74%" y1="34%" x2="62%" y2="48%" />

          {/* Constellation Cluster C (Bottom Left/Center) */}
          <line x1="15%" y1="65%" x2="28%" y2="72%" />
          <line x1="28%" y1="72%" x2="42%" y2="68%" />
          <line x1="28%" y1="72%" x2="22%" y2="86%" />
          <line x1="42%" y1="68%" x2="52%" y2="82%" />
          <line x1="52%" y1="82%" x2="68%" y2="76%" />
          <line x1="68%" y1="76%" x2="84%" y2="85%" />
        </g>

        {/* Glowing Network Nodes */}
        <g>
          {/* Node 1 */}
          <circle cx="8%" cy="14%" r="3" fill="#00F0FF" opacity="0.6" />
          <circle cx="8%" cy="14%" r="6" stroke="#00F0FF" strokeWidth="0.8" opacity="0.3" />

          {/* Node 2 */}
          <circle cx="18%" cy="22%" r="4" fill="#D4AF37" opacity="0.7" />
          <circle cx="18%" cy="22%" r="8" stroke="#D4AF37" strokeWidth="0.8" opacity="0.35" />

          {/* Node 3 */}
          <circle cx="26%" cy="16%" r="2.5" fill="#00F0FF" opacity="0.5" />

          {/* Node 4 */}
          <circle cx="35%" cy="28%" r="3.5" fill="#00F0FF" opacity="0.7" />

          {/* Node 5 */}
          <circle cx="12%" cy="35%" r="3" fill="#D4AF37" opacity="0.6" />

          {/* Node 6 */}
          <circle cx="22%" cy="44%" r="2.5" fill="#00F0FF" opacity="0.5" />

          {/* Node 7 */}
          <circle cx="82%" cy="12%" r="3.5" fill="#00F0FF" opacity="0.6" />

          {/* Node 8 */}
          <circle cx="74%" cy="34%" r="4" fill="#D4AF37" opacity="0.7" />
          <circle cx="74%" cy="34%" r="9" stroke="#D4AF37" strokeWidth="0.8" opacity="0.3" />

          {/* Node 9 */}
          <circle cx="92%" cy="26%" r="3" fill="#00F0FF" opacity="0.5" />

          {/* Node 10 */}
          <circle cx="88%" cy="40%" r="3" fill="#00F0FF" opacity="0.6" />

          {/* Node 11 */}
          <circle cx="62%" cy="48%" r="2.5" fill="#D4AF37" opacity="0.5" />

          {/* Node 12 */}
          <circle cx="28%" cy="72%" r="3.5" fill="#00F0FF" opacity="0.7" />
          <circle cx="28%" cy="72%" r="8" stroke="#00F0FF" strokeWidth="0.8" opacity="0.3" />

          {/* Node 13 */}
          <circle cx="42%" cy="68%" r="2.5" fill="#D4AF37" opacity="0.5" />

          {/* Node 14 */}
          <circle cx="52%" cy="82%" r="3.5" fill="#00F0FF" opacity="0.6" />

          {/* Node 15 */}
          <circle cx="68%" cy="76%" r="4" fill="#D4AF37" opacity="0.7" />
          <circle cx="68%" cy="76%" r="9" stroke="#D4AF37" strokeWidth="0.8" opacity="0.35" />

          {/* Node 16 */}
          <circle cx="84%" cy="85%" r="3" fill="#00F0FF" opacity="0.6" />
        </g>
      </svg>

      {/* Floating Faint SPIKE Logo Emblems Spiking in the Background */}
      <div className="absolute top-[18%] left-[6%] w-16 h-16 opacity-[0.06] animate-float-slow">
        <img src={SPIKE_LOGO_URL} alt="" className="w-full h-full object-contain filter grayscale invert" />
      </div>

      <div className="absolute top-[38%] right-[8%] w-20 h-20 opacity-[0.05] animate-float-delayed">
        <img src={SPIKE_LOGO_URL} alt="" className="w-full h-full object-contain filter grayscale invert" />
      </div>

      <div className="absolute bottom-[22%] left-[12%] w-14 h-14 opacity-[0.05] animate-float-reverse">
        <img src={SPIKE_LOGO_URL} alt="" className="w-full h-full object-contain filter grayscale invert" />
      </div>

      <div className="absolute bottom-[10%] right-[18%] w-16 h-16 opacity-[0.06] animate-float-slow">
        <img src={SPIKE_LOGO_URL} alt="" className="w-full h-full object-contain filter grayscale invert" />
      </div>

      {/* Subtle Micro-Sparks Twinkling */}
      <span className="absolute top-[28%] left-[24%] text-[#00F0FF] text-[10px] opacity-40 animate-spark-twinkle">
        ✦
      </span>
      <span className="absolute top-[52%] right-[22%] text-[#D4AF37] text-[12px] opacity-40 animate-spark-fast">
        ✦
      </span>
      <span className="absolute bottom-[35%] right-[32%] text-[#00F0FF] text-[9px] opacity-30 animate-spark-delayed">
        ✧
      </span>
      <span className="absolute bottom-[18%] left-[38%] text-[#D4AF37] text-[11px] opacity-40 animate-spark-twinkle">
        ✦
      </span>
    </div>
  );
};

import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-11 w-auto" }: LogoProps) {
  return (
    <div className="flex items-center gap-3.5 select-none cursor-pointer">
      <svg
        viewBox="0 0 500 350"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          {/* Degradado azul idéntico al logo original */}
          <linearGradient id="arl-blue-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1B3B6F" />
            <stop offset="60%" stopColor="#2C5282" />
            <stop offset="100%" stopColor="#3182CE" />
          </linearGradient>

          {/* Sombra suave interna para dar profundidad si está sobre fondos oscuros */}
          <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25"/>
          </filter>
        </defs>

        {/* 1. La letra 'R' superior (Gris Metálico / Slate) */}
        <path
          d="M 140 25 
             H 300 
             C 365 25, 395 65, 395 125 
             C 395 185, 360 220, 295 220 
             H 230 
             L 345 325 
             H 260 
             L 140 215 
             V 325 
             H 140 
             Z 
             M 230 85 
             V 160 
             H 285 
             C 320 160, 332 145, 332 122 
             C 332 100, 320 85, 285 85 
             Z"
          fill="#8A99AD"
        />

        {/* 2. La estructura combinada 'A + L' (Azul con degradado) */}
        <path
          d="M 25 325 
             L 160 140 
             L 285 325 
             H 445 
             V 380 
             H 260 
             L 160 235 
             L 95 325 
             Z"
          fill="url(#arl-blue-gradient)"
          transform="translate(0, -25)"
        />

        {/* 3. Las 4 ventanas de la casa (Icono central) */}
        <g fill="url(#arl-blue-gradient)" transform="translate(0, -25)">
          <rect x="135" y="245" width="22" height="22" rx="2" />
          <rect x="163" y="245" width="22" height="22" rx="2" />
          <rect x="135" y="273" width="22" height="22" rx="2" />
          <rect x="163" y="273" width="22" height="22" rx="2" />
        </g>
      </svg>

      {/* Tipografía alineada con la identidad visual */}
      <div className="flex flex-col leading-none">
        <span className="font-extrabold tracking-wider text-white text-lg uppercase">
          AROSAS REALTY
        </span>
        <span className="text-[11px] tracking-[0.22em] text-[#C5A059] font-bold uppercase mt-1">
          REAL ESTATE BROKERS
        </span>
      </div>
    </div>
  );
}
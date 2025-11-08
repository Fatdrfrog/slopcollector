import Image from 'next/image';

const raccoonPlaceholderSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 360">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <radialGradient id="highlight" cx="50%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#f8fafc" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#f8fafc" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="400" height="360" rx="32" fill="url(#bg)" />
    <ellipse cx="200" cy="260" rx="150" ry="60" fill="#0f172a" opacity="0.45" />
    <g transform="translate(100 70)">
      <ellipse cx="100" cy="120" rx="95" ry="85" fill="#1f2937" />
      <ellipse cx="100" cy="105" rx="105" ry="95" fill="#111827" />
      <ellipse cx="60" cy="110" rx="36" ry="30" fill="#f8fafc" />
      <ellipse cx="140" cy="110" rx="36" ry="30" fill="#f8fafc" />
      <circle cx="58" cy="113" r="16" fill="#0f172a" />
      <circle cx="142" cy="113" r="16" fill="#0f172a" />
      <path d="M40 60 C70 40 130 40 160 60 C140 35 60 35 40 60 Z" fill="#1f2937" />
      <path d="M65 150 C90 170 110 170 135 150 C125 185 75 185 65 150 Z" fill="#f8fafc" />
      <circle cx="100" cy="148" r="12" fill="#0f172a" />
      <ellipse cx="35" cy="150" rx="32" ry="22" fill="#1f2937" />
      <ellipse cx="165" cy="150" rx="32" ry="22" fill="#1f2937" />
    </g>
    <circle cx="200" cy="120" r="130" fill="url(#highlight)" />
    <text x="200" y="335" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="20">
      Raccoon placeholder
    </text>
  </svg>
`;

const raccoonImage = `data:image/svg+xml;utf8,${encodeURIComponent(
  raccoonPlaceholderSvg,
)}`;

export function TableMascot() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Raccoon on the right side */}
      <div className="absolute right-[-50px] top-1/2 transform -translate-y-1/2 scale-[1.8] opacity-90">
        <Image
          src={raccoonImage}
          alt="Raccoon mascot"
          width={400}
          height={360}
          className="w-[400px] h-auto"
          style={{
            filter: 'drop-shadow(0 10px 40px rgba(0, 0, 0, 0.15))',
          }}
        />
        
        {/* Supabase table being eaten */}
        <div className="absolute top-[120px] left-[100px] animate-float-slow">
          <div className="bg-linear-to-br from-emerald-400 to-teal-500 rounded-lg shadow-2xl p-3 border-2 border-emerald-300 transform rotate-12">
            {/* Table header */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-emerald-300">
              <div className="w-3 h-3 rounded-full bg-emerald-600" />
              <span className="text-white text-xs font-mono">users</span>
            </div>
            
            {/* Table rows with data */}
            <div className="space-y-1.5">
              <div className="flex gap-2 text-[10px] font-mono text-emerald-900 bg-white/40 rounded px-2 py-1">
                <span className="opacity-70">id:</span>
                <span>1234</span>
              </div>
              <div className="flex gap-2 text-[10px] font-mono text-emerald-900 bg-white/40 rounded px-2 py-1">
                <span className="opacity-70">email:</span>
                <span>joe@...</span>
              </div>
              <div className="flex gap-2 text-[10px] font-mono text-emerald-900 bg-white/40 rounded px-2 py-1 opacity-60">
                <span className="opacity-70">name:</span>
                <span>John</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data crumbs flying around */}
        <div className="absolute top-[80px] left-[150px] animate-float-fast">
          <div className="text-xs font-mono text-emerald-600 bg-emerald-100 px-2 py-1 rounded shadow-lg border border-emerald-300">
            SELECT *
          </div>
        </div>
        
        <div className="absolute top-[200px] left-[80px] animate-float-slow" style={{ animationDelay: '0.5s' }}>
          <div className="text-xs font-mono text-teal-600 bg-teal-100 px-2 py-1 rounded shadow-lg border border-teal-300">
            WHERE...
          </div>
        </div>

        <div className="absolute top-[160px] left-[180px] animate-float-fast" style={{ animationDelay: '1s' }}>
          <div className="text-xs font-mono text-cyan-600 bg-cyan-100 px-2 py-1 rounded shadow-lg border border-cyan-300">
            JOIN
          </div>
        </div>
      </div>

      {/* Floating particles - more colorful */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => {
          const colors = [
            'bg-pink-400',
            'bg-orange-400', 
            'bg-yellow-400',
            'bg-lime-400',
            'bg-emerald-400',
            'bg-cyan-400',
            'bg-blue-400',
            'bg-purple-400',
            'bg-fuchsia-400',
          ];
          const color = colors[i % colors.length];
          
          return (
            <div
              key={i}
              className={`absolute w-1.5 h-1.5 ${color} rounded-full opacity-30`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) translateX(10px) rotate(5deg);
          }
        }
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0) rotate(12deg);
          }
          50% {
            transform: translateY(-15px) rotate(8deg);
          }
        }
        @keyframes float-fast {
          0%, 100% {
            transform: translateY(0) rotate(-5deg);
          }
          50% {
            transform: translateY(-25px) rotate(5deg);
          }
        }
        .animate-float-slow {
          animation: float-slow 4s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

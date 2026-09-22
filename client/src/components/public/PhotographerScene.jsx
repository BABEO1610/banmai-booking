export default function PhotographerScene({ shot }) {
  return <svg className="photographer-scene" viewBox="0 0 760 660" role="img" aria-labelledby="studio-scene-title">
    <title id="studio-scene-title">Minh họa photographer đang chụp người mẫu trong Studio</title>
    <defs>
      <linearGradient id="studio-backdrop" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fce6f0" /><stop offset="1" stopColor="#f4b4d0" /></linearGradient>
      <linearGradient id="model-dress" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d975a5" /><stop offset="1" stopColor="#f1bdd5" /></linearGradient>
      <radialGradient id="studio-floor"><stop stopColor="#ddc7d3" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
    </defs>
    <path d="M385 110c0-57 47-104 104-104h104c63 0 115 52 115 115v450H385Z" fill="url(#studio-backdrop)" />
    <path d="M386 510c0 47-57 62-114 62H46h667V510" fill="#fbedf4" />
    <ellipse cx="437" cy="572" rx="302" ry="36" fill="url(#studio-floor)" />
    <path d="M60 573h647" stroke="#dbcad3" strokeWidth="1.5" />
    <g className="studio-softbox" stroke="#25242b" strokeWidth="3" strokeLinejoin="round">
      <path d="M109 253v299m0-44-33 63m33-63 34 63" fill="none" />
      <path d="m93 116 104 16 22 121-119 9-46-63Z" fill="#22222a" />
      <path d="m107 129 82 15 16 96-99 9-37-50Z" fill="#fff" stroke="#e3d3dd" />
      <path d="m139 249 5 32-35 7" fill="none" />
    </g>
    <g className="studio-model">
      <path d="M560 413 548 545l-22 16h38l23-143M597 414l12 133 18 14h-35l-27-145" fill="#e9c0af" />
      <path d="m526 559 37-5 2 17h-43ZM592 554l31 3 12 14h-43Z" fill="#25242b" />
      <path d="M537 246c-21 26-27 88-37 151 15 33 87 45 137 12-16-52-24-132-35-163Z" fill="url(#model-dress)" />
      <path d="m552 274-3 76 36 41" fill="none" stroke="#e9c0af" strokeWidth="17" strokeLinecap="round" />
      <path d="m603 265 22 30 22-69" fill="none" stroke="#e9c0af" strokeWidth="17" strokeLinecap="round" />
      <path d="M563 221v32c10 11 23 10 33 0l-5-35" fill="#e9c0af" />
      <path d="M554 164c-11 15-13 51-3 69 10 18 30 21 46 5 13-13 23-51 12-71-12-22-40-25-55-3" fill="#e9c0af" />
      <path d="M548 185c-7-22 2-41 23-48 36-10 57 17 51 46-3 13-11 25-12 40l-6-45c-17 5-38 0-48-11l-7 33c-12 3-18 25-19 39-17-13-7-35 18-54" fill="#29262e" />
      <path d="m575 211 13 2m-2-27h4" fill="none" stroke="#9c6f67" strokeWidth="2" strokeLinecap="round" />
      <path d="m560 297 17 48-7 65m24-109 4 102" fill="none" stroke="#bb5c8b" strokeOpacity=".45" strokeWidth="2" />
    </g>
    <g className="photographer-legs">
      <path d="m240 344-25 96-25 103 35 8 44-97 29-60 32 61 27 96 35-8-16-113-54-92Z" fill="#282830" />
      <path d="m190 541-16 25c-3 7 6 9 18 8l47-3-14-24ZM356 546l-1 24h61c9-2 11-8 2-13l-29-15" fill="#fff" stroke="#292830" strokeWidth="3" />
      <path d="m273 390-23 76" stroke="#494952" strokeWidth="2" />
    </g>
    <g className="photographer-upper">
      <path d="M243 232c-23 17-31 56-35 116 18 16 69 25 106 1l-3-109c-19-18-46-22-68-8" fill="#19191e" />
      <path d="m278 202-5 29 21 10 14-20-5-25" fill="#d8aa92" />
      <path d="M275 146c-5 11-5 44 6 59 10 14 29 12 39-2l7-18 14-5-10-15-2-19" fill="#e5b89f" />
      <path d="M276 170c-14-5-16-17-12-29 7-23 45-29 60-11 5 6 8 14 7 21l-24-4-11 23-7-10-5 19Z" fill="#25242a" />
      <path d="m306 195 13-2" stroke="#b17e69" strokeWidth="2" strokeLinecap="round" />
      <path d="m238 256 19 53 70-55" fill="none" stroke="#29292f" strokeWidth="30" strokeLinecap="round" />
      <path d="m294 247 40 38 30-68" fill="none" stroke="#232329" strokeWidth="25" strokeLinecap="round" />
      <path d="m326 253 22-31m17-4 5-17" stroke="#e5b89f" strokeWidth="16" strokeLinecap="round" />
      <g className="studio-camera">
        <path d="M318 171h21l7-12h26l7 12h20v54h-81Z" fill="#fff" stroke="#17171b" strokeWidth="3" />
        <rect x="359" y="175" width="55" height="40" rx="7" fill="#27272f" />
        <ellipse cx="411" cy="195" rx="8" ry="20" fill="#17171b" />
        <ellipse cx="413" cy="195" rx="4" ry="13" fill="#5876aa" />
        <path d="M329 184h15m-19 31c-5 31-4 65 9 91" stroke="#34323a" fill="none" strokeWidth="3" />
        <circle cx="342" cy="197" r="5" fill="#f2a9ca" />
      </g>
      <path d="m287 261 5 65" stroke="#44434c" fill="none" strokeWidth="2" />
    </g>
    <g className="studio-floor-details" fill="none" stroke="#ded0da" strokeWidth="1.5"><path d="m432 578 19 15m169-15-17 15M144 583l-15 10" /></g>
    {shot > 0 && <g key={shot} className="shutter-glint" fill="none" stroke="#bd4b83" strokeWidth="3"><circle cx="416" cy="193" r="28" /><path d="M416 150v-15m0 116v-15m43-43h15m-116 0h15" /></g>}
  </svg>
}

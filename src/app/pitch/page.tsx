"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Map, Target, TrendingUp, TrainTrack, Database, Zap, X, Maximize2 } from "lucide-react";

// Exciting, marketing-driven copy
const slides = [
  {
    id: "title",
    title: "CROPINTEL",
    subtitle: "The Ultimate Arbitrage Engine",
    content: "Command the BNSF network from Campbell, MN. A Bloomberg-grade intelligence center built to turn local grain into national gold.",
    icon: <GlobeIcon />,
    gradient: "from-blue-950 via-slate-900 to-black"
  },
  {
    id: "vision",
    title: "Unleash Your Margin",
    subtitle: "Turn Local Grain into National Gold",
    points: [
      "Bypass local bottlenecks and connect directly to the highest-paying premium markets.",
      "Shatter the ceiling of traditional cash bids with dynamic, rail-driven arbitrage.",
      "Unlock the hidden value in every single bushel that moves through your facility."
    ],
    icon: <TrendingUp className="w-16 h-16 md:w-20 md:h-20 text-emerald-400 mb-4 md:mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />,
    gradient: "from-emerald-950 via-slate-900 to-black"
  },
  {
    id: "challenge",
    title: "The Cost of Blind Spots",
    subtitle: "Stop Leaving Money on the Table",
    points: [
      "Local benchmark prices are artificially low. If you're only looking local, you're losing.",
      "Manual freight calculations are too slow for today's hyper-volatile commodity markets.",
      "Without split-second national visibility, your trading floor is flying blind."
    ],
    icon: <Target className="w-16 h-16 md:w-20 md:h-20 text-rose-500 mb-4 md:mb-6 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />,
    gradient: "from-rose-950 via-slate-900 to-black"
  },
  {
    id: "solution",
    title: "Unfair Market Advantage",
    subtitle: "Live Intelligence meets Military-Grade Computation",
    points: [
      "Autonomous scrapers and live USDA integration feed our pricing engine 24/7.",
      "Instantly calculate complex freight logistics, local bids, and national offers.",
      "We hand you guaranteed margin deltas on a silver platter."
    ],
    image: "/screenshots/map.png",
    imageCaption: "Live Action Map Command Center",
    icon: <Map className="w-16 h-16 md:w-20 md:h-20 text-cyan-400 mb-4 md:mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />,
    gradient: "from-cyan-950 via-slate-900 to-black"
  },
  {
    id: "advantage",
    title: "The Campbell Super-Hub",
    subtitle: "Your BNSF Launchpad",
    points: [
      "Secured directly on the massive BNSF rail network.",
      "Effortlessly load and dispatch high-efficiency 110-car shuttle trains.",
      "Unrestricted, direct freight access to Pacific Northwest exporters and elite domestic processors.",
      "Campbell isn't just a physical facility—it's the physical anchor to your digital empire."
    ],
    icon: <TrainTrackIcon className="w-16 h-16 md:w-20 md:h-20 text-amber-500 mb-4 md:mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />,
    gradient: "from-amber-950 via-slate-900 to-black"
  },
  {
    id: "tech",
    title: "Built For The Kill",
    subtitle: "Precision Targeting & Execution",
    points: [
      "Our proprietary 'Hitlist' identifies and ranks the most lucrative rail corridors across the country.",
      "Dynamic, tick-by-tick calculation of BNSF freight per bushel.",
      "Spot the absolute highest-paying buyers before the competition even wakes up."
    ],
    image: "/screenshots/buyers.png",
    imageCaption: "CRM & Buyer Intelligence Hitlist",
    icon: <Database className="w-16 h-16 md:w-20 md:h-20 text-indigo-400 mb-4 md:mb-6 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]" />,
    gradient: "from-indigo-950 via-slate-900 to-black"
  },
  {
    id: "future",
    title: "Deploy & Dominate",
    subtitle: "Operational Readiness: GO",
    points: [
      "The infrastructure is live. The intelligence pipelines are flowing.",
      "Immerse yourself in a state-of-the-art dark mode operations center.",
      "Scale the Campbell facility to unprecedented maximum throughput and explosive profitability."
    ],
    icon: <Zap className="w-16 h-16 md:w-20 md:h-20 text-yellow-400 mb-4 md:mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />,
    gradient: "from-yellow-950 via-slate-900 to-black"
  }
];

function GlobeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="80"
      height="80"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-blue-400 mb-6 drop-shadow-[0_0_20px_rgba(96,165,250,0.6)]"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function TrainTrackIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="80"
      height="80"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 3l-2 18"></path>
      <path d="M20 3l2 18"></path>
      <path d="M5 7h14"></path>
      <path d="M4 12h16"></path>
      <path d="M3 17h18"></path>
    </svg>
  );
}

// Container variants for staggered list animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 120 } }
};

export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalImage) {
        if (e.key === "Escape") setModalImage(null);
        return;
      }
      if (e.key === "ArrowRight" || e.key === " ") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current, modalImage]);

  const nextSlide = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
  };

  const prevSlide = () => {
    if (current > 0) setCurrent(current - 1);
  };

  const slide = slides[current];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${slide.gradient} text-slate-200 font-mono flex flex-col items-center justify-center transition-colors duration-1000 overflow-hidden relative`}>
      
      {/* Dynamic Background Noise */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.05] pointer-events-none" />
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 p-6 md:p-8 flex justify-between items-center z-30 pointer-events-none">
        <div className="flex items-center gap-3 md:gap-4 drop-shadow-xl">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.5)] border border-emerald-300/30">
            <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-black stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-2xl md:text-3xl tracking-tighter text-white leading-none">CROP<span className="text-emerald-400">INTEL</span></span>
            <span className="text-[10px] md:text-xs text-emerald-400/90 font-bold tracking-[0.25em] uppercase mt-1">Maximizing Your Crop</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full min-h-screen max-w-7xl px-6 md:px-12 pt-32 pb-40 md:pt-40 md:pb-48 flex flex-col justify-center">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-center w-full">
          
          {/* Text Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`flex-1 flex flex-col w-full ${slide.image ? 'lg:items-start text-left' : 'items-center text-center'}`}
            >
              {/* Floating icon animation */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                {slide.icon}
              </motion.div>
              
              <motion.h1 
                className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2 md:mb-4 drop-shadow-2xl"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {slide.title}
              </motion.h1>
              
              {slide.subtitle && (
                <motion.h2 
                  className="text-xl sm:text-2xl md:text-3xl text-emerald-400 mb-6 md:mb-8 font-bold tracking-widest uppercase flex flex-wrap items-center justify-center lg:justify-start gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <span className="w-8 md:w-16 h-px bg-emerald-400/50 hidden sm:block" />
                  {slide.subtitle}
                  <span className="w-8 md:w-16 h-px bg-emerald-400/50 hidden sm:block" />
                </motion.h2>
              )}

              {slide.content && (
                <motion.p 
                  className="text-lg sm:text-xl md:text-3xl text-slate-300 max-w-3xl leading-relaxed font-light"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                >
                  {slide.content}
                </motion.p>
              )}

              {slide.points && (
                <motion.ul 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-base sm:text-lg md:text-2xl text-slate-300 space-y-4 md:space-y-6 max-w-3xl text-left border-l-4 border-emerald-500/30 pl-4 md:pl-8 py-2 md:py-4"
                >
                  {slide.points.map((point, idx) => (
                    <motion.li 
                      key={idx}
                      variants={itemVariants}
                      className="flex items-start text-slate-200 group"
                    >
                      <span className="text-emerald-400 mr-4 mt-1.5 md:mt-2 text-xl md:text-2xl group-hover:scale-125 group-hover:text-emerald-300 transition-transform">▹</span>
                      <span className="leading-snug">{point}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Interactive Image Section */}
          <AnimatePresence mode="wait">
            {slide.image && (
              <motion.div
                key={`${slide.id}-img`}
                initial={{ opacity: 0, x: 50, rotateY: -15 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: 50, rotateY: 15 }}
                transition={{ duration: 0.7, type: "spring", bounce: 0.4 }}
                className="flex-1 w-full lg:w-auto mt-8 lg:mt-0 perspective-1000"
              >
                <motion.div 
                  className="relative group cursor-pointer rounded-2xl overflow-hidden border-2 border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900/80 backdrop-blur-xl transform-gpu"
                  whileHover={{ scale: 1.03, rotateY: -5, boxShadow: "0 0 60px rgba(52,211,153,0.3)" }}
                  onClick={() => setModalImage(slide.image!)}
                >
                  {/* Faux Mac Window Header */}
                  <div className="h-10 border-b border-slate-800 bg-black/60 flex items-center px-4 justify-between">
                    <div className="flex gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-rose-500/80" />
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500/80" />
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="flex items-center text-slate-400 text-xs font-sans tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-3 h-3 mr-1" />
                      CLICK TO EXPAND
                    </div>
                  </div>
                  
                  <div className="relative">
                    <img 
                      src={slide.image} 
                      alt={slide.imageCaption}
                      className="w-full h-auto object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300 aspect-video md:aspect-auto md:max-h-[500px]"
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-overlay" />
                  </div>
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 text-center lg:text-left text-emerald-400/90 font-bold tracking-[0.2em] uppercase text-sm md:text-base"
                >
                  {slide.imageCaption}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-black via-black/90 to-transparent z-20 flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-0 backdrop-blur-md">
        
        {/* Progress Text */}
        <div className="w-full sm:flex-1 flex justify-center sm:justify-start text-slate-500 font-bold tracking-widest text-[10px] sm:text-xs md:text-sm order-2 sm:order-1 opacity-60 sm:opacity-100">
          CROPINTEL // {(current + 1).toString().padStart(2, '0')}
        </div>

        {/* Controls */}
        <div className="w-full sm:flex-1 flex justify-center items-center gap-4 md:gap-8 order-1 sm:order-2">
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(30,41,59,0.8)" }}
            whileTap={{ scale: 0.95 }}
            onClick={prevSlide}
            disabled={current === 0}
            className="p-3 md:p-4 rounded-full bg-slate-800/80 text-slate-300 disabled:opacity-20 transition-colors border border-slate-700/50 shadow-lg"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </motion.button>

          <div className="flex gap-2.5 md:gap-3 items-center">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-2 md:h-2.5 rounded-full transition-all duration-500 ${
                  idx === current 
                    ? "w-8 md:w-16 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" 
                    : "w-2 md:w-2.5 bg-slate-700 hover:bg-slate-500"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(30,41,59,0.8)" }}
            whileTap={{ scale: 0.95 }}
            onClick={nextSlide}
            disabled={current === slides.length - 1}
            className="p-3 md:p-4 rounded-full bg-slate-800/80 text-slate-300 disabled:opacity-20 transition-colors border border-slate-700/50 shadow-lg"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </motion.button>
        </div>

        {/* Spacer for perfect flex-centering on desktop */}
        <div className="hidden sm:block sm:flex-1 order-3" />

      </div>

      {/* Full Screen Image Modal */}
      <AnimatePresence>
        {modalImage && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 md:p-12 cursor-zoom-out"
            onClick={() => setModalImage(null)}
          >
            <motion.button
              className="absolute top-6 right-6 p-3 bg-slate-800/50 hover:bg-slate-700 rounded-full text-white backdrop-blur-md transition-colors border border-slate-600 z-50"
              onClick={() => setModalImage(null)}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6 md:w-8 md:h-8" />
            </motion.button>
            <motion.img
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              src={modalImage}
              alt="Expanded view"
              className="w-full max-w-[1600px] h-auto max-h-[90vh] object-contain rounded-xl shadow-[0_0_100px_rgba(0,0,0,1)] border border-slate-800"
              onClick={(e) => e.stopPropagation()} // Prevent close when clicking the image itself
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

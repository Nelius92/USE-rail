"use client";

import React, { MouseEvent } from "react";
import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import {
  Globe, Package, MapPin, Train, ArrowRight,
  Wheat, TrendingUp, Shield, Zap, Users, BarChart3
} from "lucide-react";

// ─── Spotlight Card Component ──────────────────────────────────────────────
function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(255, 255, 255, 0.1)",
  href,
}: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  href: string;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-3xl border border-white/[0.05] bg-black/40 backdrop-blur-md transition-all duration-500 hover:border-white/[0.1] hover:bg-black/60 hover:-translate-y-1 block ${className}`}
      onMouseMove={handleMouseMove}
    >
      {/* Spotlight effect that follows the mouse */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              800px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `,
        }}
      />
      {/* Content wrapper */}
      <div className="relative z-10 p-10 h-full flex flex-col">
        {children}
      </div>
    </Link>
  );
}

// ─── Animation Variants ──────────────────────────────────────────────────
import type { Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", stiffness: 45, damping: 15 }
  },
};

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

// ─── Main Page Component ─────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans">
      
      {/* ─── Immersive Background ─────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-black" />
        
        {/* Infinite Grid Floor */}
        <div className="absolute bottom-0 left-0 right-0 h-[70vh] landing-grid opacity-30" />
        
        {/* Dynamic scanning line */}
        <div className="line-scan-premium" />

        {/* ─── Modern Rail Light Trails ─────────────────────────── */}
        <div className="absolute top-[30%] left-0 right-0 h-[50vh] opacity-60 pointer-events-none" style={{ perspective: '1200px' }}>
          <div className="relative w-full h-full" style={{ transform: 'rotateX(70deg)', transformStyle: 'preserve-3d' }}>
            {/* Track 1 (Cyan) */}
            <div className="absolute top-[20%] left-[-20%] right-[-20%] h-[1px] bg-white/5 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
              <div className="absolute top-[0px] left-0 w-[40vw] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-rail-dash-1 shadow-[0_0_15px_rgba(56,189,248,1)]" />
            </div>
            
            {/* Track 2 (Amber) */}
            <div className="absolute top-[50%] left-[-20%] right-[-20%] h-[1px] bg-white/5 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <div className="absolute top-[0px] left-0 w-[60vw] h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-rail-dash-2 shadow-[0_0_15px_rgba(245,158,11,1)]" />
            </div>
            
            {/* Track 3 (Emerald) */}
            <div className="absolute top-[80%] left-[-20%] right-[-20%] h-[1px] bg-white/5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <div className="absolute top-[0px] left-0 w-[30vw] h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-rail-dash-3 shadow-[0_0_15px_rgba(16,185,129,1)]" />
            </div>
          </div>
        </div>

        {/* Cinematic Aurora Blobs */}
        <div className="absolute top-0 left-0 right-0 h-[60vh] mask-gradient-to-b opacity-40">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] aurora-blob" style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] aurora-blob" style={{ animationDelay: '-5s', animationDirection: 'reverse' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-[150px] aurora-blob" style={{ animationDelay: '-10s' }} />
        </div>
      </div>

      {/* ─── Content ────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col pt-6 pb-24">

        {/* Global Header */}
        <header className="w-full max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between z-50">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-white/20 to-white/5 border border-white/20 flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.1)] backdrop-blur-md">
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
            </div>
            <div>
              <div className="text-base font-bold tracking-[0.2em] uppercase text-white">USE rail</div>
              <div className="text-[9px] text-zinc-500 tracking-[0.3em] uppercase">Powered by Crop Intel</div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }} className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            Campbell, MN Facility Live
          </motion.div>
        </header>

        {/* ─── Hero Section ─────────────────────────────────────── */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 mt-24 mb-32">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full max-w-5xl mx-auto text-center"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.05] transition-colors cursor-default mb-10 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <Train className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-zinc-300 tracking-[0.2em] uppercase">BNSF Transloading Intelligence</span>
            </motion.div>

            {/* Massive Typography */}
            <motion.h1 variants={itemVariants} className="text-6xl sm:text-8xl lg:text-9xl font-extrabold tracking-tighter mb-8 leading-[0.9]">
              <span className="block text-zinc-400">Your grain deserves</span>
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-amber-300 pb-4">
                a bigger market.
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl sm:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed font-light mb-6">
              Stop selling local. <strong className="font-semibold text-white">Start selling national.</strong><br className="hidden sm:block" />
              USE rail connects Campbell-area farmers to 90+ premium buyers across
              the entire BNSF network.
            </motion.p>
            
            <motion.p variants={itemVariants} className="text-sm font-mono tracking-wide text-emerald-400 uppercase">
              Capture <span className="text-white font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">$0.40–$0.65 higher margins</span> per bushel.
            </motion.p>
          </motion.div>
        </section>

        {/* ─── Premium Value Pillars ────────────────────────────── */}
        <section className="w-full max-w-6xl mx-auto px-6 mb-40">
          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center"
          >
            {/* Pillar 1 */}
            <motion.div variants={itemVariants} className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden group">
                <motion.div animate={{ y: [0, -4, 0], x: [0, 4, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
                  <TrendingUp className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                </motion.div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4 tracking-tight">Higher Margins</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
                Our BNSF geospatial engine scans the entire national market in real-time — finding buyers that local elevators can't reach and margins they can't match.
              </p>
            </motion.div>

            {/* Pillar 2 */}
            <motion.div variants={itemVariants} className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(56,189,248,0.15)] relative overflow-hidden group">
                <motion.div animate={{ scale: [1, 1.15, 1], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                  <Shield className="w-7 h-7 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                </motion.div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4 tracking-tight">Zero Risk, Full Control</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
                You keep ownership of your grain. We handle transloading, rail logistics, and last-mile delivery. Track every bushel from bin to buyer — in real time.
              </p>
            </motion.div>

            {/* Pillar 3 */}
            <motion.div variants={itemVariants} className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden group">
                <motion.div animate={{ rotate: [-10, 10, -10], scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                  <Zap className="w-7 h-7 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                </motion.div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4 tracking-tight">Turn Rail Into Revenue</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">
                Most farmers live next to rail they'll never use. USE rail changes that. Your proximity to Campbell's BNSF line is an untapped asset worth thousands per season.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* ─── Portal Cards (Interactive Spotlight) ─────────────── */}
        <section className="w-full max-w-6xl mx-auto px-6 mb-40">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Command Center Card */}
            <SpotlightCard href="/map" spotlightColor="rgba(56, 189, 248, 0.15)">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
                <Globe className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="mt-auto">
                <div className="text-[10px] font-mono text-cyan-400/60 tracking-[0.2em] uppercase mb-3">Facility Hub</div>
                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Campbell Operations</h3>
                <p className="text-zinc-500 leading-relaxed mb-8">
                  Arbitrage command, fleet dispatch, national CRM, and real-time BNSF intelligence — the operator's cockpit.
                </p>
                <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold group-hover:gap-4 transition-all duration-300">
                  Enter Command Center <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </SpotlightCard>

            {/* Dealer Portal Card */}
            <SpotlightCard href="/portal/dealer" spotlightColor="rgba(245, 158, 11, 0.15)" className="md:-translate-y-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <Package className="w-6 h-6 text-amber-400" />
              </div>
              <div className="mt-auto">
                <div className="text-[10px] font-mono text-amber-400/60 tracking-[0.2em] uppercase mb-3">For Dealers & Farmers</div>
                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Dealer Portal</h3>
                <p className="text-zinc-500 leading-relaxed mb-8">
                  Submit transload orders, set constraints, and watch your grain move from elevator to 
                  terminal — all from one dashboard.
                </p>
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold group-hover:gap-4 transition-all duration-300">
                  Access Your Portal <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </SpotlightCard>

            {/* Destination Tracking */}
            <SpotlightCard href="/portal/destination" spotlightColor="rgba(16, 185, 129, 0.15)">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <MapPin className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="mt-auto">
                <div className="text-[10px] font-mono text-emerald-400/60 tracking-[0.2em] uppercase mb-3">Receiving Facilities</div>
                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Destination Tracking</h3>
                <p className="text-zinc-500 leading-relaxed mb-8">
                  Track inbound shipments in real-time. View unloading instructions, ETAs, and chat directly with Campbell operations.
                </p>
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold group-hover:gap-4 transition-all duration-300">
                  Track a Shipment <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        </section>

        {/* ─── Premium CTA / Value Section ────────────────────── */}
        <motion.section 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-150px" }}
          variants={fadeUpVariants}
          className="w-full max-w-5xl mx-auto px-6 mb-32"
        >
          <div className="relative rounded-3xl overflow-hidden border border-white/[0.05] bg-zinc-950/80 backdrop-blur-2xl">
            {/* Inner aurora glow */}
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 relative z-10">
              
              {/* Left Side: Copy */}
              <div className="col-span-3 p-10 lg:p-16 border-b lg:border-b-0 lg:border-r border-white/[0.05]">
                <div className="flex items-center gap-3 text-amber-500 text-xs font-mono tracking-[0.2em] uppercase mb-8">
                  <div className="w-8 h-px bg-amber-500/50" />
                  Area Farmers
                </div>
                <h2 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-8 leading-[1.1]">
                  Your neighbors are selling local.<br />
                  <span className="text-amber-500">You could be selling national.</span>
                </h2>
                
                <div className="space-y-6 text-base text-zinc-400 leading-relaxed">
                  <p>
                    Every harvest, the same story: you haul your grain to the local elevator, accept
                    whatever price they're offering, and hope it's enough. But just down the road,
                    the BNSF main line runs through Campbell — connecting you to 
                    <strong className="text-white font-medium"> feedlots in Texas paying $5.57/bu</strong>, 
                    ethanol plants in Iowa, and export terminals on the Gulf.
                  </p>
                  <p>
                    USE rail makes that connection flawless. We transload your grain from truck to
                    railcar right here in Campbell. Our AI-powered engine finds the best
                    buyer nationally, and handles the entire logistics chain. You keep full ownership.
                  </p>
                </div>

                <Link href="/portal/dealer" className="group mt-10 inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-sm tracking-wide hover:bg-zinc-200 transition-colors">
                  Get Started Today
                  <motion.div className="bg-black text-white p-1 rounded-full group-hover:rotate-45 transition-transform duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </Link>
              </div>

              {/* Right Side: Stats Panel */}
              <div className="col-span-2 bg-black/40 p-10 lg:p-16 flex flex-col justify-center">
                <h4 className="text-xs font-mono tracking-[0.2em] uppercase text-zinc-500 mb-10">What Rail Unlocks</h4>
                
                <div className="space-y-10">
                  <div className="group flex gap-5 items-start">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <BarChart3 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white mb-1">+$0.40–0.65/bu</div>
                      <div className="text-sm text-zinc-500 leading-snug">Average premium above local elevator bids</div>
                    </div>
                  </div>

                  <div className="group flex gap-5 items-start">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white mb-1">90+ Buyers</div>
                      <div className="text-sm text-zinc-500 leading-snug">Direct access to national feedlots & processors</div>
                    </div>
                  </div>

                  <div className="group flex gap-5 items-start">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white mb-1">Full Transparency</div>
                      <div className="text-sm text-zinc-500 leading-snug">Track every bushel in real-time, zero hidden fees</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ─── Footer ───────────────────────────────────── */}
        <footer className="w-full max-w-7xl mx-auto px-6 border-t border-white/[0.05] pt-10 pb-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-[10px] font-mono text-zinc-600 tracking-widest uppercase">
              <span>© 2026 USE RAIL</span>
              <span className="hidden md:inline">·</span>
              <span className="text-zinc-500">Campbell, MN</span>
              <span className="hidden md:inline">·</span>
              <span>BNSF Railway</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2">
              <Zap className="w-3 h-3 text-amber-500" />
              Powered by Crop Intel
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

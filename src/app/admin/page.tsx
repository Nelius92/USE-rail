"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getBins, getCommodities, createSpotCar, createScaleTicket, dispatchSpotCar, broadcastTender, fetchDailyTargets, fetchNeighbors, fetchDashboard360, Bin, Commodity, DailyTarget, Neighbor, Dashboard360Response } from '../../lib/api';
import NDGIScanner from '../../components/NDGIScanner';
import Link from 'next/link';
import { Plus, Truck, Train, Radio, X, Map, Target, TrendingUp, Activity, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_CHART_DATA = Array.from({ length: 60 }).map((_, i) => {
    const base = 1.0;
    const trend = (i / 60) * 1.5;
    const cycle = Math.sin(i / 8) * 0.4;
    const noise = (Math.random() - 0.5) * 0.2;
    const val = base + trend + cycle + noise + (i > 45 ? -0.8 : 0); // Add a sudden drop to match E8 erratic lines
    return {
        label: `${8 + Math.floor(i / 10)}:${((i % 10) * 6).toString().padStart(2, '0')} AM`,
        value: Math.max(0.1, val)
    };
});

function InteractiveHeroChart({ data = MOCK_CHART_DATA }) {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const maxVal = Math.max(...data.map(d => d.value));
    const minVal = Math.min(...data.map(d => d.value));
    const range = (maxVal - minVal) * 1.2 || 1; // Padded range

    const getX = (index: number) => (index / (data.length - 1)) * 100;
    // Map Y to percentage from top
    const getY = (val: number) => 100 - (((val - minVal) + (range * 0.1)) / range) * 100;

    // Build the sharp, jagged line (no Bezier smoothing)
    const pathD = data.map((d, i) => {
        const x = getX(i);
        const y = getY(d.value);
        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(" ");

    const fillD = `${pathD} L 100,100 L 0,100 Z`;

    const activeIndex = hoverIndex !== null ? hoverIndex : data.length - 1;
    const activeX = getX(activeIndex);
    const activeY = getY(data[activeIndex].value);

    // Generate grid line coordinates
    const gridRows = 5;
    const ySteps = Array.from({ length: gridRows }).map((_, i) => {
        const val = maxVal - (range * (i / (gridRows - 1)));
        return { y: getY(val), label: val.toFixed(2) };
    });

    const gridCols = 6;
    const xSteps = Array.from({ length: gridCols }).map((_, i) => {
        const index = Math.floor((data.length - 1) * (i / (gridCols - 1)));
        return { x: getX(index), label: data[index].label };
    });

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        
        let closestIndex = 0;
        let minDiff = Infinity;
        data.forEach((_, i) => {
            const diff = Math.abs(getX(i) - xPercent);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        });
        setHoverIndex(closestIndex);
    };

    return (
        <div className="bg-[#050505] border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] rounded-2xl w-full flex-shrink-0 relative overflow-hidden flex flex-col group">
            
            {/* E8 Chart Header */}
            <div className="flex justify-between items-start z-10 p-6 pb-2 pointer-events-none">
                <div className="flex gap-4 items-center">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-xl font-sans text-white font-medium drop-shadow-md">Arbitrage Terminal</h2>
                            <span className="text-xl font-sans text-white font-bold tracking-tight">${data[data.length - 1].value.toFixed(2)} <span className="text-[10px] text-zinc-500 tracking-normal font-medium ml-1">USD</span></span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <button className="w-8 h-8 rounded-lg hover:bg-white/5 border border-transparent transition-colors flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-zinc-500" />
                    </button>
                    <div className="h-4 w-px bg-white/10 mx-1"></div>
                    <div className="flex bg-[#111111] rounded-lg border border-white/5 p-1 text-[10px] font-medium tracking-wide">
                        {['1s', '15m', '1h', '4h', '1d', '1w'].map(btn => (
                            <button key={btn} className={`px-2.5 py-1 rounded-md transition-colors ${btn === '1d' ? 'bg-[#06b6d4]/10 text-[#06b6d4]' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                {btn}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Interactive Chart Area */}
            <div className="relative h-[280px] w-full pr-6 pl-14 pt-2 pb-6">
                
                {/* Background Grid */}
                <div className="absolute inset-0 pr-6 pl-14 pt-2 pb-8 pointer-events-none">
                    {/* Horizontal lines */}
                    {ySteps.map((step, i) => (
                        <div key={`y-${i}`} className="absolute w-[calc(100%-5rem)] border-t border-white/[0.03]" style={{ top: `${step.y}%`, left: '3.5rem' }}>
                            <span className="absolute -left-12 -translate-y-1/2 text-[9px] text-zinc-600 font-mono w-10 text-right">${step.label}</span>
                        </div>
                    ))}
                    {/* Vertical lines */}
                    {xSteps.map((step, i) => (
                        <div key={`x-${i}`} className="absolute h-[calc(100%-40px)] border-l border-white/[0.03]" style={{ left: `calc(3.5rem + ${step.x} * calc(100% - 5rem) / 100)` }}>
                            <span className="absolute -bottom-6 -translate-x-1/2 text-[9px] text-zinc-600 font-mono whitespace-nowrap">{step.label}</span>
                        </div>
                    ))}
                </div>

                {/* E8 Glassmorphic Tooltip */}
                <motion.div 
                    className="absolute z-30 pointer-events-none bg-white/[0.03] backdrop-blur-md border border-white/10 text-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col justify-center px-4 py-2"
                    animate={{
                        left: `calc(3.5rem + ${activeX} * calc(100% - 5rem) / 100)`,
                        top: `calc(${activeY}% - 30px)`,
                        opacity: hoverIndex !== null ? 1 : 0
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    style={{ transform: "translate(15px, -50%)" }} // Offset to the right of the point
                >
                    <span className="text-white font-bold text-sm leading-tight">${data[activeIndex].value.toFixed(2)} <span className="text-[9px] text-zinc-500 font-normal">USD</span></span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 whitespace-nowrap">{data[activeIndex].label}</span>
                </motion.div>

                {/* The Interactive SVG Canvas */}
                <svg 
                    ref={svgRef}
                    className="absolute top-2 left-14 w-[calc(100%-5rem)] h-[calc(100%-40px)] preserve-aspect-ratio-none overflow-visible cursor-crosshair z-20" 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverIndex(null)}
                >
                    <defs>
                        <linearGradient id="glowGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="rgba(6, 182, 212, 0.4)" />
                            <stop offset="100%" stopColor="rgba(6, 182, 212, 0.0)" />
                        </linearGradient>
                    </defs>
                    
                    {/* Fill Gradient */}
                    <path d={fillD} fill="url(#glowGradient)" className="pointer-events-none" style={{ opacity: hoverIndex !== null ? 0.9 : 0.6, transition: 'opacity 0.3s' }} />
                    
                    {/* The jagged data line */}
                    <motion.path 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        d={pathD} 
                        fill="none" 
                        stroke="#06b6d4" 
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] pointer-events-none" 
                        style={{ filter: "drop-shadow(0 -2px 10px rgba(6,182,212,0.6))" }}
                    />

                    {/* Permanent Live Data Dot (Always visible at the end of the line) */}
                    <motion.g 
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: hoverIndex !== null ? 0 : 1, scale: hoverIndex !== null ? 0 : 1 }}
                        transition={{ duration: 0.3 }}
                        className="pointer-events-none"
                    >
                        <circle cx={getX(data.length - 1)} cy={getY(data[data.length - 1].value)} r="4" fill="rgba(6, 182, 212, 0.4)" className="animate-pulse" />
                        <circle cx={getX(data.length - 1)} cy={getY(data[data.length - 1].value)} r="2" fill="#fff" className="drop-shadow-[0_0_15px_rgba(6,182,212,1)]" />
                        <ellipse cx={getX(data.length - 1)} cy={100} rx="6" ry="2" fill="#06b6d4" className="opacity-80 drop-shadow-[0_0_10px_rgba(6,182,212,1)]" />
                    </motion.g>

                    {/* E8 Crosshair & Hover Glowing Dot */}
                    <motion.g 
                        animate={{ x: activeX, y: activeY, opacity: hoverIndex !== null ? 1 : 0 }}
                        transition={{ type: "spring", stiffness: 600, damping: 40 }}
                        className="pointer-events-none"
                    >
                        {/* Horizontal Crosshair Line */}
                        <line x1={-activeX} y1="0" x2={100 - activeX} y2="0" stroke="#06b6d4" strokeWidth="0.5" vectorEffect="non-scaling-stroke" className="opacity-60" />
                        
                        {/* Vertical Crosshair Line */}
                        <line x1="0" y1={-activeY} x2="0" y2={100 - activeY} stroke="#06b6d4" strokeWidth="0.5" vectorEffect="non-scaling-stroke" className="opacity-60" />
                        
                        <circle cx="0" cy="0" r="1.5" fill="#fff" className="drop-shadow-[0_0_10px_rgba(6,182,212,1)]" vectorEffect="non-scaling-stroke" />
                        <circle cx="0" cy="0" r="4" fill="rgba(6, 182, 212, 0.5)" vectorEffect="non-scaling-stroke" className={hoverIndex !== null ? "animate-ping opacity-60" : "opacity-0"} />
                    </motion.g>
                </svg>
            </div>
        </div>
    );
}

export default function AdminCommandCenter() {
    const [bins, setBins] = useState<Bin[]>([]);
    const [commodities, setCommodities] = useState<Commodity[]>([]);
    const [loadingBins, setLoadingBins] = useState(true);
    const [dailyTargets, setDailyTargets] = useState<DailyTarget[]>([]);
    const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
    const [dashboard360, setDashboard360] = useState<Dashboard360Response | null>(null);

    const [isSpotCarModalOpen, setIsSpotCarModalOpen] = useState(false);
    const [spotCarForm, setSpotCarForm] = useState({ commodity_id: '', weight: '', moisture: '' });
    const [submittingSpotCar, setSubmittingSpotCar] = useState(false);
    const [toastError, setToastError] = useState<string | null>(null);
    const [toastSuccess, setToastSuccess] = useState<string | null>(null);

    const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
    const [inboundForm, setInboundForm] = useState({ neighbor_id: '', commodity_id: '', destination_bin_id: '', gross_weight_lbs: '', tare_weight_lbs: '', moisture_pct: '' });
    const [submittingInbound, setSubmittingInbound] = useState(false);

    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [dispatchForm, setDispatchForm] = useState({ bin_id: '', planned_lbs: '' });
    const [submittingDispatch, setSubmittingDispatch] = useState(false);

    const [isRadarScanning, setIsRadarScanning] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoadingBins(true);
            const [binsData, commoditiesData, targets, neighborsData, dashData] = await Promise.all([getBins(), getCommodities(), fetchDailyTargets(), fetchNeighbors(), fetchDashboard360()]);
            binsData.sort((a, b) => a.bin_number - b.bin_number);
            setBins(binsData);
            setCommodities(commoditiesData);
            setDailyTargets(targets);
            setNeighbors(neighborsData);
            setDashboard360(dashData);
        } catch (err) {
            console.error(err);
            setToastError("Failed to fetch live data.");
            setTimeout(() => setToastError(null), 5000);
        } finally {
            setLoadingBins(false);
        }
    };

    const handleCreateSpotCar = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingSpotCar(true); setToastError(null); setToastSuccess(null);
        try {
            if (!spotCarForm.commodity_id || !spotCarForm.weight || !spotCarForm.moisture) throw new Error("All fields required.");
            await createSpotCar({ commodity_id: spotCarForm.commodity_id, certified_weight_lbs: parseFloat(spotCarForm.weight), certified_moisture_pct: parseFloat(spotCarForm.moisture) });
            setToastSuccess("Spot car created."); setTimeout(() => setToastSuccess(null), 5000);
            setIsSpotCarModalOpen(false); setSpotCarForm({ commodity_id: '', weight: '', moisture: '' });
            await fetchData();
        } catch (err: any) { setToastError(err.message); setTimeout(() => setToastError(null), 5000); }
        finally { setSubmittingSpotCar(false); }
    };

    const handleCreateInboundTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingInbound(true); setToastError(null); setToastSuccess(null);
        try {
            await createScaleTicket({ neighbor_id: inboundForm.neighbor_id, commodity_id: inboundForm.commodity_id, destination_bin_id: inboundForm.destination_bin_id, gross_weight_lbs: parseFloat(inboundForm.gross_weight_lbs), tare_weight_lbs: parseFloat(inboundForm.tare_weight_lbs), moisture_pct: parseFloat(inboundForm.moisture_pct) });
            setToastSuccess("Inbound ticket logged."); setTimeout(() => setToastSuccess(null), 5000);
            setIsInboundModalOpen(false); setInboundForm({ neighbor_id: '', commodity_id: '', destination_bin_id: '', gross_weight_lbs: '', tare_weight_lbs: '', moisture_pct: '' });
            await fetchData();
        } catch (err: any) { setToastError(err.message); setTimeout(() => setToastError(null), 5000); }
        finally { setSubmittingInbound(false); }
    };

    const handleDispatchSpotCar = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingDispatch(true); setToastError(null); setToastSuccess(null);
        try {
            await dispatchSpotCar({ bin_id: dispatchForm.bin_id, planned_lbs: parseFloat(dispatchForm.planned_lbs) });
            setToastSuccess("Spot car dispatched."); setTimeout(() => setToastSuccess(null), 5000);
            setIsDispatchModalOpen(false); setDispatchForm({ bin_id: '', planned_lbs: '' });
            await fetchData();
        } catch (err: any) { setToastError(err.message); setTimeout(() => setToastError(null), 5000); }
        finally { setSubmittingDispatch(false); }
    };

    const handleFlashTender = async () => {
        setIsRadarScanning(true); setToastError(null); setToastSuccess(null);
        try {
            await broadcastTender("TEST-SPOT-CAR");
            setIsRadarScanning(false); setToastSuccess("SMS broadcast sent."); setTimeout(() => setToastSuccess(null), 5000);
        } catch (err: any) { setIsRadarScanning(false); setToastError(err.message); setTimeout(() => setToastError(null), 5000); }
    };

    return (
        <div className="h-screen bg-[#0a0a0a] text-zinc-300 font-sans flex relative selection:bg-emerald-500/30 overflow-hidden custom-scrollbar">
            {/* E8-STYLE LEFT SIDEBAR NAVIGATION */}
            <nav className="w-16 xl:w-64 border-r border-white/5 bg-[#0d0d0d] hidden md:flex flex-col z-50 shrink-0">
                <div className="h-16 flex items-center justify-center xl:justify-start xl:px-6 border-b border-white/5 shrink-0">
                    <div className="text-white font-sans font-bold tracking-[0.2em] uppercase text-sm flex items-center gap-3">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                        <span className="hidden xl:inline">USE rail</span>
                    </div>
                </div>
                
                <div className="py-4 xl:p-4 flex flex-col gap-1.5 flex-1 overflow-y-auto items-center xl:items-stretch">
                    <div className="hidden xl:block text-[10px] text-zinc-600 font-sans tracking-widest uppercase mb-2 px-2 mt-2">Command Engine</div>
                    
                    <button className="flex items-center xl:justify-start justify-center gap-3 w-10 h-10 xl:w-auto xl:h-auto xl:px-3 xl:py-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium text-xs tracking-widest uppercase transition-all shadow-inner group">
                        <Activity className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <span className="hidden xl:inline">Network Pulse</span>
                    </button>
                    
                    <Link href="/portal/command" className="flex items-center xl:justify-start justify-center gap-3 w-10 h-10 xl:w-auto xl:h-auto xl:px-3 xl:py-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent font-medium text-xs tracking-widest uppercase transition-all group">
                        <Truck className="w-4 h-4 group-hover:text-amber-400 transition-colors" />
                        <span className="hidden xl:inline">Order Pipeline</span>
                    </Link>
                    
                    <div className="hidden xl:block text-[10px] text-zinc-600 font-sans tracking-widest uppercase mb-2 px-2 mt-6">Intelligence Field</div>
                    
                    <Link href="/map" className="flex items-center xl:justify-start justify-center gap-3 w-10 h-10 xl:w-auto xl:h-auto xl:px-3 xl:py-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent font-medium text-xs tracking-widest uppercase transition-all group">
                        <Map className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
                        <span className="hidden xl:inline">Arbitrage Map</span>
                    </Link>
                    
                    <Link href="/portal/dealer" className="flex items-center xl:justify-start justify-center gap-3 w-10 h-10 xl:w-auto xl:h-auto xl:px-3 xl:py-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent font-medium text-xs tracking-widest uppercase transition-all group">
                        <Target className="w-4 h-4 group-hover:text-rose-400 transition-colors" />
                        <span className="hidden xl:inline">Fleet Tracking</span>
                    </Link>
                </div>
                
                <div className="p-4 border-t border-white/5 mt-auto bg-[#0a0a0a]/50 flex justify-center xl:justify-start">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-[10px] tracking-wider shrink-0">
                            OP
                        </div>
                        <div className="hidden xl:block">
                            <div className="text-zinc-300 text-xs font-semibold">Campbell Ops</div>
                            <div className="text-[9px] text-emerald-500 uppercase tracking-widest font-medium">System Online</div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* TOASTS */}
            {toastError && (
                <div className="fixed top-20 right-6 z-50 bg-[#141414] border border-rose-500/20 text-rose-400 px-5 py-3.5 rounded-xl flex items-center gap-3 text-sm font-sans shadow-2xl font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>{toastError}
                </div>
            )}
            {toastSuccess && (
                <div className="fixed top-20 right-6 z-50 bg-[#141414] border border-emerald-500/20 text-emerald-400 px-5 py-3.5 rounded-xl flex items-center gap-3 text-sm font-sans shadow-2xl font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>{toastSuccess}
                </div>
            )}

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                
                {/* E8-STYLE TOP HEADER BAR */}
                <header className="h-16 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 z-40">
                    <h1 className="text-sm font-sans tracking-[0.2em] text-zinc-400 flex items-center gap-3 uppercase font-semibold">
                        Dashboard Overview
                    </h1>
                    
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsInboundModalOpen(true)}
                            className="bg-[#141414] hover:bg-[#1a1a1a] border border-white/5 text-zinc-300 hover:text-white font-sans uppercase tracking-widest px-4 py-2 rounded-md text-[10px] flex items-center gap-2 transition-all shadow-sm"
                        >
                            <Truck className="w-3.5 h-3.5 text-zinc-500" />
                            Log Inbound Flow
                        </button>
                        <button
                            onClick={() => setIsSpotCarModalOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-sans uppercase tracking-widest px-4 py-2 rounded-md text-[10px] font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Spot Car
                        </button>
                    </div>
                </header>

                {/* SCROLLABLE MAIN CANVAS */}
                <main className="flex-1 p-6 flex flex-col xl:flex-row gap-6 overflow-y-auto">
                    
                    {/* LEFT COLUMN: CHARTS, KPIs, BINS */}
                    <div className="flex-1 flex flex-col gap-6 min-w-0">

                        {/* HERO CHART WIDGET */}
                        <InteractiveHeroChart />

                        {/* 360 DASHBOARD KPI CARDS */}
                        {dashboard360 && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
                                {/* Facility Utilization */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-[#111111] border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] rounded-xl p-5 flex flex-col relative group transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] cursor-default overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="text-[9px] text-zinc-500 font-sans tracking-widest uppercase mb-2 relative z-10 group-hover:text-zinc-400 transition-colors">Facility Utilization</div>
                                    <div className="text-3xl font-sans text-white font-medium flex items-baseline gap-1 relative z-10 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] transition-all">
                                        {dashboard360.facility_utilization.utilization_pct}%
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest relative z-10">
                                        {Math.round(dashboard360.facility_utilization.utilized_capacity_bushels).toLocaleString()} BSH
                                    </div>
                                    <div className="absolute top-5 right-5 text-zinc-800 rotate-45 group-hover:text-emerald-500 group-hover:rotate-0 transition-all duration-500"><ArrowUpRight className="w-5 h-5"/></div>
                                </motion.div>

                                {/* Today Inbound */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-[#111111] border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] rounded-xl p-5 flex flex-col relative group transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] cursor-default overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="text-[9px] text-zinc-500 font-sans tracking-widest uppercase mb-2 relative z-10 group-hover:text-zinc-400 transition-colors">Today's Inbound</div>
                                    <div className="text-3xl font-sans text-white font-medium flex items-baseline gap-1 relative z-10 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] transition-all">
                                        {dashboard360.today_inbound.ticket_count} <span className="text-xs text-zinc-600 font-normal tracking-widest uppercase">Trk</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest relative z-10">
                                        {Math.round(dashboard360.today_inbound.total_bushels).toLocaleString()} BSH
                                    </div>
                                    <div className="absolute top-5 right-5 text-emerald-900/50 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-500"><Truck className="w-5 h-5"/></div>
                                </motion.div>

                                {/* Active Outbound */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-[#111111] border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] rounded-xl p-5 flex flex-col relative group transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgba(245,158,11,0.1)] cursor-default overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="text-[9px] text-zinc-500 font-sans tracking-widest uppercase mb-2 relative z-10 group-hover:text-zinc-400 transition-colors">Active Outbound</div>
                                    <div className="text-3xl font-sans text-white font-medium flex items-baseline gap-1 relative z-10 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] transition-all">
                                        {dashboard360.active_outbound.active_cars_count} <span className="text-xs text-zinc-600 font-normal tracking-widest uppercase">Car</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest relative z-10">
                                        En Route
                                    </div>
                                    <div className="absolute top-5 right-5 text-amber-900/30 group-hover:text-amber-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-500"><Train className="w-5 h-5"/></div>
                                </motion.div>

                                {/* Best Arbitrage Pulse */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-[#111111] border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] rounded-xl p-5 flex flex-col relative group transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-[0_8px_30px_rgba(59,130,246,0.1)] cursor-default overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="text-[9px] text-zinc-500 font-sans tracking-widest uppercase mb-2 relative z-10 group-hover:text-zinc-400 transition-colors">Arbitrage Pulse</div>
                                    <div className={`text-3xl font-sans font-medium flex items-baseline gap-1 relative z-10 transition-all ${dailyTargets.length > 0 && dailyTargets[0].profit_delta > 0 ? 'text-emerald-400 group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'text-zinc-300 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'}`}>
                                        {dailyTargets.length > 0 && dailyTargets[0].profit_delta > 0 ? '+' : ''}
                                        {dailyTargets.length > 0 ? dailyTargets[0].profit_delta.toFixed(2) : '0.00'}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest truncate relative z-10">
                                        {dailyTargets.length > 0 ? dailyTargets[0].buyer_name : 'No Targets'}
                                    </div>
                                    <div className="absolute top-5 right-5 text-blue-900/30 group-hover:text-blue-400 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500"><Target className="w-5 h-5"/></div>
                                </motion.div>
                            </div>
                        )}

                        {/* NDGI SCANNER */}
                        <div className="flex-shrink-0">
                            <NDGIScanner />
                        </div>

                        {/* MAP LINK CARD */}
                        <Link href="/map" className="group block flex-shrink-0">
                            <div className="h-32 w-full bg-[#111111] border border-white/5 rounded-2xl flex items-center justify-center relative overflow-hidden transition-all duration-500 hover:border-white/10">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-100 group-hover:scale-105 transition-transform duration-700"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <div className="flex items-center gap-5 z-10 bg-[#0a0a0a] px-8 py-4 rounded-xl border border-white/5 shadow-2xl">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                        <Map className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-zinc-200 font-sans text-sm tracking-[0.15em] uppercase transition-colors font-semibold">Logistical Map</div>
                                        <div className="text-zinc-600 text-[9px] tracking-[0.2em] uppercase mt-1">3D Tactical Engine</div>
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors ml-6" />
                                </div>
                            </div>
                        </Link>

                        {/* 12-BIN DASHBOARD (E8 Style) */}
                        <div className="flex-shrink-0">
                            <h2 className="text-[10px] font-sans font-medium text-zinc-600 mb-4 tracking-[0.2em] uppercase flex justify-between items-center px-1">
                                <span>Terminal Elevator Volumes</span>
                                <span className="flex items-center gap-2">
                                    {loadingBins ? (
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse"></span>
                                    ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                    )}
                                </span>
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {loadingBins ? (
                                    Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className="bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col gap-3 animate-pulse">
                                            <div className="h-3 bg-[#1a1a1a] rounded w-1/2"></div>
                                            <div className="h-2 bg-[#1a1a1a] rounded w-full mt-2"></div>
                                        </div>
                                    ))
                                ) : bins.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-zinc-600 text-[10px] tracking-[0.2em] uppercase">No bins configured</div>
                                ) : (
                                    bins.map((bin) => {
                                        const maxCap = bin.capacity_bushels || 83333;
                                        const fillPct = Math.min(100, Math.max(0, (bin.current_volume_bushels / maxCap) * 100));
                                        const isEmpty = bin.current_volume_bushels === 0 || !bin.current_commodity;

                                        const colors = ['from-emerald-500 to-teal-400', 'from-blue-500 to-cyan-400', 'from-amber-500 to-orange-400', 'from-purple-500 to-rose-400'];
                                        const colorClass = isEmpty ? 'from-zinc-700 to-zinc-600' : colors[bin.bin_number % colors.length];

                                        return (
                                            <div key={bin.id} className="bg-[#111111] border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] rounded-xl p-4 flex flex-col justify-center relative group overflow-hidden">
                                                <div className="absolute inset-0 bg-white/[0.01] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="flex justify-between items-end mb-3 relative z-10">
                                                    <div>
                                                        <div className="text-zinc-300 font-sans font-medium text-xs">Bin {bin.bin_number}</div>
                                                        <div className={`text-[9px] uppercase tracking-[0.2em] font-medium mt-1 ${isEmpty ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                            {isEmpty ? "Empty" : bin.current_commodity?.name}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-mono font-medium text-white">
                                                            {bin.current_volume_bushels > 0 ? Math.round(bin.current_volume_bushels).toLocaleString() : "0"} <span className="text-[9px] text-zinc-600 font-sans tracking-widest uppercase">BU</span>
                                                        </div>
                                                        <div className="text-[10px] font-mono font-medium text-zinc-500 mt-1 uppercase">
                                                            {fillPct.toFixed(0)}%
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Horizontal Progress bar */}
                                                <div className="w-full h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden border border-white/5 relative z-10 shadow-inner">
                                                    {!isEmpty && (
                                                        <div
                                                            className={`h-full bg-gradient-to-r ${colorClass} transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] opacity-90`}
                                                            style={{ width: `${fillPct}%` }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                        
                        {/* COMMAND PANEL moved here */}
                        <div className="bg-[#111111] border border-white/5 p-5 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] mt-2 flex-shrink-0">
                            <h2 className="text-[10px] font-sans text-zinc-600 mb-4 tracking-[0.2em] uppercase font-medium">Operations Field</h2>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => setIsDispatchModalOpen(true)}
                                    className="flex-1 bg-[#1a1a1a] border border-white/5 hover:border-white/10 text-zinc-300 py-3.5 px-4 rounded-xl transition-all uppercase tracking-[0.15em] text-[10px] font-semibold flex items-center justify-center gap-3 shadow-md group"
                                >
                                    <Train className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                                    Dispatch Spot Car
                                </button>
                                <button
                                    onClick={handleFlashTender}
                                    disabled={isRadarScanning}
                                    className={`flex-1 py-3.5 px-4 rounded-xl transition-all uppercase tracking-[0.15em] text-[10px] font-semibold flex items-center justify-center gap-3 shadow-md group ${isRadarScanning ? 'bg-[#1a1a1a] border border-white/5 text-zinc-600' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'}`}
                                >
                                    {isRadarScanning ? (
                                        <span className="flex items-center gap-2 animate-pulse">
                                            <Radio className="w-3.5 h-3.5" />
                                            Active...
                                        </span>
                                    ) : (
                                        <>
                                            <Radio className="w-3.5 h-3.5 text-rose-500 group-hover:drop-shadow-[0_0_5px_rgba(244,63,94,0.6)]" />
                                            Flash Tender SMS
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                    </div> {/* <--- END OF LEFT COLUMN */}

                    {/* RIGHT SIDEBAR: FACILITY TARGETS & SCOUT */}
                    <div className="w-full xl:w-[320px] bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col gap-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] shrink-0 h-max">
                        <div className="text-[10px] text-zinc-600 border-b border-white/5 pb-3 flex justify-between tracking-widest uppercase">
                            <span>Today's Date</span>
                            <span className="text-zinc-400 font-mono">{new Date().toISOString().split('T')[0]}</span>
                        </div>

                        {/* Capacity Risk/Loss Widget */}
                        <div className="flex flex-col gap-3">
                            <div className="text-[10px] text-zinc-500 tracking-[0.2em] font-medium uppercase px-1">Capacity Limit</div>
                            <div className="bg-[#0a0a0a] rounded-xl p-5 border border-white/5 relative overflow-hidden shadow-inner flex flex-col justify-center h-28">
                                <div className="flex justify-between items-end mb-3 relative z-10">
                                    <div className="text-zinc-400 text-xs font-medium uppercase tracking-[0.1em]">Total Max</div>
                                    <div className="text-rose-400 text-base font-mono font-bold">85.2%</div>
                                </div>
                                <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full relative z-10 shadow-inner overflow-visible">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: "85.2%" }}
                                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                                        className="h-full bg-rose-500 rounded-full relative overflow-visible drop-shadow-[0_0_12px_rgba(244,63,94,0.9)]"
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[slide_1s_linear_infinite] rounded-full"></div>
                                        {/* Bright leading edge glow */}
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white blur-[2px] rounded-full opacity-60"></div>
                                    </motion.div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <h3 className="text-[10px] text-zinc-400 tracking-[0.2em] font-medium uppercase flex items-center gap-2.5 mb-5 px-1">
                                <Target className="w-3.5 h-3.5 text-blue-400" />
                                Top Arbitrage Targets
                            </h3>
                            <div className="flex flex-col gap-2">
                                {dailyTargets.map((t, i) => (
                                    <div key={i} className="flex justify-between items-center bg-[#0a0a0a] px-4 py-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-crosshair shadow-sm group">
                                        <div className="min-w-0 pr-4">
                                            <div className="text-zinc-200 text-xs font-mono truncate group-hover:text-white transition-colors">{t.buyer_name}</div>
                                            <div className="text-zinc-600 text-[9px] tracking-[0.15em] uppercase mt-1">{t.commodity}</div>
                                        </div>
                                        <div className={`font-mono text-sm font-bold whitespace-nowrap ${t.profit_delta > 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]' : 'text-rose-500'}`}>
                                            {t.profit_delta > 0 ? '+' : ''}{t.profit_delta.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                                {dailyTargets.length === 0 && (
                                     <div className="text-[10px] text-zinc-600 uppercase tracking-widest text-center py-6 border border-dashed border-white/10 rounded-xl">No active targets</div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            {/* MODALS */}
            {isSpotCarModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-zinc-900 border border-white/5 rounded-lg overflow-hidden">
                        <div className="bg-zinc-950 border-b border-white/5 p-4 flex justify-between items-center">
                            <h3 className="text-zinc-100 font-sans uppercase tracking-widest text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4 text-blue-500" />
                                New Spot Car
                            </h3>
                            <button onClick={() => setIsSpotCarModalOpen(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSpotCar} className="p-6 flex flex-col gap-5">
                            <div>
                                <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-widest">Commodity</label>
                                <select required value={spotCarForm.commodity_id} onChange={e => setSpotCarForm({ ...spotCarForm, commodity_id: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-zinc-200 text-sm focus:outline-none focus:border-blue-500/50 transition-all">
                                    <option value="" disabled>Select...</option>
                                    {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-widest">Weight (lbs)</label>
                                <input type="number" step="0.1" required value={spotCarForm.weight} onChange={e => setSpotCarForm({ ...spotCarForm, weight: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-blue-500/50" placeholder="195000" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-widest">Moisture %</label>
                                <input type="number" step="0.1" required value={spotCarForm.moisture} onChange={e => setSpotCarForm({ ...spotCarForm, moisture: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-blue-500/50" placeholder="14.5" />
                            </div>
                            <div className="mt-2 pt-4 border-t border-white/5 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsSpotCarModalOpen(false)} className="px-4 py-2 border border-white/5 text-zinc-500 hover:text-zinc-300 rounded text-xs uppercase tracking-widest transition-colors">Cancel</button>
                                <button type="submit" disabled={submittingSpotCar} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs uppercase tracking-widest font-semibold transition-colors disabled:opacity-50">{submittingSpotCar ? "Processing..." : "Submit"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isInboundModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-zinc-900 border border-white/5 rounded-lg overflow-hidden">
                        <div className="bg-zinc-950 border-b border-white/5 p-4 flex justify-between items-center">
                            <h3 className="text-zinc-100 font-sans uppercase tracking-widest text-sm flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-500" />
                                Inbound Ticket
                            </h3>
                            <button onClick={() => setIsInboundModalOpen(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateInboundTicket} className="p-6 flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-widest">Neighbor ID</label>
                                    <select required value={inboundForm.neighbor_id} onChange={e => setInboundForm({ ...inboundForm, neighbor_id: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none">
                                        <option value="">Select Farmer...</option>
                                        {neighbors.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-widest">Commodity</label>
                                    <select required value={inboundForm.commodity_id} onChange={e => setInboundForm({ ...inboundForm, commodity_id: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none">
                                        <option value="" disabled>Select...</option>
                                        {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-widest">Dest Bin</label>
                                    <select required value={inboundForm.destination_bin_id} onChange={e => setInboundForm({ ...inboundForm, destination_bin_id: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none">
                                        <option value="" disabled>Select...</option>
                                        {bins.map(b => <option key={b.id} value={b.id}>Bin {b.bin_number}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-widest">Gross (lbs)</label>
                                    <input type="number" step="0.1" required value={inboundForm.gross_weight_lbs} onChange={e => setInboundForm({ ...inboundForm, gross_weight_lbs: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-sm font-mono focus:border-blue-500/50 focus:outline-none" placeholder="80000" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-widest">Tare (lbs)</label>
                                    <input type="number" step="0.1" required value={inboundForm.tare_weight_lbs} onChange={e => setInboundForm({ ...inboundForm, tare_weight_lbs: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-sm font-mono focus:border-blue-500/50 focus:outline-none" placeholder="28000" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-widest">Moisture %</label>
                                    <input type="number" step="0.1" required value={inboundForm.moisture_pct} onChange={e => setInboundForm({ ...inboundForm, moisture_pct: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-sm font-mono focus:border-blue-500/50 focus:outline-none" placeholder="15.0" />
                                </div>
                            </div>
                            <div className="mt-2 border-t border-white/5 pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsInboundModalOpen(false)} className="px-4 py-2 border border-white/5 text-zinc-500 hover:text-zinc-300 rounded text-xs uppercase tracking-widest">Cancel</button>
                                <button type="submit" disabled={submittingInbound} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs uppercase tracking-widest font-semibold disabled:opacity-50">{submittingInbound ? "Logging..." : "Log Ticket"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDispatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-zinc-900 border border-white/5 rounded-lg overflow-hidden">
                        <div className="bg-zinc-950 border-b border-white/5 p-4 flex justify-between items-center">
                            <h3 className="text-zinc-100 font-sans uppercase tracking-widest text-sm flex items-center gap-2">
                                <Train className="w-4 h-4 text-zinc-400" />
                                Dispatch Spot Car
                            </h3>
                            <button onClick={() => setIsDispatchModalOpen(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleDispatchSpotCar} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-widest">Source Bin</label>
                                <select required value={dispatchForm.bin_id} onChange={e => setDispatchForm({ ...dispatchForm, bin_id: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-sm focus:border-white/20 focus:outline-none">
                                    <option value="" disabled>Select bin...</option>
                                    {bins.map(b => <option key={b.id} value={b.id}>Bin {b.bin_number} ({b.current_commodity?.name || 'Empty'} - {b.current_volume_bushels} bu)</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-widest">Planned Weight (lbs)</label>
                                <input type="number" step="0.1" required value={dispatchForm.planned_lbs} onChange={e => setDispatchForm({ ...dispatchForm, planned_lbs: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded px-3 py-2 text-sm font-mono focus:border-white/20 focus:outline-none" placeholder="195000" />
                            </div>
                            <div className="mt-2 border-t border-white/5 pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsDispatchModalOpen(false)} className="px-4 py-2 border border-white/5 text-zinc-500 hover:text-zinc-300 rounded text-xs uppercase tracking-widest">Cancel</button>
                                <button type="submit" disabled={submittingDispatch} className="px-6 py-2 bg-zinc-100 text-zinc-900 font-semibold hover:bg-white rounded text-xs uppercase tracking-widest disabled:opacity-50">{submittingDispatch ? "Dispatching..." : "Confirm"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}

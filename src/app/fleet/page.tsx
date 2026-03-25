"use client";

import React, { useState, useEffect, useRef } from 'react';
import GlobalNav from '@/components/GlobalNav';
import { fetchFleet, Railcar } from '@/lib/api';
import { TrainTrack, Search, Activity, CheckCircle, ShieldAlert } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import RailcarModal from '@/components/RailcarModal';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

export default function FleetCenter() {
    const [fleet, setFleet] = useState<Railcar[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCar, setSelectedCar] = useState<Railcar | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Responsive Dimensions calculation
    const [dimensions, setDimensions] = useState({ carWidth: 420, overlap: -12 });

    useEffect(() => {
        const updateDimensions = () => {
            const width = window.innerWidth;
            if (width < 640) { // Mobile
                setDimensions({ carWidth: 280, overlap: -8 });
            } else if (width < 1024) { // Tablet
                setDimensions({ carWidth: 300, overlap: -9 });
            } else if (width < 1550) { // Laptop/Standard Desktop (1440p)
                // Exactly chosen so 5 cars fits cleanly
                setDimensions({ carWidth: 240, overlap: -7 });
            } else { // Ultrawide (1600px+)
                setDimensions({ carWidth: 320, overlap: -9 });
            }
        };

        updateDimensions(); // Initial layout
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchFleet().then(data => {
            setFleet(data);
            setTimeout(() => setLoading(false), 800);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    // Calculate drag constraints when fleet loads or screen resizes
    useEffect(() => {
        if (containerRef.current && trackRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const trackWidth = trackRef.current.scrollWidth;
            setDragConstraints({
                left: -Math.max(trackWidth - containerWidth + 100, 0), // allow scroll pad
                right: 0
            });
        }
    }, [fleet, loading, dimensions]);

    // Native mouse-wheel horizontal mapping that translates directly to the framer motion x value
    // (We use a motion value to instantly snap wheel turns to standard panning)
    const [panX, setPanX] = useState(0);

    const handleWheel = (e: React.WheelEvent) => {
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? -e.deltaY : -e.deltaX;
        setPanX(prev => {
            const next = prev + delta;
            return Math.min(Math.max(next, dragConstraints.left), 0);
        });
    };

    // Filter fleet based on search
    const filteredFleet = fleet.filter(car => car.car_id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Split into precisely two rows
    const topRow = filteredFleet.slice(0, Math.ceil(filteredFleet.length / 2));
    const bottomRow = filteredFleet.slice(Math.ceil(filteredFleet.length / 2));

    const renderCar = (car: Railcar, index: number, totalInRow: number) => {
        const allMatch = car.hoppers.every((h: any) => h.matches_buyer_spec);

        return (
            <div 
                key={car.car_id}
                className="shrink-0 relative group cursor-pointer flex flex-col items-center transition-transform duration-500 ease-out hover:-translate-y-4"
                style={{
                    width: dimensions.carWidth,
                    marginLeft: index === 0 ? 0 : dimensions.overlap,
                    zIndex: totalInRow - index
                }}
            >
                {/* Physical Car Image Container */}
                <div 
                    className="relative w-full z-10 transition-all duration-300"
                    onClick={() => setSelectedCar(car)}
                >
                    <img 
                        src="/hopper_car.png" 
                        alt="Hopper Car" 
                        className={`w-full h-auto object-contain relative transition-all duration-500 ${allMatch ? 'mix-blend-screen drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'drop-shadow-[0_0_20px_rgba(244,63,94,0.4)] group-hover:brightness-125'} `}
                    />
                    
                    {/* Painted Status Indicator (Car ID and Status) directly mapped to PNG texture */}
                    <div className="absolute top-[38%] left-[16%] z-20 pointer-events-none flex flex-col gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
                        <div className="text-zinc-200 font-mono text-xl md:text-2xl tracking-[0.1em] font-bold skew-x-[-3deg] drop-shadow-md">
                            {car.car_id}
                        </div>
                        <div className="border border-emerald-500/80 px-2 py-0.5 w-fit text-emerald-400 font-mono text-[9px] tracking-[0.2em] font-bold uppercase rounded shadow-[inset_0_0_10px_rgba(16,185,129,0.3)] bg-emerald-950/60 backdrop-blur-sm">
                            LOADED
                        </div>
                    </div>
                    
                    {/* Holographic API Data Card (Floating) */}
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-2 z-30 pointer-events-none">
                        <div className="absolute top-full left-1/2 w-px h-8 bg-gradient-to-b from-cyan-500/50 to-transparent"></div>
                        <div className={`p-2 rounded border backdrop-blur-md w-48 text-center shadow-2xl ${allMatch ? 'bg-emerald-950/80 border-emerald-500/50' : 'bg-rose-950/80 border-rose-500/50'} `}>
                            <div className="text-[10px] text-zinc-300 font-mono tracking-widest">{car.status.replace('_', ' ')}</div>
                            {allMatch ? (
                                <div className="text-emerald-400 text-[10px] font-mono mt-1 flex items-center justify-center gap-1.5 font-bold">
                                    <CheckCircle className="w-3.5 h-3.5" /> VERIFIED 100%
                                </div>
                            ) : (
                                <div className="text-rose-500 text-[10px] font-mono mt-1 flex items-center justify-center gap-1.5 animate-pulse font-bold">
                                    <ShieldAlert className="w-3.5 h-3.5" /> MISMATCH
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Inspect Prompt Overlay */}
                    <div className="absolute inset-x-0 bottom-[20%] flex items-center justify-center z-20 pointer-events-none">
                        <div className="opacity-0 group-hover:opacity-100 px-5 py-2 bg-black/95 backdrop-blur border border-white/20 text-white font-mono text-[10px] tracking-widest rounded-full transition-all duration-300 scale-95 group-hover:scale-100 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                            [ INSPECT 3D NDGI SEALS ]
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-black text-zinc-300 font-sans flex overflow-hidden">
            <GlobalNav />
            
            <div className="flex-1 flex flex-col h-screen relative">
                
                {/* 3-WAY HEADER */}
                <header className="px-8 py-6 border-b border-white/5 flex items-end justify-between shrink-0 bg-black/50 backdrop-blur-md z-40 relative">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-xl font-sans tracking-[0.15em] text-zinc-100 flex items-center gap-3 uppercase mb-2">
                            <TrainTrack className="w-5 h-5 text-cyan-500" />
                            Dispatch Fleet Command
                        </h1>
                        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 uppercase tracking-widest">
                            <span className="text-emerald-500/80">SELLER (ORIGIN)</span>
                            <span className="text-zinc-700">➔</span>
                            <span className="text-cyan-500/80">CMD CENTER</span>
                            <span className="text-rose-500/80">BUYER (DESTINATION)</span>
                        </div>
                    </div>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative w-64">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-zinc-500" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search Car ID..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-white/10 text-white text-xs font-mono rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
                        />
                    </div>
                </header>

                {/* MAIN YARD CONTENT */}
                <div className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black flex flex-col justify-center">
                    
                    {/* Ground grid aesthetic overlay */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>

                    {loading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-cyan-500 z-10">
                            <Activity className="w-8 h-8 animate-spin" />
                            <div className="text-xs font-mono tracking-[0.2em] uppercase animate-pulse drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">Syncing BNSF Logistics Data...</div>
                        </div>
                    ) : (
                        <div 
                            ref={containerRef}
                            className="w-full h-full relative z-10 select-none pb-12 pt-16 cursor-grab active:cursor-grabbing overflow-hidden"
                            onWheel={handleWheel}
                        >
                            
                            {/* Physical Tracks Wrapper (Draggable) */}
                            <motion.div 
                                ref={trackRef}
                                drag="x"
                                dragConstraints={dragConstraints}
                                dragElastic={0.1}
                                animate={{ x: panX }}
                                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                className="flex flex-col gap-28 min-w-max h-full justify-center px-12 md:px-32"
                                onDrag={(e, info) => setPanX(info.point.x)}
                            >
                            
                                {/* TRACK 1: TOP ROW */}
                                {/* Placed further back. No buggy scale distortion, just cleanly positioned. */}
                                <div className="flex items-end relative drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]">
                                    {/* Rail Bed Visual */}
                                    <div className="absolute bottom-[20%] left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
                                    <div className="absolute bottom-[18%] left-0 right-0 h-px bg-zinc-700/50 w-full mb-0.5"></div>
                                    <div className="absolute bottom-[22%] left-0 right-0 h-px bg-zinc-700/50 w-full"></div>
                                    {topRow.map((car, index) => renderCar(car, index, topRow.length))}
                                </div>
                                
                                {/* TRACK 2: BOTTOM ROW */}
                                {/* Identical scale, placed perfectly parallel below */}
                                <div className="flex items-end relative drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                    {/* Rail Bed Visual */}
                                    <div className="absolute bottom-[20%] left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-emerald-900/40 to-transparent drop-shadow-2xl"></div>
                                    <div className="absolute bottom-[18%] left-0 right-0 h-0.5 bg-zinc-600/50 w-full mb-1"></div>
                                    <div className="absolute bottom-[23%] left-0 right-0 h-0.5 bg-zinc-600/50 w-full"></div>
                                    {bottomRow.map((car, index) => renderCar(car, index, bottomRow.length))}
                                </div>

                            </motion.div>
                        </div>
                    )}
                </div>
            </div>

            {/* 3D Railcar Modal */}
            {selectedCar && (
                <RailcarModal car={selectedCar} onClose={() => setSelectedCar(null)} />
            )}
        </div>
    );
}

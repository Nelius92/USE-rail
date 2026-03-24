"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Map as MapGL, MapProvider } from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchIntel, forceScan, MarketTarget, MarketIntelResponse } from '../../lib/api';
import GlobalNav from '../../components/GlobalNav';
import {
    Crosshair, Radar, Activity, TrendingUp,
    TrendingDown, Zap, Satellite, ChevronRight,
    Phone, Globe, Train, MapPin, Calendar, X,
    ArrowRight, DollarSign, Truck, Clock, Info,
    AlertTriangle, CheckCircle2
} from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Campbell, MN — our origin elevator
const ORIGIN: [number, number] = [-96.4019, 46.0963];

const INITIAL_VIEW_STATE = {
    longitude: -96.4019,
    latitude: 40.5,
    zoom: 4.2,
    pitch: 45,
    bearing: -10,
};

// Haversine distance in miles
function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// BNSF shuttle constants
const BU_PER_CAR = 3989.3;
const LBS_PER_CAR = 223_400;

function ArbitrageMapContent() {
    const [intel, setIntel] = useState<MarketIntelResponse | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<MarketTarget | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState<string>('IDLE');
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

    useEffect(() => {
        fetchIntel()
            .then(data => setIntel(data))
            .catch(() => setIntel({ baseline: null, national_targets: [] }));
    }, []);

    const targets = useMemo(() => {
        if (!intel) return [];
        return intel.national_targets;
    }, [intel]);

    const handleForceScan = async () => {
        setIsScanning(true);
        setScanStatus('SCANNING');
        setSelectedTarget(null);

        setViewState({
            ...INITIAL_VIEW_STATE,
        });

        try {
            await forceScan();
            setScanStatus('EXTRACTING');
            await new Promise(resolve => setTimeout(resolve, 5000));
            setScanStatus('LOADING');
            const data = await fetchIntel();
            setIntel(data);
            setScanStatus('COMPLETE');
        } catch {
            setScanStatus('ERROR');
        } finally {
            setIsScanning(false);
            setTimeout(() => setScanStatus('IDLE'), 3000);
        }
    };

    const handleSelectTarget = useCallback((target: MarketTarget) => {
        setSelectedTarget(target);
        const midLon = (ORIGIN[0] + target.longitude) / 2;
        const midLat = (ORIGIN[1] + target.latitude) / 2;
        setViewState({
            longitude: midLon,
            latitude: midLat,
            zoom: 5,
            pitch: 55,
            bearing: -15,
        });
    }, []);

    // ── Deck.gl Layers ──────────────────────────────────────────
    const layers = useMemo(() => {
        const result: any[] = [];

        // Origin marker — Campbell, MN
        result.push(
            new ScatterplotLayer({
                id: 'origin-marker',
                data: [{ position: ORIGIN }],
                pickable: false,
                opacity: 1,
                stroked: true,
                filled: true,
                radiusMinPixels: 8,
                radiusMaxPixels: 12,
                getPosition: (d: any) => d.position,
                getRadius: 6000,
                getFillColor: [255, 255, 255, 200],
                getLineColor: [255, 255, 255, 80],
                lineWidthMinPixels: 3,
            }),
        );

        if (targets.length > 0) {
            // Target dots
            result.push(
                new ScatterplotLayer<MarketTarget>({
                    id: 'target-dots',
                    data: targets,
                    pickable: true,
                    opacity: 0.9,
                    stroked: true,
                    filled: true,
                    radiusMinPixels: 5,
                    radiusMaxPixels: 14,
                    getPosition: (d) => [d.longitude, d.latitude],
                    getRadius: (d) => {
                        const delta = d.latest_bid?.margin_delta ?? 0;
                        return 5000 + Math.abs(delta) * 20000;
                    },
                    getFillColor: (d) => {
                        const delta = d.latest_bid?.margin_delta ?? 0;
                        return delta > 0 ? [16, 185, 129, 200] : [244, 63, 94, 180];
                    },
                    getLineColor: [255, 255, 255, 30],
                    lineWidthMinPixels: 1,
                    onClick: (info) => info.object && handleSelectTarget(info.object),
                }),
            );

            // Faint arcs to all targets
            result.push(
                new ArcLayer<MarketTarget>({
                    id: 'all-arcs-faint',
                    data: targets.filter(t => t.latest_bid),
                    pickable: false,
                    getWidth: 1,
                    getHeight: 0.4,
                    getSourcePosition: () => ORIGIN,
                    getTargetPosition: (d) => [d.longitude, d.latitude],
                    getSourceColor: [255, 255, 255, 40],
                    getTargetColor: (d) => {
                        const delta = d.latest_bid?.margin_delta ?? 0;
                        return delta > 0 ? [16, 185, 129, 60] : [244, 63, 94, 40];
                    },
                }),
            );
        }

        // Selected target — glowing arc
        if (selectedTarget) {
            const delta = selectedTarget.latest_bid?.margin_delta ?? 0;
            result.push(
                new ArcLayer<MarketTarget>({
                    id: 'selected-arc-glow',
                    data: [selectedTarget],
                    pickable: false,
                    getWidth: 5,
                    getHeight: 0.5,
                    getSourcePosition: () => ORIGIN,
                    getTargetPosition: (d) => [d.longitude, d.latitude],
                    getSourceColor: [255, 255, 255, 255],
                    getTargetColor: delta > 0 ? [16, 185, 129, 255] : [244, 63, 94, 255],
                }),
            );
            result.push(
                new ScatterplotLayer({
                    id: 'selected-pulse',
                    data: [{ position: [selectedTarget.longitude, selectedTarget.latitude] }],
                    pickable: false,
                    opacity: 0.6,
                    stroked: true,
                    filled: false,
                    radiusMinPixels: 18,
                    radiusMaxPixels: 25,
                    getPosition: (d: any) => d.position,
                    getRadius: 15000,
                    getLineColor: delta > 0 ? [16, 185, 129, 180] : [244, 63, 94, 180],
                    lineWidthMinPixels: 2,
                }),
            );
        }

        return result;
    }, [targets, selectedTarget, handleSelectTarget]);

    // Tooltip
    const getTooltip = (info: any) => {
        if (!info.object || !info.object.name) return null;
        const t = info.object as MarketTarget;
        const bid = t.latest_bid;
        const delta = bid?.margin_delta ?? 0;

        return {
            html: `
                <div style="min-width:220px">
                    <div style="font-size:11px;font-weight:700;color:white;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:6px">
                        ${t.name}
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:10px;color:#71717a;margin-bottom:4px">
                        <span>Type</span><span style="color:#a1a1aa;font-family:monospace">${t.facility_type}</span>
                    </div>
                    ${bid ? `
                    <div style="display:flex;justify-content:space-between;font-size:10px;color:#71717a;margin-bottom:4px">
                        <span>Gross Bid</span><span style="color:#d4d4d8;font-family:monospace">$${bid.gross_bid.toFixed(2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:10px;color:#71717a;margin-bottom:4px">
                        <span>Freight</span><span style="color:#ef4444;font-family:monospace">-$${bid.calculated_freight.toFixed(2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px;margin-top:4px">
                        <span style="font-size:9px;color:#52525b;align-self:center">NET MARGIN</span>
                        <span style="font-size:16px;font-weight:700;color:${delta > 0 ? '#10b981' : '#f43f5e'};font-family:monospace">
                            ${delta > 0 ? '+' : ''}$${delta.toFixed(2)}/bu
                        </span>
                    </div>
                    ` : '<div style="font-size:10px;color:#52525b">No bid data</div>'}
                </div>
            `,
            style: {
                backgroundColor: 'rgba(0,0,0,0.92)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#a1a1aa',
                fontFamily: 'ui-monospace, monospace',
                borderRadius: '4px',
                padding: '12px',
            },
        };
    };

    const baselineBid = intel?.baseline?.latest_bid;

    return (
        <div className="w-full h-screen bg-black overflow-hidden flex">
            <GlobalNav />

            {/* LEFT SIDEBAR */}
            <div className="w-[380px] h-screen glass-panel flex flex-col flex-shrink-0 z-40 shadow-[4px_0_40px_rgba(0,0,0,0.5)]">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-2.5 mb-1">
                        <Crosshair className="w-4 h-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                        <h2 className="text-white text-sm tracking-[0.2em] font-medium uppercase font-sans">
                            Arbitrage Command
                        </h2>
                    </div>
                    <div className="text-[10px] text-zinc-600 tracking-[0.15em] uppercase">
                        BNSF Geospatial Intel / #2 Yellow Corn
                    </div>
                </div>

                {/* Baseline Card */}
                <div className="px-6 py-4 border-b border-white/[0.04]">
                    <div className="text-[9px] text-zinc-500 tracking-[0.2em] uppercase mb-2 flex items-center gap-1.5 font-sans font-medium">
                        <Satellite className="w-3 h-3" /> Hankinson Baseline
                    </div>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-inner">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-sans font-medium">Hankinson RE</div>
                                <div className="text-xs text-zinc-500 mt-0.5">Ethanol Plant / Baseline</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-white tabular-nums tracking-tight">
                                    {baselineBid ? `$${baselineBid.gross_bid.toFixed(2)}` : '---'}
                                </div>
                                <div className="text-[9px] text-zinc-500 uppercase tracking-widest">$/bu</div>
                            </div>
                        </div>
                        {baselineBid?.scraped_at && (
                            <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-zinc-700" />
                                <span className="text-[8px] text-zinc-600 tracking-wider uppercase">
                                    Verified: {new Date(baselineBid.scraped_at).toLocaleDateString()}
                                </span>
                                {(() => {
                                    const days = Math.floor((Date.now() - new Date(baselineBid.scraped_at).getTime()) / (1000*60*60*24));
                                    return days > 7 ? (
                                        <span className="text-[8px] text-amber-500 flex items-center gap-0.5 ml-auto">
                                            <AlertTriangle className="w-3 h-3" /> {days}d old
                                        </span>
                                    ) : (
                                        <span className="text-[8px] text-emerald-600 flex items-center gap-0.5 ml-auto">
                                            <CheckCircle2 className="w-3 h-3" /> Fresh
                                        </span>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Force Scan Button */}
                <div className="px-6 py-3 border-b border-white/[0.04]">
                    <button
                        onClick={handleForceScan}
                        disabled={isScanning}
                        className="w-full bg-cyan-950/20 hover:bg-cyan-900/40 text-cyan-400 tracking-[0.2em] uppercase py-3 border border-cyan-500/30 hover:border-cyan-400 transition-all text-xs flex items-center justify-center gap-2.5 rounded disabled:opacity-40 disabled:cursor-not-allowed glow-pulse"
                    >
                        {isScanning ? (
                            <><Activity className="w-4 h-4 animate-spin" /> Scanning Markets</>
                        ) : (
                            <><Radar className="w-4 h-4" /> Force Market Scan</>
                        )}
                    </button>
                </div>

                {/* Hitlist */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-3 border-b border-white/[0.04] flex items-center justify-between">
                        <div className="text-[9px] text-zinc-600 tracking-[0.2em] uppercase flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-cyan-500" /> National Targets
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-emerald-600 font-mono">
                                {targets.filter(t => (t.latest_bid?.margin_delta ?? 0) > 0).length} profitable
                            </span>
                            <span className="text-[8px] text-zinc-800">/</span>
                            <span className="text-[9px] text-zinc-700 font-mono">{targets.length} total</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {targets.length === 0 && !isScanning && (
                            <div className="px-6 py-8 text-center">
                                <div className="text-zinc-700 text-[10px] tracking-[0.15em] uppercase">
                                    No targets loaded
                                </div>
                                <div className="text-zinc-800 text-[9px] mt-1">
                                    Seed the database, then run Force Scan
                                </div>
                            </div>
                        )}

                        {targets.map(target => {
                            const isSelected = selectedTarget?.id === target.id;
                            const bid = target.latest_bid;
                            const delta = bid?.margin_delta ?? 0;
                            const isProfitable = delta > 0;

                            return (
                                <div
                                    key={target.id}
                                    onClick={() => handleSelectTarget(target)}
                                    className={`
                                        group relative px-6 py-3.5 cursor-pointer transition-all border-b border-white/[0.02]
                                        ${isSelected
                                            ? 'bg-white/[0.04] border-l-2 border-l-cyan-500'
                                            : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-zinc-100'}`}>
                                                {target.name}
                                            </div>
                                            <div className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">
                                                {target.facility_type}
                                            </div>
                                        </div>
                                        <div className="text-right ml-3 flex-shrink-0">
                                            {bid ? (
                                                <div className={`text-sm font-bold tabular-nums flex items-center gap-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-500'}`}>
                                                    {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {isProfitable ? '+' : ''}{delta.toFixed(2)}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-zinc-700">No bid</div>
                                            )}
                                        </div>
                                    </div>

                                    {bid && (
                                        <div className="flex gap-4 text-[9px] text-zinc-600">
                                            <span>Bid <span className="text-zinc-400">${bid.gross_bid.toFixed(2)}</span></span>
                                            <span>Frt <span className="text-rose-500/70">-${bid.calculated_freight.toFixed(2)}</span></span>
                                            <span>Net <span className="text-zinc-400">${bid.net_origin_price.toFixed(2)}</span></span>
                                        </div>
                                    )}

                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-4 h-4 text-cyan-500" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 text-[9px] text-zinc-500 tracking-[0.2em] uppercase flex justify-between font-sans">
                    <span className="font-semibold text-zinc-400">USE rail <span className="text-[7px] text-zinc-600 block mt-0.5 tracking-[0.3em]">Powered by Crop Intel</span></span>
                    <span className="text-right self-end">Campbell<br/><span className="text-zinc-600">MN</span></span>
                </div>
            </div>

            {/* MAP + DECK.GL */}
            <div className="flex-1 relative">
                <DeckGL
                    viewState={viewState}
                    onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
                    controller={true}
                    layers={layers}
                    getTooltip={getTooltip}
                >
                    <MapGL
                        mapboxAccessToken={MAPBOX_TOKEN}
                        mapStyle="mapbox://styles/mapbox/dark-v11"
                    />
                </DeckGL>

                {/* Scan Status Pill */}
                {scanStatus !== 'IDLE' && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
                        <div className={`px-5 py-2.5 rounded-full border font-sans font-medium text-[10px] tracking-[0.2em] uppercase flex items-center gap-2 backdrop-blur-xl shadow-lg
                            ${scanStatus === 'COMPLETE' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' :
                              scanStatus === 'ERROR' ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' :
                              'bg-white/10 border-white/30 text-white glow-pulse'}`}>
                            {scanStatus !== 'COMPLETE' && scanStatus !== 'ERROR' && <Activity className="w-3.5 h-3.5 animate-spin" />}
                            {scanStatus === 'SCANNING' && 'Firecrawl Extraction Active'}
                            {scanStatus === 'EXTRACTING' && 'Processing Live Bids'}
                            {scanStatus === 'LOADING' && 'Intel Pipeline Loading'}
                            {scanStatus === 'COMPLETE' && 'Scan Complete'}
                            {scanStatus === 'ERROR' && 'Scan Failed'}
                        </div>
                    </div>
                )}
            </div>

            {/* ── SELECTED TARGET DETAIL DRAWER ────────────────────── */}
            {selectedTarget && (() => {
                const bid = selectedTarget.latest_bid;
                const delta = bid?.margin_delta ?? 0;
                const isProfitable = delta > 0;
                const straightMiles = haversineMi(ORIGIN[1], ORIGIN[0], selectedTarget.latitude, selectedTarget.longitude);
                const railMiles = Math.round(straightMiles * 1.25);
                const transitDays = Math.max(2, Math.round(railMiles / 350));
                const ratePerCar = 1200 + railMiles * 2.65;
                const grossPerCarload = (bid?.gross_bid ?? 0) * BU_PER_CAR;
                const freightPerCarload = (bid?.calculated_freight ?? 0) * BU_PER_CAR;
                const netPerCarload = (bid?.net_origin_price ?? 0) * BU_PER_CAR;
                const profitPerCarload = delta * BU_PER_CAR;

                return (
                    <div className="absolute top-4 right-4 bottom-4 w-[360px] glass-panel rounded-2xl z-40 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Target Intel
                                    </div>
                                    <h3 className="text-sm font-bold text-white truncate">{selectedTarget.name}</h3>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                                        {selectedTarget.facility_type}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTarget(null)}
                                    className="text-zinc-600 hover:text-white transition-colors p-1 -mr-1 -mt-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Margin Hero */}
                            {bid && (
                                <div className={`mt-3 px-3 py-2.5 rounded border ${
                                    isProfitable
                                        ? 'bg-emerald-950/30 border-emerald-500/20'
                                        : 'bg-rose-950/30 border-rose-500/20'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Net Margin vs Hankinson</span>
                                        <span className={`text-lg font-bold font-mono tabular-nums ${
                                            isProfitable ? 'text-emerald-400' : 'text-rose-400'
                                        }`}>
                                            {isProfitable ? '+' : ''}${delta.toFixed(2)}/bu
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto">
                            {/* P&L Breakdown */}
                            {bid && (
                                <div className="px-5 py-4 border-b border-white/[0.04]">
                                    <div className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-3 flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" /> Per Bushel Breakdown
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Gross Bid</span>
                                            <span className="text-zinc-200 font-mono tabular-nums">${bid.gross_bid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">BNSF Freight</span>
                                            <span className="text-rose-500 font-mono tabular-nums">-${bid.calculated_freight.toFixed(2)}</span>
                                        </div>
                                        <div className="h-px bg-white/[0.06] my-1" />
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Net Origin</span>
                                            <span className="text-zinc-200 font-mono font-bold tabular-nums">${bid.net_origin_price.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Hankinson Baseline</span>
                                            <span className="text-cyan-400/60 font-mono tabular-nums">$3.95</span>
                                        </div>
                                        <div className="h-px bg-white/[0.06] my-1" />
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className={isProfitable ? 'text-emerald-500' : 'text-rose-500'}>Arbitrage Spread</span>
                                            <span className={`font-mono tabular-nums ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {isProfitable ? '+' : ''}${delta.toFixed(2)}/bu
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Per Carload Math */}
                            {bid && (
                                <div className="px-5 py-4 border-b border-white/[0.04]">
                                    <div className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-3 flex items-center gap-1">
                                        <Train className="w-3 h-3" /> Per Carload (223,400 lbs)
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Bushels/Car</span>
                                            <span className="text-zinc-300 font-mono tabular-nums">{BU_PER_CAR.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Gross Revenue</span>
                                            <span className="text-zinc-300 font-mono tabular-nums">${grossPerCarload.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Freight Cost</span>
                                            <span className="text-rose-500 font-mono tabular-nums">-${freightPerCarload.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="h-px bg-white/[0.06] my-1" />
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className={isProfitable ? 'text-emerald-500' : 'text-rose-500'}>
                                                {isProfitable ? 'Profit' : 'Loss'}/Car
                                            </span>
                                            <span className={`font-mono tabular-nums ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {isProfitable ? '+' : ''}${profitPerCarload.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Logistics */}
                            <div className="px-5 py-4 border-b border-white/[0.04]">
                                <div className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-3 flex items-center gap-1">
                                    <Truck className="w-3 h-3" /> Logistics
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">Straight-Line</span>
                                        <span className="text-zinc-300 font-mono tabular-nums">{Math.round(straightMiles).toLocaleString()} mi</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">Est. Rail Miles</span>
                                        <span className="text-zinc-300 font-mono tabular-nums">{railMiles.toLocaleString()} mi</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Est. Transit</span>
                                        <span className="text-zinc-300 font-mono tabular-nums">{transitDays} days</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">Est. Rate/Car</span>
                                        <span className="text-zinc-300 font-mono tabular-nums">${ratePerCar.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="px-5 py-4 border-b border-white/[0.04]">
                                <div className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-3 flex items-center gap-1">
                                    <Info className="w-3 h-3" /> Facility Info
                                </div>
                                <div className="space-y-2">
                                    {selectedTarget.phone && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <Phone className="w-3 h-3 text-zinc-600" />
                                            <a href={`tel:${selectedTarget.phone}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                                                {selectedTarget.phone}
                                            </a>
                                        </div>
                                    )}
                                    {selectedTarget.website && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <Globe className="w-3 h-3 text-zinc-600" />
                                            <a href={selectedTarget.website} target="_blank" rel="noopener noreferrer"
                                               className="text-cyan-400 hover:text-cyan-300 transition-colors truncate">
                                                {selectedTarget.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                            </a>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs">
                                        <MapPin className="w-3 h-3 text-zinc-600" />
                                        <span className="text-zinc-400">
                                            {selectedTarget.latitude.toFixed(4)}°N, {Math.abs(selectedTarget.longitude).toFixed(4)}°W
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Data Source */}
                            <div className="px-5 py-4">
                                <div className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-3 flex items-center gap-1">
                                    <Satellite className="w-3 h-3" /> Data Source
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        <span className="text-zinc-500">Bid: USDA AMS Regional Estimate</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                        <span className="text-zinc-500">Freight: BNSF Tariff 4022 (calibrated)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-zinc-500">Location: CropIntel Railway API</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

export default function ArbitrageMap() {
    return (
        <MapProvider>
            <ArbitrageMapContent />
        </MapProvider>
    );
}

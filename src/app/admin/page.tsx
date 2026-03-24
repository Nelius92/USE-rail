"use client";

import React, { useState, useEffect } from 'react';
import { getBins, getCommodities, createSpotCar, createScaleTicket, dispatchSpotCar, broadcastTender, fetchDailyTargets, fetchNeighbors, fetchDashboard360, Bin, Commodity, DailyTarget, Neighbor, Dashboard360Response } from '../../lib/api';
import NDGIScanner from '../../components/NDGIScanner';
import GlobalNav from '../../components/GlobalNav';
import Link from 'next/link';
import { Plus, Truck, Train, Radio, X, Map, Target, TrendingUp, Activity, ArrowUpRight } from 'lucide-react';

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
        <div className="min-h-screen bg-[#000000] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.03] via-black to-black text-zinc-300 font-sans flex flex-col md:flex-row relative">
            <GlobalNav />
            {/* TOASTS */}
            {toastError && (
                <div className="fixed top-6 right-6 z-50 glass-panel border-none bg-rose-500/10 text-rose-400 px-5 py-3.5 rounded-2xl flex items-center gap-3 text-sm font-sans shadow-lg font-medium backdrop-blur-xl">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>{toastError}
                </div>
            )}
            {toastSuccess && (
                <div className="fixed top-6 right-6 z-50 glass-panel border-none bg-emerald-500/10 text-emerald-400 px-5 py-3.5 rounded-2xl flex items-center gap-3 text-sm font-sans shadow-lg font-medium backdrop-blur-xl">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>{toastSuccess}
                </div>
            )}

            {/* MAIN COLUMN */}
            <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">

                {/* HEADER */}
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-6 gap-4">
                    <h1 className="text-xl font-sans tracking-[0.15em] text-white flex items-center gap-3 uppercase font-semibold">
                        <span className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,1)]"></span>
                        USE rail Command Center
                    </h1>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setIsInboundModalOpen(true)}
                            className="flex-1 sm:flex-none glass-panel hover:bg-white/10 text-zinc-300 hover:text-white font-sans uppercase tracking-widest px-5 py-3 rounded-full text-xs flex items-center justify-center gap-2.5 transition-all shadow-md"
                        >
                            <Truck className="w-4 h-4" />
                            Inbound Ticket
                        </button>
                        <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-400 glass-panel px-4 py-3 rounded-full border border-white/5 font-medium tracking-widest">
                            <Activity className="w-3.5 h-3.5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                            <span className="text-zinc-200 uppercase">ONLINE</span>
                        </div>
                    </div>
                </header>

                {/* 360 DASHBOARD KPI CARDS */}
                {dashboard360 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Facility Utilization */}
                        <div className="glass-panel border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-white/20 transition-all hover:bg-white/[0.02]">
                            <div className="text-[10px] text-zinc-500 font-sans tracking-widest uppercase mb-1">Facility Utilization</div>
                            <div className="text-2xl font-sans text-white font-semibold flex items-baseline gap-1">
                                {dashboard360.facility_utilization.utilization_pct}% <span className="text-xs text-zinc-500 font-normal">Cap</span>
                            </div>
                            <div className="text-xs text-zinc-400 mt-2 font-mono">
                                {Math.round(dashboard360.facility_utilization.utilized_capacity_bushels).toLocaleString()} / {Math.round(dashboard360.facility_utilization.total_capacity_bushels).toLocaleString()} bu
                            </div>
                            <div className="absolute top-5 right-5 text-zinc-700 group-hover:text-blue-500 transition-colors">
                                <Activity className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Today Inbound */}
                        <div className="glass-panel border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-white/20 transition-all hover:bg-white/[0.02]">
                            <div className="text-[10px] text-zinc-500 font-sans tracking-widest uppercase mb-1">Today's Inbound</div>
                            <div className="text-2xl font-sans text-white font-semibold flex items-baseline gap-1">
                                {dashboard360.today_inbound.ticket_count} <span className="text-xs text-zinc-500 font-normal">Trucks</span>
                            </div>
                            <div className="text-xs text-zinc-400 mt-2 font-mono">
                                {Math.round(dashboard360.today_inbound.total_bushels).toLocaleString()} bu Net
                            </div>
                            <div className="absolute top-5 right-5 text-zinc-700 group-hover:text-emerald-500 transition-colors">
                                <Truck className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Active Outbound */}
                        <div className="glass-panel border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-white/20 transition-all hover:bg-white/[0.02]">
                            <div className="text-[10px] text-zinc-500 font-sans tracking-widest uppercase mb-1">Active Outbound</div>
                            <div className="text-2xl font-sans text-white font-semibold flex items-baseline gap-1">
                                {dashboard360.active_outbound.active_cars_count} <span className="text-xs text-zinc-500 font-normal">Spot Cars</span>
                            </div>
                            <div className="text-xs text-zinc-400 mt-2 font-mono">
                                En Route / Loading
                            </div>
                            <div className="absolute top-5 right-5 text-zinc-700 group-hover:text-amber-500 transition-colors">
                                <Train className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Best Arbitrage Pulse */}
                        <div className="glass-panel border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-white/20 transition-all hover:bg-white/[0.02]">
                            <div className="text-[10px] text-zinc-500 font-sans tracking-widest uppercase mb-1">Best Arbitrage Pulse</div>
                            <div className={`text-2xl font-sans font-semibold flex items-baseline gap-1 ${dailyTargets.length > 0 && dailyTargets[0].profit_delta > 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                {dailyTargets.length > 0 && dailyTargets[0].profit_delta > 0 ? '+' : ''}
                                {dailyTargets.length > 0 ? dailyTargets[0].profit_delta.toFixed(2) : '0.00'} <span className="text-xs text-zinc-500 font-normal">/bu margin</span>
                            </div>
                            <div className="text-xs text-zinc-400 mt-2 font-mono truncate">
                                {dailyTargets.length > 0 ? dailyTargets[0].buyer_name : 'No Targets Found'}
                            </div>
                            <div className="absolute top-5 right-5 text-zinc-700 group-hover:text-emerald-400 transition-colors">
                                <Target className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                )}

                {/* NDGI SCANNER */}
                <NDGIScanner />

                {/* MAP LINK CARD */}
                <Link href="/map" className="group block">
                    <div className="h-44 w-full glass-panel rounded-2xl flex items-center justify-center relative overflow-hidden transition-all duration-500 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] hover:border-white/20">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50 group-hover:scale-105 transition-transform duration-700"></div>
                        <div className="flex items-center gap-5 z-10 backdrop-blur-md bg-black/20 px-8 py-5 rounded-2xl border border-white/10">
                            <Map className="w-6 h-6 text-white drop-shadow-md" />
                            <div>
                                <div className="text-zinc-400 group-hover:text-zinc-200 font-sans text-sm tracking-widest uppercase transition-colors">Arbitrage Map</div>
                                <div className="text-zinc-600 text-[10px] tracking-widest uppercase mt-0.5">3D Tactical Engine</div>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-zinc-700 group-hover:text-blue-500 transition-colors ml-4" />
                        </div>
                    </div>
                </Link>

                {/* 12-BIN DASHBOARD */}
                <div>
                    <h2 className="text-[11px] font-sans font-medium text-zinc-400 mb-5 tracking-[0.2em] uppercase border-b border-white/5 pb-4 flex justify-between items-center">
                        <span>Terminal Elevator Volumes</span>
                        <span className="flex items-center gap-2">
                            {loadingBins ? (
                                <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse"></span>
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
                            )}
                        </span>
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {loadingBins ? (
                            Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="bg-zinc-900/50 border border-white/5 rounded p-3 flex flex-col h-48 animate-pulse">
                                    <div className="h-3 bg-zinc-800 rounded w-1/2 mb-2"></div>
                                    <div className="h-2 bg-zinc-800 rounded w-3/4 mb-3"></div>
                                    <div className="flex-1 bg-zinc-950 rounded"></div>
                                </div>
                            ))
                        ) : bins.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-zinc-600 text-xs tracking-widest uppercase">No bins configured</div>
                        ) : (
                            bins.map((bin) => {
                                const maxCap = bin.capacity_bushels || 83333;
                                const fillPct = Math.min(100, Math.max(0, (bin.current_volume_bushels / maxCap) * 100));
                                const isEmpty = bin.current_volume_bushels === 0 || !bin.current_commodity;

                                return (
                                    <div key={bin.id} className="glass-panel border-white/10 rounded-2xl p-4 flex flex-col h-48 group hover:border-white/20 transition-all hover:bg-white/[0.02]">
                                        <div className="mb-2">
                                            <div className="text-white font-sans font-medium text-sm">Bin {bin.bin_number}</div>
                                            <div className={`text-[10px] uppercase tracking-widest mt-0.5 font-medium ${isEmpty ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                {isEmpty ? "Empty" : bin.current_commodity?.name}
                                            </div>
                                        </div>

                                        {/* Progress bar container */}
                                        <div className="flex-1 flex items-end relative bg-black/40 rounded-lg overflow-hidden border border-white/5 shadow-inner">
                                            {!isEmpty && (
                                                <div
                                                    className="w-full bg-white/80 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                                    style={{ height: `${fillPct}%` }}
                                                />
                                            )}
                                        </div>

                                        <div className="mt-3 text-right">
                                            <div className="text-xs font-sans font-semibold tracking-tight text-white">
                                                {bin.current_volume_bushels > 0 ? Math.round(bin.current_volume_bushels).toLocaleString() : "0"} <span className="text-zinc-500 font-normal">bu</span>
                                            </div>
                                            <div className="text-[10px] font-sans font-medium text-zinc-500">
                                                {fillPct.toFixed(0)}%
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* COMMAND PANEL */}
                <div className="border-t border-white/5 pt-6">
                    <h2 className="text-xs font-sans text-zinc-500 mb-4 tracking-widest uppercase">Spot Car Commands</h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => setIsDispatchModalOpen(true)}
                            className="flex-1 bg-zinc-900/50 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-200 py-5 px-4 rounded transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2.5"
                        >
                            <Train className="w-4 h-4" />
                            Dispatch Spot Car
                        </button>
                        <button
                            onClick={handleFlashTender}
                            disabled={isRadarScanning}
                            className={`flex-1 border py-5 px-4 rounded transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2.5 ${isRadarScanning ? 'bg-zinc-900/50 border-white/5 text-zinc-600' : 'bg-zinc-900/50 border-white/5 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400'}`}
                        >
                            {isRadarScanning ? (
                                <span className="flex items-center gap-2 animate-pulse">
                                    <Radio className="w-4 h-4" />
                                    Broadcasting...
                                </span>
                            ) : (
                                <>
                                    <Radio className="w-4 h-4" />
                                    Flash Tender
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDEBAR - 6AM SCOUT */}
            <div className="w-full md:w-[360px] glass-panel border-r-0 border-y-0 border-l border-white/10 p-7 flex flex-col gap-6 shadow-[-10px_0_40px_rgba(0,0,0,0.5)] z-40">

                <div className="text-[10px] text-zinc-600 border-b border-white/5 pb-3 flex justify-between tracking-widest uppercase">
                    <span>Date</span>
                    <span className="text-zinc-400 font-mono">{new Date().toISOString().split('T')[0]}</span>
                </div>

                <div>
                    <h3 className="text-xs font-sans font-medium text-white tracking-[0.15em] uppercase flex items-center gap-2.5 mb-5">
                        <TrendingUp className="w-4 h-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                        06:00 AM Scout
                    </h3>
                    <div className="text-[10px] text-zinc-500 tracking-[0.2em] font-medium uppercase mb-4">Top Arbitrage Targets</div>

                    <div className="flex flex-col gap-1">
                        {dailyTargets.map((t, i) => (
                            <div key={i} className="flex items-center gap-3 py-2.5 px-2 rounded hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-white/5 group">
                                <Target className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-zinc-300 text-xs font-mono truncate">{t.buyer_name}</div>
                                    <div className="text-zinc-600 text-[10px] tracking-widest uppercase">{t.region} / {t.commodity}</div>
                                </div>
                                <div className={`font-mono text-sm font-semibold whitespace-nowrap ${t.profit_delta > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {t.profit_delta > 0 ? '+' : ''}{t.profit_delta.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-white/5 pt-4 flex flex-col gap-2.5 mt-auto">
                    <button
                        onClick={() => setIsSpotCarModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 text-zinc-400 hover:text-blue-400 py-3 px-4 rounded transition-all uppercase tracking-widest text-[10px]"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Spot Car
                    </button>
                    <Link href="/map" className="w-full flex items-center justify-center gap-2 bg-zinc-900/50 border border-white/5 hover:border-emerald-500/30 text-zinc-400 hover:text-emerald-400 py-3 px-4 rounded transition-all uppercase tracking-widest text-[10px]">
                        <Map className="w-3.5 h-3.5" />
                        Arbitrage Map
                    </Link>
                </div>
            </div>

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
    );
}

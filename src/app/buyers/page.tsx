"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    fetchIntel, executeContract,
    MarketTarget, MarketIntelResponse, ExecuteContractResponse,
} from '../../lib/api';
import GlobalNav from '../../components/GlobalNav';
import {
    Users, Search, TrendingUp, TrendingDown, Zap,
    X, FileText, Loader2, CheckCircle2, ChevronRight,
    Shield, Truck, DollarSign,
} from 'lucide-react';

// BNSF hopper constants for live calculation
const WEIGHT_PER_CAR = 223_400;
const LBS_PER_BUSHEL = 56;

export default function BuyersPage() {
    const [intel, setIntel] = useState<MarketIntelResponse | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Execution modal state
    const [modalTarget, setModalTarget] = useState<MarketTarget | null>(null);
    const [numRailcars, setNumRailcars] = useState(1);
    const [isExecuting, setIsExecuting] = useState(false);
    const [execResult, setExecResult] = useState<ExecuteContractResponse | null>(null);
    const [execError, setExecError] = useState<string | null>(null);
    const [showEbol, setShowEbol] = useState(false);

    useEffect(() => {
        fetchIntel()
            .then(data => setIntel(data))
            .catch(() => setIntel({ baseline: null, national_targets: [] }));
    }, []);

    // Combine baseline + national for the CRM table
    const allTargets = useMemo(() => {
        if (!intel) return [];
        const targets: MarketTarget[] = [];
        if (intel.baseline) targets.push(intel.baseline);
        targets.push(...intel.national_targets);
        return targets;
    }, [intel]);

    const filtered = useMemo(() => {
        if (!searchTerm) return allTargets;
        const q = searchTerm.toLowerCase();
        return allTargets.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.facility_type.toLowerCase().includes(q)
        );
    }, [allTargets, searchTerm]);

    const profitableCount = allTargets.filter(t => (t.latest_bid?.margin_delta ?? 0) > 0).length;
    const baselineBid = intel?.baseline?.latest_bid?.gross_bid;

    // ── Live math for modal ───────────────────────────────────────
    const totalWeight = numRailcars * WEIGHT_PER_CAR;
    const totalBushels = totalWeight / LBS_PER_BUSHEL;
    const grossValue = modalTarget?.latest_bid
        ? totalBushels * modalTarget.latest_bid.gross_bid
        : 0;
    const freightCost = modalTarget?.latest_bid
        ? totalBushels * modalTarget.latest_bid.calculated_freight
        : 0;
    const netValue = grossValue - freightCost;

    const openModal = (target: MarketTarget) => {
        setModalTarget(target);
        setNumRailcars(1);
        setExecResult(null);
        setExecError(null);
        setShowEbol(false);
    };

    const closeModal = () => {
        setModalTarget(null);
        setExecResult(null);
        setExecError(null);
        setShowEbol(false);
    };

    const handleExecute = async () => {
        if (!modalTarget) return;
        setIsExecuting(true);
        setExecError(null);

        try {
            const result = await executeContract(modalTarget.id, numRailcars);
            setExecResult(result);
        } catch (err: any) {
            setExecError(err.message || 'Execution failed');
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-black flex">
            <GlobalNav />

            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="px-8 pt-8 pb-4 border-b border-white/[0.04]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-cyan-500" />
                            <h1 className="text-zinc-100 text-lg tracking-[0.15em] uppercase">
                                National Buyer CRM
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-[10px] text-zinc-500 tracking-[0.15em] uppercase font-mono">
                                {profitableCount > 0 ? (
                                    <span className="text-emerald-400">{profitableCount} profitable</span>
                                ) : (
                                    <span>0 profitable</span>
                                )}
                                {' / '}
                                {allTargets.length} targets
                            </div>
                            {baselineBid && (
                                <div className="px-3 py-1.5 rounded border border-white/[0.06] bg-zinc-950">
                                    <span className="text-[9px] text-zinc-600 uppercase tracking-widest mr-2">Base</span>
                                    <span className="text-sm text-cyan-400 font-bold tabular-nums">${baselineBid.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                        <input
                            type="text"
                            placeholder="Filter targets..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-950 border border-white/[0.06] rounded pl-9 pr-4 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-cyan-500/30 transition-colors font-mono"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.04]">
                                {['Facility', 'Type', 'Gross Bid', 'BNSF Freight', 'Net Origin', 'Margin', 'Action'].map(h => (
                                    <th
                                        key={h}
                                        className="px-6 py-3 text-left text-[9px] text-zinc-600 tracking-[0.2em] uppercase font-normal"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(target => {
                                const bid = target.latest_bid;
                                const delta = bid?.margin_delta ?? 0;
                                const isProfitable = delta > 0;
                                const isBaseline = target.is_hankinson_baseline;

                                return (
                                    <tr
                                        key={target.id}
                                        className={`border-b border-white/[0.02] transition-colors hover:bg-white/[0.02] ${isBaseline ? 'bg-cyan-950/10' : ''}`}
                                    >
                                        <td className="px-6 py-3.5">
                                            <div className="text-xs text-zinc-200 font-bold">{target.name}</div>
                                            {target.phone && (
                                                <div className="text-[9px] text-zinc-600 mt-0.5">{target.phone}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-widest ${isBaseline
                                                    ? 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20'
                                                    : 'text-zinc-500 border-white/[0.06] bg-zinc-950/50'
                                                }`}>
                                                {target.facility_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 tabular-nums text-sm text-zinc-300 font-mono">
                                            {bid ? `$${bid.gross_bid.toFixed(2)}` : '---'}
                                        </td>
                                        <td className="px-6 py-3.5 tabular-nums text-sm text-rose-500/80 font-mono">
                                            {bid && !isBaseline ? `-$${bid.calculated_freight.toFixed(2)}` : isBaseline ? '---' : '---'}
                                        </td>
                                        <td className="px-6 py-3.5 tabular-nums text-sm text-zinc-300 font-mono">
                                            {bid ? `$${bid.net_origin_price.toFixed(2)}` : '---'}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            {bid && !isBaseline ? (
                                                <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${isProfitable ? 'text-emerald-400' : 'text-rose-500'}`}>
                                                    {isProfitable ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                                    {isProfitable ? '+' : ''}{delta.toFixed(2)}
                                                </div>
                                            ) : isBaseline ? (
                                                <span className="text-[10px] text-cyan-500 tracking-widest uppercase">Baseline</span>
                                            ) : (
                                                <span className="text-zinc-700 text-[10px]">---</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            {!isBaseline && bid && (
                                                <button
                                                    onClick={() => openModal(target)}
                                                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/40 hover:border-cyan-400 text-cyan-400 text-[10px] tracking-[0.15em] uppercase transition-all"
                                                >
                                                    <Zap className="w-3 h-3" />
                                                    Execute
                                                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filtered.length === 0 && (
                        <div className="px-8 py-12 text-center text-zinc-700 text-xs tracking-widest uppercase">
                            No matching targets
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════ EXECUTION MODAL ═══════════════════ */}
            {modalTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />

                    {/* Modal */}
                    <div className="relative z-10 w-[560px] max-h-[90vh] overflow-y-auto bg-black/95 border border-white/[0.08] rounded-lg shadow-[0_0_80px_rgba(6,182,212,0.08)]">

                        {/* Close */}
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {!execResult ? (
                            <>
                                {/* Header */}
                                <div className="px-8 pt-8 pb-5 border-b border-white/[0.04]">
                                    <div className="text-[9px] text-cyan-500 tracking-[0.25em] uppercase mb-2 flex items-center gap-1.5">
                                        <Zap className="w-3 h-3" /> Contract Execution
                                    </div>
                                    <h3 className="text-zinc-100 text-lg font-bold">{modalTarget.name}</h3>
                                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">
                                        {modalTarget.facility_type} / #2 Yellow Corn
                                    </div>
                                </div>

                                {/* Bid Summary */}
                                <div className="px-8 py-4 border-b border-white/[0.04]">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-zinc-950 border border-white/[0.06] rounded p-3 text-center">
                                            <div className="text-[8px] text-zinc-600 uppercase tracking-widest mb-1">Gross Bid</div>
                                            <div className="text-lg font-bold text-zinc-200 tabular-nums font-mono">
                                                ${modalTarget.latest_bid?.gross_bid.toFixed(2)}
                                            </div>
                                            <div className="text-[8px] text-zinc-700">$/bu</div>
                                        </div>
                                        <div className="bg-zinc-950 border border-white/[0.06] rounded p-3 text-center">
                                            <div className="text-[8px] text-zinc-600 uppercase tracking-widest mb-1">Freight</div>
                                            <div className="text-lg font-bold text-rose-500 tabular-nums font-mono">
                                                -${modalTarget.latest_bid?.calculated_freight.toFixed(2)}
                                            </div>
                                            <div className="text-[8px] text-zinc-700">$/bu</div>
                                        </div>
                                        <div className="bg-zinc-950 border border-white/[0.06] rounded p-3 text-center">
                                            <div className="text-[8px] text-zinc-600 uppercase tracking-widest mb-1">Net Origin</div>
                                            <div className={`text-lg font-bold tabular-nums font-mono ${(modalTarget.latest_bid?.margin_delta ?? 0) > 0 ? 'text-emerald-400' : 'text-zinc-200'}`}>
                                                ${modalTarget.latest_bid?.net_origin_price.toFixed(2)}
                                            </div>
                                            <div className="text-[8px] text-zinc-700">$/bu</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Railcar Input */}
                                <div className="px-8 py-5 border-b border-white/[0.04]">
                                    <label className="text-[9px] text-zinc-500 tracking-[0.2em] uppercase block mb-2">
                                        Number of Railcars (BNSF Covered Hopper)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setNumRailcars(Math.max(1, numRailcars - 1))}
                                            className="w-10 h-10 rounded border border-white/[0.08] bg-zinc-950 text-zinc-400 hover:text-white hover:border-cyan-500/30 transition-all text-lg font-bold"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={numRailcars}
                                            onChange={e => setNumRailcars(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                            className="w-20 h-10 bg-zinc-950 border border-white/[0.08] rounded text-center text-xl font-bold text-cyan-400 tabular-nums font-mono outline-none focus:border-cyan-500/40"
                                        />
                                        <button
                                            onClick={() => setNumRailcars(Math.min(100, numRailcars + 1))}
                                            className="w-10 h-10 rounded border border-white/[0.08] bg-zinc-950 text-zinc-400 hover:text-white hover:border-cyan-500/30 transition-all text-lg font-bold"
                                        >
                                            +
                                        </button>
                                        <div className="text-[9px] text-zinc-600 ml-2">
                                            223,400 lbs / car
                                        </div>
                                    </div>
                                </div>

                                {/* Live Calculation */}
                                <div className="px-8 py-5 border-b border-white/[0.04]">
                                    <div className="text-[9px] text-zinc-600 tracking-[0.2em] uppercase mb-3">
                                        Contract Calculation
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Total Weight</span>
                                            <span className="text-zinc-300 tabular-nums font-mono">
                                                {totalWeight.toLocaleString()} lbs
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Total Bushels</span>
                                            <span className="text-zinc-300 tabular-nums font-mono">
                                                {totalBushels.toLocaleString(undefined, { maximumFractionDigits: 2 })} bu
                                            </span>
                                        </div>
                                        <div className="h-px bg-white/[0.04] my-1" />
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">Gross Contract Value</span>
                                            <span className="text-zinc-200 tabular-nums font-mono font-bold">
                                                ${grossValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500">BNSF Freight Cost</span>
                                            <span className="text-rose-500 tabular-nums font-mono">
                                                -${freightCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="h-px bg-white/[0.04] my-1" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Net Contract Value</span>
                                            <span className={`text-xl font-bold tabular-nums font-mono ${netValue > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                                ${netValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-zinc-600">
                                            <span>50% Escrow at Origin</span>
                                            <span className="tabular-nums font-mono">
                                                ${(netValue / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-zinc-600">
                                            <span>50% Escrow at Destination</span>
                                            <span className="tabular-nums font-mono">
                                                ${(netValue / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Execute Button */}
                                <div className="px-8 py-6">
                                    {execError && (
                                        <div className="mb-4 px-4 py-2 rounded border border-rose-500/30 bg-rose-950/20 text-rose-400 text-xs font-mono">
                                            {execError}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleExecute}
                                        disabled={isExecuting}
                                        className="w-full py-4 rounded border border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-900/30 hover:border-cyan-400 text-cyan-400 tracking-[0.2em] uppercase text-sm font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed glow-pulse"
                                    >
                                        {isExecuting ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Transmitting eBOL...</>
                                        ) : (
                                            <><FileText className="w-5 h-5" /> Transmit eBOL & Generate Escrow</>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* ═══════ SUCCESS STATE ═══════ */
                            <>
                                <div className="px-8 pt-8 pb-5 border-b border-white/[0.04]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        <span className="text-[10px] text-emerald-400 tracking-[0.25em] uppercase">
                                            Contract Executed
                                        </span>
                                    </div>
                                    <h3 className="text-zinc-100 text-lg font-bold">{execResult.contract.buyer_name}</h3>
                                    <div className="text-[9px] text-zinc-600 font-mono mt-1">
                                        ID: {execResult.contract.id}
                                    </div>
                                </div>

                                {/* Contract Summary */}
                                <div className="px-8 py-4 border-b border-white/[0.04]">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-zinc-950 border border-white/[0.06] rounded p-3 text-center">
                                            <Truck className="w-4 h-4 text-zinc-600 mx-auto mb-1" />
                                            <div className="text-sm font-bold text-zinc-200 tabular-nums font-mono">
                                                {execResult.contract.num_railcars}
                                            </div>
                                            <div className="text-[8px] text-zinc-600 uppercase">Railcars</div>
                                        </div>
                                        <div className="bg-zinc-950 border border-white/[0.06] rounded p-3 text-center">
                                            <DollarSign className="w-4 h-4 text-zinc-600 mx-auto mb-1" />
                                            <div className="text-sm font-bold text-emerald-400 tabular-nums font-mono">
                                                ${execResult.contract.net_contract_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-[8px] text-zinc-600 uppercase">Net Value</div>
                                        </div>
                                        <div className="bg-zinc-950 border border-white/[0.06] rounded p-3 text-center">
                                            <Shield className="w-4 h-4 text-zinc-600 mx-auto mb-1" />
                                            <div className="text-sm font-bold text-zinc-200 tabular-nums font-mono">
                                                {execResult.contract.total_bushels.toLocaleString()} bu
                                            </div>
                                            <div className="text-[8px] text-zinc-600 uppercase">Total Volume</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Escrow Invoices */}
                                <div className="px-8 py-4 border-b border-white/[0.04]">
                                    <div className="text-[9px] text-zinc-600 tracking-[0.2em] uppercase mb-3">
                                        Escrow Invoices (50/50 Split)
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center bg-zinc-950 border border-white/[0.06] rounded px-4 py-3">
                                            <div>
                                                <div className="text-[10px] text-cyan-400 uppercase tracking-widest">Origin</div>
                                                <div className="text-[9px] text-zinc-600 mt-0.5">{execResult.escrow.origin.description}</div>
                                            </div>
                                            <div className="text-lg font-bold text-zinc-200 tabular-nums font-mono">
                                                ${execResult.escrow.origin.amount_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center bg-zinc-950 border border-white/[0.06] rounded px-4 py-3">
                                            <div>
                                                <div className="text-[10px] text-emerald-400 uppercase tracking-widest">Destination</div>
                                                <div className="text-[9px] text-zinc-600 mt-0.5">{execResult.escrow.destination.description}</div>
                                            </div>
                                            <div className="text-lg font-bold text-zinc-200 tabular-nums font-mono">
                                                ${execResult.escrow.destination.amount_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* eBOL Toggle */}
                                <div className="px-8 py-4 border-b border-white/[0.04]">
                                    <button
                                        onClick={() => setShowEbol(!showEbol)}
                                        className="text-[10px] text-cyan-500 hover:text-cyan-400 tracking-[0.2em] uppercase flex items-center gap-1.5 transition-colors"
                                    >
                                        <FileText className="w-3 h-3" />
                                        {showEbol ? 'Hide' : 'View'} BNSF eBOL Payload
                                    </button>
                                    {showEbol && (
                                        <pre className="mt-3 p-4 bg-zinc-950 border border-white/[0.06] rounded text-[10px] text-zinc-400 overflow-x-auto font-mono max-h-60 overflow-y-auto">
                                            {JSON.stringify(execResult.ebol, null, 2)}
                                        </pre>
                                    )}
                                </div>

                                {/* Close */}
                                <div className="px-8 py-5">
                                    <button
                                        onClick={closeModal}
                                        className="w-full py-3 rounded border border-white/[0.08] bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs tracking-[0.2em] uppercase transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

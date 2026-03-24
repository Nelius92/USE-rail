"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    MapPin, Search, Package, Truck, CheckCircle, Clock,
    AlertTriangle, Building2, FileText, Phone,
    User, ShieldCheck, Loader2, MessageCircle, Send
} from 'lucide-react';
import {
    TransloadOrder, TransloadOrderStatus,
    getTransloadOrders, getTransloadOrderById,
    updateTransloadOrderStatus, seedDemoTransloadOrders, addOrderNote
} from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'text-amber-400 border-amber-500/30',
    RECEIVED: 'text-blue-400 border-blue-500/30',
    TRANSLOADING: 'text-cyan-400 border-cyan-500/30',
    LOADED: 'text-emerald-400 border-emerald-500/30',
    LAST_MILE_DISPATCHED: 'text-violet-400 border-violet-500/30',
    IN_TRANSIT: 'text-blue-400 border-blue-500/30',
    ARRIVED: 'text-teal-400 border-teal-500/30',
    DELIVERED: 'text-emerald-400 border-emerald-500/30',
};

const PROGRESS_STEPS: { key: TransloadOrderStatus; label: string; description: string }[] = [
    { key: 'PENDING', label: 'Order Received', description: 'Your transload order has been received and is awaiting review.' },
    { key: 'RECEIVED', label: 'Confirmed', description: 'The Campbell facility has reviewed and confirmed your order.' },
    { key: 'TRANSLOADING', label: 'Transloading', description: 'Grain is being loaded from bins into railcars at the facility.' },
    { key: 'LOADED', label: 'Cars Loaded', description: 'All railcars have been loaded and sealed. Ready for dispatch.' },
    { key: 'LAST_MILE_DISPATCHED', label: 'Truck Dispatched', description: 'A truck has been assigned and dispatched for last-mile delivery.' },
    { key: 'IN_TRANSIT', label: 'In Transit', description: 'Your shipment is on the road heading to your facility.' },
    { key: 'ARRIVED', label: 'Arrived', description: 'The truck has arrived! Please confirm receipt of the delivery.' },
    { key: 'DELIVERED', label: 'Delivered', description: 'Delivery confirmed. Order complete!' },
];

function getStepIcon(status: string, className: string) {
    switch (status) {
        case 'PENDING': return <Clock className={className} />;
        case 'RECEIVED': case 'DELIVERED': return <CheckCircle className={className} />;
        case 'TRANSLOADING': case 'LOADED': return <Package className={className} />;
        case 'LAST_MILE_DISPATCHED': case 'IN_TRANSIT': return <Truck className={className} />;
        case 'ARRIVED': return <MapPin className={className} />;
        default: return <Clock className={className} />;
    }
}

const STATUS_ORDER_MAP: Record<TransloadOrderStatus, number> = {
    PENDING: 0, RECEIVED: 1, TRANSLOADING: 2, LOADED: 3,
    LAST_MILE_DISPATCHED: 4, IN_TRANSIT: 5, ARRIVED: 6, DELIVERED: 7,
};

const NOTE_AUTHOR_STYLES: Record<string, { bg: string; icon: string }> = {
    dealer: { bg: 'bg-amber-500/10 border-amber-500/20', icon: '🏢' },
    command: { bg: 'bg-cyan-500/10 border-cyan-500/20', icon: '⚡' },
    destination: { bg: 'bg-emerald-500/10 border-emerald-500/20', icon: '📍' },
};

// ETA Countdown
function ETACountdown({ eta }: { eta: string }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const update = () => {
            const diff = new Date(eta).getTime() - Date.now();
            if (diff <= 0) { setTimeLeft('Arriving now'); return; }
            const hours = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            setTimeLeft(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
        };
        update();
        const interval = setInterval(update, 30000);
        return () => clearInterval(interval);
    }, [eta]);

    return (
        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 text-center">
            <div className="text-[9px] font-mono text-cyan-400/60 tracking-widest uppercase mb-1">Estimated Arrival</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">{timeLeft}</div>
            <div className="text-[10px] text-zinc-500 mt-1">{new Date(eta).toLocaleString()}</div>
        </div>
    );
}

export default function DestinationPortal() {
    const [authenticated, setAuthenticated] = useState(false);
    const [lookupValue, setLookupValue] = useState('');
    const [facilityName, setFacilityName] = useState('');
    const [lookupError, setLookupError] = useState('');
    const [orders, setOrders] = useState<TransloadOrder[]>([]);
    const [confirming, setConfirming] = useState<string | null>(null);
    const [noteInput, setNoteInput] = useState<Record<string, string>>({});

    useEffect(() => { seedDemoTransloadOrders(); }, []);

    useEffect(() => {
        if (authenticated) {
            const refresh = () => {
                const all = getTransloadOrders();
                const matched = all.filter(o =>
                    (o.last_mile.requested && o.last_mile.destination_facility.toLowerCase().includes(facilityName.toLowerCase())) ||
                    o.id === lookupValue
                );
                setOrders(matched);
            };
            refresh();
            window.addEventListener('transload-update', refresh);
            const interval = setInterval(refresh, 3000);
            return () => { window.removeEventListener('transload-update', refresh); clearInterval(interval); };
        }
    }, [authenticated, facilityName, lookupValue]);

    const handleLookup = () => {
        if (!lookupValue.trim()) { setLookupError('Please enter an Order ID or Facility Name'); return; }
        const order = getTransloadOrderById(lookupValue.trim());
        if (order) { setFacilityName(order.last_mile.destination_facility || lookupValue); setAuthenticated(true); setLookupError(''); return; }
        const all = getTransloadOrders();
        const matched = all.filter(o => o.last_mile.requested && o.last_mile.destination_facility.toLowerCase().includes(lookupValue.toLowerCase()));
        if (matched.length > 0) { setFacilityName(lookupValue); setAuthenticated(true); setLookupError(''); }
        else { setLookupError('No orders found. Try "Dakota Livestock Feeds" or "Red River Feed Mill" or an Order ID.'); }
    };

    const confirmDelivery = (orderId: string) => {
        setConfirming(orderId);
        setTimeout(() => { updateTransloadOrderStatus(orderId, 'DELIVERED', 'Delivery confirmed by destination facility'); setConfirming(null); }, 1200);
    };

    const handleSendNote = (orderId: string) => {
        const msg = noteInput[orderId]?.trim();
        if (!msg) return;
        addOrderNote(orderId, 'destination', facilityName || 'Destination', msg);
        setNoteInput({ ...noteInput, [orderId]: '' });
    };

    // ── Access Gate ─────────────────────────────────────────────
    if (!authenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/20 via-black to-black" />
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                <div className="relative z-10 w-full max-w-md px-6">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 text-[10px] font-mono tracking-[0.2em] uppercase mb-6">
                            <MapPin className="w-3 h-3" /> Destination Portal
                        </div>
                        <h1 className="text-3xl font-sans font-bold text-white tracking-tight mb-2">Track Your Delivery</h1>
                        <p className="text-zinc-500 text-sm">Real-time visibility into your transloading order</p>
                    </div>
                    <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-8 backdrop-blur-sm">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Order ID or Facility Name</label>
                                <input type="text" value={lookupValue} onChange={e => setLookupValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLookup()}
                                    placeholder="TL-DEMO-001 or Dakota Livestock Feeds"
                                    className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-zinc-700 font-mono" />
                            </div>
                            {lookupError && (
                                <div className="text-rose-400 text-xs font-mono flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" /> {lookupError}
                                </div>
                            )}
                            <button onClick={handleLookup}
                                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-black font-semibold text-sm rounded-lg py-3 flex items-center justify-center gap-2 hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer">
                                <Search className="w-4 h-4" /> Track Order
                            </button>
                        </div>
                    </div>
                    <div className="mt-8 text-center space-y-2">
                        <Link href="/portal/dealer" className="block text-zinc-600 text-xs font-mono hover:text-zinc-400 transition-colors">Are you a dealer? → Dealer Portal</Link>
                        <Link href="/portal/command" className="block text-zinc-600 text-xs font-mono hover:text-zinc-400 transition-colors">Campbell Staff? → Command Center</Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Order Tracking Dashboard ────────────────────────────────
    return (
        <div className="min-h-screen bg-black text-zinc-300">
            <header className="border-b border-white/5 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-white">Destination Tracking</div>
                            <div className="text-[10px] font-mono text-zinc-600 tracking-widest">{facilityName.toUpperCase() || 'ORDER TRACKING'}</div>
                        </div>
                    </div>
                    <button onClick={() => setAuthenticated(false)} className="text-zinc-600 hover:text-zinc-300 text-xs font-mono transition-colors cursor-pointer">← Back</button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                {orders.length === 0 ? (
                    <div className="text-center py-20">
                        <Package className="w-16 h-16 mx-auto mb-4 text-zinc-800" />
                        <div className="text-lg font-semibold text-zinc-500 mb-2">No Active Deliveries</div>
                        <p className="text-sm text-zinc-600 max-w-md mx-auto">
                            There are no shipments heading to your facility right now. If you&apos;re expecting a delivery,
                            contact the dealer or Campbell facility to check the order status.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-4">
                            <Link href="/portal/dealer" className="text-amber-400 text-xs font-mono hover:underline">Dealer Portal →</Link>
                            <Link href="/portal/command" className="text-cyan-400 text-xs font-mono hover:underline">Command Center →</Link>
                        </div>
                    </div>
                ) : (
                    orders.map(order => {
                        const currentStepIdx = STATUS_ORDER_MAP[order.status];
                        const steps = order.last_mile.requested ? PROGRESS_STEPS : PROGRESS_STEPS.filter(s => s.key !== 'LAST_MILE_DISPATCHED');
                        const canConfirm = order.status === 'ARRIVED';
                        const currentStep = PROGRESS_STEPS.find(s => s.key === order.status);

                        return (
                            <div key={order.id} className="bg-zinc-950/60 border border-white/5 rounded-2xl overflow-hidden">
                                {/* Order Header */}
                                <div className="px-8 py-6 border-b border-white/5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="text-[10px] font-mono text-zinc-600 tracking-widest mb-1">{order.id}</div>
                                            <h2 className="text-xl font-sans font-bold text-white mb-1">{order.commodity}</h2>
                                            <div className="text-sm text-zinc-500">{order.quantity.toLocaleString()} {order.quantity_unit} • {order.num_cars} railcars</div>
                                            <div className="text-xs text-zinc-600 mt-1">From: <span className="text-zinc-400">{order.dealer_name}</span></div>
                                        </div>
                                        <div className={`text-xs font-mono px-4 py-2 rounded-full border ${STATUS_COLORS[order.status]} bg-black/40`}>
                                            {order.status.replace(/_/g, ' ')}
                                        </div>
                                    </div>
                                    {/* Current Status Description */}
                                    {currentStep && (
                                        <div className="mt-4 bg-cyan-950/10 border border-cyan-500/10 rounded-lg px-4 py-3">
                                            <div className="text-xs text-cyan-300">{currentStep.description}</div>
                                        </div>
                                    )}
                                </div>

                                {/* ETA Countdown */}
                                {order.last_mile.estimated_arrival && ['LAST_MILE_DISPATCHED', 'IN_TRANSIT'].includes(order.status) && (
                                    <div className="px-8 pt-6">
                                        <ETACountdown eta={order.last_mile.estimated_arrival} />
                                    </div>
                                )}

                                {/* Visual Progress Tracker */}
                                <div className="px-8 py-8">
                                    <div className="flex items-center">
                                        {steps.map((step, i) => {
                                            const stepIdx = STATUS_ORDER_MAP[step.key];
                                            const reached = stepIdx <= currentStepIdx;
                                            const isCurrent = step.key === order.status;
                                            return (
                                                <React.Fragment key={step.key}>
                                                    <div className="flex flex-col items-center relative group">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 ${
                                                            isCurrent ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                                                                : reached ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                                                                    : 'bg-zinc-900 border-zinc-800 text-zinc-700'
                                                        }`}>
                                                            {reached && !isCurrent ? <CheckCircle className="w-4 h-4" /> : getStepIcon(step.key, 'w-4 h-4')}
                                                        </div>
                                                        <div className={`text-[9px] font-mono mt-2.5 whitespace-nowrap tracking-wider ${isCurrent ? 'text-cyan-400' : reached ? 'text-emerald-400/60' : 'text-zinc-700'}`}>
                                                            {step.label.toUpperCase()}
                                                        </div>
                                                        {isCurrent && <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-500 rounded-full animate-pulse" />}
                                                    </div>
                                                    {i < steps.length - 1 && (
                                                        <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${stepIdx < currentStepIdx ? 'bg-emerald-500/40' : 'bg-zinc-800'}`} />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Detail Sections */}
                                <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Delivery Info */}
                                    {order.last_mile.requested && (
                                        <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-4">
                                            <div className="text-[10px] font-mono text-violet-400 tracking-[0.2em] uppercase flex items-center gap-2">
                                                <Truck className="w-3 h-3" /> Delivery Details
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <div className="text-white font-medium">{order.last_mile.destination_facility}</div>
                                                        <div className="text-zinc-500 text-xs">{order.last_mile.destination_address}</div>
                                                    </div>
                                                </div>
                                                {order.last_mile.truck_id && (
                                                    <div className="flex items-center gap-3">
                                                        <Truck className="w-4 h-4 text-zinc-500" />
                                                        <span className="text-zinc-400">Truck: <span className="text-violet-300 font-mono">{order.last_mile.truck_id}</span></span>
                                                    </div>
                                                )}
                                                {order.last_mile.estimated_arrival && (
                                                    <div className="flex items-center gap-3">
                                                        <Clock className="w-4 h-4 text-zinc-500" />
                                                        <span className="text-zinc-400">ETA: <span className="text-white">{new Date(order.last_mile.estimated_arrival).toLocaleString()}</span></span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Unloading Instructions */}
                                    <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-3">
                                        <div className="text-[10px] font-mono text-emerald-400 tracking-[0.2em] uppercase flex items-center gap-2">
                                            <FileText className="w-3 h-3" /> Your Unloading Instructions
                                        </div>
                                        <div className="text-sm text-zinc-300 leading-relaxed">
                                            {order.last_mile.requested && order.last_mile.unloading_instructions
                                                ? order.last_mile.unloading_instructions
                                                : order.unloading_instructions}
                                        </div>
                                    </div>

                                    {/* Communication Thread */}
                                    <div className="md:col-span-2 bg-black/20 border border-white/5 rounded-xl p-5 space-y-3">
                                        <div className="text-[10px] font-mono text-zinc-400 tracking-[0.2em] uppercase flex items-center gap-2">
                                            <MessageCircle className="w-3 h-3" /> Communication ({(order.notes || []).length})
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-2">
                                            {(order.notes || []).length === 0 ? (
                                                <div className="text-xs text-zinc-600 italic py-3 text-center">
                                                    No messages yet. Send a note to the Campbell facility about your receiving requirements.
                                                </div>
                                            ) : (
                                                (order.notes || []).map(note => {
                                                    const style = NOTE_AUTHOR_STYLES[note.author] || NOTE_AUTHOR_STYLES.destination;
                                                    return (
                                                        <div key={note.id} className={`rounded-lg p-3 border ${style.bg}`}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[10px] font-mono font-bold text-zinc-300">{style.icon} {note.author_name}</span>
                                                                <span className="text-[9px] font-mono text-zinc-600">{new Date(note.timestamp).toLocaleString()}</span>
                                                            </div>
                                                            <p className="text-xs text-zinc-300 leading-relaxed">{note.message}</p>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <input type="text" value={noteInput[order.id] || ''} onChange={e => setNoteInput({ ...noteInput, [order.id]: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && handleSendNote(order.id)}
                                                placeholder={`Message as ${facilityName || 'your facility'}...`}
                                                className="flex-1 bg-black/60 border border-white/10 text-white text-xs font-mono rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-700" />
                                            <button onClick={() => handleSendNote(order.id)} disabled={!noteInput[order.id]?.trim()}
                                                className="px-4 py-2.5 rounded-lg bg-emerald-600 text-black text-xs font-bold hover:bg-emerald-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                                                <Send className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Delivery */}
                                    {canConfirm && (
                                        <div className="md:col-span-2">
                                            <button onClick={() => confirmDelivery(order.id)} disabled={confirming === order.id}
                                                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-black text-sm font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50">
                                                {confirming === order.id ? (<><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>) : (<><ShieldCheck className="w-4 h-4" /> Confirm Delivery Received</>)}
                                            </button>
                                        </div>
                                    )}

                                    {order.status === 'DELIVERED' && (
                                        <div className="md:col-span-2 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-6 text-center">
                                            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                            <div className="text-lg font-semibold text-emerald-400">Delivery Complete</div>
                                            <div className="text-xs text-zinc-500 mt-1 font-mono">
                                                Confirmed {new Date(order.status_history[order.status_history.length - 1]?.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Timeline */}
                                <div className="px-8 pb-8 border-t border-white/5 pt-5">
                                    <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-3">Activity Log</div>
                                    <div className="space-y-2">
                                        {order.status_history.map((entry, i) => (
                                            <div key={i} className="flex items-center gap-3 text-xs">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shrink-0" />
                                                <div className="font-mono text-zinc-600 w-44">{new Date(entry.timestamp).toLocaleString()}</div>
                                                <div className={`font-mono text-[10px] px-2 py-0.5 rounded border ${STATUS_COLORS[entry.status]}`}>
                                                    {entry.status.replace(/_/g, ' ')}
                                                </div>
                                                <div className="text-zinc-500">{entry.note}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>
        </div>
    );
}

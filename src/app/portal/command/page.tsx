"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    Building2, Package, Truck, Clock, CheckCircle, AlertTriangle,
    ChevronDown, ChevronUp, ArrowRight, RefreshCw, FileText,
    MapPin, Phone, User, Loader2, Activity, X, Shield,
    Search, MessageCircle, Send, LayoutGrid, List, Zap,
    AlertCircle, Filter, GripVertical
} from 'lucide-react';
import {
    TransloadOrder, TransloadOrderStatus, TransloadPriority,
    OrderNote, OrderNoteAuthor,
    getTransloadOrders, updateTransloadOrderStatus,
    updateTransloadOrder, seedDemoTransloadOrders, addOrderNote
} from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
    RECEIVED: 'text-blue-400 bg-blue-950/40 border-blue-500/30',
    TRANSLOADING: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
    LOADED: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
    LAST_MILE_DISPATCHED: 'text-violet-400 bg-violet-950/40 border-violet-500/30',
    IN_TRANSIT: 'text-blue-400 bg-blue-950/40 border-blue-500/30',
    ARRIVED: 'text-teal-400 bg-teal-950/40 border-teal-500/30',
    DELIVERED: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
};

const STATUS_FLOW: TransloadOrderStatus[] = [
    'PENDING', 'RECEIVED', 'TRANSLOADING', 'LOADED', 'LAST_MILE_DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED',
];

const KANBAN_COLUMNS: { key: string; label: string; statuses: TransloadOrderStatus[]; color: string }[] = [
    { key: 'incoming', label: 'Incoming', statuses: ['PENDING', 'RECEIVED'], color: 'amber' },
    { key: 'active', label: 'Transloading', statuses: ['TRANSLOADING'], color: 'cyan' },
    { key: 'loaded', label: 'Loaded', statuses: ['LOADED'], color: 'emerald' },
    { key: 'lastmile', label: 'Last Mile', statuses: ['LAST_MILE_DISPATCHED', 'IN_TRANSIT', 'ARRIVED'], color: 'violet' },
    { key: 'complete', label: 'Delivered', statuses: ['DELIVERED'], color: 'emerald' },
];

function getStatusIcon(status: string, className: string) {
    switch (status) {
        case 'PENDING': return <Clock className={className} />;
        case 'RECEIVED': return <CheckCircle className={className} />;
        case 'TRANSLOADING': return <Activity className={className} />;
        case 'LOADED': return <Package className={className} />;
        case 'LAST_MILE_DISPATCHED': case 'IN_TRANSIT': return <Truck className={className} />;
        case 'ARRIVED': return <MapPin className={className} />;
        case 'DELIVERED': return <CheckCircle className={className} />;
        default: return <Clock className={className} />;
    }
}

const PRIORITY_STYLES: Record<TransloadPriority, { badge: string; glow: string; label: string }> = {
    STANDARD: { badge: 'bg-zinc-800 text-zinc-400 border-zinc-700', glow: '', label: 'Standard' },
    RUSH: { badge: 'bg-amber-950/60 text-amber-400 border-amber-500/30', glow: 'ring-1 ring-amber-500/20', label: 'Rush' },
    CRITICAL: { badge: 'bg-red-950/60 text-red-400 border-red-500/40 animate-pulse', glow: 'ring-2 ring-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]', label: 'Critical' },
};

const NOTE_AUTHOR_STYLES: Record<OrderNoteAuthor, { bg: string; label: string; icon: string }> = {
    dealer: { bg: 'bg-amber-500/10 border-amber-500/20', label: 'Dealer', icon: '🏢' },
    command: { bg: 'bg-cyan-500/10 border-cyan-500/20', label: 'Campbell Ops', icon: '⚡' },
    destination: { bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Destination', icon: '📍' },
};

// Confirmation modal component
function ConfirmModal({ order, nextStatus, onConfirm, onCancel }: {
    order: TransloadOrder; nextStatus: string;
    onConfirm: (note: string) => void; onCancel: () => void;
}) {
    const [note, setNote] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-2">Advance Order Status</h3>
                <p className="text-sm text-zinc-400 mb-1">
                    <span className="text-zinc-500">Order:</span> {order.dealer_name} — {order.id}
                </p>
                <div className="flex items-center gap-2 mb-6">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                        {order.status.replace(/_/g, ' ')}
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-500" />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-cyan-950/40 text-cyan-400 border-cyan-500/30">
                        {nextStatus.replace(/_/g, ' ')}
                    </span>
                </div>
                <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Operator Note (optional)</label>
                <textarea
                    value={note} onChange={e => setNote(e.target.value)} rows={3}
                    placeholder="What was done? Any issues?"
                    className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-700 resize-none mb-5"
                    autoFocus
                />
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-sm hover:bg-white/5 transition-all cursor-pointer">Cancel</button>
                    <button onClick={() => onConfirm(note || `Advanced to ${nextStatus.replace(/_/g, ' ')}`)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-black text-sm font-bold hover:from-cyan-500 hover:to-cyan-400 transition-all cursor-pointer flex items-center justify-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5" /> Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

// 3-way communication visualization
function ThreeWayComms({ order }: { order: TransloadOrder }) {
    const hasLastMile = order.last_mile.requested;
    const dealerNotes = (order.notes || []).filter(n => n.author === 'dealer').length;
    const cmdNotes = (order.notes || []).filter(n => n.author === 'command').length;
    const destNotes = (order.notes || []).filter(n => n.author === 'destination').length;

    return (
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-black/30 rounded-xl border border-white/5 mb-5">
            {/* Dealer */}
            <div className="flex flex-col items-center text-center min-w-[100px]">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mb-2">
                    <Building2 className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-[10px] font-mono text-amber-400 tracking-wider">DEALER</div>
                <div className="text-[9px] text-zinc-500 mt-0.5 truncate max-w-[100px]">{order.dealer_name}</div>
                {dealerNotes > 0 && <div className="text-[9px] font-mono text-amber-400/60 mt-1">{dealerNotes} msg</div>}
            </div>
            {/* Arrow Dealer → Campbell */}
            <div className="flex-1 flex items-center">
                <div className="flex-1 h-px bg-gradient-to-r from-amber-500/40 to-cyan-500/40" />
                <div className="px-2"><ArrowRight className="w-3 h-3 text-zinc-500" /></div>
                <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/40 to-cyan-500/20" />
            </div>
            {/* Campbell */}
            <div className="flex flex-col items-center text-center min-w-[100px]">
                <div className="w-14 h-14 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                    <Shield className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="text-[10px] font-mono text-cyan-400 tracking-wider font-bold">CAMPBELL</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">Command Center</div>
                {cmdNotes > 0 && <div className="text-[9px] font-mono text-cyan-400/60 mt-1">{cmdNotes} msg</div>}
            </div>
            {/* Arrow Campbell → Destination */}
            <div className={`flex-1 flex items-center ${!hasLastMile ? 'opacity-20' : ''}`}>
                <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-emerald-500/40" />
                <div className="px-2"><ArrowRight className="w-3 h-3 text-zinc-500" /></div>
                <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/40 to-emerald-500/40" />
            </div>
            {/* Destination */}
            <div className={`flex flex-col items-center text-center min-w-[100px] ${!hasLastMile ? 'opacity-30' : ''}`}>
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-[10px] font-mono text-emerald-400 tracking-wider">DESTINATION</div>
                <div className="text-[9px] text-zinc-500 mt-0.5 truncate max-w-[100px]">
                    {hasLastMile ? order.last_mile.destination_facility : 'Rail Only'}
                </div>
                {destNotes > 0 && <div className="text-[9px] font-mono text-emerald-400/60 mt-1">{destNotes} msg</div>}
            </div>
        </div>
    );
}

// Note thread component
function NoteThread({ order }: { order: TransloadOrder }) {
    const [newNote, setNewNote] = useState('');
    const [sending, setSending] = useState(false);
    const notes = order.notes || [];

    const handleSend = () => {
        if (!newNote.trim()) return;
        setSending(true);
        setTimeout(() => {
            addOrderNote(order.id, 'command', 'Campbell Ops', newNote.trim());
            setNewNote('');
            setSending(false);
        }, 300);
    };

    return (
        <div className="space-y-3">
            <div className="text-[10px] font-mono text-zinc-400 tracking-[0.2em] uppercase flex items-center gap-2">
                <MessageCircle className="w-3 h-3" /> Communication Thread ({notes.length})
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {notes.length === 0 ? (
                    <div className="text-xs text-zinc-600 italic py-4 text-center">No messages yet. Start the conversation.</div>
                ) : (
                    notes.map(note => {
                        const style = NOTE_AUTHOR_STYLES[note.author];
                        return (
                            <div key={note.id} className={`rounded-lg p-3 border ${style.bg}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-mono font-bold text-zinc-300">
                                        {style.icon} {note.author_name}
                                    </span>
                                    <span className="text-[9px] font-mono text-zinc-600">
                                        {new Date(note.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-300 leading-relaxed">{note.message}</p>
                            </div>
                        );
                    })
                )}
            </div>
            <div className="flex gap-2 pt-1">
                <input
                    type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message as Campbell Ops..."
                    className="flex-1 bg-black/60 border border-white/10 text-white text-xs font-mono rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-700"
                />
                <button onClick={handleSend} disabled={!newNote.trim() || sending}
                    className="px-4 py-2.5 rounded-lg bg-cyan-600 text-black text-xs font-bold hover:bg-cyan-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5">
                    {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                </button>
            </div>
        </div>
    );
}

// Kanban card
function KanbanCard({ order, onExpand, onDragStart, onDragEnd, isDragging }: {
    order: TransloadOrder; onExpand: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    isDragging: boolean;
}) {
    const priority = order.priority || 'STANDARD';
    const ps = PRIORITY_STYLES[priority];
    const noteCount = (order.notes || []).length;

    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', order.id);
                onDragStart(e);
            }}
            onDragEnd={onDragEnd}
            onClick={onExpand}
            className={`w-full text-left bg-zinc-950/80 border border-white/5 rounded-xl p-4 hover:border-white/15 transition-all cursor-grab active:cursor-grabbing group ${ps.glow} ${isDragging ? 'opacity-40 scale-95 ring-2 ring-cyan-500/30' : ''}`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <GripVertical className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors flex-shrink-0" />
                    <span className="text-[10px] font-mono text-zinc-600">{order.id}</span>
                </div>
                {priority !== 'STANDARD' && (
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${ps.badge} flex items-center gap-1`}>
                        {priority === 'CRITICAL' && <Zap className="w-2.5 h-2.5" />}
                        {ps.label}
                    </span>
                )}
            </div>
            <div className="text-sm text-white font-medium mb-1">{order.dealer_name}</div>
            <div className="text-[11px] text-zinc-400 mb-2">{order.commodity}</div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                <span>{order.quantity.toLocaleString()} {order.quantity_unit_abbrev}</span>
                <span>•</span>
                <span>{order.num_cars} cars</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
                {order.last_mile.requested && (
                    <span className="flex items-center gap-1 text-violet-400 text-[9px] font-mono bg-violet-950/30 border border-violet-500/20 px-1.5 py-0.5 rounded">
                        <Truck className="w-2.5 h-2.5" /> Last Mile
                    </span>
                )}
                {noteCount > 0 && (
                    <span className="flex items-center gap-1 text-zinc-400 text-[9px] font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded">
                        <MessageCircle className="w-2.5 h-2.5" /> {noteCount}
                    </span>
                )}
                {order.special_handling && (
                    <span className="flex items-center gap-1 text-amber-400 text-[9px]">
                        <AlertTriangle className="w-2.5 h-2.5" />
                    </span>
                )}
            </div>
        </div>
    );
}

export default function CommandCenter() {
    const [orders, setOrders] = useState<TransloadOrder[]>([]);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [truckIdInput, setTruckIdInput] = useState<Record<string, string>>({});
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmOrder, setConfirmOrder] = useState<{ order: TransloadOrder; nextStatus: string } | null>(null);
    const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    useEffect(() => {
        seedDemoTransloadOrders();
        const refresh = () => setOrders(getTransloadOrders());
        refresh();
        window.addEventListener('transload-update', refresh);
        const interval = setInterval(refresh, 3000);
        return () => { window.removeEventListener('transload-update', refresh); clearInterval(interval); };
    }, []);

    const getNextStatus = (order: TransloadOrder): string | null => {
        const currentIdx = STATUS_FLOW.indexOf(order.status);
        let next = STATUS_FLOW[currentIdx + 1];
        if (!next) return null;
        if (!order.last_mile.requested && next === 'LAST_MILE_DISPATCHED') next = 'DELIVERED';
        return next;
    };

    const requestAdvance = (order: TransloadOrder) => {
        const next = getNextStatus(order);
        if (!next) return;
        setConfirmOrder({ order, nextStatus: next });
    };

    const executeAdvance = (order: TransloadOrder, nextStatus: string, note: string) => {
        setUpdatingId(order.id);
        if (nextStatus === 'LAST_MILE_DISPATCHED' && truckIdInput[order.id]) {
            updateTransloadOrder(order.id, {
                last_mile: { ...order.last_mile, truck_id: truckIdInput[order.id], estimated_arrival: new Date(Date.now() + 4 * 3600000).toISOString() },
            });
        }
        setTimeout(() => {
            updateTransloadOrderStatus(order.id, nextStatus as TransloadOrderStatus, note);
            setUpdatingId(null);
            setConfirmOrder(null);
        }, 600);
    };

    // Drag-and-drop: get the target status for a column
    const getTargetStatusForColumn = (colKey: string, order: TransloadOrder): TransloadOrderStatus | null => {
        const col = KANBAN_COLUMNS.find(c => c.key === colKey);
        if (!col) return null;
        if (col.statuses.includes(order.status)) return null;
        const targetStatus = col.statuses[0];
        const currentIdx = STATUS_FLOW.indexOf(order.status);
        const targetIdx = STATUS_FLOW.indexOf(targetStatus);
        if (targetIdx <= currentIdx) return null;
        if (colKey === 'lastmile' && !order.last_mile.requested) return null;
        return targetStatus;
    };

    const handleDrop = (colKey: string) => {
        setDragOverCol(null);
        if (!draggedOrderId) return;
        const order = orders.find(o => o.id === draggedOrderId);
        setDraggedOrderId(null);
        if (!order) return;
        const targetStatus = getTargetStatusForColumn(colKey, order);
        if (!targetStatus) return;
        setConfirmOrder({ order, nextStatus: targetStatus });
    };

    const filteredOrders = useMemo(() => {
        let result = statusFilter === 'ALL' ? orders : orders.filter(o => o.status === statusFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(o =>
                o.dealer_name.toLowerCase().includes(q) ||
                o.id.toLowerCase().includes(q) ||
                o.commodity.toLowerCase().includes(q)
            );
        }
        return result;
    }, [orders, statusFilter, searchQuery]);

    const stats = useMemo(() => ({
        total: orders.length,
        pending: orders.filter(o => o.status === 'PENDING' || o.status === 'RECEIVED').length,
        active: orders.filter(o => o.status === 'TRANSLOADING' || o.status === 'LOADED').length,
        transit: orders.filter(o => ['LAST_MILE_DISPATCHED', 'IN_TRANSIT', 'ARRIVED'].includes(o.status)).length,
        delivered: orders.filter(o => o.status === 'DELIVERED').length,
        totalVolume: orders.reduce((sum, o) => sum + o.quantity, 0),
        totalCars: orders.reduce((sum, o) => sum + o.num_cars, 0),
        lastMileOrders: orders.filter(o => o.last_mile.requested).length,
        needsAttention: orders.filter(o => (o.priority === 'CRITICAL' || o.priority === 'RUSH') && o.status !== 'DELIVERED').length,
    }), [orders]);

    const expandedOrderData = expandedOrder ? orders.find(o => o.id === expandedOrder) : null;

    return (
        <div className="min-h-screen bg-black text-zinc-300">
            {/* Confirmation Modal */}
            {confirmOrder && (
                <ConfirmModal
                    order={confirmOrder.order} nextStatus={confirmOrder.nextStatus}
                    onConfirm={(note) => executeAdvance(confirmOrder.order, confirmOrder.nextStatus, note)}
                    onCancel={() => setConfirmOrder(null)}
                />
            )}

            {/* Header */}
            <header className="border-b border-white/5 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                            <Building2 className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-sans font-bold text-white tracking-tight flex items-center gap-2">
                                Transload Command Center
                                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full tracking-widest">CAMPBELL, MN</span>
                            </h1>
                            <div className="text-[10px] font-mono text-zinc-600 tracking-widest">BNSF FACILITY OPERATIONS HUB</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {stats.needsAttention > 0 && (
                            <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-mono bg-red-950/30 border border-red-500/20 px-3 py-1.5 rounded-full animate-pulse">
                                <AlertCircle className="w-3 h-3" /> {stats.needsAttention} NEEDS ATTENTION
                            </div>
                        )}
                        <Link href="/portal/dealer" className="text-[10px] font-mono text-zinc-600 hover:text-amber-400 transition-colors tracking-widest">DEALER PORTAL</Link>
                        <Link href="/portal/destination" className="text-[10px] font-mono text-zinc-600 hover:text-emerald-400 transition-colors tracking-widest">DEST PORTAL</Link>
                        <Link href="/fleet" className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400 transition-colors tracking-widest">FLEET</Link>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 py-6">
                {/* Stats Bar */}
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 mb-6">
                    {[
                        { label: 'Total Orders', value: stats.total, color: 'text-white' },
                        { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
                        { label: 'Active', value: stats.active, color: 'text-cyan-400' },
                        { label: 'In Transit', value: stats.transit, color: 'text-blue-400' },
                        { label: 'Delivered', value: stats.delivered, color: 'text-emerald-400' },
                        { label: 'Total Volume', value: stats.totalVolume.toLocaleString(), color: 'text-zinc-300' },
                        { label: 'Total Cars', value: stats.totalCars, color: 'text-zinc-300' },
                        { label: 'Last Mile', value: stats.lastMileOrders, color: 'text-violet-400' },
                        { label: 'Urgent', value: stats.needsAttention, color: stats.needsAttention > 0 ? 'text-red-400' : 'text-zinc-600' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-zinc-950/60 border border-white/5 rounded-xl p-3 text-center">
                            <div className={`text-xl font-sans font-bold ${stat.color}`}>{stat.value}</div>
                            <div className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Toolbar: Search + View Toggle + Filters */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search orders..." className="w-full bg-zinc-950/60 border border-white/5 text-white text-xs font-mono rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-cyan-500/30 transition-all placeholder:text-zinc-700" />
                    </div>
                    <div className="flex items-center bg-zinc-950/60 border border-white/5 rounded-lg overflow-hidden">
                        <button onClick={() => setViewMode('kanban')}
                            className={`px-3 py-2 flex items-center gap-1.5 text-[10px] font-mono tracking-wider cursor-pointer transition-all ${viewMode === 'kanban' ? 'bg-cyan-950/40 text-cyan-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                            <LayoutGrid className="w-3 h-3" /> PIPELINE
                        </button>
                        <button onClick={() => setViewMode('list')}
                            className={`px-3 py-2 flex items-center gap-1.5 text-[10px] font-mono tracking-wider cursor-pointer transition-all ${viewMode === 'list' ? 'bg-cyan-950/40 text-cyan-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                            <List className="w-3 h-3" /> LIST
                        </button>
                    </div>
                    {viewMode === 'list' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Filter className="w-3 h-3 text-zinc-600" />
                            {['ALL', ...STATUS_FLOW].map(status => (
                                <button key={status} onClick={() => setStatusFilter(status)}
                                    className={`text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${statusFilter === status ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400' : 'bg-transparent border-white/5 text-zinc-600 hover:text-zinc-400 hover:border-white/10'}`}>
                                    {status.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Kanban View */}
                {viewMode === 'kanban' && (
                    <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                        {KANBAN_COLUMNS.map(col => {
                            const colOrders = filteredOrders.filter(o => col.statuses.includes(o.status));
                            const isDropTarget = dragOverCol === col.key;
                            const canDrop = draggedOrderId ? (() => {
                                const order = orders.find(o => o.id === draggedOrderId);
                                return order ? getTargetStatusForColumn(col.key, order) !== null : false;
                            })() : false;
                            return (
                                <div
                                    key={col.key}
                                    className="flex-1 min-w-[220px] max-w-[320px] space-y-3"
                                    onDragOver={(e) => {
                                        if (canDrop) {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                        }
                                        setDragOverCol(col.key);
                                    }}
                                    onDragLeave={(e) => {
                                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                            setDragOverCol(null);
                                        }
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        handleDrop(col.key);
                                    }}
                                >
                                    <div className="flex items-center justify-between px-1">
                                        <span className={`text-[10px] font-mono tracking-[0.2em] uppercase text-${col.color}-400`}>{col.label}</span>
                                        <span className={`text-[10px] font-mono text-${col.color}-400/60 bg-${col.color}-950/30 px-2 py-0.5 rounded-full`}>{colOrders.length}</span>
                                    </div>
                                    <div className={`min-h-[180px] rounded-xl p-2 space-y-2 transition-all duration-200 ${
                                        isDropTarget && canDrop
                                            ? `bg-${col.color}-950/20 border-2 border-dashed border-${col.color}-500/50 shadow-[0_0_20px_rgba(0,200,255,0.08)]`
                                            : isDropTarget && !canDrop
                                                ? 'bg-red-950/10 border-2 border-dashed border-red-500/30'
                                                : 'bg-zinc-950/30 border border-white/[0.03]'
                                    }`}>
                                        {colOrders.length === 0 ? (
                                            <div className={`flex flex-col items-center justify-center h-[160px] transition-all duration-200 ${isDropTarget && canDrop ? `text-${col.color}-600` : 'text-zinc-800'}`}>
                                                {isDropTarget && canDrop ? (
                                                    <>
                                                        <ArrowRight className="w-6 h-6 mb-2 animate-pulse" />
                                                        <span className="text-[10px] font-mono">Drop here</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Package className="w-5 h-5 mb-2 opacity-20" />
                                                        <span className="text-[10px] font-mono">No orders</span>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                {colOrders.map(order => (
                                                    <KanbanCard
                                                        key={order.id}
                                                        order={order}
                                                        onExpand={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                                        onDragStart={() => setDraggedOrderId(order.id)}
                                                        onDragEnd={() => { setDraggedOrderId(null); setDragOverCol(null); }}
                                                        isDragging={draggedOrderId === order.id}
                                                    />
                                                ))}
                                                {isDropTarget && canDrop && (
                                                    <div className={`border-2 border-dashed border-${col.color}-500/40 rounded-xl p-4 flex items-center justify-center text-${col.color}-500/60 text-[10px] font-mono animate-pulse`}>
                                                        <ArrowRight className="w-4 h-4 mr-2" /> Drop to move here
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="space-y-3 mb-6">
                        {filteredOrders.length === 0 ? (
                            <div className="text-center py-20 text-zinc-600">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <div className="text-sm font-mono">No orders match this filter</div>
                            </div>
                        ) : (
                            filteredOrders.map(order => {
                                const priority = order.priority || 'STANDARD';
                                const ps = PRIORITY_STYLES[priority];
                                const statusColorClass = STATUS_COLORS[order.status]?.split(' ')[0] || 'text-zinc-400';
                                return (
                                    <div key={order.id} className={`bg-zinc-950/60 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all ${ps.glow}`}>
                                        <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                            className="w-full px-6 py-4 flex items-center justify-between cursor-pointer">
                                            <div className="flex items-center gap-5">
                                                {getStatusIcon(order.status, `w-4 h-4 ${statusColorClass}`)}
                                                <div className="text-left">
                                                    <div className="text-sm text-white font-medium">{order.dealer_name}</div>
                                                    <div className="text-[10px] font-mono text-zinc-600">{order.id}</div>
                                                </div>
                                                <div className="text-xs text-zinc-400 font-mono">{order.commodity}</div>
                                                <div className="text-xs text-zinc-500 font-mono">{order.quantity.toLocaleString()} {order.quantity_unit_abbrev}</div>
                                                <div className="text-xs text-zinc-500 font-mono">{order.num_cars} cars</div>
                                                {priority !== 'STANDARD' && (
                                                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${ps.badge} flex items-center gap-1`}>
                                                        {priority === 'CRITICAL' && <Zap className="w-2.5 h-2.5" />} {ps.label}
                                                    </span>
                                                )}
                                                {order.last_mile.requested && (
                                                    <div className="flex items-center gap-1 text-violet-400 text-[10px] font-mono bg-violet-950/30 border border-violet-500/20 px-2 py-0.5 rounded">
                                                        <Truck className="w-3 h-3" /> {order.last_mile.destination_facility}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {(order.notes || []).length > 0 && (
                                                    <span className="flex items-center gap-1 text-zinc-500 text-[10px] font-mono">
                                                        <MessageCircle className="w-3 h-3" /> {order.notes.length}
                                                    </span>
                                                )}
                                                <div className={`text-[10px] font-mono px-3 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
                                                    {order.status.replace(/_/g, ' ')}
                                                </div>
                                                {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Expanded Order Detail Panel */}
                {expandedOrderData && (
                    <div className="fixed inset-0 z-30 flex items-start justify-center pt-8 pb-8 px-4">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setExpandedOrder(null)} />
                        <div className="relative w-full max-w-4xl max-h-[calc(100vh-4rem)] bg-zinc-950 border border-white/10 rounded-2xl overflow-y-auto shadow-2xl shadow-black/50">
                            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm border-b border-white/5 px-8 py-5 flex items-center justify-between rounded-t-2xl">
                                <div>
                                    <div className="text-[10px] font-mono text-zinc-600 mb-0.5">{expandedOrderData.id}</div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-3">
                                        {expandedOrderData.dealer_name}
                                        {(expandedOrderData.priority || 'STANDARD') !== 'STANDARD' && (
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[expandedOrderData.priority || 'STANDARD'].badge}`}>
                                                {expandedOrderData.priority === 'CRITICAL' && <Zap className="w-2.5 h-2.5 inline mr-1" />}
                                                {PRIORITY_STYLES[expandedOrderData.priority || 'STANDARD'].label}
                                            </span>
                                        )}
                                    </h2>
                                    <div className="text-xs text-zinc-500 mt-0.5">{expandedOrderData.commodity} • {expandedOrderData.quantity.toLocaleString()} {expandedOrderData.quantity_unit_abbrev} • {expandedOrderData.num_cars} cars</div>
                                </div>
                                <button onClick={() => setExpandedOrder(null)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-2">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="px-8 py-6 space-y-6">
                                {/* 3-Way Communication Visualization */}
                                <ThreeWayComms order={expandedOrderData} />

                                {/* Progress Bar */}
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        {STATUS_FLOW.map((s, i) => {
                                            const currentIdx = STATUS_FLOW.indexOf(expandedOrderData.status);
                                            const reached = i <= currentIdx;
                                            const isCurrent = s === expandedOrderData.status;
                                            if (s === 'LAST_MILE_DISPATCHED' && !expandedOrderData.last_mile.requested) return null;
                                            return (
                                                <React.Fragment key={s}>
                                                    <div className={`flex-1 h-2 rounded-full transition-all ${reached ? (isCurrent ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-cyan-500/40') : 'bg-zinc-800'}`} />
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[8px] font-mono text-zinc-600 tracking-widest">
                                        <span>PENDING</span><span>TRANSLOADING</span><span>LOADED</span>
                                        {expandedOrderData.last_mile.requested && <span>DISPATCHED</span>}
                                        <span>DELIVERED</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left: Instructions */}
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-mono text-cyan-400 tracking-[0.2em] uppercase flex items-center gap-2">
                                            <FileText className="w-3 h-3" /> Dealer Instructions
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-1.5">Transloading</div>
                                            <div className="text-xs text-zinc-300 bg-black/40 rounded-lg p-3 border border-white/5 leading-relaxed">{expandedOrderData.transloading_instructions}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-1.5">Unloading</div>
                                            <div className="text-xs text-zinc-300 bg-black/40 rounded-lg p-3 border border-white/5 leading-relaxed">{expandedOrderData.unloading_instructions}</div>
                                        </div>
                                        {expandedOrderData.special_handling && (
                                            <div>
                                                <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-1.5">Special Handling</div>
                                                <div className="text-xs text-amber-300/80 bg-amber-950/20 rounded-lg p-3 border border-amber-500/10 leading-relaxed flex items-start gap-2">
                                                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{expandedOrderData.special_handling}
                                                </div>
                                            </div>
                                        )}

                                        {/* Last Mile */}
                                        {expandedOrderData.last_mile.requested && (
                                            <div className="space-y-3 pt-2">
                                                <div className="text-[10px] font-mono text-violet-400 tracking-[0.2em] uppercase flex items-center gap-2">
                                                    <Truck className="w-3 h-3" /> Last-Mile Delivery
                                                </div>
                                                <div className="bg-violet-950/10 border border-violet-500/10 rounded-lg p-4 space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <MapPin className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                                                        <div>
                                                            <div className="text-sm text-white font-medium">{expandedOrderData.last_mile.destination_facility}</div>
                                                            <div className="text-xs text-zinc-500 mt-0.5">{expandedOrderData.last_mile.destination_address}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <User className="w-3 h-3 text-zinc-500" />
                                                        <span className="text-xs text-zinc-400">{expandedOrderData.last_mile.destination_contact}</span>
                                                        <Phone className="w-3 h-3 text-zinc-500 ml-2" />
                                                        <span className="text-xs text-zinc-400">{expandedOrderData.last_mile.destination_phone}</span>
                                                    </div>
                                                    {expandedOrderData.last_mile.truck_id && (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <Truck className="w-3 h-3 text-violet-400" />
                                                            <span className="text-zinc-500">Assigned:</span>
                                                            <span className="text-violet-300 font-mono">{expandedOrderData.last_mile.truck_id}</span>
                                                        </div>
                                                    )}
                                                    {expandedOrderData.status === 'LOADED' && !expandedOrderData.last_mile.truck_id && (
                                                        <div className="mt-3 pt-3 border-t border-violet-500/10">
                                                            <label className="block text-[9px] font-mono text-violet-400/80 tracking-widest uppercase mb-1.5">Assign Truck ID</label>
                                                            <input type="text" placeholder="TRK-XXX" value={truckIdInput[expandedOrderData.id] || ''}
                                                                onChange={e => setTruckIdInput({ ...truckIdInput, [expandedOrderData.id]: e.target.value })}
                                                                className="w-full bg-black/60 border border-violet-500/20 text-white text-xs font-mono rounded px-3 py-2 focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-700" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Notes + Actions */}
                                    <div className="space-y-5">
                                        {/* Communication Thread */}
                                        <NoteThread order={expandedOrderData} />

                                        {/* Action Button */}
                                        {(() => {
                                            const currentIdx = STATUS_FLOW.indexOf(expandedOrderData.status);
                                            const canAdvance = currentIdx < STATUS_FLOW.length - 1;
                                            const nextStatus = getNextStatus(expandedOrderData);
                                            const needsTruckId = nextStatus === 'LAST_MILE_DISPATCHED' && expandedOrderData.last_mile.requested;
                                            if (expandedOrderData.status === 'DELIVERED') {
                                                return (
                                                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 text-center">
                                                        <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                                        <div className="text-sm text-emerald-400 font-semibold">Order Complete</div>
                                                    </div>
                                                );
                                            }
                                            if (!canAdvance) return null;
                                            return (
                                                <button onClick={() => requestAdvance(expandedOrderData)}
                                                    disabled={updatingId === expandedOrderData.id || (!!needsTruckId && !truckIdInput[expandedOrderData.id])}
                                                    className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-black text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/15 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                                                    {updatingId === expandedOrderData.id ? (
                                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...</>
                                                    ) : (
                                                        <><ArrowRight className="w-3.5 h-3.5" /> Advance to {nextStatus?.replace(/_/g, ' ')}</>
                                                    )}
                                                </button>
                                            );
                                        })()}

                                        {/* Timeline */}
                                        <div>
                                            <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Timeline</div>
                                            <div className="space-y-2">
                                                {expandedOrderData.status_history.map((entry, i) => (
                                                    <div key={i} className="flex items-start gap-2.5 text-[10px]">
                                                        <div className="w-1 h-1 rounded-full bg-cyan-500/60 mt-1.5 shrink-0" />
                                                        <div>
                                                            <div className="font-mono text-zinc-500">{new Date(entry.timestamp).toLocaleString()}</div>
                                                            <div className={`font-mono mt-0.5 ${STATUS_COLORS[entry.status]?.split(' ')[0] || 'text-zinc-400'}`}>{entry.status.replace(/_/g, ' ')}</div>
                                                            {entry.note && <div className="text-zinc-500 mt-0.5">{entry.note}</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Meta */}
                                        <div className="text-[9px] font-mono text-zinc-700 space-y-1 border-t border-white/5 pt-3">
                                            <div>Created: {new Date(expandedOrderData.created_at).toLocaleString()}</div>
                                            <div>Updated: {new Date(expandedOrderData.updated_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

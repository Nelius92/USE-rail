"use client";

import React, { useState, useEffect } from 'react';
import {
    LogIn, Package, FileText, Truck, Send, CheckCircle, Clock,
    ArrowRight, ChevronDown, ChevronUp, AlertTriangle, Loader2, X,
    HelpCircle, MessageCircle, Zap, Copy, Eye
} from 'lucide-react';
import Link from 'next/link';
import {
    TransloadOrder, TransloadPriority, OrderNote, ProductCategory,
    createTransloadOrder, getTransloadOrdersByDealer,
    seedDemoTransloadOrders, addOrderNote,
    PRODUCT_CATALOG, getProductInfo, ProductInfo
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

const NOTE_AUTHOR_STYLES: Record<string, { bg: string; icon: string }> = {
    dealer: { bg: 'bg-amber-500/10 border-amber-500/20', icon: '🏢' },
    command: { bg: 'bg-cyan-500/10 border-cyan-500/20', icon: '⚡' },
    destination: { bg: 'bg-emerald-500/10 border-emerald-500/20', icon: '📍' },
};



// Tooltip component
function Tip({ text }: { text: string }) {
    const [show, setShow] = useState(false);
    return (
        <span className="relative inline-block ml-1">
            <button type="button" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-help">
                <HelpCircle className="w-3 h-3" />
            </button>
            {show && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-[10px] text-zinc-300 leading-relaxed shadow-xl z-50">
                    {text}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-white/10 rotate-45 -mt-1" />
                </div>
            )}
        </span>
    );
}

// Validation
interface FormErrors {
    quantity?: string; transloadInstr?: string; unloadInstr?: string;
    destFacility?: string; destAddress?: string; destContact?: string; destPhone?: string;
}

function validateForm(data: {
    quantity: string; transloadInstr: string; unloadInstr: string;
    lastMileRequested: boolean; destFacility: string; destAddress: string; destContact: string; destPhone: string;
}): FormErrors {
    const errors: FormErrors = {};
    if (!data.quantity || parseInt(data.quantity) <= 0) errors.quantity = 'Enter a valid quantity';
    if (parseInt(data.quantity) > 9999999) errors.quantity = 'Quantity exceeds maximum';
    if (!data.transloadInstr.trim()) errors.transloadInstr = 'Required — tell us how to load';
    if (!data.unloadInstr.trim()) errors.unloadInstr = 'Required — tell us how to unload';
    if (data.lastMileRequested) {
        if (!data.destFacility.trim()) errors.destFacility = 'Required for last-mile delivery';
        if (!data.destAddress.trim()) errors.destAddress = 'Required for delivery routing';
        if (!data.destContact.trim()) errors.destContact = 'We need a contact person';
        if (!data.destPhone.trim()) errors.destPhone = 'Phone number required';
    }
    return errors;
}

// Preview modal
function PreviewModal({ data, onConfirm, onCancel }: {
    data: any; onConfirm: () => void; onCancel: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-6">
                    <Eye className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-bold text-white">Review Your Order</h3>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-1">Commodity</div>
                            <div className="text-sm text-white">{data.commodity}</div>
                        </div>
                        <div>
                            <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-1">Priority</div>
                            <div className={`text-sm ${data.priority === 'CRITICAL' ? 'text-red-400' : data.priority === 'RUSH' ? 'text-amber-400' : 'text-white'}`}>
                                {data.priority}
                            </div>
                        </div>
                        <div>
                            <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-1">Quantity</div>
                            <div className="text-sm text-white">{parseInt(data.quantity).toLocaleString()} {data.quantityUnit}</div>
                        </div>
                        <div>
                            <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-1">Cars Needed</div>
                            <div className="text-sm text-white">{data.numCars || (data.productInfo?.capacityPerCar ? Math.ceil(parseInt(data.quantity) / data.productInfo.capacityPerCar) : 'Manual')}</div>
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-1">Transloading Instructions</div>
                        <div className="text-xs text-zinc-300 bg-black/40 rounded-lg p-3 border border-white/5">{data.transloadInstr}</div>
                    </div>
                    <div>
                        <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-1">Unloading Instructions</div>
                        <div className="text-xs text-zinc-300 bg-black/40 rounded-lg p-3 border border-white/5">{data.unloadInstr}</div>
                    </div>
                    {data.specialHandling && (
                        <div>
                            <div className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mb-1">Special Handling</div>
                            <div className="text-xs text-amber-300/80 bg-amber-950/20 rounded-lg p-3 border border-amber-500/10">{data.specialHandling}</div>
                        </div>
                    )}
                    {data.lastMileRequested && (
                        <div className="bg-violet-950/10 border border-violet-500/10 rounded-lg p-4 space-y-2">
                            <div className="text-[10px] font-mono text-violet-400 tracking-widest uppercase flex items-center gap-2">
                                <Truck className="w-3 h-3" /> Last-Mile Delivery
                            </div>
                            <div className="text-sm text-white">{data.destFacility}</div>
                            <div className="text-xs text-zinc-400">{data.destAddress}</div>
                            <div className="text-xs text-zinc-400">{data.destContact} • {data.destPhone}</div>
                        </div>
                    )}
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-sm hover:bg-white/5 transition-all cursor-pointer">Edit</button>
                    <button onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-black text-sm font-bold hover:from-amber-500 hover:to-amber-400 transition-all cursor-pointer flex items-center justify-center gap-2">
                        <Send className="w-3.5 h-3.5" /> Submit Order
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DealerPortal() {
    const [authenticated, setAuthenticated] = useState(false);
    const [dealerName, setDealerName] = useState('');
    const [dealerCode, setDealerCode] = useState('');
    const [loginError, setLoginError] = useState('');
    const [orders, setOrders] = useState<TransloadOrder[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [submitted, setSubmitted] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Form state
    const [productCategory, setProductCategory] = useState<ProductCategory>('GRAIN');
    const [commodity, setCommodity] = useState('#2 Yellow Corn');
    const [priority, setPriority] = useState<TransloadPriority>('STANDARD');
    const [quantity, setQuantity] = useState('');
    const [numCars, setNumCars] = useState('');
    const [transloadInstr, setTransloadInstr] = useState('');
    const [unloadInstr, setUnloadInstr] = useState('');
    const [specialHandling, setSpecialHandling] = useState('');
    const [lastMileRequested, setLastMileRequested] = useState(false);
    const [destFacility, setDestFacility] = useState('');
    const [destAddress, setDestAddress] = useState('');
    const [destContact, setDestContact] = useState('');
    const [destPhone, setDestPhone] = useState('');
    const [destUnloadInstr, setDestUnloadInstr] = useState('');

    // Note state
    const [noteInput, setNoteInput] = useState<Record<string, string>>({});

    const productInfo = getProductInfo(commodity);
    const capacityPerCar = productInfo?.capacityPerCar || 0;
    const autoCalcCars = (quantity && capacityPerCar > 0) ? Math.ceil(parseInt(quantity) / capacityPerCar) : 0;

    useEffect(() => { seedDemoTransloadOrders(); }, []);

    useEffect(() => {
        if (authenticated && dealerCode) {
            const refresh = () => setOrders(getTransloadOrdersByDealer(dealerCode));
            refresh();
            window.addEventListener('transload-update', refresh);
            return () => window.removeEventListener('transload-update', refresh);
        }
    }, [authenticated, dealerCode]);

    const handleLogin = () => {
        if (!dealerName.trim() || !dealerCode.trim()) { setLoginError('Please enter both fields'); return; }
        setAuthenticated(true); setLoginError('');
    };

    const resetForm = () => {
        setProductCategory('GRAIN'); setCommodity('#2 Yellow Corn'); setPriority('STANDARD'); setQuantity(''); setNumCars('');
        setTransloadInstr(''); setUnloadInstr(''); setSpecialHandling('');
        setLastMileRequested(false); setDestFacility(''); setDestAddress(''); setDestContact('');
        setDestPhone(''); setDestUnloadInstr(''); setErrors({}); setTouched({});
    };

    const handlePreview = () => {
        const formErrors = validateForm({ quantity, transloadInstr, unloadInstr, lastMileRequested, destFacility, destAddress, destContact, destPhone });
        setErrors(formErrors);
        setTouched({ quantity: true, transloadInstr: true, unloadInstr: true, destFacility: true, destAddress: true, destContact: true, destPhone: true });
        if (Object.keys(formErrors).length > 0) return;
        setShowPreview(true);
    };

    const handleSubmit = () => {
        setSubmitting(true); setShowPreview(false);
        setTimeout(() => {
            const order = createTransloadOrder({
                dealer_name: dealerName, dealer_code: dealerCode, commodity, priority,
                product_category: productCategory,
                quantity: parseInt(quantity),
                quantity_unit: productInfo?.unit || 'units',
                quantity_unit_abbrev: productInfo?.unitAbbrev || 'ea',
                num_cars: parseInt(numCars) || autoCalcCars || 1,
                transloading_instructions: transloadInstr, unloading_instructions: unloadInstr,
                special_handling: specialHandling,
                last_mile: {
                    requested: lastMileRequested, destination_facility: destFacility,
                    destination_address: destAddress, destination_contact: destContact,
                    destination_phone: destPhone, unloading_instructions: destUnloadInstr,
                    truck_id: '', estimated_arrival: '',
                },
            });
            setSubmitting(false); setSubmitted(order.id); setShowForm(false); resetForm();
            setTimeout(() => setSubmitted(null), 8000);
        }, 1500);
    };

    const handleSendNote = (orderId: string) => {
        const msg = noteInput[orderId]?.trim();
        if (!msg) return;
        addOrderNote(orderId, 'dealer', dealerName, msg);
        setNoteInput({ ...noteInput, [orderId]: '' });
    };

    const fieldClass = (field: string, base: string) =>
        `${base} ${touched[field] && errors[field as keyof FormErrors] ? 'border-red-500/50 focus:border-red-500/70' : ''}`;

    // ── Login Gate ──────────────────────────────────────────────
    if (!authenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-black to-black" />
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                <div className="relative z-10 w-full max-w-md px-6">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-950/20 text-amber-400 text-[10px] font-mono tracking-[0.2em] uppercase mb-6">
                            <Package className="w-3 h-3" /> Dealer Transload Portal
                        </div>
                        <h1 className="text-3xl font-sans font-bold text-white tracking-tight mb-2">Welcome Back</h1>
                        <p className="text-zinc-500 text-sm">Campbell, MN BNSF Transloading Facility</p>
                    </div>
                    <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-8 backdrop-blur-sm">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Company Name</label>
                                <input type="text" value={dealerName} onChange={e => setDealerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                    placeholder="Heartland Grain Co." className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-zinc-700" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Access Code</label>
                                <input type="text" value={dealerCode} onChange={e => setDealerCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                    placeholder="HGC2026" className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-zinc-700 font-mono" />
                            </div>
                            {loginError && (
                                <div className="text-rose-400 text-xs font-mono flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" /> {loginError}
                                </div>
                            )}
                            <button onClick={handleLogin}
                                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-black font-semibold text-sm rounded-lg py-3 flex items-center justify-center gap-2 hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20 cursor-pointer">
                                <LogIn className="w-4 h-4" /> Access Portal
                            </button>
                        </div>
                    </div>
                    <div className="mt-8 text-center">
                        <Link href="/portal/command" className="text-zinc-600 text-xs font-mono hover:text-zinc-400 transition-colors">
                            Campbell Staff? → Command Center
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Authenticated Dashboard ─────────────────────────────────
    return (
        <div className="min-h-screen bg-black text-zinc-300">
            {/* Preview Modal */}
            {showPreview && (
                <PreviewModal
                    data={{ commodity, priority, quantity, numCars, transloadInstr, unloadInstr, specialHandling, lastMileRequested, destFacility, destAddress, destContact, destPhone, quantityUnit: productInfo?.unit || 'units', productInfo }}
                    onConfirm={handleSubmit} onCancel={() => setShowPreview(false)}
                />
            )}

            {/* Top Bar */}
            <header className="border-b border-white/5 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                            <Package className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-white">{dealerName}</div>
                            <div className="text-[10px] font-mono text-zinc-600 tracking-widest">DEALER PORTAL • {dealerCode}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/portal/command" className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors tracking-widest">CMD CENTER</Link>
                        <button onClick={() => setAuthenticated(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Success toast */}
                {submitted && (
                    <div className="fixed top-6 right-6 z-50 bg-emerald-950/90 border border-emerald-500/30 text-emerald-400 px-6 py-4 rounded-xl shadow-2xl shadow-emerald-500/10 animate-[slideIn_0.3s_ease-out]">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-mono text-sm font-bold">Order Submitted!</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-300/70 font-mono">{submitted}</span>
                            <button onClick={() => { navigator.clipboard.writeText(submitted); }}
                                className="text-emerald-400/60 hover:text-emerald-400 transition-colors cursor-pointer">
                                <Copy className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <h1 className="text-2xl font-sans font-bold text-white tracking-tight mb-1">Transload Orders</h1>
                        <p className="text-sm text-zinc-500">Campbell, MN BNSF Facility • Submit and track transloading instructions</p>
                    </div>
                    <button onClick={() => setShowForm(!showForm)}
                        className="bg-gradient-to-r from-amber-600 to-amber-500 text-black text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/15 cursor-pointer">
                        {showForm ? <X className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        {showForm ? 'Cancel' : 'New Transload Order'}
                    </button>
                </div>

                {/* New Order Form */}
                {showForm && (
                    <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-8 mb-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-400" /> New Transload Order
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column */}
                            <div className="space-y-5">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">
                                            Product Category <Tip text="Choose the category first to filter available products." />
                                        </label>
                                        <select value={productCategory} onChange={e => {
                                            const cat = e.target.value as ProductCategory;
                                            setProductCategory(cat);
                                            const firstProduct = PRODUCT_CATALOG[cat].products[0];
                                            setCommodity(firstProduct.name);
                                        }} className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-all">
                                            {Object.entries(PRODUCT_CATALOG).map(([key, cat]) => (
                                                <option key={key} value={key}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">
                                            Product <Tip text="Select the specific product being shipped." />
                                        </label>
                                        <select value={commodity} onChange={e => setCommodity(e.target.value)} className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-all">
                                            {PRODUCT_CATALOG[productCategory].products.map(p => (
                                                <option key={p.name} value={p.name}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">
                                            Priority <Tip text="RUSH and CRITICAL orders are flagged for the operations team. Only use if genuinely urgent." />
                                        </label>
                                        <select value={priority} onChange={e => setPriority(e.target.value as TransloadPriority)} className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-all">
                                            <option value="STANDARD">Standard</option><option value="RUSH">Rush ⚡</option><option value="CRITICAL">Critical 🔴</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">
                                            Quantity ({productInfo?.unit || 'units'}) <Tip text={`Total ${productInfo?.unit || 'units'} to transload.${capacityPerCar > 0 ? ` We'll auto-calculate cars at ~${capacityPerCar.toLocaleString()} ${productInfo?.unitAbbrev}/car.` : ' Enter car count manually.'}`} />
                                        </label>
                                        <input type="number" value={quantity} onChange={e => { setQuantity(e.target.value); setTouched({ ...touched, quantity: true }); }}
                                            placeholder={productInfo?.unit === 'bushels' ? '95,000' : productInfo?.unit === 'tons' ? '200' : '1,000'}
                                            className={fieldClass('quantity', 'w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700')} />
                                        {touched.quantity && errors.quantity && <div className="text-red-400 text-[10px] font-mono mt-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {errors.quantity}</div>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">
                                            Number of Cars <Tip text={capacityPerCar > 0 ? `Leave blank to auto-calculate. Override if you have specific car requirements.` : 'Enter the number of railcars needed for this shipment.'} />
                                        </label>
                                        <input type="number" value={numCars} onChange={e => setNumCars(e.target.value)}
                                            placeholder={autoCalcCars > 0 ? `Auto: ${autoCalcCars} cars` : 'Enter cars needed'}
                                            className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700" />
                                        {autoCalcCars > 0 && !numCars && <div className="text-cyan-400/60 text-[10px] font-mono mt-1">≈ {autoCalcCars} cars at {capacityPerCar.toLocaleString()} {productInfo?.unitAbbrev}/car</div>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">
                                        Transloading Instructions <Tip text="Tell us which bins to load from, moisture targets, weight requirements, equipment preferences." />
                                    </label>
                                    <textarea value={transloadInstr} onChange={e => { setTransloadInstr(e.target.value); setTouched({ ...touched, transloadInstr: true }); }} rows={4}
                                        placeholder="Which bins to load from, moisture targets, weight per hopper, equipment…"
                                        className={fieldClass('transloadInstr', 'w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700 resize-none')} />
                                    {touched.transloadInstr && errors.transloadInstr && <div className="text-red-400 text-[10px] font-mono mt-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {errors.transloadInstr}</div>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">
                                        Unloading Instructions <Tip text="How should grain be unloaded? Pit assignments, flow rate limits, gravity vs pneumatic." />
                                    </label>
                                    <textarea value={unloadInstr} onChange={e => { setUnloadInstr(e.target.value); setTouched({ ...touched, unloadInstr: true }); }} rows={3}
                                        placeholder="Unloading method, pit assignments, flow rate limits…"
                                        className={fieldClass('unloadInstr', 'w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700 resize-none')} />
                                    {touched.unloadInstr && errors.unloadInstr && <div className="text-red-400 text-[10px] font-mono mt-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {errors.unloadInstr}</div>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Special Handling Notes</label>
                                    <input type="text" value={specialHandling} onChange={e => setSpecialHandling(e.target.value)}
                                        placeholder="Optional — certifications, rush priority, etc."
                                        className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700" />
                                </div>
                            </div>

                            {/* Right Column — Last Mile */}
                            <div className="space-y-5">
                                <div className="text-[10px] font-mono text-violet-400/80 tracking-[0.2em] uppercase mb-1">Last-Mile Trucking</div>
                                <button onClick={() => setLastMileRequested(!lastMileRequested)} type="button"
                                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 cursor-pointer ${lastMileRequested ? 'border-violet-500/40 bg-violet-950/20' : 'border-white/5 bg-black/40 hover:border-white/10'}`}>
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${lastMileRequested ? 'bg-violet-500/20' : 'bg-zinc-900'}`}>
                                        <Truck className={`w-5 h-5 ${lastMileRequested ? 'text-violet-400' : 'text-zinc-600'}`} />
                                    </div>
                                    <div className="text-left">
                                        <div className={`text-sm font-semibold ${lastMileRequested ? 'text-violet-300' : 'text-zinc-400'}`}>
                                            {lastMileRequested ? 'Last-Mile Trucking Enabled' : 'Request Last-Mile Trucking'}
                                        </div>
                                        <div className="text-[10px] text-zinc-600 font-mono">We handle delivery from Campbell to your final destination</div>
                                    </div>
                                    <div className={`ml-auto w-10 h-5 rounded-full transition-all flex items-center ${lastMileRequested ? 'bg-violet-500 justify-end' : 'bg-zinc-800 justify-start'}`}>
                                        <div className={`w-4 h-4 rounded-full mx-0.5 transition-all ${lastMileRequested ? 'bg-white' : 'bg-zinc-600'}`} />
                                    </div>
                                </button>
                                {lastMileRequested && (
                                    <div className="space-y-4 pl-4 border-l-2 border-violet-500/20 animate-[slideDown_0.3s_ease-out]">
                                        <div>
                                            <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Destination Facility Name</label>
                                            <input type="text" value={destFacility} onChange={e => { setDestFacility(e.target.value); setTouched({ ...touched, destFacility: true }); }}
                                                placeholder="Dakota Livestock Feeds"
                                                className={fieldClass('destFacility', 'w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-700')} />
                                            {touched.destFacility && errors.destFacility && <div className="text-red-400 text-[10px] font-mono mt-1">{errors.destFacility}</div>}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Destination Address</label>
                                            <input type="text" value={destAddress} onChange={e => { setDestAddress(e.target.value); setTouched({ ...touched, destAddress: true }); }}
                                                placeholder="4521 County Rd 12, Wahpeton, ND 58075"
                                                className={fieldClass('destAddress', 'w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-700')} />
                                            {touched.destAddress && errors.destAddress && <div className="text-red-400 text-[10px] font-mono mt-1">{errors.destAddress}</div>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Contact Person</label>
                                                <input type="text" value={destContact} onChange={e => { setDestContact(e.target.value); setTouched({ ...touched, destContact: true }); }}
                                                    placeholder="Mike Jensen"
                                                    className={fieldClass('destContact', 'w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-700')} />
                                                {touched.destContact && errors.destContact && <div className="text-red-400 text-[10px] font-mono mt-1">{errors.destContact}</div>}
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Phone</label>
                                                <input type="text" value={destPhone} onChange={e => { setDestPhone(e.target.value); setTouched({ ...touched, destPhone: true }); }}
                                                    placeholder="701-555-0142"
                                                    className={fieldClass('destPhone', 'w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-700')} />
                                                {touched.destPhone && errors.destPhone && <div className="text-red-400 text-[10px] font-mono mt-1">{errors.destPhone}</div>}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Unloading Instructions at Destination</label>
                                            <textarea value={destUnloadInstr} onChange={e => setDestUnloadInstr(e.target.value)} rows={3}
                                                placeholder="Receiving dock, unloading method, facility hours…"
                                                className="w-full bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-700 resize-none" />
                                        </div>
                                    </div>
                                )}
                                {/* Submit */}
                                <div className="pt-4">
                                    <button onClick={handlePreview} disabled={submitting}
                                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-black text-sm font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                                        {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>) : (<><Eye className="w-4 h-4" /> Preview & Submit</>)}
                                    </button>
                                    {Object.keys(errors).length > 0 && Object.values(touched).some(Boolean) && (
                                        <div className="text-red-400/70 text-[10px] font-mono mt-2 text-center">Please fix the highlighted fields above</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Order History */}
                <div className="space-y-4">
                    {orders.length === 0 ? (
                        <div className="text-center py-20 text-zinc-600">
                            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <div className="text-sm font-mono">No orders yet</div>
                            <div className="text-xs text-zinc-700 mt-1">Submit your first transload order above</div>
                        </div>
                    ) : (
                        orders.map(order => (
                            <div key={order.id} className="bg-zinc-950/60 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all">
                                <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                    className="w-full px-6 py-4 flex items-center justify-between cursor-pointer">
                                    <div className="flex items-center gap-5">
                                        <div className="text-xs font-mono text-zinc-500">{order.id}</div>
                                        <div className="text-sm text-white font-medium">{order.commodity}</div>
                                        <div className="text-xs text-zinc-500 font-mono">{order.quantity.toLocaleString()} {order.quantity_unit_abbrev} • {order.num_cars} cars</div>
                                        {(order.priority || 'STANDARD') !== 'STANDARD' && (
                                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${order.priority === 'CRITICAL' ? 'bg-red-950/60 text-red-400 border-red-500/40' : 'bg-amber-950/60 text-amber-400 border-amber-500/30'}`}>
                                                {order.priority}
                                            </span>
                                        )}
                                        {order.last_mile.requested && (
                                            <div className="flex items-center gap-1 text-violet-400 text-[10px] font-mono bg-violet-950/30 border border-violet-500/20 px-2 py-0.5 rounded">
                                                <Truck className="w-3 h-3" /> LAST MILE
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

                                {expandedOrder === order.id && (
                                    <div className="px-6 pb-6 border-t border-white/5 pt-5 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Transloading Instructions</div>
                                                <div className="text-sm text-zinc-300 bg-black/40 rounded-lg p-4 border border-white/5">{order.transloading_instructions}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Unloading Instructions</div>
                                                <div className="text-sm text-zinc-300 bg-black/40 rounded-lg p-4 border border-white/5">{order.unloading_instructions}</div>
                                            </div>
                                        </div>

                                        {/* Communication Thread */}
                                        <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3">
                                            <div className="text-[10px] font-mono text-zinc-400 tracking-[0.2em] uppercase flex items-center gap-2">
                                                <MessageCircle className="w-3 h-3" /> Messages ({(order.notes || []).length})
                                            </div>
                                            <div className="max-h-48 overflow-y-auto space-y-2">
                                                {(order.notes || []).length === 0 ? (
                                                    <div className="text-xs text-zinc-600 italic py-3 text-center">No messages yet</div>
                                                ) : (
                                                    (order.notes || []).map(note => {
                                                        const style = NOTE_AUTHOR_STYLES[note.author] || NOTE_AUTHOR_STYLES.dealer;
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
                                                    placeholder={`Message as ${dealerName}...`}
                                                    className="flex-1 bg-black/60 border border-white/10 text-white text-xs font-mono rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700" />
                                                <button onClick={() => handleSendNote(order.id)} disabled={!noteInput[order.id]?.trim()}
                                                    className="px-4 py-2.5 rounded-lg bg-amber-600 text-black text-xs font-bold hover:bg-amber-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                                                    <Send className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        <div>
                                            <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-3">Status Timeline</div>
                                            <div className="space-y-2">
                                                {order.status_history.map((entry, i) => (
                                                    <div key={i} className="flex items-center gap-3 text-xs">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
                                                        <div className="font-mono text-zinc-500 w-40">{new Date(entry.timestamp).toLocaleString()}</div>
                                                        <div className={`font-mono px-2 py-0.5 rounded text-[10px] border ${STATUS_COLORS[entry.status]}`}>
                                                            {entry.status.replace(/_/g, ' ')}
                                                        </div>
                                                        <div className="text-zinc-400">{entry.note}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}

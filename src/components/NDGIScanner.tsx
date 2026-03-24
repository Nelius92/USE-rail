"use client";

import React, { useState, useRef } from 'react';
import { extractNDGI, NDGIExtractionResponse } from '../lib/api';
import { Camera, Zap, CheckCircle, AlertTriangle } from 'lucide-react';

export default function NDGIScanner() {
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState<NDGIExtractionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        setSuccessData(null);
        setError(null);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const base64Data = base64String.split(',')[1] || base64String;
                try {
                    const result = await extractNDGI(base64Data);
                    setSuccessData(result);
                } catch (err: any) {
                    setError(err.message || 'Failed to extract NDGI ticket');
                } finally {
                    setLoading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.onerror = () => { setError("Failed to read file."); setLoading(false); };
            reader.readAsDataURL(file);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-zinc-900/50 border border-white/5 p-5 rounded-lg flex flex-col gap-4">
            <label className="cursor-pointer group relative w-full flex items-center justify-center gap-3 bg-zinc-950/80 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-950/10 text-zinc-400 hover:text-emerald-400 font-sans py-6 px-6 rounded transition-all uppercase tracking-widest text-sm">
                {loading ? (
                    <span className="flex items-center gap-3 animate-pulse text-amber-500">
                        <Zap className="w-5 h-5" />
                        AI Extracting...
                    </span>
                ) : (
                    <span className="flex items-center gap-3">
                        <Camera className="w-5 h-5" />
                        Scan NDGI Ticket
                    </span>
                )}
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    disabled={loading}
                />
            </label>

            {successData && (
                <div className="bg-zinc-900/50 border border-white/5 p-4 rounded">
                    <h4 className="text-emerald-400 font-sans uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Extraction Complete
                    </h4>
                    <div className="flex justify-center gap-10 font-mono text-lg text-zinc-100">
                        <div>
                            <span className="text-zinc-500 text-[10px] tracking-widest uppercase block mb-1">Weight</span>
                            {successData.weight_lbs.toLocaleString()} <span className="text-xs text-zinc-500">lbs</span>
                        </div>
                        <div>
                            <span className="text-zinc-500 text-[10px] tracking-widest uppercase block mb-1">Moisture</span>
                            {successData.moisture_pct.toFixed(1)} <span className="text-xs text-zinc-500">%</span>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-rose-950/30 border border-rose-500/20 p-4 rounded flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-rose-400 font-sans tracking-widest text-xs mb-1 uppercase">Extraction Error</h4>
                        <p className="text-rose-300 text-sm font-mono whitespace-pre-wrap leading-relaxed">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

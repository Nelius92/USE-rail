"use client";

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
    label?: string;
    className?: string;
}

export function BackButton({ label = 'Go Back', className = '' }: BackButtonProps) {
    const router = useRouter();

    return (
        <button 
            onClick={() => router.back()}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 hover:bg-white/5 text-zinc-400 hover:text-white transition-all group w-fit cursor-pointer shadow-sm ${className}`}
        >
            <ArrowLeft className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 group-hover:-translate-x-1 transition-all" />
            <span className="text-[10px] uppercase font-mono tracking-widest font-semibold">{label}</span>
        </button>
    );
}

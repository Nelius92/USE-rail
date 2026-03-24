"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, Users, Target, Train, Container } from 'lucide-react';

export default function GlobalNav() {
    const pathname = usePathname();

    const tabs = [
        { href: '/admin', icon: Target, label: 'CMD' },
        { href: '/map', icon: Globe, label: 'MAP' },
        { href: '/buyers', icon: Users, label: 'CRM' },
        { href: '/fleet', icon: Train, label: 'FLEET' },
        { href: '/portal/command', icon: Container, label: 'TRANS' },
    ];

    return (
        <div className="w-16 h-screen bg-black/40 backdrop-blur-2xl border-r border-white/10 flex flex-col items-center py-6 z-50">
            <div className="w-8 h-8 rounded-full bg-linear-to-b from-white/20 to-white/5 border border-white/20 flex items-center justify-center mb-10 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
            </div>

            <div className="flex flex-col gap-6 w-full px-2">
                {tabs.map(tab => {
                    const isActive = pathname === tab.href;
                    return (
                        <Link key={tab.href} href={tab.href} className="group relative flex flex-col items-center gap-1.5 w-full my-1">
                            <div className={`p-2.5 rounded-xl transition-all duration-300 border ${isActive ? 'bg-white/10 border-white/20 text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)]' : 'bg-transparent border-transparent text-zinc-500 hover:text-white hover:bg-white/5 hover:border-white/10'}`}>
                                <tab.icon className="w-4 h-4" />
                            </div>
                            <span className={`text-[8px] font-sans font-medium tracking-[0.2em] uppercase transition-colors ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                                {tab.label}
                            </span>
                            
                            {/* Active Indicator Line */}
                            {isActive && (
                                <div className="absolute -left-2 top-2 bottom-6 w-0.5 bg-white rounded-r shadow-[0_0_8px_rgba(255,255,255,0.5)]"></div>
                            )}
                        </Link>
                    )
                })}
            </div>
            
            <div className="mt-auto flex flex-col items-center gap-4">
                <div className="w-8 h-[1px] bg-white/10"></div>
                <div className="flex flex-col items-center gap-3 writing-vertical rotate-180">
                    <div className="text-[10px] font-bold text-white uppercase tracking-[0.2em] drop-shadow-md">USE rail</div>
                    <div className="text-[6px] text-zinc-400 uppercase tracking-[0.3em] opacity-80 mix-blend-screen">powered by crop intel</div>
                </div>
            </div>
        </div>
    );
}

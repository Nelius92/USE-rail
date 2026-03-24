"use client";

import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Environment, ContactShadows, useTexture, Center } from '@react-three/drei';
import * as THREE from 'three';
import { Railcar, Hopper } from '../lib/api';
import { X, CheckCircle, ShieldAlert, FileText, Lock } from 'lucide-react';

interface RailcarModalProps {
    car: Railcar;
    onClose: () => void;
}

// Pre-load the Texture
const TEXTURE_URL = '/hopper_car.png';
useTexture.preload(TEXTURE_URL);

// 1. The Interactive Hover/Click Node
function InspectionNode({ position, type, hopper, isActive, onClick, label }: { position: [number, number, number], type: 'top' | 'bottom', hopper: Hopper, isActive: boolean, onClick: () => void, label: string }) {
    const [hovered, setHovered] = useState(false);
    const scale = isActive ? 1.5 : (hovered ? 1.2 : 1);
    
    const isError = !hopper.matches_buyer_spec;
    const colorClass = isError ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.8)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]';

    return (
        <group position={position}>
            {/* 2D Animated HTML Circle */}
            <Html center zIndexRange={[50, 0]}>
                <div 
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    onPointerEnter={() => setHovered(true)}
                    onPointerLeave={() => setHovered(false)}
                    className={`w-4 h-4 rounded-full cursor-pointer transition-all duration-300 ${colorClass} ${hovered || isActive ? 'scale-[1.75]' : ''}`}
                >
                    {/* Pulsing ring */}
                    <div className={`absolute inset-0 rounded-full bg-white fade-in zoom-in ${hovered || isActive ? 'animate-none opacity-20' : 'animate-ping opacity-60'}`} style={{ animationDuration: '2s' }}></div>
                </div>
            </Html>
            
            {isActive && (
                <Html position={[0, type === 'top' ? 0.5 : -0.5, 0]} center zIndexRange={[100, 0]}>
                    <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-72 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-3">
                            <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 flex items-center gap-1.5">
                                <Lock className="w-3 h-3" /> {type === 'top' ? 'Loading Hatch' : 'Discharge Gate'}
                            </span>
                            <span className="text-xs font-mono font-bold text-white">
                                {type === 'top' ? hopper.top_seal : hopper.bottom_seal}
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Loaded Commodity // Buyer Spec</div>
                                <div className={`text-xs font-mono flex items-center gap-1.5 ${hopper.matches_buyer_spec ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {hopper.matches_buyer_spec ? <CheckCircle className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                                    {hopper.commodity_loaded} / {hopper.commodity_expected}
                                </div>
                            </div>

                            <div className="bg-white/5 rounded p-2 border border-white/5">
                                <div className="text-[8px] font-mono text-cyan-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <FileText className="w-2.5 h-2.5" /> NDGI Inspection Record
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-zinc-300">
                                    <div className="text-zinc-500">Cert ID:</div><div className="text-right">{hopper.ndgi_certificate_id}</div>
                                    <div className="text-zinc-500">Weight:</div><div className="text-right">{hopper.ndgi_certified_weight_lbs.toLocaleString()} lbs</div>
                                    <div className="text-zinc-500">Grade:</div><div className="text-right">{hopper.ndgi_certified_grade}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}

// 2. The Photo-Realistic 2.5D Billboard Railcar
function RealisticRailcar({ car, activeNode, setActiveNode }: { car: Railcar, activeNode: string | null, setActiveNode: (id: string | null) => void }) {
    const groupRef = useRef<THREE.Group>(null);
    const texture = useTexture(TEXTURE_URL);

    // Subtle sway effect since it's a 2D billboard
    useFrame(({ clock }) => {
        if (groupRef.current && !activeNode) {
            groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.05;
        }
    });

    // Hardcoded exact alignments for the photo-realistic image features
    // [X, Y, Z] relative to the center of the 14x14 plane
    const HOPPER_POSITIONS = [
        { top: [-2.9, 2.4, 0.5], bottom: [-2.5, -3.2, 0.5] }, // Left Hopper (H1)
        { top: [-0.9, 2.4, 0.5], bottom: [0.15, -3.2, 0.5] }, // Center Hopper (H2)
        { top: [3.0, 2.4, 0.5], bottom: [2.9, -3.2, 0.5] },  // Right Hopper (H3)
    ];

    return (
        <group ref={groupRef}>
            {/* The actual realistic Image Billboard */}
            <Center position={[0, -0.5, 0]}>
                <mesh>
                    <planeGeometry args={[14, 14]} />
                    <meshBasicMaterial map={texture} transparent={true} toneMapped={false} />
                </mesh>
            </Center>

            {/* Inner Hoppers and Nodes Overlay */}
            {car.hoppers.map((hopper, index) => {
                const pos = HOPPER_POSITIONS[index] || HOPPER_POSITIONS[0];
                
                return (
                    <group key={hopper.id}>
                        {/* Top Hash/Seal Node */}
                        <InspectionNode 
                            position={pos.top as [number, number, number]} 
                            type="top" 
                            hopper={hopper} 
                            isActive={activeNode === `${hopper.id}-top`}
                            onClick={() => setActiveNode(activeNode === `${hopper.id}-top` ? null : `${hopper.id}-top`)}
                            label="Hatch"
                        />
                    </group>
                );
            })}
        </group>
    );
}

// 3. The Main Modal Container
export default function RailcarModal({ car, onClose }: RailcarModalProps) {
    const [activeNode, setActiveNode] = useState<string | null>(null);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto">
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
            
            {/* The Canvas Area */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                <Canvas camera={{ position: [5, 3, 7], fov: 40 }} gl={{ antialias: true }}>
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                    <spotLight position={[-10, 10, -10]} angle={0.15} penumbra={1} intensity={0.5} color="#06b6d4" />
                    
                    {/* The 3D Scene */}
                    <Suspense fallback={
                        <Html center>
                            <div className="text-cyan-500 font-mono tracking-widest text-xs animate-pulse">
                                DOWNLOADING HIGH-RES 3D ASSETS...
                            </div>
                        </Html>
                    }>
                        <group onClick={(e) => { e.stopPropagation(); setActiveNode(null); }} onPointerMissed={() => setActiveNode(null)}>
                            <RealisticRailcar car={car} activeNode={activeNode} setActiveNode={setActiveNode} />
                        </group>

                        <Environment preset="night" />
                        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
                    </Suspense>
                    <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} enablePan={false} />
                </Canvas>
            </div>

            {/* UI Overlay Header */}
            <div className="absolute top-0 left-0 right-0 p-8 z-20 flex justify-between items-start pointer-events-auto shadow-[inset_0_50px_100px_rgba(0,0,0,0.8)]">
                <div>
                    <div className="text-[10px] font-mono tracking-[0.2em] text-cyan-500 mb-1">3D VISUALIZATION COMMAND</div>
                    <h2 className="text-3xl font-sans text-white tracking-wider flex items-center gap-4">
                        {car.car_id}
                        {car.hoppers.every(h => h.matches_buyer_spec) ? (
                            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <CheckCircle className="w-3.5 h-3.5" /> Buyer Specs Verified
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[10px] font-mono uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-pulse">
                                <ShieldAlert className="w-3.5 h-3.5" /> Spec Mismatch Detected
                            </span>
                        )}
                    </h2>
                </div>
                
                <button 
                    onClick={onClose}
                    className="w-12 h-12 rounded-full border border-white/10 bg-black/50 hover:bg-white/10 flex items-center justify-center transition-all text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Footer Tip */}
            <div className="absolute bottom-8 left-0 right-0 text-center z-20 pointer-events-none">
                <span className="bg-black/80 backdrop-blur border border-white/5 py-2 px-6 rounded-full text-[10px] font-mono text-zinc-400 tracking-[0.15em] uppercase shadow-2xl">
                    Left Click + Drag to Rotate • Scroll to Zoom • Click Glowing Nodes to Inspect NDGI Seals
                </span>
            </div>
        </div>
    );
}

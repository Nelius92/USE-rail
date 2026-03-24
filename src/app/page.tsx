import Link from "next/link";
import {
  Globe, Package, MapPin, Train, ArrowRight,
  Wheat, TrendingUp, Shield, Zap, Users, BarChart3
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* ─── Ambient Background ─────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Radial gradient base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(16,185,129,0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_20%_90%,rgba(245,158,11,0.04),transparent_50%)]" />

        {/* Animated grid floor */}
        <div className="absolute bottom-0 left-0 right-0 h-[60vh] landing-grid opacity-40" />

        {/* Subtle scan line */}
        <div className="line-scan" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-cyan-500/5 blur-[100px]"
          style={{ animation: "float-orb 12s ease-in-out infinite" }} />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-amber-500/5 blur-[80px]"
          style={{ animation: "float-orb 15s ease-in-out infinite 3s" }} />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-emerald-500/5 blur-[60px]"
          style={{ animation: "float-orb 10s ease-in-out infinite 6s" }} />
      </div>

      {/* ─── Content ────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Top bar */}
        <header className="w-full px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-linear-to-b from-white/15 to-white/5 border border-white/15 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.08)]">
              <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-[0.15em] uppercase">USE rail</div>
              <div className="text-[8px] text-zinc-500 tracking-[0.3em] uppercase">powered by crop intel</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-zinc-600 tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            CAMPBELL, MN · BNSF RAILWAY
          </div>
        </header>

        {/* ─── Hero ─────────────────────────────────────── */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="text-reveal inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono text-zinc-400 tracking-[0.2em] uppercase mb-8">
              <Train className="w-3 h-3" />
              BNSF Transloading Intelligence Platform
            </div>

            <h1 className="text-reveal text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-[0.95]"
              style={{ animationDelay: "0.1s" }}>
              <span className="bg-clip-text text-transparent bg-linear-to-b from-white via-white to-zinc-500">
                Your grain deserves
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-linear-to-r from-cyan-300 via-white to-amber-300">
                a bigger market.
              </span>
            </h1>

            <p className="text-reveal text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-4"
              style={{ animationDelay: "0.2s" }}>
              Stop selling local. Start selling <em className="text-white not-italic font-medium">national</em>.
              USE rail connects Campbell-area farmers to 90+ premium buyers across
              the entire BNSF network — feedlots, ethanol plants, and export terminals
              that pay <span className="text-emerald-400 font-semibold">$0.40–$0.65 more per bushel</span> than your
              local elevator.
            </p>

            <p className="text-reveal text-sm text-zinc-500 max-w-xl mx-auto leading-relaxed"
              style={{ animationDelay: "0.3s" }}>
              One facility. One relationship. A world of opportunity.
            </p>
          </div>

          {/* ─── Value Props (before cards) ─────────────── */}
          <div className="text-reveal max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16"
            style={{ animationDelay: "0.35s" }}>
            {[
              {
                icon: TrendingUp,
                title: "Higher Margins",
                desc: "Our BNSF geospatial engine scans the entire national market in real-time — finding buyers that local elevators can't reach and margins they can't match.",
                color: "text-emerald-400",
              },
              {
                icon: Shield,
                title: "Zero Risk, Full Control",
                desc: "You keep ownership of your grain. We handle transloading, rail logistics, and last-mile delivery. Track every bushel from bin to buyer — in real time.",
                color: "text-cyan-400",
              },
              {
                icon: Zap,
                title: "Turn Rail Into Revenue",
                desc: "Most farmers live next to rail they'll never use. USE rail changes that. Your proximity to Campbell's BNSF line is an untapped asset worth thousands per season.",
                color: "text-amber-400",
              },
            ].map((prop, i) => (
              <div key={i}
                className="text-center px-4">
                <prop.icon className={`w-6 h-6 mx-auto mb-3 ${prop.color}`} />
                <div className="text-sm font-semibold text-white mb-2">{prop.title}</div>
                <div className="text-xs text-zinc-500 leading-relaxed">{prop.desc}</div>
              </div>
            ))}
          </div>

          {/* ─── Portal Cards ──────────────────────────── */}
          <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 px-4">

            {/* Campbell Operations */}
            <Link href="/map"
              className="card-entrance group relative bg-zinc-950/60 border border-white/[0.06] rounded-2xl p-8 hover:border-cyan-500/30 transition-all duration-500 overflow-hidden"
              style={{ animationDelay: "0.4s" }}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.06),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5 group-hover:shadow-[0_0_24px_rgba(56,189,248,0.15)] transition-all duration-500">
                  <Globe className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-[10px] font-mono text-cyan-400/60 tracking-[0.2em] uppercase mb-2">Operations Hub</div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Campbell Operations</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                  Arbitrage command, fleet dispatch, national CRM, and real-time BNSF intelligence — the operator&apos;s cockpit.
                </p>
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono group-hover:gap-3 transition-all">
                  Enter Command Center <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>

            {/* Dealer Portal */}
            <Link href="/portal/dealer"
              className="card-entrance group relative bg-zinc-950/60 border border-white/[0.06] rounded-2xl p-8 hover:border-amber-500/30 transition-all duration-500 overflow-hidden"
              style={{ animationDelay: "0.55s" }}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.06),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-amber-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:shadow-[0_0_24px_rgba(245,158,11,0.15)] transition-all duration-500">
                  <Package className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-[10px] font-mono text-amber-400/60 tracking-[0.2em] uppercase mb-2">For Dealers & Farmers</div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Dealer Portal</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                  Submit transload orders, choose your commodity, set your instructions, and watch your grain move from elevator to buyer — all from one dashboard.
                </p>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-mono group-hover:gap-3 transition-all">
                  Access Your Portal <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>

            {/* Destination Tracking */}
            <Link href="/portal/destination"
              className="card-entrance group relative bg-zinc-950/60 border border-white/[0.06] rounded-2xl p-8 hover:border-emerald-500/30 transition-all duration-500 overflow-hidden"
              style={{ animationDelay: "0.7s" }}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:shadow-[0_0_24px_rgba(16,185,129,0.15)] transition-all duration-500">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-[10px] font-mono text-emerald-400/60 tracking-[0.2em] uppercase mb-2">Receiving Facilities</div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Destination Tracking</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                  Track inbound shipments in real-time. View unloading instructions, delivery ETAs, and communicate directly with Campbell operations.
                </p>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono group-hover:gap-3 transition-all">
                  Track a Shipment <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          </div>

          {/* ─── Farmer CTA Section ────────────────────── */}
          <div className="text-reveal w-full max-w-4xl mx-auto mt-20 px-4" style={{ animationDelay: "0.85s" }}>
            <div className="relative bg-zinc-950/40 border border-white/[0.06] rounded-2xl p-10 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.04),transparent_60%)]" />
              <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-amber-500/20 to-transparent" />

              <div className="relative z-10 flex flex-col lg:flex-row items-start gap-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-amber-400 text-[10px] font-mono tracking-[0.2em] uppercase mb-4">
                    <Wheat className="w-4 h-4" />
                    For Area Farmers
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4 leading-tight">
                    Your neighbors are selling local.<br />
                    <span className="text-amber-400">You could be selling national.</span>
                  </h2>
                  <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                    <p>
                      Every harvest, the same story: you haul your grain to the local elevator, accept
                      whatever price they're offering, and hope it's enough. But just down the road,
                      the BNSF main line runs through Campbell — and that rail connects you to
                      <strong className="text-zinc-300"> feedlots in Texas paying $5.57/bu</strong>,
                      ethanol plants in Iowa, and export terminals on the Gulf.
                    </p>
                    <p>
                      USE rail makes that connection simple. We transload your grain from truck to
                      railcar right here in Campbell. Our AI-powered arbitrage engine finds the best
                      buyer nationally — not just locally — and handles the entire logistics chain.
                      You keep full ownership and visibility from the moment your grain leaves the bin
                      to the moment it's delivered.
                    </p>
                    <p className="text-zinc-300 font-medium">
                      This isn't futures trading or speculation. This is your grain, your sale, your
                      profit — just with access to buyers you never knew existed.
                    </p>
                  </div>
                </div>

                <div className="w-full lg:w-72 flex-shrink-0">
                  <div className="bg-black/40 border border-white/[0.06] rounded-xl p-6 space-y-5">
                    <div className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase">What Rail Unlocks</div>
                    {[
                      { icon: BarChart3, label: "+$0.40–0.65/bu", desc: "above local elevator bids", color: "text-emerald-400" },
                      { icon: Users, label: "90+ Buyers", desc: "national feedlots & processors", color: "text-cyan-400" },
                      { icon: Train, label: "BNSF Network", desc: "coast-to-coast rail access", color: "text-amber-400" },
                      { icon: Shield, label: "Full Transparency", desc: "track every bushel in real-time", color: "text-violet-400" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`mt-0.5 ${item.color}`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{item.label}</div>
                          <div className="text-xs text-zinc-600">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/portal/dealer"
                    className="mt-4 w-full bg-linear-to-r from-amber-600 to-amber-500 text-black text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/15">
                    <Wheat className="w-4 h-4" />
                    Get Started Today
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Footer ───────────────────────────────────── */}
        <footer className="w-full px-8 py-8 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-[10px] font-mono text-zinc-600 tracking-widest">
              <span>© 2026 USE RAIL</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">CAMPBELL, MN</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">BNSF RAILWAY</span>
            </div>
            <div className="text-[9px] font-mono text-zinc-700 tracking-[0.2em] uppercase">
              Powered by Crop Intel
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

const BASE_URL = 'http://localhost:8000/api/v1';

// ── Core Types ─────────────────────────────────────────────────────────────

export interface Commodity {
    id: string;
    name: string;
    test_weight_lbs: number;
    base_moisture_pct: number;
    max_weight_limit_lbs: number;
    max_volume_bushels: number;
    is_weigh_out: boolean;
    created_at: string;
    updated_at: string;
}

export interface Bin {
    id: string;
    bin_number: number;
    capacity_bushels: number;
    current_commodity_id: string | null;
    current_volume_bushels: number;
    avg_moisture_pct: number;
    created_at: string;
    updated_at: string;
    current_commodity: Commodity | null;
}

// ── Investor Prototype Types ───────────────────────────────────────────────

export interface DailyBid {
    id: string;
    target_id: string;
    commodity: string;
    gross_bid: number;
    calculated_freight: number;
    net_origin_price: number;
    margin_delta: number;
    scraped_at: string;
}

export interface MarketTarget {
    id: string;
    name: string;
    facility_type: string;
    latitude: number;
    longitude: number;
    phone: string | null;
    website: string | null;
    scrape_url: string;
    is_hankinson_baseline: boolean;
    latest_bid: DailyBid | null;
}

export interface MarketIntelResponse {
    baseline: MarketTarget | null;
    national_targets: MarketTarget[];
}

// ── Legacy Potential Buyer (kept for backward compat) ──────────────────────

export interface PotentialBuyer {
    id: string;
    facility_name: string;
    city_state: string;
    margin_delta_vs_local: number;
    longitude: number;
    latitude: number;
    gross_bid: number;
    bnsf_freight_cost: number;
    net_origin_price: number;
    commodity_name: string;
    scraped_at: string;
}

// ── Core Fetchers ──────────────────────────────────────────────────────────

export const getCommodities = async (): Promise<Commodity[]> => {
    const res = await fetch(`${BASE_URL}/commodities/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch commodities');
    return res.json();
};

export const getBins = async (): Promise<Bin[]> => {
    const res = await fetch(`${BASE_URL}/bins/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch bins');
    return res.json();
};

export interface Dashboard360Response {
    facility_utilization: {
        total_capacity_bushels: number;
        utilized_capacity_bushels: number;
        utilization_pct: number;
    };
    today_inbound: {
        ticket_count: number;
        total_bushels: number;
    };
    active_outbound: {
        active_cars_count: number;
    };
}

export const fetchDashboard360 = async (): Promise<Dashboard360Response> => {
    const res = await fetch(`${BASE_URL}/dashboard/360`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch 360 dashboard data');
    return res.json();
};

// ── Investor Prototype API ─────────────────────────────────────────────────

// Campbell, MN origin (BNSF Station CAMPB)
const ORIGIN_LAT = 46.0963;
const ORIGIN_LNG = -96.4019;

// Hankinson RE REAL cash bid: $3.95/bu (March 2026, basis -$0.58 vs May futures)
// Source: Guardian Energy / Hankinson Renewable Energy LLC
const HANKINSON_BASELINE = 3.95;
const HANKINSON_BID_DATE = '2026-03-06';  // Date this baseline was last verified

// ── CropIntel Railway API ──────────────────────────────────────────────────

const CROPINTEL_URL = '/api/cropintel';

export interface CropIntelBuyer {
    id: string;
    name: string;
    type: string;
    city: string;
    state: string;
    region: string | null;
    lat: number;
    lng: number;
    railConfidence: number | null;
    cashBid: number | null;
    postedBasis: number | null;
    facilityPhone: string | null;
    website: string | null;
    active: boolean;
}

/**
 * Haversine distance in miles between two lat/lng points.
 */
function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// BNSF shuttle constants: 223,400 lbs / 56 lbs/bu = 3,989.3 bu per car
const BU_PER_CAR = 3989.3;

/**
 * BNSF Tariff 4022 freight estimate in $/bu.
 *
 * Uses published BNSF shuttle rates (per car) calibrated by distance:
 *   - Short haul (<300 mi, ND/MN/SD local): ~$2,000-2,500/car → $0.50-0.63/bu
 *   - Medium (300-700 mi, IA/NE/KS): ~$2,800-3,500/car → $0.70-0.88/bu
 *   - Long (700-1200 mi, TX Panhandle): ~$4,000-4,400/car → $1.00-1.10/bu
 *     (includes $200/car discount from MN/ND/SD to Hereford, 2025/26 season)
 *   - Very long (1200+ mi, PNW/CA): ~$5,000-5,800/car → $1.25-1.45/bu
 *
 * Formula: base $1,200/car + $2.65/rail-mile, rail miles = haversine * 1.25
 */
function calcBnsfFreightPerBu(lat: number, lng: number): number {
    const straightMiles = haversineMiles(ORIGIN_LAT, ORIGIN_LNG, lat, lng);
    const railMiles = straightMiles * 1.25; // BNSF circuity factor
    const ratePerCar = 1200 + railMiles * 2.65; // $/car
    const freightPerBu = ratePerCar / BU_PER_CAR;
    return Math.round(freightPerBu * 100) / 100;
}

/**
 * USDA AMS-verified regional corn CASH BID estimates (March 5-6, 2026).
 * Updated March 2026 from USDA AMS verified sources.
 * ONLY used as a last resort when no CropIntel buyer in that state has a real cashBid.
 */
const USDA_FALLBACK_BIDS: Record<string, number> = {
    TX: 5.27,   // USDA AMS South Plains livestock ops
    CA: 5.50,   // CA deficit market delivered
    WA: 4.90,   // PNW export terminal est.
    OR: 4.85,   // PNW export est.
    KS: 4.00,   // USDA AMS KS avg $3.84-4.14
    NE: 4.05,   // USDA AMS NE Central $3.99-4.19
    IA: 4.14,   // USDA AMS IA state avg
    SD: 4.00,   // FarmBucks SD lower-mid conservative
    MN: 4.00,   // FarmBucks MN cash bid
    ND: 3.95,   // Guardian Energy Hankinson verified
};

/**
 * Compute the median cashBid for a given state from real CropIntel data.
 * Falls back to USDA fallback if no real data exists for this state.
 */
function computeMedianBid(
    state: string,
    type: string,
    realBidsByState: Map<string, number[]>,
): number {
    const realBids = realBidsByState.get(state);
    if (realBids && realBids.length > 0) {
        // Sort and take median
        const sorted = [...realBids].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
        return Math.round(median * 100) / 100;
    }
    // Feedlot premium: +$0.20-0.40 over elevator
    const isFeedlot = type === 'feedlot';
    const base = USDA_FALLBACK_BIDS[state] ?? 4.10;
    return isFeedlot ? base + 0.30 : base;
}

/**
 * Fetch all buyers from CropIntel Railway API and transform into MarketIntelResponse.
 */
export const fetchCropIntelBuyers = async (): Promise<MarketIntelResponse> => {
    const res = await fetch(
        `${CROPINTEL_URL}?limit=200&crop=Yellow+Corn`,
        { cache: 'no-store' },
    );
    if (!res.ok) throw new Error('CropIntel API unreachable');
    const { data } = await res.json() as { data: CropIntelBuyer[] };

    // Filter: rail-served only
    const railServed = data.filter(b => (b.railConfidence ?? 0) >= 40 && b.lat && b.lng);

    // ── Build a per-state median from REAL cashBid data ──────────────
    const realBidsByState = new Map<string, number[]>();
    for (const b of railServed) {
        if (b.cashBid && b.cashBid > 0) {
            const existing = realBidsByState.get(b.state) || [];
            existing.push(b.cashBid);
            realBidsByState.set(b.state, existing);
        }
    }

    // Transform into MarketTarget shape
    const targets: MarketTarget[] = railServed.map(b => {
        const grossBid = b.cashBid ?? computeMedianBid(b.state, b.type, realBidsByState);
        const freight = calcBnsfFreightPerBu(b.lat, b.lng);
        const net = Math.round((grossBid - freight) * 100) / 100;
        const delta = Math.round((net - HANKINSON_BASELINE) * 100) / 100;

        return {
            id: b.id,
            name: b.name,
            facility_type: b.type,
            latitude: b.lat,
            longitude: b.lng,
            phone: b.facilityPhone,
            website: b.website,
            scrape_url: '',
            is_hankinson_baseline: false,
            latest_bid: {
                id: b.id,
                target_id: b.id,
                commodity: '#2 Yellow Corn',
                gross_bid: grossBid,
                calculated_freight: freight,
                net_origin_price: net,
                margin_delta: delta,
                scraped_at: new Date().toISOString(),
            },
        };
    });

    // Sort by margin_delta descending (most profitable first)
    targets.sort((a, b) =>
        (b.latest_bid?.margin_delta ?? 0) - (a.latest_bid?.margin_delta ?? 0),
    );

    // Synthetic Hankinson baseline with freshness tracking
    const baselineDaysOld = Math.floor(
        (Date.now() - new Date(HANKINSON_BID_DATE).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (baselineDaysOld > 7) {
        console.warn(
            `⚠️ Hankinson baseline is ${baselineDaysOld} days old ` +
            `(last verified: ${HANKINSON_BID_DATE}). Consider updating.`,
        );
    }

    const baseline: MarketTarget = {
        id: 'hankinson-baseline',
        name: 'Hankinson Renewable Energy',
        facility_type: 'ethanol',
        latitude: 46.0683,
        longitude: -96.7118,
        phone: '701-242-7000',
        website: 'https://hankinsonre.com',
        scrape_url: '',
        is_hankinson_baseline: true,
        latest_bid: {
            id: 'hankinson-bid',
            target_id: 'hankinson-baseline',
            commodity: '#2 Yellow Corn',
            gross_bid: HANKINSON_BASELINE,
            calculated_freight: 0,
            net_origin_price: HANKINSON_BASELINE,
            margin_delta: 0,
            scraped_at: HANKINSON_BID_DATE,
        },
    };

    return { baseline, national_targets: targets };
};

/**
 * Primary intel fetcher — uses CropIntel Railway API.
 * Falls back to local backend if Railway is down.
 */
export const fetchIntel = async (): Promise<MarketIntelResponse> => {
    try {
        return await fetchCropIntelBuyers();
    } catch {
        // Fallback to local backend
        const res = await fetch(`${BASE_URL}/arbitrage/intel`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Both intel sources failed');
        return res.json();
    }
};

/**
 * POST /arbitrage/force-scan — kept for manual scan trigger.
 */
export const forceScan = async (): Promise<{ status: string; commodity: string }> => {
    const res = await fetch(`${BASE_URL}/arbitrage/force-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Force scan failed');
    }
    return res.json();
};

// ── Contract Execution API ─────────────────────────────────────────────────

export interface ContractResult {
    id: string;
    buyer_name: string;
    commodity: string;
    num_railcars: number;
    total_weight_lbs: number;
    total_bushels: number;
    gross_bid_per_bu: number;
    freight_per_bu: number;
    net_origin_per_bu: number;
    gross_contract_value: number;
    total_freight_cost: number;
    net_contract_value: number;
    status: string;
    created_at: string;
}

export interface EscrowInvoiceResult {
    id: string;
    type: string;
    amount_usd: number;
    description: string;
}

export interface ExecuteContractResponse {
    contract: ContractResult;
    escrow: {
        origin: EscrowInvoiceResult;
        destination: EscrowInvoiceResult;
    };
    ebol: Record<string, any>;
}

/**
 * POST /contracts/execute — execute a rail contract with eBOL + escrow generation.
 */
export const executeContract = async (
    buyerTargetId: string,
    numRailcars: number,
): Promise<ExecuteContractResponse> => {
    const res = await fetch(`${BASE_URL}/contracts/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            buyer_target_id: buyerTargetId,
            num_railcars: numRailcars,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Contract execution failed');
    }
    return res.json();
};

// ── Legacy Endpoints (kept for backward compat) ────────────────────────────

export const fetchPotentialBuyers = async (): Promise<PotentialBuyer[]> => {
    const res = await fetch(`${BASE_URL}/arbitrage/potential-buyers`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch potential buyers');
    return res.json();
};

export const scanMarket = async (commodityName: string, localBid: number): Promise<any> => {
    const res = await fetch(`${BASE_URL}/arbitrage/scan-market`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commodity_name: commodityName, local_bid: localBid }),
    });
    if (!res.ok) throw new Error('Scan market failed');
    return res.json();
};

// ── Legacy Admin Exports (backward compat) ─────────────────────────────────

export interface SpotCarCreatePayload {
    commodity_id: string;
    certified_weight_lbs: number;
    certified_moisture_pct: number;
}

export interface SpotCarResponse {
    id: string;
    bnsf_car_id: string;
    commodity_id: string;
    certified_weight_lbs: number | null;
    certified_moisture_pct: number | null;
    target_buyer_id: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    commodity: Commodity | null;
}

export interface Neighbor {
    id: string;
    name: string;
    phone_number: string;
    sms_opt_in: boolean;
}

export const fetchNeighbors = async (): Promise<Neighbor[]> => {
    const res = await fetch(`${BASE_URL}/neighbors/`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
};

export interface ScaleTicketCreatePayload {
    neighbor_id: string;
    commodity_id: string;
    destination_bin_id: string;
    gross_weight_lbs: number;
    tare_weight_lbs: number;
    moisture_pct: number;
}

export interface DispatchSpotCarPayload {
    bin_id: string;
    planned_lbs: number;
}

export interface NDGIExtractionResponse {
    weight_lbs: number;
    moisture_pct: number;
}

export interface DailyTarget {
    buyer_name: string;
    region: string;
    commodity: string;
    profit_delta: number;
}

export const createSpotCar = async (data: SpotCarCreatePayload): Promise<SpotCarResponse> => {
    const res = await fetch(`${BASE_URL}/spot-cars/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to create spot car');
    }
    return res.json();
};

export const createScaleTicket = async (data: ScaleTicketCreatePayload): Promise<any> => {
    const res = await fetch(`${BASE_URL}/scale-tickets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to create scale ticket');
    }
    return res.json();
};

export const dispatchSpotCar = async (data: DispatchSpotCarPayload): Promise<any> => {
    const res = await fetch(`${BASE_URL}/spot-cars/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to dispatch spot car');
    }
    return res.json();
};

export const broadcastTender = async (spotCarId: string): Promise<any> => {
    const res = await fetch(`${BASE_URL}/tenders/broadcast/${spotCarId}`, { method: 'POST' });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to broadcast tender');
    }
    return res.json();
};

export const extractNDGI = async (base64Image: string): Promise<NDGIExtractionResponse> => {
    const res = await fetch(`${BASE_URL}/vision/extract-ndgi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: base64Image }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to extract NDGI ticket data');
    }
    return res.json();
};

export const fetchDailyTargets = async (): Promise<DailyTarget[]> => {
    const res = await fetch(`${BASE_URL}/arbitrage/daily-targets`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
};

export interface Hopper {
    id: string;
    hopper_number: number;
    commodity_expected: string;
    commodity_loaded: string; // The actual product loaded
    weight_lbs: number;
    top_seal: string;
    bottom_seal: string;
    matches_buyer_spec: boolean;
    // NDGI Certification details
    ndgi_certified: boolean;
    ndgi_certified_weight_lbs: number;
    ndgi_certified_grade: string;
    ndgi_certificate_id: string;
}

export interface Railcar {
    car_id: string;
    status: 'LOADING' | 'IN_TRANSIT' | 'ARRIVED';
    destination: string;
    rfid_tag: string;
    hoppers: Hopper[];
}

// ── Transloading Portal Types & Storage ────────────────────────────────────

export type TransloadOrderStatus =
    | 'PENDING'
    | 'RECEIVED'
    | 'TRANSLOADING'
    | 'LOADED'
    | 'LAST_MILE_DISPATCHED'
    | 'IN_TRANSIT'
    | 'ARRIVED'
    | 'DELIVERED';

export type TransloadPriority = 'STANDARD' | 'RUSH' | 'CRITICAL';

export type ProductCategory = 'GRAIN' | 'LUMBER' | 'DRY_BULK' | 'AGGREGATE' | 'LIQUID' | 'GENERAL_FREIGHT';

export interface ProductInfo {
    name: string;
    category: ProductCategory;
    unit: string;
    unitAbbrev: string;
    capacityPerCar: number; // 0 = manual entry required
}

export const PRODUCT_CATALOG: Record<ProductCategory, { label: string; products: ProductInfo[] }> = {
    GRAIN: {
        label: 'Grain & Oilseeds',
        products: [
            { name: '#2 Yellow Corn', category: 'GRAIN', unit: 'bushels', unitAbbrev: 'bu', capacityPerCar: 3989 },
            { name: 'HRS Wheat', category: 'GRAIN', unit: 'bushels', unitAbbrev: 'bu', capacityPerCar: 3989 },
            { name: 'Soybeans', category: 'GRAIN', unit: 'bushels', unitAbbrev: 'bu', capacityPerCar: 3500 },
            { name: 'Durum Wheat', category: 'GRAIN', unit: 'bushels', unitAbbrev: 'bu', capacityPerCar: 3989 },
            { name: 'Barley', category: 'GRAIN', unit: 'bushels', unitAbbrev: 'bu', capacityPerCar: 4200 },
            { name: 'Canola', category: 'GRAIN', unit: 'bushels', unitAbbrev: 'bu', capacityPerCar: 4500 },
        ],
    },
    LUMBER: {
        label: 'Wood & Lumber',
        products: [
            { name: 'Dimensional Lumber', category: 'LUMBER', unit: 'board feet', unitAbbrev: 'bf', capacityPerCar: 20000 },
            { name: 'Plywood', category: 'LUMBER', unit: 'sheets', unitAbbrev: 'sht', capacityPerCar: 2400 },
            { name: 'OSB Panels', category: 'LUMBER', unit: 'sheets', unitAbbrev: 'sht', capacityPerCar: 2400 },
            { name: 'Wood Chips', category: 'LUMBER', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 90 },
            { name: 'Engineered I-Joist', category: 'LUMBER', unit: 'pieces', unitAbbrev: 'pcs', capacityPerCar: 800 },
            { name: 'Utility Poles', category: 'LUMBER', unit: 'pieces', unitAbbrev: 'pcs', capacityPerCar: 60 },
        ],
    },
    DRY_BULK: {
        label: 'Dry Bulk & Powders',
        products: [
            { name: 'Portland Cement', category: 'DRY_BULK', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
            { name: 'Fly Ash', category: 'DRY_BULK', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
            { name: 'Calcium Carbonate', category: 'DRY_BULK', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
            { name: 'Bentonite', category: 'DRY_BULK', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 95 },
            { name: 'Silica Sand', category: 'DRY_BULK', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
            { name: 'Fertilizer (Dry)', category: 'DRY_BULK', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
            { name: 'Salt', category: 'DRY_BULK', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
        ],
    },
    AGGREGATE: {
        label: 'Aggregates & Stone',
        products: [
            { name: 'Crushed Stone', category: 'AGGREGATE', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
            { name: 'Gravel', category: 'AGGREGATE', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
            { name: 'Sand', category: 'AGGREGATE', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
            { name: 'Riprap', category: 'AGGREGATE', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 95 },
            { name: 'Ballast', category: 'AGGREGATE', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
        ],
    },
    LIQUID: {
        label: 'Liquids & Chemicals',
        products: [
            { name: 'Ethanol', category: 'LIQUID', unit: 'gallons', unitAbbrev: 'gal', capacityPerCar: 30000 },
            { name: 'Crude Oil', category: 'LIQUID', unit: 'gallons', unitAbbrev: 'gal', capacityPerCar: 30000 },
            { name: 'Vegetable Oil', category: 'LIQUID', unit: 'gallons', unitAbbrev: 'gal', capacityPerCar: 28000 },
            { name: 'Liquid Fertilizer', category: 'LIQUID', unit: 'gallons', unitAbbrev: 'gal', capacityPerCar: 25000 },
            { name: 'Anhydrous Ammonia', category: 'LIQUID', unit: 'gallons', unitAbbrev: 'gal', capacityPerCar: 34000 },
        ],
    },
    GENERAL_FREIGHT: {
        label: 'General Freight',
        products: [
            { name: 'Steel Coil', category: 'GENERAL_FREIGHT', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 100 },
            { name: 'Pipe & Tubing', category: 'GENERAL_FREIGHT', unit: 'tons', unitAbbrev: 'T', capacityPerCar: 80 },
            { name: 'Machinery', category: 'GENERAL_FREIGHT', unit: 'units', unitAbbrev: 'ea', capacityPerCar: 0 },
            { name: 'Wind Turbine Components', category: 'GENERAL_FREIGHT', unit: 'units', unitAbbrev: 'ea', capacityPerCar: 0 },
            { name: 'Containers (Intermodal)', category: 'GENERAL_FREIGHT', unit: 'units', unitAbbrev: 'ea', capacityPerCar: 2 },
        ],
    },
};

export function getProductInfo(productName: string): ProductInfo | null {
    for (const cat of Object.values(PRODUCT_CATALOG)) {
        const found = cat.products.find(p => p.name === productName);
        if (found) return found;
    }
    return null;
}

export function getAllProducts(): ProductInfo[] {
    return Object.values(PRODUCT_CATALOG).flatMap(cat => cat.products);
}

export type OrderNoteAuthor = 'dealer' | 'command' | 'destination';

export interface OrderNote {
    id: string;
    author: OrderNoteAuthor;
    author_name: string;
    message: string;
    timestamp: string;
}

export interface LastMileDetails {
    requested: boolean;
    destination_facility: string;
    destination_address: string;
    destination_contact: string;
    destination_phone: string;
    unloading_instructions: string;
    truck_id: string;
    estimated_arrival: string;
}

export interface TransloadOrder {
    id: string;
    dealer_name: string;
    dealer_code: string;
    commodity: string;
    product_category: ProductCategory;
    quantity: number;
    quantity_unit: string;
    quantity_unit_abbrev: string;
    num_cars: number;
    transloading_instructions: string;
    unloading_instructions: string;
    special_handling: string;
    priority: TransloadPriority;
    notes: OrderNote[];
    estimated_completion: string;
    last_mile: LastMileDetails;
    status: TransloadOrderStatus;
    status_history: { status: TransloadOrderStatus; timestamp: string; note: string }[];
    created_at: string;
    updated_at: string;
}

const TRANSLOAD_STORAGE_KEY = 'use_rail_transload_orders';

function generateOrderId(): string {
    return 'TL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function getTransloadOrders(): TransloadOrder[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(TRANSLOAD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

export function getTransloadOrderById(id: string): TransloadOrder | null {
    return getTransloadOrders().find(o => o.id === id) || null;
}

export function getTransloadOrdersByDealer(dealerCode: string): TransloadOrder[] {
    return getTransloadOrders().filter(o => o.dealer_code === dealerCode);
}

export function getTransloadOrdersByDestination(facilityName: string): TransloadOrder[] {
    return getTransloadOrders().filter(o =>
        o.last_mile.requested &&
        o.last_mile.destination_facility.toLowerCase().includes(facilityName.toLowerCase())
    );
}

export function createTransloadOrder(order: Omit<TransloadOrder, 'id' | 'status' | 'status_history' | 'created_at' | 'updated_at' | 'notes' | 'estimated_completion'> & { notes?: OrderNote[]; estimated_completion?: string }): TransloadOrder {
    const now = new Date().toISOString();
    const newOrder: TransloadOrder = {
        ...order,
        id: generateOrderId(),
        priority: order.priority || 'STANDARD',
        notes: order.notes || [],
        estimated_completion: order.estimated_completion || '',
        status: 'PENDING',
        status_history: [{ status: 'PENDING', timestamp: now, note: 'Order submitted by dealer' }],
        created_at: now,
        updated_at: now,
    };
    const orders = getTransloadOrders();
    orders.unshift(newOrder);
    localStorage.setItem(TRANSLOAD_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event('transload-update'));
    return newOrder;
}

export function updateTransloadOrderStatus(id: string, status: TransloadOrderStatus, note: string = ''): TransloadOrder | null {
    const orders = getTransloadOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    orders[idx].status = status;
    orders[idx].updated_at = now;
    orders[idx].status_history.push({ status, timestamp: now, note });
    localStorage.setItem(TRANSLOAD_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event('transload-update'));
    return orders[idx];
}

export function updateTransloadOrder(id: string, updates: Partial<TransloadOrder>): TransloadOrder | null {
    const orders = getTransloadOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    orders[idx] = { ...orders[idx], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem(TRANSLOAD_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event('transload-update'));
    return orders[idx];
}

// ── Order Notes CRUD ───────────────────────────────────────────────────────

function generateNoteId(): string {
    return 'NOTE-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
}

export function addOrderNote(orderId: string, author: OrderNoteAuthor, authorName: string, message: string): OrderNote | null {
    const orders = getTransloadOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return null;
    const note: OrderNote = {
        id: generateNoteId(),
        author,
        author_name: authorName,
        message,
        timestamp: new Date().toISOString(),
    };
    orders[idx].notes = orders[idx].notes || [];
    orders[idx].notes.push(note);
    orders[idx].updated_at = new Date().toISOString();
    localStorage.setItem(TRANSLOAD_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event('transload-update'));
    return note;
}

export function getOrderNotes(orderId: string): OrderNote[] {
    const order = getTransloadOrderById(orderId);
    return order?.notes || [];
}

// ── Seed Demo Data ─────────────────────────────────────────────────────────

export function seedDemoTransloadOrders(): void {
    if (typeof window === 'undefined') return;
    const existing = getTransloadOrders();
    if (existing.length > 0) return; // Don't re-seed

    const now = new Date();
    const demoOrders: TransloadOrder[] = [
        {
            id: 'TL-DEMO-001',
            dealer_name: 'Heartland Grain Co.',
            dealer_code: 'HGC2026',
            commodity: '#2 Yellow Corn',
            product_category: 'GRAIN',
            quantity: 95000,
            quantity_unit: 'bushels',
            quantity_unit_abbrev: 'bu',
            num_cars: 24,
            transloading_instructions: 'Load from bins 3-7. Ensure moisture below 14%. Use BNSF hopper cars only. Coordinate with elevator manager before loading begins. Weight target: 65,000 lbs per hopper.',
            unloading_instructions: 'Bottom-dump unloading into pit #2. Alternate hoppers left-right for even distribution. Notify office when 50% complete.',
            special_handling: 'NDGI certified grade verification required for each car before sealing.',
            priority: 'STANDARD',
            estimated_completion: new Date(now.getTime() + 48 * 3600000).toISOString(),
            notes: [
                { id: 'N-D1', author: 'dealer' as OrderNoteAuthor, author_name: 'Heartland Grain Co.', message: 'Please prioritize bins 3-5 first, they have the best moisture content.', timestamp: new Date(now.getTime() - 47 * 3600000).toISOString() },
                { id: 'N-C1', author: 'command' as OrderNoteAuthor, author_name: 'Campbell Ops', message: 'Copy that — starting with bins 3-5. Moisture test came back 13.2%, looking good.', timestamp: new Date(now.getTime() - 40 * 3600000).toISOString() },
                { id: 'N-D2', author: 'destination' as OrderNoteAuthor, author_name: 'Dakota Livestock Feeds', message: 'Our east pit will be available starting tomorrow at 6 AM. Gate code is 4471.', timestamp: new Date(now.getTime() - 30 * 3600000).toISOString() },
                { id: 'N-C2', author: 'command' as OrderNoteAuthor, author_name: 'Campbell Ops', message: '12 cars loaded so far. On track for completion by tonight.', timestamp: new Date(now.getTime() - 10 * 3600000).toISOString() },
            ],
            last_mile: {
                requested: true,
                destination_facility: 'Dakota Livestock Feeds',
                destination_address: '4521 County Rd 12, Wahpeton, ND 58075',
                destination_contact: 'Mike Jensen',
                destination_phone: '701-555-0142',
                unloading_instructions: 'Use east receiving pit only. Facility max truck weight 80,000 lbs. Driver must check in at scale house before unloading. Unload within 2 hours of arrival.',
                truck_id: 'TRK-445',
                estimated_arrival: new Date(now.getTime() + 4 * 3600000).toISOString(),
            },
            status: 'TRANSLOADING',
            status_history: [
                { status: 'PENDING', timestamp: new Date(now.getTime() - 48 * 3600000).toISOString(), note: 'Order submitted by dealer' },
                { status: 'RECEIVED', timestamp: new Date(now.getTime() - 44 * 3600000).toISOString(), note: 'Reviewed by command center' },
                { status: 'TRANSLOADING', timestamp: new Date(now.getTime() - 24 * 3600000).toISOString(), note: 'Transloading began — bins 3-5 active' },
            ],
            created_at: new Date(now.getTime() - 48 * 3600000).toISOString(),
            updated_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
        },
        {
            id: 'TL-DEMO-002',
            dealer_name: 'Midwest Concrete Supply',
            dealer_code: 'MCS2026',
            commodity: 'Portland Cement',
            product_category: 'DRY_BULK',
            quantity: 200,
            quantity_unit: 'tons',
            quantity_unit_abbrev: 'T',
            num_cars: 2,
            transloading_instructions: 'Pneumatic transfer from covered hopper cars to storage silos. Keep product dry at all times. Seal hatches immediately after loading.',
            unloading_instructions: 'Pneumatic discharge into silo B. Do NOT gravity dump — cement will compact. Blow pressure max 15 PSI.',
            special_handling: 'Keep covered — cement is moisture sensitive. Tarp railcar hatches if rain forecast.',
            priority: 'STANDARD',
            estimated_completion: '',
            notes: [
                { id: 'N-D7', author: 'dealer' as OrderNoteAuthor, author_name: 'Midwest Concrete Supply', message: 'This is Type I/II Portland. Silo B should be empty before transfer — no cross-contamination with fly ash.', timestamp: new Date(now.getTime() - 3 * 3600000).toISOString() },
            ],
            last_mile: {
                requested: true,
                destination_facility: 'Fargo Ready Mix',
                destination_address: '2100 Concrete Way, Fargo, ND 58103',
                destination_contact: 'Tom Bauer',
                destination_phone: '701-555-0377',
                unloading_instructions: 'Pneumatic silo fill only. Max truck weight 88,000 lbs.',
                truck_id: '',
                estimated_arrival: '',
            },
            status: 'PENDING',
            status_history: [
                { status: 'PENDING', timestamp: new Date(now.getTime() - 3 * 3600000).toISOString(), note: 'Order submitted by dealer' },
            ],
            created_at: new Date(now.getTime() - 3 * 3600000).toISOString(),
            updated_at: new Date(now.getTime() - 3 * 3600000).toISOString(),
        },
        {
            id: 'TL-DEMO-003',
            dealer_name: 'Northern Ag Partners',
            dealer_code: 'NAP2026',
            commodity: 'Dimensional Lumber',
            product_category: 'LUMBER',
            quantity: 40000,
            quantity_unit: 'board feet',
            quantity_unit_abbrev: 'bf',
            num_cars: 2,
            transloading_instructions: 'Forklift unload from flatcars. Stack on dunnage — keep off ground. Band and wrap bundles before transfer to trucks.',
            unloading_instructions: 'Forklift offload at receiving dock. Stack max 3 bundles high. Cover with tarps if stored outdoors.',
            special_handling: 'Protect from weather — lumber must stay dry. Inspect for damage on arrival.',
            priority: 'CRITICAL',
            estimated_completion: new Date(now.getTime() + 6 * 3600000).toISOString(),
            notes: [
                { id: 'N-D3', author: 'dealer' as OrderNoteAuthor, author_name: 'Northern Ag Partners', message: 'URGENT: Construction project deadline. Need lumber on-site by March 19. Can you expedite the transfer?', timestamp: new Date(now.getTime() - 71 * 3600000).toISOString() },
                { id: 'N-C3', author: 'command' as OrderNoteAuthor, author_name: 'Campbell Ops', message: 'Understood. Forklift crew assigned. Transfer complete — 2 truckloads ready for dispatch.', timestamp: new Date(now.getTime() - 12 * 3600000).toISOString() },
                { id: 'N-D4', author: 'destination' as OrderNoteAuthor, author_name: 'Fargo Builders Depot', message: 'Receiving dock cleared. We can accept deliveries 7 AM to 5 PM. Ask for loading bay 3.', timestamp: new Date(now.getTime() - 8 * 3600000).toISOString() },
            ],
            last_mile: {
                requested: true,
                destination_facility: 'Fargo Builders Depot',
                destination_address: '8900 Industrial Blvd, Fargo, ND 58102',
                destination_contact: 'Sarah Thompson',
                destination_phone: '701-555-0298',
                unloading_instructions: 'Loading bay 3. Forklift available on-site. Max truck height 13\'6\".',
                truck_id: '',
                estimated_arrival: '',
            },
            status: 'LOADED',
            status_history: [
                { status: 'PENDING', timestamp: new Date(now.getTime() - 72 * 3600000).toISOString(), note: 'Order submitted by dealer' },
                { status: 'RECEIVED', timestamp: new Date(now.getTime() - 68 * 3600000).toISOString(), note: 'Approved — rush priority' },
                { status: 'TRANSLOADING', timestamp: new Date(now.getTime() - 60 * 3600000).toISOString(), note: 'Transloading started' },
                { status: 'LOADED', timestamp: new Date(now.getTime() - 12 * 3600000).toISOString(), note: 'All lumber transferred and wrapped' },
            ],
            created_at: new Date(now.getTime() - 72 * 3600000).toISOString(),
            updated_at: new Date(now.getTime() - 12 * 3600000).toISOString(),
        },
        {
            id: 'TL-DEMO-004',
            dealer_name: 'Valley Grain Exchange',
            dealer_code: 'VGE2026',
            commodity: 'HRS Wheat',
            product_category: 'GRAIN',
            quantity: 45000,
            quantity_unit: 'bushels',
            quantity_unit_abbrev: 'bu',
            num_cars: 12,
            transloading_instructions: 'Load from wheat bins A1-A3. Protein test required: minimum 14% target. Sample each car before sealing.',
            unloading_instructions: 'Gravity unload into receiving pit #3. Dust suppression required.',
            special_handling: 'Protein segregation required — hold any cars below 13.5% for re-grading.',
            priority: 'RUSH',
            estimated_completion: new Date(now.getTime() + 24 * 3600000).toISOString(),
            notes: [
                { id: 'N-D5', author: 'dealer' as OrderNoteAuthor, author_name: 'Valley Grain Exchange', message: 'First wheat order of the season. Buyer is paying premium for 14%+ protein — please grade carefully.', timestamp: new Date(now.getTime() - 6 * 3600000).toISOString() },
                { id: 'N-C4', author: 'command' as OrderNoteAuthor, author_name: 'Campbell Ops', message: 'Received. Will run protein tests on each car. Starting loading at 7 AM tomorrow.', timestamp: new Date(now.getTime() - 4 * 3600000).toISOString() },
            ],
            last_mile: {
                requested: false,
                destination_facility: '',
                destination_address: '',
                destination_contact: '',
                destination_phone: '',
                unloading_instructions: '',
                truck_id: '',
                estimated_arrival: '',
            },
            status: 'RECEIVED',
            status_history: [
                { status: 'PENDING', timestamp: new Date(now.getTime() - 8 * 3600000).toISOString(), note: 'Order submitted by dealer' },
                { status: 'RECEIVED', timestamp: new Date(now.getTime() - 5 * 3600000).toISOString(), note: 'Confirmed by ops — scheduled for tomorrow loading' },
            ],
            created_at: new Date(now.getTime() - 8 * 3600000).toISOString(),
            updated_at: new Date(now.getTime() - 5 * 3600000).toISOString(),
        },
        {
            id: 'TL-DEMO-005',
            dealer_name: 'Dakota Aggregates LLC',
            dealer_code: 'DAG2026',
            commodity: 'Crushed Stone',
            product_category: 'AGGREGATE',
            quantity: 350,
            quantity_unit: 'tons',
            quantity_unit_abbrev: 'T',
            num_cars: 4,
            transloading_instructions: 'Front-end loader transfer from gondola cars to stockpile area. Keep separate from gravel stockpile. Grade: 3/4" clean crush.',
            unloading_instructions: 'Dump at designated aggregate pad. Loader available on site for re-stacking.',
            special_handling: '',
            priority: 'STANDARD',
            estimated_completion: '',
            notes: [
                { id: 'N-D6', author: 'dealer' as OrderNoteAuthor, author_name: 'Dakota Aggregates LLC', message: 'Road construction project. Need 3/4" clean — no fines. Separate from the Class 5 stockpile.', timestamp: new Date(now.getTime() - 1 * 3600000).toISOString() },
            ],
            last_mile: {
                requested: true,
                destination_facility: 'Cass County Highway Dept',
                destination_address: '1201 Main Ave W, West Fargo, ND 58078',
                destination_contact: 'Greg Nelson',
                destination_phone: '701-555-0199',
                unloading_instructions: 'Dump at south stockpile area. GPS coords on file. Scale ticket required.',
                truck_id: '',
                estimated_arrival: '',
            },
            status: 'PENDING',
            status_history: [
                { status: 'PENDING', timestamp: new Date(now.getTime() - 1 * 3600000).toISOString(), note: 'Order submitted by dealer' },
            ],
            created_at: new Date(now.getTime() - 1 * 3600000).toISOString(),
            updated_at: new Date(now.getTime() - 1 * 3600000).toISOString(),
        },
    ];

    localStorage.setItem(TRANSLOAD_STORAGE_KEY, JSON.stringify(demoOrders));
    window.dispatchEvent(new Event('transload-update'));
}

// ── Fleet Data ─────────────────────────────────────────────────────────────

export const fetchFleet = async (): Promise<Railcar[]> => {
    // Returning a mock 6-car unit train for the 3D visualization
    return [
        {
            car_id: "BNSF 482011",
            status: "IN_TRANSIT",
            destination: "CHS Pacific Terminal, OR",
            rfid_tag: "0xA1F49B2",
            hoppers: [
                {
                    id: "h1", hopper_number: 1,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 65100, top_seal: "ND-991A", bottom_seal: "ND-991B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65120, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8801"
                },
                {
                    id: "h2", hopper_number: 2,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 64800, top_seal: "ND-992A", bottom_seal: "ND-992B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 64810, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8802"
                },
                {
                    id: "h3", hopper_number: 3,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 65050, top_seal: "ND-993A", bottom_seal: "ND-993B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65040, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8803"
                }
            ]
        },
        {
            car_id: "BNSF 482045",
            status: "IN_TRANSIT",
            destination: "CHS Pacific Terminal, OR",
            rfid_tag: "0xA1F49C5",
            hoppers: [
                {
                    id: "h4", hopper_number: 1,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 65200, top_seal: "ND-994A", bottom_seal: "ND-994B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65205, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8804"
                },
                {
                    id: "h5", hopper_number: 2,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "Sample Grade Corn", 
                    weight_lbs: 64900, top_seal: "ND-995A", bottom_seal: "ND-995B",
                    matches_buyer_spec: false, // Intentional mismatch for UI testing
                    ndgi_certified: true, ndgi_certified_weight_lbs: 64900, ndgi_certified_grade: "Sample Grade", ndgi_certificate_id: "NDGI-2026-8805"
                },
                {
                    id: "h6", hopper_number: 3,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 65100, top_seal: "ND-996A", bottom_seal: "ND-996B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65110, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8806"
                }
            ]
        },
        {
            car_id: "BNSF 482112",
            status: "IN_TRANSIT",
            destination: "CHS Pacific Terminal, OR",
            rfid_tag: "0xA1F49D1",
            hoppers: [
                {
                    id: "h7", hopper_number: 1,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 65000, top_seal: "ND-997A", bottom_seal: "ND-997B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65010, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8807"
                },
                {
                    id: "h8", hopper_number: 2,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", 
                    weight_lbs: 65150, top_seal: "ND-998A", bottom_seal: "ND-998B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8808"
                },
                {
                    id: "h9", hopper_number: 3,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 64950, top_seal: "ND-999A", bottom_seal: "ND-999B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 64960, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8809"
                }
            ]
        },
        {
            car_id: "BNSF 482209",
            status: "IN_TRANSIT",
            destination: "CHS Pacific Terminal, OR",
            rfid_tag: "0xA1F49E4",
            hoppers: [
                {
                    id: "h10", hopper_number: 1,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 65120, top_seal: "ND-1001A", bottom_seal: "ND-1001B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65120, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8810"
                },
                {
                    id: "h11", hopper_number: 2,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", 
                    weight_lbs: 65080, top_seal: "ND-1002A", bottom_seal: "ND-1002B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65080, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8811"
                },
                {
                    id: "h12", hopper_number: 3,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 64990, top_seal: "ND-1003A", bottom_seal: "ND-1003B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 64995, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8812"
                }
            ]
        },
        {
            car_id: "BNSF 482333",
            status: "IN_TRANSIT",
            destination: "CHS Pacific Terminal, OR",
            rfid_tag: "0xA1F49F7",
            hoppers: [
                {
                    id: "h13", hopper_number: 1,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "Moisture 16%",
                    weight_lbs: 65220, top_seal: "ND-1004A", bottom_seal: "ND-1004B",
                    matches_buyer_spec: false,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65220, ndgi_certified_grade: "US #3 YC", ndgi_certificate_id: "NDGI-2026-8813"
                },
                {
                    id: "h14", hopper_number: 2,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", 
                    weight_lbs: 64880, top_seal: "ND-1005A", bottom_seal: "ND-1005B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 64880, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8814"
                },
                {
                    id: "h15", hopper_number: 3,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 65010, top_seal: "ND-1006A", bottom_seal: "ND-1006B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65010, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8815"
                }
            ]
        },
        {
            car_id: "BNSF 482405",
            status: "IN_TRANSIT",
            destination: "CHS Pacific Terminal, OR",
            rfid_tag: "0xA1F50A1",
            hoppers: [
                {
                    id: "h16", hopper_number: 1,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 65150, top_seal: "ND-1007A", bottom_seal: "ND-1007B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8816"
                },
                {
                    id: "h17", hopper_number: 2,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", 
                    weight_lbs: 65020, top_seal: "ND-1008A", bottom_seal: "ND-1008B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 65020, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8817"
                },
                {
                    id: "h18", hopper_number: 3,
                    commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn",
                    weight_lbs: 64900, top_seal: "ND-1009A", bottom_seal: "ND-1009B",
                    matches_buyer_spec: true,
                    ndgi_certified: true, ndgi_certified_weight_lbs: 64900, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8818"
                }
            ]
        },
        {
            car_id: "BNSF 482555",
            status: "IN_TRANSIT",
            destination: "CHS Pacific Terminal, OR",
            rfid_tag: "0xA1F50A2",
            hoppers: [
                { id: "h19", hopper_number: 1, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A1", bottom_seal: "ND-B1", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8819" },
                { id: "h20", hopper_number: 2, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A2", bottom_seal: "ND-B2", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8820" },
                { id: "h21", hopper_number: 3, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A3", bottom_seal: "ND-B3", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8821" }
            ]
        },
        {
            car_id: "BNSF 482612",
            status: "IN_TRANSIT",
            destination: "CHS Pacific Terminal, OR",
            rfid_tag: "0xA1F50A3",
            hoppers: [
                { id: "h22", hopper_number: 1, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A4", bottom_seal: "ND-B4", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8822" },
                { id: "h23", hopper_number: 2, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A5", bottom_seal: "ND-B5", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8823" },
                { id: "h24", hopper_number: 3, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A6", bottom_seal: "ND-B6", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8824" }
            ]
        },
        {
            car_id: "BNSF 482788",
            status: "IN_TRANSIT",
            destination: "CHS Pacific Terminal, OR",
            rfid_tag: "0xA1F50A4",
            hoppers: [
                { id: "h25", hopper_number: 1, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A7", bottom_seal: "ND-B7", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8825" },
                { id: "h26", hopper_number: 2, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A8", bottom_seal: "ND-B8", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8826" },
                { id: "h27", hopper_number: 3, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A9", bottom_seal: "ND-B9", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8827" }
            ]
        },
        {
            car_id: "BNSF 482991",
            status: "IN_TRANSIT",
            destination: "CHS Pacific Terminal, OR",
            rfid_tag: "0xA1F50A5",
            hoppers: [
                { id: "h28", hopper_number: 1, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A10", bottom_seal: "ND-B10", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8828" },
                { id: "h29", hopper_number: 2, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A11", bottom_seal: "ND-B11", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8829" },
                { id: "h30", hopper_number: 3, commodity_expected: "#2 Yellow Corn", commodity_loaded: "#2 Yellow Corn", weight_lbs: 65150, top_seal: "ND-A12", bottom_seal: "ND-B12", matches_buyer_spec: true, ndgi_certified: true, ndgi_certified_weight_lbs: 65150, ndgi_certified_grade: "US #2 YC", ndgi_certificate_id: "NDGI-2026-8830" }
            ]
        }
    ];
};


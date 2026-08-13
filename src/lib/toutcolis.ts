// Shared constants & helpers for the TOUT COLIS module.

export const SENEGAL_CITIES = [
  "Dakar",
  "Thiès",
  "Touba",
  "Saint-Louis",
  "Kaolack",
  "Ziguinchor",
  "Mbour",
  "Diourbel",
  "Louga",
  "Tambacounda",
  "Kolda",
  "Matam",
  "Fatick",
  "Kaffrine",
  "Sédhiou",
  "Kédougou",
  "Rufisque",
  "Richard-Toll",
];

export const COUNTRIES = [
  "Sénégal",
  "France",
  "Mali",
  "Mauritanie",
  "Gambie",
  "Guinée",
  "Côte d'Ivoire",
  "Maroc",
  "Espagne",
  "Italie",
  "États-Unis",
  "Canada",
  "Autre",
];

export const PARCEL_TYPES = [
  "Document",
  "Colis standard",
  "Vêtements",
  "Électronique",
  "Nourriture",
  "Médicaments",
  "Meuble / volumineux",
  "Autre",
];

export const VEHICLE_TYPES = [
  "Voiture",
  "Camionnette",
  "Camion",
  "Bus",
  "Moto",
  "Avion (bagage)",
  "Bateau",
];

export const DELIVERY_MODES = [
  "Point à point",
  "À domicile",
  "Retrait en agence",
];

export const formatFcfa = (value?: number | null, currency = "FCFA") =>
  value === null || value === undefined || Number.isNaN(value)
    ? "À négocier"
    : `${new Intl.NumberFormat("fr-FR").format(Number(value))} ${currency}`;

export const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "Flexible";

export const buildWhatsAppLink = (phone?: string | null, message?: string) => {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("221") || digits.length > 9 ? digits : `221${digits}`;
  return `https://wa.me/${normalized}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
};

// ---------------------------------------------------------------------------
// Estimation temps réel du prix et du délai (heuristique locale, sans appel réseau)
// ---------------------------------------------------------------------------

export type QuoteInput = {
  departure_country: string;
  departure_city: string;
  arrival_country: string;
  arrival_city: string;
  parcel_type?: string;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  declared_value?: number | null;
  delivery_mode?: string;
};

export type QuoteResult = {
  ready: boolean;
  missing: string[];
  priceMin: number;
  priceMax: number;
  daysMin: number;
  daysMax: number;
  billableWeight: number;
  scope: "local" | "national" | "sous-region" | "international";
  scopeLabel: string;
  breakdown: { label: string; value: string }[];
};

const AFRICA_WEST = ["Sénégal", "Mali", "Mauritanie", "Gambie", "Guinée", "Côte d'Ivoire"];

const TYPE_FACTOR: Record<string, number> = {
  "Document": 0.7,
  "Colis standard": 1,
  "Vêtements": 0.95,
  "Électronique": 1.35,
  "Nourriture": 1.15,
  "Médicaments": 1.25,
  "Meuble / volumineux": 1.5,
  "Autre": 1,
};

const MODE_FACTOR: Record<string, number> = {
  "Point à point": 1,
  "À domicile": 1.2,
  "Retrait en agence": 0.9,
};

const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();

export const estimateQuote = (input: QuoteInput): QuoteResult => {
  const missing: string[] = [];
  if (!input.departure_city.trim()) missing.push("ville de départ");
  if (!input.arrival_city.trim()) missing.push("ville d'arrivée");
  const weight = Number(input.weight ?? 0);
  if (!weight || weight <= 0) missing.push("poids");

  const sameCountry = input.departure_country === input.arrival_country;
  const sameCity = sameCountry && norm(input.departure_city) === norm(input.arrival_city);
  const bothWestAfrica =
    AFRICA_WEST.includes(input.departure_country) && AFRICA_WEST.includes(input.arrival_country);

  const scope: QuoteResult["scope"] = sameCity
    ? "local"
    : sameCountry
      ? "national"
      : bothWestAfrica
        ? "sous-region"
        : "international";

  const SCOPE = {
    local: { base: 1500, perKg: 250, days: [1, 2], label: "Course locale" },
    national: { base: 3000, perKg: 600, days: [1, 3], label: "Trajet national" },
    "sous-region": { base: 12000, perKg: 2200, days: [3, 7], label: "Sous-région ouest-africaine" },
    international: { base: 25000, perKg: 4500, days: [7, 15], label: "Envoi international" },
  }[scope];

  // Poids volumétrique (norme 5000 cm³/kg)
  const vol =
    input.length && input.width && input.height
      ? (Number(input.length) * Number(input.width) * Number(input.height)) / 5000
      : 0;
  const billableWeight = Math.max(weight || 0, vol);

  const typeFactor = TYPE_FACTOR[input.parcel_type ?? ""] ?? 1;
  const modeFactor = MODE_FACTOR[input.delivery_mode ?? ""] ?? 1;
  const insurance = input.declared_value ? Number(input.declared_value) * 0.01 : 0;

  const raw = (SCOPE.base + SCOPE.perKg * billableWeight) * typeFactor * modeFactor + insurance;
  const round = (n: number) => Math.max(500, Math.round(n / 500) * 500);

  let daysMin = SCOPE.days[0];
  let daysMax = SCOPE.days[1];
  if (billableWeight > 30) daysMax += 2;
  if (input.delivery_mode === "À domicile") daysMax += 1;

  return {
    ready: missing.length === 0,
    missing,
    priceMin: round(raw * 0.85),
    priceMax: round(raw * 1.2),
    daysMin,
    daysMax,
    billableWeight: Math.round(billableWeight * 10) / 10,
    scope,
    scopeLabel: SCOPE.label,
    breakdown: [
      { label: "Type de trajet", value: SCOPE.label },
      { label: "Poids facturable", value: `${Math.round(billableWeight * 10) / 10} kg` },
      { label: "Nature du colis", value: input.parcel_type || "Non précisé" },
      { label: "Mode de livraison", value: input.delivery_mode || "Point à point" },
      ...(insurance > 0
        ? [{ label: "Assurance (1% valeur)", value: formatFcfa(round(insurance)) }]
        : []),
    ],
  };
};

import { ArrowRight, Boxes, CalendarDays, MapPin, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatFcfa } from "@/lib/toutcolis";

export interface ParcelItem {
  id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string | null;
  parcel_type: string | null;
  description: string | null;
  weight: number | null;
  price: number | null;
  currency: string;
  status: string;
  created_at: string;
}

const ParcelCard = ({ parcel, onContact }: { parcel: ParcelItem; onContact?: (p: ParcelItem) => void }) => (
  <Card className="group relative overflow-hidden border-primary/15 bg-card/60 backdrop-blur-sm p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-gold">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MapPin className="w-4 h-4 text-primary" />
        <span>{parcel.departure_city}</span>
        <ArrowRight className="w-4 h-4 text-primary/70" />
        <span>{parcel.arrival_city}</span>
      </div>
      <Badge variant="secondary" className="shrink-0">{parcel.parcel_type ?? "Colis"}</Badge>
    </div>

    <p className="mt-1 text-xs text-muted-foreground">
      {parcel.departure_country} → {parcel.arrival_country}
    </p>

    {parcel.description && (
      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{parcel.description}</p>
    )}

    <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <CalendarDays className="w-3.5 h-3.5 text-primary/80" /> {formatDate(parcel.departure_date)}
      </span>
      {parcel.weight != null && (
        <span className="inline-flex items-center gap-1">
          <Scale className="w-3.5 h-3.5 text-primary/80" /> {parcel.weight} kg
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        <Boxes className="w-3.5 h-3.5 text-primary/80" /> {parcel.status === "matched" ? "Pris en charge" : "Disponible"}
      </span>
    </div>

    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="text-base font-bold text-primary">{formatFcfa(parcel.price, parcel.currency)}</span>
      {onContact && (
        <Button variant="gold" size="sm" className="rounded-full" onClick={() => onContact(parcel)}>
          Proposer un transport
        </Button>
      )}
    </div>
  </Card>
);

export default ParcelCard;

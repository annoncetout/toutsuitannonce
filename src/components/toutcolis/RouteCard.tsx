import { ArrowRight, BadgeCheck, CalendarDays, MapPin, Scale, Truck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatFcfa } from "@/lib/toutcolis";

export interface RouteItem {
  id: string;
  transporter_id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string | null;
  departure_time: string | null;
  vehicle_type: string | null;
  price: number | null;
  currency: string;
  available_weight: number | null;
  description: string | null;
  transporter?: {
    display_name: string | null;
    photo: string | null;
    verified: boolean;
    rating: number;
    total_trips: number;
  } | null;
}

const RouteCard = ({ route, onContact }: { route: RouteItem; onContact?: (r: RouteItem) => void }) => {
  const t = route.transporter;
  return (
    <Card className="group relative overflow-hidden border-primary/15 bg-card/60 backdrop-blur-sm p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-gold">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-primary/30">
          <AvatarImage src={t?.photo ?? undefined} alt={t?.display_name ?? "Transporteur"} />
          <AvatarFallback>{(t?.display_name ?? "T").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm font-semibold text-foreground truncate">
            {t?.display_name ?? "Transporteur"}
            {t?.verified && <BadgeCheck className="w-4 h-4 text-primary" aria-label="Transporteur vérifié" />}
          </p>
          <p className="text-xs text-muted-foreground">
            {t?.total_trips ?? 0} trajet(s) · note {Number(t?.rating ?? 0).toFixed(1)}/5
          </p>
        </div>
        {route.vehicle_type && (
          <Badge variant="secondary" className="ml-auto shrink-0">
            <Truck className="w-3 h-3 mr-1" /> {route.vehicle_type}
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <MapPin className="w-4 h-4 text-primary" />
        <span>{route.departure_city}</span>
        <ArrowRight className="w-4 h-4 text-primary/70" />
        <span>{route.arrival_city}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {route.departure_country} → {route.arrival_country}
      </p>

      {route.description && (
        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{route.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5 text-primary/80" />
          {formatDate(route.departure_date)}
          {route.departure_time ? ` · ${route.departure_time.slice(0, 5)}` : ""}
        </span>
        {route.available_weight != null && (
          <span className="inline-flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-primary/80" /> {route.available_weight} kg dispo
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-base font-bold text-primary">{formatFcfa(route.price, route.currency)}</span>
        {onContact && (
          <Button variant="gold" size="sm" className="rounded-full" onClick={() => onContact(route)}>
            Réserver
          </Button>
        )}
      </div>
    </Card>
  );
};

export default RouteCard;

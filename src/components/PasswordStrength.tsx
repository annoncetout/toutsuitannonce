import { Check, X } from "lucide-react";

export type PasswordCheck = {
  label: string;
  ok: boolean;
};

export function evaluatePassword(password: string): { score: number; checks: PasswordCheck[] } {
  const checks: PasswordCheck[] = [
    { label: "Au moins 8 caractères", ok: password.length >= 8 },
    { label: "Une lettre majuscule", ok: /[A-Z]/.test(password) },
    { label: "Une lettre minuscule", ok: /[a-z]/.test(password) },
    { label: "Un chiffre", ok: /[0-9]/.test(password) },
    { label: "Un caractère spécial (!@#…)", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  return { score, checks };
}

const LEVELS = [
  { label: "Très faible", color: "bg-destructive", text: "text-destructive" },
  { label: "Faible", color: "bg-destructive", text: "text-destructive" },
  { label: "Moyen", color: "bg-yellow-500", text: "text-yellow-600" },
  { label: "Bon", color: "bg-yellow-500", text: "text-yellow-600" },
  { label: "Fort", color: "bg-green-500", text: "text-green-600" },
  { label: "Excellent", color: "bg-green-500", text: "text-green-600" },
];

export default function PasswordStrength({ password }: { password: string }) {
  const { score, checks } = evaluatePassword(password);
  const level = LEVELS[score];

  if (!password) {
    return (
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5">
            <X className="h-3 w-3 opacity-60" />
            {c.label}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < score ? level.color : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${level.text}`}>Force : {level.label}</p>
      <ul className="space-y-1 text-xs">
        {checks.map((c) => (
          <li
            key={c.label}
            className={`flex items-center gap-1.5 ${
              c.ok ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-60" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

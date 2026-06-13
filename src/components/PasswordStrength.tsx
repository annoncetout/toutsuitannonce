import { AlertTriangle, Check, X } from "lucide-react";

export type PasswordCheck = {
  label: string;
  ok: boolean;
  required?: boolean;
};

const BLOCKED_PASSWORDS = new Set([
  "123456",
  "12345678",
  "password",
  "qwerty",
  "azerty",
  "admin",
  "welcome",
]);

export function isPasswordBlocked(password: string): boolean {
  return BLOCKED_PASSWORDS.has(password.trim().toLowerCase());
}

export function evaluatePassword(password: string): {
  score: number;
  checks: PasswordCheck[];
  valid: boolean;
  blocked: boolean;
  weak: boolean;
} {
  const checks: PasswordCheck[] = [
    { label: "Au moins 8 caractères", ok: password.length >= 8, required: true },
    { label: "Au moins une lettre", ok: /[A-Za-z]/.test(password), required: true },
    { label: "Au moins un chiffre", ok: /[0-9]/.test(password), required: true },
    { label: "Une lettre majuscule (recommandé)", ok: /[A-Z]/.test(password) },
    { label: "Un caractère spécial (recommandé)", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const requiredOk = checks.filter((c) => c.required).every((c) => c.ok);
  const blocked = isPasswordBlocked(password);
  const valid = requiredOk && !blocked;
  const weak = valid && score < 5;
  return { score, checks, valid, blocked, weak };
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
  const { score, checks, valid, blocked, weak } = evaluatePassword(password);
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

      {blocked && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-destructive">
          <X className="mt-0.5 h-3 w-3 shrink-0" />
          Ce mot de passe est trop courant et n’est pas autorisé.
        </p>
      )}

      {!blocked && valid && weak && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-yellow-600">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          Mot de passe faible, nous recommandons un mot de passe plus sécurisé.
        </p>
      )}

      <ul className="space-y-1 text-xs">
        {checks.map((c) => (
          <li
            key={c.label}
            className={`flex items-center gap-1.5 ${
              c.ok ? "text-green-600" : c.required ? "text-destructive" : "text-muted-foreground"
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

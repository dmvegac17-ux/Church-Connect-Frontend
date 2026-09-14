import { ROLE_LABELS, type UserRole } from "../../types/user";

const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN: "bg-primary/15 text-primary",
  PARTICIPANT: "bg-accent text-accent-foreground",
  MEMBER: "bg-muted text-muted-foreground",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean | null }) {
  if (active === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        active
          ? "bg-primary/15 text-primary"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

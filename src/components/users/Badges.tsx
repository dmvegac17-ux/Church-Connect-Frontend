import { ROLE_LABELS, type UserRole } from "../../types/user";
import { Pill, type PillTone } from "../ui/primitives";

const ROLE_TONES: Record<UserRole, PillTone> = {
  ADMIN: "success",
  MEMBER: "sand",
};

export function RoleBadge({
  role,
  className = "!text-[13px]",
}: {
  role: UserRole;
  className?: string;
}) {
  return (
    <Pill tone={ROLE_TONES[role]} className={className}>
      {ROLE_LABELS[role]}
    </Pill>
  );
}

/** Activo / Inactivo: punto de color + texto (nunca solo color). */
export function ActiveBadge({ active }: { active: boolean | null }) {
  if (active === null) {
    return <span className="text-[13px] text-muted-foreground">—</span>;
  }
  return (
    <Pill
      tone={active ? "success" : "neutral"}
      dot={active ? "bg-success" : "bg-icon-muted"}
      className="!text-[13px]"
    >
      {active ? "Activo" : "Inactivo"}
    </Pill>
  );
}

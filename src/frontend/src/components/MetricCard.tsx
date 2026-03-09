import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  icon?: ReactNode;
  accentColor?: "pv" | "grid-draw" | "grid-feed" | "ev" | "self" | "default";
  large?: boolean;
  className?: string;
  dataOcid?: string;
}

const accentMap = {
  pv: "oklch(0.78 0.16 75)",
  "grid-draw": "oklch(0.65 0.2 25)",
  "grid-feed": "oklch(0.65 0.13 195)",
  ev: "oklch(0.72 0.18 140)",
  self: "oklch(0.68 0.14 280)",
  default: "oklch(0.78 0.16 75)",
};

const borderMap = {
  pv: "border-l-2",
  "grid-draw": "border-l-2",
  "grid-feed": "border-l-2",
  ev: "border-l-2",
  self: "border-l-2",
  default: "border-l-2",
};

export default function MetricCard({
  label,
  value,
  unit,
  description,
  icon,
  accentColor = "default",
  large: _large = false,
  className,
  dataOcid,
}: MetricCardProps) {
  const accent = accentMap[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-ocid={dataOcid}
      className={cn(
        "relative bg-card border border-border rounded-lg p-4 overflow-hidden min-h-[120px] h-full flex flex-col justify-between",
        borderMap[accentColor],
        className,
      )}
      style={{ borderLeftColor: accent }}
    >
      {/* Subtle glow in top corner */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none"
        style={{ background: accent, transform: "translate(40%, -40%)" }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider truncate">
            {label}
          </p>
          <div className="flex items-end gap-1.5 mt-1.5">
            <span
              className={cn(
                "metric-value font-mono font-bold leading-none",
                "text-2xl",
                "text-foreground",
              )}
              style={{ color: accent }}
            >
              {typeof value === "number"
                ? value.toLocaleString("de-DE", { maximumFractionDigits: 1 })
                : value}
            </span>
            {unit && (
              <span className="text-sm font-mono text-muted-foreground mb-0.5">
                {unit}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center opacity-80"
            style={{ backgroundColor: `${accent}18` }}
          >
            <div style={{ color: accent }}>{icon}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

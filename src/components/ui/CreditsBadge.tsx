import { Coins } from "lucide-react";

interface CreditsBadgeProps {
  amount: number;
  unit?: string;
}

const CreditsBadge = ({ amount, unit = "Cr/ton" }: CreditsBadgeProps) => (
  <div className="inline-flex items-center gap-1.5 px-2 py-1 border border-(--hud-border) bg-(--hud-surface-2)">
    <Coins size={11} className="text-(--hud-text-dim) shrink-0" />
    <span className="font-mono text-sm text-(--hud-accent)">
      {amount.toLocaleString()} {unit}
    </span>
  </div>
);

export default CreditsBadge;

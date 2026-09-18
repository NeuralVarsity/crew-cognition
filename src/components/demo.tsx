import { LiquidGlass, LiquidGlassDock } from "@/components/ui/liquid-glass";

export function LiquidGlassDemo() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-6 p-6">
      <LiquidGlass className="w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-foreground">TalentAI Enterprise</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Workforce intelligence in a focused, responsive glass surface.
        </p>
      </LiquidGlass>
      <LiquidGlassDock />
    </div>
  );
}
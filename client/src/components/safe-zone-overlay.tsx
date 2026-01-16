import type { SafeZone } from "@shared/schema";

interface SafeZoneOverlayProps {
  safeZone: SafeZone;
  width: number;
  height: number;
  visible?: boolean;
}

/**
 * SafeZoneOverlay - Visualizes safe zones for ad content
 *
 * Displays semi-transparent borders showing where important content
 * (text, logos, CTAs) should be placed to avoid being cut off by
 * platform UI elements.
 */
export function SafeZoneOverlay({ safeZone, width, height, visible = true }: SafeZoneOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Safe zone border - shows the safe area */}
      <div
        className="absolute border-2 border-dashed border-yellow-400/60"
        style={{
          top: `${(safeZone.top / height) * 100}%`,
          right: `${(safeZone.right / width) * 100}%`,
          bottom: `${(safeZone.bottom / height) * 100}%`,
          left: `${(safeZone.left / width) * 100}%`,
        }}
      />

      {/* Unsafe area overlays - shows what might be cut off */}
      {/* Top unsafe area */}
      {safeZone.top > 0 && (
        <div
          className="absolute top-0 left-0 right-0 bg-red-500/10"
          style={{
            height: `${(safeZone.top / height) * 100}%`,
          }}
        />
      )}

      {/* Bottom unsafe area */}
      {safeZone.bottom > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-red-500/10"
          style={{
            height: `${(safeZone.bottom / height) * 100}%`,
          }}
        />
      )}

      {/* Left unsafe area */}
      {safeZone.left > 0 && (
        <div
          className="absolute top-0 bottom-0 left-0 bg-red-500/10"
          style={{
            width: `${(safeZone.left / width) * 100}%`,
          }}
        />
      )}

      {/* Right unsafe area */}
      {safeZone.right > 0 && (
        <div
          className="absolute top-0 bottom-0 right-0 bg-red-500/10"
          style={{
            width: `${(safeZone.right / width) * 100}%`,
          }}
        />
      )}

      {/* Corner labels */}
      <div className="absolute top-1 left-1 text-[10px] text-yellow-400 font-mono bg-black/30 px-1 rounded">
        SAFE ZONE
      </div>
    </div>
  );
}

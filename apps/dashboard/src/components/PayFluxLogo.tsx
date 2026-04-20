import React from "react";

type PayFluxLogoProps = {
    height?: number;
    className?: string;
    decorative?: boolean;
};

/**
 * PayFlux Production Logo (Refined Version)
 *
 * --- REQUIRED GLOBAL CSS (layout/root) ---
 * .payflux-mark {
 *   color: var(--pf-paper);
 *   --payflux-accent: var(--pf-accent);
 * }
 *
 * --- USAGE EXAMPLES ---
 * 1. Logo is the only brand text:
 *    <div className="payflux-mark">
 *      <PayFluxLogo height={40} />
 *    </div>
 *
 * 2. Logo sits next to "PayFlux" text:
 *    <div className="payflux-mark flex items-center gap-2">
 *      <PayFluxLogo height={28} decorative />
 *      <span className="text-sm font-medium">PayFlux</span>
 *    </div>
 *
 * @param {number} height - Logo height in px (clamped to min 8px).
 * @param {string} className - Optional tailwind or CSS classes.
 * @param {boolean} decorative - When true, the component:
 *   - does not set role="img"
 *   - does not set aria-label
 *   - sets aria-hidden="true"
 *   - sets focusable="false"
 *   - sets pointer-events: none
 *
 *
 * Usage Rules:
 * - If the logo is the only brand text in the header, use decorative={false}.
 * - If "PayFlux" appears as adjacent text (or you have another accessible name), use decorative={true}.
 */
export default function PayFluxLogo({
    height = 40,
    className = "",
    decorative = false,
}: PayFluxLogoProps) {
    // Clamp height to avoid broken SVG sizing (min 8px)
    const h = Number.isFinite(height) ? Math.max(8, height) : 40;
    const isMicro = h <= 24;

    if (!isMicro) {
        const width = Math.round(h * 4); // Based on 560/140 ratio
        return (
            <svg
                viewBox="0 0 560 140"
                height={h}
                width={width}
                className={className}
                style={{ color: "inherit", pointerEvents: decorative ? "none" : "auto" }}
                role={decorative ? undefined : "img"}
                aria-label={decorative ? undefined : "PayFlux"}
                aria-hidden={decorative ? true : undefined}
                focusable="false"
                preserveAspectRatio="xMinYMid meet"
            >
                <style>{`
          .pf-wm { font-family: 'Avenir Next', 'IBM Plex Sans', sans-serif; font-size: 80px; letter-spacing: -0.045em; }
          .pf-pay { font-weight: 600; fill: currentColor; }
          .pf-flux { font-weight: 700; fill: var(--payflux-accent, #e9b575); }
        `}</style>

                <text className="pf-wm" x="0" y="88">
                    <tspan className="pf-pay">Pay</tspan>
                    <tspan className="pf-flux">Flux</tspan>
                </text>
            </svg>
        );
    }

    // Micro variant (wordmark only)
    const width = Math.round(h * 3.6); // Based on 360/100 ratio
    return (
        <svg
            viewBox="0 0 360 100"
            height={h}
            width={width}
            className={className}
            style={{ color: "inherit", pointerEvents: decorative ? "none" : "auto" }}
            role={decorative ? undefined : "img"}
            aria-label={decorative ? undefined : "PayFlux"}
            aria-hidden={decorative ? true : undefined}
            focusable="false"
            preserveAspectRatio="xMinYMid meet"
        >
            <style>{`
        .pfm-wm { font-family: 'Avenir Next', 'IBM Plex Sans', sans-serif; font-size: 80px; letter-spacing: -0.045em; }
        .pfm-pay { font-weight: 600; fill: currentColor; }
        .pfm-flux { font-weight: 700; fill: var(--payflux-accent, #e9b575); }
      `}</style>

            <text className="pfm-wm" x="0" y="80">
                <tspan className="pfm-pay">Pay</tspan>
                <tspan className="pfm-flux">Flux</tspan>
            </text>
        </svg>
    );
}

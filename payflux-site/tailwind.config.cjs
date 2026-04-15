module.exports = {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
                mono: [
                    "JetBrains Mono",
                    "ui-monospace",
                    "SFMono-Regular",
                    "Menlo",
                    "Monaco",
                    "Consolas",
                    "Liberation Mono",
                    "Courier New",
                    "monospace",
                ],
            },
            colors: {
                payflux: {
                    blue: "#0A64BC",
                    "blue-deep": "#08539E",
                    amber: "#BC620A",
                    canvas: "#0A0B0E",
                    surface: "#0F1116",
                    "surface-2": "#17191F",
                    ink: "#F5F6F8",
                    "ink-secondary": "#A1A7B3",
                    "ink-tertiary": "#636872",
                },
            },
            maxWidth: {
                document: "960px",
                editorial: "720px",
                split: "1120px",
            },
            letterSpacing: {
                kicker: "0.22em",
                "kicker-tight": "0.15em",
                "kicker-wide": "0.3em",
            },
            fontSize: {
                kicker: ["11px", { lineHeight: "1", letterSpacing: "0.22em" }],
                "kicker-sm": ["10px", { lineHeight: "1", letterSpacing: "0.2em" }],
            },
        },
    },
    plugins: [],
};

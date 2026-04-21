#!/usr/bin/env node
const fs = require("fs");

if (process.env.DOC_GEN === "off") {
    console.log("Doc generation disabled");
    process.exit(0);
}

function fail(msg) {
    console.error("DOC GEN FAILED:", msg);
    process.exit(1);
}

function loadJSON(path) {
    try {
        return JSON.parse(fs.readFileSync(path, "utf8"));
    } catch (e) {
        fail("Invalid JSON: " + path);
    }
}

const taxonomy = loadJSON("docs/SYSTEM_TAXONOMY.json");
const registry = loadJSON("internal/specs/signal-registry.v1.json");

if (!taxonomy.primitives) fail("taxonomy missing primitives");
if (!registry.signals) fail("registry missing signals");

taxonomy.primitives.forEach(p => {
    ["name", "layer", "determinism", "file"].forEach(f => {
        if (!p[f]) fail(`primitive missing ${f}: ${p.name}`);
    });
    if (!fs.existsSync(p.file))
        fail(`missing primitive file: ${p.file}`);
});

registry.signals.forEach(s => {
    ["id", "type", "severity", "deterministic", "trigger"].forEach(f => {
        if (s[f] === undefined)
            fail(`signal missing ${f}: ${s.id}`);
    });
});

const signalRows = registry.signals
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(s => `
<tr>
<td>${s.id}</td>
<td>${s.type}</td>
<td>${s.severity}</td>
<td>${s.deterministic ? "Yes" : "No"}</td>
<td><code>${s.trigger}</code></td>
</tr>`).join("");

const primitiveRows = taxonomy.primitives
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(p => `
<tr>
<td>${p.name}</td>
<td>${p.layer}</td>
<td>${p.determinism}</td>
<td>${p.bounded ? "Yes" : "No"}</td>
</tr>`).join("");

function inject(file, start, end, content) {
    let html = fs.readFileSync(file, "utf8");
    const s = html.indexOf(start);
    const e = html.indexOf(end);
    if (s === -1 || e === -1) fail(`markers missing in ${file}`);
    html =
        html.slice(0, s + start.length)
        + "\n" + content + "\n"
        + html.slice(e);
    fs.writeFileSync(file, html);
}

inject(
    "payflux-site/src/static/signals.html",
    "<!-- AUTO START SIGNALS -->",
    "<!-- AUTO END SIGNALS -->",
    signalRows
);

inject(
    "payflux-site/src/static/taxonomy.html",
    "<!-- AUTO START PRIMITIVES -->",
    "<!-- AUTO END PRIMITIVES -->",
    primitiveRows
);

console.log("DOCS AUTO-GENERATED SUCCESSFULLY");

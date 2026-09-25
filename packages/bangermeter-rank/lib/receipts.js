"use strict";
// Research figures a client may see. get() throws on an unknown id, so a report
// that tries to cite a figure nobody measured fails at build time.
const data = require("../receipts/2026-09-23.json");

const byId = new Map(data.figures.map(f => [f.id, f]));

function get(id) {
  const f = byId.get(id);
  if (!f) throw new Error("Numbers Gate: '" + id + "' is not in receipts/2026-09-23.json");
  return f;
}

const MINUS = "−";

function signed(s, v) { return v < 0 ? MINUS + s.replace(/^-/, "") : s; }

// Rates render as percentages at the precision they were recorded; counts get
// thousands separators; correlations keep their recorded digits.
function fmt(id) {
  const f = get(id);
  const v = f.value;
  if (typeof v !== "number") return String(v);
  if (f.unit === "rate") return pctString(v);
  if (f.unit === "usd") return "$" + v.toFixed(2);
  if (Number.isInteger(v)) return signed(v.toLocaleString("en-US"), v);
  return signed(String(v), v);
}

function pctString(v) {
  // 0.0153 → "1.53%", 0.115 → "11.5%": trim float noise, keep recorded digits.
  const p = Number((v * 100).toPrecision(12));
  return String(p) + "%";
}

// Every string form a recorded figure may take in prose.
function allowedTokens() {
  const out = new Set();
  for (const f of data.figures) {
    const v = f.value;
    if (typeof v !== "number") continue;
    const forms = [String(v), String(Math.abs(v)), v.toFixed(2), Math.abs(v).toFixed(2)];
    if (Number.isInteger(v)) forms.push(Math.abs(v).toLocaleString("en-US"));
    if (f.unit === "rate") forms.push(pctString(v), String(Number((v * 100).toFixed(2))) + "%");
    for (const s of forms) out.add(normalize(s));
  }
  return out;
}

function normalize(tok) {
  return tok.replace(/^[−-]/, "").replace(/^\$/, "").replace(/,/g, "");
}

module.exports = { data, get, fmt, allowedTokens, normalize, pctString };

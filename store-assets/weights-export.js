// Emits promo-relevant values from extension/weights.js as JSON, so the store
// art derives its numbers from the same file the extension scores with and
// cannot drift from it. Consumed by make-promos.ps1 / make-screenshot.ps1.
//
//   node store-assets/weights-export.js
//
// Which ROWS appear is an editorial choice and stays here; the VALUES are never
// written down twice.
const fs = require("fs"), path = require("path"), vm = require("vm");

const ext = path.join(__dirname, "..", "extension");
const ctx = { Math, Object, JSON };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ext, "weights.js"), "utf8"), ctx, { filename: "weights.js" });
const C = ctx.BANGERMETER_CONFIG, H = C.heads;

// Rows chosen for the marquee's mini breakdown: the heaviest positive, the two
// people actually recognise, and the heaviest negative.
const ROWS = ["share_via_copy_link", "reply", "favorite", "report"];
const LABELS = {
  share_via_copy_link: "COPY LINK",
  reply: "REPLIES",
  favorite: "LIKES",
  report: "REPORTS"
};

const fav = H.favorite.weight;
const rows = ROWS.map(k => ({
  key: k,
  label: LABELS[k],
  weight: H[k].weight,
  // Bar length by sqrt of magnitude: linear would render everything except
  // report as a sliver, and the point is comparison, not absolute scale.
  magnitude: Math.sqrt(Math.abs(H[k].weight))
}));
const maxMag = Math.max(...rows.map(r => r.magnitude));
rows.forEach(r => { r.barFraction = r.magnitude / maxMag; });

const copyLinkVsLike = H.share_via_copy_link.weight / fav;
const replyVsLike = H.reply.weight / fav;

console.log(JSON.stringify({
  version: C.version,
  rows,
  facts: {
    copyLinkVsLike,
    replyVsLike,
    mutualReplyWeight: H.reply.weight + C.bidirectionalFollowReplyBoost,
    // Captions state a coefficient, never a ratio. Dividing two weights cancels
    // the propensities that made the big coefficients big — X's own comment says
    // the values already fold in how rare each action is — so "copy-link = 40x a
    // like" is the same shape of claim as the "reply = 27x" folklore this tool
    // exists to kill. Ratios are only sound beside a measured count sharing a
    // denominator, which no store asset has.
    chipCaption: "EVERY WEIGHT IS A COEFFICIENT, NOT A POINT TOTAL.",
    shortChipCaption: "SCROLLING PAST YOU IS A SCORED PENALTY.",
    smallTileCaption: "SCORE ANY TWEET. X'S OWN ALGORITHM."
  }
}, null, 2));

// Reply-detection tests for collect.js.
//
//   node skills/audience-readout/scripts/test-collect.js
//
// Synthetic markup shapes only — no collected data, no real handles. The
// shapes are the point: X renders the Posts tab and /with_replies
// differently, and only one of them labels a reply.
const assert = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? "  PASS  " : "  FAIL  ") + name + (ok ? "" : "   got " + JSON.stringify(got) + " want " + JSON.stringify(want)));
  return ok;
};

// Mirror of the logic in collect.js.
function classify(articles, target) {
  let prevAuthor = null;
  const out = [];
  articles.forEach((a, idx) => {
    const prior = prevAuthor;
    prevAuthor = a.author || prevAuthor;
    if (a.author.toLowerCase() !== target.toLowerCase()) return;   // __AR_ONLY filter
    const st = a.social || "";
    const head = a.head || "";
    const isReply = !/reposted/i.test(st) &&
      (/Replying to/i.test(head) || (!!prior && prior.toLowerCase() !== a.author.toLowerCase()));
    const signal = /Replying to/i.test(head) ? "label"
      : (!!prior && prior.toLowerCase() !== a.author.toLowerCase()) ? "parent"
      : (idx === 0 ? "first-in-dom" : "none");
    out.push({ isReply, signal });
  });
  return out;
}

let pass = 0, total = 0;
const check = (n, g, w) => { total++; if (assert(n, g, w)) pass++; };

// ── Posts tab: originals in a row, one carrying the label ──────────────────
check("posts tab — consecutive originals stay originals",
  classify([
    { author: "me", head: "just shipped a thing" },
    { author: "me", head: "another thought" },
    { author: "me", head: "and one more" }
  ], "me").map(r => r.isReply), [false, false, false]);

// The leading article has no prior to inspect, so it reports first-in-dom
// rather than none. That is the honest answer, not a miss.
check("posts tab — labeled reply is caught",
  classify([
    { author: "me", head: "an original" },
    { author: "me", head: "Replying to @someone\nmy answer" }
  ], "me").map(r => r.signal), ["first-in-dom", "label"]);

check("posts tab — a mid-list original reports no reply signal at all",
  classify([
    { author: "me", head: "first" },
    { author: "me", head: "second" },
    { author: "me", head: "third" }
  ], "me").map(r => r.signal), ["first-in-dom", "none", "none"]);

// ── with_replies: conversation pairs, no label anywhere ────────────────────
check("with_replies — parent/reply pairs all read as replies",
  classify([
    { author: "someone_else", head: "their original post" },
    { author: "me",       head: "my unlabeled answer" },
    { author: "another_acct", head: "a different original post" },
    { author: "me",       head: "my second unlabeled answer" }
  ], "me").map(r => r.isReply), [true, true]);

check("with_replies — signal is 'parent', not 'label'",
  classify([
    { author: "someone_else", head: "some post" },
    { author: "me",       head: "my reply" }
  ], "me").map(r => r.signal), ["parent"]);

// ── the pre-fix bug, stated as a test ──────────────────────────────────────
check("REGRESSION — an unlabeled reply under someone else is NOT an original",
  classify([
    { author: "otherguy", head: "their post" },
    { author: "me",       head: "my unlabeled reply" }
  ], "me").map(r => r.isReply), [true]);

// ── self-threads: reply to yourself stays an original ──────────────────────
check("self-thread — replying to your own post is not a reply",
  classify([
    { author: "me", head: "thread part 1" },
    { author: "me", head: "thread part 2" }
  ], "me").map(r => r.isReply), [false, false]);

// ── reposts win over both signals ──────────────────────────────────────────
check("repost under someone else is not counted a reply",
  classify([
    { author: "otherguy", head: "their post" },
    { author: "me", head: "something", social: "You reposted" }
  ], "me").map(r => r.isReply), [false]);

// ── first article in DOM has no parent to read ─────────────────────────────
check("first-in-dom falls back to the label and says so",
  classify([{ author: "me", head: "no label here" }], "me").map(r => r.signal), ["first-in-dom"]);

console.log("\n  " + pass + "/" + total + " passed");
process.exit(pass === total ? 0 : 1);

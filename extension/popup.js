// Bangermeter — popup: settings + active weight table

(function () {
  var ids = ["showBadges", "scoreDrafts", "assumeOutOfNetwork", "assumeMutualFollow",
    "applyVerifiedBoost2023"];

  try {
    chrome.storage.sync.get(BANGERMETER_DEFAULT_SETTINGS, function (stored) {
      ids.forEach(function (id) {
        var box = document.getElementById(id);
        if (!box) return;
        box.checked = !!stored[id];
        box.addEventListener("change", function () {
          var patch = {};
          patch[id] = box.checked;
          chrome.storage.sync.set(patch);
        });
      });
      var themeSel = document.getElementById("theme");
      themeSel.value = stored.theme || "auto";
      themeSel.addEventListener("change", function () {
        chrome.storage.sync.set({ theme: themeSel.value });
      });
    });
  } catch (e) { /* storage unavailable (preview harness) — table still renders below */ }

  var C = BANGERMETER_CONFIG;
  var heads = C.heads;

  // How this tool treats each published head. The weights are all X's; what
  // differs is whether a browser can put a number against them.
  var OBSERVED = ["favorite", "reply", "retweet"];
  var ESTIMATED = ["quote", "share", "share_via_dm", "share_via_copy_link", "follow_author",
    "click", "open_link", "photo_expand", "video_open", "vqv", "quoted_click",
    "cont_dwell_time", "not_dwelled", "not_interested", "block_author", "mute_author", "report"];

  function role(name) {
    // "zeroed by X" and "we can't score it" are different facts and must not look
    // the same: the first is X's decision, the second is our limitation.
    if (heads[name].weight === 0) return { text: "zeroed by X", cls: "zero" };
    if (OBSERVED.indexOf(name) !== -1) return { text: "from counts", cls: "obs" };
    if (ESTIMATED.indexOf(name) !== -1) return { text: "estimated", cls: "est" };
    return { text: "viewer-specific", cls: "est" };
  }

  var table = document.getElementById("weightTable");
  Object.keys(heads)
    .sort(function (a, b) { return Math.abs(heads[b].weight) - Math.abs(heads[a].weight); })
    .forEach(function (name) {
      var h = heads[name];
      var tr = document.createElement("tr");
      tr.title = (h.note ? h.note + "\n\n" : "") + h.param;

      var tdLabel = document.createElement("td");
      tdLabel.textContent = h.label;
      tr.appendChild(tdLabel);

      var tdW = document.createElement("td");
      tdW.className = "w " + (h.weight > 0 ? "pos" : h.weight < 0 ? "neg" : "zero");
      tdW.textContent = String(h.weight);
      tr.appendChild(tdW);

      var r = role(name);
      var tdProv = document.createElement("td");
      tdProv.className = "prov " + r.cls;
      tdProv.textContent = r.text;
      tr.appendChild(tdProv);

      table.appendChild(tr);
    });

  var snap = document.getElementById("weightSnapshot");
  if (snap) {
    snap.textContent = "Every value below is transcribed from " + C.weightsSnapshot +
      ". Replies rise to " + (heads.reply.weight + C.bidirectionalFollowReplyBoost) +
      " on an original post from a mutual follow.";
  }

  var footer = document.getElementById("footerNote");
  if (footer) {
    footer.textContent = "Score = Σ(weight × P(action)) per home-mixer/scorers/ranking_scorer.rs. " +
      C.weightsMeaningNote + " Bangermeter estimates the probabilities; only likes, replies and " +
      "reposts come from real counts. Relative score, not predicted reach.";
  }
})();

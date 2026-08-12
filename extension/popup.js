// Bangermeter — popup: settings + active weight table

(function () {
  var ids = ["showBadges", "scoreDrafts", "assumeOutOfNetwork", "applyVerifiedBoost2023"];

  try {
    chrome.storage.sync.get(BANGERMETER_DEFAULT_SETTINGS, function (stored) {
      ids.forEach(function (id) {
        var box = document.getElementById(id);
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

  var table = document.getElementById("weightTable");
  var heads = BANGERMETER_CONFIG.heads;
  Object.keys(heads)
    .sort(function (a, b) { return Math.abs(heads[b].weight) - Math.abs(heads[a].weight); })
    .forEach(function (name) {
      var h = heads[name];
      var tr = document.createElement("tr");
      if (h.note) tr.title = h.note;

      var tdLabel = document.createElement("td");
      tdLabel.textContent = h.label;
      tr.appendChild(tdLabel);

      var tdW = document.createElement("td");
      tdW.className = "w " + (h.weight > 0 ? "pos" : h.weight < 0 ? "neg" : "zero");
      tdW.textContent = h.weight === 0 ? "—" : String(h.weight);
      tr.appendChild(tdW);

      var tdProv = document.createElement("td");
      tdProv.className = "prov";
      tdProv.textContent = h.provenance === "excluded" ? "never published" : h.provenance;
      tr.appendChild(tdProv);

      table.appendChild(tr);
    });
})();

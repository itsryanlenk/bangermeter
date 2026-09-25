"use strict";
const engine = require("./engine");
const rank = require("./rank");

module.exports = {
  clean: rank.clean,
  card: rank.card,
  rank: rank.rank,
  BANDS: rank.BANDS,
  MODES: rank.MODES,
  K: rank.K,
  copy: require("./copy"),
  receipts: require("./receipts"),
  gates: require("./gates"),
  sync: require("./sync"),
  report: require("./report"),
  config: engine.C
};

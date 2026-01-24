Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalPDF =
  exports.EventDetailPDF =
  exports.ContractPDF =
  exports.BattleBoardPDF =
  exports.PDFDocument =
  exports.generatePDF =
  exports.downloadPDF =
    void 0;
var generator_1 = require("./lib/generator");
Object.defineProperty(exports, "downloadPDF", {
  enumerable: true,
  get() {
    return generator_1.downloadPDF;
  },
});
Object.defineProperty(exports, "generatePDF", {
  enumerable: true,
  get() {
    return generator_1.generatePDF;
  },
});
Object.defineProperty(exports, "PDFDocument", {
  enumerable: true,
  get() {
    return generator_1.PDFDocument;
  },
});
var battle_board_1 = require("./templates/battle-board");
Object.defineProperty(exports, "BattleBoardPDF", {
  enumerable: true,
  get() {
    return battle_board_1.BattleBoardPDF;
  },
});
var contract_1 = require("./templates/contract");
Object.defineProperty(exports, "ContractPDF", {
  enumerable: true,
  get() {
    return contract_1.ContractPDF;
  },
});
var event_detail_1 = require("./templates/event-detail");
Object.defineProperty(exports, "EventDetailPDF", {
  enumerable: true,
  get() {
    return event_detail_1.EventDetailPDF;
  },
});
var proposal_1 = require("./templates/proposal");
Object.defineProperty(exports, "ProposalPDF", {
  enumerable: true,
  get() {
    return proposal_1.ProposalPDF;
  },
});

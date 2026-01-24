Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalTemplate =
  exports.ContractTemplate =
  exports.ContactTemplate =
  exports.resend =
    void 0;
const resend_1 = require("resend");
const keys_1 = require("./keys");
exports.resend = new resend_1.Resend((0, keys_1.keys)().RESEND_TOKEN);
// Re-export templates
var contact_1 = require("./templates/contact");
Object.defineProperty(exports, "ContactTemplate", {
  enumerable: true,
  get() {
    return contact_1.ContactTemplate;
  },
});
var contract_1 = require("./templates/contract");
Object.defineProperty(exports, "ContractTemplate", {
  enumerable: true,
  get() {
    return contract_1.ContractTemplate;
  },
});
var proposal_1 = require("./templates/proposal");
Object.defineProperty(exports, "ProposalTemplate", {
  enumerable: true,
  get() {
    return proposal_1.ProposalTemplate;
  },
});

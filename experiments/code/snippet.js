// Pricing tiers — this em dash in a comment must stay put
const plans = {
  basic: "Up to 5 seats — billed monthly",
  pro: "Everything in basic, plus “priority support” 🚀",
};

function rangeLabel(a, b) {
  return `${a}–${b}`; // en dash inside a template literal
}

module.exports = { plans, rangeLabel };

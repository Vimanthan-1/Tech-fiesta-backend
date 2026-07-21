// Tech Fiesta 2026 Passes
const passes = [
  {
    id: 1,
    title: "Tech Fiesta Combo Pass",
    description: "Register for any 3 events or workshops at a discounted flat rate of ₹149. Additional registrations beyond 3 are charged at standard individual rates.",
    benefits: [
      "Any 3 event/workshop registrations included",
      "Mix and match: tech events, workshops, or non-tech events",
      "Priority seating in all events",
      "Exclusive Tech Fiesta merchandise",
      "Access to networking sessions",
      "Certificates for all participated events",
    ],
    price: "₹149",
    terms: [
      "Pass is valid for the entire Tech Fiesta 2026 duration",
      "Includes any 3 registrations (events, workshops, or a mix of both)",
      "Additional registrations beyond 3 are charged at standard individual rates",
      "Pass is non-transferable and non-refundable",
      "Valid ID required for pass verification",
    ],
    includes: [
      "Any 3 event or workshop registrations",
      "Event materials and resources for registered events",
      "Refreshments during break sessions",
      "Digital certificates for participated events",
      "Exclusive Tech Fiesta merchandise kit",
    ],
  },
];


// Helper functions
const getPassById = (id) => passes.find((pass) => pass.id === id);

const getAvailablePasses = () => passes; // All passes are always available

module.exports = {
  passes,
  getPassById,
  getAvailablePasses,
};

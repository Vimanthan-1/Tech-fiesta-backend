// Tech Fiesta 2025 Passes
const passes = [
  {
    id: 1,
    title: "Tech Fiesta General Pass",
    description: "The ultimate Tech Fiesta experience! Get unlimited access to all technical events plus workshop selections.",
    benefits: [
      "Unlimited access to ALL technical events",
      "1 workshop included in pass price",
      "Select up to 4 additional workshops", 
      "Priority seating in all events",
      "Exclusive Tech Fiesta merchandise",
      "Access to networking sessions",
      "Certificates for all participated events",
    ],
    price: "₹149",
    citPrice: "₹149",
    terms: [
      "Pass is valid for the entire Tech Fiesta 2025 duration",
      "Includes 1 workshop + option to select up to 4 additional workshops",
      "Unlimited access to all technical events (no selection required)",
      "Non-technical events require separate payment on arrival",
      "Pass is non-transferable and non-refundable",
      "Valid ID required for pass verification",
    ],
    includes: [
      "Unlimited access to all technical events",
      "1 workshop included + up to 4 additional workshop selections", 
      "Event materials and resources for all events",
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

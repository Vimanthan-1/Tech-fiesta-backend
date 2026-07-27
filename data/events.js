// Tech Fiesta 2026 Events
const events = [
  // Technical Events
  {
    id: 1,
    title: "Paper Presentation",
    type: "tech",
    date: "2026-08-07",
    time: "10:00 AM - 4:00 PM",
    venue: "Main Auditorium",
    description:
      "Participants present innovative technical ideas, research work, or project concepts before a panel of judges. Evaluation is based on originality, technical depth, presentation skills, and clarity of explanation.",
    tags: ["Presentation", "Research", "Innovation"],
    price: "₹70",
    maxTeamSize: 2,
    capacity: 51,
  },
  {
    id: 2,
    title: "Tech Survivor – Elimination Arena",
    type: "tech",
    date: "2026-08-07",
    time: "10:00 AM - 4:00 PM",
    venue: "Programming Lab",
    description:
      "A multi-round competition featuring technical quizzes, logical reasoning, debugging tasks, coding rounds, and surprise challenges. Participants are eliminated round by round until only one survivor remains.",
    tags: ["Quiz", "Coding", "Debugging", "Logic"],
    price: "₹70",
    maxTeamSize: 1,
    capacity: 100,
  },
  {
    id: 3,
    title: "UI Challenge – Design the Future",
    type: "tech",
    date: "2026-08-07",
    time: "10:00 AM - 1:00 PM",
    venue: "Design Lab",
    description:
      "UI Challenge is a fast-paced design sprint where participants create a user-friendly and visually appealing interface based on a given problem statement. Using tools such as Figma, teams must design key screens, user flows, and a functional prototype within a limited time.",
    tags: [
      "UI/UX",
      "Figma",
      "Prototype",
      "User Flow",
      "Design Sprint",
      "Product Thinking"
    ],
    price: "₹70",
    maxTeamSize: 3,
    minTeamSize: 2,
    capacity: 50,
  },
  {
    id: 4,
    title: "Common Coding Challenge",
    type: "tech",
    date: "2026-08-07",
    time: "11:00 AM - 1:00 PM",
    venue: "Programming Lab",
    description:
      "A common coding challenge open to all skill levels. Participants solve a curated set of programming problems covering fundamental data structures, algorithms, and logic. Race against time and peers to achieve the highest score and claim the top spot on the leaderboard.",
    tags: ["Coding", "Algorithms", "Data Structures", "Competition"],
    price: "₹70",
    maxTeamSize: 1,
    capacity: 100,
  },
  {
    id: 5,
    title: "Hack The Campus",
    type: "tech",
    date: "2026-08-07",
    time: "9:00 AM - 3:00 PM",
    venue: "Campus Wide",
    description:
      "An AR and QR based cyber treasure hunt where participants solve coding puzzles, encrypted clues, cybersecurity challenges, hidden website tasks, and AR missions across the campus.",
    tags: ["Cybersecurity", "AR", "QR", "Treasure Hunt"],
    price: "₹70",
    maxTeamSize: 4,
    capacity: 50,
  },
  {
    id: 6,
    title: "Tech Debate",
    type: "tech",
    date: "2026-08-07",
    time: "2:00 PM - 4:00 PM",
    venue: "Seminar Hall",
    description:
      "Participants debate trending technology topics such as AI, cybersecurity, startups, coding culture, social media, and future technologies. The event focuses on critical thinking, communication, and technical awareness.",
    tags: ["Debate", "Technology", "Communication"],
    price: "₹70",
    maxTeamSize: 1,
    capacity: 100,
  },

  // Non-Technical Events
  {
    id: 7,
    title: "Chess Championship",
    type: "non-tech",
    date: "2026-08-07",
    time: "10:00 AM - 5:00 PM",
    venue: "Seminar Hall",
    description:
      "Individual chess competition featuring an online qualifier round followed by an offline final round using a physical chess board.",
    tags: ["Chess", "Strategy", "Competition"],
    price: "₹50",
    maxTeamSize: 1,
    capacity: 100,
  },
  {
    id: 8,
    title: "Best Meme Creation",
    type: "non-tech",
    date: "2026-08-07",
    time: "2:00 PM - 4:00 PM",
    venue: "Media Hall",
    description:
      "Create the funniest and most creative meme based on the events happening during Tech Fiesta. Originality and relevance matter the most.",
    tags: ["Meme", "Creativity", "Humor"],
    price: "₹50",
    maxTeamSize: 1,
    capacity: 100,
  },
  {
    id: 9,
    title: "Missing Lyrics",
    type: "non-tech",
    date: "2026-08-07",
    time: "11:00 AM - 1:00 PM",
    venue: "Entertainment Hall",
    description:
      "Teams identify missing lyrics and recognize songs from background music tracks in a fun musical challenge.",
    tags: ["Music", "Lyrics", "Team Event"],
    price: "₹50",
    maxTeamSize: 4,
    minTeamSize: 1,
    capacity: 50,
  },
  {
    id: 10,
    title: "Murder Mystery",
    type: "non-tech",
    date: "2026-08-07",
    time: "2:00 PM - 5:00 PM",
    venue: "Activity Hall",
    description:
      "Teams investigate clues, analyze suspects, and solve a fictional crime scene before time runs out.",
    tags: ["Mystery", "Investigation", "Teamwork"],
    price: "₹50",
    maxTeamSize: 4,
    minTeamSize: 1,
    capacity: 50,
  },
  {
    id: 11,
    title: "Wiki Surfers",
    type: "non-tech",
    date: "2026-08-07",
    time: "10:00 AM - 12:00 PM",
    venue: "Computer Lab",
    description:
      "Teams race from one Wikipedia page to another using only internal Wikipedia links. Fastest navigation with the fewest clicks wins.",
    tags: ["Wikipedia", "Navigation", "Strategy"],
    price: "₹50",
    maxTeamSize: 2,
    minTeamSize: 1,
    capacity: 50,
  },
  {
    id: 12,
    title: "Adzap",
    type: "non-tech",
    date: "2026-08-07",
    time: "2:00 PM - 4:00 PM",
    venue: "Main Auditorium",
    description:
      "Teams promote and sell a quirky or imaginary product through a creative advertisement performance filled with humor and innovation.",
    tags: ["Marketing", "Creativity", "Performance"],
    price: "₹50",
    maxTeamSize: 4,
    minTeamSize: 1,
    capacity: 50,
  },
];

// Helper functions
const getTechEvents = () => events.filter((event) => event.type === "tech");
const getNonTechEvents = () =>
  events.filter((event) => event.type === "non-tech");
const getEventById = (id) => events.find((event) => event.id === id);
const getUpcomingEvents = () => {
  const today = new Date();
  return events.filter((event) => new Date(event.date) >= today);
};

module.exports = {
  events,
  getTechEvents,
  getNonTechEvents,
  getEventById,
  getUpcomingEvents,
};

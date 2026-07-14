// Tech Fiesta 2025 Events
const events = [
  // Technical Events
  {
    id: 1,
    title: "Paper Presentation",
    type: "tech",
    description:
      "Develop feasible solutions to given problems. Present innovative and practical approaches that effectively address requirements and demonstrate technical excellence.",
    tags: ["Presentation", "Innovation", "Research", "Problem Solving"],
    price: "₹99",
    maxTeamSize: 2,
  },
  {
    id: 2,
    title: "Jeopardy-Style CTF",
    type: "tech",
    description:
      "A fast, game-like event where teams solve a set of small technical challenges to uncover hidden 'flags'. Challenges are split into Web, Crypto, and Forensics across easy to medium difficulties. Pick any challenge in any order, and submit the flag to climb the live leaderboard.",
    tags: ["CTF", "Security", "Web", "Crypto", "Forensics", "Competition"],
    price: "₹99",
    maxTeamSize: 3,
  },
  {
    id: 3,
    title: "Tech Survivor",
    type: "tech",
    description:
      "An elimination arena featuring a multi-round competition: tech quiz, logic finding, coding/debugging, and twists like blind coding or silent collaboration. Teams get eliminated each round until only one survives.",
    tags: ["Competition", "Debugging", "Logic", "Coding", "Teamwork"],
    price: "₹99",
    maxTeamSize: 3,
  },
  {
    id: 4,
    title: "LeetCode Speed Relay",
    type: "tech",
    description:
      "A high-pressure coding relay on a single LeetCode problem. Each teammate gets exactly 5 minutes at the keyboard before stopping immediately. No restarting, no handover explanation, and no communication during transitions.",
    tags: ["LeetCode", "Coding", "Relay", "Teamwork", "Speed"],
    price: "₹99",
    maxTeamSize: 4,
  },
  {
    id: 5,
    title: "Hack The Campus",
    type: "tech",
    description:
      "An AR + QR cyber treasure hunt where teams navigate the campus scanning QR codes to solve coding puzzles, encrypted messages, cybersecurity clues, and AR missions to eventually access the Master Server.",
    tags: ["Treasure Hunt", "AR", "QR", "Cybersecurity", "Puzzles"],
    price: "₹99",
    maxTeamSize: 3,
  },
  {
    id: 6,
    title: "Tech Debate",
    type: "tech",
    description:
      "A stage event where participants debate trending and controversial technology topics like AI, cybersecurity, startups, social media, coding culture, and future tech. Focuses on critical thinking, public speaking, and team coordination.",
    tags: ["Debate", "Public Speaking", "Critical Thinking", "Tech Trends"],
    price: "₹99",
    maxTeamSize: 2,
  },

  // Non-Technical Events
  {
    id: 7,
    title: "Chess",
    type: "non-tech",
    description:
      "A classic chess tournament conducted in two stages. Play an Online Qualifier (Round 1) on mobile devices to secure a spot in the intense face-to-face Offline Finals (Round 2) played on a physical board under supervision.",
    tags: ["Strategy", "Board Game", "Tactics", "Individual", "Competition"],
    price: "₹79",
    maxTeamSize: 1,
  },
  {
    id: 8,
    title: "Best Meme Creation",
    type: "non-tech",
    description:
      "Unleash your humor and digital creativity in this solo event. Capture the spirit, highlights, and funniest moments of Tech Festia's live events in an original meme and submit it within the time limit.",
    tags: ["Meme", "Creativity", "Humor", "Design", "Solo"],
    price: "₹79",
    maxTeamSize: 1,
  },
  {
    id: 9,
    title: "Missing Lyrics",
    type: "non-tech",
    description:
      "Identify and complete missing lyrics from popular tracks in this team musical challenge. Test your speed in Round 1 (Basic Lyrics) and identify songs, movies, or tracks solely from background music (BGM) in the buzzer-based Round 2.",
    tags: ["Music", "Buzzer", "Teamwork", "BGM", "Fun"],
    price: "₹79",
    maxTeamSize: 4,
  },
  {
    id: 10,
    title: "Murder Mystery",
    type: "non-tech",
    description:
      "Put on your detective hat for this interactive team investigation. Solve hidden clues and hunt down evidence in Round 1 (Clue Hunt), then present your final investigation findings to unmask the culprit behind a fictional crime scene.",
    tags: ["Investigation", "Puzzles", "Adventure", "Teamwork", "Mystery"],
    price: "₹79",
    maxTeamSize: 4,
  },
  {
    id: 11,
    title: "Wiki Surfers",
    type: "non-tech",
    description:
      "A fast-paced internet navigation race where teams must navigate from a random starting Wikipedia page to a designated target page using only internal Wikipedia hyperlinks, aiming to finish in the fewest clicks and shortest time.",
    tags: ["Web Navigation", "Wikipedia", "Strategy", "Speed", "Research"],
    price: "₹79",
    maxTeamSize: 2,
  },
  {
    id: 12,
    title: "ADZAP",
    type: "non-tech",
    description:
      "A wacky marketing and sales contest where teams are given a bizarre, non-existent product 10 minutes before the event. Persuade and convince the judges with a highly entertaining 3-5 minute advertisement performance using props and background music.",
    tags: ["Marketing", "Creativity", "Drama", "Public Speaking", "Teamwork"],
    price: "₹79",
    maxTeamSize: 4,
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

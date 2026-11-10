// Copy comes from the live v2 site (resume backed). Bracketed items are for Rayyan to fill.
export const EMAIL = 'rayyan2235@gmail.com';
export const GITHUB = 'https://github.com/Rayyan2235';
export const LINKEDIN = 'https://www.linkedin.com/in/rayyan-syed-5a846725a/';
export const RESUME = '#'; // [RESUME PDF]

export const featured = [
  {
    name: 'FireFly', meta: 'Agents · c0mpiled-15', url: 'https://github.com/Rayyan2235/FireFly', line: 'Agents, robots and people on one channel.',
    text: 'An operating system for yard exceptions. AI agents, robots and people share one channel, and every verified outcome is recorded. A Claude model chooses each tool call; a MongoDB flight recorder lets you replay any shift event for event.',
    note: 'Built at c0mpiled-15 for YC’s Fall 2026 Request for Startups. The yard is a simulated twin; the agent is real.',
    stack: ['TypeScript', 'Claude', 'MongoDB', 'pnpm'],
    spec: [['Built at', 'c0mpiled-15, YC Fall 2026 RFS'], ['Role', '[YOUR ROLE]'], ['Model', 'Claude picks each tool call'], ['Record', 'MongoDB flight recorder'], ['Status', 'Simulated yard, real agent']]
  },
  {
    name: 'Mashwara', meta: 'Health · HopHacks 26', url: 'https://github.com/Rayyan2235/Mashwara---HopHacks-26', line: 'A pharmacist behind every counter, in Urdu.',
    text: 'A qualified pharmacist behind every counter. A patient speaks Urdu, a local volunteer bridges, a remote pharmacist authorizes each medicine, and the plan comes back in Urdu. Interaction flags come from a hand-curated, cited table, never from the model’s guess.',
    note: '', stack: ['Next.js', 'TypeScript', 'Gemini', 'ElevenLabs', 'Neon Postgres'],
    spec: [['Built at', 'HopHacks 26'], ['Role', '[YOUR ROLE]'], ['Language', 'Urdu in, Urdu out'], ['Safety', 'Cited interaction table']]
  },
  {
    name: 'Kestrel', meta: 'Robotics · HackPSU 2026', url: 'https://github.com/Rayyan2235/kestrel', line: 'Real robots, real physics, in the browser.',
    text: 'A browser science playground for ages 13 to 16. You tell two small walking robots, Pip and Nova, what to do; they walk a 3D playground, push the apparatus with their bodies and report what the physics simulator measured. Nothing is animated: if a push misses, you see it miss.',
    note: 'Built at HackPSU 2026. MuJoCo steps both robots in WebAssembly every 5 ms; trained ONNX walking policies drive them at 50 Hz.',
    stack: ['TypeScript', 'MuJoCo', 'ONNX Runtime', 'Claude', 'AWS CDK'],
    spec: [['Built at', 'HackPSU 2026'], ['Role', '[YOUR ROLE]'], ['Physics', 'MuJoCo in WebAssembly'], ['Robots', 'ONNX walking policies, 50 Hz'], ['Benchmark', 'Two robot balance, 5 of 5, no falls']]
  }
];

export const scraps = [
  { name: 'EmpathAI', result: 'Real time voice therapy under 400ms, 95% crisis detection', year: 'Voice AI', url: 'https://github.com/Rayyan2235/EmpathAI',
    text: 'A full-stack AI therapist with real-time voice sessions under 400ms latency and 95% crisis detection accuracy. LLaMA 3 runs locally through Ollama; Hugging Face models track emotion and sentiment; LiveKit carries the audio both ways.',
    stack: ['Python', 'FastAPI', 'React', 'Ollama', 'LiveKit'] },
  { name: 'Open source', result: 'Pull requests to pylint, EleutherAI and Weblate', year: 'Python', url: 'https://github.com/Rayyan2235/Open-source-contributions',
    text: 'pylint: a --theme option so pyreverse can draw dark mode diagrams. EleutherAI lm-evaluation-harness: a warning when llama-server returns different logprobs for identical requests. Weblate: a capitalize option for translation status badges.',
    stack: ['pylint', 'lm-eval-harness', 'Weblate'] },
  { name: 'Englishly', result: 'Whisper fine tune, +35% accuracy on Arabic accents', year: '2025', url: 'https://github.com/Rayyan2235/Englishly', img: '' },
  { name: 'FPL Predictor', result: 'Match outcomes, 15% over baseline', year: '2025', url: 'https://github.com/Rayyan2235/FPL_Predictor', img: '' }
];

export const experience = [
  ['Jun 2026 to now', 'Product Management Extern, BeReal', 'Prototyping a feature to lift Monthly Active Users after benchmarking 3 competitor apps. Leading 8 weeks of user research and usability testing, and pitching the proposal to BeReal leadership.'],
  ['May 2026 to now', 'Applied AI Engineering, CodePath with Anthropic', 'Cut issue reproduction time 60% with structured debugging in enterprise codebases. Shipped tested pull requests across a 10-week capstone, working with open source maintainers to a merged PR.'],
  ['Dec 2025 to Jun 2026', 'Applied Data Science Engineer, Nittany Motorsports', 'Built a Grafana dashboard over 10+ sensor streams that took post-session analysis from 30 minutes to under 5, with automated GitHub-to-Grafana ingestion and 95% schema compliance across DAQ files.'],
  ['May 2025 to May 2026', 'Software Engineer Intern, Englishly', 'Jeddah, Saudi Arabia. Built the speaking-practice stack and raised user retention by 25%.'],
  ['Nov 2024 to Feb 2025', 'Software Engineer Intern, NomadAI', 'Built an AI itinerary generator and matching engine that cut trip planning time 30%, and lifted mobile engagement 35%.']
];

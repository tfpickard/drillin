import type { CanonTag, TagCategory } from "@/lib/types";

/**
 * The canon tag library (plan Appendix A). This is the voice-locking seed, not
 * the final ~1000. Physical entries are non-sexual by curation — that curation
 * IS the safety boundary (anything explicit can only arrive as free-form, which
 * is gated behind typed friction + approval).
 *
 * Source of truth for both the in-app autocomplete (seed mode) and the DB seed
 * script (scripts/seed-canon.ts → supabase). Keep it flat and deadpan.
 */
const corporate = `Stakeholder Alignment, Strategic Roadmapping, Cross-Functional Synergy, Thought Leadership, Executive Presence, Manages Up, Manages Down, Skip-Level Ready, Calibration-Proof, Promotable, Stack-Ranked, Quota Crusher, Pipeline Builder, Always Be Closing, Rainmaker, Trusted Advisor, Subject Matter Expert, Domain Expert, Go-To Person, Force Multiplier, Self-Starter, Results-Oriented, Detail-Oriented, Big-Picture Thinker, Roadmap Owner, Consensus Builder, Influence Without Authority, Servant Leader, Visionary, Execution Machine, Player-Coach, Glue Work, Air Cover, Source Of Truth, Single Pane Of Glass, North Star, OKR Whisperer, KPI-Driven, Data-Driven, Customer-Obsessed, First-Principles Thinker, 10x Contributor, Value-Add, Core Competency, Best-In-Class, Quick Win, Low-Hanging Fruit, Moves The Needle, Boils The Ocean, Runs It Up The Flagpole, Takes It Offline, Drills Down, Deep Diver, Level-Setter, Socializes The Deck, Ideates, Operationalizes, Streamlines, Right-Sizes, Blue-Sky Thinker, Paradigm Shifter, Bandwidth-Rich, Circles Back, Parking-Lot Parker, Touches Base, Loops You In, Pings Thoughtfully, Syncs Up, Pre-Reads, Post-Mortems, Retro-Ready, Sprint-Hardened, High Velocity, Backlog Groomer, MVP Shipper, Force Of Nature, Wrangles Stakeholders, Owns The Outcome, Drives Consensus, Unblocks Others, Bar-Raiser, Disagrees And Commits, Has The Receipts, Boardroom-Ready, C-Suite Adjacent, All-Hands Speaker, Keynote Energy, Slide-Deck Auteur, Spreadsheet Wizard, Metric Mover, Synergy Realizer, Margin Defender, Runway Extender, Reorg Survivor, Layoff-Proof, Vested, Equity-Pilled, Liquidity-Event Ready`;

const physical = `Forearms, Jawline, Posture, Voice, Grip, Handshake, Shoulders, Broad Shoulders, Collarbone, Neck, Traps, Biceps, Triceps, Wrists, Knuckles, Hands, Veins, Vascularity, Frame, Build, Proportions, V-Taper, Narrow Waist, Calves, Forearm Veins, Stubble, Five O'Clock Shadow, Beard, Beard Density, Salt-And-Pepper, Hairline, Widow's Peak, The Hair, Cheekbones, Bone Structure, Side Profile, Silhouette, Complexion, Tan, Freckles, Dimples, Smile, Teeth, The Glasses, Brow, Eye Contact, Lashes, Sideburns, Chin, Gait, Stride, Presence, Height, Stands Up Straight, Good Frame, Strong Jaw, Defined, Lean, Built, The Watch, Cufflink Energy, Rolled Sleeves, Forearm Reveal, Tailored Fit, Fills Out A Blazer, Lanyard, Badge Flex, Standing Desk Posture, Walks With Purpose, Firm Handshake, Commanding Height, Gym-At-Lunch, Marathon Calves, Climber's Forearms, Cyclist's Quads, Swimmer's Shoulders, Hunches At Standup`;

const behavioral = `Replies Fast, Replies Never, Left During Standup, Owns The Room, Reply-All Offender, Talks Over People, Mutes Aggressively, Camera Always Off, Camera Always On, Green Dot At Midnight, Weekend Emailer, Last To Leave The Call, First To Drop, Schedules 8am Syncs, Declines Every Meeting, Double-Books, Calendar Tetris, Reads The Room, Misreads The Room, Circles Back Eventually, Never Circles Back, Ghosts Threads, Thread Necromancer, Passive-Aggressive In Slack, Emoji-Only Replies, The Thumbs-Up Of Death, Heavy Sigher, Closes Your Tickets, Reopens Your Tickets, Bikeshedder, Decisive, Chronically Indecisive, Holds Eye Contact, Avoids Eye Contact, Walk-And-Talker, Whiteboard Hog, Steals Credit, Gives Credit Generously, Throws You Under The Bus, Covers For You, Volunteers First, Never Volunteers, Over-Prepares, Wings It Beautifully, Death By PowerPoint, One More Thing, Runs Over Time, Ends Meetings Early, Hard Stop At 5, Always In A Meeting, Inbox Zero, Inbox Bankruptcy, Strong Opinions Loosely Held, Professional Devil's Advocate, Relentlessly Yes-And, Hard No, Diplomatic, Brutally Blunt, Takes The Notes, Follows Up, Drops The Ball, Reliable, Flaky, Punctual, Fashionably Late To Standup, Joins Two Minutes Early, Fills Awkward Silences, Comfortable With Silence, Good In A Crisis, Panics Quietly, Calm Under Pressure, Escalates Immediately, De-escalates, Mentors Quietly, Gatekeeps, Open-Door, Slack-Status Poet, Touching Base, Pings After Hours, OOO Respecter, Ignores OOO, Books Over Lunch, Eats At Desk, Coffee Walk Inviter, Lingers After The Meeting, Finds You In The Kitchen, Lingers By Your Desk, Slides Into The DMs Professionally, Adds You On LinkedIn First, Endorses Back Immediately, Endorses And Runs, Never Endorses Back, Types Then Stops, Quick Sync At 6pm, Reschedules Thrice, Down To Align, Takes This Conversation Offline`;

function parse(raw: string, category: TagCategory): CanonTag[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => ({ id: `${category}:${label}`, label, category }));
}

export const CANON_TAGS: CanonTag[] = [
  ...parse(corporate, "corporate"),
  ...parse(physical, "physical"),
  ...parse(behavioral, "behavioral"),
];

export function searchCanon(query: string, limit = 8): CanonTag[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: CanonTag[] = [];
  const contains: CanonTag[] = [];
  for (const tag of CANON_TAGS) {
    const label = tag.label.toLowerCase();
    if (label.startsWith(q)) starts.push(tag);
    else if (label.includes(q)) contains.push(tag);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

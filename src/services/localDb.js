// src/services/localDb.js
// Base de dados LOCAL (simula Supabase)

const LS_KEY = "vlr_local_db";

const defaultDb = {
  user: {
    id: "local-user",
    username: "Utilizador",
    country: null,
    rank: null,
    created_at: new Date().toISOString(),
  },

  profileStats: {
    matches: 0,
    wins: 0,
    winrate: 0,
    kd: 0,
  },

  team: null,

  teamMembers: [],

  matches: [],

  honor: {
    level: 1,
    points: 0,
    history: [],
  },
};

function loadDb() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? JSON.parse(raw) : structuredClone(defaultDb);
}

function saveDb(db) {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

/* ---------- USER ---------- */

export function getUser() {
  return loadDb().user;
}

export function updateUser(data) {
  const db = loadDb();
  db.user = { ...db.user, ...data };
  saveDb(db);
}

/* ---------- PROFILE ---------- */

export function getProfileStats() {
  return loadDb().profileStats;
}

/* ---------- TEAM ---------- */

export function getMyTeam() {
  return loadDb().team;
}

export function createTeam({ name, color_id, color_hex }) {
  const db = loadDb();

  if (db.team) {
    throw new Error("Já tens equipa");
  }

  const team = {
    id: crypto.randomUUID(),
    name,
    color_id,
    color_hex,
    created_at: new Date().toISOString(),
  };

  db.team = team;
  db.teamMembers = [
    {
      user_id: db.user.id,
      username: db.user.username,
      rank: db.user.rank ?? "—",
      role: "owner",
    },
  ];

  saveDb(db);
  return team;
}

export function leaveTeam() {
  const db = loadDb();
  db.team = null;
  db.teamMembers = [];
  saveDb(db);
}

export function getTeamMembers() {
  return loadDb().teamMembers;
}

/* ---------- HONOR ---------- */

export function getHonor() {
  return loadDb().honor;
}

/* ---------- RESET (DEV) ---------- */

export function resetLocalDb() {
  localStorage.removeItem(LS_KEY);
}

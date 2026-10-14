export function naira(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const MESSAGES: Record<string, string> = {
  FORBIDDEN: "You do not have admin permission for this action.",
  NOT_FOUND: "That record no longer exists.",
  NOT_PENDING: "This registration has already been reviewed.",
  ALL_TEAMS_FULL: "Every team is full. Increase the number of teams or players per team in Settings first.",
  REASON_REQUIRED: "Please give a rejection reason (at least 3 characters).",
  NOT_APPROVED: "Only approved players can be moved.",
  TEAM_FULL: "That team is already full.",
  SAME_TEAM: "The player is already on that team.",
  TEAM_NOT_FOUND: "That team is not active in this tournament.",
  RESULTS_EXIST: "Results or match events have been entered, so fixtures cannot be regenerated. Edit individual matches instead.",
  FIXTURES_EXIST: "Fixtures already exist.",
  NOT_ENOUGH_TEAMS: "At least 2 teams are needed to generate fixtures.",
  INVALID_SCORE: "Scores must be whole numbers of 0 or more.",
  SCORE_REQUIRED: "Enter both scores before marking a match completed.",
  PLAYER_NOT_IN_MATCH: "That player is not on either team in this match.",
  ASSIST_ONLY_FOR_GOALS: "Assists can only be added to open-play goals.",
  ASSIST_MUST_BE_TEAMMATE: "The assisting player must be on the scorer's team.",
  ENTER_SCORE_FIRST: "Save the match score before recording goals.",
  GOALS_EXCEED_SCORE: "This goal would exceed the team's score. Update the score first.",
  ADMIN_ALREADY_EXISTS: "An admin already exists. Ask them to grant you access.",
  NOT_SIGNED_IN: "Please sign in first.",
};

export function friendlyError(err: unknown): string {
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err);
  const key = Object.keys(MESSAGES).find((k) => msg.startsWith(k));
  if (key) return MESSAGES[key] ?? msg;
  if (msg.startsWith("CAPACITY_CONFLICT") || msg.startsWith("TEAM_COUNT_CONFLICT") || msg.startsWith("SCORE_BELOW_EVENTS"))
    return msg.replace(/^[A-Z_]+:\s*/, "") + ".";
  return msg || "Something went wrong.";
}

/** Typed null for RPC args the generated types mark as required strings/numbers. */
export function nil<T>(): T {
  return null as unknown as T;
}
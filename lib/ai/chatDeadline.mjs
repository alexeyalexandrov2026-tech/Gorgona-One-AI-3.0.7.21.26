// The homepage input stays disabled while a turn is in flight. This is the
// longest a guest waits for /api/chat, counted from the moment the request
// leaves, before the catalogue answer and its links take over.
export const CLIENT_TIMEOUT_MS = 20000;

// The whole server turn, from the moment /api/chat receives the request:
// facts (weather can take up to 4.5 s), the usage reservation, primary model
// and optional self-heal/fallback. Ends well before the browser gives up.
export const SERVER_BUDGET_MS = 15000;

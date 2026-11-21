// The homepage input stays disabled while a turn is in flight. This is the
// longest a guest waits for /api/chat, counted from the moment the request
// leaves, before the catalogue answer and its links take over.
export const CLIENT_TIMEOUT_MS = 12000;

// The whole server turn, from the moment /api/chat receives the request:
// facts (weather can take up to 4.5 s), the usage reservation and the model.
// It ends well before the browser gives up, so an answer the model produced
// in time also reaches the guest instead of being cut off on the way.
export const SERVER_BUDGET_MS = 9500;

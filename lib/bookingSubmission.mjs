export function isReceipt(data) {
  return data?.success === true && typeof data.bookingId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.bookingId);
}
export function submissionKey(previous, serialized, create = () => crypto.randomUUID()) {
  return previous?.serialized === serialized ? previous : { serialized, key:create() };
}

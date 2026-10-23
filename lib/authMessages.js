// Display messages only; provider codes, credentials and auth payloads remain unchanged.
export const AUTH_MESSAGES = {
  credentials: 'The email or password is incorrect.',
  confirm: 'Please verify your email before signing in.',
  exists: 'An account with this email already exists.',
  email: 'Invalid email',
  password: 'Please choose a stronger password.',
  rate: 'Too many attempts. Please wait and try again.',
  disabled: 'Registration is currently unavailable. Please try again later.',
  failed: 'We could not complete your request. Please try again.',
  required: 'Please fill out all fields',
  requiredPartner: 'Please fill out all required fields',
  length: 'Password must be at least 6 characters',
  match: 'Passwords do not match',
  agreement: 'You must agree to the Miami Elio Partnership Agreement.'
};
const codes = {
  invalid_credentials: 'credentials', email_not_confirmed: 'confirm',
  user_already_exists: 'exists', email_exists: 'exists', email_address_invalid: 'email',
  weak_password: 'password', over_request_rate_limit: 'rate',
  over_email_send_rate_limit: 'rate', signup_disabled: 'disabled'
};
const owned = new Set(Object.values(AUTH_MESSAGES));
export function authErrorSource(error) {
  const message = typeof error === 'string' ? error : error?.message;
  if (owned.has(message)) return message;
  return AUTH_MESSAGES[codes[error?.code]] || AUTH_MESSAGES.failed;
}

// Keep in sync with frontend/src/auth/schemas.ts
export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
// Upper bound keeps hashing cost bounded for oversized inputs.
export const PASSWORD_MAX_LENGTH = 128;
// At least one letter, one digit and one non-alphanumeric character.
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

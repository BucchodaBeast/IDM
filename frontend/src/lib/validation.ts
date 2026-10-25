// Mirrors backend/app/validation.py. The server re-checks everything.

export const digitsOnly = (v: string) => v.replace(/\D/g, "");

/** Accepts 8 local digits or a pasted +268 / 268 / 00268 number. Returns the 8 local digits. */
export function localPhoneDigits(raw: string): string {
  let d = digitsOnly(raw);
  if (d.startsWith("00268")) d = d.slice(5);
  else if (d.startsWith("268") && d.length > 8) d = d.slice(3);
  return d.slice(0, 8);
}

export function phoneError(local: string): string {
  if (!local) return "Enter your phone number.";
  if (local.length !== 8) return "An Eswatini number has 8 digits after +268.";
  if (!/^[27]/.test(local)) return "Eswatini numbers start with 7 (mobile) or 2 (landline).";
  return "";
}

export function nationalIdError(v: string): string {
  if (!v) return "Enter your national ID number.";
  if (!/^\d+$/.test(v)) return "Use digits only.";
  if (v.length !== 13) return `The ID number must be exactly 13 digits (you have ${v.length}).`;
  return "";
}

export function emailError(v: string): string {
  if (!v) return "Enter your email address.";
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.trim()) ? "" : "Enter a valid email address, like name@example.com.";
}

export function nameError(v: string): string {
  const n = v.trim().replace(/\s+/g, " ");
  if (!n) return "Enter your full name.";
  if (!/^[\p{L}]+(?:[ '\-][\p{L}]+)+$/u.test(n)) return "Enter your first name and surname, using letters only.";
  return "";
}

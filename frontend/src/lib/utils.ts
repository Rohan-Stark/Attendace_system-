export function generateTemporaryPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;
  let hasSpecial = false;

  while (!(hasLower && hasUpper && hasDigit && hasSpecial)) {
    password = '';
    hasLower = false;
    hasUpper = false;
    hasDigit = false;
    hasSpecial = false;

    for (let i = 0; i < length; i++) {
      const char = charset.charAt(Math.floor(Math.random() * charset.length));
      password += char;

      if (/[a-z]/.test(char)) hasLower = true;
      else if (/[A-Z]/.test(char)) hasUpper = true;
      else if (/[0-9]/.test(char)) hasDigit = true;
      else hasSpecial = true;
    }
  }

  return password;
}

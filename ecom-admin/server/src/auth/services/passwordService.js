const PASSWORD_MIN_LENGTH = 12;

const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{12,}$/;

const COMMON_PASSWORDS = new Set([
  'password123!',
  'admin@123456',
  'administrator1!',
  'welcome12345!',
  'changeme1234!',
]);

const validatePassword = (password) => {
  if (!password || String(password).length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!PASSWORD_POLICY.test(String(password))) {
    return 'Password must include uppercase, lowercase, number, and special character';
  }
  if (COMMON_PASSWORDS.has(String(password).toLowerCase())) {
    return 'Password is too common. Choose a stronger password';
  }
  return null;
};

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY,
  validatePassword,
};

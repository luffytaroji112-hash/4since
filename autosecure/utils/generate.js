const crypto = require("crypto");

module.exports = (length = 8) => {
  const alpha = "abcdefghijklmnopqrstuvwxyz";
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let retVal = "";

  // First character is always a letter
  retVal += alpha.charAt(crypto.randomInt(alpha.length));

  // Remaining characters from full charset
  for (let i = 1; i < length; ++i) {
    retVal += charset.charAt(crypto.randomInt(charset.length));
  }

  return retVal;
};
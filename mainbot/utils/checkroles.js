// checkroles.js
const config = require("../../config");
const { queryParams } = require("../../db/database");

module.exports = async function checkroles(client) {
  const currentTime = Date.now();
  const activeLicenses = await queryParams(
    "SELECT * FROM usedLicenses WHERE expiry > ?",
    [currentTime.toString()]
  );

  let rolesAssigned = 0;
  let rolesRemoved = 0;
  let ownerRolesAssigned = 0;
  let ownerRolesRemoved = 0;

  let guild;
  try {
    guild = await client.guilds.fetch(config.guildid);
    if (!guild) return;
  } catch (err) {
    console.error("Failed to fetch guild:", err);
    return;
  }

  // Process license roles
  for (const license of activeLicenses) {
    const userId = license.user_id;

    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;

      if (!member.roles.cache.has(config.roleid)) {
        await member.roles.add(config.roleid);
        rolesAssigned++;
      }
    } catch (err) {
      console.error(`Failed to assign license role to ${userId}:`, err);
    }
  }

  // Remove expired license roles
  const allUsers = [...new Set([...activeLicenses.map(l => l.user_id)])];

  for (const memberId of allUsers) {
    try {
      const member = await guild.members.fetch(memberId).catch(() => null);
      if (!member) continue;

      const hasActiveLicense = activeLicenses.some(l => l.user_id === memberId);
      if (!hasActiveLicense && member.roles.cache.has(config.roleid)) {
        await member.roles.remove(config.roleid);
        rolesRemoved++;
      }
    } catch (err) {
      console.error(`Failed to remove expired role from ${memberId}:`, err);
    }
  }

  // Assign owner roles
  for (const ownerId of config.owners) {
    if (!ownerId) continue;
    try {
      const member = await guild.members.fetch(ownerId).catch(() => null);
      if (!member || !member.roles) {
        console.warn(`Owner member ${ownerId} not found.`);
        continue;
      }

      if (!member.roles.cache.has(config.ownerrole)) {
        await member.roles.add(config.ownerrole);
        ownerRolesAssigned++;
      }
    } catch (err) {
      if (err.code === 50013) {
        console.warn(`Missing Permissions (50013) to assign owner role to ${ownerId}. Move bot role higher.`);
      } else {
        console.error(`Failed to assign owner role to ${ownerId}:`, err);
      }
    }
  }

  // Remove owner roles from users who are no longer owners
  const guildMembers = await guild.members.fetch({ limit: 1000 }).catch(() => null);
  if (guildMembers) {
    for (const [memberId, member] of guildMembers) {
      if (!config.owners.includes(memberId) && member.roles && member.roles.cache.has(config.ownerrole)) {
        try {
          await member.roles.remove(config.ownerrole);
          ownerRolesRemoved++;
        } catch (err) {
          if (err.code === 50013) {
            console.warn(`Missing Permissions (50013) to remove owner role from ${memberId}. Move bot role higher.`);
          } else {
            console.error(`Failed to remove owner role from ${memberId}:`, err);
          }
        }
      }
    }
  }

  return {
    rolesAssigned,
    rolesRemoved,
    ownerRolesAssigned,
    ownerRolesRemoved
  };
};

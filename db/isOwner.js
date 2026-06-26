const {owners} = require("../config")
module.exports = async (userid) => {
    if (owners.includes(userid)) return true
    return false
}
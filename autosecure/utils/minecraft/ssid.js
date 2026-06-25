const HttpClient = require('../process/HttpClient')

module.exports = async (xbl, d = false) => {
    try {
        let axios = new HttpClient()
        let extractSSID = await axios.post("https://api.minecraftservices.com/authentication/login_with_xbox", {
            identityToken: xbl,
            ensureLegacyEnabled: true,
            platform: "WEB"
        })

      //  console.log(extractSSID.data)

        if (extractSSID?.data?.access_token) {
            return extractSSID.data.access_token
        }

        if (d && JSON.stringify(extractSSID.data).includes("/authentication/login_with_xbox")) {
            console.log("/authentication/login_with_xbox found in response")
            return "u should probably chill with the spam"
        }

    } catch (e) {
        console.log("Catch in getSSID")
        console.log(e)
    }

    return null
}

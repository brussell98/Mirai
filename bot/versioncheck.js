var request = require("request");
var version = require("../package.json").version;
var logger = require("./logger.js").Logger;

exports.checkForUpdate = function (callback) {
	request("https://raw.githubusercontent.com/brussell98/BrussellBot/master/package.json", function (err, response, body) {
		if (err) {
			logger.log("warn", "Version check error: " + err);
			return callback(null);
		}
		if (response.statusCode == 200) {
			var latest = JSON.parse(body).version;
			if ((version.split(".").join("")) < (latest.split(".").join(""))) { return callback("Bot is out of date! (current v" + version + ") (latest v" + latest + ")"); }
			if ((version.split(".").join("")) > (latest.split(".").join(""))) { return callback("Bot is a development version (v" + version + ")"); }
			return callback("BrussellBot is up-to-date (v" + version + ")");
		} else {
			logger.warn("Failed to check for new version: " + response.statusCode);
			return callback(null);
		}
	});
};

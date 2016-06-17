var request = require('request'),
	version = ~~(require('../package.json').version.split('.').join('')); //This is used to convert it to a number that can be compared

module.exports = function() {
	request("https://raw.githubusercontent.com/brussell98/BrussellBot/master/package.json", (error, response, body) => {
		if (error)
			console.log(`${cWarn(' WARN ')} Error checking for updates: ${error}`);
		else if (response.statusCode !== 200)
			console.log(`${cWarn(' WARN ')} Error checking for updates: Got response code ${response.statusCode}`);
		else {
			let latest = ~~(JSON.parse(body).version.split('.').join(''));
			if (latest > version)
				console.log(`${cWarn(' OUT OF DATE ')} A new version of BrussellBot is avalible`);
		}
	});
}

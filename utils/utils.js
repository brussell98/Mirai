var fs = require('fs'),
	superagent = require('superagent');

/**
* Contains various functions.
* @module utils
*/

/**
* Save a file safely, preventing it from being cleared.
* @arg {String} dir Path from root folder including filename. (EX: db/servers)
* @arg {String} ext=".json" File extension.
* @arg {String} data Data to be written to the file.
* @arg {Number} minSize=5 Will not save if less than this size in bytes.
*/
exports.safeSave = function(file, ext = ".json", data, minSize = 5) {
	if (!file || !ext || !data) return;
	if (file.startsWith('/')) file = file.substr(1);
	if (!ext.startsWith('.')) ext = '.' + ext;

	fs.writeFile(`${__dirname}/../${file}-temp${ext}`, data, error => {
		if (error) console.log(error);
		else {
			fs.stat(`${__dirname}/../${file}-temp${ext}`, (err, stats) => {
				if (err) console.log(err);
				else if (stats["size"] < minSize)
					console.log('safeSave: Prevented file from being overwritten');
				else {
					fs.rename(`${__dirname}/../${file}-temp${ext}`, `${__dirname}/../${file}${ext}`, e => {if(e)console.log(e)});
					console.log(`${cDebug(" SAFE SAVE ")} Updated ${file}${ext}`);
				}
			});
		}
	});
}

/**
 * Find a user matching the input string or return null if none found
 * @arg {String} query The input.
 * @arg {Eris.Guild} guild The guild to look on.
 * @returns {?Member} The found Member.
*/
exports.findUser = function(query, guild) {
	let found = null;
	if (query === undefined || guild === undefined)
		return found;
	query = query.toLowerCase();
	//order: match, starts with, contains, then repeat for nicks
	guild.members.forEach(m => { if (m.user.username.toLowerCase() === query) found = m; });
	if (!found) guild.members.forEach(m => { if (m.user.username.toLowerCase().indexOf(query) === 0) found = m; });
	if (!found) guild.members.forEach(m => { if (m.user.username.toLowerCase().includes(query)) found = m; });
	if (!found) guild.members.forEach(m => { if (m.nick !== null && m.nick.toLowerCase() === query) found = m; });
	if (!found) guild.members.forEach(m => { if (m.nick !== null && m.nick.toLowerCase().indexOf(query) === 0) found = m; });
	if (!found) guild.members.forEach(m => { if (m.nick !== null && m.nick.toLowerCase().includes(query)) found = m; });
	return found;
}

/**
* Update the server count on Carbon.
* @arg {String} key The bot's key.
* @arg {Number} servercount Server count.
*/
exports.updateCarbon = function(key, servercount) {
	if (!key || !servercount) return;
	superagent.post('https://www.carbonitex.net/discord/data/botdata.php')
		.type('application/json')
		.send({key, servercount})
		.end(error => {
			console.log(`${cDebug(" CARBON UPDATE ")} Updated Carbon server count to ${servercount}`);
			if (error) console.log(`${cError(' CARBON UPDATE ERROR ')} ${error.status} ${error.response}`);
		});
}

/**
* Set the bot's avatar from /avatars/.
* @arg {String} file File name with extension.
* @arg {Eris} bot The client.
*/
exports.setAvatar = function(file, bot) {
	if (file && bot) {
		fs.access(__dirname + '/../avatars/' + file, err => {
			if (err) console.log("The file doesn't exist");
			else {
				let avatar = 'data:image/jpeg;base64,' + fs.readFileSync(__dirname + '/../avatars/' + file, 'base64');
				bot.editSelf({avatar}).catch(console.log);
			}
		});
	}
}

/**
* Comma sperate a number.
* @arg {Number} number The number to comma.
* @returns {String} The formatted number.
*/
exports.comma = (number) => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
* Converts to human readable form
* @arg {Number} milliseconds Time to format in milliseconds.
* @returns {String} The formatted time.
*/
exports.formatTime = function(milliseconds) {
	let s = milliseconds / 1000;
	let seconds = s % 60;
	s /= 60;
	let minutes = s % 60;
	s /= 60;
	let hours = s % 24;
	s /= 24;
	let days = s;
	return `${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds`;
}

/** Check for a newer version of MiraiBot */
exports.checkForUpdates = function() {
	let version = ~~(require('../package.json').version.split('.').join('')); //This is used to convert it to a number that can be compared
	superagent.get("https://raw.githubusercontent.com/brussell98/Mirai/master/package.json")
		.end((error, response) => {
			if (error)
				console.log(`${cWarn(' WARN ')} Error checking for updates: ${error.status}`);
			else {
				let latest = ~~(JSON.parse(response.text).version.split('.').join(''));
				if (latest > version)
					console.log(`${cWarn(' OUT OF DATE ')} A new version of MiraiBot is avalible`);
			}
	});
}

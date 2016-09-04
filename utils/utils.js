var fs = require('fs'),
	superagent = require('superagent'),
	reload = require('require-reload'),
	logger = new (reload('./Logger.js'))((reload('../config.json')).logTimestamp);

/**
* Contains various functions.
* @module utils
*/

/**
* Save a file safely, preventing it from being cleared.
* @arg {String} dir Path from root folder including filename. (EX: db/servers)
* @arg {String} ext File extension.
* @arg {String} data Data to be written to the file.
* @arg {Number} minSize=5 Will not save if less than this size in bytes.
* @returns {Promise<Boolean|Error>} Will resolve with true if saved successfully.
*/
exports.safeSave = function(file, ext, data, minSize = 5) {
	return new Promise((resolve, reject) => {
		if (!file || !ext || !data)
			return reject(new Error('Invalid arguments'));
		if (file.startsWith('/')) file = file.substr(1);
		if (!ext.startsWith('.')) ext = '.' + ext;

		fs.writeFile(`${__dirname}/../${file}-temp${ext}`, data, error => {
			if (error) {
				logger.error(error, 'SAFE SAVE WRITE');
				reject(error);
			} else {
				fs.stat(`${__dirname}/../${file}-temp${ext}`, (err, stats) => {
					if (err) {
						logger.error(err, 'SAFE SAVE STAT');
						reject(err);
					} else if (stats["size"] < minSize) {
						logger.debug('Prevented file from being overwritten', 'SAFE SAVE');
						resolve(false);
					} else {
						fs.rename(`${__dirname}/../${file}-temp${ext}`, `${__dirname}/../${file}${ext}`, e => {
							if (e) {
								logger.error(e, 'SAFE SAVE RENAME');
								reject(e);
							} else
								resolve(true);
						});
						logger.debug(`Updated ${file}${ext}`, 'SAFE SAVE');
					}
				});
			}
		});
	});
}

/**
 * Find a member matching the input string or return null if none found
 * @arg {String} query The input.
 * @arg {Eris.Guild} guild The guild to look on.
 * @arg {Boolean} [exact=false] Only look for an exact match.
 * @returns {?Eris.Member} The found Member.
*/
exports.findMember = function(query, guild, exact = false) {
	let found = null;
	if (query === undefined || guild === undefined)
		return found;
	query = query.toLowerCase();
	guild.members.forEach(m => { if (m.user.username.toLowerCase() === query) found = m; });
	if (!found) guild.members.forEach(m => { if (m.nick !== null && m.nick.toLowerCase() === query) found = m; });
	if (!found && exact === false) guild.members.forEach(m => { if (m.user.username.toLowerCase().indexOf(query) === 0) found = m; });
	if (!found && exact === false) guild.members.forEach(m => { if (m.nick !== null && m.nick.toLowerCase().indexOf(query) === 0) found = m; });
	if (!found && exact === false) guild.members.forEach(m => { if (m.user.username.toLowerCase().includes(query)) found = m; });
	if (!found && exact === false) guild.members.forEach(m => { if (m.nick !== null && m.nick.toLowerCase().includes(query)) found = m; });
	return found;
}

/**
 * Find a user matching the input string or return null if none found
 * @arg {String} query The input.
 * @arg {Eris.Guild} guild The guild to look on.
 * @arg {Boolean} [exact=false] Only look for an exact match.
 * @returns {?Eris.User} The found User.
*/
exports.findUserInGuild = function(query, guild, exact = false) {
	let found = null;
	if (query === undefined || guild === undefined)
		return found;
	query = query.toLowerCase();
	guild.members.forEach(m => { if (m.user.username.toLowerCase() === query) found = m; });
	if (!found) guild.members.forEach(m => { if (m.nick !== null && m.nick.toLowerCase() === query) found = m; });
	if (!found && exact === false) guild.members.forEach(m => { if (m.user.username.toLowerCase().indexOf(query) === 0) found = m; });
	if (!found && exact === false) guild.members.forEach(m => { if (m.nick !== null && m.nick.toLowerCase().indexOf(query) === 0) found = m; });
	if (!found && exact === false) guild.members.forEach(m => { if (m.user.username.toLowerCase().includes(query)) found = m; });
	if (!found && exact === false) guild.members.forEach(m => { if (m.nick !== null && m.nick.toLowerCase().includes(query)) found = m; });
	return found === null ? found : found.user;
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
			logger.debug('Updated Carbon server count to ' + servercount, 'CARBON UPDATE');
			if (error) logger.error(error.status || error.response, 'CARBON UPDATE ERROR');
		});
}

/**
* Update the server count on [Abalabahaha's bot list]@{link https://bots.discord.pw/}.
* @arg {String} key Your API key.
* @arg {Number} server_count Server count.
*/
exports.updateAbalBots = function(id, key, server_count) {
	if (!key || !server_count) return;
	superagent.post(`https://bots.discord.pw/api/bots/${id}/stats`)
		.set('Authorization', key)
		.type('application/json')
		.send({server_count})
		.end(error => {
			logger.debug('Updated bot server count to ' + server_count, 'ABAL BOT LIST UPDATE');
			if (error) logger.error(error.status || error.response, 'ABAL BOT LIST UPDATE ERROR');
		});
}

/**
* Set the bot's avatar from /avatars/.
* @arg {Eris.Client} bot The client.
* @arg {String} url The direct url to the image.
* @returns {Promise}
*/
exports.setAvatar = function(bot, url) {
	return new Promise((resolve, reject) => {
		if (bot !== undefined && typeof url === 'string') {
			superagent.get(url)
				.end((error, response) => {
					if (!error && response.status === 200) {
						bot.editSelf({avatar: `data:${response.header['content-type']};base64,${response.body.toString('base64')}`})
							.then(resolve)
							.catch(reject);
					} else
						reject('Got status code ' + error.status || error.response);
				});
		} else
			reject('Invalid parameters');
	});
}

/**
* Converts to human readable form
* @arg {Number} milliseconds Time to format in milliseconds.
* @returns {String} The formatted time.
*/
exports.formatTime = function(milliseconds) {
	let s = milliseconds / 1000;
	let seconds = (s % 60).toFixed(0);
	s /= 60;
	let minutes = (s % 60).toFixed(0);
	s /= 60;
	let hours = (s % 24).toFixed(0);
	s /= 24;
	let days = s.toFixed(0);
	return `${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds`;
}

/** Check for a newer version of MiraiBot */
exports.checkForUpdates = function() {
	let version = ~~(require('../package.json').version.split('.').join('')); //This is used to convert it to a number that can be compared
	superagent.get("https://raw.githubusercontent.com/brussell98/Mirai/master/package.json")
		.end((error, response) => {
			if (error)
				logger.warn('Error checking for updates: ' + (error.status || error.response));
			else {
				let latest = ~~(JSON.parse(response.text).version.split('.').join(''));
				if (latest > version)
					logger.warn('A new version of MiraiBot is avalible', 'OUT OF DATE');
			}
		});
}

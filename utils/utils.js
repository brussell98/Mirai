var fs = require('fs'),
	request = require('request');

/*
Save a file safely
	dir: path from root folder (EX: db/servers)
	ext: file extension (EX: .json)
	data: data to be written to the file
	minSize: will not save if less than this size in bytes (optional, defaults to 5)
*/
exports.safeSave = function(dir, ext, data, minSize = 5) {
	if (!dir || !ext || !data) return;
	if (dir.startsWith('/')) dir = dir.substr(1);
	if (!ext.startsWith('.')) ext = '.' + ext;

	fs.writeFile(`${__dirname}/../${dir}-temp${ext}`, data, error => {
		if (error) console.log(error);
		else {
			fs.stat(`${__dirname}/../${dir}-temp${ext}`, (err, stats) => {
				if (err) console.log(err);
				else if (stats["size"] < minSize)
					console.log('safeSave: Prevented file from being overwritten');
				else {
					fs.rename(`${__dirname}/../${dir}-temp${ext}`, `${__dirname}/../${dir}${ext}`, e => {if(e)console.log(e)});
					if (debug) console.log(cDebug(" DEBUG ") + " Updated " + dir + ext);
				}
			});
		}
	});
}

/*
Find a user matching the input string or return false if none found
	query: the input
	members: the array of users to search
	server: server to look for nicknames on (optional)
*/
exports.findUser = function(query, members, server) {
	//order: match, starts with, contains, then repeat for nicks
	if (!query || !members || typeof query !== 'string') return false;
	let r = members.find(m => { return !m.username ? false : m.username.toLowerCase() === query.toLowerCase() });
	if (!r) r = members.find(m => { return !m.username ? false : m.username.toLowerCase().indexOf(query.toLowerCase()) === 0 });
	if (!r) r = members.find(m => { return !m.username ? false : m.username.toLowerCase().includes(query.toLowerCase()) });
	if (server) {
		if (!r) r = members.find(m => { return !server.detailsOf(m).nick ? false : server.detailsOf(m).nick.toLowerCase() === query.toLowerCase() });
		if (!r) r = members.find(m => { return !server.detailsOf(m).nick ? false : server.detailsOf(m).nick.toLowerCase().indexOf(query.toLowerCase()) === 0 });
		if (!r) r = members.find(m => { return !server.detailsOf(m).nick ? false : server.detailsOf(m).nick.toLowerCase().includes(query.toLowerCase()) });
	}
	return r || false;
}

/*
Update the server count on carbon
	key: Bot's key
	servers: Server count
*/
exports.updateCarbon = function(key, servers) {
	if (!key || !servers) return;
	request.post({
			"url": "https://www.carbonitex.net/discord/data/botdata.php",
			"headers": {"content-type": "application/json"}, "json": true,
			body: {
				"key": key,
				"servercount": servers
			}
		}, (e, r) => {
		if (debug) console.log(cDebug(" DEBUG ") + " Updated Carbon server count");
		if (e) console.log("Error updating carbon stats: " + e);
		if (r.statusCode !== 200) console.log("Error updating carbon stats: Status Code " + r.statusCode);
	});
}

/*
Set the bot's avatar
	file: file name with extension
	bot: the client
*/
exports.setAvatar = function(file, bot) {
	if (file && bot) {
		fs.access(__dirname + '/../avatars/' + file, err => {
			if (err) console.log("The file doesn't exist");
			else {
				let avatarB64 = 'data:image/jpeg;base64,' + fs.readFileSync(__dirname + '/../avatars/' + file, 'base64');
				bot.setAvatar(avatarB64).catch(console.log);
			}
		});
	}
}

/*
Get 700 channel messages if needed
	bot: The client
	channel: The channel to get logs for
*/
exports.getLogs = function(bot, channel) {
	return new Promise((resolve, reject) => {
		if (channel.messages.length >= 700)
			resolve();
		else {
			function checkIfEmpty(messages) {
				if (messages.length < 100) {
					resolve();
					return;
				}
				return bot.getChannelLogs(channel, 100, {before: messages[99]});
			}

			bot.getChannelLogs(channel, 100)
				.then(checkIfEmpty)
				.then(checkIfEmpty)
				.then(checkIfEmpty)
				.then(checkIfEmpty)
				.then(checkIfEmpty)
				.then(checkIfEmpty)
				.catch(reject)
		}
	});
}

//comma sperate a number
exports.comma = (number) => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

//sort messages by earliest first
exports.sortById = (a, b) => a.id - b.id;

exports.formatTime = function(milliseconds) {
	
}

var fs = require('fs'),
	superagent = require('superagent');

/*
 * Save a file safely
 * dir: path from root folder including filename (EX: db/servers)
 * ext: file extension (EX: .json)
 * data: data to be written to the file
 * minSize: will not save if less than this size in bytes (optional, defaults to 5)
*/
exports.safeSave = function(file, ext, data, minSize = 5) {
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

/*
 * Find a user matching the input string or return false if none found
 * query: the input
 * members: the array of users to search
 * server: server to look for nicknames on (optional)
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
 * Update the server count on carbon
 * key: Bot's key
 * servercount: Server count
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

/*
 * Set the bot's avatar
 * file: file name with extension
 * bot: the client
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
 * Get previous channel messages. Return's an array starting at the newest message.
 * bot: The client
 * channel: The channel to get logs for
 * count: number of messages to get
 * before: get messages before this
*/
function getLogs(bot, channel, count, before) {
    return new Promise(resolve => {
        bot.getChannelLogs(channel, count, before ? {before} : {}).then(newMessages => {
            count -= 100;
            if (count > 0 && newMessages.length == 100) { //if it still needs to grab more and there are more
                getLogs(bot, channel, count, newMessages[99]).then(messages => {
                    if (messages)
                        resolve(newMessages.concat(messages)); //add the fetched messages to the end
                    else
                        resolve(messages);
                }).catch(() => {resolve(newMessages)});
            } else
                resolve(newMessages);
        });
    });
}
exports.getLogs = getLogs;

//comma sperate a number
exports.comma = (number) => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

//sort messages by earliest first
exports.sortById = (a, b) => a.id - b.id;

//Converts to human readable form
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

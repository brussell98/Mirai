var fs = require('fs')
	,request = require('request');

/*
Save a file safely
	dir: path from root folder (EX: db/servers)
	ext: file extension (EX: .json)
	data: data to be written to the file
	minSize: will not save if less than this size in bytes (optional, defaults to 5)
*/
exports.safeSave = function(dir, ext, data, minSize) {
	if (!dir || !ext || !data) return;
	if (dir.startsWith('/')) dir = dir.substr(1);
	if (!ext.startsWith('.')) ext = '.' + ext;
	if (!minSize) minSize = 5;

	fs.writeFile(__dirname + '/../' + dir + '-temp' + ext, data, error=>{
		if (error) console.log(error);
		else {
			fs.stat(__dirname + '/../' + dir + '-temp' + ext, (err, stats)=>{
				if (err) console.log(err);
				else if (stats["size"] < minSize) console.log('safeSave: Prevented file from being overwritten');
				else {
					fs.rename(__dirname + '/../' + dir + '-temp' + ext, __dirname + '/../' + dir + '' + ext, e=>{if(e)console.log(e)});
					if (debug) console.log(cDebug(" DEBUG ") + " Updated " + dir + ext);
				}
			});
		}
	});
}

/*
Find a user matching the input string
	query: the input
	members: the array of users to search
*/
exports.findUser = function(query, members) {
	if (!query || !members || typeof query != 'string') return false;
	var r = members.find(m=>{ return (m === undefined || m.username == undefined) ? false : m.username.toLowerCase() == query.toLowerCase() });
	if (!r) r = members.find(m=>{ return (m === undefined || m.username == undefined) ? false : m.username.toLowerCase().indexOf(query.toLowerCase()) == 0 });
	if (!r) r = members.find(m=>{ return (m === undefined || m.username == undefined) ? false : m.username.toLowerCase().indexOf(query.toLowerCase()) > -1 });
	return r || false;
}

/*
Tell the user the correct usage of a command
	cmd: The name of the command
	usage: The usage of the command
	msg: The message object to reply to
	bot: The bot
	prefix: The command's prefix
	delay: How long to wait before deleting (optional, defaults to 10 seconds)
*/
exports.correctUsage = function(cmd, usage, msg, bot, prefix, delay) {
	if (!cmd || !usage || !msg || !bot || !prefix) return;
	bot.sendMessage(msg, `${msg.author.username.replace(/@/g, '@\u200b')}, the correct usage is *\`${prefix}${cmd} ${usage}\`*`, (e,m)=>{bot.deleteMessage(m, {"wait": delay || 10000});});
	bot.deleteMessage(msg, {"wait": delay || 10000});
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
		}, (e, r)=>{
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
		fs.access(__dirname + '/../avatars/' + file, err=>{
			if (err) console.log("The file doesn't exist");
			else {
				var avatarB64 = 'data:image/jpeg;base64,' + fs.readFileSync(__dirname + '/../avatars/' + file, 'base64');
				bot.setAvatar(avatarB64).catch(console.log);
			}
		});
	}
}

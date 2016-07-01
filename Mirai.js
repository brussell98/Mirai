var reload			= require('require-reload')(require),
	Eris			= require('eris'),
	_chalk			= require('chalk'),
	chalk			= new _chalk.constructor({enabled: true}),
	config			= reload('./config.json'),
	validateConfig	= reload('./utils/validateConfig.js'),
	CommandManager	= reload('./utils/CommandManager.js'),
	utils			= reload('./utils/utils.js'),
	settingsManager	= reload('./utils/settingsManager.js'),
	ready = false;

var events = {
	ready: reload(`${__dirname}/events/ready.js`),
	messageCreate: reload(`${__dirname}/events/messageCreate.js`),
	guildMemberAdd: reload(`${__dirname}/events/guildMemberAdd.js`)
};

//console colors
cWarn	= chalk.bgYellow.black;
cError	= chalk.bgRed.black;
cDebug	= chalk.bgWhite.black;
cGreen	= chalk.bold.green;
cRed	= chalk.bold.red;
cServer	= chalk.bold.magenta;
cYellow	= chalk.bold.yellow;
cBlue	= chalk.bold.blue;

commandsProcessed = 0;
cleverbotTimesUsed = 0;

validateConfig(config);

var bot = new Eris(config.token, {autoReconnect: true, disableEveryone: true, getAllUsers: true, messageLimit: 200, sequencerWait: 100, moreMentions: true});

var CommandManagers = [];
for (let prefix in config.commandSets) { //Add command sets
	let color = config.commandSets[prefix].hasOwnProperty('color') ? global[config.commandSets[prefix].color] : false;
	if (color !== false && typeof color !== 'function') color = false; //If invalid color
	CommandManagers.push(new CommandManager(prefix, config.commandSets[prefix].dir, color));
}


function init(index = 0) {
	return new Promise((resolve, reject) => {
		CommandManagers[index].initialize() //Load CommandManager at {index}
			.then(() => {
				console.log(`${cDebug(' INIT ')} Loaded CommandManager ${index}`);
				index++;
				if (CommandManagers.length > index) { //If there are more to load
					init(index) //Loop through again
						.then(resolve)
						.catch(reject);
				} else //If that was the last one resolve
					resolve();
			}).catch(reject);
	});
}

function login() {
	console.log(cGreen('Logging in...'));
	bot.connect().catch(err => console.error(err));
}

//Load commands and log in
init()
	.then(login)
	.catch(error => {
		console.error(`${cError(' ERROR IN INIT ')} ${error}`);
	});


bot.on('error', (e, id) => {
	console.log(`${cError(` SHARD ${id} ERROR `)} ${e}\n${e.stack}`);
});

bot.on('ready', () => {
	ready = true;
	utils.checkForUpdates();
	events.ready(bot, config, [], utils);
});

bot.on('shardReady', id => {
	console.log(cGreen(` SHARD ${id} CONNECTED `));
});

bot.on('disconnected', () => {
	console.log(cRed('Disconnected from Discord'));
});

bot.on('shardDisconnect', (e, id) => {
	console.log(`${cError(` SHARD ${id} DISCONNECT `)} ${e}`);
});

bot.on('shardResume', id => {
	console.log(cGreen(` SHARD ${id} RESUMED `));
});

bot.on('messageCreate', msg => {
	if (msg.content.startsWith(config.reloadCommand) && config.adminIds.includes(msg.author.id)) //check for reload or eval command
		reloadModule(msg);
	else if (msg.content.startsWith(config.evalCommand) && config.adminIds.includes(msg.author.id))
		evaluate(msg);
	else
		events.messageCreate.handler(bot, msg, CommandManagers, config, settingsManager);
});

bot.on('guildMemberAdd', (guild, member) => {
	events.guildMemberAdd(bot, settingsManager, guild, member);
});

bot.on('channelDelete', channel => {
	settingsManager.handleDeletedChannel(channel);
});

function reloadModule(msg) {
	console.log(`${cDebug(' RELOAD MODULE ')} ${msg.author.username}: ${msg.content}`);
}

function evaluate(msg) {
	console.log(`${cDebug(' EVAL ')} ${msg.author.username}: ${msg.content}`);
}

if (config.carbonKey) { //Send servercount to Carbon bot list
	setInterval(() => {
		if (ready)
			utils.updateCarbon(config.carbonKey, bot.servers.length);
	}, 1800000);
}

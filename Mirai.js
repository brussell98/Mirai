var reload			= require('require-reload')(require),
	fs				= require('fs'),
	Eris			= require('eris'),
	_chalk			= require('chalk'),
	chalk			= new _chalk.constructor({enabled: true}),
	config			= reload('./config.json'),
	validateConfig	= reload('./utils/validateConfig.js'),
	CommandManager	= reload('./utils/CommandManager.js'),
	utils			= reload('./utils/utils.js'),
	settingsManager	= reload('./utils/settingsManager.js'),
	games			= reload('./special/games.json'),
	CommandManagers	= [],
	events			= {};

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

var bot = new Eris(config.token, {
	autoReconnect: true,
	disableEveryone: true,
	getAllUsers: true,
	messageLimit: 50,
	sequencerWait: 100,
	moreMentions: true,
	disableEvents: config.disableEvents,
	maxShards: config.shardCount,
	gatewayVersion: 6,
	cleanContent: true
});

function loadCommandSets() {
	return new Promise(resolve => {
		CommandManagers = [];
		for (let prefix in config.commandSets) { //Add command sets
			let color = config.commandSets[prefix].hasOwnProperty('color') ? global[config.commandSets[prefix].color] : false;
			if (color !== false && typeof color !== 'function') color = false; //If invalid color
			CommandManagers.push(new CommandManager(prefix, config.commandSets[prefix].dir, color));
		}
		resolve();
	});
}

function initCommandManagers(index = 0) {
	return new Promise((resolve, reject) => {
		CommandManagers[index].initialize(settingsManager) //Load CommandManager at {index}
			.then(() => {
				console.log(`${cDebug(' INIT ')} Loaded CommandManager ${index}`);
				index++;
				if (CommandManagers.length > index) { //If there are more to load
					initCommandManagers(index) //Loop through again
						.then(resolve)
						.catch(reject);
				} else //If that was the last one resolve
					resolve();
			}).catch(reject);
	});
}

function loadEvents() { // Load all events in events/
	return new Promise((resolve, reject) => {
		fs.readdir('./events/', (err, files) => {
			if (err) reject(`Error reading events directory: ${err}`);
			else if (!files) reject('No files in directory events/');
			else {
				for (let name of files) {
					if (name.endsWith('.js')) {
						name = name.replace(/\.js$/, '');
						try {
							events[name] = reload(`./events/${name}.js`);
							initEvent(name);
						} catch (e) {
							console.error(`Error loading event ${name.replace(/\.js$/, '')}: ${e}\n${e.stack}`);
						}
					}
				}
				resolve();
			}
		});
	});
}

function initEvent(name) { // Setup the event listener for each loaded event.
	if (name === 'messageCreate') {
		bot.on('messageCreate', msg => {
			if (msg.content.startsWith(config.reloadCommand) && config.adminIds.includes(msg.author.id)) //check for reload or eval command
				reloadModule(msg);
			else if (msg.content.startsWith(config.evalCommand) && config.adminIds.includes(msg.author.id))
				evaluate(msg);
			else
				events.messageCreate.handler(bot, msg, CommandManagers, config, settingsManager);
		});
	} else if (name === 'channelDelete') {
		bot.on('channelDelete', channel => {
			settingsManager.handleDeletedChannel(channel);
		});
	} else if (name === 'ready') {
		bot.on('ready', () => {
			events.ready(bot, config, games, utils);
		});
	} else {
		bot.on(name, function() { // MUST NOT BE ANNON/ARROW FUNCTION
			events[name](bot, settingsManager, config, ...arguments);
		});
	}
}

function miscEvents() {
	return new Promise(resolve => {
		if (bot.listenerCount('error') === 0) {
			bot.on('error', (e, id) => {
				console.log(`${cError(` SHARD ${id} ERROR `)} ${e}\n${e.stack}`);
			});
		}
		if (bot.listenerCount('shardReady') === 0) {
			bot.on('shardReady', id => {
				console.log(cGreen(` SHARD ${id} CONNECTED `));
			});
		}
		if (bot.listenerCount('disconnected') === 0) {
			bot.on('disconnected', () => {
				console.log(cRed('Disconnected from Discord'));
			});
		}
		if (bot.listenerCount('shardDisconnect') === 0) {
			bot.on('shardDisconnect', (e, id) => {
				console.log(`${cError(` SHARD ${id} DISCONNECT `)} ${e}`);
			});
		}
		if (bot.listenerCount('shardResume') === 0) {
			bot.on('shardResume', id => {
				console.log(cGreen(` SHARD ${id} RESUMED `));
			});
		}
		if (bot.listenerCount('guildCreate') === 0) {
			bot.on('guildCreate', guild => {
				console.log(`${cGreen(' GUILD CREATE ')}${guild.name}`);
			});
		}
		if (bot.listenerCount('guildDelete') === 0) {
			bot.on('guildDelete', (guild, unavailable) => {
				if (unavailable === false)
					console.log(`${cYellow(' GUILD LEAVE ')}${guild.name}`);
			});
		}
		return resolve();
	});
}

function login() {
	console.log(cGreen('Logging in...'));
	bot.connect().catch(console.error);
}

//Load commands and log in
loadCommandSets()
	.then(initCommandManagers)
	.then(loadEvents)
	.then(miscEvents)
	.then(login)
	.catch(error => {
		console.error(`${cError(' ERROR IN INIT ')} ${error}`);
	});

function reloadModule(msg) {
	console.log(`${cDebug(' RELOAD MODULE ')} ${msg.author.username}: ${msg.content}`);
	let arg = msg.content.substr(config.reloadCommand.length).trim();

	for (let i = 0; i < CommandManagers.length; i++) { //If arg starts with a prefix for a CommandManager reload/load the file.
		if (arg.startsWith(CommandManagers[i].prefix))
			return CommandManagers[i].reload(bot, msg.channel.id, arg.substr(CommandManagers[i].prefix.length), settingsManager);
	}

	if (arg === 'CommandManagers') {

		loadCommandSets()
			.then(initCommandManagers)
			.then(() => {
				bot.createMessage(msg.channel.id, 'Reloaded CommandManagers');
			}).catch(err => {
				console.log(`${' ERROR IN INIT'} ${err}`);
			});

	} else if (arg.startsWith('utils/')) {

		fs.access(`./${arg}.js`, fs.R_OK | fs.F_OK, err => {
			if (err)
				bot.createMessage(msg.channel.id, 'That file does not exist!');
			else {
				switch (arg.replace(/(utils\/|\.js)/g, '')) {
					case 'CommandManager':
						CommandManager = reload(`./${arg}.js`);
						bot.createMessage(msg.channel.id, 'Reloaded utils/CommandManager.js');
						break;
					case 'settingsManager': {
						let tempCommandList = settingsManager.commandList;
						settingsManager = reload(`./${arg}.js`);
						settingsManager.commandList = tempCommandList;
						bot.createMessage(msg.channel.id, 'Reloaded utils/settingsManager.js');
						break;
					} case 'utils':
						utils = reload(`./${arg}.js`);
						bot.createMessage(msg.channel.id, 'Reloaded utils/utils.js');
						break;
					case 'validateConfig':
						validateConfig = reload(`./${arg}.js`);
						bot.createMessage(msg.channel.id, 'Reloaded utils/validateConfig.js');
						break;
					default:
						bot.createMessage(msg.channel.id, "Can't reload that because it isn't already loaded");
						break;
				}
			}
		});

	} else if (arg.startsWith('events/')) {

		arg = arg.substr(7);
		if (events.hasOwnProperty(arg)) {
			events[arg] = reload(`./events/${arg}.js`);
			bot.createMessage(msg.channel.id, `Reloaded events/${arg}.js`);
		} else {
			bot.createMessage(msg.channel.id, "That events isn't loaded");
		}

	} else if (arg.startsWith('special/')) {

		switch (arg.substr(8)) {
			case 'cleverbot':
				events.messageCreate.reloadCleverbot(bot, msg.channel.id);
				break;
			case 'games':
				games = reload('./special/games.json');
				bot.createMessage(msg.channel.id, `Reloaded special/games.json`);
				break;
			default:
				bot.createMessage(msg.channel.id, "Not found");
				break;
		}

	} else if (arg === 'config') {

		validateConfig = reload('./utils/validateConfig.js');
		config = reload('./config.json');
		validateConfig(config);
		bot.createMessage(msg.channel.id, "Reloaded config");
	}
}

function evaluate(msg) {
	console.log(`${cDebug(' EVAL ')} ${msg.author.username}: ${msg.content}`);
	let toEval = msg.content.substr(config.evalCommand.length).trim();
	let result = '~eval failed~';

	try {
		result = eval(toEval);
	} catch (error) {
		console.log(error.message);
		bot.createMessage(msg.channel.id, `\`\`\`diff\n- ${error}\`\`\``); //Send error to chat also.
	}

	if (result !== '~eval failed~') {
		console.log(`Result: ${result}`);
		bot.createMessage(msg.channel.id, `__**Result:**__ \n${result}`);
	}
}

if (config.carbonKey) { //Send servercount to Carbon bot list
	setInterval(() => {
		if (bot.uptime !== 0)
			utils.updateCarbon(config.carbonKey, bot.guilds.size);
	}, 1800000);
}

setInterval(() => { // Update the bot's status for each shard every 10 minutes
	if (games.length !== 0 && bot.uptime !== 0) {
		bot.shards.forEach(shard => {
			shard.editGame({name: games[~~(Math.random() * games.length)]});
		});
	}
}, 600000);

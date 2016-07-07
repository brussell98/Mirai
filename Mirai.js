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
	CommandManagers	= [],
	ready			= false;

var events = {
	ready: reload(`${__dirname}/events/ready.js`),
	messageCreate: reload(`${__dirname}/events/messageCreate.js`),
	guildMemberAdd: reload(`${__dirname}/events/guildMemberAdd.js`),
	guildMemberRemove: reload(`${__dirname}/events/guildMemberRemove.js`),
	guildBanAdd: reload(`${__dirname}/events/guildBanAdd.js`),
	guildBanRemove: reload(`${__dirname}/events/guildBanRemove.js`),
	userUpdate: reload(`${__dirname}/events/userUpdate.js`),
	guildMemberUpdate: reload(`${__dirname}/events/guildMemberUpdate.js`)
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

var bot = new Eris(config.token, {
	autoReconnect: true,
	disableEveryone: true,
	getAllUsers: true,
	messageLimit: 200,
	sequencerWait: 100,
	moreMentions: true,
	disabledEvents: config.disabledEvents,
	maxShards: config.shardCount
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

function init(index = 0) {
	return new Promise((resolve, reject) => {
		CommandManagers[index].initialize(settingsManager) //Load CommandManager at {index}
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
	bot.connect().catch(console.error);
}

//Load commands and log in
loadCommandSets()
	.then(init)
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

bot.on('guildMemberRemove', (guild, member) => {
	events.guildMemberRemove(bot, settingsManager, guild, member);
});

bot.on('guildBanAdd', (guild, user) => {
	events.guildBanAdd(bot, settingsManager, guild, user);
});

bot.on('guildBanRemove', (guild, user) => {
	events.guildBanRemove(bot, settingsManager, guild, user);
});

bot.on('channelDelete', channel => {
	settingsManager.handleDeletedChannel(channel);
});

bot.on('userUpdate', (user, oldUser) => {
	events.userUpdate(bot, settingsManager, user, oldUser);
});

bot.on('guildMemberUpdate', (_, member, oldMember) => {
	events.guildMemberUpdate(bot, settingsManager, member, oldMember);
});

function reloadModule(msg) {
	console.log(`${cDebug(' RELOAD MODULE ')} ${msg.author.username}: ${msg.content}`);
	let arg = msg.content.substr(config.reloadCommand.length).trim();

	for (let i = 0; i < CommandManagers.length; i++) { //If arg starts with a prefix for a CommandManager reload/load the file.
		if (arg.startsWith(CommandManagers[i].prefix))
			return CommandManagers[i].reload(bot, msg.channel.id, arg.substr(CommandManagers[i].prefix.length));
	}

	if (arg === 'CommandManagers') {

		loadCommandSets()
			.then(init)
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
					case 'settingsManager':
						settingsManager = reload(`./${arg}.js`);
						bot.createMessage(msg.channel.id, 'Reloaded utils/settingsManager.js');
						break;
					case 'utils':
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
		if (ready)
			utils.updateCarbon(config.carbonKey, bot.servers.length);
	}, 1800000);
}

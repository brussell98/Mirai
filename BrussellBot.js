var reload			= require('require-reload')(require),
	bot				= require('discord.js').Client({autoReconnect: true, forceFetchUsers: true, maxCachedMessages: 1000, disableEveryone: true}),
	_chalk			= require('chalk'),
	chalk			= _chalk.constructor({enabled: true}),
	config			= reload('./config.json'),
	validateConfig	= reload('./utils/validateConfig.js'),
	CommandManager	= reload('./utils/CommandManager.js');

//console colors
cWarn	= chalk.bgYellow.black;
cError	= chalk.bgRed.black;
cDebug	= chalk.bgWhite.black;
cGreen	= chalk.bold.green;
cRed	= chalk.bold.red;

commandsProcessed = 0;
cleverbotTimesUsed = 0;

validateConfig(config);

//Load commands and then log in
var normalCommands = new CommandManager(config.prefix),
	modCommands = new CommandManager(config.modPrefix, 'commands/mod/');

normalCommands.initialize()
	.then(modCommands.initialize)
	.then(login)
	.catch(error => {throw new Error(error)});

function login() {
	console.log(cGreen('Logging in...'));
	bot.loginWithToken(config.token).catch(console.error);
}

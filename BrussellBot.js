var reload	= require('require-reload')(require),
	bot		= require('discord.js').Client({autoReconnect: true, forceFetchUsers: true, maxCachedMessages: 1000, disableEveryone: true}),
	_chalk	= require('chalk'),
	chalk	= _chalk.constructor({enabled: true}),
	config	= reload('./config.json'),
	validateConfig = reload('./utils/validateConfig.js');

//console colors
cWarn = chalk.bgYellow.black;
cError = chalk.bgRed.black;

uptime = Date.now();
commandsProcessed = 0;
cleverbotTimesUsed = 0;

validateConfig(config);

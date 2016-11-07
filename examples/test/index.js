const Mirai = require('../../');
var config = require('./config.json');

var GeneralCommands = new (require('./commands/GeneralCommands'));

var mirai = new Mirai(config);
mirai.loadCommandPlugin(GeneralCommands)
	.then(() => mirai.run())
	.catch(console.error);

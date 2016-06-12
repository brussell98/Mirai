var reload		= require('require-reload')(require),
	cleverbot	= reload('../special/cleverbot.js');

module.exports = {
	handler(bot, msg, CommandManagers, config) {

	},
	reloadCleverbot() {
		cleverbot = reload('../special/cleverbot.js');
	}
}

var reload = require('require-reload'),
	_Logger = reload('./Logger.js'),
	logger;

module.exports = function(config) {
	if (logger === undefined)
		logger = new _Logger(config.logTimestamp);
	return new Promise((resolve, reject) => {
		if (!config.token) {
			logger.error('Bot token is not defined', 'CONFIG ERROR');
			return reject();
		}
		if (typeof config.shardCount !== 'number' || config.shardCount < 1) {
			logger.error('shardCount must be a valid positive Number', 'CONFIG ERROR');
			return reject();
		}
		if (typeof config.disableEvents !== 'object') {
			logger.error('disableEvents must be a valid Object', 'CONFIG ERROR');
			return reject();
		}
		if (!Array.isArray(config.bannedGuildIds)) {
			logger.error('bannedGuildIds must be an array of strings.', 'CONFIG ERROR');
			return reject();
		}
		if (!Array.isArray(config.whitelistedGuildIds)) {
			logger.error('whitelistedGuildIds must be an array of strings.', 'CONFIG ERROR');
			return reject();
		}
		//Check for invalid command sets
		for (let prefix in config.commandSets) {
			if (prefix === "") {
				logger.error('One of your commandSets has no prefix', 'CONFIG ERROR');
				return reject();
			} else if (!config.commandSets[prefix].hasOwnProperty('dir')) {
				logger.error('You need to define a dir for commandSet ' + prefix, 'CONFIG ERROR');
				return reject();
			}
		}
		if (!config.adminIds || config.adminIds.length < 1) {
			logger.error('You must specify at least one admin id', 'CONFIG ERROR');
			return reject();
		} else if (typeof config.adminIds[0] !== 'string' || config.adminIds[0] === "") {
			logger.error('Admin ID needs to be a string', 'CONFIG ERROR');
			return reject();
		}
		if (typeof config.reloadCommand !== 'string' || config.reloadCommand === "") {
			logger.error('The reloadCommand needs to be a string', 'CONFIG ERROR');
			return reject();
		}
		if (typeof config.evalCommand !== 'string' || config.evalCommand === "") {
			logger.error('The evalCommand needs to be a string', 'CONFIG ERROR');
			return reject();
		}
		if (!config.inviteLink)
			logger.warn('Invite link is not defined', 'CONFIG WARNING');
		if (typeof config.logTimestamp !== 'boolean')
			logger.warn('logTimestamp needs to be set to true or false', 'CONFIG WARNING');
		if (typeof config.cleverbot !== 'boolean')
			logger.warn('cleverbot must be set to true or false', 'CONFIG WARNING');
		if (typeof config.cycleGames !== 'boolean')
			logger.warn('cycleGames must be set to true or false', 'CONFIG WARNING');
		return resolve();
	});
};

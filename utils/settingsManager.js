var reload = require('require-reload')(require),
	utils = reload('./utils.js'),
	genericSettings = reload('../db/genericSettings.json'),
	commandSettings = reload('../db/commandSettings.json'),
	updateGeneric = false,
	updateCommand = false;

const interval = setInterval(() => {
	if (updateGeneric === true) {
		utils.safeSave('db/genericSettings', '.json', JSON.stringify(genericSettings));
		updateGeneric = false;
	}
	if (updateCommand === true) {
		utils.safeSave('db/commandSettings', '.json', JSON.stringify(commandSettings));
		updateCommand = false;
	}
}, 20000);

function handleShutdown() {
	return Promise.all([utils.safeSave('db/genericSettings', '.json', JSON.stringify(genericSettings)), utils.safeSave('db/commandSettings', '.json', JSON.stringify(commandSettings))]);
}

function destroy() {
	clearInterval(interval);
	if (updateGeneric === true)
		utils.safeSave('db/genericSettings', '.json', JSON.stringify(genericSettings));
	if (updateCommand === true)
		utils.safeSave('db/commandSettings', '.json', JSON.stringify(commandSettings));
}

/**
* Manages settings for the bot.
* @module settingsManager
*/

/////////// WELCOME MESSAGES ///////////

/**
* Set a guild's welcome message. If only guildId is passed it will disable it.
* @arg {String} guildId The guild to change settings for.
* @arg {String} [channelId] The channel to set the welcome message to or "DM" to DM it.
* @arg {String} [message] The welcome message to set.
* @returns {Promise} Resolves when done modifying settings.
*/
function setWelcome(guildId, channelId, message) {
	return new Promise(resolve => {
		if (!genericSettings.hasOwnProperty(guildId))
			genericSettings[guildId] = {};
		if (!genericSettings[guildId].hasOwnProperty('welcome')) {
			if (message) { //Setting message and enabling
				genericSettings[guildId].welcome = {message, channelId};
				updateGeneric = true;
			}
		} else {
			if (message && (genericSettings[guildId].welcome.message != message || genericSettings[guildId].welcome.channelId != channelId)) {
				genericSettings[guildId].welcome.message = message; //Changing message
				genericSettings[guildId].welcome.channelId = channelId;
				updateGeneric = true;
			} else if (!message) { //disabling message that exists
				delete genericSettings[guildId].welcome;
				updateGeneric = true;
			}
		}
		removeIfEmpty(genericSettings, guildId, updateGeneric);
		resolve();
	});
}

/**
* Get a server's welcome message settings.
* @arg {String} guild The guild to get the setings for.
* @arg {String} member The user that joined.
* @arg {Boolean} raw Return without placeholders replaced.
* @returns {?Array<String>} Containing the channelId to send to and the message, or null.
*/
function getWelcome(guild, member, raw) {
	if (genericSettingExistsFor(guild.id, 'welcome'))
		return raw === true
			? [genericSettings[guild.id].welcome.channelId, genericSettings[guild.id].welcome.message]
			: [genericSettings[guild.id].welcome.channelId,
				genericSettings[guild.id].welcome.message.replace(/\$\{USER\}/gi, member.user.username).replace(/\$\{SERVER\}/gi, guild.name).replace(/\$\{MENTION\}/gi, member.user.mention)]; //replace with names
	return null;
}

/////////// EVENT NOTIFICATIONS ///////////

/**
* A list of avalible events.
* @const
* @type Array<String>
* @default
*/
const eventList = ['memberjoined', 'memberleft', 'userbanned', 'userunbanned', 'namechanged', 'nicknamechanged'];

/**
* Change where event notifications are sent.
* @arg {String} guildId The id of the guild to modify settings for.
* @arg {String} [channelId] The channel to send events to. If undefined will disable them.
*/
function setEventChannel(guildId, channelId) {
	if (!channelId && genericSettings.hasOwnProperty[guildId] && genericSettings[guildId].hasOwnProperty('events')) {
		delete genericSettings[guildId].events; //Disable event notifications
		updateGeneric = true;
		removeIfEmpty(genericSettings, guildId);
	} else if (channelId) {
		if (!genericSettings.hasOwnProperty(guildId)) {
			genericSettings[guildId] = {"events": {channelId, subbed: []}};
			updateGeneric = true;
		} else if (!genericSettings[guildId].hasOwnProperty('events')) {
			genericSettings[guildId].events = {channelId, subbed: []};
			updateGeneric = true;
		} else if (genericSettings[guildId].events.channelId !== channelId) {
			genericSettings[guildId].events.channelId = channelId;
			updateGeneric = true;
		}
	}
}

/**
* Subscribe a guild to events.
* @arg {Array} eventArray An array of strings containing the events to subscribe to.
* @arg {Eris.Channel} channel The channel the message was sent in.
* @returns {Promise<Array|String>} Will resolve if settings were changed with an array of subbed events. Else will reject with an error.
*/
function subEvents(eventArray, channel) {
	return new Promise((resolve, reject) => {
		if (!genericSettings.hasOwnProperty(channel.guild.id))
			genericSettings[channel.guild.id] = {};
		if (!genericSettings[channel.guild.id].hasOwnProperty('events'))
			setEventChannel(channel.guild.id, channel.id);
		eventArray = eventArray.map(i => i.substr(1).toLowerCase());
		let subbedEvents = [];
		for (let e of eventList) {
			if (eventArray.includes(e) && !genericSettings[channel.guild.id].events.subbed.includes(e)) {
				genericSettings[channel.guild.id].events.subbed.push(e);
				subbedEvents.push(e);
			}
		}
		updateGeneric = true;
		if (subbedEvents.length > 0) {
			resolve(subbedEvents);
		} else {
			removeIfEmpty(genericSettings, channel.guild.id);
			reject('Subscribed to nothing');
		}
	});
}

/**
* Unsubscribe a guild to events.
* @arg {Array} eventArray An array of strings containing the events to unsubscribe to.
* @arg {Eris.Channel} channel The channel the message was sent in.
* @returns {Promise<Array|String>} Will resolve if settings were changed with an array of unsubbed events. Else will reject with an error.
*/
function unsubEvents(eventArray, channel) {
	return new Promise((resolve, reject) => {
		if (!genericSettings.hasOwnProperty(channel.guild.id) || !genericSettings[channel.guild.id].hasOwnProperty('events'))
			return reject('You are not subscribed to any events');
		eventArray = eventArray.map(i => i.substr(1).toLowerCase());
		let unsubbedEvents = [];
		for (let e of eventList) {
			if (eventArray.includes(e) && genericSettings[channel.guild.id].events.subbed.includes(e)) {
				genericSettings[channel.guild.id].events.subbed.splice(genericSettings[channel.guild.id].events.subbed.indexOf(e), 1);
				unsubbedEvents.push(e);
			}
		}
		if (genericSettings[channel.guild.id].events.subbed.length === 0) {
			delete genericSettings[channel.guild.id].events;
			removeIfEmpty(genericSettings, channel.guild.id);
		}
		updateGeneric = true;
		if (unsubbedEvents.length > 0)
			resolve(unsubbedEvents);
		else
			reject('Unsubscribed to nothing');
	});
}

/**
* Check if subscribed to an event and where to send it.
* @arg {String} guildId The id of the guild to check.
* @arg {String} eventQ The event to check.
* @returns {?String} If subscribed, the channel id. If not, null.
*/
function getEventSetting(guildId, eventQ) {
	return (genericSettingExistsFor(guildId, 'events') && genericSettings[guildId].events.subbed.includes(eventQ) === true) ? genericSettings[guildId].events.channelId : null;
}

/**
* Check what events a guild is subscribed to and where they are posted.
* @arg {String} guildId The id of the guild to check.
* @returns {?Object} An object containing channelId and the subbed events.
*/
function getGuildsEvents(guildId) {
	return genericSettingExistsFor(guildId, 'events') ? genericSettings[guildId].events : null;
}

////////// NSFW ///////////

/**
* Edit the NSFW channels option for a guild.
* @arg {String} guildId The id of the guild.
* @arg {String} channelId The channel to edit the settings for.
* @arg {String} task A string with the value "allow" or "deny".
* @returns {Promise<String>}
*/
function setNSFW(guildId, channelId, task) {
	return new Promise((resolve, reject) => {
		if (!genericSettings.hasOwnProperty(guildId))
			genericSettings[guildId] = {};
		if (!genericSettings[guildId].hasOwnProperty('nsfw'))
			genericSettings[guildId].nsfw = [];

		if (task === 'allow' && !genericSettings[guildId].nsfw.includes(channelId)) {
			genericSettings[guildId].nsfw.push(channelId);
			updateGeneric = true;
			resolve('NSFW commands are now allowed here');
		} else if (task === 'deny' && genericSettings[guildId].nsfw.includes(channelId)) {
			genericSettings[guildId].nsfw.splice(genericSettings[guildId].nsfw.indexOf(channelId), 1);
			if (genericSettings[guildId].nsfw.length === 0)
				delete genericSettings[guildId].nsfw;
			updateGeneric = true;
			removeIfEmpty(genericSettings, guildId);
			resolve('NSFW commands are no longer allowed here');
		} else {
			removeIfEmpty(genericSettings, guildId, updateGeneric);
			reject('No settings changed');
		}
	});
}

/**
* Edit the NSFW channels option for a guild.
* @arg {String} guildId The id of the guild.
* @arg {String} channelId The channel to get the setting for.
* @returns {Boolean} If NSFW is allowed in that channel.
*/
function getNSFW(guildId, channelId) {
	return genericSettingExistsFor(guildId, 'nsfw') && genericSettings[guildId].nsfw.includes(channelId);
}

/**
* Check what channels in a guild have NSFW enabled
* @arg {String} guildId The id of the guild.
* @returns {?Array<String>} An array of the channel ids.
*/
function getAllNSFW(guildId) {
	return genericSettingExistsFor(guildId, 'nsfw') ? genericSettings[guildId].nsfw : null;
}

////////// COMMAND IGNORING //////////

/**
* A list of commands loaded by the bot by prefix.
* @type {Object}
*/
var commandList = {};

/**
* Add an ignore setting for a user or channel.
* @arg {String} guildId The guild to apply the setting change for.
* @arg {String} type Either "userIgnores" or "channelIgnores".
* @arg {String} id The user or channel to apply the setting change for.
* @arg {String} command The command to ignore including prefix. Use "all" as the command to ignore all.
* @returns {Promise<Boolean>} Resloves when done containg a boolean indicating if a setting was changed.
*/
function addIgnoreForUserOrChannel(guildId, type, id, command) {
	return new Promise((resolve, reject) => {
		if (!command || !guildId || !id || (type !== 'userIgnores' && type !== 'channelIgnores'))
			return reject('Invalid arguments');
		if (!commandSettings.hasOwnProperty(guildId))
			commandSettings[guildId] = {};
		if (!commandSettings[guildId].hasOwnProperty(type))
			commandSettings[guildId][type] = {};
		if (!commandSettings[guildId][type].hasOwnProperty(id))
			commandSettings[guildId][type][id] = [];

		if (command === 'cleverbot') {
			if (!commandSettings[guildId][type][id].includes('all') && !commandSettings[guildId][type][id].includes('cleverbot')) {
				commandSettings[guildId][type][id].push('cleverbot');
				updateCommand = true;
				return resolve(true);
			}
			return resolve(false);
		}

		let prefix = Object.keys(commandList).find(p => command.startsWith(p));
		command = command.replace(prefix, '');

		if (command === 'all') {
			if (prefix === undefined)
				commandSettings[guildId][type][id] = ['all'];
			else if (commandSettings[guildId][type][id].length === 0)
				commandSettings[guildId][type][id].push(prefix + 'all');
			else if (!commandSettings[guildId][type][id].includes(prefix + 'all')) {
				for (let i = 0; i < commandSettings[guildId][type][id].length; i++) {
					if (commandSettings[guildId][type][id][i][0] === prefix)
						commandSettings[guildId][type][id].splice(i, 1);
				}
				commandSettings[guildId][type][id].push(prefix + 'all')
			} else
				return resolve(false);
			updateCommand = true;
			return resolve(true);

		} else if (prefix !== undefined && commandList.hasOwnProperty(prefix) && commandList[prefix].includes(command) && !commandSettings[guildId][type][id].includes('all') && !commandSettings[guildId][type][id].includes(prefix + 'all') && !commandSettings[guildId][type][id].includes(prefix + command)) {
			commandSettings[guildId][type][id].push(prefix + command);
			updateCommand = true;
			return resolve(true);
		}
		removeIfEmptyArray(commandSettings[guildId][type], id, updateCommand);
		removeIfEmpty(commandSettings[guildId], type, updateCommand);
		removeIfEmpty(commandSettings, guildId, updateCommand);
		return resolve(false);
	});
}

/**
* Remove an ignore setting for a user or channel.
* @arg {String} guildId The guild to apply the setting change for.
* @arg {String} type Either "userIgnores" or "channelIgnores".
* @arg {String} id The user or channel to apply the setting change for.
* @arg {String} command The command to unignore including prefix. Use "all" as the command to unignore all.
* @returns {Promise<Boolean>} Resloves when done containg a boolean indicating if a setting was changed.
*/
function removeIgnoreForUserOrChannel(guildId, type, id, command) {
	return new Promise((resolve, reject) => {
		if (!command || !guildId || !id || (type !== 'userIgnores' && type !== 'channelIgnores'))
			return reject('Invalid arguments');
		if (!commandSettingExistsFor(guildId, type) || !commandSettings[guildId][type].hasOwnProperty(id))
			return resolve(false);

		if (command === 'cleverbot') {
			if (commandSettings[guildId][type][id].includes('cleverbot')) {
				commandSettings[guildId][type][id].splice(commandSettings[guildId][type][id].indexOf('cleverbot'), 1);
				if (commandSettings[guildId][type][id].length === 0) {
					delete commandSettings[guildId][type][id];
					removeIfEmpty(commandSettings[guildId], type);
					removeIfEmpty(commandSettings, guildId);
				}
				updateCommand = true;
				return resolve(true);
			}
			if (commandSettings[guildId][type][id].includes('all')) {
				commandSettings[guildId][type][id] = [];
				for (let p in commandList) { // For all of the prefixes.
					if (commandList.hasOwnProperty(p))
						commandSettings[guildId][type][id].push(p + 'all');
				}
				updateCommand = true;
				return resolve(true);
			}
			return resolve(false);
		}

		let prefix = Object.keys(commandList).find(p => command.startsWith(p));
		command = command.replace(prefix, '');

		if (command === 'all') {
			if (prefix === undefined && commandSettings[guildId][type][id].length !== 0) {
				delete commandSettings[guildId][type][id];
				removeIfEmpty(commandSettings[guildId], type);
				removeIfEmpty(commandSettings, guildId);
			} else if (commandSettings[guildId][type][id].length !== 0) {
				if (commandSettings[guildId][type][id].includes('all')) {
					commandSettings[guildId][type][id] = [];
					for (let p in commandList) { // For all of the prefixes.
						if (p !== prefix && commandList.hasOwnProperty(p))
							commandSettings[guildId][type][id].push(p + 'all');
					}
					if (commandSettings[guildId][type][id].length === 0) {
						delete commandSettings[guildId][type][id];
						removeIfEmpty(commandSettings[guildId], type);
						removeIfEmpty(commandSettings, guildId);
					}
				} else if (commandSettings[guildId][type][id].includes(prefix + 'all')) {
					commandSettings[guildId][type][id].splice(commandSettings[guildId][type][id].indexOf(prefix + 'all'), 1);
					if (commandSettings[guildId][type][id].length === 0) {
						delete commandSettings[guildId][type][id];
						removeIfEmpty(commandSettings[guildId], type);
						removeIfEmpty(commandSettings, guildId);
					}
				} else {
					for (let i = 0; i < commandSettings[guildId][type][id].length; i++) {
						if (commandSettings[guildId][type][id][i].startsWith(prefix))
							commandSettings[guildId][type][id].splice(i, 1);
					}
					if (commandSettings[guildId][type][id].length === 0) {
						delete commandSettings[guildId][type][id];
						removeIfEmpty(commandSettings[guildId], type);
						removeIfEmpty(commandSettings, guildId);
					}
				}
			} else
				return resolve(false);
			updateCommand = true;
			return resolve(true);

		} else if (prefix !== undefined && commandList.hasOwnProperty(prefix) && commandList[prefix].includes(command)) {
			if (commandSettings[guildId][type][id].includes('all')) {
				commandSettings[guildId][type][id] = [];
				for (let p in commandList) { // For all of the prefixes.
					if (commandList.hasOwnProperty(p)) {
						if (p === prefix) {
							for (let c of commandList[p]) { // All of that prefix's commands.
								if (c !== command)
									commandSettings[guildId][type][id].push(p + c);
							}
						} else
							commandSettings[guildId][type][id].push(p + 'all');
					}
				}
			} else if (commandSettings[guildId][type][id].includes(prefix + 'all')) {
				commandSettings[guildId][type][id].splice(commandSettings[guildId][type][id].indexOf(prefix + 'all'), 1);
				for (let c of commandList[prefix]) { // All of that prefix's commands.
					if (c !== command)
						commandSettings[guildId][type][id].push(prefix + c);
				}
			} else if (commandSettings[guildId][type][id].includes(prefix + command)) {
				commandSettings[guildId][type][id].splice(commandSettings[guildId][type][id].indexOf(prefix + command), 1);
				if (commandSettings[guildId][type][id].length === 0) {
					delete commandSettings[guildId][type][id];
					removeIfEmpty(commandSettings[guildId], type);
					removeIfEmpty(commandSettings, guildId);
				}
			} else
				return resolve(false);
			updateCommand = true;
			return resolve(true);
		}
		return resolve(false);
	});
}

/**
* Add an ignore setting for a guild.
* @arg {String} guildId The guild to apply the setting change for.
* @arg {String} command The command to ignore including prefix. Use "all" as the command to ignore all.
* @returns {Promise<Boolean>} Resloves when done containg a boolean indicating if a setting was changed.
*/
function addIgnoreForGuild(guildId, command) {
	return new Promise((resolve, reject) => {
		if (!command || !guildId)
			return reject('Invalid arguments');
		if (!commandSettings.hasOwnProperty(guildId))
			commandSettings[guildId] = {};
		if (!commandSettings[guildId].hasOwnProperty('guildIgnores'))
			commandSettings[guildId].guildIgnores = [];

		if (command === 'cleverbot') {
			if (!commandSettings[guildId].guildIgnores.includes('all') && !commandSettings[guildId].guildIgnores.includes('cleverbot')) {
				commandSettings[guildId].guildIgnores.push('cleverbot');
				updateCommand = true;
				return resolve(true);
			}
			removeIfEmptyArray(commandSettings[guildId], 'guildIgnores', updateCommand);
			removeIfEmpty(commandSettings, guildId, updateCommand);
			return resolve(false);
		}

		let prefix = Object.keys(commandList).find(p => command.startsWith(p));
		command = command.replace(prefix, '');

		if (command === 'all') {
			if (prefix === undefined)
				commandSettings[guildId].guildIgnores = ['all'];
			else if (commandSettings[guildId].guildIgnores.length == 0)
				commandSettings[guildId].guildIgnores.push(prefix + 'all');
			else if (!commandSettings[guildId].guildIgnores.includes(prefix + 'all')) {
				for (let i = 0; i < commandSettings[guildId].guildIgnores.length; i++) {
					if (commandSettings[guildId].guildIgnores[i][0] === prefix)
						commandSettings[guildId].guildIgnores.splice(i, 1);
				}
				commandSettings[guildId].guildIgnores.push(prefix + 'all')
			} else {
				removeIfEmptyArray(commandSettings[guildId], 'guildIgnores', updateCommand);
				removeIfEmpty(commandSettings, guildId, updateCommand);
				return resolve(false);
			}
			updateCommand = true;
			return resolve(true);

		} else if (prefix !== undefined && commandList.hasOwnProperty(prefix) && commandList[prefix].includes(command) && !commandSettings[guildId].guildIgnores.includes('all') && !commandSettings[guildId].guildIgnores.includes(prefix + 'all') && !commandSettings[guildId].guildIgnores.includes(prefix + command)) {
			commandSettings[guildId].guildIgnores.push(prefix + command);
			updateCommand = true;
			return resolve(true);
		}
		removeIfEmptyArray(commandSettings[guildId], 'guildIgnores', updateCommand);
		removeIfEmpty(commandSettings, guildId, updateCommand);
		resolve(false);
	});
}

/**
* Remove an ignore setting for a guild.
* @arg {String} guildId The guild to apply the setting change for.
* @arg {String} command The command to unignore including prefix. Use "all" as the command to unignore all.
* @returns {Promise<Boolean>} Resloves when done containg a boolean indicating if a setting was changed.
*/
function removeIgnoreForGuild(guildId, command) {
	return new Promise((resolve, reject) => {
		if (!command || !guildId)
			return reject('Invalid arguments');
		if (!commandSettingExistsFor(guildId, 'guildIgnores'))
			return resolve(false);

		if (command === 'cleverbot') {
			if (commandSettings[guildId].guildIgnores.includes('cleverbot')) {
				commandSettings[guildId].guildIgnores.splice(commandSettings[guildId].guildIgnores.indexOf('cleverbot'), 1);
				if (commandSettings[guildId].guildIgnores.length === 0) {
					delete commandSettings[guildId].guildIgnores;
					removeIfEmpty(commandSettings, guildId);
				}
				updateCommand = true;
				return resolve(true);
			}
			if (commandSettings[guildId].guildIgnores.includes('all')) {
				commandSettings[guildId].guildIgnores = [];
				for (let p in commandList) { // For all of the prefixes.
					if (commandList.hasOwnProperty(p))
						commandSettings[guildId].guildIgnores.push(p + 'all');
				}
				updateCommand = true;
				return resolve(true);
			}
			return resolve(false);
		}

		let prefix = Object.keys(commandList).find(p => command.startsWith(p));
		command = command.replace(prefix, '');

		if (command === 'all') {
			if (prefix === undefined && commandSettings[guildId].guildIgnores.length !== 0) {
				delete commandSettings[guildId].guildIgnores;
				removeIfEmpty(commandSettings, guildId, updateCommand);
			} else if (commandSettings[guildId].guildIgnores.length !== 0) {
				if (commandSettings[guildId].guildIgnores.includes('all')) {
					commandSettings[guildId].guildIgnores = [];
					for (let p in commandList) { // For all of the prefixes.
						if (p !== prefix && commandList.hasOwnProperty(p))
							commandSettings[guildId].guildIgnores.push(p + 'all');
					}
					removeIfEmptyArray(commandSettings[guildId], 'guildIgnores');
					removeIfEmpty(commandSettings, guildId);
				} else if (commandSettings[guildId].guildIgnores.includes(prefix + 'all')) {
					commandSettings[guildId].guildIgnores.splice(commandSettings[guildId].guildIgnores.indexOf(prefix + 'all'), 1);
					if (commandSettings[guildId].guildIgnores.length === 0) {
						delete commandSettings[guildId].guildIgnores;
						removeIfEmpty(commandSettings, guildId);
					}
				} else {
					for (let i = 0; i < commandSettings[guildId].guildIgnores.length; i++) {
						if (commandSettings[guildId].guildIgnores.startsWith(prefix))
							commandSettings[guildId].guildIgnores.splice(i, 1);
					}
					if (commandSettings[guildId].guildIgnores.length === 0) {
						delete commandSettings[guildId].guildIgnores;
						removeIfEmpty(commandSettings, guildId);
					}
				}
			} else
				return resolve(false);
			updateCommand = true;
			return resolve(true);

		} else if (prefix !== undefined && commandList.hasOwnProperty(prefix) && commandList[prefix].includes(command)) {
			if (commandSettings[guildId].guildIgnores.includes('all')) {
				commandSettings[guildId].guildIgnores = [];
				for (let p in commandList) { // For all of the prefixes.
					if (commandList.hasOwnProperty(p)) {
						if (p === prefix) {
							for (let c of commandList[p]) { // All of that prefix's commands.
								if (c !== command)
									commandSettings[guildId].guildIgnores.push(p + c);
							}
						} else
							commandSettings[guildId].guildIgnores.push(p + 'all');
					}
				}
			} else if (commandSettings[guildId].guildIgnores.includes(prefix + 'all')) {
				commandSettings[guildId].guildIgnores.splice(commandSettings[guildId].guildIgnores.indexOf(prefix + 'all'), 1);
				for (let c of commandList[prefix]) { // All of that prefix's commands.
					if (c !== command)
						commandSettings[guildId].guildIgnores.push(prefix + c);
				}
			} else if (commandSettings[guildId].guildIgnores.includes(prefix + command)) {
				commandSettings[guildId].guildIgnores.splice(commandSettings[guildId].guildIgnores.indexOf(prefix + command), 1);
				if (commandSettings[guildId].guildIgnores.length === 0) {
					delete commandSettings[guildId].guildIgnores;
					removeIfEmpty(commandSettings, guildId);
				}
			} else
				return resolve(false);
			updateCommand = true;
			return resolve(true);
		}
		resolve(false);
	});
}

/**
* Check if a command is ignored.
* @arg {String} prefix The command's prefix or an empty string for cleverbot.
* @arg {String} command The name of the command including prefix or "cleverbot".
* @arg {String} guildId The guild to check for.
* @arg {String} channelId The channel to check for.
* @arg {String} userId The user to check for.
* @returns {Boolean} If the command is ignored.
*/
function isCommandIgnored(prefix, command, guildId, channelId, userId) {
	if (!command || !guildId || !channelId || !userId)
		return false;
	if (!commandSettings.hasOwnProperty(guildId))
		return false;
	if (commandSettings[guildId].hasOwnProperty('guildIgnores') && (commandSettings[guildId].guildIgnores[0] === 'all' || commandSettings[guildId].guildIgnores.includes(prefix + 'all') || commandSettings[guildId].guildIgnores.includes(prefix + command)))
		return true;
	if (commandSettings[guildId].hasOwnProperty('channelIgnores') && commandSettings[guildId].channelIgnores.hasOwnProperty(channelId) && (commandSettings[guildId].channelIgnores[channelId][0] === 'all' || commandSettings[guildId].channelIgnores[channelId].includes(prefix + 'all') || commandSettings[guildId].channelIgnores[channelId].includes(prefix + command)))
		return true;
	if (commandSettings[guildId].hasOwnProperty('userIgnores') && commandSettings[guildId].userIgnores.hasOwnProperty(userId) && (commandSettings[guildId].userIgnores[userId][0] === 'all' || commandSettings[guildId].userIgnores[userId].includes(prefix + 'all') || commandSettings[guildId].userIgnores[userId].includes(prefix + command)))
		return true;
	return false;
}

/**
* Check what commands are ignored for something.
* @arg {String} guildId The guild to check in.
* @arg {String} type "guild", "channel", or "user".
* @arg {String} [id] The id for the channel or user.
* @returns {Array<String>} An array containing the ignored commands.
*/
function checkIgnoresFor(guildId, type, id) {
	if (commandSettings.hasOwnProperty(guildId)) {
		if (type === 'guild' && commandSettings[guildId].hasOwnProperty('guildIgnores'))
			return commandSettings[guildId].guildIgnores;
		else if (type === 'channel' && commandSettings[guildId].hasOwnProperty('channelIgnores') && commandSettings[guildId].channelIgnores.hasOwnProperty(id))
			return commandSettings[guildId].channelIgnores[id];
		else if (type === 'user' && commandSettings[guildId].hasOwnProperty('userIgnores') && commandSettings[guildId].userIgnores.hasOwnProperty(id))
			return commandSettings[guildId].userIgnores[id];
	}
	return [];
}

////////// MISC ///////////

/**
* Handles deleting settings for a channel when the channel is deleted.
* @arg {Eris.Channel} channel The deleted channel.
*/
function handleDeletedChannel(channel) {
	if (channel.guild !== undefined && genericSettings.hasOwnProperty(channel.guild.id)) {
		if (genericSettings[channel.guild.id].hasOwnProperty('welcome') && genericSettings[channel.guild.id].welcome.channelId === channel.id) {
			delete genericSettings[channel.guild.id].welcome;
			removeIfEmpty(genericSettings[channel.guild.id], 'welcome');
			updateGeneric = true;
		}
		if (genericSettings[channel.guild.id].hasOwnProperty('events') && genericSettings[channel.guild.id].events.channelId === channel.id) {
			delete genericSettings[channel.guild.id].events;
			removeIfEmpty(genericSettings[channel.guild.id], 'events');
			updateGeneric = true;
		}
		if (genericSettings[channel.guild.id].hasOwnProperty('nsfw') && genericSettings[channel.guild.id].nsfw.includes(channel.id)) {
			genericSettings[channel.guild.id].nsfw.splice(genericSettings[channel.guild.id].nsfw.indexOf(channel.id), 1);
			removeIfEmptyArray(genericSettings[channel.guild.id], 'nsfw');
			updateGeneric = true;
		}
		removeIfEmpty(genericSettings, channel.guild.id, updateGeneric);
	}
	if (commandSettingExistsFor(channel.guild.id, 'channelIgnores') && commandSettings[channel.guild.id].channelIgnores.hasOwnProperty(channel.id)) {
		delete commandSettings[channel.guild.id].channelIgnores[channel.id];
		removeIfEmpty(commandSettings[channel.guild.id], 'channelIgnores');
		removeIfEmpty(commandSettings, channel.guild.id);
		updateCommand = true;
	}
}

//Check if a guild has settings of a certain type
function genericSettingExistsFor(guildId, setting) {
	return genericSettings.hasOwnProperty(guildId) && genericSettings[guildId].hasOwnProperty(setting);
}

function commandSettingExistsFor(guildId, setting) {
	return commandSettings.hasOwnProperty(guildId) && commandSettings[guildId].hasOwnProperty(setting);
}

//Used to remove unneccesary keys.
function removeIfEmpty(obj, key, updater) {
	if (Object.keys(obj[key]).length === 0) {
		delete obj[key];
		if (updater !== undefined)
			updater = true;
	}
}

function removeIfEmptyArray(obj, key, updater) {
	if (obj[key].length === 0) {
		delete obj[key];
		if (updater !== undefined)
			updater = true;
	}
}

module.exports = {
	destroy,
	handleShutdown,
	setWelcome,
	getWelcome,
	handleDeletedChannel,
	eventList,
	setEventChannel,
	subEvents,
	unsubEvents,
	getEventSetting,
	getGuildsEvents,
	setNSFW,
	getNSFW,
	getAllNSFW,
	commandList,
	addIgnoreForUserOrChannel,
	removeIgnoreForUserOrChannel,
	addIgnoreForGuild,
	removeIgnoreForGuild,
	isCommandIgnored,
	checkIgnoresFor
};

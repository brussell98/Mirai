var reload = require('require-reload')(require),
	utils = reload('./utils.js'),
	genericSettings = reload('../db/genericSettings.json'),
	commandSettings = reload('../db/commandSettings.json'),
	updateGeneric = false,
	updateCommand = false;

setInterval(() => {
	if (updateGeneric === true) {
		utils.safeSave('db/genericSettings', '.json', JSON.stringify(genericSettings));
		updateGeneric = false;
	}
	if (updateCommand === true) {
		utils.safeSave('db/commandSettings', '.json', JSON.stringify(commandSettings));
		updateCommand = false;
	}
}, 20000);

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
				console.log(`${cDebug(' SETTINGS MANAGER ')} Updated welcome message for ${guildId}`);
				updateGeneric = true;
			}
		} else {
			if (message && (genericSettings[guildId].welcome.message != message || genericSettings[guildId].welcome.channelId != channelId)) {
				genericSettings[guildId].welcome.message = message; //Changing message
				genericSettings[guildId].welcome.channelId = channelId;
				console.log(`${cDebug(' SETTINGS MANAGER ')} Updated welcome message for ${guildId}`);
				updateGeneric = true;
			} else if (!message) { //disabling message that exists
				console.log(`${cDebug(' SETTINGS MANAGER ')} Disabled welcome message for ${guildId}`);
				delete genericSettings[guildId].welcome;
				updateGeneric = true;
			}
		}
		resolve();
	});
}

/**
* Get a server's welcome message settings.
* @arg {String} guild The guild to get the setings for.
* @arg {String} member The user that joined.
* @returns {?Array<String>} Containing the channelId to send to and the message, or null.
*/
function getWelcome(guild, member) {
	if (genericSettings.hasOwnProperty(guild.id) && genericSettings[guild.id].hasOwnProperty('welcome'))
		return [genericSettings[guild.id].welcome.channelId,
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
	} else if (channelId) {
		if (!genericSettings.hasOwnProperty[guildId]) {
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
		} else
			reject('Subscribed to nothing');
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
			reject('You are not subscribed to any events');
		eventArray = eventArray.map(i => i.substr(1).toLowerCase());
		let unsubbedEvents = [];
		for (let e of eventList) {
			if (eventArray.includes(e) && genericSettings[channel.guild.id].events.subbed.includes(e)) {
				genericSettings[channel.guild.id].events.subbed.splice(genericSettings[channel.guild.id].events.subbed.indexOf(e), 1);
				unsubbedEvents.push(e);
			}
		}
		updateGeneric = true;
		if (unsubbedEvents.length > 0) {
			resolve(unsubbedEvents);
		} else
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
	return (settingExistsFor(guildId, 'events') && genericSettings[guildId].events.subbed.includes(eventQ) === true) ? genericSettings[guildId].events.channelId : null;
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
			resolve('NSFW commands are no longer allowed here');
		} else
			reject('No settings changed');
	});
}

/**
* Edit the NSFW channels option for a guild.
* @arg {String} guildId The id of the guild.
* @arg {String} channelId The channel to get the setting for.
* @returns {Boolean} If NSFW is allowed in that channel.
*/
function getNSFW(guildId, channelId) {
	return settingExistsFor(guildId, 'nsfw') && genericSettings[guildId].nsfw.includes(channelId);
}

////////// COMMAND IGNORING //////////

/**
* A list of commands loaded by the bot.
* @type {Array<String>}
*/
var commandList = [];



////////// MISC ///////////

/**
* Handles deleting settings for a channel when the channel is deleted.
* @arg {Eris.Channel} channel The deleted channel.
*/
function handleDeletedChannel(channel) {
	if (channel.guild !== undefined && genericSettings.hasOwnProperty(channel.guild.id)) {
		if (genericSettings[channel.guild.id].hasOwnProperty('welcome') && genericSettings[channel.guild.id].welcome.channelId === channel.id) {
			delete genericSettings[channel.guild.id].welcome;
			updateGeneric = true;
		}
		if (genericSettings[channel.guild.id].hasOwnProperty('events') && genericSettings[channel.guild.id].events.channelId === channel.id) {
			delete genericSettings[channel.guild.id].events;
			updateGeneric = true;
		}
		if (genericSettings[channel.guild.id].hasOwnProperty('nsfw') && genericSettings[channel.guild.id].nsfw.includes(channel.id)) {
			genericSettings[channel.guild.id].nsfw.splice(genericSettings[channel.guild.id].nsfw.indexOf(channel.id), 1);
			if (genericSettings[channel.guild.id].nsfw.length === 0)
				delete genericSettings[channel.guild.id].nsfw;
			updateGeneric = true;
		}
	}
}

//Check if a guild has settings of a certain type
function settingExistsFor(guildId, setting) {
	return genericSettings.hasOwnProperty(guildId) && genericSettings[guildId].hasOwnProperty(setting);
}

module.exports = {
	setWelcome,
	getWelcome,
	handleDeletedChannel,
	setEventChannel,
	subEvents,
	unsubEvents,
	getEventSetting,
	setNSFW,
	getNSFW,
	commandList
};

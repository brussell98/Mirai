//Validates the message and updates the setting.
function updateWelcome(bot, msg, suffix, settingsManager) {
	if (suffix.toLowerCase() === 'disable') {
		settingsManager.setWelcome(msg.channel.guild.id)
			.then(() => bot.createMessage(msg.channel.id, '⚙ Welcome message disabled'));
	} else {
		let newWelcome = suffix.replace(/(<#[0-9]+>|DM)/i, '').trim();
		if (suffix === '')
			bot.createMessage(msg.channel.id, 'Please format your message in this format: `welcome <#channel | DM> <message>`');
		else if (msg.channelMentions.length === 0 && !suffix.toLowerCase().startsWith('dm'))
			bot.createMessage(msg.channel.id, 'Please specify a channel to send the welcome message to.');
		else if (!newWelcome)
			bot.createMessage(msg.channel.id, 'Please specify a welcome message.');
		else if (newWelcome.length >= 1900)
			bot.createMessage(msg.channel.id, "Sorry, your welcome message needs to be under 1,900 characters.");
		else {
			settingsManager.setWelcome(msg.channel.guild.id, msg.channelMentions[0] || "DM", newWelcome)
				.then(() => bot.createMessage(msg.channel.id, `⚙ Welcome message set to:\n${newWelcome} **in** ${'<#' + msg.channelMentions[0] + '>' || 'a DM'}`));
		}
	}
}

function handleEventsChange(bot, msg, suffix, settingsManager) {
	if (suffix.toLowerCase() === 'disable') {
		settingsManager.setEventChannel(msg.channel.guild.id);
		bot.createMessage(msg.channel.id, '⚙ Events disabled');
	} else {
		if (msg.channelMentions.length > 0) {
			settingsManager.setEventChannel(msg.channel.guild.id, msg.channelMentions[0]);
			bot.createMessage(msg.channel.id, `⚙ Events will be posted in <#${msg.channelMentions[0]}> now`);
		}
		if (/\+[^ ]/.test(suffix)) {
			settingsManager.subEvents(suffix.match(/(\+[^ ]+)/g), msg.channel)
				.then(events => { bot.createMessage(msg.channel.id, `Subscried to: \`${events.join('` `')}\``); })
				.catch(e => { bot.createMessage(msg.channel.id, e); });
		} if (/\-[^ ]/.test(suffix)) {
			settingsManager.unsubEvents(suffix.match(/(-[^ ]+)/g), msg.channel)
				.then(events => { bot.createMessage(msg.channel.id, `Unsubscried from: \`${events.join('` `')}\``); })
				.catch(e => { bot.createMessage(msg.channel.id, e); });
		}
	}
}

function updateNSFWSetting(bot, msg, suffix, settingsManager) {
	if (!suffix)
		bot.createMessage(msg.channel.id, 'You need to specifiy wether to `allow` or `deny` NSFW here');
	else {
		settingsManager.setNSFW(msg.channel.guild.id, msg.channel.id, suffix)
	}
}

module.exports = {
	desc: "Adjust a server's settings.",
	help: "Modify how the bot works on a server.\n\t__welcome__: Set the channel and message to be displayed to new members `welcome #general Welcome ${USER} to ${SERVER}`.\n\t__events__: Modify event subscriptions `events #event-log +memberjoined +userbanned -namechanged`.",
	usage: "Usage at <http://brussell98.github.io/bot/serversettings.html>",
	aliases: ['set', 'config'],
	cooldown: 3,
	task(bot, msg, suffix, config, settingsManager) {
		if (msg.channel.guild === null)
			bot.createMessage(msg.channel.id, 'You have to do this in a server.');
		else if (!msg.channel.permissionsOf(msg.author.id).json.manageServer && !config.adminIds.includes(msg.author.id))
			bot.createMessage(msg.channel.id, 'You need the `Manage Server` permission to use this.');
		else if (!suffix)
			return 'wrong usage';
		else if (suffix.startsWith('welcome'))
			updateWelcome(bot, msg, suffix.substr(7).trim(), settingsManager);
		else if (suffix.startsWith('events'))
			handleEventsChange(bot, msg, suffix.substr(6).trim(), settingsManager);
		else if (suffix.toLowerCase().startsWith('nsfw'))
			updateNSFWSetting(bot, msg, suffix.substr(5).trim().toLowerCase(), settingsManager);
	}
};

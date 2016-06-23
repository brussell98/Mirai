var libVersion = require('../../node_modules/eris/package.json').version,
	botVersion = require('../../package.json').version;

module.exports = {
	desc: "Tells you about the bot.",
	cooldown: 5,
	task(bot, msg) {
		bot.createMessage(msg.channel.id, `\`\`\`tex
$ Bot-chan $

# CREATOR: {Brussell}
# LIBRARY: {Eris} {v${libVersion}}
# VERSION: {${botVersion}}

% Bot-chan is a multipurpose bot to handle most of your needs.
% If you have any feedback or suggestions head over to my server
% For a list of commands do ]help or }help

# WEBSITE: {http://brussell98.github.io/bot/index.html}
# SERVER: { discord.gg/0kvLlwb7slG3XCCQ }
\`\`\``);
	}
};

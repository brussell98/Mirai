const libVersion = require('../../node_modules/eris/package.json').version,
	botVersion = require('../../package.json').version;

module.exports = {
	desc: "Tells you about the bot.",
	cooldown: 5,
	aliases: ['info'],
	task(bot, msg) {
		bot.createMessage(msg.channel.id, `\`\`\`md
# Mirai

[ CREATOR ](Brussell)
[ LIBRARY ](Eris v${libVersion})
[ VERSION ](${botVersion})

Mirai is a multipurpose bot to handle most of your needs.
If you have any feedback or suggestions head over to my server
For a list of commands do ]help or }help

[ WEBSITE ](http://miraibot.ml)
[ SERVER  ]( discord.gg/rkWPSdu )
[ PATREON ](http://patreon.com/brussell98)\`\`\``);
	}
};

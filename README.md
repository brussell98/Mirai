![Mirai Bot](http://i.imgur.com/UHJ7Nig.png)   

An easy to use bot framework using the [Eris](https://github.com/abalabahaha/eris/) library. NodeJS version 6+ is ***REQUIRED***

#### [Website](http://brussell98.github.io/bot/index.html) | [Support on Patreon](http://patreon.com/brussell98) | [Documentation](http://brussell98.github.io/bot/docs/index.html) | [Discord Server](https://discord.gg/rkWPSdu) | [Wiki](https://github.com/brussell98/BrussellBot/wiki) | [Eris Docs](https://abal.moe/Eris/docs/index.html) | [Todo List](https://trello.com/b/Uw5wZLzJ)   

---

## Example of a command
```js
// Mirai\commands\examples\example.js
// Only 'task' is required. Everything else is optional.

module.exports = {
	desc: "A short description",
	help: "A longer description of what the command does and how to use it.",
	usage: "<hello> [world]",
	aliases: ['ex', 'e'], // Aliases 'ex' and 'e'
	cooldown: 5, // 5 seconds
	hidden: true, // Hidden from help command
	ownerOnly: true, // Only a user in config.adminIds can use this
	guildOnly: true, // This can't be used in a DM
	requiredPermission: 'manageMessages', // You need manageMessages to us this
	task(bot, msg, suffix, config, settingsManager) { // Avaliable args
		if (suffix.startsWith('hello'))
			return bot.createMessage(msg.channel.id, suffix);
		return 'wrong usage'; // Send the correct usage to the user
	}
}
```

## Example of an event
```js
// Mirai\events\guildCreate.js

module.exports = function(bot, settingsManager, config, guild) {
	if (config.logNewGuilds)
		console.log(`New Guild: ${guild.name}`);
}
```

---

Disclaimer: There is no guarantee that this will continue to be maintained. I may decide one day to discontinue this.

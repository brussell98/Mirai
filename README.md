![Mirai Bot](http://i.imgur.com/BO18mRW.png)   
[![David](https://img.shields.io/david/brussell98/Mirai.svg?maxAge=2592000)](https://david-dm.org/brussell98/Mirai) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/brussell98/Mirai/master/LICENSE) [![Code Climate](https://codeclimate.com/github/brussell98/Mirai/badges/gpa.svg)](https://codeclimate.com/github/brussell98/Mirai)

An easy to use bot framework using the [Eris](https://github.com/abalabahaha/eris/) library. NodeJS version 6+ is ***REQUIRED***

#### [Website](http://miraibot.ml) | [Support on Patreon](http://patreon.com/brussell98) | [Documentation](http://brussell98.tk/bot/docs/index.html) | [Discord Server](https://discord.gg/rkWPSdu) | [Eris Docs](https://abal.moe/Eris/docs/index.html) | [Todo List](https://trello.com/b/Uw5wZLzJ)   

## Installing:
1. Install `NodeJS` `Git` and `Python2.7` (and add them to your PATH).
2. Download Mirai Bot and configure it using the reference below.
3. Run `npm i --no-optional --production` and then, optionally, `npm i eventemitter3 bluebird --no-optional --production`.
4. Make any modifications.
5. Add your bot using `https://discordapp.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot`.
6. Run the bot with `node Mirai.js`

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
	requiredPermission: 'manageMessages', // You need manageMessages to use this
	task(bot, msg, suffix, config, settingsManager) { // Available args
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

## Config Reference
- **token:** The Bot's token.
- **shardCount:** The number of shards to run.
- **disableEvents:** An object containing events to disable. This saves resources. A full list of events can be found here: [Eris Reference](https://abal.moe/Eris/reference.html).
- **commandSets:** An object defining what commands to load. The key is the prefix, `dir` is the path to the from the root of the bot. If you want to make the commands a certain color in the console add a `color` property with a valid [chalk color](https://github.com/chalk/chalk#colors).
- **reloadCommand:** The command to use for reloading modules/commands.
- **evalCommand:** The command to use for running arbitrary code.
- **adminIds:** An array of user ids that have full control over the bot.
- **logTimestamp:** If the console should include timestamps.
- **cleverbot:** If cleverbot should be enabled.
- **inviteLink:** A link to add the bot to a server.
- **errorMessage:** An optional error message to post in chat.
- **carbonKey:** Your key for updating carbon information.
- **abalBotsKey:** Your https://bots.discord.pw/ API key.
- **cycleGames:** Randomly changes the bot's status.
- **bannedGuildIds:** Servers that can not add the bot.
- **whitelistedGuildIds:** For future use.

---

## Naming commands and invalid prefixes
Command names must not contain a `space` or a `|`. Prefixes must not contain a `|`. Avoid using a `@` as it may resolve into a user.

---

Disclaimer: There is no guarantee that this will continue to be maintained. I may decide one day to discontinue this.

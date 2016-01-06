# BrussellBot

An multipurpose bot for Discord using the [Discord.js](https://github.com/hydrabolt/discord.js/) unoffficial API.

[Get the lastest version here](https://github.com/brussell98/BrussellBot/releases/latest)

[Wiki](https://github.com/brussell98/BrussellBot/wiki)

[Setup Guide](https://github.com/brussell98/BrussellBot/wiki/Setup-Guide)

[Making new commands](https://github.com/brussell98/BrussellBot/wiki/New-Command-Guide)

[Discord.js Documentation](http://discordjs.readthedocs.org/en/latest/)

---

This is the branch that my bot runs on

---

### TODO

- [x] Stop relying on permission levels and use server roles - PRIORITY
- [x] Phase out Per-server settings JSON - PRIORITY
- [x] Option to delete command message
- [ ] Semi-idiot-proof the code
	- [ ] And add comments so people can understand what this stuff does
- [ ] Commands
	- [x] Join server
		- [x] Silent join by default
		- [ ] Accept multiple invites seperated by a space
	- [x] Leave Server
		- [x] Leave server restricted by roles or perm level
	- [x] Help
		- [x] List mod commands
	- [x] About
	- [x] Stats
		- [x] List servers or channels
		- [x] List ammount of channels and members each server has
		- [x] Commands process
	- [ ] Music commands (Planned for v2.0) - PRIORITY
		- [ ] Audio help
		- [ ] Queue song from youtube
		- [ ] Skip
		- [ ] Have pre-made playlists avalible
		- [ ] Queue a playlist
		- [ ] Bind music messages to a channel
		- [ ] List of queues songs
		- [ ] Set playing to song name
		- [ ] Bot owner gets priority
	- [x] Cleverbot module activated with mention
	- [x] Set playing status
	- [x] Info commands
		- [x] Server info
		- [x] User info
			- [x] Get joinedAt from detailsOfUser
	- [x] Ask if anyone wants to play a game
	- [x] Announce to servers (for bot owner)
	- [x] Dice roll
	- [x] Coin flip
	- [x] 8ball
		- [x] Store respones locally
	- [ ] Rock paper scissors
	- [x] Choose for me
	- [x] Clean bot messages
	- [ ] Prune chat
	- [ ] Store a message or link with a tag (non-heroku branch)
	- [x] Vote (Credit: [BlackHayate](https://github.com/BlackHayate))
	- [x] Anime/Manga Lookup
		- [ ] More regex replaces
	- [ ] Avatar
	- [ ] Stop user from sending messages for a certain time
	- [ ] osu!
		- [x] Sig generator (https://lemmmy.pw/osusig/sig.php?colour=hex36b8f9&uname=brussell98&pp=2&flagshadow&xpbar&xpbarhex&darktriangles)
- [x] Logging (w/ Winston because I really liked DougleyBot's log)
	- [x] Event logs
	- [x] Presence changes
	- [x] Commands processed
- [ ] Use regex to verify commands
- [x] Version checker
- [ ] Optimize code
- [x] Reload modules command
- [ ] Could do stuff with checking how long a user has been on the server for perms

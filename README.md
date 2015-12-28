# BrussellBot

A ping-pong and music bot for Discord using the [Discord.js](https://github.com/hydrabolt/discord.js/) unoffficial API.

[Wiki](https://github.com/brussell98/BrussellBot/wiki)

[Setup Guide](https://github.com/brussell98/BrussellBot/wiki/Setup-Guide)

[Making new commands](https://github.com/brussell98/BrussellBot/wiki/New-Command-Guide)

[Discord.js Documentation](http://discordjs.readthedocs.org/en/latest/)

---

### Features
*Coming soon!*

---

### Requirements
- Python 2.7.x (added to path)
- Node (added to path)
- Visual Studio (**with C++ compiler**)
- ffmpeg (added to path)

---

### Installation (Windows)
1. Download BrussellBot and put it in a folder.
2. Open a command promt in the folder (shift+right click in the folder).
3. Run `npm install`.
4. Setup `config.json`.
5. Add user ids to `permissions.json`. By default all users are `0`. Mods should have `1`. You should have `2`.

---

### TODO

- [x] Test current version
- [ ] Cooldown for commands
- [x] Per-server settings JSON
	- [x] Add new servers to JSON on join / startup
	- [ ] Server settings commands
- [x] Wiki page for adding commands
- [ ] Add more dank memes to `games.json`
- [ ] Semi-idiot-proof the code
	- [ ] And add comments so people can understand what this stuff does
- [x] Fully check if user has permission to execute a command in the message interpreter
- [x] Debug messages toggle
- [ ] Commands
	- [x] Join server
		- [x] Have option for silent joining of servers
		- [ ] Accept multiple invites seperated by a space
	- [x] Leave Server
		- [x] Leave server restricted by roles or perm level
	- [x] Help
	- [x] About
	- [x] Stats
		- [x] List servers or channels
		- [x] Option to only show certain stats
	- [ ] Music commands (Planned for v2.0)
		- [ ] Queue song from youtube
		- [ ] Skip
		- [ ] Remove from playlist
		- [ ] Queue from a playlist
		- [ ] Bind music messages to a channel
		- [ ] List of queues songs
	- [ ] Cleverbot module activated with mention
	- [x] Set playing status
	- [x] Info commands
		- [x] Server info
		- [x] User info
			- [ ] Get past usernames from log
			- [x] Get joinedAt from detailsOfUser
	- [x] Ask if anyone wants to play a game
	- [x] Announce
		- [x] To users in the server
		- [x] To servers
	- [x] Dice roll
	- [x] 8ball
	- [x] Choose for me
	- [x] Clean bot messages
	- [ ] Fancy quote a message
	- [x] Vote (Credit: [BlackHayate](https://github.com/BlackHayate))
- [ ] Logging (w/ Winston because I really liked DougleyBot's log)
	- [ ] Event logs
	- [ ] Chat logs
	- [ ] Console output log
	- [ ] Presence changes
	- [ ] Commands processed
- [ ] Fix `info`'s playing game reporting
- [ ] Version checker
- [ ] Optimize code

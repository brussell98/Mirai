# BrussellBot

A ping-pong and music bot for Discord using the [Discord.js](https://github.com/hydrabolt/discord.js/) unoffficial API.

---

### Features
*Write text here when the bot works and has features*

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

- [ ] Test current version
- [ ] Timeout for commands
- [ ] Option to disable non-essential event listeners
- [ ] Wiki page for adding commands
- [ ] Add more dank memes to `games.json`
- [ ] Semi-idiot-proof the code
- [ ] Fully check if user has permission to execute a command in the message interpreter
- [ ] Commands
	- [x] Join server
		- [ ] Have option for silent joining of servers
	- [x] Leave Server
		- [x] Leave server restricted by roles or perm level
	- [x] Help
	- [x] About
	- [x] Stats
		- [x] List servers or channels
		- [x] Option to only show certain stats
	- [ ] Music commands
		- [ ] Queue song from youtube
		- [ ] Skip
		- [ ] Remove from playlist
		- [ ] Queue from a playlist
		- [ ] Bind music messages to a channel
		- [ ] List of queues songs
	- [ ] Cleverbot command
	- [x] Set playing status
	- [ ] Info commands
		- [ ] Server info
		- [ ] User info
	- [ ] Ask if anyone wants to play a game
	- [ ] Announce
		- [ ] To users
		- [ ] To servers
	- [ ] Dice roll
	- [ ] 8ball
	- [ ] Choose for me
	- [x] Clean bot messages
	- [ ] Fancy quote a message

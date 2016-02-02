# BrussellBot 1.3

A multipurpose bot for Discord using [Discord.js](https://github.com/hydrabolt/discord.js/)

[Website](http://brussell98.github.io/BrussellBot)   
[Discord Server](https://discord.gg/0kvLlwb7slG3XCCQ)   
[Get the latest version here](https://github.com/brussell98/BrussellBot/releases/latest)

[Wiki](https://github.com/brussell98/BrussellBot/wiki)   
[Commands](https://github.com/brussell98/BrussellBot/wiki/Commands)   
[Setup Guide](https://github.com/brussell98/BrussellBot/wiki/Setup-Guide)   
[Making new commands](https://github.com/brussell98/BrussellBot/wiki/New-Command-Guide)   
[Discord.js Documentation](http://discordjs.readthedocs.org/en/latest/)

---

### TO DO

- [ ] Music commands
	- [ ] Audio help
	- [ ] Queue song from YouTube
		- [ ] Or pass it a webm link
	- [ ] Skip
	- [ ] Have pre-made playlists available
	- [ ] Queue a playlist
	- [ ] Bind music messages to a channel and show what is playing. Plus delete old messages.
	- [ ] List of queues songs
	- [ ] Set playing to song name
	- [ ] Bot owner gets priority
- [x] Implement `message.cleanContent`
- [x] Implement `cache.random()`
- [x] Implement `server.leave()`
- [ ] Implement `bot.getInvite()` and "invited through invite.inviter's invite"   
~~Drop `request` in `osu sig` in favor of using the URL in `sendFile`~~
- [x] COMMAND ALIASES AWWWWW YEEEAAAHHHHHHH
	- [x] Replace the alias so it doesn't break hardcoded substrings
- [ ] Re-write `_announce`
- [x] Make things case-insensitive in avatar and info and ratewaifu
	- [ ] If a name isn't found use `.indexOf()`
	- [ ] Use the new RegExp in `.get` feature

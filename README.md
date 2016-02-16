# BrussellBot 1.4-beta

## Want to download this and run it? Get the latest release or download the public branch, not master.

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

### Music Update?

- [ ] CAUSE I FEEL audio test

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

----

- [x] Catch space between `]` and command
- [x] Add 👍 (:thumbsup:) confirmation messages
- [x] Work after the new API update
- [x] `]beep` boop
- [x] Re-word `]ratewaifu`
- [x] Ban with message
- [x] Kick with message
- [x] Use `before` in prune
- [x] Mod mute command and unmute

### Per-Server Settings

- [ ] Ignore channel
	- [ ] Remove ignored channels on `channelDeleted` event
- [x] Admin SQL command
- [x] Format local copy so it's easy to use
- [x] Function for fetching DB
- [x] Function for updating DB
- [x] Work when DB is down
	- [x] Try to re-fetch it if fail after x minutes
- [x] No problems with adding a new column leaving undefined entries
- [x] `}leave` will remove the server entry
	- [x] Make user aware they need to do this on init form
- [ ] Admin command to clean up leftovers
- [x] Complete the `}settings` command
	- [x] Info about it and init generator on website
	- [x] Don't let users inject SQL with the welcome message
	- [x] Check current settings
	- [ ] Command for admin to check a server's settings by name or id
	- [ ] Add fail callback
- [x] Event listeners switched to using the DB settings

var cases = [
	"pong",
	"*I-It's not like I wanted to say pong or anything...*",
	"pong!",
	"No",
	"...",
	"ping"
];

module.exports = {
	desc: "Responds with pong.",
	help: "Used to check if the bot is working.\nReplies with 'pong' and the time taken.",
	aliases: ['p'],
	cooldown: 2,
	task(bot, msg) {
		let choice = ~~(Math.random() * cases.length);
		bot.sendMessage(msg, cases[choice], (error, sentMsg) => {
			bot.updateMessage(sentMsg, `${cases[choice]}    |    Round-trip delay: ${sentMsg.timestamp - msg.timestamp}ms`);
		});
	}
};

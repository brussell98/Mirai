module.exports = {
	desc: "Makes a choice for you.",
	usage: "<choice> | <choice> [| choice...]",
	aliases: ['c', 'pick', 'decide'],
	cooldown: 2,
	task(bot, msg, suffix) {
		if (!suffix)
			return 'wrong usage';
		let choices = suffix.split(/ ?\| ?/);
		if (choices.length < 2 && suffix.includes(',')) choices = suffix.split(/, ?/);
		choices = choices.filter(c => c !== '');
		if (choices.length < 2) return 'wrong usage';
		let pick = ~~(Math.random() * choices.length);
		choices.forEach((c, i) => {
			if (c.includes('homework') || c.includes('sleep') || c.includes('study') || c.includes('productiv')) {
				if (Math.random() > 0.4) pick = i; //Higher chance to pick choices containing key words
			}
		});
		bot.sendMessage(msg, `I chose **${choices[pick]}**`);
	}
};

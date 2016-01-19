var winston = require('winston');

winston.emitErrs = false;

exports.Logger = new winston.Logger({
	colors: {
		verbose: 'yellow',
		debug: 'green',
		info: 'cyan',
		warn: 'orange',
		error: 'red'
	},
	transports: [
		new winston.transports.File({
			humanReadableUnhandledException: true,
			handleExceptions: true,
			name: 'file:exceptions',
			filename: __dirname + '/../logs/exceptions.txt',
			level: 'exception',
			colorize: false,
			json: false
		}),
		new winston.transports.File({
    		handleExceptions: false,
    		name: 'file:error',
    		filename: __dirname + '/../logs/errors.txt',
    		level: 'error',
			colorize: false,
    		json: false
		}),
		new winston.transports.File({
    		handleExceptions: false,
    		name: 'file:warn',
    		filename: __dirname + '/../logs/warnings.txt',
    		level: 'warn',
			colorize: false,
    		json: false
		}),
		new winston.transports.File({
    		handleExceptions: false,
    		name: 'file:debug',
    		filename: __dirname + '/../logs/debug.txt',
    		level: 'debug',
			colorize: false,
    		json: false
		}),
		new winston.transports.Console({
			handleExceptions: true,
			level: 'verbose',
			colorize: false,
			json: false
		})
	],
	exitOnError: false
});

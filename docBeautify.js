var beautify_html = require('js-beautify').html,
	fs = require('fs');

fs.readdir(__dirname + '/docs/', (error, files) => {
	if (error)
		throw error;
	files.filter(f => f.endsWith('.html')).map((filename, i) => {
		fs.readFile(__dirname + '/docs/' + filename, 'utf8', (err, data) => {
			if (err)
				throw err;
			fs.writeFile(__dirname + '/docs/' + filename, beautify_html(data, {
				brace_style: 'collapse',
				indent_with_tabs: true,
				preserve_newlines: false,
				end_with_newline: true
			}), e => {
				if (e)
					throw e;
				if (i === files.length - 1) {
					console.log('HTML files beautified');
					process.exit(0);
				}
			});
		});
	});
});

const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('test-invoice.pdf');
pdf(dataBuffer).then(function(data) {
    console.log("PDF TEXT OUTPUT:\n");
    console.log(data.text);
});

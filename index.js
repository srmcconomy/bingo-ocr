var tesseract = require('node-tesseract')

tesseract.process(__dirname + "/test.png", (err, text) => {
  console.log(err);
  console.log(text);
})

const { Jimp } = require('jimp');

async function createDarkLogo() {
  const image = await Jimp.read('public/images/logo.png');
  
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const red = this.bitmap.data[idx + 0];
    const green = this.bitmap.data[idx + 1];
    const blue = this.bitmap.data[idx + 2];
    const alpha = this.bitmap.data[idx + 3];

    if (alpha > 50 && red < 80 && green < 80 && blue < 80) {
      this.bitmap.data[idx + 0] = 255;
      this.bitmap.data[idx + 1] = 255;
      this.bitmap.data[idx + 2] = 255;
    }
  });

  await image.write('public/images/logo_dark.png');
  console.log('logo_dark.png created successfully!');
}

createDarkLogo().catch(console.error);

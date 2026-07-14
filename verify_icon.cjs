const { loadImage, createCanvas } = require("@napi-rs/canvas");

async function check() {
    const img = await loadImage("C:\\FodaOS\\cauchy-gui\\src-tauri\\icons\\source_icon.png");
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    let white = 0;
    let blueish = 0;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 230 && g > 230 && b > 230) white++;
        if (b > 100 && b > r && b > g) blueish++;
    }
    const total = img.width * img.height;
    console.log("Image:", img.width, "x", img.height);
    console.log("White pixels (Psi symbol):", white, "(" + (white / total * 100).toFixed(1) + "%)");
    console.log("Blue/Indigo pixels (background):", blueish, "(" + (blueish / total * 100).toFixed(1) + "%)");
    console.log(white > 1000 ? "PASS: Psi symbol rendered" : "FAIL: No Psi symbol found");
}
check();

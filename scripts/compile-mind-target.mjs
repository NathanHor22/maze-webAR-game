import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import 'mind-ar/src/image-target/detector/kernels/cpu/index.js';
import { CompilerBase } from 'mind-ar/src/image-target/compiler-base.js';
import { buildTrackingImageList } from 'mind-ar/src/image-target/image-list.js';
import { extractTrackingFeatures } from 'mind-ar/src/image-target/tracker/extract-utils.js';

class NodeTargetCompiler extends CompilerBase {
  createProcessCanvas(image) {
    return {
      getContext: () => ({
        drawImage: () => undefined,
        getImageData: () => ({ data: image.data }),
      }),
    };
  }

  async compileTrack({ progressCallback, targetImages, basePercent }) {
    const compiled = [];
    const percentPerImage = 100 / targetImages.length;
    let percent = 0;

    for (const targetImage of targetImages) {
      const imageList = buildTrackingImageList(targetImage);
      const percentPerAction = percentPerImage / imageList.length;
      const trackingData = extractTrackingFeatures(imageList, () => {
        percent += percentPerAction;
        progressCallback(basePercent + (percent * basePercent) / 100);
      });
      compiled.push(trackingData);
    }

    return compiled;
  }
}

const [, , inputArg = 'public/assets/targets/mind-the-gap-target.png', outputArg = 'public/assets/targets/mind-the-gap-target.mind'] = process.argv;
const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);
const image = PNG.sync.read(await readFile(inputPath));
const compiler = new NodeTargetCompiler();
let lastReported = -10;

await compiler.compileImageTargets([image], (progress) => {
  const rounded = Math.min(100, Math.floor(progress / 10) * 10);
  if (rounded > lastReported) {
    lastReported = rounded;
    console.log(`Compiling target: ${rounded}%`);
  }
});

const data = compiler.exportData();
await writeFile(outputPath, data);
console.log(`Wrote ${data.byteLength.toLocaleString()} bytes to ${outputPath}`);

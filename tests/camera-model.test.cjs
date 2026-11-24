const assert = require("node:assert/strict");
const { test } = require("node:test");
const model = require("../camera-lab/camera-model.js");

const methods = ["bilinear", "malvar"];

test("both methods preserve all measured samples and keep reconstructed values in range", () => {
  const samples = model.capture(model.createScene(20, 4));
  for (const method of methods) {
    const reconstructed = model.reconstruct(samples, method);
    assert.ok(reconstructed.every(value => value >= 0 && value <= 1));
    for (let y = 0; y < model.size; y += 1) {
      for (let x = 0; x < model.size; x += 1) {
        const pixel = y * model.size + x;
        assert.equal(reconstructed[pixel * 3 + model.channelAt(x, y)], samples[pixel]);
      }
    }
  }
});

test("a uniform gray input stays gray under each method", () => {
  const samples = model.capture(() => 0.375);
  for (const method of methods) {
    const reconstructed = model.reconstruct(samples, method);
    assert.ok(reconstructed.every(value => Math.abs(value - 0.375) < 1e-12));
    assert.deepEqual(model.imageMetrics(reconstructed, samples), { falseColor: 0, brightnessError: 0 });
  }
});

test("rotating the opening pattern can remove the purple artifact", () => {
  function strongestPurpleAt(angle) {
    const samples = model.capture(model.createScene(angle, model.initialPeriod));
    return model.findPurplePixel(model.reconstruct(samples)).score;
  }
  assert.ok(strongestPurpleAt(model.initialAngle) > 0.8);
  assert.ok(strongestPurpleAt(0) < 0.01);
});

test("removing purple at the test angle can leave other false colors", () => {
  const samples = model.capture(model.createScene(0, model.initialPeriod));
  const photo = model.reconstruct(samples);
  assert.ok(model.findPurplePixel(photo).score < 0.01);
  assert.ok(model.imageMetrics(photo, samples).falseColor > 0.1);
});

test("the correction helps the wider stripes and has little effect at the opening setting", () => {
  function errorDifference(angle, period) {
    const samples = model.capture(model.createScene(angle, period));
    const [baseline, correction] = methods.map(method => model.imageMetrics(model.reconstruct(samples, method), samples));
    return baseline.falseColor - correction.falseColor;
  }
  assert.ok(errorDifference(20, 4) > 0.2);
  assert.ok(Math.abs(errorDifference(model.initialAngle, model.initialPeriod)) < 0.01);
});

test("the gray mesh has a second thread direction and produces a different capture from stripes", () => {
  const mesh = model.createScene(0, 4, "mesh");
  const stripes = model.createScene(0, 4);

  assert.equal(stripes(31, 31), stripes(31, 32));
  assert.notEqual(mesh(31, 31), mesh(31, 32));
  assert.notDeepEqual(model.capture(mesh), model.capture(stripes));
});

test("retaking the mesh photo from another angle or distance changes computed false color", () => {
  function meshFalseColor(angle, period) {
    const samples = model.capture(model.createScene(angle, period, "mesh"));
    return model.imageMetrics(model.reconstruct(samples), samples).falseColor;
  }

  const firstPhoto = meshFalseColor(43, 1.42);
  assert.ok(firstPhoto > 0.1);
  assert.ok(Math.abs(firstPhoto - meshFalseColor(12, 1.42)) > 0.02);
  assert.ok(Math.abs(firstPhoto - meshFalseColor(43, 3.6)) > 0.02);
});

test("building a pixel begins with only the measured channel and adds each estimate separately", () => {
  const photoPixel = [0.95, 0.09, 0.94];
  assert.deepEqual(model.buildPixel(photoPixel, 1, []), [null, 0.09, null]);
  assert.deepEqual(model.buildPixel(photoPixel, 1, [0]), [0.95, 0.09, null]);
  assert.deepEqual(model.buildPixel(photoPixel, 1, [2]), [null, 0.09, 0.94]);
  assert.deepEqual(model.buildPixel(photoPixel, 1, [2, 0]), photoPixel);
});

test("the measured channel in the exercise depends on the chosen photosite", () => {
  const samples = model.capture(model.createScene(model.initialAngle, model.initialPeriod));
  const photoPixel = model.reconstruct(samples).subarray(0, 3);
  assert.deepEqual(model.buildPixel(photoPixel, model.channelAt(0, 0), []), [samples[0], null, null]);
});

"use strict";

const cameraModel = (() => {
  const size = 64;
  const initialAngle = 43;
  const initialPeriod = 1.42;
  const channels = ["Red", "Green", "Blue"];

  // Malvar–He–Cutler Figure 2. Divide every coefficient by eight.
  const greenAtRedOrBlue = [
    [0, 0, -1, 0, 0], [0, 0, 2, 0, 0], [-1, 2, 4, 2, -1], [0, 0, 2, 0, 0], [0, 0, -1, 0, 0],
  ];
  const redOrBlueAtGreenHorizontal = [
    [0, 0, 0.5, 0, 0], [0, -1, 0, -1, 0], [-1, 4, 5, 4, -1], [0, -1, 0, -1, 0], [0, 0, 0.5, 0, 0],
  ];
  const oppositeColor = [
    [0, 0, -1.5, 0, 0], [0, 2, 0, 2, 0], [-1.5, 0, 6, 0, -1.5], [0, 2, 0, 2, 0], [0, 0, -1.5, 0, 0],
  ];

  function channelAt(x, y) {
    return (x % 2) + (y % 2);
  }

  function createScene(angle, period, texture = "fabric") {
    const radians = angle * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const center = size / 2;

    if (texture === "mesh") {
      return (x, y) => {
        const across = (x - center) * cosine + (y - center) * sine;
        const along = (y - center) * cosine - (x - center) * sine;
        // Two perpendicular thread families make a gray screen with dark openings.
        const warp = 0.5 + 0.5 * Math.cos(2 * Math.PI * across / period);
        const weft = 0.5 + 0.5 * Math.cos(2 * Math.PI * along / period);
        return 0.09 + 0.86 * Math.max(warp, weft) ** 2;
      };
    }

    // The scene is grayscale, so all three color channels have the same value.
    return (x, y) => {
      const distance = (x - center) * cosine + (y - center) * sine;
      return 0.52 + 0.43 * Math.cos(2 * Math.PI * distance / period);
    };
  }

  function capture(scene) {
    const samples = new Float64Array(size * size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        samples[y * size + x] = scene(x + 0.5, y + 0.5);
      }
    }
    return samples;
  }

  function contributions(x, y, channel) {
    if (channelAt(x, y) === channel) return [{ x, y, weight: 1 }];

    const neighbors = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        if (channelAt(nx, ny) !== channel) continue;
        neighbors.push({ x: nx, y: ny, weight: dx === 0 || dy === 0 ? 2 : 1 });
      }
    }
    return neighbors;
  }

  function reconstructChannel(samples, x, y, channel) {
    let weightedSum = 0;
    let weightSum = 0;
    for (const sample of contributions(x, y, channel)) {
      weightedSum += samples[sample.y * size + sample.x] * sample.weight;
      weightSum += sample.weight;
    }
    return weightedSum / weightSum;
  }

  function correctedChannel(samples, x, y, channel) {
    const measured = channelAt(x, y);
    if (measured === channel) return samples[y * size + x];
    if (x < 2 || y < 2 || x >= size - 2 || y >= size - 2) {
      return reconstructChannel(samples, x, y, channel);
    }

    let kernel = oppositeColor;
    let transpose = false;
    if (channel === 1) kernel = greenAtRedOrBlue;
    if (measured === 1) {
      kernel = redOrBlueAtGreenHorizontal;
      transpose = channelAt(x + 1, y) !== channel;
    }

    let sum = 0;
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        const weight = transpose ? kernel[column][row] : kernel[row][column];
        sum += weight * samples[(y + row - 2) * size + x + column - 2];
      }
    }
    return Math.max(0, Math.min(1, sum / 8));
  }

  function reconstruct(samples, method = "bilinear") {
    const image = new Float64Array(3 * size * size);
    const estimate = method === "malvar" ? correctedChannel : reconstructChannel;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        for (let channel = 0; channel < channels.length; channel += 1) {
          image[3 * (y * size + x) + channel] = estimate(samples, x, y, channel);
        }
      }
    }
    return image;
  }

  function imageMetrics(image, grayReference) {
    let totalColor = 0;
    let totalSquaredError = 0;
    // Skip the two-pixel perimeter, where the correction falls back to bilinear.
    for (let y = 2; y < size - 2; y += 1) {
      for (let x = 2; x < size - 2; x += 1) {
        const pixel = y * size + x;
        const red = image[3 * pixel];
        const green = image[3 * pixel + 1];
        const blue = image[3 * pixel + 2];
        totalColor += Math.max(red, green, blue) - Math.min(red, green, blue);
        totalSquaredError += ((red + green + blue) / 3 - grayReference[pixel]) ** 2;
      }
    }
    const count = (size - 4) ** 2;
    return { falseColor: totalColor / count, brightnessError: Math.sqrt(totalSquaredError / count) };
  }

  function findPurplePixel(image) {
    let strongest = { x: 0, y: 0, score: -Infinity };
    const inset = Math.floor(size / 4);
    for (let y = inset; y < size - inset; y += 1) {
      for (let x = inset; x < size - inset; x += 1) {
        const offset = 3 * (y * size + x);
        const score = Math.min(image[offset], image[offset + 2]) - image[offset + 1];
        if (score > strongest.score) strongest = { x, y, score };
      }
    }
    return strongest;
  }

  function buildPixel(photoPixel, measured, addedChannels) {
    return Array.from(photoPixel, (value, channel) => (
      channel === measured || addedChannels.includes(channel) ? value : null
    ));
  }

  return { size, channels, initialAngle, initialPeriod, channelAt, createScene, capture,
    contributions, reconstructChannel, reconstruct, findPurplePixel, imageMetrics, buildPixel };
})();

if (typeof module !== "undefined") module.exports = cameraModel;

"use strict";

const { size, channels, initialAngle, initialPeriod, channelAt, createScene, capture,
  contributions, reconstruct, findPurplePixel, imageMetrics, buildPixel } = cameraModel;

const viewfinder = document.querySelector("#viewfinder");
const openingGuess = document.querySelector("#opening-guess");
const openingShot = document.querySelector("#opening-shot");
const openingRetake = document.querySelector("#opening-retake");
const viewfinderCanvas = document.querySelector("#live-viewfinder");
const viewfinderState = document.querySelector("#viewfinder-state");
const viewfinderAngle = document.querySelector("#viewfinder-angle");
const viewfinderCross = document.querySelector("#viewfinder-cross");
const viewfinderCompare = document.querySelector("#viewfinder-compare");
const shotDivider = document.querySelector("#shot-divider");
const comparisonEndpoints = viewfinderCompare.querySelectorAll("[data-comparison-endpoint]");
const routeStages = Array.from(document.querySelectorAll(".route li"));
const fabricLab = document.querySelector("#fabric-lab");
const cameraSettings = document.querySelector("#camera-settings");
const meshLab = document.querySelector("#mesh");
const rotation = document.querySelector("#rotation");
const angleOutput = document.querySelector("#angle-output");
const spacing = document.querySelector("#spacing");
const spacingOutput = document.querySelector("#spacing-output");
const purpleOutput = document.querySelector("#purple-output");
const purpleMeter = document.querySelector("#purple-meter");
const challengeFeedback = document.querySelector("#challenge-feedback");
const prediction = document.querySelector("#prediction");
const predictionButtons = Array.from(prediction.querySelectorAll("[data-prediction]"));
const predictionFeedback = document.querySelector("#prediction-feedback");
const retakeReveal = document.querySelector("#retake-reveal");
const caseProgress = document.querySelector("#case-count");
const caseClueItems = document.querySelectorAll("[data-case-clue]");
const original = document.querySelector("#original");
const photo = document.querySelector("#photo");
const marker = document.querySelector("#focus-marker");
const pixelPreview = document.querySelector("#pixel-preview");
const startInspection = document.querySelector("#start-inspection");
const inspectButton = document.querySelector("#inspect-purple");
const inspector = document.querySelector("#inspector");
const inspectorTitle = document.querySelector("#inspector-title");
const inspectionFollowup = document.querySelector("#inspection-followup");
const pixelTrace = document.querySelector("#pixel-trace");
const pixelExplanation = document.querySelector("#pixel-explanation");
const measuredValue = document.querySelector("#measured-value");
const estimatedValues = document.querySelector("#estimated-values");
const yourPixel = document.querySelector("#your-pixel");
const estimateButtons = Array.from(document.querySelectorAll("[data-estimate]"));
const buildFeedback = document.querySelector("#build-feedback");
const estimateEvidence = document.querySelector("#estimate-evidence");
const estimateOrigin = document.querySelector("#estimate-origin");
const estimateReadings = document.querySelector("#estimate-readings");
const understandingCheck = document.querySelector("#understanding-check");
const checkFeedback = document.querySelector("#check-feedback");
const answerCase = document.querySelector("#answer-case");
const caseVerdict = document.querySelector("#case-verdict");
const labAnswer = document.querySelector("#lab-answer");
const channelDetail = document.querySelector("#channel-detail");
const channelList = document.querySelector("#channels");
const sensorGrid = document.querySelector("#sensor-grid");
const comparison = document.querySelector("#comparison");
const comparisonResult = document.querySelector("#comparison-result");
const captureInfo = document.querySelector("#capture-info");
const widerStripes = document.querySelector("#wider-stripes");
const fineStripes = document.querySelector("#fine-stripes");

const originalContext = original.getContext("2d", { alpha: false });
const viewfinderContext = viewfinderCanvas.getContext("2d", { alpha: false });
viewfinderContext.imageSmoothingEnabled = false;
const viewfinderImage = viewfinderContext.createImageData(viewfinderCanvas.width, viewfinderCanvas.height);
const photoContext = photo.getContext("2d", { alpha: false });
const markerContext = marker.getContext("2d");
const previewContext = pixelPreview.getContext("2d", { alpha: false });
const yourPixelContext = yourPixel.getContext("2d", { alpha: false });
const originalImage = originalContext.createImageData(original.width, original.height);
const photoImage = photoContext.createImageData(size, size);
const previewImage = previewContext.createImageData(1, 1);
const yourPixelImage = yourPixelContext.createImageData(1, 1);
const comparisonViews = ["bilinear", "malvar"].map(method => {
  const context = document.querySelector(`#compare-${method}`).getContext("2d", { alpha: false });
  return {
    context,
    buffer: context.createImageData(size, size),
    falseColor: document.querySelector(`#${method}-color`),
    brightness: document.querySelector(`#${method}-brightness`),
  };
});

let samples;
let image;
let purplePixel;
let selection = null;
let selectedChannel = 1;
let frameRequested = false;
let challengeSolved = false;
let openingPurple = 0;
const addedChannels = [];
let caseCluesFound = [];

function renderCaseProgress() {
  for (const item of caseClueItems) {
    const found = caseCluesFound.includes(item.dataset.caseClue);
    item.classList.toggle("clue-found", found);
    item.querySelector("span").textContent = found ? ": found" : ": to find";
  }
  caseProgress.textContent = `${caseCluesFound.length} of ${caseClueItems.length} clues`;
  caseVerdict.hidden = !cameraCase.isSolved(caseCluesFound);
}

function discoverClue(clue) {
  const next = cameraCase.recordClue(caseCluesFound, clue);
  if (next === caseCluesFound) return;
  caseCluesFound = next;
  renderCaseProgress();
}

const channelButtons = channels.map((name, index) => {
  const button = document.createElement("button");
  const value = document.createElement("span");
  const tag = document.createElement("span");
  button.type = "button";
  button.className = "channel-button";
  tag.className = "channel-tag";
  button.append(value, tag);
  button.addEventListener("click", () => {
    selectedChannel = index;
    updateInspector();
  });
  channelList.append(button);
  return { button, value, tag, name };
});

function writePixel(data, offset, red, green, blue) {
  data[offset] = 255 * red;
  data[offset + 1] = 255 * green;
  data[offset + 2] = 255 * blue;
  data[offset + 3] = 255;
}

function drawScene(context, buffer, scene) {
  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      const gray = scene((x + 0.5) * size / buffer.width, (y + 0.5) * size / buffer.height);
      writePixel(buffer.data, 4 * (y * buffer.width + x), gray, gray, gray);
    }
  }
  context.putImageData(buffer, 0, 0);
}

function drawReconstruction(context, buffer, pixels) {
  for (let pixel = 0; pixel < size * size; pixel += 1) {
    const offset = 3 * pixel;
    writePixel(buffer.data, 4 * pixel, pixels[offset], pixels[offset + 1], pixels[offset + 2]);
  }
  context.putImageData(buffer, 0, 0);
}

function purpleLevel() {
  return Math.max(0, Math.round(purplePixel.score * 100));
}

function updateChallenge() {
  const strength = purpleLevel();
  purpleMeter.value = strength;
  purpleOutput.textContent = `${strength}%`;
  if (strength < 6) challengeSolved = true;

  const message = strength < 6
    ? "Bring back a purple pixel to see what the sensor measured."
    : challengeSolved
      ? "The purple is back. Inspect a pixel to find out which readings produced it."
      : "Tap the photo to explore a pixel.";
  if (challengeFeedback.textContent !== message) challengeFeedback.textContent = message;
  challengeFeedback.classList.toggle("is-solved", challengeSolved);
  inspectButton.textContent = strength < 12 ? "Bring back purple & inspect" : "Inspect a purple pixel";
}

function formatScore(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function updateComparison() {
  if (!comparison.open || !samples) return;

  // The same sample array is both methods' input. Because the source is gray,
  // those samples also give us its true brightness at every sensor position.
  const corrected = reconstruct(samples, "malvar");
  const metrics = [image, corrected].map((pixels, index) => {
    const view = comparisonViews[index];
    drawReconstruction(view.context, view.buffer, pixels);
    const scores = imageMetrics(pixels, samples);
    view.falseColor.textContent = formatScore(scores.falseColor);
    view.brightness.textContent = formatScore(scores.brightnessError);
    return scores;
  });

  captureInfo.textContent = `Shared capture · ${rotation.value}° angle · ${Number(spacing.value).toFixed(2)} px stripe spacing`;
  const angle = Number(rotation.value);
  const period = Number(spacing.value);
  const usingFineStripes = angle === initialAngle && period === initialPeriod;
  widerStripes.setAttribute("aria-pressed", String(angle === 20 && period === 4));
  fineStripes.setAttribute("aria-pressed", String(usingFineStripes));
  const difference = metrics[0].falseColor - metrics[1].falseColor;
  if (Math.abs(difference) < 0.01) {
    comparisonResult.textContent = usingFineStripes
      ? "Both methods leave about the same false color. These stripes are so fine that the sensor samples give either method little evidence to separate pattern from color. Try wider stripes to see when the correction helps."
      : "Both methods produce about the same false-color score for this capture.";
  } else if (difference > 0) {
    comparisonResult.textContent = `Cross-channel correction lowered the false-color score by ${Math.round(difference * 1000) / 10} percentage points on this capture.`;
  } else {
    comparisonResult.textContent = `Bilinear interpolation had ${Math.round(-difference * 1000) / 10} percentage points less false color on this capture.`;
  }
}

function updatePhoto() {
  frameRequested = false;
  const angle = Number(rotation.value);
  const period = Number(spacing.value);
  angleOutput.textContent = `${angle}°`;
  spacingOutput.textContent = `${period.toFixed(2)} px`;
  const scene = createScene(angle, period);
  samples = capture(scene);
  image = reconstruct(samples);
  purplePixel = findPurplePixel(image);

  drawScene(originalContext, originalImage, scene);
  drawReconstruction(photoContext, photoImage, image);
  updateChallenge();
  updateInspector();
  updateComparison();
}

function drawSelection() {
  markerContext.clearRect(0, 0, size, size);
  if (!selection) return;
  const { x, y } = selection;
  markerContext.strokeStyle = "#161019";
  markerContext.lineWidth = 0.7;
  markerContext.strokeRect(x - 1.4, y - 1.4, 3.8, 3.8);
  markerContext.strokeStyle = "#f7f5ff";
  markerContext.lineWidth = 0.3;
  markerContext.strokeRect(x - 1.4, y - 1.4, 3.8, 3.8);
}

function percent(value) {
  return `${Math.round(100 * value)}%`;
}

function showNeighborhood(x, y, sources) {
  const cells = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      const cell = document.createElement("div");
      cell.className = "sample";
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) {
        cell.textContent = "Outside sensor";
        cells.push(cell);
        continue;
      }
      if (dx === 0 && dy === 0) cell.classList.add("is-center");
      const channel = channelAt(nx, ny);
      const used = sources.some(source => source.x === nx && source.y === ny);
      cell.dataset.channel = channel;
      cell.classList.toggle("is-contributor", used);
      const label = document.createElement("small");
      label.textContent = `${channels[channel]}${used ? " · Used" : ""}`;
      cell.append(label, document.createTextNode(percent(samples[ny * size + nx])));
      cells.push(cell);
    }
  }
  sensorGrid.replaceChildren(...cells);
}

function updatePixelBuilder(values, measured) {
  const mix = buildPixel(values, measured, addedChannels);
  writePixel(yourPixelImage.data, 0, ...mix.map(value => value ?? 0));
  yourPixelContext.putImageData(yourPixelImage, 0, 0);

  const missing = [0, 1, 2].filter(channel => channel !== measured);
  estimateButtons.forEach((button, slot) => {
    const channel = missing[slot];
    button.dataset.channel = channel;
    button.textContent = `Add ${channels[channel].toLowerCase()}`;
    button.setAttribute("aria-pressed", String(addedChannels.includes(channel)));
  });

  const complete = !mix.includes(null);
  let message = "1 of 3 channels. Start with the sensor reading and add the two estimates.";
  if (complete) message = "3 of 3 channels. Your mix matches the photo pixel.";
  else if (addedChannels.length === 1) {
    const added = addedChannels[0];
    const count = contributions(selection.x, selection.y, added).length;
    message = `2 of 3 channels. ${channels[added]} was estimated at ${percent(values[added])} from ${count} nearby ${count === 1 ? "reading" : "readings"}. Add the last channel.`;
  }
  if (buildFeedback.textContent !== message) buildFeedback.textContent = message;
  buildFeedback.classList.toggle("is-complete", complete);
  understandingCheck.hidden = !complete;
  answerCase.hidden = !complete;
  if (complete) discoverClue("pixel");
  if (!complete) checkFeedback.textContent = "";

  const latest = addedChannels.at(-1);
  estimateEvidence.hidden = latest === undefined;
  if (latest === undefined) return;
  const nearby = contributions(selection.x, selection.y, latest);
  estimateOrigin.textContent = `Nearby ${channels[latest].toLowerCase()} readings used for the ${percent(values[latest])} estimate`;
  const readingLabels = nearby.map(({ x, y }, index) => {
    const label = document.createElement("li");
    label.textContent = `Point ${index + 1}: ${percent(samples[y * size + x])}`;
    return label;
  });
  estimateReadings.replaceChildren(...readingLabels);
}

function updateInspector() {
  drawSelection();
  inspector.hidden = selection === null;
  prediction.hidden = selection !== null;
  if (selection) retakeReveal.hidden = true;
  startInspection.hidden = selection !== null;
  inspectionFollowup.hidden = selection === null;
  inspector.parentElement.classList.toggle("is-inspecting", selection !== null);
  inspectButton.setAttribute("aria-expanded", String(selection !== null));
  if (!selection) return;

  const { x, y } = selection;
  const index = y * size + x;
  const offset = 3 * index;
  const measured = channelAt(x, y);
  const sources = contributions(x, y, selectedChannel);
  const values = image.subarray(offset, offset + 3);
  measuredValue.textContent = `${channels[measured]} ${percent(samples[index])}`;
  estimatedValues.textContent = channels.map((name, channel) => `${name} ${percent(values[channel])}`)
    .filter((_, channel) => channel !== measured).join(" · ");
  pixelExplanation.textContent = Math.min(values[0], values[2]) - values[1] > 0.12
    ? "Here, red and blue are stronger than green. The reconstructed pixel looks purple even though the original fabric is gray."
    : "The reconstructed pixel combines the measured reading with the camera’s two estimates.";
  writePixel(previewImage.data, 0, ...values);
  previewContext.putImageData(previewImage, 0, 0);
  labAnswer.textContent = "";
  updatePixelBuilder(values, measured);

  channelButtons.forEach(({ button, value, tag, name }, index) => {
    value.textContent = `${name} ${percent(values[index])}`;
    tag.textContent = index === measured ? "Measured" : "Estimated";
    button.setAttribute("aria-pressed", String(index === selectedChannel));
  });

  const name = channels[selectedChannel];
  channelDetail.textContent = selectedChannel === measured
    ? `${name} came directly from the selected photosite.`
    : `The reconstruction estimates ${name.toLowerCase()} by averaging ${sources.length} nearby ${name.toLowerCase()} measurements.`;
  showNeighborhood(x, y, sources);
}

function inspect(x, y) {
  if (selection?.x !== x || selection?.y !== y) {
    addedChannels.length = 0;
    checkFeedback.textContent = "";
  }
  selection = { x, y };
  selectedChannel = channelAt(x, y) === 1 ? 0 : 1;
  updateInspector();
}

estimateButtons.forEach(button => button.addEventListener("click", () => {
  const channel = Number(button.dataset.channel);
  const index = addedChannels.indexOf(channel);
  if (index === -1) addedChannels.push(channel);
  else addedChannels.splice(index, 1);
  selectedChannel = channel;
  updateInspector();
}));

const explanations = {
  measured: "Look at Sensor measured. The sensor gives this pixel one reading. The camera estimates the two missing channels from nearby sensor points.",
  estimated: "Exactly. The sensor supplied one channel. The two estimates complete the pixel’s color in the photo.",
  scene: "Look at Original fabric. It stays gray as it turns. The color comes from how the camera estimates the two missing channels.",
};

understandingCheck.querySelectorAll("[data-answer]").forEach(button => button.addEventListener("click", () => {
  const answer = button.dataset.answer;
  checkFeedback.textContent = explanations[answer];
  if (answer === "estimated") discoverClue("explanation");
}));

answerCase.addEventListener("click", () => {
  const question = document.querySelector("#check-title");
  question.focus({ preventScroll: true });
  question.scrollIntoView({ block: "nearest" });
});

const labQuestions = {
  sample: () => `At your selected pixel the sensor measured ${measuredValue.textContent.toLowerCase()}. The camera estimated ${estimatedValues.textContent.toLowerCase()}. Open Follow the sensor readings to see the individual measurements.`,
  angle: () => "Turning the fabric puts its dark and light stripes on different sensor points. The red, green, and blue filters then receive different readings, so the estimated color changes.",
  software: () => "Sometimes. The two reconstruction methods can give very different results on the same capture. Try both in Can you fix the photo? and compare the wider stripe and fine stripe examples.",
};

caseVerdict.querySelectorAll("[data-lab-question]").forEach(button => button.addEventListener("click", () => {
  labAnswer.textContent = labQuestions[button.dataset.labQuestion]();
}));

function clampPixel(value) {
  return Math.max(0, Math.min(size - 1, value));
}

function scheduleUpdate() {
  clearPrediction();
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(() => {
    updatePhoto();
    if (purpleLevel() < 6) discoverClue("retake");
  });
}

function clearPrediction() {
  retakeReveal.hidden = true;
  predictionFeedback.textContent = "";
  predictionButtons.forEach(button => button.setAttribute("aria-pressed", "false"));
}

function setCapture(angle, period) {
  clearPrediction();
  rotation.value = angle;
  spacing.value = period;
  updatePhoto();
}

rotation.addEventListener("input", scheduleUpdate);
spacing.addEventListener("input", scheduleUpdate);

function inspectBestPixel() {
  if (purplePixel.score < 0.12) setCapture(initialAngle, initialPeriod);
  inspect(purplePixel.x, purplePixel.y);
  inspectorTitle.focus({ preventScroll: true });
  inspector.scrollIntoView({ block: "nearest" });
}

inspectButton.addEventListener("click", inspectBestPixel);
document.querySelector("#follow-clue").addEventListener("click", inspectBestPixel);

photo.addEventListener("click", event => {
  const bounds = photo.getBoundingClientRect();
  const x = clampPixel(Math.floor(size * (event.clientX - bounds.left) / bounds.width));
  const y = clampPixel(Math.floor(size * (event.clientY - bounds.top) / bounds.height));
  const firstSelection = selection === null;
  inspect(x, y);
  if (firstSelection) inspector.scrollIntoView({ block: "nearest" });
});

photo.addEventListener("keydown", event => {
  const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    inspectButton.click();
  } else if (Object.hasOwn(moves, event.key)) {
    event.preventDefault();
    const { x, y } = selection ?? purplePixel;
    const [dx, dy] = moves[event.key];
    inspect(clampPixel(x + dx), clampPixel(y + dy));
  }
});

function resetFabric() {
  selection = null;
  pixelTrace.open = false;
  challengeSolved = false;
  caseCluesFound = [];
  renderCaseProgress();
  setCapture(initialAngle, initialPeriod);
}

document.querySelector("#reset").addEventListener("click", resetFabric);

function resetViewfinder() {
  openingGuess.hidden = false;
  openingShot.hidden = true;
  openingRetake.hidden = true;
  viewfinderCompare.hidden = true;
  viewfinderCross.hidden = false;
  setRouteStage(0);
  drawScene(viewfinderContext, viewfinderImage, createScene(initialAngle, initialPeriod));
  viewfinderState.textContent = "Live view";
  viewfinderAngle.textContent = `Gray fabric · ${initialAngle}°`;
  viewfinderCanvas.setAttribute("aria-label", "Simulated gray fabric with no color");
}

function setRouteStage(stage) {
  routeStages.forEach((item, index) => {
    if (index === stage) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
}

function renderShotComparison() {
  const mix = Number(shotDivider.value);
  const { width, height } = viewfinderCanvas;
  const divider = Math.round(width * (100 - mix) / 100);
  viewfinderContext.drawImage(photo, 0, 0, width, height);
  if (divider > 0) viewfinderContext.drawImage(original, 0, 0, divider, height, 0, 0, divider, height);
  if (mix > 0 && mix < 100) {
    viewfinderContext.fillStyle = "#e4f291";
    viewfinderContext.fillRect(divider - 1, 0, 2, height);
  }
  shotDivider.setAttribute("aria-valuetext", `${mix}% camera photo, ${100 - mix}% gray fabric`);
  viewfinderCanvas.setAttribute("aria-label", mix === 0 ? "Original gray striped fabric"
    : mix === 100 ? "Reconstructed camera photo showing green and purple stripes"
      : "Gray fabric on the left and the first reconstructed camera photo on the right");
}

shotDivider.addEventListener("input", renderShotComparison);
comparisonEndpoints.forEach(button => button.addEventListener("click", () => {
  shotDivider.value = button.dataset.comparisonEndpoint;
  renderShotComparison();
}));

function showViewfinderShot(label, description) {
  viewfinderContext.drawImage(photo, 0, 0, viewfinderCanvas.width, viewfinderCanvas.height);
  viewfinderState.textContent = label;
  viewfinderAngle.textContent = `Purple intensity ${purpleLevel()}% · ${rotation.value}°`;
  viewfinderCanvas.setAttribute("aria-label", description);
}

function showOpeningStep(current, next) {
  current.hidden = true;
  next.hidden = false;
  next.querySelector("h2").focus();
}

openingGuess.querySelectorAll("[data-first-guess]").forEach(button => button.addEventListener("click", () => {
  resetFabric();
  openingPurple = purpleLevel();
  viewfinderCross.hidden = true;
  viewfinderCompare.hidden = false;
  viewfinderState.textContent = "Same angle";
  viewfinderAngle.textContent = `${initialAngle}° · First photo`;
  shotDivider.value = 55;
  renderShotComparison();
  document.querySelector("#shot-reaction").textContent = button.dataset.firstGuess === "color"
    ? "You called it. Purple showed up."
    : "Surprise. Purple showed up.";
  showOpeningStep(openingGuess, openingShot);
}));

function testRetake() {
  setCapture(0, initialPeriod);
  const turnedPurple = purpleLevel();
  if (turnedPurple !== openingPurple) discoverClue("retake");
  return turnedPurple;
}

openingShot.querySelectorAll("[data-opening-retake]").forEach(button => button.addEventListener("click", () => {
  const turnedPurple = testRetake();
  viewfinderCompare.hidden = true;
  showViewfinderShot("Second photo", "Simulated photo after turning the gray fabric, with no purple in the center");
  document.querySelector("#retake-reaction").textContent = button.dataset.openingRetake === "fade"
    ? "You called it. The purple faded."
    : "Look again. The purple faded.";
  document.querySelector("#opening-result").textContent =
    `Purple intensity fell from ${openingPurple}% to ${turnedPurple}% in this shot. The fabric is still gray. Open a pixel from the first photo to see how the camera made it purple.`;
  showOpeningStep(openingShot, openingRetake);
}));

document.querySelector("#open-pixel").addEventListener("click", () => {
  viewfinder.hidden = true;
  fabricLab.hidden = false;
  comparison.hidden = false;
  meshLab.hidden = false;
  resetMesh();
  setRouteStage(1);
  inspector.querySelector(".camera-hint").open = false;
  inspectBestPixel();
});

document.querySelector("#back-to-viewfinder").addEventListener("click", () => {
  comparison.open = false;
  cameraSettings.open = false;
  fabricLab.hidden = true;
  comparison.hidden = true;
  meshLab.hidden = true;
  viewfinder.hidden = false;
  resetViewfinder();
  openingGuess.querySelector("h1").focus();
});

comparison.addEventListener("toggle", updateComparison);
document.querySelector("#go-compare").addEventListener("click", () => {
  comparison.open = true;
  comparison.querySelector("summary").focus();
  comparison.scrollIntoView({ block: "start" });
});
widerStripes.addEventListener("click", () => setCapture(20, 4));
fineStripes.addEventListener("click", () => setCapture(initialAngle, initialPeriod));

function setupMeshExperiment() {
  const meshOriginal = document.querySelector("#mesh-original");
  const meshPhoto = document.querySelector("#mesh-photo");
  const angleButton = document.querySelector("#mesh-angle");
  const distanceButton = document.querySelector("#mesh-distance");
  const settings = document.querySelector("#mesh-settings");
  const feedback = document.querySelector("#mesh-feedback");
  const sceneContext = meshOriginal.getContext("2d", { alpha: false });
  const imageContext = meshPhoto.getContext("2d", { alpha: false });
  const sceneBuffer = sceneContext.createImageData(meshOriginal.width, meshOriginal.height);
  const imageBuffer = imageContext.createImageData(size, size);
  let changedAngle = false;
  let movedCloser = false;

  function render() {
    const angle = changedAngle ? 12 : initialAngle;
    const period = movedCloser ? 3.6 : initialPeriod;
    const scene = createScene(angle, period, "mesh");
    const readings = capture(scene);
    const reconstructed = reconstruct(readings);
    drawScene(sceneContext, sceneBuffer, scene);
    drawReconstruction(imageContext, imageBuffer, reconstructed);
    settings.textContent = `${angle}° · ${period.toFixed(2)} px spacing`;
    angleButton.setAttribute("aria-pressed", String(changedAngle));
    distanceButton.setAttribute("aria-pressed", String(movedCloser));
    return imageMetrics(reconstructed, readings).falseColor;
  }

  let startingScore;

  function retake() {
    const score = render();
    feedback.textContent = `New shot: ${formatScore(score)} false color. Original shot: ${formatScore(startingScore)}. The mesh stayed gray. The new shot changed how its threads lined up with the sensor.`;
  }

  angleButton.addEventListener("click", () => { changedAngle = !changedAngle; retake(); });
  distanceButton.addEventListener("click", () => { movedCloser = !movedCloser; retake(); });

  return () => {
    changedAngle = false;
    movedCloser = false;
    startingScore = render();
    feedback.textContent = `Original shot: ${formatScore(startingScore)} false color. Which change would you try first?`;
  };
}

const resetMesh = setupMeshExperiment();
document.querySelectorAll('.mesh-link').forEach(link => link.addEventListener("click", () => setRouteStage(2)));
meshLab.addEventListener("click", event => {
  if (event.target.closest("button")) setRouteStage(2);
});
fabricLab.addEventListener("focusin", () => setRouteStage(1));
resetViewfinder();

predictionButtons.forEach(button => button.addEventListener("click", () => {
  const turnedPurple = testRetake();
  const didFade = turnedPurple < openingPurple;
  const guessedFade = button.dataset.prediction === "fade";
  const reaction = guessedFade === didFade ? "Your prediction matched." : "Look what changed.";
  button.setAttribute("aria-pressed", "true");
  retakeReveal.hidden = false;
  startInspection.hidden = true;
  predictionFeedback.textContent = `${reaction} Purple went from ${openingPurple}% at ${initialAngle}° to ${turnedPurple}% at 0°. The fabric stayed gray. Other false colors can remain.`;
}));

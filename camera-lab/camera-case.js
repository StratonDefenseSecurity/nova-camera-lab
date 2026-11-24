"use strict";

const cameraCase = (() => {
  const clues = ["retake", "pixel", "explanation"];

  function recordClue(found, clue) {
    if (!clues.includes(clue) || found.includes(clue)) return found;
    return [...found, clue];
  }

  function isSolved(found) {
    return clues.every(clue => found.includes(clue));
  }

  return { recordClue, isSolved };
})();

if (typeof module !== "undefined") module.exports = cameraCase;

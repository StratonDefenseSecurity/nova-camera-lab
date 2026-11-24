const assert = require("node:assert/strict");
const { test } = require("node:test");
const { recordClue, isSolved } = require("../camera-lab/camera-case.js");

test("repeating the same action and choosing a wrong answer do not earn extra clues", () => {
  const afterRetake = recordClue([], "retake");
  assert.deepEqual(afterRetake, ["retake"]);
  assert.equal(recordClue(afterRetake, "retake"), afterRetake);
  assert.equal(recordClue(afterRetake, "incorrect"), afterRetake);
  assert.equal(isSolved(afterRetake), false);
});

test("the mystery can be solved in a different exploration order once all three clues have evidence", () => {
  const afterPixel = recordClue([], "pixel");
  const afterExplanation = recordClue(afterPixel, "explanation");
  assert.equal(isSolved(afterExplanation), false);
  assert.equal(isSolved(recordClue(afterExplanation, "retake")), true);
  assert.equal(isSolved([]), false);
});

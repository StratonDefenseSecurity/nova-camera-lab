# The Color That Wasn’t There

**Team Nova · Global Virtual Hackathon 2026 · Unveiling Technology**

[Open the camera lab](https://stratondefensesecurity.github.io/nova-camera-lab/)

Why can a photo of a gray fabric show purple? Predict what the camera will see, slide between the gray scene and the reconstructed photo, then turn the same fabric and take a second shot. Open a purple pixel to rebuild its color from the sensor’s reading and the camera’s two estimates. Try the same idea on a window screen.

## How the simulation works

```text
Gray scene (angle and stripe spacing)
  → Bayer filter (one channel sampled per sensor point)
  → Demosaicing (two missing values estimated)
  → RGB photo, artifact scores, and pixel evidence
```

- [camera-model.js](camera-lab/camera-model.js) generates the scenes, captures Bayer samples, and reconstructs pixels with bilinear interpolation and Malvar–He–Cutler. The comparison feeds both methods the same capture.
- [lab.js](camera-lab/lab.js) renders the scene and the photo, connects the controls to the model, and exposes the values used at a selected pixel.
- [camera-case.js](camera-lab/camera-case.js) tracks evidence found in the investigation.

The model isolates Bayer sampling and demosaicing. It uses grayscale patterns and does not model a particular phone’s full imaging pipeline. It runs in the browser with no account, camera access, uploaded photos, or external API.

## Run and test locally

```sh
python -m http.server 8173 --bind 127.0.0.1 --directory camera-lab
node --test tests/*.test.cjs
```

Open the [local lab](http://127.0.0.1:8173/) while the server is running. The [two-minute visitor test](FIRST_TIME_TEST.md) measures recognition of the one measured channel and two estimated channels, and whether visitors can apply the idea to another pattern.

## Credits

- [Malvar, He, and Cutler’s original demosaicing paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/Demosaicing_ICASSP04.pdf)
- [Rebirth: The Story of Seamus](https://laughingcoyote.education/seamus/) inspired the use of a before-and-after comparison with a recurring guide.
- Team Nova built the project with AI-assisted development.

Released under the [MIT License](LICENSE).

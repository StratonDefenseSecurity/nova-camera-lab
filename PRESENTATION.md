# The Color That Wasn’t There

## Project page text

Can a photo show a color that was never there? Team Nova’s **The Color That Wasn’t There** reveals how a phone camera makes color from incomplete sensor data. Take a simulated photo of gray fabric, drag the divider to compare it with the original at the same angle, and turn the fabric for a second shot. Then rebuild a purple pixel from the single channel the Bayer sensor measured and the two channels the camera estimated from nearby readings.

For a deeper look, compare bilinear interpolation with Malvar–He–Cutler reconstruction using exactly the same sensor data. Wider stripes show when cross-channel correction helps. Very fine stripes show where both methods struggle. Finally, change the angle or distance on a gray window screen to test the same idea on a new pattern. The scenes, readings, images, and scores are computed live in the browser. The lab needs no account, camera permission, or external service.

- [Live project](https://stratondefensesecurity.github.io/nova-camera-lab/)
- [Public source code](https://github.com/StratonDefenseSecurity/nova-camera-lab)

## Suggested one-minute demo

Start on the live URL in a fresh tab. Record the actual interaction and speak over it in English. Keep the photo and the pixel builder readable. The Round 1 form accepts MP4 (H.264) or WebM under 100 MB. This script targets 60 seconds.

| Time | On screen | English narration |
| --- | --- | --- |
| 0–13 s | Choose **It’ll stay gray**. Drag the divider, then select **Purple will fade**. | “Can a camera find color in gray fabric? Our first shot shows purple. This slider compares the same patch at the same angle. Now turn the fabric. The purple disappears from the center.” |
| 13–32 s | Select **Open a purple pixel**. Press **Add red** and **Add blue**. | “Here’s the hidden step. At this pixel, the sensor measured green. The camera estimated red and blue from nearby readings. Add those two values and our mix matches the purple pixel.” |
| 32–49 s | Open **Can you fix the photo?** Show **Try wider stripes** and **Try very fine stripes**. | “We can also compare two ways to fill in the missing values. These photos use the same sensor data. Cross-channel correction helps with wider stripes, while very fine stripes still fool both methods.” |
| 49–60 s | Select **Try it on a window screen**, then **Move closer**. | “The same hidden step affects other fine patterns. Move closer to this gray window screen and the photo changes again. That’s one way to test for false color.” |

## Round 1 handoff

| Field | What to use |
| --- | --- |
| Project name | The Color That Wasn’t There |
| Live project | https://stratondefensesecurity.github.io/nova-camera-lab/ |
| Public source repository | https://github.com/StratonDefenseSecurity/nova-camera-lab |
| Tech used | HTML, CSS, vanilla JavaScript, Canvas 2D and GitHub Pages. Node.js runs the automated model tests. |
| What your project is about | Use the project page text above. |
| Who is it for? | Anyone who takes photos with a phone and wants to understand what happens between the sensor and the picture, especially first-time visitors with no background in imaging. |
| One-line summary | Take a photo of gray fabric, find the purple the camera created, and rebuild a pixel to see how phone cameras estimate color. |
| How it works | A simulated Bayer sensor samples one color channel per sensor point. The code estimates the other two from nearby readings, renders the RGB photo, and shows the samples behind a selected pixel. |
| Why it matters | A photo is an interpretation of sensor readings. Seeing how a fine gray pattern gains false color explains why changing angle or distance can change the artifact. |
| Source ZIP | Attach Nova-source.zip. The form allows source only, up to 20 MB. |
| Demo video | Record the walkthrough above and attach an MP4 (H.264) or WebM under 100 MB. |
| Live finalist availability | Lima, Peru (UTC−5). Choose only times the team can attend together. |

## Defence practice

Each team member should practice explaining one screen and one technical decision in their own words. Take turns asking follow-up questions.

- **What did the sensor measure at the selected pixel?** It recorded one channel through its Bayer filter. The reconstruction supplied the other two channels using nearby values.
- **How do you know the purple came from the computation?** The source is generated with equal red, green, and blue. The same source feeds the simulated sensor. The selected pixel exposes the actual readings and the resulting estimate.
- **Why compare both methods on the same capture?** Both receive the same samples and use the same score. Comparing different captures would mix up the effects of the algorithm and the camera position.
- **What happens with very fine stripes?** The sampled pattern can be ambiguous. Both methods work from those sparse readings, and in this simulated case their false-color scores are similar.
- **What did you test?** Separate automated model checks, browser walkthrough checks, and observed human results. Report actual participant counts after the sessions. Avoid treating a small usability sample as a result about all visitors.
- **What are the limits?** The simulation models one camera pipeline stage with grayscale patterns. The mesh and fabric scores are experimental measurements inside this model.

## Files for the team

- [Two-minute visitor test](FIRST_TIME_TEST.md)
- [Project context and preview commands](PROJECT_CONTEXT.md)

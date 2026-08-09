# Easy Fruit Catch manual browser checklist

Automated Django, TypeScript, and Vite checks do not have access to a real
webcam. Complete this checklist in a real browser before treating the prototype
as manually validated.

## Chrome

1. [ ] A signed-in user can load the protected `/fruit-catch/` page in current desktop Chrome.
2. [ ] An anonymous request to `/fruit-catch/` redirects to login and preserves the `next` URL.
3. [ ] **Start Camera** requests permission and starts the preview.
4. [ ] The status changes to show that the Pose Landmarker is ready.
5. [ ] The left basket follows the MediaPipe `LEFT_WRIST` landmark.
6. [ ] The right basket follows the MediaPipe `RIGHT_WRIST` landmark.
7. [ ] Basket direction and location match the mirrored webcam display.
8. [ ] Slow wrist movement produces reasonably smooth basket movement.
9. [ ] Losing only the left wrist hides/disables only the left basket.
10. [ ] Losing only the right wrist hides/disables only the right basket.
11. [ ] Losing the pose does not leave a stale basket collision or cause false scoring.
12. [ ] **Start Game** cannot run before both camera and model readiness.
13. [ ] The countdown shows 3, 2, 1 before play begins.
14. [ ] Fruit spawns at valid random horizontal positions inside the stage.
15. [ ] Fruit falls visibly at a slow Easy-difficulty speed.
16. [ ] The left basket can catch fruit and add one point.
17. [ ] The right basket can catch fruit and add one point.
18. [ ] Each fruit can increase the score at most once.
19. [ ] Missed fruit disappears after reaching the bottom, without a penalty.
20. [ ] The score display updates correctly.
21. [ ] The remaining-time display updates correctly.
22. [ ] The game finishes when the timer reaches zero.
23. [ ] Fruit spawning and movement stop after the game finishes.
24. [ ] The final score is displayed.
25. [ ] **Play Again** clears fruit, score, countdown, and timing from the previous run.
26. [ ] Three consecutive play/restart cycles do not accelerate spawning or create duplicate loops.
27. [ ] **Stop Camera** during countdown or play cancels the run and returns safely to Idle.
28. [ ] Starting the camera and playing again after stopping works correctly.
29. [ ] Refreshing or navigating away releases the webcam and game resources.
30. [ ] The browser console has no repeating runtime errors.
31. [ ] The Network panel shows no webcam frame, landmark, wrist-coordinate, score, or gameplay-data upload to Django. MediaPipe runtime/model download requests are expected.

## Edge smoke test

After Chrome passes, repeat a shorter smoke test in current desktop Microsoft
Edge:

- [ ] Camera permission and preview work.
- [ ] Both wrist-controlled baskets track correctly.
- [ ] Mirror alignment matches the displayed body movement.
- [ ] Both baskets can catch fruit.
- [ ] The countdown and game timer finish normally.
- [ ] **Play Again** starts one clean new run.
- [ ] **Stop Camera** cancels an active run and releases the camera.
- [ ] The Network panel shows no camera, pose, wrist, score, or gameplay-data upload.

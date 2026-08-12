# Target Shot manual browser checklist

The automated checks cannot validate webcam tracking or animation timing. Test
these items with a real camera before treating Target Shot as manually verified.

## Chrome

1. [ ] Anonymous `/target-shot/` access redirects to login.
2. [ ] An authenticated user can load the Target Shot page.
3. [ ] **Start Camera** starts the webcam after permission is granted.
4. [ ] The Pose model reaches its ready state.
5. [ ] The toy gun follows the right hand.
6. [ ] Left-hand movement does not control the gun.
7. [ ] Wrist, index and pinky averaging behaves normally.
8. [ ] Wrist fallback works when optional hand landmarks are unreliable.
9. [ ] The gun aligns with the right hand in the mirrored preview.
10. [ ] Gun movement is reasonably smooth.
11. [ ] Losing right-hand tracking hides/deactivates the gun.
12. [ ] Tracking loss immediately cancels dwell progress.
13. [ ] The game cannot start before camera/model readiness.
14. [ ] The 3-second countdown works.
15. [ ] Normal targets spawn inside the stage.
16. [ ] Golden targets occasionally spawn.
17. [ ] Targets remain fully inside the stage and outside the HUD.
18. [ ] Entering a target starts visible dwell-ring progress.
19. [ ] Leaving before dwell completes produces no score.
20. [ ] Completing dwell on a normal target awards exactly +1.
21. [ ] Completing dwell on a golden target awards exactly +3.
22. [ ] One target never scores twice.
23. [ ] Overlapping targets do not both score from one dwell.
24. [ ] A hit target visibly shakes.
25. [ ] A hit target visibly breaks into fragments.
26. [ ] Fragments fall, rotate and fade.
27. [ ] The target is removed after animation cleanup.
28. [ ] An unhit target disappears after its lifetime expires.
29. [ ] The game timer reaches zero correctly.
30. [ ] No scoring occurs after the timer reaches zero.
31. [ ] Final Score is displayed.
32. [ ] **Play Again** clears the previous run completely.
33. [ ] Three consecutive runs do not create duplicate targets or timers.
34. [ ] **Stop Camera** during gameplay cancels the run safely.
35. [ ] Camera and game can start again after stopping.
36. [ ] Refreshing or navigating away releases camera/game resources.
37. [ ] The browser console has no repeating errors.
38. [ ] The Network panel shows no upload of video, landmarks, right-hand coordinates, dwell data or gameplay coordinates to Django.

## Edge smoke test

- [ ] Camera and model readiness work.
- [ ] Right-hand gun and mirror alignment are correct.
- [ ] Dwell shooting works.
- [ ] Normal and golden target scoring is correct.
- [ ] Shake, break and fragment-fall animation works.
- [ ] Timer and **Play Again** work.
- [ ] **Stop Camera** cleans up safely.
- [ ] Network activity contains no pose or gameplay-data upload.

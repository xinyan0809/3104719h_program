# Body Dodge manual browser checklist

Automated checks cannot validate webcam movement. Complete this checklist in a
real browser before treating Body Dodge as manually verified.

## Chrome

1. [ ] **Start Camera** starts the webcam.
2. [ ] The Pose model reaches its ready state.
3. [ ] Moving the body left selects the left lane.
4. [ ] A centred body position selects the centre lane.
5. [ ] Moving the body right selects the right lane.
6. [ ] The player visibly moves to the correct fixed lane.
7. [ ] Obstacles appear in all three lanes over several runs.
8. [ ] Obstacles fall vertically at a slow, readable speed.
9. [ ] A same-lane obstacle is removed and awards no point.
10. [ ] A different-lane obstacle is removed and awards exactly +1.
11. [ ] Each obstacle resolves exactly once.
12. [ ] The game timer reaches zero and stops spawning obstacles.
13. [ ] Final Score is displayed.
14. [ ] **Play Again** clears old obstacles and resets the score.
15. [ ] Three consecutive runs do not duplicate loops or spawning.
16. [ ] **Stop Camera** during countdown/play safely cancels the run.
17. [ ] Tracking loss dims the player and does not crash or falsely score.
18. [ ] The console has no repeating errors.
19. [ ] Network activity contains no webcam, landmark, body-position, lane or obstacle-coordinate upload to Django.

## Edge smoke test

- [ ] Camera and Pose model readiness work.
- [ ] LEFT/CENTRE/RIGHT lane mapping matches the mirrored preview.
- [ ] Obstacles, collisions and dodge scoring work.
- [ ] Timer, **Play Again**, and **Stop Camera** work.
- [ ] Network activity contains no pose or gameplay-data upload.

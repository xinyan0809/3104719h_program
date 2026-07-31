# Pose test prototype manual checklist

## Preparation

1. Run `npm ci` and `npm run build` inside `frontend`.
2. Run `.\.venv\Scripts\python.exe manage.py runserver` from the repository root.
3. Open `http://127.0.0.1:8000/`, sign in, and visit `/pose-test/`.
4. Confirm the camera is not requested before **Start Camera** is clicked.

## Browser and camera checks

- [ ] **Chrome, permission allowed:** Click **Start Camera**, allow access, and
      confirm the preview appears.
- [ ] **Chrome, permission denied:** Reset the site's camera permission, deny
      access, and confirm a clear error is shown without a preview.
- [ ] **Edge, permission allowed:** Click **Start Camera**, allow access, and
      confirm the preview appears.
- [ ] **No available camera:** Disconnect or disable all cameras, click
      **Start Camera**, and confirm the page reports that no camera was found.
- [ ] **One person visible:** Stand fully in frame and confirm landmarks and
      connections are drawn with the status **Pose detected**.
- [ ] **No person visible:** Leave the frame and confirm the overlay clears and
      the status becomes **No pose detected**.
- [ ] **Horizontal movement:** Move left, return to the centre, and move right;
      confirm the movement state changes between **LEFT**, **CENTRE**, and
      **RIGHT**.
- [ ] **Stop Camera:** Click **Stop Camera** and confirm the preview stops, the
      overlay clears, and the operating-system camera indicator turns off.
- [ ] **Refresh cleanup:** Start the camera and refresh or leave the page;
      confirm the camera indicator turns off and no old stream remains after
      returning.

## Failure and privacy checks

- [ ] Block the MediaPipe WASM or model URL in browser developer tools and
      confirm the page displays **Camera or model error** and releases the
      camera.
- [ ] Inspect the browser network panel while moving in front of the camera and
      confirm no video frames, images, landmarks, or raw coordinates are sent to
      Django or any other server.

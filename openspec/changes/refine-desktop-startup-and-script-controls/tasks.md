## 1. Startup Resource Preparation

- [x] 1.1 Identify the current startup/bootstrap code paths that prepare uiautomator2, scrcpy-server, and ADB/device readiness.
- [x] 1.2 Split resource preparation from ADB/device connection so startup loading only checks/downloads required local resources.
- [x] 1.3 Add or update preload/IPC contracts for resource preparation status if the renderer needs separate resource-loading state.
- [x] 1.4 Update startup loading UI/copy so it describes resource preparation rather than ADB/device connection.
- [x] 1.5 Ensure the app shell can render after required resources are present even when no ADB device is connected.

## 2. Page Structure and Navigation

- [x] 2.1 Add `debug` to the desktop page state/navigation model.
- [x] 2.2 Add a Debug sidebar navigation item alongside Home and Task Execution while keeping Settings only in the sidebar footer.
- [x] 2.3 Create a new welcome Home page with introductory content.
- [x] 2.4 Add a per-page option or component path that lets Home hide the standard title/description card.
- [x] 2.5 Move the current automation environment status and preview content from Home into the Debug page.

## 3. Script Runtime Controls

- [x] 3.1 Extend the desktop store with script runtime state, including idle/running/paused/busy status and any screenshot capture indicator needed by the UI.
- [x] 3.2 Add icon-only Start and Pause controls to the sidebar top area with accessible names.
- [x] 3.3 Disable or show busy state for Start until startup resource preparation is complete.
- [x] 3.4 Wire Start to initiate ADB connection explicitly instead of relying on app startup.
- [x] 3.5 Wire successful Start to begin uiautomator screenshot capture for OCR processing.
- [x] 3.6 Ensure Start does not automatically start scrcpy video streaming.
- [x] 3.7 Wire Pause to update runtime state and stop or suspend uiautomator screenshot capture.

## 4. Debug and Preview Behavior

- [x] 4.1 Keep scrcpy preview controls manual in the Debug page.
- [x] 4.2 Ensure Debug can still display environment status and device preview after the user starts the script runtime.
- [x] 4.3 Ensure app startup no longer triggers ADB connection or uiautomator screenshot capture before Start is clicked.

## 5. Verification

- [x] 5.1 Run `pnpm --filter desktop check` for Biome formatting/lint validation.
- [x] 5.2 Run `pnpm --filter desktop exec tsc --noEmit` for desktop type-check validation.
- [x] 5.3 Run the relevant desktop build command to verify production compilation.
- [ ] 5.4 Manually verify Home welcome content, hidden Home header card, Debug page migration, and Settings footer behavior.
- [ ] 5.5 Manually verify startup only prepares resources, Start initiates ADB/uiautomator screenshot capture, Pause stops/suspends capture, and scrcpy does not auto-start.

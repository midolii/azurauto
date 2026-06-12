## 1. Architecture Audit and Capability Model

- [x] 1.1 Audit `apps/desktop/src` for direct `window.environment`, `window.scrcpy`, `window.runtime`, `window.logger`, WebCodecs, and native-dependent access points; record the migration list in the implementation notes or task comments.
- [x] 1.2 Define platform runtime and capability types for Electron/Web/unknown runtime, `available | unavailable | degraded` status, user message, recovery action, and error code.
- [x] 1.3 Include capability entries for preload namespace availability, environment/bootstrap, ADB, resource preparation, screenshot, scrcpy preview, runtime/window control, logging fallback, and video decoder support.
- [x] 1.4 Update renderer global type declarations so Electron preload APIs can be treated as optional at runtime instead of forcing every environment to assume they exist.

## 2. Platform Adapter and Native-Unavailable Fallback

- [x] 2.1 Create a renderer platform adapter module that is the single supported access point for `window.environment`, `window.scrcpy`, `window.runtime`, `window.logger`, and browser video-decoder capability checks.
- [x] 2.2 Implement the Electron-backed adapter path that proxies existing preload APIs without changing their successful behavior.
- [x] 2.3 Implement the Web/native-missing fallback path that returns structured unavailable status and safe operation results instead of throwing missing-global errors.
- [x] 2.4 Implement partial capability detection so missing `environment`, missing `scrcpy`, missing `runtime`, missing `logger`, missing screenshot, and missing WebCodecs produce independent degraded/unavailable states.

## 3. Renderer Migration and Degraded UI Behavior

- [x] 3.1 Migrate `useEnvironmentBootstrap` to consume the platform adapter and handle native-unavailable resource/bootstrap status.
- [x] 3.2 Migrate `useUiautomator2Preview` to gate screenshot polling on screenshot capability and stop with a structured unavailable message when ADB/bootstrap/screenshot is not available.
- [x] 3.3 Migrate `useScrcpyPreview` to gate status polling, event subscription, and start/stop calls on scrcpy and video-decoder capability.
- [x] 3.4 Migrate route/sidebar logger and runtime usages to the platform adapter so Web-only views do not crash when `window.logger` or `window.runtime` is absent.
- [x] 3.5 Update preview/home UI controls so native-dependent buttons are disabled or replaced with clear placeholders in Web-only, no-ADB, no-screenshot, no-scrcpy, and no-WebCodecs states.
- [x] 3.6 Ensure Web/native-missing resource preparation returns a terminal unavailable/degraded status so the app shell does not remain in startup loading indefinitely.
- [x] 3.7 Verify the desktop Electron happy path still shows bootstrap status, captures screenshots, and starts/stops scrcpy preview through the existing native services.

## 4. Native Boundary and Future Replacement Guardrails

- [x] 4.1 Document the required boundary for future native methods: package/service interface first, minimal IPC/preload second, platform adapter third, UI last.
- [x] 4.2 Document the Rust replacement seam for `packages/adb`, scrcpy adapter, screenshot source, and resource preparation without exposing Rust/SDK-specific objects to the renderer.
- [x] 4.3 Review `packages/adb` and `packages/automation` public exports to confirm Electron/UI layers consume project-owned types and not third-party ADB/scrcpy SDK implementation types.
- [x] 4.4 Define renderer-facing scrcpy video metadata, packet, and event types as project-owned serializable data, converting `@yume-chan/*` or future Rust-native packet shapes inside the native/scrcpy adapter boundary.
- [x] 4.5 Add or update comments near platform adapter and native service composition points explaining why native absence is represented as data instead of runtime crashes.

## 5. Tests and Verification

- [x] 5.1 Add renderer/unit tests for platform adapter behavior when no preload APIs exist, individual `environment`/`scrcpy`/`runtime`/`logger` namespaces are missing, and all native APIs exist.
- [x] 5.2 Add tests or component coverage showing Web-only/native-missing render paths do not throw and show native-unavailable/degraded UI states.
- [x] 5.3 Add tests for screenshot and scrcpy operation gating when ADB/bootstrap/screenshot/scrcpy/WebCodecs capabilities are unavailable.
- [x] 5.4 Run code search to confirm renderer native access goes through the platform adapter except for the adapter itself and type declarations.
- [x] 5.5 Run relevant checks such as `pnpm --filter desktop check`, `pnpm --filter @azurauto/adb test`, and `pnpm --filter @azurauto/automation test`, or document any unavailable verification.

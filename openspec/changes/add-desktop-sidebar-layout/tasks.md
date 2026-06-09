## 1. Sidebar Foundation

- [x] 1.1 Add the shadcn sidebar UI component set to `apps/desktop/src/components/ui` if it is not already present.
- [x] 1.2 Create a desktop app shell component that renders a persistent left sidebar and right main content region.
- [x] 1.3 Move shared page chrome out of the home route into reusable shell/page layout components while preserving startup loading behavior.
- [x] 1.4 Add a small typed global store layer for settings, script run logs, and task execution metadata, using Redux or another suitable store.

## 2. Sidebar Content and Navigation

- [x] 2.1 Add sidebar navigation entries for Home and Task Execution, with Settings only in the sidebar bottom action.
- [x] 2.2 Add the sidebar top section with an application icon skeleton placeholder.
- [x] 2.3 Add task context display in the sidebar top area showing task name and status or execution time.
- [x] 2.4 Add a Settings button anchored to the sidebar bottom area that switches to the Settings page.

## 3. Main Pages

- [x] 3.1 Implement the Home page inside the new shell while retaining the environment status and preview content.
- [x] 3.2 Implement the Task Execution page with an empty state.
- [x] 3.3 Implement the Settings page placeholder/content area reachable from sidebar navigation and the bottom Settings button.
- [x] 3.4 Ensure each page uses an upper title/optional description header section and a lower page-specific body section.
- [x] 3.5 Ensure navigation does not clear page/runtime state needed by inactive pages; move durable state into the global store or a persistent shell-level boundary.

## 4. Page Transitions and Accessibility

- [x] 4.1 Add simple `motion/react` transitions for page switches in the main content region.
- [x] 4.2 Respect reduced-motion preferences for all page transition animations.
- [x] 4.3 Ensure the active sidebar item is visually indicated and navigation controls have accessible labels/names.

## 5. Verification

- [x] 5.1 Run the desktop check command to catch formatting, lint, and type issues.
- [x] 5.2 Run the desktop build or relevant route generation/build command to verify TanStack route artifacts and production compilation.
- [ ] 5.3 Manually verify Home, Task Execution empty state, and Settings switching behavior in the desktop/web dev UI.
- [ ] 5.4 Manually verify that switching pages does not clear stored settings, placeholder task execution metadata, or script log state.

## ADDED Requirements

### Requirement: Desktop sidebar shell
The desktop app SHALL provide a persistent sidebar layout for the main desktop experience.

#### Scenario: Sidebar appears in desktop app
- **WHEN** the user opens the desktop app and the main app UI is shown
- **THEN** the UI displays a left sidebar and a right main content region

### Requirement: Sidebar navigation items
The sidebar SHALL expose primary navigation entries for Home and Task Execution, and SHALL NOT duplicate Settings as a primary navigation item.

#### Scenario: Navigate from sidebar
- **WHEN** the user selects Home or Task Execution from the sidebar primary navigation
- **THEN** the main content region displays the selected page

### Requirement: Sidebar top application and task context
The sidebar SHALL display a top section containing a reserved application icon skeleton and task context information including task name and execution status or execution time.

#### Scenario: Display reserved app and task context
- **WHEN** the sidebar is visible
- **THEN** the sidebar top section shows an application icon placeholder, task name, and either task execution status or execution time information

### Requirement: Sidebar bottom settings action
The sidebar SHALL display a Settings button anchored in the bottom sidebar area.

#### Scenario: Open settings from bottom action
- **WHEN** the user clicks the sidebar bottom Settings button
- **THEN** the main content region switches to the Settings page

### Requirement: Task execution empty state
The Task Execution page SHALL show an empty state until task execution content is implemented.

#### Scenario: View empty task execution page
- **WHEN** the user opens the Task Execution page before task execution content exists
- **THEN** the page displays an empty state rather than task execution controls or data

### Requirement: Main content page structure
Each main content page SHALL render with an upper page header section and a lower page body section.

#### Scenario: Render page header and body
- **WHEN** a page is displayed in the main content region
- **THEN** the upper section shows the page title and optional description, and the lower section shows page-specific content

### Requirement: Animated page transitions
The main content region SHALL use simple motion-based transitions when switching pages and SHALL respect reduced-motion preferences.

#### Scenario: Switch pages with transition
- **WHEN** the user switches between sidebar pages
- **THEN** the outgoing and incoming page content transitions with a simple animation unless reduced motion is preferred

### Requirement: Navigation preserves page state
The desktop app SHALL preserve page and shared runtime state when switching between Home, Task Execution, and Settings.

#### Scenario: Return to page without clearing state
- **WHEN** a page has accumulated local or shared runtime state and the user switches to another page and back
- **THEN** the previously accumulated state remains available instead of being reset by navigation

### Requirement: Global desktop state store
The desktop app SHALL provide a global state mechanism for shared desktop state including locally loaded settings, script run logs, and task execution metadata.

#### Scenario: Shared state is available across pages
- **WHEN** settings, script logs, or task execution metadata are updated from one part of the desktop app
- **THEN** the sidebar and relevant pages can read the updated state without depending on the mounted lifecycle of the page that produced it

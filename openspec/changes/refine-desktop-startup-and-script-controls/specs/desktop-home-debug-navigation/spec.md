## ADDED Requirements

### Requirement: Welcome home page
The desktop app SHALL provide a Home page that shows welcome content rather than the automation environment check UI.

#### Scenario: User opens Home
- **WHEN** the user selects Home from the sidebar
- **THEN** the main content region shows welcome content

### Requirement: Home hides page header card
The Home page SHALL hide the standard content-top title and description card area.

#### Scenario: Home page omits standard header
- **WHEN** the Home page is displayed
- **THEN** the content-top title and description card area is not shown

### Requirement: Debug page contains environment checks
The desktop app SHALL provide a Debug page containing the automation environment check and device preview content that previously appeared on Home.

#### Scenario: User opens Debug
- **WHEN** the user selects Debug from navigation
- **THEN** the main content region shows automation environment status and preview/debug content

### Requirement: Debug navigation entry
The sidebar SHALL provide a navigation entry for Debug in addition to Home and Task Execution, while Settings remains in the bottom sidebar action.

#### Scenario: Sidebar shows Debug navigation
- **WHEN** the sidebar navigation is visible
- **THEN** it includes Home, Task Execution, and Debug primary navigation entries, and Settings remains in the bottom sidebar action

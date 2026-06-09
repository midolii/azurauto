## ADDED Requirements

### Requirement: Sidebar script controls
The desktop app SHALL show icon-only Start and Pause controls in the top sidebar area to represent and control script runtime state.

#### Scenario: Start and pause controls are visible
- **WHEN** the sidebar is visible
- **THEN** the top sidebar area shows icon-only Start and Pause controls

### Requirement: Explicit ADB connection start
The desktop app SHALL NOT connect to ADB automatically when the app opens, and SHALL initiate ADB connection only after the user activates the sidebar Start control.

#### Scenario: App opens without ADB connection
- **WHEN** the user opens the desktop app
- **THEN** the app does not start ADB connection automatically

#### Scenario: User starts script runtime
- **WHEN** the user clicks the sidebar Start control
- **THEN** the app starts the ADB connection flow

### Requirement: Uiautomator screenshot capture on start
The desktop app SHALL automatically start uiautomator screenshot capture for script OCR processing after the user starts the script runtime.

#### Scenario: Start enables screenshot capture
- **WHEN** the user clicks the sidebar Start control and ADB connection succeeds
- **THEN** uiautomator screenshot capture starts for OCR processing

### Requirement: Scrcpy remains manual
The desktop app SHALL NOT automatically start scrcpy video streaming when the script runtime starts.

#### Scenario: Start does not enable scrcpy
- **WHEN** the user clicks the sidebar Start control
- **THEN** scrcpy video streaming remains stopped unless the user manually starts it from the debug UI

### Requirement: Pause stops runtime activity
The desktop app SHALL allow the user to pause script runtime from the sidebar and stop or suspend runtime activity that was started by the Start control.

#### Scenario: User pauses script runtime
- **WHEN** the script runtime is running and the user clicks the sidebar Pause control
- **THEN** the app updates runtime state to paused and stops or suspends runtime screenshot activity

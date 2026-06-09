## ADDED Requirements

### Requirement: Startup resource preparation only
During application startup loading, the desktop app SHALL validate required local resource files for ADB device push workflows and SHALL NOT connect to ADB as part of startup loading.

#### Scenario: App startup checks resources
- **WHEN** the desktop app starts
- **THEN** startup loading checks required local resource files without connecting to ADB

### Requirement: Missing resource download
The desktop app SHALL download required resource files from the network when they are missing locally.

#### Scenario: Resource file missing
- **WHEN** startup loading detects that a required resource file such as uiautomator2 or scrcpy-server is missing
- **THEN** the app downloads the missing resource from the network before startup loading completes

### Requirement: Resource-ready app shell
The desktop app SHALL show the app shell after required startup resources are present, even when no ADB device is connected.

#### Scenario: Resources ready without device
- **WHEN** required startup resources are present and no ADB connection has been started
- **THEN** the app shell is shown without requiring a connected ADB device

### Requirement: Extensible startup checks
The startup loading flow SHALL support adding future non-ADB startup checks such as script update detection.

#### Scenario: Future startup check added
- **WHEN** a future non-ADB startup check is added to the loading flow
- **THEN** it can run as part of startup loading without forcing ADB connection

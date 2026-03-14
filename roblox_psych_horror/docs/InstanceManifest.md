# Instance Manifest (Create These in Roblox Studio)

## ReplicatedStorage
- Folder `Remotes`
  - RemoteEvent `DialogEvent`
  - RemoteEvent `ChapterEvent`
  - RemoteEvent `JumpscareEvent`
- ModuleScript `StoryData` (paste from `src/ReplicatedStorage/StoryData.lua`)

## ServerScriptService
- Script `StoryServer` (paste from `src/ServerScriptService/StoryServer.lua`)

## StarterPlayer
- StarterPlayerScripts
  - LocalScript `StoryClient` (paste from `src/StarterPlayer/StarterPlayerScripts/StoryClient.lua`)

## StarterGui
- ScreenGui `StoryUI` (optional; the client creates it automatically if missing)

## Workspace
- Folder `StoryZones`
  - Add Parts as triggers (walls/floors/colliders), with attributes:
    - `DialogId` (string)
    - `ChapterId` (string, optional)
    - `JumpscareId` (string, optional)
    - `OneShot` (bool, default true)
  - Optional: add a ProximityPrompt to any trigger Part for interaction-based triggers

## Lighting
- No manual setup required; the client will set values per chapter.

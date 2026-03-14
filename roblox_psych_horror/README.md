# Psychological Horror Roblox Game (Fresh Project)

This is a fresh Roblox Studio project scaffold for a **psychological horror** game.
It includes core scripts, a story system, and setup instructions.

## What You Get
- Story progression system with dialog, chapters, and jump-scares
- Client UI for narrative text + typewriter effect
- Lighting/atmosphere changes per chapter
- Zone-trigger system (touch or proximity prompt)
- Lightweight sanity effect (visual distortion in dark areas)

## How To Use In Roblox Studio
1. Open Roblox Studio and create a **new Baseplate** place.
2. In Explorer, create folders and objects to match **docs/InstanceManifest.md**.
3. Paste the scripts from `src/` into the matching locations.
4. Build your map (see **docs/LevelBlueprint.md** for suggested layout).
5. Press **Play** to test the story flow.

## Notes
- Sound/Image IDs are placeholders (`0`). Replace them with your assets.
- You can add or edit story lines in `src/ReplicatedStorage/StoryData.lua`.
- The zone system uses attributes. Make sure your zone Parts have the attributes described in the manifest.

If you want me to extend this into a full content pack (more scenes, puzzles, inventory, AI entity), say the word and I’ll expand it.

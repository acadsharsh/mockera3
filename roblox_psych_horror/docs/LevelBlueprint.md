# Level Blueprint (Suggested)

## Concept
A short, psychological horror experience set inside a decaying apartment building. The player relives fragmented memories and discovers the unreliable nature of their reality.

## Layout
1. **Entry Hall (Chapter: prologue)**
   - Dim lighting, blocked exit.
   - Trigger dialog: `intro`.
2. **Mirror Room (Chapter: act1)**
   - A room with a standing mirror and quiet whispers.
   - Trigger dialog: `mirror` and optional jumpscare: `mirror_flash`.
3. **Hallway Loop (Chapter: act2)**
   - A corridor that subtly changes each time the player walks through.
   - Trigger dialog: `hallway`.
4. **Bedroom (Chapter: act3)**
   - Final confrontation; note on the bed.
   - Trigger dialog: `reveal`.

## Zone Tips
- Use large invisible Parts (CanCollide false) for triggers.
- Set `OneShot` true for story beats.
- If you want manual interaction, add a ProximityPrompt.

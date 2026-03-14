-- Progression.lua

local Progression = {}

Progression.Levels = {
  { level = 1, xp = 0, unlocks = { zones = { "shallow" } } },
  { level = 2, xp = 250, unlocks = { zones = { "reef" } } },
  { level = 3, xp = 600, unlocks = { zones = { "twilight" } } },
  { level = 4, xp = 1200, unlocks = { zones = { "abyss" } } },
  { level = 5, xp = 2000, unlocks = { zones = { "void" } } },
}

Progression.XP = {
  Loot = 5,
  Discovery = 20,
  Boss = 250,
  Quest = 80,
}

return Progression

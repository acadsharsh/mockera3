-- Bosses.lua

local Bosses = {}

Bosses.WeeklyRotation = {
  { id = "abyss_wyrm", zone = "abyss", hp = 1500, reward = { xp = 500, coins = 1500, lootTier = "epic" } },
  { id = "void_sentinel", zone = "void", hp = 2200, reward = { xp = 800, coins = 2400, lootTier = "legendary" } },
}

return Bosses

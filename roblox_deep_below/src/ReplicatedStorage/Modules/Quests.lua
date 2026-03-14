-- Quests.lua

local Quests = {}

Quests.Daily = {
  { id = "daily_salvage", desc = "Collect 8 loot items", goal = 8, reward = { xp = 80, coins = 120 } },
  { id = "daily_depth", desc = "Reach 300m depth", goal = 300, reward = { xp = 100, coins = 150 } },
}

Quests.Weekly = {
  { id = "weekly_boss", desc = "Defeat the weekly boss", goal = 1, reward = { xp = 600, coins = 1200 } },
}

Quests.Story = {
  { id = "story_intro", desc = "Find the first lore fragment", reward = { xp = 120, coins = 200 } },
  { id = "story_abyss", desc = "Discover the Abyssal City", reward = { xp = 300, coins = 500 } },
}

return Quests

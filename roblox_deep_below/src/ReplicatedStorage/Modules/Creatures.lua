-- Creatures.lua

local Creatures = {}

Creatures.ByZone = {
  shallow = {
    passive = { "Fish", "Turtle" },
    neutral = { "SmallShark" },
    hostile = { },
  },
  reef = {
    passive = { "Manta", "ReefFish" },
    neutral = { "Shark", "Octopus" },
    hostile = { "JellySwarm" },
  },
  twilight = {
    passive = { },
    neutral = { "GiantEel" },
    hostile = { "Squid" },
  },
  abyss = {
    passive = { },
    neutral = { "Angler" },
    hostile = { "VoidLeech" },
  },
  void = {
    passive = { },
    neutral = { },
    hostile = { "Watcher", "Leviathan" },
  },
}

Creatures.Stats = {
  Fish = { hp = 10, speed = 6, behavior = "passive" },
  Turtle = { hp = 20, speed = 4, behavior = "passive" },
  SmallShark = { hp = 35, speed = 8, behavior = "neutral" },
  Shark = { hp = 60, speed = 10, behavior = "neutral" },
  Octopus = { hp = 50, speed = 7, behavior = "neutral" },
  JellySwarm = { hp = 40, speed = 7, behavior = "hostile" },
  GiantEel = { hp = 80, speed = 9, behavior = "neutral" },
  Squid = { hp = 90, speed = 8, behavior = "hostile" },
  Angler = { hp = 120, speed = 6, behavior = "neutral" },
  VoidLeech = { hp = 140, speed = 8, behavior = "hostile" },
  Watcher = { hp = 200, speed = 7, behavior = "hostile" },
  Leviathan = { hp = 500, speed = 6, behavior = "hostile" },
}

return Creatures

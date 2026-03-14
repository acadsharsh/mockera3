-- Config.lua
-- Global tuning values.

local Config = {}

Config.Oxygen = {
  BaseMax = 100,
  BaseDrainPerSec = 0.25,
  DrainMultiplierByZone = {
    shallow = 1.0,
    reef = 1.2,
    twilight = 1.5,
    abyss = 2.0,
    void = 2.6,
  },
}

Config.Light = {
  DarkDepthThreshold = 300,
  LightAttractsMultiplier = 1.2,
  LightScaresMultiplier = 0.8,
}

Config.Depth = {
  Zones = {
    shallow = { min = 0, max = 100 },
    reef = { min = 100, max = 300 },
    twilight = { min = 300, max = 600 },
    abyss = { min = 600, max = 1000 },
    void = { min = 1000, max = 99999 },
  },
}

Config.Loot = {
  BaseRolls = 1,
}

Config.Base = {
  SafeZoneOxygenRefillPerSec = 6,
  SafeZoneRadius = 18,
}

Config.Vehicle = {
  DefaultSpeed = 30,
  BoostSpeed = 45,
}

return Config

-- VehicleUpgrades.lua

local VehicleUpgrades = {
  SpeedMk1 = { cost = { Scrap = 20, Pearl = 2 }, bonus = { speed = 6 } },
  HullMk1 = { cost = { ["Abyssal Alloy"] = 1, Scrap = 30 }, bonus = { durability = 40 } },
  DepthMk1 = { cost = { ["Deep Crystal"] = 2, Scrap = 20 }, bonus = { depthLimit = 200 } },
}

return VehicleUpgrades

-- Economy.lua

local Economy = {}

Economy.SellValues = {
  Scrap = 5,
  Shell = 6,
  ["Rusty Coin"] = 10,
  ["Coral Chunk"] = 15,
  ["Old Compass"] = 30,
  Pearl = 35,
  ["Deep Crystal"] = 60,
  ["Ancient Bolt"] = 55,
  ["Void Glass"] = 80,
  ["Abyssal Alloy"] = 120,
  ["Relic Core"] = 150,
  ["Eldritch Fragment"] = 220,
  ["Leviathan Scale"] = 300,
}

Economy.Upgrades = {
  O2_Tank_Large = { cost = { Scrap = 20, Pearl = 3 }, bonus = "+50 O2" },
  Flashlight_Mk2 = { cost = { Scrap = 12, ["Deep Crystal"] = 1 }, bonus = "+30% light" },
  Suit_Pressure = { cost = { ["Abyssal Alloy"] = 2, Scrap = 40 }, bonus = "Abyss pressure" },
}

return Economy

-- CraftingRecipes.lua

local CraftingRecipes = {
  basic_tank = {
    output = { item = "Large O2 Tank", count = 1 },
    inputs = { Scrap = 10, Pearl = 2 },
  },
  flashlight_mk2 = {
    output = { item = "Flashlight Mk2", count = 1 },
    inputs = { Scrap = 8, ["Deep Crystal"] = 1 },
  },
  sonar_scanner = {
    output = { item = "Sonar Scanner", count = 1 },
    inputs = { ["Coral Chunk"] = 4, ["Ancient Bolt"] = 2 },
  },
}

return CraftingRecipes

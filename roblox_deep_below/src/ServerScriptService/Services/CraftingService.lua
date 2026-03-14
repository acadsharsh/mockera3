-- CraftingService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local CraftingRecipes = require(ReplicatedStorage.Modules.CraftingRecipes)
local InventoryService = require(script.Parent.InventoryService)

local craftingEvent = ReplicatedStorage.Remotes:WaitForChild("CraftingEvent")

local CraftingService = {}

craftingEvent.OnServerEvent:Connect(function(player, recipeId)
  local recipe = CraftingRecipes[recipeId]
  if not recipe then
    craftingEvent:FireClient(player, { ok = false, error = "unknown_recipe" })
    return
  end

  if not InventoryService.RemoveItems(player, recipe.inputs) then
    craftingEvent:FireClient(player, { ok = false, error = "missing_items" })
    return
  end

  InventoryService.AddItem(player, recipe.output.item, recipe.output.count or 1)
  craftingEvent:FireClient(player, { ok = true, recipe = recipeId })
end)

return CraftingService

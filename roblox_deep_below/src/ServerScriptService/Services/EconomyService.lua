-- EconomyService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Economy = require(ReplicatedStorage.Modules.Economy)
local InventoryService = require(script.Parent.InventoryService)

local economyEvent = ReplicatedStorage.Remotes:WaitForChild("EconomyEvent")

local EconomyService = {}

function EconomyService.SellItem(player, item, count)
  local value = Economy.SellValues[item]
  if not value then
    economyEvent:FireClient(player, { ok = false, error = "unknown_item" })
    return
  end

  local cost = {}
  cost[item] = count or 1
  if not InventoryService.RemoveItems(player, cost) then
    economyEvent:FireClient(player, { ok = false, error = "missing_items" })
    return
  end

  economyEvent:FireClient(player, { ok = true, coins = value * (count or 1) })
end

economyEvent.OnServerEvent:Connect(function(player, action, item, count)
  if action == "Sell" then
    EconomyService.SellItem(player, item, count)
  end
end)

return EconomyService

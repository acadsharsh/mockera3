-- InventoryService.lua

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local inventoryEvent = ReplicatedStorage.Remotes:WaitForChild("InventoryEvent")

local InventoryService = {}
local inventories = {}

local function ensureInventory(player)
  if not inventories[player] then
    inventories[player] = {}
  end
  return inventories[player]
end

local function sendInventory(player)
  local inv = ensureInventory(player)
  inventoryEvent:FireClient(player, inv)
end

function InventoryService.AddItem(player, item, count)
  local inv = ensureInventory(player)
  inv[item] = (inv[item] or 0) + (count or 1)
  sendInventory(player)
end

function InventoryService.RemoveItems(player, cost)
  local inv = ensureInventory(player)
  for item, qty in pairs(cost) do
    if (inv[item] or 0) < qty then
      return false
    end
  end
  for item, qty in pairs(cost) do
    inv[item] = math.max(0, (inv[item] or 0) - qty)
    if inv[item] == 0 then
      inv[item] = nil
    end
  end
  sendInventory(player)
  return true
end

function InventoryService.GetInventory(player)
  return ensureInventory(player)
end

Players.PlayerAdded:Connect(function(player)
  ensureInventory(player)
  task.delay(1, function()
    sendInventory(player)
  end)
end)

Players.PlayerRemoving:Connect(function(player)
  inventories[player] = nil
end)

return InventoryService

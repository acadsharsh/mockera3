-- StorageService.lua

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local InventoryService = require(script.Parent.InventoryService)

local storageEvent = ReplicatedStorage.Remotes:WaitForChild("StorageEvent")

local StorageService = {}
local storage = {}

local function ensure(player)
  if not storage[player] then
    storage[player] = {}
  end
  return storage[player]
end

local function send(player)
  storageEvent:FireClient(player, { storage = ensure(player) })
end

storageEvent.OnServerEvent:Connect(function(player, action, payload)
  local store = ensure(player)
  if action == "Open" then
    send(player)
    return
  end

  if action == "Deposit" then
    local item = payload and payload.item
    local count = payload and payload.count or 1
    if not item then return end

    local cost = {}
    cost[item] = count
    if not InventoryService.RemoveItems(player, cost) then
      storageEvent:FireClient(player, { ok = false, error = "missing_items" })
      return
    end

    store[item] = (store[item] or 0) + count
    send(player)
    return
  end

  if action == "Withdraw" then
    local item = payload and payload.item
    local count = payload and payload.count or 1
    if not item then return end

    if (store[item] or 0) < count then
      storageEvent:FireClient(player, { ok = false, error = "missing_storage" })
      return
    end

    store[item] = store[item] - count
    if store[item] <= 0 then store[item] = nil end
    InventoryService.AddItem(player, item, count)
    send(player)
    return
  end
end)

Players.PlayerAdded:Connect(function(player)
  ensure(player)
end)

Players.PlayerRemoving:Connect(function(player)
  storage[player] = nil
end)

return StorageService

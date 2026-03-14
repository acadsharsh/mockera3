-- VehicleUpgradeService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local VehicleUpgrades = require(ReplicatedStorage.Modules.VehicleUpgrades)
local InventoryService = require(script.Parent.InventoryService)

local vehicleEvent = ReplicatedStorage.Remotes:WaitForChild("VehicleEvent")

local VehicleUpgradeService = {}
local upgrades = {}

local function ensure(player)
  if not upgrades[player] then
    upgrades[player] = { speed = 0, durability = 0, depthLimit = 0 }
  end
  return upgrades[player]
end

vehicleEvent.OnServerEvent:Connect(function(player, action, upgradeId)
  if action ~= "Upgrade" then return end

  local upgrade = VehicleUpgrades[upgradeId]
  if not upgrade then
    vehicleEvent:FireClient(player, { ok = false, error = "unknown_upgrade" })
    return
  end

  if not InventoryService.RemoveItems(player, upgrade.cost) then
    vehicleEvent:FireClient(player, { ok = false, error = "missing_items" })
    return
  end

  local state = ensure(player)
  state.speed += (upgrade.bonus.speed or 0)
  state.durability += (upgrade.bonus.durability or 0)
  state.depthLimit += (upgrade.bonus.depthLimit or 0)

  player:SetAttribute("VehicleSpeedBonus", state.speed)
  player:SetAttribute("VehicleDurabilityBonus", state.durability)
  player:SetAttribute("VehicleDepthBonus", state.depthLimit)

  vehicleEvent:FireClient(player, { ok = true, upgrade = upgradeId, state = state })
end)

return VehicleUpgradeService

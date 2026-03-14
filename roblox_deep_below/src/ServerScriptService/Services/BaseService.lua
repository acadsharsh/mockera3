-- BaseService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local baseEvent = ReplicatedStorage.Remotes:WaitForChild("BaseEvent")
local BaseData = require(ReplicatedStorage.Modules.BaseData)
local InventoryService = require(script.Parent.InventoryService)
local Config = require(ReplicatedStorage.Modules.Config)

local BaseService = {}
local occupied = {}

local function findPlot(plotId)
  local folder = workspace:FindFirstChild("BasePlots")
  if not folder then return nil end
  for _, part in ipairs(folder:GetDescendants()) do
    if part:IsA("BasePart") and part:GetAttribute("PlotId") == plotId then
      return part
    end
  end
  return nil
end

local function createBaseModel(plotPart, baseTier)
  local data = BaseData[baseTier] or BaseData.Basic

  local model = Instance.new("Model")
  model.Name = "PlayerBase"

  local floor = Instance.new("Part")
  floor.Name = "BaseFloor"
  floor.Size = Vector3.new(16, 1, 16)
  floor.CFrame = plotPart.CFrame + Vector3.new(0, 1, 0)
  floor.Anchored = true
  floor.Color = Color3.fromRGB(20, 60, 70)
  floor.Material = Enum.Material.Metal
  floor.Parent = model

  local safeZone = Instance.new("Part")
  safeZone.Name = "SafeZone"
  local radius = data.safeZoneRadius or Config.Base.SafeZoneRadius
  safeZone.Size = Vector3.new(radius * 2, 12, radius * 2)
  safeZone.CFrame = floor.CFrame + Vector3.new(0, 6, 0)
  safeZone.Anchored = true
  safeZone.Transparency = 1
  safeZone.CanCollide = false
  safeZone:SetAttribute("IsSafeZone", true)
  safeZone.Parent = model

  local prompt = Instance.new("ProximityPrompt")
  prompt.ActionText = "Refill Oxygen"
  prompt.ObjectText = "O2 Station"
  prompt.MaxActivationDistance = 8
  prompt.Parent = floor

  prompt.Triggered:Connect(function(player)
    player:SetAttribute("InSafeZone", true)
    player:SetAttribute("Oxygen", Config.Oxygen.BaseMax)
  end)

  safeZone.Touched:Connect(function(hit)
    local character = hit.Parent
    if not character then return end
    local player = game.Players:GetPlayerFromCharacter(character)
    if not player then return end
    player:SetAttribute("InSafeZone", true)
  end)

  safeZone.TouchEnded:Connect(function(hit)
    local character = hit.Parent
    if not character then return end
    local player = game.Players:GetPlayerFromCharacter(character)
    if not player then return end
    player:SetAttribute("InSafeZone", false)
  end)

  model.PrimaryPart = floor
  model.Parent = workspace
  return model
end

baseEvent.OnServerEvent:Connect(function(player, action, payload)
  if action ~= "PlaceBase" then return end

  local plotId = payload and payload.plotId or "plot_1"
  local baseTier = payload and payload.tier or "Basic"
  if occupied[plotId] then
    baseEvent:FireClient(player, { ok = false, error = "occupied" })
    return
  end

  local plot = findPlot(plotId)
  if not plot then
    baseEvent:FireClient(player, { ok = false, error = "plot_missing" })
    return
  end

  local cost = (BaseData[baseTier] and BaseData[baseTier].cost) or BaseData.Basic.cost
  if not InventoryService.RemoveItems(player, cost) then
    baseEvent:FireClient(player, { ok = false, error = "missing_items" })
    return
  end

  createBaseModel(plot, baseTier)
  occupied[plotId] = true
  baseEvent:FireClient(player, { ok = true, plotId = plotId })
end)

return BaseService

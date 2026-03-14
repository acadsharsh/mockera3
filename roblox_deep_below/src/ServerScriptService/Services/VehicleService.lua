-- VehicleService.lua

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Vehicles = require(ReplicatedStorage.Modules.Vehicles)

local vehicleEvent = ReplicatedStorage.Remotes:WaitForChild("VehicleEvent")

local VehicleService = {}
local activeVehicles = {}

local function buildSubmarine(modelName)
  local model = Instance.new("Model")
  model.Name = modelName

  local seat = Instance.new("VehicleSeat")
  seat.Name = "PilotSeat"
  seat.Size = Vector3.new(2, 1, 2)
  seat.Position = Vector3.new(0, 3, 0)
  seat.MaxSpeed = 60
  seat.Parent = model

  local body = Instance.new("Part")
  body.Name = "Body"
  body.Size = Vector3.new(6, 3, 10)
  body.Position = Vector3.new(0, 3, 0)
  body.Color = Color3.fromRGB(30, 70, 90)
  body.Material = Enum.Material.Metal
  body.Parent = model

  local weld = Instance.new("WeldConstraint")
  weld.Part0 = seat
  weld.Part1 = body
  weld.Parent = seat

  model.PrimaryPart = body
  return model
end

local function placeVehicle(player, vehicleId)
  local data = Vehicles[vehicleId]
  if not data then return nil end

  local character = player.Character
  if not character then return nil end
  local hrp = character:FindFirstChild("HumanoidRootPart")
  if not hrp then return nil end

  local model = buildSubmarine(vehicleId)
  local speedBonus = player:GetAttribute("VehicleSpeedBonus") or 0
  local durabilityBonus = player:GetAttribute("VehicleDurabilityBonus") or 0
  local depthBonus = player:GetAttribute("VehicleDepthBonus") or 0

  model.Parent = workspace
  model:SetPrimaryPartCFrame(hrp.CFrame * CFrame.new(0, 0, -12))

  local seat = model:FindFirstChild("PilotSeat")
  if seat then
    seat.MaxSpeed = (data.speed or 30) + speedBonus
  end

  model:SetAttribute("Durability", (data.durability or 100) + durabilityBonus)
  model:SetAttribute("DepthLimit", (data.depthLimit or 600) + depthBonus)

  activeVehicles[player] = model
  return model
end

vehicleEvent.OnServerEvent:Connect(function(player, action, vehicleId)
  if action == "Spawn" then
    if activeVehicles[player] then
      activeVehicles[player]:Destroy()
      activeVehicles[player] = nil
    end
    local model = placeVehicle(player, vehicleId or "MiniSub")
    vehicleEvent:FireClient(player, { ok = model ~= nil, vehicleId = vehicleId })
    return
  end

  if action == "Despawn" then
    if activeVehicles[player] then
      activeVehicles[player]:Destroy()
      activeVehicles[player] = nil
    end
    vehicleEvent:FireClient(player, { ok = true })
    return
  end
end)

RunService.Heartbeat:Connect(function(dt)
  for player, model in pairs(activeVehicles) do
    if model and model.Parent then
      local depth = player:GetAttribute("Depth") or 0
      local depthLimit = model:GetAttribute("DepthLimit") or 600
      local durability = model:GetAttribute("Durability") or 100

      if depth > depthLimit then
        durability = durability - (dt * 6)
        model:SetAttribute("Durability", durability)
        if durability <= 0 then
          model:Destroy()
          activeVehicles[player] = nil
          vehicleEvent:FireClient(player, { ok = false, error = "vehicle_destroyed" })
        end
      end
    end
  end
end)

Players.PlayerRemoving:Connect(function(player)
  if activeVehicles[player] then
    activeVehicles[player]:Destroy()
    activeVehicles[player] = nil
  end
end)

return VehicleService

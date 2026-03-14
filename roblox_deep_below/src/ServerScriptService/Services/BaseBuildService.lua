-- BaseBuildService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local BaseParts = require(ReplicatedStorage.Modules.BaseParts)
local InventoryService = require(script.Parent.InventoryService)

local baseEvent = ReplicatedStorage.Remotes:WaitForChild("BaseEvent")
local storageEvent = ReplicatedStorage.Remotes:WaitForChild("StorageEvent")

local BaseBuildService = {}

local function placePart(player, partType, position, rotation)
  local def = BaseParts[partType]
  if not def then
    baseEvent:FireClient(player, { ok = false, error = "unknown_part" })
    return
  end

  if def.cost and not InventoryService.RemoveItems(player, def.cost) then
    baseEvent:FireClient(player, { ok = false, error = "missing_items" })
    return
  end

  local part = Instance.new("Part")
  part.Name = "Base" .. partType
  part.Size = def.size
  part.Anchored = true
  part.Material = Enum.Material.Metal
  part.Color = Color3.fromRGB(20, 60, 70)
  part.CFrame = CFrame.new(position) * CFrame.Angles(0, math.rad(rotation or 0), 0)
  part.Parent = workspace

  if partType == "O2Station" then
    local prompt = Instance.new("ProximityPrompt")
    prompt.ActionText = "Refill Oxygen"
    prompt.ObjectText = "O2 Station"
    prompt.MaxActivationDistance = 8
    prompt.Parent = part

    prompt.Triggered:Connect(function(p)
      p:SetAttribute("InSafeZone", true)
      p:SetAttribute("Oxygen", 100)
    end)
  end

  if partType == "Storage" then
    local prompt = Instance.new("ProximityPrompt")
    prompt.ActionText = "Open Storage"
    prompt.ObjectText = "Storage"
    prompt.MaxActivationDistance = 8
    prompt.Parent = part

    prompt.Triggered:Connect(function(p)
      storageEvent:FireClient(p, { open = true })
    end)
  end

  baseEvent:FireClient(player, { ok = true })
end

baseEvent.OnServerEvent:Connect(function(player, action, payload)
  if action == "PlacePart" then
    placePart(player, payload.partType, payload.position, payload.rotation)
  end
end)

return BaseBuildService

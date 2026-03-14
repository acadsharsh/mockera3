-- ZoneSystem.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local LootService = require(script.Parent.Parent.Services.LootService)
local ProgressionService = require(script.Parent.Parent.Services.ProgressionService)

local lootEvent = ReplicatedStorage.Remotes:WaitForChild("LootEvent")

local function bindDiscovery(part)
  if not part:IsA("BasePart") then return end
  part.Touched:Connect(function(hit)
    local character = hit.Parent
    if not character then return end
    local player = game.Players:GetPlayerFromCharacter(character)
    if not player then return end
    if part:GetAttribute("Discovered") then return end
    part:SetAttribute("Discovered", true)
    ProgressionService.AddXp(player, 20)
  end)
end

local function bindLootSpawn(part)
  if not part:IsA("BasePart") then return end
  part.Touched:Connect(function(hit)
    local character = hit.Parent
    if not character then return end
    local player = game.Players:GetPlayerFromCharacter(character)
    if not player then return end

    local tier = part:GetAttribute("LootTier")
    LootService.RollLoot(player, tier)
  end)
end

local function init()
  local folder = workspace:FindFirstChild("LootSpawns")
  if not folder then return end

  for _, part in ipairs(folder:GetDescendants()) do
    if part:IsA("BasePart") then
      bindLootSpawn(part)
    end
  end

  folder.DescendantAdded:Connect(function(child)
    if child:IsA("BasePart") then
      bindLootSpawn(child)
    end
  end)

  local zones = workspace:FindFirstChild("Zones")
  if zones then
    for _, part in ipairs(zones:GetDescendants()) do
      if part:IsA("BasePart") then
        bindDiscovery(part)
      end
    end
    zones.DescendantAdded:Connect(function(child)
      if child:IsA("BasePart") then
        bindDiscovery(child)
      end
    end)
  end
end

init()

-- DepthService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")

local Config = require(ReplicatedStorage.Modules.Config)
local QuestService = require(script.Parent.QuestService)

local depthEvent = ReplicatedStorage.Remotes:WaitForChild("DepthEvent")

local function resolveZone(depth)
  for id, z in pairs(Config.Depth.Zones) do
    if depth >= z.min and depth < z.max then
      return id
    end
  end
  return "shallow"
end

RunService.Heartbeat:Connect(function()
  for _, player in ipairs(Players:GetPlayers()) do
    local char = player.Character
    if not char then continue end
    local hrp = char:FindFirstChild("HumanoidRootPart")
    if not hrp then continue end

    local depth = math.max(0, -hrp.Position.Y)
    local zoneId = resolveZone(depth)

    player:SetAttribute("Depth", depth)
    player:SetAttribute("ZoneId", zoneId)
    depthEvent:FireClient(player, depth, zoneId)

    if depth >= 300 and not player:GetAttribute("Reached300") then
      player:SetAttribute("Reached300", true)
      QuestService.Increment(player, "daily_depth", 300)
    end
  end
end)

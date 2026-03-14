-- OxygenService.lua

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Config = require(ReplicatedStorage.Modules.Config)

local oxygenEvent = ReplicatedStorage.Remotes:WaitForChild("OxygenEvent")

local OxygenService = {}

local function getDrainMultiplier(zoneId)
  return Config.Oxygen.DrainMultiplierByZone[zoneId] or 1.0
end

RunService.Heartbeat:Connect(function(dt)
  for _, player in ipairs(Players:GetPlayers()) do
    local zoneId = player:GetAttribute("ZoneId") or "shallow"
    local oxygen = player:GetAttribute("Oxygen") or Config.Oxygen.BaseMax
    local inSafeZone = player:GetAttribute("InSafeZone")

    if inSafeZone then
      oxygen = math.min(Config.Oxygen.BaseMax, oxygen + Config.Base.SafeZoneOxygenRefillPerSec * dt)
    else
      local drain = Config.Oxygen.BaseDrainPerSec * getDrainMultiplier(zoneId)
      oxygen = math.max(0, oxygen - drain * dt)
    end

    player:SetAttribute("Oxygen", oxygen)
    oxygenEvent:FireClient(player, oxygen, Config.Oxygen.BaseMax)

    if oxygen <= 0 then
      -- Placeholder: blackout and drop loot
      oxygenEvent:FireClient(player, 0, Config.Oxygen.BaseMax, true)
    end
  end
end)

return OxygenService

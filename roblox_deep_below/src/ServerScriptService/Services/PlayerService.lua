-- PlayerService.lua

local Players = game:GetService("Players")

local PlayerService = {}

function PlayerService.Init()
  Players.PlayerAdded:Connect(function(player)
    player:SetAttribute("Depth", 0)
    player:SetAttribute("ZoneId", "shallow")
    player:SetAttribute("Oxygen", 100)
    player:SetAttribute("InSafeZone", false)
    player:SetAttribute("Reached300", false)
  end)
end

PlayerService.Init()
return PlayerService

-- LightClient.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Lighting = game:GetService("Lighting")

local depthEvent = ReplicatedStorage.Remotes:WaitForChild("DepthEvent")

local function setDark(isDark)
  if isDark then
    Lighting.Brightness = 0.8
    Lighting.FogEnd = 90
  else
    Lighting.Brightness = 2
    Lighting.FogEnd = 200
  end
end

depthEvent.OnClientEvent:Connect(function(depth)
  setDark(depth >= 300)
end)

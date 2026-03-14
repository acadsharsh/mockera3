-- CreatureSpawner.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Zones = require(ReplicatedStorage.Modules.Zones)
local CreatureService = require(script.Parent.Parent.Services.CreatureService)

local CreatureSpawner = {}

function CreatureSpawner.Init()
  task.spawn(function()
    while true do
      for zoneId, _ in pairs(Zones) do
        CreatureService.Spawn(zoneId)
      end
      task.wait(30)
    end
  end)
end

CreatureSpawner.Init()
return CreatureSpawner

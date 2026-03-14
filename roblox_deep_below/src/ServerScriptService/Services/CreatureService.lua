-- CreatureService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Creatures = require(ReplicatedStorage.Modules.Creatures)
local creatureEvent = ReplicatedStorage.Remotes:WaitForChild("CreatureEvent")

local CreatureService = {}

function CreatureService.Spawn(zoneId)
  -- Stub: spawn a creature in a zone
  local zone = Creatures.ByZone[zoneId]
  if not zone then return end
  creatureEvent:FireAllClients({ zone = zoneId, info = zone })
end

return CreatureService

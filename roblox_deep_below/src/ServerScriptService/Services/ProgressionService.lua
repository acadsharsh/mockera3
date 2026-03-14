-- ProgressionService.lua

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Progression = require(ReplicatedStorage.Modules.Progression)

local progressionEvent = ReplicatedStorage.Remotes:WaitForChild("ProgressionEvent")

local ProgressionService = {}
local data = {}

local function getLevelForXp(xp)
  local level = 1
  for _, entry in ipairs(Progression.Levels) do
    if xp >= entry.xp then
      level = entry.level
    end
  end
  return level
end

local function ensure(player)
  if not data[player] then
    data[player] = { xp = 0, level = 1 }
  end
  return data[player]
end

function ProgressionService.AddXp(player, amount)
  local d = ensure(player)
  d.xp += amount
  d.level = getLevelForXp(d.xp)
  progressionEvent:FireClient(player, d)
end

Players.PlayerAdded:Connect(function(player)
  ensure(player)
  task.delay(1, function()
    progressionEvent:FireClient(player, data[player])
  end)
end)

Players.PlayerRemoving:Connect(function(player)
  data[player] = nil
end)

return ProgressionService

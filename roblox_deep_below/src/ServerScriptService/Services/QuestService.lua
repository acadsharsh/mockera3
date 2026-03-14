-- QuestService.lua

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Quests = require(ReplicatedStorage.Modules.Quests)
local ProgressionService = require(script.Parent.ProgressionService)

local questEvent = ReplicatedStorage.Remotes:WaitForChild("QuestEvent")

local QuestService = {}
local states = {}

local function ensure(player)
  if not states[player] then
    states[player] = {
      daily = Quests.Daily,
      weekly = Quests.Weekly,
      story = Quests.Story,
      progress = {},
    }
  end
  return states[player]
end

function QuestService.Increment(player, questId, amount)
  local s = ensure(player)
  s.progress[questId] = (s.progress[questId] or 0) + (amount or 1)
  questEvent:FireClient(player, s)
end

function QuestService.Complete(player, questId, reward)
  ProgressionService.AddXp(player, reward.xp or 0)
  questEvent:FireClient(player, { completed = questId })
end

Players.PlayerAdded:Connect(function(player)
  ensure(player)
  task.delay(1, function()
    questEvent:FireClient(player, states[player])
  end)
end)

Players.PlayerRemoving:Connect(function(player)
  states[player] = nil
end)

return QuestService

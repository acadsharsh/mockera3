-- BossService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Bosses = require(ReplicatedStorage.Modules.Bosses)
local ProgressionService = require(script.Parent.ProgressionService)

local bossEvent = ReplicatedStorage.Remotes:WaitForChild("BossEvent")

local BossService = {}

function BossService.Announce()
  local current = Bosses.WeeklyRotation[1]
  if current then
    bossEvent:FireAllClients({ status = "active", boss = current })
  end
end

function BossService.Reward(player, bossId)
  for _, b in ipairs(Bosses.WeeklyRotation) do
    if b.id == bossId then
      ProgressionService.AddXp(player, b.reward.xp or 0)
      bossEvent:FireClient(player, { status = "reward", boss = b })
      return
    end
  end
end

task.delay(3, function()
  BossService.Announce()
end)

return BossService

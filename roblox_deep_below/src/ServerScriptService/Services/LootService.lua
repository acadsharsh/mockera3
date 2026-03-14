-- LootService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local LootTables = require(ReplicatedStorage.Modules.LootTables)
local Items = require(ReplicatedStorage.Modules.Items)
local InventoryService = require(script.Parent.InventoryService)
local ProgressionService = require(script.Parent.ProgressionService)
local QuestService = require(script.Parent.QuestService)

local lootEvent = ReplicatedStorage.Remotes:WaitForChild("LootEvent")

local LootService = {}

local function weightedPick()
  local total = 0
  for _, v in pairs(LootTables) do
    total += v.weight
  end
  local roll = math.random() * total
  local acc = 0
  for tier, v in pairs(LootTables) do
    acc += v.weight
    if roll <= acc then
      return tier
    end
  end
  return "common"
end

function LootService.RollLoot(player, tierOverride)
  local tier = tierOverride or weightedPick()
  local items = Items[tier]
  if not items then return end
  local item = items[math.random(1, #items)]
  InventoryService.AddItem(player, item, 1)
  lootEvent:FireClient(player, { tier = tier, item = item })
  ProgressionService.AddXp(player, 5)
  QuestService.Increment(player, "daily_salvage", 1)
end

return LootService

-- MainServer.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local function ensureFolder(parent, name)
  local f = parent:FindFirstChild(name)
  if not f then
    f = Instance.new("Folder")
    f.Name = name
    f.Parent = parent
  end
  return f
end

local function ensureRemote(parent, name)
  local r = parent:FindFirstChild(name)
  if not r then
    r = Instance.new("RemoteEvent")
    r.Name = name
    r.Parent = parent
  end
  return r
end

local remotes = ensureFolder(ReplicatedStorage, "Remotes")
ensureRemote(remotes, "OxygenEvent")
ensureRemote(remotes, "LightEvent")
ensureRemote(remotes, "LootEvent")
ensureRemote(remotes, "DepthEvent")
ensureRemote(remotes, "BaseEvent")
ensureRemote(remotes, "ShopEvent")
ensureRemote(remotes, "InventoryEvent")
ensureRemote(remotes, "CraftingEvent")
ensureRemote(remotes, "VehicleEvent")
ensureRemote(remotes, "QuestEvent")
ensureRemote(remotes, "ProgressionEvent")
ensureRemote(remotes, "BossEvent")
ensureRemote(remotes, "CreatureEvent")
ensureRemote(remotes, "EconomyEvent")
ensureRemote(remotes, "StorageEvent")

-- Force load services
require(script.Parent.Services.PlayerService)
require(script.Parent.Services.OxygenService)
require(script.Parent.Services.DepthService)
require(script.Parent.Services.LootService)
require(script.Parent.Services.InventoryService)
require(script.Parent.Services.BaseService)
require(script.Parent.Services.CraftingService)
require(script.Parent.Services.VehicleService)
require(script.Parent.Services.ShopService)
require(script.Parent.Services.ProgressionService)
require(script.Parent.Services.QuestService)
require(script.Parent.Services.EconomyService)
require(script.Parent.Services.CreatureService)
require(script.Parent.Services.BossService)
require(script.Parent.Services.BaseBuildService)
require(script.Parent.Services.VehicleUpgradeService)
require(script.Parent.Services.BossArenaService)
require(script.Parent.Services.StorageService)

require(script.Parent.Systems.ZoneSystem)
require(script.Parent.Systems.CreatureSpawner)
require(script.Parent.Systems.WorldGen)

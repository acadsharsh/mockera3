-- WorldGen.lua

local Zones = {
  shallow = { y = 0, size = Vector3.new(400, 4, 400), color = Color3.fromRGB(40, 120, 160) },
  reef = { y = -150, size = Vector3.new(380, 4, 380), color = Color3.fromRGB(40, 90, 120) },
  twilight = { y = -450, size = Vector3.new(360, 4, 360), color = Color3.fromRGB(25, 60, 90) },
  abyss = { y = -800, size = Vector3.new(340, 4, 340), color = Color3.fromRGB(15, 40, 70) },
  void = { y = -1200, size = Vector3.new(320, 4, 320), color = Color3.fromRGB(8, 20, 40) },
}

local function ensureFolder(parent, name)
  local f = parent:FindFirstChild(name)
  if not f then
    f = Instance.new("Folder")
    f.Name = name
    f.Parent = parent
  end
  return f
end

local function addZonePart(folder, id, def)
  local part = Instance.new("Part")
  part.Name = "Zone_" .. id
  part.Size = def.size
  part.Position = Vector3.new(0, def.y, 0)
  part.Anchored = true
  part.Color = def.color
  part.Material = Enum.Material.Slate
  part:SetAttribute("ZoneId", id)
  part.Parent = folder
  return part
end

local function addPOI(folder, id, baseY)
  local poi = Instance.new("Part")
  poi.Name = "POI_" .. id
  poi.Size = Vector3.new(8, 8, 8)
  poi.Position = Vector3.new(math.random(-120, 120), baseY + 6, math.random(-120, 120))
  poi.Anchored = true
  poi.Material = Enum.Material.Neon
  poi.Color = Color3.fromRGB(200, 140, 60)
  poi.Parent = folder
end

local function addLoot(folder, tier, baseY)
  local loot = Instance.new("Part")
  loot.Name = "Loot_" .. tier
  loot.Size = Vector3.new(4, 4, 4)
  loot.Position = Vector3.new(math.random(-140, 140), baseY + 4, math.random(-140, 140))
  loot.Anchored = true
  loot.Material = Enum.Material.Metal
  loot.Color = Color3.fromRGB(120, 180, 200)
  loot:SetAttribute("LootTier", tier)
  loot.Parent = folder
end

local zonesFolder = ensureFolder(workspace, "Zones")
local lootFolder = ensureFolder(workspace, "LootSpawns")
local baseFolder = ensureFolder(workspace, "BasePlots")

for id, def in pairs(Zones) do
  addZonePart(zonesFolder, id, def)
  addPOI(zonesFolder, id .. "_poi", def.y)
  addLoot(lootFolder, id == "shallow" and "common" or id == "reef" and "uncommon" or id == "twilight" and "rare" or id == "abyss" and "epic" or "legendary", def.y)
end

local plot = Instance.new("Part")
plot.Name = "Plot_1"
plot.Size = Vector3.new(20, 1, 20)
plot.Position = Vector3.new(30, 2, 30)
plot.Anchored = true
plot.Color = Color3.fromRGB(60, 80, 90)
plot:SetAttribute("PlotId", "plot_1")
plot.Parent = baseFolder

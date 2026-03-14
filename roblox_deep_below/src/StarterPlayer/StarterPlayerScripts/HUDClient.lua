-- HUDClient.lua

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local oxygenEvent = remotes:WaitForChild("OxygenEvent")
local depthEvent = remotes:WaitForChild("DepthEvent")
local lootEvent = remotes:WaitForChild("LootEvent")
local inventoryEvent = remotes:WaitForChild("InventoryEvent")
local craftingEvent = remotes:WaitForChild("CraftingEvent")
local shopEvent = remotes:WaitForChild("ShopEvent")
local vehicleEvent = remotes:WaitForChild("VehicleEvent")
local baseEvent = remotes:WaitForChild("BaseEvent")
local questEvent = remotes:WaitForChild("QuestEvent")
local progressionEvent = remotes:WaitForChild("ProgressionEvent")
local bossEvent = remotes:WaitForChild("BossEvent")
local economyEvent = remotes:WaitForChild("EconomyEvent")
local storageEvent = remotes:WaitForChild("StorageEvent")

local CraftingRecipes = require(ReplicatedStorage.Modules.CraftingRecipes)
local Monetization = require(ReplicatedStorage.Modules.Monetization)
local Vehicles = require(ReplicatedStorage.Modules.Vehicles)
local BaseData = require(ReplicatedStorage.Modules.BaseData)
local BaseParts = require(ReplicatedStorage.Modules.BaseParts)
local VehicleUpgrades = require(ReplicatedStorage.Modules.VehicleUpgrades)

local inventoryCache = {}
local storageCache = {}

local function ensureUI()
  local existing = playerGui:FindFirstChild("HUD")
  if existing then return existing end

  local gui = Instance.new("ScreenGui")
  gui.Name = "HUD"
  gui.ResetOnSpawn = false
  gui.Parent = playerGui

  local stats = Instance.new("Frame")
  stats.Name = "Stats"
  stats.Size = UDim2.new(0, 300, 0, 110)
  stats.Position = UDim2.new(0, 16, 0, 16)
  stats.BackgroundTransparency = 0.25
  stats.BackgroundColor3 = Color3.fromRGB(8, 12, 18)
  stats.Parent = gui

  local oxygenLabel = Instance.new("TextLabel")
  oxygenLabel.Name = "OxygenLabel"
  oxygenLabel.Size = UDim2.new(1, -16, 0, 28)
  oxygenLabel.Position = UDim2.new(0, 8, 0, 6)
  oxygenLabel.BackgroundTransparency = 1
  oxygenLabel.TextColor3 = Color3.fromRGB(200, 220, 255)
  oxygenLabel.Font = Enum.Font.GothamBold
  oxygenLabel.TextSize = 16
  oxygenLabel.TextXAlignment = Enum.TextXAlignment.Left
  oxygenLabel.Parent = stats

  local depthLabel = Instance.new("TextLabel")
  depthLabel.Name = "DepthLabel"
  depthLabel.Size = UDim2.new(1, -16, 0, 24)
  depthLabel.Position = UDim2.new(0, 8, 0, 34)
  depthLabel.BackgroundTransparency = 1
  depthLabel.TextColor3 = Color3.fromRGB(200, 220, 255)
  depthLabel.Font = Enum.Font.Gotham
  depthLabel.TextSize = 15
  depthLabel.TextXAlignment = Enum.TextXAlignment.Left
  depthLabel.Parent = stats

  local lootLabel = Instance.new("TextLabel")
  lootLabel.Name = "LootLabel"
  lootLabel.Size = UDim2.new(1, -16, 0, 24)
  lootLabel.Position = UDim2.new(0, 8, 0, 60)
  lootLabel.BackgroundTransparency = 1
  lootLabel.TextColor3 = Color3.fromRGB(180, 255, 200)
  lootLabel.Font = Enum.Font.Gotham
  lootLabel.TextSize = 15
  lootLabel.TextXAlignment = Enum.TextXAlignment.Left
  lootLabel.Parent = stats

  local statusLabel = Instance.new("TextLabel")
  statusLabel.Name = "StatusLabel"
  statusLabel.Size = UDim2.new(1, -16, 0, 24)
  statusLabel.Position = UDim2.new(0, 8, 0, 84)
  statusLabel.BackgroundTransparency = 1
  statusLabel.TextColor3 = Color3.fromRGB(200, 200, 210)
  statusLabel.Font = Enum.Font.Gotham
  statusLabel.TextSize = 14
  statusLabel.TextXAlignment = Enum.TextXAlignment.Left
  statusLabel.Parent = stats

  local panel = Instance.new("Frame")
  panel.Name = "Panel"
  panel.Size = UDim2.new(0, 420, 0, 340)
  panel.Position = UDim2.new(1, -440, 0, 16)
  panel.BackgroundTransparency = 0.2
  panel.BackgroundColor3 = Color3.fromRGB(6, 10, 16)
  panel.Parent = gui

  local title = Instance.new("TextLabel")
  title.Name = "Title"
  title.Size = UDim2.new(1, -16, 0, 26)
  title.Position = UDim2.new(0, 8, 0, 8)
  title.BackgroundTransparency = 1
  title.TextColor3 = Color3.fromRGB(220, 230, 255)
  title.Font = Enum.Font.GothamBold
  title.TextSize = 18
  title.TextXAlignment = Enum.TextXAlignment.Left
  title.Text = "Deep Below"
  title.Parent = panel

  local tabBar = Instance.new("Frame")
  tabBar.Name = "TabBar"
  tabBar.Size = UDim2.new(1, -16, 0, 28)
  tabBar.Position = UDim2.new(0, 8, 0, 40)
  tabBar.BackgroundTransparency = 1
  tabBar.Parent = panel

  local function makeTab(name, x)
    local btn = Instance.new("TextButton")
    btn.Name = name
    btn.Size = UDim2.new(0, 55, 1, 0)
    btn.Position = UDim2.new(0, x, 0, 0)
    btn.Text = name
    btn.BackgroundColor3 = Color3.fromRGB(12, 18, 28)
    btn.TextColor3 = Color3.fromRGB(200, 210, 230)
    btn.Font = Enum.Font.Gotham
    btn.TextSize = 12
    btn.Parent = tabBar
    return btn
  end

  makeTab("Inv", 0)
  makeTab("Craft", 58)
  makeTab("Shop", 116)
  makeTab("Vehicle", 174)
  makeTab("Base", 232)
  makeTab("Quest", 290)
  makeTab("Prog", 348)

  local content = Instance.new("Frame")
  content.Name = "Content"
  content.Size = UDim2.new(1, -16, 1, -78)
  content.Position = UDim2.new(0, 8, 0, 74)
  content.BackgroundTransparency = 1
  content.Parent = panel

  local function makeSection(name)
    local frame = Instance.new("Frame")
    frame.Name = name
    frame.Size = UDim2.new(1, 0, 1, 0)
    frame.BackgroundTransparency = 1
    frame.Visible = false
    frame.Parent = content
    return frame
  end

  local inv = makeSection("Inventory")
  local invList = Instance.new("ScrollingFrame")
  invList.Name = "List"
  invList.Size = UDim2.new(1, 0, 1, 0)
  invList.CanvasSize = UDim2.new(0, 0, 0, 0)
  invList.ScrollBarThickness = 6
  invList.BackgroundTransparency = 1
  invList.Parent = inv

  local invLayout = Instance.new("UIListLayout")
  invLayout.Padding = UDim.new(0, 6)
  invLayout.Parent = invList

  local craft = makeSection("Crafting")
  local craftList = Instance.new("ScrollingFrame")
  craftList.Name = "List"
  craftList.Size = UDim2.new(1, 0, 1, 0)
  craftList.CanvasSize = UDim2.new(0, 0, 0, 0)
  craftList.ScrollBarThickness = 6
  craftList.BackgroundTransparency = 1
  craftList.Parent = craft

  local craftLayout = Instance.new("UIListLayout")
  craftLayout.Padding = UDim.new(0, 6)
  craftLayout.Parent = craftList

  local shop = makeSection("Shop")
  local shopList = Instance.new("ScrollingFrame")
  shopList.Name = "List"
  shopList.Size = UDim2.new(1, 0, 1, 0)
  shopList.CanvasSize = UDim2.new(0, 0, 0, 0)
  shopList.ScrollBarThickness = 6
  shopList.BackgroundTransparency = 1
  shopList.Parent = shop

  local shopLayout = Instance.new("UIListLayout")
  shopLayout.Padding = UDim.new(0, 6)
  shopLayout.Parent = shopList

  local vehicle = makeSection("Vehicle")
  local vehicleList = Instance.new("ScrollingFrame")
  vehicleList.Name = "List"
  vehicleList.Size = UDim2.new(1, 0, 1, 0)
  vehicleList.CanvasSize = UDim2.new(0, 0, 0, 0)
  vehicleList.ScrollBarThickness = 6
  vehicleList.BackgroundTransparency = 1
  vehicleList.Parent = vehicle

  local vehicleLayout = Instance.new("UIListLayout")
  vehicleLayout.Padding = UDim.new(0, 6)
  vehicleLayout.Parent = vehicleList

  local base = makeSection("Base")
  local baseList = Instance.new("ScrollingFrame")
  baseList.Name = "List"
  baseList.Size = UDim2.new(1, 0, 1, 0)
  baseList.CanvasSize = UDim2.new(0, 0, 0, 0)
  baseList.ScrollBarThickness = 6
  baseList.BackgroundTransparency = 1
  baseList.Parent = base

  local baseLayout = Instance.new("UIListLayout")
  baseLayout.Padding = UDim.new(0, 6)
  baseLayout.Parent = baseList

  local quests = makeSection("Quests")
  local questList = Instance.new("ScrollingFrame")
  questList.Name = "List"
  questList.Size = UDim2.new(1, 0, 1, 0)
  questList.CanvasSize = UDim2.new(0, 0, 0, 0)
  questList.ScrollBarThickness = 6
  questList.BackgroundTransparency = 1
  questList.Parent = quests

  local questLayout = Instance.new("UIListLayout")
  questLayout.Padding = UDim.new(0, 6)
  questLayout.Parent = questList

  local prog = makeSection("Progression")
  local progLabel = Instance.new("TextLabel")
  progLabel.Name = "Label"
  progLabel.Size = UDim2.new(1, -8, 0, 26)
  progLabel.Position = UDim2.new(0, 4, 0, 0)
  progLabel.BackgroundColor3 = Color3.fromRGB(12, 18, 28)
  progLabel.TextColor3 = Color3.fromRGB(210, 220, 240)
  progLabel.Font = Enum.Font.Gotham
  progLabel.TextSize = 14
  progLabel.TextXAlignment = Enum.TextXAlignment.Left
  progLabel.Text = "Level: 1 | XP: 0"
  progLabel.Parent = prog

  return gui
end

local ui = ensureUI()
local stats = ui:WaitForChild("Stats")
local panel = ui:WaitForChild("Panel")
local content = panel:WaitForChild("Content")

local oxygenLabel = stats:WaitForChild("OxygenLabel")
local depthLabel = stats:WaitForChild("DepthLabel")
local lootLabel = stats:WaitForChild("LootLabel")
local statusLabel = stats:WaitForChild("StatusLabel")

local baseRotation = 0

local function showSection(name)
  for _, child in ipairs(content:GetChildren()) do
    if child:IsA("Frame") then
      child.Visible = (child.Name == name)
    end
  end
end

showSection("Inventory")

local tabBar = panel:WaitForChild("TabBar")
for _, btn in ipairs(tabBar:GetChildren()) do
  if btn:IsA("TextButton") then
    btn.MouseButton1Click:Connect(function()
      if btn.Name == "Inv" then showSection("Inventory") end
      if btn.Name == "Craft" then showSection("Crafting") end
      if btn.Name == "Shop" then showSection("Shop") end
      if btn.Name == "Vehicle" then showSection("Vehicle") end
      if btn.Name == "Base" then showSection("Base") end
      if btn.Name == "Quest" then showSection("Quests") end
      if btn.Name == "Prog" then showSection("Progression") end
    end)
  end
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
  if gameProcessed then return end
  if input.KeyCode == Enum.KeyCode.I then showSection("Inventory") end
  if input.KeyCode == Enum.KeyCode.K then showSection("Crafting") end
  if input.KeyCode == Enum.KeyCode.B then showSection("Shop") end
  if input.KeyCode == Enum.KeyCode.V then showSection("Vehicle") end
  if input.KeyCode == Enum.KeyCode.H then showSection("Base") end
  if input.KeyCode == Enum.KeyCode.Q then showSection("Quests") end
  if input.KeyCode == Enum.KeyCode.P then showSection("Progression") end
  if input.KeyCode == Enum.KeyCode.R then baseRotation = (baseRotation + 90) % 360 end
  if input.KeyCode == Enum.KeyCode.F then bossEvent:FireServer("HitBoss", { damage = 25 }) end
end)

local function clearList(frame)
  for _, child in ipairs(frame:GetChildren()) do
    if child:IsA("TextLabel") or child:IsA("TextButton") then
      child:Destroy()
    end
  end
end

local function resizeCanvas(frame)
  local layout = frame:FindFirstChildWhichIsA("UIListLayout")
  if layout then
    frame.CanvasSize = UDim2.new(0, 0, 0, layout.AbsoluteContentSize.Y + 6)
  end
end

local function makeRow(frame, text)
  local row = Instance.new("TextLabel")
  row.Size = UDim2.new(1, -8, 0, 26)
  row.BackgroundColor3 = Color3.fromRGB(12, 18, 28)
  row.TextColor3 = Color3.fromRGB(210, 220, 240)
  row.Font = Enum.Font.Gotham
  row.TextSize = 14
  row.TextXAlignment = Enum.TextXAlignment.Left
  row.Text = "  " .. text
  row.Parent = frame
  return row
end

local function makeButton(frame, text, onClick)
  local btn = Instance.new("TextButton")
  btn.Size = UDim2.new(1, -8, 0, 26)
  btn.BackgroundColor3 = Color3.fromRGB(18, 26, 38)
  btn.TextColor3 = Color3.fromRGB(200, 220, 240)
  btn.Font = Enum.Font.Gotham
  btn.TextSize = 14
  btn.TextXAlignment = Enum.TextXAlignment.Left
  btn.Text = "  " .. text
  btn.Parent = frame
  btn.MouseButton1Click:Connect(onClick)
  return btn
end

local function buildCraftingList()
  local list = content.Crafting.List
  clearList(list)
  for recipeId, recipe in pairs(CraftingRecipes) do
    makeButton(list, recipeId .. " → " .. recipe.output.item, function()
      craftingEvent:FireServer(recipeId)
    end)
  end
  resizeCanvas(list)
end

local function buildShopList()
  local list = content.Shop.List
  clearList(list)
  for key, id in pairs(Monetization.Gamepasses) do
    makeButton(list, "Gamepass: " .. key, function()
      shopEvent:FireServer("Buy", key)
    end)
  end
  for key, id in pairs(Monetization.Products) do
    makeButton(list, "Product: " .. key, function()
      shopEvent:FireServer("Buy", key)
    end)
  end
  resizeCanvas(list)
end

local function buildVehicleList()
  local list = content.Vehicle.List
  clearList(list)
  for key, data in pairs(Vehicles) do
    makeButton(list, data.displayName or key, function()
      vehicleEvent:FireServer("Spawn", key)
    end)
  end
  for upgradeId, _ in pairs(VehicleUpgrades) do
    makeButton(list, "Upgrade: " .. upgradeId, function()
      vehicleEvent:FireServer("Upgrade", upgradeId)
    end)
  end
  makeButton(list, "Despawn Vehicle", function()
    vehicleEvent:FireServer("Despawn")
  end)
  resizeCanvas(list)
end

local function buildBaseList()
  local list = content.Base.List
  clearList(list)
  for key, data in pairs(BaseData) do
    makeButton(list, "Place Base: " .. key, function()
      baseEvent:FireServer("PlaceBase", { plotId = "plot_1", tier = key })
    end)
  end
  for partType, _ in pairs(BaseParts) do
    makeButton(list, "Build: " .. partType, function()
      local char = player.Character
      if not char then return end
      local hrp = char:FindFirstChild("HumanoidRootPart")
      if not hrp then return end
      local pos = (hrp.CFrame * CFrame.new(0, 0, -10)).Position
      baseEvent:FireServer("PlacePart", { partType = partType, position = pos, rotation = baseRotation })
    end)
  end
  makeButton(list, "Open Storage", function()
    storageEvent:FireServer("Open")
  end)
  makeRow(list, "Storage")
  for item, qty in pairs(storageCache) do
    makeButton(list, "Withdraw " .. item .. " x" .. tostring(qty), function()
      storageEvent:FireServer("Withdraw", { item = item, count = 1 })
    end)
  end
  makeRow(list, "Deposit")
  for item, qty in pairs(inventoryCache) do
    makeButton(list, "Deposit " .. item .. " x" .. tostring(qty), function()
      storageEvent:FireServer("Deposit", { item = item, count = 1 })
    end)
  end
  makeRow(list, "Rotate build: press R")
  resizeCanvas(list)
end

buildCraftingList()
buildShopList()
buildVehicleList()
buildBaseList()

oxygenEvent.OnClientEvent:Connect(function(current, max, blackout)
  oxygenLabel.Text = string.format("O2: %d / %d", math.floor(current), max)
  if blackout then
    oxygenLabel.Text = "O2: 0 (Blackout!)"
  end
end)

depthEvent.OnClientEvent:Connect(function(depth, zoneId)
  depthLabel.Text = string.format("Depth: %dm (%s)", math.floor(depth), zoneId)
end)

lootEvent.OnClientEvent:Connect(function(payload)
  if not payload then return end
  lootLabel.Text = string.format("Loot: %s [%s]", payload.item or "?", payload.tier or "?")
end)

inventoryEvent.OnClientEvent:Connect(function(inv)
  local list = content.Inventory.List
  clearList(list)
  inventoryCache = inv or {}
  for item, qty in pairs(inv) do
    makeButton(list, "Sell " .. item .. " x" .. tostring(qty), function()
      economyEvent:FireServer("Sell", item, qty)
    end)
  end
  resizeCanvas(list)
  buildBaseList()
end)

questEvent.OnClientEvent:Connect(function(state)
  local list = content.Quests.List
  clearList(list)
  if state.daily then
    makeRow(list, "Daily")
    for _, q in ipairs(state.daily) do
      makeRow(list, q.desc)
    end
  end
  if state.weekly then
    makeRow(list, "Weekly")
    for _, q in ipairs(state.weekly) do
      makeRow(list, q.desc)
    end
  end
  if state.story then
    makeRow(list, "Story")
    for _, q in ipairs(state.story) do
      makeRow(list, q.desc)
    end
  end
  resizeCanvas(list)
end)

progressionEvent.OnClientEvent:Connect(function(data)
  local label = content.Progression.Label
  label.Text = string.format("Level: %d | XP: %d", data.level or 1, data.xp or 0)
end)

bossEvent.OnClientEvent:Connect(function(payload)
  if payload and payload.boss then
    statusLabel.Text = "Boss Active: " .. payload.boss.id
  elseif payload and payload.status == "defeated" then
    statusLabel.Text = "Boss Defeated"
  elseif payload and payload.status == "phase" then
    statusLabel.Text = "Boss Phase: " .. tostring(payload.phase)
  end
end)

shopEvent.OnClientEvent:Connect(function(payload)
  if payload and payload.error then
    statusLabel.Text = "Shop: " .. payload.error
  end
end)

economyEvent.OnClientEvent:Connect(function(payload)
  if payload and payload.ok then
    statusLabel.Text = "Sold for coins: " .. tostring(payload.coins or 0)
  elseif payload and payload.error then
    statusLabel.Text = "Sell failed: " .. payload.error
  end
end)

vehicleEvent.OnClientEvent:Connect(function(payload)
  if payload and payload.error then
    statusLabel.Text = "Vehicle: " .. payload.error
  end
end)

storageEvent.OnClientEvent:Connect(function(payload)
  if payload and payload.open then
    storageEvent:FireServer("Open")
    showSection("Base")
    return
  end

  if payload and payload.storage then
    storageCache = payload.storage or {}
    buildBaseList()
  end

  if payload and payload.error then
    statusLabel.Text = "Storage: " .. payload.error
  end
end)

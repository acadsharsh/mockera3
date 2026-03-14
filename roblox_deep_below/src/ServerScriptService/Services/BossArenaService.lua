-- BossArenaService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local BossArena = require(ReplicatedStorage.Modules.BossArena)
local Bosses = require(ReplicatedStorage.Modules.Bosses)

local bossEvent = ReplicatedStorage.Remotes:WaitForChild("BossEvent")

local BossArenaService = {}
local bossModel = nil
local bossHp = 0
local currentPhase = 1

local function spawnBoss()
  local bossInfo = Bosses.WeeklyRotation[1]
  if not bossInfo then return end

  if bossModel then bossModel:Destroy() end

  bossHp = bossInfo.hp
  currentPhase = 1
  bossModel = Instance.new("Part")
  bossModel.Name = "Boss_" .. bossInfo.id
  bossModel.Shape = Enum.PartType.Ball
  bossModel.Size = Vector3.new(20, 20, 20)
  bossModel.Anchored = true
  bossModel.Color = Color3.fromRGB(20, 10, 30)
  bossModel.Material = Enum.Material.Neon
  bossModel.Position = BossArena.SpawnPoint
  bossModel.Parent = workspace

  bossEvent:FireAllClients({ status = "spawn", boss = bossInfo, hp = bossHp })
end

local function damageBoss(player, amount)
  if not bossModel then return end
  local char = player.Character
  if not char then return end
  local hrp = char:FindFirstChild("HumanoidRootPart")
  if not hrp then return end

  local dist = (hrp.Position - bossModel.Position).Magnitude
  if dist > BossArena.Radius then return end

  bossHp = math.max(0, bossHp - (amount or 10))
  local phase = (bossHp <= 0) and 3 or (bossHp < 0.4 * Bosses.WeeklyRotation[1].hp and 3 or (bossHp < 0.7 * Bosses.WeeklyRotation[1].hp and 2 or 1))
  if phase ~= currentPhase then
    currentPhase = phase
    bossEvent:FireAllClients({ status = "phase", phase = currentPhase })
  end
  bossEvent:FireAllClients({ status = "hp", hp = bossHp })

  if bossHp <= 0 then
    bossModel:Destroy()
    bossModel = nil
    bossEvent:FireAllClients({ status = "defeated" })
  end
end

bossEvent.OnServerEvent:Connect(function(player, action, payload)
  if action == "HitBoss" then
    damageBoss(player, payload and payload.damage or 10)
  end
end)

task.spawn(function()
  while true do
    if bossModel then
      for _, player in ipairs(Players:GetPlayers()) do
        local char = player.Character
        if char then
          local hrp = char:FindFirstChild("HumanoidRootPart")
          local hum = char:FindFirstChildOfClass("Humanoid")
          if hrp and hum then
            local dist = (hrp.Position - bossModel.Position).Magnitude
            if dist <= BossArena.Radius then
              local dmg = currentPhase == 1 and 5 or currentPhase == 2 and 8 or 12
              hum:TakeDamage(dmg)
            end
          end
        end
      end
    end
    task.wait(2.5)
  end
end)

Players.PlayerAdded:Connect(function()
  task.delay(2, function()
    if not bossModel then
      spawnBoss()
    end
  end)
end)

return BossArenaService

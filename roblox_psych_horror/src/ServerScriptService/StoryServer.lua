-- StoryServer.lua
-- Handles story progression and zone triggers.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local function ensureFolder(parent, name)
  local folder = parent:FindFirstChild(name)
  if not folder then
    folder = Instance.new("Folder")
    folder.Name = name
    folder.Parent = parent
  end
  return folder
end

local function ensureRemote(parent, name)
  local remote = parent:FindFirstChild(name)
  if not remote then
    remote = Instance.new("RemoteEvent")
    remote.Name = name
    remote.Parent = parent
  end
  return remote
end

local remotesFolder = ensureFolder(ReplicatedStorage, "Remotes")
local dialogEvent = ensureRemote(remotesFolder, "DialogEvent")
local chapterEvent = ensureRemote(remotesFolder, "ChapterEvent")
local jumpscareEvent = ensureRemote(remotesFolder, "JumpscareEvent")

local storyData = require(ReplicatedStorage:WaitForChild("StoryData"))

local function fireDialog(player, dialogId)
  local dialog = storyData.Dialogs[dialogId]
  if dialog then
    dialogEvent:FireClient(player, dialog, dialogId)
  end
end

local function fireChapter(player, chapterId)
  local chapter = storyData.Chapters[chapterId]
  if chapter then
    chapterEvent:FireClient(player, chapter, chapterId)
  end
end

local function fireJumpscare(player, jumpscareId)
  local jumpscare = storyData.Jumpscares[jumpscareId]
  if jumpscare then
    jumpscareEvent:FireClient(player, jumpscare, jumpscareId)
  end
end

local function triggerZone(player, zone)
  if not player then return end
  if zone:GetAttribute("OneShot") and zone:GetAttribute("Triggered") then
    return
  end

  local dialogId = zone:GetAttribute("DialogId")
  local chapterId = zone:GetAttribute("ChapterId")
  local jumpscareId = zone:GetAttribute("JumpscareId")

  if chapterId and chapterId ~= "" then
    fireChapter(player, chapterId)
  end

  if dialogId and dialogId ~= "" then
    fireDialog(player, dialogId)
  end

  if jumpscareId and jumpscareId ~= "" then
    fireJumpscare(player, jumpscareId)
  end

  if zone:GetAttribute("OneShot") then
    zone:SetAttribute("Triggered", true)
  end
end

local function bindZone(zone)
  if not zone:IsA("BasePart") then return end

  if zone:GetAttribute("OneShot") == nil then
    zone:SetAttribute("OneShot", true)
  end

  local prompt = zone:FindFirstChildWhichIsA("ProximityPrompt")
  if prompt then
    prompt.Triggered:Connect(function(player)
      triggerZone(player, zone)
    end)
    return
  end

  zone.Touched:Connect(function(hit)
    local character = hit.Parent
    if not character then return end
    local player = Players:GetPlayerFromCharacter(character)
    if not player then return end
    triggerZone(player, zone)
  end)
end

local function bindAllZones()
  local zonesFolder = workspace:FindFirstChild("StoryZones")
  if not zonesFolder then return end

  for _, zone in ipairs(zonesFolder:GetDescendants()) do
    if zone:IsA("BasePart") then
      bindZone(zone)
    end
  end

  zonesFolder.DescendantAdded:Connect(function(child)
    if child:IsA("BasePart") then
      bindZone(child)
    end
  end)
end

Players.PlayerAdded:Connect(function(player)
  task.wait(1)
  fireChapter(player, "prologue")
  fireDialog(player, "intro")
end)

bindAllZones()

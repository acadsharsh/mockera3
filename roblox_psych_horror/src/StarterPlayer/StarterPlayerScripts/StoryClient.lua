-- StoryClient.lua
-- Handles UI, dialog display, atmosphere changes, and jump-scares.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local dialogEvent = remotes:WaitForChild("DialogEvent")
local chapterEvent = remotes:WaitForChild("ChapterEvent")
local jumpscareEvent = remotes:WaitForChild("JumpscareEvent")

-- UI
local function ensureUI()
  local existing = playerGui:FindFirstChild("StoryUI")
  if existing then return existing end

  local screenGui = Instance.new("ScreenGui")
  screenGui.Name = "StoryUI"
  screenGui.ResetOnSpawn = false
  screenGui.IgnoreGuiInset = true
  screenGui.Parent = playerGui

  local frame = Instance.new("Frame")
  frame.Name = "DialogFrame"
  frame.AnchorPoint = Vector2.new(0.5, 1)
  frame.Position = UDim2.new(0.5, 0, 1, -20)
  frame.Size = UDim2.new(0.9, 0, 0, 140)
  frame.BackgroundColor3 = Color3.fromRGB(5, 5, 7)
  frame.BackgroundTransparency = 0.1
  frame.BorderSizePixel = 0
  frame.Parent = screenGui

  local speaker = Instance.new("TextLabel")
  speaker.Name = "Speaker"
  speaker.Size = UDim2.new(1, -24, 0, 28)
  speaker.Position = UDim2.new(0, 12, 0, 10)
  speaker.BackgroundTransparency = 1
  speaker.TextXAlignment = Enum.TextXAlignment.Left
  speaker.TextColor3 = Color3.fromRGB(220, 220, 235)
  speaker.Font = Enum.Font.GothamBold
  speaker.TextSize = 18
  speaker.Parent = frame

  local body = Instance.new("TextLabel")
  body.Name = "Body"
  body.Size = UDim2.new(1, -24, 0, 90)
  body.Position = UDim2.new(0, 12, 0, 40)
  body.BackgroundTransparency = 1
  body.TextXAlignment = Enum.TextXAlignment.Left
  body.TextYAlignment = Enum.TextYAlignment.Top
  body.TextColor3 = Color3.fromRGB(210, 210, 220)
  body.Font = Enum.Font.Gotham
  body.TextSize = 18
  body.TextWrapped = true
  body.Parent = frame

  return screenGui
end

local ui = ensureUI()
local dialogFrame = ui:WaitForChild("DialogFrame")
local speakerLabel = dialogFrame:WaitForChild("Speaker")
local bodyLabel = dialogFrame:WaitForChild("Body")

local advanceRequested = false
UserInputService.InputBegan:Connect(function(input, gameProcessed)
  if gameProcessed then return end
  if input.UserInputType == Enum.UserInputType.MouseButton1 then
    advanceRequested = true
  elseif input.KeyCode == Enum.KeyCode.E or input.KeyCode == Enum.KeyCode.Space or input.KeyCode == Enum.KeyCode.Return then
    advanceRequested = true
  end
end)

local function waitForAdvance(timeout)
  local start = os.clock()
  while true do
    if advanceRequested then
      advanceRequested = false
      return true
    end
    if timeout and (os.clock() - start) >= timeout then
      return false
    end
    RunService.Heartbeat:Wait()
  end
end

local function typeText(text)
  bodyLabel.Text = ""
  for i = 1, #text do
    if advanceRequested then
      advanceRequested = false
      bodyLabel.Text = text
      return
    end
    bodyLabel.Text = string.sub(text, 1, i)
    task.wait(0.02)
  end
end

local function showDialog(dialog)
  dialogFrame.Visible = true
  for _, line in ipairs(dialog) do
    local speaker = line.speaker or ""
    local text = line.text or tostring(line)
    local waitTime = line.wait or 1.0

    speakerLabel.Text = speaker
    typeText(text)
    waitForAdvance(waitTime)
  end
  dialogFrame.Visible = false
end

-- Lighting and atmosphere
local function getOrCreateColorCorrection()
  local cc = Lighting:FindFirstChild("StoryColorCorrection")
  if not cc then
    cc = Instance.new("ColorCorrectionEffect")
    cc.Name = "StoryColorCorrection"
    cc.Parent = Lighting
  end
  return cc
end

local function applyChapter(chapter)
  if not chapter or not chapter.Lighting then return end

  local info = TweenInfo.new(1.6, Enum.EasingStyle.Sine, Enum.EasingDirection.Out)
  local lighting = chapter.Lighting

  TweenService:Create(Lighting, info, {
    Ambient = lighting.Ambient,
    OutdoorAmbient = lighting.OutdoorAmbient,
    FogColor = lighting.FogColor,
    FogStart = lighting.FogStart,
    FogEnd = lighting.FogEnd,
    Brightness = lighting.Brightness,
    ClockTime = lighting.ClockTime,
    ExposureCompensation = lighting.ExposureCompensation,
  }):Play()

  if chapter.Tone then
    local cc = getOrCreateColorCorrection()
    TweenService:Create(cc, info, {
      Saturation = chapter.Tone.Saturation,
      Contrast = chapter.Tone.Contrast,
      TintColor = chapter.Tone.TintColor,
    }):Play()
  end
end

-- Jumpscare
local function doJumpscare(jumpscare)
  if not jumpscare then return end

  local screen = ui
  local image = Instance.new("ImageLabel")
  image.Name = "Jumpscare"
  image.BackgroundTransparency = 1
  image.Size = UDim2.new(1, 0, 1, 0)
  image.Image = jumpscare.imageId or ""
  image.ImageTransparency = 1
  image.Parent = screen

  local sound = Instance.new("Sound")
  sound.SoundId = jumpscare.soundId or ""
  sound.Volume = 0.7
  sound.Parent = workspace
  sound:Play()

  local info = TweenInfo.new(0.1, Enum.EasingStyle.Linear, Enum.EasingDirection.Out)
  TweenService:Create(image, info, { ImageTransparency = 0 }):Play()
  task.wait(jumpscare.duration or 1.0)
  TweenService:Create(image, info, { ImageTransparency = 1 }):Play()
  task.wait(0.15)

  image:Destroy()
  sound:Destroy()
end

-- Sanity effect
local sanity = 0
local baseFov = 70

RunService.RenderStepped:Connect(function(dt)
  local darkness = math.clamp(1 - Lighting.Brightness, 0, 1)
  if darkness > 0.2 then
    sanity = math.clamp(sanity + dt * darkness * 0.06, 0, 1)
  else
    sanity = math.clamp(sanity - dt * 0.1, 0, 1)
  end

  local camera = workspace.CurrentCamera
  if camera then
    local wobble = math.sin(os.clock() * 2.5) * sanity * 2
    camera.FieldOfView = baseFov + wobble
  end

  local cc = getOrCreateColorCorrection()
  cc.Saturation = -0.2 - (sanity * 0.4)
  cc.Contrast = 0.1 + (sanity * 0.2)
end)

-- Remote hooks
chapterEvent.OnClientEvent:Connect(function(chapter)
  applyChapter(chapter)
end)

dialogEvent.OnClientEvent:Connect(function(dialog)
  showDialog(dialog)
end)

jumpscareEvent.OnClientEvent:Connect(function(jumpscare)
  doJumpscare(jumpscare)
end)

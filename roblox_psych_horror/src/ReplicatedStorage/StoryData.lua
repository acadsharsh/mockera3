-- StoryData.lua
-- Central data for dialogs, chapters, and jumpscares.

local StoryData = {}

StoryData.Chapters = {
  prologue = {
    Lighting = {
      Ambient = Color3.fromRGB(40, 40, 45),
      OutdoorAmbient = Color3.fromRGB(20, 20, 25),
      FogColor = Color3.fromRGB(15, 15, 20),
      FogStart = 0,
      FogEnd = 120,
      Brightness = 1.0,
      ClockTime = 1.5,
      ExposureCompensation = -0.2,
    },
    Tone = { Saturation = -0.2, Contrast = 0.1, TintColor = Color3.fromRGB(200, 200, 215) },
  },
  act1 = {
    Lighting = {
      Ambient = Color3.fromRGB(30, 30, 35),
      OutdoorAmbient = Color3.fromRGB(15, 15, 20),
      FogColor = Color3.fromRGB(10, 10, 14),
      FogStart = 0,
      FogEnd = 95,
      Brightness = 0.9,
      ClockTime = 2.2,
      ExposureCompensation = -0.3,
    },
    Tone = { Saturation = -0.35, Contrast = 0.2, TintColor = Color3.fromRGB(185, 190, 210) },
  },
  act2 = {
    Lighting = {
      Ambient = Color3.fromRGB(20, 20, 25),
      OutdoorAmbient = Color3.fromRGB(10, 10, 12),
      FogColor = Color3.fromRGB(8, 8, 10),
      FogStart = 0,
      FogEnd = 80,
      Brightness = 0.7,
      ClockTime = 3.1,
      ExposureCompensation = -0.4,
    },
    Tone = { Saturation = -0.45, Contrast = 0.25, TintColor = Color3.fromRGB(170, 175, 200) },
  },
  act3 = {
    Lighting = {
      Ambient = Color3.fromRGB(15, 15, 18),
      OutdoorAmbient = Color3.fromRGB(8, 8, 10),
      FogColor = Color3.fromRGB(6, 6, 8),
      FogStart = 0,
      FogEnd = 70,
      Brightness = 0.6,
      ClockTime = 4.0,
      ExposureCompensation = -0.5,
    },
    Tone = { Saturation = -0.6, Contrast = 0.3, TintColor = Color3.fromRGB(155, 165, 190) },
  },
}

StoryData.Dialogs = {
  intro = {
    { speaker = "YOU", text = "The door won't open. It never does.", wait = 1.2 },
    { speaker = "YOU", text = "I remember the hallway... but not how I got here.", wait = 1.0 },
    { speaker = "WHISPER", text = "You left something behind.", wait = 1.0 },
  },
  mirror = {
    { speaker = "YOU", text = "The mirror is fogged from the inside.", wait = 1.0 },
    { speaker = "YOU", text = "I wipe it... and it wipes back.", wait = 1.0 },
    { speaker = "WHISPER", text = "Look closer.", wait = 0.8 },
  },
  hallway = {
    { speaker = "YOU", text = "This hallway keeps folding into itself.", wait = 1.0 },
    { speaker = "YOU", text = "The walls are the same, but the memories aren't.", wait = 1.0 },
    { speaker = "WHISPER", text = "You're not lost. You're being looped.", wait = 1.0 },
  },
  reveal = {
    { speaker = "YOU", text = "The bedroom is colder than I remember.", wait = 1.0 },
    { speaker = "YOU", text = "I wrote this note... why can't I read it?", wait = 1.0 },
    { speaker = "NOTE", text = "You kept the key, but not the memory.", wait = 1.2 },
    { speaker = "WHISPER", text = "It was always you.", wait = 1.2 },
  },
}

StoryData.Jumpscares = {
  mirror_flash = {
    imageId = "rbxassetid://0",
    soundId = "rbxassetid://0",
    duration = 1.1,
  },
  shadow_blink = {
    imageId = "rbxassetid://0",
    soundId = "rbxassetid://0",
    duration = 0.9,
  },
}

return StoryData

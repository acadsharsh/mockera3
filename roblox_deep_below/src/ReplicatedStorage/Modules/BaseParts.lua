-- BaseParts.lua

local BaseParts = {
  Floor = { size = Vector3.new(8, 1, 8), cost = { Scrap = 6 } },
  Wall = { size = Vector3.new(8, 6, 1), cost = { Scrap = 4 } },
  Door = { size = Vector3.new(4, 6, 1), cost = { Scrap = 8, ["Coral Chunk"] = 2 } },
  Storage = { size = Vector3.new(4, 4, 4), cost = { Scrap = 10, ["Old Compass"] = 1 } },
  O2Station = { size = Vector3.new(4, 5, 4), cost = { Scrap = 12, Pearl = 2 } },
}

return BaseParts

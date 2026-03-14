-- ShopService.lua

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local shopEvent = ReplicatedStorage.Remotes:WaitForChild("ShopEvent")

local ShopService = {}

shopEvent.OnServerEvent:Connect(function(player, action, itemId)
  -- Stub: integrate with MarketplaceService for real purchases
  if action == "Preview" then
    shopEvent:FireClient(player, { ok = true, itemId = itemId })
    return
  end

  if action == "Buy" then
    shopEvent:FireClient(player, { ok = false, error = "not_implemented" })
    return
  end
end)

return ShopService

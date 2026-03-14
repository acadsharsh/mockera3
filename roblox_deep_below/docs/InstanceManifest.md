# Instance Manifest

## ReplicatedStorage
- Folder `Remotes`
  - RemoteEvent `OxygenEvent`
  - RemoteEvent `LightEvent`
  - RemoteEvent `LootEvent`
  - RemoteEvent `DepthEvent`
  - RemoteEvent `BaseEvent`
  - RemoteEvent `ShopEvent`
  - RemoteEvent `InventoryEvent`
  - RemoteEvent `CraftingEvent`
  - RemoteEvent `VehicleEvent`
  - RemoteEvent `QuestEvent`
  - RemoteEvent `ProgressionEvent`
  - RemoteEvent `BossEvent`
  - RemoteEvent `CreatureEvent`
  - RemoteEvent `EconomyEvent`
  - RemoteEvent `StorageEvent`
- Folder `Modules`
  - ModuleScript `Config`
  - ModuleScript `Zones`
  - ModuleScript `LootTables`
  - ModuleScript `Items`
  - ModuleScript `Monetization`
  - ModuleScript `BaseData`
  - ModuleScript `Vehicles`
  - ModuleScript `CraftingRecipes`
  - ModuleScript `Progression`
  - ModuleScript `Quests`
  - ModuleScript `Creatures`
  - ModuleScript `Bosses`
  - ModuleScript `Economy`
  - ModuleScript `ZoneContent`
  - ModuleScript `BaseParts`
  - ModuleScript `VehicleUpgrades`
  - ModuleScript `BossArena`

## ServerScriptService
- Folder `Services`
  - Script `PlayerService`
  - Script `OxygenService`
  - Script `LootService`
  - Script `DepthService`
  - Script `BaseService`
  - Script `InventoryService`
  - Script `CraftingService`
  - Script `VehicleService`
  - Script `ShopService`
  - Script `ProgressionService`
  - Script `QuestService`
  - Script `EconomyService`
  - Script `CreatureService`
  - Script `BossService`
  - Script `BaseBuildService`
  - Script `VehicleUpgradeService`
  - Script `BossArenaService`
  - Script `StorageService`
- Folder `Systems`
  - Script `ZoneSystem`
  - Script `CreatureSpawner`
- Script `MainServer`

## StarterPlayer
- StarterPlayerScripts
  - LocalScript `HUDClient`
  - LocalScript `LightClient`
  - LocalScript `DepthClient`

## StarterGui
- ScreenGui `HUD` (optional; auto-created if missing)

## Workspace
- Folder `Zones`
  - Parts or invisible trigger volumes with attributes:
    - `ZoneId` (string) e.g., `shallow`, `reef`, `twilight`, `abyss`, `void`
- Folder `LootSpawns`
  - Parts with attributes:
    - `LootTier` (string)
- Folder `BasePlots` (optional; base building slots)
  - Parts with attributes:
    - `PlotId` (string) e.g., `plot_1`
## ServerScriptService/Systems
- Script `WorldGen` (optional world scaffolding)

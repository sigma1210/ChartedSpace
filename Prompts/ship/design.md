# ship plugin design overview


## Single ship or multiple ships?
    For first pass, should the player own exactly one active ship, or should the plugin model multiple owned ships from the beginning with one selected active ship?
  ### players should be able to own many ships with one active - 



## What replaces the mock immediately?
  Is the first goal simply: navigation asks the ship plugin for jumpRating, fuel capacity/cost rules, and current ship identity?
 
### we want the plugin to provide all the curent functionality as the mock ship 


## What should the first Ship HUD show?
  ### to start we just need a hud that can set the jump rating - basically the mocks hud - 

I would suggest: ship name, type, jump rating, mortgage status, current world, cargo capacity, fuel status, and maintenance condition. But you should decide the first screen.
  ### we do not need any thing more then the current screen that allows the user to set the shups jump rating -  


## Should ship state live in plugin private state or database-backed API state?

    My instinct: database is source of truth for actual ship ownership, mortgage, cargo, and current world; plugin store can cache UI/session state.

### this will all be stored in DB - 

## What is the relationship between ship plugin and economy plugin?
    For mortgage payments, ship purchase, ship sale, maintenance, and fuel, should ship plugin request debits/credits through economy plugin rather than mutating wallet directly?
### yes economy will control wallet mutation and it will also handle credit calculations when money needs to be borrowed and it will track debt.  

 
## What is the relationship between ship plugin and trade plugin?
  ### the ship keeps track of cargo capacity and the curremt cargo - the trade plugin allows the cargo to be purchased and sold - 

    Should ship plugin own cargo hold inventory/capacity, while trade plugin handles market actions and asks ship plugin “can load this cargo?”




## Should ship plugin own fuel?
    Navigation calculates attempted jump distance, but ship plugin may know fuel capacity, current fuel, and whether enough fuel exists. Economy may only handle cost.
### yes ships should be able handle the fuel - economy the cost


## Do we keep mortgage as part of ship plugin?

I think yes: economy moves credits, but ship plugin owns the mortgage balance, monthly mortgage amount, and payment state.
### no the ship uses the economy plugin for all these 

What is the first real ship source?
Should the plugin start from existing Ship database records and src/data/classic/ships.json, or should we define a new ship schema/API contract first?

### we can define ships in json files to start but eventually we will enable users to design their own ships



What must be true before removing the mock?
My guess: navigation must get jump rating from ship plugin through a ship provider registry/API, with no code checking whether the provider is mock or real.

### i think the first step is stop calling the mock a mock - if we start treating it like the ship plugin - the ability to set jump rating via the hud is just a developmnet tool that allows us to alter the jump rating 


## ciodex to reg
I read Prompts/ship/design.md. The direction is clear: the current “mock ship” should become the first version of the real Ship plugin, and its jump-rating HUD is a development control, not a fake system.

Before implementation, I only have a few real questions:

Plugin identity
Should we rename the plugin IDs/state keys now from mockShip / core.mockShip to ship / core.ship, even if the first HUD still only edits jump rating?
My recommendation: yes. This matches your point that core/navigation should stop thinking of it as mock.

### yes rename so it clear its not a mock

State ownership in first pass
The current HUD writes both:

plugin state: plugins.mockShip.lastMockedJumpRating
core state: ship.ship.jumpRating via setShipJumpRating
For the first “real ship plugin” pass, should the plugin still write to core ship state as a temporary bridge, or should it only expose capability through the ship provider registry?
My recommendation: keep the bridge for one pass, but rename it as a development override, not mock state.

### keep the bridge for the foirst pass

Development jump override
Should the jump-rating control represent:

the active ship’s actual jumpRating, or
a temporary development override layered over the DB ship?
Based on your design note, I think it should be a development override for now. The DB remains the real long-term source, but the HUD can override jump rating while we test navigation.

### this is a local development override 


Multiple ships
DB currently has Ship.userId @unique, which enforces one ship per user. Since you want many ships with one active, do we postpone schema changes until after the plugin shell is renamed, or do we include the schema concept now?
My recommendation: postpone schema changes. First pass is identity cleanup and provider boundary.
### tyes postpone til later

Name of first HUD
Should the HUD title be something like Ship Systems or Ship Control instead of Mock Ship?
My recommendation: Ship Systems, with the current jump selector inside it.

### just "Ship"  


My suggested first pass:

Rename src/plugins/mockShip to src/plugins/ship.
Rename plugin ID/state key/HUD ID from mock language to ship language.
Rename state field from lastMockedJumpRating to something like developmentJumpRatingOverride.
Rename HUD title from Mock Ship to Ship Systems.
Keep current behavior: selecting jump rating updates navigation capability.
Update tests/imports to use the new real ship plugin naming.
Do not change DB schema yet.
Do not add buying/selling/mortgage/cargo UI yet.
## agreed



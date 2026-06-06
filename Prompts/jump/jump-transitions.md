# Jump transitions
    How do we transition a user in and out  of warp


For the transition, I think we should treat jump as a three-stage scene state:

Origin system
User is viewing the current system normally.

Jump space

User triggers jump, the view collapses into a spatial rupture/tunnel. During this phase we can prefetch/generate/cache the destination system, map texture, system data, sector data, crew updates, whatever we need.

Destination system
The tunnel opens out into the new system view once the ship has completed the jump/proceed step.

## codex question to REG

1 My first questions:

  Should the jump transition be tied to the existing Traveller turn mechanics?
### yes - 

Meaning: after the Jump Drive Check succeeds, the system view enters “jump space” and stays there until the user presses Proceed, or until the next turn is advanced.

### this will generate more questions but lets kep this part as simple as possible until needed. the proceed button was meant as a place holder for a random event handling system - Proceed was meant to hold the place of No event occurred and the jump could proceed - the current turn indicator was written as a way to see that so event could happen during jump - future event may be encounters with of freindly or hostile ships after jump - or perhaps a misjump to the wrong system. 


While the ship is in_jump, should /map/system render no real system at all?

### yes while in jump the ship actually exists another dimension - the users should appear to me falling through a tunnel. there are threeJs examples of this type of view- 


My instinct: yes. It should render a dedicated “jump space” scene, because the ship is no longer in the origin system and not yet in the destination system.
### agreed - 

Should the destination system be visible only after Proceed, or should the player see hints of it inside the tunnel?
### as discussed Proceed was a place holder for nothing happens - if nothing happens occered the user automatically proceeds to the destinatin- however there should always be a timed transition. but if there is an event the supercedes proceed - we need to discuss how the transition occurs - a misjump could me the user leaves warp in the original system - or an unexpected system - but the system needs to flexible enough that the event handles how the transition ends   


Example: at the end of jump space, the tunnel opens and the destination star grows into view.
### yes - this is an excellent example of a jump where no event occured - its the happy path



Do you want the transition to be interactive?
For a first pass, I would keep camera controls limited or disabled in jump space, but allow HUDs. Later we could let the player look around inside the tunnel.
### yes agreed - but there may be limits on which huds are available - the users will not be able to communicate while in jump


Should jump space be deterministic per jump?
For example Regina to Ruie always produces a similar tunnel color/noise pattern based on origin, destination, and turn. That would make it feel procedural but stable.
### yes - but events could cause changes in the trasitions 


How long should the visual transition take?
I imagine:

enter rupture: 2-4 seconds
jump tunnel idle loop: indefinite while ship is in_jump
exit tunnel: 2-4 seconds after Proceed
Should the “Proceed” action happen before or after the exit animation?
I’d suggest: user clicks Proceed, we prefetch destination if needed, play exit tunnel, then advance turn/update ship, then reveal destination system.

### jumping should be thoght of as a workflow with lifecycle hooks. we should discuss what these hooks should be. this could be extended to handle other turn changing lifecycles sice in the future we want to hook random events in to turns while users remain on planet - but this is a discussion for a future date - for now understand that turn will have hooks 


What tone should jump space have?
### i think you answered your own question by presending options. it should be theme and style driven.

More classic Traveller instrument-panel weirdness, more cinematic sci-fi tunnel, more abstract 1970s vector graphics, or more eerie physics anomaly?


## codex questions REG round 2


When the Jump Drive Check succeeds, should the app immediately advance the turn and set ship.status = "in_jump" before the enter animation plays, or should the enter animation play first and only then persist in_jump?

### animation first then im-jump 

Should /map/system show the origin system during the enter rupture, then switch to JumpSpaceView after the tunnel swallows the camera?

### yes - but honestly there is a lot of room here for misunderstanding

While ship.status === "in_jump", should the user still be able to leave /map/system and view the sector map, or should navigation be restricted until jump resolves?

### yes they should - we will be remove a lot of the current functionaility on the map in the future - after we provide huds in the system view. 


For the happy path, should “Proceed” remain a visible button for now, or should jump auto-resolve after a short timed loop until we implement real events?
 
 ### Proceed was a clumsy mechanic whoses sole prurpose was to allow me to test jump transition - lets stop focusing in it - it was just a step to get us to where we are now- The proceed occurs when the game is ready to for it to proceed - if multi - player is hooked up - yje user may remain in warp until all other playes proceed  


When an event happens during jump, should the jump tunnel remain the background scene while an event HUD appears, or should events get their own scene/state?

### the event should control the end transition - and yes they will have their own scenes - their scenes may need to know system information to render- for example - A piracy event may use either the source or destination system to form the background for a space battle - giving the event handler this responsibility allows great flexibility -  


Should the destination prefetch happen when entering jump, while already in jump, or only when resolving the jump?
My preference: start prefetch as soon as destination is known and jump succeeds.
### allways get the data as soon as you know you will need it. so I would get the data - before i know the jump succeeds.  



Should the jump transition controller live beside the hook we just made, or should we split it into two concepts:
useJumpTurnController for turn/business logic, and useJumpSceneController for visual lifecycle?

### uncertain we need to discuss bnefits

Do you want failed navigation / failed drive checks to have visual feedback in the system view too?
### yes - i envision some types of systems specific huds that can notify the user of events - perhaps a event log - that - these will be discussed later

Example: rupture starts forming, collapses, ship remains in origin system.
### yes that sound like what would happen in a failed jump

For misjump support later, should the workflow allow the destination to be replaced after the ship is already in_jump?
### yes -

Should jump tunnel visuals be style-resource-pack driven from day one, or should first pass hardcode a default tunnel and leave a clean style config slot?
### hard code a default style then work out what we need to style

What should happen to normal HUDs while in jump?
My current thought: keep ship/turn/jump HUD, hide communication/map/minimap HUDs, maybe show destination/status if known.

### we let the user decide which huds are displayed, they should remain in place as the user left them - they just may not be able to recieve or sent new information - the transitions are external to the hud - you may have questions   


Should the player see the destination name during jump, or should that be hidden until exit?
For normal jumps it might be okay; for misjumps we probably should be careful.
### players should only discover where the jump actual lands when they exit jump - they should immediately be able to identify a system they land 




Is “jump space” supposed to feel like ship cockpit view, external camera view, or abstract scene with HUD overlay?
This affects whether the tunnel surrounds the camera or surrounds a visible ship model.
### the hud is part of the ship - and the system and waro view are the external camera view 


### codex asks reg

Persisting in_jump
 You said “animation first then in_jump.” Should the app block navigation/action during that enter animation, since the database still says the ship is docked until the animation completes?

 ### i dont think i am on the same page with you on this- i think you are make more assumptions and we should review the workflow for jumping - many assumpytion are coming from the prototype - that was a prototype simple made to see a ship move from place to place - we are trying to develope a new work flow that fits 


Map page during enter animation
If a user triggers jump from the map page, should the app automatically route them to /map/system to show the origin rupture animation?
### do worry about the map page - it was a prototype that - most functionality will be deprecated after we replicated it in the system view - i want you to stop being distracted by the current map implemention - we will take about reworking it later - after we get things working through the system view


Leaving /map/system while in jump
If the user goes back to the map while ship.status === "in_jump", should the map show their ship at the origin world, destination world, or a special “in jump” state with no exact location?

### the map always shows last known location - the an new known location is not esatblished until the user leaves warp - 


Known intended destination vs actual arrival
I think we need two concepts:

### not 2 concepts - we just dont let the user known intil they leave warp - keep it simple

intendedDestination: what the ship is trying to reach
resolvedDestination: where the ship actually exits
Does that match your thinking?
Should intended destination be hidden in UI?
The player selected Ruie, so they know the intended destination. But during jump, should HUDs say “Jumping to Ruie” or only “Jump in progress”?
### see how hard you are making it - all they know is where they told the ship to go - they will only know the destination they go to - it is only when after they arrive that discover the true destination - there may be warnings taht something wrong during jump.   


Who decides the resolved destination?
Should the server decide where the jump exits at the moment jump begins, or later when the jump resolves?
My instinct: later, because jump events/misjumps may alter it.
### the point is the event will hanle how jump resolve - a nothing happen evet is just the jump resolving normal - other events may have different resolution - perhaps an event traps them warp by some unknow device until they make a series of skill rolls todiscover how it functions so thay can proceed. But for know let concern ourselves with the happy path -  

Workflow hook shape
I see benefits in splitting:

useJumpTurnController: rolls, turn advance, ship state, event outcomes
useJumpSceneController: enter/tunnel/exit animation phases
This keeps database/game rules separate from Three.js timing. Does that separation feel right, or do you want one orchestrator hook that owns both?
Prefetch timing

### we need to think about how events will subscribe to and effect these work flows

You said prefetch as soon as we know we may need it, before success. Should opening the jump range modal prefetch nearby reachable systems, or should selecting a destination prefetch only that destination?

### prefetch only the destination - if an event occurs that requires a new location prefectch when it is know - the animation cycle should take longer than any data fetch. 

Failed jump visual
If navigation/drive fails on the map page, do we need a small failed-transition overlay there too, or only once jumping is available in /map/system?

### there should be HUD that indications a jump failure 

Event scenes

Should event scenes be allowed to replace jump tunnel entirely, or should they be layered over it until they resolve?

### event should control how the tunnel transitions - we can consider the noEvent Event to handle the transition in to the destination world - other events map with to define other destination to trsbitin to - or perhaps they block the normal transition until they are resolved

HUD continuity
If HUDs stay where the user left them, should their positions be global across system/jump/event scenes, or can each scene maintain its own positions?
### yes



First implementation
For phase 1, would you accept:

no event system yet
### yes event system one event that tranistions in to destination system 


hardcoded tunnel
automatic route to /map/system after successful jump
ship.status = "in_jump" after enter animation
while in_jump, render JumpSpaceView
a temporary “Resolve Jump”/“Continue” HUD action to trigger exit into destination

### lets have a further discusions 


### codex's. updated quuestion to reg

New questions, from that better frame:

What is the canonical first action in the system view?
Should the user select a destination from a HUD inside /map/system, replacing the map-page Jump Range modal?

### we will need a navigation hud in the system view that can show the worlds a user can jump to - the hud will allow the to set the destination- This is the intended destination - once a destination is set - it must first be plotted - this is the navigation skill roll used in the the navigation skill check. Failing to plot prevents a player from executing the Jump - the navigation fails before it occurs - Once plotted a user is no allow to excute a jump - this will immediately start the animation sequence - if the jump drive fails - the animation ends in the current system - if the navigation roll succeeds - the jump proceeds to the event systems - we could consider this to be another type of event. and we consider adding three know events - normal jump which ends its tranition in the intended system, a failed jump which ends its transition in the current system - or a miss jump which ends it transtion in a another system. 





Should jump destination selection itself become a HUD scene/tool?
For example: open a navigational HUD, select a reachable world, confirm plotted course.
## yes see above

Should the jump workflow be modeled as named phases like:

selectDestination -> prefetchDestination -> plotCourse -> chargeDrive -> enterJump -> inJump -> resolveJumpEvent -> exitJump -> arrived

Are plotCourse and chargeDrive part of the same workflow as the visual transition, or should they happen before the visual transition begins?

### plotcource is a prejump event - it must be successful before jump can proceed. the Drive attempt occurs after the jump is attempted - as disscussed above 

When you say “animation first then in_jump,” do you mean:

visually show the ship entering jump,
then persist ship.status = "in_jump",
then render the jump tunnel idle state?
Should failed navigation/drive checks occur before the rupture opens, or can the rupture partially form and collapse?
### partially forme and collapse - 

Should the no-event happy path be represented as an explicit internal event type?
Example: JumpEventNone, whose job is “exit at attempted destination.”
### yes - see the other event i think we should model at first


Should every jump resolution event receive the same context?
Maybe: origin system, attempted destination, ship, crew, current turn, style pack, prefetched system data.

## i believe so

Should event handlers be able to request more data before they decide how to resolve?
Example: piracy event asks for destination system plus nearby patrol/naval data.

## we will assume events will have their own access to the redux store. 


Should jump events decide the actual destination, or should they decide a final transition target?
Subtle difference: a piracy event might transition to a battle scene, not a system.

## yes that is the intension - The intension is also that server owners may wish to register different event type plugins 

Should the workflow engine care about Three.js scenes, or only publish phases that scene components respond to?

## the workflow engine should be independate of threejs - we need something in threejs that can act on the events from the work flow - but there will be other things in the game that will need to act on the worklfow 

Do you imagine jump workflow as local client orchestration first, with server persistence at key checkpoints, or server-authored workflow state from the beginning?

### client orchestrion first with server side validation of actions to insure they are valid and issues by the correct authority


For multiplayer, when “waiting for other players,” should the ship remain in the inJump phase with a waiting HUD, while the tunnel continues looping?
### yes - this is not a MMRP is a TMRP - a tiny multi player role playing game - lets say dozen playes tops 


Should HUDs be allowed to show stale information while disconnected/in jump, with a visual “no signal” state?
### yes - but 


Should the destination system be prefetched immediately after destination confirmation, even before navigation and drive rolls?
Your note says yes; I want to confirm this is the rule for phase 1.
## yes - unless we discover 

In phase 1, should we build only the happy path:
select destination, prefetch, rolls, enter tunnel, no-event resolution, exit to destination?
### we want event resoltions - it a core concept

Where should the first reusable workflow live?
I’m thinking something like src/lib/jumpWorkflow.ts for pure phase/event definitions, and hooks/components using it.


What should be persisted when a user reloads during jump?
At minimum ship.status = "in_jump" exists. Do we also need attempted destination and jump phase persisted, or can reload just show generic jump tunnel until resolution?
## jest generic tunnel

If a user reloads during the enter animation before in_jump is persisted, is it acceptable to resume from the origin system?
## yes  

Should the visual transition ever block game state, or should game state always be able to finish independently and the scene catches up?
### scene catches up to data, but it should understand if data is delay and not end early


## more questions from codex

My next questions:

Is this phase model closer?
idle
destinationSelected
plottingCourse
coursePlotted
jumpAttempted
driveCharging
enteringJump
inJump
resolvingJumpEvent
exitingJump
arrived
jumpFailed
Should coursePlotted persist, or is it only local session state?
### only local state assume true when in jump 

Example: if the user plots Regina to Ruie, reloads before jumping, should the plotted route remain?
### not need - if use reload - render state form DB.  

Once a course is plotted, can the user change destination without re-plotting?
My instinct: changing destination invalidates the plotted course.
### plotting is a very difficult task changing destinatins requires a new plot.

Should the Navigation HUD separate actions into:

Set Destination
Plot Course
Execute Jump

That feels clearer than one “Jump” button.
Should plotCourse consume a turn, or only actual jump/failed drive attempt consumes a turn?

Current prototype advances turn on failed navigation, but your new model sounds like failed plotting may happen before the jump attempt.
 ### I want to simulated that failing a plot will require another week delay

Should failed drive consume fuel/credits?
Since the jump was attempted, I assume yes or maybe partial cost, but this affects server validation.
### a failed jump does not expand fuel - it just waste time - 

Should a failed drive attempt advance the turn?
I assume yes, because an actual jump operation was attempted.
### failed plots and filed jumps operation should waste time and advance turn

For phase 1 event resolution, should event selection be deterministic and simple?
Example:

normal jump always for now
later add failed/misjump probability
Or do you want all three modeled immediately with real dice/probability?
What decides a misjump target in phase 1?
Random nearby system, random reachable system, original system, or placeholder until we design misjump rules?
### stop trying to get out of the event based system we have three evet that we can model and if we we do them right will get us further along - i consider the event to be a core concept and we should build it from the start 


Should JumpEventNormal, JumpEventFailedDrive, and JumpEventMisjump be plain TypeScript objects/functions first, rather than plugin architecture yet?
 ### yes there are default event - but the will be used a sprototype when we create plugins at a later time


What should the event output look like?
Maybe:

{
  type: "normal" | "failedDrive" | "misjump";
  transition: "destinationSystem" | "originSystem" | "jumpTunnel" | "eventScene";
  arrivalWorldHex?: string;
  arrivalSectorAbbr?: string;
  message: string;
}

Should the workflow store “attempted destination” on the ship while in jump?
### clearly we are going to store "destination" in the reduc store - are you asking if are storing it in the DB

The player does not need to see it, but the normal event needs to know where to exit after reload unless we accept generic tunnel with no resolution after reload.
### can we use local storage - its just Sector hex coord -  


If reload during jump only shows generic tunnel, how does the app know where to resolve?
Do we use existing destinationWorldId, or do we need a persisted jump record later?

### if we store the destinatin in local storage wpildtaht hel



For phase 1, should /map/system render generic JumpSpaceView whenever ship.status === "in_jump", even if it cannot show the origin/destination?
### yes - Do you know hom many question you are asking for edge case where a user reloads- make it simple - just store the key in local storage



Should the Navigation HUD be built first using the same reachable-world logic as JumpRangeModal, but as a HUD inside system view?
### yes it can be build before it actually hooked in to the workflow - we can build the interface and wory about plooting and jumping later


Should the map-page jump controls remain working during this transition, or should we stop improving them and focus only on system-view jump?
### I think we should not waste time keeping the map jump cycle working- thets hhget the new system working

Should server validation live in the existing /api/turn/advance, or should jump get its own action endpoint later?
Example: /api/jump/plot, /api/jump/attempt, /api/jump/resolve.
### yes keep it in the existing turn advance -  


In phase 1, do you want the workflow definitions documented before code?
I think a short Prompts/jump/jump-workflow-plan.md could prevent us from drifting back into prototype assumptions.

The biggest question now is turn economy: does plotting consume a turn, or only executing/attempting jump consumes a turn? That decides how much of the current useJumpTurnController we can keep versus reshape.
 ### plotting consume a time- Its an expensive coputational task that requires human - AI peer proceesing. it would be similar to the procees we work through to write the code. 

## further questions from codex

I only have three final questions before I’d write the plan:

For phase 1, should the misjump event use a very simple placeholder rule like “pick a random loaded/reachable nearby world,” or should it exist as an event type but be disabled until we define rules?
### let account for it but disable until we have resolution rules

Should successful plotting store the plotted destination only in React/local state, or also in localStorage immediately after plot succeeds?
### we only need this value for one edge use case - we only need the plotted destination to exist in local store while a user is in jump - just in case the user LOgs off or reload in jump - so i think we kepp it in redux when ther are in sytem - but as sonn as the enter warp - the value is stuck in local storage and remove we they leave warp. A user - who uloads during warp and clears their local storage or logs onto a different machine such that the destinatiin is not in local store - the user will be dumped in the last known location as itf the jup failed. 



Should the Navigation HUD be the first implementation step, before touching the jump scene, so we can prove destination selection and plotting inside /map/system?
### yes

My recommendation: next I should create Prompts/jump/jump-workflow-plan.md that formalizes phases, event outputs, persistence, turn costs, and phase 1 build steps. Then we can implement from that instead of continuing to wrestle the prototype assumptions.
## agrred
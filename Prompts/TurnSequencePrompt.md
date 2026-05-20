# the turn

Each turn represents a 2 week period where a ship can either be docked or in-jump

## Turn ending options
While docked user may end and advance to a new turn by either choosing to remain in world or jumping to another accessable world.


### Remaining on world
Remaining on world causes a turn to end and a new turn to begin.

  When a turn end follow the instructions on handling turn ending. We want to assign event listeners to an onEndTurnEvent which we will refer to as a EndTurnEventHandler which we will discuss later

  When a turn dtarts folow the instructions on handling turn starting. We want to assign event listeners to an OnStartTurnEvent which we will refer to as a StartTurnEventHandler which we will discuss later

### Jumping to another World
  Jumping to a new world will initiate a pre jump work flow. 
     step 1 : identify new world with jump range
     step 2 : plot course - 
                  three tries = 
                  1st : 4+ on 2d6 succeeds and they proceed.
                  2nd : 6+ on 2D6 succeeds and they proceed.
                  3rd : 8+ on 2D6 succeeds and they proceed. if they fail they must Remain on world

    step 2 : Fire Jump Drive
                 roll 4+ 2d6 failure is misjump they will generate a misjump random event which for the time being remaining on world

    step 3: End Turn and Enter Into Jump state. 

        When a turn end follow the instructions on handling turn ending. We want to assign event listeners to an onEndTurnEvent which we will refer to as a EndTurnEventHandler which we will discuss later
     

        When a jump turn starts folow the instructions on handling turn starting. We want to assign event listeners to an OnStartJumpTurnEvent which we will refer to as a StartJumpTurnEventHandler which we will discuss later. 

    While in a jump turn a user is provided one option to Proceed. when they provide they will end the jump turn and start an New turn docked but its location will be the destination world. 

    

                  
















we need a turn tracking card that presents the user with 2 options to end and progress the turn - the first option is to remain on world If the choose this option they remain in place and they start a new turn, they will generate a random event - for now we have only one possible event - no event - we will discuss how event will work later but there will be 2 event tables based on the status of the ship - if the ship is docked - we will generate a random world event - while  in jump we will generate a random space event - these events will be discussed later - for now we just generate an place holder event called that will intecate nothing hapens.  
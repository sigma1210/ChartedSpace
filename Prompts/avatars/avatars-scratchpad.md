# Character avatare discussion with codex

## Questions from codex

Should the character prompt be style-neutral?

### yes - good example

    Example: “middle-aged scout pilot with cropped black hair, lean build, amber eyes, worn survey jacket.”


    Then style is applied separately: “render as anime” or “render as LEGO minifigure.”
       My recommendation: , store style-neutral character prompt separately from style prompt.

### yes this will be the responsibility of the workflow handling the lora and diffusion model
   

   Do we store both structured attributes and generated prompt?
### tes we may need to regenerate the generated prompt

    Attributes: { gender, build, clothing, hair, eyeColor }
    Prompt: human-readable LLM-composed description.
    My recommendation: store both. Attributes are editable; prompt is reusable.
Can users edit the generated prompt directly?

### NO! we want to keep users from creating disruptive content - we need to consider prompts like its a vector for malicious content - just like a sql injection - we make ever want to enforce the styles chossen on the server side to guard against abuse - 

    Some users will want control.
### dont care - they will abuse it -- I once let user have control - they posted pornography through css injection- we do not trust anything an end user gives us

But freeform prompts can break consistency.
### agree thats why we dont use them

Possible approach: generate prompt, allow “advanced edit,” keep structured attributes as source of truth.

Is style global per user, per campaign, or per image?
###
 per user - but consider per campaign.

    User style: “I view everyone as anime.”
    Campaign style: “This campaign uses gritty retro sci-fi.”
### yes
    Per-character style: “This one portrait is pixel art.”
### no    
My recommendation: user-level default style, overrideable per generation.

Should NPCs/crew use the same system?
### npc crew should use same style
This could make available crew, patrons, nobles, enemies, and contacts visually coherent.
My recommendation: yes, same prompt architecture for characters and NPCs.

Do we need prompt safety/constraints?
### yes - we limit prompts choices to enums - and validate on server before generating prompt 

Since users pick gender/body/clothing, we should avoid sexualized or exploitative phrasing.
### yes we should avoid such phrases - 

Store neutral portrait prompts: head-and-shoulders, clothed, RPG dossier portrait, etc.
### we will seperate prompts concerns - this application - meaning the next.js and postgres stack will concern it self with defining the attributes and possible enums a user can choose for each attribute { gender, build, clothing, hair, eyeColor } for example for humans gender is Male or Female but aliens have alot of different genders - we will always seperate gender from gender role when humans are concerned. 




What exactly is persisted?

I’d suggest:
avatarAttributes
### yes
avatarPrompt
### yes
avatarNegativePrompt maybe
### no - negative prompts are more of a legacy - we are using newer diffusion models that not require them. also it will the responsibility of an LLM to generate the Prompt - the generation of the prompt will be the concern of the server handling the image work flow - I expect the flow to work like -- work flow recieves the attribute abd values - it genrates a Prompt and an Image with the Prompt the work flow server returns the image and the prompt that generate it - those are store in the DB   
avatarStyleId or user style preference
generated image URL/cache key, if generated
model/provider metadata if needed
My suggested mental model:

Character Description Prompt: who the person is.
Style Prompt: how the image should look.
Generation Settings: which model/LoRA/size/seed.
Generated Asset: cached/rendered result.
That separation will keep the system flexible.
### one thing to consider is how comfyui generates images - it actyally embedds the json that describes the work flow that genarted the image - this holds most if not all the information needed. when an image is serverd to an end user - this meta data can be stript - but keeping it stored - allows us to replay the workflow that create it - just something to consider 

## question from codex round 2

Where should avatar attributes live?

On Character only?
Or should we create a reusable AvatarProfile model that can attach to player characters, crew, patrons, NPCs, contacts, enemies, etc.?
My recommendation: reusable AvatarProfile.
Who owns style preference?

### yes we should create a reusable profile

Is style purely a user preference like “I view the galaxy in anime style”?

### yes - it will be similar to a theme we will only have  a few to start for now call them classic, anime, cartoon but these may change and be extended 

Or should generated images be stored per user+character+style?

### yes 

    Example: two users view the same NPC, but one sees anime and one sees realistic.
    
    This affects whether avatar images are global or user-specific.
### npc will be style specific. an image of the npc must be created for each style avaiable- we can pregenrate a large number of images for npcs 


Should style be an enum too?


Example:
retroTravellerIllustration
anime
legoLikeToy
pixelArt
minecraftLikeVoxel
cinematicRealistic

I assume yes, no freeform style text.
Do we store the generated prompt as trusted output?

## yes but classic, anime, cartoon to start - the others are great ideas but for now lets just work out the issues with three styles

Since the prompt comes back from the workflow server, not the user, I assume we trust it enough to store.
## Now thats an assumption i would not make. Yes that should be true, but this is where bad things can be put into the system. we may need to have validation code that inspects the prompt for explicit or dangerous content. now the likely hood is we can trust the server- but in reality we can not

But should we still validate/moderate returned prompts before saving?
## yes
Can users regenerate the avatar?
## yes

Same attributes + same style could produce multiple image candidates.
## yes

Do we keep only the current image, or a history of generated images?
### let me use this opurtunity to discuss so interesting things I am thinking about in regards to NPCs and Characters. I want them to have better background I think npcs and characters need to be on a social network like instagrams where ther can store Images of there like - The images will use information about whet world and setting a character is in and discrribe it as a prompt like we do avatar images. User see the characters feed in the style they choose to vie the world. this is a concept i would like to work towards

Do attributes differ by species/sophont?
### yes

You mentioned alien genders.
Should the available enum options depend on species?
### this will need to be species depended.

Example: Human gender options differ from Aslan/Vargr/etc.

What is the minimum first version? just humans for now 

Is v1 only Human characters with:
gender
build
clothing
hair
eye color
style preference

Or do we include species immediately so the enum system is built correctly from day one?
### unsure 

Where is ComfyUI metadata stored? 
### when comfyUI generates an image its stores the metaf=dat in its header

As JSON in DB?
### as image Cimfy can read it directly from its header

As sidecar object storage metadata?

My instinct: store a workflowJson/generationMetadata JSON field privately, and strip metadata from public image delivery.

Should generated images be immutable assets?
### unsure what you mean 

If attributes change, create a new avatar generation record.
This gives reproducibility and avoids confusing cache invalidation.

What should the UI promise?

 “Customize avatar attributes”
 “Generate portrait”
 “Regenerate”
 
 “Select from generated options”

The UX changes a lot depending on whether generation is instant, queued, or batch-based.


### my thoughts on image generation - we can do image gen at build time - each Prompt attribue combo will create a unigue prompt for each style - 

for example (uses fewer enums to make example easier)

  gender can my Male or Female
  hair can be Blonde or Brunette
  eyes can be either Green or Nlue

  we have 2 X 2 X 2 or 8 possible combo 

  lets say we generate 1000 images for each combo and each style

  we dont need to work about the description prompt - just the style enums -- 

  a combination of the enums for the image name such as Male_Blonde_Green_1 Male_Blonde_Green_2 .... 

   
this is just a thought - ask question 

## questions from codex

For v1, do you want avatars to be generated live when the user clicks “Generate,” or selected from a pre-generated catalog?

### unsure - we are debating this

If using a pre-generated catalog, should the user see:

one random image matching their attributes,
a small gallery to choose from,
or a reroll button that picks another matching image?
### I am leaning towards reroll button - but still unsure

Are player-character avatars meant to be unique, or is it acceptable for two characters with the same attributes/style to possibly share the same pre-generated image?
### so long as there is a large enough set to choose from 

For NPCs, do you imagine each NPC has a stable identity image per style, or can their image be randomly chosen from the matching catalog each time?

### right now we keep aboout 2500 pregenrated character that we choose from - these characters have random names aplied to known stas i figure we can do the same thing with their image  choose a random- this thinking on this

If a user changes style from classic to anime, should the same character keep the same semantic identity but receive a different style-specific image?

### yes they maintain the same semanyoc odentity

Catalog Questions

Which attributes are part of the first catalog key?

gender - Yes - Male or Female
build. - Yes - slender, normal, broad 
clothing - Yes - color, red, green, blue, purple, yellow,orange,white,black 
hair - Blonde, Brunette, Ginger
eyeColor - Black, Grey, Brown, Blue, Green

Anything else?
Should clothing be one broad enum like casual, uniform, travellerJacket, or should clothing later split into:
### we wwill add detail later

career outfit
armor
social class
environment gear?
How many options per category are realistic for v1?
This matters because combinations explode quickly. For example:

2 genders
4 builds
6 clothing
8 hair
6 eye colors
3 styles
That is already 2 * 4 * 6 * 8 * 6 * 3 = 6,912 combos before generating variants.
Do you actually want every possible combo pre-generated, or only generate catalog entries as needed and then cache them?

### I am unconcerned with a large set of images we can manage them in the file system that maps to the semantic enums i.e. style/male/slender/red/blonde/blue/1,jpg could be the 1st image generated in style for male who is slender wears red clothing has blond hair and blue eyes 


If pre-generating, where would images live?
### right now file system 

local/public assets,
object storage,
database-backed asset table,
or external image service?



Safety Questions
### pregenration solves all sorts of safety issues

If prompts are generated by the workflow server, do we validate only the returned prompt text, or also validate the returned image somehow?

### pregeneration solves this concern as well 


Should the Next.js app send only enum IDs to the workflow server, never labels?

### I am leaning even more to pregenation
Example: send { hair: "hair_blonde" }, and the server expands that to safe prompt text.

Should style definitions be server-owned only?
## yes - for now

User chooses anime.
Server maps anime to a private workflow/LoRA/model config.
User never sees or edits the style prompt.

Data Model Questions

Should AvatarProfile store only current state, or generation history too?

When you asked “immutable assets,” I mean: once an image is generated, do we keep it forever as a historical artifact, even if the character later changes hair/clothing?
This matters for the “Instagram/social feed” idea. Feed images should probably be immutable.

Should avatar images and future “life feed” images share one asset model?
Example:

AvatarImage
CharacterFeedImage
or a generic GeneratedImageAsset with type avatar | feed | scene.
Social Feed Idea

Is the character feed meant to be:
purely cosmetic flavor,
visible to other players,
part of campaign history,
or eventually generated from actual game events?
Should feed images use the same user style preference as avatars?

If two users view the same character feed, should they see the same moments rendered in their own chosen style?


 
  "gender": "female",
        "build": "athletic",
        "clothing": "jacket",
        "hairColor": "black",
        "eyeColor": "green"



# Prompt for giving context to Claude and making it understand what I want to build

I need you to act as a senior software engineer on this project and as an expert in the modern Next.js stack, and the Redux Toolkit following best practices in modern software development.
You are also an expert on Traveller Role playing game and understand its background and mechanics. 

The travller wiki can be found at https://wiki.travellerrpg.com/Main_Page

documentation on travller world maps can be found at https://www.travellerworlds.com/

The documentation in ./documentation/world-api.txt for the world map Api

The documentation in  ./documentation/map-api.txt. describe the official traveller map api.
 

This project is an RPG character tracker.  
The tool will allow user to create characters and track where they are.

The characters exist in a role playing game set in the Charted Space as descriped in the Traveller role playing game


You must focus only on the requirements I give you.  
❌ Do not suggest additional features  
❌ Do not suggest other libraries or frameworks  

This is the exact tech stack for the project — nothing more and nothing less:

- Claude Code → AI pair programmer  
- Next.js 16 (App Router)  
- TypeScript  
- React  
- Tailwind CSS  
- shadcn/ui → fast, beautiful UI  
- Clerk → authentication  
- Prisma + PostgreSQL → production-ready database layer  
- Redux toolkit
- React 3js fibre
- Jest for unit test

we will use pnpm for package management 

Again:  
👉 Do not suggest any other libraries or frameworks unless asked

---

# 📌 Application requirements

These are the only features I want in the app:

- A database schema that does not exceed 8 models under any circumstances  
- A landing page that also includes the sign-in interface  
- A sign-up page  
- A main page that forms a SPA with a Redux store with multiple components that can derive state and dispatch action in the redux store this pages will include 
  - A Character list page
  - A search modal  
  - A notifications modal  
  - A character profile page
  - A Map view on the galaxy
  - A MAp view of a Sector
  - A Map view of a Subsector
  - A System Detal Modal
  - A Users Profile page  
   - For the page owner  
   - For other users’ profiles  

---

# 🧠 Development & coding rules

Always follow the existing coding style of the project

- Naming conventions  
- File structure  
- Component patterns  

Follow best practices for client-side code

- Avoid using useEffect unless it is strictly unavoidable  
- Prefer server components  
- Prefer derived state  
- Prefer event-driven logic  
- derive all state using redux selectors
- issue all actions by dispatching actions
- all redux selectors and reducer will be full unit tested

Do not overcomplicate solutions

- Always write clean, readable, and maintainable code  
- Break logic into small, well-structured components and utilities  
- Follow best practices for any code you write  

When I provide official documentation or examples, you must match the same patterns.

---

# ⚙️ Next.js route best practices (required)

When creating any route in the Next.js App Router:

- Always include an error.tsx file as an error fallback  
- Always include a loading.tsx file as a loading fallback  
- Treat these files as mandatory best practices for proper UX and resilience  
- Follow the same coding style and project structure when generating these files  

---

# 📷 Visual reference rules

I will provide screenshots inside a folder named screenshots

You must analyze the images inside this folder carefully

Treat these screenshots as the primary and ongoing reference for:

- UI  
- UX  
- Layout  
- Behavior  

We will always use these screenshots as a reference throughout the project.

---

# ⚠️ Certainty & knowledge constraint

If you do not know something, are uncertain, or do not have enough information, you must explicitly say:

“I don’t know.”

Do not guess, do not assume, and do not hallucinate behavior or implementation details.

In such cases, do not proceed or generate anything until you are 100% confident and have enough information to move forward.

---

# ✅ Understanding confirmation (required)

Provide a clear, structured overview of your understanding of:

- The project goal  
- The constraints  
- The allowed tech stack  
- The required features  
- The development rules  

Explicitly mention any uncertainties or missing information.  
Wait for my confirmation or corrections before proceeding.

---

# ⚠️ Important instruction

Do not generate any code or implementation yet.  
This prompt is only to help you understand the project I want to build.


Please ask me to clarify any thing that is unclear at this point

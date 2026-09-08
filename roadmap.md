# What we are building:
Name: Sentinel

Context: We have to build a proof of concept (complete working front-end UI, no functionality or backend logic needed) for our final year project, the proposal document of our fyp that has the details about our fyp is under @docs\Proposal-doc_Version_FINAL docx file. We would have to present this front-end as a proof of concept during our proposal defence of the fyp.

<hr style="height:4px; background-color:Grey; border:none;">

## Rules:

### Rule-0: 
The front-end shall be bug-free, robust, as well as user-friendly, and the code shall be clean, easy-to-understand, and that the code as well as the front-end doesn't have emojis or double hyphens (use single hyphens like "-" where needed).
### Rule-1: 
Follow this roadmap file at all costs. if you think another step or task needs to be done, please first add it here after approval from me.
### Rule-2: 
Do only one step at a time from this roadmap file for accuracy and focus.
### Rule-3: 
Follow Claude.md file at all costs
### Rule-4:
Use the word "Stampede" instead of "Crush".
### Rule-5:
The design of the front-end suits our fyp and looks well as well. It shall not look extremely modern, nor too old/simple, it should look decent, modern and really good with respect to our fyp, the theme shall be dark blue background by default, also having the option to shift to a lighter theme, where the background color becomes greyish/creamish then
### Rule-6:
Use Typescript instead of JavaScript

<hr style="height:4px; background-color:Grey; border:none;">

## Steps:

### Step-0:
Use /brainstorming skill to analyze our project and the tech stack we finalised under @docs\Proposal-doc_Version_FINAL docx file, and create a understanding.md file under /docs to save your in-depth understanding of this project.

### Step-1: 
Create a Claude.md file for this project based on the inspiration taken from @example_CLAUDE.md file, and based on the @understanding.md that you created under @/docs.

### Step-2: 
Use /brainstorming to create a srs (spec) document for this system on the basis of @understanding.md file under /docs as well as @Proposal-doc_VERSION_FINAL.docx file under /docs. Please do not add requirements by yourself, the srs document shall cover the whole system, so that the front-end is made with respect to all functionalities that would be added in the back-end later, in order to make this a working product in the future. The front-end we build now, shall be a full working front-end, that only needs back-end for making Sentinel a usable product. Build this front-end in a way, that connecting back-end to it is easy to do, because the front-end would be built according to spec doc, which has the details for complete system (front-end + backend)

### Step-3:
Once spec document is done, then use /brainstorming writing-plans skill to create a design.md doc which lists the list of screens/pop-ups/tabs/flows that our web app would have.

### Step-4:
Re-verify using /brainstorming writing-plans skill that the design.md is correctly mapping all requirements to the design and that design.md and srs.md are good to go based on the @docs\Proposal-doc_Version_FINAL docx file and @understanding.md file.

### Step-5: 
Then, once spec(srs) and design.md are final, use /brainstorming/visual companion mode to create wireframes for showing each screen, pop-up, tab and every view that our system shall have.

### Step-6:
Then once, wireframes are built and reviewed/fixed, use subagent-driven-development skill build the whole front-end of the app, on the basis of wireframes, spec (srs), design.md, understanding.md and @docs\Proposal-doc_Version_FINAL docx file and required-pages.md

### Step-7:
Use systematic-debugging and test-driven-development to review and test the whole front-end rigorously

### Step-8:
Deployment to vercel/github

<hr style="height:4px; background-color:Grey; border:none;">
# Terra 🌏
Capitalism toy-selling video game server emulator from my childhood. **Not done yet.** Called Terra because that's what the world of UB Funkeys is called :)

# Highlights 🌈
- Stupidly simple and secure accounts with bcrypt.
- Fast, portable and no-setup database with SQLite.
- Readable and organised code with extensive comments (from my annoying brain).
- Highly configurable by compartmentalising settings into JSON files.

# Progress Tracking 📌
- [x] Server Emulator
    - [x] Database
    - [x] Environment (config, cache, user data)
    - [x] TCP Server
    - [x] HTTP Server
    - [x] Packet Formatting
    - [x] Active Connection Manager
    - [ ] Web Panel for Admins
    - [ ] EULA Check
    - [ ] Send Proper Errors for Server Failures
- [x] Core Features 
    - [x] Guest Login
    - [x] Host Details
    - [x] Server Details
    - [x] Account Creation
    - [x] Account Login
- [ ] User Features
    - [ ] Friend List
    - [ ] Chat Status
    - [x] Phone Status
    - [ ] Add Friend
    - [ ] Accept Friend
    - [ ] Delete Friend
    - [ ] Send DM
    - [ ] Delete DM
    - [ ] Send Invite
    - [ ] Respond to Invite
- [ ] Chat Features
    - [ ] Chat Event
- [ ] Boxing Minigame (Nightmare Rift)
    - [ ] Boxing Event
- [ ] Soccer Minigame (Daydream Oasis)
    - [ ] Shoot Ball
    - [ ] Block Ball
- [ ] Pool Minigame (Nightmare Rift)
    - [ ] Pool Events
    - [ ] Turn Management
- [ ] Galaxy Features (Cloud Storage)
    - [x] Profile Save Version
    - [x] Statistics Request
    - [ ] Save Profile
    - [ ] Load Profile
    - [ ] Leaderboards
- [ ] Trunk Features (Shop)
    - [ ] Get Assets
    - [ ] Balance
    - [ ] Product List
    - [ ] User Transactions
    - [ ] Buy Product
    - [ ] Send Asset
- [ ] Multiplayer Functionality
    - [ ] Leave Game
    - [ ] Ready Up
    - [ ] Message Opponent
    - [ ] Play Again
- [ ] Misc
    - [ ] "p" command - heartbeat?
    - [ ] Clean Up Code (ex. debug messages)
    - [ ] Figure Out More Response Codes
    - [ ] Documentation

# Why Node? Why not continue Java or C#? 😨
By choosing Node over Java and C#, setup is lightweight and easy. The drawback is that it will not scale as well, but for a Flash game, this is more than fine. Node has many libraries established for web communication like what Terra needs and is a straightforward approach. I am not familiar with the codebases well enough to continue the other projects and a fresh start is more appealing to me.

# Acknowledgements 🥰
- [A1Emu](https://github.com/GittyMac/A1Emu) (and by extension [UBFunkeysServer](https://github.com/Leahnaya/UBFunkeysServer)) was a reference for the progress tracking and the server emulator. I plan for this to be a "re-implementation" of these projects initially but grow from there.
- [OpenFK](https://github.com/GittyMac/OpenFK/), [JPEXS](https://github.com/jindrapetrik/jpexs-decompiler), and [Wireshark](https://github.com/wireshark/wireshark) for testing and reverse engineering the game client.
- Mattel, Radica Games, and Arkadium for creating the game.
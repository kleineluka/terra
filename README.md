# Terra 🌏
Capitalism toy-selling video game server emulator from my childhood built in Node and Express. I've called it Terra because that's what the world of UB Funkeys is called! **Not done yet. Please also be aware that the logs WILL be flooded with information while in development, and not a clean user experience.**

# Highlights 🌈
- Simple, secure, and lightweight powered by Express, bcrypt, and SQLite.
- Fully open source with readable code and comments.
- Super configurable with modular architecture and configuration files.
- More features to come... (ex. safety features, webui)

# Progress ☁️
Due to how messy the game's server implementation is, I find that keeping a specific and detailed feature list difficult. Instead, there will be some general goals listed below that may or may not be fully fleshed out and bug-free. Note that this list doesn't include quality of life stuff (ex. dev tools) and just parity with the original game's server.

- [x] Core Server Implementation
- [x] Guest Playing
- [x] User Accounts
- [x] Online Statuses
- [x] Cloud Save Files
- [x] Chat Rooms
- [ ] Leaderboards
- [ ] Friend System
- [ ] DM System
- [ ] Trunk/Shop System
- [ ] Boxing Game (Nightmare)
- [ ] Soccer Game (Daydream)
- [ ] Billiards Game (Nightmare)
- [ ] Mahjong Game (Daydream)
- [ ] Fight Game (Hidden)
- [ ] Chinese Checkers Game (Hidden)
- [ ] Worms Game (Paradox)
- [ ] Dominoes Game (Paradox)

# Architecture  🦋️
You can find all server code inside `components/` and all json files for configuration in `configs/`. In components, you can find...

- `chat/` - All code related to chatrooms and messaging in them.
- `core/` - Things like heartbeats and logging in.
- `galaxy/` - Cloud-like save state.
- `recycled/` - Commands that are re-used in multiple scenarios.
- `server/` - Server setup and database/packet handling.
- `trunk/` - User inventory and shop system (the effects, not the furniture).
- `user/` - User statuses and friend system.
- `utils/` - Random helper functions.
- `server.js` - Main entry point for the server.

Instructions to run will be provided when the project is more mature, but in the meantime, you can just clone, install, and `npm run start` to get it running. If you want to contribute, try and replicate the original game's behaviour that I may have missed (ex. sending the right error codes back), implementing features not yet added, or finding to-do comments in the code! You can also see a list of planned changes/fixes in [TODOS.md](TODOS.md).

# Acknowledgements 🫶
- [A1Emu](https://github.com/GittyMac/A1Emu) (and by extension [UBFunkeysServer](https://github.com/Leahnaya/UBFunkeysServer)) was a reference for where to start this project.
- [XmlMessageDoc](https://github.com/bluisblu/XmlMessageDoc) has a lot of useful information about the game's packets.
- [OpenFK](https://github.com/GittyMac/OpenFK/), [JPEXS](https://github.com/jindrapetrik/jpexs-decompiler), and [Wireshark](https://github.com/wireshark/wireshark) for testing and reverse engineering the game client.
- Mattel, Radica Games, and Arkadium for creating the game.

# Notice 🪼
This project is fan-made and not associated with the original game or any company involved with it in any capacity. You may not use this project or any of its code for commercial purposes (including private servers that charge money or run ads), malicious purposes (such as exploits), or impersonation attempts (not disclosing it is fan-made). The source code is published under AGPL-3.0 License so source code modification must be shared. Thank you for understanding and respecting the work put into both this project and the original game!
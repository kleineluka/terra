# Terra 🌏
Capitalism toy-selling video game server emulator from my childhood. **Not done yet.** Called Terra because that's what the world of UB Funkeys is called :)

# Highlights 🌈
- Stupidly simple and secure accounts with bcrypt.
- Fast, portable and no-setup database with SQLite.
- Readable and organised code with extensive comments (from my annoying brain).
- Highly configurable by compartmentalising settings into JSON files.

# Progress Tracking 📌

<!-- Details List -->
<details>
<summary>Server Emulator (6/10)</summary>

- [x] Database
- [x] Environment (config, cache, user data)
- [x] TCP Server
- [x] HTTP Server
- [x] Packet Formatting
- [x] Active Connection Manager
- [ ] Web Panel for Admins
- [ ] EULA Check
- [ ] Send Proper Errors for Server Failures

</details>

<!-- Core Features -->
<details>
<summary>Core Features (5/7)</summary>

- [x] Guest Login
- [x] Host Details
- [x] Server Details
- [x] Account Creation
- [x] Account Login
- [ ] Another Login
- [ ] Heartbeat

</details>

<!-- User Features -->
<details>
<summary>User Features (1/10)</summary>

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

</details>

<!-- Chat Features -->
<details>
<summary>Chat Features (0/12)</summary>

- [ ] Create Room
- [ ] Change Properties
- [ ] Item Activation
- [ ] Join Room
- [ ] Kick Out
- [ ] Chat Message
- [ ] Player Move
- [ ] Open Door
- [ ] Put Item
- [ ] Player Location
- [ ] Remove Item
- [ ] Send Event

</details>

<!-- Boxing Minigame -->
<details>
<summary>Boxing Minigame in Nightmare Rift (0/1)</summary>

- [ ] Boxing Action

</details>

<!-- Soccer Minigame -->
<details>
<summary>Soccer Minigame in Daydream Oasis (0/4)</summary>

- [ ] Ball Save
- [ ] Character Chosen
- [ ] Send Moving
- [ ] Strike Parameter

</details>

<!-- Mahjong Minigame -->
<details>
<summary>Mahjong Minigame (0/3)</summary>

- [ ] Freeze Game
- [ ] Remove Tile Pair
- [ ] Reset Tiles

</details>

<!-- Pool Minigame -->
<details>
<summary>Pool Minigame in Nightmare Rift (0/4)</summary>

- [ ] Release Cue
- [ ] Motion End
- [ ] Roll Update
- [ ] Partner Hit

</details>

<!-- Fight Minigame -->
<details>
<summary>Fight Minigame (0/17)</summary>

- [ ] Block
- [ ] Extended Punch
- [ ] Headbutt
- [ ] Health Reduction
- [ ] Hit
- [ ] Jump Kick
- [ ] Jump
- [ ] Kick
- [ ] Move
- [ ] Ping
- [ ] Punch
- [ ] RTT
- [ ] Special Action
- [ ] Score
- [ ] Soft Reconciliation
- [ ] Stop
- [ ] Unblock

</details>

<!-- Chinese Checkers -->
<details>
<summary>Chinese Checkers (0/2)</summary>

- [ ] Movement
- [ ] Turn Notification

</details>

<!-- Worms in Paradox Green -->
<details>
<summary>Worms in Paradox Green (0/0)</summary>

- Nothing Yet

</details>

<!-- Dominoes in Paradox Green -->
<details>
<summary>Dominoes in Paradox Green (0/0)</summary>

- Nothing Yet

</details>

<!-- Trunk Features -->
<details>
<summary>Trunk Features (0/6)</summary>

- [ ] Get Assets
- [ ] Balance
- [ ] Product List
- [ ] User Transactions
- [ ] Buy Product (various subcommands)
- [ ] Send Asset

</details>

<!-- Galaxy Features -->
<details>
<summary>Galaxy Features (Cloud Storage) (2/5)</summary>

- [x] Profile Save Version
- [x] Statistics Request
- [ ] Save Profile
- [ ] Load Profile
- [ ] Leaderboards

</details>

<!-- Galaxy Features -->
<details>
<summary>Multiplayer Features</summary>

- [ ] Leave Game
- [ ] Ready Up
- [ ] Message Opponent
- [ ] Play Again
- [ ] Chat Message
- [ ] Draw (yes/no subcommands)

</details>

<!-- Misc Features -->
<details>
<summary>Misc. Features</summary>

- [ ] Clean Up Code (ex. debug messages)
- [ ] Figure Out More Response Codes
- [ ] Documentation
- [ ] Safety Filter (ex. account name)
- [ ] Conflicting Command Handling (based on context)

</details>

*Note: This is not an exhaustive list, just a frankenstein of A1Emu, UBFunkeysServer, and XmlMessageDoc. There are also a lot of overlapping commands, which will be properly organised in the future. Once these are complete, I will look for any missing niche commands!*

# Why Node? Why not continue Java or C#? 😨
By choosing Node over Java and C#, setup is lightweight and easy. The drawback is that it will not scale as well, but for a Flash game, this is more than fine. Node has many libraries established for web communication like what Terra needs and is a straightforward approach. I am not familiar with the codebases well enough to continue the other projects and a fresh start is more appealing to me.

# Acknowledgements 🥰
- [A1Emu](https://github.com/GittyMac/A1Emu) (and by extension [UBFunkeysServer](https://github.com/Leahnaya/UBFunkeysServer)) was a reference for the progress tracking and the server emulator. I plan for this to be a "re-implementation" of these projects initially but grow from there.
- [XmlMessageDoc](https://github.com/bluisblu/XmlMessageDoc) has a lot of useful information about the game's packets.
- [OpenFK](https://github.com/GittyMac/OpenFK/), [JPEXS](https://github.com/jindrapetrik/jpexs-decompiler), and [Wireshark](https://github.com/wireshark/wireshark) for testing and reverse engineering the game client.
- Mattel, Radica Games, and Arkadium for creating the game.
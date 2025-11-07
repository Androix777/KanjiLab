# KanjiLab

<p align="center">
  <img src="https://github.com/user-attachments/assets/894ec4aa-62db-499a-835b-13083176d338" alt="KanjiLab Logo" width="300">
</p>

A quiz game to test your knowledge of Japanese word readings.

KanjiLab is an open-source, portable desktop application designed to test and challenge your knowledge of Japanese word readings. Built with Rust and Svelte using the Tauri framework, it offers a fast and responsive experience for both solo play and peer-to-peer multiplayer sessions. All your data is stored locally in a SQLite database, ensuring complete privacy and offline functionality.

Please note that KanjiLab is currently in the beta phase of development. While the core features are functional, you may still encounter bugs, performance issues, or unexpected behavior.

Important: Breaking changes may be introduced in future updates. This could potentially lead to the reset of your game statistics and user profiles.

![preview](https://github.com/user-attachments/assets/ba2dc923-c6f9-49ea-aecc-d0afda37b6bc)

## Features!


*   **Kanji Reading Quiz:** A game to test your knowledge of Japanese word readings in a quiz format.

*   **Fully Offline & Portable:** The application requires no internet connection. It runs as a single, portable executable without installation, storing all user data locally.

*   **Single-Player Mode:** Play solo anytime for self-assessment, practice, or casual gameplay.

*   **P2P Multiplayer:** Challenge friends in real-time! One player hosts, and others connect directly over a local network or using VPN tools (e.g., Radmin VPN, Hamachi). Supports a virtually unlimited number of players.

*   **Learn Through Association:** After each answer, explore all possible readings of the word. Discover other words that use the same kanji with similar readings to help build stronger memory connections.

*   **Font Management:** Select from several built-in fonts or load your own. The chosen font can significantly alter the difficulty of reading, adding another layer to the challenge.

*   **Quiz Customization:** Tailor your games by:
    *   Selecting word frequency ranges.
    *   Filtering for words with specific kanji and specific readings.
    *   Setting the duration and number of rounds.

*   **Effortless Multiplayer Setup:** In a multiplayer game, only the host needs to have the custom fonts and dictionaries. All connected clients will automatically use the host's assets without any local configuration required.

*   **Detailed Statistics:** Track your performance with in-depth stats on your answers, accuracy, and response times for every game.

*   **Skill & Record System:** Achieve the longest answer streaks (combos) within specific frequency ranges to earn a unique skill score. Compete for the top spot on the local leaderboards.

*   **Custom Dictionaries (Beta):** Go beyond the default word list by creating and loading your own custom dictionaries for quizzes.

*   **In-Game Chat:** Communicate with other players directly within the multiplayer lobby and during the game.

*   **Multiple User Profiles:** Create and switch between separate local profiles, each with its own independent statistics, records, and settings.

*   **Visual Customization:** Personalize your experience with dozens of built-in themes to choose from.

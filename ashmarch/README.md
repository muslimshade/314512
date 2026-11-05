# Ashmarch

A portrait kingdom-strategy game for Android. You govern a valley: raise the Town Center, train infantry, cavalry, and archers, recruit heroes, join an alliance, and play the first season of events.

It is an original game with its own rulers, towns, and rewards. It is not affiliated with Kingshot or Century Games.

## Play on Android

1. Open the game in Chrome.
2. Use the Chrome menu and choose **Install app** or **Add to Home screen**.
3. Launch Ashmarch from the home screen. It runs full screen, in portrait, and keeps the realm on that device.

The same page also plays in a desktop browser. In Settings you can run the clock at 1×, 3×, or 10×.

## Season 1 events

- Daily Missions, resetting at midnight in Dubai (UTC+4)
- Strongest Governor, seven stages: City Construction, Hero Development, Basic Skills Up, Combat Training, Basic Skills Up, Combat Training, Hero Development
- Rebel Invasion
- Bear Hunt
- Golden Glaives
- Kingdom of Power: preparation, a three-lane clash, then triage
- Castle Battle

Swordland Showdown, Blizzard Brawl, Fishing Tournament, Alliance Brawl, and Duel of the Elites are on the calendar as the next season.

## Add an event

1. Add a row to `EVENTS` in `js/data.js`.
2. Add its starting state in `createNewGame` in `js/game.js`.
3. Add the actions and any timer step inside `tick`.
4. Add a screen in `js/ui.js` and register it in `eventScreen`.

## Develop

```bash
npm test
npm start
```

Then open `http://127.0.0.1:5173`.

# MiniGameDiscordBot
Discord Bot that allows you to play terminal based games. Because of implementation limits, only one instance of any of the games are allowed at any time and any further uses of the `new` commands will overwrite any previously running games.

1. Tic Tac Toe
2. Connect Four
3. Texas Hold 'Em

## Tic Tac Toe
Allows you to play tic tac toe in your server.

### Commands
- `ttt_new` Starts a new tic tac toe game for your server, only one game can be played at a time.
- `ttt_play` Plays either an x or an o at the given row and column for the current game, numbering is 0 based.
- `ttt_board` Displays the tic tac toe board for the current game.

## Connect Four
Allows you to play connect four in your server.

### Commands
- `c4_new` Starts a new connect four game for your server, only one game can be played at a time.
- `c4_play` Plays at the given column in the connect four game (see board for numbering scheme).
- `c4_board` Displays the connect four board for the current game.

## Texas Hold 'Em
Allows you to play texas hold em in your server. This one is a bit involved, you've been warned.

### Commands
- `poker_new` Starts a new poker game that players can join
- `poker_join` Joins the current poker game, this must be used by each player that wants to buy into the game, this can be used at any time, even in a game that was already started.
- `poker_leave` Leaves the current poker game
- `poker_start` Starts the current poker round for the current game, all players waiting to join in are merged into the current players, dealer is assigned, and betting begins.
- `poker_call`  Used by players to call on their turn, using when the current bet is 0 is equivalent to using `poker_check`
- `poker_check` Used by players to check on their turn, fails when the current bet is > 0.
- `poker_raise` Raises the bet to the given amount. Used by players to raise on their turn.
- `poker_fold` Used by players to fold out of the current round.
- `poker_set_dealer` Can be used before `poker_start` to specify the dealer for the next round
- `poker_pot` Returns the pot balance
- `poker_balance` Returns your current balance
- `poker_set_balance` Sets the given player's balance to a specific amount.
- `poker_call_amount` Returns the amount that you need to bet in order to call.

### Gameplay
The gameplay follows a few states:
- Dealing Phase
- Betting Phase
- Flop(s) Phase
- Distribution Phase
  
The game begins with `poker_new` once each of the players buys in with `poker_join`, then the host should use `poker_start`. This will enter the dealing phase, determine the dealer (unless `poker_set_dealer` is used), distributes the cards (via DMs), then enters the betting phase.

After most commands, the poker board is displayed, along with the person that is up to bet. It should look something like this:
```
River:
┌───────────────────────────────────┐
│┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐│
││░░░░░││░░░░░││░░░░░││░░░░░││░░░░░││
││░░░░░││░░░░░││░░░░░││░░░░░││░░░░░││
││░░░░░││░░░░░││░░░░░││░░░░░││░░░░░││
││░░░░░││░░░░░││░░░░░││░░░░░││░░░░░││
││░░░░░││░░░░░││░░░░░││░░░░░││░░░░░││
│└─────┘└─────┘└─────┘└─────┘└─────┘│
└───────────────────────────────────┘
Current Pot: 600

Dealer: testUser

Current Players:
⇒ D testUser
testUser2

<@0> , you are up to bet!
```

Each player uses `poker_call`, `poker_check`, `poker_raise`, or `poker_fold` on each of their respective turns. This continues until the game enters the distribution phase, where each of the remaining players' hands are compared and the winner(s) are determined.

The end of a round might look something like this

```
River:
┌───────────────────────────────────┐
│┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐│
││♣   ♣││♠   ♠││♣   ♣││♥   ♥││♥   ♥││
││     ││     ││     ││     ││     ││
││  2  ││Queen││  7  ││  3  ││  2  ││
││     ││     ││     ││     ││     ││
││♣   ♣││♠   ♠││♣   ♣││♥   ♥││♥   ♥││
│└─────┘└─────┘└─────┘└─────┘└─────┘│
└───────────────────────────────────┘
Current Pot: 1200

Dealer: testUser

Current Players:
D testUser
⇒ testUser2

<@1> wins with a TWO PAIRS for 1200!
```
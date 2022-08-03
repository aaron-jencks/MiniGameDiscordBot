const poker = require("./texasHoldEm.js");

const poker_funcs = new Map();
poker.funcDefs.forEach(d => {
    poker_funcs.set(d.name, ctx => d.execute(ctx));
})

const replyFunc = s => console.log(s);

const testUser = {
    'id': 0,
    'username': 'testUser',
    'tag': 'testUser#0'
}

const testContext = {
    'guildId': 0,
    'reply': replyFunc,
    'user': testUser
}

poker_funcs.get('poker_new')(testContext);
poker_funcs.get('poker_join')(testContext);
poker_funcs.get('poker_start')(testContext);
poker_funcs.get('poker_call')(testContext);
poker_funcs.get('poker_call')(testContext);
poker_funcs.get('poker_call')(testContext);
poker_funcs.get('poker_call')(testContext);
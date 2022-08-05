const poker = require("./texasHoldEm.js");

const poker_funcs = new Map();
poker.funcDefs.forEach(d => {
    poker_funcs.set(d.name, ctx => d.execute(ctx));
})

const replyFunc = s => console.log(s);

const argMap = new Map();

const testUser = {
    'id': 0,
    'username': 'testUser',
    'tag': 'testUser#0'
}

const testUser2 = {
    'id': 1,
    'username': 'testUser2',
    'tag': 'testUser2#0'
}

const testContext = {
    'guildId': 0,
    'reply': replyFunc,
    'user': testUser,
    'options': {
        'getInteger': s => argMap.get(s),
        'getMentionable': s => argMap.get(s),
        'getUser': s => argMap.get(s)
    }
}

const generateNewContext = (user) => {
    return {
        'guildId': 0,
        'reply': replyFunc,
        'user': user,
        'options': {
            'getInteger': s => argMap.get(s),
            'getMentionable': s => argMap.get(s),
            'getUser': s => argMap.get(s)
        }
    };
}

poker_funcs.get('poker_new')(testContext);

poker_funcs.get('poker_join')(testContext);
poker_funcs.get('poker_join')(generateNewContext(testUser2));

argMap.set('dealer', testUser);
poker_funcs.get('poker_set_dealer')(testContext);

poker_funcs.get('poker_start')(testContext);

// Initial betting

argMap.set('amount', 600);
poker_funcs.get('poker_raise')(generateNewContext(testUser2));

poker_funcs.get('poker_call')(testContext);

// Flop performed

poker_funcs.get('poker_call')(generateNewContext(testUser2));
poker_funcs.get('poker_call')(testContext);

// Flop performed

poker_funcs.get('poker_call')(generateNewContext(testUser2));
poker_funcs.get('poker_call')(testContext);

// Flop performed

poker_funcs.get('poker_call')(generateNewContext(testUser2));
poker_funcs.get('poker_call')(testContext);

// Winner announced

// Folding round

argMap.set('dealer', testUser);
poker_funcs.get('poker_set_dealer')(testContext);
poker_funcs.get('poker_start')(testContext);

// argMap.set('amount', 600); // Still the 600 from last time
poker_funcs.get('poker_raise')(generateNewContext(testUser2));
poker_funcs.get('poker_fold')(testContext);

// Winner announced

// dual raise round

argMap.set('dealer', testUser);
poker_funcs.get('poker_set_dealer')(testContext);
poker_funcs.get('poker_start')(testContext);

poker_funcs.get('poker_raise')(generateNewContext(testUser2));
poker_funcs.get('poker_raise')(testContext);
const yaht = require("./yahtzee.js");

const funcs = new Map();
yaht.funcDefs.forEach(d => {
    funcs.set(d.name, ctx => d.execute(ctx));
})

const replyFunc = s => console.log(s);

const argMap = new Map();

const testUser = {
    'id': 0,
    'username': 'testUser',
    'tag': 'testUser#0',
    send: m => console.log(m)
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

function testDisplay() {
    funcs.get('yaht_new')(generateNewContext(testUser));
}

function testRoll() {
    funcs.get('yaht_new')(generateNewContext(testUser));
    funcs.get('yaht_roll')(generateNewContext(testUser));
    for (let e = 0; e < 5; e++) {
        argMap.set('die', e);
        funcs.get('yaht_hold')(generateNewContext(testUser));
    }
    argMap.set('die', 2);
    funcs.get('yaht_release')(generateNewContext(testUser));
    argMap.set('die', 3);
    funcs.get('yaht_release')(generateNewContext(testUser));
}

const testFuncs = [
    testDisplay,
    testRoll,
].forEach(t => t());
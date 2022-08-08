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

const testFuncs = [
    testDisplay,
].forEach(t => t());
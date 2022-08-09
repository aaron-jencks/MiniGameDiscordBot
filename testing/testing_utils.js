const testUser = {
    'id': 0,
    'username': 'testUser',
    'tag': 'testUser#0',
    send: m => console.log(m)
}

function generateNewUser(id=0, username='testUser', tagNum='0') {
    return {
        id: id,
        username: username,
        tag: `${username}#${tagNum}`,
        send: console.log,
    }
}

function generateNewContext(user) {
    let argMap = new Map();
    return {
        'guildId': 0,
        'reply': console.log,
        'user': user,
        args: argMap,
        'options': {
            'getInteger': s => argMap.get(s),
            'getMentionable': s => argMap.get(s),
            'getUser': s => argMap.get(s)
        }
    };
}

function generateFuncMap(funcDefs) {
    const funcs = new Map();

    funcDefs.forEach(d => {
        funcs.set(d.name, ctx => d.execute(ctx));
    });

    return funcs;
}

class TestHarness {
    constructor(contextObject) {
        this.game = contextObject;
        this.funcs = generateFuncMap(this.game.funcDefs);
        this.ctx = generateNewContext(testUser);
    }

    sendCommand(cmdName) {
        this.funcs.get(cmdName)(this.ctx);
    }

    setArg(arg, val) {
        this.ctx.args.set(arg, val);
    }
}

module.exports = {
    testUser,
    generateNewContext,
    generateFuncMap,
    generateNewUser,
    TestHarness,
}
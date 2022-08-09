const yaht = require("./yahtzee.js");
const tutils = require("./testing/testing_utils.js");

const funcs = tutils.generateFuncMap(yaht.funcDefs);

function testDisplay() {
    funcs.get('yaht_new')(tutils.generateNewContext(tutils.testUser));
}

function testRoll() {
    funcs.get('yaht_new')(tutils.generateNewContext(tutils.testUser));
    funcs.get('yaht_roll')(tutils.generateNewContext(tutils.testUser));
    for (let e = 0; e < 5; e++) {
        tutils.argMap.set('die', e);
        funcs.get('yaht_hold')(tutils.generateNewContext(tutils.testUser));
    }
    tutils.argMap.set('die', 2);
    funcs.get('yaht_release')(tutils.generateNewContext(tutils.testUser));
    tutils.argMap.set('die', 3);
    funcs.get('yaht_release')(tutils.generateNewContext(tutils.testUser));
    funcs.get('yaht_roll')(tutils.generateNewContext(tutils.testUser));
    funcs.get('yaht_roll')(tutils.generateNewContext(tutils.testUser));
    funcs.get('yaht_aces')(tutils.generateNewContext(tutils.testUser));
}

const testFuncs = [
    testDisplay,
    testRoll,
].forEach(t => t());
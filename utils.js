function combinations(str, len=5) {
    console.log(str.length);
    var fn = function(active, rest, a) {
        // console.log(active);
        if (!(active.length || rest.length))
            return;
        if (!rest.length) {
            a.push(active);
        } else {
            fn(active.concat([rest[0]]), rest.slice(1), a);
            fn(active, rest.slice(1), a);
        }
        return a;
    }
    return fn([], str, []).filter(s => s.length == len);
}

module.exports = {
    combinations
}
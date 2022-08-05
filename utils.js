function combinations(str, len=5) {
    // console.log(str.length);
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

const stringAlignmentEnum = {
    LEFT: 0,
    CENTER: 1,
    RIGHT: 2,
    TOP: 3,
    BOTTOM: 4,
}

function padString(str, n, align=stringAlignmentEnum.LEFT, c=' ') {
    let diff = n - str.length;
    if (diff > 0) {
        switch(align) {
            case stringAlignmentEnum.BOTTOM:
            case stringAlignmentEnum.TOP:
            case stringAlignmentEnum.LEFT:
                return str.padEnd(n, c);
            case stringAlignmentEnum.CENTER:
                return str.padEnd(str.length + ((diff >> 1) + ((diff % 2 == 0) ? 0 : 1)), c).padStart(n, c);
            case stringAlignmentEnum.RIGHT:
                return str.padStart(n, c);
        }
    }
    else return str;
}

function boxString(str, align=stringAlignmentEnum.LEFT, fillChar=' ') {
    let lines = str.split('\n');
    let maxLen = 0;
    lines.forEach(l => {
        if (maxLen < l.length) maxLen = l.length;
    })
    lines = lines.map(l => '\u2502' + padString(l, maxLen, align, fillChar) + '\u2502');
    let filler = '\u2500'.repeat(maxLen)
    lines.unshift('\u250c' + filler + '\u2510');
    lines.push('\u2514' + filler + '\u2518');
    return lines.join('\n');
}

function alignMultilineString(s, align=stringAlignmentEnum.LEFT, fillChar=' ') {
    let maxLen = 0;
    let lines = s.split('\n');
    lines.forEach(li => {
        if (maxLen < li.length) maxLen = li.length;
    });
    return lines.map(li => padString(li, maxLen, align, fillChar)).join('\n');
}

function padStringVertical(s, n, align=stringAlignmentEnum.TOP) {
    let lines = s.split('\n');
    let diff = n - lines.length;
    let result = [];
    switch(align) {
        case stringAlignmentEnum.LEFT:
        case stringAlignmentEnum.RIGHT:
        case stringAlignmentEnum.TOP:
            for(let i = 0; i++ < diff;) {
                result.push('');
            }
            result = result.concat(lines);
            break;
        case stringAlignmentEnum.CENTER:
            for(let i = 0; i++ < (diff >> 1);) {
                result.push('');
            }
            result = result.concat(lines);
            for(let i = 0; i++ < ((diff >> 1) + ((diff % 2 == 0) ? 0 : 1));) {
                result.push('');
            }
            break;
        case stringAlignmentEnum.BOTTOM:
            result = result.concat(lines);
            for(let i = 0; i++ < diff;) {
                result.push('');
            }
            break;
    }
    return result.join('\n');
}

function concatMultilineStrings(sarr, align=stringAlignmentEnum.LEFT, valign=stringAlignmentEnum.CENTER, fillChar=' ') {
    let lines = sarr.map(s => s.split('\n'));

    let maxVertLength = 0;
    lines.forEach(l => {
        if (l.length > maxVertLength) maxVertLength = l.length;
    });

    lines = lines.map(l => alignMultilineString(padStringVertical(l.join('\n'), maxVertLength, valign), align, fillChar).split('\n'));

    let resultLines = [];
    for (let r = 0; r < maxVertLength; r++) {
        let resultLine = '';
        lines.forEach(l => resultLine += l[r]);
        resultLines.push(resultLine);
    }

    return resultLines.join('\n');
}

module.exports = {
    combinations,
    stringAlignmentEnum,
    padString,
    padStringVertical,
    alignMultilineString,
    boxString,
    concatMultilineStrings,
}
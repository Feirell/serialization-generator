function* getAllMatches(reg: RegExp, str: string) {
    let m;

    while ((m = reg.exec(str)) !== null) {
        if (m.index === reg.lastIndex)
            reg.lastIndex++;

        yield m;
    }
}

function getLastMatch(reg: RegExp, str: string) {
    let last = undefined;

    for (const m of getAllMatches(reg, str))
        last = m;

    return last;
}

const spaceMatcher = /^( *)[^\n ]/gm;

function getLastLineIndent(str: string) {
    return (getLastMatch(spaceMatcher, str) as RegExpMatchArray)[0].length;
}

function getMinIndent(str: string) {
    if (!str.startsWith('\n'))
        return 0;

    let minIndent: undefined | number = undefined;
    for (const m of getAllMatches(spaceMatcher, str)) {

        // debugger;
        const length = m[1].length;
        if (minIndent == undefined || length < minIndent)
            minIndent = length;
    }

    return minIndent as number;
}

const specificIndentMatcher = (() => {
    const indentMatcher: RegExp[] = [];

    const specificIndentMatcher = (indent: number) =>
        indent in indentMatcher ?
            indentMatcher[indent] :
            indentMatcher[indent] = new RegExp('^( {' + indent + '})', 'gm');

    for (let i = 0; i < 20; i++)
        indentMatcher.push(specificIndentMatcher(i));

    return specificIndentMatcher;
})();

export function fncWithAlign(strings: ReadonlyArray<string>, ...args: string[]) {
    let minIndent: undefined | number = undefined;

    for (const str of strings) {
        const localMinIndent = getMinIndent(str);
        if (minIndent == undefined || localMinIndent < minIndent)
            minIndent = localMinIndent;
    }

    const adjustIndent = specificIndentMatcher(minIndent as number);
    let ret = '';
    for (let i = 0; i < strings.length; i++) {
        // reduce all by adjustIndent
        const reducedCurrent = strings[i].replace(adjustIndent, '');

        ret += reducedCurrent;
        if (i < args.length) {
            const indentOfInsert = getLastLineIndent(reducedCurrent);

            // indenting the snipped to the same depth as
            const adjusted = args[i]
                // prepend all line by indentOfInsert times spaces
                .replace(/^/gm, ' '.repeat(indentOfInsert))
                // removing the spaces again on the first line of the insert since they are already present
                .replace(new RegExp('^ {' + indentOfInsert + '}'), '');

            ret += adjusted;
        }
    }

    return ret;
}

export function fnc(strings: ReadonlyArray<string>, ...args: string[]) {
    let ret = '';
    for (let i = 0; i < strings.length; i++) {
        ret += strings[i];
        if (i < args.length) {
            ret += args[i];
        }
    }

    return ret;
}

export function fncPrefixAndArr(prefix: string, ...arr: string[]) {
    return fnc([prefix].concat(new Array(arr.length).fill('')), ...arr);
}
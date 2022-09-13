import {
condition,
left,
many,
    map,
    middle,
    option,
    or,
    Parser, right, satisfy, sepBy, sepBy1, takeUntilP
} from "https://deno.land/x/peberminta@v0.8.0/core.ts"
import {
char,
    concat,
noneOf,
str,
parse,
} from "https://deno.land/x/peberminta@v0.8.0/char.ts"

type Options = {
    fieldSeparator: string
    whitespaces: string
    headerRow: boolean
    trimUnquotedFields: boolean
}

type Csv = {
    header?: string[]
    records: string[][]
}

const whitespace_
    : Parser<string, Options, string>
    = satisfy(
        (c, data) => data.options.whitespaces.includes(c)
    )
const optionalWhitespaces_ = many(whitespace_)

function possiblyCaptureWhitespace(
    p1: Parser<string, Options, string>
): Parser<string, Options, string> {
    return condition(
        data => data.options.trimUnquotedFields,
        concat(
            optionalWhitespaces_,
            p1,
            optionalWhitespaces_,
        ),
        p1,
    )
}

const linebreak_ = possiblyCaptureWhitespace(
    concat(
        option(char("\r"), ""),
        char("\n"),
    )
)

const sep_ = possiblyCaptureWhitespace(
    satisfy(
        (c, data) => c == data.options.fieldSeparator
    )
)

const qchar_ = or(
    map(
        str(`""`),
        () => `"`,
    ),
    noneOf(`"`)
)

const qstr_ = middle(
    right(optionalWhitespaces_, char(`"`)),
    concat(many(qchar_)),
    left(char(`"`), optionalWhitespaces_),
)

const schar_
    : Parser<string, Options, string>
    = satisfy(
        (c, data) => !`"\r\n`.includes(c) && c != data.options.fieldSeparator
    )

const sstr_ = concat(
    takeUntilP(
        schar_,
        or(sep_, linebreak_),
    )
)

const field_ = or(qstr_, sstr_)
const record_ = sepBy(field_, sep_)
const csv_
    : Parser<string, Options, Csv>
    = condition(
        data => data.options.headerRow,
        map(
            sepBy1(record_, linebreak_),
            rs => ({
                header: rs[0],
                records: rs.slice(1),
            })
        ),
        map(
            sepBy(record_, linebreak_),
            rs => ({ records: rs }),
        )
    )

function parseCsv(str: string, options: Options): Csv {
    return parse(csv_, str, options)
}
console.log(parseCsv(`
foo,bar,baz
12,34,56
`.trim(), {
    fieldSeparator: ",",
    whitespaces: " \t",
    headerRow: false,
    trimUnquotedFields: false,
}))
import { describe, it, expect } from 'vitest'
import {
    parseError,
    sanitizeObject,
    generateColor,
    num2Int,
    sumInt,
    getLevelColor,
    getNestedValue,
    extractMustacheVars,
} from '../src/utils/function'
import {
    UNKNOWN_ERR_CODE,
    UNKNOWN_ERR_MESSAGE,
    CRITICAL_LOG_LEVEL,
    ERROR_LOG_LEVEL,
    WARNING_LOG_LEVEL,
    INFO_LOG_LEVEL,
    SUCCESS_LOG_LEVEL,
    DEAD_LETTER_QUEUE_LOG_LEVEL,
} from '../src/utils/constant'

describe('parseError', () => {
    it('prefers the axios response body message', () => {
        expect(
            parseError({
                error: 404,
                message: 'Request failed with status code 404',
                response: { data: { message: 'Project Not Found' } },
            })
        ).toEqual({ error: 404, message: 'Project Not Found' })
    })

    it('falls back to the local message', () => {
        expect(parseError({ error: 500, message: 'Network Error' })).toEqual({
            error: 500,
            message: 'Network Error',
        })
    })

    it('falls back to the unknown-error defaults', () => {
        expect(parseError({})).toEqual({
            error: UNKNOWN_ERR_CODE,
            message: UNKNOWN_ERR_MESSAGE,
        })
    })
})

describe('sanitizeObject', () => {
    it('drops undefined, null and empty-string values', () => {
        expect(sanitizeObject({ a: 1, b: undefined, c: null, d: '' })).toEqual({ a: 1 })
    })

    it('drops empty arrays and empty plain objects', () => {
        expect(sanitizeObject({ a: [], b: {}, c: [1], d: { x: 1 } })).toEqual({
            c: [1],
            d: { x: 1 },
        })
    })

    it('keeps falsy values that are not empty', () => {
        expect(sanitizeObject({ zero: 0, no: false })).toEqual({ zero: 0, no: false })
    })
})

describe('generateColor', () => {
    it('is stable for the same input', () => {
        expect(generateColor('logstyx')).toBe(generateColor('logstyx'))
    })

    it('always returns a tailwind background class', () => {
        for (const name of ['a', 'ada', 'project-one', 'ZZZ']) {
            expect(generateColor(name)).toMatch(/^bg-[a-z]+-500$/)
        }
    })

    it('is order-insensitive, since it sums char codes', () => {
        expect(generateColor('ab')).toBe(generateColor('ba'))
    })
})

describe('num2Int', () => {
    it('truncates numeric input', () => {
        expect(num2Int('10.9')).toBe(10)
    })

    it('falls back to 0 for non-numeric input', () => {
        expect(num2Int('abc')).toBe(0)
        expect(num2Int(undefined)).toBe(0)
    })
})

describe('sumInt', () => {
    it('sums numeric strings and numbers', () => {
        expect(sumInt(['3', 4, 5.9])).toBe(12)
    })

    it('returns 0 for an empty list', () => {
        expect(sumInt([])).toBe(0)
    })
})

describe('getLevelColor', () => {
    it('maps every known level to its badge colour', () => {
        expect(getLevelColor(CRITICAL_LOG_LEVEL)).toBe('red')
        expect(getLevelColor(ERROR_LOG_LEVEL)).toBe('orange')
        expect(getLevelColor(WARNING_LOG_LEVEL)).toBe('yellow')
        expect(getLevelColor(INFO_LOG_LEVEL)).toBe('blue')
        expect(getLevelColor(SUCCESS_LOG_LEVEL)).toBe('green')
    })

    it('falls back to gray for unmapped levels', () => {
        expect(getLevelColor(DEAD_LETTER_QUEUE_LOG_LEVEL)).toBe('gray')
        expect(getLevelColor(undefined)).toBe('gray')
    })
})

describe('getNestedValue', () => {
    it('walks a dotted path', () => {
        expect(getNestedValue({ a: { b: { c: 7 } } }, 'a.b.c')).toBe(7)
    })

    it('returns undefined for a missing branch instead of throwing', () => {
        expect(getNestedValue({ a: {} }, 'a.b.c')).toBeUndefined()
    })
})

describe('extractMustacheVars', () => {
    it('collects trimmed, de-duplicated variable names', () => {
        expect(extractMustacheVars('{{a}} {{ b.c }} {{a}}')).toEqual(['a', 'b.c'])
    })

    it('returns an empty array for empty input', () => {
        expect(extractMustacheVars('')).toEqual([])
        expect(extractMustacheVars(undefined)).toEqual([])
    })
})

function extractOrderNumber(title) {
    if (title == null || title === '') {
        return Number.MAX_SAFE_INTEGER
    }

    const s = String(title).trim()
    const labeled = s.match(/^(?:Chương|Bài(?:\s+học)?|Lesson)\s*(\d+)/i)
    if (labeled) {
        return parseInt(labeled[1], 10)
    }

    const leading = s.match(/^(\d+)\s*[:.)]/)
    if (leading) {
        return parseInt(leading[1], 10)
    }

    return Number.MAX_SAFE_INTEGER
}

function sortByTitleNumber(items, getTitle = (item) => item.title ?? item.name) {
    return [...items].sort((a, b) => {
        const titleA = getTitle(a)
        const titleB = getTitle(b)
        const diff = extractOrderNumber(titleA) - extractOrderNumber(titleB)
        if (diff !== 0) {
            return diff
        }
        return String(titleA).localeCompare(String(titleB), 'vi', { numeric: true })
    })
}

module.exports = { extractOrderNumber, sortByTitleNumber }

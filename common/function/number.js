//@ts-check

exports.num2Float = (number) => {
    if (isNaN(number)) {
        return 0;
    }

    return parseFloat(number);
};

exports.num2Int = (number) => {
    if (isNaN(number)) {
        return 0;
    }

    return parseInt(number);
};

exports.num2Floor = (number, floor = 0) => {
    number = this.num2Int(number);
    floor = this.num2Int(floor);

    return Math.max(number, floor);
};

exports.num2Ceil = (number, ceil = 50) => {
    number = this.num2Int(number);
    ceil = this.num2Int(ceil);

    return Math.min(number, ceil);
};

exports.sumFloat = (arr) => {
    let sum = arr.reduce((total, count) => {
        return this.num2Float(total) + this.num2Float(count);
    }, 0);
    let sumString = sum.toString();
    return this.num2Float(sumString);
};

exports.sumInt = (arr) => {
    let sum = arr.reduce((total, count) => {
        return this.num2Int(total) + this.num2Int(count);
    }, 0);
    return sum;
};
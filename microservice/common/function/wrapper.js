module.exports = {
    asyncHandler: (fn) => {
        return (...args) => {
            const errorHandler = args[args.length - 1];
            const handleError = typeof errorHandler === 'function' ? errorHandler : console.error;

            return Promise.resolve(fn(...args)).catch(handleError);
        }
    }
}
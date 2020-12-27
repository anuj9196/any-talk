exports.serializeUser = (data) => {
    // Validate for array
    if (!data instanceof Array) {
        return Error('Data should be array');
    }

    const d = {};
    for (let i = 0; i < data.length; i++) {
        d[data[i].name] = data[i].value;
    }

    return d;
}
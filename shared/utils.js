(function(global) {
    const utils = {
        isNode: typeof window === 'undefined',

        exportModule: function(module) {
            if (this.isNode) {
                module.exports = module;
            } else {
                Object.entries(module).forEach(([key, value]) => {
                    global[key] = value;
                });
            }
        }
    };

    if (utils.isNode) {
        module.exports = utils;
    } else {
        global.Utils = utils;
    }
})(typeof window !== 'undefined' ? window : global);
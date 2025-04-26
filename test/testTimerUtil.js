
const testTimer = {};

function startTestTimer(name) {
    testTimer[name] = Date.now();
}

function endTestTimer(name) {
    console.log(`[${name}] Test duration: ${Date.now() - testTimer[name]}ms`);
}

module.exports = {
    startTestTimer,
    endTestTimer,
};
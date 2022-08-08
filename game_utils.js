class GameBoard {
    constructor() {
        this.gameMap = new Map();
        this.gameState = 0;
        this.stateMap = {
            'initialize': this.initialize,
            'exit': this.exit,
            'final': this.finalState,
        };
        this.state = {
            isExiting: false,
            stateQueue: [],
        };
        this.state.stateQueue.push('initialize');
    }
    processState() {
        while (this.state.stateQueue.length > 0) {
            let currentState = this.state.stateQueue.shift();
            this.stateMap[currentState]();
        }
    }
    display() {}
    evaluateState() {}
    initialize() {}
    exit() {
        this.state.isExiting = true;
    }
    finalState() {}
}

module.exports = {
    GameBoard,
}
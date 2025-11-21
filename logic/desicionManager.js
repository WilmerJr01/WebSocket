export const waitingForDecision = new Map();

export function waitForDecision(jugador) {
    return new Promise((resolve) => {
        waitingForDecision.set(jugador, resolve);
    });
}
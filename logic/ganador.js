import { Carta } from './clases.js';
import { Player, Mesa, Mano } from './clases.js';
export function mejor_mano(jugadores){
    jugadores.sort((a, b) => a.puntaje - b.puntaje);
    if(jugadores[jugadores.length-1].puntaje > jugadores[jugadores.length-2].puntaje){
        console.log('-----------------------------')
        console.log(`EL GANADOR ES EL JUGADOR ${jugadores[jugadores.length-1].nombre}`)
        console.log('-----------------------------')
        return [jugadores[jugadores.length-1], 1]
    } else {
        const puntaje_mas_alto = jugadores[jugadores.length-1].puntaje;
        //players with the same hand
        let pwtsh = []
        let ind = 0
        for(let i = jugadores.length-1; i >= 0; i--){
            if(jugadores[i].puntaje == puntaje_mas_alto){
                pwtsh[ind] = jugadores[i]
                ind++
            }
        }
        if(puntaje_mas_alto == 10 || puntaje_mas_alto == 6 || puntaje_mas_alto == 5 || puntaje_mas_alto == 1){
            return desempate_escaleras(pwtsh)
        } else {
            return desempate_pares(pwtsh)
        } 
    }
}

export function desempate_escaleras(jugadores){
    for(let j = 0; j < jugadores.length - 1; j++){
        for(let i = 4; i >= 0; i--){
            jugadores.sort((a, b) => a.mano[i].valor - b.mano[i].valor)
            jugadores = jugadores.reverse()
            if(jugadores[j].mano[i].valor > jugadores[j+1].mano[i].valor){
                jugadores.splice(j+1,1)
                j = j-1;
                break
            }
        }
    }
    if(jugadores.length == 1){
        console.log('-----------------------------')
        console.log(`EL GANADOR ES EL JUGADOR ${jugadores[0].nombre}`)
        console.log('-----------------------------')
        return [jugadores[0], 1]
    } else {
        console.log('---------------------------------------')
        console.log(`EMPATE`)
        console.log('---------------------------------------')
        return [jugadores, jugadores.length]
    }   
}

export function desempate_pares(jugadores){
    for(let j = 0; j < jugadores.length - 1; j++){
        for(let i = 0; i <= 4; i++){
            jugadores.sort((a, b) => a.mano[i].valor - b.mano[i].valor)
            jugadores = jugadores.reverse()
            if(jugadores[j].mano[i].valor > jugadores[j+1].mano[i].valor){
                jugadores.splice(j+1,1)
                j = j-1;
                break
            }
        }
    }
    if(jugadores.length == 1){
        console.log('-----------------------------')
        console.log(`EL GANADOR ES EL JUGADOR ${jugadores[0].nombre}`)
        console.log('-----------------------------')
        return [jugadores[0], 1]
    } else {
        console.log('---------------------------------------')
        console.log(`EMPATE`)
        console.log('---------------------------------------')
        return [jugadores, jugadores.length]
    }   
}
import { pre_players_order, in_game_order, preflop, action } from "./jugabilidad.js"
import { Player, Mesa } from "./clases.js";
import { Carta } from './clases.js';
import { mazo } from './cartas.js';
import { mejor_mano } from './ganador.js';


/// PRUEBA PREFLOP

export function prueba_preflop(){
    let mano = []
    const A = new Player('AAAA', mano, 10, 100, 0);
    const B = new Player('BBBB', mano, 10, 100, 0);
    const C = new Player('CCCC', mano, 10, 100, 0);
    const D = new Player('DDDD', mano, 10, 100, 0);
    const E = new Player('EEEE', mano, 10, 100, 0);
    const F = new Player('FFFF', mano, 10, 100, 0);

    let mesa1 = new Mesa(0)

    let pre_players = [A, B, C, D, E, F]

    let players = preflop(pre_players, mesa1)
}

/// PRUEBA PREFLOP CON DOS CARTAS

export function prueba_pf_doscartas(){
    const mazoMezclado = [...mazo].sort(() => Math.random() - 0.5);
    
    let jugadores = []
    let mano_mesa = []
    let mano_p1 = []
    let mano_p2 = []
    let mano_p3 = []
    let mano_p4 = []
    let mano_p5 = []
    let mano_p6 = []


    const A = new Player('AAAA', mano_p1, 10, 100, 0);
    const B = new Player('BBBB', mano_p2, 10, 100, 0);
    const C = new Player('CCCC', mano_p3, 10, 100, 0);
    const D = new Player('DDDD', mano_p4, 10, 100, 0);
    const E = new Player('EEEE', mano_p5, 10, 100, 0);
    const F = new Player('FFFF', mano_p6, 10, 100, 0);

    

    let pre_players = [A, B, C, D, E, F]

    let mesa1 = new Mesa(0, mano_mesa, pre_players)

    let players = preflop(pre_players, mesa1)

}
prueba_pf_doscartas()





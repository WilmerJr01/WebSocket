import { Carta } from './clases.js';
import { Player, mano_mesa, Mano } from './clases.js';
import { Value_order, Palo_order, pair, double_pair, three_of_a_kind, straight, flush, full_house, four_of_a_kind, straight_flush, verificar } from './Manos.js';
import { mazo } from './cartas.js';
import { mejor_mano } from './ganador.js';

const mazoMezclado = [...mazo].sort(() => Math.random() - 0.5);
//const mazoMezclado = mazo;
const p = 0;
const c = 13;
const d = 26;
const t = 39;

//const indices = [0+d,12+d,11+d,10+d,9+d,9+p,12+c]
const indices = [6, 7, 8, 9, 10]
const mano_p1 = new mano_mesa('mano_mesa P1', mazoMezclado[0], mazoMezclado[1], mazoMezclado[indices[0]], mazoMezclado[indices[1]], mazoMezclado[indices[2]], mazoMezclado[indices[3]], mazoMezclado[indices[4]]);
const mano_p2 = new mano_mesa('mano_mesa P2', mazoMezclado[2], mazoMezclado[3], mazoMezclado[indices[0]], mazoMezclado[indices[1]], mazoMezclado[indices[2]], mazoMezclado[indices[3]], mazoMezclado[indices[4]]);
const mano_p3 = new mano_mesa('mano_mesa P3', mazoMezclado[4], mazoMezclado[5], mazoMezclado[indices[0]], mazoMezclado[indices[1]], mazoMezclado[indices[2]], mazoMezclado[indices[3]], mazoMezclado[indices[4]]);


mano_p1.mostrarCartas();
mano_p2.mostrarCartas();
mano_p3.mostrarCartas();

console.log('PLAYER 1')
const [validar, puntaje] = verificar(mano_p1.cartas);
const p1 = new Player('P1', validar, puntaje, 0);
console.log(`Mano P1: ${validar[0].cara}${validar[0].palo}, ${validar[1].cara}${validar[1].palo}, ${validar[2].cara}${validar[2].palo}, ${validar[3].cara}${validar[3].palo}, ${validar[4].cara}${validar[4].palo}`);
console.log(`Puntaje P1: ${p1.puntaje}`)

console.log('PLAYER 2')
const [validar2, puntaje2] = verificar(mano_p2.cartas);
const p2 = new Player('P2', validar2, puntaje2, 0);
console.log(`Mano P2: ${validar2[0].cara}${validar2[0].palo}, ${validar2[1].cara}${validar2[1].palo}, ${validar2[2].cara}${validar2[2].palo}, ${validar2[3].cara}${validar2[3].palo}, ${validar2[4].cara}${validar2[4].palo}`);
console.log(`Puntaje P2: ${p2.puntaje}`)

console.log('PLAYER 3')
const [validar3, puntaje3] = verificar(mano_p3.cartas);
const p3 = new Player('P3', validar3, puntaje3, 0);
console.log(`Mano P3: ${validar3[0].cara}${validar3[0].palo}, ${validar3[1].cara}${validar3[1].palo}, ${validar3[2].cara}${validar3[2].palo}, ${validar3[3].cara}${validar3[3].palo}, ${validar3[4].cara}${validar3[4].palo}`);
console.log(`Puntaje P3: ${p3.puntaje}`)

const jugadores = [p1, p2, p3]
const winner = mejor_mano(jugadores)
console.log(winner)


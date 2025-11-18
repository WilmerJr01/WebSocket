import mongoose from "mongoose";
import Table from "../src/models/Table.js";
import User from "../src/models/User.js";
/// desde aqui
import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { mazo } from './cartas.js';
import { mejor_mano } from './ganador.js';
import { verificar } from './Manos.js';

//reorganiza el vector de jugadores para rotar los roles (dealer, SB, BB)
function reorganizarDesdeIndice(v, indice) {
    if (indice < 0 || indice >= v.length) {
        throw new Error('Índice fuera de rango');
    }

    const parte1 = v.slice(indice);     // Desde el índice hasta el final
    const parte2 = v.slice(0, indice);  // Desde el inicio hasta el índice - 1

    return [...parte1, ...parte2];
}


export function pre_players_order(v) {
    if (v.length === 0) return v; // Maneja el caso de array vacío
    let primero = v.shift();      // Elimina el primer elemento
    v.push(primero);              // Lo agrega al final
    return v;
}

//organiza el vector para el flop (el primero del vector es la SB, el segundo la BB y asi sucesivamente)
export function in_game_order(v) {
    let nuevo_vector = []
    if (v.length < 2) return [...v]; // Si tiene menos de 2 elementos, no se reorganiza

    const penultimo = v[v.length - 2];
    const ultimo = v[v.length - 1];
    const resto = v.slice(0, v.length - 2);

    return nuevo_vector = [penultimo, ultimo, ...resto];

}

//funcion generica para preguntar que hacer a cada jugador
function preguntar(texto) {
    const rl = readline.createInterface({ input, output });

    return new Promise((resolve) => {
        rl.question(texto, (respuesta) => {
            rl.close();
            resolve(respuesta.toUpperCase());
        });
    });
}

//funcion especifica para preguntar que hacer a cada jugador
export async function action(pre_player) {
    console.log(`PLAYER ${pre_player.nombre}`);
    const respuesta = await preguntar('¿Pagar, subir o foldear? (P/S/F): ');

    if (respuesta === 'P') {
        return "limp";
    } else if (respuesta === 'F') {
        return "fold";
    } else if (respuesta == 'S') {
        return "raise";
    } else {
        console.log('Entrada no válida');
        return await action(pre_player); // Reintenta si la entrada no es válida
    }
}

//funcion para preguntar cuanto se va a subir en caso de que un jugador decida hacer raise
export async function howmuch(pre_player, bet) {
    console.log(`PLAYER ${pre_player.nombre}`);
    const respuesta = await preguntar('¿Cuanto desea subir?: ');
    const numero = Number(respuesta);

    if (Number.isInteger(numero)) {
        if (numero <= pre_player.fichas + pre_player.bet) {
            if (numero > bet) {
                return numero
            } else {
                console.log('El monto digitado debe ser mayor a la apuesta actual');
                return await howmuch(pre_player, bet); // Reintenta si la entrada no es válida
            }
        } else {
            console.log('El monto digitado supera su capacidad');
            return await howmuch(pre_player, bet); // Reintenta si la entrada no es válida
        }
    }
    else {
        console.log('Entrada no válida');
        return await howmuch(pre_player, bet); // Reintenta si la entrada no es válida
    }
}

//funcion para preguntar que hacer a quien está en la BB ya que el no tiene la opcion de hacer call sino solo chequear o foldear o hacer raise
export async function action_BB(pre_player) {
    console.log(`PLAYER ${pre_player.nombre}`);
    const respuesta = await preguntar('¿Chequear, subir o foldear? (C/S/F): ');

    if (respuesta === 'C') {
        return "check";
    } else if (respuesta === 'F') {
        return "fold";
    } else if (respuesta === "S") {
        return "raise";
    } else {
        console.log('Entrada no válida');
        return await action_BB(pre_player); // Reintenta si la entrada no es válida
    }
}

//funcion que maneja las preguntas a cada jugador, la mas importante
//recibe como parametros:
//una lista "pre_players" que está en el orden en que va a preguntar
//una lista "players" que es una lista auxiliar de la que se van a eliminar los jugadores que vayan foldeando
//una "mesa" que como tal seria lo que tiene la informacion del juego (la SB, la BB y la cantidad de fichas en la mesa)
//un "initial_bet" que seria lo que se debe pagar para entrar o para seguir en la mesa

//retorna la lista de jugadores que avanzan de ronda y la mesa con sus datos actualizados (el pozo o la cantidad de fichas en la mesa)
export async function turnos(pre_players, players, mesa, initial_bet) {

    for (let i = 0; i < pre_players.length; i++) {
        //console.log("-----------------------")    
        //console.log(`Mano ${pre_players[i].nombre}: ${pre_players[i].mano[0].cara}${pre_players[i].mano[0].palo}, ${pre_players[i].mano[1].cara}${pre_players[i].mano[1].palo}`)

        //pregunta si el jugador al que se le está preguntando es el ultimo en la lista
        if (i == pre_players.length - 1) {
            //si es el ultimo jugador y la lista de jugadores solo tiene un jugador en ella, se declara como ganador (todos foldearon)
            if (players.length < 2) {
                //aqui se ejecutaria la funcion que muestra al ganador en pantalla
                //funcion_mostrarGanador()

                //se le suman las fichas de la mesa a su cuenta de fichas personal
                players[0].fichas = players[0].fichas + mesa.bet
                //reorganiza el vector de jugadores para rotar la BB
                mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                return [false, mesa]
            }
            //si el jugador es el ultimo pero aun hay mas jugadores en la lista, pregunta que hacer
            //la variable decision2 lo que debe esperar es la respuesta que devuelva el boton que presione el jugador 
            //por lo que el "await action_BB" debe ser cambiado por un await que espere el boton que presione el jugador
            const decision2 = await action_BB(pre_players[i])
            //si el jugador decide foldear, se recorre el vector de jugadores buscando el id del jugador y se expulsa del vector
            if (decision2 === "fold") {
                for (let j = 0; j < players.length; j++) {
                    if (players[j].nombre === pre_players[i].nombre) {
                        players.splice(j, 1)
                    }
                }
                //si luego de foldear el ultimo jugador solo queda un jugador en la lista de jugadores, se declara como ganador
                if (players.length < 2) {
                    //funcion_mostrarGanador()
                    //se suman las fichas a su cuenta personal de fichas  
                    players[0].fichas = players[0].fichas + mesa.bet
                    //reorganiza el vector de jugadores para rotar la BB
                    mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                    return [false, mesa]
                } else {
                    //si luego de foldear hay mas de un jugador en la lista, se retorna la lista de jugadores en la mesa y la
                    //mesa para tener acceso a la informacion en ella (Las fichas que ya estan en ella)
                    return [players, mesa]
                }
                //si el ultimo jugador decide hacer raise se pregunta cuanto con la funcion howmuch
                //esta funcion tambien debe ser cambiada por una que reciba la respuesta de frontend
            } else if (decision2 === "raise") {
                //new_bet va a ser la cantidad para entrar o seguir en la mesa, o sea el valor del raise
                const new_bet = await howmuch(pre_players[i], initial_bet)

                //una vez se reciba cuando subió el jugador, se resta de su cuenta de fichas la cantidad subida 
                //(la cantidad subida es igual a lo digitado (new_bet) menos lo que se haya puesto en la mesa en esa ronda)
                pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
                //tambien se actualiza la cantidad de fichas en la mesa
                mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
                //y se actualiza lo que el jugador ha puesto en la mesa
                pre_players[i].bet = new_bet

                //se ejecuta la funcion raise que es basicamente otra funcion turnos pero con la lista reordenada y con una nueva apuesta inicial
                return await raise(players, new_bet, 2, mesa)/////////
            } else {
                //si la decision es diferente a raise o fold, o sea check, se retorna la lista y la mesa para avanzar de ronda
                if (players.length > 1) {
                    return [players, mesa]
                } else {
                    players[0].fichas = players[0].fichas + mesa.bet
                    //reorganiza el vector de jugadores para rotar la BB
                    mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                    return [false, mesa]
                }
            }
        } else {
            //si el jugador al que se le pregunta no es el ultimo de la lista
            let decision = "a"
            if (initial_bet > 0) {
                //si el jugador no ha puesto fichas en la mesa, se ejecuta action que no da la opcion de chequear
                decision = await action(pre_players[i]);
            } else {
                //si el jugador ya puso fichas en la mesa (es la BB) se ejecuta action_BB que da la opcion de chequear
                decision = await action_BB(pre_players[i]);
            }
            if (decision === "fold") {
                for (let j = 0; j < players.length; j++) {
                    if (players[j].nombre === pre_players[i].nombre) {
                        players.splice(j, 1)
                    }
                }
                //este uno debe ser reemplazado por el valor de la smallblind, se debe poder acceder al valor por medio de la mesa
                if (initial_bet < 1) {
                    //luego de que algun jugador foldee, se reduce el valor del indice del for para no saltarse al jugador al lado de quien foldeo
                    i = i - 1
                }

                ////
            } else if (decision === "raise") {
                // el raise funciona igual
                const new_bet = await howmuch(pre_players[i], initial_bet)

                pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
                pre_players[i].bet = pre_players[i].bet + (new_bet - pre_players[i].bet)

                for (let j = 0; j < players.length; j++) {

                    if (players[j].nombre === pre_players[i].nombre) {
                        //busca el indice del jugador en el vector auxiliar
                        if (j == players.length - 1) {
                            return await raise(players, new_bet, 0, mesa)
                        } else {
                            //se manda a la funcion raise el indice j+1 ya que el primero al que se le debe preguntar es a quien está al lado de quien hizo raise
                            return await raise(players, new_bet, j + 1, mesa)
                        }
                    }
                }

            } else if (decision === "limp") {
                //si el jugador hace call o "limpea", se ejecuta el mismo proceso que como is hiciera raise pero cobrando lo de la apuesta actual
                pre_players[i].fichas = pre_players[i].fichas - (initial_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (initial_bet - pre_players[i].bet)
                pre_players[i].bet = pre_players[i].bet + (initial_bet - pre_players[i].bet)

            } //aqui habia un else vacio
        }

        console.log(`POZO: ${mesa.bet}`)
    }
}


//recibe como parametros:
//una lista pre_players, un initial_bet y una mesa que hacen lo mismo que en turnos
//un indice que es desde donde se va a reordenar la lista pre_players para preguntar que hacer
//funciona basicamente igual que turnos y retorna lo mismo
export async function raise(pre_players, initial_bet, indice, mesa) {
    let players = pre_players
    pre_players = reorganizarDesdeIndice(pre_players, indice)

    for (let i = 0; i < pre_players.length - 1; i++) {
        //aqui en vez de parar en el ultimo de la lista, para en el penultimo
        //ya que cuando se hace raise, al ultimo al que se le pregunta es a quien está a la derecha de quien hizo raise
        //ejemplo: jugadores = [a, b, c, d], si b hace raise, se manda el indice 2 (jugadores[2] = c) 
        // y se reorganiza el vector de tal manera que quede new_jugadores = [c, d, a, b]
        if (i == pre_players.length - 2) {
            if (players.length < 2) {
                //funcion_mostrarGanador()
                players[0].fichas = players[0].fichas + mesa.bet
                //reorganiza el vector de jugadores para rotar la BB
                mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                return [false, mesa]
            }
            const decision2 = await action(pre_players[i])
            if (decision2 === "fold") {
                for (let j = 0; j < players.length; j++) {
                    if (players[j].nombre === pre_players[i].nombre) {
                        players.splice(j, 1)
                    }
                }
                if (players.length < 2) {
                    //funcion_mostrarGanador()
                    players[0].fichas = players[0].fichas + mesa.bet

                    //reorganiza el vector de jugadores para rotar la BB
                    mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                    return [false, mesa]

                }
            } else if (decision2 === "raise") {
                const new_bet = await howmuch(pre_players[i], initial_bet)
                pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
                pre_players[i].bet = new_bet
                for (let j = 0; j < players.length; j++) {
                    if (players[j].nombre === pre_players[i].nombre) {
                        return await raise(players, new_bet, j + 1, mesa)
                    }
                }
            } else {
                pre_players[i].fichas = pre_players[i].fichas - (initial_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (initial_bet - pre_players[i].bet)
                pre_players[i].bet = pre_players[i].bet + (initial_bet - pre_players[i].bet)

                if (players.length > 1) {
                    return [players, mesa]
                } else {
                    //funcion_mostrarGanador()
                    players[0].fichas = players[0].fichas + mesa.bet

                    //reorganiza el vector de jugadores para rotar la BB
                    mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                    return [false, mesa]
                }
            }
        } else {
            const decision = await action(pre_players[i]);
            if (decision === "fold") {
                for (let j = 0; j < players.length; j++) {
                    if (players[j].nombre === pre_players[i].nombre) {
                        players.splice(j, 1)
                    }
                }
            } else if (decision === "raise") {
                const new_bet = await howmuch(pre_players[i], initial_bet)
                pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
                pre_players[i].bet = new_bet
                for (let j = 0; j < players.length; j++) {
                    if (players[j].nombre === pre_players[i].nombre) {
                        return await raise(players, new_bet, j + 1, mesa)
                    }
                }
            } else {
                pre_players[i].fichas = pre_players[i].fichas - (initial_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (initial_bet - pre_players[i].bet)
                pre_players[i].bet = pre_players[i].bet + (initial_bet - pre_players[i].bet)
            }
        }
    }
}

//preflop, recibe la lista de jugadores y la mesa con su informacion inicial
export async function preflop(pre_players, mesa) {
    //al inicio de cada partida hace que la cantidad de fichas puestas por cada jugador en la mesa sea cero
    for (let y = 0; y < pre_players.length; y++) {
        pre_players[y].bet = 0
    }
    // aqui deberia haber una funcion para limpiar la mesa en el front, quitar las fichas y las cartas de la ronda anterior
    //limpiar_mesa()
    console.log("--------------------")
    console.log("PREFLOP")
    console.log("--------------------")

    //mezcla el mazo
    const mazoMezclado = [...mazo].sort(() => Math.random() - 0.5);
    let aux = 0;
    //reparte las cartas a cada jugador (una por una, no entrega las dos a en seguida)
    for (let y = 0; y < pre_players.length * 2; y++) {
        indice = y % pre_players.length
        pre_players[indice].mano[0] = mazoMezclado[aux]
        aux = aux + 1
        //mostrar_cartasJugadores()
    }


    //organiza el vector auxiliar en el orden de juego (1. SB, 2.BB, ..., ultimo. dealer)
    let players = in_game_order(pre_players);
    //asignamos la initial_bet que en este caso seria la BB, hay que cambiarlo para que saque esta informacion de la mesa directamente
    let initial_bet = 2;
    //resta de la cuenta del ultimo jugador de la lista (la BB) el valor del la BB y del penultimo (la SB) el valor de la SB
    pre_players.at(-1).fichas = pre_players.at(-1).fichas - initial_bet
    pre_players.at(-2).fichas = pre_players.at(-2).fichas - (initial_bet / 2)

    //actualiza la cantidad de fichas que estos dos jugadores han puesto en la mesa
    pre_players.at(-1).bet = initial_bet
    pre_players.at(-2).bet = initial_bet / 2

    //actualiza la cantidad de fichas que estan puestas en la mesa (la BB + la SB)
    mesa.bet = initial_bet + initial_bet / 2

    //empieza a preguntar que hacer a cada jugador ejecutando "turnos"
    const [players2, mesa2] = await turnos(pre_players, players, mesa, initial_bet)

    //verifica que retorno la funcion turnos
    if (players2 != false) {
        //si retorno algo en la lista players2, pasa a la siguiente ronda
        flop(players2, mesa2, mazoMezclado)
    } else {
        //si retornó false en players2 significa que todos foldearon y hubo un ganador en preflop, se vuelve a ejecutar preflop
        //esperarNuevaPartida()
        preflop(mesa2.jugadores, mesa2)
        //hay que poner algun timer aqui para que se espere un tiempo entre una partida y otra
    }

    return players;
}

export async function flop(pre_players, mesa, mazo) {

    console.log("--------------------")
    console.log("FLOP")
    console.log("--------------------")

    let players = pre_players
    for (let y = 0; y < pre_players.length; y++) {
        //devuelve a 0 las fichas que ha puesto cada jugador en la mesa ya que es una nueva ronda
        pre_players[y].bet = 0
    }
    let cant_jug = pre_players.length
    cant_jug = cant_jug * 2

    mesa.mano[0] = mazo[cant_jug + 2]
    mesa.mano[1] = mazo[cant_jug + 3]
    mesa.mano[2] = mazo[cant_jug + 4]
    //aqui se ejecutaria la funcion para mostrar las cartas, las primeras 3 del flop
    //mostrar_cartas()
    console.log("--------------------")
    console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}`)
    console.log("--------------------")

    //pregunta que hacer luego de mostrar las cartas
    const [players2, mesa2] = await turnos(pre_players, players, mesa, 0)

    if (players2 != false) {
        //si hay mas de un jugador en la lista, avanza a la primera ronda
        thorn(players2, mesa2, mazo, cant_jug)
    } else {
        //sino, se inicia otra partida
        //esperarNuevaPartida()
        preflop(mesa2.jugadores, mesa2)
    }

}


export async function thorn(pre_players, mesa, mazo, cant_jug) {
    console.log("--------------------")
    console.log("THORN")
    console.log("--------------------")
    let players = pre_players
    for (let y = 0; y < pre_players.length; y++) {
        pre_players[y].bet = 0
    }
    mesa.mano[3] = mazo[cant_jug + 6]
    //mostrar_cartas()
    console.log("--------------------")
    console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}, ${mesa.mano[3].cara}${mesa.mano[3].palo}`)
    console.log("--------------------")

    const [players2, mesa2] = await turnos(pre_players, players, mesa, 0)

    if (players2 != false) {
        river(players2, mesa2, mazo, cant_jug)
    } else {
        //esperarNuevaPartida()
        preflop(mesa2.jugadores, mesa2)
    }
}


export async function river(pre_players, mesa, mazo, cant_jug) {
    console.log("--------------------")
    console.log("RIVER")
    console.log("--------------------")
    let players = pre_players
    for (let y = 0; y < pre_players.length; y++) {
        pre_players[y].bet = 0
    }
    mesa.mano[4] = mazo[cant_jug + 8]
    //mostrar_cartas()
    console.log("--------------------")
    console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}, ${mesa.mano[3].cara}${mesa.mano[3].palo}, ${mesa.mano[4].cara}${mesa.mano[4].palo}`)
    console.log("--------------------")

    const [players2, mesa2] = await turnos(pre_players, players, mesa, 0)

    if (players2 != false) {
        //si queda mas de un jugador en la lista para este punto, se ejecuta la funcion "definicion" que evalua que mano es mejor entre los jugadores de la mesa
        definicion(players2, mesa2)
    } else {
        //esperarNuevaPartida()
        preflop(mesa2.jugadores, mesa2)
    }
}


export async function definicion(pre_players, mesa) {
    console.log("--------------------")
    console.log("DEFINICION")
    console.log("--------------------")

    console.log("--------------------")
    console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}, ${mesa.mano[3].cara}${mesa.mano[3].palo}, ${mesa.mano[4].cara}${mesa.mano[4].palo}`)
    console.log("--------------------")

    //ejecuta la funcion mejor_mano que compara las manos de los jugadores para saber quien gana
    const [winner, num_ganadores] = mejor_mano(pre_players)

    if (num_ganadores == 1) {
        //averigua si hay uno o mas ganadores
        for (let i = 0; i < pre_players.length; i++) {
            if (winner.nombre === pre_players[i].nombre) {
                pre_players[i].fichas = pre_players[i].fichas + mesa.bet
                console.log(`GANADOR ${pre_players[i].nombre} | Fichas: ${pre_players[i].fichas}`);
            }
        }
    } else {
        //si hay mas de uno, divide las fichas de la mesa entre el numero de ganadores y las reparte
        mesa.bet = mesa.bet - (mesa.bet % num_ganadores)
        let bote = mesa.bet / num_ganadores
        for (let i = 0; i < pre_players.length; i++) {
            for (let j = 0; j < winner.length; j++) {
                if (winner[j].nombre === pre_players[i].nombre) {
                    pre_players[i].fichas = pre_players[i].fichas + bote
                    console.log(`GANADOR ${pre_players[i].nombre} | Fichas: ${pre_players[i].fichas}`);
                }
            }
        }
    }
    //reorganiza el vector de jugadores para rotar la BB
    mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
    //se inicia una nueva partida
    //esperarNuevaPartida()
    preflop(mesa.jugadores, mesa)

}


// hasta aqui

// Arranque real de mano (tu función ya preparada)
async function startHand(io, tableId, userIdToSocket, sendChatMessage) {
    // rota botón, blinds, set gamesPlayed, currentHand.inProgress=true,
    // repartir hole cards (emit privado), emits públicos, etc.

    //aqui lo que hay que hacer es pedir al servidor los parametros que necesita pre_flop para ejecutarse y mandarselos
    //Pedir parametros
    // - 
    // - 
    // - 
    // -
    sendChatMessage(tableId, "La mano ha comenzado.", true);

    //preflop(Lista_jugadores, juego)



    return true;
}

// Intenta marcar inGame y arrancar (atomizado)
export async function maybeStartGame(io, tableId, userIdToSocket, sendChatMessage) {
    const doc = await Table.findOneAndUpdate(
        {
            _id: tableId,
            inGame: { $ne: true },                  // aún no en partida
            $expr: { $gte: [{ $size: "$players" }, 2] }  // hay 2+ sentados
        },
        { $set: { inGame: true } },
        { new: true }
    ).lean();

    if (doc) {
        // Este proceso ganó la carrera → inicia mano
        await startHand(io, tableId, userIdToSocket, sendChatMessage);
    }
}
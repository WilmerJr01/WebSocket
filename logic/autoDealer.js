import mongoose from "mongoose";
import Table from "../src/models/Table.js";
import User from "../src/models/User.js";
/// desde aqui
import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { mazo } from './cartas.js';
import { mejor_mano } from './ganador.js';
import { verificar } from './Manos.js';
import { Player, Mesa, Carta } from "./clases.js";
import { waitForDecision } from "./desicionManager.js";

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
export function howmuch(pre_player, bet) {
    const respuesta = bet
    const numero = Number(respuesta);

    if (Number.isInteger(numero)) {
        if (numero <= pre_player.fichas + pre_player.bet) {
            if (numero > bet) {
                return numero
            } else {
                console.log('El monto digitado debe ser mayor a la apuesta actual');
            }
        } else {
            console.log('El monto digitado supera su capacidad');
        }
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
export async function turnos(table, io, pre_players, players, mesa, initial_bet, sendChatMessage) {
    if (table) {
        console.log("Si tengo table")
    }
    for (let i = 0; i < pre_players.length; i++) {

        table.currentHand.currentTurn = pre_players[i].nombre;
        const playerinTurn = pre_players[i].nombre
        await table.save()
        //pregunta si el jugador al que se le está preguntando es el ultimo en la lista
        if (i == pre_players.length - 1) {
            //si es el ultimo jugador y la lista de jugadores solo tiene un jugador en ella, se declara como ganador (todos foldearon)
            if (players.length < 2) {
                //aqui se ejecutaria la funcion que muestra al ganador en pantalla
                //funcion_mostrarGanador()

                //se le suman las fichas de la mesa a su cuenta de fichas personal
                players[0].fichas = players[0].fichas + mesa.bet
                table.currentHand.chips.set(pre_players[0].nombre, players[0].fichas);
                await table.save()

                sendChatMessage({
                        tableId: mesa.Id,
                        text: `GANADOR ${pre_players[0].nombre} | Fichas: ${pre_players[0].fichas}`,
                        isSystem: true
                })
                io.to(mesa.Id).emit("ganador", pre_players[0].nombre);

                io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));
                //reorganiza el vector de jugadores para rotar la BB
                mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                return [false, mesa]
            }
            //si el jugador es el ultimo pero aun hay mas jugadores en la lista, pregunta que hacer
            //la variable decision2 lo que debe esperar es la respuesta que devuelva el boton que presione el jugador 
            //por lo que el "await action_BB" debe ser cambiado por un await que espere el boton que presione el jugador
            io.to(mesa.Id).emit("turn:active", {
                playerId: playerinTurn,
                option: false
            });

            console.log(`Turno de ${playerinTurn}`)
            let {action, amount} = await waitForDecision(pre_players[i].nombre);
            let decision2 = action
            let new_bet = amount
            console.log("la decision fue: "+decision2)
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
                    table.currentHand.chips.set(pre_players[0].nombre, players[0].fichas + mesa.bet);
                    await table.save()

                    sendChatMessage({
                        tableId: mesa.Id,
                        text: `GANADOR ${pre_players[0].nombre} | Fichas: ${pre_players[0].fichas}`,
                        isSystem: true
                    })
                    io.to(mesa.Id).emit("ganador", pre_players[0].nombre);

                    io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));
                    //reorganiza el vector de jugadores para rotar la BB
                    mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                    return [false, mesa]
                } else {
                    //si luego de foldear hay mas de un jugador en la lista, se retorna la lista de jugadores en la mesa y la
                    //mesa para tener acceso a la informacion en ella (Las fichas que ya estan en ella)
                    console.log(mesa.mano)
                    return [players, mesa]
                }
                //si el ultimo jugador decide hacer raise se pregunta cuanto con la funcion howmuch
                //esta funcion tambien debe ser cambiada por una que reciba la respuesta de frontend
            } else if (decision2 === "raise") {
                //new_bet va a ser la cantidad para entrar o seguir en la mesa, o sea el valor del raise
                //una vez se reciba cuando subió el jugador, se resta de su cuenta de fichas la cantidad subida 
                //(la cantidad subida es igual a lo digitado (new_bet) menos lo que se haya puesto en la mesa en esa ronda)
                pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
                table.currentHand.chips.set(pre_players[i].nombre, pre_players[i].fichas);
                await table.save()

                io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));
                //tambien se actualiza la cantidad de fichas en la mesa (pot)
                mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
                table.currentHand.pot = mesa.bet
                await table.save()

                io.to(mesa.Id).emit("pot:update", { tableId: mesa.Id, pot: table.currentHand.pot });
                //y se actualiza lo que el jugador ha puesto en la mesa
                pre_players[i].bet = new_bet
                table.currentHand.bets.set(pre_players[i].nombre, pre_players[i].bet)
                await table.save()

                io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));
                //se ejecuta la funcion raise que es basicamente otra funcion turnos pero con la lista reordenada y con una nueva apuesta inicial
                if(players.length == 2){

                    return await raise(table, io, players, new_bet, 1, mesa, players)
                } else {
                    return await raise(table, io, players, new_bet, 2, mesa, players)
                }
                
                /////////
            } else {
                //si la decision es diferente a raise o fold, o sea check, se retorna la lista y la mesa para avanzar de ronda
                if (players.length > 1) {
                    console.log(mesa.mano)
                    return [players, mesa]
                } else {
                    players[0].fichas = players[0].fichas + mesa.bet
                    table.currentHand.chips.set(pre_players[0].nombre, pre_players[0].fichas);
                    await table.save()

                    sendChatMessage({
                        tableId: mesa.Id,
                        text: `GANADOR ${pre_players[0].nombre} | Fichas: ${pre_players[0].fichas}`,
                        isSystem: true
                    })
                    io.to(mesa.Id).emit("ganador", pre_players[0].nombre);
                    io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));
                    //reorganiza el vector de jugadores para rotar la BB
                    mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                    return [false, mesa]
                }
            }
        } else {
            //si el jugador al que se le pregunta no es el ultimo de la lista
            
            if (initial_bet > 0) {
                //si el jugador no ha puesto fichas en la mesa, se ejecuta action que no da la opcion de chequear
                io.to(mesa.Id).emit("turn:active", {
                    playerId: pre_players[i].nombre,
                    option: true
                });

            } else {
                //si el jugador ya puso fichas en la mesa (es la BB) se ejecuta action_BB que da la opcion de chequear
                io.to(mesa.Id).emit("turn:active", {
                    playerId: pre_players[i].nombre,
                    option: false
                });
            }

            let {action, amount} = await waitForDecision(pre_players[i].nombre);
            let decision = action
            let new_bet = amount
            console.log("la decision fue: "+decision)
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
                pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
                table.currentHand.chips.set(pre_players[i].nombre, pre_players[i].fichas);
                await table.save()

                io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

                mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
                table.currentHand.pot = mesa.bet
                await table.save()

                io.to(mesa.Id).emit("pot:update", { tableId: mesa.Id, pot: table.currentHand.pot });

                pre_players[i].bet = pre_players[i].bet + (new_bet - pre_players[i].bet)
                table.currentHand.bets.set(pre_players[i].nombre, pre_players[i].bet)
                await table.save()

                io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));

                if(players.length == 2){
                    let auxpla = []
                    auxpla[0] = pre_players[1]
                    auxpla[1] = pre_players[0]
                    return await raise(table, io, auxpla, new_bet, 0, mesa, players)
                } else {
                    for (let j = 0; j < players.length; j++) {

                    if (players[j].nombre === pre_players[i].nombre) {
                        //busca el indice del jugador en el vector auxiliar
                        if (j == players.length - 1) {
                            return await raise(table, io, players, new_bet, 0, mesa, players)
                        } else {
                            //se manda a la funcion raise el indice j+1 ya que el primero al que se le debe preguntar es a quien está al lado de quien hizo raise
                            return await raise(table, io, players, new_bet, j + 1, mesa, players)
                        }
                    }
                }
                }
                

            } else if (decision === "limp") {
                //si el jugador hace call o "limpea", se ejecuta el mismo proceso que como is hiciera raise pero cobrando lo de la apuesta actual
                pre_players[i].fichas = pre_players[i].fichas - (initial_bet - pre_players[i].bet)
                table.currentHand.chips.set(pre_players[i].nombre, pre_players[i].fichas);
                await table.save()

                io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

                mesa.bet = mesa.bet + (initial_bet - pre_players[i].bet)
                table.currentHand.pot = mesa.bet
                await table.save()

                io.to(mesa.Id).emit("pot:update", { tableId: mesa.Id, pot: table.currentHand.pot });

                pre_players[i].bet = pre_players[i].bet + (initial_bet - pre_players[i].bet)
                table.currentHand.bets.set(pre_players[i].nombre, pre_players[i].bet)
                await table.save()

                io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));


            } //aqui habia un else vacio
        }

        console.log(`POZO: ${mesa.bet}`)

    }
    return [pre_players, mesa]
}


//recibe como parametros:
//una lista pre_players, un initial_bet y una mesa que hacen lo mismo que en turnos
//un indice que es desde donde se va a reordenar la lista pre_players para preguntar que hacer
//funciona basicamente igual que turnos y retorna lo mismo
export async function raise(table, io, pre_players, initial_bet, indice, mesa, orden) {
    let players = pre_players
    if(pre_players.length > 2){
        pre_players = reorganizarDesdeIndice(pre_players, indice)
    } 
    
    console.log("Entra a raise")
    for (let i = 0; i < pre_players.length - 1; i++) {
        //aqui en vez de parar en el ultimo de la lista, para en el penultimo
        //ya que cuando se hace raise, al ultimo al que se le pregunta es a quien está a la derecha de quien hizo raise
        //ejemplo: jugadores = [a, b, c, d], si b hace raise, se manda el indice 2 (jugadores[2] = c) 
        // y se reorganiza el vector de tal manera que quede new_jugadores = [c, d, a, b]
        
        if (i == pre_players.length - 2) {
            if (players.length < 2) {
                //funcion_mostrarGanador()
                players[0].fichas = players[0].fichas + mesa.bet
                table.currentHand.chips.set(players[0].nombre, players[0].fichas);
                await table.save()

                sendChatMessage({
                        tableId: mesa.Id,
                        text: `GANADOR ${pre_players[0].nombre} | Fichas: ${pre_players[0].fichas}`,
                        isSystem: true
                })
                io.to(mesa.Id).emit("ganador", pre_players[0].nombre);
                io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

                //reorganiza el vector de jugadores para rotar la BB
                mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                return [false, mesa]
            }
            io.to(mesa.Id).emit("turn:active", {
                    playerId: pre_players[i].nombre,
                    option: true
            });
            let {action, amount} = await waitForDecision(pre_players[i].nombre);
            let decision2 = action
            let new_bet = amount

            console.log("la decision fue: "+decision2)
            if (decision2 === "fold") {
                for (let j = 0; j < players.length; j++) {
                    if (players[j].nombre === pre_players[i].nombre) {
                        players.splice(j, 1)
                    }
                }
                if (players.length < 2) {
                    //funcion_mostrarGanador()
                    players[0].fichas = players[0].fichas + mesa.bet
                    table.currentHand.chips.set(players[0].nombre, players[0].fichas);
                    await table.save()

                    sendChatMessage({
                        tableId: mesa.Id,
                        text: `GANADOR ${pre_players[0].nombre} | Fichas: ${pre_players[0].fichas}`,
                        isSystem: true
                    })
                    io.to(mesa.Id).emit("ganador", pre_players[0].nombre);

                    io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));
                    //reorganiza el vector de jugadores para rotar la BB
                    mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                    
                    return [false, mesa]

                }
            } else if (decision2 === "raise") {
                pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
                table.currentHand.chips.set(pre_players[i].nombre, pre_players[i].fichas);
                await table.save()

                io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

                mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
                table.currentHand.pot = mesa.bet
                await table.save()

                io.to(mesa.Id).emit("pot:update", { tableId: mesa.Id, pot: table.currentHand.pot });

                pre_players[i].bet = pre_players[i].bet + (new_bet - pre_players[i].bet)
                table.currentHand.bets.set(pre_players[i].nombre, pre_players[i].bet)
                await table.save()

                io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));
                if(players.length == 2){
                    let auxpla = []
                    auxpla[0] = pre_players[1]
                    auxpla[1] = pre_players[0]
                    return await raise(table, io, auxpla, new_bet, 0, mesa, orden)
                }
                for (let j = 0; j < players.length; j++) {
                    if (players[j].nombre === pre_players[i].nombre) {
                        return await raise(table, io, players, new_bet, j + 1, mesa, orden)
                    }
                }
            } else {
                pre_players[i].fichas = pre_players[i].fichas - (initial_bet - pre_players[i].bet)
                table.currentHand.chips.set(pre_players[i].nombre, pre_players[i].fichas);
                await table.save()

                io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

                mesa.bet = mesa.bet + (initial_bet - pre_players[i].bet)
                table.currentHand.pot = mesa.bet
                await table.save()

                io.to(mesa.Id).emit("pot:update", { tableId: mesa.Id, pot: table.currentHand.pot });

                pre_players[i].bet = pre_players[i].bet + (initial_bet - pre_players[i].bet)
                table.currentHand.bets.set(pre_players[i].nombre, pre_players[i].bet)
                await table.save()

                io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));

                if (players.length > 1) {
                    console.log(mesa.mano)
                    
                    if(pre_players.length==2 && indice == 0){
                        let aux = players[0]
                        players[0] = players[1]
                        players[1] = aux
                    }
                    
                    return [orden, mesa]
                } else {
                    //funcion_mostrarGanador()
                    players[0].fichas = players[0].fichas + mesa.bet
                    table.currentHand.chips.set(pre_players[0].nombre, pre_players[0].fichas);
                    await table.save()

                    sendChatMessage({
                        tableId: mesa.Id,
                        text: `GANADOR ${pre_players[0].nombre} | Fichas: ${pre_players[0].fichas}`,
                        isSystem: true
                    })
                    io.to(mesa.Id).emit("ganador", pre_players[0].nombre);

                    io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

                    //reorganiza el vector de jugadores para rotar la BB
                    mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                    return [false, mesa]
                }
            }
        } else {
            io.to(mesa.Id).emit("turn:active", {
                    playerId: pre_players[i].nombre,
                    option: true
            });
            let {action, amount} = await waitForDecision(pre_players[i].nombre);
            let decision = action
            let new_bet = amount
            console.log("la decision fue: "+decision)
            if (decision === "fold") {
                for (let j = 0; j < players.length; j++) {
                    if (players[j].nombre === pre_players[i].nombre) {
                        players.splice(j, 1)
                    }
                }
            } else if (decision === "raise") {
                pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
                table.currentHand.chips.set(pre_players[i].nombre, pre_players[i].fichas);
                await table.save()

                io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

                mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
                table.currentHand.pot = mesa.bet
                await table.save()

                io.to(mesa.Id).emit("pot:update", { tableId: mesa.Id, pot: table.currentHand.pot });

                pre_players[i].bet = pre_players[i].bet + (new_bet - pre_players[i].bet)
                table.currentHand.bets.set(pre_players[i].nombre, pre_players[i].bet)
                await table.save()

                io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));
                if(players.length == 2){
                    let auxpla = []
                    auxpla[0] = pre_players[1]
                    auxpla[1] = pre_players[0]
                    return await raise(table, io, auxpla, new_bet, 0, mesa, orden)
                }
                for (let j = 0; j < players.length; j++) {
                    if (players[j].nombre === pre_players[i].nombre) {
                        return await raise(table, io, players, new_bet, j + 1, mesa, orden)
                    }
                }
            } else {
                pre_players[i].fichas = pre_players[i].fichas - (initial_bet - pre_players[i].bet)
                table.currentHand.chips.set(pre_players[i].nombre, pre_players[i].fichas);
                await table.save()

                io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

                mesa.bet = mesa.bet + (initial_bet - pre_players[i].bet)
                table.currentHand.pot = mesa.bet
                await table.save()

                io.to(mesa.Id).emit("pot:update", { tableId: mesa.Id, pot: table.currentHand.pot });

                pre_players[i].bet = pre_players[i].bet + (initial_bet - pre_players[i].bet)
                table.currentHand.bets.set(pre_players[i].nombre, pre_players[i].bet)
                await table.save()

                io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));
                
            }
        }
    }
}

//preflop, recibe la lista de jugadores y la mesa con su informacion inicial
export async function preflop(pre_players, mesa, io, sendChatMessage) {
    console.log("Estoy buscando en: " + mesa.Id)
    const table = await Table.findById(mesa.Id).select("currentHand")
    table.currentHand.orderPreFlop = pre_players.map(p => p.nombre);
    await table.save();
    //al inicio de cada partida hace que la cantidad de fichas puestas por cada jugador en la mesa sea cero
    for (let y = 0; y < pre_players.length; y++) {
        pre_players[y].bet = 0
        table.currentHand.bets.set(pre_players[y].nombre, 0);
        await table.save()

        io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));

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
    const cards = {};

    for (let y = 0; y < pre_players.length * 2; y++) {
        const indice = y % pre_players.length;
        const posicionCarta = Math.floor(aux / pre_players.length);

        pre_players[indice].mano[posicionCarta] = mazoMezclado[aux];
        aux++;

        for (const p of pre_players) {
            cards[p.nombre] = p.mano.map(card => `${card.cara}${card.palo}`);
        }
        sendChatMessage({
            tableId: mesa.Id,
            text: `Jugador ${indice}: ${pre_players[indice].mano[posicionCarta].cara}${pre_players[indice].mano[posicionCarta].palo}`,
            isSystem: true
        })
        io.to(mesa.Id).emit("cards:update", cards);
    }



    //organiza el vector auxiliar en el orden de juego (1. SB, 2.BB, ..., ultimo. dealer)
    const players = in_game_order(pre_players);
    io.to(mesa.Id).emit("dealer", players.at(-1).nombre)
    table.currentHand.order = players.map(p => p.nombre);
    await table.save();
    //asignamos la initial_bet que en este caso seria la BB, hay que cambiarlo para que saque esta informacion de la mesa directamente


    let initial_bet = mesa.BigBlind;
    //resta de la cuenta del ultimo jugador de la lista (la BB) el valor del la BB y del penultimo (la SB) el valor de la SB
    pre_players.at(-1).fichas = pre_players.at(-1).fichas - initial_bet
    pre_players.at(-2).fichas = pre_players.at(-2).fichas - (initial_bet / 2)

    table.currentHand.chips.set(pre_players.at(-1).nombre, pre_players.at(-1).fichas - initial_bet);
    table.currentHand.chips.set(pre_players.at(-2).nombre, pre_players.at(-2).fichas - (initial_bet / 2));
    await table.save()

    io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

    //actualiza la cantidad de fichas que estos dos jugadores han puesto en la mesa
    pre_players.at(-1).bet = initial_bet
    pre_players.at(-2).bet = initial_bet / 2

    table.currentHand.bets.set(pre_players.at(-1).nombre, initial_bet);
    table.currentHand.bets.set(pre_players.at(-2).nombre, initial_bet / 2);
    await table.save()

    io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));

    //actualiza la cantidad de fichas que estan puestas en la mesa (la BB + la SB)
    mesa.bet = initial_bet + initial_bet / 2
    table.currentHand.pot = initial_bet + initial_bet / 2
    await table.save()
    if (io) {
        console.log("Tengo el socket")
    }
    io.to(mesa.Id).emit("pot:update", { tableId: mesa.Id, pot: table.currentHand.pot });
    console.log("Pot: " + table.currentHand.pot)

    //empieza a preguntar que hacer a cada jugador ejecutando "turnos"
    const [players2, mesa2] = await turnos(table, io, pre_players, players, mesa, initial_bet, sendChatMessage)
    //verifica que retorno la funcion turnos
    if (players2 != false) {
        //si retorno algo en la lista players2, pasa a la siguiente ronda

        //timer
        flop(table, io, players2, mesa2, mazoMezclado, sendChatMessage)
    } else {
        //si retornó false en players2 significa que todos foldearon y hubo un ganador en preflop, se vuelve a ejecutar preflop
        //esperarNuevaPartida()
        
        //LIMPIAR MESA
        await TimeBetweenGames(5, () => {
            sendChatMessage({
            tableId: mesa.Id,
            text: `Limpiando la mesa...`,
            isSystem: true
        })
            io.to(mesa.Id).emit("community:update", []);
            io.to(mesa.Id).emit("cards:update", {})
        });

        await TimeBetweenGames(5, () => {
            sendChatMessage({
            tableId: mesa.Id,
            text: `Iniciando nueva partida...`,
            isSystem: true
        })
            startHand(io, mesa.Id, sendChatMessage);
        });

        
        
        //hay que poner algun timer aqui para que se espere un tiempo entre una partida y otra
    }

    return players;
}

export async function flop(table, io, pre_players, mesa, mazo, sendChatMessage) {
    console.log("--------------------")
    console.log("FLOP")
    console.log("--------------------")

    let players = pre_players
    for (let y = 0; y < pre_players.length; y++) {
        //devuelve a 0 las fichas que ha puesto cada jugador en la mesa ya que es una nueva ronda
        pre_players[y].bet = 0
        table.currentHand.bets.set(pre_players[y].nombre, 0);
        await table.save()

        io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));

    }
    let cant_jug = pre_players.length
    cant_jug = cant_jug * 2

    mesa.mano[0] = mazo[cant_jug + 2]
    mesa.mano[1] = mazo[cant_jug + 3]
    mesa.mano[2] = mazo[cant_jug + 4]
    const cards = mesa.mano.map(card => `${card.cara}${card.palo}`)
    io.to(mesa.Id).emit("community:update", cards)
    sendChatMessage({
        tableId: mesa.Id,
        text: `Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}`,
        isSystem: true
    })
    //aqui se ejecutaria la funcion para mostrar las cartas, las primeras 3 del flop
    //mostrar_cartas()
    console.log("--------------------")
    console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}`)
    console.log("--------------------")

    //pregunta que hacer luego de mostrar las cartas
    const [players2, mesa2] = await turnos(table, io, pre_players, players, mesa, 0, sendChatMessage)

    if (players2 != false) {
        //si hay mas de un jugador en la lista, avanza a la primera ronda
        thorn(table, io, players2, mesa2, mazo, cant_jug, sendChatMessage)
    } else {
        await TimeBetweenGames(5, () => {
            sendChatMessage({
            tableId: mesa.Id,
            text: `Limpiando la mesa...`,
            isSystem: true
        })
            io.to(mesa.Id).emit("community:update", []);
            io.to(mesa.Id).emit("cards:update", {})
        });

        await TimeBetweenGames(5, () => {
            sendChatMessage({
            tableId: mesa.Id,
            text: `Iniciando nueva partida...`,
            isSystem: true
        })
            startHand(io, mesa.Id, sendChatMessage);
        });
    }

}


export async function thorn(table, io, pre_players, mesa, mazo, cant_jug, sendChatMessage) {
    console.log("--------------------")
    console.log("THORN")
    console.log("--------------------")
    let players = pre_players
    for (let y = 0; y < pre_players.length; y++) {
        pre_players[y].bet = 0
        table.currentHand.bets.set(pre_players[y].nombre, 0);
        await table.save()

        io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));

    }
    mesa.mano[3] = mazo[cant_jug + 6]
    sendChatMessage({
        tableId: mesa.Id,
        text: `Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}, ${mesa.mano[3].cara}${mesa.mano[3].palo}`,
        isSystem: true
    })
    const cards = mesa.mano.map(card => `${card.cara}${card.palo}`)
    io.to(mesa.Id).emit("community:update", cards)
    //mostrar_cartas()
    console.log("--------------------")
    console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}, ${mesa.mano[3].cara}${mesa.mano[3].palo}`)
    console.log("--------------------")

    const [players2, mesa2] = await turnos(table, io, pre_players, players, mesa, 0, sendChatMessage)
    console.log(mesa2.mano)

    if (players2 != false) {
        river(table, io, players2, mesa2, mazo, cant_jug, sendChatMessage)
    } else {
        await TimeBetweenGames(5, () => {
            sendChatMessage({
            tableId: mesa.Id,
            text: `Limpiando la mesa...`,
            isSystem: true
        })
            io.to(mesa.Id).emit("community:update", []);
            io.to(mesa.Id).emit("cards:update", {})
        });

        await TimeBetweenGames(5, () => {
            sendChatMessage({
            tableId: mesa.Id,
            text: `Iniciando nueva partida...`,
            isSystem: true
        })
            startHand(io, mesa.Id, sendChatMessage);
        });
    }
}


export async function river(table, io, pre_players, mesa, mazo, cant_jug, sendChatMessage) {
    console.log("--------------------")
    console.log("RIVER")
    console.log("--------------------")
    
    console.log(mesa.mano)
    let players = pre_players
    for (let y = 0; y < pre_players.length; y++) {
        pre_players[y].bet = 0
        table.currentHand.bets.set(pre_players[y].nombre, 0);
        await table.save()

        io.to(mesa.Id).emit("bets:update", Object.fromEntries(table.currentHand.bets));

    }
    mesa.mano[4] = mazo[cant_jug + 8]
    sendChatMessage({
        tableId: mesa.Id,
        text: `Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}, ${mesa.mano[3].cara}${mesa.mano[3].palo}, ${mesa.mano[4].cara}${mesa.mano[4].palo}`,
        isSystem: true
    })

    const cards = mesa.mano.map(card => `${card.cara}${card.palo}`)
    io.to(mesa.Id).emit("community:update", cards)
    //mostrar_cartas()
    console.log("--------------------")
    console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}, ${mesa.mano[3].cara}${mesa.mano[3].palo}, ${mesa.mano[4].cara}${mesa.mano[4].palo}`)
    console.log("--------------------")

    const [players2, mesa2] = await turnos(table, io, pre_players, players, mesa, 0, sendChatMessage)

    if (players2 != false) {
        //si queda mas de un jugador en la lista para este punto, se ejecuta la funcion "definicion" que evalua que mano es mejor entre los jugadores de la mesa
        definicion(table, io, players2, mesa2, sendChatMessage)
    } else {
        await TimeBetweenGames(5, () => {
            sendChatMessage({
            tableId: mesa.Id,
            text: `Limpiando la mesa...`,
            isSystem: true
        })
            io.to(mesa.Id).emit("community:update", []);
            io.to(mesa.Id).emit("cards:update", {})
        });

        await TimeBetweenGames(5, () => {
            sendChatMessage({
            tableId: mesa.Id,
            text: `Iniciando nueva partida...`,
            isSystem: true
        })
            startHand(io, mesa.Id, sendChatMessage);
        });
    }
}

function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function TimeBetweenGames(seconds, callback) {
    await wait(seconds);
    callback();
}

export async function definicion(table, io, pre_players, mesa, sendChatMessage) {
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
                table.currentHand.chips.set(pre_players[i].nombre, pre_players[i].fichas);
                await table.save()

                io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

                console.log(`GANADOR ${pre_players[i].nombre} | Fichas: ${pre_players[i].fichas}`);

                sendChatMessage({
                    tableId: mesa.Id,
                    text: `GANADOR ${pre_players[i].nombre} | Fichas: ${pre_players[i].fichas}`,
                    isSystem: true
                })
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
                    table.currentHand.chips.set(pre_players[i].nombre, pre_players[i].fichas);
                    await table.save()

                    io.to(mesa.Id).emit("chips:update", Object.fromEntries(table.currentHand.chips));

                    console.log(`GANADOR ${pre_players[i].nombre} | Fichas: ${pre_players[i].fichas}`);
                    sendChatMessage({
                        tableId: mesa.Id,
                        text: `GANADOR ${pre_players[i].nombre} | Fichas: ${pre_players[i].fichas}`,
                        isSystem: true
                    })
                    io.to(mesa.Id).emit("ganador", pre_players[0].nombre);
                    //aqui actualizas el server con el ganador

                }
            }
        }
    }
    //reorganiza el vector de jugadores para rotar la BB
    mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
    //se inicia una nueva partida
    //esperarNuevaPartida()


    await TimeBetweenGames(5, () => {
            sendChatMessage({
            tableId: mesa.Id,
            text: `Limpiando la mesa...`,
            isSystem: true
        })
            io.to(mesa.Id).emit("community:update", []);
            io.to(mesa.Id).emit("cards:update", {})
        });

        await TimeBetweenGames(5, () => {
            sendChatMessage({
            tableId: mesa.Id,
            text: `Iniciando nueva partida...`,
            isSystem: true
        })
            startHand(io, mesa.Id, sendChatMessage);
        });

}


// hasta aqui

// Arranque real de mano (tu función ya preparada)
async function startHand(io, tableId, sendChatMessage) {
    // rota botón, blinds, set gamesPlayed, currentHand.inProgress=true,
    // repartir hole cards (emit privado), emits públicos, etc.

    //aqui lo que hay que hacer es pedir al servidor los parametros que necesita pre_flop para ejecutarse y mandarselos
    //Pedir parametros
    // - 
    // - 
    // - 
    // -
    sendChatMessage({
        tableId,
        text: `Iniciando nueva mano...`,
        isSystem: true,
    });

    const [Lista_jugadores, juego] = await buildListaJugadores(tableId)
    console.log("Llego a starthand: " + juego.Id)
    

        await TimeBetweenGames(10, () => {
            sendChatMessage({
            tableId: tableId,
            text: `Iniciando nueva partida...`,
            isSystem: true
        })
            preflop(Lista_jugadores, juego, io, sendChatMessage)
        });



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
        await startHand(io, tableId, sendChatMessage);
    }
}

const turnTimers = {};

function startTurnTimer(io, tableId, playerId, seconds = 20) {
    // Si ya había un timer para esta mesa, lo cancelamos
    if (turnTimers[tableId]) {
        clearTimeout(turnTimers[tableId]);
        delete turnTimers[tableId];
    }

    // (Opcional) avisar al front que arranca contador
    io.to(tableId).emit("turn:timer:start", { playerId, seconds });

    // Crear el nuevo timer
    const timeout = setTimeout(() => {
        console.log(`⏳ Jugador ${playerId} no actuó a tiempo en mesa ${tableId}`);

        // Acción automática: fold del jugador
        io.to(tableId).emit("action:auto-fold", { playerId });

        // Aquí llamas tu lógica del motor:
        // - aplicar fold
        // - avanzar al siguiente jugador
        handleAutoFold(tableId, playerId, io);

        // El propio handleAutoFold seguramente llamará a nextPlayerTurn()
        // y ahí volverás a llamar a startTurnTimer(io, tableId, nextPlayerId)
    }, seconds * 1000);

    turnTimers[tableId] = timeout;
}

/* 
function nextPlayerTurn(io, tableId, nextPlayerId) {
    io.to(tableId).emit("turn:active", { playerId: nextPlayerId });
    startTurnTimer(io, tableId, nextPlayerId, 20); // 20s para actuar
}

Función para cancelar el timer cuando el jugador actúa 

io.on("connection", (socket) => {
    socket.on("action:send", async (payload) => {
        const { tableId, action, amount } = payload;
        const playerId = socket.userId; // o como lo estés guardando

        // 1. Cancelar el timer de esa mesa porque el jugador ya actuó
        if (turnTimers[tableId]) {
            clearTimeout(turnTimers[tableId]);
            delete turnTimers[tableId];
        }

        // 2. Procesar la acción normalmente en tu motor
        await processAction(tableId, playerId, action, amount, io);

        // 3. Dentro de processAction o después, decides si hay siguiente jugador:
        // nextPlayerTurn(io, tableId, siguienteJugadorId);
    });
});

*/

async function buildListaJugadores(tableId) {
    const table = await Table.findById(tableId).lean();

    if (!table) {
        throw new Error("Mesa no encontrada");
    }

    if (!table.players || !Array.isArray(table.players)) {
        return [];
    }

    const Lista_jugadores = [];

    // Promise.all para esperar todos los usuarios
    const users = await Promise.all(
        table.players.map((playerId) => User.findById(playerId).lean())
    );

    for (const user of users) {
        if (!user) continue;

        const jugador = new Player();
        jugador.nombre = user._id.toString();
        jugador.mano = [];
        jugador.puntaje = 0;

        // OJO: al usar .lean(), chips es un objeto normal, no un Map
        const userIdStr = user._id.toString();
        const chipsMap = table.currentHand?.chips || {};
        jugador.fichas = chipsMap[userIdStr] ?? 0;
        const betsMap = table.currentHand?.bets || {};
        jugador.bet = betsMap[userIdStr] ?? 0;
        Lista_jugadores.push(jugador);
    }

    const tableUse = new Mesa()
    tableUse.BigBlind = table.bigBlind
    tableUse.SmallBlind = table.smallBlind
    tableUse.jugadores = Lista_jugadores
    tableUse.Id = table._id.toString();
    tableUse.mano = []
    console.log("Le estoy pasando: " + tableUse.Id)

    return [Lista_jugadores, tableUse];
}

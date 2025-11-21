import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { Player, Mesa } from "./clases.js";
import { Carta } from './clases.js';
import { mazo } from './cartas.js';
import { mejor_mano } from './ganador.js';
import { verificar } from './Manos.js';




function reorganizarDesdeIndice(v, indice) {
  if (indice < 0 || indice >= v.length) {
    throw new Error('Índice fuera de rango');
  }

  const parte1 = v.slice(indice);     // Desde el índice hasta el final
  const parte2 = v.slice(0, indice);  // Desde el inicio hasta el índice - 1

  return [...parte1, ...parte2];
}

export function pre_players_order(v){ 
    if (v.length === 0) return v; // Maneja el caso de array vacío
    let primero = v.shift();      // Elimina el primer elemento
    v.push(primero);              // Lo agrega al final
    return v;
}

export function in_game_order(v) {
    let nuevo_vector = []
    if (v.length < 2) return [...v]; // Si tiene menos de 2 elementos, no se reorganiza

    const penultimo = v[v.length - 2];
    const ultimo = v[v.length - 1];
    const resto = v.slice(0, v.length - 2);

    return nuevo_vector = [penultimo, ultimo, ...resto];

}


function preguntar(texto) {
  const rl = readline.createInterface({ input, output });

  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      rl.close();
      resolve(respuesta.toUpperCase());
    });
  });
}

export async function action(pre_player) {
  console.log(`PLAYER ${pre_player.nombre}`);
  const respuesta = await preguntar('¿Pagar, subir o foldear? (P/S/F): ');

  if (respuesta === 'P') {
    return "limp";
  } else if (respuesta === 'F') {
    return "fold";
  } else if (respuesta == 'S'){
    return "raise";
  } else {
    console.log('Entrada no válida');
    return await action(pre_player); // Reintenta si la entrada no es válida
  }
}

export async function howmuch(pre_player, bet) {
  console.log(`PLAYER ${pre_player.nombre}`);
  const respuesta = await preguntar('¿Cuanto desea subir?: ');
  const numero = Number(respuesta);
  
  if (Number.isInteger(numero)) {
    if(numero <= pre_player.fichas + pre_player.bet){
      if(numero > bet){
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

export async function action_BB(pre_player) {
  console.log(`PLAYER ${pre_player.nombre}`);
  const respuesta = await preguntar('¿Chequear, subir o foldear? (C/S/F): ');

  if (respuesta === 'C') {
    return "check";
  } else if (respuesta === 'F') {
    return "fold";
  } else if (respuesta === "S"){
    return "raise";
  } else {
    console.log('Entrada no válida');
    return await action_BB(pre_player); // Reintenta si la entrada no es válida
  }
}



export async function raise(pre_players, initial_bet, indice, mesa){
  let players = pre_players
  pre_players = reorganizarDesdeIndice(pre_players, indice)
  
  for (let i = 0; i < pre_players.length-1; i++) {
        if(i == pre_players.length-2){
            if(players.length < 2){
              console.log(`EL GANADOR ES ${players[0].nombre}`)
              players[0].fichas = players[0].fichas + mesa.bet
              for(let y = 0; y < players.length; y++){
                console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} `);
              }
              //reorganiza el vector de jugadores para rotar la BB
              mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
              return [false, mesa]
            }
            const decision2 = await action(pre_players[i])
            if(decision2 === "fold"){
                for(let j = 0; j < players.length; j++){
                  if(players[j].nombre === pre_players[i].nombre){
                    players.splice(j, 1)
                  }
                }
                if(players.length < 2){
                  console.log(`EL GANADOR ES ${players[0].nombre}`)
                  players[0].fichas = players[0].fichas + mesa.bet
                  for(let y = 0; y < players.length; y++){
                    console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} `);
                  }
                  //reorganiza el vector de jugadores para rotar la BB
                  mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                  return [false, mesa]
                  
                }
            } else if (decision2 === "raise"){
                const new_bet = await howmuch(pre_players[i], initial_bet)
                pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
                pre_players[i].bet = new_bet
                for(let j = 0; j < players.length; j++){
                    if(players[j].nombre === pre_players[i].nombre){
                       return await raise(players, new_bet, j+1, mesa)
                    }
                }
            } else {
                pre_players[i].fichas = pre_players[i].fichas - (initial_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (initial_bet - pre_players[i].bet)
                pre_players[i].bet = pre_players[i].bet + (initial_bet - pre_players[i].bet)
                for(let y = 0; y < players.length; y++){
                console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} | Apuesta: ${players[y].bet}`);
                }
                console.log(`POZO: ${mesa.bet}`)
                if(players.length > 1){
                  return [players, mesa]
                } else {
                  console.log(`EL GANADOR ES ${players[0].nombre}`)
                  players[0].fichas = players[0].fichas + mesa.bet
                  for(let y = 0; y < players.length; y++){
                    console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} `);
                  }
                  //reorganiza el vector de jugadores para rotar la BB
                  mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                  return [false, mesa]
                }
            }
        } else {
            const decision = await action(pre_players[i]);
            if (decision === "fold") {
              for(let j = 0; j < players.length; j++){
                if(players[j].nombre === pre_players[i].nombre){
                  players.splice(j, 1)
                }
              }
            }else if (decision === "raise"){
              const new_bet = await howmuch(pre_players[i], initial_bet)
              pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
              mesa.bet = mesa.bet + (new_bet - pre_players[i].bet) 
              pre_players[i].bet = new_bet
              for(let j = 0; j < players.length; j++){
                  if(players[j].nombre === pre_players[i].nombre){
                     return await raise(players, new_bet, j+1, mesa)
                  }
              }
            } else  {
                pre_players[i].fichas = pre_players[i].fichas - (initial_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (initial_bet - pre_players[i].bet)
                pre_players[i].bet = pre_players[i].bet + (initial_bet - pre_players[i].bet)

            }
        }

        console.log(`POZO: ${mesa.bet}`)
    }

}

////// hay un problema, en raise, luego de recorrer todo el vector cobrando, vuelve a turnos en vez de salir directamente
export async function turnos(pre_players, players, mesa, initial_bet){
  
  for (let i = 0; i < pre_players.length; i++) {
    console.log("-----------------------")    
    console.log(`Mano ${pre_players[i].nombre}: ${pre_players[i].mano[0].cara}${pre_players[i].mano[0].palo}, ${pre_players[i].mano[1].cara}${pre_players[i].mano[1].palo}`)

        if(i == pre_players.length-1){
          if(players.length < 2){
            console.log(`EL GANADOR ES ${players[0].nombre}`)
            players[0].fichas = players[0].fichas + mesa.bet
            for(let y = 0; y < players.length; y++){
              console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} `);
            }
            //reorganiza el vector de jugadores para rotar la BB
            mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
            return [false, mesa]
           
          }  
          
          const decision2 = await action_BB(pre_players[i])
            if(decision2 === "fold"){
                for(let j = 0; j < players.length; j++){
                  if(players[j].nombre === pre_players[i].nombre){
                    players.splice(j, 1)
                  }
                }
                if(players.length < 2){
                  console.log(`EL GANADOR ES ${players[0].nombre}`)
                  players[0].fichas = players[0].fichas + mesa.bet
                  for(let y = 0; y < players.length; y++){
                    console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} `);
                  }
                  //reorganiza el vector de jugadores para rotar la BB
                  mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                  return [false, mesa]
                  
                } else {
                  return [players, mesa]
                }

            } else if (decision2 === "raise"){
              const new_bet = await howmuch(pre_players[i], initial_bet)
              ////
              for(let y = 0; y < players.length; y++){
                console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} | Bet: ${players[y].bet} `);
              }
              ////
              pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
              mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
              pre_players[i].bet = new_bet
              
              return await raise(players, new_bet, 2, mesa)/////////
            } else {
              console.log(`POZO: ${mesa.bet}`)
              if(players.length > 1){
                return [players, mesa]
              } else {
                console.log(`EL GANADOR ES ${players[0].nombre}`)
                players[0].fichas = players[0].fichas + mesa.bet
                for(let y = 0; y < players.length; y++){
                  console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} `);
                }
                //reorganiza el vector de jugadores para rotar la BB
                mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
                return [false, mesa]
              }
              
            }
        } else {
          let decision = "a"
          if(initial_bet > 0){
            decision = await action(pre_players[i]);
          } else {
            decision = await action_BB(pre_players[i]);
          }
            if (decision === "fold") {
                for(let j = 0; j < players.length; j++){
                    if(players[j].nombre === pre_players[i].nombre){
                        players.splice(j, 1)
                    }
                }
                if(initial_bet < 1){
                  i = i - 1
                }
                
                ////
                for(let y = 0; y < players.length; y++){
                  console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} | Bet: ${players[y].bet} `);
                }
                ////
            } else if(decision === "raise"){
                const new_bet = await howmuch(pre_players[i], initial_bet)
                
                pre_players[i].fichas = pre_players[i].fichas - (new_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (new_bet - pre_players[i].bet)
                pre_players[i].bet = pre_players[i].bet + (new_bet - pre_players[i].bet)
                ////
                for(let y = 0; y < players.length; y++){
                  console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} | Bet: ${players[y].bet} `);
                }
                ////
                for(let j = 0; j < players.length; j++){
                    if(players[j].nombre === pre_players[i].nombre){
                      if(j == players.length-1){
                       return await raise(players, new_bet, 0, mesa)
                      } else {
                       return await raise(players, new_bet, j+1, mesa)
                      } 
                    }
                }
                
            } else if (decision === "limp") {
                pre_players[i].fichas = pre_players[i].fichas - (initial_bet - pre_players[i].bet)
                mesa.bet = mesa.bet + (initial_bet - pre_players[i].bet)
                pre_players[i].bet = pre_players[i].bet + (initial_bet - pre_players[i].bet)
                ////
                for(let y = 0; y < players.length; y++){
                  console.log(`Jugador ${players[y].nombre} | Fichas: ${players[y].fichas} | Bet: ${players[y].bet} `);
                }
                ////
            } else {

            }
        }
        
        console.log(`POZO: ${mesa.bet}`)
    }
}
export async function preflop(pre_players, mesa) {
    
    for(let y = 0; y < pre_players.length; y++){
      pre_players[y].bet = 0
    }  

    console.log("--------------------")
    console.log("PREFLOP")
    console.log("--------------------")
    //mazo

    const mazoMezclado = [...mazo].sort(() => Math.random() - 0.5);
    let aux = 0;

    /*
    for(let y = 0; y < pre_players.length; y++){
      pre_players[y].mano[0] = mazoMezclado[aux]
      pre_players[y].mano[1] = mazoMezclado[aux+1]
      aux = aux + 2
    }
    */

    for (let y = 0; y < pre_players.length * 2; y++) {
        let indice = y % pre_players.length
        pre_players[indice].mano[Math.floor(aux / pre_players.length)] = mazoMezclado[aux]
        
        aux = aux + 1
        //mostrar_cartasJugadores()
    }

    //

    let players = in_game_order(pre_players);
    let initial_bet = 2;
    pre_players.at(-1).fichas = pre_players.at(-1).fichas - initial_bet
    pre_players.at(-2).fichas = pre_players.at(-2).fichas - (initial_bet/2)
    
    pre_players.at(-1).bet = initial_bet
    pre_players.at(-2).bet = initial_bet/2

    mesa.bet = initial_bet + initial_bet/2
    console.log(`POZO: ${mesa.bet}`)

    const [players2, mesa2] = await turnos(pre_players, players, mesa, initial_bet)
    
    if(players2 != false){
      flop(players2, mesa2, mazoMezclado)
    } else {
      preflop(mesa2.jugadores, mesa2)
    }
    
    return players;
}

export async function flop(pre_players, mesa, mazo){
  
  /////
  /////

  console.log("--------------------")
  console.log("FLOP")
  console.log("--------------------")
  let players = pre_players
  for(let y = 0; y < pre_players.length; y++){
    pre_players[y].bet = 0
  }
  mesa.mano[0] = mazo[13]
  mesa.mano[1] = mazo[14]
  mesa.mano[2] = mazo[15]
  console.log("--------------------")
  console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}`)
  console.log("--------------------")

  const [players2, mesa2] = await turnos(pre_players, players, mesa, 0)

  if(players2 != false){
      thorn(players2, mesa2, mazo)
  } else {
      preflop(mesa2.jugadores, mesa2)
  }
  
}

export async function thorn(pre_players, mesa, mazo) {
  console.log("--------------------")
  console.log("THORN")
  console.log("--------------------")
  let players = pre_players
  for(let y = 0; y < pre_players.length; y++){
    pre_players[y].bet = 0
  }
  mesa.mano[3] = mazo[17]
  console.log("--------------------")
  console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}, ${mesa.mano[3].cara}${mesa.mano[3].palo}`)
  console.log("--------------------")

  const [players2, mesa2] = await turnos(pre_players, players, mesa, 0)

  if(players2 != false){
      river(players2, mesa2, mazo)
  } else {
      preflop(mesa2.jugadores, mesa2)
  }

  
}

export async function river(pre_players, mesa, mazo) {
  console.log("--------------------")
  console.log("RIVER")
  console.log("--------------------")
  let players = pre_players
  for(let y = 0; y < pre_players.length; y++){
    pre_players[y].bet = 0
  }
  mesa.mano[4] = mazo[19]
  console.log("--------------------")
  console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}, ${mesa.mano[3].cara}${mesa.mano[3].palo}, ${mesa.mano[4].cara}${mesa.mano[4].palo}`)
  console.log("--------------------")

  const [players2, mesa2] = await turnos(pre_players, players, mesa, 0)

  if(players2 != false){
      definicion(players2, mesa2)
  } else {
      preflop(mesa2.jugadores, mesa2)
  }
  
}

export async function definicion(pre_players, mesa){
  console.log("--------------------")
  console.log("DEFINICION")
  console.log("--------------------")

  console.log("--------------------")
  console.log(`Mesa: ${mesa.mano[0].cara}${mesa.mano[0].palo}, ${mesa.mano[1].cara}${mesa.mano[1].palo}, ${mesa.mano[2].cara}${mesa.mano[2].palo}, ${mesa.mano[3].cara}${mesa.mano[3].palo}, ${mesa.mano[4].cara}${mesa.mano[4].palo}`)
  console.log("--------------------")


  for(let y = 0; y < pre_players.length; y++){
    console.log("|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|")
    console.log(`Cartas ${pre_players[y].nombre}: ${pre_players[y].mano[0].cara}${pre_players[y].mano[0].palo}, ${pre_players[y].mano[1].cara}${pre_players[y].mano[1].palo}`)
    let mano_jug = [pre_players[y].mano[0], pre_players[y].mano[1], mesa.mano[0], mesa.mano[1], mesa.mano[2], mesa.mano[3], mesa.mano[4]]
    let [validar, puntaje] = verificar(mano_jug)
    pre_players[y].mano = validar
    pre_players[y].puntaje = puntaje
    console.log(`Mano ${pre_players[y].nombre}: ${pre_players[y].mano[0].cara}${pre_players[y].mano[0].palo}, ${pre_players[y].mano[1].cara}${pre_players[y].mano[1].palo}, ${pre_players[y].mano[2].cara}${pre_players[y].mano[2].palo}, ${pre_players[y].mano[3].cara}${pre_players[y].mano[3].palo}, ${pre_players[y].mano[4].cara}${pre_players[y].mano[4].palo}`)
  }

  const [winner, num_ganadores] = mejor_mano(pre_players)
 
  if(num_ganadores == 1){
    for(let i = 0; i < pre_players.length; i++){
      if(winner.nombre === pre_players[i].nombre){
        pre_players[i].fichas = pre_players[i].fichas + mesa.bet
        console.log(`GANADOR ${pre_players[i].nombre} | Fichas: ${pre_players[i].fichas}`);
      }
    }
  } else {
    mesa.bet = mesa.bet - (mesa.bet % num_ganadores)
    let bote = mesa.bet/num_ganadores
    for(let i = 0; i < pre_players.length; i++){
      for(let j = 0; j < winner.length; j++){
        if(winner[j].nombre === pre_players[i].nombre){
          pre_players[i].fichas = pre_players[i].fichas + bote
          console.log(`GANADOR ${pre_players[i].nombre} | Fichas: ${pre_players[i].fichas}`);
        }
      }
    }
  }
  //reorganiza el vector de jugadores para rotar la BB
  mesa.jugadores = reorganizarDesdeIndice(mesa.jugadores, 1)
  preflop(mesa.jugadores, mesa)

}
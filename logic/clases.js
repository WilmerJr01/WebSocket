export class Carta {
  constructor(cara, valor, palo) {
    this.cara = cara;
    this.palo = palo;
    this.valor = valor;
  }

  mostrar() {
    console.log(`${this.cara}${this.palo}`);
  }
}

export class Player {
  constructor(nombre, mano, puntaje, fichas, bet) {
    this.nombre = nombre;
    this.mano = mano;
    this.puntaje = puntaje;
    this.fichas = fichas;
    this.bet = bet;
  }

  mostrarCartas() {
    console.log(`${this.nombre}: "${this.cartas[0].cara} ${this.cartas[0].palo}, ${this.cartas[1].cara} ${this.cartas[1].palo}"`);
  }
}

export class Mano {
  constructor(carta1, carta2, carta3, carta4, carta5, puntaje) {
    this.cartas = [carta1, carta2, carta3, carta4, carta5];
    this.puntaje = puntaje;
  }

  mostrarCartas() {
    console.log(`Mesa: ${this.cartas[0].cara} ${this.cartas[0].palo}, ${this.cartas[1].cara} ${this.cartas[1].palo}, ${this.cartas[2].cara} ${this.cartas[2].palo}, ${this.cartas[3].cara} ${this.cartas[3].palo}, ${this.cartas[4].cara} ${this.cartas[4].palo}`);
  }
}

export class mano_mesa {
  constructor(nombre, carta1, carta2, carta3, carta4, carta5, carta6, carta7) {
    this.nombre = nombre;
    this.cartas = [carta1, carta2, carta3, carta4, carta5, carta6, carta7];
  }

  mostrarCartas() {
    console.log(`${this.nombre}: ${this.cartas[0].cara} ${this.cartas[0].palo}, ${this.cartas[1].cara} ${this.cartas[1].palo} | ${this.cartas[2].cara} ${this.cartas[2].palo}, ${this.cartas[3].cara} ${this.cartas[3].palo}, ${this.cartas[4].cara} ${this.cartas[4].palo}, ${this.cartas[5].cara} ${this.cartas[5].palo}, ${this.cartas[6].cara} ${this.cartas[6].palo}`);
  }
}

export class Mesa {
  constructor(bet, mano, jugadores){
    this.bet = bet 
    this.mano = mano
    this.jugadores = jugadores
  }
  //bet -> table.currentHand.pot
  //mano -> table.currentHand.community
  //jugadores -> table.currentHand.order
  // const cards = table?.currentHand?.cards || new Map();
  //mano de jugador = cards.get(idJugador) 
}



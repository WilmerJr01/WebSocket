import { Player, Mesa, Mano } from './clases.js';

export function Value_order(mano){
    return mano.sort((a, b) => a.valor - b.valor);
}

export function Palo_order(mano){
    mano = Value_order(mano);
    return mano.sort((a, b) => {
    if (a.palo < b.palo) return -1;
    if (a.palo > b.palo) return 1;
    return 0;
    })
}

export function high_card(cartas){
    let ind = 0;
    let mano_final = [];
    for (let i = cartas.length - 1; i > 0; i--){
            mano_final[ind] = cartas[i];
            ind++;
            if(ind > 4){
                break
            }
        }
        return mano_final;
}
export function pair(cartas){
    cartas = Value_order(cartas);
    let mano_final = [];
    let cont = 1;
        for (let i = cartas.length - 1; i > 0; i--){
            //console.log(cont);
            const actual = cartas[i];
            const anterior = cartas[i - 1];
            if(actual.valor != anterior.valor){
                cont++;
            } else {
                mano_final[0] = actual;
                mano_final[1] = anterior;
                //console.log(mano_final[0], mano_final[1]);
            }
        }
        if(cont==6){
            let ind = 4;
            for (let i = cartas.length - 1; i > 0; i--){
                let valor_par = mano_final[0].valor;
                if(valor_par != cartas[i].valor){
                    mano_final[ind] = cartas[i];
                    ind--;
                    if(ind < 2){
                        break
                    }
                }
            }
            return mano_final;
        } else {
            return false;
        }
}

export function double_pair(cartas){
    cartas = Value_order(cartas);
    let mano_final = [];
    let cont = 1;
    let cont_same = 1;
    let j = 0;
        for (let i = cartas.length - 1; i > 0; i--){
            //console.log(cont);
            const actual = cartas[i];
            const anterior = cartas[i - 1];
            if(actual.valor != anterior.valor){
                cont++;
                cont_same=1;
            } else {
                cont_same++;
                if(cont_same > 2){
                    return false;
                    break;
                }
                if(j<4){
                    mano_final[j] = actual;
                    mano_final[j+1] = anterior;
                    j = j+2;
                }
            }
        }
        if(cont==5 || cont == 4){
            let ind = 4;
            for (let i = cartas.length - 1; i > 0; i--){
                let valor_par1 = mano_final[0].valor;
                let valor_par2 = mano_final[2].valor;
                if(valor_par1 != cartas[i].valor && valor_par2 != cartas[i].valor){
                    mano_final[ind] = cartas[i];
                    ind++;
                    if(ind > 4){
                        break
                    }
                }
            }
            return mano_final;
        } else {
            return false;
        }
}

export function three_of_a_kind(cartas){
    cartas = Value_order(cartas);
    let mano_final = [];
    let cont = 1;
    let cont_same = 1;
    let j = 0;
        for (let i = cartas.length - 1; i > 1; i--){
            //console.log(cont);
            const actual = cartas[i];
            const anterior = cartas[i - 1];
            const anterior2 = cartas[i-2];
            if(actual.valor == anterior.valor && actual.valor == anterior2.valor){
                cont++;
                mano_final[j] = actual;
                mano_final[j+1] = anterior;
                mano_final[j+2] = anterior2;
            } 
        }
        if(cont == 2){
            let ind = 4;
            for (let i = cartas.length - 1; i > 0; i--){
                let valor_trio = mano_final[0].valor;
                if(valor_trio != cartas[i].valor){
                    mano_final[ind] = cartas[i];
                    ind--;
                    if(ind < 3){
                        break
                    }
                }
            }
            return mano_final;
        } else {
            return false;
        }
}

export function straight(cartas){
    //console.log(cartas)
    cartas = Value_order(cartas);
    let ind = 0;
    let mano_final = [];
    for (let i = cartas.length - 1; i > 0; i--){

        let actual = cartas[i];
        let anterior = cartas[i-1];
        if(i < 3 && actual.valor == 3 && anterior.valor == 2 && ind == 2){
            actual = anterior
            anterior = cartas[cartas.length - 1];
        } else {
            anterior = cartas[i-1];
        }
        
        if(actual.valor == (anterior.valor) + 1){
            mano_final[ind] = cartas[i];
            mano_final[ind+1] = anterior;
            ind++;
            if(ind > 3){
                return mano_final;
                break;
            }
        } else if (actual.valor == 2 && anterior.valor == 14) {
            //console.log('si entró');
            mano_final[3] = actual;
            mano_final[4] = anterior;
            ind = 4;
            if(ind > 3){
                return mano_final;
                break;
            }
        } else if (actual.valor != anterior.valor) {
            mano_final = [];
            ind = 0;
        }
    }
    return false;
}
export function flush(cartas){
    cartas = Palo_order(cartas);
    let ind = 0;
    let mano_final = [];
    for (let i = cartas.length - 1; i > 0; i--){
        const actual = cartas[i];
        const anterior = cartas[i - 1];
        if(actual.palo === anterior.palo){
            mano_final[ind] = cartas[i];
            mano_final[ind+1] = cartas[i-1]
            ind++;
            if(ind > 3){
                return mano_final;
                break;
            }
        } else {
            mano_final = [];
            ind = 0;
        }
    }
    return false;
}

export function full_house(cartas){
    cartas = Value_order(cartas);
    let mano_final = [];
    let cont = 1;
    let j = 0;
    let valor_trio = 0;
        for (let i = cartas.length - 1; i > 1; i--){
            const actual = cartas[i];
            const anterior = cartas[i-1];
            const anterior2 = cartas[i-2];
            if(actual.valor == anterior.valor && actual.valor == anterior2.valor){
                cont++;
                mano_final[j] = actual;
                mano_final[j+1] = anterior;
                mano_final[j+2] = anterior2;
                valor_trio = actual.valor;
                break
            } 
        }
        
        if(cont > 1){
            let ind = 3;
            for (let i = cartas.length - 1; i > 0; i--){
                const actual = cartas[i];
                const anterior = cartas[i - 1];
                if(actual.valor == anterior.valor && actual.valor != valor_trio){
                    mano_final[ind] = actual;
                    mano_final[ind+1] = anterior;
                    return mano_final;
                }
            }
            return false;
        } else {
            return false;
        }
}

export function four_of_a_kind(cartas){
    cartas = Value_order(cartas);
    let mano_final = [];
    let cont = 1;
    let j = 0;
        for (let i = cartas.length - 1; i > 2; i--){
            const actual = cartas[i];
            const anterior = cartas[i-1];
            const anterior2 = cartas[i-2];
            const anterior3 = cartas[i-3]
            if(actual.valor == anterior.valor && actual.valor == anterior2.valor && actual.valor == anterior3.valor){
                cont++;
                mano_final[j] = actual;
                mano_final[j+1] = anterior;
                mano_final[j+2] = anterior2;
                mano_final[j+3] = anterior3;
            } 
        }
        if (cont == 2){
            for (let i = cartas.length - 1; i > 0; i--){
                let valor_poker = mano_final[0].valor;
                if(valor_poker != cartas[i].valor){
                    mano_final[4] = cartas[i];
                    return mano_final;
                }
            }
        } else {
            return false;
        }
}
export function straight_flush(cartas){
    cartas = Palo_order(cartas);
    let cartas_aux = cartas;
    let palo = 'A';
    let ind = 1;
    for (let i = cartas_aux.length - 1; i > 0; i--){
        const actual = cartas_aux[i];
        const anterior = cartas_aux[i - 1];
        if(actual.palo === anterior.palo){
            ind++;
            if(ind > 3 && ind < 5){
                palo = anterior.palo;
            }
        } else {
            //error
            if(ind < 2){
                ind = 1;
            }
        }
    }
    //console.log(palo)
    let j = 0;
    let mano_aux = [];
    for (let i = cartas.length - 1; i >= 0; i--){
        const actual = cartas[i];
        const anterior = cartas[i - 1];
        if(actual.palo === palo){
            mano_aux[j] = actual;
            j++;
        } 
    }
    
    if(ind >= 5){
        //console.log(mano_aux);
        let mano_final = straight(mano_aux);
        if(mano_final != false){
            return mano_final;
        } else {
            return false;
        }    
    } else {
        return false; 
    }
}

export function verificar(cartas){
    let verificacion = [];
    //console.log(cartas);
    verificacion = straight_flush(cartas);
    //console.log(verificacion);
    if(verificacion != false){
        console.log('------------------')
        console.log('Straight flush')
        console.log('------------------')
        return [verificacion.reverse(), 10]
    } else {
        verificacion = four_of_a_kind(cartas);
        if(verificacion != false){
            console.log('------------------')
            console.log('Four of a kind')
            console.log('------------------')

            return [verificacion, 8];
        } else {
            //console.log(cartas);
            verificacion = full_house(cartas);
            if(verificacion != false){
                console.log('------------------')
                console.log('Full house')
                console.log('------------------')
                return [verificacion, 7];
            } else {
                //console.log(cartas);
                verificacion = flush(cartas);
                //console.log(verificacion);
                if(verificacion != false){
                    console.log('------------------')
                    console.log('Flush')
                    console.log('------------------')
                    return [verificacion.reverse(), 6];
                } else {
                    //console.log(cartas);
                    verificacion = straight(cartas);
                    //console.log(verificacion);
                    if(verificacion != false){
                        console.log('------------------')
                        console.log('Straight')
                        console.log('------------------')
                        return [verificacion.reverse(), 5];
                    } else {
                        //console.log(cartas);
                        verificacion = three_of_a_kind(cartas);
                        //console.log(verificacion);
                        if(verificacion != false){
                            console.log('------------------')
                            console.log('Three of a kind')
                            console.log('------------------')
                            return [verificacion, 4];
                        } else {
                            //console.log(cartas);
                            verificacion = double_pair(cartas);
                            //console.log(verificacion);
                            if(verificacion != false){
                            console.log('------------------')
                            console.log('Double pair')
                            console.log('------------------')
                            return [verificacion, 3];
                            } else {
                                //console.log(cartas);
                                verificacion = pair(cartas);
                                //console.log(verificacion);
                                if(verificacion != false){
                                    console.log('------------------')
                                    console.log('Pair')
                                    console.log('------------------')
                                    return [verificacion, 2];
                                } else {
                                    //console.log(cartas);
                                    verificacion = high_card(cartas);
                                    console.log('------------------')
                                    console.log('High card')
                                    console.log('------------------')
                                    return [verificacion.reverse(), 1];
                                }
                            }
                        }
                    }
                }
            }
        }
    }           
}

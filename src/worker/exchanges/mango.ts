import { Trade } from '@/types/test';
import Exchange from '../exchange';

export default class extends Exchange {

    id = 'MANGO';
    protected endpoints = { PRODUCTS: 'http://localhost:8010/v1/markets' };

    getUrl() {
        return 'ws://localhost:8010/v1/ws';
    };

    formatProducts(data) {
        return data.map(product => product.name);
    };


    
    /**
     * Sub
     * @param {WebSocket} api
     * @param {string} pair
    */
    async subscribe(api, pair) {

        if (!(await super.subscribe(api, pair))) {
        return;
        }

        api.send(
        JSON.stringify({
            op: 'subscribe',
            channel: 'trades',
            markets: [pair]
        })
        );

        return true;
    };

    /**
     * Unsub
     * @param {WebSocket} api
     * @param {string} pair
    */
    async unsubscribe(api, pair) {

        if (!(await super.unsubscribe(api, pair))) {
        return;
        }
        
        
        api.send(
            JSON.stringify({
            op: 'unsubscribe',
            channel: 'trades',
            markets: [pair]
        })
    );

    return true;

    };

    onMessage(event, api) {
        const json = JSON.parse(event.data);

        if(!json){
            return;
        }

        const trades = [];
        const liquidations = [];

        if(json.type === 'recent_trades'){
            for(let i=0; i<json.trades.length; i++){
                const trade: Trade = {
                    exchange: this.id,
                    pair: json.market,
                    timestamp: +new Date(json.trades[i].eventTimestamp),
                    price: +json.trades[i].price,
                    size: json.trades[i].size,
                    side: json.trades[i].side
                }

                if(json.trades[i].liquidations){
                    trade.liquidation = true;
                    liquidations.push(trade);
                } else {
                    trades.push(trade);
                }
            }
        } else if(json.type === 'trade'){

            const trade: Trade = {
                exchange: this.id,
                pair: json.market,
                timestamp: +new Date(json.eventTimestamp),
                price: +json.price,
                size: json.size,
                side: json.side
            }
            
            trades.push(trade);
        }

        if(trades.length){
            this.emitTrades(api.id, trades);
        }

        if(liquidations.length){
            this.emitLiquidations(api.id, liquidations);
        }

        return true;
    };

    onApiCreated(api) {
        // this.startKeepAlive(api, { op: 'ping' }, 15000);
    };

    onApiRemoved(api) {
        this.stopKeepAlive(api);
    }

};
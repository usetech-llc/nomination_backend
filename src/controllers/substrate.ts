import Substrate from '../utils/substrate.js';

interface ISubstrateControllerInterface {
    bestValidators: (req: any, res: any) => void;
    init: () => Promise<any>;
    health: (req: any, res: any) => void;
}

const sub = new Substrate();
const substrateController: ISubstrateControllerInterface = {
    bestValidators: async (req, res) => {
        const bestList = sub.getBestValidatorList();
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(bestList));
    },
    health: async (req, res) => {
        const conn = await sub.isConnected();
        const status = {
            connected: conn,
        };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(status));
    },
    init: async () => {
        await sub.init();
        console.log('Connection to substrate initialized');
    },
};

export default substrateController;

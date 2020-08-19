import Rpi from "./rpi";

export default interface Era {
    rpis: { [accountId: string]: Rpi };
    eraNumber: number;
}
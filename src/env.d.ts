interface ProcessEnv {
  wsEndpoint: string,
  /**
   * How many eras to process to get best validators with rpi algorithm.
   */
  erasRange: string,
  permill: string,
  mongoConnection: string,
}
